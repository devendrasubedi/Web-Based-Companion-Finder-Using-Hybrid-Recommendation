"""
DATA LOADER — All MongoDB reads/writes for recommendation.
Connects to auth_db. Reads trails, profiles, interactions, relationships.
Writes results to Recommendation_Cache.
"""

import os
import time
import logging
from datetime import datetime, timedelta
from bson import ObjectId
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

from config import (
    TRAIL_CACHE_TTL_SECONDS,
    CACHE_TTL_HOURS,
    CF_RATING_WEIGHTS,
    CF_SAVED_WEIGHT,
    CF_COMPLETED_WEIGHT,
    MAX_RECOMMENDATIONS,
)

load_dotenv()
logger = logging.getLogger("rec.data_loader")

# ── MongoDB Connection ───────────────────────────────────────

_client = None
_db = None


def get_db():
    """Lazy singleton connection to auth_db."""
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
    """Clean shutdown."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection closed")


# ── Trail Cache ──────────────────────────────────────────────

_trail_cache = None
_trail_cache_time = 0


def load_trails():
    """Load all trails. Cached in memory to avoid re-reading per user."""
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


def invalidate_trail_cache():
    """Force reload on next call."""
    global _trail_cache, _trail_cache_time
    _trail_cache = None
    _trail_cache_time = 0


# ── User Profiles ────────────────────────────────────────────

def load_all_profiles():
    """Load all profiles with interests. Fixes experienceLevel case."""
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
    """Load one user profile by userId."""
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


# ── Interactions ─────────────────────────────────────────────

def _compute_cf_score(doc):
    """
    CF interaction score from raw fields (0.0 to 2.25).
    NOT the stored implicitScore — that's for Node.js UI.
    """
    score = 0.0
    if doc.get("isSaved"):
        score += CF_SAVED_WEIGHT
    if doc.get("isCompleted"):
        score += CF_COMPLETED_WEIGHT
    r = doc.get("rating")
    if r is not None:
        score += CF_RATING_WEIGHTS.get(r, 0)
    return max(0.0, score)


def load_all_interactions():
    """
    Load all interactions grouped by userId.
    Returns:
        interactions_by_user: {uid_str: {trailId: cf_score}}
        excluded_by_user:     {uid_str: set(trailId)}
    """
    db = get_db()
    docs = db["User_Trail_Interactions"].find({}, {
        "userId": 1, "trailId": 1, "isSaved": 1,
        "isCompleted": 1, "rating": 1, "implicitScore": 1,
    })

    interactions_by_user = {}
    excluded_by_user = {}

    for doc in docs:
        uid = str(doc["userId"])
        tid = doc["trailId"]

        cf_score = _compute_cf_score(doc)
        if cf_score > 0:
            if uid not in interactions_by_user:
                interactions_by_user[uid] = {}
            interactions_by_user[uid][tid] = cf_score

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


def load_user_interactions(user_id):
    """Load interactions for one user."""
    db = get_db()
    if isinstance(user_id, str):
        user_id = ObjectId(user_id)

    docs = db["User_Trail_Interactions"].find(
        {"userId": user_id},
        {"trailId": 1, "isSaved": 1, "isCompleted": 1, "rating": 1, "implicitScore": 1}
    )

    cf_scores = {}
    excluded = set()

    for doc in docs:
        tid = doc["trailId"]
        cf_score = _compute_cf_score(doc)
        if cf_score > 0:
            cf_scores[tid] = cf_score
        if (doc.get("isSaved") or doc.get("isCompleted") or
            doc.get("rating") is not None or doc.get("implicitScore", 0) >= 3):
            excluded.add(tid)

    return cf_scores, excluded


# ── Relationships ────────────────────────────────────────────

def load_all_relationships():
    """
    Load friendships and blocks.
    friends_map: bidirectional. blocked_map: both directions for CF exclusion.
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


# ── Friend Trail Sets ────────────────────────────────────────

def build_friend_trail_sets(friends_map, interactions_by_user):
    """For each user, collect trails their friends interacted with."""
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


# ── Cache Write ──────────────────────────────────────────────

def write_cache(user_id, rec_type, recommendations, model_version="cbf-v1.0"):
    """
    Upsert to Recommendation_Cache.
    Matches existing Mongoose schema: itemId (String), score, reason.
    """
    db = get_db()
    if isinstance(user_id, str):
        user_id = ObjectId(user_id)

    now = datetime.utcnow()

    slim_recs = [
        {
            "itemId": str(r["itemId"]),
            "score": r["score"],
            "reason": r["reason"],
        }
        for r in recommendations[:MAX_RECOMMENDATIONS]
    ]

    db["Recommendation_Cache"].update_one(
        {"userId": user_id, "type": rec_type},
        {"$set": {
            "userId": user_id,
            "type": rec_type,
            "recommendations": slim_recs,
            "generatedAt": now,
            "expiresAt": now + timedelta(hours=CACHE_TTL_HOURS),
            "modelVersion": model_version,
            "updatedAt": now,
        }},
        upsert=True
    )


def write_cache_bulk(results):
    """Bulk upsert. Same format — itemId as String."""
    if not results:
        return

    db = get_db()
    now = datetime.utcnow()
    expires = now + timedelta(hours=CACHE_TTL_HOURS)

    ops = []
    for user_id, rec_type, recs, model_version in results:
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)

        slim_recs = [
            {
                "itemId": str(r["itemId"]),
                "score": r["score"],
                "reason": r["reason"],
            }
            for r in recs[:MAX_RECOMMENDATIONS]
        ]

        ops.append(UpdateOne(
            {"userId": user_id, "type": rec_type},
            {"$set": {
                "userId": user_id,
                "type": rec_type,
                "recommendations": slim_recs,
                "generatedAt": now,
                "expiresAt": expires,
                "modelVersion": model_version,
                "updatedAt": now,
            }},
            upsert=True
        ))

    if ops:
        result = db["Recommendation_Cache"].bulk_write(ops)
        logger.info(f"Bulk write: {result.upserted_count} new, {result.modified_count} updated")