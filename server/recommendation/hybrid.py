"""
Hybrid Trail Scoring — Blends all 4 signals.

Weights:
  Content (TF-IDF + rules):  45%
  Collaborative (Item-Item): 35%
  Social (Friends):          15%
  Popularity:                 5%
"""

from collections import defaultdict
from content_based import INTEREST_TO_TAGS

W_CONTENT = 0.45
W_CF = 0.35
W_SOCIAL = 0.15
W_POPULARITY = 0.05


def trail_reason(user, trail, c_score, cf_score, s_score):
    """Why was this trail recommended?"""
    reasons = []

    if c_score > 0.4:
        u_tags = set()
        for interest in user.get("interests", []):
            for tag in INTEREST_TO_TAGS.get(interest, []):
                u_tags.add(tag.lower().replace("-", "_"))
        t_tags = set(tag.lower().replace("-", "_") for tag in trail.get("tags", []))
        matched = u_tags & t_tags
        if matched:
            reasons.append(f"Matches your interests: {', '.join(list(matched)[:3])}")
        if user.get("province") in trail.get("location", {}).get("provinces", []):
            reasons.append(f"In your province: {user['province']}")

    if cf_score > 0.2:
        reasons.append("Trekkers like you loved this")

    if s_score > 0.1:
        reasons.append("Your friends have trekked here")

    if trail.get("rating", 0) >= 4.0:
        reasons.append(f"Highly rated: {trail.get('rating', 0)}★")

    if not reasons:
        reasons.append(f"Good match for {user.get('experienceLevel', 'your')} level")

    return ". ".join(reasons[:3])


def compute_hybrid_trail_scores(user, trails, content_scores,
                                 cf_trail_scores, social_scores,
                                 interactions, top_n=30):
    """
    Blend all signals for one user → ranked trail list.
    """
    uid = user["userId"]

    # User's completed + interacted trails
    completed = set()
    interacted = set()
    for inter in interactions:
        if inter["userId"] == uid:
            if inter.get("isCompleted"):
                completed.add(inter["trailId"])
            interacted.add(inter["trailId"])

    # Popularity
    trail_counts = defaultdict(int)
    for inter in interactions:
        trail_counts[inter["trailId"]] += 1
    max_count = max(trail_counts.values()) if trail_counts else 1
    popularity = {tid: c / max_count for tid, c in trail_counts.items()}

    results = []
    for trail in trails:
        tid = trail["_id"]
        if tid in completed:
            continue

        c = content_scores.get(tid, 0)
        cf = cf_trail_scores.get(tid, 0)
        s = social_scores.get(tid, 0)
        p = popularity.get(tid, 0)

        hybrid = c * W_CONTENT + cf * W_CF + s * W_SOCIAL + p * W_POPULARITY

        # Deprioritize already-saved (user knows about it)
        if tid in interacted:
            hybrid *= 0.7

        if hybrid > 0.05:
            results.append({
                "trailId": tid,
                "name": trail.get("name", ""),
                "score": round(hybrid, 4),
                "reason": trail_reason(user, trail, c, cf, s),
                "contentScore": round(c, 3),
                "cfScore": round(cf, 3),
                "socialScore": round(s, 3),
                "difficulty": trail.get("difficulty", ""),
                "rating": trail.get("rating", 0),
                "distance_km": trail.get("distance_km", 0)
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]