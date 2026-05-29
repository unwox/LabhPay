-- =============================================================
-- LabhPay · Admin support
--
-- Adds the columns the admin area needs:
--   users.disabled       — soft-disable a user (blocks new logins/refresh)
--   users.login_count    — lifetime successful logins (for the user list)
--
-- Enriches audit_anonymous so analytics can aggregate it. The audit sink
-- (utils/audit.py) writes one row per event. We keep it privacy-preserving:
-- user_hash is an HMAC of the user id (one-way), never the raw id/email.
-- =============================================================

-- ---- User admin fields ----
alter table public.users
  add column if not exists disabled boolean not null default false;

alter table public.users
  add column if not exists login_count integer not null default 0;

-- ---- Audit enrichment for analytics ----
alter table public.audit_anonymous
  add column if not exists user_hash text;

alter table public.audit_anonymous
  add column if not exists meta jsonb;

create index if not exists audit_event_idx
  on public.audit_anonymous (event);

create index if not exists audit_occurred_idx
  on public.audit_anonymous (occurred_at);

create index if not exists audit_user_hash_idx
  on public.audit_anonymous (user_hash);
