## TL;DR recommendation

**Keep two projects, one contract.** Do not collapse v1 (this repo) and v2.1 (VibeCo Labs) into one codebase right now. Ship v1 to publish this week as the lightweight "proofs + sketchpad" front door. Let v2.1 keep being the heavier Hub/engine workbench. They already share state through the MCP contract Claude designed — that's the right seam.

Reasoning, the PR, and the next phases below.

---

## 1) The PR — who merges, and what I checked

- The Claude PR (`#2 V2.1 backend closeout`, branch `claude/peaceful-dirac-nszyih`, +644/-23 across 8 files) lives in your **GitHub** repo (`PickleBill/vibeco-v2-ai-opportunity-engine-35`). That is **v2.1's** repo, not this one. Lovable's mirror for this project doesn't have that branch — I confirmed.
- **You merge it on GitHub.** I can't push to that repo from here, and merging it would change v2.1's code, not v1's. Lovable's two-way sync will pull it into the v2.1 Lovable project automatically after merge.
- The PR body matches what we expected from Claude's backend close-out: hardened `_shared/llm-client.ts` (timeouts, exponential backoff, Anthropic-direct fallback on 429/402/403/5xx), new `_shared/resilience.ts`, **idempotency guard in `signal-process**` (claim rows before mesh runs so re-runs can't duplicate candidates, release on failure), `error-handler` surfaces `403 credit_limit_reached` as "AI credits exhausted", `model-router.anthropicDirectFallbackModel()`, 17 unit tests, `tools/signal-harness/fill-board.sh`. Build green, tests pass, no new lint.
- **Collision risk vs our work here:** zero. All eight files are under `supabase/functions/_shared/**` + `tools/**` + tests. We only touched `src/**` and `.lovable/plan.md` this turn. Safe to merge.
- **What to port back to Claude / v2.1 after merge** (so it stops drifting from us):
  - `.lovable/plan.md` shape (living roadmap)
  - `src/hooks/useActiveVertical.ts`
  - SignalBoard search + "Sketch this idea" handoff pattern
  - `mem://patterns/prompt-component-reuse` conventions
  - The "Idea-stage sketchpad" reframing on `/simulate`

I'd open a small PR back to v2.1 with those — Claude will pick them up next session.

---

## 2) Mono-repo vs two projects — my take

You're right that there's a real sprawl risk. But the cost of merging now is higher than the cost of running two:


| Factor         | Merge to one repo now                                                                                                                                               | Keep two                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase       | v1 + v2.1 are on **different Supabase projects**. Merging means picking one and porting tables, RLS, functions, and the connector/MCP schema. Multi-day, high risk. | No move. Each already wired.                                                                                                          |
| Shipping speed | Blocks publish — you'd be migrating instead of polishing.                                                                                                           | Publish v1 this week.                                                                                                                 |
| Surface area   | Forces premature decisions about whether Hub, Connectors, Decisions, MCP live behind the marketing front door.                                                      | v1 stays small (Home + Signal + Sketchpad + Portfolio + Briefing). v2.1 stays the workbench.                                          |
| Drift          | Eliminates it.                                                                                                                                                      | Real risk, but mitigated by the contract doc (`CONNECTOR_CONTRACT.md` in v2.1) + shared `org_decisions`/`connector_registry` via MCP. |
| Reuse          | Single component tree.                                                                                                                                              | We've already proven cross-pollination works (adapter shape, signal_raw schema, sketchpad pattern).                                   |


**Recommendation:** keep two, with these rules:

1. **v1 (this repo) = publishable product surface.** Home → Signal Board → Sketchpad → Portfolio. Optimized for a stranger landing cold. Lightweight, fast, real data.
2. **v2.1 (VibeCo Labs) = engine + workbench.** Hub, ConnectorsTab, Decisions, deeper Opportunity Engine, MCP server, internal tooling.
3. **The seam** is the shared `org_decisions` / `connector_registry` / `signal_*` tables, accessed via MCP and the `CONNECTOR_CONTRACT.md`. Either side writes; either side reads.
4. **One-way reuse rule:** UX patterns flow v1 → v2.1 (lighter wins). Backend resilience flows v2.1 → v1 (harder wins).
5. **Sketchpad-as-Proofs idea you raised:** worth doing — but as v1's evolution of the sketchpad, not as a merge trigger. Phase it (below).

