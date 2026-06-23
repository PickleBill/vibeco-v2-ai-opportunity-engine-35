# Skill: Impeccable

> Top-level design orchestrator adapted from [Impeccable Style v2.0](https://impeccable.style) for Lovable + Tailwind/shadcn/framer-motion.
> Trigger: "Build [feature] following the impeccable skill" or "Run impeccable [craft|teach]."

---

## What This Skill Does

Guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Every design skill in the project reads this file as its foundation. It contains the Context Gathering Protocol, aesthetic guidelines, anti-patterns, the AI Slop Test, and the Craft/Teach flows.

---

## Context Gathering Protocol

Design skills produce generic output without project context. You MUST have confirmed design context before doing any design work.

**Required context** (every design skill needs at minimum):
- **Target audience**: Who uses this product and in what context?
- **Use cases**: What jobs are they trying to get done?
- **Brand personality/tone**: How should the interface feel?

**CRITICAL**: You cannot infer this context by reading the codebase. Code tells you what was built, not who it's for or what it should feel like. Only the creator can provide this context.

**Gathering order:**
1. **Check `.impeccable.md` (fast)**: Read `.impeccable.md` from the project root. If it exists and contains the required context, proceed immediately.
2. **Run impeccable teach (REQUIRED)**: If `.impeccable.md` doesn't exist or lacks context, you MUST run `/impeccable teach` NOW before doing anything else. Do NOT skip this step. Do NOT attempt to infer context from the codebase instead.

---

## Design Direction

Commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme — don't default to "modern and clean." Be specific: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, industrial/utilitarian.
- **Constraints**: Technical requirements (Lovable sandbox, Tailwind, shadcn, framer-motion).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work. The key is intentionality, not intensity.

---

## Frontend Aesthetics Guidelines

### Typography

Choose fonts that are beautiful, unique, and interesting. Pair a distinctive display font with a refined body font.

**The Font Anti-Attractor Procedure** — DO THIS BEFORE TYPING ANY FONT NAME:

Step 1. Read the brief. Write down 3 concrete words for the brand voice (e.g., "warm and mechanical and opinionated"). NOT "modern" or "elegant" — those are dead categories.

Step 2. List the 3 fonts you would normally reach for. They are most likely from this list of **banned reflex fonts**:

> Fraunces, Newsreader, Lora, Crimson, Crimson Pro, Crimson Text, Playfair Display, Cormorant, Cormorant Garamond, Syne, IBM Plex Mono, IBM Plex Sans, IBM Plex Serif, Space Mono, Space Grotesk, Inter, DM Sans, DM Serif Display, DM Serif Text, Outfit, Plus Jakarta Sans, Instrument Sans, Instrument Serif

Reject every font in this list. **Syne in particular is the most overused "distinctive" display font and is an instant AI design tell. Never use it.**

Step 3. Browse a font catalog with the 3 brand words in mind. Sources: Google Fonts, Pangram Pangram, Future Fonts, Adobe Fonts. Look for something that fits the brand as a *physical object* — a museum exhibit caption, a hand-painted shop sign, a 1970s mainframe manual, a fabric label inside a coat.

Step 4. Cross-check. The right font for an "elegant" brief is NOT necessarily a serif. If your final pick lines up with your reflex pattern, go back to Step 3.

**Rules:**
- Use a modular type scale with fluid sizing (`clamp()`) for headings on marketing pages. Use fixed `rem` scales for app UI.
- Fewer sizes with more contrast. A 5-step scale with at least a 1.25 ratio between steps.
- Cap line length at ~65-75ch.
- Light text on dark backgrounds: ADD 0.05-0.1 to normal line-height.

**NEVER:**
- Use overused fonts (Inter, Roboto, Arial, Open Sans) or any font in the banned list above
- Use monospace typography as lazy shorthand for "technical/developer" vibes
- Put large rounded-corner icons above every heading
- Use only one font family for the entire page
- Set long body passages in uppercase

> **VibeCo note:** Inter is currently the display font and Source Code Pro the mono font. These were v1 choices. The font anti-attractor procedure should be applied in the next design sprint to find more distinctive alternatives.

### Color & Theme

Commit to a cohesive palette. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.

- **OKLCH is the future**: OKLCH is perceptually uniform — equal steps in lightness *look* equal, which HSL does not. VibeCo currently uses HSL in its token system. Migrate to OKLCH when the design system gets a major version bump. For now, continue using HSL tokens in `index.css` and `tailwind.config.ts`.
- **Tint your neutrals** toward the brand hue. Even a chroma of 0.005-0.01 is perceptible and creates subconscious cohesion.
- **60-30-10 rule** is about visual *weight*, not pixel count. 60% neutral/surface, 30% secondary text and borders, 10% accent. Accents work BECAUSE they're rare.
- **Theme should be DERIVED from audience and context**, not picked from a default. VibeCo's dark theme is justified: evening/focused use, creative energy, studio atmosphere.

**NEVER:**
- Use pure black (`#000`) or pure white (`#fff`) — always tint
- Use gray text on colored backgrounds — use a shade of the background color instead
- Use the AI color palette: cyan-on-dark, purple-to-blue gradients, neon accents on dark backgrounds
- Use gradient text for impact (see Visual Details bans below)
- Default to dark mode "to look cool" or light mode "to be safe" — choose based on context

### Layout & Space

Create visual rhythm through varied spacing, not the same padding everywhere. Embrace asymmetry and unexpected compositions.

- Use a **4pt spacing scale** with semantic names: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Use `gap` instead of margins for sibling spacing.
- Vary spacing for hierarchy — a heading with extra space above reads as more important.
- Self-adjusting grid: `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`.
- Container queries for components, viewport queries for page layout.
- Use `clamp()` for fluid spacing that breathes on larger screens.

**NEVER:**
- Wrap everything in cards
- Nest cards inside cards
- Use identical card grids (same-sized cards with icon + heading + text, repeated endlessly)
- Use the hero metric layout template (big number, small label, gradient accent)
- Center everything — left-aligned text with asymmetric layouts feels more designed
- Use the same spacing everywhere

### Visual Details

These CSS patterns are **NEVER acceptable**. They are the most recognizable AI design tells:

**BAN 1: Side-stripe borders on cards/list items/callouts/alerts**
- PATTERN: `border-left:` or `border-right:` with width > 1px
- WHY: The single most overused "design touch" in AI-generated UIs
- REWRITE: Use full borders, background tints, leading numbers/icons, or no visual indicator at all

**BAN 2: Gradient text**
- PATTERN: `background-clip: text` combined with a gradient background
- WHY: Decorative rather than meaningful; top-three AI design tell
- REWRITE: Use a single solid color. If you want emphasis, use weight or size.

**Also avoid:**
- Glassmorphism everywhere (blur/glass effects only when purposeful)
- Sparklines as decoration (tiny charts must convey real data)
- Rounded rectangles with generic drop shadows
- Modals unless truly necessary — prefer inline expansion, drawers, or navigation

### Motion

Focus on high-impact moments. One well-orchestrated page load creates more delight than scattered micro-interactions.

- Use motion to convey **state changes**: entrances, exits, feedback
- Use **exponential easing** (`ease-out-quart`/`quint`/`expo`) for natural deceleration
- For height animations, use `grid-template-rows` transitions instead of animating `height`
- **Never** animate layout properties (width, height, padding, margin) — use `transform` and `opacity` only
- **Never** use bounce or elastic easing — real objects decelerate smoothly
- **Always** respect `prefers-reduced-motion`

### Interaction

Make interactions feel fast. Use optimistic UI: update immediately, sync later.

- **Progressive disclosure** — start simple, reveal sophistication through interaction
- Design **empty states that teach** the interface, not just say "nothing here"
- Make every interactive surface feel **intentional and responsive**
- **Never** repeat the same information (redundant headers, intros that restate the heading)
- **Never** make every button primary — use ghost buttons, text links, secondary styles

### Responsive

- Use `@container` queries for component-level responsiveness
- **Adapt** the interface for different contexts — don't just shrink it
- **Never** hide critical functionality on mobile

### UX Writing

- Make every word **earn its place**
- **Never** repeat information users can already see

---

## The AI Slop Test

**Critical quality check**: If you showed this interface to someone and said "AI made this," would they believe you immediately? If yes, that's the problem.

A distinctive interface should make someone ask "how was this made?" not "which AI made this?"

Review ALL the NEVER guidelines above. They are the fingerprints of AI-generated work from 2024-2025.

---

## VibeCo Token Reference

All colors are defined as CSS custom properties in `src/index.css` and mapped in `tailwind.config.ts`.

| Token | Usage |
|---|---|
| `bg-background` / `text-foreground` | Page-level background and text |
| `bg-primary` / `text-primary-foreground` | CTAs, active states |
| `bg-muted` / `text-muted-foreground` | Secondary surfaces, subdued text |
| `bg-accent` / `text-accent-foreground` | Highlights, badges |
| `bg-surface` / `bg-surface-elevated` | Card-like containers, layered surfaces |
| `border-border` / `border-divider` | Standard and subtle dividers |
| `bg-card` / `text-card-foreground` | Card component backgrounds |

### Usage Rules
```tsx
// ✅ Correct — semantic tokens
<div className="bg-surface text-foreground border-border">

// ❌ Wrong — raw colors
<div className="bg-zinc-900 text-white border-gray-700">
```

---

## Component Patterns

### Cards
- One level only. Never nest `<Card>` inside `<Card>`.
- Vary card sizes in grids — use `col-span-2` or different heights to break monotony.

### Buttons
- One primary CTA per viewport. Secondary actions use `variant="ghost"` or `variant="outline"`.
- Use text links for tertiary actions.

### Empty States
- Show an illustration or icon + a helpful action. Never just "No data found."

### Loading States
- Use skeleton screens (`<Skeleton />`) over spinners where possible.
- For AI operations, show contextual progress messages, not generic "Loading..."

---

## Craft Mode

When invoked with "craft" (e.g., "Run impeccable craft [feature]"):

### Step 1: Shape
Run the Shape skill to produce a design brief. If no brief exists for this feature, conduct the discovery interview first.

### Step 2: Load References
Based on the brief, identify which skill references are most relevant (motion, spatial design, interaction, typography, color).

### Step 3: Build
Implement working code that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

### Step 4: Visual Iteration
After the first implementation, review it critically:
- Run the AI Slop Test
- Check against all NEVER guidelines
- Identify what's generic or safe and push it further

### Step 5: Present
Show the result and explain the design decisions made. Highlight what makes it distinctive.

---

## Teach Mode

When invoked with "teach" (e.g., "Run impeccable teach"):

Skip all design work above and run this flow instead. This is a one-time setup that gathers design context for the project.

### Step 1: Explore the Codebase
Before asking questions, scan the project:
- README and docs: Project purpose, target audience, stated goals
- Config files: Tech stack, dependencies, existing design libraries
- Existing components: Current design patterns, spacing, typography in use
- Brand assets: Logos, favicons, color values already defined
- Design tokens / CSS variables: Existing color palettes, font stacks, spacing scales

Note what you've learned and what remains unclear.

### Step 2: Ask UX-Focused Questions
Ask the user to clarify what you couldn't infer:

**Users & Purpose:**
- Who uses this? What's their context when using it?
- What job are they trying to get done?
- What emotions should the interface evoke?

**Brand & Personality:**
- How would you describe the brand personality in 3 words?
- Any reference sites or apps that capture the right feel?
- What should this explicitly NOT look like?

**Aesthetic Preferences:**
- Strong preferences for visual direction?
- Light mode, dark mode, or both?
- Colors that must be used or avoided?

Skip questions where the answer is already clear from the codebase exploration.

### Step 3: Write Design Context
Synthesize findings into `.impeccable.md` using this structure:

```markdown
## Design Context

### Users
[Who they are, their context, the job to be done]

### Brand Personality
[Voice, tone, 3-word personality, emotional goals]

### Aesthetic Direction
[Visual tone, references, anti-references, theme]

### Design Principles
[3-5 principles derived from the conversation]
```

---

## Skill Index

All available design skills (invoke by name):

| Skill | File | Purpose |
|---|---|---|
| **Impeccable** | `SKILL_IMPECCABLE.md` | Top-level orchestrator, guidelines, craft/teach flows |
| **Shape** | `SKILL_SHAPE.md` | Pre-build design brief via discovery interview |
| **Audit** | `SKILL_AUDIT.md` | Technical code-level quality check (a11y, perf, theming) |
| **Critique** | `SKILL_CRITIQUE.md` | Holistic UX/design evaluation (Nielsen heuristics) |
| **Polish** | `SKILL_POLISH.md` | Final-pass refinement on finished components |
| **Bolder** | `SKILL_BOLDER.md` | Push safe designs toward distinctive choices |
| **Clarify** | `SKILL_CLARIFY.md` | Copy rewriting for clarity and concision |
| **Overdrive** | `SKILL_OVERDRIVE.md` | Extraordinary interaction polish and animation |
| **Onboard** | `SKILL_ONBOARD.md` | Onboarding, empty states, first-run experiences |
