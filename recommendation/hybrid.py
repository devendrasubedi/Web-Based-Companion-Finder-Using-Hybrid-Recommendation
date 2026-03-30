"""
TRAIL HYBRID — Blend CBF + CF + social signals, write to cache.

FLOW:
  1. Load data (trails, profiles, interactions, relationships).
  2. For each user:
     a. CBF: score all trails by profile.
     b. CF: score unseen trails by similar users' behavior.
     c. Blend: (1-α)×CBF + α×CF.
     d. Boost: trails friends interacted with +0.05.
     e. Write to Recommendation_Cache type="trails".

FIXES:
  #7 — Builds CF sparse matrix ONCE before loop (get_prebuilt_cf_data).
  #3 — Bulk only processes active users (last 60 days).
"""

import logging
import numpy as np
from bson import ObjectId

from config import (
    HYBRID_FRIEND_BOOST, CF_ONLY_DISCOUNT, BULK_WRITE_BATCH_SIZE,
)
from data_loader import (
    load_trails, load_all_profiles, load_single_profile,
    load_all_interactions,
    load_all_relationships, build_friend_trail_sets,
    write_cache, write_cache_bulk,
    get_active_user_ids,  # FIX #3
)
from trail_content_based import get_trail_cbf_scores, get_trail_cbf_scores_from_df
from trail_collaborative import (
    get_trail_cf_scores, compute_trail_alpha,
    get_prebuilt_cf_data,  # FIX #7
)

logger = logging.getLogger("rec.trail_hybrid")


