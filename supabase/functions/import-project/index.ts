import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { buildProjectManifest } from "../_shared/agents/import-manifest.ts";

/**
 * import-project edge function
 *
 * Takes a project's metadata + (optionally) raw context files and synthesizes
 * a ProjectManifest used to ground the simulator in the source project's DNA.
 *
 * The cross-project file APIs are agent-scoped, so the client passes any context
 * it has (admin-pasted manifest text). We synthesize even with partial input so
 * the simulator works on day one.
 */

interface RequestBody {
  project_name: string;
  parent_brand?: string | null;
  description?: string | null;
  impeccable_md?: string | null;
  package_json?: string | null;
  readme_md?: string | null;
  design_system_md?: string | null;
  pages?: string[];
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const input = (await req.json()) as RequestBody;
    if (!input?.project_name || typeof input.project_name !== "string") {
      return jsonResponse({ error: "project_name is required" }, 400);
    }

    const manifest = buildProjectManifest({
      project_name: input.project_name,
      parent_brand: input.parent_brand ?? null,
      description: input.description ?? null,
      impeccable_md: input.impeccable_md ?? null,
      package_json: input.package_json ?? null,
      readme_md: input.readme_md ?? null,
      design_system_md: input.design_system_md ?? null,
      pages: input.pages ?? [],
    });

    return jsonResponse({ manifest });
  } catch (e) {
    return handleFunctionError("import-project", e);
  }
});
