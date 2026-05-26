# LabhPay — Decisions Log

A running log of locked technical decisions. Each entry: **what · why · alternatives considered · revisit trigger**.

---

## D-001 · Frontend: Next.js 14 (App Router) + TS + Tailwind + shadcn/ui
- **Why:** SEO matters for `labhpay.com` (landing page must rank); App Router gives us SSR + server components for fast first-paint on mobile; shadcn/ui matches the calm-premium aesthetic without locking us to a heavy design system.
- **Alternatives:** Vite + React (rejected: no SSR), SvelteKit (rejected: weaker fintech component ecosystem).
- **Revisit if:** we move off HF Spaces and bundle size on edge becomes a constraint.

## D-002 · Backend: FastAPI (Python 3.11) + Celery + Redis
- **Why:** Best Python ecosystem for the PDF/OCR work (pdfplumber, pymupdf, PaddleOCR, Tesseract); async-native; Celery + Redis is the most-battle-tested queue combo; one stack across backend + workers.
- **Alternatives:** Node (NestJS) rejected — we'd still need a Python OCR microservice. RQ rejected vs Celery — Celery's mature observability wins for production.
- **Revisit if:** cold-start latency on HF Spaces is unacceptable and we need to move OCR to a serverless GPU.

## D-003 · WhatsApp OTP: notifynow.in (user-provided)
- **Why:** User's existing provider; supplied template `login_reference_alert` with 4 variables (name, OTP, expiry-minutes, brand).
- **Integration:** `POST https://notifynow.in/api/whatsapp/api/send-bulk` with JSON body containing `username`, `password`, `templateName`, `campaignName`, `numbers[]`.
- **Env vars:** `NOTIFYNOW_USERNAME`, `NOTIFYNOW_PASSWORD`, `NOTIFYNOW_TEMPLATE` (default `login_reference_alert`).
- **Alternatives:** MSG91, Gupshup, Meta Cloud API, Twilio — all rejected in favor of user's existing setup.
- **Revisit if:** deliverability drops or volumes outgrow the plan.

## D-004 · Database: Supabase Postgres (metadata only)
- **Why:** Managed Postgres with RLS, auth helpers we can ignore (we have our own JWT), and a generous free tier. We deliberately do **not** store financial data here — Supabase holds only `users`, `user_settings`, `refresh_tokens`, `audit_anonymous`, `parser_telemetry`.
- **Revisit if:** we ever need to (a) self-host or (b) add multi-region. Either would mean a migration plan.

## D-005 · Temp storage: Redis with AES-GCM + TTL 30 min
- **Why:** Privacy promise. Statements, transactions, insights, chat history all live in Redis with a hard TTL. Even if a cleanup worker fails, keys expire on their own. Per-session key derived via HKDF from a server-held master key.
- **Alternatives considered:** S3 with server-side encryption (rejected — files would survive longer than the user's session; also more attack surface).
- **Revisit if:** we ever offer a paid "save history" tier (would need separate, opt-in store with explicit retention UX).

## D-006 · AI gateway: multi-provider router with key rotation
- **Why:** Reliability and cost. No single vendor goes down our whole product. Routing logic prefers fast/cheap models for the bulk of calls and only escalates to large models for the Assistant.
- **Default priority:**
  - Fast tier: `gemini-flash → grok-mini → gpt-4o-mini → openrouter:auto`
  - Deep tier: `gemini-pro → gpt-4o → grok → openrouter:auto`
- **Revisit if:** a provider's quality on Indian financial language regresses; we'll re-rank.

## D-007 · Privacy mode: ON by default
- **Why:** Builds trust. Users who want their analysis to persist for 24h can flip the toggle in `/settings`. Default behavior deletes financial data as soon as the dashboard is loaded.
- **Revisit if:** UX research shows users are confused by losing their analysis on refresh.

## D-008 · UI vocabulary: no "AI" surface wording
- **Why:** Per spec — feel financial-grade, not robotic. All user-facing copy uses the approved labels (Spending Intelligence, LabhPay Assistant, Smart Recommendations, Suspicious Activity Alerts, Spending Profile, Resolution Assistant, Financial Intelligence).
- **Revisit if:** never. This is brand-level.

## D-009 · INR + India only (v1)
- **Why:** Sharper product, better merchant mapping, better parsers, simpler compliance posture.
- **Revisit if:** ever expanding internationally — would need re-architecture of parsers + merchant map.

## D-010 · Card numbers masked at extraction
- **Why:** Card PAN never enters any log, any LLM prompt, any storage layer. Masked to `**** **** **** 1234` at the parser boundary. Outbound LLM payloads are regex-scrubbed as a backstop.
- **Revisit if:** never.

## D-011 · Delivery: 10 approval-gated stages
- **Why:** Token-limit pragmatism + quality control. Each stage is a runnable slice you can poke at before approving the next. Stages 4 and 5 may split in two if they overflow a single response.
- **Revisit if:** you want a different cadence (e.g., "ship Stages 1–3 in one go").

---

## Things deliberately not decided yet

| Question | Decide at | Notes |
|---|---|---|
| Supabase project URL + keys | before Stage 3 | dev can use local Postgres in compose |
| Which AI provider keys you'll bring | before Stage 6 | one is enough to demo; gateway works with subset |
| HF Space names | before Stage 10 | I'll generate Dockerfiles + space configs |
| Notifynow username/password | before Stage 3 | env vars only — never in repo |
| Sentry / observability vendor | post-MVP | start with stdlib + Supabase audit, layer in later |
| PWA / install banner | post-MVP | Next.js makes this cheap to add later |
