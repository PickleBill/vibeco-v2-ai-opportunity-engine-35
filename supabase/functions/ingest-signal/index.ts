// Ingest-signal: external Social-Signal Scanner pushes scan results here.
// Reuses the existing Signal Mine schema (signal_raw / signal_clusters /
// signal_themes / feature_candidates). Idempotent per (product_tag, scan_date).
//
// Auth: Authorization: Bearer <INGEST_TOKEN> (project secret).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";

const SCHEMA_ID = "social-signal-scan/v1";

interface Quote { text: string; url?: string; source?: string; score?: number }
interface ClusterIn {
  rank?: number; name: string; mentions?: number; intensity?: number;
  score?: number; automations?: string[]; quotes?: Quote[];
}
interface Payload {
  schema: string; date: string; generated_at?: string; vertical: string;
  clustering?: string; model?: string;
  sources?: { name: string; status?: string; posts?: number; note?: string }[];
  counts?: { collected?: number; analyzed?: number };
  clusters: ClusterIn[];
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untagged";

const effortFor = (score?: number): "S" | "M" | "L" =>
  !score ? "M" : score >= 80 ? "L" : score >= 50 ? "M" : "S";

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    if (req.method !== "POST") return jsonResponse({ error: "POST only" }, 405);

    const token = Deno.env.get("INGEST_TOKEN");
    const auth = req.headers.get("Authorization") ?? "";
    if (!token || auth !== `Bearer ${token}`) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json()) as Payload;
    if (!body || typeof body !== "object") return jsonResponse({ error: "Invalid JSON" }, 400);
    if (body.schema !== SCHEMA_ID) return jsonResponse({ error: `Unsupported schema (expected ${SCHEMA_ID})` }, 400);
    if (!body.vertical || !body.date || !Array.isArray(body.clusters)) {
      return jsonResponse({ error: "Missing required fields: vertical, date, clusters" }, 400);
    }

    const product_tag = slug(body.vertical);
    const scan_date = body.date; // ISO YYYY-MM-DD
    const generated_at = body.generated_at ?? new Date().toISOString();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Idempotency: wipe prior rows for this (product_tag, scan_date) on the
    // three "snapshot" tables. signal_themes are durable and upserted instead.
    await supabase.from("signal_raw").delete().eq("product_tag", product_tag).eq("scan_date", scan_date);
    await supabase.from("signal_clusters").delete().eq("product_tag", product_tag).eq("scan_date", scan_date);
    await supabase.from("feature_candidates").delete().eq("product_tag", product_tag).eq("scan_date", scan_date);

    let themesInserted = 0, clustersInserted = 0, candidatesInserted = 0, rawInserted = 0;

    for (const c of body.clusters) {
      const pain = Math.round(c.score ?? 0);
      const mentions = c.mentions ?? (c.quotes?.length ?? 0);
      const quotes = (c.quotes ?? []).map((q) => ({
        text: q.text, url: q.url ?? null, source: q.source ?? null, score: q.score ?? null,
      }));

      // 1) Upsert signal_themes (durable, append to score_history).
      const { data: existingTheme } = await supabase
        .from("signal_themes")
        .select("id, score_history, occurrence_count")
        .eq("product_tag", product_tag).eq("title", c.name).maybeSingle();

      const newPoint = { t: scan_date, s: pain };
      let cluster_id: string | null = null;
      let theme_id: string | null = null;

      if (existingTheme) {
        const history = Array.isArray(existingTheme.score_history) ? existingTheme.score_history : [];
        const filtered = history.filter((p: any) => p?.t !== scan_date);
        const merged = [...filtered, newPoint].slice(-30);
        const { data: upd } = await supabase.from("signal_themes").update({
          pain_score: pain,
          occurrence_count: mentions,
          sample_quotes: quotes,
          score_history: merged,
          last_seen: generated_at,
          scan_date,
          status: "open",
        }).eq("id", existingTheme.id).select("id").maybeSingle();
        theme_id = upd?.id ?? existingTheme.id;
      } else {
        const { data: ins } = await supabase.from("signal_themes").insert({
          product_tag, title: c.name, status: "open",
          pain_score: pain, occurrence_count: mentions, candidate_count: (c.automations ?? []).length,
          sample_quotes: quotes, score_history: [newPoint],
          first_seen: generated_at, last_seen: generated_at, scan_date,
        }).select("id").maybeSingle();
        theme_id = ins?.id ?? null;
        themesInserted++;
      }

      // 2) Insert signal_clusters snapshot row.
      const { data: cl } = await supabase.from("signal_clusters").insert({
        product_tag, theme: c.name, pain_score: pain, member_count: mentions, scan_date,
      }).select("id").maybeSingle();
      cluster_id = cl?.id ?? null;
      clustersInserted++;

      // 3) Feature candidates — one per automation.
      const automations = c.automations ?? [];
      if (automations.length > 0) {
        const candRows = automations.map((a) => ({
          product_tag, cluster_id, theme_id,
          problem: c.name, proposed_solution: a,
          representative_quotes: quotes.slice(0, 3),
          evidence: { member_count: mentions, sources: Array.from(new Set(quotes.map((q) => q.source).filter(Boolean))) },
          pain_score: pain,
          confidence: Math.min(95, 50 + Math.round(mentions * 2)),
          effort: effortFor(pain),
          status: "open",
          scan_date,
        }));
        const { data: candIns } = await supabase.from("feature_candidates").insert(candRows).select("id");
        candidatesInserted += candIns?.length ?? 0;
      }

      // 4) signal_raw — one per quote (the receipts).
      const rawRows = quotes.map((q) => ({
        source: q.source ?? "external",
        source_url: q.url,
        title: c.name,
        body: q.text,
        product_tag,
        processed: true,
        cluster_id,
        scan_date,
        raw: { scan_date, cluster: c.name, score: q.score ?? null },
        collected_at: generated_at,
      }));
      if (rawRows.length) {
        const { data: rawIns } = await supabase.from("signal_raw").insert(rawRows).select("id");
        rawInserted += rawIns?.length ?? 0;
      }
    }

    return jsonResponse({
      ok: true,
      product_tag,
      date: scan_date,
      inserted: {
        themes: themesInserted,
        clusters: clustersInserted,
        candidates: candidatesInserted,
        raw: rawInserted,
      },
    });
  } catch (e) {
    return handleFunctionError("ingest-signal", e);
  }
});
