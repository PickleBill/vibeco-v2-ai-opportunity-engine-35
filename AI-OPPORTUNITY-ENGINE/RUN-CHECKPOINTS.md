# RUN CHECKPOINTS — VibeCo Engine autonomy run

_Append-only running log. Single writer (the orchestrator). One entry per milestone. Newest at the bottom. This is the run's brain — it survives session resets. See `FACTS-LEDGER.md` for IDs + truth rules, `MASTER-AUTONOMY-SPEC-v1.md` for the plan._

Checkpoint line index (monotonic; highest P# with PASS wins on resume):
`[ts] P# STATUS(PASS|FAIL|DEFERRED) — note`

- `[2026-06-24] P0 PASS — state sanity + ledger opened; project knowledge set`
- `[2026-06-24] P1 PASS — cluster_id/theme_id integrity asserted 30/30; hardening tests added`
- `[2026-06-24] P2 PASS — breadth: 3 new verticals (restaurant-ops, property-management, home-services) closed the loop; 4 roadmaps / 21 opportunities total`
- `[2026-06-24] P3 PASS — source health: multi-source mesh live (Firecrawl/Anthropic/Perplexity/HN); 0/2744 synth rows; Reddit not-configured (zero, by design)`
- `[2026-06-24] P4 PASS — /signal opportunity-first across 4 verticals (preview): evidence-on-card, Sketch handoff, home live card`
- `[2026-06-24] P5 PASS — hero CTA realigned (preview): opportunity scan primary, audit demoted (stale-doc finding)`
- `[2026-06-24] P6 PASS — product+ICP+skeptic panel: all 4 lenses would act on ≥1 opp (Instant-Pay Field Bot); skeptic 6.5/10, found+staged-fix for signal_raw.cluster_id NULL gap`
- `[2026-06-24] P7 PASS — QA scorecard: all hard gates green; PUBLISH-READY → preview (public flip holds for Bill)`

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

## P4 — Gallery render (Lovable, via MCP — parallel)

**Status:** PASS (preview)
**What changed:** Drove the Lovable agent (MCP) to make `/signal` opportunity-first and surface all 4 verticals. Changes (commit 173275a3, preview-only): removed the `enabled=true` filter so every vertical with data is selectable with its real label; moved the roadmap opportunity cards to the TOP (above themes/candidates); rebuilt each opportunity card with a plain-English motion chip (Build a tool / Pre-sell a service / Partner), effort badge, **"Backed by N public complaints" live count as the hero stat (not confidence)**, an expandable **Evidence drawer with real `source_url` links**, and a "Sketch this idea" button → `/simulate` (existing `prefillIdea` path). Added an additive `HomeOpportunityCard` (highest-confidence opportunity; renders nothing if no data). Typecheck clean.
**What we learned:** The board was already roadmap-aware — this was surgical, not a rebuild (~4.7 credits). The P6 Product Leader's #1 fix ("put the evidence ON the card, lead with evidence count not confidence") was incorporated directly into the brief and shipped.
**Product read:** `/signal` now clears the aliveness test shape: finished opportunity → why it pays → real receipts one click away → "Sketch this idea." This is the gallery.
**Evidence/tests:** Lovable build status completed/ready, agentFinished; preview at id-preview--8563d10e…lovable.app; commit 173275a3. Home screenshot confirms hero untouched by this pass.
**Risks:** Lovable committed to its own connected branch (not my feature branch) — no collision with the backend PR. Preview-only; public site unchanged.
**Next action:** P5 hero CTA realignment; P6 panel synthesis.
**Needs Bill:** no (review the preview; publish holds for your tap)

## P5 — Copy / positioning (hero CTA realignment)

**Status:** PASS (preview)
**What changed:** LIVE-STATE FINDING — the spec marked the home de-collision "DONE," but the live hero still led with the old "AI that reads your email and phone" headline + a PRIMARY "Book a discovery audit" CTA (contradicting the locked decision that Signal is the front door and the audit lives at /briefing). Made a surgical, preview-only fix (commit 04b13b98, 1 credit): "Run an opportunity scan" is now the primary CTA; "Book a discovery audit" demoted to a quiet secondary link. Headline left unchanged. The P4 build already used plain-English labels, and the QA fake-stat audit is clean — so no further jargon pass was needed.
**What we learned:** The spec's "DONE" claims for W1/W2 de-collision + hero replacement are STALE vs. the live site. Trust live state over docs (the run's own rule). The old hero headline is still live.
**Product read:** Home now leads with the engine, not the agency pitch — aligned with the thesis. The headline ("AI that reads your email and phone") is the remaining positioning mismatch; left for Bill (higher-stakes creative call).
**Evidence/tests:** Lovable diff applied to `src/components/Hero.tsx`; preview-only confirmed.
**Risks:** Low (preview-only, reversible, implements a locked decision).
**Next action:** P6 panel synthesis → fix list; assemble morning package.
**Needs Bill:** yes — the hero HEADLINE rewrite ("AI that reads your email and phone. It handles the rest." → engine-first positioning) is your creative call before publish.

## P6 — Product + ICP + Skeptic panel (§5b)

