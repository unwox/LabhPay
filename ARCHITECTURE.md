# LabhPay — Architecture

> Companion to `IMPLEMENTATION_PLAN.md`. Describes how the pieces fit together at runtime, and where data lives at each step.

---

## 1. System map

```
                       ┌──────────────────────────────┐
                       │        labhpay.com           │
                       │   (Next.js 14 on HF Space)   │
                       │  - Landing / Auth / Upload   │
                       │  - Dashboard / Assistant     │
                       │  - Resolution / Export       │
                       └──────────────┬───────────────┘
                                      │  HTTPS, JWT
                                      ▼
                       ┌──────────────────────────────┐
                       │      FastAPI Backend         │
                       │     (HF Space, Docker)       │
                       │  Routers:                    │
                       │   /auth /statements          │
                       │   /insights /assistant       │
                       │   /resolution /export        │
                       └─────┬────────────────┬───────┘
                             │                │
              enqueue jobs   │                │  metadata reads/writes
                             ▼                ▼
                ┌────────────────────┐  ┌──────────────────────┐
                │   Redis (encrypted │  │  Supabase Postgres   │
                │   temp + queue)    │  │  users · settings    │
                │   TTL 30 min       │  │  audit_anonymous     │
                └─────────┬──────────┘  └──────────────────────┘
                          │ pop job
                          ▼
                ┌────────────────────┐
                │ Celery Workers     │
                │  - pdf_extract     │
                │  - ocr_fallback    │
                │  - categorize      │
                │  - intelligence    │
                │  - cleanup         │
                └─────────┬──────────┘
                          │ calls
                          ▼
                ┌────────────────────────────────────────────┐
                │            AI Gateway                      │
                │   Router → Pool → Provider Adapter         │
                │   Gemini · Grok · OpenAI · OpenRouter      │
                │   Multi-key rotation · health · budget     │
                └────────────────────────────────────────────┘

                ┌────────────────────────────────────────────┐
                │       notifynow.in (WhatsApp OTP)          │
                │     called only from /auth/request-otp     │
                └────────────────────────────────────────────┘
```

---

## 2. Data lifecycle (privacy-first)

Where every kind of data lives, for how long, and what touches it.

| Data | Location | Encryption | TTL | LLM sees it? | Persisted? |
|---|---|---|---|---|---|
| Uploaded PDF bytes | Redis | AES-GCM, per-session key | 30 min | No | No |
| Decrypted PDF (in-memory) | Worker process RAM | — | task lifetime (seconds) | No | No |
| Raw OCR text | Worker process RAM | — | task lifetime | No | No |
| Extracted transactions JSON | Redis | AES-GCM | 30 min (or 24h if "Save session" ON) | Yes (filtered subset, masked card) | No |
| Insight cards | Redis | AES-GCM | same as transactions | Yes (output only) | No |
| Assistant chat history | Redis | AES-GCM | session lifetime | Yes | No |
| Card last-4 digits | Redis (masked already) | AES-GCM | session TTL | Yes (masked form only) | No |
| Card full number | **Never stored anywhere.** Masked at extraction. | — | — | Never | Never |
| User ID + phone | Supabase Postgres | TLS in transit, at rest by Supabase | persistent | No | Yes |
| Settings + feature flags | Supabase Postgres | same | persistent | No | Yes |
| Anonymized analytics events | Supabase Postgres | same | persistent (no PII, no amounts) | No | Yes |
| Notifynow OTP request | RAM → wire | — | none | No | No |

### Auto-delete triggers

1. **Logout** — cleanup worker enqueues `purge_session(session_id)` → deletes all Redis keys prefixed `sess:{session_id}:*`.
2. **JWT expiry / refresh failure** — same purge.
3. **Inactivity timeout** (30 min default, configurable per user) — same purge.
4. **Analysis completion with Private Mode ON** — purge transactions + insights immediately after the user has loaded the dashboard once.
5. **Redis TTL** — backstop. Even if a cleanup job fails, keys expire on their own.

### What we promise the user on screen

> "Your statements are processed securely and automatically deleted after your session ends."

The privacy page (`/privacy`) elaborates: no model training, no ad targeting, no resale, no profiling.

