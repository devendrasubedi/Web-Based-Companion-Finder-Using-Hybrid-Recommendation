"""
HYBRID RECOMMENDER — Blends CBF + CF + Social signals.
Orchestrator: CBF scores → CF scores → alpha blend → friend boost → cache write.
"""

import logging
from bson import ObjectId

from config import (
    HYBRID_FRIEND_BOOST,
    CF_ONLY_DISCOUNT,
    BULK_WRITE_BATCH_SIZE,
)
from data_loader import (
    load_trails, load_all_profiles, load_single_profile,
    load_all_interactions, load_user_interactions,
    load_all_relationships, build_friend_trail_sets,
    write_cache, write_cache_bulk,
)
from content_based import get_cbf_scores
from collaborative import get_cf_scores, compute_alpha

logger = logging.getLogger("rec.hybrid")


def _blend_scores(cbf_scores, cf_scores, alpha, excluded, friend_trails):
    """Blend CBF and CF. Apply friend boost. Enforce hard filters."""
    all_trails = set(cbf_scores.keys()) | set(cf_scores.keys())
    results = []

    for tid in all_trails:
        if tid in excluded:
            continue

        cbf_score = 0.0
        reasons = []
        if tid in cbf_scores:
            cbf_score, reasons = cbf_scores[tid]

        cf_score = cf_scores.get(tid, 0.0)

        if tid not in cbf_scores and alpha == 0:
            continue

        if alpha == 0:
            final = cbf_score
        elif cbf_score > 0 and cf_score > 0:
            final = (1 - alpha) * cbf_score + alpha * cf_score
        elif cbf_score > 0:
            final = cbf_score
        elif cf_score > 0:
            final = alpha * cf_score * CF_ONLY_DISCOUNT
        else:
            continue

        friend_boosted = False
        if friend_trails and tid in friend_trails:
            final = min(1.0, final + HYBRID_FRIEND_BOOST)
            friend_boosted = True

        reason_parts = list(reasons)
        if cf_score > 0.3:
            reason_parts.append("recommended by similar trekkers")
        if friend_boosted:
            reason_parts.append("saved by your friends")

        results.append({
            "itemId": str(tid),
            "score": round(final, 4),
            "reason": " · ".join(reason_parts) if reason_parts else "",
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:50]


def _model_version(alpha):
    if alpha == 0:
        return "cbf-v1.0"
    elif alpha <= 0.3:
        return "hybrid-cbf-dominant-v1.0"
    elif alpha <= 0.5:
        return "hybrid-balanced-v1.0"
    else:
        return "hybrid-cf-dominant-v1.0"


def compute_for_user(user_id, all_interactions=None, friends_map=None,
                     blocked_map=None, friend_trail_sets=None):
    """Compute and cache recommendations for one user."""
    uid_str = str(user_id)

    profile = load_single_profile(user_id)
    if not profile:
        logger.warning(f"No profile for {uid_str}, skipping")
        return False

    trails = load_trails()
    if not trails:
        logger.error("No trails loaded")
        return False

    if all_interactions is not None:
        excluded = set(all_interactions.get(uid_str, {}).keys())
        interaction_count = len(excluded)
    else:
        all_interactions, all_excluded = load_all_interactions()
        excluded = all_excluded.get(uid_str, set())
        interaction_count = len(all_interactions.get(uid_str, {}))

    if friends_map is None or blocked_map is None:
        friends_map, blocked_map = load_all_relationships()

    if friend_trail_sets is None:
        friend_trail_sets = build_friend_trail_sets(friends_map, all_interactions)

    cbf_scores = get_cbf_scores(profile, trails)

    alpha = compute_alpha(interaction_count)
    cf_scores = {}
    if alpha > 0:
        cf_scores = get_cf_scores(uid_str, all_interactions, friends_map, blocked_map)

    friend_trails = friend_trail_sets.get(uid_str, set())
    recommendations = _blend_scores(cbf_scores, cf_scores, alpha, excluded, friend_trails)

    if not recommendations:
        logger.warning(f"No recs for {uid_str}")
        return False

    model = _model_version(alpha)
    uid_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
    write_cache(uid_obj, "trails", recommendations, model)
    logger.info(f"Cached {len(recommendations)} recs for {uid_str} (alpha={alpha})")
    return True


def compute_for_all():
    """Recompute for ALL users. Called by cron every 6 hours."""
    logger.info("=" * 60)
    logger.info("BULK RECOMPUTATION STARTED")
    logger.info("=" * 60)

    trails = load_trails()
    profiles = load_all_profiles()
    all_interactions, all_excluded = load_all_interactions()
    friends_map, blocked_map = load_all_relationships()
    friend_trail_sets = build_friend_trail_sets(friends_map, all_interactions)

    logger.info(
        f"Data loaded: {len(trails)} trails, {len(profiles)} profiles, "
        f"{len(all_interactions)} users with interactions"
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

        cbf_scores = get_cbf_scores(profile, trails)

        interaction_count = len(all_interactions.get(uid_str, {}))
        alpha = compute_alpha(interaction_count)
        cf_scores = {}
        if alpha > 0:
            cf_scores = get_cf_scores(uid_str, all_interactions, friends_map, blocked_map)

        excluded = all_excluded.get(uid_str, set())
        friend_trails = friend_trail_sets.get(uid_str, set())
        recs = _blend_scores(cbf_scores, cf_scores, alpha, excluded, friend_trails)

        if recs:
            cache_batch.append((uid, "trails", recs, _model_version(alpha)))
            processed += 1
        else:
            skipped += 1

        if len(cache_batch) >= BULK_WRITE_BATCH_SIZE:
            write_cache_bulk(cache_batch)
            cache_batch = []

        if (i + 1) % 500 == 0:
            logger.info(f"  Progress: {i+1}/{len(profiles)}")

    if cache_batch:
        write_cache_bulk(cache_batch)

    logger.info(f"BULK COMPLETE: {processed} processed, {skipped} skipped")
    return {"processed": processed, "skipped": skipped, "total": len(profiles)}