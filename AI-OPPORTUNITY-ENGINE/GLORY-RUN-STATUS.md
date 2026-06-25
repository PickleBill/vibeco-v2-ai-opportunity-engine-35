# 🏁 GLORY-RUN-STATUS — Signal Scanner for Eric

_Single status file. The PM-Orchestrator updates this after every step so Bill sees progress at a glance._

**Goal:** a real, cool-looking **Signal Scanner** as the live demo proof point for Eric, alongside the proposal. **Velocity is the pitch.** Optimize for COOL + WORKING over pristine.

**Last updated:** 2026-06-25 · Orchestrator: Claude Code (remote) · Engine: Supabase `brpqtaaknxdqkjvzfvlo` / Lovable `8563d10e` (`conviction-to-code.lovable.app`)

---

## ⏱️ TL;DR

The scanner was already live + working from the overnight run; this session **verified it's real, pushed today's data through it, wired the next connector, and added the "aliveness" the panel asked for.** The demo is ready to show now; two upgrades are one Bill-tap from live.

- ✅ **W8 (cluster integrity) — verified done** (not redone).
- ✅ **Ran a real scan today** on a fresh `dental-practices` vertical → 429 real signals, 5 grounded opportunities, every claim clickable.
- ✅ **Exa connector coded + tested + PR'd** (`why_now` upgrade rides along).
- ✅ **dental-practices registered on the board** — the one vertical where the per-candidate evidence drawer fully resolves.
- ⚠️ **4 taps for Bill** (3 free credentials + 1 merge-to-deploy) — exact steps below. None block the core demo.

### 👉 THE ONE NEXT ACTION (Bill)
**Merge draft PR #8** → it auto-deploys the `why_now`/`riskiest_assumption` fields + the Exa adapter. Then I re-run the dental roadmap to light up the new fields. _(Everything else in the demo already works without this.)_

---

## 🎬 What Eric sees in the demo (working, live, today)
On `/signal`, pick **Dental practices** (or type any vertical and hit "Run a free live scan"):
- a **live stepper** — Collecting → Clustering → Drafting — with **per-source post counts** as each adapter lands (HN 54 · Claude web 22 · Perplexity 15 · Firecrawl 566…);
- **ranked opportunities**, each with motion (Build / Pre-sell / Partner), effort, problem, what-to-build, why-it-pays;
- a **"Backed by N public complaints"** live count (no fabricated numbers — queried live);
- an **Evidence drawer of REAL, clickable source URLs**.

**Today's dental scan output (real, from the live engine):**
> _Market read: "The dental market is suffering from 'incumbent fatigue.'"_
> 1. **Rx-Guardian** — auto-recovery for the e-Prescribe 2FA lockout that blocks prescribing for weeks _(build · S · conf 95)_
> 2. **FlowPanel** — one-click scheduler overlay on legacy PMS _(pre-sell · M · 88)_
> 3. **Universal Claim Bridge** — kills manual claim re-entry for non-integrated carriers _(build · M · 82)_
> 4. **OpenPractice License Manager** — tames per-workstation "penalty" fees _(partner · L · 75)_
> 5. **SyncShield Performance Layer** — fixes multi-location sync lag/crashes _(pre-sell · L · 70)_

Live data: **429** real signals · **429** distinct source URLs · **0** synthetic · **5/5** opportunities trace to evidence.

---

## ✅ Done this session (verified against the live system)

**W8 — cluster_id integrity — VERIFIED DONE (not redone).**
- 0/61 open candidates missing `cluster_id`; the `signal_raw.cluster_id` writeback (signal-process L145–152) is deployed and **fires on fresh scans** — today's dental scan linked the cluster member rows (5/5 candidates fully traceable). Legacy pre-fix rows stay NULL by design (their mapping was never stored; documented as unrecoverable) and still carry vertical-level evidence.

**Real scan — DONE.** Full multi-source pipeline (collect → process → roadmap) on `dental-practices`, persisted to prod. Today's data, end-to-end, with full evidence linkage.

**Exa connector — DONE (code).** New `{name,isConfigured,collect}` adapter in `signal-collect` calling the Exa REST `/search` API (neural + full-text). Validated the query shape live first (sub-agent). Held on the public lite tier so it can't run up a bill. **Suite 28 green.** → **draft PR #8**.

