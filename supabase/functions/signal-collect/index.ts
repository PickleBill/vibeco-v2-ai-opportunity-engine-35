import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { callLLMWithTool } from "../_shared/llm-client.ts";
import { selectModel } from "../_shared/model-router.ts";
import { dedupeByKey, normalizeTier, selectTierAdapters } from "../_shared/signal-integrity.ts";

/**
 * Signal Mine — Stage 1: Collect.
 *
 * Source-adapter shape: each adapter is { name, isConfigured(), collect(vertical) }
 * returning normalized Items. For a vertical, every configured adapter runs in
 * parallel; results are merged + de-duped (by source_url / body prefix) and
 * persisted into signal_raw. Provenance is preserved (source + url + hashed
 * author + scan_date).
 *
 * Adapters (order = display order):
 *   1. Reddit   — official Reddit API. Configured iff REDDIT_CLIENT_ID/SECRET
 *                 set AND the vertical has subreddits + keywords.
 *   2. HackerNews — Algolia HN Search API (FREE, no key). Configured iff the
 *                 vertical has keywords. Always-on for any real vertical.
 *   3. Firecrawl — site-scoped web search across reddit/HN/G2/Capterra/
 *                 Trustpilot/general web. Configured iff FIRECRAWL_API_KEY set.
 *
 * Hard rule: for any CONFIGURED vertical (real signal_verticals row, or any
 * product_tag other than the explicit 'niceace' demo), the Gemini synth
 * fallback is NEVER used. Empty real results stand → honest empty state on the
 * board. Synth path remains only for product === 'niceace'.
 *
 * Body: {
 *   product?: string,         // product_tag, default 'niceace'
 *   vertical?: string,        // human label (context)
 *   subreddits?: string[],    // Reddit adapter input
 *   keywords?: string[],      // Reddit + HN + generalized Firecrawl input
 *   lookback_days?: number,   // 1..90, default 7
 *   queries?: string[],       // niceace demo: explicit Firecrawl queries
 *   sites?: string[],         // niceace demo: site:reddit.com etc.
 *   limit?: number,           // per-adapter cap
 *   persist?: boolean,        // write to signal_raw (service role)
 *   scrape?: boolean,         // Firecrawl: full markdown (default true)
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
  if (u.includes("news.ycombinator.com")) return "hackernews";
  if (u.includes("g2.com")) return "g2_review";
  if (u.includes("capterra.com")) return "capterra_review";
  if (u.includes("trustpilot.com")) return "trustpilot_review";
  if (u.includes("apps.apple.com") || u.includes("itunes.apple.com")) return "appstore_review";
  if (u.includes("play.google.com")) return "playstore_review";
  return "web";
}

interface Item {
  source: string; source_url?: string; author_hash?: string;
  title?: string; body: string; product_tag: string; raw: Record<string, unknown>;
}

interface AdapterResult {
  items: Item[];
  status: "ok" | "degraded" | "skipped";
  note: string;
  posts: number;
}

interface VerticalCtx {
  product: string;
  productContext: string;
  vertical: string;
  subreddits: string[];
  keywords: string[];
  lookbackDays: number;
  limit: number;
  // Firecrawl-only:
  queries: string[];
  sites: string[];
  scrape: boolean;
}

interface Adapter {
  name: string;
  isConfigured(ctx: VerticalCtx): boolean;
  collect(ctx: VerticalCtx): Promise<AdapterResult>;
}

// ─────────────────────────── Reddit (official API) ───────────────────────────
const REDDIT_OAUTH = "https://oauth.reddit.com";
const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

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
  if (!res.ok) throw new Error(`Reddit auth ${res.status}`);
  const json = await res.json().catch(() => ({}));
  if (!json.access_token) throw new Error("Reddit auth: no access_token");
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

const redditAdapter: Adapter = {
  name: "reddit",
  isConfigured: (ctx) =>
    !!(Deno.env.get("REDDIT_CLIENT_ID") && Deno.env.get("REDDIT_CLIENT_SECRET")) &&
    ctx.subreddits.length > 0 && ctx.keywords.length > 0,
  async collect(ctx) {
    const id = Deno.env.get("REDDIT_CLIENT_ID")!;
    const secret = Deno.env.get("REDDIT_CLIENT_SECRET")!;
    const ua = Deno.env.get("REDDIT_USER_AGENT") || "vibeco-signal-mine/1.0";

    const token = await redditToken(id, secret, ua);
    const timeframe = redditTimeframe(ctx.lookbackDays);
    const cutoff = Date.now() / 1000 - ctx.lookbackDays * 86400;
    const limit = Math.min(ctx.limit || 50, 100);
    const query = ctx.keywords.map((k) => (k.includes(" ") ? `"${k}"` : k)).join(" OR ");

    const settled = await Promise.allSettled(
      ctx.subreddits.map((s) => redditSearchSub(token, ua, s, query, limit, timeframe)),
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
        if (created && created < cutoff) continue;
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
          product_tag: ctx.product,
          raw: { subreddit: d.subreddit, score: d.score, num_comments: d.num_comments, created_utc: created },
        });
      }
    }
    const degraded = rateLimited || failures > 0;
    const note = rateLimited
      ? `Reddit rate-limited (429) on ${failures}/${ctx.subreddits.length} subs`
      : failures > 0 ? `${failures}/${ctx.subreddits.length} sub queries failed` : "";
    return { items, status: degraded ? "degraded" : "ok", note, posts };
  },
};

// ─────────────────────────── Hacker News (free, keyless) ───────────────────────────
// Algolia HN Search: https://hn.algolia.com/api/v1/search
const HN_SEARCH = "https://hn.algolia.com/api/v1/search";

async function hnQuery(query: string, lookbackDays: number, limit: number): Promise<any[]> {
  const since = Math.floor(Date.now() / 1000) - lookbackDays * 86400;
  const url = `${HN_SEARCH}?` + new URLSearchParams({
    query,
    tags: "(story,comment)",
    numericFilters: `created_at_i>${since}`,
    hitsPerPage: String(Math.min(limit, 50)),
  });
  const res = await fetch(url, { headers: { "User-Agent": "vibeco-signal-mine/1.0" } });
  if (!res.ok) throw new Error(`HN ${res.status}`);
  const json = await res.json().catch(() => ({}));
  return (json?.hits ?? []) as any[];
}

const hackerNewsAdapter: Adapter = {
  name: "hackernews",
  isConfigured: (ctx) => ctx.keywords.length > 0,
  async collect(ctx) {
    const limit = Math.min(ctx.limit || 30, 50);
    // One search per keyword (HN search prefers focused queries over OR-joined).
    const settled = await Promise.allSettled(
      ctx.keywords.map((k) => hnQuery(k, ctx.lookbackDays, limit)),
    );
    let failures = 0, posts = 0;
    const items: Item[] = [];
    for (const r of settled) {
      if (r.status !== "fulfilled") { failures++; continue; }
      for (const h of r.value) {
        posts++;
        const title = String(h.title ?? h.story_title ?? "");
        const body = String(h.comment_text ?? h.story_text ?? "").replace(/<[^>]+>/g, "").trim();
        const text = [title, body].filter(Boolean).join("\n").trim();
        if (text.length < 24) continue;
        const objId = h.objectID ?? h.story_id ?? "";
        const url = h.url || (objId ? `https://news.ycombinator.com/item?id=${objId}` : undefined);
        items.push({
          source: "hackernews",
          source_url: url,
          author_hash: h.author ? hashAuthor(String(h.author)) : undefined,
          title: title || undefined,
          body: text.slice(0, 4000),
          product_tag: ctx.product,
          raw: { points: h.points, num_comments: h.num_comments, created_at_i: h.created_at_i, tags: h._tags },
        });
      }
    }
    const degraded = failures > 0;
    const note = degraded ? `${failures}/${ctx.keywords.length} HN queries failed` : "";
    return { items, status: degraded ? "degraded" : "ok", note, posts };
  },
};

// ─────────────────────────── Firecrawl (web search) ───────────────────────────
interface FcResult { url?: string; title?: string; description?: string; markdown?: string; }

// Pain-surface sites we search across for any configured vertical.
const PAIN_SITES = [
  "reddit.com",
  "news.ycombinator.com",
  "g2.com",
  "capterra.com",
  "trustpilot.com",
];
// Generic pain templates appended per keyword.
const PAIN_TEMPLATES = (kw: string) => [
  `${kw} frustrating`,
  `${kw} problem`,
  `${kw} alternative to`,
  `${kw} hate using`,
];

async function firecrawlSearch(
  apiKey: string, query: string, limit: number, scrape: boolean,
): Promise<FcResult[]> {
  const res = await fetch(`${FIRECRAWL_V2}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query, limit,
      ...(scrape ? { scrapeOptions: { formats: ["markdown"], onlyMainContent: true } } : {}),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 402) throw new Error("Firecrawl 402 (credits)");
    return [];
  }
  const data = (json as Record<string, any>).data;
  const list: FcResult[] = Array.isArray(data) ? data : (data?.web ?? data?.results ?? []);
  return list ?? [];
}

const firecrawlAdapter: Adapter = {
  name: "firecrawl",
  isConfigured: (ctx) =>
    !!Deno.env.get("FIRECRAWL_API_KEY") && (ctx.keywords.length > 0 || ctx.queries.length > 0),
  async collect(ctx) {
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY")!;
    const limit = Math.min(ctx.limit || 6, 10);

    // Build phrases: niceace demo path uses explicit queries+sites; any other
    // vertical generalizes over its own keywords across pain-surface sites.
    const phrases: string[] = [];
    if (ctx.product === "niceace" && ctx.queries.length) {
      for (const q of ctx.queries) {
        if (ctx.sites.length) for (const s of ctx.sites) phrases.push(`site:${s} ${q}`);
        else phrases.push(q);
      }
    } else {
      // Generalized: vertical keywords × pain templates × pain sites + open web.
      const top = ctx.keywords.slice(0, 5); // cap to keep request count sane
      for (const kw of top) {
        for (const tmpl of PAIN_TEMPLATES(kw)) {
          for (const s of PAIN_SITES) phrases.push(`site:${s} ${tmpl}`);
          phrases.push(tmpl); // also open-web
        }
      }
    }

    const settled = await Promise.allSettled(
      phrases.map((p) => firecrawlSearch(apiKey, p, limit, ctx.scrape)),
    );
    let failures = 0, posts = 0;
    const items: Item[] = [];
    for (const r of settled) {
      if (r.status !== "fulfilled") { failures++; continue; }
      for (const res of r.value) {
        posts++;
        const url = res.url || "";
        const text = (res.markdown && res.markdown.trim()) ? res.markdown : (res.description || res.title || "");
        const body = String(text).slice(0, 4000);
        if (body.length < 24) continue;
        items.push({
          source: sourceFor(url),
          source_url: url || undefined,
          title: res.title,
          body,
          product_tag: ctx.product,
          raw: { description: res.description?.slice(0, 500) },
        });
      }
    }
    const degraded = failures > 0;
    return {
      items,
      status: degraded ? "degraded" : "ok",
      note: degraded ? `${failures}/${phrases.length} Firecrawl queries failed` : "",
      posts,
    };
  },
};

// ─────────────────────────── Native AI-Gateway grounded "scout" ───────────────────────────
// Uses the existing LOVABLE_API_KEY / Lovable AI Gateway to ask a model to
// surface REAL public pain signals with REAL cited URLs. We then verify each
// URL with a HEAD request — fabricated URLs (404 / DNS fail) are dropped. If
// nothing real survives, the adapter returns empty + status "unsupported" and
// NEVER persists fabricated data.
const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const scoutSchema = {
  type: "function" as const,
  function: {
    name: "report_pain_signals",
    description: "Report public pain signals with real, currently-reachable source URLs found via web search. Do NOT invent URLs.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source_url: { type: "string", description: "Real public URL (Reddit thread, HN comment, G2/Capterra/Trustpilot review, blog post) that you actually found." },
              title: { type: "string" },
              body: { type: "string", description: "Verbatim or close-paraphrase of the user's complaint, 1-5 sentences." },
            },
            required: ["source_url", "body"], additionalProperties: false,
          },
        },
      },
      required: ["items"], additionalProperties: false,
    },
  },
};

async function verifyUrl(url: string): Promise<boolean> {
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctl.signal });
    clearTimeout(to);
    if (r.status < 400) return true;
    // Some sites 405 on HEAD — retry GET (range-limited).
    if (r.status === 405 || r.status === 403) {
      const ctl2 = new AbortController();
      const to2 = setTimeout(() => ctl2.abort(), 4000);
      const r2 = await fetch(url, { method: "GET", headers: { Range: "bytes=0-256" }, signal: ctl2.signal });
      clearTimeout(to2);
      return r2.status < 400;
    }
    return false;
  } catch { return false; }
}

const aiGatewayScoutAdapter: Adapter = {
  name: "ai_gateway_scout",
  isConfigured: (ctx) => !!Deno.env.get("LOVABLE_API_KEY") && ctx.keywords.length > 0,
  async collect(ctx) {
    const key = Deno.env.get("LOVABLE_API_KEY")!;
    // Try a search-grounded request. The Lovable AI Gateway is OpenAI-compatible
    // and may or may not support Google Search grounding tools; if the request
    // shape is rejected (400) we mark unsupported rather than fabricating.
    const system = `You are a research scout. Use ONLY real public web sources (Reddit, Hacker News, G2, Capterra, Trustpilot, blogs, forums) to surface CURRENT pain signals about the user's vertical. NEVER invent URLs — every source_url MUST be a real page you actually found. If you can't find real evidence, return an empty list.`;
    const user = `Vertical: ${ctx.vertical} (${ctx.product}).
Keywords: ${ctx.keywords.join(", ")}.
Find up to 10 recent public complaints/pain points from real users in the last ${ctx.lookbackDays} days where possible. Each item MUST include a real source_url.`;

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      tools: [
        scoutSchema,
        // Best-effort: ask for Google Search grounding. If the gateway ignores
        // this tool we still get structured output; if it rejects the field
        // entirely we mark unsupported below.
        { type: "google_search" } as unknown as Record<string, unknown>,
      ],
      tool_choice: { type: "function", function: { name: "report_pain_signals" } },
      max_tokens: 4096,
    };

    let raw: any;
    try {
      const res = await fetch(LOVABLE_GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 400) {
        // Retry without the unknown google_search tool — gateway may not support it.
        const res2 = await fetch(LOVABLE_GATEWAY, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, tools: [scoutSchema] }),
        });
        if (!res2.ok) return { items: [], status: "skipped", note: `gateway ${res2.status} (no grounding)`, posts: 0 };
        raw = await res2.json();
      } else if (!res.ok) {
        return { items: [], status: "degraded", note: `gateway ${res.status}`, posts: 0 };
      } else {
        raw = await res.json();
      }
    } catch (e) {
      return { items: [], status: "degraded", note: (e as Error).message, posts: 0 };
    }

    const tc = raw?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: { items?: { source_url: string; title?: string; body: string }[] } = {};
    try { parsed = typeof tc === "string" ? JSON.parse(tc) : (tc ?? {}); } catch { /* noop */ }
    const candidates = (parsed.items ?? []).filter((it) => it?.source_url && it?.body && it.body.length >= 24);
    const posts = candidates.length;
    if (posts === 0) return { items: [], status: "ok", note: "no grounded results", posts: 0 };

    // Verify each URL is reachable. Drop fabricated/dead links.
    const verified = await Promise.all(candidates.map(async (it) => ((await verifyUrl(it.source_url)) ? it : null)));
    const real = verified.filter(Boolean) as { source_url: string; title?: string; body: string }[];

    if (real.length === 0) {
      return { items: [], status: "unsupported", note: "no URLs verified — model could not ground in real web results", posts };
    }
    const items: Item[] = real.map((it) => ({
      source: sourceFor(it.source_url),
      source_url: it.source_url,
      title: it.title,
      body: it.body.slice(0, 4000),
      product_tag: ctx.product,
      raw: { via: "ai_gateway_scout", verified: true },
    }));
    return { items, status: "ok", note: `${real.length}/${posts} URLs verified`, posts };
  },
};

