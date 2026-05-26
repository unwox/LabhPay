"""
Per-provider API key pool.

Round-robin selection with cooldown on 429 and permanent disable on 401.
The cooldown window grows exponentially per consecutive 429 on the same key.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field

_BASE_COOLDOWN_S = 60.0
_MAX_COOLDOWN_S = 30 * 60.0


@dataclass
class _KeyState:
    key: str
    cool_until: float = 0.0
    consecutive_429: int = 0
    disabled: bool = False
    last_used: float = 0.0


@dataclass
class KeyPool:
    keys: list[str]
    _states: list[_KeyState] = field(default_factory=list)
    _cursor: int = 0
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def __post_init__(self) -> None:
        self._states = [_KeyState(k) for k in self.keys if k]

    # ---- selection ----

    def next_key(self) -> str | None:
        """Return the next usable key, or None if the pool is exhausted right now."""
        with self._lock:
            now = time.time()
            n = len(self._states)
            if n == 0:
                return None
            for _ in range(n):
                s = self._states[self._cursor % n]
                self._cursor += 1
                if not s.disabled and s.cool_until <= now:
                    s.last_used = now
                    return s.key
            return None

    # ---- feedback hooks ----

    def report_success(self, key: str) -> None:
        with self._lock:
            for s in self._states:
                if s.key == key:
                    s.consecutive_429 = 0
                    s.cool_until = 0.0
                    return

    def cool(self, key: str) -> float:
        """Cool the given key; returns the cooldown seconds applied."""
        with self._lock:
            for s in self._states:
                if s.key == key:
                    s.consecutive_429 += 1
                    cooldown = min(
                        _MAX_COOLDOWN_S,
                        _BASE_COOLDOWN_S * (2 ** (s.consecutive_429 - 1)),
                    )
                    s.cool_until = time.time() + cooldown
                    return cooldown
            return 0.0

    def disable(self, key: str) -> None:
        with self._lock:
            for s in self._states:
                if s.key == key:
                    s.disabled = True
                    return

    # ---- introspection (for /ai/health) ----

    def snapshot(self) -> dict:
        now = time.time()
        states = []
        for s in self._states:
            states.append({
                "cooled": s.cool_until > now and not s.disabled,
                "disabled": s.disabled,
                "consecutive_429": s.consecutive_429,
                "cool_remaining_s": max(0, int(s.cool_until - now)) if s.cool_until > now else 0,
            })
        return {
            "total": len(self._states),
            "active": sum(1 for s in self._states if not s.disabled and s.cool_until <= now),
            "cooled": sum(1 for s in self._states if not s.disabled and s.cool_until > now),
            "disabled": sum(1 for s in self._states if s.disabled),
            "keys": states,
        }
