# Signal Board rework — make it real, make it clickable

You're right. The board ships data without **proof or grip**. Themes have no sources, panels don't open, "build/sell/ROI directional" is jargon, the copy is generic AI gloss, and the search hides at the bottom of a wall of text. Sketchpad in the nav lands on a stale board instead of the active vertical. That's the diagnosis.

The fix is not a redesign sprint — it's a focused **evidence-first rework** of one page plus three small IA/copy cleanups. Backend already stores everything we need (`signal_raw.source_url`, `permalink`, `author_hash`, `score`, `created_at`) — we just don't surface it.

---

## What changes (and why)

### 1. Every signal is traceable to a real link

Today: quotes are plain strings, sources collapse to `"reddit"`, and there's no way to verify anything.  -->. BB: yeah, it's a cool idea, but do we need more data? I'm not saying no. I just don't know if it's number one on the list. Could use some work, but not disagreeing with the concept. 

Fix:

- Each candidate card gets an **"Evidence" drawer** (collapsed by default). Open it → shows the top N matching `signal_raw` rows for that cluster: real title, real Reddit permalink, post score, date, subreddit. Clickable, opens in new tab.
- Each quote line gets its source URL inline as a small `↗` link. No more orphan strings.
- Trending themes get a **"seen in X sources"** chip that opens the same drawer scoped to that theme.
- Add a tiny "Verify" affordance on every pain score — opens the drawer, scrolls to the strongest piece of evidence.

The board stops feeling like LLM output and starts feeling like a research tool.  

### 2. Kill the jargon BToday: "build / sell / partner", "ROI directional", "effort S/M/L", "85% conf" — undefined.

Fix:  

- Rename motion labels to plain English: **Build it · Pre-sell it · Partner with someone**.
- Replace "ROI directional" with a one-line plain-English **"Why we believe it"** rendered from `roi` + `based_on` ("Strong: 14 mentions across r/3PL and r/logistics in the last 7 days").
- Add inline `?` tooltips on every metric: pain score, confidence, effort. One sentence each.
- Drop "effort S/M/L" from the chip row, put it inside the card body as **"Rough build: 1–2 days / 1–2 weeks / 1–2 months"**.

### B B > yes, totally agree with this. Don't have any random labels unless they mean something, and hopefully they are actually interactable. Some motion effects have some use to it. We don't need to estimate rough build; we need to identify the opportunities 

&nbsp;

### 3. Restructure the page so the answer is at the top

Today: header → status badges → 4 stat tiles → themes → roadmap → wall of cards → tiny search at the bottom.

Fix:

