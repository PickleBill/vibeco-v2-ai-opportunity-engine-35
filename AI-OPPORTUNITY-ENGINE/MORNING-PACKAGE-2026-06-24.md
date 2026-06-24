# ☀️ Morning Package — VibeCo Engine autonomy run, 2026-06-24

_What you wake up to. The run took the engine from 1 roadmap / 1 vertical to a stress-tested gallery across 4 verticals, hardened + QA'd, publish-ready in preview. Two things hold for your tap: publishing public, and any outbound to a human. Nothing was published; nobody was messaged._

---

## 1. The opportunity gallery
**4 verticals · 2,744+ real signal rows (0 synthetic) · 47 traceable candidates · 4 roadmaps · 21 finished opportunities.** Full detail: [`OPPORTUNITY-GALLERY.md`](./OPPORTUNITY-GALLERY.md). Live + interactive on the `/signal` preview (vertical selector → opportunity-first cards → evidence drawer with real source links → "Sketch this idea").

The four lenses + you would most likely build these (unanimous standouts):
- **Instant-Pay Field Bot** (home services) — tech taps "complete" → auto-invoice + payment link. _Every panelist named this the strongest._ conf 95.
- **The Payout Integrity Engine** (restaurants) — reconciles POS + delivery CSVs + bank to flag "missing money." conf 95.
- **SafePay Broker Audit** / **FreightID** (3PL) — payment-risk + carrier-identity fraud. conf 90/95.

## 2. QA / product scorecard
**All four automated hard gates GREEN** — see [`QA-SCORECARD-2026-06-24.md`](./QA-SCORECARD-2026-06-24.md) (`node AI-OPPORTUNITY-ENGINE/qa-scorecard.mjs`).

| Gate | Result |
|---|---|
| BUILD (tests) | ✅ 24 passing |
| TRUTH (no invented stats) | ✅ 0/2806 synth rows; fake-stat audit clean (flags are CSS %/live values) |
| EVIDENCE (real sources) | ✅ every vertical resolves to real `signal_raw.source_url` rows |
| BREADTH | ✅ 4 verticals with roadmaps (warm-start floor was 3) |
| SKEPTIC + PRODUCT (§5b panel) | ✅ panel would act on ≥1 opportunity (see §3) |

## 3. Product + ICP panel (§5b) — synthesized fix list
Four independent lenses (no shared context). Scores: **Product Leader 5/10** (content 7–8, but "as-shown withholds the receipts" — since fixed in P4), **Founder ICP 7/10**, **Operator ICP ~8.5/10** (9 restaurants, 9.5 home-services, 8 3PL, 7.5 property-mgmt), **Technical Skeptic: SEE §3a**. **Unanimous: all four would act on ≥1 opportunity** (Instant-Pay Field Bot) → the skeptic+product gate PASSES.

