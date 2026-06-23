import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { generateImage } from "../_shared/agents/image.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const input = await req.json();
    const result = await generateImage(input);
    return jsonResponse(result);
  } catch (e) {
    return handleFunctionError("generate-idea-image", e);
  }
});