- Move the **filter/search/sort bar to directly under the header**, sticky on scroll. Sort by pain / freshness / confidence. Filter chips for source (Reddit · HN · review sites · web).
- Collapse the 4 stat tiles into a single one-line summary: *"1,154 signals · 30 candidates · 4 durable themes · last scan 0d ago"* — clickable, opens a "How this works" drawer that explains the pipeline in 4 bullets.
- Roadmap moves **above** candidates (it's the takeaway). Each roadmap card links down to the candidates it's `based_on` via anchor scroll + highlight.
- Themes get tucked into a horizontal scroll strip, not a 3-card grid that eats vertical space.

###  BB->  I know you're saying this, but when I read this, you're saying the answer is at the top, but what is even the question that we're answering? I don't know. That's why I think we've lost the plot. Again, I don't disagree with the restructure, but, eh, fine, this is like a minor fix 

### 4. Interactions that prove it's alive

- Hover any candidate → highlight the themes + roadmap items it belongs to.
- Click "Sketch this idea" → already works, keep. Add **"Discuss in Inbox"** as a secondary action that drops the candidate into `/inbox` as a thread (reuses existing surface).
- Add a live-ish **"Scanning now"** affordance during `runScan` that streams which source is being mined (we already get `sources.status[]` back — show it in a small stepper instead of a single toast).

 yes, 100%. I like the idea of some sort of interactions, sure do, small things, but don't fake it. I still wanna see things actually working. It's alive if it comes up with a good idea, that's the main point 

### 5. IA + copy cleanup (tiny, but high-leverage)

- **Nav**: `Sketchpad` link currently routes to a stale board. Point it at `/simulate` (which is what "idea-stage sketchpad" already is per Phase 6) and keep `Signal` separate. Two clearly-named entries: **Signal** (what people are saying) and **Sketchpad** (what we're trying).
- **Home Opportunity Scan** copy: strip "Book a discovery audit" CTA from this surface (it's positioned for a different audience). Replace with **"See the live Signal Board →"** that deep-links to the active vertical. The audit CTA stays in `/briefing` where it belongs.
- Remove invented stats from the home/scan blocks (the user flagged "we're making up stats here"). Replace with live counts pulled from `signal_raw`/`feature_candidates` — same query the board uses.

***BB:***  I mean, I think signal is the main point of this, right? We're trying to take an idea and riff on it, similar to what we did in V1, similar to what we're doing literally right now. I think we need to find a way to run some more signals. Fine, I'll get to it if I have to, but please propose other ways. Also, I don't know, there has to be a way to scan stuff for data, CBN sites, crash page, I don't know, like other places where people are talking. They integrated tick-tock, who the hell knows, but someone should anyway. Yes, clean up the copy for sure, and the navigation is my summary 

### 6. Empty / sample states earn their keep

- "SAMPLE DATA" badge stays, but the sample candidates link to a **"This is what a real card looks like — here's a live one"** anchor that jumps to the active vertical's first real candidate.
- When `isEmpty`, show the **last successful scan timestamp + which sources fired** so the user knows the pipeline is wired, just quiet.

---

## What I'm explicitly NOT doing (yet)

- No visual redesign / new design tokens. Phase 12 owns that.   
  - ORRRR, give me some prompts to toss into Claude Design or other lovable/repllit project??
- No new backend tables. Everything we need is already in `signal_raw` + `feature_candidates` + `opportunity_roadmaps`.
  -  BB correct except more real runs and an explanation of what the signal is in the future candidates and why 
- No collapsing v1 ↔ v2.1 — that decision stands.
  -  BB correct, in fact I think if we take the concepts we built on v1 and ran this through the parallel out agents that distill the idea, like Gemini, problems that come up, v1 is pretty good at refining an idea. I don't know, do we dog food this? This could be like a key thing to think about 
- No new agent. The roadmap agent stays; we just render its output less like a slide deck.
  - BB:  I mean, I guess, but why? Not sure roadmap agent stays, but let us do, let him do his job, or let's run it back to spin up some sub-agents in a Claude prompt or something like that. It doesn't have to be Lovable doing everything, and I'm not saying you have to do this, no 

---

## Execution plan (small, sequenceable) 

- I mean, sure. I think we can do these, but doing small, sequenceable, minor fixes might not be seen as far as from the trees, maybe 


| #   | Slice                                                                                                                    | Owner   | Why first                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ------- | ----------------------------------------------------------- |
| A   | Evidence drawer + source links on candidates and themes (read-only query to `signal_raw` by cluster_id / theme matching) | Lovable | Single biggest credibility unlock                           |
| B   | Jargon pass: motion rename, tooltips, "Why we believe it" line                                                           | Lovable | Pure copy/UI, no data changes                               |
| C   | Page restructure: sticky filter bar, summary line, themes strip, roadmap above candidates                                | Lovable | Makes the rest readable                                     |
| D   | Live-scan stepper (consume existing `sources.status[]`)                                                                  | Lovable | Proves the pipeline is real every time you press the button |
| E   | Nav fix (Sketchpad → /simulate), home scan CTA rewrite, kill made-up stats                                               | Lovable | 30-min cleanup, unblocks publish                            |
| F   | Empty/sample state polish + deep-link from sample card to first live card                                                | Lovable | Closes the "is this real?" loop                             |


Each slice is a separate PR. A–C are the substance; D–F are polish you can ship behind them. 

-  are they? I don't know. I feel like I've been in plan mode and jumped out pretty major builds from Lovable, so this doesn't seem like a lot of separate PRs. Here's my question: are you getting this kind of very code-focused, like let's make sure everything works precisely from the documentation that maybe I uploaded before 

---

## Cross-surface coordination. ->> IM very interested in this in general. I'm going to copy/paste this current situation, and not just the backend but co-work. We need to do this. In fact, if we have the document that you were talking about before, contract, whatever it was, Contract Coordinator, would you do that? Please feel free to produce any prompts and recommendations. I'm interested in the backend, of course, but yes, I'm interested in multi-agent 

**For Claude Code (v2.1 / backend):**

- Confirm `feature_candidates` rows store the `cluster_id` linking back to `signal_clusters.member_signal_ids` (or equivalent). If not, add it — we need it for the evidence drawer. (This is the only backend ask.)
- Once A ships in v1, port the evidence drawer pattern back to the v2.1 Hub. Same component shape.

**For Codex / parallel agents:**

- Good fit for the jargon pass (B) and the home-scan copy rewrite (E5) — both are bounded, no data dependencies. Hand them the relevant files and the "no AI slop, define every term inline" constraint.

---

## Skills & connectors worth installing

**Skills to author (small, reusable):**

1. `**evidence-drawer**` — pattern for "any AI-derived claim must open into raw evidence on click". Reusable on Signal Board, Sketchpad reports, future Hub. Authoring this now codifies the lesson.
2. `**jargon-audit**` — given a page, find every term a non-technical user wouldn't define and propose a plain-English rewrite + tooltip. Reusable across both projects.
3. `**live-scan-stepper**` — reusable pattern for "long-running edge function with N substeps → animated stepper that consumes the returned `status[]`". Will pay back the moment we add a second scan-style surface.

The Impeccable suite, `learn`, and `go` already cover the rest.

**Connectors worth adding now:**

- **Reddit secrets (B2)** — still pending. Without `REDDIT_CLIENT_ID/SECRET` the Reddit adapter is dormant and we're leaning on Firecrawl/Perplexity for what should be first-party data. Highest-ROI connector by far.
  - BB - I mean, everyone keeps saying this, but I've tried to tell people so many times, like I cannot do it. It's not working, so if someone can point me in some direction on how to do this, I would love to, but I can't figure it out!!!
- **Sentry** — once we ship the evidence drawer + stepper, runtime errors in the wild get expensive to debug without it. Defer-after-publish is fine; install **on** publish day.

**Connectors I'd skip for now (you've asked before):**

- Linear / Notion — adds workflow weight without changing the product. Revisit post-publish.
- PostHog / Amplitude — defer until there are real users to learn from.
- Atlassian / Canva / Miro / Hex / Sanity — no current job to do.

---

## What to port back to Claude / v2.1 after this lands

1. The evidence-drawer component and its query pattern.
2. The plain-English motion labels + tooltip copy (it's the same audience).
3. The live-scan stepper.
4. The `useActiveVertical`-style routing for "home scan → land on the live board for the scanned slug" (already in v1, reinforce in v2.1).

Everything else (Hub, Decisions, MCP workbench) stays v2.1-owned.

---

## Definition of done for this rework. -> 

## ***BB- >and by the way, I'm not trying to scope creep on this. I still want to get something delivered, so let's make a publishable version. Just make it make sense. I was trying to call out much larger, crazy issues here.***

***I'm going to copy paste all this into a document, and I'm going to prove it, and then tell Claude and Codex and the other things to look at it and my commentary so we can push this along. I'm open to creative ideas here too. Lovable in the past has been inspiring and super helpful, and taking a much bigger product visionary type of hat on, so feel free to use edge functions, AI, just quit your routes, be creative and inspiring. I agree with your "let's get at least to some version of a publishable state."*** 

- A first-time visitor on `/signal` can: (a) read the takeaway in 10s, (b) click any number/quote and reach a real Reddit thread, (c) understand what "build / pre-sell / partner" means without asking, (d) see the pipeline run live when they hit "Run scan".
- Zero invented stats on Home or `/signal`.
- Sketchpad nav goes to the actual sketchpad.
- Sample state explains itself and offers a one-click jump to the live equivalent.

Approve this and I'll start with slice **A (evidence drawer)** — it's the one that turns the page from "AI output" into "research tool". B and E are quick follows in the same batch.   

&nbsp;

---

I think this plan might be worth a whole rewrite. You let me know, but anyway, I don't want to get held up. Just do what you think is best from the commentary, but make sure you prove to me you're getting the point 