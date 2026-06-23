import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, FolderOpen, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { ProjectEntry } from "@/components/portfolio/ProjectCard";

interface Props {
  onImport: (ideaText: string, meta?: { project_id: string; lovable_project_id?: string | null }) => void;
}

interface ProjectWithCache extends ProjectEntry {
  manifest_cache: { synthesis?: string; tech_stack?: string | null; audience?: string | null } | null;
  manifest_cached_at: string | null;
}

const ProjectImporter = ({ onImport }: Props) => {
  const [projects, setProjects] = useState<ProjectWithCache[]>([]);
  const [selected, setSelected] = useState<ProjectWithCache | null>(null);
  const [intent, setIntent] = useState("");
  const [loadingManifest, setLoadingManifest] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from("project_registry") as any)
        .select("*")
        .order("last_touched", { ascending: false });
      if (data) setProjects(data as ProjectWithCache[]);
    })();
  }, []);

  const handleSelect = async (project: ProjectWithCache) => {
    setSelected(project);
    setIntent("");

    // If we already have a cached manifest, we're done.
    if (project.manifest_cache?.synthesis) return;

    // No cache → fetch a fresh manifest from the edge function using whatever
    // metadata we have. (Full file fetching lives in the next phase.)
    setLoadingManifest(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-project", {
        body: {
          project_name: project.name,
          parent_brand: project.parent_brand,
          description: project.description,
          // Notes is the manual-paste fallback for context (admin can paste .impeccable.md here)
          impeccable_md: project.notes,
        },
      });
      if (error) throw error;

      // Persist the manifest so subsequent imports are instant.
      await (supabase.from("project_registry") as any)
        .update({
          manifest_cache: data.manifest,
          manifest_cached_at: new Date().toISOString(),
        })
        .eq("id", project.id);

      setSelected({ ...project, manifest_cache: data.manifest });
    } catch (e) {
      console.error("Manifest fetch failed:", e);
      toast.error("Could not build project manifest. You can still simulate.");
    } finally {
      setLoadingManifest(false);
    }
  };

  const handleSimulate = () => {
    if (!selected) return;

    const synthesis = selected.manifest_cache?.synthesis ||
      `${selected.name}${selected.parent_brand ? ` (${selected.parent_brand})` : ""} — ${selected.description || "active build"}`;

    const ideaText = intent.trim()
      ? `${synthesis}\n\n---\n\nWhat I want to test/improve:\n${intent.trim()}`
      : `${synthesis}\n\n---\n\nStress-test this project's positioning, audience-fit, and growth model.`;

    onImport(ideaText, {
      project_id: selected.id,
      lovable_project_id: selected.lovable_project_id,
    });
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-8 px-4 rounded-lg border border-border/30 bg-card/30">
        <FolderOpen size={20} className="mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground mb-1">No registered projects yet.</p>
        <a href="/portfolio" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          Register one in Portfolio <ArrowRight size={11} />
        </a>
      </div>
    );
  }

  // Step 1: Pick a project
  if (!selected) {
    return (
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-3 px-1">
          Pick a project to ground the simulation
        </p>
        <div className="grid gap-2 max-h-[420px] overflow-y-auto pr-1">
          {projects.map((p) => (
            <motion.button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p)}
              whileHover={{ x: 2 }}
              className="text-left p-3 rounded-md border border-border/30 bg-card/40 hover:border-primary/40 hover:bg-card/70 transition-colors group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground font-medium truncate">{p.name}</p>
                  {(p.parent_brand || p.description) && (
                    <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                      {p.parent_brand && <span className="text-muted-foreground/50">{p.parent_brand} · </span>}
                      {p.description}
                    </p>
                  )}
                </div>
                {p.manifest_cache?.synthesis && (
                  <span className="text-[9px] text-primary/70 uppercase tracking-wider shrink-0">
                    cached
                  </span>
                )}
                <ArrowRight size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: Show manifest + intent input
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="intent"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        {/* Selected project header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] text-primary/70 uppercase tracking-wider mb-0.5">Selected Project</p>
            <p className="text-sm text-foreground font-medium truncate">{selected.name}</p>
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
          >
            Change
          </button>
        </div>

        {/* Manifest preview */}
        <div className="rounded-md border border-border/30 bg-card/30 p-4 max-h-[200px] overflow-y-auto">
          {loadingManifest ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              Building project context…
            </div>
          ) : selected.manifest_cache?.synthesis ? (
            <pre className="text-[12px] text-foreground/80 leading-relaxed whitespace-pre-wrap font-sans">
              {selected.manifest_cache.synthesis}
            </pre>
          ) : (
            <p className="text-[12px] text-muted-foreground/60 italic">
              No deep context available. Add notes in Portfolio (paste your `.impeccable.md` or brand doc) for richer simulation.
            </p>
          )}
        </div>

        {/* Intent textarea */}
        <div>
          <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-2 block">
            What do you want to test or improve?
          </label>
          <Textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g. stress-test the referral flow against trust objections from C-suite principals…"
            className="min-h-[100px] text-sm bg-background/40 border-border/40 focus-visible:border-primary/50 focus-visible:ring-0"
          />
          <p className="text-[10px] text-muted-foreground/50 mt-1.5">
            Optional — leave blank for a general stress-test of positioning and growth.
          </p>
        </div>

        <Button
          onClick={handleSimulate}
          disabled={loadingManifest}
          className="w-full gap-2"
          size="lg"
        >
          <Sparkles size={14} />
          Simulate with this context
        </Button>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProjectImporter;
