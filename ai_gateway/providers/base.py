"""
Provider adapter contract.

A provider implementation owns the wire-level shape (request body, response
parsing) for a single vendor. The router decides *which* provider runs.

Each adapter raises one of the typed exceptions below so the router can
respond appropriately without parsing HTTP status codes itself.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

Tier = Literal["fast", "deep"]


@dataclass
class ChatMessage:
    role: Literal["system", "user", "assistant"]
    content: str


@dataclass
class ChatResult:
    text: str
    input_tokens: int
    output_tokens: int
    provider: str
    model: str
    latency_ms: int = 0


# ---- typed errors -------------------------------------------------------

class ProviderError(Exception):
    """Base for any provider failure. Carries the provider name + raw detail."""

    def __init__(self, provider: str, detail: str = "") -> None:
        super().__init__(f"{provider}: {detail}" if detail else provider)
        self.provider = provider
        self.detail = detail


class RateLimited(ProviderError):
    """429 from the provider — cool *this key* and try the next one."""


class AuthFailed(ProviderError):
    """401 from the provider — disable *this key* and try the next one."""


class ProviderUnavailable(ProviderError):
    """5xx / network / timeout — try the next provider entirely."""


class BadRequest(ProviderError):
    """4xx that isn't 401/429 — propagate; usually a client bug."""


# ---- the adapter Protocol ----------------------------------------------

class ProviderAdapter(Protocol):
    name: str

    def model_for(self, tier: Tier) -> str: ...

    def chat(
        self,
        messages: list[ChatMessage],
        *,
        tier: Tier,
        max_output_tokens: int,
        api_key: str,
        timeout_s: float = 30.0,
    ) -> ChatResult: ...
