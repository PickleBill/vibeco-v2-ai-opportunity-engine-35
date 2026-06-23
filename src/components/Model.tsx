import { useState } from "react";
import FadeIn from "./FadeIn";
import { ChevronDown, Search, Hammer, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  {
    num: "01",
    title: "Find the opportunity",
    short: "We map where inbound email and phone are quietly eating your team's hours.",
    detail:
      "We sit with how the work actually flows — the quotes, the orders, the back-and-forth — and pinpoint the highest-leverage task an AI can take over first. No theory, just where the time goes.",
    icon: Search,
    iconColor: "text-primary",
  },
  {
    num: "02",
    title: "Build the proof",
    short: "We ship a working agent against your real workflow — not a slide deck.",
    detail:
      "A live agent runs quoting, order intake, scheduling, or status-chasing on your actual inbox and calls. You watch it handle real work before anything scales.",
    icon: Hammer,
    iconColor: "text-primary",
  },
  {
    num: "03",
    title: "Turn it into revenue",
    short: "Once it earns its keep, we widen the surface area and align on outcomes.",
    detail:
      "We expand the engine across more of your operation and structure the engagement around the result — so we're betting on the same outcome you are.",
    icon: TrendingUp,
    iconColor: "text-violet",
  },
];

const Model = () => {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <section id="model" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <FadeIn>
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-4">
            How the engine works
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-6">
            Opportunity. Proof. Revenue.
          </h2>
          <p className="text-sm text-foreground/80 mb-16 max-w-xl">
            The same path the playbook took at enterprise scale — compressed to fit a company your size.
          </p>
        </FadeIn>

        <div className="space-y-4">
          {steps.map((s, i) => {
            const isOpen = expanded === i;
            const StepIcon = s.icon;
            const isLast = i === steps.length - 1;
            return (
              <FadeIn key={s.num} delay={i * 0.1}>
                <button
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className={`w-full text-left relative bg-card border rounded-lg p-8 transition-all duration-500 overflow-hidden group ${
                    isOpen
                      ? isLast
                        ? "border-violet/50 shadow-warm"
                        : "border-primary/50 shadow-warm"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div
                    className={`absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none ${
                      isOpen ? "opacity-100" : "opacity-0"
                    }`}
                    style={{
                      background: isLast
                        ? "radial-gradient(circle, hsl(var(--violet) / 0.2), transparent)"
                        : "radial-gradient(circle, hsl(var(--primary) / 0.2), transparent)",
                    }}
                  />
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-6">
                      <span
                        className={`font-display text-4xl font-black leading-none ${
                          isLast ? "text-violet/30" : "text-primary/20"
                        }`}
                      >
                        {s.num}
                      </span>
                      <div>
                        <h3 className="font-display text-xl font-bold text-foreground mb-2">
                          {s.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {s.short}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-muted-foreground shrink-0 mt-1 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 ml-16 border-t border-border pt-4 flex items-start gap-5">
                          <motion.div
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                            className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border ${
                              isLast
                                ? "bg-violet/10 border-violet/20"
                                : "bg-primary/10 border-primary/20"
                            }`}
                          >
                            <StepIcon size={22} className={s.iconColor} />
                          </motion.div>
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            {s.detail}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </FadeIn>
            );
          })}
        </div>

        {/* Visual step flow */}
        <FadeIn delay={0.4}>
          <div className="mt-12 flex items-center justify-center gap-4">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
                    <s.icon size={16} className={s.iconColor} />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{s.title}</span>
                </div>
                {i < steps.length - 1 && <div className="w-12 h-px bg-border" />}
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.5}>
          <p className="text-center text-xs text-muted-foreground mt-10 tracking-wide">
            Proven at enterprise scale · Built for your size · Biased toward shipping
          </p>
        </FadeIn>
      </div>
    </section>
  );
};

export default Model;
