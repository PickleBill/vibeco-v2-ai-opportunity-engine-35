# PRD — Signal Mine: social pain-point → product-feature pipeline

**Owner:** Bill / Courtana · **Status:** v1 scaffolded (code shipped) · **Codename:** Signal Mine
**Relationship to other docs:** This is the *input firehose* for Loop B in
[`VIBECO_X_ACES_INTEGRATION.md`](./VIBECO_X_ACES_INTEGRATION.md). It can run standalone
for any Courtana product, but NiceAce is the first beneficiary.

> ### Build status — v1 scaffolded (pointed at NiceAce)
> Shipped in this repo, following the existing agent conventions:
> - **DB:** `supabase/migrations/20260605000000_signal_mine.sql` — `signal_raw`,
>   `signal_clusters`, `feature_candidates` (+ pgvector + RLS).
> - **Agent:** `supabase/functions/_shared/agents/signal-mine.ts` — classify → cluster →
>   synthesize, via the existing `llm-client` + new `pain-classification` /
>   `feedback-synthesis` task types in `model-router.ts`.
> - **Endpoints:** `signal-collect` (Stage 1 — Reddit + App-Store RSS, **public, no-key,
>   ToS-compliant**) and `signal-process` (Stages 2–4).
> - **Surface:** `src/pages/SignalBoard.tsx` at route **`/signal`** — ranked candidates with
>   pain score, evidence, quotes, and one-tap **Promote / Dismiss** (the Stage-5 human gate).
>   Ships with sample data so it renders before backend wiring.
>
> **To go live:** apply the migration, deploy the two functions, ensure
> `LOVABLE_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` are set, then hit **Run scan** on `/signal`
> (or schedule `signal-collect`+`signal-process` daily). Nothing here touches the live app
> except adding the new `/signal` route.

---

## 1. One-liner

**Signal Mine continuously scans public sources (Reddit, X/Twitter, app-store reviews,
forums) for customer pain points, then uses the VibeCo agent mesh to turn the strongest,
most-repeated complaints into vetted, ranked product features.**

It's the *demand-sensing* front end of the "vibe coding on demand" loop: the market tells
us what to build, the agents decide if it's worth building, and Claude Code ships it.

## 2. Why this is good (and why it's dangerous if done lazily)

- **Good:** founders' #1 failure mode is building things nobody asked for. The internet is
  *already* full of people describing, in their own words, exactly what they hate about
  existing products (e.g., r/golf threads on 18Birdies, scoring disputes, settle-up
  awkwardness, "I aced and had no proof"). That's free, high-signal PRD input.
- **Dangerous if lazy:** naive keyword scraping produces a swamp of noise, sarcasm,
  duplicates, and bot spam. And social platforms have **strict, changing API terms** —
  a scraper that violates ToS is a legal and reputational liability. The product is only
  as good as its **signal extraction + compliance discipline.**

## 3. The pipeline (5 stages)

```
 1 COLLECT  →  2 CLASSIFY  →  3 CLUSTER  →  4 SYNTHESIZE  →  5 ROUTE
 (sources)    (is this a    (group like   (pain → feature   (to backlog /
              pain point?)   complaints)   candidates)        change-request loop)
```

### Stage 1 — Collect (compliant ingestion)
- **Sources, in priority order by compliance-friendliness:**
  1. **Reddit** — official API (free tier, rate-limited). Target subs: r/golf, r/GolfGTI…
     no — r/golf, r/golfclubs, r/GolfSwing, and competitor-name searches.
  2. **App-store reviews** (ours + competitors) — public, structured, gold-standard signal.
  3. **X/Twitter** — official API only (paid tiers). Treat as optional/secondary given cost
     and ToS volatility. **No unofficial scraping.**
  4. Public forums / Discord (where ToS permits) as a later add.
- **Compliance is a feature, not a footnote:** official APIs only, respect rate limits and
  robots/ToS, store source URLs + timestamps for provenance, honor deletion, never
  republish user content verbatim externally (we extract *insights*, not repost posts).
- Raw items land in a `signal_raw` table (text, source, url, author_hash, ts, product_tag).

### Stage 2 — Classify (cheap, fast, high-recall filter)
- A `quick-classification` agent (already a task type in `model-router.ts`, routed to the
  cheapest model) labels each item: `pain_point | feature_request | praise | question |
  noise/spam | off-topic`, with a confidence + a target product guess.
- Only `pain_point` / `feature_request` above a confidence threshold proceed. This keeps
  the expensive stages cheap.

### Stage 3 — Cluster (dedupe + intensity)
- Embed surviving items (pgvector, **reusing the `org_decisions` embeddings pattern**
  already in the repo) and cluster semantically.
