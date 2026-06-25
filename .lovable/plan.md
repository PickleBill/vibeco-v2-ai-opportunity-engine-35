# Pass 2 — Signal Board redesign, nav cleanup, copy overhaul

The goal: make `/signal` feel like the product, not a dashboard. Bigger type, no overlapping chrome, fewer menu items, one obvious flow per screen. We pick the visual direction from rendered prototypes before any real code lands.

## Order of operations

### 1. Trigger a fresh scan (background)

Last scan was a day ago, 36 candidates. Kick a new run on the active vertical first so the captures and the final build use today's data, not yesterday's. No code change — admin "Run scan" button you already have.

### 2. Capture the current `/signal` (Playwright)

- Mobile (375×812) and desktop (1440×900), signed-in, real data, top of page + scrolled.
- Saved under `/tmp/browser/signal-pass2/`. These screenshots are the visual anchor for the design-direction tool — required, otherwise the tool refuses with "screenshot context required."

should we take the existing pass data and also the new data (so we can see static vs. new?   

### 3. Pin the taste (one round of visual questions)

Three picks in a single `ask_questions` call, all visual:

- **Palette** — 3–4 curated options that fit the existing dark+emerald base with violet reserved for primary CTA. No new accent families.
- **Typography pair** — 3 options off the banned-font list (no Inter, Syne, Space Grotesk, IBM Plex, etc.). Goal: large, readable, distinctive. Inter is the current display font; this round replaces it.
- **Layout intent** — pick between the three structural directions below.

You're not picking the prototype yet — you're locking the taste so all three prototypes share it.

### 4. Generate three rendered design directions

Same locked palette + type pair + layout family across all three. They differ in how the user *moves through the page*:

- **A. "Opportunity of the day"** — page opens with ONE big opportunity full-bleed (target user, pain, why-now, evidence count, strongest objection, riskiest assumption, recommended next move, "Sketch this idea"). "See N more" reveals the rest as a swipeable stack. Daily briefing feel.
- **B. "Inbox"** — left rail of compact opportunity rows (pain bar, source dots), right pane is the selected opportunity in full with evidence drawer always open. Linear / Superhuman feel. Collapses to stacked on mobile.
- **C. "Feed of complaints → opportunities"** — top of page is a live-feeling stream of real `signal_raw` quotes with source links, opportunities are grouped sections underneath ("12 complaints about invoicing → here's what we'd build"). Evidence is the hero.

All three honor the data-truth rules (no invented numbers, every claim → real `signal_raw.source_url`, plain English, no "ROI/motion" jargon).

### 5. You pick one. I build it.  -> is it a terrible idea to build >1 design concept and have it toggle?  I'm down to pick a main and then just do a flash of one screen or something. We could do a limited flip, as opposed to light screen versus dark screen. By the way, we should also add light screen versus dark screen, but that's not super important.

The hero copy Randomizer on the VibeCO v1 is an example, so just put that to let me answer the question when we're doing it. I do it on a main one, but I kind of like the idea, switching from an admin perspective you 

Implementation rules:

- Rewrite of `src/pages/SignalBoard.tsx` render tree ONLY.
- Data hooks, `loadEvidence`, `runScan`, `draftRoadmap`, `useActiveVertical`, every Supabase query stay byte-for-byte identical.
- Tokens from the chosen prototype get copied into `src/index.css` verbatim.

### 6. Nav cleanup (same pass, small)

`src/components/Navbar.tsx`:

- Desktop links: **Signal · Sketchpad · Sign in · Open Signal (CTA)**. Drop "How it works", "Proofs", and the signed-in "Portfolio" + "Dashboard" links from the top bar.
- Move Portfolio, Dashboard, Sign out into a single avatar/menu popover (or a `/settings` page) — out of the global nav.
- Mobile menu mirrors the same trimmed list.
- Keep violet "Open Signal" as the only primary CTA. Audit CTA stays gone.

### 7. Copy overhaul on `/signal` (during the build step)

Applied to whichever direction wins:

- Bigger base type (≥16px body, fluid `clamp()` headlines).
- Kill overlapping status strip; one readable line under the title: "Last scan · N sources · M candidates."
- Replace remaining jargon: "confidence %" → "How sure we are", "effort S/M/L" → "Small / Medium / Large lift", "motion" → "Build a tool / Pre-sell a service / Partner", "pain score" → "How loud the complaint is."
- Opportunity card copy: TL;DR one-liner up top, then a small creative "what's inside" strip (target user · pain · evidence · next move) acting as a table of contents, then the body. Progressive disclosure — evidence drawer auto-open on the top card only.
- One primary CTA per card: **Sketch this idea →** (routes to `/simulate` with prefill).

## Out of scope (explicitly)

- `/simulate` (Sketchpad) redesign — separate effort, V2/V3.
- Home hero changes — stays as-is (Open Signal primary, audit demoted to `/briefing`). -> NO,  please fix this. Just simply get rid of it like this. There's the worst copy ever. Anything would be better than this. Do a small design pass on that and don't overthink it 
- Voice input, selector chips, prompt refine UX — V2/V3.
- Any backend / edge function changes. Claude owns those; I'll note the design decisions in `.lovable/plan.md` so the other side stays in sync.
- Anti-AI-slop framework: applying the general principles (no gradient text, no side-stripe borders, no nested cards, tinted neutrals, distinctive type) — not running the full Impeccable ritual end-to-end.

## What I need from you to start

Just say go. I'll start at step 1 (kick a scan), then step 2 (capture), then come back with the three visual-taste questions.