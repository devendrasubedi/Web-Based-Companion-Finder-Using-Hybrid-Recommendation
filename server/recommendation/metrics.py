"""
METRICS — Evaluation numbers for report/viva.
Coverage, avg score, alpha distribution, personalization.
"""

import logging
from data_loader import get_db

logger = logging.getLogger("rec.metrics")


def compute_coverage():
    """What % of trails appear in at least one user's top 50?"""
    db = get_db()
    pipeline = [
        {"$match": {"type": "trails"}},
        {"$unwind": "$recommendations"},
        {"$group": {"_id": None, "unique": {"$addToSet": "$recommendations.itemId"}}}
    ]
    result = list(db["Recommendation_Cache"].aggregate(pipeline))
    if result:
        covered = len(result[0]["unique"])
        total = db["Trails_metadata"].count_documents({})
        pct = round(covered / total * 100, 1)
        logger.info(f"Coverage: {covered}/{total} ({pct}%)")
        return {"covered": covered, "total": total, "percent": pct}
    return {"covered": 0, "total": 0, "percent": 0}


def compute_avg_score():
    """Average recommendation score across all users."""
    db = get_db()
    pipeline = [
        {"$match": {"type": "trails"}},
        {"$unwind": "$recommendations"},
        {"$group": {"_id": None, "avg": {"$avg": "$recommendations.score"}}}
    ]
    result = list(db["Recommendation_Cache"].aggregate(pipeline))
    avg = round(result[0]["avg"], 4) if result else 0
    logger.info(f"Avg score: {avg}")
    return avg


def compute_alpha_distribution():
    """Count of users per model version."""
    db = get_db()
    pipeline = [
        {"$match": {"type": "trails"}},
        {"$group": {"_id": "$modelVersion", "count": {"$sum": 1}}}
    ]
    result = {r["_id"]: r["count"] for r in db["Recommendation_Cache"].aggregate(pipeline)}
    logger.info(f"Model distribution: {result}")
    return result


def compute_personalization():
    """Jaccard distance between users' top-10 lists. Higher = more personalized."""
    db = get_db()
    docs = list(db["Recommendation_Cache"].find(
        {"type": "trails"},
        {"recommendations": {"$slice": 10}}
    ).limit(200))

    if len(docs) < 2:
        return 0.0

    distances = []
    for i in range(min(100, len(docs))):
        for j in range(i + 1, min(100, len(docs))):
            set_a = {r["itemId"] for r in docs[i].get("recommendations", [])}
            set_b = {r["itemId"] for r in docs[j].get("recommendations", [])}
            if set_a or set_b:
                jaccard = len(set_a & set_b) / len(set_a | set_b)
                distances.append(1 - jaccard)

    avg = round(sum(distances) / len(distances), 4) if distances else 0
    logger.info(f"Personalization: {avg}")
    return avg


def run_all_metrics():
    return {
        "coverage": compute_coverage(),
        "avg_score": compute_avg_score(),
        "alpha_distribution": compute_alpha_distribution(),
        "personalization": compute_personalization(),
    }