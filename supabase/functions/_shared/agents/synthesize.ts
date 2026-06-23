import { callLLMWithTool } from "../llm-client.ts";
import { selectModel } from "../model-router.ts";
import type {
  BriefData,
  PerspectiveResult,
  ExpandResult,
  DistillResult,
  AnalysisMode,
} from "../types.ts";

// ─── Types ───

export interface SynthesisInput {
  idea: string;
  brief: BriefData;
  perspectives: PerspectiveResult[];
  expansion?: ExpandResult;
  distillation?: DistillResult;
  highlights?: string[];
  antiHighlights?: string[];
  mode?: AnalysisMode;
}

export interface SynthesisResult {
  consensus: string[];
  tensions: SynthesisTension[];
  confidence_score: number;
  ranked_recommendations: SynthesisRecommendation[];
  refined_brief_suggestions: string[];
  prompt_modifications: string[];
  executive_summary: string;
}

export interface SynthesisTension {
  topic: string;
  positions: string[];
  resolution_suggestion: string;
  requires_human_decision: boolean;
}

export interface SynthesisRecommendation {
  action: string;
  rationale: string;
  confidence: "high" | "medium" | "low";
  source_agents: string[];
}

// ─── Tool Schema ───

export const synthesizeToolSchema = {
  type: "function" as const,
  function: {
    name: "generate_synthesis",
    description: "Synthesize outputs from multiple AI agents into a unified analysis with consensus, tensions, and recommendations.",
    parameters: {
      type: "object",
      properties: {
        consensus: {
          type: "array",
          items: { type: "string" },
          description: "3-5 points where all or most agents AGREE. Each point should reference which agents aligned and why this agreement is significant. High-confidence signals.",
        },
        tensions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              topic: { type: "string", description: "The specific area of disagreement (e.g., 'pricing strategy', 'target market breadth')" },
              positions: {
                type: "array",
                items: { type: "string" },
                description: "The different positions, each attributed to the agent(s) that hold it (e.g., 'The Skeptic argues X while The Champion counters Y')",
              },
              resolution_suggestion: { type: "string", description: "A concrete suggestion for resolving this tension" },
              requires_human_decision: { type: "boolean", description: "True if this tension can't be resolved by AI alone and needs the founder's judgment" },
            },
            required: ["topic", "positions", "resolution_suggestion", "requires_human_decision"],
            additionalProperties: false,
          },
          description: "2-4 genuine tensions or contradictions between agent outputs. Not restated agreements — real disagreements.",
        },
        confidence_score: {
          type: "number",
          description: "0-100 score representing overall cross-agent agreement. 80+ = strong consensus, 50-79 = moderate disagreement, <50 = significant tensions. Be honest, not optimistic.",
        },
        ranked_recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action: { type: "string", description: "A specific, actionable next step" },
              rationale: { type: "string", description: "Why this action matters, referencing agent outputs" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              source_agents: {
                type: "array",
                items: { type: "string" },
                description: "Which agents support this recommendation",
              },
            },
            required: ["action", "rationale", "confidence", "source_agents"],
            additionalProperties: false,
          },
          description: "5-7 recommended actions ranked by confidence. Actions supported by more agents rank higher.",
        },
        refined_brief_suggestions: {
          type: "array",
          items: { type: "string" },
          description: "3-5 specific modifications to the original brief based on the synthesis. Each should reference which agent's insight drove the change.",
        },
        prompt_modifications: {
          type: "array",
          items: { type: "string" },
          description: "3-5 specific changes to the Lovable build prompt based on agent consensus. E.g., 'Add a competitive comparison section based on The Competitor's moat analysis.'",
        },
        executive_summary: {
          type: "string",
          description: "2-3 sentence summary of the synthesis. What do the agents collectively think about this idea? What's the single most important insight?",
        },
      },
      required: ["consensus", "tensions", "confidence_score", "ranked_recommendations", "refined_brief_suggestions", "prompt_modifications", "executive_summary"],
      additionalProperties: false,
    },
  },
};

// ─── Core Logic ───

// Hard fallback chain — only models known to be allowed by the Lovable Gateway.
// Ordered fastest-first so we stay under the orchestrator's 90s budget.
// Gemini 2.5-pro typically returns synthesis in ~25s; GPT-5 takes 60-70s.
const SYNTHESIS_FALLBACK_MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-3-flash-preview",
  "openai/gpt-5",
];

