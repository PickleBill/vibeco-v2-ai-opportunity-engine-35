# V2.1 Backend Closeout — CHANGES

_Backend owner pass on `PickleBill/vibeco-v2-ai-opportunity-engine-35`, branch
`claude/peaceful-dirac-nszyih`. Project Supabase ref `brpqtaaknxdqkjvzfvlo`._

## TL;DR

- **Hardened the LLM client** (timeouts, retry+backoff, **Gateway → Anthropic‑direct
  provider fallback**, tolerant JSON parsing) — the single most important code change.
- **Made `signal-process` idempotent** so re-runs / overlapping runs never create
  duplicate candidates, while still retaining rows on a hard AI failure.
- **Verified security live**: anon can read the board, but anon insert/update → **401**
  and `ingest-signal` without the token → **401**. RLS lockdown is in force.
- **🚧 The board is NOT filled yet — and it's blocked on you, not code.** The Lovable
  AI Gateway workspace is **out of credits**: every model returns
  `403 credit_limit_reached` (verified via `probe-models` → **0 / 12 models available**).
  `signal-process` therefore can't classify/cluster/synthesize. **Nothing was
  corrupted** — the 766 unprocessed rows are retained and the board still shows its
  4 existing candidates. See **Blocker** below for the two ways to unblock.

---

## What changed (code — all on this branch)

| File | Change |
|---|---|
| `supabase/functions/_shared/resilience.ts` | **New, dependency‑free** module: retry classification, exponential backoff, `fetchWithTimeout`, and tolerant JSON extraction (`extractJson` / `parseToolArguments`). Pure → unit‑testable in Node. |
| `supabase/functions/_shared/llm-client.ts` | Every gateway call now has a **per‑request timeout** (default 90s, aborts + retries), **retry with exponential backoff** on 429/5xx/timeout/network, and a **provider fallback**: if the Lovable Gateway stays unhealthy (429 / 402 / **403 credit‑limit** / 5xx / timeout) **and `ANTHROPIC_API_KEY` is set**, the call fails over to the Anthropic API directly. Tool‑arg parsing is now tolerant (recovers JSON wrapped in prose/fences instead of throwing). `callLLMWithTool` also recovers JSON from message content. Signatures unchanged → backward compatible. |
| `supabase/functions/_shared/model-router.ts` | Added `anthropicDirectFallbackModel()` so the fallback model lives in the router (no hardcoded model strings in edge functions). |
| `supabase/functions/_shared/error-handler.ts` | `402` **and** the Lovable Gateway's `403 credit_limit_reached` now surface as a clear **"AI credits exhausted"** message (HTTP 402) instead of a generic "AI service error". |
| `supabase/functions/signal-process/index.ts` | **Idempotency guard:** DB‑loaded rows are *claimed* (marked `processed`) **before** the mesh runs, so a concurrent invocation or a re‑run can't reprocess the same rows → no duplicate candidates. On a **hard** mesh failure the claim is **released** (rows retried next run; board never blanked). Theme `score_history` is deduped per `scan_date` so same‑day batches keep one trend point per day. |
| `src/test/llm-resilience.test.ts` | **New** Vitest suite (17 tests) for the resilience helpers: retry classification, backoff growth, `withRetry` behavior, JSON extraction, and the 403‑credit‑limit fallback rule. |
| `tools/signal-harness/fill-board.sh` | **New** reusable, idempotent board‑fill helper (sequential disjoint batches + external retry). Run it to fill the board the moment the gateway is unblocked. |

**Conventions held:** all LLM calls still go through `_shared/llm-client`; model
strings only in `model-router`; edge functions stay thin; migrations untouched
(none needed). No secret values touched or printed.

---

## Verified before claiming done

- `npm run build` → **green**. `npm test` → **18 passed**. `npx eslint` on every
  changed file → **0 new errors** (repo‑wide lint is pre‑existing red: 96 errors,
  all `any`/`require` across the codebase, unchanged by this branch — 96 → 96).
- **Live security re‑check** (anon publishable key):
  - anon `INSERT feature_candidates` → **401**; anon `PATCH … status` → **401**;
    probe row never landed; open‑candidate count unchanged. ✅
  - `POST ingest-signal` without bearer → **401**. ✅
  - anon `SELECT` on the board tables → **200** (public read works). ✅
- **Live gateway diagnosis** via `probe-models`: 0/12 models — all
  `403 credit_limit_reached` (root cause of the empty board).
- **Recorded scan input → output:** `signal-process` over
  `wholesale-distribution-3pl` returned `{"error":"AI service error"}` (the
  pre‑hardening message) because of the credit cap; board left at
  766 unprocessed / 4 candidates (graceful degrade — rows retained).

