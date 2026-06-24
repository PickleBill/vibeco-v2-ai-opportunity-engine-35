import { callLLMWithTool } from "../llm-client.ts";
import { selectModel } from "../model-router.ts";
import type { AnalysisMode } from "../types.ts";

/**
 * Signal Mine agent — turns raw social items into ranked feature candidates.
 *
 * Pipeline (see docs/SOCIAL_LISTENING_PRD.md):
 *   Stage 2  classifyItems       — cheap high-recall filter (pain/feature/noise)
 *   Stage 3  clusterPainPoints   — group semantically-similar complaints
 *   Stage 4  synthesizeCandidate — cluster → crisp, evidence-backed feature
 *
 * Collection (Stage 1) lives in the signal-collect edge function; routing
 * (Stage 5) is a manual human gate on the Signal Board.
 */

// ─── Types ───

export interface RawItem {
  id?: string;
  source: string;        // 'reddit' | 'appstore_review'
  source_url?: string;
  title?: string;
  body: string;
}

export interface ClassifiedItem extends RawItem {
  label: "pain_point" | "feature_request" | "praise" | "question" | "noise" | "off_topic";
  label_confidence: number; // 0..1
}

export interface Cluster {
  theme: string;
  member_indices: number[]; // indices into the classified pain/feature array
  pain_score: number;       // 0..100
}

export interface FeatureCandidate {
  cluster_theme: string;
  problem: string;
  proposed_solution: string;
  representative_quotes: string[];
  pain_score: number;       // 0..100
  confidence: number;       // 0..100
  effort: "S" | "M" | "L";
  evidence: { member_count: number; sources: string[] };
  // signal_raw row IDs of this cluster's members — lets the caller write
  // signal_raw.cluster_id back so the candidate → source-row evidence join
  // resolves. Empty when items were passed inline without DB ids.
  source_ids: string[];
}

export interface SignalMineInput {
  items: RawItem[];
  product: string;          // e.g. 'niceace'
  product_context?: string; // what the product is, so the agent judges relevance
  mode?: AnalysisMode;
}

export interface SignalMineResult {
  product: string;
  counts: { collected: number; pain: number; clusters: number; candidates: number };
  candidates: FeatureCandidate[];
  timing: Record<string, number>;
}

// Pulse P1: match new candidate themes against durable themes so trends persist.
export interface ExistingTheme { id: string; title: string; }
export interface ThemeMatch { candidate_index: number; theme_id: string | null; } // null = new theme

const themeMatchSchema = {
  type: "function" as const,
  function: {
    name: "match_themes",
    description: "Map each new candidate theme to an existing durable theme, or mark it new.",
    parameters: {
      type: "object",
      properties: {
        matches: {
          type: "array",
          items: {
            type: "object",
            properties: {
              candidate_index: { type: "number", description: "Index into the new candidates list." },
              theme_id: { type: ["string", "null"], description: "Existing theme id if this is the same underlying pain, else null for a new theme." },
            },
            required: ["candidate_index", "theme_id"],
            additionalProperties: false,
          },
        },
      },
      required: ["matches"],
      additionalProperties: false,
    },
  },
};

/**
 * Semantically match newly-synthesized candidates to existing durable themes.
 * Pure same-meaning matching (different wording is fine); only return an
 * existing id when it's genuinely the same pain, else null (a new theme).
 */
export async function matchThemes(
  candidates: FeatureCandidate[],
  existing: ExistingTheme[],
  product: string,
  mode?: AnalysisMode,
): Promise<ThemeMatch[]> {
  if (!candidates.length) return [];
  if (!existing.length) return candidates.map((_, i) => ({ candidate_index: i, theme_id: null }));

  const model = selectModel("feedback-synthesis", { mode });
  const newList = candidates.map((c, i) => `[${i}] ${c.cluster_theme} — ${c.problem}`).join("\n");
  const oldList = existing.map((t) => `(${t.id}) ${t.title}`).join("\n");
  const system = `You maintain a durable list of product pain themes for "${product}". Decide whether each NEW candidate is the SAME underlying pain as an EXISTING theme (wording may differ) — if so return that theme's id; otherwise return null (a genuinely new theme). Be conservative: only match when it's clearly the same pain.`;

  try {
    const out = await callLLMWithTool<{ matches: ThemeMatch[] }>({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `EXISTING THEMES:\n${oldList}\n\nNEW CANDIDATES:\n${newList}\n\nMap each new candidate.` },
      ],
      tools: [themeMatchSchema],
      toolChoice: { type: "function", function: { name: "match_themes" } },
      maxTokens: 1024,
    });
    const valid = new Set(existing.map((t) => t.id));
    const byIdx = new Map(out.matches.map((m) => [m.candidate_index, m]));
    return candidates.map((_, i) => {
      const m = byIdx.get(i);
      const id = m && m.theme_id && valid.has(m.theme_id) ? m.theme_id : null;
      return { candidate_index: i, theme_id: id };
    });
  } catch {
    // Matching is best-effort; on failure treat everything as new (no crash).
    return candidates.map((_, i) => ({ candidate_index: i, theme_id: null }));
  }
}

