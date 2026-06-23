import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * MCP Telemetry — log every tool call so the system can learn from itself.
 *
 * Wraps a tool handler with timing + success/error logging.
 * Failures don't break the tool — telemetry is best-effort.
 */

let cachedSupabase: SupabaseClient | null = null;
const SESSION_HINT = `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function setTelemetryClient(supabase: SupabaseClient | null) {
  cachedSupabase = supabase;
}

/**
 * Wrap a tool handler so every invocation is logged.
 * Returns a new handler with the same signature.
 */
export function withTelemetry<TArgs extends Record<string, unknown>, TResult>(
  toolName: string,
  handler: (args: TArgs) => Promise<TResult>,
): (args: TArgs) => Promise<TResult> {
  return async (args: TArgs) => {
    const start = Date.now();
    let success = true;
    let errorMessage: string | undefined;

    try {
      const result = await handler(args);
      return result;
    } catch (e) {
      success = false;
      errorMessage = (e as Error).message;
      throw e;
    } finally {
      // Fire-and-forget logging
      const latency_ms = Date.now() - start;
      if (cachedSupabase) {
        cachedSupabase
          .from("mcp_usage_log")
          .insert({
            tool_name: toolName,
            args: sanitizeArgs(args),
            success,
            error_message: errorMessage,
            latency_ms,
            session_hint: SESSION_HINT,
          })
          .then(({ error }) => {
            if (error) console.error(`Telemetry insert failed for ${toolName}:`, error.message);
          });
      }
    }
  };
}

/**
 * Strip sensitive fields and trim long values before logging.
 */
function sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE = ["password", "api_key", "apikey", "token", "secret"];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(args || {})) {
    const keyLower = key.toLowerCase();
    if (SENSITIVE.some((s) => keyLower.includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 500) {
      sanitized[key] = value.slice(0, 500) + "... [truncated]";
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