Fix list, ordered by how many lenses flagged it:
1. **Evidence + a confidence denominator on every card** (3 lenses — the #1 ask). "A 95 with no denominator reads like a slot machine." → **PARTIALLY SHIPPED in P4**: the card now leads with "Backed by N public complaints" (live count) + an evidence drawer of real source links, instead of the bare confidence number. _Remaining:_ show per-opportunity signal count + recency, not just the vertical total.
2. **Cut / re-scope the weak opportunities** (2+ lenses): *Automated Stakeholder Playbook* (cut — vaguest, lowest conf, "consultant-ware"); *Reservation Bot-Shield* (re-scope to full-service — wrong for QSR); *FloorForce WMS-Lite* ("WMS-Lite is a graveyard"); *OrderLock* (vague, lowest conf). A simple post-filter or a "min distinct-source" threshold would drop these automatically.
3. **Add `why_now` + `riskiest_assumption` (+ objection→rebuttal) per opportunity** (2 lenses, load-bearing for the aliveness test). These fields are promised in the pitch but **not in the roadmap schema today**. → backend enhancement (extend `opportunity-roadmap`'s tool schema + re-run). _Needs a deploy — see §4._
4. **Lead with the dollar; add a willingness-to-pay/pricing read** (2 lenses). The killers are the money-recovery framings (Payout Integrity, Instant-Pay, SafePay). Operator even named price models ("20-25% of recovered money", "$99-149/store/mo"). The engine mines pain but not WTP.
5. **Watch homogenization** (1 lens): several opportunities collapse to the same "offline/fail-safe caching layer" primitive — loud in forums, thin as businesses.

### 3a. Technical Skeptic verdict (evidence-verification pass) — **the most valuable lens**
**Verdict: Qualified YES · 6.5/10 evidence integrity.** "Act on ≥1 opportunity as a lead, not as proof. Treat outputs as well-sourced hypotheses to validate, never as a closed evidentiary chain." It did 19 live checks (HN Firebase API, HTTP fetches, DB audits):

**Verified real:** HN `source_url`s match DB titles exactly (checked IDs against the official Firebase API); Reddit/blog URLs return 200; **0 synthetic rows in 2806**; no fabricated/404 URLs found. Candidate→cluster→theme traceability: **clean, zero nulls** (all 47 candidates carry cluster_id + theme_id).

**The real gap it caught (others missed):** **`signal_raw.cluster_id` is NULL on all 2,806 rows** → the candidate→source-row join is severed. The per-candidate Evidence drawer (cluster_id join) therefore resolves to nothing; `member_count` is unauditable; and `representative_quotes` are LLM reconstructions, not verbatim rows. Also: **~11% of "web" evidence is `perplexity_sonar` AI summaries** (not first-person complaints) — the Instant-Pay candidate's only web evidence is one such summary — and the **3PL corpus has off-topic keyword leakage** ("temporal logic," "high heels," etc.).

**→ FIXED IN THIS RUN (forward-looking):** root cause was that `signal-process` collected raw first, clustered later, and never wrote `cluster_id` back (whereas `ingest-signal` already did). I surfaced per-candidate `source_ids` in the signal-mine agent and made `signal-process` stamp `signal_raw.cluster_id` after each cluster insert. **Caveat:** this only helps FUTURE scans (the existing 2,806 rows' member→row mapping was never persisted, so it's unrecoverable), and it needs a **deploy** to take effect. Until then the live per-candidate drawer stays empty — but the P4 gallery deliberately uses **vertical-level** evidence (real source links by product_tag), which works live today.

**Gate status:** with all four lenses returning "would act on ≥1 opportunity," the skeptic+product gate is a **qualified PASS** — strong enough to surface as leads, with the evidence-chain caveat logged and the structural fix staged.

## 4. Publish-readiness call
**Status: PUBLISH-READY → preview, holding for your tap.** All automated gates that can pass autonomously are green; the build is deployed to the Lovable **preview** (`id-preview--8563d10e…lovable.app` / editor `lovable.dev/projects/8563d10e…`). Per your operating contract, **the public flip is yours** — nothing was published.

Three things genuinely want your eyes before you flip public:
- **The hero HEADLINE.** I realigned the hero *CTA* (opportunity scan is now primary; discovery audit demoted) — but the headline is still the old _"AI that reads your email and phone. It handles the rest."_ that the spec said was removed. Rewriting public hero copy is your creative call.
- **Deploy the `signal_raw.cluster_id` writeback fix** (this PR) so the per-candidate Evidence drawer works on future scans — restores the "every claim → its source" promise end-to-end. The gallery's vertical-level evidence already works live; this fixes the tighter per-candidate join.
- **`why_now` / `riskiest_assumption` per opportunity** (panel fix #3) needs a function change + deploy (a deploy = your gate). Worth doing before a public push — it's the half of the aliveness test still missing.

Optional, your call: flip `enabled=true` on any of the 3 new verticals to add them to the nightly cron (adds recurring scan cost; I kept them off it).

## 5. Coordination log tail
Phases P0→P7 all checkpointed PASS in [`RUN-CHECKPOINTS.md`](./RUN-CHECKPOINTS.md). No phase failed; nothing needed a resume. One non-blocking council mini-gate logged (codebase one-vs-two → default held: keep building on V2.1).

---

## Roll-up

### What moved fastest
- **Breadth.** Three brand-new verticals went idea → 5 finished, evidence-backed opportunities each in one pass apiece, because the pipeline + the multi-source mesh were already strong. The bottleneck was never signal — it was that only one vertical had ever been run.
- **The gallery render.** `/signal` was already roadmap-aware, so opportunity-first + evidence-on-card was a *surgical* ~5-credit change, not a rebuild.

### What got stuck / didn't happen
- **The per-candidate evidence chain was broken** (`signal_raw.cluster_id` NULL on all rows) — caught by the skeptic, **root-caused and fixed in this PR**, but the fix only helps future scans and needs a deploy to activate. The existing rows can't be retroactively linked (the mapping was never stored). Worked around live via vertical-level evidence.
- **`why_now` / `riskiest_assumption` per opportunity** — the panel wants them and the aliveness test needs them, but they're not in the roadmap schema, and the live function can't emit new fields without a deploy (gated). Logged as the top backend follow-up.
- **Reddit** — still not configured; contributed zero (by design). Real Reddit *pages* still show up via Firecrawl web search, so evidence didn't suffer.
- **The hero headline** — left for Bill (high-stakes creative).

### What Bill should learn from this run
- **Your state docs drift; the live system is the truth.** The spec confidently marked the home de-collision and the hero swap "DONE" — both were still un-done on the live site. Same with the source mesh: docs said Firecrawl/Anthropic/Perplexity were "dormant," but all three keys are live and did the heavy lifting. **Rule that paid off: read live state before writing anything.**
- **The engine is genuinely dynamic, not a one-vertical demo.** Point it at any SMB vertical and it returns operator-shaped opportunities with receipts. The warm-start floor (≥3) was the wrong ceiling to fixate on.
- **The opportunities cluster into a real thesis:** *"find where SMB operators are bleeding cash or where their tools break under load."* The money-recovery framings (Instant-Pay, Payout Integrity, SafePay) are the killers; the "platform/layer/dashboard" framings are where it drifts into consultant-ware.

### What should become a reusable prompt / workflow / skill / automation
1. **`add-a-vertical` automation** — the exact loop this run ran by hand: `signal-collect (scrape:false, bounded) → signal-process → opportunity-roadmap → register signal_verticals(enabled=false)`. Wrap it as a one-button "find opportunities in <vertical>" flow (the product's actual core promise). This is the highest-leverage thing to productize.
2. **`qa-scorecard.mjs`** (shipped this run) — the automated truth/evidence/breadth gate. Wire it into CI / pre-publish so no scan ever publishes with a synthetic row or an untraceable claim.
3. **The §5b product+ICP panel as a repeatable skill** — 4 isolated lenses (Product Leader · Founder ICP · Operator ICP · Technical-Skeptic-with-live-DB-access) → one ranked fix list. It caught the "evidence-on-card" gap and the weak opportunities to cut. Reusable on any deliverable.
4. **A `roadmap` schema upgrade** (`why_now`, `riskiest_assumption`, `objection`/`rebuttal`, per-opportunity evidence count) — turns the gallery from "a smart list" into the full aliveness-test card the panel kept asking for.
