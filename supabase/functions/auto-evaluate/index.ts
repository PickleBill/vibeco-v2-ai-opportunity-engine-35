import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { runSimulation } from "../_shared/agents/simulate.ts";
import { generatePerspective } from "../_shared/agents/persona.ts";
import { generateExpansions } from "../_shared/agents/expand.ts";
import { generateDistillation } from "../_shared/agents/distill.ts";
import { synthesize } from "../_shared/agents/synthesize.ts";
import type { PersonaType, PerspectiveResult, AnalysisMode } from "../_shared/types.ts";

/**
 * Auto-Evaluate: The Idea Lab Flywheel
 *
 * Takes a raw idea (plain text) and runs it through the ENTIRE pipeline:
 *   1. Simulate (initial analysis → brief)
 *   2. Thunderdome (5 personas + expand + distill, all parallel)
 *   3. Synthesize (cross-agent consensus/tension/confidence)
 *
 * Returns the full evaluation with a confidence score.
 * Ideas scoring 70+ are flagged as "high-confidence" — worth building.
 *
 * This is the endpoint the Idea Lab calls. Feed it ideas, get scored results.
 *
 * Input:  { idea: string, mode?: "fast" | "deep", source?: string }
 * Output: { brief, perspectives, expansion, distillation, synthesis, score, verdict, timing }
 */

const PERSONAS: PersonaType[] = ["skeptic", "champion", "competitor", "customer", "builder"];
const AGENT_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { idea, mode = "fast", source = "manual" } = await req.json() as {
      idea: string;
      mode?: AnalysisMode;
      source?: string;
    };

    if (!idea) {
      return jsonResponse({ error: "Missing required field: idea" }, 400);
    }

    const startTime = Date.now();
    const timing: Record<string, number> = {};

    // ── Step 1: Simulate — get a structured brief from the raw idea ──

    const simulation = await withTimeout(
      runSimulation({ type: "initial", idea, mode }),
      AGENT_TIMEOUT_MS * 1.5,
      "simulate",
    );
    timing["simulate"] = Date.now() - startTime;

    const brief = simulation.brief;
    if (!brief) {
      return jsonResponse({ error: "Simulation failed to produce a brief" }, 500);
    }

    // ── Step 2: Thunderdome — all 7 agents in parallel ──

    const perspectivePromises = PERSONAS.map((persona) =>
      withTimeout(
        generatePerspective({ idea, brief, persona, mode, builder_intent: brief.builder_intent }),
        AGENT_TIMEOUT_MS,
        `persona-${persona}`,
      ).then((result) => {
        timing[`perspective-${persona}`] = Date.now() - startTime;
        return result;
      })
    );

    const expandPromise = withTimeout(
      generateExpansions({ idea, brief, mode }),
      AGENT_TIMEOUT_MS,
      "expand",
    ).then((result) => {
      timing["expand"] = Date.now() - startTime;
      return result;
    });

    const distillPromise = withTimeout(
      generateDistillation({ idea, brief, mode }),
      AGENT_TIMEOUT_MS,
      "distill",
    ).then((result) => {
      timing["distill"] = Date.now() - startTime;
      return result;
    });

    const [perspectiveResults, expansion, distillation] = await Promise.all([
      Promise.allSettled(perspectivePromises),
      expandPromise.catch(() => null),
      distillPromise.catch(() => null),
    ]);

    const perspectives: PerspectiveResult[] = perspectiveResults
      .filter((r): r is PromiseFulfilledResult<PerspectiveResult> => r.status === "fulfilled")
      .map((r) => r.value);

    timing["thunderdome"] = Date.now() - startTime;

    // ── Step 3: Synthesize — agents read each other ──

    let synthesisResult = null;
    if (perspectives.length >= 2) {
      try {
        synthesisResult = await withTimeout(
          synthesize({
            idea,
            brief,
            perspectives,
            expansion: expansion || undefined,
            distillation: distillation || undefined,
            mode,
          }),
          AGENT_TIMEOUT_MS * 1.5,
          "synthesize",
        );
        timing["synthesize"] = Date.now() - startTime;
      } catch (e) {
        console.error("Synthesis failed:", (e as Error).message);
      }
    }

    timing["total"] = Date.now() - startTime;

    // ── Score and Verdict ──

    const score = synthesisResult?.confidence_score ?? 0;
    const verdict = score >= 70 ? "high-confidence"
      : score >= 40 ? "worth-exploring"
      : "needs-work";

    // ── Persist to idea_reports if Supabase is available ──

    let reportId = null;
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data } = await supabase
          .from("idea_reports")
          .insert({
            idea,
            brief,
            rounds: [{ brief, questions: simulation.follow_up_questions, answers: {} }],
            status: "auto-evaluated",
            auto_score: score,
            auto_verdict: verdict,
            auto_source: source,
            auto_synthesis: synthesisResult,
            auto_perspectives: perspectives,
            auto_expansion: expansion,
            auto_distillation: distillation,
          })
          .select("id")
          .single();
        reportId = data?.id;
      } catch (e) {
        console.error("Failed to persist report:", (e as Error).message);
        // Don't fail the response if persistence fails
      }
    }

    return jsonResponse({
      report_id: reportId,
      idea,
      brief,
      perspectives,
      expansion,
      distillation,
      synthesis: synthesisResult,
      score,
      verdict,
      timing,
      source,
      agents_completed: perspectives.length + (expansion ? 1 : 0) + (distillation ? 1 : 0) + (synthesisResult ? 1 : 0),
    });
  } catch (e) {
    return handleFunctionError("auto-evaluate", e);
  }
});
