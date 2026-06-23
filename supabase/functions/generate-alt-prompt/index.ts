import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { generateAltPrompt } from "../_shared/agents/alt-prompt.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const input = await req.json();

    if (!input.brief || !input.idea || !input.prompt_type) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const result = await generateAltPrompt(input);
    return jsonResponse(result);
  } catch (e) {
    return handleFunctionError("generate-alt-prompt", e);
  }
});
