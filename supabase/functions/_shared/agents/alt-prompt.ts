import { callLLM } from "../llm-client.ts";
import { selectModel } from "../model-router.ts";
import type { AltPromptInput, AltPromptResult } from "../types.ts";

// ─── System Prompts by Type ───

const SYSTEM_PROMPTS: Record<string, string> = {
  research: `You are a strategic research advisor. Given a product idea and its analysis brief, generate a comprehensive research prompt that a user can paste into ChatGPT or Claude to conduct deep market research, competitive analysis, and technical feasibility assessment.

The prompt should:
- Be self-contained (the AI receiving it needs full context)
- Include specific research questions based on the brief
- Ask for data sources and evidence
- Cover market sizing, competitor mapping, and customer validation strategies
- Be 400-600 words

Return ONLY raw JSON (no markdown, no code fences) shaped exactly: { "platform": "ChatGPT / Claude", "prompt": "...", "description": "One-line description of what this prompt does" }`,

  design_brief: `You are an expert UI/UX design consultant using the "Impeccable Style" framework. Given a product idea and analysis brief, generate a comprehensive design brief that a user can paste into Lovable to get a production-quality, non-generic UI.

The brief should include:
- Design direction (mood, aesthetic, anti-references)
- Typography and color guidance
- Layout strategy (asymmetric, progressive disclosure)
- Key interaction patterns
- Component hierarchy and visual weight distribution
- Mobile-first responsive strategy
- 3 specific "don't do this" anti-patterns to avoid

Return ONLY raw JSON (no markdown, no code fences) shaped exactly: { "platform": "Lovable (Design Brief)", "prompt": "...", "description": "One-line description" }`,

  landing_page: `You are a conversion-focused landing page strategist. Given a product idea and analysis brief, generate a Lovable build prompt specifically for a landing page that validates market demand.

The prompt should specify:
- A single clear CTA (waitlist signup, early access, or pre-order)
- Exactly 5-6 sections with specific copy direction
- Social proof elements (even placeholder structure)
- Mobile-first responsive behavior
- Analytics event tracking for key interactions
- A/B test suggestions for the headline

Return ONLY raw JSON (no markdown, no code fences) shaped exactly: { "platform": "Lovable (Landing Page)", "prompt": "...", "description": "One-line description" }`,
};

// ─── Helpers ───

function tryParseJSON(raw: string): AltPromptResult | null {
  if (!raw) return null;
  // Strip ```json fences if model wrapped them
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  // Extract first {...} block in case there's prose around it
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && typeof parsed.prompt === "string") {
      return parsed as AltPromptResult;
    }
  } catch {
    // fall through
  }
  return null;
}

async function callOnce(model: string, systemPrompt: string, userContent: string): Promise<AltPromptResult | null> {
  const response = await callLLM({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    responseFormat: { type: "json_object" },
  });
  return tryParseJSON(response.content || "");
}

// ─── Core Logic ───

export async function generateAltPrompt(input: AltPromptInput): Promise<AltPromptResult> {
  const systemPrompt = SYSTEM_PROMPTS[input.prompt_type];
  if (!systemPrompt) throw new Error(`Unknown prompt_type: ${input.prompt_type}`);

  const fullSystemPrompt = input.prompt_type === "landing_page" && input.lovable_prompt
    ? `${systemPrompt}\n\nReference the existing build prompt for consistency: ${input.lovable_prompt.substring(0, 500)}`
    : systemPrompt;

  const userContent = `
## Idea
${input.idea}

## Analysis Brief
- Problem: ${input.brief.problem}
- Target Customer: ${input.brief.target_customer}
- Core Features: ${JSON.stringify(input.brief.core_features)}
- Revenue Model: ${input.brief.revenue_model}
- Industry & Competitors: ${input.brief.industry_trends}
- Builder Intent: ${input.brief.builder_intent || "venture"}
- Scale Assessment: ${JSON.stringify(input.brief.scale_assessment || {})}
`;

  const primary = selectModel("alt-prompt");
  const fallback = "google/gemini-3-flash-preview";

  // Try primary
  try {
    const result = await callOnce(primary, fullSystemPrompt, userContent);
    if (result) return result;
    console.warn(`[alt-prompt] Primary model ${primary} returned malformed JSON, falling back.`);
  } catch (e) {
    console.warn(`[alt-prompt] Primary model ${primary} threw:`, e instanceof Error ? e.message : e);
  }

  // Fallback model
  if (fallback !== primary) {
    try {
      const result = await callOnce(fallback, fullSystemPrompt, userContent);
      if (result) return result;
    } catch (e) {
      console.error(`[alt-prompt] Fallback ${fallback} also failed:`, e);
      throw e;
    }
  }

  throw new Error("AI returned a response we couldn't parse. Try again in a moment.");
}
