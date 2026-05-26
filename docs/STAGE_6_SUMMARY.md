# Stage 6 — AI Gateway · Complete

> One internal `gateway.chat(messages, tier)` call that survives any single provider or key failing. Plumbing only — no user-visible UI changes.

1,061 new lines across 15 files. Verified end-to-end: **8 / 8 failover paths pass** via mocked httpx transport.

---

## What landed

| File | Purpose |
|---|---|
| `ai_gateway/__init__.py` | Public surface — exports `AIGateway`, `get_gateway`, `ChatMessage`, `ChatResult`, error types |
| `ai_gateway/router.py` | The orchestrator. Walks the configured provider priority for the tier, retries on 429/401 within a provider, escalates to the next provider on 5xx/network. Health-aware reordering of providers. Per-user budget pre-check + post-charge. |
| `ai_gateway/pool.py` | `KeyPool` — round-robin with exponential cooldown on 429 (60s → 120s → 240s → … capped at 30 min), permanent disable on 401. `report_success` resets the consecutive-429 counter. Snapshot endpoint for `/ai/health`. |
| `ai_gateway/health.py` | `HealthTracker` — rolling 50-event window per provider, exposes `success_rate`, `is_healthy(min_rate=0.3)`. Router uses this to push misbehaving providers to the back of the queue. |
| `ai_gateway/budget.py` | `TokenBudget` — Redis-backed daily counter `ai:budget:{user_id}:{YYYY-MM-DD}` with TTL to midnight UTC. `assert_can_spend` refuses up-front; `charge` adds after success. `BudgetExceeded` exception. |
| `ai_gateway/providers/base.py` | `ProviderAdapter` Protocol + `ChatMessage` / `ChatResult` / `Tier` types + typed errors: `RateLimited`, `AuthFailed`, `ProviderUnavailable`, `BadRequest`. |
| `ai_gateway/providers/_openai_compat.py` | Shared base for OpenAI-shaped `/chat/completions` APIs. Maps HTTP status codes → typed errors, parses `{choices[0].message.content, usage}`, accepts an `httpx.Client` for tests. |
| `ai_gateway/providers/openai.py` | OpenAI adapter — `gpt-4o-mini` (fast), `gpt-4o` (deep). |
| `ai_gateway/providers/grok.py` | xAI adapter — `grok-beta` (fast), `grok-2-latest` (deep). OpenAI-compatible. |
| `ai_gateway/providers/openrouter.py` | OpenRouter adapter — `openai/gpt-4o-mini` (fast), `anthropic/claude-3.5-sonnet` (deep). Includes `HTTP-Referer: labhpay.com` + `X-Title: LabhPay` headers. |
| `ai_gateway/providers/gemini.py` | Google Gemini adapter — `gemini-1.5-flash` (fast), `gemini-1.5-pro` (deep). Its own request shape: `contents`, `generationConfig`, `systemInstruction`; key in query param not header; 403 mapped to AuthFailed. |
| `ai_gateway/prompts/registry.py` | `Prompt` dataclass (name, version, tier, system, user_template). `register/get_prompt/list_prompts` API. Ships three placeholder prompts (`phrase_insights`, `assistant_chat`, `resolution_email`) at v0.1 — Stage 7-9 will replace them with the real working templates and bump versions. Brand guardrails baked into every system block: simple English, never invent merchants/amounts, never reveal card numbers, ₹ currency only, never mention being an AI. |
| `backend/app/api/ai.py` | `GET /ai/health` — provider snapshot. Admin view (with `X-Admin-Key`) shows exact key counts + per-user budget + prompt versions. Non-admin view masks exact key counts to "configured" / 0. |
| `backend/app/core/config.py` | Added `ADMIN_KEY` setting (empty by default → admin view disabled). |
| `backend/app/main.py` | `ai_router` wired. |

---

## Routing behavior

For each `chat(messages, tier="fast"|"deep", user_id=...)`:

1. **Budget pre-check.** If `remaining(user_id) < max_output_tokens`, raise `BudgetExceeded` *before* any provider call.
2. **Order providers by health.** Healthy providers (success_rate ≥ 30%) first, preserving their relative priority; unhealthy ones at the back.
3. **For each provider** (in order):
   - Pull a key from its pool.
   - Call the adapter with that key.
   - **On 429** → `pool.cool(key)` with exponential backoff, try next key in **same provider**.
   - **On 401/403** → `pool.disable(key)`, try next key.
   - **On 5xx / timeout / network** → record health failure, break out of this provider, try **next provider**.
   - **On 4xx other than 401** → raise `AIError` (this is a client bug, surface it).
   - **On success** → `pool.report_success(key)`, `health.record_success(provider)`, `budget.charge(user, total_tokens)`, return result.
