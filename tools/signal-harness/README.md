# Signal Mine testing harness

A **zero-dependency** way to turn any scan result into a shareable, non-technical
HTML report — "here's what we ran, here's what it found, here's the suggested roadmap."

## Run it

```sh
node tools/signal-harness/generate-report.mjs \
  --in tools/signal-harness/fixtures/niceace-scan.json \
  --out aces/preview/signal-sample-report.html
```

Open the output HTML in any browser. (The committed sample is viewable via the preview hub.)

## How it works on a *live* scan

The input JSON shape matches what the `signal-process` edge function returns, plus a small
`meta` block and optional `raw_samples` / `classification_breakdown` for display. So the same
generator works on real data:

```sh
# 1. Run the live scan and save its JSON (any HTTP client / the /signal "Run scan" button's response)
curl -s -X POST "$SUPABASE_URL/functions/v1/signal-process" \
  -H "Authorization: Bearer $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"product":"niceace","persist":true}' > /tmp/scan.json

# 2. Add a meta block (product, date, sources) and render
node tools/signal-harness/generate-report.mjs --in /tmp/scan.json --out report.html
```

## Input shape (abridged)

```jsonc
{
  "meta":    { "product","run_label","scanned_at","sources":[],"note" },
  "counts":  { "collected","pain","clusters","candidates" },
  "classification_breakdown": [ { "label","n" } ],   // optional
  "raw_samples":              [ { "source","title","snippet","label","confidence" } ], // optional
  "themes":     [ { "title","pain_score","occurrence_count","score_history":[{ "s" }] } ],
  "candidates": [ { "cluster_theme","problem","proposed_solution","representative_quotes":[],
                    "pain_score","confidence","effort","evidence":{ "member_count","sources":[] } } ]
}
```

## Roadmap bucketing

`priority = pain_score × confidence / 100`. Now = priority ≥ 60 and effort ≠ L; Next = priority ≥ 45;
else Later. It's a starting point — a human confirms.

## Extending to other features

This is the template for the broader **feature testing harness** (see
`docs/TESTING_HARNESS_PLAN.md`): each new feature gets a fixture + a small renderer that emits a
non-technical HTML report, so every build ships with a "look what it does" artifact.
