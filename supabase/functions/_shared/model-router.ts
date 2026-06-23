import type { AnalysisMode } from "./types.ts";

// ─── Task Types ───

export type TaskType =
  | "analysis-initial"      // First-pass idea analysis
  | "analysis-refine"       // Iterative refinement
  | "analysis-final"        // Final comprehensive brief
  | "deep-dive"             // Section deep-dive
  | "perspective"           // Persona perspective generation
  | "expansion"             // Creative variation generation
  | "distillation"          // Ruthless scoping
  | "synthesis"             // Cross-agent aggregation (NEW)
  | "prompt-engineering"    // Lovable prompt generation/refinement
  | "html-generation"       // Landing page HTML
  | "image-generation"      // Visual asset creation
  | "alt-prompt"            // Research/design prompts for other tools
  | "quick-classification"  // Fast categorization/routing
  | "pain-classification"   // Signal Mine: label social items (pain/feature/noise)
  | "feedback-synthesis"    // Signal Mine: cluster → feature candidate synthesis
  | "bill-qa";              // bricker-os: corpus-grounded Q&A in Bill's voice

// ─── Model Selection ───

interface ModelCandidate {
  model: string;
  rationale: string;
  cost: "low" | "medium" | "high";
  speed: "fast" | "medium" | "slow";
}

/**
 * Model routing table: maps each task type to an ordered list of candidates.
 * First candidate is the best choice; subsequent are fallbacks.
 *
 * Rationale for assignments:
 * - Gemini 3-flash: Fastest structured JSON output, cheapest. Good for parallel workloads.
 * - Gemini 2.5-pro: Deep reasoning, comprehensive analysis. Good for final briefs.
 * - Gemini 2.5-flash: Fast code/HTML generation.
 * - Claude Sonnet 4: Best at critical analysis, synthesis, prompt engineering, saying "no".
 * - GPT-4o: Strongest lateral/creative thinking for divergent tasks.
 * - Claude 3 Haiku: Cheapest/fastest for simple classification.
 * - Gemini 3.1-flash-image: Only model with image generation.
 */
