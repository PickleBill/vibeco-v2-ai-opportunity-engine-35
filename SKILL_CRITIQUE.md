# Skill: Critique

> Adapted from [Impeccable Style](https://impeccable.style) `critique` skill for Lovable.
> Trigger: "Critique [page/component] using the critique skill" or "Run a design critique on [target]."

---

## What This Skill Does

A holistic design critique evaluating whether an interface actually works — not just technically, but as a designed experience. Think like a design director giving feedback.

---

## Before You Start

1. Reference `SKILL_IMPECCABLE.md` for anti-patterns, token usage, and the **Context Gathering Protocol**.
2. Gather context: what is the interface trying to accomplish? Who is the audience?

---

## Phase 1: Design Critique

Evaluate the interface across these dimensions:

### 1. AI Slop Detection (CRITICAL)

**This is the most important check.** Does this look like every other AI-generated interface?

Review against ALL the anti-patterns in `DESIGN_SYSTEM.md` — they are the fingerprints of AI-generated work. Check for:
- Generic dark mode with glowing accents
- Gradient text on metrics
- Glassmorphism everywhere
- Identical card grids (same size, icon + heading + text)
- Pure black/white instead of tinted neutrals
- Generic fonts and stock icons
- Hero metric layout templates (big number, small label, gradient)

**The test**: If you showed this to someone and said "AI made this," would they believe you immediately? If yes, that's the problem.

### 2. Visual Hierarchy
- Does the eye flow to the most important element first?
- Is there a clear primary action? Can you spot it in 2 seconds?
- Do size, color, and position communicate importance correctly?
- Is there visual competition between elements that should have different weights?

### 3. Information Architecture & Cognitive Load
- Is the structure intuitive? Would a new user understand the organization?
- Is related content grouped logically?
- Are there too many choices at once? Count visible options at each decision point — if >4, flag it.
- **Progressive disclosure**: Is complexity revealed only when needed, or dumped upfront?

**8-item cognitive load checklist:**
1. Can users complete their primary task without scrolling past unrelated content?
2. Are there fewer than 5 navigation items visible at once?
3. Is the most important action visually dominant?
4. Can users undo or go back from any state?
5. Are labels self-explanatory (no jargon)?
6. Is there adequate whitespace between distinct groups?
7. Are animations purposeful (state changes, not decoration)?
8. Can the interface be understood without reading any instructions?

Score: 0–1 failures = low (good), 2–3 = moderate, 4+ = critical.

### 4. Emotional Journey
- What emotion does this interface evoke? Is that intentional?
- Does it match the brand personality?
- **Peak-end rule**: Is the most intense moment positive? Does the experience end well?
- **Emotional valleys**: Check for onboarding frustration, error cliffs, feature discovery gaps, or anxiety at high-stakes moments (payment, delete, commit).
- **Interventions**: Are there design interventions where users are likely to feel frustrated? (progress indicators, reassurance copy, undo options, social proof)

### 5. Discoverability & Affordance
- Are interactive elements obviously interactive?
- Would a user know what to do without instructions?
- Are hover/focus states providing useful feedback?
- Are there hidden features that should be more visible?

### 6. Composition & Balance
- Does the layout feel balanced or uncomfortably weighted?
- Is whitespace used intentionally or just leftover?
- Is there visual rhythm in spacing and repetition?
- Does asymmetry feel designed or accidental?

### 7. Typography as Communication
- Does the type hierarchy clearly signal what to read first, second, third?
- Is body text comfortable to read? (line length, spacing, size)
- Do font choices reinforce the brand/tone?

### 8. Color with Purpose
- Is color used to communicate, not just decorate?
- Does the palette feel cohesive?
- Are accent colors drawing attention to the right things?
- Does it work for colorblind users?

### 9. States & Edge Cases
- **Empty states**: Do they guide users toward action, or just say "nothing here"?
- **Loading states**: Do they reduce perceived wait time?
- **Error states**: Are they helpful and non-blaming?
- **Success states**: Do they confirm and guide next steps?

### 10. Microcopy & Voice
- Is the writing clear and concise?
- Does it sound like a human (the right human for this brand)?
- Are labels and buttons unambiguous?
- Does error copy help users fix the problem?

---

## Phase 2: Present Findings

### Design Health Score

Score each of Nielsen's 10 heuristics 0–4. Present as a table:

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | ? | [specific finding or "—"] |
| 2 | Match System / Real World | ? | |
| 3 | User Control and Freedom | ? | |
| 4 | Consistency and Standards | ? | |
| 5 | Error Prevention | ? | |
| 6 | Recognition Rather Than Recall | ? | |
| 7 | Flexibility and Efficiency | ? | |
| 8 | Aesthetic and Minimalist Design | ? | |
| 9 | Error Recovery | ? | |
| 10 | Help and Documentation | ? | |
| **Total** | | **??/40** | **[Rating band]** |

Be honest. A 4 means genuinely excellent. Most real interfaces score 20–32.

### Anti-Patterns Verdict
**Start here.** Pass/fail: Does this look AI-generated? List specific tells from `DESIGN_SYSTEM.md`. Be brutally honest.

### Overall Impression
Brief gut reaction — what works, what doesn't, the single biggest opportunity.

### What's Working
2–3 things done well. Be specific about why.

### Priority Issues
3–5 most impactful problems, ordered by importance. For each:

- **[P0–P3] What**: Name the problem clearly
- **Why it matters**: How this hurts users or undermines goals
- **Fix**: Concrete recommendation

Severity guide:
- **P0**: Prevents task completion or causes data loss
- **P1**: Significant friction, confusion, or abandonment risk
- **P2**: Noticeable quality issue that degrades trust
- **P3**: Minor polish item

### Persona Red Flags

Pick 2–3 personas relevant to the interface:

- **Power User**: Keyboard shortcuts? Batch actions? Efficiency paths?
- **First-Timer**: Can they understand the UI in 10 seconds? Jargon-free?
- **Accessibility User**: Screen reader labels? Focus order? Color-only indicators?
- **Mobile User**: Touch targets? Thumb-zone layout? Hidden features?
- **Skeptical User**: Trust signals? Clear pricing? Easy exit?

For each, walk through the primary action and list specific red flags. Name exact elements and interactions that fail. Don't write generic descriptions.

### Minor Observations
Quick notes on smaller issues worth addressing.

---

## Phase 3: Recommendations

Present a prioritized action list based on findings:

1. **Polish [component]** — [specific context from critique]
2. **Redesign [section]** — [what's wrong and the direction]
3. **Add [missing element]** — [why it matters]

---

## How to Use in Lovable

Prompt examples:
- *"Critique the landing page using the critique skill"*
- *"Run a design critique on the simulator flow"*
- *"Critique the My Simulations dashboard — focus on empty states"*
- *"Do an AI slop check on the Hero section"*
