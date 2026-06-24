
# Signal Board UX — Game Plan

You're right: the Signal Board is the product, but it's reading as a dashboard. On mobile it's worse — tiny type, overlapping header, search/source-filter/sort are wired but don't visibly do anything because the cards under them all look the same and nothing animates on change.

I want to do this in two passes, not one. A small "stop-the-bleed" pass this turn, then a real redesign of the whole flow with rendered direction options you pick from.

---

## Pass 1 — Stop the bleed (surgical, ~1 build session)

Goal: page is usable on a phone, controls visibly work, nothing is broken. No redesign yet.

1. **Mobile header.** Stack the title / vertical selector / "Run scan" admin button vertically under 640px. Bump base type from ~12px to 15px. Kill the overlapping status line; move "last scan / X sources / Y candidates" into a single readable strip under the title.
2. **Make controls visibly do something.**
   - Sort dropdown: re-sort the visible list with a brief highlight on reorder so you can see it worked.
   - Source filter chips: toggle on/off with active state (filled chip), and show "Showing N of M · Clear" inline.
   - Search: live filter + result count, empty-state copy when zero matches.
3. **One opportunity = one obvious card.** Strip the duplicate "themes" strip on mobile (collapse behind "Show themes"). The opportunity cards become the page.
4. **Evidence visible by default on the top card.** First card auto-expands its evidence drawer so the "real sources" promise is felt immediately, not hidden behind a click.
5. **Kill remaining jargon in copy** (confidence %, effort S/M/L → "Small / Medium / Large lift" with hover, pain score → "How loud the complaint is").

This pass is safe, additive, preview-only. No data layer changes.

---

## Pass 2 — Real redesign (the part you actually asked for)

I want to take a screenshot of the current `/signal` on mobile + desktop, then run a proper design-direction round and have you pick the flow. Three directions, same data, same tokens — they vary in how the user moves through the page.

### Direction sketches I'd put up

- **A. "Opportunity of the day" hero.** Page opens with ONE big opportunity (the top-ranked), full-bleed, with evidence quotes scrolling underneath. "See 11 more" reveals the rest as a stack you swipe through. Feels like a daily briefing, not a dashboard.
- **B. "Inbox" layout.** Left rail = list of opportunities (compact rows, pain bar, source dots). Right pane = the selected opportunity in full, with evidence drawer always open. Reads like Superhuman / Linear. Best on desktop, collapses to stacked on mobile.
- **C. "Feed of complaints → opportunities."** Top of page is a live-feeling stream of real quotes from `signal_raw` (one per line, with source link), and opportunities are grouped sections below that ("12 complaints about invoicing → here's what we'd build"). Makes the evidence the hero, the synthesis second.

Each direction would also re-do the vertical switcher (today it's a generic shadcn `Select` — should feel like switching channels) and the run-scan affordance.

### Process

1. I capture the current page on mobile + desktop via Playwright.
2. I lock taste with three quick visual questions (palette, type pair, layout intent).
3. I generate three rendered prototypes of the directions above and show them side-by-side.
4. You pick one. I implement it for real, replacing the current SignalBoard layout but keeping every data query, the Evidence drawer logic, the roadmap render, and the admin run-scan untouched.

---

## What I want you to decide right now

Pick the path before I write any code:

- **(1) Just Pass 1.** Fix mobile + make controls work. Defer the redesign.
- **(2) Pass 1 now, then Pass 2 right after.** Recommended — Pass 1 unblocks you for testing while Claude finishes backend work; Pass 2 happens against a clean baseline.
- **(3) Skip Pass 1, go straight to Pass 2.** Riskier (board stays broken on mobile for a day or two) but you get to the rethink faster.

Also confirm:
- Home hero stays as-is (CTA = "Run an opportunity scan", audit demoted) — yes/no.
- `/simulate` (Sketchpad) is **out of scope** for this round — yes/no. (It needs the same treatment but is a separate effort.)

Once you answer, I'll either start Pass 1 immediately or jump to capturing screenshots for the directions round.

---

## Technical notes (for me, not blocking)

- All changes preview-only until you say publish.
- Pass 2 implementation: the new layout is a rewrite of `src/pages/SignalBoard.tsx`'s render tree only. Data hooks, `loadEvidence`, `runScan`, `draftRoadmap`, `useActiveVertical`, and all Supabase queries stay byte-for-byte identical.
- No new dependencies. shadcn + Tailwind + Framer Motion already in.
- Honors data truth rules from project knowledge: no invented numbers, distinguish empty states, every claim → real `signal_raw.source_url`.
