import { callLLMWithTool } from "../llm-client.ts";
import { selectModel } from "../model-router.ts";
import type { AnalysisMode } from "../types.ts";

/**
 * Debate Agent — generalized multi-perspective analysis.
 *
 * Unlike the Thunderdome (which is business-idea-specific), this works on
 * ANY topic: architecture decisions, code review, design choices, roadmap
 * questions, strategy debates.
 *
 * Pattern:
 *   1. Multiple AI perspectives weigh in (parallel)
 *   2. Synthesizer reads all and produces consensus/tensions/recommendation
 *
 * Default personas can be overridden per call.
 */

// ─── Default Persona Library ───
// Each persona is a system prompt that shapes the AI's stance.

export const DEBATE_PERSONAS: Record<string, string> = {
  skeptic: `You are The Skeptic. Find what could go wrong with this proposal. List 3-5 specific risks, failure modes, or assumptions that might be wrong. For each risk, suggest a mitigation. Be direct and challenging but constructive — your goal is to prevent bad decisions, not to discourage.`,

  champion: `You are The Champion. Find the 3-5 strongest reasons this proposal could succeed. Cite real-world precedents, similar successful approaches, or supporting data. You're not blindly optimistic — you ground every point in evidence. Help the decision-maker see what's possible.`,

  builder: `You are The Builder. Evaluate technical feasibility and implementation effort. What's hard vs. easy? What can be faked vs. needs to be real? What's the minimum viable version? Estimate effort in days/weeks. End with a concrete next step.`,

  pragmatist: `You are The Pragmatist. Cut through ambition and focus on what's actually achievable with current resources. What's the simplest version that delivers value? What can be deferred? What dependencies need to be true for this to work?`,

  strategist: `You are The Strategist. Zoom out. How does this proposal fit into longer-term goals? What second-order effects might emerge? What strategic options does it open or close? What competitive position does it create?`,

  user_advocate: `You are The User Advocate. Speak from the perspective of the actual end user. Will they care? Will they understand it? Will they pay for it / use it? What's the actual moment of value? Be honest about adoption friction.`,

  security_auditor: `You are The Security Auditor. What attack vectors does this introduce? What data is exposed, where? What auth/authz boundaries matter? What could a malicious actor do? Suggest specific safeguards.`,

  performance_engineer: `You are The Performance Engineer. What scales linearly, what breaks at scale? Where will hot paths emerge? What's the latency budget? What caching, indexing, or async patterns are needed?`,

  contrarian: `You are The Contrarian. Argue the opposite of the obvious answer. If everyone wants to do X, argue for Y. Your job is to prevent groupthink. Be specific about WHY the consensus might be wrong, not just contrarian for its own sake.`,
};

// ─── Tool Schemas ───

const debatePerspectiveSchema = {
  type: "function" as const,
  function: {
    name: "generate_debate_perspective",
    description: "Generate a single perspective on the debate topic.",
    parameters: {
      type: "object",
      properties: {
        position: { type: "string", description: "This persona's position on the topic. 2-4 paragraphs of substance, not fluff." },
        key_points: {
          type: "array",
          items: { type: "string" },
          description: "3-5 bulleted key points distilled from the position.",
        },
        questions: {
          type: "array",
          items: { type: "string" },
          description: "1-3 sharp questions this persona would ask the decision-maker.",
        },
        confidence: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "How confident this persona is in their position given the available context.",
        },
      },
      required: ["position", "key_points", "questions", "confidence"],
      additionalProperties: false,
    },
  },
};

const debateSynthesisSchema = {
  type: "function" as const,
  function: {
    name: "generate_debate_synthesis",
    description: "Synthesize multiple debate perspectives into a unified recommendation.",
    parameters: {
      type: "object",
      properties: {
        executive_summary: { type: "string", description: "2-3 sentences. The bottom line for the decision-maker." },
        consensus: {
          type: "array",
          items: { type: "string" },
          description: "Where do the perspectives agree? 2-4 points.",
        },
        tensions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              issue: { type: "string", description: "What's the disagreement about?" },
              positions: { type: "array", items: { type: "string" }, description: "Each side's stance." },
              resolution: { type: "string", description: "How to resolve, or what info would resolve it." },
            },
            required: ["issue", "positions", "resolution"],
            additionalProperties: false,
          },
          description: "Genuine disagreements (2-4). Not restated agreements in different words.",
        },
        recommendation: {
          type: "string",
          enum: ["proceed", "proceed-with-caution", "modify-and-revisit", "do-not-proceed"],
          description: "The synthesized recommendation.",
        },
        rationale: { type: "string", description: "Why this recommendation. Reference specific perspectives." },
        next_actions: {
          type: "array",
          items: { type: "string" },
          description: "3-5 concrete next steps ranked by importance.",
        },
        confidence_score: {
          type: "number",
          description: "0-100. How confident the synthesis is. Lower if perspectives disagreed significantly.",
        },
      },
      required: ["executive_summary", "consensus", "tensions", "recommendation", "rationale", "next_actions", "confidence_score"],
      additionalProperties: false,
    },
  },
};

