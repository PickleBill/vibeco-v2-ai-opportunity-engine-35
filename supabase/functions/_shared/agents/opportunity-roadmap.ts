import { callLLMWithTool } from "../llm-client.ts";
import { selectModel } from "../model-router.ts";
import type { AnalysisMode } from "../types.ts";

/**
 * Opportunity Roadmap agent — reasons over the LIVE mined signal for a vertical
 * and drafts a build-or-sell roadmap: for each top pain cluster, what to build,
 * who to sell it to, the recommended motion (build / sell / partner), a rough
 * effort, and a directional ROI read. It also ranks the automation candidates
 * the scanner already proposed.
 *
 * This is the "AI actually reasoning over real rows" piece — it is given the
 * real clusters/candidates and must ground every opportunity in them.
 */

export interface RoadmapInputCandidate {
  cluster_theme: string;
  problem: string;
  proposed_solution: string;
  pain_score: number;
  confidence?: number;
  effort?: string;
  member_count?: number;
  sources?: string[];
  quotes?: string[];
}

export interface RoadmapInputTheme {
  title: string;
  pain_score: number;
  trend: number;
  occurrence_count: number;
}

export interface RoadmapOpportunity {
  rank: number;
  title: string;
  problem: string;
  build: string;                       // what to build (the automation/product)
  customer: string;                    // who to sell to (ICP)
  motion: "build" | "sell" | "partner";
  effort: "S" | "M" | "L";
  roi: string;                         // directional, qualitative — labeled illustrative in the UI
  confidence: number;                  // 0..100
  based_on: string[];                  // candidate / theme titles this draws from
}

export interface OpportunityRoadmap {
  summary: string;
  market_read: string;
  opportunities: RoadmapOpportunity[];
}

export interface RoadmapInput {
  vertical: string;
  candidates: RoadmapInputCandidate[];
  themes?: RoadmapInputTheme[];
  mode?: AnalysisMode;
}

const roadmapTool = {
  type: "function" as const,
  function: {
    name: "generate_opportunity_roadmap",
    description:
      "Produce a build-or-sell opportunity roadmap grounded strictly in the supplied, real pain clusters for one vertical.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "2-3 sentence executive read on where the biggest opportunity is in this vertical." },
        market_read: { type: "string", description: "What the aggregate signal says about the market right now (demand, urgency, who's underserved)." },
        opportunities: {
          type: "array",
          description: "Ranked opportunities, strongest first. One per distinct, defensible opportunity (cap ~6).",
          items: {
            type: "object",
            properties: {
              rank: { type: "number" },
              title: { type: "string", description: "Crisp name for the opportunity." },
              problem: { type: "string", description: "The specific pain it addresses, in the customer's terms." },
              build: { type: "string", description: "What to build — the concrete automation/product (read inbound email/calls and do the boring work where it fits)." },
              customer: { type: "string", description: "Who to sell to — a specific ICP (role + company profile), not 'businesses'." },
              motion: { type: "string", enum: ["build", "sell", "partner"], description: "build = build it ourselves; sell = sell/validate before building; partner = integrate with an incumbent." },
              effort: { type: "string", enum: ["S", "M", "L"], description: "Rough build effort." },
              roi: { type: "string", description: "Directional ROI / impact rationale (hours saved, revenue unlocked). Qualitative — no invented precise figures." },
              confidence: { type: "number", description: "0-100, how strongly the evidence supports this." },
              based_on: { type: "array", items: { type: "string" }, description: "Which supplied cluster/theme titles this draws from." },
            },
            required: ["rank", "title", "problem", "build", "customer", "motion", "effort", "roi", "confidence", "based_on"],
            additionalProperties: false,
          },
        },
      },
      required: ["summary", "market_read", "opportunities"],
      additionalProperties: false,
    },
  },
};

function clusterBlock(c: RoadmapInputCandidate, i: number): string {
  const ev = [
    c.member_count != null ? `${c.member_count} signals` : null,
    c.sources?.length ? `sources: ${c.sources.join(", ")}` : null,
    `pain ${Math.round(c.pain_score)}`,
  ].filter(Boolean).join(" · ");
  const quotes = (c.quotes ?? []).slice(0, 2).map((q) => `      • "${q}"`).join("\n");
  return [
    `${i + 1}. ${c.cluster_theme} (${ev})`,
    `   problem: ${c.problem}`,
    `   scanner-proposed automation: ${c.proposed_solution}`,
    quotes ? `   real quotes:\n${quotes}` : null,
  ].filter(Boolean).join("\n");
}

export async function generateRoadmap(input: RoadmapInput): Promise<OpportunityRoadmap> {
  const model = selectModel("opportunity-roadmap", { mode: input.mode });

  const system = [
    "You are the strategist for the AI Opportunity Engine. The engine brings the proven CH Robinson AI-ops motion — software that reads inbound email and calls and does the boring work — to companies too small to build it themselves.",
    "You are given REAL customer pain, mined from public Reddit discussion for one vertical and ranked by frequency × intensity. Your job: turn it into a build-or-sell roadmap.",
    "Rules:",
    "- Ground EVERY opportunity in the supplied clusters. Never invent pains that aren't in the data; cite the cluster/theme titles in `based_on`.",
    "- `customer` must be a specific ICP (role + company profile), never 'small businesses'.",
    "- Recommend a motion: build (build it ourselves now), sell (validate/pre-sell before building), or partner (integrate with an incumbent).",
    "- ROI is DIRECTIONAL and qualitative (hours saved, deals unlocked). Do not fabricate precise dollar/percentage figures.",
    "- Rank by opportunity strength = pain intensity × how addressable it is with an AI-ops automation.",
  ].join("\n");

  const clusters = input.candidates.map(clusterBlock).join("\n\n");
  const themes = (input.themes ?? [])
    .map((t) => `   - ${t.title}: pain ${Math.round(t.pain_score)}, trend ${t.trend > 0 ? "+" : ""}${t.trend}, seen ${t.occurrence_count}×`)
    .join("\n");

  const user = [
    `Vertical: ${input.vertical}`,
    "",
    "Ranked pain clusters (real, mined from public Reddit discussion):",
    clusters || "(none)",
    themes ? `\nDurable themes & trend across scans:\n${themes}` : "",
    "",
    "Draft the build-or-sell opportunity roadmap now.",
  ].join("\n");

  const out = await callLLMWithTool<OpportunityRoadmap>({
    model,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    tools: [roadmapTool],
    toolChoice: { type: "function", function: { name: "generate_opportunity_roadmap" } },
    maxTokens: 4096,
  });

  const opportunities = (out.opportunities ?? [])
    .slice(0, 8)
    .map((o, i) => ({ ...o, rank: o.rank ?? i + 1, confidence: Math.max(0, Math.min(100, Math.round(o.confidence ?? 0))) }))
    .sort((a, b) => a.rank - b.rank);

  return { summary: out.summary ?? "", market_read: out.market_read ?? "", opportunities };
}
