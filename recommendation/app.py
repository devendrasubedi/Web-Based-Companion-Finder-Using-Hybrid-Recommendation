"""
RECOMMENDATION SERVICE — FastAPI Entry Point.

ENDPOINTS:
  GET  /health                  → DB + service health check
  GET  /status                  → queue size, stats, last poll time
  GET  /metrics                 → trail + user evaluation metrics

  POST /run/user/{id}           → queue trail recs for one user
  POST /run/all                 → bulk trail recs (active users only)
  GET  /test/{id}               → debug trail CBF + CF + hybrid scores

  POST /run/companions/{id}     → queue companion recs for one user
  POST /run/all-companions      → bulk companion recs (active users only)
  GET  /test/companions/{id}    → debug companion CBF + CF + hybrid scores

BACKGROUND:
  - 4 async workers process the priority queue.
  - APScheduler runs full bulk every 6 hours.
  - FIX #6: APScheduler polls for changes every 60 seconds (incremental).
"""

import os
import asyncio
import logging

from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from config import MAX_WORKERS, CRON_INTERVAL_HOURS, INCREMENTAL_POLL_SECONDS
from data_loader import get_db, close_db, get_changed_users_since
from hybrid import compute_for_user, compute_for_all
from user_hybrid import compute_companions_for_user, compute_companions_for_all
from metrics import run_trail_metrics
from user_metrics import run_user_metrics

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
    "last_trail_bulk_run": None,
    "last_trail_bulk_result": None,
    "last_companion_bulk_run": None,
    "last_companion_bulk_result": None,
    "last_incremental_poll": None,
    "incremental_users_queued": 0,
    "users_queued": 0,
    "users_processed": 0,
}


# ── Queue Workers ────────────────────────────────────────────

async def _worker(worker_id):
    """
    Async worker that processes tasks from the priority queue.
    Each task: (priority, task_type, user_id).
    task_type is "trails" or "companions".
    """
    while True:
        try:
            priority, task_type, user_id = await _queue.get()
            logger.info(f"Worker-{worker_id}: {task_type} for {user_id}")
            _queued_users.discard(f"{task_type}:{user_id}")

            loop = asyncio.get_event_loop()
            if task_type == "trails":
                success = await loop.run_in_executor(None, compute_for_user, user_id)
            elif task_type == "companions":
                success = await loop.run_in_executor(None, compute_companions_for_user, user_id)
            else:
                success = False

            if success:
                _stats["users_processed"] += 1
            _queue.task_done()

        except Exception as e:
            logger.error(f"Worker-{worker_id} error: {e}", exc_info=True)
            _queue.task_done()


async def _queue_user(user_id, task_type="trails", priority=PRIORITY_HIGH):
    """Add a user task to the queue (deduplicates by task_type:user_id)."""
    key = f"{task_type}:{str(user_id)}"
    if key in _queued_users:
        return False
    _queued_users.add(key)
    _stats["users_queued"] += 1
    await _queue.put((priority, task_type, str(user_id)))
    return True


# ── Scheduled Bulk Runs ──────────────────────────────────────

async def _trail_bulk():
    """Run full trail bulk recomputation in background thread."""
    logger.info("Scheduled trail bulk run...")
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, compute_for_all)
    _stats["last_trail_bulk_run"] = datetime.utcnow().isoformat()
    _stats["last_trail_bulk_result"] = result


async def _companion_bulk():
    """Run full companion bulk recomputation in background thread."""
    logger.info("Scheduled companion bulk run...")
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, compute_companions_for_all)
    _stats["last_companion_bulk_run"] = datetime.utcnow().isoformat()
    _stats["last_companion_bulk_result"] = result


async def _full_bulk():
    """Run both trail and companion bulk concurrently (called every 6 hours)."""
    await asyncio.gather(_trail_bulk(), _companion_bulk())


# ── FIX #6: Incremental Poll Loop ───────────────────────────

_last_poll_time = None


