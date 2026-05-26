# LabhPay — Staged Implementation Plan

> A smart financial intelligence platform for Indian credit card users.
> Domain: https://labhpay.com
> Status: Plan v1 — awaiting per-stage approval before implementation.

---

## 0. Locked decisions

| Area | Choice |
|---|---|
| Frontend | **Next.js 14** (App Router) + TypeScript + Tailwind + shadcn/ui |
| Backend | **FastAPI** (Python 3.11) + Pydantic v2 |
| Queue / workers | **Celery + Redis** |
| Database | **Supabase PostgreSQL** (auth metadata, settings, audit only — no financial data) |
| Auth | **WhatsApp OTP** via `notifynow.in` (template `login_reference_alert`) + JWT |
| AI gateway | Multi-provider: **Gemini → Grok → OpenAI → OpenRouter** with key rotation + failover |
| Hosting | Frontend HF Space (Docker, Next.js standalone) + Backend HF Space (Docker, FastAPI + Celery) |
| Temp storage | Redis (encrypted blobs, TTL 30 min) — **no S3, no persistent disk for user data** |
| Privacy mode | Default ON: in-memory only; opt-in "Save session" allows 24h encrypted cache |

All frontend copy uses the approved terminology (Spending Intelligence, LabhPay Assistant, Smart Recommendations, Suspicious Activity Alerts, Spending Profile, Resolution Assistant).

---

## 1. Why staged delivery

This spec is large enough that a single-shot build would blow past per-response token limits and produce sloppy, untested code. The plan is broken into **10 stages**, each scoped to:

- One coherent slice (auth, or parsing, or dashboard, etc.).
- Independently testable / runnable.
- ~2k–6k lines of code per stage.
- Explicit **approval gate** before the next stage begins.

After each stage I'll output a short *stage summary* (files created, how to run, what to verify) so you can sanity-check before approving the next. If a stage gets close to context limits mid-build, I'll stop at a clean boundary and resume in the next turn — never leaving the repo in a half-broken state.

---

## 2. Repo layout (monorepo)

```
labhpay/
├── frontend/                  # Next.js 14 app
│   ├── app/                   # App Router pages
│   ├── components/            # shadcn/ui + custom
│   ├── lib/                   # api client, auth, utils
│   ├── styles/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
│
├── backend/                   # FastAPI
│   ├── app/
│   │   ├── api/               # routers: auth, upload, statements, insights, assistant, resolution
│   │   ├── core/              # config, security, jwt, encryption
│   │   ├── db/                # supabase client, models
│   │   ├── services/          # business logic
│   │   └── main.py
│   ├── Dockerfile
│   └── pyproject.toml
│
├── workers/                   # Celery workers
│   ├── tasks/                 # pdf_extract, ocr, categorize, intelligence, cleanup
│   ├── celery_app.py
│   └── Dockerfile
│
├── parsers/                   # Modular bank parsers (shared by backend + workers)
│   ├── base.py                # BaseParser interface
│   ├── hdfc.py
│   ├── sbi.py
│   ├── icici.py
│   ├── axis.py
│   ├── kotak.py
│   ├── au.py
│   ├── onecard.py
│   ├── indusind.py
│   ├── rbl.py
│   ├── amex.py
│   ├── bob.py
│   ├── generic.py             # fallback regex parser
│   └── registry.py            # auto-detect bank + dispatch
│
├── ai-gateway/                # Multi-provider LLM router
│   ├── providers/
│   │   ├── gemini.py
│   │   ├── grok.py
│   │   ├── openai.py
│   │   └── openrouter.py
│   ├── router.py              # failover + retry + health
│   ├── pool.py                # key rotation
│   ├── prompts/               # versioned prompt templates
│   └── budget.py              # token accounting
│
├── shared/                    # Cross-cutting types + constants
│   ├── schemas/               # Pydantic models (Transaction, Statement, Insight, ...)
│   ├── categories.py          # category taxonomy
│   ├── merchants.py           # Indian merchant map (Swiggy, Zomato, ...)
│   └── banks.py               # bank metadata, support contacts
│
├── utils/
│   ├── crypto.py              # AES-GCM helpers
│   ├── masking.py             # card / PAN / phone masking
│   ├── pdf_quality.py         # blur / page / OCR quality detection
│   └── logging.py             # safe logger (PII scrubber)
│
├── infra/
│   ├── docker-compose.yml     # local: frontend + backend + worker + redis
│   ├── hf-space-frontend/     # HF Spaces config
│   ├── hf-space-backend/
│   └── supabase/
│       └── migrations/        # SQL migrations
│
├── .env.example
├── DECISIONS.md
├── ARCHITECTURE.md
├── README.md
└── IMPLEMENTATION_PLAN.md     # this file
```