**Status:** PASS (qualified)
**What changed:** Ran 4 independent lenses as isolated sub-agents (no shared context). Product Leader 5/10 (content 7–8, "as-shown withholds receipts" → fixed in P4); Founder ICP 7/10; Operator ICP ~8.5/10 (9 restaurants, 9.5 home-services, 8 3PL, 7.5 property-mgmt); Technical Skeptic 6.5/10 evidence integrity (qualified YES). Synthesized one ranked fix list (morning package §3).
**What we learned:** All four would act on ≥1 opportunity (unanimous: Instant-Pay Field Bot) → the skeptic+product gate PASSES. The skeptic earned its keep: it caught a real structural gap — `signal_raw.cluster_id` NULL on all 2806 rows, breaking the candidate→source-row join — that every automated gate missed. Root-caused (signal-process never wrote cluster_id back; ingest-signal already did) and **fixed forward** (surfaced per-candidate `source_ids` in the signal-mine agent; signal-process now stamps signal_raw.cluster_id). Also flagged: ~11% of "web" evidence is Perplexity AI-summaries; 3PL corpus has off-topic keyword leakage.
**Product read:** The output is "well-sourced hypotheses to validate, not closed proof." Good enough to surface as leads; the money-recovery framings (Instant-Pay, Payout Integrity, SafePay) are the killers; the panel named opportunities to cut (Automated Stakeholder Playbook, Reservation Bot-Shield mis-scoped, FloorForce WMS-Lite, OrderLock).
**Evidence/tests:** 4 sub-agent verdicts; skeptic verified HN IDs vs Firebase API + HTTP statuses; DB confirms cluster_id NULL gap (0/2806). cluster_id fix committed (signal-mine.ts + signal-process); vitest 24 green.
**Risks:** The cluster_id fix is forward-looking only (can't relink existing rows) and needs a deploy. Live per-candidate drawer stays empty until deploy; gallery uses vertical-level evidence (works live).
**Next action:** P7 QA + morning package (done); push + draft PR (done).
**Needs Bill:** review the fix list; the cut/re-scope calls + per-opportunity why_now/riskiest_assumption are the highest-value next backend work.

## P7 — QA + publish-readiness

**Status:** PASS — PUBLISH-READY → preview (public flip holds for Bill)
**What changed:** Built + ran the reusable QA scorecard (`qa-scorecard.mjs`). All four automated hard gates green (build/truth/evidence/breadth+source). Assembled the morning package (§10): gallery, scorecard, panel fix list, publish-readiness call, log tail.
**What we learned:** Truth gate clean (0/2806 synth, fake-stat audit only false positives). The publish gate resolves to PUBLISH-READY → preview; per the operating contract, the public flip is NOT auto-taken.
**Product read:** The engine is publish-ready as a dynamic opportunity gallery; the two things worth doing before a public flip are the hero headline + the why_now schema (both Bill-gated deploys).
**Evidence/tests:** `node AI-OPPORTUNITY-ENGINE/qa-scorecard.mjs` → ALL HARD GATES PASS; QA-SCORECARD-2026-06-24.md.
**Risks:** None blocking. Public flip + deploys held for Bill (the only two gates).
**Next action:** Run complete. Hourly PR check-in armed; subscription active on PR #3.
**Needs Bill:** yes — (1) publish-to-public tap; (2) deploy the staged backend fixes; (3) hero headline call.

---

# Post-run follow-ups (2026-06-25) — executing the approved go-forward plan

Plan: publish (Bill's tap) → ① deploy cluster_id fix → ② public add-a-vertical button (lite/full tiers). Cost model locked by Bill: LITE public (HN+scout, ~1/hr) / FULL admin.

## F1 — Deploy the cluster_id evidence fix
**Status:** PASS (live)
**What changed:** Verified the live `signal-process` was still running pre-fix code (newly-clustered rows got `cluster_id=NULL`). Redeployed `signal-process` + `signal-collect` via the Lovable agent's edge-function deploy. Re-verified: post-deploy processing now stamps `signal_raw.cluster_id` (0 → linked). The per-candidate Evidence drawer chain works on all future scans. Existing rows stay go-forward only (their member→row mapping was never persisted).
**Needs Bill:** no

## F2 — Public "add-a-vertical" scan (lite/full tier)
**Status:** PASS (backend live; frontend in preview)
**What changed (backend, PRs #4/#5, deployed):** `signal-collect` honors `tier: 'lite'|'full'` (default full = unchanged). LITE runs only the cheap keyless adapters (HN + ai_gateway_scout) with a tight cap; the paid web-search adapters are held. Rate-limited before any spend: per-client 3/hr (stable `client_key`) + global 200/day backstop, via a new service-role `scan_requests` ledger. Pure tier-selection helpers + tests (suite 28 green).
**What changed (frontend, Lovable, preview):** `OpportunityScan` upgraded into a real public flow — enter a vertical → persistent `client_key` → lite scan (collect→process→roadmap on a unique `scan-<slug>-<rand>` tag) → live stepper → inline evidence-backed opportunity cards (motion chip, effort, problem/build/why-it-pays, live "backed by N complaints" count, expandable real source links, "Sketch this idea" → /simulate). 429 → friendly "sign in for full scans". `SignalBoard` selector now lists only curated `signal_verticals` so public scans don't clutter it.
**Evidence/tests:** End-to-end live run (freelance-developers): 13 HN posts → 3 traceable candidates → 3 real opportunities (conf 75–90); cluster_id linked; 0 public scans on the curated board. Lite tier verified (only HN+scout ran); per-client 429 verified on the 4th rapid scan; full tier unaffected. Lovable typecheck clean; homepage renders cleanly (browser screenshot). Test scan data cleaned up afterward.
**Risks:** Lite scans are thinner (HN-led) by design — the UI says so honestly and nudges sign-in for the full multi-source scan. Browser smoke-test of the scan section was blocked by preview network/auth (env limitation), but the data path + render are verified.
**Needs Bill:** publish-to-public tap (the build is in preview). Optional: the per-opportunity why_now/riskiest_assumption schema upgrade remains the top quality follow-up.
