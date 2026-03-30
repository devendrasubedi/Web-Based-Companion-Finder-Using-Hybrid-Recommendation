"""
TRAIL CBF — Score each trail for a user based on their profile.

FLOW (per user):
  1. Convert 129 trail dicts → pandas DataFrame (once).
  2. Compute 6 signal Series (each is 129 floats):
     interest → difficulty → budget → availability → geo → popularity
  3. Weighted sum → total score per trail.
  4. Hard filters: difficulty=0 or availability=0 → total=0.
  5. Return {trailId: (score, reasons)} for trails with score > 0.

FIX #1: Geo signal now checks district neighbors (77 districts).
"""

import logging
import numpy as np
import pandas as pd
from datetime import datetime

from config import (
    CBF_WEIGHTS, INTEREST_TAGS, FITNESS_CEILING, DIFFICULTY_RANK,
    MAX_DIFFICULTY_SCORE, AGE_PENALTY, BUDGET_CEILING, BUDGET_DECAY_RATE,
    AVAILABILITY_MAX_DAYS, GEO_SCORES, GEO_TRAVEL_AFFINITY,
    GLOBAL_MEAN_RATING, MIN_VOTES_THRESHOLD,
    DISTRICT_NEIGHBORS,  # FIX #1
)

logger = logging.getLogger("rec.trail_cbf")


# ── Step 1: Convert trail dicts → DataFrame ──────────────────

def _trails_to_df(trails):
    """Flatten nested trail dicts into a clean DataFrame indexed by trail ID."""
    records = []
    for t in trails:
        cost = t.get("cost") or {}
        duration = t.get("duration") or {}
        location = t.get("location") or {}
        records.append({
            "tid": t["_id"],
            "name": t.get("name", "Unknown"),
            "difficulty": t.get("difficulty", "Moderate"),
            "difficultyScore": t.get("difficultyScore", 0) or 0,
            "tags": [tag.lower() for tag in (t.get("tags") or [])],
            "cost_max": cost.get("max_npr", 0) or 0,
            "min_days": duration.get("min_days", 1) or 1,
            "provinces": location.get("provinces", []),
            "districts": location.get("districts", []),
            "rating": t.get("rating", 0) or 0,
            "numReviews": t.get("numReviews", 0) or 0,
        })
    return pd.DataFrame(records).set_index("tid")


# ── Signal 1: Interest Match (Recall-Weighted per category) ──

def _interest_scores(user_interests, trails_df):
    """
    For each user interest (e.g. "adventure"), get the mapped tag set.
    For each trail, compute: hits / total_mapped_tags.
    Average across all user interests.
    """
    if not user_interests:
        return pd.Series(0.0, index=trails_df.index)

    mapped = [INTEREST_TAGS.get(i, set()) for i in user_interests if i in INTEREST_TAGS]
    if not mapped:
        return pd.Series(0.0, index=trails_df.index)

    def _score(trail_tags):
        s = set(trail_tags)
        if not s:
            return 0.0
        return sum(len(m & s) / len(m) for m in mapped) / len(mapped)

    return trails_df["tags"].apply(_score)


# ── Signal 2: Difficulty Match (hard filter + score) ─────────

def _difficulty_scores(fitness_level, dob, trails_df):
    """
    Step 1: Map user fitness to ceiling, trail difficulty to rank.
    Step 2: HARD FILTER — if trail rank > user ceiling → 0.
    Step 3: Normalize difficultyScore to 0-1.
    Step 4: Advanced users want higher scores; beginners want lower.
    Step 5: Subtract age penalty.
    """
    ceiling = FITNESS_CEILING.get(fitness_level, 2)

    # Compute age for penalty
    age = 30
    if dob:
        today = datetime.utcnow()
        age = today.year - dob.year
        if (today.month, today.day) < (dob.month, dob.day):
            age -= 1

    if age < 40:
        penalty = AGE_PENALTY["under_40"]
    elif age <= 55:
        penalty = AGE_PENALTY["40_to_55"]
    else:
        penalty = AGE_PENALTY["over_55"]

    ranks = trails_df["difficulty"].map(DIFFICULTY_RANK).fillna(2).astype(int)
    normalized = (trails_df["difficultyScore"] / MAX_DIFFICULTY_SCORE).clip(0.0, 1.0)
    passable = ranks <= ceiling  # hard filter mask

    if fitness_level in ("advanced", "expert"):
        scores = (normalized - penalty).clip(lower=0.0)
    else:
        scores = (1.0 - normalized - penalty).clip(lower=0.0)

    return scores.where(passable, 0.0)


# ── Signal 3: Budget Match (soft exponential decay) ──────────

def _budget_scores(budget_level, trails_df):
    """
    Within budget → 1.0.
    Over budget → exp(-2.0 × overage_ratio). Soft decay, never hard zero.
    """
    ceiling = BUDGET_CEILING.get(budget_level, 40000)
    costs = trails_df["cost_max"].fillna(0)
    within = costs <= ceiling
    overage = ((costs - ceiling) / max(ceiling, 1)).clip(lower=0.0)
    decayed = np.exp(-BUDGET_DECAY_RATE * overage.values)
    result = pd.Series(decayed, index=trails_df.index)
    result[within] = 1.0
    return result


# ── Signal 4: Availability Match (hard filter) ──────────��────

def _availability_scores(availability, trails_df):
    """Trail too long for user's schedule → 0.0. Otherwise → 1.0."""
    max_days = AVAILABILITY_MAX_DAYS.get(availability, 999)
    return (trails_df["min_days"].fillna(1) <= max_days).astype(float)


