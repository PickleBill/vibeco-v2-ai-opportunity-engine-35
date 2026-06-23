import { callLLMWithTool } from "../llm-client.ts";
import { selectModel } from "../model-router.ts";
import type { SimulateInput, SimulationResult, DeepDiveResult, AnalysisMode } from "../types.ts";

// ─── Tool Schemas ───

export const analysisToolSchema = {
  type: "function" as const,
  function: {
    name: "generate_idea_analysis",
    description: "Generate a structured idea analysis with brief sections and follow-up questions.",
    parameters: {
      type: "object",
      properties: {
        brief: {
          type: "object",
          properties: {
            problem: { type: "string", description: "The core problem or opportunity — reference the EXACT product/service the user described. Use specific terminology from their idea." },
            target_customer: { type: "string", description: "A vivid named persona who would use THIS EXACT product. Include their name (e.g. 'Meet Sarah Chen, a...'), job title, age, daily frustrations, and why THIS specific product changes their workflow. Must directly reference the user's idea." },
            core_features: {
              type: "array",
              items: {
                type: "object",
                properties: { name: { type: "string" }, description: { type: "string" } },
                required: ["name", "description"],
                additionalProperties: false,
              },
              description: "3-5 features uniquely designed for THIS product. Name each feature with domain-specific language from the user's idea.",
            },
            revenue_model: { type: "string", description: "Specific pricing tiers with dollar amounts for THIS product's market. Reference the actual product." },
            industry_trends: { type: "string", description: "Name 2-3 REAL competing companies in this exact space, with real market data and trends. Reference the user's specific product category." },
            investor_perspective: { type: "string", description: "What a smart VC would specifically push back on about THIS idea. Include concrete concerns and questions referencing the actual product." },
            customer_perspective: { type: "string", description: "Direct quotes from the named target persona about THIS EXACT product — what excites them and what makes them hesitate. Use first person." },
            app_type: {
              type: "string",
              description: "The recommended app type for this product. One of: 'landing-page', 'web-app', 'marketplace', 'mobile-first', 'e-commerce', 'saas-dashboard'. Choose based on what makes sense for the user's idea.",
            },
            builder_intent: {
              type: "string",
              description: "Inferred or stated builder intent. One of: 'experiment', 'community', 'lead-magnet', 'lifestyle', 'venture', 'fun'. If the user hasn't explicitly stated intent, infer the most likely one from their idea and answers.",
            },
            scale_assessment: {
              type: "object",
              properties: {
                current_scale: { type: "string", enum: ["feature", "experiment", "product", "platform"], description: "What scale this idea is currently scoped at." },
                fits_intent: { type: "boolean", description: "Whether the current scale matches the builder_intent." },
                recommendation: { type: "string", description: "1-2 sentences of actionable advice." },
              },
              required: ["current_scale", "fits_intent", "recommendation"],
              additionalProperties: false,
            },
          },
          required: ["problem", "target_customer", "core_features", "revenue_model", "industry_trends", "investor_perspective", "customer_perspective", "app_type", "builder_intent"],
          additionalProperties: false,
        },
        follow_up_questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: { label: { type: "string" }, description: { type: "string" } },
                  required: ["label", "description"],
                  additionalProperties: false,
                },
              },
              allow_multiple: { type: "boolean" },
            },
            required: ["question", "options", "allow_multiple"],
            additionalProperties: false,
          },
          description: "2-3 strategic follow-up questions that reference the user's exact idea, product name, and target market",
        },
        is_final: { type: "boolean", description: "True if this is the final consolidated report with no more questions" },
        depth_recommendation: {
          type: "string",
          enum: ["ready", "one-more-recommended"],
          description: "For non-final rounds: 'ready' if enough context for a strong final brief, 'one-more-recommended' if another round would meaningfully improve output.",
        },
        lovable_prompt: {
          type: "string",
          description: "ONLY for the final round (is_final=true). A structured, actionable prompt for building a complete app in Lovable. 800-1500 words.",
        },
      },
      required: ["brief", "follow_up_questions", "is_final"],
      additionalProperties: false,
    },
  },
};

export const deepDiveToolSchema = {
  type: "function" as const,
  function: {
    name: "generate_deep_dive",
    description: "Generate a detailed deep-dive analysis for a specific section of an idea report.",
    parameters: {
      type: "object",
      properties: {
        deep_dive: {
          type: "string",
          description: "Markdown-formatted deep-dive analysis with 4-6 bullet points, each 1-2 sentences. Include specific competitor names, market data estimates, risk factors, and actionable recommendations.",
        },
      },
      required: ["deep_dive"],
      additionalProperties: false,
    },
  },
};

// ─── Prompt Builders ───

