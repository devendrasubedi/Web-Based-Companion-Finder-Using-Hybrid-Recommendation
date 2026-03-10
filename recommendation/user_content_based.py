"""
USER CBF — N×N similarity matrix from 6 profile signals.

FLOW:
  1. Compute 6 signal matrices (each N×N):
     interest (Jaccard) → experience (ordinal) → availability (lookup)
     → geo (tiered) → budget (ordinal) → age (Gaussian)
  2. Weighted sum → one N×N similarity matrix.
  3. Zero diagonal (don't recommend yourself).

FIX #1: Geo now checks 77 district neighbors before province fallback.

WHY MultiLabelBinarizer: Converts variable-length interest arrays into
    fixed-width binary vectors for sklearn's pairwise Jaccard computation.
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
    DISTRICT_NEIGHBORS,  # FIX #1
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


# ── Signal 3: Availability Compatibility ─────────────────────

def _availability_similarity(profiles_df):
    """
    Lookup table — NOT pure similarity.
    Flexible+Weekends = 0.8 (works), Weekends+Weekdays = 0.2 (rarely works).
    Default for unlisted pairs = 0.2.
    """
    values = profiles_df["availability"].values
    n = len(values)
    sim = np.full((n, n), 0.2)
    for i in range(n):
        for j in range(i, n):
            pair = (values[i], values[j])
            score = USER_AVAILABILITY_COMPAT.get(
                pair, USER_AVAILABILITY_COMPAT.get((pair[1], pair[0]), 0.2)
            )
            sim[i, j] = score
            sim[j, i] = score
    return sim


# ── Signal 4: Geo Similarity (FIX #1: district-aware) ───────

def _geo_similarity(profiles_df):
    """
    FIX #1: 5-tier matching using 77 districts.
    Tier 1: same district        → 1.0
    Tier 2: neighbor district    → 0.55  (NEW)
    Tier 3: same province        → 0.7
    Tier 4: neighbor province    → 0.4
    Tier 5: fallback             → 0.2
    """
    provinces = profiles_df["province"].values
    districts = profiles_df["district"].values
    n = len(provinces)
    sim = np.full((n, n), 0.2)

    for i in range(n):
        sim[i, i] = 1.0
        for j in range(i + 1, n):
            # Tier 1: same district
            if districts[i] and districts[j] and districts[i] == districts[j]:
                score = 1.0

            # Tier 2: neighbor district (FIX #1)
            elif districts[i] and districts[j]:
                neighbors_i = DISTRICT_NEIGHBORS.get(districts[i], set())
                if districts[j] in neighbors_i:
                    score = 0.55
                # Tier 3: same province
                elif provinces[i] and provinces[j] and provinces[i] == provinces[j]:
                    score = 0.7
                # Tier 4: neighbor province
                elif provinces[i] and provinces[j]:
                    prov_neighbors = GEO_TRAVEL_AFFINITY.get(provinces[i], set())
                    score = 0.4 if provinces[j] in prov_neighbors else 0.2
                else:
                    score = 0.2

            # District unknown — fall back to province tiers
            elif provinces[i] and provinces[j] and provinces[i] == provinces[j]:
                score = 0.7
            elif provinces[i] and provinces[j]:
                prov_neighbors = GEO_TRAVEL_AFFINITY.get(provinces[i], set())
                score = 0.4 if provinces[j] in prov_neighbors else 0.2
            else:
                score = 0.2

            sim[i, j] = score
            sim[j, i] = score

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