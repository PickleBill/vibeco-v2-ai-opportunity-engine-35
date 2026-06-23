// ─── Shared types for all VibeCo agents ───
// These match the tool schemas used by the LLM function-calling interface.

// ─── Simulate ───

export interface BriefData {
  problem: string;
  target_customer: string;
  core_features: { name: string; description: string }[];
  revenue_model: string;
  industry_trends: string;
  investor_perspective: string;
  customer_perspective: string;
  app_type?: string;
  builder_intent?: string;
  scale_assessment?: {
    current_scale: "feature" | "experiment" | "product" | "platform";
    fits_intent: boolean;
    recommendation: string;
  };
}

export interface FollowUpQuestion {
  question: string;
  options: { label: string; description: string }[];
  allow_multiple: boolean;
}

export interface SimulationResult {
  brief: BriefData;
  follow_up_questions: FollowUpQuestion[];
  is_final: boolean;
  depth_recommendation?: "ready" | "one-more-recommended";
  lovable_prompt?: string;
}

export interface DeepDiveResult {
  deep_dive: string;
}

// ─── Persona Perspective ───

export type PersonaType = "skeptic" | "champion" | "competitor" | "customer" | "builder";

export interface PerspectiveResult {
  persona: PersonaType;
  perspective: string;
  challenge_questions: { question: string; context: string }[];
  headline: string;
}

// ─── Expand ───

export interface ExpansionVariation {
  title: string;
  pitch: string;
  how_its_different: string;
  potential: "bigger-market" | "easier-to-build" | "less-competition" | "faster-revenue";
  idea_text: string;
}

export interface ExpandResult {
  core_insight: string;
  expansions: ExpansionVariation[];
}

// ─── Distill ───

export interface DistillResult {
  one_feature: string;
  one_customer: string;
  one_revenue: string;
  thesis_statement: string;
  what_to_cut: string[];
  mvp_scope: string;
}

// ─── Refine Prompt ───

export interface RefinePromptResult {
  lovable_prompt: string;
  version_label: string;
  changes_from_original: string[];
}

// ─── Alt Prompt ───

export type AltPromptType = "research" | "design_brief" | "landing_page";

export interface AltPromptResult {
  platform: string;
  prompt: string;
  description: string;
}

// ─── Landing Page ───

export interface LandingPageResult {
  html: string;
}

// ─── Image Generation ───

export type ImageType = "concept" | "logo";

export interface ImageResult {
  image_url: string;
}

// ─── Common Input Types ───

export type AnalysisMode = "fast" | "deep";

export interface BriefContext {
  brief: BriefData;
  idea: string;
  mode?: AnalysisMode;
}

export interface SimulateInput {
  type: "initial" | "refine" | "deep_dive";
  idea: string;
  mode?: AnalysisMode;
  // Refine-specific
  history?: string;
  round?: number;
  // Deep-dive-specific
  section?: string;
  section_label?: string;
  brief?: BriefData;
}

export interface PersonaInput extends BriefContext {
  persona: PersonaType;
  builder_intent?: string;
}

export interface ExpandInput extends BriefContext {}

export interface DistillInput extends BriefContext {
  highlights?: string[];
  antiHighlights?: string[];
}

export interface StackItemInput {
  kind: "highlight" | "deep_dive" | "expansion" | "persona" | "distill" | "note";
  source?: string | null;
  label: string;
  content: string;
  pinned?: boolean;
}

export interface RefinePromptInput extends BriefContext {
  original_prompt?: string;
  perspectives?: PerspectiveResult[];
  distillation?: DistillResult;
  annotations?: { type: string; section: string; content: string }[];
  highlights?: string[];
  antiHighlights?: string[];
  refinement_context?: string;
  stack_items?: StackItemInput[];
}

export interface AltPromptInput {
  brief: BriefData;
  idea: string;
  prompt_type: AltPromptType;
  lovable_prompt?: string;
}

export interface LandingPageInput {
  prompt: string;
}

export interface ImageInput {
  idea: string;
  type: ImageType;
}

// ─── ask-bill (bricker-os terminal on Bill's dynamic résumé) ───

export interface AskBillMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskBillInput {
  question: string;
  history?: AskBillMessage[];
}

export interface AskBillResult {
  answer: string;
  model: string;
  latencyMs: number;
}
