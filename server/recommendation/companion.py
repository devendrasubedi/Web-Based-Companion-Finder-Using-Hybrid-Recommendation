"""
Companion Matching — User-to-User Recommendation

Two signals:
  1. Profile similarity (60%) — content-based user×user
     province, interests, experience, languages, budget, availability
  
  2. Behavioral similarity (40%) — collaborative filtering user×user
     users who saved/completed same trails

Filters:
  - Exclude blocked users
  - Exclude self
"""

EXP_MAP = {"Beginner": 1, "Intermediate": 2, "Advanced": 3, "Expert": 4}


def profile_similarity(a, b):
    """
    Content-based similarity between two user profiles.

    Jaccard for interests (what they want)
    Exact match for province (where they are)
    Proximity for experience (how skilled)
    Overlap for languages (can they communicate)
    Proximity for budget (can they afford same trips)
    Match for availability (when they're free)
    """
    score = 0.0

    # Province (0.20)
    if a.get("province") == b.get("province"):
        score += 0.20

    # Interest overlap — Jaccard (0.30)
    a_int = set(a.get("interests", []))
    b_int = set(b.get("interests", []))
    if a_int and b_int:
        score += (len(a_int & b_int) / len(a_int | b_int)) * 0.30

    # Experience level closeness (0.20)
    a_exp = EXP_MAP.get(a.get("experienceLevel", "Beginner"), 1)
    b_exp = EXP_MAP.get(b.get("experienceLevel", "Beginner"), 1)
    diff = abs(a_exp - b_exp)
    if diff == 0: score += 0.20
    elif diff == 1: score += 0.12
    elif diff == 2: score += 0.05

    # Language overlap (0.15)
    a_lang = set(a.get("languagesKnown", []))
    b_lang = set(b.get("languagesKnown", []))
    if a_lang and b_lang:
        score += min(len(a_lang & b_lang) / max(len(a_lang), 1), 1.0) * 0.15

    # Budget compatibility (0.10)
    budget_order = {"Low": 1, "Medium": 2, "High": 3, "Very High": 4}
    a_b = budget_order.get(a.get("budgetLevel", "Medium"), 2)
    b_b = budget_order.get(b.get("budgetLevel", "Medium"), 2)
    if abs(a_b - b_b) <= 1: score += 0.10
    elif abs(a_b - b_b) == 2: score += 0.04

    # Availability (0.05)
    if a.get("availability") == b.get("availability"):
        score += 0.05

    return min(score, 1.0)


def companion_reason(a, b):
    """Human-readable explanation for why this companion was recommended"""
    reasons = []
    if a.get("province") == b.get("province"):
        reasons.append(f"Same province: {a['province']}")
    shared = set(a.get("interests", [])) & set(b.get("interests", []))
    if shared:
        reasons.append(f"Shared interests: {', '.join(shared)}")
    if a.get("experienceLevel") == b.get("experienceLevel"):
        reasons.append("Same experience level")
    shared_lang = set(a.get("languagesKnown", [])) & set(b.get("languagesKnown", []))
    if len(shared_lang) > 1:
        reasons.append(f"Languages: {', '.join(list(shared_lang)[:3])}")
    return ". ".join(reasons[:3]) if reasons else "Similar trekking profile"


def compute_companions(user, profiles, cf_user_scores, friend_ids, blocked_ids, top_n=20):
    """
    Hybrid companion ranking for one user.

    For each candidate:
      hybrid = 0.6 × profile_similarity + 0.4 × cf_user_similarity

    Returns sorted list of companion dicts.
    """
    uid = user["userId"]
    results = []

    for other in profiles:
        oid = other["userId"]
        if oid == uid or oid in blocked_ids:
            continue

        # Content-based profile match (60%)
        p_score = profile_similarity(user, other)

        # CF behavioral similarity (40%)
        cf_score = cf_user_scores.get(oid, 0.0)

        hybrid = p_score * 0.6 + cf_score * 0.4

        # Friend boost
        if oid in friend_ids:
            hybrid = min(hybrid * 1.1, 1.0)

        if hybrid > 0.15:
            results.append({
                "userId": str(oid),
                "name": other.get("name", ""),
                "score": round(hybrid, 4),
                "reason": companion_reason(user, other),
                "profileScore": round(p_score, 3),
                "cfScore": round(cf_score, 3),
                "province": other.get("province", ""),
                "experienceLevel": other.get("experienceLevel", ""),
                "interests": other.get("interests", []),
                "isFriend": oid in friend_ids
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]