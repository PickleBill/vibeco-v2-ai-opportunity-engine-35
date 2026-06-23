import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Maximize2, Minimize2, Sparkles, ChevronRight } from "lucide-react";
import PerspectivesPanel from "./PerspectivesPanel";
import ExpandContractPanel from "./ExpandContractPanel";
import SynthesisPanel from "./SynthesisPanel";
import type { BriefData } from "./SimulatorShell";

type ThunderdomeTab = "synthesis" | "perspectives" | "expand" | "contract";

interface Props {
  brief: BriefData;
  idea: string;
  reportId?: string | null;
  highlights?: Set<string>;
  antiHighlights?: Set<string>;
  lovablePrompt?: string | null;
  onPromptUpdate?: (prompt: string) => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const ThunderdomePanel = ({
  brief,
  idea,
  reportId,
  highlights,
  antiHighlights,
  lovablePrompt,
  onPromptUpdate,
}: Props) => {
  const [activeTab, setActiveTab] = useState<ThunderdomeTab>("synthesis");
  const [lensesOpen, setLensesOpen] = useState(false);

  const secondaryTabs = [
    { id: "perspectives" as const, label: "Perspectives", icon: Zap, description: "5 personas, one at a time" },
    { id: "expand" as const, label: "Expand", icon: Maximize2, description: "What else could this be?" },
    { id: "contract" as const, label: "Distill", icon: Minimize2, description: "What's the one thing?" },
  ];

  return (
    <div className="mb-8 relative">
      {/* Quiet 1px top accent line — replaces decorative gradient */}
      <div className="absolute top-0 inset-x-0 -mx-6 sm:-mx-8 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: EASE }}
        className="relative z-10 pt-8 pb-2"
      >
        {/* Mode-shift header */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20"
          >
            <Zap size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-black text-foreground tracking-tight">Stress-test the whole idea</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Run all 7 agents at once · or explore one lens at a time
            </p>
          </div>
        </div>

        {/* PRIMARY: Auto-Analyze — full-width, dominant */}
        <button
          onClick={() => setActiveTab("synthesis")}
          className={`w-full flex items-center justify-between gap-3 px-5 py-4 rounded-xl border-2 mb-4 transition-all ${
            activeTab === "synthesis"
              ? "bg-primary/10 border-primary/50 shadow-sm ring-2 ring-primary/15"
              : "bg-primary/5 border-primary/30 hover:border-primary/50 hover:bg-primary/8"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles size={16} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="font-display text-sm font-bold text-foreground">Auto-Analyze</p>
              <p className="text-[11px] text-muted-foreground">All 7 agents in parallel + synthesis</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary px-2 py-1 rounded-full bg-primary/10">
            Recommended
          </span>
        </button>

        {/* SECONDARY: Collapsed disclosure for individual lenses */}
        <button
          onClick={() => setLensesOpen((v) => !v)}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-2 px-1 hover:text-muted-foreground transition-colors"
        >
          <ChevronRight
            size={11}
            className={`transition-transform duration-300 ${lensesOpen ? "rotate-90" : ""}`}
            style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
          Or explore one lens at a time
        </button>

        <AnimatePresence initial={false}>
          {lensesOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-2 mb-4 pt-1">
                {secondaryTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg text-xs transition-all border ${
                        isActive
                          ? "bg-card/60 border-primary/40 text-foreground shadow-sm"
                          : "bg-card/20 border-border/30 text-muted-foreground hover:border-border/60 hover:text-foreground"
                      }`}
                    >
                      <Icon size={14} className={isActive ? "text-primary" : ""} />
                      <span className="font-semibold">{tab.label}</span>
                      <span className="text-[9px] text-muted-foreground hidden sm:block">{tab.description}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div className="h-px bg-border/30 mb-6 mt-4" />

        {/* Tab content with animation */}
        <AnimatePresence mode="wait">
          {activeTab === "synthesis" && (
            <motion.div key="synthesis" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: EASE }}>
              <SynthesisPanel
                brief={brief}
                idea={idea}
                reportId={reportId}
                highlights={highlights}
                antiHighlights={antiHighlights}
                lovablePrompt={lovablePrompt}
                onPromptUpdate={onPromptUpdate}
              />
            </motion.div>
          )}
          {activeTab === "perspectives" && (
            <motion.div key="perspectives" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: EASE }}>
              <PerspectivesPanel brief={brief} idea={idea} reportId={reportId} />
            </motion.div>
          )}
          {activeTab === "expand" && (
            <motion.div key="expand" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: EASE }}>
              <ExpandContractPanel mode="expand" brief={brief} idea={idea} highlights={highlights} antiHighlights={antiHighlights} reportId={reportId} />
            </motion.div>
          )}
          {activeTab === "contract" && (
            <motion.div key="contract" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: EASE }}>
              <ExpandContractPanel mode="contract" brief={brief} idea={idea} highlights={highlights} antiHighlights={antiHighlights} reportId={reportId} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ThunderdomePanel;
