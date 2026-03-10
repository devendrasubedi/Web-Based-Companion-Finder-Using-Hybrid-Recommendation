"""
USER HYBRID — Blend CBF + CF + social graph, write type="companions".

FLOW:
  1. Load profiles (DataFrame), interactions (DataFrame), relationships.
  2. Build CBF matrix (N×N) and CF matrix (N×N) ONCE.
  3. For each user:
     a. Extract CBF row and CF row (O(1) array indexing).
     b. Blend: (1-α)×CBF + α×CF.
     c. Social boost: FoF +0.08, mutual friends +0.02 each.
     d. Exclude: self, friends, blocked.
     e. Build reason string.
  4. Write to Recommendation_Cache type="companions".

FIX #3: Bulk only processes active users.
"""

import logging
import numpy as np
from bson import ObjectId

from config import (
    USER_FOF_BOOST, USER_MUTUAL_FRIEND_BOOST, USER_MUTUAL_FRIEND_CAP,
    USER_CF_ONLY_DISCOUNT, USER_MAX_RECOMMENDATIONS, BULK_WRITE_BATCH_SIZE,
)
from data_loader import (
    load_profiles_df, load_interactions_df, load_relationships_df,
    load_trails, write_cache, write_cache_bulk,
    get_active_user_ids,  # FIX #3
)
from user_content_based import compute_user_cbf_matrix
from user_collaborative import (
    build_interaction_matrix, compute_user_cf_matrix,
    compute_user_alpha, get_interaction_counts,
)

logger = logging.getLogger("rec.user_hybrid")


# ── Social Graph Helpers ─────────────────────────────────────

def _build_social_maps(relationships_df):
    """Convert relationships DataFrame into friends_map and blocked_map dicts."""
    friends_map = {}
    blocked_map = {}
    for _, row in relationships_df.iterrows():
        a, b, status = row["userA"], row["userB"], row["status"]
        if status == "accepted":
            friends_map.setdefault(a, set()).add(b)
            friends_map.setdefault(b, set()).add(a)
        elif status == "blocked":
            blocked_map.setdefault(a, set()).add(b)
            blocked_map.setdefault(b, set()).add(a)
    return friends_map, blocked_map


def _get_fof(uid, friends_map):
    """Friend-of-friend set (excluding direct friends and self)."""
    friends = friends_map.get(uid, set())
    fof = set()
    for fid in friends:
        fof.update(friends_map.get(fid, set()))
    fof -= friends
    fof.discard(uid)
    return fof


def _count_mutual(uid, candidate, friends_map):
    """Count mutual friends between two users."""
    return len(friends_map.get(uid, set()) & friends_map.get(candidate, set()))


# ── Reason Builder ───────────────────────────────────────────

def _build_reason(target_prof, cand_prof, is_fof, mutual_count, cf_score):
    """Build human-readable "why this companion?" string."""
    parts = []

    # Shared interests
    t_int = set(target_prof.get("interests", []))
    c_int = set(cand_prof.get("interests", []))
    shared = t_int & c_int
    if shared:
        parts.append(f"shares {', '.join(sorted(shared))} interests")

    # Same experience level
    if target_prof.get("experienceLevel") == cand_prof.get("experienceLevel"):
        parts.append(f"{cand_prof['experienceLevel']} level trekker")

    # Same location
    if target_prof.get("province") and target_prof["province"] == cand_prof.get("province"):
        parts.append(f"from {cand_prof['province']}")

    # Same availability
    if target_prof.get("availability") and target_prof["availability"] == cand_prof.get("availability"):
        parts.append(f"{cand_prof['availability'].lower()} availability")

    # Social signals
    if is_fof:
        parts.append("friend of your friend")
    if mutual_count > 0:
        parts.append(f"{mutual_count} mutual friend{'s' if mutual_count > 1 else ''}")

    # Behavioral signal
    if cf_score > 0.3:
        parts.append("treks similar trails")

    return " · ".join(parts) if parts else "compatible trekking profile"


