// Opportunity Roadmap — runs the AI Gateway over the LIVE mined signal for a
// vertical and drafts a build-or-sell roadmap. Thin HTTP wrapper around
// _shared/agents/opportunity-roadmap.ts (see the "Adding a New Agent" steps).
//
// Body: { product: string (product_tag), vertical?: string, persist?: boolean, mode?: 'fast'|'deep' }
// Admin-triggered from the board; cron/anon don't call it. No new AI keys —
// reuses the Lovable AI Gateway via the shared llm-client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import {
  generateRoadmap,
  type RoadmapInputCandidate,
  type RoadmapInputTheme,
} from "../_shared/agents/opportunity-roadmap.ts";

// representative_quotes can be strings (signal-process) or {text,...} (ingest-signal).
function quotesOf(rq: unknown): string[] {
  if (!Array.isArray(rq)) return [];
  return rq.map((q: any) => (typeof q === "string" ? q : q?.text ?? "")).filter(Boolean);
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    if (req.method !== "POST") return jsonResponse({ error: "POST only" }, 405);

    const body = await req.json().catch(() => ({}));
    const product = body.product;
    if (!product) return jsonResponse({ error: "Missing required field: product" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return jsonResponse({ error: "DB not configured" }, 500);
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    // Load the live candidates for the vertical (the rows the AI must reason over).
    const { data: cand } = await supabase
      .from("feature_candidates").select("*")
      .eq("product_tag", product).eq("status", "open")
      .order("pain_score", { ascending: false }).limit(20);

    const candidates: RoadmapInputCandidate[] = (cand ?? []).map((r: any) => ({
      cluster_theme: r.cluster_theme ?? r.problem ?? "Untitled",
      problem: r.problem ?? "",
      proposed_solution: r.proposed_solution ?? "",
      pain_score: Number(r.pain_score ?? 0),
      confidence: Number(r.confidence ?? 0),
      effort: r.effort ?? undefined,
      member_count: Number(r.evidence?.member_count ?? 0),
      sources: Array.isArray(r.evidence?.sources) ? r.evidence.sources : [],
      quotes: quotesOf(r.representative_quotes),
    }));

    if (!candidates.length) {
      return jsonResponse({ error: "No live candidates for this vertical yet — run a scan first." }, 409);
    }

    const { data: th } = await supabase
      .from("signal_themes").select("title, pain_score, score_history, occurrence_count")
      .eq("product_tag", product).eq("status", "open")
      .order("pain_score", { ascending: false }).limit(12);

    const themes: RoadmapInputTheme[] = (th ?? []).map((t: any) => {
      const h = Array.isArray(t.score_history) ? t.score_history : [];
      const trend = h.length >= 2 ? Math.round((h.at(-1)?.s ?? 0) - (h.at(-2)?.s ?? 0)) : 0;
      return { title: t.title, pain_score: Number(t.pain_score ?? 0), trend, occurrence_count: Number(t.occurrence_count ?? 1) };
    });

    const vertical = body.vertical || product;
    const roadmap = await generateRoadmap({ vertical, candidates, themes, mode: body.mode });

    let saved = false;
    if (body.persist) {
      const scan_date = new Date().toISOString().slice(0, 10);
      // Keep one current roadmap per (product_tag, scan_date).
      await supabase.from("opportunity_roadmaps").delete().eq("product_tag", product).eq("scan_date", scan_date);
      const { error } = await supabase.from("opportunity_roadmaps").insert({
        product_tag: product, scan_date,
        summary: roadmap.summary, market_read: roadmap.market_read,
        opportunities: roadmap.opportunities, model: "lovable-ai-gateway",
        generated_at: new Date().toISOString(),
      });
      if (error) console.error("roadmap persist:", error.message);
      else saved = true;
    }

    return jsonResponse({ ok: true, product, vertical, saved, roadmap });
  } catch (e) {
    return handleFunctionError("opportunity-roadmap", e);
  }
});