const ROUTING_TABLE: Record<TaskType, ModelCandidate[]> = {
  "analysis-initial": [
    { model: "google/gemini-3-flash-preview", rationale: "Fast structured output for initial analysis", cost: "low", speed: "fast" },
    { model: "google/gemini-2.5-flash", rationale: "Fallback", cost: "low", speed: "fast" },
  ],
  "analysis-refine": [
    { model: "google/gemini-3-flash-preview", rationale: "Fast iteration on refinement rounds", cost: "low", speed: "fast" },
    { model: "google/gemini-2.5-pro", rationale: "Deep mode refinement", cost: "medium", speed: "medium" },
  ],
  "analysis-final": [
    { model: "google/gemini-2.5-pro", rationale: "Deep reasoning for comprehensive final brief", cost: "medium", speed: "medium" },
    { model: "openai/gpt-5", rationale: "Alternative deep analysis", cost: "high", speed: "medium" },
  ],
  "deep-dive": [
    { model: "google/gemini-3-flash-preview", rationale: "Fast deep-dive generation", cost: "low", speed: "fast" },
    { model: "google/gemini-2.5-pro", rationale: "Deep mode", cost: "medium", speed: "medium" },
  ],
  "perspective": [
    { model: "google/gemini-3-flash-preview", rationale: "Speed matters when firing 5 in parallel", cost: "low", speed: "fast" },
    { model: "google/gemini-2.5-flash", rationale: "Fallback", cost: "low", speed: "fast" },
  ],
  "expansion": [
    { model: "openai/gpt-5", rationale: "Strongest lateral/creative thinking", cost: "high", speed: "medium" },
    { model: "google/gemini-2.5-pro", rationale: "Fallback for creative expansion", cost: "medium", speed: "medium" },
    { model: "google/gemini-3-flash-preview", rationale: "Fast mode fallback", cost: "low", speed: "fast" },
  ],
  "distillation": [
    { model: "openai/gpt-5", rationale: "Best at critical analysis and ruthless scoping", cost: "high", speed: "medium" },
    { model: "google/gemini-2.5-pro", rationale: "Fallback", cost: "medium", speed: "medium" },
    { model: "google/gemini-3-flash-preview", rationale: "Fast mode fallback", cost: "low", speed: "fast" },
  ],
  "synthesis": [
    { model: "google/gemini-2.5-pro", rationale: "Fast (~25s) and reliably available; primary for synthesis", cost: "medium", speed: "medium" },
    { model: "openai/gpt-5", rationale: "Higher-quality fallback when Gemini fails (slower, ~60-70s)", cost: "high", speed: "slow" },
    { model: "google/gemini-3-flash-preview", rationale: "Last-resort fast fallback", cost: "low", speed: "fast" },
  ],
  "prompt-engineering": [
    { model: "google/gemini-2.5-pro", rationale: "Most precise structured output for build specs", cost: "medium", speed: "medium" },
    { model: "openai/gpt-5", rationale: "Alternative high-quality prompt generation", cost: "high", speed: "medium" },
    { model: "google/gemini-3-flash-preview", rationale: "Fast mode", cost: "low", speed: "fast" },
  ],
  "html-generation": [
    { model: "google/gemini-2.5-flash", rationale: "Fast, cheap, good at HTML/code generation", cost: "low", speed: "fast" },
    { model: "google/gemini-3-flash-preview", rationale: "Fallback", cost: "low", speed: "fast" },
  ],
  "image-generation": [
    { model: "google/gemini-3.1-flash-image-preview", rationale: "Only model with image generation", cost: "low", speed: "fast" },
  ],
  "alt-prompt": [
    { model: "google/gemini-2.5-flash", rationale: "Fast prompt generation", cost: "low", speed: "fast" },
    { model: "google/gemini-3-flash-preview", rationale: "Fallback", cost: "low", speed: "fast" },
  ],
  "quick-classification": [
    { model: "google/gemini-2.5-flash-lite", rationale: "Cheapest and fastest for classification", cost: "low", speed: "fast" },
    { model: "google/gemini-3-flash-preview", rationale: "Fallback", cost: "low", speed: "fast" },
  ],
  "pain-classification": [
    { model: "google/gemini-2.5-flash-lite", rationale: "High-recall, dirt-cheap first-pass filter over a noisy firehose", cost: "low", speed: "fast" },
    { model: "google/gemini-3-flash-preview", rationale: "Fallback", cost: "low", speed: "fast" },
  ],
  "feedback-synthesis": [
    { model: "google/gemini-2.5-pro", rationale: "Reasoning depth to turn a cluster of complaints into a crisp feature candidate", cost: "medium", speed: "medium" },
    { model: "openai/gpt-5", rationale: "Higher-quality fallback", cost: "high", speed: "slow" },
    { model: "google/gemini-3-flash-preview", rationale: "Fast-mode fallback", cost: "low", speed: "fast" },
  ],
  "bill-qa": [
    { model: "anthropic/claude-3.5-sonnet", rationale: "Best voice fidelity for first-person answers grounded in a corpus", cost: "medium", speed: "medium" },
    { model: "anthropic/claude-3-haiku", rationale: "Cheap/fast fallback, still strong at grounded Q&A", cost: "low", speed: "fast" },
    { model: "google/gemini-2.5-flash", rationale: "Last-resort fallback", cost: "low", speed: "fast" },
  ],
};

// ─── Legacy Compatibility ───

/**
 * Maps the legacy "fast"/"deep" mode toggle to model strings.
 * Used by agents that haven't migrated to selectModel() yet.
 */
const LEGACY_MODEL_MAP: Record<AnalysisMode, string> = {
  fast: "google/gemini-3-flash-preview",
  deep: "google/gemini-2.5-pro",
};

export function legacyModelSelect(mode?: AnalysisMode): string {
  return LEGACY_MODEL_MAP[mode || "fast"];
}

// ─── Smart Selection ───

interface SelectModelOptions {
  mode?: AnalysisMode;
  availability?: Record<string, boolean>; // from probe-models cache
}

/**
 * Select the optimal model for a given task type.
 *
 * In "fast" mode, picks the fastest available candidate.
 * In "deep" mode, picks the primary (best) candidate, falling back if unavailable.
 */
export function selectModel(
  taskType: TaskType,
  options: SelectModelOptions = {},
): string {
  const candidates = ROUTING_TABLE[taskType];
  if (!candidates?.length) {
    return LEGACY_MODEL_MAP.fast; // safe fallback
  }

  const { mode = "fast", availability } = options;

  if (mode === "fast") {
    // In fast mode, pick the cheapest/fastest available option
    const fast = candidates.find(
      (c) => c.speed === "fast" && isAvailable(c.model, availability),
    );
    if (fast) return fast.model;
  }

  // In deep mode (or no fast candidate found), use primary with fallback chain
  for (const candidate of candidates) {
    if (isAvailable(candidate.model, availability)) {
      return candidate.model;
    }
  }

  // Everything unavailable — return first candidate anyway and let it fail at call time
  return candidates[0].model;
}

function isAvailable(model: string, availability?: Record<string, boolean>): boolean {
  if (!availability) return true; // no availability data = assume available
  return availability[model] !== false;
}
