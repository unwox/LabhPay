"""
Shared base for OpenAI-shaped /chat/completions APIs.
Used by OpenAI, Grok (xAI), OpenRouter.

Concrete subclasses provide:
  - `name`
  - `base_url`
  - `models` (dict: {"fast": "...", "deep": "..."})
  - optional `extra_headers()`
"""

from __future__ import annotations

import time
from typing import Optional

import httpx

from ai_gateway.providers.base import (
    AuthFailed,
    BadRequest,
    ChatMessage,
    ChatResult,
    ProviderUnavailable,
    RateLimited,
    Tier,
)


class OpenAICompatAdapter:
    name: str = "openai-compat"
    base_url: str = ""
    models: dict[str, str] = {"fast": "", "deep": ""}

    # --- overrideable hooks ---

    def model_for(self, tier: Tier) -> str:
        return self.models[tier]

    def extra_headers(self) -> dict[str, str]:
        return {}

    # --- the call ---

    def chat(
        self,
        messages: list[ChatMessage],
        *,
        tier: Tier,
        max_output_tokens: int,
        api_key: str,
        timeout_s: float = 30.0,
        client: Optional[httpx.Client] = None,
    ) -> ChatResult:
        url = f"{self.base_url.rstrip('/')}/chat/completions"
        body = {
            "model": self.model_for(tier),
            "max_tokens": max_output_tokens,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": 0.3,
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            **self.extra_headers(),
        }

        own_client = client is None
        if client is None:
            client = httpx.Client(timeout=timeout_s)
        t0 = time.perf_counter()
        try:
            r = client.post(url, headers=headers, json=body)
        except (httpx.TimeoutException, httpx.NetworkError) as e:
            raise ProviderUnavailable(self.name, str(e)) from e
        finally:
            if own_client:
                client.close()

        latency_ms = int((time.perf_counter() - t0) * 1000)
        return _parse_response(self.name, self.model_for(tier), r, latency_ms)


def _parse_response(
    provider: str,
    model: str,
    r: httpx.Response,
    latency_ms: int,
) -> ChatResult:
    if r.status_code == 401:
        raise AuthFailed(provider, _detail(r))
    if r.status_code == 429:
        raise RateLimited(provider, _detail(r))
    if 500 <= r.status_code < 600:
        raise ProviderUnavailable(provider, _detail(r))
    if not r.is_success:
        raise BadRequest(provider, _detail(r))

    try:
        data = r.json()
    except Exception as e:
        raise ProviderUnavailable(provider, f"non-JSON response: {e!s}") from e

    try:
        text = data["choices"][0]["message"]["content"]
        usage = data.get("usage") or {}
        return ChatResult(
            text=text or "",
            input_tokens=int(usage.get("prompt_tokens", 0)),
            output_tokens=int(usage.get("completion_tokens", 0)),
            provider=provider,
            model=model,
            latency_ms=latency_ms,
        )
    except (KeyError, IndexError, TypeError) as e:
        raise ProviderUnavailable(provider, f"unexpected response shape: {e!s}") from e


def _detail(r: httpx.Response) -> str:
    try:
        d = r.json()
        return (d.get("error", {}) or {}).get("message") or str(d)[:200]
    except Exception:
        return r.text[:200]
