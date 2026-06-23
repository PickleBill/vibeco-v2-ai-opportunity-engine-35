import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { generatePerspective } from "../_shared/agents/persona.ts";
import { generateExpansions } from "../_shared/agents/expand.ts";
import { generateDistillation } from "../_shared/agents/distill.ts";
import { synthesize } from "../_shared/agents/synthesize.ts";
import type { PersonaType, PerspectiveResult, ExpandResult, DistillResult } from "../_shared/types.ts";

/**
 * Orchestrator: "Auto-Thunderdome"
 *
 * Fires all 7 agents in parallel with per-agent timeouts,
 * streams progress events via agent_events table (Supabase Realtime),
 * then synthesizes their outputs into a unified analysis.
 *
 * Input:  { idea, brief, report_id?, mode?, highlights?, antiHighlights? }
 * Output: { perspectives, expansion, distillation, synthesis, timing, agents_completed, agents_total }
 *
 * Sprint 4: forced redeploy to pick up updated _shared/agents/synthesize.ts (model fallback chain).
 */

const PERSONAS: PersonaType[] = ["skeptic", "champion", "competitor", "customer", "builder"];
const AGENT_TIMEOUT_MS = 30_000; // 30s per agent — don't let one slow call block everything

// ─── Timeout wrapper ───

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ─── Event emitter ───

async function emitEvent(
  supabase: ReturnType<typeof createClient> | null,
  reportId: string | null,
  agent: string,
  eventType: string,
  data: Record<string, unknown> = {},
) {
  if (!supabase || !reportId) return; // graceful no-op if no report context
  try {
    // NOTE: `agent_events` exists in a migration but isn't in the generated
    // Supabase types yet — cast through `unknown` until types regenerate.
    await (supabase.from as unknown as (t: string) => {
      insert: (row: Record<string, unknown>) => Promise<unknown>;
    })("agent_events").insert({
      report_id: reportId,
      agent,
      event_type: eventType,
      data,
    });
  } catch {
    // Don't let event logging failures break the orchestration
  }
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { idea: rawIdea, brief, report_id, mode, highlights, antiHighlights } = await req.json();

    if (!brief) {
      return jsonResponse({ error: "Missing required field: brief" }, 400);
    }

    // Fall back to brief.problem when idea is empty (e.g. resumed sessions
    // where the original idea text wasn't persisted on the brief payload).
    const idea: string =
      (typeof rawIdea === "string" && rawIdea.trim()) ||
      (typeof brief?.problem === "string" && brief.problem.trim()) ||
      "Untitled idea";

    // Set up Supabase client for event streaming (optional — works without it)
    let supabase: ReturnType<typeof createClient> | null = null;
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);
    }

    const startTime = Date.now();
    const timing: Record<string, number> = {};

    await emitEvent(supabase, report_id, "orchestrator", "started");

    // ── Phase 1: Fan-out — run all 7 agents in parallel with timeouts ──

    const perspectivePromises = PERSONAS.map((persona) =>
      withTimeout(
        generatePerspective({ idea, brief, persona, mode, builder_intent: brief.builder_intent }),
        AGENT_TIMEOUT_MS,
        `persona-${persona}`,
      ).then(async (result) => {
        timing[`perspective-${persona}`] = Date.now() - startTime;
        await emitEvent(supabase, report_id, `persona-${persona}`, "completed", {
          headline: result.headline,
          latency_ms: timing[`perspective-${persona}`],
        });
        return result;
      })
    );

    const expandPromise = withTimeout(
      generateExpansions({ idea, brief, mode }),
      AGENT_TIMEOUT_MS,
      "expand",
    ).then(async (result) => {
      timing["expand"] = Date.now() - startTime;
      await emitEvent(supabase, report_id, "expand", "completed", {
        core_insight: result.core_insight,
        latency_ms: timing["expand"],
      });
      return result;
    });

    const distillPromise = withTimeout(
      generateDistillation({ idea, brief, mode, highlights, antiHighlights }),
      AGENT_TIMEOUT_MS,
      "distill",
    ).then(async (result) => {
      timing["distill"] = Date.now() - startTime;
      await emitEvent(supabase, report_id, "distill", "completed", {
        thesis: result.thesis_statement,
        latency_ms: timing["distill"],
      });
      return result;
    });

    // Fire all 7 — allSettled so failures don't crash the batch
    const [perspectiveResults, expandResult, distillResult] = await Promise.all([
      Promise.allSettled(perspectivePromises),
      expandPromise.catch((e: Error) => {
        console.error("expand failed:", e.message);
        return null;
      }),
      distillPromise.catch((e: Error) => {
        console.error("distill failed:", e.message);
        return null;
      }),
    ]);

    const perspectives: PerspectiveResult[] = perspectiveResults
      .filter((r): r is PromiseFulfilledResult<PerspectiveResult> => r.status === "fulfilled")
      .map((r) => r.value);

    const expansion = expandResult as ExpandResult | null;
    const distillation = distillResult as DistillResult | null;

    timing["phase1-complete"] = Date.now() - startTime;
    await emitEvent(supabase, report_id, "orchestrator", "phase1-complete", {
      perspectives_completed: perspectives.length,
      expand_completed: !!expansion,
      distill_completed: !!distillation,
      latency_ms: timing["phase1-complete"],
    });

    // ── Phase 2: Synthesize — agents read each other's outputs ──

    let synthesis = null;
    if (perspectives.length >= 2) { // need at least 2 perspectives for meaningful synthesis
      try {
        synthesis = await withTimeout(
          synthesize({
            idea,
            brief,
            perspectives,
            expansion: expansion || undefined,
            distillation: distillation || undefined,
            highlights,
            antiHighlights,
            mode,
          }),
          90_000, // synthesis reads all 7 outputs; GPT-5 fallback can take 60-70s
          "synthesize",
        );
        timing["synthesis"] = Date.now() - startTime;
        await emitEvent(supabase, report_id, "synthesize", "completed", {
          confidence_score: synthesis.confidence_score,
          latency_ms: timing["synthesis"],
        });
      } catch (e) {
        console.error("synthesis failed:", (e as Error).message);
        timing["synthesis-error"] = Date.now() - startTime;
      }
    }

    timing["total"] = Date.now() - startTime;
    await emitEvent(supabase, report_id, "orchestrator", "completed", { timing });

    return jsonResponse({
      perspectives,
      expansion,
      distillation,
      synthesis,
      timing,
      agents_completed: perspectives.length + (expansion ? 1 : 0) + (distillation ? 1 : 0),
      agents_total: PERSONAS.length + 2,
    });
  } catch (e) {
    return handleFunctionError("orchestrate", e);
  }
});
