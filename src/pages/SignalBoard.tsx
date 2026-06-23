import { useEffect, useMemo, useState } from "react";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { Radar, Sparkles, ArrowUpRight, X, Quote, Loader2, TrendingUp, Radio, Plus, Clock, AlertTriangle, Map } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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

// AI-drafted build-or-sell roadmap over the live clusters (opportunity_roadmaps).
interface RoadmapOpp {
  rank: number; title: string; problem: string; build: string; customer: string;
  motion: string; effort: string; roi: string; confidence: number; based_on: string[];
}
interface Roadmap { summary: string; market_read: string; opportunities: RoadmapOpp[]; }

// A configured vertical (niche the engine listens to) — from signal_verticals.
interface Vertical {
  product_tag: string;
  vertical: string;
  subreddits: string[];
  keywords: string[];
  lookback_days: number;
}

// Mirror of the SQL signal_slug() / ingest-signal slug() so the UI computes the
// same product_tag both collection paths land on.
const clientSlug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untagged";

// Days since an ISO date string (YYYY-MM-DD), or null.
const daysSince = (d: string | null): number | null => {
  if (!d) return null;
  const ms = Date.now() - new Date(d + "T00:00:00Z").getTime();
  return Math.max(0, Math.floor(ms / 86400000));
};

