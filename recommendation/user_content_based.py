"""
USER CBF — N×N similarity matrix from 6 profile signals.

FLOW:
  1. Compute 6 signal matrices (each N×N):
     interest (Jaccard) → experience (ordinal) → availability (lookup)
     → geo (tiered) → budget (ordinal) → age (Gaussian)
  2. Weighted sum → one N×N similarity matrix.
  3. Zero diagonal (don't recommend yourself).

PERFORMANCE:
  All 6 signals are fully vectorized with numpy — no Python for-loops
  over user pairs. The geo signal was the previous O(N²) bottleneck;
  it now uses numpy broadcasting on pre-mapped arrays.
"""

import logging
import numpy as np
import pandas as pd
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics import pairwise_distances

from config import (
    USER_CBF_WEIGHTS, USER_EXPERIENCE_ORDER, USER_BUDGET_ORDER,
    USER_AVAILABILITY_COMPAT, USER_AGE_SIGMA,
    GEO_TRAVEL_AFFINITY,
    DISTRICT_NEIGHBORS,
)

logger = logging.getLogger("rec.user_cbf")


# ── Signal 1: Interest Similarity ────────────────────────────

def _interest_similarity(profiles_df):
    """
    Step 1: MultiLabelBinarizer converts ["adventure","nature"] → [1,0,1,0,0].
    Step 2: sklearn pairwise Jaccard distance for all user pairs.
    Step 3: Convert distance to similarity (1 - distance).
    """
    mlb = MultiLabelBinarizer()
    interest_matrix = mlb.fit_transform(profiles_df["interests"])
    sim = 1 - pairwise_distances(interest_matrix, metric="jaccard")
    return np.nan_to_num(sim, nan=0.0)


# ── Signal 2 & 5: Ordinal Similarity (experience, budget) ───

def _ordinal_similarity(profiles_df, column, order):
    """
    1 - |rank_a - rank_b| / max_diff.
    Same level = 1.0. Adjacent = 0.67. Extreme ends = 0.0.
    Used for experienceLevel and budgetLevel.
    """
    rank_map = {v: i for i, v in enumerate(order)}
    values = profiles_df[column].map(rank_map).fillna(1).values.astype(float)
    max_diff = max(len(order) - 1, 1)
    diff = np.abs(values.reshape(-1, 1) - values.reshape(1, -1))
    return 1.0 - (diff / max_diff)


# ── Signal 3: Availability Compatibility (fully vectorized) ──

def _availability_similarity(profiles_df):
    """
    Vectorized lookup using numpy broadcasting — no Python for-loop.
    Build a lookup array indexed by (i_code, j_code) using pre-mapped
    integer codes, then broadcast for all pairs at once.
    Default for unlisted pairs = 0.2.
    """
    values = profiles_df["availability"].values
    unique_vals = list(dict.fromkeys(values))          # preserve order, dedupe
    code_map = {v: i for i, v in enumerate(unique_vals)}
    codes = np.array([code_map[v] for v in values], dtype=int)
    m = len(unique_vals)

    # Build m×m lookup table (all 0.2 by default)
    lookup = np.full((m, m), 0.2)
    for (a, b), score in USER_AVAILABILITY_COMPAT.items():
        ai = code_map.get(a)
        bi = code_map.get(b)
        if ai is not None and bi is not None:
            lookup[ai, bi] = score
            lookup[bi, ai] = score

    # Broadcast: sim[i,j] = lookup[codes[i], codes[j]]
    return lookup[np.ix_(codes, codes)]


# ── Signal 4: Geo Similarity (fully vectorized, district-aware) ──