// ─────────────────────────── Anthropic web_search ───────────────────────────
// Dormant until ANTHROPIC_API_KEY is set. Uses Claude's server-side web_search
// tool to find + extract real pain signals with real citation URLs.
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const getAnthropicKey = () =>
  Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("anthropic_api_key") || "";

const anthropicWebSearchAdapter: Adapter = {
  name: "anthropic_web_search",
  isConfigured: (ctx) => !!getAnthropicKey() && ctx.keywords.length > 0,
  async collect(ctx) {
    const key = getAnthropicKey();
    const prompt = `Find recent public pain points for "${ctx.vertical}" (keywords: ${ctx.keywords.slice(0, 8).join(", ")}). Search Reddit, Hacker News, G2, Capterra, Trustpilot, and blogs. For each finding, return STRICT JSON like {"items":[{"source_url":"...","title":"...","body":"..."}]} where source_url is a real URL you actually visited. No invented URLs.`;
    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 4096,
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) return { items: [], status: "degraded", note: `anthropic ${res.status}`, posts: 0 };
      const json = await res.json();

      // Collect citation URLs from web_search_tool_result blocks.
      const citedUrls = new Set<string>();
      for (const block of (json.content ?? [])) {
        if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
          for (const r of block.content) if (r?.url) citedUrls.add(r.url);
        }
        // text blocks may also carry citations
        if (Array.isArray(block.citations)) for (const c of block.citations) if (c?.url) citedUrls.add(c.url);
      }

      // Find the model's final text and parse JSON.
      const text = (json.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
      const m = text.match(/\{[\s\S]*"items"[\s\S]*\}/);
      let parsed: { items?: { source_url: string; title?: string; body: string }[] } = {};
      if (m) try { parsed = JSON.parse(m[0]); } catch { /* noop */ }
      const candidates = (parsed.items ?? []).filter((it) =>
        it?.source_url && it?.body && it.body.length >= 24 && citedUrls.has(it.source_url)
      );
      if (candidates.length === 0) return { items: [], status: "ok", note: "no cited items", posts: 0 };
      const items: Item[] = candidates.map((it) => ({
        source: sourceFor(it.source_url),
        source_url: it.source_url,
        title: it.title,
        body: it.body.slice(0, 4000),
        product_tag: ctx.product,
        raw: { via: "anthropic_web_search" },
      }));
      return { items, status: "ok", note: "", posts: candidates.length };
    } catch (e) {
      return { items: [], status: "degraded", note: (e as Error).message, posts: 0 };
    }
  },
};