// ─── Tool schemas ───

const classifySchema = {
  type: "function" as const,
  function: {
    name: "classify_items",
    description: "Classify a batch of social posts/reviews by what they express.",
    parameters: {
      type: "object",
      properties: {
        results: {
          type: "array",
          description: "One entry per input item, in the same order.",
          items: {
            type: "object",
            properties: {
              index: { type: "number", description: "0-based index of the item being classified." },
              label: {
                type: "string",
                enum: ["pain_point", "feature_request", "praise", "question", "noise", "off_topic"],
              },
              confidence: { type: "number", description: "0..1" },
            },
            required: ["index", "label", "confidence"],
            additionalProperties: false,
          },
        },
      },
      required: ["results"],
      additionalProperties: false,
    },
  },
};

const clusterSchema = {
  type: "function" as const,
  function: {
    name: "cluster_pain_points",
    description: "Group similar complaints into themed clusters and score each cluster's pain.",
    parameters: {
      type: "object",
      properties: {
        clusters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              theme: { type: "string", description: "Short label for the shared complaint." },
              member_indices: { type: "array", items: { type: "number" }, description: "Indices of items in this cluster." },
              pain_score: { type: "number", description: "0..100 = frequency × intensity × recency. More angry, more repeated = higher." },
            },
            required: ["theme", "member_indices", "pain_score"],
            additionalProperties: false,
          },
        },
      },
      required: ["clusters"],
      additionalProperties: false,
    },
  },
};

const synthSchema = {
  type: "function" as const,
  function: {
    name: "synthesize_feature_candidate",
    description: "Turn a cluster of complaints into one crisp, buildable feature candidate.",
    parameters: {
      type: "object",
      properties: {
        problem: { type: "string", description: "The user problem, stated crisply in one or two sentences." },
        proposed_solution: { type: "string", description: "The SMALLEST feature that kills this pain. Concrete, buildable." },
        representative_quotes: { type: "array", items: { type: "string" }, description: "2-4 paraphrased (not verbatim) representative complaints." },
        confidence: { type: "number", description: "0..100. How confident this is worth building, given evidence strength + fit." },
        effort: { type: "string", enum: ["S", "M", "L"], description: "Rough build effort." },
      },
      required: ["problem", "proposed_solution", "representative_quotes", "confidence", "effort"],
      additionalProperties: false,
    },
  },
};

// ─── Stage 2: classify ───

