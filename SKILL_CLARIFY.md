# Skill: Clarify

> Adapted from [Impeccable Style](https://impeccable.style) `clarify` skill for Lovable + Tailwind/shadcn.
> Trigger: "Clarify the copy on [component]" or "Run the clarify skill on [target]."

---

## What This Skill Does

Rewrites interface copy to be shorter, clearer, and more actionable. Covers headings, body text, CTAs, error messages, empty states, tooltips, loading states, and onboarding text. The goal: every word earns its place.

---

## Before You Start

1. Reference `SKILL_IMPECCABLE.md` for tone and component patterns.
2. Identify:
   - Who is reading this copy? (New user? Power user? Admin?)
   - What do they need to *do* after reading it?
   - What's their emotional state? (Confused? Excited? Frustrated?)
   - How much context do they already have?

**CRITICAL**: Clarity is not the same as brevity. Short but vague is worse than slightly longer but clear.

---

## Core Principles

### Front-Load the Action
- Lead with what users can do, not what happened
- Put the verb first in CTAs: "Create project" not "Project creation"
- Put the outcome first in descriptions: "Your report is ready" not "The system has finished generating your report"

### Kill Filler Words
Remove these unless they add meaning:
- "Please" (in error messages — users don't need politeness, they need solutions)
- "Simply" / "Just" / "Easily" (if it were simple, you wouldn't need to say so)
- "In order to" → "To"
- "Make sure to" → just state the action
- "Note that" / "Please note" → just state the fact
- "Successfully" → the action itself implies success

### One Idea Per Sentence
- If a sentence has "and" connecting two different ideas, split it
- If a tooltip needs more than ~15 words, the UI probably needs redesigning
- If an error message needs a paragraph, the error is too complex

### Be Specific Over Generic
- ❌ "Something went wrong"
- ✅ "Couldn't save your report. Check your connection and try again."
- ❌ "Are you sure?"
- ✅ "Delete this simulation? You can't undo this."
- ❌ "Loading..."
- ✅ "Analyzing your idea…" or "Building your report…"

### Match the User's Mental Model
- Use their words, not your internal jargon
- "Save" not "Persist", "Report" not "Artifact", "Sign in" not "Authenticate"
- If you must use a technical term, define it inline on first use

---

## Copy Patterns

### Headings
- **Rule**: State the benefit or action, not the category
- ❌ "Settings" → ✅ "Customize your experience"
- ❌ "Error" → ✅ "Something didn't work"
- ❌ "Features" → ✅ "What you can build"
- Exception: Navigation labels should be short category words ("Settings", "Reports")

### CTAs (Buttons & Links)
- **Rule**: Verb + object. 2-4 words. No articles.
- ❌ "Click here to get started" → ✅ "Start simulation"
- ❌ "Submit" → ✅ "Send message" or "Save report"
- ❌ "Learn more" → ✅ "See how it works" or "View example"
- **Primary vs secondary**: Primary CTA = the thing you want them to do. Secondary = the escape hatch. Primary gets a verb; secondary can be softer ("Not now", "Skip", "Maybe later").

### Error Messages
- **Structure**: What happened → Why → What to do
- ❌ "Error 500: Internal server error"
- ✅ "Couldn't analyze your idea. Our AI hit a snag — try again in a moment."
- ❌ "Invalid input"
- ✅ "Ideas need at least 10 characters. Add a bit more detail."
- **Tone**: Calm, not apologetic. Helpful, not defensive.

### Empty States
- **Structure**: What will be here → Why it matters → How to start
- ❌ "No data found."
- ✅ "No simulations yet. Run your first one to see AI-powered business analysis here."
- Always include a CTA button, never just text.

### Loading States
- **Rule**: Tell users what's happening, not that something is happening
- ❌ "Loading..."
- ✅ "Analyzing market fit…"
- ❌ "Please wait"
- ✅ "Building your report (usually takes 10-15 seconds)"
- If loading takes >3 seconds, add a time estimate or progress indicator.

### Tooltips & Hints
- **Rule**: One sentence. Answer "what does this do?" not "what is this?"
- ❌ "This is the highlight feature"
- ✅ "Mark sections that resonate — they'll get extra detail in your final prompt"
- ❌ "Click to toggle"
- ✅ "Flag sections to de-emphasize in your prompt"

### Confirmation Dialogs
- **Rule**: State the consequence, not the action
- ❌ "Are you sure you want to restart?"
- ✅ "Start over? Your current analysis will be lost."
- **Buttons**: Use specific verbs, not "Yes/No"
- ❌ "Yes" / "No" → ✅ "Start over" / "Keep working"

### Success Messages
- **Rule**: Confirm what happened + suggest next step
- ❌ "Success!"
- ✅ "Report saved. Share it or copy your Lovable prompt below."
- ❌ "Your changes have been saved successfully."
- ✅ "Saved. Your team can see updates now."

### Placeholder Text
- **Rule**: Show a realistic example, not instructions
- ❌ "Enter your idea here"
- ✅ "An app that lets dog owners find verified pet sitters nearby…"
- ❌ "Type your message"
- ✅ "What's on your mind?"

---

## VibeCo-Specific Context

- **Audience**: Non-technical founders, indie hackers, aspiring builders
- **Tone**: Confident but approachable. Expert without being condescending.
- **Voice**: Direct, warm, action-oriented. Like a smart friend who builds things.
- **Avoid**: Corporate speak ("leverage", "synergy"), over-enthusiasm ("Amazing!!"), hedging ("We think maybe this could potentially…")
- **Embrace**: Concrete language ("Build", "Test", "Ship"), honest assessments, clear next steps

---

## Process

### Step 1: Audit
Read all copy in the target component/page. Flag:
- Filler words
- Passive voice
- Vague CTAs
- Missing context (what happens if I click this?)
- Jargon or internal language
- Inconsistent terminology (same thing called different names)

### Step 2: Rewrite
For each flagged item, provide:
- **Before**: The current copy
- **After**: The rewritten copy
- **Why**: One sentence explaining the change

### Step 3: Consistency Check
- Are the same actions called the same thing everywhere?
- Do error messages follow the same structure?
- Are CTAs using consistent verb patterns?
- Is the tone consistent across states (happy path, error, empty)?

---

## NEVER
- Replace clear copy with clever copy (clarity > creativity)
- Use different words for the same action in different places
- Write error messages that blame the user
- Use "please" in error messages (it's padding, not politeness)
- Write tooltips longer than one sentence
- Use "click here" as link text (accessibility anti-pattern)
- Assume users know your internal terminology
- Write confirmation dialogs with "Yes/No" buttons

---

## How to Use in Lovable

Prompt examples:
- *"Clarify the copy on the simulator input page"*
- *"Run the clarify skill on the My Simulations empty state"*
- *"Clarify all error messages in the simulator flow"*
- *"Clarify the Thunderdome section labels and descriptions"*
- *"Audit the homepage copy using the clarify skill"*