// ─────────────────────────── Perplexity Sonar ───────────────────────────
// Dormant until PERPLEXITY_API_KEY is set. Sonar returns grounded answers
// with `citations: string[]` — we store the citation URLs as real items.
const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";

const perplexityAdapter: Adapter = {
  name: "perplexity_sonar",
  isConfigured: (ctx) => !!Deno.env.get("PERPLEXITY_API_KEY") && ctx.keywords.length > 0,
  async collect(ctx) {
    const key = Deno.env.get("PERPLEXITY_API_KEY")!;
    const query = `Find recent, specific public complaints and pain points from people working in or buying "${ctx.vertical}". Focus on: ${ctx.keywords.slice(0, 8).join(", ")}. Quote 1-2 sentences per pain point with the source URL.`;
    try {
      const res = await fetch(PERPLEXITY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            { role: "system", content: "Be specific. Quote real users. Cite real URLs." },
            { role: "user", content: query },
          ],
          search_recency_filter: ctx.lookbackDays <= 7 ? "week" : ctx.lookbackDays <= 31 ? "month" : "year",
        }),
      });
      if (!res.ok) return { items: [], status: "degraded", note: `perplexity ${res.status}`, posts: 0 };
      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      const citations: string[] = Array.isArray(json?.citations) ? json.citations : [];
      if (!content || citations.length === 0) return { items: [], status: "ok", note: "no citations", posts: 0 };
      // Split the answer into paragraphs and zip with citations as evidence rows.
      const paras = content.split(/\n{2,}|\n(?=[-*\d])/).map((s) => s.trim()).filter((s) => s.length >= 24);
      const items: Item[] = citations.map((url, i) => ({
        source: sourceFor(url),
        source_url: url,
        title: undefined,
        body: (paras[i] ?? paras[0] ?? content).slice(0, 4000),
        product_tag: ctx.product,
        raw: { via: "perplexity_sonar" },
      }));
      return { items, status: "ok", note: "", posts: citations.length };
    } catch (e) {
      return { items: [], status: "degraded", note: (e as Error).message, posts: 0 };
    }
  },
};

