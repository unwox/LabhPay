"""
Per-provider rolling health.

A successful call adds +1 to the success window; any failure adds +1 to
the failure window. We keep the last N events. Used by the router to
deprioritize a provider that's been mostly failing.
"""

from __future__ import annotations

import threading
import time
from collections import deque
from dataclasses import dataclass, field

_WINDOW = 50


@dataclass
class _Counters:
    successes: deque = field(default_factory=lambda: deque(maxlen=_WINDOW))
    failures: deque = field(default_factory=lambda: deque(maxlen=_WINDOW))
    last_error: str | None = None
    last_success_at: float = 0.0
    last_failure_at: float = 0.0


class HealthTracker:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._states: dict[str, _Counters] = {}

    def _ctr(self, provider: str) -> _Counters:
        c = self._states.get(provider)
        if c is None:
            c = _Counters()
            self._states[provider] = c
        return c

    def record_success(self, provider: str) -> None:
        with self._lock:
            c = self._ctr(provider)
            c.successes.append(time.time())
            c.last_success_at = time.time()

    def record_failure(self, provider: str, *, detail: str = "") -> None:
        with self._lock:
            c = self._ctr(provider)
            c.failures.append(time.time())
            c.last_failure_at = time.time()
            if detail:
                c.last_error = detail[:200]

    def success_rate(self, provider: str) -> float:
        with self._lock:
            c = self._ctr(provider)
            total = len(c.successes) + len(c.failures)
            if total == 0:
                return 1.0  # untested -> assume healthy
            return len(c.successes) / total

    def is_healthy(self, provider: str, *, min_rate: float = 0.3) -> bool:
        return self.success_rate(provider) >= min_rate

    def snapshot(self) -> dict:
        with self._lock:
            out: dict = {}
            for name, c in self._states.items():
                total = len(c.successes) + len(c.failures)
                out[name] = {
                    "success_rate": (len(c.successes) / total) if total else None,
                    "successes": len(c.successes),
                    "failures": len(c.failures),
                    "last_error": c.last_error,
                    "last_success_at": c.last_success_at,
                    "last_failure_at": c.last_failure_at,
                }
            return out
