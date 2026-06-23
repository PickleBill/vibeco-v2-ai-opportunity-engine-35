import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { callLLMWithTool } from "../_shared/llm-client.ts";
import { selectModel } from "../_shared/model-router.ts";

/**
 * Signal Mine — Stage 1: Collect.
 *
 * Collection precedence:
 *   1. Official Reddit API (PRIMARY, "real mode") — when REDDIT_CLIENT_ID /
 *      REDDIT_CLIENT_SECRET secrets are set and the request carries a vertical's
 *      `subreddits` + `keywords`. App-only OAuth, read-only, no PII. This is the
 *      server-side path the nightly cron uses. Never synthesizes: an empty or
 *      degraded result stands so the board can show an honest empty state.
 *   2. Firecrawl (legacy demo) — web search with proxy rotation for the golf /
 *      NiceAce sample when no Reddit vertical is configured.
 *   3. Gemini Flash synth (demo only) — labeled `ai_synth`, never used in real
 *      mode.
 *
 * All paths store provenance (source + url + hashed author), de-dupe on
 * source_url, stamp scan_date, and persist to signal_raw. Classify/cluster is
 * Stage 2+ (signal-process). Complements the external scanner → ingest-signal
 * bridge; both land on the same (product_tag, scan_date) rows.
 *
 * Body: {
 *   product?: string,         // product_tag, default 'niceace' (use slug(vertical))
 *   vertical?: string,        // human label (context)
 *   subreddits?: string[],    // Reddit path: subreddits to search (no "r/")
 *   keywords?: string[],      // Reddit path: pain keywords (OR-joined per sub)
 *   lookback_days?: number,   // Reddit path: window, default 7 (max 90)
 *   queries?: string[],       // Firecrawl path: search phrases
 *   sites?: string[],         // Firecrawl path: domains, default ['reddit.com']
 *   limit?: number,           // results cap (Reddit ≤100, Firecrawl ≤10)
 *   persist?: boolean,        // write to signal_raw (needs service role)
 *   scrape?: boolean          // Firecrawl: pull full page markdown (default true)
 * }
 */

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

// djb2 — cheap, non-cryptographic; we only need to avoid storing raw handles.
function hashAuthor(name: string): string {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h + name.charCodeAt(i)) | 0;
  return "a_" + (h >>> 0).toString(36);
}

// Derive a coarse source label from the result URL.
function sourceFor(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("reddit.com")) return "reddit";
  if (u.includes("apps.apple.com") || u.includes("itunes.apple.com")) return "appstore_review";
  if (u.includes("play.google.com")) return "playstore_review";
  return "web";
}

interface Item {
  source: string; source_url?: string; author_hash?: string;
  title?: string; body: string; product_tag: string; raw: Record<string, unknown>;
}

interface FcResult { url?: string; title?: string; description?: string; markdown?: string; }

async function firecrawlSearch(
  apiKey: string, query: string, limit: number, scrape: boolean,
): Promise<FcResult[]> {
  const res = await fetch(`${FIRECRAWL_V2}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit,
      ...(scrape ? { scrapeOptions: { formats: ["markdown"], onlyMainContent: true } } : {}),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`firecrawl "${query}" -> ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
    if (res.status === 402) throw new Error("Firecrawl: insufficient credits (402)");
    return [];
  }
  // v2 may return results under data.web, or a flat data array.
  const data = (json as Record<string, any>).data;
  const list: FcResult[] = Array.isArray(data) ? data : (data?.web ?? data?.results ?? []);
  return list ?? [];
}