// ─────────────────────────── Exa (neural web search) ───────────────────────────
// Dormant until EXA_API_KEY is set. Exa is a NEURAL search engine — phrasing the
// *ideal complaint page* beats keyword/`site:` operators (which it ignores). We
// hit the REST /search API directly because the knobs we need (neural type +
// full-text `contents`) aren't on the MCP surface. One pain-framed query per
// keyword; fan-out + per-query result count are capped to bound cost.
const EXA_URL = "https://api.exa.ai/search";

// Obvious vendor-marketing hosts that *describe* pain to sell a fix — not real
// first-person complaints. Cheap denylist; clustering handles the rest.
const EXA_JUNK_HOST = /(^|\.)(arkenea|dentistryiq|dentalbase|denzif|turnup)\./i;

interface ExaResult { url?: string; title?: string; text?: string; author?: string; publishedDate?: string; }

async function exaSearch(key: string, query: string, numResults: number): Promise<ExaResult[]> {
  const res = await fetch(EXA_URL, {
    method: "POST",
    headers: { "x-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      type: "neural",
      numResults,
      contents: { text: { maxCharacters: 2000 } },
    }),
  });
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error(`exa ${res.status}`);
  const json = await res.json().catch(() => ({}));
  return Array.isArray((json as Record<string, any>)?.results) ? (json as Record<string, any>).results : [];
}

