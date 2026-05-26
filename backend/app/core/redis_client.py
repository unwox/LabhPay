"""
Singleton Redis client.

Stage 3: used by OTP store + rate limiter.
Stage 4: used as encrypted session blob store for statements.
"""

from __future__ import annotations

from functools import lru_cache

import redis

from app.core.config import get_settings


@lru_cache
def get_redis() -> redis.Redis:
    s = get_settings()
    # decode_responses=True keeps strings tidy for the OTP/rate-limit layer.
    # Stage 4 will use a separate raw-bytes client for encrypted blobs.
    return redis.from_url(
        s.REDIS_URL,
        decode_responses=True,
        socket_timeout=2.0,
        socket_connect_timeout=2.0,
        retry_on_timeout=True,
    )
