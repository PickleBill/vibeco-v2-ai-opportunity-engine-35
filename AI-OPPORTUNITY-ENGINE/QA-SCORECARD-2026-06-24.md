# QA Scorecard — 2026-06-24 (overnight run)

Run: `node AI-OPPORTUNITY-ENGINE/qa-scorecard.mjs` (live DB via public-read REST + frontend fake-stat audit). All four data-truth gates pass.

```

=== AI Opportunity Engine — QA Scorecard ===

✅ PASS  BREADTH ≥3 verticals w/ roadmap
        4 verticals: wholesale-distribution-3pl, restaurant-ops, property-management, home-services
✅ PASS  TRUTH zero synthetic sources
        0/2806 raw rows are synth://
✅ PASS  TRUTH candidates traceable
        0/47 candidates missing cluster_id/theme_id
✅ PASS  EVIDENCE real source rows / vertical
        wholesale-distribution-3pl:1216  restaurant-ops:556  property-management:517  home-services:517
✅ PASS  SOURCE health (informational)
        hackernews:315  capterra_review:122  trustpilot_review:139  web:168  reddit:135  g2_review:121
✅ PASS  GALLERY opportunities (informational)
        21 opportunities across 4 verticals
⚠️  WARN  FAKE-STAT audit (soft)
        4 literal(s) to verify:
    src/pages/SignalBoard.tsx:626  <Hint text="How strongly the evidence supports this. 0–100%.">{o.confidence}% sure</Hint>
    src/components/Hero.tsx:28  const panelY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
    src/components/Hero.tsx:35  style={{ background: "radial-gradient(ellipse at 80% 10%, hsl(var(--violet) / 0.10), trans
    src/components/Hero.tsx:39  style={{ background: "radial-gradient(ellipse at 10% 90%, hsl(var(--primary) / 0.06), tran

=== ALL HARD GATES PASS ===
```

## Reading

- **BREADTH / TRUTH / EVIDENCE — all hard gates PASS.** 4 verticals with roadmaps; 0 synthetic source rows out of 2,806; 0/47 candidates untraceable; every vertical resolves to real `source_url` rows.
- **SOURCE health** is honest + multi-source: HN, Capterra, Trustpilot, G2, web, and reddit.com pages (the latter found via Firecrawl web search — the Reddit *API* remains not-configured and contributes zero, by design).
- **FAKE-STAT audit: clean.** The 4 flagged literals are false positives — three are CSS percentages in `Hero.tsx` (transforms/gradients) and one is a *live* DB value (`{o.confidence}% sure`, with an explanatory tooltip), not a hardcoded stat. No invented numbers on Home/Signal.
- **BUILD gate** (separate): `npm test` → 24 passing (run `qa-scorecard.mjs --build` to fold it in).
- Note: the nightly cron fired at 13:00 UTC mid-run and refreshed ONLY the enabled 3PL vertical (signal_raw 1154→1216) — confirming the new verticals were correctly kept off the recurring cron (enabled=false).

## Build-or-hold call
All four automated gates (build / truth / evidence / breadth+source) are GREEN. The publish gate therefore resolves to **PUBLISH-READY → preview**, holding for Bill's one tap. No auto-publish (per the operating contract).