# ── Signal 5: Geo Affinity (FIX #1: district-aware, vectorized) ─────

def _geo_scores(user_province, user_district, trails_df):
    """
    FIX #1: 5-tier matching with district granularity — vectorized.
    Precomputes neighbor sets once, then scores all 129 trails with numpy ops.

    Tier 1: same district        → 1.0
    Tier 2: neighbor district    → 0.55
    Tier 3: same province        → 0.7
    Tier 4: neighbor province    → 0.4
    Tier 5: fallback             → 0.2   (never zero)
    """
    neighbor_districts = DISTRICT_NEIGHBORS.get(user_district, set())
    nearby_provinces = GEO_TRAVEL_AFFINITY.get(user_province, set())

    # Build score array in one pass (129 iterations, not N² user pairs)
    scores = np.full(len(trails_df), GEO_SCORES["fallback"])

    for i, (_, row) in enumerate(trails_df.iterrows()):
        t_dists = row["districts"]
        t_provs  = row["provinces"]

        if user_district and user_district in t_dists:
            scores[i] = GEO_SCORES["district_match"]
        elif user_district and neighbor_districts and any(d in neighbor_districts for d in t_dists):
            scores[i] = GEO_SCORES["neighbor_district"]
        elif user_province and user_province in t_provs:
            scores[i] = GEO_SCORES["province_match"]
        elif user_province and any(p in nearby_provinces for p in t_provs):
            scores[i] = GEO_SCORES["neighbor_province"]

    return pd.Series(scores, index=trails_df.index)



# ── Signal 6: Popularity Prior (Bayesian average) ────────────

def _popularity_scores(trails_df):
    """
    Bayesian average: (m×C + n×R) / (m + n).
    Pulls low-review trails toward global mean.
    Normalized to [0, 1] via (bayesian - 1) / 4.
    """
    ratings = trails_df["rating"].fillna(0)
    num_reviews = trails_df["numReviews"].fillna(0)
    bayesian = (
        (MIN_VOTES_THRESHOLD * GLOBAL_MEAN_RATING + num_reviews * ratings)
        / (MIN_VOTES_THRESHOLD + num_reviews)
    )
    return ((bayesian - 1.0) / 4.0).clip(0.0, 1.0)


# ── Reason Builder ──────────────────────────────────────────

def _build_reasons(user_interests, trails_df, s_interest):
    """Build human-readable reason strings for each trail."""
    matched = [i for i in user_interests if i in INTEREST_TAGS]
    reasons = {}
    for tid in trails_df.index:
        parts = []
        if s_interest[tid] > 0.1 and matched:
            parts.append(f"Matches your {', '.join(matched)} interests")
        parts.append(f"{trails_df.loc[tid, 'difficulty'].lower()} difficulty")
        provs = trails_df.loc[tid, "provinces"]
        if provs:
            parts.append(f"located in {provs[0]}")
        reasons[tid] = parts
    return reasons


# ══════════════════════════════════════════════════════════════
#  PUBLIC API
# ═════════════════════════════════════════════════════════���════

def get_trail_cbf_scores_from_df(profile, trails_df):
    """
    Score ALL trails for one user using a pre-built trails DataFrame.
    Called by the bulk loop so the DataFrame is built only ONCE.
    Returns {trailId: (score, reasons)}.
    """
    if trails_df is None or trails_df.empty:
        return {}

    interests    = profile.get("interests", [])
    fitness      = profile.get("experienceLevel", "beginner")
    budget_level = profile.get("budgetLevel", "Medium")
    availability = profile.get("availability", "Flexible")
    province     = profile.get("province", "")
    district     = profile.get("district", "")
    dob          = profile.get("dob")

    s_interest     = _interest_scores(interests, trails_df)
    s_difficulty   = _difficulty_scores(fitness, dob, trails_df)
    s_budget       = _budget_scores(budget_level, trails_df)
    s_availability = _availability_scores(availability, trails_df)
    s_geo          = _geo_scores(province, district, trails_df)
    s_popularity   = _popularity_scores(trails_df)

    total = (
        CBF_WEIGHTS["interest"]       * s_interest
        + CBF_WEIGHTS["difficulty"]   * s_difficulty
        + CBF_WEIGHTS["budget"]       * s_budget
        + CBF_WEIGHTS["availability"] * s_availability
        + CBF_WEIGHTS["geo"]          * s_geo
        + CBF_WEIGHTS["popularity"]   * s_popularity
    )

    hard_pass = (s_difficulty > 0) & (s_availability > 0)
    total = total.where(hard_pass, 0.0)

    reasons_map = _build_reasons(interests, trails_df, s_interest)

    scores = {}
    for tid in trails_df.index:
        s = float(total[tid])
        if s > 0:
            scores[tid] = (s, reasons_map.get(tid, []))

    logger.debug(f"Trail CBF scored {len(scores)}/{len(trails_df)} trails > 0")
    return scores


def get_trail_cbf_scores(profile, trails):
    """
    Score ALL trails for one user. Returns {trailId: (score, reasons)}.
    Converts trail list to DataFrame then delegates to get_trail_cbf_scores_from_df.
    Used by single-user on-demand calls; bulk loop uses get_trail_cbf_scores_from_df.
    """
    if not trails:
        return {}
    trails_df = _trails_to_df(trails)
    return get_trail_cbf_scores_from_df(profile, trails_df)