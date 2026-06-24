# Living roadmap — VibeCo + parallel Claude Code backend

> Single source of truth that Lovable agent (frontend) and Claude Code (backend)
> both read. Update this file whenever a phase ships or scope changes. Both
> sides should grep this before starting work.

Last updated: this turn.

## Coordination rule

Lovable agent owns `src/**` (frontend), `docs/**`, `mem://**`, `.lovable/**`.
Claude Code owns `supabase/functions/**` and `supabase/migrations/**`.
Either side touching the other's surface must announce it here first.

## Phase index

| # | Phase | Owner | Status |
|---|---|---|---|
| 0 | Adapter layer + workspace connectors (Firecrawl, Perplexity, Anthropic casing) | Lovable | DONE |
| 1 | Global IA + Nav + Footer (Signal + Sketchpad surfaced) | Lovable | DONE (this turn) |
| 2 | Active-vertical context (`useActiveVertical` hook, localStorage) | Lovable | DONE (this turn) |
| 3 | `/signal` search + LIVE/SAMPLE badge polish | Lovable | DONE (this turn) |
| 4 | Home scan → live Opportunity Engine handoff | Lovable | DONE (this turn, link-level; deeper rewire deferred) |
| 5 | Copy deck refresh (AI Opportunity Engine framing) | Lovable | DONE (this turn, surgical) |
| 6 | `/simulate` fold-in as "Idea-stage sketchpad" + cross-links | Lovable | DONE (this turn) |
| 7 | Auto-grader + refine loop (`grade-prompt` fn + `prompt_grades` table) | Lovable + Claude | HOLD — wait for Claude Code backend close-out |
| 8 | Design tokens audit + 375px pass + verification checklist | Lovable | TODO |
| B1 | Backfill `opportunity_roadmaps` from 766 unprocessed `signal_raw` rows | Claude Code | IN FLIGHT (parallel) |
| B2 | Reddit secrets (`REDDIT_CLIENT_ID/SECRET`) | Bill | TODO |

## Current data state (verified)

- `signal_raw`: 846 rows
- `signal_themes`: 4 rows
- `feature_candidates`: 4 rows (all `wholesale-distribution-3pl`, status=open)
- `opportunity_roadmaps`: 0 rows (B1 will fix)
- `signal_verticals`: 1 enabled (`wholesale-distribution-3pl`, 7d lookback)

## Active adapters (in `signal-collect`)

| Adapter | Status | Notes |
|---|---|---|
| hackernews | active (keyless) | ~250-350 rows/scan on 3PL |
| ai_gateway_scout | active | URL verification kills most candidates; tune later |
| firecrawl (pickle) | active | workspace connector |
| perplexity_sonar | active | workspace connector |
| anthropic_web_search | active | `claude-sonnet-4-5`, casing fixed |
| reddit | dormant | needs B2 |

## Reuse principles (apply to every new prompt)

1. Reuse the adapter shape (`{ name, isConfigured, collect }`), `_shared/llm-client`, `_shared/model-router`, `signal_raw` schema.
2. Frontend: reuse `Navbar`, `Footer`, `FadeIn`, `Card`, `Badge`, shadcn primitives, the `DiscoveryAuditProvider` modal, and existing semantic tokens. Don't fork.
3. Cross-link surfaces instead of duplicating them (`/signal` ↔ `/simulate` ↔ Home scan).
4. Real data only — never fabricate for a configured vertical. SAMPLE badge required when illustrative.
5. New surfaces follow `mem://patterns/prompt-component-reuse` (saved this turn).

## Out of scope (guardrails — do not touch without explicit ask)

- Homepage hero core narrative, discovery-audit modal, `/briefing`, `ProofShowcase`.
- Site publish (`preview_ui--publish`).
- `src/integrations/supabase/client.ts`, `types.ts`, `.env`.
- VibeCo Labs project files (separate project; workspace connectors are the only shared surface).

## Outcomes from this turn

- Nav surfaces Signal Board + Idea Sketchpad on desktop and mobile.
- Footer mirrors the same.
- `useActiveVertical` hook centralizes the active vertical across pages, persisted to `localStorage`.
- `/signal` candidates list has a search filter (theme + problem + quotes).
- Home `OpportunityScan` results now offer a one-click handoff to `/signal` to see the live engine.
- `/simulate` reframed as **Idea-stage sketchpad** with an eyebrow + cross-link back to `/signal`.
- `mem://patterns/prompt-component-reuse` saved so the next prompt inherits the same conventions.
