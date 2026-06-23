import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Palette,
  TestTube,
  Copy,
  Check,
  Loader2,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/copyToClipboard";
import type { BriefData } from "./SimulatorShell";

interface Props {
  brief: BriefData;
  idea: string;
  lovablePrompt?: string | null;
  reportId?: string | null;
  onIterate: () => void;
}

interface GeneratedPrompt {
  platform: string;
  prompt: string;
  description: string;
}

interface ErrorState {
  message: string;
  detail?: string;
}

const STORAGE_PREFIX = "vibeco_alt_prompts_";

function loadCached(reportId?: string | null): Record<string, GeneratedPrompt> {
  if (!reportId || typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + reportId);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCached(reportId: string | null | undefined, data: Record<string, GeneratedPrompt>) {
  if (!reportId || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_PREFIX + reportId, JSON.stringify(data));
  } catch {
    // quota — fine to silently drop
  }
}

const ActionHub = ({ brief, idea, lovablePrompt, reportId, onIterate }: Props) => {
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [altPrompts, setAltPrompts] = useState<Record<string, GeneratedPrompt>>(() => loadCached(reportId));
  const [errors, setErrors] = useState<Record<string, ErrorState>>({});
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  // Re-hydrate cache when reportId changes
  useEffect(() => {
    setAltPrompts(loadCached(reportId));
  }, [reportId]);

  const builderIntent = brief.builder_intent || "venture";
  const scaleAssessment = brief.scale_assessment;

  const handleCopy = async (text: string, key: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedAction(key);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedAction(null), 2000);
    } else {
      toast.error("Couldn't copy. Select the text and copy manually.");
    }
  };

  const runAltPrompt = async (promptType: string) => {
    setGenerating(promptType);
    setExpandedAction(promptType);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[promptType];
      return next;
    });

    try {
      const { data, error } = await supabase.functions.invoke("generate-alt-prompt", {
        body: {
          brief,
          idea,
          prompt_type: promptType,
          lovable_prompt: lovablePrompt,
        },
      });

      if (error) {
        throw new Error(error.message || "Edge function call failed");
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      if (!data?.prompt) {
        throw new Error("AI returned an empty response. Try again.");
      }

      const next = { ...altPrompts, [promptType]: data as GeneratedPrompt };
      setAltPrompts(next);
      saveCached(reportId, next);
      toast.success(`${data.platform || "Prompt"} ready`);

      // Persist to report (best-effort, non-blocking)
      if (reportId) {
        try {
          const { data: report } = await (supabase.from("idea_reports") as any)
            .select("alt_prompts")
            .eq("id", reportId)
            .single();
          const existing = Array.isArray(report?.alt_prompts) ? report.alt_prompts : [];
          await (supabase.from("idea_reports") as any)
            .update({
              alt_prompts: [...existing, { type: promptType, ...data, generated_at: new Date().toISOString() }],
            })
            .eq("id", reportId);
        } catch (err) {
          console.error("Failed to save alt prompt:", err);
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(`Alt prompt error (${promptType}):`, e);
      setErrors((prev) => ({
        ...prev,
        [promptType]: {
          message: message.includes("Rate limited")
            ? "Rate limited"
            : message.includes("Credits exhausted")
            ? "Out of credits"
            : "Generation failed",
          detail: message,
        },
      }));
    } finally {
      setGenerating(null);
    }
  };

  const handleAction = (promptType: string) => {
    // If we already have it, just toggle
    if (altPrompts[promptType]) {
      setExpandedAction(expandedAction === promptType ? null : promptType);
      return;
    }
    runAltPrompt(promptType);
  };

  // Contextual ordering based on builder intent.
  // Note: "Build in Lovable" + "Iterate" intentionally NOT here — they live in the
  // prompt block ("Open in Lovable") and the refine-in-place banner respectively.
  // ActionHub is *generative side-quests* only, to avoid duplicate CTAs.
  const actions = [
    {
      id: "research",
      label: "Research Prompt",
      description: "Deep-dive prompt for ChatGPT or Claude",
      icon: MessageSquare,
      priority: builderIntent === "venture" ? 1 : 2,
      action: () => handleAction("research"),
      available: true,
      generative: true,
      accentClass: "border-emerald-500/20 hover:border-emerald-500/40",
      iconClass: "text-emerald-400",
    },
    {
      id: "design_brief",
      label: "Design Brief",
      description: "Impeccable-quality UI spec for your build",
      icon: Palette,
      priority: 3,
      action: () => handleAction("design_brief"),
      available: true,
      generative: true,
      accentClass: "border-violet-500/20 hover:border-violet-500/40",
      iconClass: "text-violet-400",
    },
    {
      id: "landing_page",
      label: "Landing Page Test",
      description: "Validate demand before building the full product",
      icon: TestTube,
      priority: builderIntent === "experiment" ? 1 : 4,
      action: () => handleAction("landing_page"),
      available: true,
      generative: true,
      accentClass: "border-amber-500/20 hover:border-amber-500/40",
      iconClass: "text-amber-400",
    },
  ]
    .filter((a) => a.available)
    .sort((a, b) => a.priority - b.priority);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground">
          What's Next?
        </h3>
        <span className="text-[10px] text-muted-foreground">
          {actions.length} actions available
        </span>
      </div>

      {scaleAssessment && !scaleAssessment.fits_intent && (
        <div className="px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs text-amber-400">
            ⚠ {scaleAssessment.recommendation}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const isGenerating = generating === action.id;
          const isCopied = copiedAction === action.id;
          const isExpanded = expandedAction === action.id;
          const promptData = altPrompts[action.id];
          const error = errors[action.id];

          return (
            <div key={action.id}>
              <button
                onClick={action.action}
                disabled={isGenerating}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 text-left group ${action.accentClass} ${
                  isGenerating ? "opacity-70" : ""
                }`}
              >
                {isGenerating ? (
                  <Loader2 size={16} className={`${action.iconClass} animate-spin shrink-0`} />
                ) : isCopied ? (
                  <Check size={16} className="text-primary shrink-0" />
                ) : error ? (
                  <AlertTriangle size={16} className="text-destructive shrink-0" />
                ) : (
                  <Icon size={16} className={`${action.iconClass} shrink-0`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground flex items-center gap-2">
                    {action.label}
                    {promptData && action.generative && (
                      <span className="text-[9px] text-emerald-400/80 font-normal normal-case">
                        ✓ ready
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {isGenerating
                      ? "Generating prompt…"
                      : error
                      ? error.message
                      : action.description}
                  </p>
                </div>
                {action.generative && (
                  <ChevronRight
                    size={14}
                    className={`text-muted-foreground/30 group-hover:text-muted-foreground transition-all ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                )}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 p-3 rounded-lg bg-muted/20 border border-border/20">
                      {isGenerating ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                            <Loader2 size={10} className="animate-spin" />
                            Working on your {action.label.toLowerCase()}…
                          </div>
                          <div className="space-y-1.5 mt-3">
                            <div className="h-2 rounded bg-muted/40 animate-pulse w-full" />
                            <div className="h-2 rounded bg-muted/40 animate-pulse w-11/12" />
                            <div className="h-2 rounded bg-muted/40 animate-pulse w-9/12" />
                            <div className="h-2 rounded bg-muted/40 animate-pulse w-10/12" />
                            <div className="h-2 rounded bg-muted/40 animate-pulse w-7/12" />
                          </div>
                        </div>
                      ) : error ? (
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <AlertTriangle size={12} className="text-destructive shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-destructive">
                                {error.message}
                              </p>
                              {error.detail && error.detail !== error.message && (
                                <p className="text-[10px] text-muted-foreground mt-1 break-words">
                                  {error.detail}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => runAltPrompt(action.id)}
                            className="text-[10px] px-2.5 py-1 rounded border border-border/40 hover:border-foreground/40 transition-colors text-foreground"
                          >
                            ↻ Retry
                          </button>
                        </div>
                      ) : promptData ? (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {promptData.platform} prompt
                            </span>
                            <button
                              onClick={() => handleCopy(promptData.prompt, action.id)}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {copiedAction === action.id ? (
                                <Check size={10} className="text-primary" />
                              ) : (
                                <Copy size={10} />
                              )}
                              {copiedAction === action.id ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground mb-2">
                            {promptData.description}
                          </p>
                          <div className="max-h-48 overflow-y-auto">
                            <pre className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed font-sans">
                              {promptData.prompt}
                            </pre>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ActionHub;
