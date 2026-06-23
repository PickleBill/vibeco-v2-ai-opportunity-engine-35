#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getProjectRegistry, getProjectContext, getDesignSystem, getSkill, searchKnowledge } from "./tools/knowledge.js";
import { saveDecision, getDecisions, searchDecisions } from "./tools/memory.js";
import { invokeVibeCo, listAgents } from "./tools/agents.js";
import { setTelemetryClient, withTelemetry } from "./telemetry.js";

/**
 * Courtana MCP Server
 *
 * The connective tissue for Courtana's AI-native organization.
 * Every Claude Code session connects to this server and gains access to:
 *
 * 1. Knowledge tools — query project registry, design systems, skill files
 * 2. Memory tools — read/write organizational decisions across sessions
 * 3. Agent tools — invoke VibeCo's AI agents from any session
 *
 * Start: npx tsx src/index.ts
 *
 * Configure in ~/.claude/settings.json:
 * {
 *   "mcpServers": {
 *     "courtana": {
 *       "command": "npx",
 *       "args": ["tsx", "/path/to/courtana-mcp-server/src/index.ts"],
 *       "env": {
 *         "SUPABASE_URL": "https://your-project.supabase.co",
 *         "SUPABASE_ANON_KEY": "your-anon-key"
 *       }
 *     }
 *   }
 * }
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Phase G: enable telemetry — every tool call gets logged for self-improvement analysis
setTelemetryClient(supabase);

const server = new McpServer({
  name: "courtana",
  version: "0.1.0",
});

// ─── Knowledge Tools ───

server.tool(
  "get_project_registry",
  "List all Courtana projects by category, brand, and status",
  {},
  withTelemetry("get_project_registry", async () => {
    if (!supabase) return { content: [{ type: "text" as const, text: "Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY." }] };
    const projects = await getProjectRegistry(supabase);
    return { content: [{ type: "text" as const, text: JSON.stringify(projects, null, 2) }] };
  }),
);

server.tool(
  "get_project_context",
  "Get a project's CLAUDE.md, design context, and strategic plan",
  { project: z.string().describe("Project name (e.g., 'vibeco')") },
  withTelemetry("get_project_context", async ({ project }: { project: string }) => {
    const context = await getProjectContext(project);
    return { content: [{ type: "text" as const, text: JSON.stringify(context, null, 2) }] };
  }),
);

server.tool(
  "get_design_system",
  "Get design system tokens for a brand (e.g., 'courtana' or 'vibeco')",
  { brand: z.string().describe("Brand name") },
  async ({ brand }) => {
    const system = await getDesignSystem(brand);
    return { content: [{ type: "text" as const, text: JSON.stringify(system, null, 2) }] };
  },
);

server.tool(
  "get_skill",
  "Get a specific SKILL file from the design orchestration framework",
  {
    skill: z.string().describe("Skill name (e.g., 'audit', 'critique', 'polish')"),
    project: z.string().optional().describe("Which project's SKILL files to search (defaults to vibeco)"),
  },
  async ({ skill, project }) => {
    const result = await getSkill(skill, project);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "search_knowledge",
  "Search across all knowledge files (CLAUDE.md, SKILL files, plans) for a term",
  { query: z.string().describe("Search term") },
  async ({ query }) => {
    const results = await searchKnowledge(query);
    return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
  },
);

// ─── Memory Tools ───

server.tool(
  "save_decision",
  "Save an architectural decision, pattern, or insight to shared organizational memory. Other sessions can read this.",
  {
    title: z.string().describe("Short title for the decision"),
    content: z.string().describe("Full description of the decision, rationale, and context"),
    project: z.string().optional().describe("Which project this relates to (e.g., 'vibeco', 'pickle-daas')"),
    category: z.enum(["architecture", "design", "strategy", "pattern", "insight"]).optional().describe("Category of the decision"),
  },
  withTelemetry("save_decision", async ({ title, content, project, category }: { title: string; content: string; project?: string; category?: "architecture" | "design" | "strategy" | "pattern" | "insight" }) => {
    if (!supabase) return { content: [{ type: "text" as const, text: "Supabase not configured." }] };
    const result = await saveDecision(supabase, { title, content, project, category });
    return { content: [{ type: "text" as const, text: `Decision saved: ${JSON.stringify(result)}` }] };
  }),
);

server.tool(
  "get_decisions",
  "Read recent organizational decisions from shared memory. See what other sessions have decided. Filter-based (exact project/category match).",
  {
    project: z.string().optional().describe("Filter by project"),
    category: z.string().optional().describe("Filter by category"),
    limit: z.number().optional().describe("Max results (default 20)"),
  },
  async ({ project, category, limit }) => {
    if (!supabase) return { content: [{ type: "text" as const, text: "Supabase not configured." }] };
    const decisions = await getDecisions(supabase, { project, category, limit });
    return { content: [{ type: "text" as const, text: JSON.stringify(decisions, null, 2) }] };
  },
);

server.tool(
  "search_decisions",
  "SEMANTIC search over organizational decisions. Finds decisions similar in meaning to your query, not just exact matches. Use this when you want to know 'what have we decided about X?' where X is fuzzy or conceptual.",
  {
    query: z.string().describe("Natural language query (e.g., 'how should I run AI calls in parallel?')"),
    project: z.string().optional().describe("Optionally filter by project"),
    category: z.string().optional().describe("Optionally filter by category"),
    limit: z.number().optional().describe("Max results (default 10)"),
  },
  withTelemetry("search_decisions", async ({ query, project, category, limit }: { query: string; project?: string; category?: string; limit?: number }) => {
    if (!supabase) return { content: [{ type: "text" as const, text: "Supabase not configured." }] };
    const result = await searchDecisions(supabase, query, { project, category, limit });
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }),
);

// ─── Agent Tools ───

server.tool(
  "list_vibeco_agents",
  "List all available VibeCo AI agents that can be invoked",
  {},
  async () => {
    const agents = listAgents();
    return { content: [{ type: "text" as const, text: JSON.stringify(agents, null, 2) }] };
  },
);

server.tool(
  "invoke_vibeco_agent",
  "Invoke a VibeCo AI agent (simulate, expand, distill, persona, synthesize, orchestrate, etc.)",
  {
    agent: z.string().describe("Agent name (e.g., 'orchestrate', 'expand-idea', 'distill-idea')"),
    input: z.string().describe("JSON string of the agent's input parameters"),
  },
  async ({ agent, input }) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { content: [{ type: "text" as const, text: "Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY." }] };
    }
    try {
      const parsedInput = JSON.parse(input);
      const result = await invokeVibeCo(SUPABASE_URL, SUPABASE_ANON_KEY, agent, parsedInput);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }] };
    }
  },
);

// ─── MCP Self-Improvement Tools (Phase G) ───

server.tool(
  "get_mcp_insights",
  "Read AI-generated improvement suggestions for the MCP server itself, based on usage patterns. The system watches how tools are used and suggests fixes.",
  {
    status: z.enum(["open", "acknowledged", "implemented", "dismissed", "all"]).optional().describe("Filter by status (default: open)"),
    limit: z.number().optional().describe("Max results (default 20)"),
  },
  withTelemetry("get_mcp_insights", async ({ status, limit }: { status?: "open" | "acknowledged" | "implemented" | "dismissed" | "all"; limit?: number }) => {
    if (!supabase) return { content: [{ type: "text" as const, text: "Supabase not configured." }] };
    let q = supabase.from("mcp_improvement_log").select("*").order("created_at", { ascending: false }).limit(limit || 20);
    if (status && status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
    return { content: [{ type: "text" as const, text: JSON.stringify(data || [], null, 2) }] };
  }),
);

server.tool(
  "analyze_mcp_usage",
  "Trigger MCP self-analysis: reads recent usage data and asks Claude to suggest improvements. Suggestions saved to mcp_improvement_log.",
  {
    window_hours: z.number().optional().describe("Look back this many hours (default 168 = 1 week)"),
    dry_run: z.boolean().optional().describe("If true, return suggestions without saving"),
  },
  withTelemetry("analyze_mcp_usage", async ({ window_hours, dry_run }: { window_hours?: number; dry_run?: boolean }) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { content: [{ type: "text" as const, text: "Supabase not configured." }] };
    }
    try {
      const result = await invokeVibeCo(SUPABASE_URL, SUPABASE_ANON_KEY, "mcp-analyze-usage", {
        window_hours, dry_run,
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }] };
    }
  }),
);

server.tool(
  "run_debate",
  "Run a multi-perspective AI debate on any topic. Different personas weigh in (skeptic, champion, builder, etc.) and a synthesizer produces a unified recommendation. Use for architecture decisions, code review, strategy questions — anything that benefits from multiple viewpoints.",
  {
    topic: z.string().describe("The question or proposal to debate (e.g., 'Should we use Supabase Realtime or polling for the inbox?')"),
    context: z.string().optional().describe("Additional background, code, or constraints relevant to the topic"),
    personas: z.array(z.string()).optional().describe("Which personas to involve (default: skeptic, champion, builder). Available: skeptic, champion, builder, pragmatist, strategist, user_advocate, security_auditor, performance_engineer, contrarian"),
    mode: z.enum(["fast", "deep"]).optional().describe("fast = Gemini Flash for speed, deep = Claude Sonnet for depth"),
  },
  async ({ topic, context, personas, mode }) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { content: [{ type: "text" as const, text: "Supabase not configured." }] };
    }
    try {
      const result = await invokeVibeCo(SUPABASE_URL, SUPABASE_ANON_KEY, "debate", {
        topic, context, personas, mode,
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }] };
    }
  },
);

// ─── Start ───

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Courtana MCP server running on stdio");
}

main().catch(console.error);
