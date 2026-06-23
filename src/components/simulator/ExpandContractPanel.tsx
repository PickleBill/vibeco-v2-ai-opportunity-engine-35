import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Maximize2, Minimize2, ArrowRight, Scissors, Target, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { BriefData } from "./SimulatorShell";

interface Expansion {
  title: string;
  pitch: string;
  how_its_different: string;
  potential: string;
  idea_text: string;
}

interface ExpandResult {
  core_insight: string;
  expansions: Expansion[];
}

interface Distillation {
  one_feature: string;
  one_customer: string;
  one_revenue: string;
  thesis_statement: string;
  what_to_cut: string[];
  mvp_scope: string;
}

interface Props {
  mode: "expand" | "contract";
  brief: BriefData;
  idea: string;
  highlights?: Set<string>;
  antiHighlights?: Set<string>;
  onThesisGenerated?: (thesis: string) => void;
  reportId?: string | null;
}

const potentialLabels: Record<string, { label: string; color: string }> = {
  "bigger-market": { label: "Bigger market", color: "text-primary" },
  "easier-to-build": { label: "Easier to build", color: "text-accent-foreground" },
  "less-competition": { label: "Less competition", color: "text-warning" },
  "faster-revenue": { label: "Faster revenue", color: "text-secondary" },
};

