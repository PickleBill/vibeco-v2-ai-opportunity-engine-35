import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowRight, Mail, Phone, FileText, CalendarClock } from "lucide-react";
import FadeIn from "./FadeIn";
import { useDiscoveryAudit } from "./discovery/DiscoveryAuditProvider";

const headlineWords = ["AI", "that", "reads", "your", "email", "and", "phone."];
const wordSpring = { type: "spring" as const, stiffness: 90, damping: 14 };

const capabilities = [
  { icon: FileText, label: "Quoting", desc: "Drafts and sends quotes from inbound requests." },
  { icon: Mail, label: "Order intake", desc: "Reads orders out of email and logs them clean." },
  { icon: CalendarClock, label: "Scheduling", desc: "Books, confirms, and reshuffles the calendar." },
  { icon: Phone, label: "Status-chasing", desc: "Follows up so nothing goes quiet or slips." },
];

const scrollTo = (id: string) =>
  document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });

const Hero = () => {
  const { open: openDiscovery } = useDiscoveryAudit();
  const prefersReduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const panelY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center pt-24 pb-20 overflow-hidden">
      {/* Subtle dual-accent background */}
      <div
        className="absolute top-0 right-0 w-2/3 h-2/3 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 80% 10%, hsl(var(--violet) / 0.10), transparent 60%)" }}
      />
      <div
        className="absolute bottom-0 left-0 w-1/2 h-1/2 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 10% 90%, hsl(var(--primary) / 0.06), transparent 60%)" }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full relative">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-16 lg:gap-14 items-center">
          <div>
            <FadeIn>
              <p className="text-sm font-semibold text-primary uppercase tracking-[0.22em] mb-7 flex items-center gap-3">
                <span className="w-8 h-px bg-primary" />
                Opportunity &rarr; Proof &rarr; Revenue
              </p>
            </FadeIn>

            <h1
              className="font-display font-extrabold text-foreground leading-[1.04] mb-6 break-words"
              style={{ fontSize: "clamp(2.25rem, 3.4vw + 1.25rem, 4.25rem)" }}
            >
              {prefersReduced ? (
                <>
                  AI that reads your email and phone.{" "}
                  <span className="text-primary">It handles the rest.</span>
                </>
              ) : (
                <>
                  {headlineWords.map((word, i) => (
                    <motion.span
                      key={i}
                      className="inline-block mr-[0.28em]"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...wordSpring, delay: 0.15 + i * 0.07 }}
                    >
                      {word}
                    </motion.span>
                  ))}
                  <motion.span
                    className="text-primary inline-block"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.15 + headlineWords.length * 0.07 }}
                  >
                    It handles the rest.
                  </motion.span>
                </>
              )}
            </h1>

            <FadeIn delay={0.4}>
              <p className="text-lg text-muted-foreground leading-relaxed mb-9 max-w-xl">
                A national logistics company proved the playbook at scale: an AI that reads
                inbound email and phone, then runs quoting, order intake, scheduling, and
                status-chasing. We build that same operations engine for companies too small
                to staff it themselves.
              </p>
            </FadeIn>

            <FadeIn delay={0.55}>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => scrollTo("#scan")}
                  className="font-display text-sm font-semibold bg-violet text-violet-foreground px-7 py-3.5 rounded-full hover:brightness-110 transition-all inline-flex items-center gap-2 shadow-violet"
                >
                  Run an opportunity scan
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={openDiscovery}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-foreground transition-colors px-2"
                >
                  Book a discovery audit
                </button>
              </div>
            </FadeIn>
          </div>

          {/* Editorial capability panel */}
          <FadeIn delay={0.4}>
            <motion.div style={{ y: prefersReduced ? 0 : panelY }}>
              <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-7 shadow-warm-lg">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
                  What the engine handles
                </p>
                <ul className="divide-y divide-border">
                  {capabilities.map((c) => (
                    <li key={c.label} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                      <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <c.icon size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-display text-sm font-bold text-foreground">{c.label}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{c.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
};

export default Hero;
