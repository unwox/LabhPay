# LabhPay

> A smart financial intelligence platform for Indian credit card users.
> **Status: Stages 1–10 implemented.** See `IMPLEMENTATION_PLAN.md` for the original plan and `docs/` for per-stage summaries.

LabhPay helps Indian credit card users understand their bills, spot hidden charges, detect recurring subscriptions, optimize rewards, catch suspicious activity, and draft resolution emails — all without permanently storing any financial data.

- **Domain:** https://labhpay.com
- **Hosting:** Hugging Face Spaces (separate frontend + backend Spaces)
- **Privacy:** statements processed in memory, encrypted in Redis with 30-minute TTL, auto-deleted on logout

---

## Read in this order

1. **`IMPLEMENTATION_PLAN.md`** — the 10-stage build plan. Start here.
2. **`ARCHITECTURE.md`** — system map, data lifecycle, security posture, schemas.
3. **`DECISIONS.md`** — locked technical decisions and why.

---

## How we'll work

This is a large build. To stay inside per-response token limits and keep quality high, we ship in **10 approval-gated stages**:

1. Foundation & scaffolding
2. Design system & landing page
3. Authentication (WhatsApp OTP via notifynow.in)
4. PDF upload + password handling + extraction
5. Categorization engine + Smart Dashboard
6. AI gateway (multi-provider failover)
7. Spending Intelligence + Suspicious Activity Alerts + Spending Profile
8. LabhPay Assistant
9. Resolution Assistant + Export
10. Privacy auto-delete + security hardening + deploy

After each stage I'll output:
- which files changed
- how to run / verify it
- what's deferred to the next stage

You reply with **Approved**, **Tweak X**, or **Pause**.

To start coding: reply **`Start Stage 1`**.

---

## Locked decisions (one-line summary)

| | |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui |
| Backend | FastAPI (Python 3.11) |
| Workers | Celery + Redis |
| Database | Supabase Postgres (auth + settings + anonymous audit only) |
| Auth | WhatsApp OTP via `notifynow.in` + JWT |
| AI | Multi-provider gateway: Gemini → Grok → OpenAI → OpenRouter |
| Temp storage | Redis, AES-GCM encrypted, 30-minute TTL |
| Deploy | HF Spaces × 2, Docker |

Full detail in `DECISIONS.md`.

---

## Privacy promise (will be displayed in-product)

> Your statements are processed securely and automatically deleted after your session ends.

No model training on your data. No advertising. No resale. No profiling.

---

## Frontend vocabulary (no "AI" wording on UI)

| Concept | UI label |
|---|---|
| AI insights | **Spending Intelligence** |
| AI assistant | **LabhPay Assistant** |
| AI analysis | **Financial Intelligence** |
| AI recommendations | **Smart Recommendations** |
| AI fraud detection | **Suspicious Activity Alerts** |
| AI personality | **Spending Profile** |
| AI email generator | **Resolution Assistant** |

---

## Runbook

### Add a new bank parser

1. Create `parsers/<bank_id>.py` extending `BaseRegexParser` from
   [parsers/_common.py](parsers/_common.py). Set `bank_id`, `display_name`,
   `must` (required fingerprints), and `should` (bonus fingerprints).
2. Add the issuer's support + grievance emails to `BANKS` in
   [shared/banks.py](shared/banks.py).
3. Register the parser in [parsers/registry.py](parsers/registry.py).
4. Test against a real PDF locally:
   ```sh
   python -m parsers.registry path/to/statement.pdf
   ```
   If the regex misses fields, extend `_KEY_FIELD_PATTERNS` in
   [parsers/_common.py](parsers/_common.py).

### Add a new AI provider

1. Implement an adapter under `ai_gateway/providers/`. The shape is in
   [ai_gateway/providers/base.py](ai_gateway/providers/base.py):
   `ChatMessage`, `ChatResult`, exceptions
   (`RateLimited`, `AuthFailed`, `ProviderUnavailable`, `BadRequest`).
2. Wire it into `adapters` in
   [ai_gateway/router.py](ai_gateway/router.py).
3. Add an environment variable `<PROVIDER>_API_KEYS` to
   [backend/app/core/config.py](backend/app/core/config.py) and to the
   `keys_for()` switch.
4. Put the provider's name in `AI_FAST_PRIORITY` and/or
   `AI_DEEP_PRIORITY` to enable it.

### Rotate API keys

LabhPay loads keys at process start. To rotate:

1. Push the new key into the relevant environment variable (HF Space
   secret), e.g. `GEMINI_API_KEYS="new_key,old_key"`. Comma-separated
   means both are in the pool simultaneously.
2. Wait for the running requests to drain (≤ a few minutes for the API,
   ≤ the Celery task TTL for workers).
3. Trigger a Space rebuild (push an empty commit, or use the Settings →
   Factory rebuild button).
4. Once the new instance is healthy, remove the old key from the env var
   and rebuild again.
5. Rotate `JWT_SECRET` and `SESSION_MASTER_KEY` the same way — but be
   aware that doing so invalidates every active session (forcing all
   users to re-OTP). Schedule for a quiet window.

### Deploy to HF Spaces

Two Spaces, both Docker:

1. **Backend Space.** Push the repo (or just the `infra/hf-space-backend`
   subtree). Configure secrets per
   [infra/hf-space-backend/README.md](infra/hf-space-backend/README.md).
2. **Frontend Space.** Push and set `NEXT_PUBLIC_API_BASE` to the
   backend Space URL, per
   [infra/hf-space-frontend/README.md](infra/hf-space-frontend/README.md).
3. Update the backend Space's `ALLOWED_ORIGINS` to include the frontend
   Space URL.
4. Smoke test: hit the backend's `/health`, then the frontend's `/`,
   then run a full login → upload → dashboard → assistant turn → export
   loop.

### Verify Stage 10 privacy gates

```sh
# After a logged-in session with one statement loaded:
redis-cli KEYS "sess:*"          # expect: lots of keys
curl -X POST .../auth/logout -b cookies.txt
redis-cli KEYS "sess:*"          # expect: zero keys for that user
```
