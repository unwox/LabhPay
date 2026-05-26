# Stage 1 — Foundation & Scaffolding · Complete

> Runnable monorepo with empty-but-wired services. No business logic yet.

---

## What's now in the repo

```
LabhPay/
├── frontend/           Next.js 14 (App Router) + TS + Tailwind + shadcn primitives
│   ├── app/            layout, page, globals.css
│   ├── components/ui/  Button (shadcn-style with cva)
│   ├── lib/utils.ts    cn() helper
│   ├── Dockerfile      multi-stage standalone build
│   └── package.json
│
├── backend/            FastAPI 0.115 + Pydantic v2
│   ├── app/main.py     CORS-enabled app, root + /health + /ready
│   ├── app/api/health.py
│   ├── app/core/config.py   pydantic-settings, all env vars typed
│   ├── requirements.txt
│   └── Dockerfile      slim python:3.11 + non-root
│
├── workers/            Celery 5.4 + Redis broker
│   ├── celery_app.py   timezone Asia/Kolkata, JSON serializer, result_expires=600
│   ├── tasks/dummy.py  smoke-test 'ping' task
│   ├── requirements.txt
│   └── Dockerfile
│
├── shared/
│   ├── categories.py   15-category Enum + display order
│   ├── merchants.py    74-merchant Indian map with substring lookup
│   ├── banks.py        11 issuers with support / grievance contacts
│   └── schemas/        Pydantic Transaction + Statement + StatementMeta
│
├── utils/
│   ├── masking.py      mask_card_number, mask_phone, mask_email, scrub_for_logs
│   ├── crypto.py       AES-GCM seal/open + Sealed wire format
│   ├── pdf_quality.py  QualityReport dataclass + thresholds
│   └── logging.py      structlog + PII scrubber processor
│
├── parsers/
│   ├── base.py         BaseParser Protocol
│   ├── registry.py     register / detect_bank / parse (with confidence threshold)
│   └── generic.py      fallback parser (returns empty Statement)
│
├── ai_gateway/         (renamed from ai-gateway for Python importability)
│   ├── router.py       AIGateway class skeleton
│   ├── pool.py         KeyPool with cooldown + disable + round-robin
│   ├── budget.py       TokenBudget stub
│   └── providers/base.py   ProviderAdapter Protocol + ChatMessage/ChatResult
│
├── infra/
│   ├── docker-compose.yml   redis + backend + worker + frontend
│   ├── hf-space-frontend/   (placeholder for Stage 10)
│   ├── hf-space-backend/    (placeholder for Stage 10)
│   └── supabase/migrations/ (placeholder for Stage 3)
│
├── docs/
│   └── STAGE_1_SUMMARY.md   this file
│
├── .gitignore          node + python + secrets + financial-data
├── .env.example        every variable documented; copy to .env
├── README.md
├── ARCHITECTURE.md
├── DECISIONS.md
└── IMPLEMENTATION_PLAN.md
```

**File count:** 68 files in 28 directories.

---

## Verification (already run in sandbox)

| Check | Result |
|---|---|
| All Python modules import cleanly | ✅ |
| `shared.schemas` Pydantic models construct | ✅ |
| `utils.masking.mask_card_number('4111 1111 1111 1234')` → `**** **** **** 1234` | ✅ |
| `utils.crypto.seal/open_` round-trips | ✅ |
| FastAPI `app.main:app` exposes `/`, `/health`, `/ready`, `/docs`, `/openapi.json` | ✅ |
| `/health` returns `{"status":"ok","service":"labhpay-backend","version":"0.1.0","env":"development"}` | ✅ |
| Celery `celery_app` configures with Redis broker | ✅ |
| `tasks.dummy.ping('stage1')` returns `{"pong":"stage1","ok":true}` (eager) | ✅ |
| `parsers.registry.detect_bank('random')` falls back to `GenericParser` | ✅ |
| 11 banks, 74 merchants, 15 categories registered | ✅ |

Docker daemon isn't available in this sandbox so `docker compose up` itself wasn't run, but every file it references exists and the compose file is well-formed.

---

## How to run locally

```bash
cd LabhPay
cp .env.example .env
docker compose -f infra/docker-compose.yml up --build
```

Then:
- Frontend: http://localhost:3000  → renders "LabhPay — Stage 1 · Scaffold"
- Backend:  http://localhost:8000/health  → returns the JSON above
- Backend docs: http://localhost:8000/docs  (dev only)
- Worker: logs `celery@... ready.` and accepts `dummy.ping` tasks via Redis
- Redis: `redis-cli ping` → `PONG`

---

## One deviation from the plan

The architecture doc called the package `ai-gateway`. Python doesn't allow hyphens in package names, so the directory is `ai_gateway/`. The `IMPLEMENTATION_PLAN.md` references in prose are now slightly off — I'll update them at the start of Stage 6 when we actually wire it up. Functionally identical.

---

## What's deferred to later stages

| Capability | Lands in |
|---|---|
| Landing-page design, hero, supported-banks strip, trust messaging | Stage 2 |
| WhatsApp OTP via notifynow.in + JWT + Supabase users table | Stage 3 |
| PDF upload, password modal, OCR, HDFC/SBI/ICICI parsers | Stage 4 |
| Dashboard tiles, categorization engine | Stage 5 |
| AI gateway provider adapters + failover | Stage 6 |
| Spending Intelligence, Suspicious Alerts, Spending Profile | Stage 7 |
| LabhPay Assistant (RAG chat) | Stage 8 |
| Resolution Assistant + export center | Stage 9 |
| Privacy auto-delete worker + HF Spaces deploy | Stage 10 |

---

**Ready for Stage 2?** Reply `Start Stage 2` and I'll design the landing page + design-system primitives.