const ExpandContractPanel = ({ mode, brief, idea, highlights, antiHighlights, onThesisGenerated, reportId }: Props) => {
  const navigate = useNavigate();
  const [expandResult, setExpandResult] = useState<ExpandResult | null>(null);
  const [distillResult, setDistillResult] = useState<Distillation | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExpand = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("expand-idea", {
        body: { brief, idea },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setExpandResult(data);
    } catch (e) {
      console.error("Expand error:", e);
      toast.error("Failed to generate expansions. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDistill = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("distill-idea", {
        body: {
          brief,
          idea,
          highlights: highlights ? Array.from(highlights) : [],
          antiHighlights: antiHighlights ? Array.from(antiHighlights) : [],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDistillResult(data);
      if (data.thesis_statement && onThesisGenerated) {
        onThesisGenerated(data.thesis_statement);
      }
    } catch (e) {
      console.error("Distill error:", e);
      toast.error("Failed to distill idea. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExploreVariation = async (exp: Expansion) => {
    // Create a forked idea_report with context
    try {
      const forkedContext = {
        parent_brief: brief,
        parent_idea: idea,
        highlights: highlights ? Array.from(highlights) : [],
        antiHighlights: antiHighlights ? Array.from(antiHighlights) : [],
        variation_title: exp.title,
      };

      const { data: newReport, error } = await (supabase.from("idea_reports") as any)
        .insert({
          idea: exp.idea_text,
          brief: {} as any,
          rounds: [] as any,
          parent_idea_id: reportId || null,
          forked_context: forkedContext,
          status: "in-progress",
        })
        .select("id")
        .single();

      if (error) throw error;

      navigate("/simulate", {
        state: {
          prefillIdea: exp.idea_text,
          forkedFrom: idea,
          resumeId: newReport?.id,
        },
      });
    } catch (err) {
      console.error("Fork error:", err);
      // Fallback to simple prefill
      navigate("/simulate", { state: { prefillIdea: exp.idea_text } });
    }
  };

  const handleRebuildDistilled = () => {
    if (!distillResult) return;
    const distilledIdea = `${distillResult.thesis_statement}. Core feature: ${distillResult.one_feature}. Target customer: ${distillResult.one_customer}. Revenue: ${distillResult.one_revenue}.`;
    navigate("/simulate", {
      state: {
        prefillIdea: distilledIdea,
        forkedFrom: idea,
      },
    });
  };

  if (mode === "expand") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-foreground">Expand Your Idea</h3>
          <span className="text-[10px] text-muted-foreground">3 orthogonal variations</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Same core insight, different markets, models, and scale. What else could this be?
        </p>

        {!expandResult && (
          <button
            onClick={handleExpand}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border/50 hover:border-primary/30 text-xs text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating variations...
              </>
            ) : (
              <>
                <Maximize2 size={14} />
                Generate 3 Variations
              </>
            )}
          </button>
        )}

        <AnimatePresence>
          {expandResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <span className="text-[10px] text-primary uppercase tracking-wider">Core Insight</span>
                <p className="text-xs text-foreground mt-1">{expandResult.core_insight}</p>
              </div>

              <div className="space-y-3">
                {expandResult.expansions.map((exp, i) => {
                  const pot = potentialLabels[exp.potential] || { label: exp.potential, color: "text-muted-foreground" };
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-4 rounded-lg border border-border/30 bg-muted/10 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-display text-sm font-semibold text-foreground">{exp.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border border-current/20 ${pot.color} whitespace-nowrap`}>
                          {pot.label}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/80">{exp.pitch}</p>
                      <p className="text-[10px] text-muted-foreground italic">{exp.how_its_different}</p>
                      <button
                        onClick={() => handleExploreVariation(exp)}
                        className="flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 transition-colors mt-1"
                      >
                        <ArrowRight size={10} />
                        Explore this variation
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Distill mode
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground">Distill to Core</h3>
        <span className="text-[10px] text-muted-foreground">one feature, one customer, one thesis</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Strip away everything that isn't essential. What's the ONE thing that matters?
      </p>

      {!distillResult && (
        <button
          onClick={handleDistill}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border/50 hover:border-primary/30 text-xs text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Distilling to core...
            </>
          ) : (
            <>
              <Minimize2 size={14} />
              Distill This Idea
            </>
          )}
        </button>
      )}

      <AnimatePresence>
        {distillResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Thesis statement */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={12} className="text-primary" />
                <span className="text-[10px] text-primary uppercase tracking-wider">Core Thesis</span>
              </div>
              <p className="font-display text-sm font-semibold text-foreground leading-snug">
                {distillResult.thesis_statement}
              </p>
            </div>

            {/* Three cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border/30 bg-muted/10">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target size={10} className="text-primary" />
                  <span className="text-[10px] text-primary uppercase">One Feature</span>
                </div>
                <p className="text-xs text-foreground/80">{distillResult.one_feature}</p>
              </div>
              <div className="p-3 rounded-lg border border-border/30 bg-muted/10">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target size={10} className="text-accent-foreground" />
                  <span className="text-[10px] text-accent-foreground uppercase">One Customer</span>
                </div>
                <p className="text-xs text-foreground/80">{distillResult.one_customer}</p>
              </div>
              <div className="p-3 rounded-lg border border-border/30 bg-muted/10">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target size={10} className="text-secondary" />
                  <span className="text-[10px] text-secondary uppercase">One Revenue</span>
                </div>
                <p className="text-xs text-foreground/80">{distillResult.one_revenue}</p>
              </div>
            </div>

            {/* What to cut */}
            {distillResult.what_to_cut?.length > 0 && (
              <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Scissors size={10} className="text-destructive" />
                  <span className="text-[10px] text-destructive uppercase">Cut from V1</span>
                </div>
                <ul className="space-y-1">
                  {distillResult.what_to_cut.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground line-through decoration-destructive/40">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* MVP scope */}
            <div className="p-3 rounded-lg border border-border/30 bg-muted/10">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">MVP Scope (1-2 weeks)</span>
              <p className="text-xs text-foreground/80 mt-1">{distillResult.mvp_scope}</p>
            </div>

            {/* Rebuild action */}
            <button
              onClick={handleRebuildDistilled}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-primary/30 hover:border-primary/50 bg-primary/5 text-xs text-primary hover:text-primary/80 transition-all"
            >
              <ArrowRight size={14} />
              Rebuild with this scope
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpandContractPanel;