---

## 3. The 10 stages

Each stage block lists: **goal · deliverables · how you verify · rough token cost**.

### Stage 1 — Foundation & scaffolding (small)
**Goal:** Empty-but-runnable monorepo with Docker compose, env wiring, lint/format, CI-ready.
**Deliverables:**
- Monorepo layout above (empty folders + `.gitkeep`).
- `frontend/` Next.js 14 init with Tailwind + shadcn/ui base, single "Hello LabhPay" page.
- `backend/` FastAPI init with `/health` endpoint.
- `workers/` Celery skeleton with one dummy task.
- `infra/docker-compose.yml` (frontend, backend, worker, redis).
- `.env.example` with every key documented.
- `shared/`, `utils/`, `parsers/`, `ai-gateway/` package skeletons.
**Verify:** `docker compose up` → `localhost:3000` shows landing stub, `localhost:8000/health` returns OK, Redis is reachable, Celery worker logs "ready".
**Token cost:** Low.

### Stage 2 — Design system & landing page
**Goal:** Premium, Apple-Wallet-meets-Zara aesthetic locked in.
**Deliverables:**
- Tailwind theme: soft gradients, ivory/charcoal palette, serif display + sans body, generous spacing.
- Component primitives: `Button`, `Card`, `StatTile`, `Section`, `Stepper`, `TrustBadge`, `BankLogo`.
- `/` landing page: hero ("Understand your credit card bills with intelligent financial insights"), upload CTA, dashboard preview mock, supported-banks strip, privacy messaging, trust indicators.
- `/privacy` page (privacy-first manifesto).
- Mobile-first responsive.
**Verify:** Visual review on desktop + mobile; matches "calm premium fintech" feel.
**Token cost:** Medium.

### Stage 3 — Authentication (WhatsApp OTP + JWT)
**Goal:** End-to-end login flow using `notifynow.in`.
**Deliverables:**
- Backend `/auth/request-otp`: validates Indian mobile (+91), generates 6-digit OTP, stores hashed in Redis (5-min TTL, max 3 attempts), calls notifynow `send-bulk` with template `login_reference_alert` (vars: name, OTP, expiry-minutes, "LabhPay").
- Backend `/auth/verify-otp`: verifies, issues JWT (HS256, 24h), refresh token (7d).
- Backend `/auth/logout`: revokes JWT + triggers session-cleanup job.
- Frontend `/login`: phone input (with country code), OTP screen with resend timer, success → dashboard.
- Supabase `users` table: `id, phone_e164, created_at, settings_jsonb, private_mode_default`.
- Rate limiting: 5 OTP requests / hour / IP / phone.
**Verify:** Real phone receives OTP via WhatsApp, login succeeds, JWT works on protected route, logout clears session.
**Token cost:** Medium.

### Stage 4 — PDF upload + password handling + extraction pipeline
**Goal:** A user can upload a statement and see extracted transactions (no AI yet).
**Deliverables:**
- Frontend `/upload`: drag-drop, multi-file, progress bar, password modal on `EncryptedPdfError`.
- Backend `/statements/upload`: validates MIME + size, encrypts file with per-session AES-GCM key, stores in Redis (TTL 30 min), enqueues Celery job, returns `job_id`.
- Frontend `/upload/:jobId`: SSE/polling for stage progress (`queued → decrypting → extracting → ocr → done`).
- Worker `pdf_extract` task: tries pdfplumber → pymupdf → PaddleOCR fallback for scans; detects password-protected; emits per-stage progress.
- `utils/pdf_quality.py`: page count, blur score, OCR confidence; raises friendly errors.
- Parsers: HDFC + SBI + ICICI (others stubbed) using `parsers/registry.py` auto-detect (header / footer fingerprints).
- Result schema: `shared/schemas/Statement` (transactions, due_date, total_outstanding, min_due, finance_charges, gst, available_limit, card_last4).
- Card number masking everywhere; raw OCR text NEVER logged.
**Verify:** Upload an HDFC / SBI / ICICI PDF (incl. password-protected) → transactions table renders with correct totals.
**Token cost:** High. *May split into 4a (upload + queue + progress) and 4b (parsers + 3 banks) if needed.*

