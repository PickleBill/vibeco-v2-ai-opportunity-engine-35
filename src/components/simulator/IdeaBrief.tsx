import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Users,
  Layers,
  DollarSign,
  TrendingUp,
  Eye,
  MessageSquare,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Mail, Sparkles } from "lucide-react";
import type { BriefData } from "./SimulatorShell";

interface Props {
  brief: BriefData;
  round: number;
  conceptImage?: string | null;
  unlocked?: boolean;
  onUnlock?: (email: string) => void;
  highlights?: Set<string>;
  onToggleHighlight?: (key: string) => void;
  antiHighlights?: Set<string>;
  onToggleAntiHighlight?: (key: string) => void;
}

const HERO_KEYS = ["problem", "core_features"] as const;
const TENSION_KEYS = ["investor_perspective", "customer_perspective"] as const;
const SUPPORT_KEYS = ["target_customer", "revenue_model", "industry_trends"] as const;

const labels: Record<string, string> = {
  problem: "Problem / Opportunity",
  target_customer: "Target Customer",
  core_features: "Core Features",
  revenue_model: "Revenue Model",
  industry_trends: "Industry & Competitors",
  investor_perspective: "What Investors Would Ask",
  customer_perspective: "What Customers Would Say",
};

const icons: Record<string, LucideIcon> = {
  problem: AlertTriangle,
  target_customer: Users,
  core_features: Layers,
  revenue_model: DollarSign,
  industry_trends: TrendingUp,
  investor_perspective: Eye,
  customer_perspective: MessageSquare,
};

// Quiet typography — no emoji
const intentLabels: Record<string, string> = {
  experiment: "a quick experiment",
  community: "a community project",
  "lead-magnet": "lead generation",
  lifestyle: "a lifestyle business",
  venture: "a venture-scale startup",
  fun: "fun",
};

/* ----------------------------- Helpers ----------------------------- */

const HighlightChips = ({
  sectionKey,
  isHighlighted,
  isAntiHighlighted,
  onToggleHighlight,
  onToggleAntiHighlight,
  compact,
}: {
  sectionKey: string;
  isHighlighted: boolean;
  isAntiHighlighted: boolean;
  onToggleHighlight?: (k: string) => void;
  onToggleAntiHighlight?: (k: string) => void;
  compact?: boolean;
}) => {
  if (!onToggleHighlight) return null;
  const sz = compact ? 9 : 10;
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onToggleHighlight(sectionKey)}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] transition-all ${
          isHighlighted
            ? "bg-primary/20 text-primary border border-primary/30"
            : "bg-muted/30 text-muted-foreground/60 border border-transparent hover:text-primary hover:bg-primary/10"
        }`}
        title={isHighlighted ? "Kept — click to undo" : "Keep this section"}
      >
        <Sparkles size={sz} className={isHighlighted ? "fill-primary" : ""} />
        {isHighlighted ? "Kept" : "Keep"}
      </button>
      {onToggleAntiHighlight && (
        <button
          onClick={() => onToggleAntiHighlight(sectionKey)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-all ${
            isAntiHighlighted
              ? "bg-destructive/15 border border-destructive/40 text-destructive"
              : "border border-border/50 text-muted-foreground/60 hover:border-destructive/30 hover:text-destructive/80"
          }`}
          title={isAntiHighlighted ? "Cut — click to undo" : "Cut from prompt"}
        >
          ✕ {isAntiHighlighted ? "Cut" : "Cut"}
        </button>
      )}
    </div>
  );
};

/* ----------------------------- Sticky brief sub-nav ----------------------------- */

