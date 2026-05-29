"""
Centralized settings via pydantic-settings.
Reads from environment (and .env locally). Never hardcode secrets.
"""

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- App ----
    APP_ENV: str = "development"
    APP_NAME: str = "LabhPay"
    APP_BRAND: str = "LabhPay"

    # ---- Server ----
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # ---- JWT / session ----
    JWT_SECRET: str = "change-me-in-prod-32-bytes-min-aaaaaaaaa"
    JWT_ALG: str = "HS256"
    JWT_ACCESS_TTL_SECONDS: int = 86400
    JWT_REFRESH_TTL_SECONDS: int = 604800
    SESSION_MASTER_KEY: str = ""  # base64 32 bytes
    SESSION_INACTIVITY_TIMEOUT_SECONDS: int = 1800

    # ---- Redis ----
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_TTL_DEFAULT_SECONDS: int = 1800

    # ---- Supabase ----
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # ---- WhatsApp OTP (notifynow.in) ----
    NOTIFYNOW_BASE_URL: str = "https://notifynow.in/api/whatsapp/api"
    NOTIFYNOW_USERNAME: str = ""
    NOTIFYNOW_PASSWORD: str = ""
    NOTIFYNOW_TEMPLATE: str = "login_reference_alert"
    NOTIFYNOW_CAMPAIGN: str = "LabhPay Login"
    NOTIFYNOW_OTP_TTL_MINUTES: int = 5
    NOTIFYNOW_RATE_LIMIT_PER_HOUR: int = 5

    # ---- AI Gateway ----
    GEMINI_API_KEYS: str = ""
    GROK_API_KEYS: str = ""
    GROQ_API_KEYS: str = ""
    OPENAI_API_KEYS: str = ""
    OPENROUTER_API_KEYS: str = ""
    AI_FAST_PRIORITY: str = "groq,gemini,grok,openai,openrouter"
    AI_DEEP_PRIORITY: str = "gemini,groq,grok,openai,openrouter"
    AI_FAST_MAX_OUTPUT_TOKENS: int = 800
    AI_DEEP_MAX_OUTPUT_TOKENS: int = 1500
    AI_USER_DAILY_TOKEN_BUDGET: int = 200_000
    AI_CATEGORIZATION_FALLBACK: bool = True  # Stage 7: enable LLM fallback for low-confidence categorization

    # ---- Google sign-in ----
    GOOGLE_CLIENT_ID: str = ""  # OAuth 2.0 Client ID (Web application)

    # ---- Limits ----
    UPLOAD_MAX_MB: int = 15
    RATE_LIMIT_UPLOADS_PER_DAY: int = 30
    RATE_LIMIT_ASSISTANT_TURNS_PER_DAY: int = 60

    # ---- Logging ----
    LOG_LEVEL: str = "INFO"
    LOG_SCRUB_PII: bool = True

    # ---- Admin ----
    ADMIN_KEY: str = ""
    # Comma-separated list of admin emails. A logged-in user whose email is on
    # this list gets access to /admin/* endpoints and the admin UI.
    ADMIN_EMAILS: str = ""

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def admin_emails_list(self) -> List[str]:
        return [e.strip().lower() for e in self.ADMIN_EMAILS.split(",") if e.strip()]

    def is_admin_email(self, email: str | None) -> bool:
        if not email:
            return False
        return email.strip().lower() in self.admin_emails_list

    def keys_for(self, provider: str) -> List[str]:
        raw = {
            "gemini": self.GEMINI_API_KEYS,
            "grok": self.GROK_API_KEYS,
            "groq": self.GROQ_API_KEYS,
            "openai": self.OPENAI_API_KEYS,
            "openrouter": self.OPENROUTER_API_KEYS,
        }.get(provider.lower(), "")
        return [k.strip() for k in raw.split(",") if k.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
