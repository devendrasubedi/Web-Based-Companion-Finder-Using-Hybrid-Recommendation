"""
RECOMMENDATION SERVICE — FastAPI Entry Point.
Routes: /health, /run/user/{id}, /run/all, /status, /metrics, /test/{id}
"""

import os
import asyncio
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from config import MAX_WORKERS, CRON_INTERVAL_HOURS
from data_loader import get_db, close_db
from hybrid import compute_for_user, compute_for_all
from metrics import run_all_metrics

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("rec.app")

PRIORITY_HIGH = 0
PRIORITY_LOW = 1

_queued_users = set()
_queue = None

_stats = {
    "last_bulk_run": None,
    "last_bulk_result": None,
    "users_queued": 0,
    "users_processed": 0,
}


async def _worker(worker_id):
    while True:
        try:
            priority, user_id = await _queue.get()
            logger.info(f"Worker-{worker_id}: Processing {user_id}")
            _queued_users.discard(user_id)

            loop = asyncio.get_event_loop()
            success = await loop.run_in_executor(None, compute_for_user, user_id)

            if success:
                _stats["users_processed"] += 1
            _queue.task_done()

        except Exception as e:
            logger.error(f"Worker-{worker_id} error: {e}", exc_info=True)
            _queue.task_done()


async def _queue_user(user_id, priority=PRIORITY_HIGH):
    uid_str = str(user_id)
    if uid_str in _queued_users:
        return False
    _queued_users.add(uid_str)
    _stats["users_queued"] += 1
    await _queue.put((priority, uid_str))
    return True


async def _scheduled_bulk_run():
    logger.info("Scheduled bulk run starting...")
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, compute_for_all)
    _stats["last_bulk_run"] = datetime.utcnow().isoformat()
    _stats["last_bulk_result"] = result
    logger.info(f"Bulk run complete: {result}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _queue

    logger.info("RECOMMENDATION SERVICE STARTING")
    get_db()

    _queue = asyncio.PriorityQueue()

    workers = []
    for i in range(MAX_WORKERS):
        task = asyncio.create_task(_worker(i))
        workers.append(task)

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        _scheduled_bulk_run, "interval",
        hours=CRON_INTERVAL_HOURS, id="bulk_recompute",
    )
    scheduler.start()
    logger.info(f"Scheduler: bulk run every {CRON_INTERVAL_HOURS}h")
    logger.info("Service ready!")

    yield

    scheduler.shutdown()
    for task in workers:
        task.cancel()
    close_db()


app = FastAPI(
    title="TrekMate Recommendation Service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    try:
        db = get_db()
        db.command("ping")
        return {
            "status": "healthy",
            "db": "connected",
            "workers": MAX_WORKERS,
            "queue_size": _queue.qsize() if _queue else 0,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Unhealthy: {e}")


@app.post("/run/user/{user_id}")
async def run_single_user(user_id: str):
    queued = await _queue_user(user_id, PRIORITY_HIGH)
    return {
        "status": "queued" if queued else "already_queued",
        "user_id": user_id,
        "priority": "high",
    }


@app.post("/run/all")
async def run_all_users():
    asyncio.create_task(_scheduled_bulk_run())
    return {"status": "started", "message": "Bulk recomputation running in background"}


@app.get("/status")
async def get_status():
    return {
        "queue_size": _queue.qsize() if _queue else 0,
        "queued_users": len(_queued_users),
        "stats": _stats,
    }


@app.get("/metrics")
async def get_metrics():
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, run_all_metrics)
    return result


@app.get("/test/{user_id}")
async def test_user_recommendations(user_id: str):
    """DEBUG: Enter any userId, see CBF + CF + hybrid scores separately."""
    from data_loader import (
        load_trails, load_single_profile, load_all_interactions,
        load_all_relationships, build_friend_trail_sets,
    )
    from content_based import get_cbf_scores
    from collaborative import get_cf_scores, compute_alpha
    from hybrid import _blend_scores

    profile = load_single_profile(user_id)
    if not profile:
        return {"error": f"No profile found for {user_id}"}

    trails = load_trails()
    trail_names = {str(t["_id"]): t.get("name", "Unknown") for t in trails}

    all_interactions, all_excluded = load_all_interactions()
    friends_map, blocked_map = load_all_relationships()
    friend_trail_sets = build_friend_trail_sets(friends_map, all_interactions)

    uid_str = str(user_id)

    cbf_scores = get_cbf_scores(profile, trails)

    interaction_count = len(all_interactions.get(uid_str, {}))
    alpha = compute_alpha(interaction_count)

    cf_scores = {}
    if alpha > 0:
        cf_scores = get_cf_scores(uid_str, all_interactions, friends_map, blocked_map)

    excluded = all_excluded.get(uid_str, set())
    friend_trails = friend_trail_sets.get(uid_str, set())
    recommendations = _blend_scores(cbf_scores, cf_scores, alpha, excluded, friend_trails)

    top_cbf = sorted(cbf_scores.items(), key=lambda x: x[1][0], reverse=True)[:10]
    top_cf = sorted(cf_scores.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "user_id": user_id,
        "profile": {
            "interests": profile.get("interests", []),
            "experienceLevel": profile.get("experienceLevel", ""),
            "budgetLevel": profile.get("budgetLevel", ""),
            "availability": profile.get("availability", ""),
            "province": profile.get("province", ""),
        },
        "stats": {
            "interaction_count": interaction_count,
            "alpha": alpha,
            "cbf_weight": round(1 - alpha, 2),
            "cf_weight": alpha,
            "friends_count": len(friends_map.get(uid_str, set())),
            "excluded_trails": len(excluded),
        },
        "top_10_cbf_only": [
            {"trail": trail_names.get(str(tid), str(tid)), "score": round(s, 4), "reasons": r}
            for tid, (s, r) in top_cbf
        ],
        "top_10_cf_only": [
            {"trail": trail_names.get(str(tid), str(tid)), "score": round(s, 4)}
            for tid, s in top_cf
        ],
        "final_recommendations": [
            {"rank": i + 1, "trail": trail_names.get(r["itemId"], r["itemId"]),
             "score": r["score"], "reason": r["reason"]}
            for i, r in enumerate(recommendations[:20])
        ],
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("REC_SERVICE_PORT", "8000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)