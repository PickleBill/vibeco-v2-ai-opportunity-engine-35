import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TEST_PROMPT = "Respond with exactly one word: 'working'";

const LOVABLE_GATEWAY_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-2.0-flash",
  "google/gemini-1.5-pro",
  "anthropic/claude-sonnet-4-20250514",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3-haiku",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "meta-llama/llama-3.1-70b-instruct",
];

async function testLovableGateway(model: string, apiKey: string) {
  const start = Date.now();
  try {
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: TEST_PROMPT }],
          max_tokens: 10,
        }),
      }
    );
    const elapsed = Date.now() - start;

    if (!response.ok) {
      const text = await response.text();
      return {
        model,
        gateway: "lovable",
        status: response.status,
        available: false,
        error: text.slice(0, 200),
        latency_ms: elapsed,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return {
      model,
      gateway: "lovable",
      status: 200,
      available: true,
      response: content.slice(0, 50),
      latency_ms: elapsed,
      usage: data.usage || null,
    };
  } catch (e) {
    return {
      model,
      gateway: "lovable",
      status: 0,
      available: false,
      error: e instanceof Error ? e.message : "Unknown error",
      latency_ms: Date.now() - start,
    };
  }
}

async function testAnthropicDirect(apiKey: string) {
  const start = Date.now();
  try {
    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 10,
          messages: [{ role: "user", content: TEST_PROMPT }],
        }),
      }
    );
    const elapsed = Date.now() - start;

    if (!response.ok) {
      const text = await response.text();
      return {
        model: "claude-sonnet-4-20250514",
        gateway: "anthropic-direct",
        status: response.status,
        available: false,
        error: text.slice(0, 200),
        latency_ms: elapsed,
        note: response.status === 401
          ? "401 = No ANTHROPIC_API_KEY set or key is invalid. Add one in Supabase dashboard → Edge Functions → Secrets to enable direct Anthropic calls."
          : response.status === 403
          ? "403 = Key exists but lacks permissions. Check your Anthropic API key."
          : null,
      };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";
    return {
      model: "claude-sonnet-4-20250514",
      gateway: "anthropic-direct",
      status: 200,
      available: true,
      response: content.slice(0, 50),
      latency_ms: elapsed,
      usage: data.usage || null,
      note: "Direct Anthropic API works! You can use Claude for prompt generation.",
    };
  } catch (e) {
    return {
      model: "claude-sonnet-4-20250514",
      gateway: "anthropic-direct",
      status: 0,
      available: false,
      error: e instanceof Error ? e.message : "Unknown error",
      latency_ms: Date.now() - start,
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

  const results: Record<string, unknown>[] = [];

  if (LOVABLE_API_KEY) {
    const gatewayResults = await Promise.allSettled(
      LOVABLE_GATEWAY_MODELS.map((model) =>
        testLovableGateway(model, LOVABLE_API_KEY)
      )
    );
    gatewayResults.forEach((r) => {
      if (r.status === "fulfilled") results.push(r.value);
    });
  } else {
    results.push({
      gateway: "lovable",
      error: "LOVABLE_API_KEY not set",
      available: false,
    });
  }

  if (ANTHROPIC_API_KEY) {
    const anthropicResult = await testAnthropicDirect(ANTHROPIC_API_KEY);
    results.push(anthropicResult);
  } else {
    results.push({
      model: "claude-sonnet-4 (direct)",
      gateway: "anthropic-direct",
      available: false,
      note: "No ANTHROPIC_API_KEY secret found. To test: go to Supabase dashboard → Project Settings → Edge Functions → Secrets → add ANTHROPIC_API_KEY with your key from console.anthropic.com.",
    });
  }

  const available = results.filter((r) => r.available);
  const summary = {
    total_tested: results.length,
    available_count: available.length,
    available_models: available.map((r) => ({
      model: r.model,
      gateway: r.gateway,
      latency_ms: r.latency_ms,
    })),
    recommendation: available.length > 1
      ? `You have ${available.length} models available. Use the fastest for analysis rounds, and the most capable for prompt generation.`
      : "Only one model available. See the full results for details on what failed and why.",
    next_steps: !ANTHROPIC_API_KEY
      ? "To unlock Claude for prompt generation: go to console.anthropic.com → API Keys → create a key → add it as ANTHROPIC_API_KEY in your Supabase Edge Function secrets."
      : "Anthropic API key is configured. Check results to see if it works.",
  };

  return new Response(
    JSON.stringify({ summary, results }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