If in 60 days v1 is publishable and v2.1's Hub features stabilize, **then** reconsider folding v2.1's workbench in as an `/admin` surface here. Don't pay that cost until you've proven the front door works.

---

## 3) Workspace setup (knowledge, skills, connectors) — what to do once

**Connectors (workspace-level):**

- Already done: Firecrawl (pickle), Perplexity.
- Recommended to add now: **Linear** (issue tracking across both projects), **Notion** (if you want a shared doc surface for Claude to read). Skip GitHub MCP — Lovable's git sync already covers it.
- Skip until needed: Sentry, PostHog, Amplitude (only when v1 is published and you want telemetry).

**Workspace knowledge:** the only thing worth promoting from project-level to workspace-level right now is the `CONNECTOR_CONTRACT.md` + a 1-pager "Courtana repo map" (which project owns what). I'll draft both.

**Skills:** don't author new ones yet. The built-ins (`learn`, `go`, `skill-creator`, the Impeccable skills already in this repo) cover today's needs. Add a skill only when we catch ourselves repeating a non-obvious procedure across both projects (e.g. "publish-readiness audit").

---

## 4) Phases — finishing v1 to publishable

Each phase is one batch unless noted. All frontend unless flagged.

**Phase 7 — Auto-grader + refine loop** (was on hold). Unblocked now that Claude's PR is merge-ready. New `grade-prompt` edge function + `prompt_grades` table + UI loop on `/simulate`. *Touches* `supabase/**` *and migrations — I'll announce in* `.lovable/plan.md` *first to avoid colliding with anything Claude does next.  -> **FWIW  we're going to need a pretty big visual design pass. The stuff you're talking about is all technical and piping and UX, which is important, but there's a lot of this we can kind of roll up into using the impeccable skill sets and also possibly cold design for some inspiration. Why don't you just put a note there that's like "Get it to shippable", and then let's come back to this overall design rework after we publish a version? Sound good*** 

**Phase 8 — Publish-readiness pass.** Design tokens audit (no hardcoded colors), 375px mobile pass on Home/Signal/Sketchpad/Portfolio/Briefing, empty states, copy polish, SEO (title/meta/OG/favicon already set — I'll verify), `robots.txt` + `sitemap.xml` sanity, console-error sweep. Two batches.

**Phase 9 — Sketchpad → Proofs evolution** (the idea you raised). Repurpose the sketchpad so a finished sketch can be "promoted to Proofs" — i.e. a shareable artifact card that lives next to existing `ProofShowcase` entries. Same engine, new surface, no new backend. One batch.

**Phase 10 — Publish.** `preview_ui--publish` against `conviction-to-code.lovable.app` after a final verification checklist. Custom domain stays as-is.

**Phase 11 — Port back to v2.1.** Small PR with the v1 patterns listed in §1. You drive the merge over there.

**Held / out of scope:** Reddit secrets (B2 — still on you), full v1↔v2.1 collapse, paid tiers.

---

## What I need from you to proceed

1. Confirm: **merge Claude's PR on GitHub yourself** (I'll wait for it before touching `supabase/**` in Phase 7).   merged!!
2. Confirm: **two-project model + Phase 7→10 order** is what you want. - yep i think so!
3. Decision: **add Linear and Notion workspace connectors** now, or skip?  
4. Decision: any objection to me drafting `CONNECTOR_CONTRACT.md` (root) + `WORKSPACE_MAP.md` (root) as part of Phase 8 so both Claude and I read the same source of truth?  LOVEEE THIS!

I'll update `.lovable/plan.md` with whatever you green-light and start Phase 7 the moment the PR is in.