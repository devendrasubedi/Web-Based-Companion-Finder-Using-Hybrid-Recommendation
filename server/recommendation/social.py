"""
Social Signal — Friend Interaction Boost for TRAIL recs only.

"3 of your friends saved Annapurna Circuit"
→ boost Annapurna Circuit's score for you.

Not used for companion recs (that's a different pipeline).
"""

from collections import defaultdict


def get_friend_ids(target_uid, friendships):
    """Get set of accepted friend IDs"""
    friends = set()
    for rel in friendships:
        if rel["userA"] == target_uid:
            friends.add(rel["userB"])
        elif rel["userB"] == target_uid:
            friends.add(rel["userA"])
    return friends


def get_blocked_ids(target_uid, blocked):
    """Get set of blocked user IDs"""
    blocked_ids = set()
    for rel in blocked:
        if rel["userA"] == target_uid:
            blocked_ids.add(rel["userB"])
        elif rel["userB"] == target_uid:
            blocked_ids.add(rel["userA"])
    return blocked_ids


def compute_social_scores(target_uid, interactions, friendships):
    """
    Score trails by friend activity.

    For each trail:
      1. How many friends interacted with it?
      2. How strongly? (average implicitScore)
      3. Combined: avg_score × friend_count_boost

    Returns: { trail_id: social_score (0–1) }
    """
    friend_ids = get_friend_ids(target_uid, friendships)
    if not friend_ids:
        return {}

    friend_trail_scores = defaultdict(list)
    for inter in interactions:
        if inter["userId"] in friend_ids:
            friend_trail_scores[inter["trailId"]].append(
                inter.get("implicitScore", 1)
            )

    result = {}
    for tid, scores in friend_trail_scores.items():
        avg = sum(scores) / len(scores)
        friend_boost = min(len(scores) / 3.0, 1.0)
        result[tid] = min((avg / 13.0) * friend_boost, 1.0)

    return result