### Stage 5 — Categorization engine + Smart Dashboard
**Goal:** Beautiful dashboard with category breakdown, top merchants, trends.
**Deliverables:**
- `shared/categories.py`: 14-category taxonomy from spec.
- `shared/merchants.py`: 50+ Indian merchant → category mapping (Swiggy=food, Blinkit=groceries, IRCTC=travel, ...).
- Hybrid categorizer: rules → merchant map → regex → embeddings (cached). LLM fallback **disabled by default** in Stage 5 (turned on in Stage 7).
- Frontend `/dashboard`: total spend tile, category donut, monthly trend line, top-merchants list, recurring subscriptions row, hidden charges callout, EMI burden, utilization estimate.
- All tiles support multi-statement aggregation.
- Confidence badges (low / medium / high) on extracted figures.
**Verify:** Dashboard loads under 1s after analysis; numbers match raw PDF totals.
**Token cost:** Medium-High.

### Stage 6 — AI gateway (multi-provider, key rotation, failover)
**Goal:** A single internal API that "just works" regardless of which provider is healthy.
**Deliverables:**
- `ai-gateway/router.py`: chooses provider by (task-type → model-tier → health → cost).
- `pool.py`: round-robin across N keys per provider; marks key cooling on 429/401; auto-recovers after backoff.
- Provider adapters with unified `chat(messages, tier, max_tokens)` signature.
- `budget.py`: per-user daily token cap; refuses gracefully when exceeded.
- Health endpoint `/ai/health` (admin-only).
- Two tiers: `fast` (gemini-flash / gpt-4o-mini / grok-mini) for categorization/insights, `deep` (gemini-pro / gpt-4o) for the Assistant.
- Prompt registry under `ai-gateway/prompts/` with version pinning.
**Verify:** Kill the primary provider key → next request silently routes to fallback; no user-visible error.
**Token cost:** Medium.

### Stage 7 — Spending Intelligence + Suspicious Activity Alerts + Spending Profile
**Goal:** Insights cards on dashboard ("Food delivery up 32% MoM", etc.).
**Deliverables:**
- `services/intelligence.py`: deterministic signal generators (trend deltas, anomaly z-scores, recurring detection, duplicate-charge detector, forex-markup detector, late-fee detector).
- LLM only used to **phrase** insights in friendly English (one batched call per analysis, capped at ~800 output tokens).
- Insights ranked by `impact × urgency × confidence`; max 6 shown.
- `Spending Profile` tag generator (Smart Saver / Weekend Spender / Reward Optimizer / EMI Heavy User / Impulse Buyer).
- `Suspicious Activity Alerts` panel.
- Each insight card: *what happened · why it matters · what to do next* — beginner mode toggle.
**Verify:** Insights are accurate, non-repetitive, and the LLM never gets raw card numbers.
**Token cost:** Medium-High.

### Stage 8 — LabhPay Assistant (RAG over extracted JSON)
**Goal:** Chat panel where users ask natural questions about their bill.
**Deliverables:**
- Per-session in-memory vector index of transactions (no embeddings persisted).
- Retrieval = transaction filter + small re-rank; passes only ~30 transactions max to the LLM per turn.
- System prompt locks the model to *this user's data only*, refuses generic financial advice it can't ground.
- Frontend chat UI: docked drawer, suggested prompts ("How much on Swiggy?", "Which subscriptions are recurring?", "Why is my bill high?").
- Streaming responses, copy button, "regenerate" with different provider tier.
**Verify:** 10 sample questions return grounded answers; assistant cites transaction IDs.
**Token cost:** Medium.

### Stage 9 — Resolution Assistant + Export
**Goal:** Per-transaction "resolve this" flow + report exports.
**Deliverables:**
- Per-row actions: Dispute · Refund · Cancel subscription · Report unauthorized · Request invoice · Merchant complaint · EMI closure · Duplicate · Escalate.
- Email draft generator with prefilled fields (merchant, amount, date, masked last4, issue type). English + simple Hindi toggle.
- `shared/banks.py` + merchant directory: support emails, escalation paths, expected SLAs.
- Actions: copy email · open mail client (`mailto:`) · export as PDF.
- Export center: summary report, yearly report, category report, subscription report, tax-friendly summary — all PDF, generated server-side, downloaded once, never stored.
**Verify:** Generated emails sound professional, contain correct details, and respect masking.
**Token cost:** Medium.

