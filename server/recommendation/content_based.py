"""
CONTENT-BASED FILTERING — 6 signals, weighted sum.
Scores each trail for a user based on profile features.
Cold-start safe — works from day one without behavior data.
"""

import math
import logging
from datetime import datetime

from config import (
    CBF_WEIGHTS,
    INTEREST_TAGS,
    FITNESS_CEILING,
    DIFFICULTY_RANK,
    MAX_DIFFICULTY_SCORE,
    AGE_PENALTY,
    BUDGET_CEILING,
    BUDGET_DECAY_RATE,
    AVAILABILITY_MAX_DAYS,
    GEO_SCORES,
    GEO_TRAVEL_AFFINITY,
    GLOBAL_MEAN_RATING,
    MIN_VOTES_THRESHOLD,
)

logger = logging.getLogger("rec.cbf")


# ── Signal 1: Interest Match (Jaccard per category) ─────────

def _interest_match(user_interests, trail_tags):
    """Per-category Jaccard. Averages across user's interest categories."""
    if not user_interests or not trail_tags:
        return 0.0

    trail_tags_lower = {t.lower() for t in trail_tags}
    cat_scores = []

    for interest in user_interests:
        mapped = INTEREST_TAGS.get(interest, set())
        if not mapped:
            continue
        hits = len(mapped & trail_tags_lower)
        cat_scores.append(hits / len(mapped))

    if not cat_scores:
        return 0.0
    return sum(cat_scores) / len(cat_scores)


# ── Signal 2: Difficulty Match ───────────────────────────────

def _get_age(dob):
    if not dob:
        return 30
    today = datetime.utcnow()
    age = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        age -= 1
    return age


def _age_penalty(dob):
    """Age modifier on difficulty. Not a separate signal."""
    age = _get_age(dob)
    if age < 40:
        return AGE_PENALTY["under_40"]
    elif age <= 55:
        return AGE_PENALTY["40_to_55"]
    else:
        return AGE_PENALTY["over_55"]


def _difficulty_match(fitness_level, trail_difficulty, trail_score, dob):
    """Hard filter if too difficult. Then rank by score."""
    ceiling = FITNESS_CEILING.get(fitness_level, 2)
    rank = DIFFICULTY_RANK.get(trail_difficulty, 2)

    if rank > ceiling:
        return 0.0

    normalized = min(max((trail_score or 0) / MAX_DIFFICULTY_SCORE, 0.0), 1.0)
    penalty = _age_penalty(dob)

    if fitness_level in ("advanced", "expert"):
        return max(0.0, normalized - penalty)
    else:
        return max(0.0, 1.0 - normalized - penalty)


# ── Signal 3: Budget Match ───────────────────────────────────

def _budget_match(budget_level, trail_max_cost):
    """Soft exponential decay above ceiling. Never hard zero."""
    ceiling = BUDGET_CEILING.get(budget_level, 40000)
    cost = trail_max_cost or 0

    if cost <= ceiling:
        return 1.0

    overage = (cost - ceiling) / max(ceiling, 1)
    return max(0.0, math.exp(-BUDGET_DECAY_RATE * overage))


# ── Signal 4: Availability Match ─────────────────────────────

def _availability_match(availability, trail_min_days):
    """Hard filter if trail too long for user's availability."""
    max_days = AVAILABILITY_MAX_DAYS.get(availability, 999)
    min_days = trail_min_days or 1

    if min_days > max_days:
        return 0.0
    return 1.0


# ── Signal 5: Geo Affinity ───────────────────────────────────

def _geo_affinity(user_province, user_district, trail_location):
    """Tiered match. Never returns 0."""
    if not trail_location:
        return GEO_SCORES["fallback"]

    t_provinces = trail_location.get("provinces", [])
    t_districts = trail_location.get("districts", [])

    if user_district and user_district in t_districts:
        return GEO_SCORES["district_match"]

    if user_province and user_province in t_provinces:
        return GEO_SCORES["province_match"]

    nearby = GEO_TRAVEL_AFFINITY.get(user_province, set())
    if any(p in nearby for p in t_provinces):
        return GEO_SCORES["neighbor_province"]

    return GEO_SCORES["fallback"]


# ── Signal 6: Popularity Prior ────────────────────────────────

def _popularity_prior(trail_rating, trail_num_reviews):
    """Bayesian average. Smooths low-review trails."""
    rating = trail_rating or 0
    num = trail_num_reviews or 0

    bayesian = (
        (MIN_VOTES_THRESHOLD * GLOBAL_MEAN_RATING + num * rating) /
        (MIN_VOTES_THRESHOLD + num)
    )
    return max(0.0, min(1.0, (bayesian - 1.0) / 4.0))


# ── Main Scorer ──────────────────────────────────────────────

def score_trail(profile, trail):
    """Compute CBF score for one trail given one user profile."""
    reasons = []

    interests = profile.get("interests", [])
    fitness = profile.get("experienceLevel", "beginner")
    budget_level = profile.get("budgetLevel", "Medium")
    availability = profile.get("availability", "Flexible")
    province = profile.get("province", "")
    district = profile.get("district", "")
    dob = profile.get("dob")

    trail_tags = trail.get("tags", [])
    trail_diff = trail.get("difficulty", "Moderate")
    trail_dscore = trail.get("difficultyScore", 0)
    trail_cost_max = (trail.get("cost") or {}).get("max_npr", 0)
    trail_min_days = (trail.get("duration") or {}).get("min_days", 1)
    trail_location = trail.get("location", {})
    trail_rating = trail.get("rating", 0)
    trail_num_reviews = trail.get("numReviews", 0)

    s_interest = _interest_match(interests, trail_tags)
    s_difficulty = _difficulty_match(fitness, trail_diff, trail_dscore, dob)
    s_budget = _budget_match(budget_level, trail_cost_max)
    s_availability = _availability_match(availability, trail_min_days)
    s_geo = _geo_affinity(province, district, trail_location)
    s_popularity = _popularity_prior(trail_rating, trail_num_reviews)

    if s_difficulty == 0.0 or s_availability == 0.0:
        return 0.0, []

    score = (
        CBF_WEIGHTS["interest"]     * s_interest +
        CBF_WEIGHTS["difficulty"]   * s_difficulty +
        CBF_WEIGHTS["budget"]       * s_budget +
        CBF_WEIGHTS["availability"] * s_availability +
        CBF_WEIGHTS["geo"]          * s_geo +
        CBF_WEIGHTS["popularity"]   * s_popularity
    )

    if s_interest > 0.1:
        matched = [i for i in interests if i in INTEREST_TAGS]
        if matched:
            reasons.append(f"Matches your {', '.join(matched)} interests")

    reasons.append(f"{trail_diff.lower()} difficulty")

    t_provs = trail_location.get("provinces", [])
    if t_provs:
        reasons.append(f"located in {t_provs[0]}")

    return score, reasons


def get_cbf_scores(profile, trails):
    """Score ALL trails for one user. Returns {trailId: (score, reasons)}."""
    scores = {}
    for trail in trails:
        tid = trail["_id"]
        score, reasons = score_trail(profile, trail)
        if score > 0:
            scores[tid] = (score, reasons)
    return scores