// ─── Gemini Flash fallback ───
// When Firecrawl isn't configured (or returns nothing), use Gemini Flash to
// synthesize realistic-looking pain posts so the downstream pipeline can still
// produce meaningful candidates. Marked source='ai_synth' for transparency.
const synthSchema = {
  type: "function" as const,
  function: {
    name: "synthesize_pain_signals",
    description: "Generate realistic-sounding social posts/reviews expressing user pain about a product space.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source: { type: "string", enum: ["reddit", "appstore_review", "playstore_review", "web"] },
              title: { type: "string", description: "Short post/review title." },
              body: { type: "string", description: "2-5 sentences of realistic, specific user pain. Authentic voice, not marketing copy." },
            },
            required: ["source", "title", "body"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
};

async function synthesizeItems(product: string, productContext: string, queries: string[], count: number): Promise<Item[]> {
  const model = selectModel("pain-classification");
  const system = `You generate diverse, realistic-sounding public pain signals (Reddit threads, app-store reviews, forum posts) for product research about "${product}". ${productContext}
Rules:
- Voice must sound like real frustrated users, not marketing copy.
- Cover a SPREAD of distinct pains — don't repeat the same complaint.
- Vary length, specificity, and tone (mildly annoyed → fed up).
- Avoid naming real people. Brand names are OK if relevant.`;
  const user = `Generate ${count} items spanning these query angles:\n${queries.map((q) => `- ${q}`).join("\n")}`;
  const out = await callLLMWithTool<{ items: { source: string; title: string; body: string }[] }>({
    model,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    tools: [synthSchema],
    toolChoice: { type: "function", function: { name: "synthesize_pain_signals" } },
    maxTokens: 4096,
  });
  return (out.items ?? []).map((it, i) => ({
    source: "ai_synth",
    source_url: `synth://${product}/${Date.now()}-${i}`,
    title: it.title,
    body: it.body,
    product_tag: product,
    raw: { synthesized: true, original_source: it.source },
  }));
}

// ─── Official Reddit API (primary, server-side) ───
// App-only OAuth (client-credentials) against a Reddit "script" app, read-only.
// Secrets: REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET / REDDIT_USER_AGENT — set
// server-side only (never client-side). Searches each configured subreddit for
// the vertical's keywords over the lookback window. No PII (author is hashed).
const REDDIT_OAUTH = "https://oauth.reddit.com";
const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

// Reddit's search time filter is coarse — map a lookback in days onto it.
function redditTimeframe(days: number): "day" | "week" | "month" | "year" {
  if (days <= 1) return "day";
  if (days <= 7) return "week";
  if (days <= 31) return "month";
  return "year";
}

async function redditToken(id: string, secret: string, ua: string): Promise<string> {
  const res = await fetch(REDDIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${id}:${secret}`),
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": ua,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Reddit auth ${res.status}: ${txt.slice(0, 160)}`);
  }
  const json = await res.json().catch(() => ({}));
  if (!json.access_token) throw new Error("Reddit auth: no access_token in response");
  return json.access_token as string;
}

async function redditSearchSub(
  token: string, ua: string, sub: string, query: string, limit: number, timeframe: string,
): Promise<{ data: Record<string, any> }[]> {
  const url = `${REDDIT_OAUTH}/r/${encodeURIComponent(sub)}/search?` + new URLSearchParams({
    q: query, restrict_sr: "true", sort: "new", limit: String(limit),
    t: timeframe, raw_json: "1", include_over_18: "false",
  });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "User-Agent": ua } });
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error(`reddit r/${sub} -> ${res.status}`);
  const json = await res.json().catch(() => ({}));
  return (json?.data?.children ?? []) as { data: Record<string, any> }[];
}

