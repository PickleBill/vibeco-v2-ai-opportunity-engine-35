import { useEffect, useMemo, useState } from "react";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Radar, Sparkles, ArrowUpRight, X, Quote, Loader2, TrendingUp, Radio, Plus,
  Clock, AlertTriangle, Map, Search, ExternalLink, ChevronDown, Info, CheckCircle2,
} from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useActiveVertical } from "@/hooks/useActiveVertical";

/**
 * Signal Board — answers one question:
 *   "What are real people complaining about in {vertical} right now,
 *    and what would we build for it?"
 *
 * Every claim on this page must be traceable to a real source URL.
 * No invented metrics. No undefined jargon. See docs/SOCIAL_LISTENING_PRD.md.
 */

interface Candidate {
  id?: string;
  cluster_id?: string;
  theme_id?: string;
  cluster_theme: string;
  problem: string;
  proposed_solution: string;
  representative_quotes: string[];
  pain_score: number;
  confidence: number;
  effort: "S" | "M" | "L";
  evidence: { member_count: number; sources: string[] };
  status?: "open" | "promoted" | "dismissed";
}

interface RawSignal {
  id: string;
  title: string | null;
  body: string | null;
  source: string;
  source_url: string | null;
}

interface Theme {
  id?: string;
  title: string;
  pain_score: number;
  trend: number;
  occurrence_count: number;
  score_history: { t: string; s: number }[];
}

interface RoadmapOpp {
  rank: number; title: string; problem: string; build: string; customer: string;
  motion: string; effort: string; roi: string; confidence: number; based_on: string[];
}
interface Roadmap { summary: string; market_read: string; opportunities: RoadmapOpp[]; }

interface Vertical {
  product_tag: string;
  vertical: string;
  subreddits: string[];
  keywords: string[];
  lookback_days: number;
}

// Friendly source names used everywhere.
const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit", hackernews: "Hacker News", firecrawl: "review sites",
  ai_gateway_scout: "AI scout", anthropic_web_search: "Claude web search",
  perplexity_sonar: "Perplexity", ai_synth: "AI synth", web: "Web",
  trustpilot_review: "Trustpilot", g2_review: "G2", capterra_review: "Capterra",
};
const niceSource = (s: string) => SOURCE_LABELS[s] ?? s;

// Plain-English motion labels — no "build/sell/partner" jargon.
const MOTION_COPY: Record<string, { label: string; tip: string }> = {
  build: { label: "Build it", tip: "Worth building ourselves now — the pain is sharp and the path is clear." },
  sell:  { label: "Pre-sell it", tip: "Validate with a real buyer before writing code — sell the outcome first." },
  partner: { label: "Partner up", tip: "Faster to integrate with an existing player than to build from scratch." },
};
const motionFor = (m: string) => MOTION_COPY[m?.toLowerCase()] ?? { label: m ?? "—", tip: "" };

const clientSlug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untagged";

const daysSince = (d: string | null): number | null => {
  if (!d) return null;
  const ms = Date.now() - new Date(d + "T00:00:00Z").getTime();
  return Math.max(0, Math.floor(ms / 86400000));
};

