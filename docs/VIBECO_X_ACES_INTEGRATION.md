# Prong 2 — NiceAce × VibeCo: closing the "vibe-coding-on-demand" loop

**Status:** Strategy draft v1 · **Depends on:** NiceAce v1 shipping (Prong 1)
**Audience:** Bill + any Claude Code session working the Courtana ecosystem

---

## The thesis

VibeCo today is a **front-loaded** product: it's brilliant at taking a raw idea
*to the starting line* — analyze, stress-test, distill, generate a Lovable build prompt.
But the loop ends at "go build it." There's no **back half**: once a product is live
(like NiceAce), nothing flows back to keep improving it.

**Prong 2 closes that loop.** NiceAce becomes VibeCo's first *living* portfolio company —
a real product whose users, feedback, and metrics flow *back into* the same agent mesh
that birthed it. VibeCo stops being an idea simulator and becomes an **operating system
for a portfolio of vibe-coded products.** That's the "vibe coding on demand" ecosystem
made real.

```
  RAW IDEA ──▶ VibeCo agents ──▶ Lovable build ──▶ LIVE PRODUCT (NiceAce)
      ▲                                                     │
      │                                                     ▼
      └──────────  feedback · metrics · pain points  ◀──────┘
                 (this return path is what Prong 2 builds)
```

---

## What already exists (the backbone — don't rebuild it)

The infrastructure for this is **mostly already in the repo.** Reading the codebase, the
connective tissue is there:

| Asset | Where | What it gives us |
|---|---|---|
| **Courtana MCP server** | `/courtana-mcp-server` | The bridge. Any Claude Code session already gets `invoke_vibeco_agent`, `run_debate`, shared **org memory** (`save_decision` / `search_decisions` with embeddings), knowledge tools, and MCP self-improvement telemetry. |
| **Agent mesh** | `supabase/functions/_shared/agents/*` | `simulate`, `persona` (skeptic/champion/competitor/customer/builder), `expand`, `distill`, `refine-prompt`, `synthesize`, `debate`, `alt-prompt`, `image`. All invokable via the MCP server. |
| **Orchestrator** | `supabase/functions/orchestrate` | Fires the 7-agent Thunderdome in parallel + synthesizes. |
| **Flywheel** | `supabase/functions/auto-evaluate` | `raw idea → simulate → thunderdome → synthesize → confidence score`. Pipeline already exists. |
| **Model router** | `_shared/model-router.ts` | Task-typed model selection (Gemini Flash for parallel, Sonnet/GPT-5 for depth). New task types slot in here. |
| **Project registry** | `project_registry` table + `get_project_registry` | The portfolio ledger NiceAce registers into. |

**Implication:** Prong 2 is mostly *new task types + a feedback ingestion path + new MCP
tools*, not new infrastructure. We're extending a working mesh, not building one.

---

## The four integration loops (what Bill asked for, mapped to the mesh)

### Loop A — Change requests (in-product → Claude Code → Lovable/PR)
**Goal:** a NiceAce user (or Bill) files "make the ace-win card shareable to Instagram Stories,"
and it becomes a scoped, agent-vetted build task.

- **In NiceAce:** a "Suggest / Report" surface writes to a new `feature_requests` table.
- **New agent task type:** `change-request-triage` (add to `model-router.ts`) — classifies
  request (bug/feature/copy), de-dupes against existing, drafts an acceptance spec.
- **Vet it:** route the spec through `debate` (skeptic + builder + user_advocate) via the
  existing MCP `run_debate` tool → `synthesize` → confidence score.
- **Build it:** high-confidence + small-scope requests become a **Lovable build prompt**
  via `refine-prompt`; a Claude Code session (this one!) picks it up via the MCP server,
  implements on a branch, opens a PR. The MCP `save_decision` records the rationale.
- *This is the headline loop: product feedback → agents → code, with a human gate.*

### Loop B — Product feedback → insight (the listening half)
**Goal:** turn raw user feedback + the social-listening firehose (see the third PRD) into
ranked, deduped product insights.

- Feedback (in-app, app-store reviews, and the Reddit/Twitter pipeline) lands in a
  `feedback_items` table with embeddings (we already use pgvector for `org_decisions`).
- **New task type:** `feedback-synthesis` — clusters semantically similar items, scores
  pain intensity × frequency, and emits candidate features. Reuses the embeddings pattern
  already in `20260415140000_org_decisions_embeddings.sql`.
