"""
Top-level AI gateway router.

Behaviour:
  1. For the requested tier, walk the configured provider priority list.
  2. For each provider, pull a key from its pool and call the adapter.
  3. On 429 -> cool *this key* and try the next key for the SAME provider.
     On 401 -> disable this key and try the next key.
     On 5xx / network -> mark provider unhealthy briefly, try the NEXT provider.
  4. If every provider exhausts: raise AIGatewayUnavailable.

The router is health-aware: it reorders providers to push down recently-bad
ones, without ever pinning to one.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Callable, Optional

from ai_gateway.budget import BudgetExceeded, TokenBudget
from ai_gateway.health import HealthTracker
from ai_gateway.pool import KeyPool
from ai_gateway.providers import (
    GeminiAdapter,
    GrokAdapter,
    OpenAIAdapter,
    OpenRouterAdapter,
)
from ai_gateway.providers.base import (
    AuthFailed,
    BadRequest,
    ChatMessage,
    ChatResult,
    ProviderAdapter,
    ProviderUnavailable,
    RateLimited,
    Tier,
)

# Re-export for callers
__all__ = [
    "AIError",
    "AIGateway",
    "AIGatewayUnavailable",
    "ChatMessage",
    "ChatResult",
    "BudgetExceeded",
    "Tier",
    "get_gateway",
]


class AIError(Exception):
    """Base for any error surfaced by the gateway."""


class AIGatewayUnavailable(AIError):
    """All providers failed for this call. Caller should degrade gracefully."""


@dataclass
class _Slot:
    name: str
    adapter: ProviderAdapter
    pool: KeyPool


class AIGateway:
    def __init__(
        self,
        *,
        provider_priority_fast: list[str],
        provider_priority_deep: list[str],
        keys_for: Callable[[str], list[str]],
        budget: TokenBudget,
        max_fast_output: int = 800,
        max_deep_output: int = 1500,
    ) -> None:
        adapters: dict[str, ProviderAdapter] = {
            "openai": OpenAIAdapter(),
            "gemini": GeminiAdapter(),
            "grok": GrokAdapter(),
            "openrouter": OpenRouterAdapter(),
        }
        self._slots: dict[str, _Slot] = {
            name: _Slot(name, adapters[name], KeyPool(keys_for(name)))
            for name in adapters
        }
        self._fast_priority = provider_priority_fast
        self._deep_priority = provider_priority_deep
        self._budget = budget
        self._health = HealthTracker()
        self._max_fast_output = max_fast_output
        self._max_deep_output = max_deep_output

    # ---- public API ----

    def chat(
        self,
        messages: list[ChatMessage],
        *,
        tier: Tier = "fast",
        max_output_tokens: int | None = None,
        user_id: str | None = None,
        client=None,  # httpx.Client injection point for tests
    ) -> ChatResult:
        max_out = max_output_tokens or (
            self._max_fast_output if tier == "fast" else self._max_deep_output
        )

        # Cheap pre-check; final accounting happens after the call.
        if user_id is not None:
            self._budget.assert_can_spend(user_id, want_tokens=max_out)

        priority = self._fast_priority if tier == "fast" else self._deep_priority
        ordered = self._ordered_by_health(priority)

        last_error: Optional[Exception] = None
        for name in ordered:
            slot = self._slots.get(name)
            if slot is None or not slot.pool.keys:
                continue
            # Drain this provider's keys until one works or all exhausted.
            while True:
                key = slot.pool.next_key()
                if key is None:
                    break
                try:
                    result = slot.adapter.chat(
                        messages,
                        tier=tier,
                        max_output_tokens=max_out,
                        api_key=key,
                        client=client,
                    )
                except RateLimited as e:
                    slot.pool.cool(key)
                    self._health.record_failure(name, detail=f"429: {e.detail}")
                    last_error = e
                    continue  # try next key in same provider
                except AuthFailed as e:
                    slot.pool.disable(key)
                    self._health.record_failure(name, detail=f"401: {e.detail}")
                    last_error = e
                    continue
                except ProviderUnavailable as e:
                    self._health.record_failure(name, detail=f"5xx/net: {e.detail}")
                    last_error = e
                    break  # don't burn other keys on a vendor-wide issue
                except BadRequest as e:
                    # 4xx other than 401/429 is usually our bug; surface it.
                    self._health.record_failure(name, detail=f"4xx: {e.detail}")
                    raise AIError(f"Bad request to {name}: {e.detail}") from e

                # Success
                slot.pool.report_success(key)
                self._health.record_success(name)
                if user_id is not None:
                    self._budget.charge(
                        user_id,
                        result.input_tokens + result.output_tokens,
                    )
                return result

        # Out of providers.
        msg = f"All AI providers exhausted. last={last_error}" if last_error else "No providers configured."
        raise AIGatewayUnavailable(msg)

    # ---- health / introspection ----

    def health_snapshot(self) -> dict:
        return {
            "fast_priority": self._fast_priority,
            "deep_priority": self._deep_priority,
            "providers": {
                name: {
                    "pool": slot.pool.snapshot(),
                    "health": self._health.snapshot().get(name, {
                        "success_rate": None, "successes": 0, "failures": 0,
                    }),
                }
                for name, slot in self._slots.items()
            },
        }

    # ---- internal helpers ----

    def _ordered_by_health(self, priority: list[str]) -> list[str]:
        """Push unhealthy providers down; preserve relative order within tiers."""
        healthy: list[str] = []
        unhealthy: list[str] = []
        for name in priority:
            if name not in self._slots:
                continue
            if self._health.is_healthy(name):
                healthy.append(name)
            else:
                unhealthy.append(name)
        return healthy + unhealthy


# ---- factory ----

@lru_cache
def get_gateway() -> AIGateway:
    """Construct from app settings. Called once per process."""
    from app.core.config import get_settings  # type: ignore

    s = get_settings()
    budget = TokenBudget(daily_cap=s.AI_USER_DAILY_TOKEN_BUDGET)

    def keys_for(provider: str) -> list[str]:
        return s.keys_for(provider)

    return AIGateway(
        provider_priority_fast=[p.strip() for p in s.AI_FAST_PRIORITY.split(",") if p.strip()],
        provider_priority_deep=[p.strip() for p in s.AI_DEEP_PRIORITY.split(",") if p.strip()],
        keys_for=keys_for,
        budget=budget,
        max_fast_output=s.AI_FAST_MAX_OUTPUT_TOKENS,
        max_deep_output=s.AI_DEEP_MAX_OUTPUT_TOKENS,
    )
