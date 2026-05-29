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
    disabled: bool = False
    login_count: int = 0
    consent_version: str | None = None
    consent_at: str | None = None


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

    # Admin
    def list_users(self, limit: int = 500) -> list[User]: ...
    def set_disabled(self, user_id: str, disabled: bool) -> None: ...
    def count_users(self) -> int: ...

    # Consent
    def record_consent(
        self,
        *,
        user_id: str,
        version: str,
        ip_address: str | None,
        user_agent: str | None,
        session_jti: str | None,
        terms: bool,
        privacy: bool,
        disclaimer: bool,
    ) -> None: ...

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
            u.login_count = (u.login_count or 0) + 1

    def list_users(self, limit: int = 500) -> list[User]:
        users = sorted(
            self._users.values(),
            key=lambda u: u.created_at or "",
            reverse=True,
        )
        return users[:limit]

    def set_disabled(self, user_id: str, disabled: bool) -> None:
        u = self._users.get(user_id)
        if u:
            u.disabled = disabled

    def count_users(self) -> int:
        return len(self._users)

    def record_consent(
        self, *, user_id: str, version: str, ip_address: str | None,
        user_agent: str | None, session_jti: str | None,
        terms: bool, privacy: bool, disclaimer: bool,
    ) -> None:
        u = self._users.get(user_id)
        if u:
            now = datetime.now(timezone.utc).isoformat()
            u.consent_version = version
            u.consent_at = now

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

def _is_transient_transport_error(exc: BaseException) -> bool:
    """True for stale-connection / transport errors that warrant rebuilding
    the supabase client and retrying once. We match on class names rather
    than importing httpx, which is a transitive dep we don't pin directly."""
    cls = exc.__class__.__name__
    return cls in {
        "RemoteProtocolError",
        "ProtocolError",
        "ConnectError",
        "ReadError",
        "WriteError",
        "PoolTimeout",
        "ConnectTimeout",
        "ReadTimeout",
        "RemoteDisconnected",
    } or any(name in cls for name in ("ProtocolError", "Disconnect"))


