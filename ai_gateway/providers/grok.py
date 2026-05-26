"""Grok (xAI) adapter — OpenAI-compatible /chat/completions."""

from ai_gateway.providers._openai_compat import OpenAICompatAdapter


class GrokAdapter(OpenAICompatAdapter):
    name = "grok"
    base_url = "https://api.x.ai/v1"
    models = {
        "fast": "grok-beta",
        "deep": "grok-2-latest",
    }
