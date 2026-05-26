-- =============================================================
-- LabhPay · Stage 3 · initial schema
-- Financial data is NEVER stored here. Only identity + metadata.
-- =============================================================

-- ---- Extensions ----
create extension if not exists "pgcrypto";

-- ---- Users ----
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text unique not null check (phone_e164 ~ '^\+91[6-9][0-9]{9}$'),
  display_name text,
  language text not null default 'en',
  private_mode_default boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index if not exists users_phone_idx on public.users (phone_e164);

-- ---- User settings (free-form prefs) ----
create table if not exists public.user_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---- Refresh tokens (hashed) ----
create table if not exists public.refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists refresh_tokens_hash_idx on public.refresh_tokens (token_hash);
create index if not exists refresh_tokens_user_idx on public.refresh_tokens (user_id);

-- ---- Anonymous audit (no PII, no amounts, no merchants) ----
create table if not exists public.audit_anonymous (
  id bigserial primary key,
  event text not null,
  bank_id text,
  occurred_at timestamptz not null default now()
);

-- ---- Bank parser telemetry (anonymous; no content) ----
create table if not exists public.parser_telemetry (
  id bigserial primary key,
  bank_id text not null,
  confidence numeric(4,3),
  ocr_used boolean,
  pages int,
  occurred_at timestamptz not null default now()
);

-- =============================================================
-- Row Level Security
-- =============================================================

alter table public.users          enable row level security;
alter table public.user_settings  enable row level security;
alter table public.refresh_tokens enable row level security;
alter table public.audit_anonymous enable row level security;
alter table public.parser_telemetry enable row level security;

-- We use the service-role key from the backend (bypasses RLS),
-- so user-facing policies are intentionally restrictive.
-- If LabhPay ever exposes Supabase directly to the browser, swap to
-- auth.uid()-based policies. For now: deny-by-default with explicit
-- service-role bypass at the API gateway.

drop policy if exists no_anon_read_users on public.users;
create policy no_anon_read_users on public.users for select using (false);

drop policy if exists no_anon_read_settings on public.user_settings;
create policy no_anon_read_settings on public.user_settings for select using (false);

drop policy if exists no_anon_read_refresh on public.refresh_tokens;
create policy no_anon_read_refresh on public.refresh_tokens for select using (false);

-- Audit + telemetry: insert-only from server, no anon reads.
drop policy if exists no_anon_read_audit on public.audit_anonymous;
create policy no_anon_read_audit on public.audit_anonymous for select using (false);

drop policy if exists no_anon_read_telemetry on public.parser_telemetry;
create policy no_anon_read_telemetry on public.parser_telemetry for select using (false);
