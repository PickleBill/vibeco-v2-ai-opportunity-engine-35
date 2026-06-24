# Connector contract — v1 ↔ v2.1

The contract both VibeCo projects honor so neither side guesses about table
shapes or write rules. If you change a shape here, update both projects'
migrations in the same PR window and bump the `contract_version` below.

**contract_version:** `1.0.0` (initial — formalized after v2.1 PR #2 merge).

See `WORKSPACE_MAP.md` for which project owns what.

## Principles

1. **Real data only.** No fabricated rows in shared tables. SAMPLE badges
   render in UI when data is illustrative; the row itself is still real or
   absent.
2. **Service-role writes, scoped reads.** Edge functions write with the
   service role. RLS allows reads only to the audience each table needs
   (anon, authenticated, or admin).
3. **Idempotent collectors.** Every scan can re-run without duplicating
   rows. Use `(product_tag, source_url)` or `(product_tag, scan_date)` as
   the natural key.
4. **Append-only audit.** `connector_sync_events` is never updated or
   deleted — only appended. Each scan logs success or failure with the
   row counts it touched.
5. **No cross-project DB writes.** Each project writes its own Supabase.
   Cross-project visibility comes from the MCP server reading both, or from
   a future mirror job — never from one project's edge function reaching
   into the other's database.

## Shared table shapes

### `connector_registry`

Who has which connector wired, in which project. Admin-read only.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `project` | text | `v1` or `v2.1` or another Courtana project slug |
| `connector` | text | `firecrawl`, `perplexity`, `anthropic_web_search`, `hackernews`, `reddit`, `ai_gateway_scout`, `lovable_gateway` |
| `auth_kind` | text | `workspace_connector`, `project_secret`, `keyless`, `byok` |
| `config` | jsonb | non-secret connector config (rate limits, model defaults) |
| `last_seen` | timestamptz | bumped on every successful call |
| `enabled` | boolean | manual kill switch |
| `created_at` / `updated_at` | timestamptz | |

RLS: SELECT to `has_role(auth.uid(),'admin')`; INSERT/UPDATE/DELETE to service_role.

### `connector_sync_events`

Append-only log of every scan/run. Admin-read only.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `project` | text | as above |
| `connector` | text | as above |
| `scan_date` | date | UTC, for idempotency joins |
| `started_at` / `finished_at` | timestamptz | |
| `outcome` | text | `ok`, `partial`, `failed`, `skipped` |
| `rows_collected` | int | raw items pulled |
| `rows_persisted` | int | after dedupe |
| `error` | text | nullable, short message |
| `meta` | jsonb | provider-specific extras |

RLS: SELECT to admins; INSERT to service_role only.

### `org_decisions`

Durable, cross-project decisions Claude saves via MCP so future sessions
don't re-litigate them.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `project` | text | originating project, or `workspace` for cross-cutting |
| `title` | text | one-line summary |
| `body` | text | markdown |
| `tags` | text[] | indexed |
| `embedding` | vector(1536) | for `search_decisions` semantic match |
| `created_by` | text | `claude`, `lovable`, `bill` |
| `created_at` | timestamptz | |

RLS: SELECT to authenticated; INSERT/UPDATE to service_role + admins via MCP.

### Signal Mine tables (`signal_raw`, `signal_themes`, `signal_clusters`, `feature_candidates`, `signal_verticals`, `opportunity_roadmaps`)

Shapes are pinned by the existing migrations in this repo. Both projects
keep these shapes identical. Key invariants:

- `signal_raw.processed` is a claim flag — flip to `true` **before** the mesh
  runs (idempotency guard, landed in v2.1 PR #2). Reset to `false` if the
  mesh fails hard, so the next run retries the row.
- `signal_themes.score_history` is deduped per `scan_date` so the trend
  arrow stays meaningful across re-runs.
- `feature_candidates` rows are addressed by `(theme_id, scan_date)` so a
  re-run replaces, never duplicates.

## Write rules

| Action | Who | How |
|---|---|---|
| Record a new connector wiring | the project that wired it | INSERT into `connector_registry` (service role) |
| Log a scan run | the project running it | INSERT into `connector_sync_events` (service role) |
| Save a cross-project decision | Claude via MCP, or admin via Hub | INSERT into `org_decisions` (service role) |
| Backfill signal data | Claude Code in the owning project | migration + edge function in that repo only |

## Forbidden

- Mutating another project's tables directly.
- Storing secrets in `connector_registry.config` (it's admin-read but still in the DB).
- Updating `connector_sync_events` rows after insert.
- Dropping or renaming a shared column without bumping `contract_version`
  and updating both projects in the same week.

## How to evolve this contract

1. Open a PR in **both** projects that touches this file + the relevant
   migrations.
2. Bump `contract_version` (semver: patch for additive non-breaking, minor
   for additive breaking-with-migration, major for incompatible).
3. Land the v2.1 side first (heavier guarantees), then v1.
4. Announce in both `.lovable/plan.md` files.