// Collect keyword-matching posts across the vertical's subreddits. Degrades
// gracefully: a 429 or per-sub error marks the source degraded and keeps
// whatever landed (never throws away a partial good result).
async function collectReddit(
  product: string, subreddits: string[], keywords: string[], limit: number, lookbackDays: number,
): Promise<{ items: Item[]; status: "ok" | "degraded"; note: string; posts: number }> {
  const id = Deno.env.get("REDDIT_CLIENT_ID")!;
  const secret = Deno.env.get("REDDIT_CLIENT_SECRET")!;
  const ua = Deno.env.get("REDDIT_USER_AGENT") || "vibeco-signal-mine/1.0";

  const token = await redditToken(id, secret, ua);
  const timeframe = redditTimeframe(lookbackDays);
  const cutoff = Date.now() / 1000 - lookbackDays * 86400;
  // One OR-joined query per subreddit; quote multi-word phrases.
  const query = keywords.map((k) => (k.includes(" ") ? `"${k}"` : k)).join(" OR ") || product;

  const settled = await Promise.allSettled(
    subreddits.map((s) => redditSearchSub(token, ua, s, query, limit, timeframe)),
  );

  let rateLimited = false, failures = 0, posts = 0;
  const items: Item[] = [];
  for (const r of settled) {
    if (r.status !== "fulfilled") {
      failures++;
      if (String((r as PromiseRejectedResult).reason?.message) === "RATE_LIMIT") rateLimited = true;
      continue;
    }
    for (const c of r.value) {
      posts++;
      const d = c.data;
      const created = Number(d.created_utc ?? 0);
      if (created && created < cutoff) continue;            // outside lookback
      const title = String(d.title ?? "");
      const self = String(d.selftext ?? "");
      const text = `${title}\n${self}`.trim();
      if (text.length < 24) continue;
      items.push({
        source: "reddit",
        source_url: d.permalink ? `https://www.reddit.com${d.permalink}` : (d.url || undefined),
        author_hash: d.author ? hashAuthor(String(d.author)) : undefined,
        title,
        body: text.slice(0, 4000),
        product_tag: product,
        raw: { subreddit: d.subreddit, score: d.score, num_comments: d.num_comments, created_utc: created },
      });
    }
  }

  const degraded = rateLimited || failures > 0;
  const note = rateLimited
    ? `Reddit rate-limited (429) on ${failures}/${subreddits.length} subreddits — partial results`
    : failures > 0 ? `${failures}/${subreddits.length} subreddit queries failed` : "";
  return { items, status: degraded ? "degraded" : "ok", note, posts };
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");

    const body = await req.json().catch(() => ({}));
    const product = body.product || "niceace";
    const productContext = body.product_context || "";
    const subreddits: string[] = body.subreddits || [];
    const keywords: string[] = body.keywords || [];
    const lookbackDays = Math.min(body.lookback_days || 7, 90);
    const sites: string[] = body.sites || ["reddit.com"];
    const scrape = body.scrape !== false;
    const limit = Math.min(body.limit || 6, 10);
    const scanDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const queries: string[] = body.queries || [
      "hole in one no proof verify",
      "golf side bet skins settle up app",
      "golf betting app payout trust",
      "golf scorecard app frustrating",
      "18birdies golf app problem",
    ];

    let items: Item[] = [];
    let via = "firecrawl";
    const sourceStatus: { name: string; status: string; note: string; posts: number }[] = [];
    const redditCreds = !!(Deno.env.get("REDDIT_CLIENT_ID") && Deno.env.get("REDDIT_CLIENT_SECRET"));

    // ── Primary: official Reddit API for a configured vertical. ──
    // "Real mode" — never silently synthesizes. If Reddit errors or returns
    // nothing, the (possibly empty/degraded) real result stands; the board
    // shows an honest empty state rather than fabricated pain.
    if (redditCreds && subreddits.length && keywords.length) {
      via = "reddit_api";
      try {
        const redditLimit = Math.min(body.limit || 50, 100);
        const r = await collectReddit(product, subreddits, keywords, redditLimit, lookbackDays);
        items = r.items;
        sourceStatus.push({ name: "reddit", status: r.status, note: r.note, posts: r.posts });
      } catch (e) {
        sourceStatus.push({ name: "reddit", status: "degraded", note: (e as Error).message, posts: 0 });
        console.error("reddit collection failed:", (e as Error).message);
      }
    } else if (apiKey) {
      // Build site-scoped search phrases (one per query × site) so we mine the
      // specific public surfaces we care about.
      const phrases: string[] = [];
      for (const q of queries) {
        if (sites.length) for (const s of sites) phrases.push(`site:${s} ${q}`);
        else phrases.push(q);
      }

      const settled = await Promise.allSettled(
        phrases.map((p) => firecrawlSearch(apiKey, p, limit, scrape)),
      );

      // Surface a hard failure (e.g. 402 credits) instead of silently returning 0.
      const hardError = settled.find(
        (r) => r.status === "rejected" && String((r as PromiseRejectedResult).reason?.message || "").includes("402"),
      );
      if (hardError) {
        console.warn("firecrawl 402 — falling back to Gemini synth");
      }

      items = settled.flatMap((r) => {
        if (r.status !== "fulfilled") return [];
        return r.value.map((res): Item => {
          const url = res.url || "";
          const text = (res.markdown && res.markdown.trim()) ? res.markdown : (res.description || res.title || "");
          return {
            source: sourceFor(url),
            source_url: url || undefined,
            title: res.title,
            body: String(text).slice(0, 4000),
            product_tag: product,
            raw: { description: res.description?.slice(0, 500) },
          };
        });
      }).filter((it) => it.body && it.body.length > 24);
    }

    // Fallback: only for the legacy demo path (no live Reddit collection).
    // When we went down the Reddit "real mode" path (via === "reddit_api") we
    // never synthesize — an empty result must read as an honest empty state.
    if (items.length === 0 && via !== "reddit_api") {
      try {
        const count = Math.min(body.synth_count || 15, 30);
        items = await synthesizeItems(product, productContext, queries, count);
        via = apiKey ? "ai_synth_fallback" : "ai_synth";
      } catch (e) {
        console.error("ai_synth failed:", (e as Error).message);
        return jsonResponse({ error: `Collection failed: no Firecrawl key and AI synth failed (${(e as Error).message})` }, 500);
      }
    }

    // de-dupe within this run by source_url / body prefix
    const seen = new Set<string>();
    items = items.filter((it) => {
      const key = it.source_url || it.body.slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });

    let persisted = 0;
    if (body.persist) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
          .from("signal_raw")
          .upsert(items.map((it) => ({ ...it, scan_date: scanDate })), { onConflict: "source_url", ignoreDuplicates: true })
          .select("id");
        if (error) console.error("signal_raw upsert error:", error.message);
        else persisted = data?.length ?? 0;
      }
    }

    return jsonResponse({
      product,
      collected: items.length,
      persisted,
      scan_date: scanDate,
      sources: { sites, queries, via, status: sourceStatus },
      items: body.persist ? undefined : items,
    });
  } catch (e) {
    return handleFunctionError("signal-collect", e);
  }
});
