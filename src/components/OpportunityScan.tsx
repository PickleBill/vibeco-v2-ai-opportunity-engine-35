import { useState } from "react";
import FadeIn from "./FadeIn";
import { useDiscoveryAudit } from "./discovery/DiscoveryAuditProvider";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, FileText, Mail, CalendarClock, Phone, Inbox } from "lucide-react";

type Suggestion = { icon: typeof Mail; title: string; detail: string };

const ALL: Record<string, Suggestion> = {
  quote: { icon: FileText, title: "Automated quoting", detail: "Read inbound requests and draft accurate quotes in minutes, not hours." },
  order: { icon: Inbox, title: "Order intake", detail: "Pull orders out of email and messages, then log them clean and consistent." },
  schedule: { icon: CalendarClock, title: "Scheduling & confirmations", detail: "Book, confirm, and reshuffle appointments without the phone tag." },
  chase: { icon: Phone, title: "Status-chasing & follow-up", detail: "Keep every thread moving so nothing goes quiet or slips through." },
  inbox: { icon: Mail, title: "Inbox triage", detail: "Sort, route, and reply to routine email so your team only sees what matters." },
};

// Lightweight keyword heuristic — purely client-side, just to give a visitor a sense.
function scan(text: string): Suggestion[] {
  const t = text.toLowerCase();
  const picks = new Set<string>();
  if (/quot|estimat|pric|bid|proposal/.test(t)) picks.add("quote");
  if (/order|intake|form|request|booking/.test(t)) picks.add("order");
  if (/schedul|calendar|appointment|book|reschedul/.test(t)) picks.add("schedule");
  if (/follow|chase|status|update|reminder|late|overdue/.test(t)) picks.add("chase");
  if (/email|inbox|message|reply|respond|phone|call/.test(t)) picks.add("inbox");
  // Sensible defaults so the visitor always sees something useful.
  if (picks.size === 0) ["inbox", "quote", "schedule"].forEach((k) => picks.add(k));
  if (picks.size === 1) ["chase"].forEach((k) => picks.add(k));
  return Array.from(picks).slice(0, 4).map((k) => ALL[k]);
}

const OpportunityScan = () => {
  const { open: openDiscovery } = useDiscoveryAudit();
  const [text, setText] = useState("");
  const [results, setResults] = useState<Suggestion[] | null>(null);

  const run = () => {
    if (!text.trim()) return;
    setResults(scan(text));
  };

  return (
    <section id="scan" className="py-32 border-t border-border">
      <div className="max-w-3xl mx-auto px-6 lg:px-12">
        <FadeIn>
          <p className="text-sm text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
            <Sparkles size={14} /> Opportunity scan
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-4">
            Where could AI take work off your plate?
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-xl">
            Describe your business — or the bottleneck that eats your week. We'll point to where
            the engine tends to pay off first. No sign-up, no wait.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-warm">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run();
              }}
              rows={4}
              placeholder="e.g. We're a small wholesale supplier. Most of our day is answering email quotes and chasing customers for order confirmations."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none leading-relaxed"
              aria-label="Describe your business or bottleneck"
            />
            <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-border">
              <span className="text-[11px] text-muted-foreground">⌘ + Enter to scan</span>
              <button
                onClick={run}
                className="font-display text-sm font-semibold bg-primary text-primary-foreground px-5 py-2.5 rounded-full hover:brightness-110 transition-all inline-flex items-center gap-2"
              >
                Show me where AI helps
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </FadeIn>

        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-8"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
                A few places to start
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {results.map((r) => (
                  <div key={r.title} className="flex items-start gap-4 rounded-xl border border-border bg-surface p-5">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <r.icon size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-display text-sm font-bold text-foreground">{r.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">{r.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-violet/30 bg-violet/[0.06] p-5">
                <p className="text-sm text-foreground/80 leading-relaxed flex-1">
                  This is a quick read. A discovery audit turns it into a concrete plan — scoped to your real workflow.
                </p>
                <button
                  onClick={openDiscovery}
                  className="font-display text-sm font-semibold bg-violet text-violet-foreground px-6 py-3 rounded-full hover:brightness-110 transition-all inline-flex items-center gap-2 whitespace-nowrap shadow-violet"
                >
                  Book a discovery audit
                  <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default OpportunityScan;
