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

SINGLE-USER FAST PATH:
  compute_companions_for_user() computes only the target user's CBF ROW
  (dot product against all other users) rather than the full N×N matrix,
  making on-demand recomputation ~N× faster.

FIX #3: Bulk only processes active users.
"""

import logging
import numpy as np
from bson import ObjectId

from config import (
    USER_FOF_BOOST, USER_MUTUAL_FRIEND_BOOST, USER_MUTUAL_FRIEND_CAP,
    USER_CF_ONLY_DISCOUNT, USER_MAX_RECOMMENDATIONS, BULK_WRITE_BATCH_SIZE,
    USER_CBF_WEIGHTS, USER_EXPERIENCE_ORDER, USER_BUDGET_ORDER,
    USER_AVAILABILITY_COMPAT, USER_AGE_SIGMA, GEO_TRAVEL_AFFINITY, DISTRICT_NEIGHBORS,
    USER_CF_MIN_COMMON_TRAILS,
)
from data_loader import (
    load_profiles_df, load_interactions_df, load_relationships_df,
    load_trails, write_cache, write_cache_bulk,
    get_active_user_ids,
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

    t_int = set(target_prof.get("interests", []))
    c_int = set(cand_prof.get("interests", []))
    shared = t_int & c_int
    if shared:
        parts.append(f"shares {', '.join(sorted(shared))} interests")

    if target_prof.get("experienceLevel") == cand_prof.get("experienceLevel"):
        parts.append(f"{cand_prof['experienceLevel']} level trekker")

    if target_prof.get("province") and target_prof["province"] == cand_prof.get("province"):
        parts.append(f"from {cand_prof['province']}")

    if target_prof.get("availability") and target_prof["availability"] == cand_prof.get("availability"):
        parts.append(f"{cand_prof['availability'].lower()} availability")

    if is_fof:
        parts.append("friend of your friend")
    if mutual_count > 0:
        parts.append(f"{mutual_count} mutual friend{'s' if mutual_count > 1 else ''}")

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

    cbf_row = cbf_matrix[target_idx] if cbf_matrix.size > 0 else np.zeros(len(user_ids))
    cf_row = cf_matrix[target_idx] if cf_matrix.size > 0 else np.zeros(len(user_ids))

    results = []
    for j, cand_uid in enumerate(user_ids):
        if j == target_idx:
            continue
        if cand_uid in friends or cand_uid in blocked:
            continue

        cbf_s = float(cbf_row[j])
        cf_s = float(cf_row[j])

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

        is_fof = cand_uid in fof
        if is_fof:
            final = min(1.0, final + USER_FOF_BOOST)

        mutual = _count_mutual(target_uid, cand_uid, friends_map)
        mutual_bonus = min(mutual, USER_MUTUAL_FRIEND_CAP) * USER_MUTUAL_FRIEND_BOOST
        if mutual_bonus > 0:
            final = min(1.0, final + mutual_bonus)

        cand_prof = profiles_df.loc[cand_uid].to_dict() if cand_uid in profiles_df.index else {}
        reason = _build_reason(target_prof, cand_prof, is_fof, mutual, cf_s)

        results.append({
            "itemId": cand_uid,
            "score": round(final, 4),
            "reason": reason,
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:USER_MAX_RECOMMENDATIONS]


# ── Fast Single-User CBF Row ─────────────────────────────────

def _compute_cbf_row_for_user(target_uid, profiles_df):
    """
    Compute ONLY the CBF similarity row for the target user vs all others.
    Much faster than building the full N×N matrix for a single-user request.

    Strategy: compute each scalar signal between target and all N users
    using numpy vectorized operations, then weight-sum them.
    """
    from sklearn.preprocessing import MultiLabelBinarizer
    from sklearn.metrics.pairwise import cosine_similarity as sk_cosine

    if target_uid not in profiles_df.index:
        return np.zeros(len(profiles_df))

    n = len(profiles_df)
    w = USER_CBF_WEIGHTS
    t = profiles_df.loc[target_uid]

    # ── Interest (Jaccard) ────────────────────────────────────
    mlb = MultiLabelBinarizer()
    all_vecs = mlb.fit_transform(profiles_df["interests"])
    t_idx = list(profiles_df.index).index(target_uid)
    t_vec = all_vecs[t_idx:t_idx+1]
    # Jaccard via formula: J = |A∩B| / |A∪B|
    intersection = (t_vec & all_vecs).sum(axis=1).astype(float)
    union = (t_vec | all_vecs).sum(axis=1).astype(float)
    interest_row = np.where(union > 0, intersection / union, 0.0)

    # ── Experience (ordinal) ──────────────────────────────────
    rank_map_exp = {v: i for i, v in enumerate(USER_EXPERIENCE_ORDER)}
    max_diff_exp = max(len(USER_EXPERIENCE_ORDER) - 1, 1)
    t_exp = rank_map_exp.get(t.get("experienceLevel", "beginner"), 1)
    all_exp = np.array([rank_map_exp.get(v, 1) for v in profiles_df["experienceLevel"]], dtype=float)
    exp_row = 1.0 - np.abs(all_exp - t_exp) / max_diff_exp

    # ── Budget (ordinal) ──────────────────────────────────────
    rank_map_bud = {v: i for i, v in enumerate(USER_BUDGET_ORDER)}
    max_diff_bud = max(len(USER_BUDGET_ORDER) - 1, 1)
    t_bud = rank_map_bud.get(t.get("budgetLevel", "Medium"), 1)
    all_bud = np.array([rank_map_bud.get(v, 1) for v in profiles_df["budgetLevel"]], dtype=float)
    bud_row = 1.0 - np.abs(all_bud - t_bud) / max_diff_bud

    # ── Availability (lookup) ─────────────────────────────────
    t_avail = t.get("availability", "Flexible")
    avail_row = np.array([
        USER_AVAILABILITY_COMPAT.get(
            (t_avail, v),
            USER_AVAILABILITY_COMPAT.get((v, t_avail), 0.2)
        )
        for v in profiles_df["availability"]
    ], dtype=float)

    # ── Geo (tiered) ─────────────────────────────────────────
    t_prov = t.get("province", "")
    t_dist = t.get("district", "")
    t_prov_neighbors = GEO_TRAVEL_AFFINITY.get(t_prov, set())
    t_dist_neighbors = DISTRICT_NEIGHBORS.get(t_dist, set())

    all_prov = profiles_df["province"].values
    all_dist = profiles_df["district"].values
    geo_row = np.full(n, 0.2)

    for j in range(n):
        p = all_prov[j]
        d = all_dist[j]
        if t_dist and d and t_dist == d:
            geo_row[j] = 1.0
        elif t_dist and d and d in t_dist_neighbors:
            geo_row[j] = 0.55
        elif t_prov and p and t_prov == p:
            geo_row[j] = 0.7
        elif t_prov and p and p in t_prov_neighbors:
            geo_row[j] = 0.4

    # ── Age (Gaussian) ────────────────────────────────────────
    t_age = float(t.get("age", 30))
    all_ages = profiles_df["age"].values.astype(float)
    age_row = np.exp(-0.5 * ((all_ages - t_age) / USER_AGE_SIGMA) ** 2)

    # ── Weighted sum ──────────────────────────────────────────
    row = (
        interest_row  * w["interest"]
        + exp_row     * w["experience"]
        + avail_row   * w["availability"]
        + geo_row     * w["geo"]
        + bud_row     * w["budget"]
        + age_row     * w["age"]
    )

    # Zero out self
    row[t_idx] = 0.0
    return row


# ══════════════════════════════════════════════════════════════
#  PUBLIC API
# ══════════════════════════════════════════════════════════════

def compute_companions_for_user(user_id):
    """
    Compute companion recs for ONE user (on-demand via queue).

    FAST PATH: Computes only the target user's 1×N CBF row instead
    of the full N×N matrix. CF row is extracted cheaply from the
    N×N cosine similarity (the CF matrix is sparse and fast).
    """
    uid_str = str(user_id)

    profiles_df = load_profiles_df()
    if profiles_df.empty or uid_str not in profiles_df.index:
        logger.warning(f"No profile for {uid_str}, skipping companion recs")
        return False

    interactions_df = load_interactions_df()
    relationships_df = load_relationships_df()

    user_ids = list(profiles_df.index)
    target_idx = user_ids.index(uid_str)
    friends_map, blocked_map = _build_social_maps(relationships_df)

    # Fast single-user CBF row (no full N×N build)
    cbf_row = _compute_cbf_row_for_user(uid_str, profiles_df)
    cbf_matrix_row = cbf_row.reshape(1, -1)   # shape (1, N) for _blend_and_rank

    # CF: still need full matrix (cosine similarity requires all rows)
    trails = load_trails()
    trail_ids = [str(t["_id"]) for t in trails]
    interaction_matrix = build_interaction_matrix(interactions_df, user_ids, trail_ids)
    cf_matrix = compute_user_cf_matrix(interaction_matrix)

    interaction_counts = get_interaction_counts(interactions_df, user_ids)
    alpha = compute_user_alpha(interaction_counts.get(uid_str, 0))

    # Wrap the single row in a dummy matrix so _blend_and_rank still works
    # by indexing [target_idx].  We use a full zero matrix and insert our row.
    n = len(user_ids)
    cbf_full = np.zeros((n, n))
    cbf_full[target_idx] = cbf_row

    recs = _blend_and_rank(
        target_idx, user_ids, profiles_df,
        cbf_full, cf_matrix, alpha,
        friends_map, blocked_map,
    )

    if not recs:
        logger.warning(f"No companion recs for {uid_str}")
        return False

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

    profiles_df = load_profiles_df()
    if profiles_df.empty:
        logger.error("No profiles loaded, aborting")
        return {"processed": 0, "skipped": 0, "total": 0}

    interactions_df = load_interactions_df()
    relationships_df = load_relationships_df()

    user_ids = list(profiles_df.index)
    n_users = len(user_ids)
    friends_map, blocked_map = _build_social_maps(relationships_df)

    active_ids = get_active_user_ids()

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

    processed = 0
    skipped = 0
    cache_batch = []

    for i, uid in enumerate(user_ids):
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