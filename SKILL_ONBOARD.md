# Skill: Onboard

> Adapted from [Impeccable Style](https://impeccable.style) `onboard` skill for Lovable + Tailwind/shadcn.
> Trigger: "Design the onboarding for [feature] using the onboard skill" or "Improve the empty state for [component]."

---

## What This Skill Does

Creates or improves onboarding experiences that help users understand, adopt, and succeed with the product quickly. Also covers empty states, first-run experiences, and progressive feature discovery.

---

## Before You Start

1. Reference `SKILL_IMPECCABLE.md` for anti-patterns, token usage, and the **Context Gathering Protocol** (especially Empty States and Loading States).
2. Identify:
   - What are users trying to accomplish?
   - What's the "aha moment" we want users to reach?
   - What's their experience level?
   - What's their time commitment? (5 minutes? 30 minutes?)

**CRITICAL**: Onboarding should get users to value as quickly as possible, not teach everything.

---

## Core Principles

### Show, Don't Tell
- Demonstrate with working examples, not descriptions
- Provide real functionality during onboarding, not a separate tutorial mode
- Use progressive disclosure — teach one thing at a time

### Make It Optional
- Let experienced users skip onboarding
- Don't block access to the product
- Provide "Skip" or "I'll explore on my own" options

### Time to Value
- Get users to their "aha moment" ASAP
- Front-load the most important concepts
- Teach the 20% that delivers 80% of value
- Save advanced features for contextual discovery

### Context Over Ceremony
- Teach features when users need them, not upfront
- Empty states ARE onboarding opportunities
- Tooltips and hints at point of use

### Respect User Intelligence
- Don't patronize or over-explain
- Be concise and clear
- Assume users can figure out standard patterns

---

## Onboarding Patterns

### Initial Product Onboarding

**Welcome Screen:**
- Clear value proposition (what is this product?)
- What users will learn/accomplish
- Honest time estimate
- Option to skip

**Account Setup:**
- Minimal required information (collect more later)
- Explain why you're asking for each piece
- Smart defaults where possible

**Core Concept Introduction:**
- Introduce 1–3 core concepts (not everything)
- Use simple language and examples
- Interactive when possible (do, don't just read)
- Progress indication (step 1 of 3)

**First Success:**
- Guide users to accomplish something real
- Pre-populated examples or templates
- Celebrate completion (but don't overdo it)
- Clear next steps

### Feature Discovery & Adoption

**Contextual Tooltips:**
- Appear at relevant moment (first time user sees feature)
- Point directly at relevant UI element
- Brief explanation + benefit
- Dismissable with "Don't show again" option

**Progressive Onboarding:**
- Teach features when users encounter them
- Badges or indicators on new/unused features
- Unlock complexity gradually

### Guided Tours (When Needed)
- Complex interfaces with many features
- Spotlight specific UI elements (dim rest of page)
- Keep steps short (3–7 steps max)
- Always include "Skip tour" option
- Make replayable from a help menu
- Focus on workflow, not features ("Create a project" not "This is the project button")

---

## Empty State Design

Every empty state needs five things:

### 1. What Will Be Here
"Your recent simulations will appear here"

### 2. Why It Matters
"Simulations help you stress-test ideas before building"

### 3. How to Get Started
`[Run your first simulation]` or `[See an example]`

### 4. Visual Interest
Illustration or icon — not just text on a blank page. Follow `DESIGN_SYSTEM.md`: "Show an illustration or icon + a helpful action. Never just 'No data found.'"

### 5. Contextual Help
"Need help getting started? [Watch 2-min tutorial]"

**Empty state types:**
- **First use**: Never used this feature → emphasize value, provide template
- **User cleared**: Intentionally deleted everything → light touch, easy to recreate
- **No results**: Search/filter returned nothing → suggest different query, offer to clear filters
- **No permissions**: Can't access → explain why, how to get access
- **Error state**: Failed to load → explain what happened, offer retry

---

## Implementation in Lovable

### State tracking
```typescript
// Track onboarding completion in localStorage
const ONBOARDING_KEY = 'vibeco-onboarding-completed';
const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY) === 'true';

// Track individual tooltips
const TOOLTIP_PREFIX = 'tooltip-seen-';
const hasSeenTooltip = (id: string) =>
  localStorage.getItem(`${TOOLTIP_PREFIX}${id}`) === 'true';
```

For persistent tracking across devices, use Lovable Cloud to store onboarding state per user.

### Component patterns
- Use shadcn `Tooltip` for contextual hints
- Use `Dialog` for welcome screens (but prefer inline over modal per `DESIGN_SYSTEM.md`)
- Use framer-motion `AnimatePresence` for smooth reveal of onboarding elements
- Use `Skeleton` components for loading states, not spinners

---

## NEVER
- Force users through long onboarding before they can use the product
- Patronize users with obvious explanations
- Show the same tooltip repeatedly (respect dismissals)
- Block all UI during a tour (let users explore)
- Create a separate tutorial mode disconnected from the real product
- Overwhelm with information upfront (progressive disclosure!)
- Hide "Skip" or make it hard to find
- Forget about returning users (don't show initial onboarding again)

---

## Verify Onboarding Quality

- **Time to completion**: Can users complete onboarding quickly?
- **Comprehension**: Do users understand after completing?
- **Action**: Do users take the desired next step?
- **Skip rate**: Are too many users skipping? (Maybe it's too long)
- **Completion rate**: Are users finishing? (If low, simplify)
- **Time to value**: How long until users get first value?

---

## How to Use in Lovable

Prompt examples:
- *"Design the onboarding for the simulator using the onboard skill"*
- *"Improve the empty state on My Simulations using the onboard skill"*
- *"Add a first-run experience for new users using the onboard skill"*
- *"Critique the current onboarding flow using onboard principles"*
