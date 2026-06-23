import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { askBill } from "../_shared/agents/ask-bill.ts";

// Public endpoint (verify_jwt = false) for the bricker-os terminal on Bill's
// dynamic résumé, so cap per-IP throughput. In-memory state is per-instance,
// which is good enough to stop casual abuse alongside the 400-token cap.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (rateLimited(ip)) {
      return jsonResponse({ error: "Slow down — try again in a minute." }, 429);
    }
    const input = await req.json();
    const result = await askBill(input);
    return jsonResponse(result);
  } catch (e) {
    return handleFunctionError("ask-bill", e);
  }
});

// redeploy trigger: 2026-06-13T02:58Z
