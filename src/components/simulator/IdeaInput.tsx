import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Import, Pencil, Sparkle, Flag, Layers } from "lucide-react";
import ProjectImporter from "./ProjectImporter";

interface IterationContext {
  highlightCount: number;
  flagCount: number;
  roundCount: number;
  reportId?: string | null;
}

interface Props {
  onSubmit: (idea: string, meta?: { project_id?: string; lovable_project_id?: string | null }) => void;
  initialValue?: string;
  iterationContext?: IterationContext;
  onStartFresh?: () => void;
}

const placeholders = [
  "An app that connects dog owners with verified pet sitters, featuring real-time GPS tracking and instant booking…",
  "A SaaS tool that auto-generates investor updates from Stripe + HubSpot data — weekly digest, no editing required…",
  "A marketplace where laid-off engineers can sell 30-minute career strategy calls to mid-career PMs trying to break into FAANG…",
];

const IdeaInput = ({ onSubmit, initialValue, iterationContext, onStartFresh }: Props) => {
  const isIterating = !!iterationContext && (iterationContext.roundCount > 0 || iterationContext.highlightCount > 0);
  const [text, setText] = useState(initialValue || "");
  const [shaking, setShaking] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [focused, setFocused] = useState(false);
  // Import mode is gated behind ?import=1 until the manifest API ships.
  const importEnabled =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("import") === "1";
  const [importMode, setImportMode] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isTooShort = text.length > 0 && text.trim().length < 10;

  // Rotate placeholder while idle
  useEffect(() => {
    if (text.length > 0 || focused) return;
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % placeholders.length), 6000);
    return () => clearInterval(t);
  }, [text, focused]);

  // Auto-focus on mount with a brief glow that decays
  useEffect(() => {
    if (importMode) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [importMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 10) {
      setAttempted(true);
      triggerShake();
      return;
    }
    onSubmit(text.trim());
  };

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim().length >= 10) {
        onSubmit(text.trim());
      } else {
        setAttempted(true);
        triggerShake();
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-10"
      >
        <p className="text-[10px] text-primary uppercase tracking-[0.4em] mb-5 opacity-60">
          {isIterating ? "Continue Refining" : "AI Idea Simulator"}
        </p>
        <h1
          className="font-display font-black text-foreground leading-[1.1] mb-3 break-words"
          style={{ fontSize: "clamp(2.25rem, 5vw + 1rem, 4rem)" }}
        >
          {isIterating ? "What would you push further?" : "What are you building?"}
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {isIterating
            ? "Your prior rounds and highlights are preserved. Edit the idea or add what you'd change."
            : "Describe it, or pull in one of your existing projects. We'll stress-test every assumption."}
        </p>

        {isIterating && iterationContext && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center justify-center gap-1.5 mt-5"
          >
            {iterationContext.roundCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                <Layers size={10} />
                {iterationContext.roundCount} round{iterationContext.roundCount === 1 ? "" : "s"} preserved
              </span>
            )}
            {iterationContext.highlightCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Sparkle size={10} />
                {iterationContext.highlightCount} highlight{iterationContext.highlightCount === 1 ? "" : "s"}
              </span>
            )}
            {iterationContext.flagCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Flag size={10} />
                {iterationContext.flagCount} flag{iterationContext.flagCount === 1 ? "" : "s"}
              </span>
            )}
            {onStartFresh && (
              <button
                type="button"
                onClick={onStartFresh}
                className="text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors underline-offset-2 hover:underline ml-2"
              >
                Start fresh instead
              </button>
            )}
          </motion.div>
        )}

        {/* Segmented mode toggle — hidden during iteration AND until ?import=1 */}
        {!isIterating && importEnabled && (
          <>
            <div className="relative inline-flex items-center mt-6 p-1 rounded-md bg-card/40 border border-border/30">
              {[
                { id: false, label: "Describe", Icon: Pencil, beta: false },
                { id: true, label: "Import Project", Icon: Import, beta: true },
              ].map((opt) => {
                const active = importMode === opt.id;
                return (
                  <button
                    key={String(opt.id)}
                    type="button"
                    onClick={() => setImportMode(opt.id)}
                    className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-[11px] transition-colors duration-300"
                  >
                    {active && (
                      <motion.span
                        layoutId="mode-indicator"
                        className="absolute inset-0 rounded-sm bg-primary/15 border border-primary/25 -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <opt.Icon size={11} className={active ? "text-primary" : "text-muted-foreground"} />
                    <span className={active ? "text-primary" : "text-muted-foreground"}>{opt.label}</span>
                    {opt.beta && (
                      <span className="ml-0.5 text-[8px] uppercase tracking-wider px-1 py-px rounded-sm bg-warning/15 text-warning border border-warning/25 font-semibold">
                        Beta
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {importMode && (
              <p className="text-[10px] text-muted-foreground/60 mt-2 max-w-md mx-auto leading-snug">
                Beta — paste your project context manually. Auto-import is coming soon.
              </p>
            )}
          </>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {importMode ? (
          <motion.div
            key="import"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl"
          >
            <ProjectImporter
              onImport={(ideaText, meta) => {
                setText(ideaText);
                setImportMode(false);
                onSubmit(ideaText, meta);
              }}
            />
          </motion.div>
        ) : (
          <motion.form
            key="describe"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl"
          >
            <motion.div
              className="relative"
              animate={shaking ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
              transition={{ duration: 0.5 }}
            >
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={placeholders[placeholderIdx]}
                className={`w-full min-h-[200px] p-6 rounded-lg bg-transparent border text-foreground text-sm leading-relaxed placeholder:text-muted-foreground/30 focus:outline-none resize-none transition-all duration-300 ${
                  attempted && isTooShort
                    ? "border-destructive/40 focus:border-destructive/60"
                    : focused
                    ? "border-primary/40 shadow-[0_0_40px_-12px_hsl(var(--primary)/0.18)]"
                    : "border-border/20 hover:border-border/40"
                }`}
              />
              <div className="absolute bottom-3 right-4 flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground/40 hidden sm:inline">
                  ↵ to simulate · Shift+↵ for newline
                </span>
                <span
                  className={`text-[10px] tabular-nums transition-colors ${
                    attempted && isTooShort
                      ? "text-destructive/60"
                      : text.length > 0
                      ? "text-muted-foreground/50"
                      : "text-muted-foreground/25"
                  }`}
                >
                  {text.length}
                </span>
              </div>
            </motion.div>

            {attempted && isTooShort && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-destructive/70 mt-2 ml-1"
              >
                A bit more detail — at least 10 characters.
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={text.trim().length < 10}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm px-6 py-4 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-20 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.995 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <Sparkles size={16} />
              {isIterating ? "Continue with this idea" : "Simulate This Idea"}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IdeaInput;
