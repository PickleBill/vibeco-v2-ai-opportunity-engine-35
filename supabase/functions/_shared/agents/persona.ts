import { callLLMWithTool } from "../llm-client.ts";
import { selectModel } from "../model-router.ts";
import type { PersonaInput, PersonaType, PerspectiveResult } from "../types.ts";

// ─── Persona System Prompts ───

export const PERSONA_PROMPTS: Record<PersonaType, string> = {
  skeptic: `You are The Skeptic — a brutally honest startup advisor who has seen 1,000 pitch decks fail. Your job is NOT to discourage but to find the 3-5 biggest risks, assumptions that might be wrong, and "what kills this?" scenarios. For each risk, give both the failure scenario AND a specific mitigation strategy. Be direct, challenging, but constructive. End with 2 sharp challenge questions the founder should answer.

TONE: Direct, slightly provocative, but ultimately helpful. Think "the friend who tells you the truth at the bar, not the one who just nods."`,

  champion: `You are The Champion — an enthusiastic but evidence-based believer in this idea. Your job is to find the 3-5 strongest reasons this could work, cite comparable successes (real companies), and identify momentum signals in the market. You're not blindly optimistic — you ground every point in data or precedent. End with 2 questions that help the founder capitalize on their advantages.

TONE: Energetic, specific, grounded. Think "the advisor who makes you feel like you CAN do this because the data says so."`,

  competitor: `You are The Competitor — a rival founder who just saw this idea and is deciding whether to copy it. Your job is to identify the 3-5 biggest competitive vulnerabilities: what's easy to replicate, where the moat is weak, what a well-funded competitor would do differently. For each vulnerability, suggest how the founder could strengthen their position. End with 2 questions about defensibility.

TONE: Strategic, slightly adversarial, respectful. Think "the smartest person at a pitch competition who asks the hardest questions."`,

  customer: `You are The Customer — the actual target persona described in the brief. Respond in FIRST PERSON as this person. Your job is to give an honest reaction: what excites you about this product (3-4 things), what makes you hesitate (2-3 things), what would make you actually pay, and what would make you churn. Be emotionally honest — use "I" statements. End with 2 questions that represent what a real customer would ask before buying.

TONE: Personal, emotional, honest. Think "the beta tester who gives real feedback in a user interview."`,

  builder: `You are The Builder — a pragmatic CTO/technical cofounder. Your job is to evaluate the technical feasibility: what's hard to build vs. easy, what should be faked vs. built for real in V1, what the critical technical decisions are, and what the recommended tech stack would be. Estimate rough development timelines for an MVP. End with 2 questions about technical priorities.

TONE: Pragmatic, scoping-focused, efficient. Think "the engineer who's done this 5 times and knows exactly where projects get stuck."`,
};

// ─── Tool Schema ───

export const perspectiveToolSchema = {
  type: "function" as const,
  function: {
    name: "generate_perspective",
    description: "Generate a persona's perspective on a business idea.",
    parameters: {
      type: "object",
      properties: {
        perspective: {
          type: "string",
          description: "The full perspective text in markdown format. 3-5 paragraphs. Include specific references to the user's idea, product name, and market. Use headers for structure: ## [Persona Name]'s Take, then paragraphs, then ## Challenge Questions.",
        },
        challenge_questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string", description: "A sharp, specific question the founder should answer." },
              context: { type: "string", description: "1 sentence explaining why this question matters." },
            },
            required: ["question", "context"],
            additionalProperties: false,
          },
          description: "2 challenge questions that push the founder to think harder.",
        },
        headline: {
          type: "string",
          description: "A punchy 5-10 word summary of this persona's overall stance.",
        },
      },
      required: ["perspective", "challenge_questions", "headline"],
      additionalProperties: false,
    },
  },
};

// ─── Brief Formatting ───

export function formatBriefContext(brief: Record<string, unknown>): string {
  return Object.entries(brief)
    .filter(([k]) => k !== "scale_assessment")
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("\n");
}

// ─── Core Logic ───

export async function generatePerspective(input: PersonaInput): Promise<PerspectiveResult> {
  const personaPrompt = PERSONA_PROMPTS[input.persona];
  if (!personaPrompt) throw new Error(`Unknown persona: ${input.persona}`);

  const briefContext = formatBriefContext(input.brief as unknown as Record<string, unknown>);
  const model = selectModel("perspective", { mode: input.mode });

  const systemPrompt = `${personaPrompt}

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

You are analyzing this specific idea. Reference the product name, target customer, and market throughout. Do not be generic.

Builder intent: ${input.builder_intent || "venture"}
Adjust your perspective depth accordingly — a "fun" project gets lighter treatment than a "venture" idea.`;

  const userContent = `Original idea: "${input.idea}"

Full brief context:
${briefContext}

Generate your perspective on this idea. Be specific to THIS product — no generic advice.`;

  const result = await callLLMWithTool<Omit<PerspectiveResult, "persona">>({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    tools: [perspectiveToolSchema],
    toolChoice: { type: "function", function: { name: "generate_perspective" } },
  });

  return { persona: input.persona, ...result };
}
