import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Brain, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import IdeaInput from "./IdeaInput";
import IdeaBrief from "./IdeaBrief";
import FollowUpQuestions from "./FollowUpQuestions";
import FinalReport from "./FinalReport";
import VibeStack from "./VibeStack";
import { useVibeStack } from "@/hooks/useVibeStack";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Derive a short, human-friendly title from the brief's problem statement.
function deriveTitle(brief: BriefData | undefined, fallbackIdea: string): string {
  const source = brief?.problem || fallbackIdea || "";
  const firstClause = source.split(/[.!?:;–—]/)[0].trim();
  const words = firstClause.split(/\s+/).slice(0, 6).join(" ");
  if (!words) return "Untitled idea";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const analysisMessages = [
  "Analyzing market size and competitive landscape...",
  "Identifying your most likely early customers...",
  "Generating investor perspective...",
  "Mapping out core features...",
  "Pressure-testing the revenue model...",
  "Evaluating industry trends and timing...",
  "Finalizing analysis...",
];

const AnalyzingMessages = ({ isInitial }: { isInitial: boolean }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, analysisMessages.length - 1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  return (
    <p className="text-sm text-muted-foreground animate-pulse transition-opacity duration-500">
      {isInitial ? analysisMessages[msgIndex] : "Deepening the analysis..."}
    </p>
  );
};

export interface BriefData {
  problem: string;
  target_customer: string;
  core_features: { name: string; description: string }[];
  revenue_model: string;
  industry_trends: string;
  investor_perspective: string;
  customer_perspective: string;
  builder_intent?: string;
  app_type?: string;
  scale_assessment?: {
    current_scale: string;
    fits_intent: boolean;
    recommendation: string;
  };
}

export interface QuestionData {
  question: string;
  options: { label: string; description: string }[];
  allow_multiple: boolean;
}

interface RoundState {
  brief: BriefData;
  questions: QuestionData[];
  answers?: Record<number, { selected: string[]; freeText?: string }>;
}

const sectionLabels: Record<string, string> = {
  problem: "Problem / Opportunity",
  target_customer: "Target Customer",
  core_features: "Core Features",
  revenue_model: "Revenue Model",
  industry_trends: "Industry & Competitors",
  investor_perspective: "Investor Perspective",
  customer_perspective: "Customer Perspective",
};

const DRAFT_KEY = "vibeco_simulator_draft";
const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface DraftState {
  phase: "input" | "analyzing" | "brief" | "final";
  idea: string;
  rounds: RoundState[];
  currentRound: number;
  highlights: string[];
  antiHighlights: string[];
  conceptImage: string | null;
  logoImage: string | null;
  lovablePrompt: string | null;
  unlocked: boolean;
  unlockEmail: string;
  reportId: string | null;
  sessionId: string;
  savedAt: number;
}

function saveDraft(state: DraftState) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function loadDraft(): DraftState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft: DraftState = JSON.parse(raw);
    if (Date.now() - draft.savedAt > DRAFT_TTL) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

interface SimulatorShellProps {
  resumeId?: string;
  prefillIdea?: string;
  forkedFrom?: string;
}

const SimulatorShell = ({ resumeId, prefillIdea, forkedFrom }: SimulatorShellProps) => {
  const [initialized, setInitialized] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(!!resumeId);
  const draft = !initialized && !resumeId ? loadDraft() : null;

  const [phase, setPhase] = useState<"input" | "analyzing" | "brief" | "final">(draft?.phase === "analyzing" ? "brief" : draft?.phase || "input");
  const [rounds, setRounds] = useState<RoundState[]>(draft?.rounds || []);
  const [currentRound, setCurrentRound] = useState(draft?.currentRound || 0);
  const [idea, setIdea] = useState(draft?.idea || "");
  const [isLoading, setIsLoading] = useState(false);
  const [conceptImage, setConceptImage] = useState<string | null>(draft?.conceptImage || null);
  const [logoImage, setLogoImage] = useState<string | null>(draft?.logoImage || null);
  const [unlocked, setUnlocked] = useState(draft?.unlocked || false);
  const [unlockEmail, setUnlockEmail] = useState(draft?.unlockEmail || "");
  const [lovablePrompt, setLovablePrompt] = useState<string | null>(draft?.lovablePrompt || null);
  const [sessionId] = useState(() => draft?.sessionId || crypto.randomUUID());
  const [highlights, setHighlights] = useState<Set<string>>(new Set(draft?.highlights || []));
  const [antiHighlights, setAntiHighlights] = useState<Set<string>>(new Set(draft?.antiHighlights || []));
  const [reportId, setReportId] = useState<string | null>(draft?.reportId || null);
  const [depthRecommendation, setDepthRecommendation] = useState<string | undefined>();
  const [thinkingMode, setThinkingMode] = useState<"fast" | "deep">("fast");
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showStartFreshConfirm, setShowStartFreshConfirm] = useState(false);
  const [stackOpen, setStackOpen] = useState(false);
  const [stackHighlightId, setStackHighlightId] = useState<string | null>(null);
  const [isStackSharpening, setIsStackSharpening] = useState(false);
  const [isStackSnapshotting, setIsStackSnapshotting] = useState(false);

  // Vibe Stack — curated insight chits, falls back to localStorage when no reportId yet
  const stack = useVibeStack(reportId);

  // Resume from DB when resumeId is provided
  useEffect(() => {
    if (!resumeId) return;

    (async () => {
      try {
        const { data: report, error } = await (supabase.from("idea_reports") as any)
          .select("*")
          .eq("id", resumeId)
          .single();

        if (error || !report) {
          console.error("Resume error:", error);
          toast.error("Could not load that simulation.");
          setResumeLoading(false);
          return;
        }

        // Reconstruct state from the report
        const reportRounds = Array.isArray(report.rounds) ? report.rounds as RoundState[] : [];

        setIdea(report.idea || "");
        setRounds(reportRounds);
        setCurrentRound(Math.max(0, reportRounds.length - 1));
        setConceptImage(report.concept_image_url || null);
        setLogoImage(report.logo_image_url || null);
        setLovablePrompt(report.lovable_prompt || null);
        setHighlights(new Set(report.highlights || []));
        setReportId(report.id);

        // Determine phase from data
        if (report.lovable_prompt) {
          setPhase("final");
          setUnlocked(true);
          // Try to get the email from simulator_captures
          const { data: capture } = await (supabase.from("simulator_captures") as any)
            .select("email")
            .eq("report_id", report.id)
            .limit(1)
            .maybeSingle();
          if (capture?.email) setUnlockEmail(capture.email);
        } else if (reportRounds.length > 0) {
          setPhase("brief");
        } else {
          setPhase("input");
        }

        toast.info("Resumed your simulation.");
      } catch (err) {
        console.error("Resume error:", err);
        toast.error("Failed to resume simulation.");
      } finally {
        setResumeLoading(false);
      }
    })();
  }, [resumeId]);

  useEffect(() => {
    setInitialized(true);
    if (draft && !resumeId) {
      toast.info("Resumed your previous session.");
    }
    // Auto-submit prefilled idea from a fork/rebuild
    if (prefillIdea && !resumeId && !draft) {
      handleIdeaSubmit(prefillIdea);
    }
  }, []);

  // Persist state to localStorage on meaningful changes
  useEffect(() => {
    if (phase === "input" && rounds.length === 0) return;
    saveDraft({
      phase,
      idea,
      rounds,
      currentRound,
      highlights: Array.from(highlights),
      antiHighlights: Array.from(antiHighlights),
      conceptImage,
      logoImage,
      lovablePrompt,
      unlocked,
      unlockEmail,
      reportId,
      sessionId,
      savedAt: Date.now(),
    });
  }, [phase, idea, rounds, currentRound, highlights, antiHighlights, conceptImage, logoImage, lovablePrompt, unlocked, unlockEmail, reportId, sessionId]);

  const toggleHighlight = (key: string) => {
    setHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setAntiHighlights((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const toggleAntiHighlight = (key: string) => {
    setAntiHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setHighlights((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  // Helper to get current user ID
  const getUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  };

  // Helper to update report status
  const updateReportStatus = async (id: string, status: string) => {
    try {
      await (supabase.from("idea_reports") as any)
        .update({ status })
        .eq("id", id);
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  // Auto-save to simulator_captures (DB backup)
  useEffect(() => {
    if (rounds.length === 0) return;
    const saveSession = async () => {
      try {
        const userId = await getUserId();
        await (supabase.from("simulator_captures") as any).upsert({
          id: sessionId,
          email: unlockEmail || `anonymous-${sessionId.slice(0, 8)}`,
          idea: idea.trim() || "untitled",
          rounds: rounds.map((r) => ({
            brief: r.brief,
            questions: r.questions,
            answers: r.answers || null,
          })),
          concept_image_url: conceptImage || null,
          logo_image_url: logoImage || null,
          lovable_prompt: lovablePrompt || null,
          ...(userId ? { user_id: userId } : {}),
          ...(reportId ? { report_id: reportId } : {}),
        }, { onConflict: "id" });
      } catch (err) {
        console.error("Auto-save error:", err);
      }
    };
    saveSession();
  }, [rounds, unlockEmail, lovablePrompt]);

  // Also update idea_reports when highlights or lovablePrompt change (if reportId exists)
  const updateReport = useCallback(async () => {
    if (!reportId) return;
    try {
      await (supabase.from("idea_reports") as any)
        .update({
          lovable_prompt: lovablePrompt || null,
          highlights: Array.from(highlights),
          concept_image_url: conceptImage || null,
          logo_image_url: logoImage || null,
        })
        .eq("id", reportId);
    } catch (err) {
      console.error("Report update error:", err);
    }
  }, [reportId, lovablePrompt, highlights, conceptImage, logoImage]);

  useEffect(() => {
    if (reportId && phase === "final") {
      updateReport();
    }
  }, [highlights, lovablePrompt, reportId, phase]);

  const generateImages = async (ideaText: string) => {
    try {
      const [conceptRes, logoRes] = await Promise.allSettled([
        supabase.functions.invoke("generate-idea-image", {
          body: { idea: ideaText, type: "concept" },
        }),
        supabase.functions.invoke("generate-idea-image", {
          body: { idea: ideaText, type: "logo" },
        }),
      ]);

      if (conceptRes.status === "fulfilled" && conceptRes.value.data?.image_url) {
        setConceptImage(conceptRes.value.data.image_url);
      }
      if (logoRes.status === "fulfilled" && logoRes.value.data?.image_url) {
        setLogoImage(logoRes.value.data.image_url);
      }
    } catch (e) {
      console.error("Image generation failed:", e);
    }
  };

  const buildHistory = (upToRound: number): string => {
    let history = `Original idea: "${idea}"\n\n`;
    for (let i = 0; i <= upToRound && i < rounds.length; i++) {
      const r = rounds[i];
      history += `--- Round ${i + 1} Brief ---\n`;
      history += `Problem: ${r.brief.problem}\n`;
      history += `Target Customer: ${r.brief.target_customer}\n`;
      history += `Features (in user's priority order): ${r.brief.core_features.map((f, fi) => `${fi + 1}. ${f.name}`).join(", ")}\n`;
      history += `Revenue: ${r.brief.revenue_model}\n`;
      history += `Industry: ${r.brief.industry_trends}\n`;
      history += `Investor View: ${r.brief.investor_perspective}\n`;
      history += `Customer View: ${r.brief.customer_perspective}\n`;
      if (r.brief.builder_intent) history += `Builder Intent: ${r.brief.builder_intent}\n`;
      if (r.brief.scale_assessment) history += `Scale: ${r.brief.scale_assessment.current_scale} (${r.brief.scale_assessment.fits_intent ? "matches intent" : "mismatch"}) — ${r.brief.scale_assessment.recommendation}\n`;
      history += `\n`;
      if (r.answers) {
        history += `User answers:\n`;
        r.questions.forEach((q, qi) => {
          const a = r.answers![qi];
          if (a) {
            history += `Q: ${q.question}\nA: ${a.selected.join(", ")}${a.freeText ? ` — Additional: ${a.freeText}` : ""}\n\n`;
          }
        });
      }
    }

    if (highlights.size > 0) {
      history += `\n--- USER HIGHLIGHTS (these areas resonated most — prioritize them in the lovable_prompt and deeper analysis) ---\n`;
      highlights.forEach((key) => {
        const label = sectionLabels[key] || key;
        history += `✦ ${label}\n`;
      });
      history += `\n`;
    }

    if (antiHighlights.size > 0) {
      history += `\n--- USER FLAGS (these areas do NOT resonate — deprioritize or reframe in the lovable_prompt) ---\n`;
      antiHighlights.forEach((key) => {
        const label = sectionLabels[key] || key;
        history += `✕ ${label}\n`;
      });
      history += `\n`;
    }

    return history;
  };

  const handleCancelAnalysis = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setPhase(rounds.length > 0 ? "brief" : "input");
    toast("Analysis cancelled.");
  };

  const callSimulator = async (type: "initial" | "refine", ideaText?: string, round?: number) => {
    setIsLoading(true);
    setPhase("analyzing");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const body: Record<string, unknown> =
        type === "initial"
          ? { type: "initial", idea: ideaText || idea, mode: thinkingMode }
          : { type: "refine", history: buildHistory(currentRound - 1), round, mode: thinkingMode };

      const { data, error } = await supabase.functions.invoke("simulate-idea", {
        body,
        signal: controller.signal as AbortSignal,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const newRound: RoundState = {
        brief: data.brief,
        questions: data.follow_up_questions || [],
      };

      if (data.lovable_prompt) {
        setLovablePrompt(data.lovable_prompt);
      }

      if (data.depth_recommendation) {
        setDepthRecommendation(data.depth_recommendation);
      }

      if (data.is_final) {
        const allRounds = [...rounds, newRound];
        setRounds(allRounds);
        setPhase("final");

        // Save to idea_reports
        try {
          const userId = await getUserId();
          const latestBrief = newRound.brief;
          const roundsData = allRounds.map((r) => ({
            brief: r.brief,
            questions: r.questions,
            answers: r.answers || null,
          }));

          if (reportId) {
            await (supabase.from("idea_reports") as any)
              .update({
                brief: latestBrief,
                title: deriveTitle(latestBrief, idea),
                rounds: roundsData,
                lovable_prompt: data.lovable_prompt || null,
                concept_image_url: conceptImage || null,
                logo_image_url: logoImage || null,
                highlights: Array.from(highlights),
                status: data.lovable_prompt ? "prompt-ready" : "brief-complete",
              })
              .eq("id", reportId);
          } else {
            const { data: reportData } = await (supabase.from("idea_reports") as any)
              .insert({
                idea: idea.trim(),
                title: deriveTitle(latestBrief, idea),
                brief: latestBrief,
                rounds: roundsData,
                lovable_prompt: data.lovable_prompt || null,
                concept_image_url: conceptImage || null,
                logo_image_url: logoImage || null,
                highlights: Array.from(highlights),
                status: data.lovable_prompt ? "prompt-ready" : "brief-complete",
                ...(userId ? { user_id: userId } : {}),
              })
              .select("id")
              .single();
            if (reportData?.id) setReportId(reportData.id);
          }
        } catch (err) {
          console.error("Report save error:", err);
        }
      } else {
        setRounds((prev) => [...prev, newRound]);
        setCurrentRound((prev) => prev + 1);
        setPhase("brief");

        // Create/update report with in-progress status
        try {
          const userId = await getUserId();
          const allRounds = [...rounds, newRound];
          const roundsData = allRounds.map((r) => ({
            brief: r.brief,
            questions: r.questions,
            answers: r.answers || null,
          }));

          if (reportId) {
            await (supabase.from("idea_reports") as any)
              .update({
                brief: newRound.brief,
                rounds: roundsData,
                status: "in-progress",
              })
              .eq("id", reportId);
          } else {
            const { data: reportData } = await (supabase.from("idea_reports") as any)
              .insert({
                idea: idea.trim(),
                brief: newRound.brief,
                rounds: roundsData,
                status: "in-progress",
                ...(userId ? { user_id: userId } : {}),
              })
              .select("id")
              .single();
            if (reportData?.id) setReportId(reportData.id);
          }
        } catch (err) {
          console.error("Early report save error:", err);
        }
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      console.error("Simulator error:", e);
      toast.error(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setPhase(rounds.length > 0 ? "brief" : "input");
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const [importedFromProjectId, setImportedFromProjectId] = useState<string | null>(null);

  const handleIdeaSubmit = (text: string, meta?: { project_id?: string; lovable_project_id?: string | null }) => {
    setIdea(text);
    if (meta?.project_id) setImportedFromProjectId(meta.project_id);
    generateImages(text);
    callSimulator("initial", text);
  };

  const handleAnswersSubmit = (answers: Record<number, { selected: string[]; freeText?: string }>) => {
    setRounds((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], answers };
      return updated;
    });
    callSimulator("refine", undefined, currentRound + 1);
  };

  const handleSkipToFinal = (answers: Record<number, { selected: string[]; freeText?: string }>) => {
    setRounds((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], answers };
      return updated;
    });
    callSimulator("refine", undefined, 3);
  };

  const handleReorderFeatures = (newFeatures: BriefData["core_features"]) => {
    setRounds((prev) => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;
      updated[lastIndex] = {
        ...updated[lastIndex],
        brief: { ...updated[lastIndex].brief, core_features: newFeatures },
      };
      return updated;
    });
  };

  const handleUnlock = async (email: string) => {
    setUnlockEmail(email);
    setUnlocked(true);
    try {
      const userId = await getUserId();
      await (supabase.from("simulator_captures") as any).upsert({
        id: sessionId,
        email: email.trim(),
        idea: idea.trim(),
        rounds: rounds.map((r) => ({
          brief: r.brief,
          questions: r.questions,
          answers: r.answers || null,
        })),
        concept_image_url: conceptImage || null,
        logo_image_url: logoImage || null,
        lovable_prompt: lovablePrompt || null,
        ...(userId ? { user_id: userId } : {}),
        ...(reportId ? { report_id: reportId } : {}),
      }, { onConflict: "id" });
    } catch (err) {
      console.error("Capture error:", err);
    }

    if (reportId) {
      try {
        await (supabase.from("idea_reports") as any)
          .update({
            lovable_prompt: lovablePrompt || null,
            highlights: Array.from(highlights),
            concept_image_url: conceptImage || null,
            logo_image_url: logoImage || null,
          })
          .eq("id", reportId);
      } catch (err) {
        console.error("Report update error:", err);
      }
    } else {
      try {
        const userId = await getUserId();
        const latestBrief = rounds[rounds.length - 1]?.brief;
        if (latestBrief) {
          const { data: reportData } = await (supabase.from("idea_reports") as any)
            .insert({
              idea: idea.trim(),
              brief: latestBrief,
              rounds: rounds.map((r) => ({
                brief: r.brief,
                questions: r.questions,
                answers: r.answers || null,
              })),
              lovable_prompt: lovablePrompt || null,
              concept_image_url: conceptImage || null,
              logo_image_url: logoImage || null,
              highlights: Array.from(highlights),
              status: lovablePrompt ? "prompt-ready" : "brief-complete",
              ...(userId ? { user_id: userId } : {}),
            })
            .select("id")
            .single();
          if (reportData?.id) setReportId(reportData.id);
        }
      } catch (err) {
        console.error("Report save error:", err);
      }
    }

    toast.success("Saved! Your full report is unlocked.");
  };

  const handleRestart = () => {
    clearDraft();
    setPhase("input");
    setRounds([]);
    setCurrentRound(0);
    setIdea("");
    setConceptImage(null);
    setLogoImage(null);
    setUnlocked(false);
    setUnlockEmail("");
    setLovablePrompt(null);
    setHighlights(new Set());
    setAntiHighlights(new Set());
    setReportId(null);
    setDepthRecommendation(undefined);
    setEditMode(false);
  };

  // Iterate-in-place: stay on the FinalReport with editable brief sections.
  // The user keeps everything they've built (rounds, highlights, stack, report)
  // and edits the brief in line, then re-simulates as a new round on top.
  const [editMode, setEditMode] = useState(false);
  const handleIterate = () => {
    setEditMode(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    toast.success(
      `Refine in place — edit any section then re-simulate. ${highlights.size} highlight${highlights.size === 1 ? "" : "s"} and ${stack.items.length} stack item${stack.items.length === 1 ? "" : "s"} carried in.`,
    );
  };

  // Apply user edits to the latest brief, then run a new refinement round on top.
  const handleReSimulateWithEdits = async (editedBrief: BriefData) => {
    // Replace the current latest round's brief with the user's edits, then refine.
    const updatedRounds = [...rounds];
    if (updatedRounds.length === 0) return;
    updatedRounds[updatedRounds.length - 1] = {
      ...updatedRounds[updatedRounds.length - 1],
      brief: editedBrief,
    };
    setRounds(updatedRounds);
    setEditMode(false);
    // Bump round and run refine. simulate-idea uses buildHistory(currentRound - 1)
    // so we increment currentRound first (matches the in-flow path).
    setCurrentRound((r) => r + 1);
    // Defer to next tick so state is committed before history is built.
    setTimeout(() => callSimulator("refine", undefined, currentRound + 2), 0);
  };

  const handleCancelEdit = () => setEditMode(false);

  // Wipe everything from the iterate-input screen and start a brand-new run.
  const handleStartFresh = () => {
    setIdea("");
    setRounds([]);
    setCurrentRound(0);
    setHighlights(new Set());
    setAntiHighlights(new Set());
    setReportId(null);
    setLovablePrompt(null);
    setConceptImage(null);
    setLogoImage(null);
    setUnlocked(false);
    setUnlockEmail("");
    setDepthRecommendation(undefined);
    setEditMode(false);
    clearDraft();
    toast("Cleared — start with a fresh idea.");
  };

  // Stamp the current round (1-indexed) onto every newly-added stack chit so
  // the drawer can show R1/R2/R3 badges. Wraps the hook's `add` for callers.
  const addToStackWithRound = useCallback(
    (args: Parameters<typeof stack.add>[0]) =>
      stack.add({ ...args, round: args.round ?? currentRound + 1 }),
    [stack, currentRound],
  );

  // Centralized "open the Vibe Stack and flash this chit" — used by Deep Dive's
  // "Use in prompt" so all sharpening converges on the drawer instead of
  // running parallel refine calls scattered across the report.
  const openStackHighlighting = useCallback((id: string | null) => {
    setStackHighlightId(id);
    setStackOpen(true);
  }, []);

  const runStackSharpen = useCallback(async () => {
    if (stack.items.length === 0) {
      toast.error("Add at least one chit to the stack first.");
      return;
    }
    setIsStackSharpening(true);
    try {
      const { data, error } = await supabase.functions.invoke("refine-prompt", {
        body: {
          brief: rounds[rounds.length - 1]?.brief,
          idea,
          original_prompt: lovablePrompt || undefined,
          highlights: Array.from(highlights),
          antiHighlights: Array.from(antiHighlights),
          stack_items: stack.items.map((it) => ({
            kind: it.kind,
            source: it.source,
            label: it.label,
            content: it.content,
            pinned: it.pinned,
          })),
          refinement_context:
            "Rebuild the prompt from the curated Vibe Stack — pinned items are mandatory, suggested items strengthen direction.",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.lovable_prompt) {
        setLovablePrompt(data.lovable_prompt);
        toast.success("Prompt sharpened from your Vibe Stack.");
      }
    } catch (e) {
      console.error("Stack sharpen error:", e);
      toast.error(e instanceof Error ? e.message : "Failed to sharpen.");
    } finally {
      setIsStackSharpening(false);
    }
  }, [stack.items, rounds, idea, lovablePrompt, highlights, antiHighlights]);

  const runStackSnapshot = useCallback(async () => {
    if (!reportId) {
      toast.error("Save the report first (add an email).");
      return;
    }
    setIsStackSnapshotting(true);
    try {
      const label = `Snapshot · ${new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
      const { data: existing } = await (supabase.from("idea_reports") as any)
        .select("prompt_versions")
        .eq("id", reportId)
        .single();
      const versions = Array.isArray(existing?.prompt_versions) ? existing.prompt_versions : [];
      versions.push({
        label,
        prompt: lovablePrompt || null,
        stack: stack.items.map((it) => ({
          kind: it.kind, source: it.source, label: it.label, pinned: it.pinned,
        })),
        created_at: new Date().toISOString(),
      });
      await (supabase.from("idea_reports") as any)
        .update({ prompt_versions: versions })
        .eq("id", reportId);
      toast.success(`Saved: ${label}`);
    } catch (e) {
      console.error("Snapshot error:", e);
      toast.error("Failed to save snapshot.");
    } finally {
      setIsStackSnapshotting(false);
    }
  }, [reportId, lovablePrompt, stack.items]);

  // PDF download moved to FinalReport's action row.

  const latestRound = rounds[rounds.length - 1];
  const totalRounds = 3;

  // Show loading state while resuming from DB
  if (resumeLoading) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center justify-center py-32">
          <motion.div
            className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-sm text-muted-foreground mt-6">Resuming your simulation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-6">
        {/* Thinking Mode Toggle */}
        {phase !== "input" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end mb-4"
          >
            <button
              onClick={() => setThinkingMode(prev => prev === "fast" ? "deep" : "fast")}
              className={`flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                thinkingMode === "deep"
                  ? "border-purple-500/50 bg-purple-500/10 text-purple-400"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30"
              }`}
            >
              {thinkingMode === "deep" ? <Brain size={12} /> : <Zap size={12} />}
              {thinkingMode === "deep" ? "Deep thinking" : "Quick mode"}
            </button>
          </motion.div>
        )}

        {/* Floating PDF button removed — Download is now in the FinalReport action row. */}

        {rounds.length > 0 && phase !== "input" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-10"
          >
            {Array.from({ length: totalRounds }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                        i < rounds.length || (phase === "final" && i === rounds.length - 1)
                          ? "bg-primary text-primary-foreground"
                          : i === rounds.length && phase === "analyzing"
                          ? "bg-primary/30 text-primary border border-primary/50"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {i === 0 ? "Analyze" : i === 1 ? "Refine" : "Finalize"}
                    </span>
                  </div>
                {i < totalRounds - 1 && (
                  <div
                    className={`w-12 h-px transition-colors duration-500 ${
                      i < rounds.length - 1 || (phase === "final" && i < rounds.length) ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {phase === "input" && (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {forkedFrom && (
                <div className="flex items-center gap-2 mb-4 px-1">
                  <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                    ↳ Forked from: {forkedFrom.length > 60 ? forkedFrom.slice(0, 60) + "…" : forkedFrom}
                  </span>
                </div>
              )}
              <IdeaInput
                onSubmit={handleIdeaSubmit}
                initialValue={idea || prefillIdea}
                iterationContext={
                  rounds.length > 0 || highlights.size > 0
                    ? {
                        highlightCount: highlights.size,
                        flagCount: antiHighlights.size,
                        roundCount: rounds.length,
                        reportId,
                      }
                    : undefined
                }
                onStartFresh={() => setShowStartFreshConfirm(true)}
              />
            </motion.div>
          )}

          {phase === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <div className="relative mb-8">
                <motion.div
                  className="w-24 h-24 rounded-full"
                  style={{
                    background: "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)",
                  }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute inset-0 w-24 h-24 rounded-full border border-primary/20"
                  animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
              </div>
              <AnalyzingMessages isInitial={rounds.length === 0} />
              <p className="text-[10px] text-muted-foreground/50 mt-2">
                {thinkingMode === "deep" ? "Deep mode — usually 30-60 seconds" : "Quick mode — about 10-15 seconds"}
              </p>
              <button
                onClick={handleCancelAnalysis}
                className="mt-6 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-border/60 px-4 py-2 rounded-sm transition-colors"
              >
                <X size={14} />
                Cancel
              </button>
            </motion.div>
          )}

          {phase === "brief" && latestRound && (
            <motion.div key={`brief-${currentRound}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Single scrollable view: Analysis first, then Questions inline. No tab toggle. */}
              <div className="space-y-10">
                <IdeaBrief
                  brief={latestRound.brief}
                  round={currentRound}
                  unlocked={unlocked}
                  onUnlock={handleUnlock}
                  highlights={highlights}
                  onToggleHighlight={toggleHighlight}
                  antiHighlights={antiHighlights}
                  onToggleAntiHighlight={toggleAntiHighlight}
                />

                {/* Follow-up questions — always inline below.
                    Stress-test moved to FinalReport only — single source of truth. */}
                <FollowUpQuestions
                  questions={latestRound.questions}
                  onSubmit={handleAnswersSubmit}
                  onSkipToFinal={handleSkipToFinal}
                  isLoading={isLoading}
                  round={currentRound}
                  highlights={highlights}
                  onToggleHighlight={toggleHighlight}
                  depthRecommendation={depthRecommendation}
                />

                {/* Previous rounds — collapsible, only when there's history */}
                {rounds.length > 1 && (
                  <div className="border-t border-border/30 pt-6">
                    <button
                      onClick={() => setShowHistory((v) => !v)}
                      className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showHistory ? "Hide" : "Show"} previous rounds ({rounds.length - 1})
                    </button>
                    <AnimatePresence>
                      {showHistory && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-6 mt-6">
                            {rounds.slice(0, -1).map((r, i) => (
                              <div key={i} className="border border-border/40 rounded-lg p-4 bg-card/30">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                    {i + 1}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    Round {i + 1} Analysis
                                  </span>
                                </div>
                                <IdeaBrief
                                  brief={r.brief}
                                  round={i}
                                  highlights={highlights}
                                  onToggleHighlight={toggleHighlight}
                                  antiHighlights={antiHighlights}
                                  onToggleAntiHighlight={toggleAntiHighlight}
                                />
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {phase === "final" && latestRound && (
            <motion.div key="final" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FinalReport
                brief={latestRound.brief}
                idea={idea}
                onRestart={() => setShowRestartConfirm(true)}
                onIterate={handleIterate}
                conceptImage={conceptImage}
                logoImage={logoImage}
                rounds={rounds}
                unlocked={unlocked}
                unlockEmail={unlockEmail}
                lovablePrompt={lovablePrompt}
                sessionId={sessionId}
                highlights={highlights}
                onToggleHighlight={toggleHighlight}
                antiHighlights={antiHighlights}
                onToggleAntiHighlight={toggleAntiHighlight}
                reportId={reportId}
                onReorderFeatures={handleReorderFeatures}
                onPromptUpdate={(p) => setLovablePrompt(p)}
                editMode={editMode}
                onCancelEdit={handleCancelEdit}
                onReSimulate={handleReSimulateWithEdits}
                stackItems={stack.items}
                onAddToStack={addToStackWithRound}
                stackHasItem={stack.hasItem}
                onOpenStack={(id) => openStackHighlighting(id ?? null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Vibe Stack — always-visible floating drawer once there's any work to curate */}
      {(phase === "brief" || phase === "final") && (
        <VibeStack
          items={stack.items}
          onTogglePin={stack.togglePin}
          onRemove={stack.remove}
          onReorder={stack.reorder}
          hasPrompt={!!lovablePrompt}
          open={stackOpen}
          onOpenChange={(next) => {
            setStackOpen(next);
            if (!next) setStackHighlightId(null);
          }}
          highlightId={stackHighlightId}
          isSharpening={isStackSharpening}
          isSnapshotting={isStackSnapshotting}
          onSharpen={runStackSharpen}
          onSnapshot={runStackSnapshot}
        />
      )}

      <AlertDialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start over?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear your entire session — all rounds, answers, highlights, and generated content. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep working</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowRestartConfirm(false);
                handleRestart();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, start over
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Start fresh confirm — gates the iterate-input "Start fresh instead" link */}
      <AlertDialog open={showStartFreshConfirm} onOpenChange={setShowStartFreshConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a fresh idea?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears your current rounds, highlights, and Vibe Stack. Your saved reports stay safe in the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep this idea</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowStartFreshConfirm(false);
                handleStartFresh();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, start fresh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SimulatorShell;