export async function classifyItems(items: RawItem[], product: string, productContext = "", mode?: AnalysisMode): Promise<ClassifiedItem[]> {
  if (!items.length) return [];
  const model = selectModel("pain-classification", { mode });

  const list = items.map((it, i) => `[${i}] (${it.source}) ${it.title ? it.title + " — " : ""}${it.body}`).join("\n");
  const system = `You are a high-recall classifier for product feedback about "${product}". ${productContext}
Label each item by what it expresses. Be generous about pain_point/feature_request (we filter later); only mark noise/off_topic when clearly irrelevant or spam. Output one result per item, same order.`;

  const out = await callLLMWithTool<{ results: { index: number; label: ClassifiedItem["label"]; confidence: number }[] }>({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Classify these ${items.length} items:\n${list}` },
    ],
    tools: [classifySchema],
    toolChoice: { type: "function", function: { name: "classify_items" } },
    maxTokens: 4096,
  });

  const byIndex = new Map(out.results.map((r) => [r.index, r]));
  return items.map((it, i) => {
    const r = byIndex.get(i);
    return { ...it, label: r?.label ?? "off_topic", label_confidence: r?.confidence ?? 0 };
  });
}

// ─── Stage 3: cluster ───

export async function clusterPainPoints(painItems: ClassifiedItem[], product: string, mode?: AnalysisMode): Promise<Cluster[]> {
  if (painItems.length < 2) {
    return painItems.length === 1
      ? [{ theme: (painItems[0].title || painItems[0].body).slice(0, 60), member_indices: [0], pain_score: 40 }]
      : [];
  }
  const model = selectModel("feedback-synthesis", { mode });
  const list = painItems.map((it, i) => `[${i}] ${it.title ? it.title + " — " : ""}${it.body}`).join("\n");
  const system = `You cluster complaints about "${product}" into themes. Merge items describing the same underlying pain even if worded differently. Score pain_score 0..100 = frequency × intensity × recency: bigger, angrier, more recent clusters score higher. Don't force everything into one cluster; 2-6 tight clusters beats one mushy one.`;

  const out = await callLLMWithTool<{ clusters: Cluster[] }>({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Cluster these ${painItems.length} complaints:\n${list}` },
    ],
    tools: [clusterSchema],
    toolChoice: { type: "function", function: { name: "cluster_pain_points" } },
    maxTokens: 2048,
  });
  return out.clusters
    .filter((c) => c.member_indices?.length)
    .sort((a, b) => b.pain_score - a.pain_score);
}

// ─── Stage 4: synthesize ───

export async function synthesizeCandidate(cluster: Cluster, painItems: ClassifiedItem[], product: string, productContext = "", mode?: AnalysisMode): Promise<FeatureCandidate> {
  const model = selectModel("feedback-synthesis", { mode });
  const members = cluster.member_indices.map((i) => painItems[i]).filter(Boolean);
  const evidence = members.map((m, i) => `[${i}] (${m.source}) ${m.title ? m.title + " — " : ""}${m.body}`).join("\n");
  const sources = [...new Set(members.map((m) => m.source))];

  const system = `You are a product strategist for "${product}". ${productContext}
Read a cluster of real user complaints and produce ONE crisp, buildable feature candidate. Favor the smallest change that kills the pain. Paraphrase quotes — never reproduce them verbatim.`;

  const result = await callLLMWithTool<Omit<FeatureCandidate, "cluster_theme" | "pain_score" | "evidence" | "source_ids">>({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Theme: ${cluster.theme}\n\nComplaints:\n${evidence}\n\nSynthesize the feature candidate.` },
    ],
    tools: [synthSchema],
    toolChoice: { type: "function", function: { name: "synthesize_feature_candidate" } },
    maxTokens: 1500,
  });

  return {
    cluster_theme: cluster.theme,
    pain_score: cluster.pain_score,
    evidence: { member_count: members.length, sources },
    ...result,
    source_ids: members.map((m) => m.id).filter((id): id is string => !!id),
  };
}

// ─── Orchestration ───

export async function runSignalMine(input: SignalMineInput): Promise<SignalMineResult> {
  const start = Date.now();
  const timing: Record<string, number> = {};
  const ctx = input.product_context || "";

  const classified = await classifyItems(input.items, input.product, ctx, input.mode);
  timing.classify = Date.now() - start;

  // Keep pain points + feature requests above a confidence floor (Stage 2 gate)
  const pain = classified.filter((c) => (c.label === "pain_point" || c.label === "feature_request") && c.label_confidence >= 0.5);

  const clusters = await clusterPainPoints(pain, input.product, input.mode);
  timing.cluster = Date.now() - start;

  // Synthesize the top clusters in parallel (cap to control cost)
  const top = clusters.slice(0, 6);
  const settled = await Promise.allSettled(
    top.map((c) => synthesizeCandidate(c, pain, input.product, ctx, input.mode)),
  );
  const candidates = settled
    .filter((r): r is PromiseFulfilledResult<FeatureCandidate> => r.status === "fulfilled")
    .map((r) => r.value)
    .sort((a, b) => b.pain_score * b.confidence - a.pain_score * a.confidence);
  timing.synthesize = Date.now() - start;
  timing.total = Date.now() - start;

  return {
    product: input.product,
    counts: { collected: input.items.length, pain: pain.length, clusters: clusters.length, candidates: candidates.length },
    candidates,
    timing,
  };
}
