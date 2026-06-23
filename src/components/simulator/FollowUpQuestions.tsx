import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles, SkipForward } from "lucide-react";
import type { QuestionData } from "./SimulatorShell";

interface Props {
  questions: QuestionData[];
  onSubmit: (answers: Record<number, { selected: string[]; freeText?: string }>) => void;
  onSkipToFinal: (answers: Record<number, { selected: string[]; freeText?: string }>) => void;
  isLoading: boolean;
  round: number;
  highlights?: Set<string>;
  onToggleHighlight?: (key: string) => void;
  depthRecommendation?: string;
}

const FollowUpQuestions = ({ questions, onSubmit, onSkipToFinal, isLoading, round, highlights, onToggleHighlight, depthRecommendation }: Props) => {
  const [answers, setAnswers] = useState<Record<number, { selected: string[]; freeText?: string }>>({});

  const toggleOption = (qIndex: number, label: string, allowMultiple: boolean) => {
    setAnswers((prev) => {
      const current = prev[qIndex]?.selected || [];
      let next: string[];
      if (allowMultiple) {
        next = current.includes(label)
          ? current.filter((l) => l !== label)
          : [...current, label];
      } else {
        next = current.includes(label) ? [] : [label];
      }
      return { ...prev, [qIndex]: { ...prev[qIndex], selected: next, freeText: prev[qIndex]?.freeText } };
    });
  };

  const setFreeText = (qIndex: number, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qIndex]: { selected: prev[qIndex]?.selected || [], freeText: text },
    }));
  };

  const hasAnyAnswer = Object.values(answers).some(
    (a) => (a?.selected?.length || 0) > 0 || (a?.freeText?.trim()?.length || 0) > 0
  );

  const buildFinalAnswers = () => {
    const final: Record<number, { selected: string[]; freeText?: string }> = {};
    questions.forEach((_, qi) => {
      const a = answers[qi];
      if (a?.selected?.length || a?.freeText?.trim()) {
        final[qi] = {
          selected: a.selected || [],
          freeText: a.freeText?.trim() || undefined,
        };
      }
    });
    return final;
  };

  const handleRefine = () => {
    if (!hasAnyAnswer) return;
    onSubmit(buildFinalAnswers());
  };

  const handleGenerateNow = () => {
    onSkipToFinal(buildFinalAnswers());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mb-12"
    >
      {/* Optional questions header */}
      <div className="text-center mb-6">
        <h3 className="font-display text-lg sm:text-xl font-bold text-foreground mb-1">
          Sharpen your analysis <span className="text-muted-foreground font-normal">(optional)</span>
        </h3>
        <p className="text-xs text-muted-foreground">
          Answer any question, write your own take, or skip ahead.
        </p>
      </div>

      <div className="grid gap-5">
        {questions.map((q, qi) => {
          const hasSelection = (answers[qi]?.selected?.length || 0) > 0;
          const hasFreeText = (answers[qi]?.freeText?.trim()?.length || 0) > 0;
          const isAnswered = hasSelection || hasFreeText;
          return (
            <motion.div
              key={qi}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + qi * 0.08 }}
              className={`p-5 rounded-lg border transition-all duration-300 ${
                isAnswered
                  ? "bg-primary/5 border-primary/30"
                  : "bg-card/40 border-border/50"
              }`}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  isAnswered ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {isAnswered ? <CheckCircle2 size={14} /> : <span className="text-[10px] font-bold">{qi + 1}</span>}
                </div>
                <div>
                  <p className="text-sm text-foreground font-medium leading-snug">
                    {q.question}
                  </p>
                  <span className="text-[10px] text-muted-foreground/60 mt-1 inline-block">
                    {q.allow_multiple ? "Select any that apply, write your own, or both" : "Pick what fits, write your own, or both"}
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2 ml-9">
                {q.options.map((opt) => {
                  const isSelected = answers[qi]?.selected?.includes(opt.label);
                  return (
                    <motion.button
                      key={opt.label}
                      type="button"
                      onClick={() => toggleOption(qi, opt.label, q.allow_multiple)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative text-left px-4 py-3.5 rounded-lg text-sm transition-all duration-200 border ${
                        isSelected
                          ? "bg-primary/15 border-primary/50 text-foreground shadow-sm"
                          : "bg-background/50 border-border/40 text-muted-foreground hover:border-primary/25 hover:text-foreground hover:bg-card/60"
                      }`}
                    >
                      <span className="font-semibold block text-[13px]">{opt.label}</span>
                      <span className="block text-[11px] mt-1 opacity-60 leading-snug">{opt.description}</span>
                      {isSelected && (
                        <motion.div
                          layoutId={`sel-${qi}-${opt.label}`}
                          className="absolute top-2 right-2"
                        >
                          <CheckCircle2 size={14} className="text-primary" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}

                {/* Key insight toggle for this question */}
                {onToggleHighlight && (answers[qi]?.selected?.length || 0) > 0 && (
                  (() => {
                    const highlightKey = `q${qi}-round${round}`;
                    const isHighlighted = highlights?.has(highlightKey);
                    return (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        type="button"
                        onClick={() => onToggleHighlight(highlightKey)}
                        className={`col-span-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] transition-all duration-200 border ${
                          isHighlighted
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "bg-muted/20 border-border/30 text-muted-foreground/50 hover:text-primary hover:border-primary/25"
                        }`}
                      >
                        <Sparkles size={10} className={isHighlighted ? "fill-primary" : ""} />
                        {isHighlighted ? "✦ Key insight" : "✦ This is key"}
                      </motion.button>
                    );
                  })()
                )}
              </div>

              <div className="ml-9 mt-3">
                <textarea
                  rows={2}
                  placeholder="Add your own thoughts (counts as your answer with or without selecting above)..."
                  value={answers[qi]?.freeText || ""}
                  onChange={(e) => setFreeText(qi, e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md bg-background/50 border border-border/30 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:bg-background/80 transition-colors resize-none"
                />
                {hasFreeText && (
                  <p className="text-[10px] text-primary mt-1">
                    ✓ Your input will be included
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom actions — Refine is primary, Skip is secondary */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <motion.button
          onClick={handleRefine}
          disabled={!hasAnyAnswer || isLoading}
          className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold px-5 py-3.5 rounded-md transition-all duration-300 ${
            hasAnyAnswer
              ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg"
              : "bg-muted text-muted-foreground/50 cursor-not-allowed"
          }`}
          whileHover={hasAnyAnswer ? { scale: 1.01 } : {}}
          whileTap={hasAnyAnswer ? { scale: 0.99 } : {}}
          style={hasAnyAnswer ? { boxShadow: "0 0 20px hsl(var(--primary) / 0.2)" } : {}}
        >
          Refine Brief
          <ArrowRight size={14} />
        </motion.button>

        <motion.button
          onClick={handleGenerateNow}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 text-sm px-5 py-3.5 rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <SkipForward size={14} />
          Skip to Report
        </motion.button>
      </div>

      {depthRecommendation === "ready" && (
        <p className="text-[10px] text-primary/70 text-center mt-3">
          ✦ Strong signal — your report will be solid. Skip ahead anytime.
        </p>
      )}
    </motion.div>
  );
};

export default FollowUpQuestions;
