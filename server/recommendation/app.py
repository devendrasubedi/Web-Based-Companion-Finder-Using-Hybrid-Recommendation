"""
TrekMate Recommendation Engine — FastAPI

Two endpoints:
  GET /api/recommend/trails/{user_id}      → trail recommendations
  GET /api/recommend/companions/{user_id}  → companion recommendations

Run:
  cd server/recommendation
  pip install -r requirements.txt
  python app.py
"""

import time
from fastapi import FastAPI, HTTPException
from bson import ObjectId
import uvicorn

from data_loader import load_all, get_user_profile
from content_based import ContentScorer
from collaborative import build_matrices, trail_cf_scores, companion_cf_scores
from social import compute_social_scores, get_friend_ids, get_blocked_ids
from companion import compute_companions
from hybrid import compute_hybrid_trail_scores

app = FastAPI(
    title="TrekMate Recommendation Engine",
    version="1.0",
    description="Hybrid: TF-IDF Content + Item-Item CF + Social + User-User Companion"
)


@app.get("/api/recommend/trails/{user_id}")
def recommend_trails(user_id: str):
    t0 = time.time()

    try:
        uid = ObjectId(user_id)
    except Exception:
        raise HTTPException(400, "Invalid user ID")

    # Load fresh data
    profiles, interactions, trails, friendships, blocked = load_all()
    user = get_user_profile(uid, profiles)
    if not user:
        raise HTTPException(404, "User not found")

    # 1. Content-based (TF-IDF + rules)
    scorer = ContentScorer(profiles, trails)
    content_scores = scorer.score_all_trails(user)

    # 2. Collaborative filtering (Item-Item)
    matrix, user_ids, trail_ids, user_idx, trail_idx = build_matrices(
        interactions, trails, profiles
    )
    cf_scores = trail_cf_scores(matrix, uid, user_ids, trail_ids, user_idx, trail_idx)

    # 3. Social signal
    social = compute_social_scores(uid, interactions, friendships)

    # 4. Hybrid blend
    recommendations = compute_hybrid_trail_scores(
        user, trails, content_scores, cf_scores, social, interactions
    )

    return {
        "userId": user_id,
        "userName": user.get("name", ""),
        "recommendations": recommendations,
        "count": len(recommendations),
        "computeTime": round(time.time() - t0, 2),
        "weights": {"content": 0.45, "collaborative": 0.35, "social": 0.15, "popularity": 0.05}
    }


@app.get("/api/recommend/companions/{user_id}")
def recommend_companions(user_id: str):
    t0 = time.time()

    try:
        uid = ObjectId(user_id)
    except Exception:
        raise HTTPException(400, "Invalid user ID")

    profiles, interactions, trails, friendships, blocked = load_all()
    user = get_user_profile(uid, profiles)
    if not user:
        raise HTTPException(404, "User not found")

    # Social graph
    friend_ids = get_friend_ids(uid, friendships)
    blocked_ids = get_blocked_ids(uid, blocked)

    # CF user-user similarity
    matrix, user_ids, trail_ids, user_idx, trail_idx = build_matrices(
        interactions, trails, profiles
    )
    cf_user = companion_cf_scores(matrix, uid, user_ids, user_idx)

    # Companion matching (profile 60% + CF 40%)
    companions = compute_companions(
        user, profiles, cf_user, friend_ids, blocked_ids
    )

    return {
        "userId": user_id,
        "userName": user.get("name", ""),
        "companions": companions,
        "count": len(companions),
        "computeTime": round(time.time() - t0, 2)
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "trekmate-recommendation-engine"}


if __name__ == "__main__":
    print()
    print("  🚀 TrekMate Recommendation Engine")
    print("  ──────────────────────────────────")
    print("  Trails:     http://localhost:5001/api/recommend/trails/{user_id}")
    print("  Companions: http://localhost:5001/api/recommend/companions/{user_id}")
    print("  Docs:       http://localhost:5001/docs")
    print("  Health:     http://localhost:5001/health")
    print()
    uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=True)