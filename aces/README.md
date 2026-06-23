# NiceAce

**Scan the QR on the tee. Pay $10. Ace the hole, win the whole pot.**

NiceAce turns any Par 3 into a live, growing, **winner-takes-all hole-in-one jackpot** —
no app install, entry in three taps via Apple Pay. The hole-in-one is golf's most viral
moment; NiceAce attaches money, verification, and a shareable win to it, and uses the
course as the distribution channel.

> Part of the **Courtana** ecosystem and the first consumer vertical spun out of the
> VibeCo "vibe-coding-on-demand" engine — see
> [`/docs/VIBECO_X_ACES_INTEGRATION.md`](../docs/VIBECO_X_ACES_INTEGRATION.md).

---

## Run the prototype

Single self-contained file — **no build step.**

```sh
open aces/prototype/niceace-prototype.html      # macOS — or drag into any browser
```

It's a faithful reconstruction of the Claude Design export (the export referenced external
`aces.css`/`aces.js` that weren't included, so those are rebuilt inline from the HTML
structure + concept board).

### What works
- **Full five-view flow:** Arrive (post-QR) → Pay (tap the Face-ID ring) → Celebrate →
  Live Pot → **Ace win**. The pot and field count update live; the live feed tickers.
- **Look toggle:** **Jackpot** (Vegas/gold) ↔ **Broadcast** (sportsbook feed).
- **Button toggle:** Classic ↔ Kinetic CTA. **↺ Restart** resets the flow.
- Try **"Simulate: I aced it"** (Celebrate) or **"I aced it"** (Live) to fire the win overlay.

### Mocked
- No real payments, auth, verification, or backend. Pot math is the design's ($10/entry).
- Real money is a licensed-partner + jurisdiction decision — see the PRD's Compliance section.

---

## Folder layout

```
aces/
  README.md                       ← you are here
  prototype/
    niceace-prototype.html        ← the working prototype (canonical)
  design/
    source/                       ← original Claude Design exports (reference, version-controlled)
      Aces-Prototype.html
      Aces-Concept-Board.html     ← 5 aesthetic directions
      design-canvas.jsx           ← the Figma-like canvas wrapper (infra, not product design)
    INTAKE.md                     ← how to bring new Claude Design files into the repo
```

---

## Design intake (Claude Design → Claude Code)

There is **no direct, automated bridge** from Claude Design to this Claude Code environment
today: the design API (`api.anthropic.com/v1/design/...`) needs your authenticated browser
session, and this cloud session has no computer-use/browser tool to log in as you. The
working path is: **download the design package from Claude Design → upload it here** (what
you did). See [`design/INTAKE.md`](./design/INTAKE.md) for the lightweight convention.

---

## Docs

| Doc | What |
|---|---|
| [`/docs/PRODUCT_STRATEGY.md`](../docs/PRODUCT_STRATEGY.md) | Executive overview — the two-pronged plan + sequencing. |
| [`/docs/NICEACE_PRD.md`](../docs/NICEACE_PRD.md) | **Prong 1** — NiceAce v1 PRD (the QR jackpot). |
| [`/docs/VIBECO_X_ACES_INTEGRATION.md`](../docs/VIBECO_X_ACES_INTEGRATION.md) | **Prong 2** — wiring NiceAce back into the VibeCo agent/MCP ecosystem. |
| [`/docs/SOCIAL_LISTENING_PRD.md`](../docs/SOCIAL_LISTENING_PRD.md) | Signal Mine — Reddit/X/reviews → pain-point → feature pipeline. |
