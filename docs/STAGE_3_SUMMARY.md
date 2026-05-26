# Stage 3 — Authentication · Complete

> WhatsApp OTP via `notifynow.in` → JWT cookie session → Supabase users (with dev-mode in-memory fallback). End-to-end login + protected dashboard.

---

## Backend additions

| File | Purpose |
|---|---|
| `backend/app/core/redis_client.py` | Singleton Redis client (OTP store, rate limiter; Stage 4 reuses for encrypted blobs) |
| `backend/app/core/security.py` | JWT issue/decode (HS256), opaque refresh tokens with HMAC hashing, cookie kwargs (httpOnly + SameSite-aware by env) |
| `backend/app/core/dependencies.py` | `current_user` FastAPI dep that resolves JWT from `lp_at` cookie; `get_client_ip` honors X-Forwarded-For |
| `backend/app/db/users.py` | `UserStore` with two backends — Supabase in production, in-memory in dev (process-local). Same surface API: `upsert_by_phone`, `by_id`, `touch_login`, refresh-token store/find/revoke/purge |
| `backend/app/services/phone.py` | `normalize_indian_mobile` — accepts `+91XXXXXXXXXX`, `91XXXXXXXXXX`, or 10 digits; rejects non-6-9 leading digits |
| `backend/app/services/notifynow.py` | `send_login_otp` posts to `{NOTIFYNOW_BASE_URL}/send-bulk` with template `login_reference_alert` (vars: 1=name, 2=otp, 3=expiry, 4=brand). **Dev fallback**: if `NOTIFYNOW_USERNAME` is empty, OTP is printed to stdout instead — local dev works without provider credentials |
| `backend/app/services/otp.py` | OTP generate / store (HMAC-hashed, 5-min TTL) / verify (max 3 attempts, constant-time compare) / rate-limit (5 per hour per phone; 20 per hour per IP) — all in Redis |
| `backend/app/api/auth.py` | `/auth/request-otp`, `/auth/verify-otp`, `/auth/refresh`, `/auth/logout`, `/auth/me` |
| `backend/app/main.py` | Auth router wired in |
| `infra/supabase/migrations/0001_init.sql` | Five tables (`users`, `user_settings`, `refresh_tokens`, `audit_anonymous`, `parser_telemetry`) with RLS on every one — service-role bypass at backend, deny-by-default for anon |

## Frontend additions

| File | Purpose |
|---|---|
| `frontend/lib/api.ts` | `fetch` wrapper with `credentials: 'include'`, typed `ApiError`, and typed helpers: `requestOtp`, `verifyOtp`, `getMe`, `logout`, `refresh` |
| `frontend/lib/auth-context.tsx` | `AuthProvider` + `useAuth()` — calls `/auth/me` on mount, exposes `user`, `loading`, `refresh()`, `signOut()` |
| `frontend/app/layout.tsx` | Wraps the app in `<AuthProvider>` |
| `frontend/components/auth/PhoneStep.tsx` | Optional first-name + `+91` prefixed 10-digit input, client-side validation, submit → `/auth/request-otp` |
| `frontend/components/auth/OtpStep.tsx` | 6-digit code input (auto-submits on length 6), 30s resend cooldown, masked phone display, "Change number" |
| `frontend/app/login/page.tsx` | Slim nav, two-step card (Phone → OTP), reads `?next=` query param and redirects on success |
| `frontend/app/dashboard/page.tsx` | Minimal authenticated landing — welcome card with display name (italic emerald) + masked phone, "Coming in Stage 4" tile, privacy tile |
| `frontend/middleware.ts` | Route guard: any `/dashboard`, `/upload`, `/assistant`, `/resolution`, `/settings`, `/export` path without `lp_at` cookie redirects to `/login?next=<path>` |

---

## End-to-end verification (run in sandbox)

Using FastAPI's `TestClient` with `fakeredis` and the in-memory user store — every flow passes:

| Scenario | Result |
|---|---|
| `GET /health` | ✅ 200 |
| `POST /auth/request-otp` (dev fallback prints OTP) | ✅ 200, dev banner printed |
| `POST /auth/verify-otp` (correct OTP) | ✅ 200, `lp_at` + `lp_rt` cookies set |
| `GET /auth/me` (with cookies) | ✅ 200, returns user |
| `POST /auth/verify-otp` (wrong OTP) | ✅ 401 "Invalid or expired code." |
| `POST /auth/request-otp` (phone `12345`) | ✅ 400 "Enter a valid Indian mobile number." |
| Phone normalization `+91 98765-43210` → `+919876543210` | ✅ same user found, 200 |
| `POST /auth/refresh` (rotates session) | ✅ 200 |
| `POST /auth/logout` then `GET /auth/me` | ✅ 401 |
| Rate limit triggers on 6th OTP request within an hour | ✅ 200, 200, 200, 200, 200, **429** |

Frontend: 30 TS/TSX files, all 100% of `@/` internal imports resolve.

---

## Locked behaviors

- **Cookies are httpOnly.** Frontend never reads the JWT directly — it calls `/auth/me` to know who the user is. XSS-safe by construction.
- **Refresh tokens are opaque** (URL-safe random, 32 bytes), HMAC-hashed before storage, rotated on every `/auth/refresh`.
- **Card numbers** are still never touched — that surface area arrives in Stage 4. But everything we DO touch (phone, name) flows through the PII-scrubbing logger.
- **OTP TTL** = 5 minutes (configurable via `NOTIFYNOW_OTP_TTL_MINUTES`).
- **Max OTP attempts** = 3. After that, the OTP is deleted; user must request a new one.
- **Rate limit** = 5 OTP requests per hour per phone, 20 per hour per IP.
- **Constant-time comparison** on OTP verify (`hmac.compare_digest`).
- **Dev mode** is automatically engaged when `NOTIFYNOW_USERNAME` is unset — no risk of accidentally pinging the real provider during local development.

---

## How to try it

### 1. Local (dev fallback, no Supabase, no notifynow)
```bash
docker compose -f infra/docker-compose.yml up --build
# Open http://localhost:3000/login
# Enter any Indian mobile (e.g. 9876543210)
# OTP will print in the backend container logs:
#   ╔══════════════════════════════════════╗
#   ║ OTP for +919876543210:  051064       ║
#   ╚══════════════════════════════════════╝
# Enter that 6-digit code → lands on /dashboard
```

### 2. With real WhatsApp delivery
Set in `.env`:
```
NOTIFYNOW_USERNAME=your-username
NOTIFYNOW_PASSWORD=your-password
```
Restart the backend container. OTP will arrive on WhatsApp via your `login_reference_alert` template.

### 3. With Supabase persistence
Run `infra/supabase/migrations/0001_init.sql` against your Supabase project, then set:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```
The user store auto-switches from in-memory to Supabase on next backend start.

---

## What's deferred

| | |
|---|---|
| PDF upload + extraction pipeline | Stage 4 |
| Real dashboard with insights | Stage 5+ |
| CSRF token (double-submit cookie) | Stage 10 hardening |
| Account deletion flow + GDPR export | Stage 10 |
| WhatsApp template approval flow (Meta) | Already approved on your side (template `login_reference_alert`) |

---

**Ready for Stage 4** — PDF upload, password-protected handling, OCR pipeline, and the first three bank parsers (HDFC + SBI + ICICI). This is the heaviest stage in the plan; I may split it into 4a (upload + queue + progress) and 4b (parsers + 3 banks) if it approaches the response limit.

Reply `Start Stage 4` to proceed.