export async function synthesize(input: SynthesisInput): Promise<SynthesisResult> {
  const primaryModel = selectModel("synthesis", { mode: input.mode });
  const modelChain = [primaryModel, ...SYNTHESIS_FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  // Build a comprehensive context from all agent outputs
  let agentOutputs = "";

  // Perspectives
  for (const p of input.perspectives) {
    agentOutputs += `\n### ${p.persona.toUpperCase()}'s Perspective\n`;
    agentOutputs += `Headline: ${p.headline}\n`;
    agentOutputs += `${p.perspective}\n`;
    if (p.challenge_questions?.length) {
      agentOutputs += `Challenge Questions:\n`;
      for (const q of p.challenge_questions) {
        agentOutputs += `- ${q.question} (${q.context})\n`;
      }
    }
  }

  // Expansion
  if (input.expansion) {
    agentOutputs += `\n### EXPANSION ANALYSIS\n`;
    agentOutputs += `Core Insight: ${input.expansion.core_insight}\n`;
    for (const exp of input.expansion.expansions) {
      agentOutputs += `- ${exp.title}: ${exp.pitch} (${exp.potential})\n`;
    }
  }

  // Distillation
  if (input.distillation) {
    agentOutputs += `\n### DISTILLATION\n`;
    agentOutputs += `Thesis: ${input.distillation.thesis_statement}\n`;
    agentOutputs += `One Feature: ${input.distillation.one_feature}\n`;
    agentOutputs += `One Customer: ${input.distillation.one_customer}\n`;
    agentOutputs += `MVP Scope: ${input.distillation.mvp_scope}\n`;
    agentOutputs += `Cut List: ${input.distillation.what_to_cut?.join(", ")}\n`;
  }

  // User signals
  if (input.highlights?.length) {
    agentOutputs += `\nUser HIGHLIGHTED (resonating): ${input.highlights.join(", ")}\n`;
  }
  if (input.antiHighlights?.length) {
    agentOutputs += `User FLAGGED (not resonating): ${input.antiHighlights.join(", ")}\n`;
  }

  const briefContext = Object.entries(input.brief)
    .filter(([k]) => k !== "scale_assessment")
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("\n");

  const systemPrompt = `You are the Synthesis Agent — a meta-analyst who reads the outputs of multiple AI agents and produces a unified, actionable synthesis.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

Your job is NOT to average opinions. Your job is to:
1. Find genuine CONSENSUS — where do agents agree, and why is that agreement meaningful?
2. Find genuine TENSIONS — where do agents actually contradict each other? Don't manufacture conflict where none exists.
3. Score confidence honestly — if agents disagree significantly, the score should be low.
4. Rank recommendations by how many agents support them and how actionable they are.
5. Suggest specific brief modifications that incorporate the best insights from each agent.
6. Suggest specific Lovable prompt modifications based on the collective wisdom.

RULES:
- Reference specific agents by name (The Skeptic, The Champion, etc.)
- Never be generic. Every point must trace back to a specific agent's output.
- Tensions must be REAL disagreements, not restated agreements in different words.
- If the distillation contradicts the expansion, that's a tension worth noting.
- If the user highlighted or flagged sections, weight those signals heavily.`;

  const userContent = `Original idea: "${input.idea}"

Original Brief:
${briefContext}

─── AGENT OUTPUTS ───
${agentOutputs}

Synthesize all of the above into a unified analysis. Find what they agree on, where they disagree, and what the founder should do next.`;

  let lastError: unknown;
  for (const model of modelChain) {
    try {
      const startedAt = Date.now();
      const result = await callLLMWithTool<SynthesisResult>({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [synthesizeToolSchema],
        toolChoice: { type: "function", function: { name: "generate_synthesis" } },
      });
      console.log(`[synthesize] ✓ ${model} in ${Date.now() - startedAt}ms`);
      return result;
    } catch (e) {
      lastError = e;
      console.error(`[synthesize] ✗ ${model}: ${(e as Error).message}`);
      // continue to next model in the chain
    }
  }
  throw lastError ?? new Error("All synthesis models failed");
}
