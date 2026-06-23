/**
 * import-manifest agent
 *
 * Synthesizes a "ProjectManifest" from raw context strings (brand doc, package.json,
 * pages list, etc.) into a structured object the simulator can use to ground its
 * round-1 brief in real project DNA.
 *
 * Designed to be tolerant: if a field is missing, we still return something useful.
 */

export interface ProjectManifest {
  /** One-paragraph prose synthesis the simulator can splice into round-1 input. */
  synthesis: string;
  /** Structured fields, used by the UI for chips/badges and for downstream agents. */
  brand_voice: string | null;
  audience: string | null;
  anti_patterns: string | null;
  tech_stack: string | null;
  pages: string[];
  source: {
    has_impeccable: boolean;
    has_package: boolean;
    has_readme: boolean;
    has_design_system: boolean;
  };
}

interface ImportInput {
  project_name: string;
  parent_brand?: string | null;
  description?: string | null;
  /** Raw text from `.impeccable.md` if available */
  impeccable_md?: string | null;
  /** Raw `package.json` text if available */
  package_json?: string | null;
  /** Raw `README.md` text if available */
  readme_md?: string | null;
  /** Optional design system doc text */
  design_system_md?: string | null;
  /** List of page filenames from src/pages or src/routes */
  pages?: string[];
}

const truncate = (s: string | null | undefined, n: number): string =>
  !s ? "" : s.length > n ? s.slice(0, n).trim() + "…" : s.trim();

const extractStack = (pkg: string | null | undefined): string | null => {
  if (!pkg) return null;
  try {
    const parsed = JSON.parse(pkg);
    const deps = { ...(parsed.dependencies || {}), ...(parsed.devDependencies || {}) };
    const sig: string[] = [];
    if (deps["react"]) sig.push(`React ${String(deps["react"]).replace(/[^\d.]/g, "")}`);
    if (deps["@tanstack/react-start"] || deps["@tanstack/start"]) sig.push("TanStack Start");
    else if (deps["next"]) sig.push("Next.js");
    else if (deps["vite"]) sig.push("Vite");
    if (deps["tailwindcss"]) sig.push(`Tailwind ${String(deps["tailwindcss"]).replace(/[^\d.]/g, "")}`);
    if (deps["@supabase/supabase-js"]) sig.push("Supabase");
    if (deps["framer-motion"]) sig.push("Framer Motion");
    return sig.length ? sig.join(" · ") : null;
  } catch {
    return null;
  }
};

const extractSection = (md: string | null | undefined, headerRegex: RegExp, maxChars = 400): string | null => {
  if (!md) return null;
  const match = md.match(headerRegex);
  if (!match) return null;
  const start = match.index! + match[0].length;
  const rest = md.slice(start);
  // Stop at next H1/H2
  const next = rest.search(/\n#{1,2}\s/);
  const body = (next === -1 ? rest : rest.slice(0, next)).trim();
  return truncate(body, maxChars);
};

export function buildProjectManifest(input: ImportInput): ProjectManifest {
  const audience =
    extractSection(input.impeccable_md, /#+\s*(audience|target|customer)[^\n]*/i, 300) || null;
  const brandVoice =
    extractSection(input.impeccable_md, /#+\s*(brand|voice|tone)[^\n]*/i, 300) || null;
  const antiPatterns =
    extractSection(input.impeccable_md, /#+\s*(anti[-\s]?pattern|never|avoid)[^\n]*/i, 250) || null;
  const techStack = extractStack(input.package_json);

  const synthesisParts: string[] = [];
  synthesisParts.push(
    `${input.project_name}${input.parent_brand ? ` (${input.parent_brand})` : ""} — ${
      input.description || "an active build."
    }`,
  );
  if (audience) synthesisParts.push(`Audience: ${truncate(audience, 200)}`);
  if (brandVoice) synthesisParts.push(`Voice: ${truncate(brandVoice, 200)}`);
  if (antiPatterns) synthesisParts.push(`Anti-patterns: ${truncate(antiPatterns, 150)}`);
  if (techStack) synthesisParts.push(`Stack: ${techStack}`);
  if (input.pages && input.pages.length) {
    synthesisParts.push(`Existing surfaces: ${input.pages.slice(0, 8).join(", ")}`);
  }

  return {
    synthesis: synthesisParts.join("\n\n"),
    brand_voice: brandVoice ? truncate(brandVoice, 600) : null,
    audience: audience ? truncate(audience, 600) : null,
    anti_patterns: antiPatterns ? truncate(antiPatterns, 400) : null,
    tech_stack: techStack,
    pages: input.pages || [],
    source: {
      has_impeccable: !!input.impeccable_md,
      has_package: !!input.package_json,
      has_readme: !!input.readme_md,
      has_design_system: !!input.design_system_md,
    },
  };
}