- Each cluster gets a **pain score** = `frequency × intensity × recency × sentiment`.
  "47 people in 30 days angrily describing the same scoring-dispute problem" outranks one
  clever one-off.

### Stage 4 — Synthesize (the VibeCo agent mesh does the thinking)
- For each top cluster, fire the existing mesh:
  - `synthesize` — distill the cluster into a crisp problem statement + representative
    (anonymized, paraphrased) quotes.
  - `persona-perspective` (**customer** + **builder**) — does this match a real customer
    profile? Is it buildable?
  - `expand-idea` / `distill-idea` — what's the *smallest* feature that kills this pain?
  - `auto-evaluate` — score the resulting feature candidate for confidence.
- Output: a **Feature Candidate** record — problem, proposed solution, evidence (cluster +
  scores), confidence, effort estimate.

### Stage 5 — Route (into the build loop)
- High-confidence + low-effort candidates → auto-drafted as `feature_requests` (Loop A) →
  vetted by `debate` → `refine-prompt` → Claude Code ships a PR. **Always a human gate**
  before code merges.
- Everything else → a ranked **Signal Board** in the Portfolio app for Bill to triage.

## 4. Surfaces (what you actually see)

- **Signal Board** — a ranked feed of clusters: pain score, trend sparkline, sample quotes,
  the agent-proposed feature, confidence. One-tap → "promote to change request" or "dismiss."
- **Per-product digest** — weekly "here's what the market said about NiceAce / VibeCo / [project]
  and the 3 things worth building." Delivered to Slack/email (MCP servers for both are
  already connected to this environment).
- **Provenance drawer** — every feature candidate links back to its source evidence. No
  black-box "the AI said so."

## 5. Scope

### v1 (prove the signal)
- **Reddit + app-store reviews only** (the two most compliant, highest-signal sources).
- One target product (**NiceAce**) to validate the pipeline end-to-end.
- Stages 1–4 + the **Signal Board** surface. Stage 5 routing is *manual* (Bill promotes).
- Daily collection job; weekly digest.

### v1.1
- X/Twitter via official API; multi-product; automatic Stage-5 routing for high-confidence
  low-effort items (still human-gated at merge).

### Not in v1
- Sentiment dashboards for vanity metrics, influencer tracking, competitor-pricing scraping.
  Stay ruthlessly focused on *pain → feature*.

## 6. Architecture (reuses VibeCo infra)

- **Collection:** Supabase Edge Function (Deno) on a cron schedule per source; secrets for
  API keys via Supabase secrets (same pattern as `LOVABLE_API_KEY` / `ANTHROPIC_API_KEY`).
- **Storage:** `signal_raw`, `signal_clusters`, `feature_candidates` tables + pgvector
  embeddings (mirrors existing migrations).
- **Brain:** the existing agent mesh via the Courtana MCP server — **no new model plumbing**,
  just new task types: `pain-classification` (alias of `quick-classification`),
  `feedback-synthesis` (shared with Loop B), `feature-candidate-eval` (wraps `auto-evaluate`).
- **Output:** MCP `save_decision` logs each promoted candidate; Slack/Gmail MCP for digests.

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Platform ToS / API changes (esp. X) | Official APIs only; abstract each source behind an adapter so one breaking doesn't break the pipeline; Reddit + reviews as the resilient core. |
| Noise / sarcasm / bots drowning signal | Cheap high-recall classifier first, then clustering by *intensity × frequency*, not raw volume. |
| Echo-chamber bias (loudest ≠ most valuable) | Pain score weights recency + cross-source corroboration; human gate on the Signal Board. |
| Privacy | Hash author identifiers, store provenance not PII, extract insights not reposts, honor deletions. |
| "Build what trolls demand" | The `debate` + `auto-evaluate` gate exists precisely to reject low-value-but-loud requests. |

## 8. Success metrics

- **Signal yield:** % of collected items that survive to a feature candidate (precision of
  the pipeline).
- **Hit rate:** % of *shipped* features sourced from Signal Mine that move a real product
  metric (the only metric that ultimately matters).
- **Time-to-insight:** market complaint → Signal Board card.
- **Cost per insight:** keep Stage-2 filtering aggressive so the expensive agents only see
  pre-qualified signal.

## 9. Open questions (for Bill)

1. Start Signal Mine on **NiceAce** (validate on a product we control) or on **VibeCo itself**?
   *(Recommend NiceAce — clearer pain space, and it proves Prong 2's return path.)*
2. Budget appetite for the **X/Twitter API** (it's the costly, ToS-volatile source) vs.
   staying on Reddit + reviews for v1?
3. Should the weekly digest go to **Slack, email, or both**? (Both MCP integrations are live
   in this environment.)
