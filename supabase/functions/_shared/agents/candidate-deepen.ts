import { runSimulation } from "./simulate.ts";
import { generatePerspective } from "./persona.ts";
import type { AnalysisMode, BriefData, PersonaType, PerspectiveResult } from "../types.ts";

/**
 * W6 — dogfood loop. Take a Signal Mine feature candidate and run it back through
 * the v1 Simulator for a deeper read:
 *   1) simulate-idea (type: "initial")  → a structured business brief
 *   2) persona-perspective × 3          → Skeptic, Customer, Builder critiques
 *
 * Composes the existing agents in-process (the same way orchestrate does), so it
 * reuses their model routing ("analysis-initial" / "perspective") — no new task
 * type or AI keys. The edge function (signal-candidate-deepen) persists the
 * result to signal_candidate_simulations and stamps feature_candidates.deepened_at.
 */

// The 3 personas this loop runs (a focused subset of the full 5-persona mesh).
export const DEEPEN_PERSONAS: PersonaType[] = ["skeptic", "customer", "builder"];

export interface DeepenEvidence {
  member_count?: number;
  sources?: string[];
  pain_score?: number;
}

export interface DeepenCandidateInput {
  problem: string;
  proposed_solution: string;
  // evidence is JSONB on the row: { member_count, sources, pain_score }. Tolerate
  // a loose shape so this works for both signal-process and ingest-signal rows.
  evidence?: DeepenEvidence | Record<string, unknown> | null;
  // representative_quotes is JSONB: string[] (signal-process) or {text}[] (ingest).
  representative_quotes?: unknown;
  mode?: AnalysisMode;
}

export interface DeepenCandidateResult {
  idea_prompt: string;
  brief: BriefData;
  perspectives: PerspectiveResult[];
}

/**
 * Normalize representative_quotes to plain strings. Mirrors quotesOf() in
 * opportunity-roadmap: quotes can be raw strings or { text, ... } objects.
 */
export function quoteLines(rq: unknown): string[] {
  if (!Array.isArray(rq)) return [];
  return rq
    .map((q) => (typeof q === "string" ? q : (q as { text?: string })?.text ?? ""))
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * PURE: build the prefill idea string fed into simulate-idea from a candidate's
 * { problem, proposed_solution, evidence }. Reads like a founder's plain-English
 * pitch (what the "initial" analysis prompt expects) while carrying the real
 * signal evidence so the brief stays grounded in mined pain, not invention.
 */
export function buildDeepenIdea(input: DeepenCandidateInput): string {
  const solution = (input.proposed_solution || "").trim();
  const problem = (input.problem || "").trim();
  const ev = (input.evidence ?? {}) as DeepenEvidence;
  const memberCount = Number(ev.member_count ?? 0) || 0;
  const sources = Array.isArray(ev.sources) ? ev.sources.filter(Boolean) : [];
  const quotes = quoteLines(input.representative_quotes).slice(0, 4);

  const parts: string[] = [];
  if (solution) parts.push(solution);
  if (problem) parts.push(`The problem it solves: ${problem}`);

  // Ground the idea in the real signal that surfaced this candidate.
  const evidenceBits: string[] = [];
  if (memberCount > 0) {
    evidenceBits.push(
      `This is drawn from real public complaints — ${memberCount} ${memberCount === 1 ? "person" : "people"} raised this pain${sources.length ? ` across ${sources.join(", ")}` : ""}.`,
    );
  } else if (sources.length) {
    evidenceBits.push(`This is drawn from real public complaints across ${sources.join(", ")}.`);
  }
  if (quotes.length) {
    evidenceBits.push(`Representative complaints:\n${quotes.map((q) => `- ${q}`).join("\n")}`);
  }
  if (evidenceBits.length) parts.push(evidenceBits.join("\n"));

  const idea = parts.join("\n\n").trim();
  // Defensive floor: never hand the simulator an empty string.
  return idea || problem || solution || "An untitled product idea mined from user pain signals.";
}

/**
 * Run the dogfood loop: simulate once, then 3 personas in parallel (allSettled so
 * a single persona failure doesn't sink the deep read — same tolerance as
 * orchestrate). Throws only if the simulator itself fails.
 */
export async function deepenCandidate(input: DeepenCandidateInput): Promise<DeepenCandidateResult> {
  const idea_prompt = buildDeepenIdea(input);

  const sim = await runSimulation({ type: "initial", idea: idea_prompt, mode: input.mode });
  const brief = sim.brief;

  const settled = await Promise.allSettled(
    DEEPEN_PERSONAS.map((persona) =>
      generatePerspective({
        idea: idea_prompt,
        brief,
        persona,
        mode: input.mode,
        builder_intent: brief.builder_intent,
      }),
    ),
  );

  const perspectives: PerspectiveResult[] = settled
    .filter((r): r is PromiseFulfilledResult<PerspectiveResult> => r.status === "fulfilled")
    .map((r) => r.value);

  for (const r of settled) {
    if (r.status === "rejected") console.error("deepen persona failed:", r.reason);
  }

  return { idea_prompt, brief, perspectives };
}
