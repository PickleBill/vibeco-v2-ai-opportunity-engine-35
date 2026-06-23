import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  AlertTriangle,
  Users,
  Layers,
  DollarSign,
  TrendingUp,
  Eye,
  MessageSquare,
  Mail,
  RotateCcw,
  Download,
  ArrowLeft,
  Copy,
  Check,
  ChevronDown,
  Loader2,
  Sparkles,
  Share2,
  GripVertical,
  ExternalLink,
  Wand2,
  Star,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ThunderdomePanel from "./ThunderdomePanel";
import ActionHub from "./ActionHub";
import PromptDiff from "./PromptDiff";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BriefData, QuestionData } from "./SimulatorShell";
import { AddToStackButton } from "./VibeStack";
import type { StackItem, StackKind, AddItemArgs } from "@/hooks/useVibeStack";
import { Textarea } from "@/components/ui/textarea";

interface RoundState {
  brief: BriefData;
  questions: QuestionData[];
  answers?: Record<number, { selected: string[]; freeText?: string }>;
}

interface Props {
  brief: BriefData;
  idea: string;
  onRestart: () => void;
  onIterate?: () => void;
  conceptImage?: string | null;
  logoImage?: string | null;
  rounds: RoundState[];
  unlocked?: boolean;
  unlockEmail?: string;
  lovablePrompt?: string | null;
  sessionId?: string;
  highlights?: Set<string>;
  onToggleHighlight?: (key: string) => void;
  antiHighlights?: Set<string>;
  onToggleAntiHighlight?: (key: string) => void;
  reportId?: string | null;
  onReorderFeatures?: (features: BriefData["core_features"]) => void;
  onPromptUpdate?: (newPrompt: string) => void;
  // Iterate-in-place
  editMode?: boolean;
  onCancelEdit?: () => void;
  onReSimulate?: (editedBrief: BriefData) => void;
  // Vibe Stack wiring
  stackItems?: StackItem[];
  onAddToStack?: (args: AddItemArgs) => Promise<StackItem | null>;
  stackHasItem?: (kind: StackKind, source: string | null | undefined, label: string) => boolean;
  /** Open the Vibe Stack drawer; optionally flash a specific chit by id. */
  onOpenStack?: (highlightId?: string | null) => void;
}

const sectionMeta = [
  { key: "problem", label: "Problem / Opportunity", icon: AlertTriangle },
  { key: "target_customer", label: "Target Customer", icon: Users },
  { key: "core_features", label: "Core Features", icon: Layers },
  { key: "revenue_model", label: "Revenue Model", icon: DollarSign },
  { key: "industry_trends", label: "Industry & Competitors", icon: TrendingUp },
  { key: "investor_perspective", label: "Investor Perspective & Next Steps", icon: Eye },
  { key: "customer_perspective", label: "Customer Perspective", icon: MessageSquare },
] as const;

/* (computeScores removed — was deterministic hash filler, no real signal) */

/* ─── Sortable Feature ─── */
const SortableFeature = ({ feat, index, id }: { feat: { name: string; description: string }; index: number; id: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 group/feat">
      <button {...attributes} {...listeners} className="mt-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-primary transition-colors touch-none">
        <GripVertical size={14} />
      </button>
      <p className="text-base text-foreground/90 leading-relaxed">
        <span className="text-primary font-bold">{index + 1}.</span>{" "}
        <span className="font-semibold">{feat.name}</span> — {feat.description}
      </p>
    </div>
  );
};

