"""
Google Gemini adapter.

Gemini uses a different request/response shape and puts the API key in a
query param, not a header. Otherwise the contract matches the others.
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


class GeminiAdapter:
    name = "gemini"
    base_url = "https://generativelanguage.googleapis.com/v1beta"
    # Google retired the v1beta gemini-1.5-* aliases in 2025; current
    # generally-available models are the 2.x family. Flash for the fast
    # tier, Pro for the deep / longer-context tier.
    models = {
        "fast": "gemini-2.0-flash",
        "deep": "gemini-2.5-pro",
    }

    def model_for(self, tier: Tier) -> str:
        return self.models[tier]

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
        model = self.model_for(tier)
        url = f"{self.base_url}/models/{model}:generateContent"

        # Gemini wants "contents" + a separate system_instruction.
        system = "\n\n".join(m.content for m in messages if m.role == "system")
        contents = []
        for m in messages:
            if m.role == "system":
                continue
            role = "user" if m.role == "user" else "model"
            contents.append({"role": role, "parts": [{"text": m.content}]})

        body: dict = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": max_output_tokens,
            },
        }
        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}

        params = {"key": api_key}

        own_client = client is None
        if client is None:
            client = httpx.Client(timeout=timeout_s)
        t0 = time.perf_counter()
        try:
            r = client.post(url, params=params, json=body)
        except (httpx.TimeoutException, httpx.NetworkError) as e:
            raise ProviderUnavailable(self.name, str(e)) from e
        finally:
            if own_client:
                client.close()

        latency_ms = int((time.perf_counter() - t0) * 1000)

        if r.status_code == 401 or r.status_code == 403:
            raise AuthFailed(self.name, _detail(r))
        if r.status_code == 429:
            raise RateLimited(self.name, _detail(r))
        if 500 <= r.status_code < 600:
            raise ProviderUnavailable(self.name, _detail(r))
        if not r.is_success:
            raise BadRequest(self.name, _detail(r))

        try:
            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            usage = data.get("usageMetadata") or {}
            return ChatResult(
                text=text or "",
                input_tokens=int(usage.get("promptTokenCount", 0)),
                output_tokens=int(usage.get("candidatesTokenCount", 0)),
                provider=self.name,
                model=model,
                latency_ms=latency_ms,
            )
        except (KeyError, IndexError, TypeError) as e:
            raise ProviderUnavailable(self.name, f"unexpected response shape: {e!s}") from e


def _detail(r: httpx.Response) -> str:
    try:
        d = r.json()
        return (d.get("error", {}) or {}).get("message") or str(d)[:200]
    except Exception:
        return r.text[:200]
