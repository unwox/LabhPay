-- =============================================================
-- LabhPay · User consent & disclaimer (compliance)
--
-- Records explicit, affirmative consent before a user can proceed.
-- `user_consents` is an immutable audit log — one row per acceptance,
-- capturing the compliance context (IP, user-agent, session id, version,
-- timestamp). `users.consent_version` / `consent_at` mirror the latest
-- acceptance for a fast gate check on login.
-- =============================================================

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  consent_version text not null,
  terms boolean not null default true,
  privacy boolean not null default true,
  disclaimer boolean not null default true,
  ip_address text,
  user_agent text,
  session_jti text,
  created_at timestamptz not null default now()
);

create index if not exists user_consents_user_idx
  on public.user_consents (user_id);
create index if not exists user_consents_version_idx
  on public.user_consents (consent_version);
create index if not exists user_consents_created_idx
  on public.user_consents (created_at);

-- Latest accepted version, mirrored on the user row for a cheap gate check.
alter table public.users
  add column if not exists consent_version text;
alter table public.users
  add column if not exists consent_at timestamptz;
