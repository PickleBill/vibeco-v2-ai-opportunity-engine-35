import { useEffect, useMemo, useState } from "react";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { Radar, Sparkles, ArrowUpRight, X, Quote, Loader2, TrendingUp, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Signal Board — the human-gated surface for Signal Mine (Stage 5).
 * Ranked feature candidates mined from public social pain points, each with a
 * pain score, evidence, paraphrased quotes, and a one-tap promote/dismiss.
 * See docs/SOCIAL_LISTENING_PRD.md.
 */

interface Candidate {
  id?: string;
  cluster_theme: string;
  problem: string;
  proposed_solution: string;
  representative_quotes: string[];
  pain_score: number;   // 0..100
  confidence: number;   // 0..100
  effort: "S" | "M" | "L";
  evidence: { member_count: number; sources: string[] };
  status?: "open" | "promoted" | "dismissed";
}

// Seed so the board is meaningful before a live scan / backend wiring.
const SAMPLE: Candidate[] = [
  {
    cluster_theme: "No proof of a hole-in-one",
    problem: "Golfers who ace a hole have no trusted record — playing partners forget, and there's nothing to show or verify later.",
    proposed_solution: "Auto-mint a verifiable Ace Card (course, hole, date, witnesses) the moment an ace is confirmed; one-tap share.",
    representative_quotes: ["Aced a par 3 and had zero proof afterward", "Wish there was a way to log/verify a hole-in-one"],
    pain_score: 86, confidence: 78, effort: "M",
    evidence: { member_count: 14, sources: ["reddit"] },
  },
  {
    cluster_theme: "Settle-up after side bets is awkward",
    problem: "Groups lose track of who owes whom on skins/nassau and chasing Venmo after the round kills the vibe.",
    proposed_solution: "Auto-tallied net positions with a single 'request from group' settle button at the turn and after 18.",
    representative_quotes: ["Always a mess figuring out who owes what", "Spend 20 min after every round on Venmo math"],
    pain_score: 72, confidence: 70, effort: "M",
    evidence: { member_count: 9, sources: ["reddit", "appstore_review"] },
  },
  {
    cluster_theme: "Distrust of payout/contest legitimacy",
    problem: "Players hesitate to pay into on-course contests because they don't trust the payout will actually happen.",
    proposed_solution: "Show reinsured-pot badge + public payout history + 'verified by' provenance before the pay step.",
    representative_quotes: ["How do I know they'll actually pay out?", "Felt sketchy putting money in"],
    pain_score: 68, confidence: 65, effort: "S",
    evidence: { member_count: 7, sources: ["reddit"] },
  },
];

interface Theme {
  id?: string;
  title: string;
  pain_score: number;
  trend: number;          // latest score − previous appearance
  occurrence_count: number;
  score_history: { t: string; s: number }[];
}

// Sample durable themes with history so the sparkline + trend render pre-backend.
const SAMPLE_THEMES: Theme[] = [
  { title: "No proof of a hole-in-one", pain_score: 86, trend: 9, occurrence_count: 5, score_history: [{ t: "", s: 61 }, { t: "", s: 70 }, { t: "", s: 74 }, { t: "", s: 77 }, { t: "", s: 86 }] },
  { title: "Settle-up after side bets is awkward", pain_score: 72, trend: -4, occurrence_count: 4, score_history: [{ t: "", s: 80 }, { t: "", s: 79 }, { t: "", s: 76 }, { t: "", s: 72 }] },
  { title: "Distrust of payout legitimacy", pain_score: 68, trend: 12, occurrence_count: 3, score_history: [{ t: "", s: 44 }, { t: "", s: 56 }, { t: "", s: 68 }] },
];

const painTone = (s: number) =>
  s >= 75 ? "text-destructive" : s >= 55 ? "text-warning" : "text-muted-foreground";

const trendLabel = (t: number) =>
  t > 1 ? { icon: "▲", cls: "text-rose-400" } : t < -1 ? { icon: "▼", cls: "text-emerald-400" } : { icon: "→", cls: "text-muted-foreground" };

// Tiny inline sparkline from a score history.
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 64, h = 20, min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const d = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / span) * h}`).join(" ");
  const up = points[points.length - 1] >= points[0];
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={d} fill="none" strokeWidth="1.5" className={up ? "stroke-rose-400" : "stroke-emerald-400"} />
    </svg>
  );
}

const SignalBoard = () => {
  const [candidates, setCandidates] = useState<Candidate[]>(SAMPLE);
  const [themes, setThemes] = useState<Theme[]>(SAMPLE_THEMES);
  const [scanning, setScanning] = useState(false);
  const [counts, setCounts] = useState<{ collected: number; pain: number; clusters: number; candidates: number } | null>(null);
  const [usingSample, setUsingSample] = useState(true);
  const [productTags, setProductTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [latestScanDate, setLatestScanDate] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Owner gate: Promote/Dismiss and Run scan mutate the board, so they're
  // limited to an authenticated admin. RLS enforces this server-side too;
  // this just hides controls a public visitor can't use. (Pattern mirrors
  // MySimulations.tsx.)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setIsAdmin(false); return; }
      const { data: roleData } = await (supabase.from("user_roles") as any)
        .select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!roleData);
    })();
  }, []);

  // Discover available product_tags (verticals) from the most recently ingested data.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("feature_candidates")
          .select("product_tag, scan_date")
          .not("product_tag", "is", null)
          .order("scan_date", { ascending: false, nullsFirst: false })
          .limit(500);
        if (data && data.length) {
          const tags = Array.from(new Set(data.map((r: any) => r.product_tag).filter(Boolean))) as string[];
          setProductTags(tags);
          if (tags.length && !activeTag) setActiveTag(tags[0]);
        }
      } catch { /* tables missing — keep sample */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load candidates + themes (optionally filtered by active product_tag).
  useEffect(() => {
    (async () => {
      try {
        let cQuery: any = (supabase as any)
          .from("feature_candidates").select("*").eq("status", "open")
          .order("pain_score", { ascending: false }).limit(60);
        if (activeTag) cQuery = cQuery.eq("product_tag", activeTag);
        const { data, error } = await cQuery;
        if (!error && data && data.length) {
          setCandidates(data as Candidate[]);
          setUsingSample(false);
          const dates = data.map((r: any) => r.scan_date).filter(Boolean).sort();
          setLatestScanDate(dates.length ? dates[dates.length - 1] : null);
        } else if (activeTag) {
          setCandidates([]);
          setUsingSample(false);
        }
        let tQuery: any = (supabase as any)
          .from("signal_themes").select("*").eq("status", "open")
          .order("pain_score", { ascending: false }).limit(12);
        if (activeTag) tQuery = tQuery.eq("product_tag", activeTag);
        const { data: th } = await tQuery;
        if (th && th.length) {
          setThemes(th.map((t: any) => ({
            id: t.id, title: t.title, pain_score: t.pain_score, occurrence_count: t.occurrence_count,
            score_history: t.score_history ?? [],
            trend: (t.score_history?.length ?? 0) >= 2 ? Math.round(t.score_history.at(-1).s - t.score_history.at(-2).s) : 0,
          })));
        } else if (activeTag) {
          setThemes([]);
        }
      } catch { /* tables not migrated yet — keep sample */ }
    })();
  }, [activeTag]);

  const runScan = async () => {
    setScanning(true);
    try {
      // Stage 1: collect + persist raw items to signal_raw (de-duped, hashed authors).
      const { data: collected, error: cErr } = await supabase.functions.invoke("signal-collect", {
        body: { product: "niceace", persist: true },
      });
      if (cErr) throw cErr;
      const via = (collected as any)?.sources?.via ?? "firecrawl";
      const viaLabel = via.startsWith("ai_synth") ? "AI-synthesized (Gemini Flash)" : "Firecrawl";
      toast.message(`Collected ${(collected as any)?.collected ?? 0} items via ${viaLabel} (${(collected as any)?.persisted ?? 0} new)`);

      // Stages 2-4 + theme persistence: process unprocessed rows from the DB.
      const { data: result, error: pErr } = await supabase.functions.invoke("signal-process", {
        body: { product: "niceace", persist: true },
      });
      if (pErr) throw pErr;

      const r = result as any;
      if ((r.candidates ?? []).length) setCandidates(r.candidates);
      if (r.themes?.length) setThemes(r.themes);
      setCounts(r.counts ?? null);
      setUsingSample(false);
      toast.success(`Scan complete — ${r.counts?.candidates ?? 0} candidates from ${r.counts?.collected ?? 0} items`);
    } catch (e: any) {
      toast.error(`Scan failed: ${e?.message ?? "unknown"} — showing sample board`);
    } finally {
      setScanning(false);
    }
  };

  const setStatus = async (idx: number, status: "promoted" | "dismissed") => {
    const c = candidates[idx];
    setCandidates((prev) => prev.map((x, i) => (i === idx ? { ...x, status } : x)));
    toast[status === "promoted" ? "success" : "message"](
      status === "promoted" ? `Promoted "${c.cluster_theme}" → change request` : `Dismissed "${c.cluster_theme}"`,
    );
    if (c.id) {
      try { await (supabase as any).from("feature_candidates").update({ status }).eq("id", c.id); } catch { /* noop */ }
    }
  };

  const visible = useMemo(() => candidates.filter((c) => !c.status || c.status === "open"), [candidates]);

  return (
    <HelmetProvider>
      <Helmet><title>Signal Board · Signal Mine</title></Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="container max-w-4xl py-10">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Radar className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">Signal Mine</span>
              </div>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Signal Board</h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Customer pain points mined from public sources (Reddit + app-store reviews),
                clustered and turned into ranked, evidence-backed feature candidates. Promote
                the strongest into the build loop.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {productTags.length > 1 && (
                <Select value={activeTag ?? undefined} onValueChange={(v) => setActiveTag(v)}>
                  <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Vertical" /></SelectTrigger>
                  <SelectContent>
                    {productTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {isAdmin && (
                <Button onClick={runScan} disabled={scanning} className="gap-2">
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {scanning ? "Scanning…" : "Run scan"}
                </Button>
              )}
            </div>
          </div>

          {/* Live/Sample status strip */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            {usingSample ? (
              <Badge variant="outline" className="gap-1.5 border-warning/50 text-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" /> SAMPLE DATA
              </Badge>
            ) : (
              <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">
                <Radio className="h-3 w-3" /> LIVE DATA
              </Badge>
            )}
            {!usingSample && activeTag && (
              <span className="text-muted-foreground">
                vertical: <span className="font-mono text-foreground">{activeTag}</span>
                {latestScanDate && <> · latest scan {latestScanDate}</>}
                <> · source: Live scan · Reddit/X</>
              </span>
            )}
          </div>

          {/* Stat strip */}
          <div className="mt-6 grid grid-cols-4 gap-3">
            {[
              ["Collected", counts?.collected ?? "—"],
              ["Pain points", counts?.pain ?? "—"],
              ["Clusters", counts?.clusters ?? "—"],
              ["Candidates", counts?.candidates ?? visible.length],
            ].map(([label, value]) => (
              <Card key={label as string} className="p-3">
                <div className="font-display text-2xl font-extrabold leading-none">{value as any}</div>
                <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
              </Card>
            ))}
          </div>

          {usingSample && (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing a sample board. Click <span className="text-primary">Run scan</span> to mine live sources
              (requires the <code>signal-collect</code>/<code>signal-process</code> functions deployed).
            </p>
          )}

          {/* Trending themes (Pulse P1) */}
          {themes.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold">Trending themes</h2>
                <span className="text-xs text-muted-foreground">durable across scans · trend vs. last appearance</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {themes.slice(0, 6).map((t, i) => {
                  const tl = trendLabel(t.trend);
                  return (
                    <Card key={(t.id ?? t.title) + i} className="flex flex-col gap-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold leading-tight">{t.title}</span>
                        <Sparkline points={(t.score_history ?? []).map((p) => p.s)} />
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-display text-lg font-extrabold ${painTone(t.pain_score)}`}>{Math.round(t.pain_score)}</span>
                        <span className={`font-semibold ${tl.cls}`}>{tl.icon} {t.trend > 0 ? "+" : ""}{t.trend}</span>
                        <span className="ml-auto text-muted-foreground">seen {t.occurrence_count}×</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Candidates */}
          <div className="mt-8 space-y-4">
            <h2 className="font-display text-lg font-bold">Feature candidates</h2>
            {visible.map((c, idx) => {
              const realIdx = candidates.indexOf(c);
              return (
                <Card key={(c.id ?? c.cluster_theme) + idx} className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`flex items-center gap-1 font-display text-xl font-extrabold ${painTone(c.pain_score)}`}>
                      <TrendingUp className="h-4 w-4" />{Math.round(c.pain_score)}
                    </span>
                    <span className="text-[11px] uppercase tracking-widest text-muted-foreground">pain</span>
                    <h3 className="ml-1 font-display text-lg font-bold">{c.cluster_theme}</h3>
                    <div className="ml-auto flex items-center gap-2">
                      <Badge variant="secondary">{c.confidence}% conf</Badge>
                      <Badge variant="outline">effort {c.effort}</Badge>
                      <Badge variant="outline">{c.evidence.member_count} signals</Badge>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Problem</div>
                      <p className="mt-1 text-sm">{c.problem}</p>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Proposed feature</div>
                      <p className="mt-1 text-sm">{c.proposed_solution}</p>
                    </div>
                  </div>

                  {c.representative_quotes?.length > 0 && (
                    <div className="mt-3 space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                      {c.representative_quotes.slice(0, 3).map((q, i) => (
                        <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                          <Quote className="h-3.5 w-3.5 shrink-0 opacity-60" /><span>{q}</span>
                        </div>
                      ))}
                      <div className="pt-1 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                        sources: {c.evidence.sources.join(" · ")}
                      </div>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" className="gap-1.5" onClick={() => setStatus(realIdx, "promoted")}>
                        Promote to change request <ArrowUpRight className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => setStatus(realIdx, "dismissed")}>
                        <X className="h-3.5 w-3.5" /> Dismiss
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}

            {visible.length === 0 && (
              <Card className="p-10 text-center text-sm text-muted-foreground">
                Board is clear. Run a scan to mine fresh signal.
              </Card>
            )}
          </div>
        </main>
      </div>
    </HelmetProvider>
  );
};

export default SignalBoard;
