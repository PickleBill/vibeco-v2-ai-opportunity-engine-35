// signal-candidate-deepen — W6 dogfood loop. Takes a feature_candidate.id, runs
// it back through the v1 Simulator (simulate-idea + Skeptic/Customer/Builder
// personas) via _shared/agents/candidate-deepen.ts, persists the deep read to
// signal_candidate_simulations (one current row per candidate), and stamps
// feature_candidates.deepened_at.
//
// Body: { id: string (feature_candidate.id), mode?: 'fast'|'deep', force?: boolean }
// Admin-triggered from the board; cron/anon don't call it. No new AI keys —
// reuses the Lovable AI Gateway via the shared agents. Persists with the service
// role (writes are service-role only after the RLS lockdown).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { deepenCandidate } from "../_shared/agents/candidate-deepen.ts";

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    if (req.method !== "POST") return jsonResponse({ error: "POST only" }, 405);

    const body = await req.json().catch(() => ({}));
    const id = body.id || body.candidate_id || body.feature_candidate_id;
    if (!id) {
      return jsonResponse({ error: "Missing required field: id (feature_candidate.id)" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return jsonResponse({ error: "DB not configured" }, 500);
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    // 1) Load the candidate (the row the deep read reasons over).
    const { data: cand, error: cErr } = await supabase
      .from("feature_candidates")
      .select("id, product_tag, problem, proposed_solution, evidence, representative_quotes, deepened_at")
      .eq("id", id)
      .single();
    if (cErr || !cand) return jsonResponse({ error: "feature_candidate not found" }, 404);

    // 2) Idempotency / cost control: if already deepened, return the cached deep
    //    read instead of spending LLM credits again — unless force:true.
    if (cand.deepened_at && !body.force) {
      const { data: existing } = await supabase
        .from("signal_candidate_simulations")
        .select("*")
        .eq("feature_candidate_id", id)
        .maybeSingle();
      if (existing) {
        return jsonResponse({ ok: true, cached: true, deepened_at: cand.deepened_at, simulation: existing });
      }
    }

    // 3) Run the dogfood loop (simulate-idea once + 3 personas).
    const result = await deepenCandidate({
      problem: cand.problem,
      proposed_solution: cand.proposed_solution,
      evidence: cand.evidence,
      representative_quotes: cand.representative_quotes,
      mode: body.mode,
    });

    // 4) Persist — one current deep read per candidate (delete-then-insert,
    //    mirroring opportunity-roadmap's per-key idempotency).
    const now = new Date().toISOString();
    await supabase.from("signal_candidate_simulations").delete().eq("feature_candidate_id", id);
    const { data: ins, error: iErr } = await supabase
      .from("signal_candidate_simulations")
      .insert({
        feature_candidate_id: id,
        product_tag: cand.product_tag,
        idea_prompt: result.idea_prompt,
        brief: result.brief,
        perspectives: result.perspectives,
        model_mode: body.mode || "fast",
        created_at: now,
      })
      .select("*")
      .single();
    if (iErr) throw new Error(`simulation persist: ${iErr.message}`);

    // 5) Surface the deep read on the candidate row.
    const { error: uErr } = await supabase
      .from("feature_candidates")
      .update({ deepened_at: now })
      .eq("id", id);
    if (uErr) console.error("deepened_at update:", uErr.message);

    return jsonResponse({ ok: true, cached: false, deepened_at: now, simulation: ins });
  } catch (e) {
    return handleFunctionError("signal-candidate-deepen", e);
  }
});
