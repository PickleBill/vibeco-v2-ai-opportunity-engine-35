# RUN CHECKPOINTS — VibeCo Engine autonomy run

_Append-only running log. Single writer (the orchestrator). One entry per milestone. Newest at the bottom. This is the run's brain — it survives session resets. See `FACTS-LEDGER.md` for IDs + truth rules, `MASTER-AUTONOMY-SPEC-v1.md` for the plan._

Checkpoint line index (monotonic; highest P# with PASS wins on resume):
`[ts] P# STATUS(PASS|FAIL|DEFERRED) — note`

- `[2026-06-24] P0 PASS — state sanity + ledger opened; project knowledge set`
- `[2026-06-24] P1 PASS — cluster_id/theme_id integrity asserted 30/30; hardening tests added`
- `[2026-06-24] P2 PASS — breadth: 3 new verticals (restaurant-ops, property-management, home-services) closed the loop; 4 roadmaps / 21 opportunities total`
- `[2026-06-24] P3 PASS — source health: multi-source mesh live (Firecrawl/Anthropic/Perplexity/HN); 0/2744 synth rows; Reddit not-configured (zero, by design)`

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

## P2 — Breadth (the front-load)

**Status:** PASS
**What changed:** Ran the full live loop (collect → process → roadmap, persist) on 3 new verticals: `restaurant-ops`, `property-management`, `home-services`. Each closed end-to-end into a real `opportunity_roadmaps` row. Registered each in `signal_verticals` with `enabled=false` (PRODUCT DECISION — keeps them off the nightly cron so no surprise recurring spend; the board still surfaces any vertical that has candidate data).
**What we learned:** The engine is genuinely dynamic — point it at a fresh vertical and it returns 5 finished, stress-tested opportunities with target user · pain · why-now · build · motion · effort · ROI · confidence, grounded in real evidence. Quality is high (e.g. restaurant "Payout Integrity Engine" conf 95; home-services "Instant-Pay Field Bot" conf 95). One vertical at a time kept cost bounded and let each be verified before the next.
**Product read:** This clears the aliveness test on 4 verticals, not 1. The gallery is real and on-brand for the founder + operator ICPs (every opportunity names a specific SMB customer and a next move). `opportunity_roadmaps` 1 → 4; opportunities total = 21.
**Evidence/tests:** Live DB: 4 product_tags, 2744 real signal_raw (0 synth), 47 candidates (0 untraceable), 4 roadmaps. Opportunity JSON spot-checked; sample source URLs are real, resolvable pages (g2.com, capterra.com, swipe.by, appfront.ai). Gallery saved to `OPPORTUNITY-GALLERY.md`.
**Risks:** New verticals' data is visible on the public board (board reads product_tags with data) — additive + reversible by `product_tag`. Recurring nightly cost held at 1 vertical by the `enabled=false` decision.
**Next action:** P4 — drive Lovable to render `/signal` opportunity-first across all 4 verticals (surgical, not a rebuild) + a live Home card.
**Needs Bill:** no (but: flip `enabled=true` on any new vertical you want scanned nightly — that adds recurring cost)

## P3 — Source health

**Status:** PASS
**What changed:** Confirmed the live source mesh via real runs. No changes needed — the adapters are healthier than the docs claimed.
**What we learned:** Per-run adapter posts (restaurant-ops): firecrawl 760, anthropic_web_search 15, perplexity_sonar 10, ai_gateway_scout 7, hackernews 0–46 (phrase-keyword dependent), reddit skipped (not configured). Firecrawl/Anthropic/Perplexity keys are all LIVE now (the spec/coordination docs saying "dormant pending keys" are stale). 0 synthetic rows across all 2744 — the synth fallback correctly never fires for real verticals.
**Product read:** Source health is honest and strong. Reddit contributes zero and nothing depends on it (by design). The "every claim links to a real source" promise holds.
**Evidence/tests:** `signal-collect` adapter status arrays per run; DB synth count = 0.
**Risks:** Firecrawl returns high volume per run (cost) — bounded via `scrape:false` + tight keyword sets + small `limit`.
**Next action:** P4 gallery render; P6 product+ICP panel.
**Needs Bill:** no

## Council mini-gate (P1→P2) — codebase one-vs-two

**Status:** logged, non-blocking (default held)
**Call:** Keep building on V2.1 (`8563d10e`) as the active surface; V1 (`b653b128`) stays the `/simulate` riff source. Two-project model holds (per the existing 2026-06-24 decision). Did not spend a council pass — the default is clear and the run favors momentum. Queued for a deeper Cowork/council pass if Bill wants to revisit collapse later.
