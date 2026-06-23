import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

/**
 * Repo registry config — maps project names to local filesystem paths.
 *
 * Loaded from (in order of precedence):
 *   1. Env var COURTANA_REPOS_JSON (inline JSON string)
 *   2. ~/.claude/courtana-repos.json
 *   3. Fallback: just vibeco pointing at the MCP server's parent directory
 *
 * Placeholder paths (starting with "TBD") are treated as not-yet-configured
 * and return a helpful error when queried.
 */

export interface RepoRegistry {
  [projectName: string]: string;
}

const CONFIG_PATH = join(homedir(), ".claude", "courtana-repos.json");
const DEFAULT_VIBECO_ROOT = join(process.cwd(), "..");

let cachedRegistry: RepoRegistry | null = null;

export async function loadRepoRegistry(): Promise<RepoRegistry> {
  if (cachedRegistry) return cachedRegistry;

  // 1. Env var takes precedence (useful for .mcp.json env injection)
  const envJson = process.env.COURTANA_REPOS_JSON;
  if (envJson) {
    try {
      cachedRegistry = JSON.parse(envJson);
      return cachedRegistry!;
    } catch (e) {
      console.error("Invalid COURTANA_REPOS_JSON:", (e as Error).message);
    }
  }

  // 2. Read from ~/.claude/courtana-repos.json
  try {
    const content = await readFile(CONFIG_PATH, "utf-8");
    cachedRegistry = JSON.parse(content);
    return cachedRegistry!;
  } catch {
    // File doesn't exist — fall through to default
  }

  // 3. Default: just vibeco at the known path
  cachedRegistry = { vibeco: DEFAULT_VIBECO_ROOT };
  return cachedRegistry;
}

/**
 * Resolve a project name to its local filesystem path.
 * Returns null if the project isn't configured OR has a TBD placeholder.
 */
export async function resolveProjectPath(project: string): Promise<string | null> {
  const registry = await loadRepoRegistry();
  const path = registry[project.toLowerCase()];
  if (!path) return null;
  if (path.startsWith("TBD")) return null;
  return path;
}

/**
 * List all configured project names, separating fully-configured from placeholders.
 */
export async function listProjects(): Promise<{
  configured: string[];
  pending: string[];
}> {
  const registry = await loadRepoRegistry();
  const configured: string[] = [];
  const pending: string[] = [];
  for (const [name, path] of Object.entries(registry)) {
    if (path.startsWith("TBD")) pending.push(name);
    else configured.push(name);
  }
  return { configured, pending };
}
