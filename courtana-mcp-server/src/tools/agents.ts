/**
 * Agent tools — invoke VibeCo's AI agents from any Claude Code session.
 *
 * This lets the PickleData session run the Thunderdome on a DaaS idea,
 * or the Brand Intelligence session distill a concept to its core.
 */

const SUPABASE_FUNCTIONS_URL_TEMPLATE = "{supabase_url}/functions/v1";

export interface AgentInvocation {
  agent: string;
  input: Record<string, unknown>;
}

const AVAILABLE_AGENTS = [
  "simulate-idea",
  "persona-perspective",
  "expand-idea",
  "distill-idea",
  "refine-prompt",
  "generate-alt-prompt",
  "generate-landing-page",
  "generate-idea-image",
  "synthesize",
  "orchestrate",
  "auto-evaluate",
  "debate",
  "mcp-analyze-usage",
] as const;

export function listAgents() {
  return AVAILABLE_AGENTS.map((name) => ({
    name,
    description: getAgentDescription(name),
  }));
}

export async function invokeVibeCo(
  supabaseUrl: string,
  supabaseAnonKey: string,
  agentName: string,
  input: Record<string, unknown>,
) {
  if (!AVAILABLE_AGENTS.includes(agentName as typeof AVAILABLE_AGENTS[number])) {
    throw new Error(
      `Unknown agent: ${agentName}. Available: ${AVAILABLE_AGENTS.join(", ")}`,
    );
  }

  const url = `${supabaseUrl}/functions/v1/${agentName}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Agent ${agentName} returned ${response.status}: ${text}`);
  }

  return response.json();
}

function getAgentDescription(name: string): string {
  const descriptions: Record<string, string> = {
    "simulate-idea": "3-round idea analysis with structured brief and follow-up questions",
    "persona-perspective": "Generate a specific persona's perspective (skeptic, champion, competitor, customer, builder)",
    "expand-idea": "Generate 3 orthogonal business variations from a brief",
    "distill-idea": "Distill an idea to its absolute core (one feature, one customer, one revenue)",
    "refine-prompt": "Refine a Lovable build prompt using Thunderdome feedback",
    "generate-alt-prompt": "Generate research/design/landing-page prompts for other AI tools",
    "generate-landing-page": "Generate a complete self-contained HTML landing page",
    "generate-idea-image": "Generate concept art or logo for an idea",
    "synthesize": "Read all agent outputs and produce consensus/tension/confidence analysis",
    "orchestrate": "Auto-Thunderdome: fire all 7 agents in parallel, then synthesize",
    "auto-evaluate": "Flywheel: raw idea → simulate → thunderdome → synthesize → confidence score. Feed ideas in, scored results out.",
    "debate": "Multi-perspective analysis on ANY topic (architecture, code review, strategy). Fires multiple AI personas in parallel and synthesizes their stances into a unified recommendation.",
    "mcp-analyze-usage": "Self-improvement: reads MCP tool usage data and asks Claude to suggest fixes/improvements. Suggestions saved to mcp_improvement_log.",
  };
  return descriptions[name] || "Unknown agent";
}
