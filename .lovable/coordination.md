# Coordination — multi-agent push on VibeCo

> Single page Bill copies into Claude Code, Codex, or any other agent surface
> to keep us all rowing the same direction. Update whenever a workstream is
> taken, finished, or shifted.

## The product, in one sentence

VibeCo's **Signal Board** mines real public pain in a vertical and turns it into
ranked, evidence-backed feature candidates. Every claim on the page links to a
real source URL. That's the proof-of-life. Everything else (Sketchpad, Portfolio,
home opportunity scan) supports it.

## Who owns what

| Surface | Owner | Repo |
|---|---|---|
| `src/**`, root docs, this file | **Lovable agent** (Bill drives) | `conviction-to-code` (v1) |
| `supabase/functions/**`, `supabase/migrations/**` | **Claude Code** | VibeCo Labs (v2.1) — see `WORKSPACE_MAP.md` |
| Copy/jargon audits, prompt rewrites, design briefs | **Codex** or any fast model | (no repo — output pasted back) |
| Long-running research (e.g. "what are 10 more good signal sources") | **Claude.ai with web** | (no repo) |

**Rule**: touching the other side's surface? Announce it here first with a 1-line entry.

## Live workstreams

| # | Workstream | Who | State | Notes |
|---|---|---|---|---|
| W1 | Signal Board rewrite (jargon kill, evidence drawer, sticky filters, live scan stepper) | Lovable | **DONE this turn** | Uses existing `signal_raw.cluster_id` linkage. No backend changes. |
| W2 | Home page de-jargon: kill "Book a discovery audit" CTAs on hero scan + nav, replace with "Open Signal" | Lovable | **DONE this turn** | Audit CTA still lives at `/briefing` for the right audience. |
| W3 | StatsBar pulls live counts from `signal_raw`/`feature_candidates`/`signal_themes` instead of invented numbers | Lovable | **DONE this turn** | Falls back to last-known counts if query fails. |
| W4 | Reddit API credentials (`REDDIT_CLIENT_ID/SECRET`) — unblocks first-party Reddit adapter | Bill | **BLOCKED** — see `docs/REDDIT_KEYS_WALKTHROUGH.md` | Walkthrough now exists. Bill: try it once, screenshot where it breaks. |
| W5 | New signal sources backlog (Twitter/X, TikTok comments, Indie Hackers, ProductHunt, Stack Exchange, YouTube comments, GitHub issues, BetaList, Discourse) | Claude Code | **OPEN** — see `docs/SIGNAL_SOURCES_BACKLOG.md` | Pick 2-3 highest-ROI adapters, implement as `{ name, isConfigured, collect }` modules. |
| W6 | Dogfood loop — run candidates back through v1 Simulator (`simulate-idea` → `persona-perspective`) for a deeper read | Claude Code | **DONE 2026-06-25** | New edge fn `signal-candidate-deepen` (POST `{id, mode?, force?}`): builds a prefill idea from a candidate's `{problem, proposed_solution, evidence}`, runs `simulate-idea` once + `persona-perspective` ×3 (Skeptic/Customer/Builder), persists to new `signal_candidate_simulations` (one current row per candidate), stamps `feature_candidates.deepened_at`. **Additive/non-breaking.** Scope note: built per the spec'd `simulate-idea + 3 personas` — `synthesize` was intentionally left out. |
| W7 | Visual redesign of `/signal` — Phase 12, post-publish | external (Claude Design / Replit / human) | **QUEUED** — see `docs/DESIGN_HANDOFF_PROMPTS.md` | Hand the prompts there to whichever tool. Tokens stay in `src/index.css`. |
| W8 | `cluster_id` integrity check on `feature_candidates` (confirm every open candidate has it populated; backfill if not) | Claude Code | **DONE 2026-06-25** | Verified on `brpqtaaknxdqkjvzfvlo`: `SELECT count(*) FROM feature_candidates WHERE status='open' AND cluster_id IS NULL` → **0** (of 61 open). No backfill needed. (If it ever regresses, backfill via `theme_id` → `signal_themes.title` = `signal_clusters.theme` on matching `product_tag`/`scan_date`.) |
| W9 | Sentry connector for publish day | Bill / Lovable | **QUEUED** | Install on publish, not before. |

## Prompt — for Claude Code (backend / W5, W6, W8)