const BriefSubNav = () => {
  const [active, setActive] = useState<string>("analysis");
  const sections = [
    { id: "analysis", label: "Analysis" },
    { id: "tension", label: "Tension" },
    { id: "support", label: "Support" },
  ];
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id.replace("brief-", ""));
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    sections.forEach((s) => {
      const el = document.getElementById(`brief-${s.id}`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);
  return (
    <nav className="sticky top-16 z-30 -mx-2 mb-6 px-2 py-2 bg-background/85 backdrop-blur-md border-y border-border/40">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              const el = document.getElementById(`brief-${s.id}`);
              if (!el) return;
              const top = el.getBoundingClientRect().top + window.scrollY - 96;
              window.scrollTo({ top, behavior: "smooth" });
            }}
            className={`shrink-0 text-[11px] px-3 py-1.5 rounded-full border transition-all ${
              active === s.id
                ? "border-primary/60 bg-primary/15 text-primary font-semibold"
                : "border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </nav>
  );
};

/* ============================== Main ============================== */

const IdeaBrief = ({
  brief,
  round,
  highlights,
  onToggleHighlight,
  antiHighlights,
  onToggleAntiHighlight,
}: Props) => {
  const isHighlighted = (k: string) => !!highlights?.has(k);
  const isAnti = (k: string) => !!antiHighlights?.has(k);

  return (
    <div className="mb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Target size={12} className="text-primary" />
          <span className="text-[10px] text-primary uppercase tracking-wider">
            {round <= 1 ? "Initial Analysis" : `Refined · Round ${round}`}
          </span>
        </div>

        {brief.builder_intent && (
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[11px] text-accent">
              Building for {intentLabels[brief.builder_intent] || brief.builder_intent}
            </span>
          </div>
        )}

        <h2 className="font-display text-2xl sm:text-3xl font-black text-foreground break-words">
          {round <= 1 ? "Your Idea, Analyzed" : `Deeper Insights — Round ${round}`}
        </h2>
        <p className="text-xs text-muted-foreground mt-2">
          {round <= 1
            ? "Here's what we found. Answer questions to go deeper."
            : "Updated based on your input. Keep refining or skip to your report."}
        </p>
        {highlights && highlights.size > 0 && (
          <p className="text-[10px] text-primary/70 mt-1">
            ✦ {highlights.size} kept — these will shape your final prompt
          </p>
        )}
      </motion.div>

      {/* Sticky sub-nav for the brief phase */}
      <BriefSubNav />

      {/* Scale assessment callout */}
      {brief.scale_assessment && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className={`mb-6 p-4 rounded-lg border ${
            brief.scale_assessment.fits_intent
              ? "border-primary/30 bg-primary/5"
              : "border-warning/30 bg-warning/5"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
              brief.scale_assessment.fits_intent
                ? "bg-primary/15 text-primary"
                : "bg-warning/15 text-warning"
            }`}>
              {brief.scale_assessment.fits_intent ? "✓" : "⚖"}
            </div>
            <div>
              <p className={`text-xs font-bold ${
                brief.scale_assessment.fits_intent ? "text-primary" : "text-warning"
              }`}>
                Scale: {brief.scale_assessment.current_scale.charAt(0).toUpperCase() + brief.scale_assessment.current_scale.slice(1)}
                {brief.scale_assessment.fits_intent ? " — matches your intent" : " — might not match your intent"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {brief.scale_assessment.recommendation}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Concept image removed — was decorative filler with zero decision-value */}

      {/* ============ TIER 1: HERO — Problem + Core Features ============ */}
      <div id="brief-analysis" className="space-y-8 mb-12 scroll-mt-24">
        {HERO_KEYS.map((key, i) => {
          const Icon = icons[key];
          const value = brief[key as keyof BriefData];
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative pl-4 sm:pl-6 border-l-2 border-primary/30"
            >
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Icon size={18} className="text-primary" />
                  <h3 className="font-display text-base font-black text-foreground uppercase tracking-wide">
                    {labels[key]}
                  </h3>
                </div>
                <HighlightChips
                  sectionKey={key}
                  isHighlighted={isHighlighted(key)}
                  isAntiHighlighted={isAnti(key)}
                  onToggleHighlight={onToggleHighlight}
                  onToggleAntiHighlight={onToggleAntiHighlight}
                />
              </div>
              {key === "core_features" && Array.isArray(value) ? (
                <div className="grid gap-3">
                  {(value as BriefData["core_features"]).map((feat, fi) => (
                    <div key={fi} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Zap size={12} className="text-primary" />
                      </div>
                      <p className="text-base sm:text-lg text-foreground/90 leading-relaxed flex-1">
                        <span className="font-semibold text-foreground">{feat.name}</span>
                        <span className="text-muted-foreground"> — {feat.description}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-base sm:text-lg text-foreground/90 leading-relaxed">
                  {typeof value === "string" ? value : ""}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ============ TIER 2: TENSION — Investor vs Customer dialogue ============ */}
      <motion.div
        id="brief-tension"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-12 scroll-mt-24"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em]">
            Two voices in the room
          </span>
          <div className="flex-1 h-px bg-border/30" />
        </div>
        <div className="grid sm:grid-cols-2 gap-px bg-border/30 rounded-lg overflow-hidden">
          {TENSION_KEYS.map((key) => {
            const Icon = icons[key];
            const value = brief[key as keyof BriefData];
            const isInvestor = key === "investor_perspective";
            return (
              <div
                key={key}
                className={`relative p-5 bg-card/50 ${
                  isHighlighted(key) ? "ring-1 ring-inset ring-primary/40 bg-primary/5" : ""
                } ${isAnti(key) ? "ring-1 ring-inset ring-destructive/30 bg-destructive/5" : ""}`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={isInvestor ? "text-amber-400" : "text-emerald-400"} />
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                      isInvestor ? "text-amber-400/80" : "text-emerald-400/80"
                    }`}>
                      {isInvestor ? "Investor" : "Customer"}
                    </span>
                  </div>
                  <HighlightChips
                    sectionKey={key}
                    isHighlighted={isHighlighted(key)}
                    isAntiHighlighted={isAnti(key)}
                    onToggleHighlight={onToggleHighlight}
                    onToggleAntiHighlight={onToggleAntiHighlight}
                    compact
                  />
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed italic">
                  {typeof value === "string" ? `"${value}"` : ""}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ============ TIER 3: SUPPORTING — left-rule strip, NO per-row chips ============ */}
      <div id="brief-support" className="space-y-4 scroll-mt-24">
        {SUPPORT_KEYS.map((key, i) => {
          const Icon = icons[key];
          const value = brief[key as keyof BriefData];
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`group relative pl-4 py-3 border-l transition-colors ${
                isHighlighted(key)
                  ? "border-primary/50"
                  : isAnti(key)
                  ? "border-destructive/40"
                  : "border-border/40 hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={12} className="text-muted-foreground" />
                <h3 className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">
                  {labels[key]}
                </h3>
                {/* Tier-3 chips removed — header chip on hero + Vibe Stack handle this */}
              </div>
              <p className="text-sm text-foreground/75 leading-relaxed">
                {typeof value === "string" ? value : ""}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default IdeaBrief;
