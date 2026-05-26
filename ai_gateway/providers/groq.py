"""Groq (Groq Inc, LPU inference) adapter — OpenAI-compatible /chat/completions.

NOT to be confused with Grok (xAI). API keys start with `gsk_`.
Endpoint: https://api.groq.com/openai/v1
"""

from ai_gateway.providers._openai_compat import OpenAICompatAdapter


class GroqAdapter(OpenAICompatAdapter):
    name = "groq"
    base_url = "https://api.groq.com/openai/v1"
    models = {
        # Cheap + fast option for categorization / phrasing / 1-shot tools.
        "fast": "llama-3.1-8b-instant",
        # Larger model for the Assistant (RAG-grounded answers).
        "deep": "llama-3.3-70b-versatile",
    }