async def _incremental_poll():
    """
    FIX #6: Poll MongoDB every 60 seconds for changed users.
    Checks updatedAt on 3 collections (interactions, relationships, profiles).
    Queues affected users for recomputation.
    No schema changes — uses existing timestamps.
    """
    global _last_poll_time

    # First call: just set the baseline time
    if _last_poll_time is None:
        _last_poll_time = datetime.utcnow()
        return

    try:
        loop = asyncio.get_event_loop()
        poll_time = _last_poll_time

        # Find users who changed since last poll
        changed_users = await loop.run_in_executor(
            None, get_changed_users_since, poll_time
        )

        _last_poll_time = datetime.utcnow()
        _stats["last_incremental_poll"] = _last_poll_time.isoformat()

        if not changed_users:
            return

        # Queue both trail + companion recs for each changed user
        queued_count = 0
        for uid in changed_users:
            q1 = await _queue_user(uid, "trails", PRIORITY_HIGH)
            q2 = await _queue_user(uid, "companions", PRIORITY_HIGH)
            if q1 or q2:
                queued_count += 1

        if queued_count > 0:
            _stats["incremental_users_queued"] += queued_count
            logger.info(f"Incremental: queued {queued_count} users for recomputation")

    except Exception as e:
        logger.error(f"Incremental poll error: {e}", exc_info=True)


