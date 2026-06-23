# Skill: Polish

> Adapted from [Impeccable Style](https://impeccable.style) `polish` skill for Lovable + Tailwind/shadcn.
> Trigger: "Polish [component]" or "Run a polish pass on [target]."

---

## What This Skill Does

Performs a meticulous final pass to catch all the small details that separate good work from great work. The difference between shipped and polished.

**CRITICAL**: Polish is the last step, not the first. Don't polish work that's not functionally complete.

---

## Before You Start

1. Reference `SKILL_IMPECCABLE.md` for anti-patterns, token usage, and the **Context Gathering Protocol**.
2. If no design context exists in `.impeccable.md`, you MUST run impeccable teach first.
3. Determine the quality bar: MVP or flagship?

---

## Pre-Polish Assessment

1. **Review completeness**:
   - Is it functionally complete?
   - Are there known issues to preserve (mark with TODOs)?
   - What's the quality bar? (MVP vs flagship?)
   - When does it ship?

2. **Identify polish areas**:
   - Visual inconsistencies
   - Spacing and alignment issues
   - Interaction state gaps
   - Copy inconsistencies
   - Edge cases and error states
   - Loading and transition smoothness

---

## Polish Systematically

### Visual Alignment & Spacing
- **Pixel-perfect alignment**: Everything lines up to grid
- **Consistent spacing**: All gaps use the spacing scale (no random values)
- **Optical alignment**: Adjust for visual weight (icons may need offset)
- **Responsive consistency**: Spacing works at all breakpoints

### Typography Refinement
- **Hierarchy consistency**: Same elements use same sizes/weights throughout
- **Line length**: 45-75 characters for body text
- **Line height**: Appropriate for font size and context
- **Font loading**: No FOUT/FOIT flashes

### Color & Contrast
- **Contrast ratios**: All text meets WCAG standards
- **Consistent token usage**: No hard-coded colors, all use design tokens
- **Theme consistency**: Works in all theme variants
- **Tinted neutrals**: No pure gray or pure black

### Interaction States

Every interactive element needs all states:
- **Default**: Resting state
- **Hover**: Subtle feedback
- **Focus**: Keyboard focus indicator (never remove without replacement)
- **Active**: Click/tap feedback
- **Disabled**: Clearly non-interactive
- **Loading**: Async action feedback
- **Error**: Validation or error state
- **Success**: Successful completion

### Micro-interactions & Transitions
- **Smooth transitions**: All state changes animated (150-300ms)
- **Consistent easing**: `ease-out-quart`/`quint`/`expo` — never bounce or elastic
- **No jank**: 60fps, only animate transform and opacity
- **Reduced motion**: Respects `prefers-reduced-motion`

### Content & Copy
- **Consistent terminology**: Same things called same names
- **Consistent capitalization**: Title Case vs Sentence case applied uniformly
- **Grammar & spelling**: No typos
- **Punctuation consistency**: Periods on sentences, not on labels

### Icons & Images
- **Consistent style**: All icons from same family (lucide-react)
- **Appropriate sizing**: Sized consistently for context
- **Proper alignment**: Icons align with adjacent text optically
- **Alt text**: All images have descriptive alt text

### Forms & Inputs
- **Label consistency**: All inputs properly labeled
- **Required indicators**: Clear and consistent
- **Error messages**: Helpful and consistent
- **Tab order**: Logical keyboard navigation

### Edge Cases & Error States
- **Loading states**: All async actions have loading feedback
- **Empty states**: Helpful, not just blank space
- **Error states**: Clear messages with recovery paths
- **Long content**: Handles very long names, descriptions, etc.

### Responsiveness
- **All breakpoints**: Test mobile, tablet, desktop
- **Touch targets**: 44x44px minimum on touch devices
- **Readable text**: No text smaller than 14px on mobile
- **No horizontal scroll**: Content fits viewport

---

## Polish Checklist

- [ ] Visual alignment perfect at all breakpoints
- [ ] Spacing uses design tokens consistently
- [ ] Typography hierarchy consistent
- [ ] All interactive states implemented
- [ ] All transitions smooth (60fps)
- [ ] Copy is consistent and polished
- [ ] Icons are consistent and properly sized
- [ ] All forms properly labeled and validated
- [ ] Error states are helpful
- [ ] Loading states are clear
- [ ] Empty states are welcoming
- [ ] Touch targets are 44x44px minimum
- [ ] Contrast ratios meet WCAG AA
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] No console errors or warnings
- [ ] Respects reduced motion preference
- [ ] Code is clean (no TODOs, console.logs, commented code)

---

## NEVER
- Polish before it's functionally complete
- Introduce bugs while polishing (test thoroughly)
- Ignore systematic issues (if spacing is off everywhere, fix the system)
- Perfect one thing while leaving others rough (consistent quality level)

---

## How to Use in Lovable

Prompt examples:
- *"Polish the simulator shell"*
- *"Run a polish pass on the landing page"*
- *"Polish the contact form before we ship"*
