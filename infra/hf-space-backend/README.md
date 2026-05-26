---
title: LabhPay Backend
emoji: 💳
colorFrom: green
colorTo: gray
sdk: docker
app_port: 8000
pinned: false
suggested_hardware: cpu-basic
short_description: LabhPay API — privacy-first Indian credit-card statement intelligence.
---

# LabhPay Backend (HF Space)

This Space hosts the FastAPI backend + Celery worker for LabhPay. The
frontend lives in a separate Space and talks to this one via
`NEXT_PUBLIC_API_BASE`.

## Required Space secrets

Set these under **Settings → Variables and secrets**. Variables are
public; secrets are not. Anything containing a key or token must be a
secret.

| Name | Kind | Notes |
| --- | --- | --- |
| `APP_ENV` | variable | `production` |
| `ALLOWED_ORIGINS` | variable | The frontend Space URL, e.g. `https://huggingface.co/spaces/<you>/labhpay-frontend` |
| `JWT_SECRET` | secret | Min 32 chars; use `openssl rand -hex 32` |
| `SESSION_MASTER_KEY` | secret | Base64-encoded 32 bytes; `openssl rand -base64 32` |
| `REDIS_URL` | secret | A managed Redis URL (Upstash / Railway). Spaces do not run Redis themselves. |
| `SUPABASE_URL` | variable | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | secret | Service role key (kept server-side only) |
| `NOTIFYNOW_USERNAME` | secret | WhatsApp OTP gateway |
| `NOTIFYNOW_PASSWORD` | secret | |
| `GEMINI_API_KEYS` | secret | Comma-separated if rotating |
| `OPENAI_API_KEYS` | secret | Optional |
| `GROK_API_KEYS` | secret | Optional |
| `OPENROUTER_API_KEYS` | secret | Optional |
| `ADMIN_KEY` | secret | Gates `/ai/health` admin payload |

## What gets deployed

The Dockerfile in this folder pulls the canonical [backend/Dockerfile](../../backend/Dockerfile)
build and starts uvicorn on port 8000. The Celery worker is started in
the same container via a small entrypoint (see `entrypoint.sh`).

## Health checks

- `GET /health` — returns `{"ok": true}`. Wired into Space's auto-health
  monitor via the `app_port` field above.
- `GET /ai/health` — provider/pool snapshot. Gated on `X-Admin-Key`.

## Cleanup worker

Celery beat runs alongside the worker process. It performs two passes:

- `cleanup.idle_sessions` every 120s — purges users idle past
  `SESSION_INACTIVITY_TIMEOUT_SECONDS`.
- `cleanup.orphan_results` every 60s — deletes Private Mode results past
  `PRIVATE_MODE_GRACE_SECONDS` after analysis completion.

## Updating

Push to the `main` branch of the Space — HF rebuilds automatically.
Bumps to `backend/requirements.txt` or `workers/requirements.txt`
trigger a longer cold start.
