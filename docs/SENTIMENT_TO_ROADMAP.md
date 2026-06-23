# Pulse — a Voice-of-Customer → Roadmap engine (CPO's cockpit)

**Status:** Strategy / architecture draft v1
**Relationship:** Signal Mine (`docs/SOCIAL_LISTENING_PRD.md`) is the **seed** of this. This
doc zooms out to the real goal: a **general-purpose, multi-source sentiment → product
roadmap system**, with NiceAce as the first live test. Pulse is the product-leadership layer
on top of the Signal Mine pipeline.

---

## The goal, stated plainly

> Capture what customers and the market are saying — everywhere — and continuously turn it
> into a prioritized product roadmap a Chief Product Officer would actually trust and defend.

Most "social listening" tools stop at dashboards (sentiment up 4%, here's a word cloud).
That's noise, not decisions. **Pulse's job is the last mile that those tools skip:** signal →
*themes* → *opportunities* → *a ranked, evidence-backed roadmap* → *into the build loop*.

It is **product-agnostic by design.** NiceAce is the first tenant; the same engine serves
VibeCo, pickle-daas, or any of the 65+ Courtana projects — because the product registry,
agent mesh, and org memory it rides on are already shared infrastructure.

---

## Why we're well-positioned (we're not starting from zero)

| Already built | Becomes, in Pulse |
|---|---|
| **Signal Mine** (collect → classify → cluster → synthesize) | The ingestion + extraction engine. |
| **`project_registry`** | The multi-tenant key — every signal, theme, and roadmap item is tagged to a product. |
| **Agent mesh** (`debate`, `synthesize`, `expand`, `distill`, persona) | The "reasoning staff" that scores, stress-tests, and sequences opportunities. |
| **`auto-evaluate` flywheel** | Confidence scoring for each opportunity. |
| **Org memory** (pgvector decisions) | Institutional memory: why we shipped/killed things, searchable across time. |
| **Courtana MCP server** | Lets any Claude Code session read the roadmap and act on it (ship the PR). |

Pulse is mostly **new abstraction layers + more sources**, not new plumbing.

---

## The five-layer model (signal → roadmap)

```
  L1 SOURCES        L2 EXTRACT         L3 THEMES          L4 OPPORTUNITIES     L5 ROADMAP
  ──────────        ──────────         ─────────          ───────────────      ──────────
  Reddit            classify           cluster +          problem + proposed   scored,
  App reviews   →   (pain/feature  →   score pain     →   solution + RICE/  →  sequenced,
  X / forums        /noise)            (freq×intensity    impact + effort      gated to the
  Support tickets   dedupe             ×recency×reach)     + confidence         build loop
  Sales calls       provenance
  In-app NPS
  Churn reasons
```

- **L1 Sources** — Signal Mine ships Reddit + app-store reviews. Pulse adds *owned* channels
  (support tickets, NPS, churn reasons, sales-call transcripts — high-signal, fully compliant
  because they're yours) and *earned* channels (X, forums, Discord) behind official APIs.
- **L2 Extract** — the cheap high-recall classifier (already built).
- **L3 Themes** — clustering + a **pain score** that now includes *reach* (how many
  customers/$ are affected), not just volume of complaints.
- **L4 Opportunities** — the CPO leap: each theme becomes an **Opportunity** with a crisp
  problem, a proposed solution, and a **prioritization score** (RICE: Reach × Impact ×
  Confidence ÷ Effort). The agent mesh fills these in; `debate` pressure-tests them.
- **L5 Roadmap** — opportunities are sequenced into Now / Next / Later, each carrying its
  evidence. This is the artifact a CPO presents to the board.

---

## The CPO abstraction (what makes this *product leadership*, not a dashboard)

A dashboard tells you *what happened*. A CPO decides *what to do about it*. Pulse encodes the
decisions a CPO makes:

1. **Prioritization, not just ranking.** RICE/impact scoring, with the inputs *visible and
   editable* — the human can override any agent estimate and the change is logged.
2. **Strategy fit, not just demand.** Every opportunity is scored against the product's
   stated strategy/north-star (stored per product). "Loud but off-strategy" gets flagged, not
   auto-promoted — the guard against building whatever trolls shout for.
3. **Theme memory & drift.** Themes persist and trend over time ("settle-up friction" has
   been top-3 for 6 weeks). New signal *updates* existing themes instead of spawning dupes.
4. **The roadmap is a living object**, not a monthly export. It re-ranks as new signal lands,
   but changes are diffed and human-gated — you see *why* item #4 jumped to #1 this week.
5. **Provenance to the quote.** Every roadmap item traces to its evidence. No black-box.

---

## Generalizing from NiceAce → any product (the tenancy model)

NiceAce is **tenant #1**, not a special case. To onboard any product:

1. It already exists in `project_registry` (the tenant key).
2. Add its **sources** (subreddits, review IDs, support inbox, etc.) as config rows.
3. Add its **strategy/north-star** text (used for the strategy-fit score).
4. Pulse runs the same five layers, scoped by `product_tag`.

A `/pulse` view (the CPO cockpit) gets a product switcher; the existing `/signal` Signal Board
is the L4 layer for one product. Same engine, many products — which is exactly the
"vibe-coding-on-demand portfolio OS" thesis from Prong 2.

---

## Recommended approach & sequencing (my expert read)

Build the **decision layer before more sources.** The temptation is to bolt on Twitter,
Discord, etc. first — but more raw signal without better synthesis just makes a bigger swamp.
Order:

| Phase | What | Why this order |
|---|---|---|
| **P0 — done** | Signal Mine v1 on NiceAce (Reddit + reviews → Signal Board) | The pipeline exists and renders. Prove extraction on one product. |
| **P1 — Theme persistence** ✅ done | Durable `signal_themes` (matched across scans via `matchThemes`, pain-score history) + a "Trending themes" strip with sparklines on `/signal` | Without memory, every scan starts from scratch — no trend, no CPO value. Highest leverage. |
| **P2 — Opportunity scoring** | Add RICE/impact + strategy-fit; make inputs human-editable | This is the CPO leap from "complaints" to "prioritized bets." |
| **P3 — The `/pulse` cockpit** | Multi-product roadmap view (Now/Next/Later) with provenance + diffing | The artifact you actually run the business from. |
| **P4 — Owned sources** | Support tickets, NPS, churn, sales-call transcripts | Your *own* data is the highest-signal, lowest-compliance-risk source. Bigger than X. |
| **P5 — Close the loop** | "Promote → change request → `refine-prompt` → Claude Code PR" (Prong 2 P2.3) | Roadmap item to shipped code, human-gated. The full machine. |
| **P6 — Earned sources at scale** | X / forums / Discord via official APIs; multi-tenant rollout | Scale breadth *after* the decision layer is trustworthy. |

**Guiding principle (borrowed from your own `.lovable/plan.md`):** *better synthesis beats
more sources.* A CPO with three sources and great judgment outperforms a firehose with none.

---

## Risks to design against

- **Garbage-in at scale** — aggressive L2 filtering + reach-weighting + strategy-fit gate.
- **Recency/loudness bias** — score weights corroboration across sources, not raw volume; the
  human gate stays.
- **Compliance** — owned data is clean; earned data via official APIs only; provenance + PII
  hashing already in Signal Mine.
- **Over-automation** — Pulse *recommends*; the CPO *decides*. Auto-promotion only for
  high-confidence + low-effort + on-strategy, and even then a human merges the PR.

---

## What to call it

Working name **Pulse** (Courtana Pulse). It's the heartbeat of the portfolio: what the market
feels, turned into what we build next.