---

## 3. PDF processing pipeline

```
Upload → /statements/upload
  │
  ▼
[encrypt + store in Redis (sess:{sid}:pdf:{jobid})]
  │
  ▼
enqueue celery: pdf_extract(job_id)
  │
  ├─ try pdfplumber.text  ──► structured tables?  ──► parse
  ├─ else pymupdf.text                                  │
  ├─ else PaddleOCR per page (slow path)                │
  │                                                     ▼
  ├─ detect password → emit needs_password event ► UI password modal
  │                                                     │
  │                                          user submits password
  │                                                     │
  │                                            re-enqueue with key
  │                                                     ▼
  ▼
[normalized text + tables]
  │
  ▼
parsers/registry.detect_bank(text) → BankParser
  │
  ▼
BankParser.parse() → Statement schema
  │  (transactions, due_date, total_outstanding, min_due,
  │   finance_charges, gst, available_limit, card_last4 — masked)
  │
  ▼
categorizer(rules → merchant map → regex → embeddings → [optional LLM])
  │
  ▼
store result in Redis (sess:{sid}:result:{jobid}, AES-GCM)
emit done event → UI polls/SSE
```

### Quality gates

- `pages < 1` or `pages > 100` → reject.
- Blur score (Laplacian variance) below threshold on scanned pages → warn user.
- OCR confidence below threshold → flag transactions as low-confidence.
- Bank detection confidence below threshold → ask user to confirm bank manually.

---

## 4. Modular bank parsers

```python
# parsers/base.py
class BaseParser(Protocol):
    bank_id: str
    display_name: str
    def fingerprint(self, text: str) -> float: ...   # 0..1 confidence
    def parse(self, text: str, tables: list) -> Statement: ...
```

`parsers/registry.py` runs every parser's `fingerprint`, picks the highest-confidence one above threshold, falls back to `parsers/generic.py` otherwise. New banks = drop in one file + register it.

Each parser also returns per-field confidence so the dashboard can show "we're 80% sure of your total outstanding".

---

## 5. AI gateway

```
┌─────────────────────────────────────────────────────────┐
│  AIGateway.chat(task, messages)                         │
│                                                         │
│  1. task_type → tier (fast | deep)                      │
│  2. router.pick_provider(tier, health_scores)           │
│  3. pool.next_key(provider) → key                       │
│  4. provider.chat(messages, key)                        │
│        ├─ success → record latency + tokens, return     │
│        ├─ 429 / 401 → cool key, retry next key          │
│        ├─ key pool exhausted → next provider            │
│        └─ all providers exhausted → graceful error      │
│  5. budget.charge(user, tokens) — refuse if over cap    │
└─────────────────────────────────────────────────────────┘
```

### Provider priority (default, configurable)

| Tier | Order |
|---|---|
| `fast` | gemini-flash → grok-mini → gpt-4o-mini → openrouter:auto |
| `deep` | gemini-pro → gpt-4o → grok → openrouter:auto |

### Key rotation

- Each provider holds an in-memory list of N keys.
- On 429 (rate-limit), the key is "cooled" for an exponential window (60s, 5m, 30m).
- On 401 (invalid), the key is disabled until restart and an admin alert is logged.

### Token discipline

- Insights: one **batched** call per analysis, max ~800 output tokens. The pre-summarized JSON sent in is heavily trimmed.
- Categorization: LLM only used for residual unknowns (typically <5% of transactions), batched.
- Assistant: retrieval caps at ~30 transactions per turn.

---

## 6. Auth flow (WhatsApp OTP via notifynow)

```
[user] enters +91 9XXXXXXXXX
   │
   ▼
POST /auth/request-otp { phone }
   │
   ├─ rate-limit check (5/h per IP+phone)
   ├─ generate 6-digit OTP
   ├─ store SHA-256(otp) in Redis: otp:{phone} TTL 5m, attempts=0
   └─ POST https://notifynow.in/api/whatsapp/api/send-bulk
        {
          username, password,
          templateName: "login_reference_alert",
          campaignName: "LabhPay Login",
          numbers: [{ to: "91XXXXXXXXXX",
                      variables: { "1": firstName,
                                   "2": OTP,
                                   "3": "5",
                                   "4": "LabhPay" } }]
        }

POST /auth/verify-otp { phone, otp }
   │
   ├─ lookup otp:{phone}, compare hash, increment attempts (max 3)
   ├─ on success: upsert user in Supabase, mint JWT (24h) + refresh (7d)
   └─ delete otp:{phone}
```

