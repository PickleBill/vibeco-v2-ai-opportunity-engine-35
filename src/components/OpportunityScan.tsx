import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FadeIn from "./FadeIn";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Sparkles, FileText, Mail, CalendarClock, Phone, Inbox, Radar,
  Loader2, ExternalLink, CheckCircle2, AlertTriangle, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Suggestion = { icon: typeof Mail; title: string; detail: string };

const ALL: Record<string, Suggestion> = {
  quote: { icon: FileText, title: "Automated quoting", detail: "Read inbound requests and draft accurate quotes in minutes, not hours." },
  order: { icon: Inbox, title: "Order intake", detail: "Pull orders out of email and messages, then log them clean and consistent." },
  schedule: { icon: CalendarClock, title: "Scheduling & confirmations", detail: "Book, confirm, and reshuffle appointments without the phone tag." },
  chase: { icon: Phone, title: "Status-chasing & follow-up", detail: "Keep every thread moving so nothing goes quiet or slips through." },
  inbox: { icon: Mail, title: "Inbox triage", detail: "Sort, route, and reply to routine email so your team only sees what matters." },
};

function keywordScan(text: string): Suggestion[] {
  const t = text.toLowerCase();
  const picks = new Set<string>();
  if (/quot|estimat|pric|bid|proposal/.test(t)) picks.add("quote");
  if (/order|intake|form|request|booking/.test(t)) picks.add("order");
  if (/schedul|calendar|appointment|book|reschedul/.test(t)) picks.add("schedule");
  if (/follow|chase|status|update|reminder|late|overdue/.test(t)) picks.add("chase");
  if (/email|inbox|message|reply|respond|phone|call/.test(t)) picks.add("inbox");
  if (picks.size === 0) ["inbox", "quote", "schedule"].forEach((k) => picks.add(k));
  if (picks.size === 1) ["chase"].forEach((k) => picks.add(k));
  return Array.from(picks).slice(0, 4).map((k) => ALL[k]);
}

// ─── live scan plumbing ────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit", hackernews: "Hacker News", firecrawl: "review sites",
  ai_gateway_scout: "AI scout", anthropic_web_search: "Claude web search",
  perplexity_sonar: "Perplexity", ai_synth: "AI synth", web: "Web",
  trustpilot_review: "Trustpilot", g2_review: "G2", capterra_review: "Capterra",
};
const niceSource = (s: string) => SOURCE_LABELS[s] ?? s;

const MOTION_LABEL: Record<string, string> = {
  build: "Build a tool",
  sell: "Pre-sell a service",
  partner: "Partner",
};
const motionLabel = (m: string) => MOTION_LABEL[(m || "").toLowerCase()] ?? m;

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "vertical";

const shortRand = () => Math.random().toString(36).slice(2, 8);

function getClientKey(): string {
  try {
    const KEY = "vibeco.clientKey";
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = (crypto as any)?.randomUUID?.() ?? `c-${Date.now()}-${shortRand()}`;
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return `c-${Date.now()}-${shortRand()}`;
  }
}

interface Opp {
  rank: number; title: string; problem: string; build: string; customer: string;
  motion: string; effort: string; roi: string; confidence: number; based_on: string[];
}
interface RawSource { id: string; title: string | null; source: string; source_url: string | null; }

type Step = { name: string; status: string; posts: number; note?: string };

const STAGES = ["Collecting public signal", "Clustering pain", "Drafting opportunities"] as const;

