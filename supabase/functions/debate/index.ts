import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { runDebate, DEBATE_PERSONAS } from "../_shared/agents/debate.ts";

/**
 * Debate endpoint — generic multi-perspective analysis on any topic.
 *
 * Input:
 *   { topic, context?, personas?, custom_personas?, mode? }
 *
 * Examples:
 *   - "Should we use Supabase Realtime or polling for the inbox?"
 *   - "Review this PR for security and performance concerns"
 *   - "What's the right pricing model for Courtana Pulse?"
 *
 * Default personas: skeptic + champion + builder
 * Built-in library: skeptic, champion, builder, pragmatist, strategist,
 *                   user_advocate, security_auditor, performance_engineer, contrarian
 *
 * Custom personas: pass `custom_personas: { "name": "system prompt" }`
 */

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json();

    // Special: GET-style "list available personas"
    if (body.action === "list_personas") {
      return jsonResponse({
        available_personas: Object.keys(DEBATE_PERSONAS),
        descriptions: Object.fromEntries(
          Object.entries(DEBATE_PERSONAS).map(([k, v]) => [k, v.split(".")[0] + "."]),
        ),
      });
    }

    if (!body.topic) {
      return jsonResponse({ error: "Missing required field: topic" }, 400);
    }

    const result = await runDebate({
      topic: body.topic,
      context: body.context,
      personas: body.personas,
      custom_personas: body.custom_personas,
      mode: body.mode,
    });

    return jsonResponse(result);
  } catch (e) {
    return handleFunctionError("debate", e);
  }
});
