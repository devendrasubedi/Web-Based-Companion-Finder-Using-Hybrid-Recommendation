"""
COLLABORATIVE FILTERING — Graph-Enhanced User-User KNN + IDF.
Feature-blind — only sees who interacted with what trail.
Finds similar users via cosine similarity, recommends their trails.
"""

import math
import logging
from collections import defaultdict

from config import (
    CF_K_NEIGHBORS,
    CF_MIN_COMMON_TRAILS,
    CF_FRIEND_BOOST,
    CF_FOF_BOOST,
    ALPHA_THRESHOLDS,
)

logger = logging.getLogger("rec.cf")


def _compute_idf(interactions_by_user):
    """IDF = log(total_users / users_per_trail). Rare trails → high weight."""
    n_users = len(interactions_by_user)
    if n_users == 0:
        return {}

    doc_freq = defaultdict(int)
    for user_trails in interactions_by_user.values():
        for tid in user_trails:
            doc_freq[tid] += 1

    return {tid: math.log(n_users / max(df, 1)) for tid, df in doc_freq.items()}


def _cosine_similarity(vec_a, vec_b, idf, common_trails):
    """IDF-weighted cosine between two users over shared trails."""
    if len(common_trails) < CF_MIN_COMMON_TRAILS:
        return 0.0

    dot = 0.0
    norm_a = 0.0
    norm_b = 0.0

    for tid in common_trails:
        w = idf.get(tid, 1.0)
        a_val = vec_a[tid] * w
        b_val = vec_b[tid] * w
        dot += a_val * b_val
        norm_a += a_val * a_val
        norm_b += b_val * b_val

    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (math.sqrt(norm_a) * math.sqrt(norm_b))


def _find_neighbors(target_uid, target_vec, interactions_by_user,
                    idf, friends_map, blocked_map):
    """
    Find K nearest neighbors with graph enhancement.
    Friends: +0.15. FoF: +0.07. Blocked: excluded.
    """
    if not target_vec:
        return []

    target_trails = set(target_vec.keys())
    blocked = blocked_map.get(target_uid, set())
    friends = friends_map.get(target_uid, set())

    # Friends of friends
    fof = set()
    for fid in friends:
        fof.update(friends_map.get(fid, set()))
    fof -= friends
    fof.discard(target_uid)

    candidates = []

    for uid, user_vec in interactions_by_user.items():
        if uid == target_uid:
            continue
        if uid in blocked:
            continue

        common = target_trails & set(user_vec.keys())
        sim = _cosine_similarity(target_vec, user_vec, idf, common)
        if sim <= 0:
            continue

        if uid in friends:
            sim += CF_FRIEND_BOOST
        elif uid in fof:
            sim += CF_FOF_BOOST

        candidates.append((uid, sim))

    candidates.sort(key=lambda x: x[1], reverse=True)
    return candidates[:CF_K_NEIGHBORS]


def get_cf_scores(target_uid, interactions_by_user, friends_map, blocked_map):
    """
    CF trail scores for one user.
    Weighted average of neighbor scores for unseen trails. Normalized 0–1.
    """
    target_vec = interactions_by_user.get(target_uid, {})
    if not target_vec:
        return {}

    idf = _compute_idf(interactions_by_user)
    neighbors = _find_neighbors(
        target_uid, target_vec, interactions_by_user,
        idf, friends_map, blocked_map
    )

    if not neighbors:
        return {}

    already_seen = set(target_vec.keys())

    trail_scores = defaultdict(float)
    trail_weights = defaultdict(float)

    for neighbor_uid, similarity in neighbors:
        neighbor_vec = interactions_by_user.get(neighbor_uid, {})
        for tid, n_score in neighbor_vec.items():
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

    max_score = max(raw_scores.values())
    if max_score <= 0:
        return {}

    cf_scores = {tid: score / max_score for tid, score in raw_scores.items()}
    logger.debug(f"CF for {target_uid}: {len(neighbors)} neighbors, {len(cf_scores)} scores")
    return cf_scores


def compute_alpha(interaction_count):
    """CF weight based on interaction count. More interactions → trust CF more."""
    for threshold, alpha in ALPHA_THRESHOLDS:
        if interaction_count <= threshold:
            return alpha
    return ALPHA_THRESHOLDS[-1][1]