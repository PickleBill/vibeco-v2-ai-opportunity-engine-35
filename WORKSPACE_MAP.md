# Workspace map — Courtana / VibeCo

Single-page index of which Lovable project owns what, who its Supabase backend
is, and how the pieces talk. Both Lovable agent (v1) and Claude Code (v2.1)
read this before making cross-project decisions.

## Projects

| Project | Role | Repo / Lovable ID | Supabase ref | Live URL |
|---|---|---|---|---|
| **VibeCo v1** (this repo) | Publishable front door. Marketing, Signal Board, Idea Sketchpad, Portfolio, Briefing. | Lovable `8563d10e-0a80-479b-a250-2a385fe4ceab` · GitHub `PickleBill/conviction-to-code` (Lovable git mirror) | `brpqtaaknxdqkjvzfvlo` | `conviction-to-code.lovable.app` |
| **VibeCo Labs (v2.1)** | Engine + workbench. Hub, Connectors tab, Decisions, deep Opportunity Engine, MCP server. | Lovable `b653b128-3875-4437-8937-09034702860d` · GitHub `PickleBill/vibeco-v2-ai-opportunity-engine-35` | (separate Supabase) | (separate URL) |
| **NiceAce / Aces** | Single-hole hole-in-one jackpot product. Lives in `aces/` here as source material; product surface is separate. | — | — | — |
| **Courtana MCP server** | Node MCP server bridging Claude ↔ shared Supabase tables. Lives in `courtana-mcp-server/` here. | — | shared | local stdio |

## Surface ownership

| Surface | Owned by | Notes |
|---|---|---|
| `src/**` (v1) | v1 (Lovable agent) | Frontend only. |
| `supabase/functions/**`, `supabase/migrations/**` (v1) | Claude Code | Lovable agent only touches with a `.lovable/plan.md` announcement. |
| `src/**` (v2.1) | v2.1 (Lovable agent in that project) | Hub, ConnectorsTab, Decisions. |
| `supabase/functions/**` (v2.1) | Claude Code | Backend resilience pioneered here, then ported to v1. |
| `courtana-mcp-server/**` | Claude Code | Pure pipe; no UX. |
| Root contract docs (`CONNECTOR_CONTRACT.md`, `WORKSPACE_MAP.md`) | v1 Lovable agent | Source of truth, read by both sides. |
| `.lovable/plan.md` | v1 Lovable agent | Living roadmap. v2.1 mirrors its own. |

## The seam (how the two projects talk)

Both projects read/write a shared set of tables. See `CONNECTOR_CONTRACT.md`
for exact shapes and write rules. Summary:

- `org_decisions` — durable cross-project decisions (Claude writes via MCP, both read).
- `connector_registry` — which connectors each project has wired (admin-only read).
- `connector_sync_events` — append-only log of each scan/run (service-role write).
- `signal_raw` / `signal_themes` / `signal_clusters` / `feature_candidates` /
  `opportunity_roadmaps` — Signal Mine + AI Opportunity Engine state.

Each project has its own Supabase project today. The tables above are
**duplicated per project**; the contract guarantees identical shapes so a
future merge (or cross-project mirror job) is mechanical, not a redesign.

## Workspace connectors (current)

| Connector | Scope | Used by |
|---|---|---|
| Firecrawl (pickle) | workspace | v1 (signal-collect), available to v2.1 |
| Perplexity | workspace | v1 (signal-collect), available to v2.1 |
| Anthropic (direct API fallback) | workspace | both — fallback when Lovable Gateway is unhealthy |
| Lovable Gateway | platform | both — default for all LLM calls |

**Not connected (intentional):** Linear, Notion, Sentry, PostHog, Amplitude.
Revisit after v1 publishes.

## Reuse direction rule

- **UX patterns flow v1 → v2.1.** Lighter wins. v1's `useActiveVertical`
  hook, SignalBoard search, sketchpad reframing get ported back.
- **Backend resilience flows v2.1 → v1.** Harder wins. v2.1's hardened
  `_shared/llm-client.ts` (timeouts, exponential backoff, Anthropic-direct
  fallback) and `signal-process` idempotency guard get ported forward.

## Open the right door

| User intent | Route to |
|---|---|
| Marketing visitor, browsing the work | v1 home |
| "What's the market actually saying?" | v1 `/signal` |
| "Sketch an idea before I build it" | v1 `/simulate` |
| Internal: review connectors, decisions, deep roadmap | v2.1 Hub |
| Add a new edge function | Claude Code on the owning project's repo |
| Add a new visual component | Lovable agent on the owning project |

## Revisit triggers

- Collapse v1 + v2.1 into one repo: only when v1 has been live ≥60 days AND
  v2.1 Hub features have stabilized AND we've ported v1 patterns back.
- Promote a workspace connector (Linear/Notion): when both projects need it
  and we've felt the friction twice.
- Author a new skill: when both projects repeat the same non-obvious
  procedure (e.g. "publish-readiness audit").
