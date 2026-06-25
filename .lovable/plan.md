# Pass 2 — Signal Board redesign, nav cleanup, copy overhaul

The goal: make `/signal` feel like the product, not a dashboard. Bigger type, no overlapping chrome, fewer menu items, one obvious flow per screen. We pick the visual direction from rendered prototypes before any real code lands.

## Answers to your inline notes (locked)
- **Variant toggle**: ship ONE main direction. The other two stay accessible via `?layout=hero|inbox|feed` admin flip (same pattern as the existing `VariantSwitcher` hero copy randomizer). Adds optionality without forking the build.
- **Light vs. dark**: add a light/dark toggle in this pass. Small lift, big quality signal.
- **Home hero**: in scope. Small clarity+copy pass (kill the worst line, tighten to one promise + one CTA). Not a full hero redesign.
- **"Static vs. new" captures**: skipping. Design taste round doesn't depend on fresh content — the layout problems are visible on yesterday's data.

## Order of operations

### 1. Capture the current `/signal` (Playwright) — DONE
- Mobile (390×844) and desktop (1440×900), signed-in, real data, top/mid/bottom.
- Saved at `/tmp/browser/signal-pass2/signal_{desktop,mobile}_{top,mid,bot}.png`. These ride along on the design-direction call.

### 2. Pin the taste (one round of visual questions) — QUEUED
Three picks in a single `ask_questions` call:
- **Palette** — Charcoal & Ember / Emerald Prestige (current base, deepened) / Midnight Indigo / Paper & Ink (light).
- **Typography** — Instrument Serif + Work Sans / Outfit + Figtree / Archivo Black + Hind. (No Inter, Syne, Plex, Space Grotesk.)
- **Flow** — Opportunity of the day / Inbox / Feed of complaints / "render all three, I'll pick from the prototypes."

### 3. Generate three rendered design directions
Same locked palette + type pair across all three. They differ in how the user *moves through the page*:
- **A. Opportunity of the day** — one big opportunity full-bleed (target user, pain, why-now, evidence, objection, riskiest assumption, next move, "Sketch this idea"). "See N more" reveals the rest. Daily briefing feel.
- **B. Inbox** — left rail of compact opportunity rows (pain bar, source dots), right pane is the selected opportunity in full with evidence drawer always open. Linear / Superhuman. Stacks on mobile.
- **C. Feed of complaints → opportunities** — top is a stream of real `signal_raw` quotes with source links; opportunities grouped beneath ("12 complaints about invoicing → here's what we'd build"). Evidence is the hero.

All three honor the data-truth rules (no invented numbers, every claim → real `signal_raw.source_url`, plain English, no "ROI/motion" jargon).

### 4. You pick one. I build it.
- Rewrite of `src/pages/SignalBoard.tsx` render tree ONLY.
- Data hooks, `loadEvidence`, `runScan`, `draftRoadmap`, `useActiveVertical`, every Supabase query stay byte-for-byte identical.
- Tokens from the chosen prototype get copied into `src/index.css` verbatim.
- Other two layouts wired behind `?layout=` for admin flips.
- Add a light/dark toggle in the page header (persists to `localStorage`).

### 5. Nav cleanup (same pass)
`src/components/Navbar.tsx`:
- Desktop links: **Signal · Sketchpad · Sign in · Open Signal (CTA)**. Drop "How it works", "Proofs", and signed-in "Portfolio" + "Dashboard" from the top bar.
- Move Portfolio, Dashboard, Sign out into a single avatar/menu popover — out of the global nav.
- Mobile menu mirrors the trimmed list.

### 6. Copy overhaul on `/signal`
- Body ≥16px, fluid `clamp()` headlines.
- One readable status line under title: "Last scan · N sources · M candidates."
- Replace jargon: confidence % → "How sure we are", effort S/M/L → "Small / Medium / Large lift", motion → "Build a tool / Pre-sell a service / Partner", pain score → "How loud the complaint is."
- Each opportunity card: TL;DR one-liner up top, then a creative "what's inside" strip (target user · pain · evidence · next move) acting as a table of contents, then the body. Evidence drawer auto-open on the top card only.
- One primary CTA per card: **Sketch this idea →** (routes to `/simulate` with prefill).

### 7. Small home-hero fix
`src/components/Hero.tsx` (or whichever variant is active): tighten copy to one promise + one CTA. No new design system, just a clarity pass.

## Out of scope (explicit)
- `/simulate` redesign — V2/V3.
- Voice input, selector chips, prompt refine UX — V2/V3.
- Whether the research prompt / design brief / landing-page generator are pulling conversion weight — interesting question for a separate audit loop, not this push.
- Backend / edge function changes. Claude owns those; I'll note design decisions in `.lovable/plan.md`.
- Full Impeccable ritual end-to-end — applying the general anti-AI-slop principles only (no gradient text, no side-stripe borders, no nested cards, tinted neutrals, distinctive type).

## To start
Approve and flip to build mode. I'll fire the taste questions immediately.
