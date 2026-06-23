import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { runSimulation, runDeepDive } from "../_shared/agents/simulate.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json();

    // Deep dive is a separate code path
    if (body.type === "deep_dive") {
      const result = await runDeepDive({
        section: body.section,
        section_label: body.section_label,
        brief: body.brief,
        idea: body.idea,
        mode: body.mode,
      });
      return jsonResponse(result);
    }

    // Standard analysis (initial, refine, final)
    const result = await runSimulation({
      type: body.type,
      idea: body.idea,
      mode: body.mode,
      history: body.history,
      round: body.round,
    });
    return jsonResponse(result);
  } catch (e) {
    return handleFunctionError("simulate-idea", e);
  }
});
