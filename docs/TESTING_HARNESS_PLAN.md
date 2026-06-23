# Proposal — a self-contained testing harness for every new feature

**Status:** Proposal v1 · P0 shipped (Signal Mine report harness)
**Ask it answers:** "Build a self-contained testing harness for any new feature — show me
sample outputs (what we did, the scans we ran), pulled back into a non-technical HTML/MD view,
for rapid testing as we build."

---

## The principle

> **Every feature ships with a one-click artifact a non-engineer can open and understand.**

Not a test suite you read in a terminal — a *shareable page* that says "here's what this does,
here's real(istic) output, here's whether it's working." This keeps you in the loop on every
build without needing to read code or run anything, and it doubles as our QA + demo + stakeholder
update in one file.

Three properties, always:
1. **Self-contained** — one HTML (or MD) file, opens in any browser, no install.
2. **Two modes** — *sample mode* (runs offline on a fixture, always works) and *live mode*
   (renders real output when a backend/keys are available). Same renderer, same report shape.
3. **Shareable** — served straight from the public `vibeco` repo via raw.githack.com, so a link
   is instant — no deploy required.

---

## Why this matters (CPO lens)

You're building a portfolio of AI features fast. The risk isn't writing code — it's *losing
visibility* into what each piece actually does. A harness per feature means: every push, you get
a link; you eyeball it in 60 seconds; you approve or redirect. It turns "trust me, it works" into
"see for yourself."

---

## Architecture (small, boring, reusable on purpose)

```
tools/<feature>-harness/
  fixtures/<case>.json        ← representative input/output (the "sample mode" data)
  generate-report.mjs         ← zero-dep Node renderer: JSON -> self-contained HTML
aces/preview/                 ← committed reports + the hub (githack-served links)
  index.html                  ← the preview hub (links every report)
  <feature>-report.html
```

- **No dependencies, no build.** Plain Node + string templates. Anyone can run it; nothing to break.
- **One renderer per feature**, but a shared visual language (dark theme, the same cards/sparklines).
- **The fixture is the contract.** It mirrors exactly what the live function returns, so sample
  mode and live mode never drift.

The Signal Mine harness (`tools/signal-harness/`) is the reference implementation.

---

## Phased plan

| Phase | What | Status |
|---|---|---|
| **P0 — Signal Mine report** | `generate-report.mjs` + fixture → the scan report (raw → themes+trends → candidates → Now/Next/Later roadmap). Hosted on the preview hub. | ✅ done |
| **P1 — Live-mode wiring** | A `--live` flag (or a tiny script) that calls `signal-collect`+`signal-process`, captures the JSON, and renders the *same* report from real data. One command → real report. | next |
| **P2 — Harness for Pulse P2** | When opportunity scoring (RICE/strategy-fit) lands, extend the report with a "scoring math" panel so you can see *why* each item ranks where it does. | with Pulse P2 |
| **P3 — NiceAce flow harness** | A checklist-style report that walks the NiceAce screens (Arrive→Pay→Celebrate→Live→Ace) with screenshots/states, so design changes are reviewable without clicking through. | with NiceAce build |
| **P4 — Harness index + CI** | Auto-regenerate all reports on each push (GitHub Action) and refresh the hub, so the links are always current. | infra |
| **P5 — MD digests** | A markdown version of each report for pasting into Slack/email/Notion (you mentioned both Slack + email MCPs are connected). | when useful |

**Prioritization:** P0 first (done — it's the highest-value "see it" artifact). Then P1 (live
mode) so the same page shows real data the moment the backend is reachable. Everything else rides
along with the feature it tests — no separate "testing project," just a rule that every feature
brings its harness.

---

## What's live right now (this push)

- **NiceAce prototype** — interactive, faithful to your Claude Design. Link below.
- **Signal Mine scan report** — sample run, full pipeline visualized. Link below.
- **Preview hub** — one page linking both + a live/coming status board.
- **The harness itself** — `tools/signal-harness/`, reusable + documented.

All served via `raw.githack.com/PickleBill/vibeco/main/aces/preview/index.html` — no deploy needed.
