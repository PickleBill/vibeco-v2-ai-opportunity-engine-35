# NiceAce + Signal Mine + Pulse — Roadmap & Operating Guide

Single source of truth for a non-engineer: **what's built, how to see it, how to get
real data, and where we're going.** Pairs with the preview hub (`aces/preview/index.html`).

---

## 1. How to view everything (multiple options — at least one always works)

The previews are plain HTML served from the public `vibeco` repo. If one link is slow or
404s (CDN cold-cache), try the next.

**A. Commit-pinned CDN (most reliable — no cold-cache 404s).** Replace `<SHA>` with the
latest `main` commit hash (shown in the chat, or github.com/PickleBill/vibeco/commits/main):
- Hub: `https://rawcdn.githack.com/PickleBill/vibeco/<SHA>/aces/preview/index.html`
- NiceAce app: `https://rawcdn.githack.com/PickleBill/vibeco/<SHA>/aces/prototype/niceace-prototype.html`
- Signal report: `https://rawcdn.githack.com/PickleBill/vibeco/<SHA>/aces/preview/signal-sample-report.html`

**B. Branch CDN (auto-latest, may cold-cache once — refresh):**
`https://raw.githack.com/PickleBill/vibeco/main/aces/preview/index.html`

**C. htmlpreview (GitHub's own renderer):**
`https://htmlpreview.github.io/?https://github.com/PickleBill/vibeco/blob/main/aces/prototype/niceace-prototype.html`

**D. Local files** — the `.html` files are attached in chat; open in any browser. Always works.

**E. Permanent github.io URL (one-time setup):** repo **Settings → Pages → Source =
"GitHub Actions"**, then run the "Deploy preview to GitHub Pages" workflow (Actions tab →
Run workflow, or ask Claude). Publishes to `https://picklebill.github.io/vibeco/`.
*(Auto-enable from CI is blocked by the repo's token permissions, hence the one toggle.)*

---

## 2. Status — what's live vs. coming

| Item | State | Where |
|---|---|---|
| NiceAce prototype (QR jackpot, 5-view flow) | ✅ Interactive | preview hub → NiceAce app |
| Signal Mine v1 (collect → classify → cluster → synthesize) | ✅ Deployed | VibeCo app `/signal` |
| Pulse P1 (durable themes + trend sparklines) | ✅ Deployed | `/signal` + report §3 |
| Signal Mine sample report | ✅ Rendered | preview hub → scan report |
| Testing harness (report generator) | ✅ Working | `tools/signal-harness/` |
| **Automatic daily scans (cron)** | 🟡 Best-effort | migration `20260605020000` |
| Pulse P2 (opportunity scoring: RICE + strategy-fit) | 🔜 Next | — |
| Close-the-loop (Promote → auto-PR) | 🔜 Planned | — |

---

## 3. How to get ACTUAL scan data (the priority)

Two paths — both now in place:

### Path 1 — Manual (instant, fully reliable)
1. Open the VibeCo app's **`/signal`** page.
2. Click **Run scan**. It mines live public discussions **via Firecrawl** (which scrapes the
   real web with proxy rotation, bypassing the datacenter-IP blocks that broke direct Reddit
   /App-Store fetches), classifies, clusters, synthesizes candidates, and saves durable
   themes. Toasts show progress.
3. Reload anytime — persisted themes/candidates load automatically; trends build each run.

> **Why Firecrawl?** Reddit's public search JSON returns `403` and Apple's review RSS returns
> empty when called from datacenter IPs (Supabase edge functions). Firecrawl is the
> live-data engine that makes scans actually return real signal. It's linked as a workspace
> connector, exposing `FIRECRAWL_API_KEY` to the edge functions.

### Path 2 — Automatic daily (no clicks)
Migration `20260605020000_signal_mine_cron.sql` schedules the scan server-side via
`pg_cron` + `pg_net`: **collect 13:00 UTC, process 13:15 UTC, daily.** It uses the public
publishable key and is wrapped so it can never break the deploy. Real candidates + themes
accumulate on their own; trend sparklines become meaningful after 2+ days.

- **Change the time / disable:** run in the SQL editor
  `select cron.unschedule('signal-collect-daily'); select cron.unschedule('signal-process-daily');`
- **Verify it's scheduled:** `select jobname, schedule from cron.job;`
- **See runs:** `select * from cron.job_run_details order by start_time desc limit 10;`

### Requirements for live data (already true for the VibeCo project)
- `FIRECRAWL_API_KEY` set → live collection (Firecrawl connector linked to the project).
- `LOVABLE_API_KEY` set (your other AI features use it) → powers classify/cluster/synthesize.
- `SUPABASE_SERVICE_ROLE_KEY` → auto-injected by Supabase into edge functions.
- The migration + functions deployed by Lovable from `main`.

### Tuning the sources
Defaults search golf-betting / hole-in-one / scoring-app pain terms scoped to `reddit.com`.
To change, pass `queries` (search phrases), `sites` (domains to scope to, e.g.
`["reddit.com","apps.apple.com"]`), and `limit` (results per query) to `signal-collect`, or
tell Claude your target competitor forums, subreddits, or review pages.

---

## 4. Testing harness — deep dive

**Goal:** every feature ships with a one-click, non-technical artifact that shows real(istic)
output. Sample mode always works offline; live mode renders real data. Same renderer.

### Files
```
tools/signal-harness/
  generate-report.mjs        # zero-dependency Node renderer: scan JSON -> HTML report
  fixtures/niceace-scan.json # representative input (sample mode)
  README.md                  # usage
aces/preview/signal-sample-report.html   # the generated report (committed, shareable)
```

### Run it
```sh
node tools/signal-harness/generate-report.mjs \
  --in tools/signal-harness/fixtures/niceace-scan.json \
  --out aces/preview/signal-sample-report.html
```

### Live mode (real data → same report)
```sh
curl -s -X POST "https://ulgoahsxkrkzoquvntei.supabase.co/functions/v1/signal-process" \
  -H "Authorization: Bearer <ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"product":"niceace","persist":true}' > /tmp/scan.json
# add a small "meta" block (product/date/sources), then:
node tools/signal-harness/generate-report.mjs --in /tmp/scan.json --out report.html
```

### What the report shows (5 sections)
1. **What we ran** — classification breakdown of everything collected.
2. **Raw signal** — a sample of the actual posts/reviews + their labels.
3. **Themes & trends** — durable themes with pain score + rising/falling sparkline (Pulse P1).
4. **Feature candidates** — problem, proposed feature, quotes, pain×confidence, effort.
5. **Suggested roadmap** — auto-bucketed Now / Next / Later (priority = pain × confidence ÷ effort).

### Input contract (matches `signal-process` output + a `meta` block)
`meta`, `counts`, `classification_breakdown[]`, `raw_samples[]`, `themes[]` (with
`score_history`), `candidates[]`. Full shape in `tools/signal-harness/README.md`.

### Extending to other features
Copy the pattern: a `fixtures/<case>.json` + a small renderer that emits a self-contained
HTML report. Roadmap for the harness itself is in `docs/TESTING_HARNESS_PLAN.md`.

---

## 5. Insights & constraints (what we learned building this)

- **Reddit/App-Store block datacenter IPs.** Direct fetches from the edge functions got
  Reddit `403` and empty App-Store RSS. **Solved with Firecrawl** (proxy-rotating web
  scraper, linked as a workspace connector) — live scans now return real signal. The Claude
  build sandbox still has no outbound network, so verification of live scans runs from the
  Lovable session / deployed infra (manual button or the cron), not from Claude's sandbox.
- **The session is scoped to the `vibeco` repo only.** Even though `aces-only` is public,
  this session can't push to it (the repo-add tool isn't available here). Previews therefore
  live on `vibeco` and are shared via githack.
- **GitHub Pages can't be auto-enabled** by the repo's CI token (`Resource not accessible by
  integration`) — it needs one manual Settings toggle. githack covers viewing in the meantime.
- **Deployment is via Lovable from git**, not the Supabase MCP (which is connected to a
  different Supabase account that can't see this project). So: merge to `main` → Lovable
  applies migrations + deploys functions. Every feature here shipped that way.
- **Architecture win:** Signal Mine reused the existing agent mesh (`llm-client`,
  `model-router`, the `_shared/agents` pattern) and pgvector convention — it's *extending* a
  working system, not bolting on a new one. Same for Pulse (themes) and the cron.
- **Compliance posture:** collection uses public, no-key, ToS-friendly endpoints (Reddit
  search JSON, App-Store RSS), hashes author handles, de-dupes on URL, and the agent
  paraphrases quotes rather than reposting them.

---

## 6. Phased roadmap

### NiceAce (Prong 1)
- ✅ Faithful prototype of the QR jackpot (Arrive→Pay→Celebrate→Live→Ace win).
- 🔜 Port to the production React/shadcn app; wire payments + ace-verification seams.
- 🔜 B2B course-contest onboarding; reinsured-pot integration (see `docs/NICEACE_PRD.md`).

### Signal Mine → Pulse (the sentiment → roadmap engine)
- ✅ **v1** collect/classify/cluster/synthesize + Signal Board `/signal`.
- ✅ **P1** durable themes + trend memory.
- 🟡 **Auto-scans** (cron) — shipped best-effort; confirm running via `cron.job_run_details`.
- 🔜 **P2** opportunity scoring (RICE + strategy-fit), with scoring-math in the harness report.
- 🔜 **P3** `/pulse` CPO cockpit: multi-product Now/Next/Later roadmap with provenance.
- 🔜 **P4** owned sources (support tickets, NPS, churn) — highest-signal, zero ToS risk.
- 🔜 **P5** close the loop: Promote a candidate → `refine-prompt` → Claude Code opens a PR.

### Testing harness
- ✅ **P0** Signal Mine report generator (sample mode).
- 🔜 **P1** live-mode one-command wiring.
- 🔜 per-feature harnesses (Pulse P2 scoring panel, NiceAce flow walkthrough).

Full strategy: `docs/PRODUCT_STRATEGY.md`, `docs/SENTIMENT_TO_ROADMAP.md`,
`docs/SOCIAL_LISTENING_PRD.md`, `docs/NICEACE_PRD.md`, `docs/TESTING_HARNESS_PLAN.md`.
