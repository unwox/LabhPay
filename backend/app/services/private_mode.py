"""
Stage 10 — Private Mode.

The upload endpoint accepts a `private` flag. When set, we drop a marker
key:

  sess:{uid}:private:{jid}   JSON {done_at:int}   TTL: SESSION_TTL_DEFAULT_SECONDS

Initially `done_at = 0` (analysis still in flight). The worker calls
`mark_analysis_done()` when extraction + categorization land, which sets
`done_at = <epoch>`.

The cleanup worker then deletes the matched result + status keys once
`now - done_at >= PRIVATE_MODE_GRACE_SECONDS`, giving the frontend a brief
window to fetch the result one last time before it disappears.
"""

from __future__ import annotations

import json
import os
import time

from app.core.config import get_settings
from app.core.redis_client import get_redis


def _ttl() -> int:
    return max(60, int(get_settings().REDIS_TTL_DEFAULT_SECONDS))


def marker_key(user_id: str, job_id: str) -> str:
    return f"sess:{user_id}:private:{job_id}"


def mark_private(*, user_id: str, job_id: str) -> None:
    """Record that this job was uploaded with Private Mode on."""
    try:
        get_redis().setex(
            marker_key(user_id, job_id),
            _ttl(),
            json.dumps({"done_at": 0}),
        )
    except Exception:
        pass


def mark_analysis_done(*, user_id: str, job_id: str) -> None:
    """Worker calls this when the result lands. Starts the grace timer."""
    try:
        r = get_redis()
        key = marker_key(user_id, job_id)
        raw = r.get(key)
        if not raw:
            return  # not in private mode
        payload = {"done_at": int(time.time())}
        r.setex(key, _ttl(), json.dumps(payload))
    except Exception:
        pass


def is_private(*, user_id: str, job_id: str) -> bool:
    try:
        return bool(get_redis().exists(marker_key(user_id, job_id)))
    except Exception:
        return False


def grace_seconds() -> int:
    return int(os.getenv("PRIVATE_MODE_GRACE_SECONDS", "300"))