def _user_model_version(alpha):
    """Model version string for cache tracking."""
    if alpha == 0:
        return "user-cbf-v1.0"
    elif alpha <= 0.25:
        return "user-hybrid-cbf-dominant-v1.0"
    elif alpha <= 0.45:
        return "user-hybrid-balanced-v1.0"
    else:
        return "user-hybrid-cf-dominant-v1.0"


# ── Core: Blend + Rank for One User ─────────────────────────

def _blend_and_rank(target_idx, user_ids, profiles_df,
                    cbf_matrix, cf_matrix, alpha,
                    friends_map, blocked_map):
    """
    For one user: blend CBF + CF rows, apply social boosts, rank candidates.

    Step 1: Get target user's CBF row and CF row (O(1) — array indexing).
    Step 2: For each candidate, compute blended score.
    Step 3: Apply FoF boost and mutual friend boost.
    Step 4: Build reason string.
    Step 5: Sort and return top 50.
    """
    target_uid = user_ids[target_idx]
    friends = friends_map.get(target_uid, set())
    blocked = blocked_map.get(target_uid, set())
    fof = _get_fof(target_uid, friends_map)
    target_prof = profiles_df.loc[target_uid].to_dict() if target_uid in profiles_df.index else {}

    # Step 1: Extract rows
    cbf_row = cbf_matrix[target_idx] if cbf_matrix.size > 0 else np.zeros(len(user_ids))
    cf_row = cf_matrix[target_idx] if cf_matrix.size > 0 else np.zeros(len(user_ids))

    results = []
    for j, cand_uid in enumerate(user_ids):
        # Exclude: self, existing friends, blocked users
        if j == target_idx:
            continue
        if cand_uid in friends or cand_uid in blocked:
            continue

        cbf_s = float(cbf_row[j])
        cf_s = float(cf_row[j])

        # Step 2: Blend
        if alpha == 0:
            if cbf_s <= 0:
                continue
            final = cbf_s
        elif cbf_s > 0 and cf_s > 0:
            final = (1 - alpha) * cbf_s + alpha * cf_s
        elif cbf_s > 0:
            final = cbf_s
        elif cf_s > 0:
            final = alpha * cf_s * USER_CF_ONLY_DISCOUNT
        else:
            continue

        # Step 3: Social boosts
        is_fof = cand_uid in fof
        if is_fof:
            final = min(1.0, final + USER_FOF_BOOST)

        mutual = _count_mutual(target_uid, cand_uid, friends_map)
        mutual_bonus = min(mutual, USER_MUTUAL_FRIEND_CAP) * USER_MUTUAL_FRIEND_BOOST
        if mutual_bonus > 0:
            final = min(1.0, final + mutual_bonus)

        # Step 4: Reason
        cand_prof = profiles_df.loc[cand_uid].to_dict() if cand_uid in profiles_df.index else {}
        reason = _build_reason(target_prof, cand_prof, is_fof, mutual, cf_s)

        results.append({
            "itemId": cand_uid,
            "score": round(final, 4),
            "reason": reason,
        })

    # Step 5: Sort and trim
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:USER_MAX_RECOMMENDATIONS]


# ══════════════════════════════════════════════════════════════
#  PUBLIC API
# ══════════════════════════════════════════════════════════════

