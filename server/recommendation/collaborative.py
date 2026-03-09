"""
Collaborative Filtering — Two Separate Outputs

1. Trail CF (Item-Item):
   - Build user-item matrix from implicitScores
   - Compute item-item cosine similarity
   - Predict scores for unseen trails
   - "Users who liked Trail A also liked Trail B"

2. Companion CF (User-User):
   - Same user-item matrix
   - Compute user-user cosine similarity
   - Find behaviorally similar users
   - "This user saves/completes the same trails as you"
"""

import numpy as np
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity


def build_matrices(interactions, trails, profiles):
    """
    Build sparse user-item matrix from interactions.
    Returns the matrix + index maps.
    """
    trail_ids = [t["_id"] for t in trails]
    user_ids = [p["userId"] for p in profiles]
    trail_idx = {tid: i for i, tid in enumerate(trail_ids)}
    user_idx = {uid: i for i, uid in enumerate(user_ids)}

    n_users = len(user_ids)
    n_trails = len(trail_ids)

    rows, cols, vals = [], [], []
    for inter in interactions:
        uid = inter["userId"]
        tid = inter["trailId"]
        if uid in user_idx and tid in trail_idx:
            rows.append(user_idx[uid])
            cols.append(trail_idx[tid])
            vals.append(inter.get("implicitScore", 1))

    if not rows:
        return None, user_ids, trail_ids, user_idx, trail_idx

    matrix = csr_matrix((vals, (rows, cols)), shape=(n_users, n_trails))
    return matrix, user_ids, trail_ids, user_idx, trail_idx


def trail_cf_scores(user_item, target_uid, user_ids, trail_ids, user_idx, trail_idx):
    """
    Item-Item CF for trail recommendations.

    How it works:
      1. Compute trail-trail cosine similarity (item_sim matrix)
      2. For target user, get their interacted trails
      3. For each UNSEEN trail, predict score:
         score = Σ sim(unseen_trail, interacted_trail) × user_rating
                 ─────────────────────────────────────────────────────
                              Σ |sim|

    Returns: { trail_id: predicted_score (0–1) }
    """
    if user_item is None or target_uid not in user_idx:
        return {}

    # Item-item similarity: how similar are trails based on who liked them
    item_sim = cosine_similarity(user_item.T)  # n_trails × n_trails

    uidx = user_idx[target_uid]
    user_row = user_item[uidx].toarray().flatten()
    interacted = np.where(user_row > 0)[0]

    if len(interacted) == 0:
        return {}

    scores = {}
    for tidx in range(len(trail_ids)):
        if user_row[tidx] > 0:
            continue  # skip already interacted

        sims = item_sim[tidx, interacted]
        ratings = user_row[interacted]
        denom = np.sum(np.abs(sims))

        if denom > 0:
            pred = np.dot(sims, ratings) / denom
            # Normalize to 0–1 (max implicitScore = 13)
            scores[trail_ids[tidx]] = min(max(pred / 13.0, 0), 1.0)

    return scores


def companion_cf_scores(user_item, target_uid, user_ids, user_idx, top_n=60):
    """
    User-User CF for companion recommendations.

    How it works:
      1. Compute user-user cosine similarity
         (users who saved/completed/rated same trails get high similarity)
      2. Return top N most similar users with their similarity scores

    Returns: { other_user_id: similarity_score (0–1) }
    """
    if user_item is None or target_uid not in user_idx:
        return {}

    # User-user similarity: how similar are users based on trail interactions
    user_sim = cosine_similarity(user_item)  # n_users × n_users

    uidx = user_idx[target_uid]
    sims = user_sim[uidx]

    # Get top similar users (exclude self)
    top_indices = np.argsort(sims)[::-1][1:top_n * 3]

    scores = {}
    for j in top_indices:
        if sims[j] > 0.01:
            scores[user_ids[j]] = float(sims[j])

    return scores