/* ─── Structured PDF Export ─── */
export const generateStructuredPDF = (
  brief: BriefData,
  idea: string,
  rounds: RoundState[],
  scores: { label: string; value: number }[],
  lovablePrompt?: string | null
) => {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pw - margin * 2;
  let y = 0;

  const addHeader = () => {
    pdf.setFillColor(17, 17, 17);
    pdf.rect(0, 0, pw, ph, "F");
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 200);
    pdf.text("VibeCo AI Report", margin, 12);
    const pageNum = `Page ${pdf.getNumberOfPages()}`;
    pdf.text(pageNum, pw - margin - pdf.getTextWidth(pageNum), 12);
    pdf.setDrawColor(50, 50, 60);
    pdf.line(margin, 15, pw - margin, 15);
  };

  const ensureSpace = (need: number) => {
    if (y + need > ph - 15) {
      pdf.addPage();
      addHeader();
      y = 25;
    }
  };

  const writeWrapped = (text: string, x: number, maxW: number, size: number, color: [number, number, number]) => {
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, maxW);
    lines.forEach((line: string) => {
      ensureSpace(size * 0.5);
      pdf.text(line, x, y);
      y += size * 0.45;
    });
    y += 2;
  };

  // Page 1: Cover
  addHeader();
  y = 50;
  pdf.setFontSize(28);
  pdf.setTextColor(230, 230, 240);
  const titleLines = pdf.splitTextToSize(idea, contentW);
  titleLines.forEach((line: string) => {
    pdf.text(line, margin, y);
    y += 12;
  });
  y += 10;
  pdf.setFontSize(10);
  pdf.setTextColor(120, 120, 140);
  pdf.text(`Generated ${new Date().toLocaleDateString()} · ${rounds.length} rounds of analysis`, margin, y);
  y += 20;

  // (Fake hash-based scores removed from PDF cover — they leaked deterministic
  // "Market 73 / Product 81" numbers that weren't real signal.)
  pdf.setFontSize(11);
  pdf.setTextColor(180, 180, 200);
  pdf.text(`${rounds.length} round${rounds.length === 1 ? "" : "s"} of analysis`, margin, y);
  y += 12;

  pdf.addPage();
  addHeader();
  y = 25;

  sectionMeta.forEach((section) => {
    ensureSpace(20);
    pdf.setFontSize(12);
    pdf.setTextColor(120, 120, 200);
    pdf.text(section.label.toUpperCase(), margin, y);
    y += 7;
    pdf.setDrawColor(60, 60, 80);
    pdf.line(margin, y - 2, margin + contentW, y - 2);
    y += 2;

    const val = brief[section.key as keyof BriefData];
    if (section.key === "core_features" && Array.isArray(val)) {
      (val as BriefData["core_features"]).forEach((feat, fi) => {
        ensureSpace(12);
        pdf.setFontSize(10);
        pdf.setTextColor(210, 210, 225);
        pdf.text(`${fi + 1}. ${feat.name}`, margin + 2, y);
        y += 5;
        writeWrapped(feat.description, margin + 6, contentW - 6, 9, [160, 160, 175]);
        y += 2;
      });
    } else if (typeof val === "string") {
      writeWrapped(val, margin + 2, contentW - 2, 9.5, [200, 200, 215]);
    }
    y += 5;
  });

  if (rounds.length > 1) {
    pdf.addPage();
    addHeader();
    y = 25;
    pdf.setFontSize(14);
    pdf.setTextColor(120, 120, 200);
    pdf.text("REFINEMENT JOURNEY", margin, y);
    y += 10;

    rounds.forEach((r, ri) => {
      ensureSpace(15);
      pdf.setFontSize(11);
      pdf.setTextColor(200, 200, 220);
      pdf.text(`Round ${ri + 1}`, margin, y);
      y += 6;
      if (r.answers) {
        r.questions.forEach((q, qi) => {
          const a = r.answers![qi];
          if (a) {
            writeWrapped(`Q: ${q.question}`, margin + 4, contentW - 4, 8.5, [150, 150, 165]);
            writeWrapped(`A: ${a.selected.join(", ")}${a.freeText ? ` — ${a.freeText}` : ""}`, margin + 4, contentW - 4, 8.5, [180, 180, 200]);
          }
        });
      }
      y += 4;
    });
  }

  if (lovablePrompt) {
    pdf.addPage();
    addHeader();
    y = 25;
    pdf.setFontSize(14);
    pdf.setTextColor(120, 120, 200);
    pdf.text("YOUR LOVABLE PROMPT", margin, y);
    y += 10;
    writeWrapped(lovablePrompt, margin, contentW, 9, [190, 190, 205]);
  }

  const fileName = `VibeCo-Report-${idea.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
  pdf.save(fileName);
};

const FinalReport = ({ brief, idea, onRestart, onIterate, conceptImage, logoImage, rounds, unlocked, unlockEmail, lovablePrompt, sessionId, highlights, onToggleHighlight, antiHighlights, onToggleAntiHighlight, reportId, onReorderFeatures, onPromptUpdate, editMode, onCancelEdit, onReSimulate, stackItems, onAddToStack, stackHasItem, onOpenStack }: Props) => {
  const [email, setEmail] = useState(unlockEmail || "");
  const [showPrompt, setShowPrompt] = useState(!!unlocked);
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [deepDiveContent, setDeepDiveContent] = useState<Record<string, string>>({});
  const [deepDiveLoading, setDeepDiveLoading] = useState<string | null>(null);
  const [isSharpening, setIsSharpening] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null); // diff state
  const [pulsedSection, setPulsedSection] = useState<string | null>(null);
  const [activeNavSection, setActiveNavSection] = useState<string>("prompt");
  // Editable copies of brief sections during iterate-in-place mode
  const [editedBrief, setEditedBrief] = useState<BriefData>(brief);
  const [editedSections, setEditedSections] = useState<Set<string>>(new Set());
  useEffect(() => {
    // Reset editable copy whenever the underlying brief changes (new round)
    // or edit mode is toggled on/off.
    setEditedBrief(brief);
    setEditedSections(new Set());
  }, [brief, editMode]);
  const reportRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Keyboard sensor — Escape cancels active drag automatically via dnd-kit
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Sub-nav: smooth scroll + intersection-observer to track active section
  const navSections = [
    { id: "prompt", label: "Prompt" },
    { id: "brief", label: "Brief" },
    { id: "stress-test", label: "Stress-test" },
    { id: "actions", label: "Actions" },
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`fr-${id}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
  };

  useEffect(() => {
    const ids = navSections.map((s) => `fr-${s.id}`);
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const id = visible.target.id.replace("fr-", "");
          setActiveNavSection(id);
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const handleDeepDive = async (sectionKey: string) => {
    if (expandedSection === sectionKey) {
      setExpandedSection(null);
      return;
    }
    setExpandedSection(sectionKey);
    if (deepDiveContent[sectionKey]) return;

    setDeepDiveLoading(sectionKey);
    try {
      const sectionLabel = sectionMeta.find((s) => s.key === sectionKey)?.label || sectionKey;
      const { data, error } = await supabase.functions.invoke("simulate-idea", {
        body: {
          type: "deep_dive",
          section: sectionKey,
          section_label: sectionLabel,
          brief,
          idea,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDeepDiveContent((prev) => ({
        ...prev,
        [sectionKey]: data.deep_dive || "No additional analysis available.",
      }));
    } catch (e) {
      console.error("Deep dive error:", e);
      toast.error("Failed to generate deep dive. Try again.");
      setExpandedSection(null);
    } finally {
      setDeepDiveLoading(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setIsSubmitting(true);
    try {
      const upsertData: Record<string, unknown> = {
        email: email.trim(),
        idea: idea.trim(),
        rounds: rounds.map((r: any) => ({
          brief: r.brief,
          questions: r.questions,
          answers: r.answers || null,
        })),
        concept_image_url: conceptImage || null,
        logo_image_url: logoImage || null,
      };
      if (sessionId) upsertData.id = sessionId;

      const { error } = await (supabase.from as any)("simulator_captures").upsert(upsertData, { onConflict: "id" });
      if (error) throw error;
      setShowPrompt(true);
      toast.success("Saved! Your prompt and sharing tools are unlocked.");
    } catch (err) {
      console.error("Simulator capture error:", err);
      setShowPrompt(true);
      toast.success("Unlocked!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!showPrompt) {
      // Email-gate inline — focus the email field at the top of the action row
      toast("Add an email to download the PDF.");
      const emailInput = document.querySelector<HTMLInputElement>('input[type="email"]');
      emailInput?.focus();
      return;
    }
    setIsExporting(true);
    try {
      generateStructuredPDF(brief, idea, rounds, [], lovablePrompt);
      toast.success("PDF downloaded!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF. Try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyPromptWithHighlights = async () => {
    if (!lovablePrompt) return;
    let textToCopy = lovablePrompt;

    if (highlights && highlights.size > 0) {
      textToCopy += "\n\n---\n\n## Areas that resonate most with me:\n";
      highlights.forEach((key) => {
        const section = sectionMeta.find((s) => s.key === key);
        if (!section) return;
        const value = brief[section.key as keyof BriefData];
        const text = typeof value === "string" ? value : Array.isArray(value) ? (value as BriefData["core_features"]).map((f) => `${f.name}: ${f.description}`).join("\n") : "";
        textToCopy += `\n### ${section.label}\n${text}\n`;
      });
    }

    if (antiHighlights && antiHighlights.size > 0) {
      textToCopy += "\n\n## Areas to deprioritize or reframe:\n";
      antiHighlights.forEach((key) => {
        const section = sectionMeta.find((s) => s.key === key);
        if (!section) return;
        textToCopy += `- ${section.label}\n`;
      });
    }

    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setCopied(true);
      toast.success("Prompt copied!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Failed to copy.");
    }
  };

  const handleShareReport = async () => {
    if (!showPrompt) {
      toast("Add an email to get a shareable link.");
      const emailInput = document.querySelector<HTMLInputElement>('input[type="email"]');
      emailInput?.focus();
      return;
    }
    if (!reportId) {
      toast.error("Report is still saving. Try again in a moment.");
      return;
    }
    const shareUrl = `${window.location.origin}/report/${reportId}`;
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setShareCopied(true);
      toast.success("Share link copied!");
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      toast.error("Failed to copy link.");
    }
  };

  const callRefinePrompt = async (context?: string) => {
    const { data, error } = await supabase.functions.invoke("refine-prompt", {
      body: {
        brief,
        idea,
        original_prompt: lovablePrompt || undefined,
        highlights: highlights ? Array.from(highlights) : [],
        antiHighlights: antiHighlights ? Array.from(antiHighlights) : [],
        refinement_context: context,
        stack_items: (stackItems || []).map((it) => ({
          kind: it.kind,
          source: it.source,
          label: it.label,
          content: it.content,
          pinned: it.pinned,
        })),
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data?.lovable_prompt as string | undefined;
  };

  // Generate or sharpen, but route the new prompt through the diff confirmation
  // step rather than silently overwriting. The user always gets to keep / revert.
  const runRefine = async (
    setLoading: (b: boolean) => void,
    context: string | undefined,
    successLabel: string,
  ) => {
    setLoading(true);
    try {
      const newPrompt = await callRefinePrompt(context);
      if (!newPrompt) {
        toast.error("AI returned an empty prompt. Try again.");
        return;
      }
      if (lovablePrompt && lovablePrompt.trim()) {
        // Show diff for confirmation
        setPendingPrompt(newPrompt);
        toast.success(`${successLabel} — review the changes below.`);
      } else if (onPromptUpdate) {
        // First generation: apply directly, no diff needed
        onPromptUpdate(newPrompt);
        toast.success(successLabel);
      } else {
        await copyToClipboard(newPrompt);
        toast.success(`${successLabel} (copied to clipboard)`);
      }
    } catch (e) {
      console.error("Refine error:", e);
      toast.error(e instanceof Error ? e.message : "Failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSharpenPrompt = () =>
    runRefine(
      setIsSharpening,
      "Re-tighten the prompt around the user's resonating sections; deprioritize the flagged ones.",
      "Prompt sharpened with your highlights",
    );

  const handleGeneratePrompt = () => runRefine(setIsGeneratingPrompt, undefined, "Prompt generated");

  // Centralized sharpen rule (Sprint 9.B): instead of running a parallel refine,
  // a deep-dive's "Use in prompt" pins the insight as a Vibe Stack chit and opens
  // the drawer with that chit briefly highlighted. The drawer's "Sharpen prompt"
  // button is the single canonical entry point for prompt regeneration.
  const handleUseDeepDiveInPrompt = async (sectionKey: string) => {
    const content = deepDiveContent[sectionKey];
    if (!content) return;
    const sectionLabel = sectionMeta.find((s) => s.key === sectionKey)?.label || sectionKey;
    if (!onAddToStack) {
      toast.error("Stack unavailable.");
      return;
    }
    const alreadyIn = stackHasItem?.("deep_dive", sectionKey, sectionLabel);
    let chitId: string | null = null;
    if (!alreadyIn) {
      const created = await onAddToStack({
        kind: "deep_dive",
        source: sectionKey,
        label: sectionLabel,
        content,
        pinned: true,
      });
      chitId = created?.id || null;
      toast.success(`Pinned "${sectionLabel}" — open Sharpen to fold it in.`);
    } else {
      toast.info(`"${sectionLabel}" is already in your stack.`);
    }
    onOpenStack?.(chitId);
  };

  const handleAddDeepDiveToHighlights = (sectionKey: string) => {
    if (!onToggleHighlight) return;
    if (!highlights?.has(sectionKey)) {
      onToggleHighlight(sectionKey);
      setPulsedSection(sectionKey);
      setTimeout(() => setPulsedSection(null), 900);
    }
    toast.success("Added to highlights — sharpen the prompt to apply.");
  };

  const handleAcceptPending = () => {
    if (pendingPrompt && onPromptUpdate) {
      onPromptUpdate(pendingPrompt);
      toast.success("New prompt kept.");
    }
    setPendingPrompt(null);
  };

  const handleRevertPending = () => {
    setPendingPrompt(null);
    toast("Reverted to previous prompt.");
  };

  // Wrap toggle to add a brief visual pulse + ack + undo toast
  const wrappedToggleHighlight = onToggleHighlight
    ? (k: string) => {
        const wasOn = !!highlights?.has(k);
        onToggleHighlight(k);
        if (!wasOn) {
          setPulsedSection(k);
          setTimeout(() => setPulsedSection(null), 900);
          const label = sectionMeta.find((s) => s.key === k)?.label || k;
          toast.success(`✦ Kept "${label}"`, {
            action: { label: "Undo", onClick: () => onToggleHighlight(k) },
            duration: 4000,
          });
        }
      }
    : undefined;

  const wrappedToggleAntiHighlight = onToggleAntiHighlight
    ? (k: string) => {
        const wasOn = !!antiHighlights?.has(k);
        onToggleAntiHighlight(k);
        if (!wasOn) {
          const label = sectionMeta.find((s) => s.key === k)?.label || k;
          toast(`✕ Cut "${label}"`, {
            action: { label: "Undo", onClick: () => onToggleAntiHighlight(k) },
            duration: 4000,
          });
        }
      }
    : undefined;

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorderFeatures) {
      const features = brief.core_features;
      const oldIndex = features.findIndex((_, i) => `feature-${i}` === active.id);
      const newIndex = features.findIndex((_, i) => `feature-${i}` === over.id);
      onReorderFeatures(arrayMove(features, oldIndex, newIndex));
    }
  };

  /* ─── Render helper: Keep / Cut chips (verbs, matches Vibe Stack vocab) ─── */
  const renderHighlightToggles = (
    key: string,
    isHighlighted: boolean | undefined,
    isAntiHighlighted: boolean | undefined,
    onToggle?: (k: string) => void,
    onAntiToggle?: (k: string) => void,
  ) => {
    if (!onToggle) return null;
    return (
      <div className="flex items-center gap-1.5 ml-auto">
        <button
          onClick={() => onToggle(key)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-all ${
            isHighlighted
              ? "bg-primary/20 border border-primary/40 text-primary"
              : "border border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary/80"
          }`}
          title={isHighlighted ? "Kept — click to undo" : "Keep this section (will shape the prompt)"}
        >
          <Sparkles size={10} className={isHighlighted ? "fill-primary" : ""} />
          {isHighlighted ? "Kept" : "Keep"}
        </button>
        {onAntiToggle && (
          <button
            onClick={() => onAntiToggle(key)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-all ${
              isAntiHighlighted
                ? "bg-destructive/15 border border-destructive/40 text-destructive"
                : "border border-border/50 text-muted-foreground hover:border-destructive/30 hover:text-destructive/80"
            }`}
            title={isAntiHighlighted ? "Cut — click to undo" : "Cut this from the prompt"}
          >
            ✕ {isAntiHighlighted ? "Cut" : "Cut"}
          </button>
        )}
      </div>
    );
  };

  const renderDeepDiveButton = (
    key: string,
    isExpanded: boolean,
    isLoadingThis: boolean,
    isHighlighted: boolean | undefined,
    onDive: (k: string) => void,
  ) => (
    <div className="flex justify-end mt-2">
      <button
        onClick={() => onDive(key)}
        disabled={isLoadingThis}
        className={`flex items-center gap-1.5 text-xs transition-colors px-2 py-1 rounded disabled:opacity-50 ${
          isHighlighted
            ? "text-primary hover:bg-primary/10 font-semibold"
            : "text-muted-foreground hover:text-primary hover:bg-muted/30"
        }`}
      >
        {isLoadingThis ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <ChevronDown size={12} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
        )}
        {isLoadingThis ? "Analyzing..." : isExpanded ? "Collapse" : isHighlighted ? "Go deeper on this section ✦" : "Go deeper on this section"}
      </button>
    </div>
  );

  const renderDeepDiveContent = (
    key: string,
    isExpanded: boolean,
    isLoadingThis: boolean,
    hasContent: boolean,
    content: Record<string, string>,
  ) => (
    <AnimatePresence>
      {isExpanded && (isLoadingThis || hasContent) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="mt-3 pl-4 border-l-2 border-primary/30">
            {isLoadingThis && !hasContent ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-3 rounded bg-muted animate-pulse" style={{ width: `${60 + n * 8}%` }} />
                ))}
              </div>
            ) : (
              <>
                <div className="prose prose-sm prose-invert max-w-none py-2">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="text-sm text-foreground/80 leading-relaxed mb-2">{children}</p>,
                      ul: ({ children }) => <ul className="space-y-1.5 mb-2">{children}</ul>,
                      li: ({ children }) => (
                        <li className="text-sm text-foreground/80 leading-relaxed flex gap-2">
                          <span className="text-primary mt-0.5 shrink-0">•</span>
                          <span>{children}</span>
                        </li>
                      ),
                      strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                    }}
                  >
                    {content[key]}
                  </ReactMarkdown>
                </div>
                {/* Deep-dive → loop footer.
                    "Pin & open Stack" replaces the old "Use in prompt" + "+ pin to stack"
                    duo so all sharpening converges on the Vibe Stack drawer. */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/30">
                  <button
                    onClick={() => handleAddDeepDiveToHighlights(key)}
                    className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-sm border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    <Star size={11} />
                    Add to highlights
                  </button>
                  {onAddToStack && stackHasItem && (() => {
                    const label = sectionMeta.find((s) => s.key === key)?.label || key;
                    const alreadyIn = stackHasItem("deep_dive", key, label);
                    return (
                      <button
                        onClick={() => handleUseDeepDiveInPrompt(key)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-sm bg-primary/10 border border-primary/40 text-primary hover:bg-primary/15 transition-colors"
                        title={alreadyIn ? "Already pinned — open the Vibe Stack to sharpen" : "Pin this insight and open the Vibe Stack"}
                      >
                        <Sparkles size={11} className={alreadyIn ? "fill-primary" : ""} />
                        {alreadyIn ? "Open in Stack" : "Pin & open Stack"}
                        <ArrowRight size={10} />
                      </button>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="py-8">
      {/* Compact header — no wasted vertical space */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="h-px flex-1 bg-border/30" />
        <p className="text-[10px] text-primary uppercase tracking-[0.3em]">
          {editMode ? `Refining · Round ${rounds.length + 1}` : `Simulation Complete · ${rounds.length} round${rounds.length !== 1 ? "s" : ""}`}
        </p>
        <div className="h-px flex-1 bg-border/30" />
      </motion.div>

      {/* Iterate-in-place banner */}
      {editMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-lg border border-primary/40 bg-primary/8"
          style={{ boxShadow: "0 0 28px hsl(var(--primary) / 0.12)" }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="font-display text-sm font-bold text-foreground">Refine in place</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Edit any section below, then re-simulate. Your highlights, deep-dives, and Vibe Stack carry forward.
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={onCancelEdit}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onReSimulate?.(editedBrief)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Wand2 size={12} />
                Re-simulate with these changes
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Full report — always visible */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Unified action row — PDF + Share are always visible.
            If not unlocked, clicking either opens an inline email field that
            sits in the same row (no full-width banner). */}
        <div className="flex flex-wrap gap-2 justify-end mb-4 items-center">
          {!showPrompt && (
            <form onSubmit={handleEmailSubmit} className="flex gap-2 mr-auto w-full sm:w-auto">
              <input
                type="email"
                placeholder="email to unlock PDF + share"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 sm:w-56 px-3 py-2 rounded-sm bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs px-3 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
              >
                <Mail size={12} />
                {isSubmitting ? "..." : "Unlock"}
              </button>
            </form>
          )}
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
            title={showPrompt ? "Download structured PDF" : "Add an email to download"}
          >
            <Download size={13} />
            {isExporting ? "Generating..." : "PDF"}
          </button>
          <button
            onClick={handleShareReport}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-sm border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
            title={showPrompt ? "Copy a shareable link" : "Add an email to share"}
          >
            {shareCopied ? <Check size={13} /> : <Share2 size={13} />}
            {shareCopied ? "Copied" : "Share"}
          </button>
        </div>

        <div ref={reportRef}>
          {/* Compact title — no decorative image, no logo card */}
          <div className="mb-6">
            <p className="text-[10px] text-primary uppercase tracking-[0.3em] mb-2">VibeCo AI Report</p>
            <h3 className="font-display text-2xl sm:text-3xl font-black text-foreground leading-tight break-words">
              {idea.slice(0, 80)}{idea.length > 80 ? "…" : ""}
            </h3>
            {/* Builder intent — quiet pill, no emoji */}
            {brief.builder_intent && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Building for{" "}
                <span className="text-foreground/80">
                  {brief.builder_intent === 'experiment' ? 'a quick experiment' :
                   brief.builder_intent === 'community' ? 'a community project' :
                   brief.builder_intent === 'lead-magnet' ? 'lead generation' :
                   brief.builder_intent === 'lifestyle' ? 'a lifestyle business' :
                   brief.builder_intent === 'venture' ? 'a venture-scale startup' :
                   brief.builder_intent === 'fun' ? 'fun' :
                   brief.builder_intent}
                </span>
              </p>
            )}
          </div>

          {/* Sticky sub-nav — quick jump between report regions */}
          <nav className="sticky top-16 z-30 -mx-2 mb-6 px-2 py-2 bg-background/85 backdrop-blur-md border-y border-border/40">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {navSections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className={`shrink-0 text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                    activeNavSection === s.id
                      ? "border-primary/60 bg-primary/15 text-primary font-semibold"
                      : "border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {s.label}
                  {s.id === "stress-test" && stackItems && stackItems.length > 0 && (
                    <span className="ml-1.5 text-[9px] opacity-70">{stackItems.length}</span>
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* ★ HERO: Single prompt block with three states (empty / shown / sharpening-diff) */}
          <motion.div
            id="fr-prompt"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8 scroll-mt-24"
          >
            {/* Persistent highlight summary banner — visible whenever there's input */}
              {(highlights && highlights.size > 0) || (antiHighlights && antiHighlights.size > 0) ? (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20"
                >
                  <Sparkles size={12} className="text-primary fill-primary shrink-0" />
                  <span className="text-xs text-primary truncate">
                    {highlights && highlights.size > 0 && (
                      <>
                        {highlights.size} highlight{highlights.size > 1 ? "s" : ""}
                      </>
                    )}
                    {antiHighlights && antiHighlights.size > 0 && (
                      <>
                        {highlights && highlights.size > 0 ? " · " : ""}
                        {antiHighlights.size} flag{antiHighlights.size > 1 ? "s" : ""}
                      </>
                    )}
                    {lovablePrompt ? " — sharpen from the Vibe Stack to apply" : " — generate the prompt to apply"}
                  </span>
                </motion.div>
              ) : null}

            {/* Diff view supersedes the regular prompt view while pending */}
            {pendingPrompt ? (
              <PromptDiff
                oldPrompt={lovablePrompt || ""}
                newPrompt={pendingPrompt}
                onKeep={handleAcceptPending}
                onRevert={handleRevertPending}
              />
            ) : lovablePrompt ? (
              <div className="border-2 border-primary/30 rounded-xl overflow-hidden bg-card/40"
                style={{ boxShadow: "0 0 32px -10px hsl(var(--primary) / 0.18)" }}
              >
                <div className="flex items-center justify-between px-4 py-2.5 bg-primary/8 border-b border-primary/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles size={12} className="text-primary shrink-0" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider truncate">
                      Your Lovable Prompt
                    </span>
                  </div>
                </div>
                <div className="p-4 max-h-72 overflow-y-auto">
                  <pre className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap font-sans">
                    {lovablePrompt}
                  </pre>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-muted/15 border-t border-border/30">
                  <button
                    onClick={handleCopyPromptWithHighlights}
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary px-3 py-2.5 rounded-sm hover:opacity-90 transition-opacity"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? "Copied" : highlights && highlights.size > 0 ? "Copy + highlights" : "Copy prompt"}
                  </button>
                  <a
                    href="https://lovable.dev"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary px-3 py-2.5 rounded-sm hover:opacity-90 transition-opacity"
                  >
                    Open in Lovable
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center bg-primary/5">
                <Sparkles size={20} className="text-primary mx-auto mb-2" />
                <p className="text-sm text-foreground mb-1 font-display font-semibold">Generate your build prompt</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Turn this brief into a Lovable-ready prompt you can paste and ship.
                </p>
                <button
                  onClick={handleGeneratePrompt}
                  disabled={isGeneratingPrompt}
                  className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isGeneratingPrompt ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {isGeneratingPrompt ? "Generating…" : "Generate Lovable prompt"}
                </button>
              </div>
            )}
          </motion.div>

          {/* Scale assessment — kept, but moved below prompt and tightened */}
          {brief.scale_assessment && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 px-4 py-3 rounded-lg border-l-2 ${
                brief.scale_assessment.fits_intent
                  ? "border-primary/50 bg-primary/5"
                  : "border-warning/50 bg-warning/5"
              }`}
            >
              <p className={`text-xs font-bold ${
                brief.scale_assessment.fits_intent ? "text-primary" : "text-warning"
              }`}>
                Scale: {brief.scale_assessment.current_scale.charAt(0).toUpperCase() + brief.scale_assessment.current_scale.slice(1)}
                {brief.scale_assessment.fits_intent ? " — matches your intent" : " — might not match your intent"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {brief.scale_assessment.recommendation}
              </p>
            </motion.div>
          )}

          {/* Hero sections — Problem & Core Features get dramatic treatment */}
          <div id="fr-brief" className="space-y-1 mb-8 scroll-mt-24">
            {sectionMeta.filter(s => s.key === "problem" || s.key === "core_features").map((section, i) => {
              const Icon = section.icon;
              const value = brief[section.key as keyof BriefData];
              const isExpanded = expandedSection === section.key;
              const isLoadingThis = deepDiveLoading === section.key;
              const hasContent = !!deepDiveContent[section.key];
              const isHighlighted = highlights?.has(section.key);
              const isAntiHighlighted = antiHighlights?.has(section.key);
              const isHero = section.key === "problem";

              return (
                <motion.div
                  key={section.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className={`relative p-6 sm:p-8 rounded-xl border ${
                    isHero
                      ? "border-primary/20 bg-gradient-to-br from-primary/8 via-transparent to-accent/5"
                      : "border-border/30 bg-card/40"
                  }`}
                  style={isHero ? { boxShadow: "0 0 40px -15px hsl(var(--primary) / 0.12)" } : {}}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={isHero ? 18 : 14} className="text-primary" />
                    <h4 className={`font-display font-black text-foreground uppercase tracking-wide ${isHero ? "text-base" : "text-sm"}`}>
                      {section.label}
                    </h4>
                    {editMode && editedSections.has(section.key) && (
                      <span className="text-[9px] text-primary tabular-nums" title="Edited — re-simulate to apply">● Edited</span>
                    )}
                    {renderHighlightToggles(section.key, isHighlighted, isAntiHighlighted, wrappedToggleHighlight, wrappedToggleAntiHighlight)}
                  </div>

                  {section.key === "core_features" && Array.isArray(value) ? (
                    <div>
                      {onReorderFeatures ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                          <SortableContext items={(value as BriefData["core_features"]).map((_, i) => `feature-${i}`)} strategy={verticalListSortingStrategy}>
                            <div className="grid gap-3">
                              {(value as BriefData["core_features"]).map((feat, fi) => (
                                <div key={`feature-${fi}`} className="flex items-start gap-2 group/featrow">
                                  <div className="flex-1">
                                    <SortableFeature feat={feat} index={fi} id={`feature-${fi}`} />
                                  </div>
                                  {onAddToStack && stackHasItem && (
                                    <div className="opacity-0 group-hover/featrow:opacity-100 transition-opacity mt-1.5">
                                      <AddToStackButton
                                        added={stackHasItem("highlight", "core_features", feat.name)}
                                        onAdd={() =>
                                          onAddToStack({
                                            kind: "highlight",
                                            source: "core_features",
                                            label: feat.name,
                                            content: `${feat.name} — ${feat.description}`,
                                          })
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      ) : (
                        <div className="grid gap-3">
                          {(value as BriefData["core_features"]).map((feat, fi) => (
                            <p key={fi} className="text-base text-foreground/90 leading-relaxed">
                              <span className="text-primary font-bold">{fi + 1}.</span>{" "}
                              <span className="font-semibold">{feat.name}</span> — {feat.description}
                            </p>
                          ))}
                        </div>
                      )}
                      {onReorderFeatures && (
                        <p className="text-[10px] text-muted-foreground/50 mt-3">
                          Drag to reorder by priority · #1 gets hero placement in your Lovable prompt
                        </p>
                      )}
                    </div>
                  ) : editMode ? (
                    <Textarea
                      value={(editedBrief[section.key as keyof BriefData] as string) || ""}
                      onChange={(e) =>
                        { setEditedBrief((prev) => ({ ...prev, [section.key]: e.target.value })); setEditedSections((prev) => new Set(prev).add(section.key)); }
                      }
                      className={`text-foreground/90 leading-relaxed bg-background/50 border-primary/30 focus-visible:ring-primary/40 ${isHero ? "min-h-[120px] text-base" : "min-h-[100px] text-base"}`}
                      placeholder={`Edit ${section.label.toLowerCase()}…`}
                    />
                  ) : (
                    <p className={`text-foreground/90 leading-relaxed ${isHero ? "text-base sm:text-lg" : "text-base"}`}>
                      {typeof value === "string" ? value : ""}
                    </p>
                  )}

                  {/* +stack — text sections */}
                  {!editMode && section.key !== "core_features" && typeof value === "string" && onAddToStack && stackHasItem && (
                    <div className="mt-2 flex justify-end">
                      <AddToStackButton
                        added={stackHasItem("highlight", section.key, section.label)}
                        onAdd={() =>
                          onAddToStack({
                            kind: "highlight",
                            source: section.key,
                            label: section.label,
                            content: value as string,
                          })
                        }
                      />
                    </div>
                  )}

                  {!editMode && renderDeepDiveButton(section.key, isExpanded, isLoadingThis, isHighlighted, handleDeepDive)}
                  {!editMode && renderDeepDiveContent(section.key, isExpanded, isLoadingThis, hasContent, deepDiveContent)}
                </motion.div>
              );
            })}
          </div>

          {/* Supporting sections — tighter, less visual weight */}
          <div
            className="p-px rounded-lg mb-8"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--border) / 0.3))",
            }}
          >
            <div className="p-5 sm:p-6 rounded-lg bg-background">
              <div className="grid gap-5">
                {sectionMeta.filter(s => s.key !== "problem" && s.key !== "core_features").map((section, i) => {
                  const Icon = section.icon;
                  const value = brief[section.key as keyof BriefData];
                  const isExpanded = expandedSection === section.key;
                  const isLoadingThis = deepDiveLoading === section.key;
                  const hasContent = !!deepDiveContent[section.key];
                  const isHighlighted = highlights?.has(section.key);
                  const isAntiHighlighted = antiHighlights?.has(section.key);

                  return (
                    <motion.div
                      key={section.key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} className="text-primary/70" />
                        <h4 className="font-display text-sm font-black text-foreground uppercase tracking-wide">
                          {section.label}
                        </h4>
                        {editMode && editedSections.has(section.key) && (
                          <span className="text-[9px] text-primary tabular-nums" title="Edited — re-simulate to apply">● Edited</span>
                        )}
                        {renderHighlightToggles(section.key, isHighlighted, isAntiHighlighted, wrappedToggleHighlight, wrappedToggleAntiHighlight)}
                      </div>

                      {editMode ? (
                        <Textarea
                          value={(editedBrief[section.key as keyof BriefData] as string) || ""}
                          onChange={(e) =>
                            { setEditedBrief((prev) => ({ ...prev, [section.key]: e.target.value })); setEditedSections((prev) => new Set(prev).add(section.key)); }
                          }
                          className="ml-5 text-sm bg-background/50 border-primary/30 focus-visible:ring-primary/40 min-h-[80px]"
                          placeholder={`Edit ${section.label.toLowerCase()}…`}
                        />
                      ) : (
                        <p className="text-sm text-foreground/90 leading-relaxed ml-5">
                          {typeof value === "string" ? value : ""}
                        </p>
                      )}

                      {!editMode && typeof value === "string" && onAddToStack && stackHasItem && (
                        <div className="ml-5 mt-2 flex justify-end">
                          <AddToStackButton
                            added={stackHasItem("highlight", section.key, section.label)}
                            onAdd={() =>
                              onAddToStack({
                                kind: "highlight",
                                source: section.key,
                                label: section.label,
                                content: value as string,
                              })
                            }
                          />
                        </div>
                      )}

                      {!editMode && renderDeepDiveButton(section.key, isExpanded, isLoadingThis, isHighlighted, handleDeepDive)}
                      {!editMode && renderDeepDiveContent(section.key, isExpanded, isLoadingThis, hasContent, deepDiveContent)}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* (Lovable Prompt now lives near the top — promoted to position 2) */}

        {/* Stress-test the whole idea — always visible */}
        <div id="fr-stress-test" className="scroll-mt-24">
          <ThunderdomePanel
            brief={brief}
            idea={idea}
            reportId={reportId}
            highlights={highlights}
            antiHighlights={antiHighlights}
            lovablePrompt={lovablePrompt}
            onPromptUpdate={onPromptUpdate}
          />
        </div>

        {/* Action Hub — always visible */}
        <div id="fr-actions" className="scroll-mt-24 mt-8">
          <ActionHub
            brief={brief}
            idea={idea}
            lovablePrompt={lovablePrompt}
            reportId={reportId}
            onIterate={onIterate ?? onRestart}
          />
        </div>

        <div className="flex flex-wrap gap-3 justify-center mt-10 pt-6 border-t border-border/30">
          {onIterate && !editMode && (
            <button
              onClick={onIterate}
              className="flex items-center gap-2 text-xs font-semibold text-primary px-4 py-2 rounded-sm border border-primary/40 hover:bg-primary/10 transition-colors"
            >
              <Wand2 size={12} />
              Refine this idea in place
            </button>
          )}
          <button
            onClick={onRestart}
            className="flex items-center gap-2 text-xs text-muted-foreground/60 px-4 py-2 rounded-sm hover:text-muted-foreground transition-colors"
          >
            <RotateCcw size={12} />
            Start over
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-xs text-muted-foreground/60 px-4 py-2 rounded-sm hover:text-muted-foreground transition-colors"
          >
            <ArrowLeft size={12} />
            Home
          </button>
        </div>

        {/* "What now?" cue — closes the loop after the user has copied the prompt */}
        {showPrompt && lovablePrompt && (
          <p className="text-[11px] text-muted-foreground/60 text-center mt-4">
            Built it?{" "}
            <button
              onClick={() => navigate("/my-simulations?import=1")}
              className="text-primary hover:underline underline-offset-2"
            >
              Paste your project URL to import as a child idea →
            </button>
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default FinalReport;
