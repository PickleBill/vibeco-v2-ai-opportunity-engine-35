
# Wire the dormant adapters — workspace-level, reusable across projects

## Where we are right now (verified, not guessed)

**Workspace connections** (visible to every project you own, including VibeCo Labs):
- `pickle` (Firecrawl) — **Connected, Managed, not yet linked to this project**. Same connection you set up 18 days ago. Yes, this is reusable across projects — that's the whole point of workspace connections.
- ElevenLabs, Stripe sandbox, Courtana gDrive, Bill's TikTok — all linkable.
- **Perplexity** — not in the workspace connector list yet. The "API key" you have is sitting outside Lovable; to make it organizational you add it through the Perplexity connector at the workspace level (one key, link to N projects).

**This project's secrets**:
- `LOVABLE_API_KEY` (managed) — powers `ai_gateway_scout` + every other AI call. Already active.
- `anthropic_api_key` (lowercase) — exists. **The dormant `anthropic_web_search` adapter reads `ANTHROPIC_API_KEY` (uppercase)**, so it never activates even though the key is there. Casing mismatch is the bug.
- `INGEST_TOKEN` — external scanner bridge.

**Currently active adapters in `signal-collect`**: `hackernews` (keyless, working — 257-356 real rows on 3PL), `ai_gateway_scout` (active but URL verification kills most candidates).
**Currently dormant**: `reddit`, `firecrawl`, `anthropic_web_search`, `perplexity_sonar`.

## Answering your direct questions

1. **"Can you use the Firecrawl key I already have?"** Yes — it's the workspace `pickle` connection. I just need to **link** it to this project (one tool call). Same connection then powers VibeCo Labs and any other project you link it to, billed once at the workspace level.
2. **"Is the Anthropic key good for web search?"** Yes — Claude's `web_search_20250305` server-side tool is real and our adapter is already coded for it. It's dormant only because of the env-var casing mismatch above. One-line fix.
3. **"How do I do this at the org level?"** Workspace connectors are the org-level primitive. Add once in workspace settings, link to each project. Firecrawl + Perplexity both work this way. The raw `anthropic_api_key` secret is project-scoped only — if you want Anthropic org-wide, we'd need to either (a) duplicate the secret per project, or (b) wait for an Anthropic connector (none exists today).
4. **"Coordinate with VibeCo Labs' Claude orchestration."** Confirmed VibeCo Labs is a separate project in your workspace. Workspace connections (Firecrawl, Perplexity, Reddit if/when added) will be reusable there with zero extra setup. Each project still needs its own edge function code, but the adapter pattern we already built ports cleanly. Recommend Claude's plan there mirrors the adapter interface (`{ name, isConfigured, collect }`) so both projects stay in sync.

## The plan (this project — additive/surgical, no UI changes)

### 1. Link Firecrawl `pickle` to this project
One call: `standard_connectors--connect` with `connector_id: firecrawl`. Injects `FIRECRAWL_API_KEY` into edge function env. The existing `firecrawl` adapter in `signal-collect/index.ts` flips from dormant → active automatically. No code change needed.

### 2. Add Perplexity at the workspace level
You'll be prompted to paste the Perplexity key once. Then link to this project. The dormant `perplexity_sonar` adapter activates. Same connection then available to link into VibeCo Labs.

### 3. Fix the Anthropic casing bug
Rename the existing `anthropic_api_key` secret to `ANTHROPIC_API_KEY` (or update the adapter to read the lowercase name — I'll do whichever is less disruptive). Then `anthropic_web_search` adapter activates using Claude's grounded web_search tool.

### 4. Reddit (still pending your action)
Per the runbook, Reddit needs `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` from a "script" app at reddit.com/prefs/apps. Not a connector — has to be a project secret. This stays in your court; nothing for me to wire until you create the Reddit app.

### 5. Verification run
After steps 1–3, run `signal-collect` on the 3PL vertical, then `signal-process`. Report real row counts per active adapter and confirm no fabrication.

## Other edge AI I'd recommend (built-in, no new keys)

All of these use `LOVABLE_API_KEY` you already have — zero marginal config:

- **Embedding-based de-dup** in `signal-process`: right now clustering is title/keyword based. Adding Gemini embeddings (`google/text-embedding-004` via the gateway) would collapse near-duplicate complaints across HN/Reddit/Firecrawl into one cluster instead of three. Big quality win for signal density.
- **Nightly summarization digest**: a `signal-digest` edge function that runs after `signal-process` and produces a 5-bullet "what's new this week" using Gemini Flash Lite. Cheap, weekly cadence.
- **Auto-tagging vertical relevance**: a tiny Gemini Flash Lite classifier between collect and process that drops obvious off-topic items (e.g., HN posts about "3PL printing" that aren't logistics). Saves cluster noise.
- **Image generation for opportunity roadmaps**: when `opportunity-roadmap` drafts a build-or-sell idea, auto-generate a hero concept image with `google/gemini-3.1-flash-image`. Free with `LOVABLE_API_KEY`. Makes the board scannable.
- **Embeddings-based "similar opportunity" links** on the roadmap UI — same embedding store, no new infra.

These are individual follow-up plans, not part of this one. Flag which sound interesting and I'll plan them out separately.

## Out of scope (guardrails)

- No homepage / discovery-audit modal / proofs / `/briefing` changes.
- No frontend publish.
- No Reddit secret work — Bill's job per runbook.
- No `INGEST_TOKEN` rotation.
- No edits to VibeCo Labs project files from here — workspace connectors are the only shared surface. Coordination with Claude there happens by you sharing this plan.

## Outcome

After this plan: `hackernews`, `ai_gateway_scout`, `firecrawl`, `anthropic_web_search`, `perplexity_sonar` all active for VibeCo's `/signal` board. Same Firecrawl/Perplexity connections one click away from powering VibeCo Labs. Reddit still waiting on you.
