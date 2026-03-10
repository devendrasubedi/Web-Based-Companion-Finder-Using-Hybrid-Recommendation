"""
TRAIL CF — Find similar users by behavior, recommend their unseen trails.

FLOW:
  1. Build sparse user×trail matrix (5000×129).
  2. Apply IDF weighting (rare trails count more).
  3. Cosine similarity: target user vs all users.
  4. Filter: min 2 common trails, exclude blocked, boost friends/FoF.
  5. Top 20 neighbors → aggregate their unseen trail scores.
  6. Normalize to [0, 1].

FIX #7: get_prebuilt_cf_data() builds matrix ONCE for bulk.
        get_trail_cf_scores() accepts prebuilt data to skip rebuild.

WHY IDF: Without it, Everest Base Camp (70% of users) dominates similarity.
         IDF downweights popular trails so niche shared trails matter more.
"""

import logging
import numpy as np
from collections import defaultdict
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfTransformer

from config import (
    CF_K_NEIGHBORS, CF_MIN_COMMON_TRAILS,
    CF_FRIEND_BOOST, CF_FOF_BOOST, ALPHA_THRESHOLDS,
)

logger = logging.getLogger("rec.trail_cf")


# ── Step 1: Build sparse matrix ─────────────────────────────

def _build_sparse_matrix(interactions_by_user):
    """
    Convert {uid: {trailId: score}} dict → scipy sparse matrix.
    Only stores non-zero entries (34K out of 645K = 5.3% density).
    Returns: matrix, user_ids list, trail_ids list.
    """
    trail_set = set()
    for user_trails in interactions_by_user.values():
        trail_set.update(user_trails.keys())

    user_ids = list(interactions_by_user.keys())
    trail_ids = sorted(trail_set)
    trail_idx = {tid: i for i, tid in enumerate(trail_ids)}

    rows, cols, data = [], [], []
    for i, uid in enumerate(user_ids):
        for tid, score in interactions_by_user[uid].items():
            if tid in trail_idx:
                rows.append(i)
                cols.append(trail_idx[tid])
                data.append(score)

    matrix = csr_matrix(
        (data, (rows, cols)),
        shape=(len(user_ids), len(trail_ids))
    )
    return matrix, user_ids, trail_ids


# ── Step 2: IDF weighting ───────────────────────────────────

def _apply_idf_weighting(matrix):
    """
    sklearn TfidfTransformer applies IDF: log((1+N)/(1+df)) + 1.
    Rare trails get high weight, popular trails get low weight.
    smooth_idf=True prevents division by zero.
    """
    transformer = TfidfTransformer(norm=None, use_idf=True, smooth_idf=True)
    return transformer.fit_transform(matrix)


# ══════════════════════════════════════════════════════════════
#  FIX #7: PREBUILT CF DATA — build ONCE, pass to all users
# ══════════════════════════════════════════════════════════════

def get_prebuilt_cf_data(interactions_by_user):
    """
    Build sparse matrix + IDF weighting + binary matrix ONCE.
    Called once before the bulk loop — NOT per user.
    Saves ~350 seconds (70ms × 5000 users) in bulk.
    """
    if not interactions_by_user:
        return None

    matrix, user_ids, trail_ids = _build_sparse_matrix(interactions_by_user)
    weighted_matrix = _apply_idf_weighting(matrix)
    binary = (matrix > 0).astype(float)
    user_idx_map = {uid: i for i, uid in enumerate(user_ids)}

    logger.info(
        f"Prebuilt CF data: {len(user_ids)} users × {len(trail_ids)} trails, "
        f"nnz={matrix.nnz}"
    )

    return {
        "weighted_matrix": weighted_matrix,
        "binary": binary,
        "user_ids": user_ids,
        "trail_ids": trail_ids,
        "user_idx_map": user_idx_map,
    }


# ══════════════════════════════════════════════════════════════
#  PUBLIC API
# ══════════════════════════════════════════════════════════════

