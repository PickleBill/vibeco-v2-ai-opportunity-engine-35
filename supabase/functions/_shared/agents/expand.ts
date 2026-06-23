import { callLLMWithTool } from "../llm-client.ts";
import { selectModel } from "../model-router.ts";
import { formatBriefContext } from "./persona.ts";
import type { ExpandInput, ExpandResult } from "../types.ts";

// ─── Tool Schema ───

export const expandToolSchema = {
  type: "function" as const,
  function: {
    name: "generate_expansions",
    description: "Generate 3 orthogonal variations of a business idea.",
    parameters: {
      type: "object",
      properties: {
        core_insight: {
          type: "string",
          description: "The fundamental insight or capability underneath the user's idea, stated in one sentence.",
        },
        expansions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short name for this variation (3-6 words)" },
              pitch: { type: "string", description: "2-sentence elevator pitch for this variation." },
              how_its_different: { type: "string", description: "1 sentence on what changed: different market, different business model, or different delivery mechanism." },
              potential: { type: "string", enum: ["bigger-market", "easier-to-build", "less-competition", "faster-revenue"], description: "The main advantage of this variation over the original." },
              idea_text: { type: "string", description: "A complete idea description (2-3 sentences) that could be pasted directly into VibeCo's simulator to start a new simulation for this variation." },
            },
            required: ["title", "pitch", "how_its_different", "potential", "idea_text"],
            additionalProperties: false,
          },
          description: "Exactly 3 orthogonal variations.",
        },
      },
      required: ["core_insight", "expansions"],
      additionalProperties: false,
    },
  },
};

// ─── Core Logic ───

export async function generateExpansions(input: ExpandInput): Promise<ExpandResult> {
  const briefContext = formatBriefContext(input.brief as unknown as Record<string, unknown>);
  const model = selectModel("expansion", { mode: input.mode });

  const systemPrompt = `You are a creative strategist who helps founders see adjacent opportunities. Given a business idea and its analysis, generate 3 GENUINELY DIFFERENT variations.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

Rules:
1. First, identify the CORE INSIGHT — the fundamental capability or value proposition underneath the specific product.
2. Then generate 3 variations that keep the core insight but change ONE major dimension each:
   - Variation 1: Different TARGET MARKET (same product, different customers)
   - Variation 2: Different BUSINESS MODEL (same customers, different monetization or delivery)
   - Variation 3: Different SCALE (either much bigger or much smaller than the original)
3. Each variation must be specific enough to simulate on its own. Include real company names, market sizes, and pricing where relevant.
4. The idea_text for each variation should be a complete, standalone idea description — as if someone was typing it fresh into the simulator.`;

  const userContent = `Original idea: "${input.idea}"

Brief:
${briefContext}

Generate 3 orthogonal variations. Each should make the founder say "huh, I hadn't thought of that."`;

  return callLLMWithTool<ExpandResult>({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    tools: [expandToolSchema],
    toolChoice: { type: "function", function: { name: "generate_expansions" } },
  });
}