function normalizeCandidate(row: any): Candidate {
  const rawQuotes = Array.isArray(row.representative_quotes) ? row.representative_quotes : [];
  const representative_quotes = rawQuotes
    .map((q: any) => (typeof q === "string" ? q : q?.text ?? ""))
    .filter(Boolean) as string[];
  const ev = row.evidence ?? {};
  return {
    id: row.id,
    cluster_id: row.cluster_id,
    theme_id: row.theme_id,
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

// One-line definition shown on hover. Use sparingly — only on metrics that aren't obvious.
function Hint({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 cursor-help border-b border-dotted border-muted-foreground/40">
          {children}<Info className="h-3 w-3 opacity-50" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

const SignalBoard = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanSteps, setScanSteps] = useState<{ name: string; status: string; posts: number }[]>([]);
  const [counts, setCounts] = useState<{ collected: number; pain: number; clusters: number; candidates: number } | null>(null);
  const [productTags, setProductTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useActiveVertical();
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
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"pain" | "confidence" | "recent">("pain");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [evidenceCache, setEvidenceCache] = useState<Record<string, RawSignal[]>>({});
  const [verticalEvidenceCount, setVerticalEvidenceCount] = useState<number | null>(null);
  const [verticalEvidenceSamples, setVerticalEvidenceSamples] = useState<RawSignal[]>([]);
  const [expandedOpp, setExpandedOpp] = useState<number | null>(null);
  const [showThemes, setShowThemes] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setIsAdmin(false); return; }
      const { data: roleData } = await (supabase.from("user_roles") as any)
        .select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!roleData);
    })();
  }, []);

  // Load configured verticals + tags with data.
  useEffect(() => {
    (async () => {
      let configured: Vertical[] = [];
      try {
        // Load ALL verticals (the `enabled` flag only controls the nightly cron,
        // NOT board visibility — every vertical with data should be selectable).
        const { data: vData } = await (supabase as any)
          .from("signal_verticals")
          .select("product_tag, vertical, subreddits, keywords, lookback_days")
          .order("created_at", { ascending: true });
        configured = (vData ?? []).map((v: any) => ({
          product_tag: v.product_tag, vertical: v.vertical,
          subreddits: v.subreddits ?? [], keywords: v.keywords ?? [],
          lookback_days: v.lookback_days ?? 7,
        }));
        setVerticals(configured);
      } catch {}

      let dataTags: string[] = [];
      try {
        const { data } = await (supabase as any)
          .from("feature_candidates").select("product_tag")
          .not("product_tag", "is", null).limit(500);
        dataTags = Array.from(new Set((data ?? []).map((r: any) => r.product_tag).filter(Boolean))) as string[];
        setProductTags(dataTags);
      } catch {}

      const firstTag = configured[0]?.product_tag ?? dataTags[0] ?? null;
      if (firstTag && !activeTag) setActiveTag(firstTag);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load candidates + themes + roadmap for active vertical.
  useEffect(() => {
    if (!activeTag) return;
    (async () => {
      setLoading(true);
      setExpandedId(null);
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

        const allDates = [
          ...((data ?? []) as any[]).map((r) => r.scan_date),
          ...((th ?? []) as any[]).map((t) => t.scan_date),
        ].filter(Boolean).sort();
        setLatestScanDate(allDates.length ? allDates[allDates.length - 1] : null);

        const { data: rm } = await (supabase as any)
          .from("opportunity_roadmaps").select("*").eq("product_tag", activeTag)
          .order("generated_at", { ascending: false }).limit(1);
        const r0 = (rm ?? [])[0];
        setRoadmap(r0 ? { summary: r0.summary ?? "", market_read: r0.market_read ?? "", opportunities: r0.opportunities ?? [] } : null);

        // Vertical-level evidence: live count + a few sample source rows with URLs.
        const { count: evCount } = await (supabase as any)
          .from("signal_raw")
          .select("id", { count: "exact", head: true })
          .eq("product_tag", activeTag);
        setVerticalEvidenceCount(typeof evCount === "number" ? evCount : null);

        const { data: evSamples } = await (supabase as any)
          .from("signal_raw")
          .select("id, title, body, source, source_url")
          .eq("product_tag", activeTag)
          .not("source_url", "is", null)
          .order("collected_at", { ascending: false })
          .limit(12);
        setVerticalEvidenceSamples((evSamples ?? []) as RawSignal[]);
        setExpandedOpp(null);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [activeTag, refreshKey]);

  // Pull raw signals matching a candidate's cluster_id — the "Evidence" drawer payload.
  const loadEvidence = async (candidate: Candidate) => {
    if (!candidate.cluster_id || evidenceCache[candidate.cluster_id]) return;
    try {
      const { data } = await (supabase as any)
        .from("signal_raw")
        .select("id, title, body, source, source_url")
        .eq("cluster_id", candidate.cluster_id)
        .not("source_url", "is", null)
        .limit(20);
      setEvidenceCache((prev) => ({ ...prev, [candidate.cluster_id!]: (data ?? []) as RawSignal[] }));
    } catch {}
  };

  // Auto-open the top candidate's evidence so "real sources" is felt immediately.
  useEffect(() => {
    if (!candidates.length) return;
    if (expandedId) return;
    const first = candidates.find((c) => !c.status || c.status === "open");
    if (!first) return;
    const key = first.id ?? first.cluster_theme;
    setExpandedId(key);
    if (first.cluster_id) loadEvidence(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates]);

  const toggleExpand = async (candidate: Candidate) => {
    const key = candidate.id ?? candidate.cluster_theme;
    if (expandedId === key) { setExpandedId(null); return; }
    setExpandedId(key);
    await loadEvidence(candidate);
  };

  const runScan = async () => {
    const cfg = verticals.find((v) => v.product_tag === activeTag) ?? null;
    setScanning(true);
    setScanSteps([]);
    try {
      const collectBody: Record<string, unknown> = cfg
        ? { product: cfg.product_tag, vertical: cfg.vertical, subreddits: cfg.subreddits, keywords: cfg.keywords, lookback_days: cfg.lookback_days, persist: true }
        : { product: activeTag ?? "niceace", persist: true };
      const { data: collected, error: cErr } = await supabase.functions.invoke("signal-collect", { body: collectBody });
      if (cErr) throw cErr;
      const status = ((collected as any)?.sources?.status ?? []) as { name: string; status: string; posts: number }[];
      setScanSteps(status);
      toast.message(`Collected ${(collected as any)?.collected ?? 0} items · ${(collected as any)?.persisted ?? 0} new`);

      const { data: result, error: pErr } = await supabase.functions.invoke("signal-process", {
        body: { product: cfg?.product_tag ?? activeTag ?? "niceace", product_context: cfg?.vertical, persist: true },
      });
      if (pErr) throw pErr;
      const r = result as any;
      setCounts(r.counts ?? null);
      toast.success(`${r.counts?.candidates ?? 0} candidates from ${r.counts?.collected ?? 0} signals`);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast.error(`Scan failed: ${e?.message ?? "unknown"}`);
    } finally {
      setScanning(false);
    }
  };

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
      status === "promoted" ? `Promoted "${c.cluster_theme}"` : `Dismissed "${c.cluster_theme}"`,
    );
    if (c.id) {
      try { await (supabase as any).from("feature_candidates").update({ status }).eq("id", c.id); } catch {}
    }
  };

  const allSources = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => (c.evidence?.sources ?? []).forEach((s) => set.add(s)));
    return Array.from(set);
  }, [candidates]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = candidates.filter((c) => !c.status || c.status === "open");
    if (sourceFilter) list = list.filter((c) => c.evidence?.sources?.includes(sourceFilter));
    if (q) {
      list = list.filter((c) =>
        [c.cluster_theme, c.problem, c.proposed_solution, ...(c.representative_quotes ?? [])]
          .join(" ").toLowerCase().includes(q),
      );
    }
    if (sortBy === "confidence") list = [...list].sort((a, b) => b.confidence - a.confidence);
    else if (sortBy === "recent") list = [...list].sort((a, b) => (b.evidence.member_count ?? 0) - (a.evidence.member_count ?? 0));
    else list = [...list].sort((a, b) => b.pain_score - a.pain_score);
    return list;
  }, [candidates, query, sortBy, sourceFilter]);

  const optionTags = useMemo(() => {
    const set = new Set<string>();
    verticals.forEach((v) => set.add(v.product_tag));
    productTags.forEach((t) => set.add(t));
    return Array.from(set);
  }, [verticals, productTags]);
  const labelFor = (tag: string | null) => (tag ? verticals.find((v) => v.product_tag === tag)?.vertical ?? tag : "");

  const isSample = !activeTag;
  const isEmpty = !!activeTag && !loading && candidates.length === 0;
  const allTriaged = !!activeTag && !loading && candidates.length > 0 && visible.length === 0;
  const ingestAge = daysSince(latestScanDate);
  const verticalLabel = labelFor(activeTag) || "your market";

  return (
    <TooltipProvider delayDuration={200}>
      <HelmetProvider>
        <Helmet><title>Signal Board · what people are complaining about right now</title></Helmet>
        <div className="min-h-screen bg-background text-foreground">
          <Navbar />
          <main className="container max-w-4xl py-10">

            {/* ── Header: state the question, then answer it. ────────── */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-primary">
                  <Radar className="h-5 w-5" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">Signal Mine · live</span>
                </div>
                <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
                  What {verticalLabel} is complaining about right now
                </h1>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Real pain mined from public discussion (Reddit, Hacker News, Trustpilot, G2, Capterra, web),
                  clustered into ranked feature candidates. Every claim links to its source.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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

            {/* ── One-line status. No 4-tile placeholder grid. ──────── */}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {isSample ? (
                <Badge variant="outline" className="gap-1.5 border-warning/50 text-warning">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Pick a vertical to load live data
                </Badge>
              ) : isEmpty ? (
                <Badge variant="outline" className="gap-1.5 border-muted-foreground/40 text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> No live data yet
                </Badge>
              ) : (
                <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">
                  <Radio className="h-3 w-3" /> Live
                </Badge>
              )}
              {!isSample && !isEmpty && (
                <span className="text-muted-foreground">
                  <span className="text-foreground font-medium">{candidates.length}</span> candidates ·
                  <span className="text-foreground font-medium ml-1">{themes.length}</span> durable themes ·
                  {ingestAge !== null && (
                    <> last scan <span className={ingestAge <= 2 ? "text-emerald-300" : "text-warning"}>
                      {ingestAge === 0 ? "today" : `${ingestAge}d ago`}
                    </span></>
                  )}
                </span>
              )}
              {!isSample && ingestAge !== null && ingestAge > 2 && (
                <Badge variant="outline" className="gap-1.5 text-warning border-warning/40">
                  <AlertTriangle className="h-3 w-3" /> stale — rerun scan
                </Badge>
              )}
            </div>

            {/* ── Live scan stepper — proves the pipeline is real. ──── */}
            {(scanning || scanSteps.length > 0) && (
              <Card className="mt-4 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  {scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                  {scanning ? "Mining live sources" : "Last run"}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {scanSteps.length === 0 && scanning && (
                    <span className="text-xs text-muted-foreground">Spinning up adapters…</span>
                  )}
                  {scanSteps.map((s) => (
                    <Badge
                      key={s.name}
                      variant="outline"
                      className={`gap-1.5 ${
                        s.status === "skipped" ? "opacity-40" :
                        s.status === "degraded" ? "border-warning/40 text-warning" :
                        "border-emerald-500/40 text-emerald-300"
                      }`}
                    >
                      {s.status === "skipped" ? <X className="h-3 w-3" /> :
                       s.status === "degraded" ? <AlertTriangle className="h-3 w-3" /> :
                       <CheckCircle2 className="h-3 w-3" />}
                      {niceSource(s.name)}
                      {s.status !== "skipped" && <span className="opacity-70">· {s.posts}</span>}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Sticky filter / sort / search. Up top, not buried. ── */}
            {!isSample && !isEmpty && (
              <div className="sticky top-16 z-10 -mx-2 mt-6 rounded-xl border border-border bg-background/85 backdrop-blur px-2 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search problems, quotes, themes…"
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pain">Sort: most painful</SelectItem>
                      <SelectItem value="confidence">Sort: most confident</SelectItem>
                      <SelectItem value="recent">Sort: most evidence</SelectItem>
                    </SelectContent>
                  </Select>
                  {allSources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        onClick={() => setSourceFilter(null)}
                        className={`text-[11px] px-2 py-1 rounded-full border transition ${!sourceFilter ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                      >All sources</button>
                      {allSources.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSourceFilter(s === sourceFilter ? null : s)}
                          className={`text-[11px] px-2 py-1 rounded-full border transition ${sourceFilter === s ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                        >{niceSource(s)}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* themes strip moved below roadmap */}

            {/* ── Roadmap (AI build-or-sell) ────────────────────────── */}
            {!isSample && (roadmap || (isAdmin && !isEmpty)) && (
              <div className="mt-8">
                <div className="flex flex-wrap items-center gap-2">
                  <Map className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg font-bold">What we'd actually do about it</h2>
                  <span className="text-xs text-muted-foreground">— AI drafted over the live clusters</span>
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
                      <p className="text-sm leading-relaxed">{roadmap.summary}</p>
                      {roadmap.market_read && <p className="mt-2 text-xs text-muted-foreground">{roadmap.market_read}</p>}
                    </Card>
                    {roadmap.opportunities.map((o) => {
                      const motion = motionFor(o.motion);
                      const oppExpanded = expandedOpp === o.rank;
                      return (
                        <Card key={o.rank} className="p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-display text-sm font-extrabold text-primary">#{o.rank}</span>
                            <h3 className="font-display text-lg font-bold flex-1 min-w-0">{o.title}</h3>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="default" className="cursor-help">{motion.label}</Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[260px] text-xs">{motion.tip}</TooltipContent>
                            </Tooltip>
                            <Hint text="Rough build effort: S = small, M = medium, L = large.">
                              <Badge variant="outline">Effort {o.effort}</Badge>
                            </Hint>
                          </div>

                          {verticalEvidenceCount !== null && verticalEvidenceCount > 0 && (
                            <p className="mt-2 text-xs text-emerald-300/90">
                              Backed by <span className="font-semibold">{verticalEvidenceCount.toLocaleString()}</span> public complaints in {labelFor(activeTag)}
                            </p>
                          )}

                          <div className="mt-3 space-y-2 text-sm">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">The problem</div>
                              <p className="mt-0.5">{o.problem}</p>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">What we'd build</div>
                              <p className="mt-0.5">{o.build}</p>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Who'd buy it</div>
                              <p className="mt-0.5">{o.customer}</p>
                            </div>
                          </div>

                          {o.roi && (
                            <p className="mt-3 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">Why it pays:</span> {o.roi}
                            </p>
                          )}
                          {o.based_on?.length > 0 && (
                            <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                              grounded in: {o.based_on.join(" · ")}
                            </p>
                          )}

                          {verticalEvidenceSamples.length > 0 && (
                            <div className="mt-3">
                              <button
                                onClick={() => setExpandedOpp(oppExpanded ? null : o.rank)}
                                className="text-xs font-semibold text-primary inline-flex items-center gap-1.5 hover:brightness-110"
                              >
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${oppExpanded ? "rotate-180" : ""}`} />
                                {oppExpanded ? "Hide evidence" : `Show evidence (${Math.min(verticalEvidenceSamples.length, 3)} of ${verticalEvidenceCount ?? verticalEvidenceSamples.length} real posts)`}
                              </button>
                              {oppExpanded && (
                                <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-background/50 p-3">
                                  {verticalEvidenceSamples.slice(0, 3).map((r) => (
                                    <a
                                      key={r.id}
                                      href={r.source_url ?? "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group flex items-start gap-2 text-xs hover:bg-muted/40 rounded p-1.5 transition"
                                    >
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">{niceSource(r.source)}</Badge>
                                      <span className="flex-1 text-foreground/80 group-hover:text-foreground line-clamp-2">
                                        {r.title || r.body?.slice(0, 140) || "(untitled)"}
                                      </span>
                                      <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="gap-1.5"
                              onClick={() =>
                                navigate("/simulate", {
                                  state: {
                                    prefillIdea: `${o.title}\n\nProblem: ${o.problem}\n\nWhat to build: ${o.build}\n\nFor: ${o.customer}\n\n(Grounded in live ${labelFor(activeTag)} signal — ${verticalEvidenceCount ?? "many"} real public complaints.)`,
                                  },
                                })
                              }
                            >
                              <Sparkles className="h-3.5 w-3.5" /> Sketch this idea
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="mt-3 p-6 text-center text-sm text-muted-foreground">
                    No roadmap drafted yet. Hit "Draft roadmap" to turn the live pains into ranked plays.
                  </Card>
                )}
              </div>
            )}

            {/* ── Trending themes strip (below the opportunities) ──── */}
            {themes.length > 0 && (
              <div className="mt-8">
                <div className="flex items-baseline gap-2">
                  <h2 className="font-display text-lg font-bold">Themes that keep coming back</h2>
                  <span className="text-xs text-muted-foreground">— durable across scans</span>
                </div>
                <div className="mt-3 -mx-2 px-2 overflow-x-auto">
                  <div className="flex gap-3 pb-2">
                    {themes.slice(0, 8).map((t, i) => {
                      const tl = trendLabel(t.trend);
                      return (
                        <Card key={(t.id ?? t.title) + i} className="shrink-0 w-[260px] flex flex-col gap-2 p-3">
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
              </div>
            )}


            {/* ── Candidates ──────────────────────────────────────── */}
            <div className="mt-8 space-y-4">
              <h2 className="font-display text-lg font-bold">The pains, ranked</h2>

              {visible.map((c, idx) => {
                const realIdx = candidates.indexOf(c);
                const key = c.id ?? c.cluster_theme;
                const expanded = expandedId === key;
                const evidence = c.cluster_id ? evidenceCache[c.cluster_id] : undefined;
                return (
                  <Card key={key + idx} className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Hint text="0–100 score combining how often this pain appears and how intensely people describe it.">
                        <span className={`flex items-center gap-1 font-display text-xl font-extrabold ${painTone(c.pain_score)}`}>
                          <TrendingUp className="h-4 w-4" />{Math.round(c.pain_score)}
                        </span>
                      </Hint>
                      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">pain</span>
                      <h3 className="ml-1 font-display text-lg font-bold flex-1 min-w-0">{c.cluster_theme}</h3>
                      <div className="flex items-center gap-2">
                        <Hint text="How sure the model is, given the size and consistency of the evidence.">
                          <Badge variant="secondary">{c.confidence}% sure</Badge>
                        </Hint>
                        <Badge variant="outline">{c.evidence.member_count} signals</Badge>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">The problem</div>
                        <p className="mt-1 text-sm">{c.problem}</p>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">What we'd build</div>
                        <p className="mt-1 text-sm">{c.proposed_solution}</p>
                      </div>
                    </div>

                    {c.representative_quotes?.length > 0 && (
                      <div className="mt-3 space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                        {c.representative_quotes.slice(0, 3).map((q, i) => (
                          <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                            <Quote className="h-3.5 w-3.5 shrink-0 opacity-60 mt-0.5" /><span>{q}</span>
                          </div>
                        ))}
                        <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                          <span>seen on:</span>
                          {c.evidence.sources.map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">{niceSource(s)}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Evidence drawer — every claim, traceable. */}
                    {c.cluster_id && (
                      <div className="mt-3">
                        <button
                          onClick={() => toggleExpand(c)}
                          className="text-xs font-semibold text-primary inline-flex items-center gap-1.5 hover:brightness-110"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                          {expanded ? "Hide evidence" : `Show evidence (${c.evidence.member_count} real posts)`}
                        </button>
                        {expanded && (
                          <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-background/50 p-3">
                            {!evidence ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" /> Loading source posts…
                              </div>
                            ) : evidence.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No source rows linked to this cluster yet.</p>
                            ) : (
                              evidence.slice(0, 10).map((r) => (
                                <a
                                  key={r.id}
                                  href={r.source_url ?? "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group flex items-start gap-2 text-xs hover:bg-muted/40 rounded p-1.5 transition"
                                >
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">{niceSource(r.source)}</Badge>
                                  <span className="flex-1 text-foreground/80 group-hover:text-foreground line-clamp-2">
                                    {r.title || r.body?.slice(0, 140) || "(untitled)"}
                                  </span>
                                  <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                                </a>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() =>
                          navigate("/simulate", {
                            state: {
                              prefillIdea: `Problem: ${c.problem}\n\nProposed: ${c.proposed_solution}\n\nGrounded in real signal (${c.evidence.member_count} mentions across ${c.evidence.sources.map(niceSource).join(", ")}).`,
                            },
                          })
                        }
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Riff on this in Sketchpad
                      </Button>
                      {isAdmin && (
                        <>
                          <Button size="sm" className="gap-1.5" onClick={() => setStatus(realIdx, "promoted")}>
                            Promote <ArrowUpRight className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => setStatus(realIdx, "dismissed")}>
                            <X className="h-3.5 w-3.5" /> Dismiss
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}

              {isSample && (
                <Card className="p-10 text-center">
                  <Radar className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium">Pick a vertical above to load live signal.</p>
                  <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                    The engine is currently listening to {optionTags.length} configured vertical{optionTags.length === 1 ? "" : "s"}.
                    {isAdmin && <> Add a new one with <span className="text-primary">+</span> to start mining a new niche.</>}
                  </p>
                </Card>
              )}

              {isEmpty && (
                <Card className="p-10 text-center">
                  <Radar className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium">No live data yet for {labelFor(activeTag)}.</p>
                  <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                    {verticals.some((v) => v.product_tag === activeTag)
                      ? "The nightly scan will populate this board. "
                      : ""}
                    {isAdmin ? "Or run a scan now to mine fresh pain." : "Check back after the next scan."}
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

            {/* Admin: add a vertical */}
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
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-subs">Subreddits</Label>
                    <Input id="v-subs" placeholder="e.g. logistics, 3PL, supplychain"
                      value={newSubs} onChange={(e) => setNewSubs(e.target.value)} />
                    <p className="text-[11px] text-muted-foreground">Comma or space separated. Drop the r/ prefix.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-kw">Keywords</Label>
                    <Textarea id="v-kw" rows={3} placeholder="e.g. WMS, 3PL software, broker carrier identity, freight scam"
                      value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)} />
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
    </TooltipProvider>
  );
};

export default SignalBoard;