---

## 🚧 Blocker: the AI Gateway workspace is out of credits

`probe-models` is unambiguous — **every** Lovable model is
`403 credit_limit_reached: "This workspace has reached its credit limit."** Until
that's resolved, `signal-collect`'s AI scout and **all** of `signal-process` fail.
Pick one:

1. **Top up / raise the Lovable workspace credit limit** (fastest, no deploy).
   The gateway is already the wired default — once it has credits, run
   `tools/signal-harness/fill-board.sh wholesale-distribution-3pl "Wholesale distribution / 3PL"`
   (or just wait for tonight's 13:15 UTC cron) and the board fills.
2. **Set `ANTHROPIC_API_KEY` _and_ merge this branch to `main`** (Lovable
   auto‑deploys the backend on push to `main`). The hardened client then **fails
   over to Anthropic‑direct** on the 403 and the same fill command works on
   Anthropic credits instead. ⚠️ The fallback only exists in *this branch* — the
   currently‑deployed `signal-process` has no fallback, so the secret alone won't
   help until this is deployed.

Either path, then: **Draft roadmap** on the board runs `opportunity-roadmap` over
the now‑live candidates.

---

## Secret NAMES for you to set (server‑side only — never paste values in chat)

Set in **Supabase → Project Settings → Edge Functions → Secrets**.

| Secret | Why | Status |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Recommended.** Enables the new Gateway→Anthropic‑direct fallback (rides out gateway credit caps/outages) **and** the dormant Anthropic `web_search` source adapter. | unset |
| `PERPLEXITY_API_KEY` | Optional. Enables the Perplexity Sonar source adapter (more grounded sources). | unset |
| `INGEST_TOKEN` | External `brickhouse-v1` scanner → `ingest-signal` bearer auth. | confirm set |
| `LOVABLE_API_KEY` | AI Gateway (default path). Already set — but the **workspace credit cap** is the active blocker above. | set, capped |

**Per your instruction, there is _no_ dependency on Reddit.** `REDDIT_CLIENT_ID/SECRET`
are **not required** — the collector self‑skips Reddit when unset and still gathers
from Hacker News (keyless) + the AI scout + Firecrawl/Anthropic/Perplexity. Leave
them unset.

---

## What needs a Publish / merge‑to‑`main` to take effect

Backend auto‑deploys on push to **`main`**; this work is on
`claude/peaceful-dirac-nszyih`, so it is **inert until merged**:

- The LLM‑client hardening + provider fallback, the error‑handler credit message,
  and the `signal-process` idempotency guard all deploy on merge.
- The frontend goes live only on a **manual Lovable Publish** (not done here).

I did **not** publish the public site, rotate/expose any secret, or run anything
destructive (per the guardrails).

---

## Task‑by‑task status

1. **Fill the board** — ⛔ **blocked on gateway credits** (above). Code is ready;
   `fill-board.sh` will drain the 766 rows the moment credits/fallback exist. The
   idempotency guard is landed so it's safe to re‑run.
2. **Turn on real AI** — secret NAMES documented; **you** set them. Provider
   fallback is now wired so `ANTHROPIC_API_KEY` also buys gateway‑outage resilience.
3. **Schedule** — already coded (`20260623210000_signal_verticals_and_cron.sql`:
   correct ref, iterates enabled verticals, 13:00/13:15 UTC). I can't read the live
   `cron.job` from here — verify with:
   `select jobname, schedule from cron.job where jobname like 'signal-%';`
4. **Security** — RLS lockdown verified **live** (anon read‑only; writes 401;
   ingest 401). Frontend Promote/Dismiss/Run‑scan already admin‑gated.
5. **Scan wiring + LLM harden** — LLM client **hardened** (this is the backend
   half). On AI failure with no key the pipeline now degrades gracefully (retain
   rows, surface a credits error, never blank the board). The `OpportunityScan` →
   simulator UI wiring is intentionally **left to the Lovable frontend pass** to
   avoid collision (per your call).

---

## Honest remaining gaps

- **Board still shows 4 candidates** — unblock the gateway credits (or set
  `ANTHROPIC_API_KEY` + merge), then run `fill-board.sh`. This is the only thing
  between here and a full board.
- **Cron registration is unverified from here** (no live DB access) — run the
  `cron.job` query above to confirm the two daily jobs exist.
- **Provider fallback is verified by unit tests, not yet end‑to‑end live** (it only
  runs once this branch is deployed and `ANTHROPIC_API_KEY` is set).
- **Repo‑wide lint is red** (96 pre‑existing `any`/`require` errors across the
  codebase) — out of scope for this pass; this branch adds none.
