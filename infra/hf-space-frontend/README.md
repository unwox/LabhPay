---
title: LabhPay Frontend
emoji: 💳
colorFrom: green
colorTo: indigo
sdk: docker
app_port: 3000
pinned: false
suggested_hardware: cpu-basic
short_description: LabhPay UI — privacy-first Indian credit-card statement intelligence.
---

# LabhPay Frontend (HF Space)

This Space hosts the Next.js frontend. It talks only to the backend Space
configured via `NEXT_PUBLIC_API_BASE`.

## Required Space variables

| Name | Kind | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE` | variable | URL of the backend Space, e.g. `https://<you>-labhpay-backend.hf.space` |
| `NODE_ENV` | variable | `production` |

There are no secrets in this Space — anything in `NEXT_PUBLIC_*` is
public by Next.js convention.

## What gets deployed

The Dockerfile here is a thin wrapper around [frontend/Dockerfile](../../frontend/Dockerfile)
(Next 14 standalone build).

## Auth + CSRF

The browser holds three cookies, all set by the backend on `/auth/verify-otp`:

- `lp_at` — access token (HttpOnly)
- `lp_rt` — refresh token (HttpOnly)
- `lp_csrf` — CSRF token (JS-readable, echoed into `X-CSRF-Token` on
  mutating requests).

For cookies to flow cross-origin you must have:

- `secure=True` + `samesite=None` (set automatically when `APP_ENV=production`)
- The frontend Space URL listed in `ALLOWED_ORIGINS` on the backend Space.

## Updating

Push to the Space's `main` branch and HF rebuilds.
