import { jsonResponse } from "./cors.ts";

/**
 * Custom error class for LLM API failures with status codes.
 */
export class LLMError extends Error {
  constructor(public status: number, public body: string) {
    super(`LLM API error ${status}: ${body.slice(0, 200)}`);
    this.name = "LLMError";
  }
}

/**
 * Map LLM gateway errors to user-friendly responses.
 * Handles 429 (rate limit), 402/403 credit limits, and 5xx (service error).
 */
export function handleLLMError(error: LLMError): Response {
  if (error.status === 429) {
    return jsonResponse({ error: "Rate limited. Try again in a moment." }, 429);
  }
  // 402 = generic credits; the Lovable AI Gateway returns 403 `credit_limit_reached`
  // when the workspace credit cap is hit. Surface both as a clear credits error
  // (instead of a generic "AI service error") so the board/logs are actionable.
  if (error.status === 402 || (error.status === 403 && /credit/i.test(error.body))) {
    return jsonResponse(
      { error: "AI credits exhausted (workspace credit limit reached). Top up the Lovable AI Gateway workspace or set ANTHROPIC_API_KEY to fail over." },
      402,
    );
  }
  return jsonResponse({ error: "AI service error" }, 500);
}

/**
 * Top-level error handler for edge function catch blocks.
 * Logs the error and returns a consistent JSON response.
 */
export function handleFunctionError(functionName: string, error: unknown): Response {
  console.error(`${functionName} error:`, error);

  if (error instanceof LLMError) {
    return handleLLMError(error);
  }

  return jsonResponse(
    { error: error instanceof Error ? error.message : "Unknown error" },
    500,
  );
}