const OpportunityScan = () => {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [teaser, setTeaser] = useState<Suggestion[] | null>(null);

  // live scan state
  const [running, setRunning] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [adapterSteps, setAdapterSteps] = useState<Step[]>([]);
  const [productTag, setProductTag] = useState<string | null>(null);
  const [vertical, setVertical] = useState<string>("");
  const [opps, setOpps] = useState<Opp[] | null>(null);
  const [evidenceCount, setEvidenceCount] = useState<number | null>(null);
  const [evidenceSamples, setEvidenceSamples] = useState<RawSource[]>([]);
  const [expandedOpp, setExpandedOpp] = useState<number | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  useEffect(() => { getClientKey(); }, []);

  const showTeaser = () => {
    if (!text.trim()) return;
    setTeaser(keywordScan(text));
  };

  const runLiveScan = async () => {
    const input = text.trim();
    if (!input || input.length < 3) return;
    setErrMsg(null);
    setRateLimited(false);
    setOpps(null);
    setEvidenceCount(null);
    setEvidenceSamples([]);
    setExpandedOpp(null);
    setAdapterSteps([]);
    setStageIdx(0);
    setRunning(true);

    const tag = `scan-${slug(input).slice(0, 40)}-${shortRand()}`;
    setProductTag(tag);
    setVertical(input);
    const client_key = getClientKey();
    const keywords = Array.from(new Set([input, `${input} software`, `${input} complaints`]));

    try {
      // ── 1. collect ─────────────────────────────────────────────────
      setStageIdx(0);
      const { data: collected, error: cErr } = await supabase.functions.invoke("signal-collect", {
        body: {
          product: tag,
          vertical: input,
          keywords,
          lookback_days: 30,
          tier: "lite",
          client_key,
          persist: true,
        },
      });
      if (cErr) {
        // Try to surface the 429 body that supabase-js wraps in FunctionsHttpError.
        const ctx: any = (cErr as any).context;
        let body: any = null;
        try { body = ctx && typeof ctx.json === "function" ? await ctx.json() : null; } catch {}
        if (ctx?.status === 429 || body?.rate_limited) {
          setRateLimited(true);
          setErrMsg(body?.error || "You've hit the free limit of 3 scans per hour — sign in for full, unlimited scans.");
          setRunning(false);
          return;
        }
        throw cErr;
      }
      const status = ((collected as any)?.sources?.status ?? []) as Step[];
      setAdapterSteps(status);

      // ── 2. process ─────────────────────────────────────────────────
      setStageIdx(1);
      const { error: pErr } = await supabase.functions.invoke("signal-process", {
        body: { product: tag, product_context: input, persist: true },
      });
      if (pErr) throw pErr;

      // ── 3. roadmap ─────────────────────────────────────────────────
      setStageIdx(2);
      const { data: rmData, error: rErr } = await supabase.functions.invoke("opportunity-roadmap", {
        body: { product: tag, vertical: input, persist: true },
      });
      if (rErr) throw rErr;
      const roadmap = (rmData as any)?.roadmap;
      const oppList: Opp[] = Array.isArray(roadmap?.opportunities) ? roadmap.opportunities : [];

      // ── live evidence count + samples for THIS tag (no hardcoded numbers) ─
      const { count: evCount } = await (supabase as any)
        .from("signal_raw")
        .select("id", { count: "exact", head: true })
        .eq("product_tag", tag);
      setEvidenceCount(typeof evCount === "number" ? evCount : 0);

      const { data: evSamples } = await (supabase as any)
        .from("signal_raw")
        .select("id, title, source, source_url")
        .eq("product_tag", tag)
        .not("source_url", "is", null)
        .order("collected_at", { ascending: false })
        .limit(12);
      setEvidenceSamples((evSamples ?? []) as RawSource[]);

      setOpps(oppList);
      setStageIdx(3);
    } catch (e: any) {
      setErrMsg(e?.message || "Scan failed. Try again in a moment.");
    } finally {
      setRunning(false);
    }
  };

  const sketchIdea = (o: Opp) => {
    const prefillIdea =
      `${o.title}\n\nProblem: ${o.problem}\n\nWhat to build: ${o.build}\n\nFor: ${o.customer}\n\n` +
      `(Grounded in a live ${vertical} scan — ${evidenceCount ?? "multiple"} real public complaints.)`;
    navigate("/simulate", { state: { prefillIdea } });
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runLiveScan();
  };

  const noOpps = opps !== null && opps.length === 0;
  const fewSignals = evidenceCount !== null && evidenceCount < 5;

  return (
    <section id="scan" className="py-32 border-t border-border">
      <div className="max-w-3xl mx-auto px-6 lg:px-12">
        <FadeIn>
          <p className="text-sm text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
            <Sparkles size={14} /> Opportunity scan
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-4">
            Run a free live scan on your vertical
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-xl">
            Enter your industry or vertical — e.g. "dental practices", "food trucks", "indie game studios".
            We'll mine real public complaints and hand back evidence-backed opportunities. No sign-up.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-warm">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onEnter}
              rows={3}
              placeholder="e.g. dental practices, food trucks, small wholesale suppliers drowning in email quotes"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none leading-relaxed"
              aria-label="Enter your industry or vertical"
              disabled={running}
            />
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-border">
              <span className="text-[11px] text-muted-foreground">⌘ + Enter to run a free live scan</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={showTeaser}
                  disabled={running || !text.trim()}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline disabled:opacity-40"
                >
                  Quick keyword read
                </button>
                <button
                  onClick={runLiveScan}
                  disabled={running || text.trim().length < 3}
                  className="font-display text-sm font-semibold bg-primary text-primary-foreground px-5 py-2.5 rounded-full hover:brightness-110 transition-all inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {running ? <Loader2 size={15} className="animate-spin" /> : <Radar size={15} />}
                  {running ? "Scanning…" : "Run a free live scan"}
                  {!running && <ArrowRight size={15} />}
                </button>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ── live progress stepper ─────────────────────────────────── */}
        <AnimatePresence>
          {running && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 rounded-xl border border-border bg-surface p-5"
            >
              <ol className="space-y-2">
                {STAGES.map((label, i) => {
                  const done = i < stageIdx;
                  const active = i === stageIdx;
                  return (
                    <li key={label} className="flex items-center gap-3 text-sm">
                      <span className="w-5 h-5 flex items-center justify-center">
                        {done ? <CheckCircle2 size={16} className="text-emerald-400" /> :
                          active ? <Loader2 size={14} className="animate-spin text-primary" /> :
                            <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                      </span>
                      <span className={done ? "text-foreground" : active ? "text-foreground" : "text-muted-foreground"}>
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {adapterSteps.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border grid sm:grid-cols-2 gap-x-6 gap-y-1">
                  {adapterSteps.map((s) => (
                    <div key={s.name} className="text-[11px] text-muted-foreground flex justify-between gap-2">
                      <span>{niceSource(s.name)}</span>
                      <span className={s.status === "ok" ? "text-emerald-400" : "text-muted-foreground"}>
                        {s.status === "ok" ? `${s.posts} posts` : s.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── rate limit / error ────────────────────────────────────── */}
        {!running && errMsg && (
          <div className={`mt-6 rounded-xl border p-4 flex items-start gap-3 text-sm ${
            rateLimited ? "border-warning/40 bg-warning/[0.06]" : "border-destructive/40 bg-destructive/[0.06]"
          }`}>
            <AlertTriangle size={16} className={rateLimited ? "text-warning mt-0.5" : "text-destructive mt-0.5"} />
            <div className="flex-1">
              <p className="text-foreground">{errMsg}</p>
              {rateLimited && (
                <button
                  onClick={() => navigate("/auth")}
                  className="mt-2 text-xs font-semibold text-primary hover:underline"
                >
                  Sign in for full scans →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── live results ──────────────────────────────────────────── */}
        <AnimatePresence>
          {!running && opps && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-8"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Opportunities for {vertical}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {evidenceCount !== null
                    ? `${evidenceCount} real public ${evidenceCount === 1 ? "post" : "posts"} mined`
                    : ""}
                </p>
              </div>

              {(noOpps || fewSignals) && (
                <div className="mb-4 rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
                  We found {evidenceCount ?? 0} signal{evidenceCount === 1 ? "" : "s"} on the free scan.
                  {" "}<button onClick={() => navigate("/auth")} className="text-primary hover:underline font-semibold">
                    Sign in for a deeper multi-source scan
                  </button>.
                </div>
              )}

              <div className="space-y-3">
                {opps.map((o, i) => {
                  const open = expandedOpp === i;
                  return (
                    <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">#{o.rank ?? i + 1}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {motionLabel(o.motion)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {o.effort === "S" ? "Small lift" : o.effort === "L" ? "Large lift" : "Medium lift"}
                          </span>
                        </div>
                        <h3 className="font-display text-lg font-bold text-foreground mb-2">{o.title}</h3>
                        <p className="text-sm text-foreground/80 leading-relaxed mb-3">{o.problem}</p>

                        <div className="grid sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="uppercase tracking-widest text-muted-foreground mb-1">What we'd build</p>
                            <p className="text-foreground/80 leading-relaxed">{o.build}</p>
                          </div>
                          <div>
                            <p className="uppercase tracking-widest text-muted-foreground mb-1">Why it pays</p>
                            <p className="text-foreground/80 leading-relaxed">{o.roi}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <button
                            onClick={() => setExpandedOpp(open ? null : i)}
                            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
                          >
                            <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                            {evidenceCount !== null
                              ? `Backed by ${evidenceCount} public ${evidenceCount === 1 ? "complaint" : "complaints"}`
                              : "Evidence"}
                          </button>
                          <button
                            onClick={() => sketchIdea(o)}
                            className="font-display text-sm font-semibold bg-violet text-violet-foreground px-4 py-2 rounded-full hover:brightness-110 transition-all inline-flex items-center gap-2 shadow-violet"
                          >
                            <Sparkles size={14} />
                            Sketch this idea
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>

                      {open && (
                        <div className="border-t border-border bg-surface px-5 py-4">
                          {evidenceSamples.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No source URLs available for this scan.</p>
                          ) : (
                            <ul className="space-y-2">
                              {evidenceSamples.slice(0, 8).map((ev) => (
                                <li key={ev.id} className="text-xs flex items-start gap-2">
                                  <span className="text-muted-foreground shrink-0">{niceSource(ev.source)}</span>
                                  <a
                                    href={ev.source_url ?? "#"}
                                    target="_blank" rel="noreferrer"
                                    className="text-primary hover:underline inline-flex items-start gap-1 break-all"
                                  >
                                    {ev.title || ev.source_url}
                                    <ExternalLink size={11} className="shrink-0 mt-0.5" />
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── optional keyword teaser (kept) ────────────────────────── */}
        <AnimatePresence>
          {teaser && !running && !opps && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-8"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
                Quick keyword read (not a live scan)
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {teaser.map((r) => (
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default OpportunityScan;