def get_trail_cf_scores(target_uid, interactions_by_user, friends_map, blocked_map,
                        prebuilt=None):
    """
    Compute CF trail scores for one user.

    Step 1: Get or build the sparse matrix (FIX #7: use prebuilt if available).
    Step 2: Cosine similarity — target vs all users.
    Step 3: Enforce min common trails (filter noise).
    Step 4: Graph boost — friends +0.15, FoF +0.07, blocked → 0.
    Step 5: Top K=20 neighbors.
    Step 6: Score unseen trails (weighted avg of neighbor scores).
    Step 7: Normalize to [0, 1].
    """
    if target_uid not in interactions_by_user or not interactions_by_user[target_uid]:
        return {}

    # Step 1: Use prebuilt matrix (bulk) or build fresh (single user)
    if prebuilt:
        user_ids = prebuilt["user_ids"]
        user_idx_map = prebuilt["user_idx_map"]
        weighted_matrix = prebuilt["weighted_matrix"]
        binary = prebuilt["binary"]
    else:
        matrix, user_ids, trail_ids = _build_sparse_matrix(interactions_by_user)
        weighted_matrix = _apply_idf_weighting(matrix)
        binary = (matrix > 0).astype(float)
        user_idx_map = {uid: i for i, uid in enumerate(user_ids)}

    if target_uid not in user_idx_map:
        return {}

    target_idx = user_idx_map[target_uid]

    # Step 2: Cosine similarity — target row vs entire matrix
    target_row = weighted_matrix[target_idx]
    sim_all = cosine_similarity(target_row, weighted_matrix).flatten()

    # Step 3: Enforce minimum common trails
    target_binary = binary[target_idx]
    common_counts = (target_binary @ binary.T).toarray().flatten()
    sim_all[common_counts < CF_MIN_COMMON_TRAILS] = 0.0
    sim_all[target_idx] = 0.0  # don't match yourself

    # Step 4: Graph enhancements
    blocked = blocked_map.get(target_uid, set())
    friends = friends_map.get(target_uid, set())
    fof = set()
    for fid in friends:
        fof.update(friends_map.get(fid, set()))
    fof -= friends
    fof.discard(target_uid)

    for j, uid in enumerate(user_ids):
        if uid in blocked:
            sim_all[j] = 0.0
        elif uid in friends:
            sim_all[j] += CF_FRIEND_BOOST
        elif uid in fof:
            sim_all[j] += CF_FOF_BOOST

    # Step 5: Top K neighbors
    top_k_indices = np.argsort(sim_all)[::-1][:CF_K_NEIGHBORS]
    neighbors = [
        (user_ids[j], float(sim_all[j]))
        for j in top_k_indices if sim_all[j] > 0
    ]

    if not neighbors:
        return {}

    # Step 6: Score unseen trails from neighbor interactions
    already_seen = set(interactions_by_user[target_uid].keys())
    trail_scores = defaultdict(float)
    trail_weights = defaultdict(float)

    for neighbor_uid, similarity in neighbors:
        for tid, n_score in interactions_by_user.get(neighbor_uid, {}).items():
            if tid in already_seen:
                continue
            trail_scores[tid] += similarity * n_score
            trail_weights[tid] += similarity

    raw_scores = {}
    for tid in trail_scores:
        if trail_weights[tid] > 0:
            raw_scores[tid] = trail_scores[tid] / trail_weights[tid]

    if not raw_scores:
        return {}

    # Step 7: Normalize to [0, 1]
    max_score = max(raw_scores.values())
    if max_score <= 0:
        return {}

    cf_scores = {tid: score / max_score for tid, score in raw_scores.items()}
    logger.debug(f"Trail CF for {target_uid}: {len(neighbors)} neighbors, {len(cf_scores)} scores")
    return cf_scores


def compute_trail_alpha(interaction_count):
    """Look up CF weight based on interaction count."""
    for threshold, alpha in ALPHA_THRESHOLDS:
        if interaction_count <= threshold:
            return alpha
    return ALPHA_THRESHOLDS[-1][1]