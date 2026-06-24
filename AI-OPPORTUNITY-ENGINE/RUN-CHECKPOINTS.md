# RUN CHECKPOINTS — VibeCo Engine autonomy run

_Append-only running log. Single writer (the orchestrator). One entry per milestone. Newest at the bottom. This is the run's brain — it survives session resets. See `FACTS-LEDGER.md` for IDs + truth rules, `MASTER-AUTONOMY-SPEC-v1.md` for the plan._

Checkpoint line index (monotonic; highest P# with PASS wins on resume):
`[ts] P# STATUS(PASS|FAIL|DEFERRED) — note`

- `[2026-06-24] P0 PASS — state sanity + ledger opened; project knowledge set`
- `[2026-06-24] P1 PASS — cluster_id/theme_id integrity asserted 30/30; hardening tests added`

---

## P0 — State sanity + ledger

**Status:** PASS
**What changed:** Created `AI-OPPORTUNITY-ENGINE/` as the run home (`RUN-CHECKPOINTS.md`, `FACTS-LEDGER.md`). Confirmed repo↔project mapping. Ran the Lovable capability probe (PASSED — this session can drive Lovable directly). Ran a `signal-collect` persist:false dry run to confirm the function is reachable and signal flows. Set the Lovable project knowledge (was empty) to the §2 thesis + §11 truth rules.
**What we learned:** (1) The active engine is the `vibeco-v2-ai-opportunity-engine-35` repo ↔ Supabase `brpqtaaknxdqkjvzfvlo` ↔ Lovable `8563d10e` (public). (2) **Re-baseline:** the source mesh is far richer than the docs — Firecrawl, Anthropic web-search, and Perplexity keys are ALL live now; a fresh-vertical dry run pulled 743 deduped items across 6 adapters (HN 46, scout 8, anthropic 14, perplexity 9, firecrawl 981). Reddit remains not-configured (zero, by design). (3) Because collect now hits paid adapters, each run costs real credits → run one vertical at a time, verify, scale.
**Product read:** The engine's collection layer is healthier than anyone documented. Breadth is wide open — the constraint is processing cost + quality, not signal availability.
**Evidence/tests:** Live DB counts match the spec baseline exactly (1154/30/15/30/1/1). `signal-collect` HTTP 200 with 743 items. Project knowledge GET returned empty before SET.
**Risks:** Multi-source collect consumes credits; bounded by one-vertical-at-a-time + `scrape:false`. Writing new verticals to the prod DB is visible on the public board, but additive + reversible by `product_tag`.
**Next action:** P1 hardening (idempotent backfill + traceability tests) → P2 breadth on vertical 1 (`restaurant-ops`).
**Needs Bill:** no

## P1 — Hardening

**Status:** PASS
**What changed:** Asserted `feature_candidates` traceability integrity read-only (no regeneration). Added repo tests covering traceability invariants + an idempotent-backfill helper.
**What we learned:** 30/30 candidates already carry both `cluster_id` and `theme_id`; all 30 `status=open`; 1 product_tag. The Evidence drawer's candidate→source join is structurally sound. Nothing to backfill on the existing 3PL data.
**Product read:** The "click any claim → real source" promise holds on the existing vertical. Traceability is a guarantee we can now test, not just assert.
**Evidence/tests:** DB integrity query (30 total / 30 cluster / 30 theme / 30 open / 1 tag). New tests under the repo test suite (see commit).
**Risks:** Low. Tests are additive.
**Next action:** P2 — run the full loop on vertical 1, verify a real roadmap with resolvable evidence URLs.
**Needs Bill:** no
