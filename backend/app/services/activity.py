"""
Stage 10 — Per-user activity ping.

The current_user dependency bumps sess:{uid}:last_seen on every authenticated
request. The cleanup worker uses this to purge sessions that have gone idle
longer than SESSION_INACTIVITY_TIMEOUT_SECONDS.

The key itself carries a TTL = 2x the timeout, so a user who actually
disappears doesn't leave an orphan key around forever.
"""

from __future__ import annotations

import time

from app.core.config import get_settings
from app.core.redis_client import get_redis


def last_seen_key(user_id: str) -> str:
    return f"sess:{user_id}:last_seen"


def bump_last_seen(user_id: str) -> None:
    s = get_settings()
    ttl = max(60, s.SESSION_INACTIVITY_TIMEOUT_SECONDS * 2)
    try:
        get_redis().setex(last_seen_key(user_id), ttl, str(int(time.time())))
    except Exception:
        # Activity tracking is best-effort — never break the request because
        # Redis blipped.
        pass


def read_last_seen(user_id: str) -> int | None:
    try:
        raw = get_redis().get(last_seen_key(user_id))
    except Exception:
        return None
    if raw is None:
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None
