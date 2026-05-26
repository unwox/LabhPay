"""
Stage 10 — Session cleanup worker.

Two responsibilities, both fire on a Celery-beat schedule:

  cleanup_idle_sessions
    Scan every sess:{uid}:last_seen key. If a user hasn't been seen in
    longer than SESSION_INACTIVITY_TIMEOUT_SECONDS, purge every Redis key
    under sess:{uid}:*. This catches the case where the user just closed
    the tab without hitting /auth/logout.

  cleanup_orphan_results
    Find result blobs that have a private_mode=True hint and an analysis
    age older than PRIVATE_MODE_GRACE_SECONDS, then delete those specific
    result + status keys. Other sess:* keys are left alone — the user is
    still active, we just don't keep the analysis output around.

Both tasks are intentionally tolerant: if Redis blips, the next run picks
up the work. We never raise.
"""

from __future__ import annotations

import json
import os
import sys
import time

from celery_app import celery_app

# Worker boots without backend on the import path; add it on demand.
sys.path.append("/app/backend")
sys.path.append("/app")


def _settings():
    from app.core.config import get_settings  # type: ignore
    return get_settings()


def _redis():
    import redis  # type: ignore
    return redis.from_url(
        os.getenv("REDIS_URL", _settings().REDIS_URL),
        decode_responses=True,
        socket_timeout=2.0,
    )


@celery_app.task(name="cleanup.idle_sessions")
def cleanup_idle_sessions() -> dict:
    s = _settings()
    timeout = max(60, int(s.SESSION_INACTIVITY_TIMEOUT_SECONDS))
    now = int(time.time())
    r = _redis()
    purged = 0
    scanned = 0
    for k in r.scan_iter(match="sess:*:last_seen", count=200):
        scanned += 1
        try:
            raw = r.get(k)
            last_seen = int(raw) if raw is not None else 0
        except Exception:
            continue
        if now - last_seen < timeout:
            continue
        # Parse user id out of sess:{uid}:last_seen
        try:
            _, uid, _ = k.split(":", 2)
        except ValueError:
            continue
        deleted_for_user = 0
        for inner in r.scan_iter(match=f"sess:{uid}:*", count=200):
            try:
                r.delete(inner)
                deleted_for_user += 1
            except Exception:
                continue
        purged += deleted_for_user
    return {"scanned": scanned, "purged_keys": purged, "timeout_s": timeout}


@celery_app.task(name="cleanup.orphan_results")
def cleanup_orphan_results() -> dict:
    """Delete result blobs whose Private Mode grace period has elapsed."""
    grace = int(os.getenv("PRIVATE_MODE_GRACE_SECONDS", "300"))
    now = int(time.time())
    r = _redis()
    deleted = 0
    for k in r.scan_iter(match="sess:*:private:*", count=200):
        try:
            raw = r.get(k)
        except Exception:
            continue
        if not raw:
            continue
        try:
            meta = json.loads(raw)
            done_at = int(meta.get("done_at", 0))
        except Exception:
            continue
        if done_at <= 0 or now - done_at < grace:
            continue
        # Parse uid + jid out of sess:{uid}:private:{jid}
        try:
            _, uid, _, jid = k.split(":", 3)
        except ValueError:
            continue
        for target in (
            f"sess:{uid}:result:{jid}",
            f"sess:{uid}:status:{jid}",
            f"sess:{uid}:pdf:{jid}",
            f"sess:{uid}:filename:{jid}",
            f"sess:{uid}:pw:{jid}",
            k,  # the private-mode marker itself
        ):
            try:
                if r.delete(target):
                    deleted += 1
            except Exception:
                continue
    return {"deleted_keys": deleted, "grace_s": grace}
