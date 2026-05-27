"""
UserStore — Supabase-backed in production, in-memory in dev.

Falling back to memory when SUPABASE_URL is unset keeps the local
docker compose runnable without Supabase credentials. The in-memory
store is process-local and reset on restart — fine for dev, never
used in production.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

from app.core.config import get_settings


@dataclass
class User:
    id: str
    phone_e164: str | None = None
    email: str | None = None
    google_id: str | None = None
    display_name: str | None = None
    language: str = "en"
    private_mode_default: bool = True
    created_at: str | None = None
    last_login_at: str | None = None


class _Backend:
    name: str = "abstract"

    def upsert_by_phone(self, phone_e164: str) -> User: ...
    def upsert_by_google(
        self, *, google_id: str, email: str, display_name: str | None
    ) -> User: ...
    def by_id(self, user_id: str) -> User | None: ...
    def by_email(self, email: str) -> User | None: ...
    def by_google_id(self, google_id: str) -> User | None: ...
    def touch_login(self, user_id: str) -> None: ...

    # Refresh tokens
    def store_refresh(self, user_id: str, token_hash: str, expires_at: datetime) -> str: ...
    def revoke_refresh(self, token_id: str) -> None: ...
    def find_refresh(self, token_hash: str) -> tuple[str, str] | None: ...   # (token_id, user_id)
    def purge_user_refresh(self, user_id: str) -> None: ...


# ---------------- In-memory backend (dev) ----------------

class _MemoryBackend(_Backend):
    name = "memory"

    def __init__(self) -> None:
        self._users: dict[str, User] = {}            # by id
        self._by_phone: dict[str, str] = {}          # phone -> id
        self._by_email: dict[str, str] = {}          # email (lower) -> id
        self._by_google: dict[str, str] = {}         # google_sub -> id
        self._refresh: dict[str, dict[str, Any]] = {}  # id -> {user_id, hash, expires}

    def upsert_by_phone(self, phone_e164: str) -> User:
        uid = self._by_phone.get(phone_e164)
        if uid:
            return self._users[uid]
        uid = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        u = User(id=uid, phone_e164=phone_e164, created_at=now, last_login_at=now)
        self._users[uid] = u
        self._by_phone[phone_e164] = uid
        return u

    def upsert_by_google(
        self, *, google_id: str, email: str, display_name: str | None
    ) -> User:
        email_l = email.lower()
        # Prefer the google_id match, then fall back to email (user may
        # have signed in via OTP first, now linking Google to the same row).
        uid = self._by_google.get(google_id) or self._by_email.get(email_l)
        if uid:
            u = self._users[uid]
            updates = {}
            if not u.google_id:
                updates["google_id"] = google_id
            if not u.email:
                updates["email"] = email
            if display_name and not u.display_name:
                updates["display_name"] = display_name
            for k, v in updates.items():
                setattr(u, k, v)
            self._by_google[google_id] = uid
            self._by_email[email_l] = uid
            return u
        uid = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        u = User(
            id=uid,
            phone_e164=None,
            email=email,
            google_id=google_id,
            display_name=display_name,
            created_at=now,
            last_login_at=now,
        )
        self._users[uid] = u
        self._by_email[email_l] = uid
        self._by_google[google_id] = uid
        return u

    def by_email(self, email: str) -> User | None:
        uid = self._by_email.get(email.lower())
        return self._users.get(uid) if uid else None

    def by_google_id(self, google_id: str) -> User | None:
        uid = self._by_google.get(google_id)
        return self._users.get(uid) if uid else None

    def by_id(self, user_id: str) -> User | None:
        return self._users.get(user_id)

    def touch_login(self, user_id: str) -> None:
        u = self._users.get(user_id)
        if u:
            u.last_login_at = datetime.now(timezone.utc).isoformat()

    def store_refresh(self, user_id: str, token_hash: str, expires_at: datetime) -> str:
        tid = str(uuid.uuid4())
        self._refresh[tid] = {
            "user_id": user_id,
            "token_hash": token_hash,
            "expires_at": expires_at,
        }
        return tid

    def revoke_refresh(self, token_id: str) -> None:
        self._refresh.pop(token_id, None)

    def find_refresh(self, token_hash: str) -> tuple[str, str] | None:
        now = datetime.now(timezone.utc)
        for tid, row in self._refresh.items():
            if row["token_hash"] == token_hash and row["expires_at"] > now:
                return tid, row["user_id"]
        return None

    def purge_user_refresh(self, user_id: str) -> None:
        for tid in [k for k, v in self._refresh.items() if v["user_id"] == user_id]:
            self._refresh.pop(tid, None)


# ---------------- Supabase backend ----------------

class _SupabaseBackend(_Backend):
    name = "supabase"

    def __init__(self, url: str, service_key: str) -> None:
        from supabase import create_client  # type: ignore
        self.sb = create_client(url, service_key)

    def upsert_by_phone(self, phone_e164: str) -> User:
        sb = self.sb
        existing = sb.table("users").select("*").eq("phone_e164", phone_e164).limit(1).execute()
        if existing.data:
            row = existing.data[0]
        else:
            row = sb.table("users").insert({"phone_e164": phone_e164}).execute().data[0]
        return _row_to_user(row)

    def upsert_by_google(
        self, *, google_id: str, email: str, display_name: str | None
    ) -> User:
        sb = self.sb
        # Try to find an existing row by google_id first, then by email.
        found = (
            sb.table("users").select("*").eq("google_id", google_id).limit(1).execute()
        )
        if not found.data:
            found = (
                sb.table("users")
                .select("*")
                .ilike("email", email)
                .limit(1)
                .execute()
            )
        if found.data:
            row = found.data[0]
            updates: dict[str, Any] = {}
            if not row.get("google_id"):
                updates["google_id"] = google_id
            if not row.get("email"):
                updates["email"] = email
            if display_name and not row.get("display_name"):
                updates["display_name"] = display_name
            if updates:
                row = sb.table("users").update(updates).eq("id", row["id"]).execute().data[0]
            return _row_to_user(row)
        # No existing row — create one.
        payload = {
            "google_id": google_id,
            "email": email,
            "display_name": display_name,
        }
        row = sb.table("users").insert(payload).execute().data[0]
        return _row_to_user(row)

    def by_email(self, email: str) -> User | None:
        r = self.sb.table("users").select("*").ilike("email", email).limit(1).execute()
        return _row_to_user(r.data[0]) if r.data else None

    def by_google_id(self, google_id: str) -> User | None:
        r = self.sb.table("users").select("*").eq("google_id", google_id).limit(1).execute()
        return _row_to_user(r.data[0]) if r.data else None

    def by_id(self, user_id: str) -> User | None:
        r = self.sb.table("users").select("*").eq("id", user_id).limit(1).execute()
        return _row_to_user(r.data[0]) if r.data else None

    def touch_login(self, user_id: str) -> None:
        self.sb.table("users").update(
            {"last_login_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", user_id).execute()

    def store_refresh(self, user_id: str, token_hash: str, expires_at: datetime) -> str:
        r = self.sb.table("refresh_tokens").insert({
            "user_id": user_id,
            "token_hash": token_hash,
            "expires_at": expires_at.isoformat(),
        }).execute()
        return r.data[0]["id"]

    def revoke_refresh(self, token_id: str) -> None:
        self.sb.table("refresh_tokens").update(
            {"revoked_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", token_id).execute()

    def find_refresh(self, token_hash: str) -> tuple[str, str] | None:
        r = (
            self.sb.table("refresh_tokens")
            .select("id, user_id, expires_at, revoked_at")
            .eq("token_hash", token_hash)
            .limit(1)
            .execute()
        )
        if not r.data:
            return None
        row = r.data[0]
        if row.get("revoked_at"):
            return None
        if datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00")) < datetime.now(timezone.utc):
            return None
        return row["id"], row["user_id"]

    def purge_user_refresh(self, user_id: str) -> None:
        self.sb.table("refresh_tokens").update(
            {"revoked_at": datetime.now(timezone.utc).isoformat()}
        ).eq("user_id", user_id).is_("revoked_at", "null").execute()


def _row_to_user(row: dict[str, Any]) -> User:
    return User(
        id=row["id"],
        phone_e164=row.get("phone_e164"),
        email=row.get("email"),
        google_id=row.get("google_id"),
        display_name=row.get("display_name"),
        language=row.get("language", "en"),
        private_mode_default=bool(row.get("private_mode_default", True)),
        created_at=row.get("created_at"),
        last_login_at=row.get("last_login_at"),
    )


# ---------------- Public store ----------------

class UserStore:
    def __init__(self, backend: _Backend) -> None:
        self.backend = backend

    @property
    def mode(self) -> str:
        return self.backend.name

    # Pass-throughs
    def upsert_by_phone(self, phone_e164: str) -> User:
        return self.backend.upsert_by_phone(phone_e164)

    def upsert_by_google(
        self, *, google_id: str, email: str, display_name: str | None = None
    ) -> User:
        return self.backend.upsert_by_google(
            google_id=google_id, email=email, display_name=display_name
        )

    def by_email(self, email: str) -> User | None:
        return self.backend.by_email(email)

    def by_google_id(self, google_id: str) -> User | None:
        return self.backend.by_google_id(google_id)

    def by_id(self, user_id: str) -> User | None:
        return self.backend.by_id(user_id)

    def touch_login(self, user_id: str) -> None:
        self.backend.touch_login(user_id)

    def store_refresh(self, user_id: str, token_hash: str, expires_at: datetime) -> str:
        return self.backend.store_refresh(user_id, token_hash, expires_at)

    def revoke_refresh(self, token_id: str) -> None:
        self.backend.revoke_refresh(token_id)

    def find_refresh(self, token_hash: str) -> tuple[str, str] | None:
        return self.backend.find_refresh(token_hash)

    def purge_user_refresh(self, user_id: str) -> None:
        self.backend.purge_user_refresh(user_id)


@lru_cache
def get_user_store() -> UserStore:
    s = get_settings()
    if s.SUPABASE_URL and s.SUPABASE_SERVICE_KEY:
        return UserStore(_SupabaseBackend(s.SUPABASE_URL, s.SUPABASE_SERVICE_KEY))
    return UserStore(_MemoryBackend())
