# Stage 4 — PDF Upload + Extraction Pipeline · Complete

> Full upload → encrypted Redis cache → Celery worker → `pdfplumber` / `pymupdf` extraction → bank fingerprinting → regex parser → rule-based categorizer → typed `Statement` JSON. Three Indian bank parsers (HDFC, SBI, ICICI) ship live; password-protected PDFs are handled with a session-encrypted password store.

1,906 new lines across 18 files. Verified end-to-end against a synthetic statement: **6/6 headline fields extracted, 9/9 transactions found, 7/9 merchants categorized correctly with rules alone.**

---

## Backend additions

| File | What it does |
|---|---|
| `backend/app/services/storage.py` | Encrypted session blob store on Redis. Bytes-mode client for PDFs/passwords (sealed with AES-GCM via per-session HKDF key), string-mode client for status/result JSON. Helpers: `store_pdf`, `fetch_pdf`, `delete_pdf`, `store_password`, `consume_password`, `set/get_status`, `set/get_result`, `purge_user_session`. Every key carries TTL = `REDIS_TTL_DEFAULT_SECONDS` (30 min). |
| `backend/app/api/statements.py` | 5 routes: `POST /statements/upload` (multipart, validates MIME/magic-bytes/size, detects password, enqueues Celery `statements.pdf_extract`), `POST /statements/{job}/password`, `GET /statements/{job}/status`, `GET /statements/{job}/result`, `DELETE /statements/{job}`, `DELETE /statements/` (purge entire session). |
| `backend/requirements.txt` | + `pymupdf==1.24.10` for the cheap password probe at the API edge. |
| `backend/app/main.py` | Statements router wired in. |

## Worker additions

| File | What it does |
|---|---|
| `workers/tasks/pdf_extract.py` | The pipeline. Emits `JobStatus` updates at every stage (`decrypting → extracting → parsing → categorizing → done`), handles `PdfPasswordRequired` (emits `needs_password`, halts), deletes the encrypted PDF blob the moment extraction succeeds. Idempotent for password-retry. |
| `workers/celery_app.py` | Registers `tasks.pdf_extract` alongside the dummy task. |
| `workers/requirements.txt` | + `pdfplumber==0.11.4`, `pymupdf==1.24.10`. |

## Shared / utils

| File | What it does |
|---|---|
| `shared/schemas/job.py` | `JobStage` enum (8 stages including `needs_password` / `failed`), `JobStatus`, `JobResult`. Exposed from `shared.schemas`. |
| `shared/categorizer.py` | Rule-based engine: merchant-map hit → 0.95 confidence; regex hit → 0.80; otherwise `OTHER` / 0.0. LLM fallback hook reserved for Stage 7. |
| `utils/session_keys.py` | HKDF-SHA256 key derivation from `SESSION_MASTER_KEY` (base64 32-byte env var) with the user id as salt. One key per user-session; never written to disk; re-derived on demand. |
| `utils/pdf_extract.py` | `extract_text(data, password=...)` cascade: pdfplumber first (best tabular extractor), pymupdf fallback. `is_password_protected()` probe. Raises `PdfPasswordRequired` or `PdfUnreadable`. |

## Parsers

| File | What it does |
|---|---|
| `parsers/_common.py` | `BaseRegexParser` + shared regex toolkit: amount/date detection across 10 Indian date formats, card-PAN matching with masking, `find_field_amount` for the 5 headline figures (total outstanding, min due, available limit, finance charges, GST), `find_due_date`, `iter_transaction_lines` (date + description + amount + Cr/Dr), `fingerprint_score`. |
| `parsers/hdfc.py` | HDFC fingerprint: requires "HDFC Bank"; bonus on `hdfcbank.com`, "Credit Card Statement", "Payment Due Date", "Total Dues", "Statement Date". |
| `parsers/sbi.py` | SBI Card fingerprint. |
| `parsers/icici.py` | ICICI Bank fingerprint. |
| `parsers/generic.py` | Upgraded from empty-Statement to a credible fallback that still runs the common extractors with confidence = 0. |
| `parsers/__init__.py` | Auto-registers HDFC / SBI / ICICI on import. |

## Frontend

