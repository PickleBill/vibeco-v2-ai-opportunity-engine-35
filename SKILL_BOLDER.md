# Skill: Bolder

> Adapted from [Impeccable Style](https://impeccable.style) `bolder` skill for Lovable + Tailwind/shadcn/framer-motion.
> Trigger: "Make [component] bolder" or "Push [target] to be more distinctive."

---

## What This Skill Does

Increases visual impact and personality in designs that are too safe, generic, or visually underwhelming. Creates more engaging and memorable experiences.

**CRITICAL**: "Bolder" doesn't mean chaotic or garish. It means distinctive, memorable, and confident. Think intentional drama, not random chaos.

---

## Before You Start

1. Reference `SKILL_IMPECCABLE.md` for anti-patterns, token usage, and the **Context Gathering Protocol**.
2. If no design context exists in `.impeccable.md`, you MUST run impeccable teach first.

---

## Assess Current State

Analyze what makes the design feel too safe or boring:

1. **Identify weakness sources**:
   - **Generic choices**: System fonts, basic colors, standard layouts
   - **Timid scale**: Everything is medium-sized with no drama
   - **Low contrast**: Everything has similar visual weight
   - **Static**: No motion, no energy, no life
   - **Predictable**: Standard patterns with no surprises
   - **Flat hierarchy**: Nothing stands out or commands attention

2. **Understand the context**:
   - What's the brand personality? (How far can we push?)
   - What's the purpose? (Marketing can be bolder than dashboards)
   - Who's the audience? (What will resonate?)
   - What are the constraints? (Accessibility, performance)

---

## Plan Amplification

Create a strategy before touching code:

- **Focal point**: What should be the hero moment? (Pick ONE, make it amazing)
- **Personality direction**: Maximalist chaos? Elegant drama? Playful energy? Dark moody? Choose a lane.
- **Risk budget**: How experimental can we be?
- **Hierarchy amplification**: Make big things BIGGER, small things smaller (increase contrast)

**IMPORTANT**: Bold design must still be usable. Impact without function is just decoration.

---

## Amplify the Design

### Typography Amplification
- **Replace generic fonts**: Follow the Font Anti-Attractor Procedure in `SKILL_IMPECCABLE.md`
- **Extreme scale**: Create dramatic size jumps (3x-5x differences, not 1.5x)
- **Weight contrast**: Pair 900 weights with 200 weights, not 600 with 400
- **Unexpected choices**: Variable fonts, display fonts for headlines, condensed/extended widths

### Color Intensification
- **Increase saturation**: Shift to more vibrant, energetic colors (but not neon)
- **Bold palette**: Introduce unexpected color combinations — avoid the purple-blue gradient AI slop
- **Dominant color strategy**: Let one bold color own 60% of the design
- **Tinted neutrals**: Replace pure grays with tinted grays that harmonize

### Spatial Drama
- **Extreme scale jumps**: Make important elements 3-5x larger than surroundings
- **Break the grid**: Let hero elements escape containers and cross boundaries
- **Asymmetric layouts**: Replace centered, balanced layouts with tension-filled asymmetry
- **Generous space**: Use whitespace dramatically (100-200px gaps, not 20-40px)
- **Overlap**: Layer elements intentionally for depth

### Visual Effects
- **Dramatic shadows**: Large, soft shadows for elevation (not generic drop shadows on rounded rectangles)
- **Background treatments**: Mesh patterns, noise textures, geometric patterns, intentional gradients
- **Texture & depth**: Grain, halftone, duotone — NOT glassmorphism (it's overused AI slop)
- **Custom elements**: Illustrative elements, decorative details that reinforce brand

### Motion & Animation
- **Entrance choreography**: Staggered, dramatic page load with 50-100ms delays
- **Scroll effects**: Parallax, reveal animations, scroll-triggered sequences
- **Micro-interactions**: Satisfying hover effects, click feedback, state changes
- **Transitions**: Smooth using `ease-out-quart`/`quint`/`expo` — never bounce or elastic

### Composition Boldness
- **Hero moments**: Create clear focal points with dramatic treatment
- **Full-bleed elements**: Use full viewport width/height for impact
- **Unexpected proportions**: Try 70/30, 80/20 splits instead of 50/50

---

## WARNING — AI Slop Trap

When making things "bolder," AI defaults to the same tired tricks: cyan/purple gradients, glassmorphism, neon accents on dark backgrounds, gradient text on metrics. These are the OPPOSITE of bold — they're generic. Review ALL the NEVER guidelines in `SKILL_IMPECCABLE.md` before proceeding.

---

## Verify Quality

- **NOT AI slop**: Does this look like every other AI-generated "bold" design? If yes, start over.
- **Still functional**: Can users accomplish tasks without distraction?
- **Coherent**: Does everything feel intentional and unified?
- **Memorable**: Will users remember this experience?
- **Performant**: Do all effects run smoothly?
- **Accessible**: Does it still meet accessibility standards?

**The test**: If you showed this to someone and said "AI made this bolder," would they believe you immediately? If yes, you've failed.

---

## NEVER
- Add effects randomly without purpose
- Sacrifice readability for aesthetics
- Make everything bold (then nothing is bold — need contrast)
- Ignore accessibility
- Overwhelm with motion (animation fatigue is real)
- Copy trendy aesthetics blindly (bold means distinctive, not derivative)

---

## How to Use in Lovable

Prompt examples:
- *"Make the Hero section bolder"*
- *"Push the Services cards to be more distinctive"*
- *"Make the FinalCta bolder — it's too safe right now"*