const exaAdapter: Adapter = {
  name: "exa",
  isConfigured: (ctx) => !!Deno.env.get("EXA_API_KEY") && ctx.keywords.length > 0,
  async collect(ctx) {
    const key = Deno.env.get("EXA_API_KEY")!;
    // Neural search rewards describing the page we want, not boolean keywords.
    const queries = ctx.keywords.slice(0, 5).map(
      (kw) => `Forum post or review where someone in ${ctx.vertical} complains that ${kw} is frustrating, buggy, slow, or broken`,
    );
    const perQuery = Math.min(Math.max(Math.round((ctx.limit || 30) / queries.length), 4), 8);

    const settled = await Promise.allSettled(queries.map((q) => exaSearch(key, q, perQuery)));
    let rateLimited = false, failures = 0, posts = 0;
    const items: Item[] = [];
    for (const r of settled) {
      if (r.status !== "fulfilled") {
        failures++;
        if (String((r as PromiseRejectedResult).reason?.message) === "RATE_LIMIT") rateLimited = true;
        continue;
      }
      for (const hit of r.value) {
        posts++;
        const url = hit.url;
        const body = (hit.text ?? "").trim();
        if (!url || !/^https?:\/\//.test(url) || body.length < 80) continue;
        if (EXA_JUNK_HOST.test(url)) continue;
        items.push({
          source: sourceFor(url),
          source_url: url,
          author_hash: hit.author ? hashAuthor(String(hit.author)) : undefined,
          title: hit.title || undefined,
          body: body.slice(0, 4000),
          product_tag: ctx.product,
          raw: { via: "exa", published_date: hit.publishedDate ?? null },
        });
      }
    }
    const degraded = rateLimited || failures > 0;
    const note = rateLimited
      ? `Exa rate-limited (429) on ${failures}/${queries.length} queries`
      : failures > 0 ? `${failures}/${queries.length} Exa queries failed` : "";
    return { items, status: degraded ? "degraded" : "ok", note, posts };
  },
};

const ADAPTERS: Adapter[] = [
  redditAdapter,
  hackerNewsAdapter,
  aiGatewayScoutAdapter,
  anthropicWebSearchAdapter,
  perplexityAdapter,
  exaAdapter,
  firecrawlAdapter,
];

// ─────────────────────────── Gemini synth (niceace demo only) ───────────────────────────
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
              title: { type: "string" },
              body: { type: "string" },
            },
            required: ["source", "title", "body"], additionalProperties: false,
          },
        },
      },
      required: ["items"], additionalProperties: false,
    },
  },
};