def _blend_scores(cbf_scores, cf_scores, alpha, excluded, friend_trails):
    """
    Blend CBF and CF scores using numpy.
    Step 1: Collect all candidate trails (exclude already-interacted).
    Step 2: Build parallel arrays for vectorized math.
    Step 3: Blend based on which scores exist:
            - Both > 0: weighted average (1-α)×CBF + α×CF
            - CBF only: keep CBF score
            - CF only: discounted α×CF×0.5
    Step 4: Friend boost +0.05 (capped at 1.0).
    Step 5: Sort by score descending, return top 50.
    """
    all_trails = (set(cbf_scores.keys()) | set(cf_scores.keys())) - excluded

    trail_list, cbf_arr, cf_arr, reasons_list = [], [], [], []

    for tid in all_trails:
        cbf_score, reasons = 0.0, []
        if tid in cbf_scores:
            cbf_score, reasons = cbf_scores[tid]
        cf_score = cf_scores.get(tid, 0.0)

        # Skip CF-only trails when alpha=0 (new user, no CF trust)
        if tid not in cbf_scores and alpha == 0:
            continue

        trail_list.append(tid)
        cbf_arr.append(cbf_score)
        cf_arr.append(cf_score)
        reasons_list.append(reasons)

    if not trail_list:
        return []

    # Step 3: Vectorized blending
    cbf_np = np.array(cbf_arr)
    cf_np = np.array(cf_arr)
    both = (cbf_np > 0) & (cf_np > 0)
    cbf_only = (cbf_np > 0) & (cf_np <= 0)
    cf_only = (cbf_np <= 0) & (cf_np > 0)

    if alpha == 0:
        final = cbf_np.copy()
    else:
        final = np.zeros_like(cbf_np)
        final[both] = (1 - alpha) * cbf_np[both] + alpha * cf_np[both]
        final[cbf_only] = cbf_np[cbf_only]
        final[cf_only] = alpha * cf_np[cf_only] * CF_ONLY_DISCOUNT

    # Step 4: Friend boost
    friend_set = friend_trails or set()
    for i, tid in enumerate(trail_list):
        if tid in friend_set:
            final[i] = min(1.0, final[i] + HYBRID_FRIEND_BOOST)

    # Step 5: Build result list with reasons
    results = []
    for i in range(len(trail_list)):
        if final[i] <= 0:
            continue
        reason_parts = list(reasons_list[i])
        if cf_np[i] > 0.3:
            reason_parts.append("recommended by similar trekkers")
        if trail_list[i] in friend_set:
            reason_parts.append("saved by your friends")

        results.append({
            "itemId": str(trail_list[i]),
            "score": round(float(final[i]), 4),
            "reason": " · ".join(reason_parts) if reason_parts else "",
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:50]


def _model_version(alpha):
    """Model version string for cache tracking."""
    if alpha == 0:
        return "cbf-v1.0"
    elif alpha <= 0.3:
        return "hybrid-cbf-dominant-v1.0"
    elif alpha <= 0.5:
        return "hybrid-balanced-v1.0"
    else:
        return "hybrid-cf-dominant-v1.0"


def compute_for_user(user_id, all_interactions=None, all_excluded=None,
                     friends_map=None, blocked_map=None, friend_trail_sets=None, prebuilt=None):
    """
    Compute trail recommendations for ONE user.
    Accepts optional prebuilt CF data (FIX #7) and shared data to avoid reloading.
    Called by: queue worker (single user) or bulk loop (with shared data).
    """
    uid_str = str(user_id)

    # Step 1: Load profile
    profile = load_single_profile(user_id)
    if not profile:
        logger.warning(f"No profile for {uid_str}, skipping")
        return False

    # Step 2: Load trails
    trails = load_trails()
    if not trails:
        logger.error("No trails loaded")
        return False

    # Step 3: Load interactions (or use shared data from bulk)
    if all_interactions is not None:
        excluded = all_excluded.get(uid_str, set()) if all_excluded else set()
        interaction_count = len(all_interactions.get(uid_str, {}))
    else:
        all_interactions, all_excluded = load_all_interactions()
        excluded = all_excluded.get(uid_str, set())
        interaction_count = len(all_interactions.get(uid_str, {}))

    # Step 4: Load relationships (or use shared)
    if friends_map is None or blocked_map is None:
        friends_map, blocked_map = load_all_relationships()
    if friend_trail_sets is None:
        friend_trail_sets = build_friend_trail_sets(friends_map, all_interactions)

    # Step 5: CBF scoring
    cbf_scores = get_trail_cbf_scores(profile, trails)

    # Step 6: CF scoring (with prebuilt matrix if available)
    alpha = compute_trail_alpha(interaction_count)
    cf_scores = {}
    if alpha > 0:
        cf_scores = get_trail_cf_scores(
            uid_str, all_interactions, friends_map, blocked_map,
            prebuilt=prebuilt  # FIX #7
        )

    # Step 7: Blend + boost
    friend_trails = friend_trail_sets.get(uid_str, set())
    recommendations = _blend_scores(cbf_scores, cf_scores, alpha, excluded, friend_trails)

    if not recommendations:
        logger.warning(f"No recs for {uid_str}")
        return False

    # Step 8: Write to cache
    model = _model_version(alpha)
    uid_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
    write_cache(uid_obj, "trails", recommendations, model)
    logger.info(f"Cached {len(recommendations)} trail recs for {uid_str} (alpha={alpha})")
    return True


def compute_for_all():
    """
    Bulk trail recomputation.
    FIX #7: Builds CF matrix ONCE before the loop.
    FIX #3: Only processes active users.
    SPEED: Pre-builds trails DataFrame ONCE before the loop (vs. once per user).
    """
    logger.info("=" * 60)
    logger.info("TRAIL BULK RECOMPUTATION STARTED")
    logger.info("=" * 60)

    # Load all shared data once
    from trail_content_based import _trails_to_df  # noqa: PLC0415
    trails = load_trails()
    profiles = load_all_profiles()
    all_interactions, all_excluded = load_all_interactions()
    friends_map, blocked_map = load_all_relationships()
    friend_trail_sets = build_friend_trail_sets(friends_map, all_interactions)

    # SPEED: Convert trail list → DataFrame ONCE for all users
    trails_df = _trails_to_df(trails) if trails else None

    # FIX #7: Build sparse matrix + IDF ONCE (not 5000 times)
    prebuilt = get_prebuilt_cf_data(all_interactions)

    # FIX #3: Only recompute for active users
    active_ids = get_active_user_ids()

    logger.info(
        f"Data loaded: {len(trails)} trails, {len(profiles)} profiles, "
        f"{len(all_interactions)} users with interactions, "
        f"{len(active_ids)} active users"
    )

    processed = 0
    skipped = 0
    cache_batch = []

    for i, profile in enumerate(profiles):
        uid = profile.get("userId")
        if not uid:
            skipped += 1
            continue

        uid_str = str(uid)

        # FIX #3: Skip inactive users
        if active_ids and uid_str not in active_ids:
            skipped += 1
            continue

        # CBF — use pre-built DataFrame (no redundant conversion)
        cbf_scores = get_trail_cbf_scores_from_df(profile, trails_df)

        # CF (FIX #7: uses prebuilt matrix — no rebuild)
        interaction_count = len(all_interactions.get(uid_str, {}))
        alpha = compute_trail_alpha(interaction_count)
        cf_scores = {}
        if alpha > 0:
            cf_scores = get_trail_cf_scores(
                uid_str, all_interactions, friends_map, blocked_map,
                prebuilt=prebuilt
            )

        # Blend
        excluded = all_excluded.get(uid_str, set())
        friend_trails = friend_trail_sets.get(uid_str, set())
        recs = _blend_scores(cbf_scores, cf_scores, alpha, excluded, friend_trails)

        if recs:
            cache_batch.append((uid, "trails", recs, _model_version(alpha)))
            processed += 1
        else:
            skipped += 1

        # Batch write every 100 users
        if len(cache_batch) >= BULK_WRITE_BATCH_SIZE:
            write_cache_bulk(cache_batch)
            cache_batch = []

        if (i + 1) % 500 == 0:
            logger.info(f"  Progress: {i+1}/{len(profiles)}")

    if cache_batch:
        write_cache_bulk(cache_batch)

    logger.info(f"TRAIL BULK COMPLETE: {processed} processed, {skipped} skipped")
    return {"processed": processed, "skipped": skipped, "total": len(profiles)}