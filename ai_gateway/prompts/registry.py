"""
Versioned prompt templates.

A Prompt has:
  - `name`: stable id used by callers
  - `version`: bump when the wording or contract changes; we log the version
    so we can A/B and roll back without code changes
  - `tier`: "fast" by default; "deep" for the Assistant
  - `system`: instruction block (kept terse; financial-grade tone, no PII)
  - `user_template`: format-string applied to caller-supplied variables

Stages 7-9 will register their prompts here so the AI gateway never sees
free-form strings — only named, versioned templates.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ai_gateway.providers.base import ChatMessage, Tier

_BRAND_GUARDRAILS = (
    "You are the LabhPay analysis engine. Your audience is an Indian "
    "credit-card user. Use plain, beginner-friendly English. Never invent "
    "amounts, merchants, or dates not present in the data. Never expose "
    "card numbers — masked '**** **** **** 1234' is the only allowed form. "
    "Never mention you are an AI model. Currency is INR with the ₹ symbol."
)


@dataclass(frozen=True)
class Prompt:
    name: str
    version: str
    tier: Tier
    system: str
    user_template: str

    def render(self, **vars: Any) -> list[ChatMessage]:
        return [
            ChatMessage(role="system", content=self.system),
            ChatMessage(role="user", content=self.user_template.format(**vars)),
        ]


# ---- registry ----

_PROMPTS: dict[str, Prompt] = {}


def register(p: Prompt) -> None:
    _PROMPTS[p.name] = p


def get_prompt(name: str) -> Prompt:
    if name not in _PROMPTS:
        raise KeyError(f"Unknown prompt '{name}'. Known: {sorted(_PROMPTS)}")
    return _PROMPTS[name]


def list_prompts() -> list[Prompt]:
    return sorted(_PROMPTS.values(), key=lambda p: p.name)


# ============================================================
# Stage 6 ships the registry with three placeholder prompts.
# Stages 7, 8, 9 will add the real working prompts and bump versions.
# ============================================================

register(Prompt(
    name="phrase_insights",
    version="v0.1",
    tier="fast",
    system=_BRAND_GUARDRAILS + (
        " You will receive a JSON array of pre-computed spending signals. "
        "Phrase each as one short insight card: a 4-7-word title, a 1-2 "
        "sentence body explaining what happened and why it matters, and "
        "one suggested next step. Return STRICT JSON: an array of "
        "{title, body, next_step}. Maximum 6 items."
    ),
    user_template="Signals:\n{signals_json}",
))

register(Prompt(
    name="assistant_chat",
    version="v0.1",
    tier="deep",
    system=_BRAND_GUARDRAILS + (
        " You are the LabhPay Assistant. Answer ONLY using the transactions "
        "provided in context. If the question can't be answered from them, "
        "say so politely. Keep replies under 6 sentences."
    ),
    user_template=(
        "Transactions JSON (limited to relevant rows):\n{transactions_json}\n\n"
        "User question: {question}"
    ),
))

register(Prompt(
    name="resolution_email",
    version="v0.1",
    tier="fast",
    system=_BRAND_GUARDRAILS + (
        " You draft a professional, concise customer-support email in English. "
        "Tone: polite, factual, firm. Include the transaction details verbatim. "
        "Output ONLY a JSON object: {subject, body}. No salutation lines like "
        "'Sure, here is...' before the JSON."
    ),
    user_template=(
        "Issue category: {issue_category}\n"
        "Merchant: {merchant}\n"
        "Amount: ₹{amount}\n"
        "Transaction date: {txn_date}\n"
        "Card last four: {card_last4}\n"
        "User note: {user_note}"
    ),
))