def _geo_similarity(profiles_df):
    """
    5-tier geo matching — fully vectorized with numpy broadcasting.

    Tier 1: same district        → 1.0
    Tier 2: neighbor district    → 0.55
    Tier 3: same province        → 0.7
    Tier 4: neighbor province    → 0.4
    Tier 5: fallback             → 0.2

    Strategy:
      Pre-encode districts and provinces as integer codes.
      Build NxN membership masks for each tier with broadcasting,
      then assign scores in reverse-priority order (lowest first).
    """
    provinces = profiles_df["province"].values
    districts = profiles_df["district"].values
    n = len(provinces)

    # Start everything at fallback
    sim = np.full((n, n), 0.2)

    # ── Tier 4: neighbor province ──────────────────────────────
    # For each pair (i, j), check if province[j] is in the neighbor
    # set of province[i].  Build a boolean N×N mask via broadcasting.
    prov_neighbor_mask = np.zeros((n, n), dtype=bool)
    for i, p in enumerate(provinces):
        if not p:
            continue
        neighbors = GEO_TRAVEL_AFFINITY.get(p, set())
        for j, q in enumerate(provinces):
            if q and q in neighbors:
                prov_neighbor_mask[i, j] = True
    sim[prov_neighbor_mask] = 0.4

    # ── Tier 3: same province ──────────────────────────────────
    prov_codes = np.array([p if p else "__none__" for p in provinces])
    same_prov = (prov_codes[:, None] == prov_codes[None, :])
    has_prov = (prov_codes != "__none__")
    same_prov &= has_prov[:, None] & has_prov[None, :]
    sim[same_prov] = 0.7

    # ── Tier 2: neighbor district ──────────────────────────────
    dist_neighbor_mask = np.zeros((n, n), dtype=bool)
    for i, d in enumerate(districts):
        if not d:
            continue
        neighbors = DISTRICT_NEIGHBORS.get(d, set())
        if not neighbors:
            continue
        for j, e in enumerate(districts):
            if e and e in neighbors:
                dist_neighbor_mask[i, j] = True
    sim[dist_neighbor_mask] = 0.55

    # ── Tier 1: same district ──────────────────────────────────
    dist_codes = np.array([d if d else "__none__" for d in districts])
    same_dist = (dist_codes[:, None] == dist_codes[None, :])
    has_dist = (dist_codes != "__none__")
    same_dist &= has_dist[:, None] & has_dist[None, :]
    sim[same_dist] = 1.0

    # Self-similarity = 1.0 (will be zeroed by diagonal later)
    np.fill_diagonal(sim, 1.0)
    return sim


# ── Signal 6: Age Proximity ─────────────────────────────────

def _age_similarity(profiles_df):
    """
    Gaussian decay: exp(-0.5 × (age_diff / sigma)²).
    Same age = 1.0, 10yr = 0.61, 20yr = 0.14, 30yr = 0.01.
    """
    ages = profiles_df["age"].values.astype(float)
    diff = np.abs(ages.reshape(-1, 1) - ages.reshape(1, -1))
    return np.exp(-0.5 * (diff / USER_AGE_SIGMA) ** 2)


# ══════════════════════════════════════════════════════════════
#  PUBLIC API
# ══════════════════════════════════════════════════════════════

def compute_user_cbf_matrix(profiles_df):
    """
    Compute full N×N user CBF similarity matrix.
    Step 1: Compute 6 signal matrices.
    Step 2: Weighted sum.
    Step 3: Zero diagonal.
    """
    if profiles_df.empty:
        return np.array([])

    w = USER_CBF_WEIGHTS
    n = len(profiles_df)
    logger.info(f"Computing user CBF matrix for {n} users...")

    sim = (
        _interest_similarity(profiles_df)                                 * w["interest"]
        + _ordinal_similarity(profiles_df, "experienceLevel",
                              USER_EXPERIENCE_ORDER)                      * w["experience"]
        + _availability_similarity(profiles_df)                           * w["availability"]
        + _geo_similarity(profiles_df)                                    * w["geo"]
        + _ordinal_similarity(profiles_df, "budgetLevel",
                              USER_BUDGET_ORDER)                          * w["budget"]
        + _age_similarity(profiles_df)                                    * w["age"]
    )

    np.fill_diagonal(sim, 0.0)
    logger.info(f"User CBF matrix done: {n}x{n}, mean={sim.mean():.4f}, max={sim.max():.4f}")
    return sim