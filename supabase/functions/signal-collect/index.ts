import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";

/**
 * Signal Mine — Stage 1: Collect (LIVE via Firecrawl).
 *
 * Reddit's public search JSON and Apple's review RSS both block / return empty
 * from datacenter IPs, so live collection runs through Firecrawl, which scrapes
 * the real web with proxy rotation. We search compliant, public discussions
 * (Reddit threads, forums, app-store review pages) for customer pain points,
 * store provenance (source + url + hashed author when present), de-dupe on
 * source_url, and persist to signal_raw. Classification/clustering is Stage 2+
 * (signal-process).
 *
 * Body: {
 *   product?: string,        // default 'niceace'
 *   queries?: string[],      // search phrases (pain-oriented)
 *   sites?: string[],        // domains to scope to, default ['reddit.com']
 *   limit?: number,          // results per query, default 6 (max 10)
 *   persist?: boolean,       // write to signal_raw (needs service role)
 *   scrape?: boolean         // pull full page markdown (default true)
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

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "FIRECRAWL_API_KEY is not configured. Link the Firecrawl connector." }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const product = body.product || "niceace";
    const sites: string[] = body.sites || ["reddit.com"];
    const scrape = body.scrape !== false;
    const limit = Math.min(body.limit || 6, 10);
    const queries: string[] = body.queries || [
      "hole in one no proof verify",
      "golf side bet skins settle up app",
      "golf betting app payout trust",
      "golf scorecard app frustrating",
      "18birdies golf app problem",
    ];

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
      return jsonResponse({ error: (hardError as PromiseRejectedResult).reason.message }, 402);
    }

    let items: Item[] = settled.flatMap((r) => {
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
          .upsert(items, { onConflict: "source_url", ignoreDuplicates: true })
          .select("id");
        if (error) console.error("signal_raw upsert error:", error.message);
        else persisted = data?.length ?? 0;
      }
    }

    return jsonResponse({
      product,
      collected: items.length,
      persisted,
      sources: { sites, queries, via: "firecrawl" },
      items: body.persist ? undefined : items,
    });
  } catch (e) {
    return handleFunctionError("signal-collect", e);
  }
});
