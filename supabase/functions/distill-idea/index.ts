import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { generateDistillation } from "../_shared/agents/distill.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const input = await req.json();
    const result = await generateDistillation(input);
    return jsonResponse(result);
  } catch (e) {
    return handleFunctionError("distill-idea", e);
  }
});
