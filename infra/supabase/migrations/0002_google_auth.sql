-- =============================================================
-- LabhPay · Stage 10.1 · Google auth fields
--
-- The original users table required a phone. Now phone is optional
-- because a user can sign in with Google instead. We keep the phone
-- check constraint but only enforce it when a phone is supplied, and
-- add a row-level check that at least one identity exists.
-- =============================================================

-- ---- phone_e164 becomes nullable ----
alter table public.users
  alter column phone_e164 drop not null;

-- ---- New identity columns ----
alter table public.users
  add column if not exists email text,
  add column if not exists google_id text;

-- Email + google_id are unique when set, multiple NULLs are allowed.
create unique index if not exists users_email_key
  on public.users (lower(email))
  where email is not null;

create unique index if not exists users_google_id_key
  on public.users (google_id)
  where google_id is not null;

-- ---- Row-level safety ----
-- Re-state the phone-format check, but only when a phone is set.
do $$
begin
  if exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'users' and constraint_name = 'users_phone_e164_check'
  ) then
    alter table public.users drop constraint users_phone_e164_check;
  end if;
end$$;

alter table public.users
  add constraint users_phone_format_ck
  check (phone_e164 is null or phone_e164 ~ '^\+91[6-9][0-9]{9}$');

-- Every row must have at least one identity to log in with.
alter table public.users
  drop constraint if exists users_identity_present_ck;
alter table public.users
  add constraint users_identity_present_ck
  check (phone_e164 is not null or google_id is not null);

-- Index for fast Google lookups by email (case-insensitive).
create index if not exists users_email_lower_idx
  on public.users (lower(email));
