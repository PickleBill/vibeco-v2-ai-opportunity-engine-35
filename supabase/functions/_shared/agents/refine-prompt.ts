import { callLLMWithTool } from "../llm-client.ts";
import { selectModel } from "../model-router.ts";
import { formatBriefContext } from "./persona.ts";
import type { RefinePromptInput, RefinePromptResult } from "../types.ts";

// ─── Tool Schema ───

export const promptToolSchema = {
  type: "function" as const,
  function: {
    name: "generate_refined_prompt",
    description: "Generate a refined Lovable prompt incorporating Thunderdome feedback.",
    parameters: {
      type: "object",
      properties: {
        lovable_prompt: {
          type: "string",
          description: "The complete refined Lovable prompt. Follow the exact same structured format as the original (CONTEXT, APP TYPE, DESIGN SYSTEM, HERO, SECTIONS, FORMS, FOOTER, METADATA, POST-BUILD VERIFICATION). 800-1500 words.",
        },
        version_label: {
          type: "string",
          description: "A short label describing what changed in this version.",
        },
        changes_from_original: {
          type: "array",
          items: { type: "string" },
          description: "3-5 bullet points describing what changed from the previous version and why.",
        },
      },
      required: ["lovable_prompt", "version_label", "changes_from_original"],
      additionalProperties: false,
    },
  },
};

// ─── Core Logic ───

export async function generateRefinedPrompt(input: RefinePromptInput): Promise<RefinePromptResult> {
  const briefContext = formatBriefContext(input.brief as unknown as Record<string, unknown>);
  const model = selectModel("prompt-engineering", { mode: input.mode });

  let context = `Original idea: "${input.idea}"\n\nBrief:\n${briefContext}\n\n`;

  if (input.original_prompt) {
    context += `Previous Lovable prompt (to improve upon):\n${input.original_prompt}\n\n`;
  }

  if (input.perspectives?.length) {
    context += `Persona perspectives the user reviewed:\n`;
    for (const p of input.perspectives) {
      context += `- ${p.persona}: ${p.headline || p.perspective?.slice(0, 200)}\n`;
    }
    context += `\n`;
  }

  if (input.distillation) {
    context += `Distillation results:\n`;
    context += `- Core thesis: ${input.distillation.thesis_statement}\n`;
    context += `- One feature: ${input.distillation.one_feature}\n`;
    context += `- One customer: ${input.distillation.one_customer}\n`;
    context += `- MVP scope: ${input.distillation.mvp_scope}\n`;
    context += `- Cut from V1: ${input.distillation.what_to_cut?.join(", ")}\n\n`;
  }

  if (input.annotations?.length) {
    context += `User annotations on the brief:\n`;
    for (const a of input.annotations) {
      context += `- [${a.type}] on "${a.section}": ${a.content}\n`;
    }
    context += `\n`;
  }

  if (input.highlights?.length) {
    context += `Sections that RESONATE (prioritize): ${input.highlights.join(", ")}\n`;
  }
  if (input.antiHighlights?.length) {
    context += `Sections to DEPRIORITIZE: ${input.antiHighlights.join(", ")}\n`;
  }

  if (input.refinement_context) {
    context += `\nAdditional refinement context: ${input.refinement_context}\n`;
  }

  if (input.stack_items?.length) {
    const pinned = input.stack_items.filter((s) => s.pinned);
    const suggested = input.stack_items.filter((s) => !s.pinned);
    context += `\n--- VIBE STACK (curated insights the user has explicitly chosen to keep) ---\n`;
    if (pinned.length) {
      context += `\n[PINNED — these are MANDATORY context, fold each into the prompt]\n`;
      for (const s of pinned) {
        context += `• (${s.kind}${s.source ? ` · ${s.source}` : ""}) ${s.label}\n  ${s.content.slice(0, 600)}\n`;
      }
    }
    if (suggested.length) {
      context += `\n[SUGGESTED — incorporate where it strengthens the prompt; OK to compress]\n`;
      for (const s of suggested) {
        context += `• (${s.kind}${s.source ? ` · ${s.source}` : ""}) ${s.label}\n  ${s.content.slice(0, 400)}\n`;
      }
    }
    context += `\n`;
  }

  const systemPrompt = `You are a Lovable prompt engineer. Your job is to generate a REFINED version of a Lovable build prompt that incorporates feedback from multiple AI perspectives, user annotations, and distillation.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

RULES:
1. Follow the exact structured format: CONTEXT → APP TYPE → DESIGN SYSTEM → HERO → SECTIONS → FORMS → FOOTER → METADATA → POST-BUILD VERIFICATION
2. Every button has a click action. Every section has mobile behavior. All copy is real.
3. If distillation data exists, this is a SIMPLIFIED version — fewer sections, tighter scope, focused on the one core feature.
4. If perspective data exists, incorporate the strongest feedback — especially from The Skeptic (risks to address) and The Customer (what they'd actually pay for).
5. If annotations exist, treat them as direct overrides — the user knows their product better than the AI.
6. Sections the user highlighted get 2x detail. Sections they flagged get minimal treatment or are removed.
7. If a VIBE STACK is provided, treat PINNED items as mandatory: every pinned chit must visibly shape the prompt. SUGGESTED items should reinforce the direction.
8. 800-1500 words. Specific and actionable.`;

  return callLLMWithTool<RefinePromptResult>({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: context },
    ],
    tools: [promptToolSchema],
    toolChoice: { type: "function", function: { name: "generate_refined_prompt" } },
  });
}
