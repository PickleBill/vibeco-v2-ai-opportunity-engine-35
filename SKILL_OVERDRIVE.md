# Skill: Overdrive

> Adapted from [Impeccable Style](https://impeccable.style) `overdrive` skill for Lovable + Tailwind/shadcn/framer-motion.
> Trigger: "Apply overdrive-level polish to [component]" or "Push [target] into overdrive mode."

---

## What This Skill Does

Pushes an interface past conventional limits. Not just visual effects — it's about making any part of an interface feel extraordinary: a table that handles thousands of rows, a dialog that morphs from its trigger, a form with streaming validation, a page transition that feels cinematic.

---

## Before You Start

1. Reference `SKILL_IMPECCABLE.md` for anti-patterns, token usage, and the **Context Gathering Protocol**.
2. **Context determines what "extraordinary" means.** A particle system on a creative portfolio is impressive. The same on a settings page is embarrassing. A settings page with instant optimistic saves and animated state transitions? That's extraordinary too.

### Propose Before Building

This skill has the highest potential to misfire. Always:

1. **Think through 2–3 directions** — different techniques, ambition levels, aesthetic approaches. Describe what each would look and feel like.
2. **Present trade-offs** — browser support, performance cost, complexity.
3. **Only proceed with the confirmed direction.**

---

## What "Extraordinary" Means by Context

### Visual/marketing surfaces (Hero, landing sections)
The "wow" is sensory: scroll-driven reveals, cinematic transitions, generative art that responds to cursor movement.

### Functional UI (Tables, forms, dialogs, navigation)
The "wow" is in how it FEELS: a dialog that morphs from the button that triggered it, drag-and-drop with spring physics, streaming validation that feels instant.

### Performance-critical UI
The "wow" is invisible but felt: search that filters thousands of items without flicker, complex forms that never block the main thread.

### Data-heavy interfaces (Charts, dashboards)
The "wow" is in fluidity: animated transitions between data states, force-directed layouts that settle naturally.

**Common thread**: something about the implementation goes beyond what users expect from a web interface. The technique serves the experience.

---

## The Toolkit (Lovable-Compatible)

### Make transitions feel cinematic
- **View Transitions API** (same-document) — shared element morphing between states. A list item expanding into a detail view. A button morphing into a dialog.
- **`@starting-style`** — animate elements from `display: none` to visible with CSS only.
- **Spring physics via framer-motion** — natural motion with mass, tension, and damping instead of cubic-bezier. This is the primary animation library in the project.

### Tie animation to scroll position
- **Scroll-driven animations** (`animation-timeline: scroll()`) — CSS-only parallax, progress bars, reveal sequences. Always provide a static fallback for unsupported browsers.
- **framer-motion `useScroll` + `useTransform`** — JS-based scroll-linked animations with full control.

### Render beyond CSS
- **SVG filter chains** — displacement maps, turbulence, morphology for organic distortion. CSS-animatable.
- **Canvas 2D** — custom rendering for effects CSS can't express. Use sparingly in Lovable's sandbox.

### Make data feel alive
- **Virtual scrolling** — render only visible rows for large lists/tables. TanStack Virtual for complex cases.
- **Animated data transitions** — morph between chart states using framer-motion's `AnimatePresence` and layout animations.

### Animate complex properties
- **`@property`** — register custom CSS properties with types, enabling animation of gradients, colors, and values CSS can't normally interpolate.
- **Web Animations API** — JavaScript-driven animations with CSS performance. Composable, cancellable, reversible.

### NOT available in Lovable's sandbox
- ~~WebGPU~~ — requires native browser context
- ~~WASM modules~~ — can't compile in sandbox
- ~~Web Workers / OffscreenCanvas~~ — limited sandbox support
- ~~Device APIs~~ — orientation, ambient light, etc.

Use these when working locally with Cursor/Claude Code, not in Lovable.

---

## Implementation Rules

### Progressive enhancement is non-negotiable

Every technique must degrade gracefully:

```css
@supports (animation-timeline: scroll()) {
  .hero { animation-timeline: scroll(); }
}
```

### Performance rules
- Target 60fps. If dropping below 50, simplify.
- **Always respect `prefers-reduced-motion`** — provide a beautiful static alternative.
- Lazy-initialize heavy resources only when near viewport.
- Pause off-screen rendering.

### Polish is the difference

The gap between "cool" and "extraordinary" is the last 20%: the easing curve on a spring, the timing offset in a staggered reveal, the subtle secondary motion that makes a transition feel physical.

### NEVER
- Ignore `prefers-reduced-motion`
- Ship effects that cause jank on mid-range devices
- Use bleeding-edge APIs without a functional fallback
- Layer multiple competing extraordinary moments — focus creates impact, excess creates noise
- Use technical ambition to mask weak design fundamentals — fix those first

---

## Verify the Result

- **The wow test**: Show it to someone. Do they react?
- **The removal test**: Take it away. Does the experience feel diminished?
- **The device test**: Run it on a phone. Still smooth?
- **The accessibility test**: Enable reduced motion. Still beautiful?
- **The context test**: Does this make sense for THIS brand and audience?

---

## How to Use in Lovable

Prompt examples:
- *"Apply overdrive-level polish to the Hero section"*
- *"Push the SpeedTimeline into overdrive mode"*
- *"Make the simulator transition feel cinematic using overdrive"*
- *"Add scroll-driven animation to the project showcase — overdrive style"*
