"""
DATA LOADER — All MongoDB reads and writes.

WHAT IT DOES:
  - Reads: trails, profiles, interactions, relationships
  - Writes: Recommendation_Cache (type "trails" or "companions")
  - Provides helpers for temporal decay, active users, incremental polling

FLOW:
  1. get_db()           → connect to MongoDB (lazy singleton)
  2. load_*()           → read collections into Python dicts or DataFrames
  3. write_cache*()     → upsert results into Recommendation_Cache
  4. get_active_*()     → FIX #3: filter to recent users
  5. get_changed_*()    → FIX #6: find users needing recomputation

FIXES:
  #4 — _temporal_decay() applied to every interaction CF score
  #3 — get_active_user_ids() returns users with recent interactions
  #6 — get_changed_users_since() polls 3 collections for changes
"""

import os
import time
import math
import logging
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

import pandas as pd
import numpy as np

from config import (
    TRAIL_CACHE_TTL_SECONDS, CACHE_TTL_HOURS,
    CF_RATING_WEIGHTS, CF_SAVED_WEIGHT, CF_COMPLETED_WEIGHT,
    MAX_RECOMMENDATIONS, USER_MAX_RECOMMENDATIONS,
    TEMPORAL_DECAY_LAMBDA, ACTIVE_USER_DAYS,
)

load_dotenv()
logger = logging.getLogger("rec.data_loader")


# ══════════════════════════════════════════════════════════════
#  STEP 1: MONGODB CONNECTION (lazy singleton)
# ══════════════════════════════════════════════════════════════

_client = None
_db = None


def get_db():
    """Connect to MongoDB once. Reuse on every subsequent call."""
    global _client, _db
    if _db is None:
        uri = os.getenv("MONGO_URI")
        if not uri:
            raise ValueError("MONGO_URI not set in environment")
        _client = MongoClient(uri)
        _db = _client["auth_db"]
        logger.info("Connected to MongoDB auth_db")
    return _db