### Stage 10 — Privacy auto-delete + security hardening + deploy
**Goal:** Production-ready privacy guarantees and HF Spaces deployment.
**Deliverables:**
- Cleanup worker: deletes session data on logout, JWT expiry, inactivity timeout (30 min), and analysis completion when Private Mode is ON.
- Session-key rotation; encryption keys never touch disk in plaintext.
- Security: AES-GCM at rest in Redis, TLS at transport, rate limits, CSRF on cookie-auth routes, XSS-safe React rendering, CSP headers, signed upload URLs, PII-scrubbing logger.
- Audit-friendly trail (anonymized) for compliance review.
- HF Spaces deployment configs: two Spaces (frontend, backend), Docker, secrets wired via HF Space secrets, health checks.
- README runbook: how to add a bank parser, how to add an AI provider, how to rotate keys.
- Public privacy banner: "Your statements are processed securely and automatically deleted after your session ends."
**Verify:** Logout → all session keys gone from Redis; staging deploy on HF Spaces works end-to-end.
**Token cost:** Medium-High.

---

## 4. Token-limit strategy

| Tactic | How it shows up |
|---|---|
| **Stage gates** | Each stage ends at a runnable boundary. I stop and ask before continuing. |
| **Split-on-overflow** | If a stage approaches the response budget mid-way, I stop at the last clean file boundary and resume in the next turn. Stages 4 and 5 are the most likely candidates to be split. |
| **Edit over rewrite** | After Stage 1 scaffolds files, later stages use targeted `Edit` calls instead of full rewrites whenever possible. |
| **No speculative code** | Every file in every stage maps to a concrete spec requirement. No "we might need this later" scaffolding. |
| **Concise per-stage reports** | After each stage I summarize: files added/changed, how to run, what to verify, what's deferred. No re-pasting code in chat. |
| **Verification via diffs** | I'll surface key diffs and run small smoke checks rather than re-reading whole files. |

---

## 5. Cross-cutting non-negotiables

These hold across all stages — flagged here so I never need to re-derive them.

- **Frontend copy** uses the approved vocabulary (Spending Intelligence / LabhPay Assistant / Smart Recommendations / Suspicious Activity Alerts / Spending Profile / Resolution Assistant). No "AI" surface wording.
- **INR only.** Indian merchants, Indian banks, Indian phone format, Indian tax/GST language.
- **Privacy default-on.** Financial data lives in Redis with TTL; Supabase holds only `users`, `settings`, `audit_anonymous`.
- **No raw card numbers anywhere** — masked to `**** **** **** 1234` at extraction time, before logging, before LLM calls.
- **Confidence scores** on extraction, categorization, and insights — surfaced to user when low.
- **Beginner-mode** toggle on every insight card.
- **Mobile-first** layouts; touch targets ≥ 44px.
- **No tracking** beyond anonymous product analytics; never train on user data.

---

## 6. What I need from you between stages

After each stage I'll wait for one of:
- ✅ **"Approved — go to stage N+1"**
- 🛠 **"Tweak X then continue"** (small change, no full revisit)
- ⏸ **"Pause — let's discuss"**

If you don't reply, I'll wait. I won't auto-advance past a stage gate.

---

## 7. Out of scope for this build (explicitly)

- Direct bank API integrations (account aggregator / RBI AA framework) — future phase.
- Mobile native apps (iOS/Android) — Next.js PWA covers mobile for v1.
- Bill payment / money movement — read-only intelligence only.
- Multi-tenant org accounts — single-user only for v1.
- Investment portfolio analysis — out of scope.

---

## 8. Open questions before Stage 1

None blocking. I'll proceed with Stage 1 as soon as you say go. If you want any of these changed first, flag now:

1. **Notifynow credentials.** I'll wire the call but leave `NOTIFYNOW_USERNAME` / `NOTIFYNOW_PASSWORD` as env vars. Confirm the template name `login_reference_alert` is approved for transactional OTP use.
2. **Supabase project.** I'll generate migrations; you'll need to point to a Supabase project (URL + service key in env). I can also include a local Postgres in `docker-compose` for dev.
3. **AI provider keys.** I'll build the gateway provider-agnostic; you can add keys for any subset (one provider is enough to demo).
4. **HF Spaces account.** Deployment configs will be ready in Stage 10; you provide the Space names when we get there.

---

**Ready when you are. Reply `Start Stage 1` to begin scaffolding.**
