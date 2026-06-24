# Facts Ledger — VibeCo AI Opportunity Engine autonomy run

_One defensible value per claim. `⚠️` = needs Bill. Never invent or silently change a number. Opened 2026-06-24 by the orchestrator (Claude Code, remote env). This is the run's source of truth for IDs, decisions, and the "no invented stats" rule._

## Identity / surface map (verified live 2026-06-24)

| Thing | Value | Notes |
|---|---|---|
| Active Lovable project | `8563d10e-0a80-479b-a250-2a385fe4ceab` ("VibeCo V2.1" / `conviction-to-code.lovable.app`) | **published / public** (`is_published: true`) |
| Active Supabase ref | `brpqtaaknxdqkjvzfvlo` | the V2 backend |
| Active repo | `PickleBill/vibeco-v2-ai-opportunity-engine-35` @ `claude/kind-mayer-y6owl7` | this repo; holds `opportunity-roadmap`, `ingest-signal`, signal-mine |
| Riff / council source (reference only — DO NOT overwrite) | Lovable `b653b128` (`vibeco.lovable.app`), repo `PickleBill/vibeco` | the live `/simulate` riff/council source (V1) |
| NEVER touch | Lovable `411a926c` | per spec |
| Lovable account | `bill@playpicklebills.com`, workspace "My Lovable" (owner) | MCP capability probe PASSED — this session can drive Lovable directly |

## Pipeline baseline (verified live 2026-06-24, project 8563d10e)

| Table | Count | Notes |
|---|---|---|
| `signal_raw` | 1154 | all 3PL vertical |
| `signal_clusters` | 30 | |
| `signal_themes` | 15 | |
| `feature_candidates` | 30 | **30/30 have cluster_id AND theme_id**, 30/30 `status=open`, 1 product_tag |
| `opportunity_roadmaps` | 1 | 3PL only |
| `signal_verticals` | 1 | `wholesale-distribution-3pl` ("Wholesale distribution / 3PL"), enabled |

**The loop is proven once (1 roadmap, 1 vertical). Mission = breadth + hardening + QA + gallery.**

## Source mesh — LIVE STATE (re-baseline 2026-06-24, contradicts stale docs)

A persist:false dry run of `signal-collect` on a fresh vertical (`restaurant-ops`) returned **743 deduped items** across these adapters:

| Adapter | Configured | Probe result | Note |
|---|---|---|---|
| reddit | ❌ no | skipped | creds still absent (W4) — contributes zero, by design |
| hackernews (Algolia) | ✅ yes | 46 posts | keyless, always-on |
| ai_gateway_scout | ✅ yes | 8 posts | native, no key |
| anthropic_web_search | ✅ **yes** | 14 posts | **KEY IS LIVE** (docs said dormant) |
| perplexity_sonar | ✅ **yes** | 9 posts | **KEY IS LIVE** (docs said dormant) |
| firecrawl | ✅ **yes** | 981 posts | **KEY IS LIVE** (docs said dormant) |

**Implication:** breadth is NOT HN-only. The full multi-source mesh is live. This also means `signal-collect` costs real credits per run (Firecrawl/Anthropic/Perplexity) → run the loop one vertical at a time, verify, then scale.

## Invocation contracts (all `verify_jwt = false` — anon-key invocable)

- Endpoint base: `https://brpqtaaknxdqkjvzfvlo.supabase.co/functions/v1/<fn>`; headers `Authorization: Bearer <publishable key>` + `apikey: <publishable key>`.
- `signal-collect` body: `{ product, vertical, keywords[], subreddits[], lookback_days, limit, scrape, persist }` → `signal_raw`.
- `signal-process` body: `{ product, product_context, limit(≤200), mode:'fast'|'deep', persist }` → `signal_clusters` + `signal_themes` + `feature_candidates`.
- `opportunity-roadmap` body: `{ product, vertical, mode, persist }` → `opportunity_roadmaps` (needs ≥1 open candidate; keeps one per `(product_tag, scan_date)`).
- Everything keyed by `product_tag` + `scan_date` → **fully reversible** (`DELETE WHERE product_tag IN (...)`).

## Decisions log (run)

- **2026-06-24 — Repo↔project mapping confirmed.** `vibeco-v2-ai-opportunity-engine-35` ↔ `brpqtaaknxdqkjvzfvlo` ↔ Lovable `8563d10e`. The other local repo `vibeco` is V1 (`b653b128`). Build on V2.
- **2026-06-24 — Capability probe PASSED.** This session drives Lovable directly via MCP → backend + frontend run in parallel.
- **2026-06-24 — Breadth strategy.** Run the full loop one new vertical at a time (collect→process→roadmap, persist:true), verify real roadmap + resolvable evidence URLs, checkpoint, then scale to ≥3. Idempotent + cost-bounded.
- **2026-06-24 — Firecrawl `scrape:false` for breadth runs** to bound cost (search snippets carry the source_url, which is the deliverable). Reversible default.

## Truth rules (binding on every agent + the frontend)

1. No invented numbers. Live query or "Not available."
2. No fake scan states. Distinguish not-configured / failed / no-results / not-attempted.
3. Every opportunity claim maps to real `signal_raw.source_url` rows, or is labeled an inference.
4. No roadmap rendered unless actually generated from candidate context.

## Human gates (only two)

1. **Publish to public** (deploy / flip visibility) — holds for Bill's explicit yes.
2. **Outbound to a human** (email / DM / Eric) — holds for Bill's explicit yes.

Everything else runs unattended, gated only by automated cross-system checks.