# ── Lifespan (startup + shutdown) ────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup:
      1. Connect to MongoDB.
      2. Start 4 async workers.
      3. Schedule bulk (every 6h) + incremental poll (every 60s).
    Shutdown:
      1. Stop scheduler.
      2. Cancel workers.
      3. Close MongoDB.
    """
    global _queue, _last_poll_time

    logger.info("RECOMMENDATION SERVICE STARTING")
    get_db()

    _queue = asyncio.PriorityQueue()
    workers = [asyncio.create_task(_worker(i)) for i in range(MAX_WORKERS)]

    _last_poll_time = datetime.utcnow()

    scheduler = AsyncIOScheduler()
    scheduler.add_job(_full_bulk, "interval", hours=CRON_INTERVAL_HOURS, id="bulk")
    scheduler.add_job(
        _incremental_poll, "interval",
        seconds=INCREMENTAL_POLL_SECONDS, id="incremental"  # FIX #6
    )
    scheduler.start()

    logger.info(f"Scheduler: bulk every {CRON_INTERVAL_HOURS}h, incremental every {INCREMENTAL_POLL_SECONDS}s")
    logger.info("Service ready!")

    yield

    scheduler.shutdown()
    for task in workers:
        task.cancel()
    close_db()


app = FastAPI(
    title="TrekMate Recommendation Service",
    version="2.1.0",
    lifespan=lifespan,
)


# ══════════════════════════════════════════════════════════════
#  SHARED ENDPOINTS
# ══════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    """Check DB connection and service status."""
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


@app.get("/status")
async def get_status():
    """Current queue and processing stats."""
    return {
        "queue_size": _queue.qsize() if _queue else 0,
        "queued_tasks": len(_queued_users),
        "stats": _stats,
    }


@app.get("/metrics")
async def get_metrics():
    """Trail + user evaluation metrics."""
    loop = asyncio.get_event_loop()
    trail_m = await loop.run_in_executor(None, run_trail_metrics)
    user_m = await loop.run_in_executor(None, run_user_metrics)
    return {"trail_recommendations": trail_m, "user_recommendations": user_m}


# ══════════════════════════════════════════════════════════════
#  TRAIL ENDPOINTS
# ══════════════════════════════════════════════════════════════

@app.post("/run/user/{user_id}")
async def run_trail_recs(user_id: str):
    """Queue trail recs for one user (high priority)."""
    queued = await _queue_user(user_id, "trails", PRIORITY_HIGH)
    return {"status": "queued" if queued else "already_queued", "user_id": user_id, "type": "trails"}


@app.post("/run/all")
async def run_all_trail_recs():
    """Start bulk trail recomputation in background."""
    asyncio.create_task(_trail_bulk())
    return {"status": "started", "message": "Trail bulk recomputation running"}


@app.get("/test/{user_id}")
async def test_trail_recs(user_id: str):
    """DEBUG: See hybrid trail recommendations for a user."""
    from data_loader import (
        load_trails, load_single_profile, load_all_interactions,
        load_all_relationships, build_friend_trail_sets,
    )
    from trail_content_based import get_trail_cbf_scores
    from trail_collaborative import get_trail_cf_scores, compute_trail_alpha
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
    cbf_scores = get_trail_cbf_scores(profile, trails)

    interaction_count = len(all_interactions.get(uid_str, {}))
    alpha = compute_trail_alpha(interaction_count)

    cf_scores = {}
    if alpha > 0:
        cf_scores = get_trail_cf_scores(uid_str, all_interactions, friends_map, blocked_map)

    excluded = all_excluded.get(uid_str, set())
    friend_trails = friend_trail_sets.get(uid_str, set())
    recommendations = _blend_scores(cbf_scores, cf_scores, alpha, excluded, friend_trails)

    return {
        "user_id": user_id,
        "profile": {
            "interests": profile.get("interests", []),
            "experienceLevel": profile.get("experienceLevel", ""),
            "budgetLevel": profile.get("budgetLevel", ""),
            "availability": profile.get("availability", ""),
            "province": profile.get("province", ""),
            "district": profile.get("district", ""),
        },
        "stats": {
            "interaction_count": interaction_count,
            "alpha": alpha,
            "cbf_weight": round(1 - alpha, 2),
            "cf_weight": alpha,
            "friends_count": len(friends_map.get(uid_str, set())),
            "excluded_trails": len(excluded),
        },
        "hybrid_recommendations": [
            {"rank": i + 1, "trail": trail_names.get(r["itemId"], r["itemId"]),
             "score": r["score"], "reason": r["reason"]}
            for i, r in enumerate(recommendations[:20])
        ],
    }


# ══════════════════════════════════════════════════════════════
#  COMPANION ENDPOINTS
# ══════════════════════════════════════════════════════════════

@app.post("/run/companions/{user_id}")
async def run_companion_recs(user_id: str):
    """Queue companion recs for one user (high priority)."""
    queued = await _queue_user(user_id, "companions", PRIORITY_HIGH)
    return {"status": "queued" if queued else "already_queued", "user_id": user_id, "type": "companions"}


@app.post("/run/all-companions")
async def run_all_companion_recs():
    """Start bulk companion recomputation in background."""
    asyncio.create_task(_companion_bulk())
    return {"status": "started", "message": "Companion bulk recomputation running"}


@app.get("/test/companions/{user_id}")
async def test_companion_recs(user_id: str):
    """DEBUG: See hybrid companion recommendations for a user."""
    from data_loader import load_profiles_df, load_interactions_df, load_relationships_df, load_trails
    from user_content_based import compute_user_cbf_matrix
    from user_collaborative import (
        build_interaction_matrix, compute_user_cf_matrix,
        compute_user_alpha, get_interaction_counts,
    )
    from user_hybrid import _build_social_maps, _blend_and_rank

    profiles_df = load_profiles_df()
    if profiles_df.empty or user_id not in profiles_df.index:
        return {"error": f"No profile found for {user_id}"}

    interactions_df = load_interactions_df()
    relationships_df = load_relationships_df()
    trails = load_trails()

    user_ids = list(profiles_df.index)
    target_idx = user_ids.index(user_id)

    cbf_matrix = compute_user_cbf_matrix(profiles_df)

    trail_ids = [str(t["_id"]) for t in trails]
    interaction_matrix = build_interaction_matrix(interactions_df, user_ids, trail_ids)
    cf_matrix = compute_user_cf_matrix(interaction_matrix)

    interaction_counts = get_interaction_counts(interactions_df, user_ids)
    alpha = compute_user_alpha(interaction_counts.get(user_id, 0))

    friends_map, blocked_map = _build_social_maps(relationships_df)

    recs = _blend_and_rank(
        target_idx, user_ids, profiles_df,
        cbf_matrix, cf_matrix, alpha,
        friends_map, blocked_map,
    )

    target_prof = profiles_df.loc[user_id]

    return {
        "user_id": user_id,
        "profile": {
            "name": target_prof.get("name", ""),
            "interests": target_prof.get("interests", []),
            "experienceLevel": target_prof.get("experienceLevel", ""),
            "budgetLevel": target_prof.get("budgetLevel", ""),
            "availability": target_prof.get("availability", ""),
            "province": target_prof.get("province", ""),
            "district": target_prof.get("district", ""),
            "age": int(target_prof.get("age", 0)),
        },
        "stats": {
            "total_users": len(user_ids),
            "interaction_count": interaction_counts.get(user_id, 0),
            "alpha": alpha,
            "cbf_weight": round(1 - alpha, 2),
            "cf_weight": alpha,
            "friends_count": len(friends_map.get(user_id, set())),
        },
        "hybrid_recommendations": [
            {
                "rank": i + 1,
                "user": r["itemId"],
                "name": profiles_df.loc[r["itemId"]].get("name", "Unknown")
                        if r["itemId"] in profiles_df.index else "Unknown",
                "score": r["score"],
                "reason": r["reason"],
            }
            for i, r in enumerate(recs[:20])
        ],
    }


# ══════════════════════════════════════════════════════════════
#  RUN
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("REC_SERVICE_PORT", "8000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)