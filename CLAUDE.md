# VibeCo — AI-Powered Business Idea Simulator

## What This Is

VibeCo helps non-technical founders go from a plain-English idea to a structured, testable product. Users submit an idea, AI agents analyze it through multiple strategic lenses, and the system produces business briefs, Lovable-ready build prompts, concept images, and multi-perspective critiques.

**Part of the Courtana organization** — a 65+ project ecosystem spanning pickleball tech, business tools, and experiments, all built on Lovable.

## Tech Stack

- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS + shadcn-ui, Framer Motion
- **Backend**: Supabase (PostgreSQL + Edge Functions in Deno)
- **AI**: Multi-model via Lovable Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) + direct Anthropic API fallback
- **Deploy**: Lovable platform (auto-deploys from git)
- **Auth**: Supabase Auth + Lovable cloud auth (Google/Apple OAuth)

## Architecture

### Frontend (`src/`)
- `pages/` — Route components: Index (marketing), Simulate, Report, MySimulations, Portfolio, Auth
- `components/simulator/` — Core simulator workflow: IdeaInput → IdeaBrief → FollowUpQuestions → FinalReport → ActionHub
- `components/simulator/SimulatorShell.tsx` — **The main orchestrator.** Manages 3-round analysis state, calls edge functions, threads context between agents.
- `components/portfolio/` — Project registry dashboard
- `components/ui/` — shadcn-ui primitives
- `integrations/supabase/` — Client init + auto-generated types

### Agent Modules (`supabase/functions/`)

All agents follow the same pattern: receive JSON → construct system prompt → call Lovable Gateway with tool-calling → parse tool_call response → return JSON.

| Function | Purpose | Model | Tool Schema |
|----------|---------|-------|-------------|
| `simulate-idea` | 3-round idea analysis + deep dives | Gemini 3-flash / 2.5-pro | `generate_idea_analysis`, `generate_deep_dive` |
| `persona-perspective` | 5 persona critiques (Skeptic, Champion, Competitor, Customer, Builder) | Gemini 3-flash / 2.5-pro | `generate_perspective` |
| `expand-idea` | 3 orthogonal business variations | Gemini 3-flash / 2.5-pro | `generate_expansions` |
| `distill-idea` | MVP distillation (one feature, one customer, one revenue) | Gemini 3-flash / 2.5-pro | `generate_distillation` |
| `refine-prompt` | Iterative Lovable prompt refinement using Thunderdome feedback | Gemini 3-flash / 2.5-pro | `generate_refined_prompt` |
| `generate-landing-page` | Full HTML landing page generation | Gemini 2.5-flash | None (raw HTML) |
| `generate-idea-image` | Concept art + logo generation | Gemini 3.1-flash-image | None (image modality) |
| `generate-alt-prompt` | Research/design/landing prompts for other AI tools | Gemini 2.5-flash | None (JSON response_format) |
| `probe-models` | Model availability diagnostics across all providers | All models | None (diagnostic) |
| `synthesize` | Cross-agent synthesis (consensus, tensions, confidence) | Claude Sonnet 4 | `generate_synthesis` |
| `orchestrate` | Auto-Thunderdome: 7 agents parallel + synthesis | Multi-model | N/A (orchestrator) |
| `auto-evaluate` | **Flywheel**: raw idea → simulate → thunderdome → synthesize → score | Multi-model | N/A (pipeline) |
| `ask-bill` | **bricker-os**: corpus-grounded Q&A for Bill's dynamic résumé terminal (corpus fetched from the Brick repo's GitHub Pages; public endpoint, rate-limited) | Claude 3.5 Sonnet / 3 Haiku | None (plain text answer) |

### Shared Agent Infrastructure (`supabase/functions/_shared/`)

Shared code lives here. Supabase convention: `_shared/` prefix means it's not deployed as its own endpoint.

| Module | Purpose |
|--------|---------|
| `cors.ts` | CORS headers |
| `llm-client.ts` | Unified LLM caller (Lovable Gateway + Anthropic direct) |
| `model-router.ts` | Smart model selection by task type |
| `types.ts` | Shared TypeScript types for agent I/O |
| `error-handler.ts` | Unified error handling (429/402/500) |
| `agents/*.ts` | Core logic for each agent, importable by other agents |

### Database (Supabase PostgreSQL)

Key tables: `idea_reports` (simulation state), `idea_perspectives` (persona results), `simulator_captures` (session backup), `project_registry` (portfolio), `contact_submissions`, `user_roles`.

All tables use UUID primary keys, `now()` timestamps, and row-level security (RLS) policies.

## Conventions

- **All LLM calls** go through `_shared/llm-client.ts` — never raw `fetch` to the gateway
- **Model selection** uses `_shared/model-router.ts` — never hardcoded model strings
- **Tool schemas** use OpenAI function-calling format (the Lovable Gateway speaks this)
- **Edge function endpoints** are thin HTTP wrappers (~20 lines) that import core logic from `_shared/agents/`
- **CORS headers** imported from `_shared/cors.ts`
- **Error handling** uses `_shared/error-handler.ts` patterns

## Adding a New Agent

1. Create `supabase/functions/_shared/agents/{name}.ts` with the core logic (system prompt, tool schema, main function)
2. Create `supabase/functions/{name}/index.ts` as a thin HTTP wrapper that imports from the shared module
3. Add the agent's task type to `_shared/model-router.ts`
4. Add TypeScript types to `_shared/types.ts`
5. If other agents should be able to call it, register it in the orchestrator's workflow DAG

## Environment Variables

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — Frontend Supabase connection
- `LOVABLE_API_KEY` — Supabase Edge Function secret for Lovable Gateway
- `ANTHROPIC_API_KEY` — Optional, enables direct Claude API calls as fallback

## Design System

See `.impeccable.md` for brand context. See `SKILL_*.md` files for the design orchestration framework (9 interlocking skills adapted from Impeccable Style). Key aesthetic: cinematic dark mode, matte charcoal, electric accents. Anti-pattern: generic AI-generated interfaces.

## Testing

- `npm test` — Vitest unit tests
- `npx playwright test` — E2E tests
- `npm run build` — Verify production build
- `npm run lint` — ESLint checks