async function synthesizeItems(product: string, productContext: string, queries: string[], count: number): Promise<Item[]> {
  const model = selectModel("pain-classification");
  const system = `You generate diverse, realistic-sounding public pain signals for product research about "${product}". ${productContext}`;
  const user = `Generate ${count} items spanning:\n${queries.map((q) => `- ${q}`).join("\n")}`;
  const out = await callLLMWithTool<{ items: { source: string; title: string; body: string }[] }>({
    model, messages: [{ role: "system", content: system }, { role: "user", content: user }],
    tools: [synthSchema], toolChoice: { type: "function", function: { name: "synthesize_pain_signals" } },
    maxTokens: 4096,
  });
  return (out.items ?? []).map((it, i) => ({
    source: "ai_synth",
    source_url: `synth://${product}/${Date.now()}-${i}`,
    title: it.title, body: it.body, product_tag: product,
    raw: { synthesized: true, original_source: it.source },
  }));
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json().catch(() => ({}));
    const product: string = body.product || "niceace";
    const ctx: VerticalCtx = {
      product,
      productContext: body.product_context || "",
      vertical: body.vertical || product,
      subreddits: Array.isArray(body.subreddits) ? body.subreddits : [],
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
      lookbackDays: Math.min(Math.max(body.lookback_days || 7, 1), 90),
      limit: body.limit,
      queries: Array.isArray(body.queries) ? body.queries : [],
      sites: Array.isArray(body.sites) ? body.sites : ["reddit.com"],
      scrape: body.scrape !== false,
    };
    const scanDate = new Date().toISOString().slice(0, 10);

    // A "real" vertical = anything other than the explicit niceace demo, OR
    // niceace itself when keywords/subreddits are provided. The synth path is
    // ONLY allowed when product === 'niceace' AND no real vertical config.
    const isRealVertical = product !== "niceace" || ctx.subreddits.length > 0 || ctx.keywords.length > 0;

    // For niceace demo with no config, seed default keywords for HN/Firecrawl.
    if (!isRealVertical) {
      ctx.queries = ctx.queries.length ? ctx.queries : [
        "hole in one no proof verify",
        "golf side bet skins settle up app",
        "golf betting app payout trust",
        "golf scorecard app frustrating",
        "18birdies golf app problem",
      ];
    }

    // Run every configured adapter in parallel — but honor the scan tier.
    // LITE (public self-serve) runs only the cheap keyless adapters; the paid
    // web-search adapters are held for FULL (admin/cron) so an anonymous
    // visitor can't run up the bill.
    const tier = normalizeTier(body.tier);
    // Lite scans stay small + cheap (HN/scout only, tight per-adapter cap).
    if (tier === "lite") ctx.limit = Math.min(ctx.limit || 12, 15);

    // Rate-limit LITE (public self-serve) scans so an anonymous visitor can't
    // spam the pipeline: per-client cap + a global daily backstop. Refuse BEFORE
    // running any adapter (i.e. before spending). Full (admin/cron) scans skip this.
    if (tier === "lite") {
      const su = Deno.env.get("SUPABASE_URL");
      const sk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (su && sk) {
        const rl = createClient(su, sk, { auth: { persistSession: false } });
        // Prefer a stable client-supplied key (the frontend sends a persistent
        // localStorage UUID); fall back to the forwarded IP. The global daily
        // cap below is the real backstop regardless of key stability.
        const ipRaw = (typeof body.client_key === "string" && body.client_key.trim())
          || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
          || "anon";
        const clientKey = hashAuthor(ipRaw); // never store the raw key/IP
        const PER_CLIENT_MAX = 3, WINDOW_MIN = 60, GLOBAL_DAILY_MAX = 200;
        const sinceHour = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
        const sinceDay = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
        const [mine, global] = await Promise.all([
          rl.from("scan_requests").select("id", { count: "exact", head: true })
            .eq("client_key", clientKey).gte("created_at", sinceHour),
          rl.from("scan_requests").select("id", { count: "exact", head: true })
            .eq("tier", "lite").gte("created_at", sinceDay),
        ]);
        if ((mine.count ?? 0) >= PER_CLIENT_MAX) {
          return jsonResponse({ error: `You've hit the free limit of ${PER_CLIENT_MAX} scans per hour. Sign in for full, unlimited scans.`, rate_limited: true }, 429);
        }
        if ((global.count ?? 0) >= GLOBAL_DAILY_MAX) {
          return jsonResponse({ error: "Free scans are at capacity for today — try again tomorrow or sign in.", rate_limited: true }, 429);
        }
        await rl.from("scan_requests").insert({ client_key: clientKey, product_tag: product, tier });
      }
    }

    const sourceStatus: { name: string; status: string; note: string; posts: number }[] = [];
    const allConfigured = ADAPTERS.filter((a) => a.isConfigured(ctx));
    const skipped = ADAPTERS.filter((a) => !a.isConfigured(ctx));
    for (const a of skipped) sourceStatus.push({ name: a.name, status: "skipped", note: "not configured", posts: 0 });

    const { run: runNames, held } = selectTierAdapters(allConfigured.map((a) => a.name), tier);
    const configured = allConfigured.filter((a) => runNames.includes(a.name));
    for (const name of held) sourceStatus.push({ name, status: "skipped", note: "held for full scan (lite tier)", posts: 0 });

    const runs = await Promise.allSettled(configured.map((a) => a.collect(ctx)));
    let items: Item[] = [];
    runs.forEach((r, i) => {
      const a = configured[i];
      if (r.status === "fulfilled") {
        items.push(...r.value.items);
        sourceStatus.push({ name: a.name, status: r.value.status, note: r.value.note, posts: r.value.posts });
      } else {
        sourceStatus.push({ name: a.name, status: "degraded", note: (r.reason as Error)?.message ?? "error", posts: 0 });
      }
    });

    let via = configured.map((a) => a.name).join("+") || "none";

    // Synth fallback — niceace demo ONLY, never for real verticals.
    if (items.length === 0 && !isRealVertical) {
      try {
        const count = Math.min(body.synth_count || 15, 30);
        items = await synthesizeItems(product, ctx.productContext, ctx.queries, count);
        via = via === "none" ? "ai_synth" : `${via}+ai_synth_fallback`;
        sourceStatus.push({ name: "ai_synth", status: "ok", note: "demo fallback", posts: items.length });
      } catch (e) {
        console.error("ai_synth failed:", (e as Error).message);
      }
    }

    // De-dupe within this run (shared, tested invariant — mirrors the DB-side
    // upsert(onConflict:"source_url") so a mid-run kill + restart never double-writes).
    items = dedupeByKey(items);

    let persisted = 0;
    if (body.persist && items.length > 0) {
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
      sources: {
        via,
        adapters: ADAPTERS.map((a) => ({ name: a.name, configured: a.isConfigured(ctx) })),
        status: sourceStatus,
      },
      items: body.persist ? undefined : items,
    });
  } catch (e) {
    return handleFunctionError("signal-collect", e);
  }
});
