"""OpenAI adapter."""

from ai_gateway.providers._openai_compat import OpenAICompatAdapter


class OpenAIAdapter(OpenAICompatAdapter):
    name = "openai"
    base_url = "https://api.openai.com/v1"
    models = {
        "fast": "gpt-4o-mini",
        "deep": "gpt-4o",
    }