- Output feeds Loop A (the strongest clusters become change requests) and Loop C.

### Loop C — Customer profiles (built by agents, not forms)
**Goal:** living personas for NiceAce grounded in *real behavior*, not guesses.

- A `persona`-family agent run over real cohort data (the Ace Chaser, the Foursome Ringleader,
  the Course Operator) produces and *continuously updates* customer profiles in a
  `customer_profiles` table.
- These profiles become **context** injected into every other agent run — the
  `persona-perspective` "customer" voice stops being generic and starts speaking as
  *NiceAce's actual users*. This is the compounding asset.

### Loop D — Expand / distill on the live product
**Goal:** keep evolving NiceAce with the same agents that vetted the idea — now fed real data.

- `expand-idea` on the live NiceAce brief → orthogonal new bets (e.g., "NiceAce for sims/Topgolf,"
  "NiceAce leagues," "the B2B course contest engine" from the PRD parking lot).
- `distill-idea` as a discipline gate before any new surface ships — keeps v1 from bloating
  (the `.lovable/plan.md` Sprint-9 "remove three things for every one we add" ethos).
- The `auto-evaluate` flywheel scores each expansion → the **Portfolio** page ranks NiceAce's
  next bets by confidence, the same way it ranks net-new ideas.

---

## Architecture: how NiceAce plugs in

Two viable shapes. **Recommendation: shared brain, separate body.**

```
                  ┌─────────────────────────────────────────┐
                  │  Courtana MCP server  (the shared brain)  │
                  │  agents · org memory · registry · debate  │
                  └───────▲───────────────────────▲───────────┘
                          │ invoke_vibeco_agent    │
        ┌─────────────────┴───────┐    ┌───────────┴──────────────┐
        │  VibeCo (idea engine)   │    │  NiceAce (live product)   │
        │  Supabase project A     │    │  Supabase project B       │
        │  - simulate/expand/...  │    │  - entries/pots/aces      │
        │                         │    │  - feature_requests       │
        │                         │    │  - feedback_items         │
        └─────────────────────────┘    └───────────────────────────┘
```

- **Separate Supabase project / repo for NiceAce** (own data, auth, RLS, release cadence,
  and a clean regulatory boundary for any money features).
- **Shared agent mesh via the MCP server** — NiceAce does *not* re-implement agents. It calls
  them. New task types live in the shared `model-router.ts`.
- **Shared org memory** — decisions made building NiceAce are searchable from any session
  (`search_decisions`), so the portfolio compounds knowledge instead of fragmenting it.

### Repo recommendation
Spin **NiceAce into its own repo** before it grows a backend (clean boundary for compliance +
release cadence + a future team). The MCP server can graduate to its own repo too, since
both VibeCo and NiceAce depend on it. **For now**, everything lives at `/aces` + `/docs` on
this branch so it's reviewable in one place; the split is a deliberate, low-cost step once
you approve direction.

---

## What to build, in order (engineering sequencing)

| Phase | Build | Why first |
|---|---|---|
| **P2.0** | Register NiceAce in `project_registry`; add `aces` project context to the MCP knowledge tools | NiceAce becomes a first-class portfolio citizen the agents can reason about. Near-zero effort. |
| **P2.1** | `feedback_items` + `feature_requests` tables (with embeddings) + in-NiceAce "Suggest" surface | The return path can't exist without an inbox. |
| **P2.2** | `feedback-synthesis` task type + a scheduled job clustering feedback → insights | Turns the inbox into ranked signal. |
| **P2.3** | `change-request-triage` task type + the Loop A pipeline (triage → debate → refine-prompt → PR) | The headline "feedback becomes code" loop. Human gate before any PR. |
| **P2.4** | `customer_profiles` + inject into `persona` runs | Compounding asset; makes every later agent run sharper. |
| **P2.5** | Wire NiceAce expansions into `auto-evaluate` + surface on the Portfolio page | Closes the loop: the live product feeds the idea engine that spawns the *next* product. |

P2.0–P2.1 are days, not weeks, because the infrastructure already exists.

---

## The "on demand" north star

Once Loops A–D run, "vibe coding on demand" becomes literal: **a request — from a user, a
metric, or the social-listening firehose — flows through the agent mesh, gets vetted by a
multi-perspective debate, becomes a build prompt, and a Claude Code session ships it as a
PR, with the rationale written back to shared memory.** NiceAce is the proof. The Portfolio
page becomes mission control for a fleet of products that improve themselves on demand.
