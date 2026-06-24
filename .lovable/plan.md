# Living roadmap — VibeCo v1 + VibeCo Labs (v2.1)

> Single source of truth for both Lovable agent (frontend) and Claude Code
> (backend). Update whenever a phase ships or scope changes. Both sides grep
> this before starting work.

## Two-project model (approved this turn)

- **v1 (this repo, `conviction-to-code.lovable.app`)** — publishable front door.
  Home → Signal → Sketchpad → Portfolio. Lightweight.
- **v2.1 (VibeCo Labs)** — engine + Hub + Connectors + Decisions + MCP workbench.
- **Seam**: shared `org_decisions` / `connector_registry` / `signal_*` tables via MCP,
  governed by root-level `CONNECTOR_CONTRACT.md` + `WORKSPACE_MAP.md`.
- **Reuse direction**: UX patterns flow v1 → v2.1 (lighter wins). Backend
  resilience flows v2.1 → v1 (harder wins).
- **Revisit collapse** only after v1 publishes and v2.1 Hub stabilizes (~60 days).

## Coordination rule

Lovable agent owns `src/**`, `docs/**`, `mem://**`, `.lovable/**`, root contract docs.
Claude Code owns `supabase/functions/**` and `supabase/migrations/**`.
Either side touching the other's surface must announce it here first.

## Phase index

| # | Phase | Owner | Status |
|---|---|---|---|
| 0 | Adapter layer + workspace connectors (Firecrawl, Perplexity, Anthropic) | Lovable | DONE |
| 1 | Global IA + Nav + Footer (Signal + Sketchpad surfaced) | Lovable | DONE |
| 2 | Active-vertical context (`useActiveVertical` hook) | Lovable | DONE |
| 3 | `/signal` search + LIVE/SAMPLE badge | Lovable | DONE |
| 4 | Home scan → Signal handoff (link-level) | Lovable | DONE |
| 5 | Copy deck refresh (AI Opportunity Engine framing) | Lovable | DONE |
| 6 | `/simulate` fold-in as "Idea-stage sketchpad" + cross-links | Lovable | DONE |
| 7 | Auto-grader + refine loop | Lovable + Claude | **DEFERRED to post-publish — "get it to shippable" first** |
| 8 | Publish-readiness pass — design tokens audit, 375px mobile pass, empty states, copy polish, SEO verify, console-error sweep, + root contract docs (`CONNECTOR_CONTRACT.md`, `WORKSPACE_MAP.md`) | Lovable | **NEXT** |
| 9 | Sketchpad → Proofs evolution (promote a sketch to a Proofs card; no new backend) | Lovable | QUEUED |
| 10 | Publish to `conviction-to-code.lovable.app` | Lovable | QUEUED |
| 11 | Port v1 patterns back to v2.1 (small PR: `useActiveVertical`, SignalBoard search, sketchpad reframe, plan.md shape) | Bill drives, Lovable drafts | QUEUED |
| 12 | **Visual design rework** — Impeccable skills + cold-design inspiration across both projects | Lovable | POST-PUBLISH |
| B1 | Backfill `opportunity_roadmaps` from unprocessed `signal_raw` rows | Claude Code | IN FLIGHT |
| B2 | Reddit secrets (`REDDIT_CLIENT_ID/SECRET`) | Bill | TODO |
| B3 | v2.1 PR #2 — LLM client hardening + idempotent `signal-process` | Bill / Claude | **MERGED** |

## Workspace connectors

- Active: Firecrawl (pickle), Perplexity, Anthropic — sufficient for v1 publish.
- Linear / Notion: **SKIP for now** (revisit after publish).
- Telemetry (Sentry, PostHog, Amplitude): defer until after publish.

## Skills

No new skills authored yet. Built-ins (`learn`, `go`, `skill-creator`, Impeccable suite)
cover today's needs. Author a new skill only when both projects start repeating
the same non-obvious procedure (e.g. "publish-readiness audit").

## Current data state (last verified)

- `signal_raw`: 846 rows
- `signal_themes`: 4 rows
- `feature_candidates`: 4 rows (all `wholesale-distribution-3pl`)
- `opportunity_roadmaps`: backfilling under B1
- `signal_verticals`: 1 enabled (`wholesale-distribution-3pl`, 7d lookback)

## Active adapters (in `signal-collect`)

| Adapter | Status |
|---|---|
| hackernews | active (keyless) |
| ai_gateway_scout | active |
| firecrawl (pickle) | active |
| perplexity_sonar | active |
| anthropic_web_search | active (`claude-sonnet-4-5`) |
| reddit | dormant — needs B2 |

## Reuse principles (apply to every new prompt, both projects)

1. Reuse the adapter shape (`{ name, isConfigured, collect }`), `_shared/llm-client`, `_shared/model-router`, `signal_raw` schema.
2. Frontend: reuse `Navbar`, `Footer`, `FadeIn`, `Card`, `Badge`, shadcn primitives, `DiscoveryAuditProvider`, semantic tokens. Don't fork.
3. Cross-link surfaces instead of duplicating them (`/signal` ↔ `/simulate` ↔ Home scan).
4. Real data only — SAMPLE badge required when illustrative.
5. New surfaces follow `mem://patterns/prompt-component-reuse`.

## Out of scope (guardrails)

- Homepage hero core narrative, discovery-audit modal, `/briefing`, `ProofShowcase`.
- v1 ↔ v2.1 monorepo collapse (revisit in ~60 days).
- `src/integrations/supabase/client.ts`, `types.ts`, `.env`.
- VibeCo Labs project files (separate project; workspace connectors + contract docs are the only shared surface).

## TL;DR strategic rationale

Merging v1 + v2.1 now means migrating two Supabase projects, RLS, and the MCP
schema before publishing — multi-day, high risk, blocks the publish. Keeping
two repos with a shared contract is faster to ship, mitigates drift via the
shared tables, and preserves the lighter "front door" vs heavier "workbench"
separation. Phase 12 reconsiders collapse only after v1 is live.
