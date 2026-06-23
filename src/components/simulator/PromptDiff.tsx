import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, RotateCcw, Columns2, AlignLeft, Loader2 } from "lucide-react";
import { diffWords } from "diff";

interface Props {
  oldPrompt: string;
  newPrompt: string;
  onKeep: () => void;
  onRevert: () => void;
  isApplying?: boolean;
}

type ViewMode = "inline" | "side-by-side";

const PromptDiff = ({ oldPrompt, newPrompt, onKeep, onRevert, isApplying }: Props) => {
  const [view, setView] = useState<ViewMode>("inline");

  const parts = useMemo(() => diffWords(oldPrompt || "", newPrompt || ""), [oldPrompt, newPrompt]);
  const additions = parts.filter((p) => p.added).reduce((n, p) => n + (p.value.match(/\S+/g)?.length || 0), 0);
  const removals = parts.filter((p) => p.removed).reduce((n, p) => n + (p.value.match(/\S+/g)?.length || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="border-2 border-primary/40 rounded-xl overflow-hidden bg-card/40"
      style={{ boxShadow: "0 0 32px -10px hsl(var(--primary) / 0.25)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-primary/8 border-b border-primary/20 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Sharpened Prompt
          </span>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="text-primary">+{additions}</span>
            <span className="text-destructive/70">−{removals}</span>
          </div>
        </div>
        <button
          onClick={() => setView((v) => (v === "inline" ? "side-by-side" : "inline"))}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border/50 hover:border-border"
        >
          {view === "inline" ? <Columns2 size={11} /> : <AlignLeft size={11} />}
          {view === "inline" ? "Compare side-by-side" : "Inline view"}
        </button>
      </div>

      {/* Diff body */}
      <div className="max-h-80 overflow-y-auto">
        {view === "inline" ? (
          <pre className="p-4 text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap font-sans">
            {parts.map((part, i) => {
              if (part.added) {
                return (
                  <span
                    key={i}
                    className="bg-primary/15 text-primary rounded px-0.5"
                  >
                    {part.value}
                  </span>
                );
              }
              if (part.removed) {
                return (
                  <span
                    key={i}
                    className="bg-destructive/10 text-destructive/70 line-through rounded px-0.5"
                  >
                    {part.value}
                  </span>
                );
              }
              return <span key={i} className="text-foreground/70">{part.value}</span>;
            })}
          </pre>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-border/30">
            <div className="p-3">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-2">Before</p>
              <pre className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">
                {oldPrompt}
              </pre>
            </div>
            <div className="p-3">
              <p className="text-[9px] uppercase tracking-wider text-primary mb-2">After</p>
              <pre className="text-[11px] text-foreground/85 leading-relaxed whitespace-pre-wrap font-sans">
                {newPrompt}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-muted/15 border-t border-border/30">
        <button
          onClick={onRevert}
          disabled={isApplying}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground border border-border bg-background/50 px-3 py-2.5 rounded-sm hover:text-foreground hover:border-border/80 transition-colors disabled:opacity-50"
        >
          <RotateCcw size={13} />
          Revert
        </button>
        <button
          onClick={onKeep}
          disabled={isApplying}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary px-3 py-2.5 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isApplying ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {isApplying ? "Applying..." : "Keep new"}
        </button>
      </div>
    </motion.div>
  );
};

export default PromptDiff;
