# LabhPay

> A smart financial intelligence platform for Indian credit card users.
> **Status: planning phase.** No code yet — see `IMPLEMENTATION_PLAN.md`.

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
