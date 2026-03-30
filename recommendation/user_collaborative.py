"""
USER CF — User-user similarity from trail interaction behavior.

FLOW:
  1. Build sparse user×trail matrix from interactions DataFrame.
  2. sklearn cosine_similarity → N×N matrix.
  3. Enforce min 3 common trails.
  4. Zero diagonal.

NOTE: No IDF here. For companion matching, popular-trail overlap IS meaningful.
      Temporal decay already applied in data_loader.py before this runs.
"""

import logging
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity

from config import (
    USER_CF_MIN_COMMON_TRAILS,
    USER_CF_K_NEIGHBORS,
    USER_ALPHA_THRESHOLDS,
)

logger = logging.getLogger("rec.user_cf")


def build_interaction_matrix(interactions_df, user_ids, trail_ids):
    """
    Build sparse user×trail matrix from DataFrame.
    Step 1: Map userId and trailId strings to integer indices.
    Step 2: Filter to valid entries (exist in both maps).
    Step 3: Build scipy csr_matrix.
    """
    user_idx_map = {uid: i for i, uid in enumerate(user_ids)}
    trail_idx_map = {tid: i for i, tid in enumerate(trail_ids)}

    valid = interactions_df[
        interactions_df["userId"].isin(user_idx_map)
        & interactions_df["trailId"].isin(trail_idx_map)
    ]

    rows = valid["userId"].map(user_idx_map).values
    cols = valid["trailId"].map(trail_idx_map).values
    data = valid["cf_score"].values

    matrix = csr_matrix(
        (data, (rows, cols)),
        shape=(len(user_ids), len(trail_ids))
    )
    logger.info(
        f"User interaction matrix: {matrix.shape}, "
        f"nnz={matrix.nnz}, density={matrix.nnz / max(matrix.shape[0] * matrix.shape[1], 1):.4f}"
    )
    return matrix


def compute_user_cf_matrix(interaction_matrix):
    """
    Compute user-user cosine similarity from behavior.
    Step 1: sklearn cosine_similarity on sparse matrix.
    Step 2: Zero diagonal.
    Step 3: Zero out pairs with < 3 common trails.
    Step 4: Top-K cutoff per row.
    """
    if interaction_matrix.shape[0] == 0:
        return np.array([])

    # Step 1: Cosine similarity
    cf_matrix = cosine_similarity(interaction_matrix)

    # Step 2: Zero diagonal
    np.fill_diagonal(cf_matrix, 0.0)

    # Step 3: Enforce minimum common trails
    if USER_CF_MIN_COMMON_TRAILS > 1:
        binary = (interaction_matrix > 0).astype(float)
        common_counts = (binary @ binary.T).toarray()
        cf_matrix[common_counts < USER_CF_MIN_COMMON_TRAILS] = 0.0

    # Step 4: Top-K cutoff — keep only top USER_CF_K_NEIGHBORS per row
    n = cf_matrix.shape[0]
    if n > USER_CF_K_NEIGHBORS:
        for i in range(n):
            row = cf_matrix[i]
            # Indices sorted ascending; take all but the top K, zero them
            cutoff_indices = np.argsort(row)[:-(USER_CF_K_NEIGHBORS)]
            row[cutoff_indices] = 0.0

    nonzero = (cf_matrix > 0).sum()
    mean_nz = cf_matrix[cf_matrix > 0].mean() if nonzero > 0 else 0
    logger.info(f"User CF matrix done: {cf_matrix.shape}, nonzero_pairs={nonzero}, mean={mean_nz:.4f}")
    return cf_matrix


def compute_user_alpha(interaction_count):
    """Look up CF weight based on interaction count."""
    for threshold, alpha in USER_ALPHA_THRESHOLDS:
        if interaction_count <= threshold:
            return alpha
    return USER_ALPHA_THRESHOLDS[-1][1]


def get_interaction_counts(interactions_df, user_ids):
    """Count interactions per user for alpha lookup."""
    counts = interactions_df.groupby("userId").size()
    return {uid: int(counts.get(uid, 0)) for uid in user_ids}