# PRD — NiceAce v1

**Owner:** Bill / Courtana · **Status:** Draft v2 (rewritten against the real design)
**Prong:** 1 of 2 (ship NiceAce) · **Prototype:** [`/aces/prototype/niceace-prototype.html`](../aces/prototype/niceace-prototype.html)
**Source design:** [`/aces/design/source/`](../aces/design/source/) (Claude Design export)

> **v1 → v2 note:** my first draft modeled NiceAce as a social *skins/side-game tracker*.
> The actual design is a **single-hole, QR-activated, winner-takes-all hole-in-one
> jackpot.** This PRD is rewritten around that real concept.

---

## 1. One-liner

**Scan the QR on the tee. Pay $10. Ace the hole, win the whole pot.**
NiceAce turns any Par 3 into a live, growing, winner-takes-all hole-in-one jackpot —
no app install, entry in three taps via Apple Pay.

## 2. The mechanic (what the prototype demonstrates)

A five-step "signature moment," exactly as designed:

1. **Arrive** — golfer scans a QR on the tee → instant web experience (no install). Sees
   the hole (Hole 7 · Par 3 · 106 yds), and **TODAY'S ACE POT: $48,750**, growing $10 per entry.
2. **Pay** — Apple Pay sheet, Face ID confirm. $10. One ticket.
3. **Celebrate** — "YOU'RE IN! Entry #138." The pot ticks up; *you* pushed it.
4. **Live Pot** — a live dashboard: the pot growing in real time, who's on the tee, this
   month's aces (trophy room), "invite your foursome." Tabs: Pot / Friends / Trophies / You.
5. **Ace win** — "HOLE IN ONE!" Verified by NiceAce → **the entire pot is yours**, payout
   that night.

Two aesthetic directions are in the design (toggle in the prototype): **Jackpot** (Vegas
lottery, gold) and **Broadcast** (sportsbook feed). Concept board also explores Clubhouse,
Heritage, and Kinetic. → see [`/aces/design/source/Aces-Concept-Board.html`](../aces/design/source/Aces-Concept-Board.html).

## 3. Why this is the right product

- **The moment is the product.** A hole-in-one is golf's most viral event. NiceAce attaches
  *money + verification + a shareable artifact* to it. Every winner is a marketing event.
- **Zero-friction entry.** QR + Apple Pay + no install kills the single biggest drop-off in
  consumer golf apps. The course is the distribution channel; the tee is the storefront.
- **The pot is self-marketing.** "Winner takes all, and it grows $10 every entry" is a
  flywheel: more players → bigger pot → more reason to enter → more players.
- **It's the B2B course-contest tool, productized for consumers.** This directly answers your
  instinct: the *course* deploys the QR (a contest in a box); golfers self-serve. NiceAce is
  both the consumer app **and** the course's promotion engine — see §7.

## 4. Market & positioning