def compute_companions_for_user(user_id):
    """Compute companion recs for ONE user (on-demand via queue)."""
    uid_str = str(user_id)

    # Step 1: Load all data
    profiles_df = load_profiles_df()
    if profiles_df.empty or uid_str not in profiles_df.index:
        logger.warning(f"No profile for {uid_str}, skipping companion recs")
        return False

    interactions_df = load_interactions_df()
    relationships_df = load_relationships_df()

    user_ids = list(profiles_df.index)
    target_idx = user_ids.index(uid_str)
    friends_map, blocked_map = _build_social_maps(relationships_df)

    # Step 2: Build matrices
    cbf_matrix = compute_user_cbf_matrix(profiles_df)

    trails = load_trails()
    trail_ids = [str(t["_id"]) for t in trails]
    interaction_matrix = build_interaction_matrix(interactions_df, user_ids, trail_ids)
    cf_matrix = compute_user_cf_matrix(interaction_matrix)

    # Step 3: Blend
    interaction_counts = get_interaction_counts(interactions_df, user_ids)
    alpha = compute_user_alpha(interaction_counts.get(uid_str, 0))

    recs = _blend_and_rank(
        target_idx, user_ids, profiles_df,
        cbf_matrix, cf_matrix, alpha,
        friends_map, blocked_map,
    )

    if not recs:
        logger.warning(f"No companion recs for {uid_str}")
        return False

    # Step 4: Cache
    model = _user_model_version(alpha)
    uid_obj = ObjectId(user_id) if isinstance(user_id, str) else user_id
    write_cache(uid_obj, "companions", recs, model)
    logger.info(f"Cached {len(recs)} companions for {uid_str} (alpha={alpha})")
    return True


def compute_companions_for_all():
    """
    Bulk companion recomputation.
    Builds CBF + CF matrices ONCE, then loops through users.
    FIX #3: Skips inactive users.
    """
    logger.info("=" * 60)
    logger.info("USER-TO-USER BULK RECOMPUTATION STARTED")
    logger.info("=" * 60)

    # Step 1: Load all data
    profiles_df = load_profiles_df()
    if profiles_df.empty:
        logger.error("No profiles loaded, aborting")
        return {"processed": 0, "skipped": 0, "total": 0}

    interactions_df = load_interactions_df()
    relationships_df = load_relationships_df()

    user_ids = list(profiles_df.index)
    n_users = len(user_ids)
    friends_map, blocked_map = _build_social_maps(relationships_df)

    # FIX #3: Active users only
    active_ids = get_active_user_ids()

    # Step 2: Build matrices ONCE
    logger.info(f"Building CBF matrix for {n_users} users...")
    cbf_matrix = compute_user_cbf_matrix(profiles_df)

    trails = load_trails()
    trail_ids = [str(t["_id"]) for t in trails]
    logger.info(f"Building CF matrix ({n_users} users x {len(trail_ids)} trails)...")
    interaction_matrix = build_interaction_matrix(interactions_df, user_ids, trail_ids)
    cf_matrix = compute_user_cf_matrix(interaction_matrix)

    interaction_counts = get_interaction_counts(interactions_df, user_ids)

    logger.info(
        f"Data ready: {n_users} users, {len(trails)} trails, "
        f"{len(interactions_df)} interactions, {len(active_ids)} active users"
    )

    # Step 3: Loop through users
    processed = 0
    skipped = 0
    cache_batch = []

    for i, uid in enumerate(user_ids):
        # FIX #3: Skip inactive
        if active_ids and uid not in active_ids:
            skipped += 1
            continue

        alpha = compute_user_alpha(interaction_counts.get(uid, 0))

        recs = _blend_and_rank(
            i, user_ids, profiles_df,
            cbf_matrix, cf_matrix, alpha,
            friends_map, blocked_map,
        )

        if recs:
            cache_batch.append((ObjectId(uid), "companions", recs, _user_model_version(alpha)))
            processed += 1
        else:
            skipped += 1

        if len(cache_batch) >= BULK_WRITE_BATCH_SIZE:
            write_cache_bulk(cache_batch)
            cache_batch = []

        if (i + 1) % 500 == 0:
            logger.info(f"  Progress: {i + 1}/{n_users}")

    if cache_batch:
        write_cache_bulk(cache_batch)

    logger.info(f"USER BULK COMPLETE: {processed} processed, {skipped} skipped")
    return {"processed": processed, "skipped": skipped, "total": n_users}