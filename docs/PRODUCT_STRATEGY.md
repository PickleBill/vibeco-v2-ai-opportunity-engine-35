# Courtana Product Strategy — NiceAce + the VibeCo "on-demand" ecosystem

**Status:** Draft v1 for Bill · **Author:** Claude Code session
**Scope:** the two-pronged plan + the social-listening initiative, and how they connect.

---

## TL;DR

1. **Prong 1 — Ship NiceAce.** *Scan the QR on the tee, pay $10, ace the hole, win the whole
   pot.* A single-hole, QR-activated, **winner-takes-all hole-in-one jackpot** — no app
   install, entry in three taps via Apple Pay. It owns golf's most viral moment and turns it
   into a live, growing pot. It's also the **B2B course-contest tool** (the course deploys
   the QR) productized for consumers. White space is real: 18Birdies owns side-game
   *tracking*; the insurance incumbents own *B2B coverage*; **nobody owns the consumer ace
   jackpot.** → [`NICEACE_PRD.md`](./NICEACE_PRD.md) · prototype at
   [`/aces/prototype/niceace-prototype.html`](../aces/prototype/niceace-prototype.html).

2. **Prong 2 — Bring it home to VibeCo.** Make NiceAce VibeCo's first *living* portfolio
   product: its users, feedback, and metrics flow **back** into the same agent mesh that
   vetted the idea (change requests → code, feedback → insight, agent-built customer
   profiles, ongoing expand/distill). The backbone — the Courtana MCP server, the agent
   mesh, the `auto-evaluate` flywheel — **already exists in this repo.** Prong 2 is mostly
   new task types + a feedback return-path, not new infrastructure. →
   [`VIBECO_X_ACES_INTEGRATION.md`](./VIBECO_X_ACES_INTEGRATION.md).

3. **Signal Mine — the demand sensor.** Continuously scan Reddit / app-store reviews /
   X for customer pain points and let the agent mesh turn the strongest, most-repeated
   ones into vetted, ranked features. It's the input firehose for Prong 2's feedback loop.
   → [`SOCIAL_LISTENING_PRD.md`](./SOCIAL_LISTENING_PRD.md).

Together these turn "vibe coding on demand" from a tagline into a literal machine:
**market signal → agent vetting → Claude Code ships a PR → live product → signal.**

---

## How the pieces connect

```
  Signal Mine ──pain points──▶ VibeCo agent mesh ──vetted features──▶ NiceAce (live)
       ▲                            (debate, synthesize,                   │
       │                             expand, distill,                      │
       │                             auto-evaluate)                        │
       └──────────────── users talk about NiceAce in public ◀────────────────┘
                                                                           │
                         change requests · feedback · metrics ────────────┘
                                        │
                                        ▼
                            Claude Code session ships a PR
                            (rationale written to shared org memory)
```

The same agents that *originate* ideas now *operate and evolve* them. That's the moat:
a compounding portfolio brain, not a one-shot idea generator.

---

## Recommended sequencing

| Phase | Focus | Outcome |
|---|---|---|
| **Now** | Align on this strategy; design is in-repo (`/aces/design/source`); prototype matches it | Shared direction; faithful NiceAce prototype delivered. |
| **Sprint A** | **NiceAce v1 MVP** (Prong 1): the QR-jackpot signature moment (Arrive→Pay→Celebrate→Live→Ace win), on the VibeCo stack + a payments/insurance partner | A real, shippable consumer app. The proof-of-portfolio. |
| **Sprint B** | **Prong 2 P2.0–P2.2**: register NiceAce in the portfolio, feedback inbox, feedback-synthesis | The return path opens. Cheap — infra already exists. |
| **Sprint C** | **Signal Mine v1** (Reddit + reviews → Signal Board) + **Prong 2 P2.3** (change-request loop) | Market signal starts driving the backlog; feedback becomes code with a human gate. |
| **Later** | Multi-hole/course, course self-serve onboarding (B2B engine), sponsored pots, multi-product Signal Mine | Monetization + scale, once the loop is proven on NiceAce. |

Discipline borrowed from `.lovable/plan.md` (Sprint 9): **remove three things for every
one we add.** Ship the distilled core first; let the agents (and the market) earn every
expansion.

---

## Decisions — resolved + still open

**Resolved this round:**
- ✅ **Brand = NiceAce.**
- ✅ **Concept** confirmed from the design: single-hole QR winner-takes-all hole-in-one
  jackpot (not the skins tracker I first guessed). Prototype + PRD rewritten to match.
- ✅ **Design** is in-repo at `/aces/design/source/`; prototype is a faithful rebuild.

**Still open (see [`NICEACE_PRD.md`](./NICEACE_PRD.md) §11):**
1. **GTM fork** — B2B-led (sign courses, they bring players) vs. B2C-led? *Recommend B2B-led.*
2. **Insurance/payments partner** — existing relationship, or should I scope partners?
3. **Lead aesthetic** — Jackpot (default) vs. Broadcast. *Recommend Jackpot leads, Broadcast
   as clubhouse/venue mode.*
4. **Repo strategy** — my recommendation: keep everything here on this branch for review
   now, then **spin NiceAce into its own repo** before it grows a backend (clean compliance +
   release boundary). The MCP server likely graduates to its own repo too, since both
   VibeCo and NiceAce depend on it. Confirm and I'll execute the split.
5. **Where to point Signal Mine first** — recommend **NiceAce** (clearer pain space + maps the
   sweepstakes/legal minefield early). And Twitter API budget: yes, or Reddit + reviews only for v1?

---

## What I've delivered so far

- ✅ A **functioning, interactive NiceAce prototype** — faithful rebuild of your Claude
  Design export: full Arrive→Pay→Celebrate→Live→Ace-win flow, Jackpot/Broadcast looks,
  live pot. Source design version-controlled in `/aces/design/source/`.
- ✅ **NiceAce v1 PRD** (Prong 1) — the QR jackpot: market, mechanic, model, compliance, metrics.
- ✅ **NiceAce × VibeCo integration strategy** (Prong 2) — grounded in the actual MCP/agent
  code already in this repo, with a phased build plan.
- ✅ **Signal Mine PRD** — the social pain-point → feature pipeline.
- ✅ **Design intake convention** (`/aces/design/INTAKE.md`) + honest read on the
  Claude-Design↔Claude-Code bridge.

What I have **not** done: written any production NiceAce backend code, or touched the live
VibeCo app. Everything is additive (`/aces` + `/docs`) — the live product is unchanged.
