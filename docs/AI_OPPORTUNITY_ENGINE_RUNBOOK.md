# AI Opportunity Engine — Operations Runbook

How the Signal Board (`/signal`) goes from sample to **live, self-refreshing,
locked-down**, and the one human-in-the-loop step only Bill can do (set
secrets). Project: Supabase `brpqtaaknxdqkjvzfvlo`.

## What's wired (this PR)

- **Two complementary collection paths** (kept both, by design):
  - **Server-side (primary, scheduled):** `signal-collect` pulls the **official
    Reddit API** (app-only OAuth, read-only) for each enabled vertical's
    subreddits/keywords → `signal_raw`; `signal-process` classifies → clusters →
    synthesizes via the Lovable AI Gateway → `signal_clusters` / `signal_themes`
    / `feature_candidates`. Runs **nightly via pg_cron** (collect 13:00 UTC,
    process 13:15 UTC), iterating every enabled row in `signal_verticals`. No
    laptop.
  - **External bridge:** the `brickhouse-v1` scanner → `POST ingest-signal`
    (bearer). Unchanged; the `social-signal-scan/v1` contract is stable.
- **Security (project is PUBLIC):** RLS locked down — anon can **read** the
  board, cannot write. All ingestion is service-role (bypasses RLS).
  Promote/Dismiss and Run scan are **owner-only** (admin). `ingest-signal` stays
  bearer-protected.
- **Honest states:** no more silent sample fallback. A configured-but-unscanned
  vertical shows a real "no live data yet" CTA; a "last ingest" health badge
  shows scan freshness.
- **AI over real rows:** `opportunity-roadmap` drafts a build-or-sell roadmap
  (what to build, who to sell to, motion, effort, directional ROI) over the live
  clusters and re-ranks the scanner's automation candidates.
- **Multi-vertical:** owner adds a vertical (subreddits/keywords) from the board
  `+` dialog → `signal_verticals` → picked up by the nightly cron automatically.

## What Bill provides (the only manual step)

Set these as **Supabase secrets** (Project Settings → Edge Functions → Secrets).
**Server-side only — never paste secrets into chat or client code.**

| Secret | Needed for | Notes |
|---|---|---|
| `REDDIT_CLIENT_ID` | Server-side Reddit collection | Create a **"script"** app at https://www.reddit.com/prefs/apps |
| `REDDIT_CLIENT_SECRET` | ″ | from the same app |
| `REDDIT_USER_AGENT` | ″ | e.g. `vibeco-signal-mine/1.0 by u/<you>` (optional; a default is used) |
| `INGEST_TOKEN` | External scanner → `ingest-signal` | Already expected; confirm it's set. Put the **same** value in the scanner's `.env`. |
| `ANTHROPIC_API_KEY` | Sharper clustering in the external scanner (optional) | Without it the scanner uses a deterministic fallback; the AI Gateway still synthesizes server-side. |
| `LOVABLE_API_KEY` | AI Gateway (already set) | Used by signal-process + opportunity-roadmap. No new keys. |

The first vertical is seeded to **Wholesale distribution / 3PL** (freight-adjacent,
per the charter — also serves the Eric conversation). Change it from the board
`+` dialog or edit the `signal_verticals` row.

## Flip `/signal` to LIVE (pick one)

**Path A — server-side (no laptop):**
1. Set `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` (above).
2. Sign in as the owner (admin) and click **Run scan** on the seeded vertical —
   or just wait for tonight's cron. Either populates `feature_candidates` and the
   board flips to **LIVE**.
3. Click **Draft roadmap** to run the AI over the live rows.

**Path B — external scanner (sharper Claude clustering):**
1. Confirm `INGEST_TOKEN` is set; mirror it into `brickhouse-v1/scanner/.env`
   along with Reddit creds and `INGEST_URL=https://brpqtaaknxdqkjvzfvlo.supabase.co/functions/v1/ingest-signal`.
2. `cd scanner && pip install -r requirements.txt && python scanner.py --config config.yaml`.
3. Rows land via `ingest-signal`; the board flips to LIVE for that vertical.

## Verifying

- Public visitor: can view the board, **cannot** Promote/Dismiss/Run scan, and a
  raw `POST .../ingest-signal` without the token returns **401**.
- A scheduled run repopulates with zero manual steps (check `cron.job` for
  `signal-collect-daily` / `signal-process-daily`).
- Reddit rate-limit/API error → source marked **degraded**, last good data kept.
- Empty results → explicit empty state, never a silent sample fallback.

## Notes / guardrails

- `signal-collect` / `signal-process` / `opportunity-roadmap` are
  `verify_jwt = false` (cron-/owner-triggered; service-role internally). They are
  callable like the existing public board already allowed; the data is protected
  by RLS, not by gating these triggers.
- Rotating `INGEST_TOKEN` or publishing the public site is **not** done here —
  ask Bill first (per the engagement guardrails).