// Normalize a feature_candidates DB row into a Candidate. The two write paths
// differ: ingest-signal stores representative_quotes as objects ({text,url,…})
// and uses `problem` as the theme name; signal-process stores plain strings and
// a separate cluster_theme. Coerce both so the board renders either source.
function normalizeCandidate(row: any): Candidate {
  const rawQuotes = Array.isArray(row.representative_quotes) ? row.representative_quotes : [];
  const representative_quotes = rawQuotes
    .map((q: any) => (typeof q === "string" ? q : q?.text ?? ""))
    .filter(Boolean) as string[];
  const ev = row.evidence ?? {};
  return {
    id: row.id,
    cluster_theme: row.cluster_theme ?? row.problem ?? "Untitled signal",
    problem: row.problem ?? "",
    proposed_solution: row.proposed_solution ?? "",
    representative_quotes,
    pain_score: Number(row.pain_score ?? 0),
    confidence: Number(row.confidence ?? 0),
    effort: (row.effort ?? "M") as "S" | "M" | "L",
    evidence: {
      member_count: Number(ev.member_count ?? row.member_count ?? 0),
      sources: Array.isArray(ev.sources) ? ev.sources : [],
    },
    status: row.status,
  };
}

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
  const [productTags, setProductTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [latestScanDate, setLatestScanDate] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVertical, setNewVertical] = useState("");
  const [newSubs, setNewSubs] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [drafting, setDrafting] = useState(false);

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

  // Load configured verticals (signal_verticals) + any product_tags that already
  // have data, then pick the active vertical. Configured verticals win, so a
  // vertical that's set up but not yet scanned shows an honest empty state
  // instead of silently falling back to the sample board.
  useEffect(() => {
    (async () => {
      let configured: Vertical[] = [];
      try {
        const { data: vData } = await (supabase as any)
          .from("signal_verticals")
          .select("product_tag, vertical, subreddits, keywords, lookback_days")
          .eq("enabled", true)
          .order("created_at", { ascending: true });
        configured = (vData ?? []).map((v: any) => ({
          product_tag: v.product_tag, vertical: v.vertical,
          subreddits: v.subreddits ?? [], keywords: v.keywords ?? [],
          lookback_days: v.lookback_days ?? 7,
        }));
        setVerticals(configured);
      } catch { /* table not migrated yet — fine */ }

      let dataTags: string[] = [];
      try {
        const { data } = await (supabase as any)
          .from("feature_candidates").select("product_tag")
          .not("product_tag", "is", null).limit(500);
        dataTags = Array.from(new Set((data ?? []).map((r: any) => r.product_tag).filter(Boolean))) as string[];
        setProductTags(dataTags);
      } catch { /* tables missing — keep sample */ }

      const firstTag = configured[0]?.product_tag ?? dataTags[0] ?? null;
      if (firstTag && !activeTag) setActiveTag(firstTag);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load candidates + themes for the active vertical. Clears sample data so an
  // unscanned vertical never renders sample rows under its label.
  useEffect(() => {
    if (!activeTag) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("feature_candidates").select("*").eq("status", "open").eq("product_tag", activeTag)
          .order("pain_score", { ascending: false }).limit(60);
        if (!error) setCandidates(((data ?? []) as any[]).map(normalizeCandidate));

        const { data: th } = await (supabase as any)
          .from("signal_themes").select("*").eq("status", "open").eq("product_tag", activeTag)
          .order("pain_score", { ascending: false }).limit(12);
        setThemes((th ?? []).map((t: any) => ({
          id: t.id, title: t.title, pain_score: t.pain_score, occurrence_count: t.occurrence_count,
          score_history: t.score_history ?? [],
          trend: (t.score_history?.length ?? 0) >= 2 ? Math.round(t.score_history.at(-1).s - t.score_history.at(-2).s) : 0,
        })));

        // Latest scan date = newest scan_date across candidates + themes.
        const allDates = [
          ...((data ?? []) as any[]).map((r) => r.scan_date),
          ...((th ?? []) as any[]).map((t) => t.scan_date),
        ].filter(Boolean).sort();
        setLatestScanDate(allDates.length ? allDates[allDates.length - 1] : null);

        // Cached AI roadmap for this vertical (most recent).
        const { data: rm } = await (supabase as any)
          .from("opportunity_roadmaps").select("*").eq("product_tag", activeTag)
          .order("generated_at", { ascending: false }).limit(1);
        const r0 = (rm ?? [])[0];
        setRoadmap(r0 ? { summary: r0.summary ?? "", market_read: r0.market_read ?? "", opportunities: r0.opportunities ?? [] } : null);
      } catch { /* keep what we have */ }
      finally { setLoading(false); }
    })();
  }, [activeTag, refreshKey]);

  const runScan = async () => {
    const cfg = verticals.find((v) => v.product_tag === activeTag) ?? null;
    setScanning(true);
    try {
      // Stage 1: collect + persist raw items. For a configured vertical this
      // uses the official Reddit API (subreddits/keywords); otherwise the legacy
      // demo path. De-duped, hashed authors.
      const collectBody: Record<string, unknown> = cfg
        ? { product: cfg.product_tag, vertical: cfg.vertical, subreddits: cfg.subreddits, keywords: cfg.keywords, lookback_days: cfg.lookback_days, persist: true }
        : { product: activeTag ?? "niceace", persist: true };
      const { data: collected, error: cErr } = await supabase.functions.invoke("signal-collect", { body: collectBody });
      if (cErr) throw cErr;
      const status = ((collected as any)?.sources?.status ?? []) as { name: string; status: string; posts: number }[];
      const active = status.filter((s) => s.status !== "skipped");
      const niceName = (n: string) => ({
        reddit: "Reddit", hackernews: "Hacker News", firecrawl: "review sites",
        ai_gateway_scout: "AI scout", anthropic_web_search: "Claude web search",
        perplexity_sonar: "Perplexity", ai_synth: "AI synth (demo)",
      } as Record<string, string>)[n] ?? n;
      const viaLabel = active.length ? active.map((s) => niceName(s.name)).join(" · ") : "no sources configured";
      const degraded = active.some((s) => s.status === "degraded");
      toast.message(`Collected ${(collected as any)?.collected ?? 0} items via ${viaLabel}${degraded ? " (some degraded)" : ""} — ${(collected as any)?.persisted ?? 0} new`);

      // Stages 2-4 + theme persistence: classify → cluster → synthesize.
      const { data: result, error: pErr } = await supabase.functions.invoke("signal-process", {
        body: { product: cfg?.product_tag ?? activeTag ?? "niceace", product_context: cfg?.vertical, persist: true },
      });
      if (pErr) throw pErr;

      const r = result as any;
      setCounts(r.counts ?? null);
      toast.success(`Scan complete — ${r.counts?.candidates ?? 0} candidates from ${r.counts?.collected ?? 0} items`);
      setRefreshKey((k) => k + 1); // reload from DB to pick up ids + scan_date
    } catch (e: any) {
      toast.error(`Scan failed: ${e?.message ?? "unknown"}`);
    } finally {
      setScanning(false);
    }
  };

  // Admin drafts the AI build-or-sell roadmap over the live clusters.
  const draftRoadmap = async () => {
    const cfg = verticals.find((v) => v.product_tag === activeTag) ?? null;
    setDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke("opportunity-roadmap", {
        body: { product: activeTag, vertical: cfg?.vertical ?? activeTag, persist: true },
      });
      if (error) throw error;
      const rm = (data as any)?.roadmap;
      if (rm) setRoadmap(rm);
      toast.success("Roadmap drafted from live signal");
    } catch (e: any) {
      toast.error(`Roadmap failed: ${e?.message ?? "unknown"}`);
    } finally {
      setDrafting(false);
    }
  };

  // Owner adds a vertical (keywords/subreddits) from the UI. RLS restricts the
  // insert to admins; product_tag is the slug so both collection paths align.
  const createVertical = async () => {
    const label = newVertical.trim();
    if (!label) { toast.error("Vertical name is required"); return; }
    const product_tag = clientSlug(label);
    const subreddits = newSubs.split(/[\s,]+/).map((s) => s.replace(/^\/?r\//i, "").trim()).filter(Boolean);
    const keywords = newKeywords.split(/[,\n]+/).map((k) => k.trim()).filter(Boolean);
    if (!subreddits.length || !keywords.length) { toast.error("Add at least one subreddit and one keyword"); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await (supabase as any).from("signal_verticals").insert({
        product_tag, vertical: label, subreddits, keywords, lookback_days: 7,
        created_by: session?.user?.id ?? null,
      });
      if (error) throw error;
      toast.success(`Added "${label}". Run a scan to populate it.`);
      setVerticals((prev) => [...prev.filter((v) => v.product_tag !== product_tag), { product_tag, vertical: label, subreddits, keywords, lookback_days: 7 }]);
      setActiveTag(product_tag);
      setAddOpen(false);
      setNewVertical(""); setNewSubs(""); setNewKeywords("");
    } catch (e: any) {
      toast.error(`Couldn't add vertical: ${e?.message ?? "unknown"}`);
    } finally {
      setSaving(false);
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

  // Selector options = configured verticals ∪ any tag that already has data.
  const optionTags = useMemo(() => {
    const set = new Set<string>();
    verticals.forEach((v) => set.add(v.product_tag));
    productTags.forEach((t) => set.add(t));
    return Array.from(set);
  }, [verticals, productTags]);
  const labelFor = (tag: string | null) => (tag ? verticals.find((v) => v.product_tag === tag)?.vertical ?? tag : "");

  // Render modes: sample = no vertical chosen (pure first-run demo, illustrative);
  // live = active vertical has rows; empty = active vertical has no data yet.
  const isSample = !activeTag;
  const isEmpty = !!activeTag && !loading && candidates.length === 0;   // no data yet
  const allTriaged = !!activeTag && !loading && candidates.length > 0 && visible.length === 0;
  const ingestAge = daysSince(latestScanDate);

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
                Customer pain points mined from public sources (Reddit · Hacker News · review sites),
                clustered and turned into ranked, evidence-backed feature candidates. Promote
                the strongest into the build loop.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {optionTags.length > 0 && (
                <Select value={activeTag ?? undefined} onValueChange={(v) => setActiveTag(v)}>
                  <SelectTrigger className="h-9 w-[210px]"><SelectValue placeholder="Vertical" /></SelectTrigger>
                  <SelectContent>
                    {optionTags.map((t) => <SelectItem key={t} value={t}>{labelFor(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {isAdmin && (
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Add a vertical" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              {isAdmin && (
                <Button onClick={runScan} disabled={scanning} className="gap-2">
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {scanning ? "Scanning…" : "Run scan"}
                </Button>
              )}
            </div>
          </div>

          {/* Status strip: SAMPLE (illustrative) / NO DATA / LIVE + ingest health */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            {isSample ? (
              <Badge variant="outline" className="gap-1.5 border-warning/50 text-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" /> SAMPLE DATA · illustrative
              </Badge>
            ) : isEmpty ? (
              <Badge variant="outline" className="gap-1.5 border-muted-foreground/40 text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> NO LIVE DATA YET
              </Badge>
            ) : (
              <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">
                <Radio className="h-3 w-3" /> LIVE DATA
              </Badge>
            )}
            {!isSample && activeTag && (
              <span className="text-muted-foreground">
                vertical: <span className="font-mono text-foreground">{labelFor(activeTag)}</span>
                <span className="text-muted-foreground/60"> ({activeTag})</span>
              </span>
            )}
            {!isSample && (
              ingestAge === null ? (
                <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                  <Clock className="h-3 w-3" /> awaiting first scan
                </Badge>
              ) : (
                <Badge variant="outline" className={`gap-1.5 ${ingestAge <= 2 ? "text-emerald-300 border-emerald-500/40" : "text-warning border-warning/40"}`}>
                  {ingestAge <= 2 ? <Clock className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  last ingest {latestScanDate} · {ingestAge === 0 ? "today" : `${ingestAge}d ago`}
                </Badge>
              )
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

          {isSample && (
            <p className="mt-3 text-xs text-muted-foreground">
              Illustrative sample board — no live vertical is configured yet. The numbers below are
              placeholders, not real signal.{isAdmin && <> Add a vertical with <span className="text-primary">+</span> to start mining real Reddit pain.</>}
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

          {/* Opportunity roadmap — AI reasoning over the live clusters */}
          {!isSample && (roadmap || (isAdmin && !isEmpty)) && (
            <div className="mt-8">
              <div className="flex flex-wrap items-center gap-2">
                <Map className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold">Opportunity roadmap</h2>
                <span className="text-xs text-muted-foreground">AI-drafted over the live clusters · build-or-sell</span>
                {isAdmin && (
                  <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={draftRoadmap} disabled={drafting || isEmpty}>
                    {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {roadmap ? "Redraft" : "Draft roadmap"}
                  </Button>
                )}
              </div>

              {roadmap ? (
                <div className="mt-3 space-y-3">
                  <Card className="border-primary/20 bg-primary/5 p-4">
                    <p className="text-sm">{roadmap.summary}</p>
                    {roadmap.market_read && <p className="mt-2 text-xs text-muted-foreground">{roadmap.market_read}</p>}
                  </Card>
                  {roadmap.opportunities.map((o) => (
                    <Card key={o.rank} className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-extrabold text-primary">#{o.rank}</span>
                        <h3 className="font-display text-base font-bold">{o.title}</h3>
                        <div className="ml-auto flex items-center gap-1.5">
                          <Badge variant={o.motion === "build" ? "default" : "secondary"} className="capitalize">{o.motion}</Badge>
                          <Badge variant="outline">effort {o.effort}</Badge>
                          <Badge variant="outline">{o.confidence}% conf</Badge>
                        </div>
                      </div>
                      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Build</div>
                          <p className="mt-0.5">{o.build}</p>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Sell to</div>
                          <p className="mt-0.5">{o.customer}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">ROI (directional):</span> {o.roi}
                      </p>
                      {o.based_on?.length > 0 && (
                        <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                          based on: {o.based_on.join(" · ")}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="mt-3 p-6 text-center text-sm text-muted-foreground">
                  No roadmap yet. Draft one to turn the live pains into ranked build-or-sell opportunities.
                </Card>
              )}
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

            {isEmpty && (
              <Card className="p-10 text-center">
                <Radar className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">No live data yet for {labelFor(activeTag)}.</p>
                <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                  {verticals.some((v) => v.product_tag === activeTag)
                    ? "The nightly scan populates this board automatically. "
                    : ""}
                  {isAdmin ? "Or run a scan now to mine fresh Reddit signal." : "Check back after the next scan."}
                </p>
                {isAdmin && (
                  <Button onClick={runScan} disabled={scanning} className="mt-4 gap-2">
                    {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {scanning ? "Scanning…" : "Run scan now"}
                  </Button>
                )}
              </Card>
            )}
            {allTriaged && (
              <Card className="p-10 text-center text-sm text-muted-foreground">
                Board is clear — every candidate triaged. Run a scan to mine fresh signal.
              </Card>
            )}
          </div>

          {/* Admin: add a vertical (keywords + subreddits) */}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a vertical</DialogTitle>
                <DialogDescription>
                  Define a niche to listen to. The nightly scan mines these subreddits for these
                  keywords and ranks the pain it finds.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="v-name">Vertical</Label>
                  <Input id="v-name" placeholder="e.g. Wholesale distribution / 3PL"
                    value={newVertical} onChange={(e) => setNewVertical(e.target.value)} />
                  {newVertical.trim() && (
                    <p className="text-[11px] text-muted-foreground">product_tag: <span className="font-mono">{clientSlug(newVertical)}</span></p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-subs">Subreddits</Label>
                  <Input id="v-subs" placeholder="logistics, freight, supplychain"
                    value={newSubs} onChange={(e) => setNewSubs(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">Comma or space separated, without “r/”.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-kw">Pain keywords</Label>
                  <Textarea id="v-kw" rows={3} placeholder="3PL, freight broker, LTL, WMS, backorder…"
                    value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">Comma or newline separated.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
                <Button onClick={createVertical} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add vertical
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </HelmetProvider>
  );
};

export default SignalBoard;