def close_db():
    """Clean shutdown — called when FastAPI stops."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection closed")


# ══════════════════════════════════════════════════════════════
#  FIX #4: TEMPORAL DECAY
# ══════════════════════════════════════════════════════════════

def _temporal_decay(updated_at):
    """
    Compute decay multiplier based on how old an interaction is.
    Formula: exp(-λ × days_since)
    Recent interactions keep full weight. Old ones fade toward 0.
    """
    if not updated_at:
        return 0.5  # unknown date → half weight (safe default)

    now = datetime.utcnow()
    days = (now - updated_at).total_seconds() / 86400.0
    return math.exp(-TEMPORAL_DECAY_LAMBDA * max(days, 0))


# ══════════════════════════════════════════════════════════════
#  STEP 2A: TRAIL DATA LOADERS (raw dicts for trail CBF/CF)
# ══════════════════════════════════════════════════════════════

_trail_cache = None
_trail_cache_time = 0


def load_trails():
    """
    Load all 129 trails from Trails_metadata.
    Cached in memory for TRAIL_CACHE_TTL_SECONDS (10 min) to avoid
    re-reading the same 129 docs on every user computation.
    """
    global _trail_cache, _trail_cache_time

    now = time.time()
    if _trail_cache is not None and (now - _trail_cache_time) < TRAIL_CACHE_TTL_SECONDS:
        return _trail_cache

    db = get_db()
    trails = list(db["Trails_metadata"].find({}, {
        "_id": 1, "name": 1, "difficulty": 1, "difficultyScore": 1,
        "tags": 1, "location": 1, "duration": 1, "cost": 1,
        "altitude": 1, "distance_km": 1, "rating": 1, "numReviews": 1,
    }))

    _trail_cache = trails
    _trail_cache_time = now
    logger.info(f"Loaded {len(trails)} trails (cached {TRAIL_CACHE_TTL_SECONDS}s)")
    return trails


def load_all_profiles():
    """
    Load all user profiles that have interests set.
    Returns list of raw dicts (used by trail CBF).
    Normalizes experienceLevel to lowercase.
    """
    db = get_db()
    profiles = list(db["userprofiles"].find(
        {"interests": {"$exists": True, "$ne": []}},
        {
            "userId": 1, "interests": 1, "experienceLevel": 1,
            "budgetLevel": 1, "availability": 1,
            "province": 1, "district": 1, "dob": 1,
        }
    ))
    for p in profiles:
        exp = p.get("experienceLevel", "beginner")
        if exp:
            p["experienceLevel"] = exp.lower()

    logger.info(f"Loaded {len(profiles)} profiles with interests")
    return profiles


def load_single_profile(user_id):
    """Load one user profile by userId (for single-user recomputation)."""
    db = get_db()
    if isinstance(user_id, str):
        user_id = ObjectId(user_id)

    profile = db["userprofiles"].find_one(
        {"userId": user_id, "interests": {"$exists": True, "$ne": []}},
        {
            "userId": 1, "interests": 1, "experienceLevel": 1,
            "budgetLevel": 1, "availability": 1,
            "province": 1, "district": 1, "dob": 1,
        }
    )
    if profile:
        exp = profile.get("experienceLevel", "beginner")
        if exp:
            profile["experienceLevel"] = exp.lower()
    return profile


# ── Interaction Loaders (FIX #4: temporal decay applied) ─────

def _compute_cf_score(doc):
    """
    Compute CF score for one interaction document.
    Step 1: Add up base score (saved + completed + rating weights).
    Step 2: Multiply by temporal decay (FIX #4).
    Result: recent high-engagement = high score, old low-engagement ≈ 0.
    """
    # Step 1: base score from engagement signals
    score = 0.0
    if doc.get("isSaved"):
        score += CF_SAVED_WEIGHT           # +0.50
    if doc.get("isCompleted"):
        score += CF_COMPLETED_WEIGHT       # +1.00
    r = doc.get("rating")
    if r is not None:
        score += CF_RATING_WEIGHTS.get(r, 0)  # +0.75 to -0.50
    score = max(0.0, score)

    # Step 2: FIX #4 — temporal decay
    decay = _temporal_decay(doc.get("updatedAt"))
    return score * decay


def load_all_interactions():
    """
    Load ALL interactions grouped by userId.
    Used by trail CF (dict-based approach).

    Returns:
      interactions_by_user: {uid_str: {trailId: cf_score}}  → for CF scoring
      excluded_by_user:     {uid_str: set(trailId)}          → trails to filter out
    """
    db = get_db()
    docs = db["User_Trail_Interactions"].find({}, {
        "userId": 1, "trailId": 1, "isSaved": 1,
        "isCompleted": 1, "rating": 1, "implicitScore": 1,
        "updatedAt": 1,  # FIX #4: needed for decay calculation
    })

    interactions_by_user = {}
    excluded_by_user = {}

    for doc in docs:
        uid = str(doc["userId"])
        tid = doc["trailId"]

        # Compute decayed CF score
        cf_score = _compute_cf_score(doc)
        if cf_score > 0:
            if uid not in interactions_by_user:
                interactions_by_user[uid] = {}
            interactions_by_user[uid][tid] = cf_score

        # Determine if trail should be excluded from recommendations
        # (user already meaningfully engaged with it)
        should_exclude = (
            doc.get("isSaved", False) or
            doc.get("isCompleted", False) or
            doc.get("rating") is not None or
            (doc.get("implicitScore", 0) >= 3)
        )
        if should_exclude:
            if uid not in excluded_by_user:
                excluded_by_user[uid] = set()
            excluded_by_user[uid].add(tid)

    logger.info(
        f"Loaded interactions: {len(interactions_by_user)} users with CF scores, "
        f"{len(excluded_by_user)} users with exclusions"
    )
    return interactions_by_user, excluded_by_user


# ── Relationship Loaders ────────────────────────────────────

def load_all_relationships():
    """
    Load friendships and blocks as dicts.
    Bidirectional: if A friends B, both maps get the entry.
    Used by trail CF (friend boost) and companion exclusions.
    """
    db = get_db()
    docs = db["User_Relationships"].find(
        {"status": {"$in": ["accepted", "blocked"]}},
        {"userA": 1, "userB": 1, "status": 1}
    )

    friends_map = {}
    blocked_map = {}

    for doc in docs:
        a = str(doc["userA"])
        b = str(doc["userB"])

        if doc["status"] == "accepted":
            friends_map.setdefault(a, set()).add(b)
            friends_map.setdefault(b, set()).add(a)
        elif doc["status"] == "blocked":
            blocked_map.setdefault(a, set()).add(b)
            blocked_map.setdefault(b, set()).add(a)

    logger.info(
        f"Loaded: {len(friends_map)} users with friends, "
        f"{len(blocked_map)} users with blocks"
    )
    return friends_map, blocked_map


def build_friend_trail_sets(friends_map, interactions_by_user):
    """
    For each user, collect all trails their friends interacted with.
    Used for the +0.05 "saved by your friends" boost in trail hybrid.
    """
    friend_trails = {}
    for uid, friend_ids in friends_map.items():
        trail_set = set()
        for fid in friend_ids:
            if fid in interactions_by_user:
                trail_set.update(interactions_by_user[fid].keys())
        if trail_set:
            friend_trails[uid] = trail_set
    logger.info(f"Built friend trail sets for {len(friend_trails)} users")
    return friend_trails


# ══════════════════════════════════════════════════════════════
#  FIX #3: ACTIVE USER FILTERING
# ══════════════════════════════════════════════════════════════

def get_active_user_ids():
    """
    Get userIds with interactions in the last ACTIVE_USER_DAYS.
    Uses existing updatedAt on User_Trail_Interactions — no schema change.
    Bulk recomputation skips users not in this set.
    """
    db = get_db()
    from datetime import timezone
    cutoff = datetime.now(timezone.utc) - timedelta(days=ACTIVE_USER_DAYS)

    pipeline = [
        {"$match": {"updatedAt": {"$gte": cutoff}}},
        {"$group": {"_id": "$userId"}},
    ]
    result = list(db["User_Trail_Interactions"].aggregate(pipeline))
    active_ids = {str(doc["_id"]) for doc in result}

    logger.info(f"Active users (last {ACTIVE_USER_DAYS} days): {len(active_ids)}")
    return active_ids


# ══════════════════════════════════════════════════════════════
#  FIX #6: INCREMENTAL UPDATE POLLING
# ══════════════════════════════════════════════════════════════

def get_changed_users_since(last_poll_time):
    """
    Poll 3 collections for documents changed since last_poll_time.
    Returns set of userId strings that need recomputation.

    Checks:
      1. User_Trail_Interactions.updatedAt → user saved/completed/rated
      2. User_Relationships.updatedAt     → friendship/block changed
      3. userprofiles.updatedAt           → profile updated

    No schema changes — all 3 collections already have timestamps:true.
    """
    db = get_db()
    changed = set()

    # 1. Interactions changed
    for doc in db["User_Trail_Interactions"].find(
        {"updatedAt": {"$gt": last_poll_time}}, {"userId": 1}
    ):
        changed.add(str(doc["userId"]))

    # 2. Relationships changed (both users affected)
    for doc in db["User_Relationships"].find(
        {"updatedAt": {"$gt": last_poll_time}}, {"userA": 1, "userB": 1}
    ):
        changed.add(str(doc["userA"]))
        changed.add(str(doc["userB"]))

    # 3. Profiles changed
    for doc in db["userprofiles"].find(
        {"updatedAt": {"$gt": last_poll_time}}, {"userId": 1}
    ):
        changed.add(str(doc["userId"]))

    if changed:
        logger.info(f"Incremental: {len(changed)} users changed since {last_poll_time}")
    return changed


# ══════════════════════════════════════════════════════════════
#  STEP 2B: USER-TO-USER DATA LOADERS (pandas DataFrames)
# ══════════════════════════════════════════════════════════════

def load_profiles_df():
    """
    Load ALL user profiles into a pandas DataFrame.
    Step 1: Query MongoDB for all profiles.
    Step 2: Compute age from dob.
    Step 3: Fill missing values with safe defaults.
    Step 4: Index by userId string for O(1) lookup.

    Used by user CBF (need all profiles for N×N matrix).
    """
    db = get_db()
    cursor = db["userprofiles"].find(
        {},
        {
            "userId": 1, "name": 1, "interests": 1,
            "experienceLevel": 1, "budgetLevel": 1,
            "availability": 1, "province": 1, "district": 1,
            "dob": 1, "gender": 1, "languagesKnown": 1,
        }
    )

    records = list(cursor)
    if not records:
        logger.warning("No profiles found")
        return pd.DataFrame()

    df = pd.DataFrame(records)
    df["userId"] = df["userId"].astype(str)

    # Step 2: Compute age from date of birth
    now = pd.Timestamp.now("UTC")
    df["dob"] = pd.to_datetime(df["dob"], errors="coerce", utc=True)
    df["age"] = ((now - df["dob"]).dt.days / 365.25).fillna(30).astype(int)

    # Step 3: Fill missing values
    df["experienceLevel"] = df["experienceLevel"].fillna("beginner").str.lower()
    df["budgetLevel"] = df["budgetLevel"].fillna("Medium")
    df["availability"] = df["availability"].fillna("Flexible")
    df["province"] = df["province"].fillna("")
    df["district"] = df["district"].fillna("")
    df["interests"] = df["interests"].apply(lambda x: x if isinstance(x, list) else [])
    df["gender"] = df["gender"].fillna("Not Specified")
    df["languagesKnown"] = df["languagesKnown"].apply(
        lambda x: x if isinstance(x, list) else []
    )
    df["name"] = df["name"].fillna("Unknown")

    # Step 4: Index by userId
    df = df.set_index("userId")
    logger.info(f"Loaded {len(df)} profiles into DataFrame")
    return df


def load_interactions_df():
    """
    Load ALL interactions into a pandas DataFrame with vectorized CF scores.
    Step 1: Query MongoDB (include updatedAt for decay).
    Step 2: Compute base CF score (saved + completed + rating).
    Step 3: FIX #4 — Apply temporal decay (vectorized, not per-row loop).
    Step 4: Filter to positive scores only.

    Used by user CF (needs DataFrame for sparse matrix building).
    """
    db = get_db()
    cursor = db["User_Trail_Interactions"].find(
        {},
        {
            "userId": 1, "trailId": 1,
            "isSaved": 1, "isCompleted": 1, "rating": 1,
            "updatedAt": 1,  # FIX #4
        }
    )

    records = list(cursor)
    if not records:
        logger.warning("No interactions found")
        return pd.DataFrame(columns=["userId", "trailId", "cf_score"])

    df = pd.DataFrame(records)
    df["userId"] = df["userId"].astype(str)
    df["trailId"] = df["trailId"].astype(str)
    df["isSaved"] = df["isSaved"].fillna(False).astype(bool)
    df["isCompleted"] = df["isCompleted"].fillna(False).astype(bool)
    df["rating"] = df["rating"].fillna(0).astype(int)

    # Step 2: Base CF score (vectorized)
    base_score = (
        df["isSaved"].astype(float) * CF_SAVED_WEIGHT
        + df["isCompleted"].astype(float) * CF_COMPLETED_WEIGHT
        + df["rating"].map(CF_RATING_WEIGHTS).fillna(0.0)
    ).clip(lower=0.0)

    # Step 3: FIX #4 — Temporal decay (vectorized across all 34K rows)
    df["updatedAt"] = pd.to_datetime(df["updatedAt"], errors="coerce", utc=True)
    now = pd.Timestamp.now("UTC")
    days_since = ((now - df["updatedAt"]).dt.total_seconds() / 86400.0).fillna(180).clip(lower=0)
    decay = np.exp(-TEMPORAL_DECAY_LAMBDA * days_since)

    df["cf_score"] = base_score * decay

    # Step 4: Keep only positive scores
    df = df[df["cf_score"] > 0][["userId", "trailId", "cf_score"]].copy()
    logger.info(f"Loaded {len(df)} positive interactions (with temporal decay)")
    return df


def load_relationships_df():
    """Load relationships into DataFrame (for user hybrid social maps)."""
    db = get_db()
    cursor = db["User_Relationships"].find(
        {"status": {"$in": ["accepted", "blocked"]}},
        {"userA": 1, "userB": 1, "status": 1}
    )

    records = list(cursor)
    if not records:
        logger.warning("No relationships found")
        return pd.DataFrame(columns=["userA", "userB", "status"])

    df = pd.DataFrame(records)
    df["userA"] = df["userA"].astype(str)
    df["userB"] = df["userB"].astype(str)
    logger.info(f"Loaded {len(df)} relationships into DataFrame")
    return df[["userA", "userB", "status"]]


# ══════════════════════════════════════════════════════════════
#  STEP 3: CACHE WRITERS
# ══════════════════════════════════════════════════════════════

def write_cache(user_id, rec_type, recommendations, model_version="cbf-v1.0"):
    """
    Upsert one user's recommendations into Recommendation_Cache.
    Works for both type="trails" and type="companions".
    MongoDB TTL index auto-deletes after expiresAt.
    """
    db = get_db()
    if isinstance(user_id, str):
        user_id = ObjectId(user_id)

    now = datetime.now(timezone.utc)
    max_recs = MAX_RECOMMENDATIONS if rec_type == "trails" else USER_MAX_RECOMMENDATIONS

    slim_recs = [
        {"itemId": str(r["itemId"]), "score": r["score"], "reason": r["reason"]}
        for r in recommendations[:max_recs]
    ]

    db["Recommendation_Cache"].update_one(
        {"userId": user_id, "type": rec_type},
        {"$set": {
            "userId": user_id, "type": rec_type,
            "recommendations": slim_recs,
            "generatedAt": now,
            "expiresAt": now + timedelta(hours=CACHE_TTL_HOURS),
            "modelVersion": model_version, "updatedAt": now,
        }},
        upsert=True
    )


def write_cache_bulk(results):
    """
    Bulk upsert for batch processing (100 users per MongoDB round-trip).
    Same format as write_cache but batched for efficiency.
    """
    if not results:
        return

    db = get_db()
    now = datetime.utcnow()
    expires = now + timedelta(hours=CACHE_TTL_HOURS)

    ops = []
    for user_id, rec_type, recs, model_version in results:
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)

        max_recs = MAX_RECOMMENDATIONS if rec_type == "trails" else USER_MAX_RECOMMENDATIONS
        slim_recs = [
            {"itemId": str(r["itemId"]), "score": r["score"], "reason": r["reason"]}
            for r in recs[:max_recs]
        ]

        ops.append(UpdateOne(
            {"userId": user_id, "type": rec_type},
            {"$set": {
                "userId": user_id, "type": rec_type,
                "recommendations": slim_recs,
                "generatedAt": now, "expiresAt": expires,
                "modelVersion": model_version, "updatedAt": now,
            }},
            upsert=True
        ))

    if ops:
        result = db["Recommendation_Cache"].bulk_write(ops)
        logger.info(f"Bulk write: {result.upserted_count} new, {result.modified_count} updated")