**`why_now` + `riskiest_assumption` — DONE (code).** Every opportunity now states why it's urgent *now* and the one assumption the evidence doesn't yet prove (the panel's #3 ask). No migration. In PR #8. _Goes live on merge._

**Board registration — DONE.** `dental-practices` added to `signal_verticals` (enabled=false → on the board, off the nightly cron / no recurring cost).

---

## ⚠️ Blocked on Bill — 4 taps, each one action

| # | Tap | Steps |
|---|---|---|
| 1 | **Merge PR #8** (the deploy) | Merge the draft PR → Lovable auto-deploys the updated edge functions. Lights up `why_now`/`riskiest_assumption` + the Exa adapter. |
| 2 | **Exa key** (free, 1k/mo) | exa.ai → sign in → API Keys → copy. Supabase → project `brpqtaaknxdqkjvzfvlo` → Edge Functions → Secrets → add `EXA_API_KEY`. Adapter auto-joins the mesh next scan. |
| 3 | **Reddit keys** (free) | Per `docs/REDDIT_KEYS_WALKTHROUGH.md`. Add `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` to Supabase secrets. (Reddit *pages* already show via web search meanwhile.) |
| 4 | **Apollo** (paid) | **Do not act** — paid signup + a fit call. Flagged to Cowork (below). |

---

## → Cowork lanes (kept clear)

- **Lovable UI polish** (frontend = Lovable's surface): surface the new `why_now` / `riskiest_assumption` on each opportunity card, add the "Exa" source label, and adopt the sharper scanner copy. **Ready-to-paste brief in the appendix below** — drafted, just needs a Lovable run. _(Note: the site is published; the prior run's browser couldn't reach the preview from this env, so I left the published-site edit to a deliberate Cowork/Bill run rather than spend credits unprompted.)_
- **Apollo connector** — fit + paid-signup recommendation (business call, not code).
- **Hero headline** — live hero still reads _"AI that reads your email and phone…"_; CTA is already realigned (opportunity scan primary). Headline rewrite is Bill's creative call.

---

## 📋 Sequence (task plan, with state)

| # | Step | State |
|---|---|---|
| 1 | Verify **W8** + **W6** | W8 ✅ verified done. W6 (candidate→simulator deepen fn) ⏸️ **deferred on purpose** — invisible plumbing; the *visible* dogfood ("Sketch this idea" → /simulate) already ships and works. Building the heavy version doesn't move the Eric demo. Available on request. |
| 2 | Scanner **visibly cool** | ✅ Base already meets the bar (live per-source steps, real-URL evidence drawer, ranked opps, no fake numbers). 🔼 `why_now`/`riskiest_assumption` added (deploy-gated) + UI surfacing → Cowork brief. |
| 3 | Wire **top-3 connectors** | Exa ✅ coded/tested/PR'd (+ key → Bill). Reddit → Bill keys. Apollo → Cowork. |
| 4 | **Real scan** on one vertical | ✅ dental-practices, today's data, on the board. |
| 5 | **Sub-agents** | ✅ Exa query-shape validation + scanner copy (copy used in the appendix brief). |

---

## 🔐 Gates honored
No paid signups (Apollo flagged only). Nothing sent to Eric. No credentials entered for Bill (all flagged with exact steps). The scan + board row are additive and reversible (`DELETE WHERE product_tag='dental-practices'`). Did not self-merge / publish — that's Bill's tap.

---

## 🗒️ Log
- **2026-06-25** — Read overnight package + coordination + workspace map + checkpoints. Verified live DB (overrides stale docs); confirmed W8 done. Ran full real scan on `dental-practices` (429 signals → 5 opportunities, traceable). Coded + tested Exa adapter and `why_now`/`riskiest_assumption`; pushed → **draft PR #8**. Registered dental on the board. Subscribed to PR #8; armed an hourly check-in. Wrote/updated this file. **Next: Bill merges PR #8.**

---

## 📎 Appendix — ready-to-paste Lovable brief (→ Cowork)

> Surface the two new opportunity fields and tidy the scanner. Backend already emits them after PR #8 deploys.
>
> **OpportunityScan.tsx + SignalBoard.tsx — opportunity cards:**
> - Add two lines to each opportunity card, below "Why it pays":
>   - **Why now** → `opportunity.why_now`
>   - **Riskiest assumption** → `opportunity.riskiest_assumption` (style as an honest caveat, e.g. muted text with a small warning glyph).
>   - Both optional/back-compat — render only if present.
> - In `SOURCE_LABELS`, add `exa: "Exa"`.
>
> **Sharper copy (from the copy pass):**
> - Eyebrow: `LIVE SIGNAL SCANNER` · Headline: `Type an industry. Watch us find what's broken in it.` · Subhead: `Real gripes from Reddit, Hacker News, and review sites — clustered into themes and ranked as opportunities you can act on.`
> - Stepper running labels: `Reading public complaints…` → `Grouping the recurring pain…` → `Scoring the openings…`
> - Thin-result state title: `Quiet vertical.` body: `A free scan only skims the surface… run a deeper scan to dig past the front page.`
> - Frame line for the pitch: _"In ten seconds we went from a plain industry name to ranked product ideas, each backed by real complaints you can click through to — the gap between a hunch and a receipt, closed live."_
