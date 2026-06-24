# Signal sources backlog

> Where else can the engine listen? Bill's flag: "There has to be a way to scan
> CBN sites, crash pages, TikTok, other places where people are talking."
> Yes. Here's the ranked list. Pick top 2-3 to implement next.

## Scoring rubric

- **Density** (1-5) — how much real customer pain shows up vs noise
- **Access** (1-5) — free official API (5) → paid API (3) → ToS-friendly scraping (2) → hostile scraping (1)
- **Stability** (1-5) — how likely the access path still works in 6 months
- **Cost** — rough $/mo at our volume

## Already live

| Source | Density | Access | Stability | Cost | Notes |
|---|---|---|---|---|---|
| Hacker News (Firebase API) | 4 | 5 | 5 | $0 | Best signal-to-noise. 527 rows. |
| Trustpilot (via Firecrawl) | 5 | 3 | 3 | Firecrawl plan | Direct customer pain. 131 rows. |
| G2 reviews (via Firecrawl) | 5 | 3 | 3 | Firecrawl plan | B2B SaaS pain. 114 rows. |
| Capterra reviews (via Firecrawl) | 4 | 3 | 3 | Firecrawl plan | SMB SaaS pain. 110 rows. |
| Web search (Perplexity Sonar) | 3 | 5 | 4 | Sonar plan | Broad recall. 153 rows. |
| Anthropic web search | 3 | 4 | 4 | Anthropic | Backup recall. |
| Reddit (official API) | 5 | 4 | 4 | $0 | **DORMANT** — needs credentials (W4). |

## Recommended next (ranked by `density × access`)

### Tier 1 — do these first

1. **Indie Hackers forum** — Density 5, Access 4, Stability 4
   - Founders complaining about real B2B pain in real time.
   - Public pages, scrape-friendly, no real bot blocking.
   - Implementation: Firecrawl with a sitemap-driven fetch of `/forum/*` threads in the last N days.
   - Risk: low. Worth it for "what indie founders need built."

2. **Product Hunt comments** — Density 4, Access 4, Stability 4
   - Comments on launches are gold: "wish this did X", "tried this, fails at Y".
   - Public JSON via their GraphQL API (free tier, 1k req/day).
   - Implementation: GraphQL query against `posts(order: NEWEST)` → pull comments.

3. **Stack Exchange (Stack Overflow + sub-sites)** — Density 4, Access 5, Stability 5
   - Free, no-auth API. Excellent for technical pain in a vertical (e.g. SaaS engineers asking about WMS).
   - Implementation: `https://api.stackexchange.com/2.3/questions?tagged={tag}&site=stackoverflow` — done.

### Tier 2 — do these once Tier 1 ships

4. **GitHub issues (search by keyword across repos)** — Density 4, Access 5, Stability 5
   - "I want X but the library doesn't do it" — feature-gap pain.
   - Free GitHub search API, 30 req/min unauthenticated, 5k authenticated.

5. **Reddit without API (RSS/JSON path)** — Density 5, Access 3, Stability 3
   - Fallback if Bill never closes W4: `https://www.reddit.com/r/{sub}/.json` works without auth, rate-limited.
   - Already partially implemented as the "legacy demo" path.

6. **YouTube comments** — Density 3, Access 4, Stability 4
   - Comments on review videos in a niche are often raw pain.
   - YouTube Data API v3, free quota 10k units/day. Each `commentThreads.list` costs 1 unit.

### Tier 3 — expensive or fragile

7. **Twitter/X via API v2** — Density 4, Access 2, Stability 2
   - Was Tier 1 in the old world. Now: $200/mo for Basic tier with serious rate limits.
   - Skip unless someone gives us free Pro access.

8. **TikTok comments via Apify** — Density 3, Access 2, Stability 2
   - Apify actors exist (`clockworks/tiktok-scraper`) at ~$30/mo + per-result.
   - Density isn't great for B2B; better for consumer.

9. **Glassdoor "what's broken at company" reviews** — Density 5, Access 1, Stability 1
   - Hostile to scraping, IP blocks fast. Tempting but expensive to keep alive.

10. **App Store / Play Store reviews** — Density 4, Access 3, Stability 4
    - Already covered via Firecrawl for some apps. Could formalize with a dedicated adapter.

11. **Discourse-based forums (Meta Discourse, dev forums, etc.)** — Density 4, Access 4, Stability 5
    - Discourse has a stable JSON API at `/latest.json` on every instance.
    - High-quality for technical/community pain.

12. **Quora answers** — Density 2, Access 2, Stability 3
    - Heavily SEO-poisoned. Low ROI.

## Implementation contract (for Claude Code)

Each new source goes in `supabase/functions/_shared/adapters/{name}.ts`:

```ts
export const adapter = {
  name: "indiehackers",
  isConfigured: () => true, // or check Deno.env for a required key
  async collect(opts: { keywords: string[]; lookback_days: number }) {
    // returns { posts: SignalRaw[], status: "ok" | "degraded", note?: string }
  },
};
```

Then register it in `signal-collect/index.ts`'s adapter array.
Status payload flows into the live scan stepper automatically.

## What I'd build first

If I were Claude Code right now, I'd ship in this order:

1. **Indie Hackers** (1 day) — highest density unlock for B2B founder pain
2. **Stack Exchange** (½ day) — easiest possible win, free API, just write the fetch
3. **Product Hunt** (1 day) — comment goldmine, free quota fits us

Three new sources, ~2.5 dev days, doubles the engine's recall without spending a cent.