4. **If everything exhausted** → raise `AIGatewayUnavailable`.

---

## Verified in sandbox (mocked httpx transport)

| # | Scenario | Result |
|---|---|---|
| 1 | Happy path — Gemini first key wins | ✅ `provider=gemini, model=gemini-1.5-flash` |
| 2 | Gemini 429 on first key → second key succeeds | ✅ cooled key count = 1 |
| 3 | Gemini 403 (invalid key) on first key → second key succeeds | ✅ disabled key count = 1 |
| 4 | Both Gemini keys 429 → escalates to Grok | ✅ `provider=grok` |
| 5 | Budget exceeded before any call | ✅ `BudgetExceeded(remaining=1)` |
| 6 | All providers fail (gemini 5xx, grok 5xx, openai all 401) | ✅ `AIGatewayUnavailable: ... last=openai: invalid api key` |
| 7 | Health-aware reorder — after 5 consecutive 5xx on gemini, next call goes to grok | ✅ `provider=grok` |
| 8 | Prompt registry — all three prompts registered, `render()` returns system + user messages | ✅ `phrase_insights`, `assistant_chat`, `resolution_email` |

`/ai/health` is now in the route table — **16 total backend routes** online.

---

## Tier configuration (default, override via `.env`)

| Tier | Default priority | Default models |
|---|---|---|
| `fast` | gemini → grok → openai → openrouter | `gemini-1.5-flash` / `grok-beta` / `gpt-4o-mini` / `openai/gpt-4o-mini` |
| `deep` | gemini → grok → openai → openrouter | `gemini-1.5-pro` / `grok-2-latest` / `gpt-4o` / `anthropic/claude-3.5-sonnet` |

Token caps: 800 max output for fast, 1500 for deep. Per-user daily cap: 200,000 tokens (configurable via `AI_USER_DAILY_TOKEN_BUDGET`).

---

## Privacy + cost discipline locked in

- **Brand guardrails in every prompt's system block** — simple English, never reveal card numbers, INR only, never mention being an AI.
- **Pre-budget check is hard** — exceeded budget raises *before* a network call, so no surprise charges.
- **Per-call charging** — `input_tokens + output_tokens` accumulated in Redis with TTL to midnight UTC. Resets each day.
- **No raw user data in this layer** — the gateway sees only messages handed to it; the Stage 7/8/9 layers above are responsible for masking card numbers before calling.
- **Test-friendly** — `chat()` accepts an `httpx.Client` so we mock by transport, not by monkey-patch.

---

## How callers will use it (Stage 7 preview)

```python
from ai_gateway import get_gateway, ChatMessage
from ai_gateway.prompts import get_prompt

gateway = get_gateway()
prompt = get_prompt("phrase_insights")
messages = prompt.render(signals_json=json.dumps(signals))
result = gateway.chat(messages, tier=prompt.tier, user_id=user_id)
```

Three lines. Behind it: priority routing, multi-key pool, health-aware reordering, budget enforcement, four providers.

---

## What's deferred

| Item | Where |
|---|---|
| Streaming responses (SSE-style chunks) | Stage 8 (LabhPay Assistant — chat UX wants streaming) |
| Caching of repeated identical requests | Future cost optimisation; not needed for v1 |
| Real prompts for insights / assistant / resolution emails | Stages 7 / 8 / 9 — current registry holds v0.1 placeholders |
| Provider-level cost accounting (₹/1k tokens) | Stage 10 polish — already capturing token counts |
| Outbound LLM payload regex-scrubbing as backstop | Stage 7 — important once we start passing transactions to models |

---

**Ready for Stage 7 (Spending Intelligence + Suspicious Activity Alerts + Spending Profile)?**

Stage 7 lights up the actual insight cards on the dashboard. The deterministic signal generators (trend deltas, anomaly z-scores, recurring detection, duplicate-charge detector, forex-markup detector, late-fee detector) run locally; the gateway is used only once per analysis — a single batched call to phrase the insights in friendly English. Capped at ~800 output tokens.

Reply `Start Stage 7` to proceed.