// ─── Types ───

export interface DebateInput {
  topic: string;
  context?: string;
  personas?: string[]; // default: ["skeptic", "champion", "builder"]
  custom_personas?: Record<string, string>; // arbitrary persona name → system prompt
  mode?: AnalysisMode;
}

export interface DebatePerspective {
  persona: string;
  position: string;
  key_points: string[];
  questions: string[];
  confidence: "high" | "medium" | "low";
}

export interface DebateResult {
  topic: string;
  perspectives: DebatePerspective[];
  synthesis: {
    executive_summary: string;
    consensus: string[];
    tensions: { issue: string; positions: string[]; resolution: string }[];
    recommendation: "proceed" | "proceed-with-caution" | "modify-and-revisit" | "do-not-proceed";
    rationale: string;
    next_actions: string[];
    confidence_score: number;
  };
  timing: Record<string, number>;
}

// ─── Single Perspective ───

async function generateDebatePerspective(
  topic: string,
  context: string,
  persona: string,
  systemPrompt: string,
  mode?: AnalysisMode,
): Promise<DebatePerspective> {
  const model = selectModel("perspective", { mode });

  const fullSystemPrompt = `${systemPrompt}

LANGUAGE: English only. Be specific to this exact topic — no generic platitudes.`;

  const userContent = `Topic: ${topic}

Context:
${context || "(no additional context provided)"}

Generate your perspective on this. Be specific and actionable.`;

  const result = await callLLMWithTool<Omit<DebatePerspective, "persona">>({
    model,
    messages: [
      { role: "system", content: fullSystemPrompt },
      { role: "user", content: userContent },
    ],
    tools: [debatePerspectiveSchema],
    toolChoice: { type: "function", function: { name: "generate_debate_perspective" } },
  });

  return { persona, ...result };
}

// ─── Synthesis ───

async function synthesizeDebate(
  topic: string,
  context: string,
  perspectives: DebatePerspective[],
  mode?: AnalysisMode,
) {
  const model = selectModel("synthesis", { mode });

  let perspectivesText = "";
  for (const p of perspectives) {
    perspectivesText += `\n### ${p.persona.toUpperCase()} (confidence: ${p.confidence})\n`;
    perspectivesText += `${p.position}\n\n`;
    perspectivesText += `Key points:\n${p.key_points.map((k) => `- ${k}`).join("\n")}\n\n`;
    if (p.questions.length) {
      perspectivesText += `Questions raised:\n${p.questions.map((q) => `- ${q}`).join("\n")}\n`;
    }
  }

  const systemPrompt = `You are the Debate Synthesizer. You read multiple perspectives on a topic and produce a unified, actionable recommendation.

Your job:
1. Find genuine consensus (don't manufacture it)
2. Find genuine tensions (don't manufacture them)
3. Make a clear recommendation
4. List concrete next actions

Reference specific personas by name. Be honest about uncertainty.`;

  const userContent = `Topic: ${topic}

Context:
${context || "(no additional context)"}

─── PERSPECTIVES ───
${perspectivesText}

Synthesize. What should the decision-maker do?`;

  return callLLMWithTool<DebateResult["synthesis"]>({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    tools: [debateSynthesisSchema],
    toolChoice: { type: "function", function: { name: "generate_debate_synthesis" } },
  });
}

// ─── Main ───

const TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function runDebate(input: DebateInput): Promise<DebateResult> {
  const start = Date.now();
  const timing: Record<string, number> = {};
  const context = input.context || "";

  // Resolve persona prompts
  const requestedPersonas = input.personas || ["skeptic", "champion", "builder"];
  const allPersonaPrompts = { ...DEBATE_PERSONAS, ...(input.custom_personas || {}) };

  const personaJobs = requestedPersonas
    .filter((p) => allPersonaPrompts[p])
    .map((persona) =>
      withTimeout(
        generateDebatePerspective(input.topic, context, persona, allPersonaPrompts[persona], input.mode),
        TIMEOUT_MS,
        `perspective-${persona}`,
      ).then((result) => {
        timing[`perspective-${persona}`] = Date.now() - start;
        return result;
      }),
    );

  const settled = await Promise.allSettled(personaJobs);
  const perspectives = settled
    .filter((r): r is PromiseFulfilledResult<DebatePerspective> => r.status === "fulfilled")
    .map((r) => r.value);

  timing["perspectives_complete"] = Date.now() - start;

  if (perspectives.length < 2) {
    throw new Error(`Debate requires at least 2 perspectives, got ${perspectives.length}.`);
  }

  const synthesis = await withTimeout(
    synthesizeDebate(input.topic, context, perspectives, input.mode),
    TIMEOUT_MS * 1.5,
    "debate-synthesis",
  );
  timing["synthesis"] = Date.now() - start;
  timing["total"] = Date.now() - start;

  return {
    topic: input.topic,
    perspectives,
    synthesis,
    timing,
  };
}
