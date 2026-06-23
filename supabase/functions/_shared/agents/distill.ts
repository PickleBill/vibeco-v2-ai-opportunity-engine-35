import { callLLMWithTool } from "../llm-client.ts";
import { selectModel } from "../model-router.ts";
import type { DistillInput, DistillResult } from "../types.ts";

// ─── Tool Schema ───

export const distillToolSchema = {
  type: "function" as const,
  function: {
    name: "generate_distillation",
    description: "Distill a business idea down to its essential core.",
    parameters: {
      type: "object",
      properties: {
        one_feature: {
          type: "string",
          description: "If you could only build ONE feature from this product, what is it? Name it specifically and explain why this single feature captures the core value.",
        },
        one_customer: {
          type: "string",
          description: "If you could only serve ONE type of person, who is it? Be specific — not 'small businesses' but 'freelance graphic designers who bill $5K-15K/month and lose 3+ hours/week on invoicing.'",
        },
        one_revenue: {
          type: "string",
          description: "If you could only charge for ONE thing, what is it? State the exact pricing: '$X/month for Y.' Explain why this is the one thing people would pay for.",
        },
        thesis_statement: {
          type: "string",
          description: "The Core Thesis Statement — one sentence that captures why anyone would care. Format: '[Target customer] will [action] because [product] [unique value that removes specific friction].'",
        },
        what_to_cut: {
          type: "array",
          items: { type: "string" },
          description: "3-5 specific things from the current brief that should be CUT from V1. Each item is a feature, market segment, or complexity that dilutes the core.",
        },
        mvp_scope: {
          type: "string",
          description: "What the distilled V1 looks like in 2-3 sentences. This should be buildable in 1-2 weeks by a solo developer using Lovable.",
        },
      },
      required: ["one_feature", "one_customer", "one_revenue", "thesis_statement", "what_to_cut", "mvp_scope"],
      additionalProperties: false,
    },
  },
};

// ─── Core Logic ───

export async function generateDistillation(input: DistillInput): Promise<DistillResult> {
  const briefContext = typeof input.brief === "object"
    ? Object.entries(input.brief)
        .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join("\n")
    : String(input.brief);

  const model = selectModel("distillation", { mode: input.mode });

  let highlightContext = "";
  if (input.highlights?.length) {
    highlightContext += `\nThe user highlighted these as RESONATING: ${input.highlights.join(", ")}`;
  }
  if (input.antiHighlights?.length) {
    highlightContext += `\nThe user flagged these as NOT resonating: ${input.antiHighlights.join(", ")}`;
  }

  const systemPrompt = `You are a ruthless clarity engine. Your job is to take a business idea that has been analyzed and expanded, and DISTILL it to its absolute essence. Strip away everything that isn't the core.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

Rules:
1. The thesis statement must be ONE sentence. No ands, no commas that add clauses. One clear statement of value.
2. When choosing the one feature, one customer, one revenue stream — pick the ones with the highest signal (what the user highlighted as resonating, what the market data supports, what's simplest to build).
3. The what_to_cut list should be SPECIFIC — name actual features from the brief, not vague categories.
4. The MVP scope should be achievable with Lovable in 1-2 weeks. If it can't be, scope down further.
5. This is the "ruthless clarity" mode — it should feel like a senior advisor saying "stop overcomplicating this."`;

  const userContent = `Original idea: "${input.idea}"

Full brief:
${briefContext}
${highlightContext}

Distill this to its absolute core. What's the ONE thing that matters?`;

  return callLLMWithTool<DistillResult>({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    tools: [distillToolSchema],
    toolChoice: { type: "function", function: { name: "generate_distillation" } },
  });
}
