import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { callLLMWithTool } from "../_shared/llm-client.ts";
import { selectModel } from "../_shared/model-router.ts";

/**
 * MCP Self-Improvement Analyzer
 *
 * Reads recent mcp_usage_log entries, asks Claude to find patterns,
 * writes suggestions to mcp_improvement_log.
 *
 * Trigger this manually or on a schedule (Supabase scheduled function).
 *
 * Input:  { window_hours?: number, dry_run?: boolean }
 * Output: { suggestions: [...], stats: {...} }
 */

interface UsageRow {
  tool_name: string;
  args: Record<string, unknown>;
  success: boolean;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
}

const analysisSchema = {
  type: "function" as const,
  function: {
    name: "generate_mcp_insights",
    description: "Generate improvement suggestions from MCP usage data.",
    parameters: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string", enum: ["performance", "reliability", "usability", "usage-pattern"] },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              tool_name: { type: "string", description: "Which tool this concerns (or 'all' for cross-tool insights)" },
              observation: { type: "string", description: "What the data shows" },
              suggestion: { type: "string", description: "Concrete fix or improvement" },
            },
            required: ["category", "priority", "tool_name", "observation", "suggestion"],
            additionalProperties: false,
          },
          description: "3-7 actionable suggestions ranked by impact",
        },
      },
      required: ["suggestions"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const windowHours = body.window_hours || 168; // default: last 7 days
    const dryRun = body.dry_run === true;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ error: "Supabase not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Pull recent usage
    const since = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
    const { data: usage, error: usageErr } = await supabase
      .from("mcp_usage_log")
      .select("tool_name, args, success, error_message, latency_ms, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (usageErr) throw new Error(`Failed to fetch usage: ${usageErr.message}`);
    if (!usage || usage.length === 0) {
      return jsonResponse({ suggestions: [], stats: { rows: 0, window_hours: windowHours }, note: "No usage data in window." });
    }

    // Aggregate stats
    const stats = aggregateStats(usage as UsageRow[]);

    // Ask Claude to analyze
    const systemPrompt = `You are the MCP Self-Improvement Analyzer. You read aggregated tool usage statistics and identify improvement opportunities.

Be concrete and data-driven. Don't make generic suggestions.
- "Tool X failed 30% of the time with error Y → likely fix is Z"
- "Tool X called 100+ times with same args → cache this"
- "Tool X has p95 latency of 5s → consider streaming or precomputation"

Skip suggestions that aren't supported by actual data. Quality over quantity.`;

    const userContent = `MCP usage data over the past ${windowHours} hours:

${JSON.stringify(stats, null, 2)}

Generate 3-7 improvement suggestions ranked by impact.`;

    const model = selectModel("synthesis", { mode: "deep" });
    const result = await callLLMWithTool<{ suggestions: any[] }>({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools: [analysisSchema],
      toolChoice: { type: "function", function: { name: "generate_mcp_insights" } },
    });

    // Persist (unless dry run)
    let inserted = 0;
    if (!dryRun && result.suggestions?.length) {
      const rows = result.suggestions.map((s: any) => ({
        category: s.category,
        priority: s.priority,
        tool_name: s.tool_name,
        observation: s.observation,
        suggestion: s.suggestion,
        metrics: stats,
      }));
      const { error: insertErr } = await supabase.from("mcp_improvement_log").insert(rows);
      if (!insertErr) inserted = rows.length;
    }

    return jsonResponse({
      suggestions: result.suggestions,
      stats,
      window_hours: windowHours,
      inserted,
      dry_run: dryRun,
    });
  } catch (e) {
    return handleFunctionError("mcp-analyze-usage", e);
  }
});

// ─── Stat Aggregation ───

function aggregateStats(usage: UsageRow[]) {
  const byTool: Record<string, {
    total: number;
    failures: number;
    failure_rate: number;
    p50_ms: number;
    p95_ms: number;
    avg_ms: number;
    common_errors: Record<string, number>;
  }> = {};

  const grouped: Record<string, UsageRow[]> = {};
  for (const row of usage) {
    if (!grouped[row.tool_name]) grouped[row.tool_name] = [];
    grouped[row.tool_name].push(row);
  }

  for (const [tool, rows] of Object.entries(grouped)) {
    const latencies = rows.map((r) => r.latency_ms || 0).filter((n) => n > 0).sort((a, b) => a - b);
    const failures = rows.filter((r) => !r.success);
    const errorCounts: Record<string, number> = {};
    for (const f of failures) {
      const key = (f.error_message || "unknown").slice(0, 100);
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    }

    byTool[tool] = {
      total: rows.length,
      failures: failures.length,
      failure_rate: rows.length > 0 ? failures.length / rows.length : 0,
      p50_ms: percentile(latencies, 50),
      p95_ms: percentile(latencies, 95),
      avg_ms: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      common_errors: errorCounts,
    };
  }

  return {
    total_calls: usage.length,
    unique_tools: Object.keys(grouped).length,
    by_tool: byTool,
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}