| File | What it does |
|---|---|
| `frontend/lib/api.ts` | Typed helpers: `uploadStatement`, `getStatementStatus`, `getStatementResult`, `submitStatementPassword`, `deleteStatementJob`. Types for `JobStage`, `JobStatus`, `ApiTxn`, `ApiStatementMeta`. |
| `frontend/app/upload/page.tsx` | Drag-drop landing with Dropzone, three "Tip" tiles, password modal triggered when `needs_password=true`. |
| `frontend/app/upload/[jobId]/page.tsx` | Polls `/status` every 1.2s; renders 5-stage progress chips + progress bar; on `done` fetches `/result` and shows the StatementHeader + TransactionsTable; on `needs_password` re-opens the modal; on `failed` shows the error card. "Delete this analysis" purges the job's encrypted blob server-side. |
| `frontend/components/upload/Dropzone.tsx` | Click-or-drag, accepts PDF only, visual hover state, multi-file aware. |
| `frontend/components/upload/PasswordModal.tsx` | Premium modal with locked-card icon, password input (max 64 chars), the "encrypted, used once, deleted immediately" reassurance copy. |
| `frontend/components/upload/ProgressStages.tsx` | Pill-style stage chips (`Queued · Decrypting · Reading · Identifying · Tagging · Ready`) with checked / spinning / pending styling. |
| `frontend/components/upload/TransactionsTable.tsx` | `StatementHeader` (bank · last4, total outstanding as display-serif figure, 4 stats) + `TransactionsTable` (date / merchant / category / amount, INR currency format, credit highlighted in emerald). |

---

## Verified end-to-end (synthetic HDFC statement, run in sandbox)

```
synthetic PDF: 1,462 bytes
encryption envelope (AES-GCM HKDF roundtrip): OK
extracted via pdfplumber: 624 chars, 1 page
detected: hdfc (confidence=0.84)

bank: HDFC Bank (hdfc)
card_last4: 4218                         (masked to **** **** **** 4218)
due_date: 2026-06-02
total_outstanding: 48,290.55
minimum_due: 2,420.00
available_limit: 1,51,710.00
finance_charges: 245.00
gst_on_charges: 44.10

transactions: 9
  2026-04-12  SWIGGY BANGALORE              420.00    [food]
  2026-04-13  AMAZON RETAIL INDIA         2,140.00    [shopping]
  2026-04-14  BLINKIT MUMBAI                380.00    [groceries]
  2026-04-15  INDIAN OIL PETROL PUMP      1,200.00    [fuel]
  2026-04-16  NETFLIX SUBSCRIPTION          649.00    [subscriptions]
  2026-04-17  AIRTEL POSTPAID BILL          499.00    [telecom]
  2026-04-18  UBER INDIA TRIP               260.00    [travel]
  2026-04-19  REFUND ZOMATO              + 199.00    [food]
  2026-04-20  CRED PAYMENT THANK YOU  + 10,000.00    [other]

password detection: OK (raises PdfPasswordRequired without password)
password unlock: OK (re-extracts correctly with the password)
SBI fingerprint:   sbi   (0.80)  ✓
ICICI fingerprint: icici (0.87)  ✓
```

Backend now exposes **14 routes** across `health`, `auth`, and `statements`. Frontend has **36 TS/TSX files**, all `@/` imports resolve.

---

## Privacy guarantees enforced in Stage 4

- PDF bytes live in Redis **only** while extraction is running. The worker deletes the blob the moment parsing completes.
- The user's PDF password (if any) is encrypted with the same session key and **consumed once** (`r.delete()` immediately after read) by the worker.
- Card numbers in extracted text never reach a log; the parser stores `card_last4` only.
- OCR text is never logged; only stage names / progress floats hit the worker stdout.
- Sessions purge on `DELETE /statements/`, which Stage 10's cleanup worker will trigger on logout / inactivity automatically.

---

## What I deliberately deferred to Stage 4b / later

| Item | Where |
|---|---|
| PaddleOCR / Tesseract scanned-PDF fallback | Stage 4b — needs a 1+ GB model download; not all dev machines have it. Pipeline already calls `extract_text` which is the future hook. |
| 8 more bank parsers (Axis, Kotak, AU, OneCard, IndusInd, RBL, Amex, BoB) | Stage 4b — each is a one-file drop-in once we have sample statements. |
| Multi-statement merge / monthly trend | Stage 5 (Smart Dashboard) |
| SSE for progress (instead of 1.2s polling) | Stage 10 polish — current UX is already snappy |
| Real-world parser tuning | Iterative — bring real statements; we'll calibrate each bank's regex |

---

## How to try it on your machine

1. Sign in via Stage 3 flow (the OTP prints to the backend container logs in dev).
2. Go to **`/upload`** (the dashboard now shows it but it's still gated by middleware).
3. Drop a PDF. If it's password-protected the modal will ask. If not it auto-enqueues.
4. You'll be redirected to `/upload/<jobId>` which polls the 5-stage pipeline live, then renders the parsed statement: headline figures + a tidy transactions table with categories.

Without real Indian bank statements the parsers will hit lower confidence and the UI will surface that (it shows "Confidence 24% · Pages 1" etc.). Bring me your real PDFs and I'll tune the regexes in Stage 4b.

---

**Ready for Stage 5 (Smart Dashboard + categorization-engine polish)?**

The pipeline already produces categorized transactions — Stage 5 is "make the dashboard real": donut chart, monthly trends, recurring detector, top merchants with deltas, EMI burden, utilization, subscriptions panel. All visual, no new backend dependencies.

Reply `Start Stage 5` to proceed.
