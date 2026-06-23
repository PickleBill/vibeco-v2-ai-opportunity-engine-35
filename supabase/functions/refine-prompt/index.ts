import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { generateRefinedPrompt } from "../_shared/agents/refine-prompt.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const input = await req.json();
    const result = await generateRefinedPrompt(input);
    return jsonResponse(result);
  } catch (e) {
    return handleFunctionError("refine-prompt", e);
  }
});
