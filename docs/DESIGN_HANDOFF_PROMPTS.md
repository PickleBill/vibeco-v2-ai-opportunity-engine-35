# Design handoff prompts

> For when you want to take `/signal` (or any surface) to an external design
> tool — Claude Design, a Replit/Lovable spinoff, a human designer, v0, etc.
> Each prompt is self-contained: paste and go.

## Prompt 1 — Signal Board, cinematic-research-tool direction

```
You are designing a single page for a product called VibeCo Signal Board.

PURPOSE
The page answers one question: "What are real people in {vertical} complaining
about right now, and what would we build for them?" It mines real public
discussion (Reddit, Hacker News, Trustpilot, G2, Capterra, web) and ranks the
pain into evidence-backed feature candidates. Every claim links to a real URL.

AUDIENCE
A non-technical founder or solo operator at a 5-50 person company. Smart,
skeptical, evening / after-hours use. Doesn't speak "tech" — speaks outcomes.

CONTENT YOU MUST RENDER
1. A header that names the vertical and states the question being answered.
2. A live status line (X candidates, Y themes, last scan Z ago) — never a 4-tile
   grid of placeholder stats.
3. A horizontal scrolling strip of "themes that keep coming back" with mini
   sparklines.
4. An "AI-drafted roadmap" section: 3-6 cards, each with title, what we'd
   build, who'd buy it, confidence %, and motion (Build it / Pre-sell it /
   Partner up — never abbreviated jargon).
5. A ranked list of candidate cards. Each card has: pain score, theme name,
   the problem in plain English, what we'd build, 1-3 paraphrased quotes from
   real posts, source badges (Reddit / HN / G2 / Trustpilot), and a
   collapsible "evidence drawer" that lists 10 real source URLs.
6. Sticky search + sort + source filter, directly under the header.
7. Cinematic dark mode. Matte charcoal, electric accents. No pure black/white.
8. Anti-references: generic SaaS templates, gradient-everything, purple/blue
   AI gradients, side-stripe borders on cards, gradient text. AVOID these.

CONSTRAINTS
- React + Tailwind + shadcn primitives. No new dependencies.
- Use existing CSS variables in src/index.css: --background, --foreground,
  --primary, --muted, --accent, --surface, --border, --destructive, --warning.
- Don't nest cards inside cards.
- Don't use Inter, Roboto, Open Sans, Syne, Space Grotesk, or any other
  obvious "AI design" font. Pick something with character.
- Motion: tasteful — entrance fades for sections, sparkline draw-in, drawer
  open/close. No bounce. Respect prefers-reduced-motion.

DELIVER
Three rendered direction options, varying ONLY in composition, density, and
emphasis. Same color tokens, same type pairing, same layout grid. Show me
each as a clickable preview.
```

## Prompt 2 — Sketchpad direction (for /simulate when we redesign it)

```
You are designing the VibeCo Sketchpad — a single-screen tool where someone
takes a real pain point from the Signal Board (or one of their own ideas)
and riffs on it with AI agents.

JOB TO BE DONE
"I have an idea (or a pain to solve). Help me poke at it from 5 angles in 60
seconds so I know whether it's worth building."

CURRENT FLOW (preserve)
- Borderless textarea on a dark canvas as the input.
- After submit: a structured idea brief, then follow-up questions, then a
  final report rendered with bold typographic hierarchy.
- Multiple agent voices (Skeptic, Champion, Competitor, Customer, Builder).
- Action hub at the bottom: refine, expand, distill, generate landing.

WHAT'S WRONG TODAY
Looks like a generic chat UI. Doesn't feel like a creative tool. The agent
voices are buried in tabs nobody clicks.

WHAT I WANT
Make it feel like a creative studio, not a chatbot. The five agent voices
should be present and visual from the start — like five colleagues around a
table, each with a face/avatar/voice indicator, weighing in on what you
typed. Their critiques stream in parallel, not one-after-another.

DELIVER
Three direction options. Same constraints as the Signal Board prompt
(dark mode, no AI cliches, shadcn, semantic tokens).
```

## Prompt 3 — Home page, "Signal is the product" reframe

```
You are redesigning the VibeCo home page. The product is the Signal Board:
real customer pain, mined from the public web, ranked.

CURRENT HOME (what's there)
Hero → "AI Opportunity Engine" framing → Opportunity Scan (a textarea +
keyword matcher) → Services → Proofs → Final CTA. Primary CTA today is
"Book a discovery audit" (violet pill). That CTA stays on /briefing only.

NEW PRIMARY CTA
"Open Signal" — takes you to /signal with the demo vertical pre-loaded.

WHAT THE HOME MUST DO
1. In 5 seconds, communicate "we listen to real complaints and turn them
   into features." Use one striking visualization (a live ticker of real
   quotes streaming in? A counter that climbs with real signals mined? A
   wall-of-pain quote collage?) — your call, but it must use REAL data
   pulled from the signal_raw table. No placeholders.
2. Show 1-2 real candidate cards from the current top vertical, with a
   "see all" link to /signal.
3. Provide a "describe your business" textarea that routes to /signal with
   a guessed vertical pre-selected (not a fake keyword match).
4. Single conversion: Open Signal. Secondary: Book a discovery audit
   (link to /briefing, not modal).

CONSTRAINTS
Same as prompt 1.

DELIVER
Three direction options with one of the above visualizations dominating.
```

## How to use these

1. Paste into Claude Design / v0 / your designer of choice.
2. They produce HTML/CSS or component sketches.
3. You drop the chosen direction into Lovable: "implement this design,
   keeping our existing semantic tokens in src/index.css."
4. We translate to React + shadcn here, refactoring only the visual layer.

The data layer doesn't move. The component structure stays. Only the look changes.