class _SupabaseBackend(_Backend):
    name = "supabase"

    def __init__(self, url: str, service_key: str) -> None:
        from supabase import create_client  # type: ignore
        # Keep URL + key so we can rebuild the client on stale connections.
        # HF Spaces sit behind Cloudflare, which drops idle HTTP/2 keep-alives;
        # the cached supabase-py client then fails with RemoteProtocolError on
        # the first request after the idle period. We catch and retry once.
        self._url = url
        self._service_key = service_key
        self.sb = create_client(url, service_key)

    def _retry(self, fn, *args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except BaseException as e:  # noqa: BLE001 — we re-raise if not transient
            if not _is_transient_transport_error(e):
                raise
            # Rebuild the underlying client and try once more.
            from supabase import create_client  # type: ignore
            self.sb = create_client(self._url, self._service_key)
            return fn(*args, **kwargs)

    def upsert_by_phone(self, phone_e164: str) -> User:
        def _do() -> User:
            sb = self.sb
            existing = sb.table("users").select("*").eq("phone_e164", phone_e164).limit(1).execute()
            if existing.data:
                row = existing.data[0]
            else:
                row = sb.table("users").insert({"phone_e164": phone_e164}).execute().data[0]
            return _row_to_user(row)
        return self._retry(_do)

    def upsert_by_google(
        self, *, google_id: str, email: str, display_name: str | None
    ) -> User:
        def _do() -> User:
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
        return self._retry(_do)

    def by_email(self, email: str) -> User | None:
        def _do() -> User | None:
            r = self.sb.table("users").select("*").ilike("email", email).limit(1).execute()
            return _row_to_user(r.data[0]) if r.data else None
        return self._retry(_do)

    def by_google_id(self, google_id: str) -> User | None:
        def _do() -> User | None:
            r = self.sb.table("users").select("*").eq("google_id", google_id).limit(1).execute()
            return _row_to_user(r.data[0]) if r.data else None
        return self._retry(_do)

    def by_id(self, user_id: str) -> User | None:
        def _do() -> User | None:
            r = self.sb.table("users").select("*").eq("id", user_id).limit(1).execute()
            return _row_to_user(r.data[0]) if r.data else None
        return self._retry(_do)

    def touch_login(self, user_id: str) -> None:
        def _do() -> None:
            # Read-modify-write the login_count. A race here just under-counts
            # by one occasionally — acceptable for an admin stat.
            cur = (
                self.sb.table("users")
                .select("login_count")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            n = 0
            if cur.data and isinstance(cur.data[0].get("login_count"), int):
                n = cur.data[0]["login_count"]
            self.sb.table("users").update(
                {
                    "last_login_at": datetime.now(timezone.utc).isoformat(),
                    "login_count": n + 1,
                }
            ).eq("id", user_id).execute()
        self._retry(_do)

    def list_users(self, limit: int = 500) -> list[User]:
        def _do() -> list[User]:
            r = (
                self.sb.table("users")
                .select("*")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return [_row_to_user(row) for row in (r.data or [])]
        return self._retry(_do)

    def set_disabled(self, user_id: str, disabled: bool) -> None:
        def _do() -> None:
            self.sb.table("users").update({"disabled": disabled}).eq("id", user_id).execute()
        self._retry(_do)

    def count_users(self) -> int:
        def _do() -> int:
            r = self.sb.table("users").select("id", count="exact").limit(1).execute()
            return int(getattr(r, "count", 0) or 0)
        return self._retry(_do)

    def record_consent(
        self, *, user_id: str, version: str, ip_address: str | None,
        user_agent: str | None, session_jti: str | None,
        terms: bool, privacy: bool, disclaimer: bool,
    ) -> None:
        def _do() -> None:
            now = datetime.now(timezone.utc).isoformat()
            # Immutable audit row.
            self.sb.table("user_consents").insert({
                "user_id": user_id,
                "consent_version": version,
                "terms": terms,
                "privacy": privacy,
                "disclaimer": disclaimer,
                "ip_address": ip_address,
                "user_agent": (user_agent or "")[:500] or None,
                "session_jti": session_jti,
            }).execute()
            # Mirror latest on the user row for the gate check.
            self.sb.table("users").update({
                "consent_version": version,
                "consent_at": now,
            }).eq("id", user_id).execute()
        self._retry(_do)

    def store_refresh(self, user_id: str, token_hash: str, expires_at: datetime) -> str:
        def _do() -> str:
            r = self.sb.table("refresh_tokens").insert({
                "user_id": user_id,
                "token_hash": token_hash,
                "expires_at": expires_at.isoformat(),
            }).execute()
            return r.data[0]["id"]
        return self._retry(_do)

    def revoke_refresh(self, token_id: str) -> None:
        def _do() -> None:
            self.sb.table("refresh_tokens").update(
                {"revoked_at": datetime.now(timezone.utc).isoformat()}
            ).eq("id", token_id).execute()
        self._retry(_do)

    def find_refresh(self, token_hash: str) -> tuple[str, str] | None:
        def _do() -> tuple[str, str] | None:
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
        return self._retry(_do)

    def purge_user_refresh(self, user_id: str) -> None:
        def _do() -> None:
            self.sb.table("refresh_tokens").update(
                {"revoked_at": datetime.now(timezone.utc).isoformat()}
            ).eq("user_id", user_id).is_("revoked_at", "null").execute()
        self._retry(_do)


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
        disabled=bool(row.get("disabled", False)),
        login_count=int(row.get("login_count") or 0),
        consent_version=row.get("consent_version"),
        consent_at=row.get("consent_at"),
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

    def list_users(self, limit: int = 500) -> list[User]:
        return self.backend.list_users(limit)

    def set_disabled(self, user_id: str, disabled: bool) -> None:
        self.backend.set_disabled(user_id, disabled)

    def count_users(self) -> int:
        return self.backend.count_users()

    def record_consent(self, **kwargs) -> None:
        self.backend.record_consent(**kwargs)

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
