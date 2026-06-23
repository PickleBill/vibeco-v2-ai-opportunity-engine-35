# Make the Signal Mine push functional + secure

## The situation

Claude's GitHub push brought in the `/signal` page and two edge functions (already deployed), but the **database tables were never created** in your live backend — pushing `.sql` files doesn't run them. The board works in sample mode but "Run scan" fails. Claude's migrations also lack required `GRANT`s and use insecure public-write policies (the source of your security warnings).

## What I'll do

### 1. Run a single corrected migration
Create the four tables the pipeline needs — `signal_raw`, `signal_clusters`, `feature_candidates`, `signal_themes` (plus the `match_signal_raw` vector function) — fixing the two flaws in Claude's versions:

- **Add `GRANT`s** so the app can actually read the data:
  - `GRANT SELECT` to `anon` + `authenticated` (the board is public read).
  - `GRANT ALL` to `service_role` (the edge functions write here).
- **Tighten RLS** to kill the security warnings:
  - Keep public **read** (`SELECT USING (true)` — scanner treats this as intentional).
  - Remove the `FOR ALL USING (true)` **write** policies. Writes happen only from the edge functions via `service_role`, which bypasses RLS — so no public write access is needed.

This keeps the exact same migration filenames/intent Claude authored, just corrected, so your GitHub history stays coherent.

### 2. Verify the edge functions are live and reachable
Call `signal-collect` and `signal-process` directly (read-only first) to confirm they're deployed and the table wiring works end to end. Claude couldn't do this from its sandbox (network-restricted); I can.

### 3. Re-run the security scan
Confirm the 3 "RLS Policy Always True" warnings are gone after the tightened policies. The remaining `has_role` SECURITY DEFINER finding is the standard role-check pattern (authenticated users must be able to call it) — I'll confirm it's the accepted-risk one already documented, not a new issue.

### 4. Confirm the promote/dismiss behavior
The board's "Promote / Dismiss" buttons try to write `feature_candidates.status` directly from the browser. With public writes removed, that write won't persist (it's already wrapped in a silent try/catch, so nothing breaks visually). I'll flag this and, if you want persistence, wire it through a tiny authenticated path or an edge function in a follow-up — not in this pass.

## How you'll test it (once I'm done)

1. **Preview first** (no publish needed): open the Preview, add `/signal` to the URL. You'll see the Trending themes strip + sample candidates.
2. **Run scan:** click **Run scan** (top right). Watch for toasts: "Collected N items" → "Scan complete — N candidates." The board repopulates with real mined data.
3. **Trend memory:** run the scan again later (hours/days apart). Recurring themes show a ▲/▼ arrow + sparkline + "seen N×". One scan = snapshot; repeat scans = trend.
4. **If a scan errors:** you get a red toast with the reason and the board falls back to sample data — paste me the message and I'll debug.
5. **Publish:** once it looks right in Preview, click **Publish → Update** so `/signal` is live on `vibeco.lovable.app`.

## Notes on your recurring "is it actually pushed?" question

- **Backend** (edge functions, DB logic): deploys **automatically** on sync — no publish button.
- **Database migrations**: must be **run explicitly** (what I'm doing in step 1) — they do *not* run from a GitHub push.
- **Frontend** (pages, UI): needs **Publish → Update** to reach your live URL; works in Preview instantly.

## Technical detail

- One migration, idempotent (`CREATE TABLE IF NOT EXISTS`), safe to run over the partially-synced state.
- Grants: `anon`/`authenticated` = SELECT only; `service_role` = ALL.
- Policies: one `SELECT USING (true)` per table; no permissive write policies.
- `vector` extension + `ivfflat` index + `match_signal_raw()` preserved from Claude's migration.
- `signal-collect` needs `SUPABASE_SERVICE_ROLE_KEY` (auto-provided) to persist; `signal-process` uses `LOVABLE_API_KEY` (already set) for the agent mesh.

## What I will NOT touch
The simulator loop, dashboard, auth, or any of the Sprint 9 work — this is scoped strictly to making the freshly-pushed Signal Mine feature functional and secure.