function buildInitialPrompts(idea: string) {
  const systemPrompt = `You are VibeCo's AI Idea Simulator — a sharp, experienced startup advisor. Be direct and insightful.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH. Every single field must be in English. No Chinese, no other languages. English only.

CRITICAL SPECIFICITY RULES — READ THE USER'S IDEA CAREFULLY:
1. Read the user's idea word by word. Extract the specific product, service, industry, and use case they described.
2. EVERY field in your response must directly reference their specific idea.
3. Target Customer: Create a named persona (e.g. "Meet 'Marcus Rivera', a 29-year-old...") who would ACTUALLY use this specific product.
4. Problem: Describe the pain point using the user's own terminology and product domain.
5. Core Features: Each feature must use domain language from the user's idea.
6. Revenue Model: Give pricing that makes sense for THIS specific market with dollar amounts.
7. Industry Trends: Name 2-3 REAL companies competing in this exact space.
8. Investor Perspective: Ask questions a VC would ask about THIS specific business model.
9. Customer Perspective: Write first-person quotes from the named persona about THIS product.
10. App Type: Recommend the most appropriate app format based on the idea.
11. Builder Intent: Infer the most likely intent from the user's idea. Then tailor your analysis accordingly.
12. Scale Assessment: Evaluate whether this idea's scope matches the builder's intent. Be direct about mismatches.
13. Depth Recommendation: If this idea is simple enough for an excellent brief now, set to 'ready'. If unresolved strategic complexity, set to 'one-more-recommended'.

IMPORTANT: Set is_final to false. This is the first round — you MUST generate follow-up questions. Do NOT include lovable_prompt.

For follow-up questions:
- Generate exactly 2 strategic follow-up questions (not 3 or 4 — only 2).
- Each question must reference the user's specific idea by name or concept.
- Options must represent genuinely different strategic directions for THIS product.`;

  const userContent = `Here is the user's idea. Read it carefully and generate an analysis that is 100% specific to what they described:\n\n"${idea}"`;
  return { systemPrompt, userContent };
}

function buildRefinePrompts(idea: string, history: string, round: number) {
  const isLastRound = round >= 3;

  const systemPrompt = `You are VibeCo's AI Idea Simulator continuing a refinement session.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH. Every single field must be in English.

CRITICAL: Re-read the original idea and all previous rounds. Your updated analysis must:
1. Directly reference the specific product/service from the original idea
2. Incorporate the user's specific choices from previous rounds
3. Evolve each section based on the direction they chose
4. Keep the same named persona but deepen their story based on choices made
5. Every section must reflect the cumulative refinements from all previous rounds
6. Tailor investor_perspective depth based on builder_intent
7. Update the scale_assessment based on how the idea has evolved

${isLastRound ? `This is the FINAL round. Set is_final to true. Generate the most comprehensive brief possible. The follow_up_questions array must be empty. Also generate the lovable_prompt field following the structured template format.` : `This is round ${round} of 3. Set is_final to false. Do NOT include lovable_prompt. Ask exactly 3 NEW follow-up questions.`}`;

  const userContent = `Full conversation history:\n\n${history}\n\nGenerate a${isLastRound ? " final comprehensive" : "n updated"} brief.`;
  return { systemPrompt, userContent };
}

// ─── Core Logic ───

export async function runSimulation(input: SimulateInput): Promise<SimulationResult> {
  const taskType = input.type === "initial" ? "analysis-initial"
    : (input.round && input.round >= 3) ? "analysis-final"
    : "analysis-refine";

  const model = selectModel(taskType, { mode: input.mode });

  const { systemPrompt, userContent } = input.type === "initial"
    ? buildInitialPrompts(input.idea)
    : buildRefinePrompts(input.idea, input.history || "", input.round || 2);

  const result = await callLLMWithTool<SimulationResult>({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    tools: [analysisToolSchema],
    toolChoice: { type: "function", function: { name: "generate_idea_analysis" } },
  });

  // SERVER-SIDE ENFORCEMENT: Never allow is_final on early rounds
  if (input.type === "initial" || (input.round && input.round < 3)) {
    result.is_final = false;
    delete result.lovable_prompt;
    if (!result.follow_up_questions || result.follow_up_questions.length === 0) {
      result.follow_up_questions = [
        {
          question: "What's the most important aspect of this idea to explore next?",
          options: [
            { label: "Go-to-market strategy", description: "How to acquire your first 100 users" },
            { label: "Technical feasibility", description: "What it takes to build the MVP" },
            { label: "Competitive moat", description: "How to stay ahead of copycats" },
          ],
          allow_multiple: false,
        },
      ];
    }
  } else if (input.round && input.round >= 3) {
    result.is_final = true;
    result.follow_up_questions = [];
  }

  return result;
}

export async function runDeepDive(input: {
  section: string;
  section_label: string;
  brief: Record<string, unknown>;
  idea: string;
  mode?: AnalysisMode;
}): Promise<DeepDiveResult> {
  const model = selectModel("deep-dive", { mode: input.mode });

  const briefContext = Object.entries(input.brief)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("\n");

  const systemPrompt = `You are a strategic analyst providing a deep-dive on a specific aspect of a startup idea. Be specific, data-driven, and actionable.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

You are analyzing the "${input.section_label}" section. Provide:
- 4-6 bullet points of detailed analysis
- Each bullet should be 1-2 sentences
- Include specific competitor names, market size estimates, risk factors, or implementation recommendations as relevant
- Reference the user's specific idea and product throughout
- Use markdown formatting (bold for emphasis, bullet points)
- Be more detailed and specific than the original brief — this is a DEEP DIVE`;

  const userContent = `Original idea: "${input.idea}"

Current brief context:
${briefContext}

Provide a deep-dive analysis specifically on: ${input.section_label}`;

  return callLLMWithTool<DeepDiveResult>({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    tools: [deepDiveToolSchema],
    toolChoice: { type: "function", function: { name: "generate_deep_dive" } },
  });
}
