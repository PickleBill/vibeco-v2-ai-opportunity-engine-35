# Skill: Audit

> Adapted from [Impeccable Style](https://impeccable.style) `audit` skill for Lovable + Tailwind/shadcn.
> Trigger: "Audit [component/page]" or "Run the audit skill on [target]."

---

## What This Skill Does

Runs systematic **technical** quality checks and generates a comprehensive report. Doesn't fix issues — documents them for other skills to address.

This is a code-level audit, not a design critique. Check what's measurable and verifiable in the implementation. For UX-level evaluation, use the Critique skill instead.

---

## Before You Start

1. Reference `SKILL_IMPECCABLE.md` for anti-patterns, token usage, and the **Context Gathering Protocol**.
2. If no design context exists in `.impeccable.md`, you MUST run impeccable teach first.

---

## Diagnostic Scan

Run comprehensive checks across 5 dimensions. Score each dimension 0-4.

### 1. Accessibility (A11y)

**Check for:**
- **Contrast issues**: Text contrast ratios < 4.5:1 (or 7:1 for AAA)
- **Missing ARIA**: Interactive elements without proper roles, labels, or states
- **Keyboard navigation**: Missing focus indicators, illogical tab order, keyboard traps
- **Semantic HTML**: Improper heading hierarchy, missing landmarks, divs instead of buttons
- **Alt text**: Missing or poor image descriptions
- **Form issues**: Inputs without labels, poor error messaging, missing required indicators

**Score**: 0=Inaccessible (fails WCAG A), 1=Major gaps, 2=Partial, 3=Good (WCAG AA mostly met), 4=Excellent (WCAG AA fully met)

### 2. Performance

**Check for:**
- **Layout thrashing**: Reading/writing layout properties in loops
- **Expensive animations**: Animating layout properties instead of transform/opacity
- **Missing optimization**: Images without lazy loading, unoptimized assets
- **Bundle size**: Unnecessary imports, unused dependencies
- **Render performance**: Unnecessary re-renders, missing memoization

**Score**: 0=Severe issues, 1=Major problems, 2=Partial, 3=Good, 4=Excellent

### 3. Theming

**Check for:**
- **Hard-coded colors**: Colors not using design tokens
- **Broken dark mode**: Missing dark mode variants, poor contrast in dark theme
- **Inconsistent tokens**: Using wrong tokens, mixing token types
- **Theme switching issues**: Values that don't update on theme change

**Score**: 0=No theming, 1=Minimal tokens, 2=Partial, 3=Good, 4=Excellent

### 4. Responsive Design

**Check for:**
- **Fixed widths**: Hard-coded widths that break on mobile
- **Touch targets**: Interactive elements < 44x44px
- **Horizontal scroll**: Content overflow on narrow viewports
- **Text scaling**: Layouts that break when text size increases
- **Missing breakpoints**: No mobile/tablet variants

**Score**: 0=Desktop-only, 1=Major issues, 2=Partial, 3=Good, 4=Excellent

### 5. Anti-Patterns (CRITICAL)

Check against ALL the NEVER guidelines in `SKILL_IMPECCABLE.md`. Look for AI slop tells (AI color palette, gradient text, glassmorphism, hero metrics, card grids, banned fonts) and general design anti-patterns (gray on color, nested cards, bounce easing, redundant copy).

**Score**: 0=AI slop gallery (5+ tells), 1=Heavy AI aesthetic (3-4), 2=Some tells (1-2), 3=Mostly clean, 4=No AI tells

---

## Generate Report

### Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | ? | [most critical issue] |
| 2 | Performance | ? | |
| 3 | Responsive Design | ? | |
| 4 | Theming | ? | |
| 5 | Anti-Patterns | ? | |
| **Total** | | **??/20** | **[Rating band]** |

**Rating bands**: 18-20 Excellent, 14-17 Good, 10-13 Acceptable, 6-9 Poor, 0-5 Critical

### Anti-Patterns Verdict
**Start here.** Pass/fail: Does this look AI-generated? List specific tells. Be brutally honest.

### Executive Summary
- Audit Health Score: **??/20** ([rating band])
- Total issues by severity (P0/P1/P2/P3)
- Top 3-5 critical issues
- Recommended next steps

### Detailed Findings by Severity

Tag every issue with **P0-P3 severity**:
- **P0 Blocking**: Prevents task completion — fix immediately
- **P1 Major**: Significant difficulty or WCAG AA violation — fix before release
- **P2 Minor**: Annoyance, workaround exists — fix in next pass
- **P3 Polish**: Nice-to-fix — fix if time permits

For each issue:
- **[P?] Issue name**
- **Location**: Component, file, line
- **Category**: Accessibility / Performance / Theming / Responsive / Anti-Pattern
- **Impact**: How it affects users
- **Recommendation**: How to fix it
- **Suggested skill**: Which skill to use (Bolder, Polish, Clarify, Overdrive, etc.)

### Patterns & Systemic Issues
Identify recurring problems that indicate systemic gaps rather than one-off mistakes.

### Positive Findings
Note what's working well — good practices to maintain and replicate.

---

## Recommended Actions

List recommended skills in priority order (P0 first):

1. **[P?] `Skill Name`** — Brief description (specific context)
2. **[P?] `Skill Name`** — Brief description (specific context)

End with `Polish` as the final step if any fixes were recommended.

After presenting the report:

> You can ask me to run these one at a time, all at once, or in any order you prefer.
> Re-run `Audit` after fixes to see your score improve.

---

## NEVER
- Report issues without explaining impact
- Provide generic recommendations — be specific and actionable
- Skip positive findings
- Forget to prioritize — everything can't be P0
- Report false positives without verification

---

## How to Use in Lovable

Prompt examples:
- *"Audit the Hero section"*
- *"Run the audit skill on the simulator flow"*
- *"Audit the whole site for accessibility issues"*
