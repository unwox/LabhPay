"""LabhPay AI Gateway — provider-agnostic router with key rotation + failover."""

from ai_gateway.budget import BudgetExceeded, TokenBudget
from ai_gateway.providers.base import (
    AuthFailed,
    BadRequest,
    ChatMessage,
    ChatResult,
    ProviderError,
    ProviderUnavailable,
    RateLimited,
    Tier,
)
from ai_gateway.router import AIError, AIGateway, AIGatewayUnavailable, get_gateway

__all__ = [
    "AIError",
    "AIGateway",
    "AIGatewayUnavailable",
    "AuthFailed",
    "BadRequest",
    "BudgetExceeded",
    "ChatMessage",
    "ChatResult",
    "ProviderError",
    "ProviderUnavailable",
    "RateLimited",
    "Tier",
    "TokenBudget",
    "get_gateway",
]
