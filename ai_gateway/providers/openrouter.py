"""OpenRouter adapter — OpenAI-compatible /chat/completions with namespaced models."""

from ai_gateway.providers._openai_compat import OpenAICompatAdapter


class OpenRouterAdapter(OpenAICompatAdapter):
    name = "openrouter"
    base_url = "https://openrouter.ai/api/v1"
    models = {
        # OpenRouter routes through whichever upstream is cheapest/healthiest.
        "fast": "openai/gpt-4o-mini",
        "deep": "anthropic/claude-3.5-sonnet",
    }

    def extra_headers(self) -> dict[str, str]:
        # OpenRouter recommends both — useful for analytics on their side
        # and zero-PII (we only send the brand).
        return {
            "HTTP-Referer": "https://labhpay.com",
            "X-Title": "LabhPay",
        }