```
You are Claude Code working on the VibeCo Labs (v2.1) Supabase project. Read
`.lovable/coordination.md` and `WORKSPACE_MAP.md` in the v1 repo first, then
pick ONE of W5, W6, W8 from the live workstreams table.

For W5 (new signal sources): read `docs/SIGNAL_SOURCES_BACKLOG.md`. Pick 2-3
adapters with the best (likely_signal_density × ease_of_access) score that
don't require paid APIs > $25/mo. Implement each as a module in
`supabase/functions/_shared/adapters/{name}.ts` exporting
`{ name, isConfigured, collect(opts) }` matching the existing adapter shape
in `signal-collect/index.ts`. Wire them into the collector. PR them
individually so each can be reverted if it goes sideways.

For W6 (dogfood loop): add a new edge function `signal-candidate-deepen` that
takes a `feature_candidate.id`, builds a prefill prompt from
`{ problem, proposed_solution, evidence }`, calls `simulate-idea` once and
`persona-perspective` once (3 personas: Skeptic, Customer, Builder), and
writes the result to a new `signal_candidate_simulations` table keyed by
`feature_candidate_id`. Surface it as `deepened_at` on the candidate row.

For W8 (cluster_id integrity): query
  SELECT count(*) FROM feature_candidates WHERE status='open' AND cluster_id IS NULL;
If > 0, write a backfill that joins to signal_clusters by theme match.

Report back in `.lovable/coordination.md` with the workstream marked DONE and
any breaking schema notes.
```

## Prompt — for Codex (copy / jargon / prompt rewriting)

```
You are Codex doing a copy + jargon pass on the VibeCo Signal Board surface.
Read `src/pages/SignalBoard.tsx`, `src/components/OpportunityScan.tsx`, and
`src/components/Hero.tsx`.

Rules:
- No undefined jargon. Every metric, label, and motion name must be obvious
  to a non-technical small-business owner. If it isn't, propose a plain-English
  alternative OR add a `<Hint text="...">` tooltip.
- No invented stats. Numbers come from real database queries only.
- "Book a discovery audit" CTA stays only on `/briefing`. Don't reintroduce it
  on the home scan or Signal Board.
- Voice: ruthless clarity, no AI cliches ("unlock", "leverage", "supercharge",
  "harness the power of"). Be direct.

Deliver: a unified diff against the three files. If you find another file
also leaking jargon, flag it but don't edit beyond these three.
```

## Prompt — for Claude.ai (research, e.g. new sources)

```
Research task: rank the following signal sources for usefulness to a
"customer pain mining" engine. For each, give:
  1. Likely signal density (1-5) for 3PL / wholesale-distribution-style B2B
  2. Ease of legitimate access (1-5) — free API > paid API > scraping
  3. Stability (1-5) — will it still work in 6 months?
  4. One specific risk

Candidates: Twitter/X via API v2, TikTok comments via Apify, Indie Hackers
forum, Product Hunt comments, Stack Exchange, YouTube comments, GitHub issues
on relevant repos, BetaList, Discourse-based forums (Meta Discourse,
Hacker News alternatives), Glassdoor pain reviews, Quora answers, Reddit
without API (RSS / old.reddit JSON), App Store / Play Store reviews via
existing Firecrawl. Output a markdown table sorted by (density × access)
descending.
```

## What "done with the rework" looks like

- A first-time visitor on `/signal`:
  - sees a clear question answered ("What X is complaining about right now")
  - can click into any candidate and see real source URLs
  - never sees "build/sell/partner" or "ROI directional"
  - sees the scan run live with per-source steps when "Run scan" is hit
- Home page no longer shows invented stats
- Nav primary CTA goes to Signal, not the audit booker
- Sketchpad nav goes to `/simulate`
- Reddit adapter is unblocked (W4 closed)
- At least 2 new signal sources are live (W5 in progress)

## Decisions log

- **2026-06-24** — Two-project model holds; revisit collapse in ~60 days.
- **2026-06-24** — Audit CTA demoted to `/briefing` only. Signal is the front door.
- **2026-06-24** — Evidence drawer pattern lives in v1 first; ports to v2.1 Hub after publish.
- **2026-06-24** — Dogfood loop (W6) deferred until cluster_id integrity (W8) confirmed.
- **2026-06-25** — W8 confirmed (0 open candidates with NULL `cluster_id`), which unblocked W6. W6 shipped as edge fn `signal-candidate-deepen` (Claude Code, backend-only — no `src/**` touched). **Schema delta (additive, non-breaking):** new table `public.signal_candidate_simulations` (public-read, service-role-write; UNIQUE on `feature_candidate_id`) + new nullable column `public.feature_candidates.deepened_at`. Migration `20260625120000_signal_candidate_simulations.sql`. Not yet applied to prod — applies on the next Lovable deploy. Frontend hook for the board (read `signal_candidate_simulations` by `feature_candidate_id`, show `deepened_at` ✓ + a "Deepen" button POSTing `{id}`) is open for the Lovable agent. A unit test for the pure `buildDeepenIdea`/`quoteLines` helpers (mirroring `src/test/signal-integrity.test.ts`) is recommended but left to the `src/` owner.
