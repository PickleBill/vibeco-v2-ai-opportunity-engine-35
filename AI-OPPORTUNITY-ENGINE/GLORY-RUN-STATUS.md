# 🏁 GLORY-RUN-STATUS — Signal Scanner for Eric

_Single status file. The PM-Orchestrator updates this after every step so Bill sees progress at a glance. Newest state at the top of each section._

**Goal:** a real, cool-looking **Signal Scanner** as the live demo proof point for Eric, alongside the proposal. **Velocity is the pitch.** Optimize for COOL + WORKING over pristine.

**Last updated:** 2026-06-25 (session open) · Orchestrator: Claude Code (remote)

---

## ⏱️ TL;DR (read this first)

The engine is **further along than the brief assumed.** A prior overnight run already shipped a live, evidence-backed Signal Scanner to the published site (`conviction-to-code.lovable.app`). My job this session is to **verify it's real, run today's data through it, make it visibly cooler, and wire the new connectors** — not to rebuild.

- ✅ **W8 (cluster_id integrity) — VERIFIED DONE.** Not redone. Proof below.
- 🔄 **Running a real scan on a fresh vertical** so the demo shows *today's* data.
- 🔄 **Wiring Exa** (I have a live Exa connector) + flagging the keys only Bill can add.
- ⚠️ **3 credential gates need Bill** (Reddit, Exa key, Apollo) — exact steps below.

**THE ONE NEXT ACTION:** Run a real full scan on the `dental-practices` vertical (collect → process → roadmap) and verify real, resolvable evidence URLs + full cluster linkage.

---

## ✅ Done (verified against the live system, not the docs)

### W8 — `cluster_id` integrity — **VERIFIED DONE**
Verified live against Supabase `brpqtaaknxdqkjvzfvlo`, not taken on faith:
- **Candidate side: 0 / 61** open `feature_candidates` are missing `cluster_id` (61/61 linked). The candidate→cluster→theme chain is whole.
- **Source-row writeback: live-proven.** `signal-process` stamps `signal_raw.cluster_id` from each cluster's `source_ids` (code lines 145–152, already deployed). Today's scan row (`scan-pickleball…`, 2026-06-25) is **1/1 linked** — the writeback fires on every new scan.
- **The legacy NULLs are expected, not a regression.** The four 2026-06-24 verticals were collected *before* the fix; their member→row mapping was never persisted, so those rows stay NULL (documented as unrecoverable). They still carry **vertical-level** evidence (real `source_url` by `product_tag`), which the board and scanner both use. A fresh scan (next action) gets *full* per-candidate linkage.

**Verdict:** W8 is real and complete. No rework needed.

---

## 🔄 Running now

- **Real demo scan** on a fresh vertical (`dental-practices`) — collect→process→roadmap, persisted. Gives Eric today's data + a fully cluster-linked vertical for the per-candidate evidence drawer.
- **Exa adapter** — coding the `{name, isConfigured, collect}` adapter into `signal-collect`, validating the query shape against the live Exa connector first (sub-agent).
- **Sub-agents dispatched:** (1) Exa query-shape validation, (2) scanner "how it works" copy.

---

## ⚠️ Blocked on Bill (credential gates — exact steps)

These are the only hard blocks. Each is **one action**. The scanner already works without them (HN + scout + Firecrawl/Anthropic/Perplexity are live) — these *expand* the source mesh.

### 1. Exa API key (free tier, 1k searches/mo) — unblocks the Exa connector
The adapter will be coded + tested. To make it run live, add the secret:
- Go to **exa.ai** → sign in (free) → **API Keys** → copy your key.
- In **Supabase → project `brpqtaaknxdqkjvzfvlo` → Edge Functions → Secrets**, add:
  `EXA_API_KEY = <your key>`
- That's it — the adapter auto-detects the key and joins the mesh on the next scan.

### 2. Reddit app keys (free) — unblocks the first-party Reddit adapter
Adapter already exists; it's dormant only because the keys are absent. Walkthrough: `docs/REDDIT_KEYS_WALKTHROUGH.md`.
- Add to Supabase secrets: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` (and optionally `REDDIT_USER_AGENT`).
- (Real Reddit *pages* already show up via Firecrawl web search, so evidence isn't blocked meanwhile.)

### 3. Apollo (paid) — **decision gate, do not act**
Apollo needs a paid signup + a business call on whether it fits the pitch. **I will not sign up.** → flagged to Cowork for a connector recommendation (see below).

---

## → Cowork lanes (out of my lane, noted so they stay clear)

- **Apollo connector fit + paid-signup recommendation** → Cowork (business call, not a code task).
- **Hero headline rewrite** — the live hero still reads _"AI that reads your email and phone. It handles the rest."_ The CTA is already realigned (opportunity scan primary). The headline is Bill's creative call → Cowork/Bill.
- **Deeper Lovable visual redesign of `/signal`** (post-demo polish) → Cowork/Lovable.

---

## 📋 The sequence (task plan, with state)

| # | Step | State |
|---|---|---|
| 1 | Finish/verify **W8** (cluster integrity) + **W6** (dogfood loop) | **W8 ✅ verified done.** W6 ⏸️ deferred — it's invisible plumbing (a candidate→simulator deepen function); the *visible* dogfood ("Sketch this idea" → /simulate) already ships. Building it doesn't move the Eric demo. Available on request. |
| 2 | Make the Signal Scanner **visibly cool** (live per-source steps, evidence drawer w/ real URLs, ranked opps, no fake numbers) | 🔄 Base is already live + honest. Adding the **`why_now` / `riskiest_assumption`** per opportunity (the "aliveness" upgrade) — backend schema change in my lane + a card tweak. |
| 3 | Wire **top-3 connectors** (Reddit, Exa, Apollo) w/o paid signup | 🔄 Exa adapter being coded + tested. Reddit + Exa keys → Bill (above). Apollo → Cowork. |
| 4 | Run a **real scan** on one vertical (today's data) | 🔄 In progress (`dental-practices`). |
| 5 | **Spawn sub-agents** for parallel work | 🔄 2 dispatched (Exa query test, scanner copy). |

---

## 🔐 Approval gates honored

- **No paid signups.** (Apollo flagged, not actioned.)
- **Nothing sent to Eric.** (Outbound holds for Bill.)
- **No credentials entered on Bill's behalf.** (Reddit/Exa/Apollo keys flagged with exact steps.)
- Running a scan + adding a vertical is additive and fully reversible (`DELETE WHERE product_tag = …`) — the prior run did this autonomously; not a gate.

---

## 🗒️ Log
- **2026-06-25** — Session opened. Read overnight package + coordination + workspace map + run checkpoints. Verified live DB state (overrides stale docs). Confirmed W8 done. Wrote this file. Dispatched sub-agents; started the demo scan.
