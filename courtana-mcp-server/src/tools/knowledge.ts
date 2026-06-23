import { readFile, readdir } from "fs/promises";
import { join } from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveProjectPath, listProjects } from "../config.js";

/**
 * Knowledge tools — read-only access to organizational knowledge.
 * These let any Claude Code session query Courtana's project registry,
 * design systems, and skill files across MULTIPLE repos.
 */

// ─── Project Registry (Supabase table) ───

export async function getProjectRegistry(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("project_registry")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch project registry: ${error.message}`);
  return data || [];
}

// ─── Project Context (reads from the configured repo path) ───

export async function getProjectContext(projectName: string) {
  const normalizedName = projectName.toLowerCase();
  const repoPath = await resolveProjectPath(normalizedName);

  if (!repoPath) {
    const { configured, pending } = await listProjects();
    return {
      project: normalizedName,
      error: `Project "${projectName}" not configured.`,
      available_projects: configured,
      pending_projects: pending,
      hint: "Add the project to ~/.claude/courtana-repos.json with its local filesystem path. Projects with 'TBD' paths need a real path before they can be queried.",
    };
  }

  const claudeMd = await safeReadFile(join(repoPath, "CLAUDE.md"));
  const impeccable = await safeReadFile(join(repoPath, ".impeccable.md"));
  const readme = await safeReadFile(join(repoPath, "README.md"));
  const plan = await safeReadFile(join(repoPath, ".lovable", "plan.md"));

  return {
    project: normalizedName,
    repo_path: repoPath,
    claude_md: claudeMd,
    impeccable_context: impeccable,
    readme: readme,
    strategic_plan: plan,
  };
}

// ─── Design System ───

export async function getDesignSystem(brand: string) {
  // Try to read from the configured repo for this brand
  const repoPath = await resolveProjectPath(brand.toLowerCase());
  const basePath = repoPath || (await resolveProjectPath("vibeco"));

  if (!basePath) {
    return { brand, error: "No repo configured for this brand and no vibeco fallback available." };
  }

  const impeccable = await safeReadFile(join(basePath, ".impeccable.md"));
  const brandSystem = await safeReadFile(join(basePath, `${brand.toUpperCase()}_DESIGN_SYSTEM.md`));
  const genericSystem = await safeReadFile(join(basePath, "DESIGN_SYSTEM.md"));

  return {
    brand,
    source_repo: basePath,
    impeccable_context: impeccable,
    brand_design_system: brandSystem || null,
    generic_design_system: genericSystem || null,
    note: !brandSystem && !genericSystem
      ? "No design system file found. Consider creating DESIGN_SYSTEM.md (referenced by all SKILL files)."
      : undefined,
  };
}

// ─── Skill Files ───

export async function getSkill(skillName: string, project?: string) {
  const repoPath = await resolveProjectPath((project || "vibeco").toLowerCase());
  if (!repoPath) {
    return { error: `No repo configured for project "${project || "vibeco"}".` };
  }

  const normalized = skillName.toUpperCase().startsWith("SKILL_")
    ? `${skillName.toUpperCase()}.md`
    : `SKILL_${skillName.toUpperCase()}.md`;

  const content = await safeReadFile(join(repoPath, normalized));

  if (!content) {
    const files = await readdir(repoPath).catch(() => [] as string[]);
    const skills = files.filter((f: string) => f.startsWith("SKILL_") && f.endsWith(".md"));
    return { error: `Skill "${skillName}" not found in ${repoPath}.`, available: skills };
  }

  return { skill: normalized, source_repo: repoPath, content };
}

// ─── Search Knowledge (across all configured repos) ───

export async function searchKnowledge(query: string) {
  const { configured } = await listProjects();
  const results: { project: string; file: string; matches: string[] }[] = [];
  let filesSearched = 0;

  for (const project of configured) {
    const repoPath = await resolveProjectPath(project);
    if (!repoPath) continue;

    const files = await readdir(repoPath).catch(() => [] as string[]);
    const knowledgeFiles = files.filter((f: string) => f.endsWith(".md"));

    for (const file of knowledgeFiles) {
      filesSearched++;
      const content = await safeReadFile(join(repoPath, file));
      if (!content) continue;

      const lines = content.split("\n");
      const matchingLines = lines.filter((line: string) =>
        line.toLowerCase().includes(query.toLowerCase()),
      );

      if (matchingLines.length > 0) {
        results.push({ project, file, matches: matchingLines.slice(0, 5) });
      }
    }
  }

  return { query, results, files_searched: filesSearched, projects_searched: configured };
}

// ─── Helpers ───

async function safeReadFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}