JWT is HS256 with a server secret rotated on a schedule. Refresh tokens are stored hashed in Supabase and revokable.

---

## 7. Frontend route map

| Route | Purpose |
|---|---|
| `/` | Landing — hero, CTA, supported banks, privacy, dashboard preview |
| `/privacy` | Privacy manifesto |
| `/login` | Phone → OTP → dashboard |
| `/upload` | Drag-drop, multi-file, progress |
| `/dashboard` | Smart Dashboard (Stage 5) |
| `/dashboard/insights` | Spending Intelligence cards |
| `/dashboard/transactions` | Filterable, exportable table |
| `/dashboard/subscriptions` | Recurring detector view |
| `/dashboard/alerts` | Suspicious Activity Alerts |
| `/assistant` | LabhPay Assistant chat |
| `/resolution/:txnId` | Resolution Assistant per transaction |
| `/export` | Export center |
| `/settings` | Private Mode, notifications, language (EN/HI), delete account |

---

## 8. Supabase schema (lean — financial data NOT here)

```sql
-- users: minimal identity
create table users (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text unique not null,
  display_name text,
  language text default 'en',
  private_mode_default boolean default true,
  created_at timestamptz default now(),
  last_login_at timestamptz
);

-- settings: free-form prefs
create table user_settings (
  user_id uuid references users(id) on delete cascade primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- refresh tokens (hashed)
create table refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz
);

-- anonymized audit (no PII, no amounts, no merchants)
create table audit_anonymous (
  id bigserial primary key,
  event text not null,           -- e.g. 'statement_uploaded', 'insight_generated'
  bank_id text,                  -- 'hdfc', 'sbi', null
  occurred_at timestamptz default now()
);

-- bank parser confidence telemetry (anonymous, no content)
create table parser_telemetry (
  id bigserial primary key,
  bank_id text not null,
  confidence numeric(4,3),
  ocr_used boolean,
  pages int,
  occurred_at timestamptz default now()
);
```

Row-level security ON for every table. Users can only read/write their own rows. `audit_anonymous` and `parser_telemetry` are insert-only and never joined to `users`.

---

## 9. Security posture (cross-cutting)

| Layer | Control |
|---|---|
| Transport | TLS 1.2+ everywhere; HSTS on the frontend |
| Auth | JWT with short TTL + rotating server secret; refresh tokens hashed in DB |
| Sessions | Per-session AES-GCM key derived via HKDF from a server master key |
| Storage | Redis values encrypted before write; TTL backstop on every key |
| Logging | PII-scrubbing logger; OCR text and amounts NEVER logged |
| Headers | CSP, X-Frame-Options DENY, Referrer-Policy strict-origin |
| CSRF | Double-submit cookie on cookie-auth routes |
| XSS | React escape default; sanitize any HTML rendered from user content |
| Uploads | MIME sniff + size cap (15 MB) + magic-byte check |
| Rate limits | 5 OTP/h, 30 uploads/day per user, 60 assistant turns/day |
| Secrets | HF Spaces secrets only; never in repo; `.env.example` shows shape |
| Card numbers | Masked at extraction; regex post-filter on every outbound LLM payload |

---

## 10. Deployment topology (HF Spaces)

- **Space `labhpay-web`** (frontend): Next.js standalone build, Docker, port 3000. Env: `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_BRAND`.
- **Space `labhpay-api`** (backend): FastAPI + Celery worker in same container (or sidecar), Redis as external add-on. Env: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `SESSION_MASTER_KEY`, `NOTIFYNOW_USERNAME`, `NOTIFYNOW_PASSWORD`, AI provider keys.
- **Redis** — Upstash or HF-compatible managed Redis (TLS).
- **Supabase** — managed.

Local dev mirrors production via `infra/docker-compose.yml` (frontend, backend, worker, redis, optional local postgres).