| Adjacent | Who | NiceAce's edge |
|---|---|---|
| Hole-in-one **tournament insurance** | US Hole In One, American Hole 'n One, GolfStatus | They're B2B, per-event, manual. NiceAce is always-on, self-serve, consumer-facing — and *uses* them as the underwriting layer (we don't carry the pot risk; we reinsure it). |
| Golf side-game **trackers** | 18Birdies, Golf Gamebook | Different game entirely — they track scores; we run a paid jackpot. Side-games are a *later* add, not the wedge. |
| Sweepstakes / skill-contest **apps** | DraftKings-style, sweepstakes platforms | The regulatory playbook to borrow. NiceAce is a *skill-based* contest (you must physically ace the hole), which is the most defensible legal posture. |

**Positioning:** *the live jackpot for the shot every golfer dreams about.* Vegas energy,
golf soul.

## 5. The two flywheels

1. **Player flywheel (consumer):** bigger pot → more entries → bigger pot. Aces produce
   shareable wins → new players. Trophy room + "invite your foursome" amplify it.
2. **Course flywheel (B2B):** NiceAce gives courses a turnkey revenue + buzz generator (a QR
   sign on a Par 3, zero ops). Courses promote it → more players → NiceAce gets free
   distribution + a defensible install base of "NiceAce holes."

## 6. Scope

### v1 — MVP (the signature moment, one hole, one course)
- QR → mobile web flow (no install): **Arrive → Pay → Celebrate → Live → Ace win** (the
  prototype *is* the v1 spec).
- Apple Pay / card entry; one $10 ticket per player per hole per day.
- Live pot + field count (Realtime); live "on the tee" feed; trophy room.
- **Ace verification** (the trust crux — see §8).
- Payout to winner via partner; **pot risk reinsured** (hole-in-one insurance), so NiceAce
  is never exposed to a black-swan ace.
- One launch course, one designated hole. Operator dashboard (basic).

### v1.1 — fast follows
- Multi-hole / multi-course; "season" pots; bigger-pot tiers.
- Friends graph + foursome pools; Broadcast theme as a venue/bar mode (TVs in the clubhouse).
- Course self-serve onboarding (the B2B contest engine).

### Explicitly NOT in v1
- Side-game tracking (skins/Nassau) — that's 18Birdies' turf; revisit only as retention glue.
- Real-money in jurisdictions we haven't cleared (geofence hard).
- Native apps (the no-install web flow is a feature, not a gap).

## 7. Business model

1. **Rake on entries** — a transparent cut of each $10 (rest funds the pot + insurance premium).
2. **Insurance spread** — partner underwrites the pot; NiceAce manages the float/premium.
3. **B2B SaaS for courses** — subscription/revenue-share for the contest engine + signage.
4. **Sponsored pots** — a brand backstops/boosts the pot ("This week's pot powered by
   [Titleist]"). Premium, brand-safe inventory tied to the most-shared moment in golf.

## 8. Compliance & trust — the make-or-break

This is a **paid-entry prize contest.** It must be designed legally-first, not bolted on:

- **Skill-based framing.** Winning requires physically acing the hole — a contest of skill,
  not chance. This is the strongest legal posture and must be preserved in mechanics + copy.
- **Pot risk is reinsured, never carried.** Partner with a hole-in-one insurer so a real ace
  (or a freak run of them) never bankrupts NiceAce. This is the core financial control.
- **Geofencing + KYC + age-gate** on any money flow; launch only in cleared jurisdictions.
- **Money custody via a licensed payments/contest partner** — NiceAce orchestrates, the
  partner holds funds, exactly as the prototype's "verified by NiceAce / payout tonight" implies.
- **Ace verification is the fraud surface.** v1: witness confirmation by playing partners +
  course/marshal attestation. v1.1: optional tee-cam / photo + (later) sensor integration.
  No payout without verification. Design the dispute path before launch.
- **Responsible play:** one ticket per player/hole/day default; clear odds; self-exclusion.

> Recommendation: engage a gaming/sweepstakes attorney *before* the first paid pot, and
> structure v1 in a single favorable jurisdiction. Run a **Signal Mine** scan (see the
> social-listening PRD) on competitor legal complaints to map the minefield early.

## 9. Success metrics

- **Entry conversion:** QR scans → paid entries (the no-install flow's core KPI).
- **Pot velocity:** $ added per hour on an active hole (the flywheel's pulse).
- **Share rate:** wins (and near-misses) shared externally → K-factor.
- **Course retention:** % of launched holes still active after 30/90 days.
- **Trust:** verified-ace payout time; dispute rate; refund rate.

## 10. Tech approach

- **Frontend:** mobile-web first (QR-friendly, no install). The production build slots into
  the React + TS + Tailwind + shadcn stack VibeCo already uses (the prototype is plain
  HTML/CSS/JS to stay faithful to the design export; porting to the component system is step 1).
- **Backend:** Supabase — **Realtime** for the live pot/feed, Edge Functions for entry +
  payout orchestration, Auth, RLS, Postgres. Same stack as VibeCo (intentional — see Prong 2).
- **Payments/insurance:** integrate a licensed payments partner + hole-in-one underwriter.

## 11. Open questions (for Bill)

1. **Lead aesthetic** — design ships **Jackpot** as default with **Broadcast** alt. Confirm
   Jackpot leads v1? (Both are in the prototype to feel side-by-side.)
2. **B2B-first or B2C-first GTM?** The product is one thing; the *go-to-market* is the fork —
   sign courses (B2B) and let them bring players, or seed players directly. Recommend **B2B-led**
   (course = distribution + the regulatory cover of a venue-sanctioned contest).
3. **Insurance partner** — do you already have a relationship (US Hole In One et al.), or
   should I scope partners?
4. **Wordmark** — brand is **NiceAce**; the design's in-app mark is "ACES." Keep "ACES." as
   the in-product wordmark under the NiceAce brand, or rename the mark too?
