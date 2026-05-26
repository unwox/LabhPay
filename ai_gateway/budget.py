"""
Per-user daily token budget.

Backed by Redis: a single counter per (user, day) with TTL that expires at
the next midnight UTC. Callers check_remaining() before a request and
charge() after.
"""

from __future__ import annotations

from datetime import datetime, timezone


class BudgetExceeded(Exception):
    def __init__(self, user_id: str, remaining: int) -> None:
        super().__init__(f"Daily AI budget exhausted for user {user_id}")
        self.user_id = user_id
        self.remaining = remaining


class TokenBudget:
    def __init__(self, *, daily_cap: int, redis_factory=None) -> None:
        self.daily_cap = daily_cap
        # Lazy redis factory so tests can swap in fakeredis.
        if redis_factory is None:
            from app.core.redis_client import get_redis  # type: ignore
            self._redis_factory = get_redis
        else:
            self._redis_factory = redis_factory

    @staticmethod
    def _key(user_id: str) -> str:
        d = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return f"ai:budget:{user_id}:{d}"

    @staticmethod
    def _ttl_to_midnight_utc() -> int:
        now = datetime.now(timezone.utc)
        end = now.replace(hour=23, minute=59, second=59, microsecond=0)
        return max(60, int((end - now).total_seconds()) + 1)

    def used(self, user_id: str) -> int:
        v = self._redis_factory().get(self._key(user_id))
        return int(v) if v else 0

    def remaining(self, user_id: str) -> int:
        return max(0, self.daily_cap - self.used(user_id))

    def assert_can_spend(self, user_id: str, *, want_tokens: int) -> None:
        rem = self.remaining(user_id)
        if rem < want_tokens:
            raise BudgetExceeded(user_id, rem)

    def charge(self, user_id: str, tokens: int) -> int:
        """Record tokens spent. Returns new total used today."""
        r = self._redis_factory()
        key = self._key(user_id)
        pipe = r.pipeline()
        pipe.incrby(key, max(0, int(tokens)))
        pipe.expire(key, self._ttl_to_midnight_utc())
        total, _ = pipe.execute()
        return int(total)
