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

  // Curated board only — only registered signal_verticals rows show up here.
  // Anonymous public `scan-*` product_tags from feature_candidates are excluded.
  const optionTags = useMemo(() => verticals.map((v) => v.product_tag), [verticals]);

  const labelFor = (tag: string | null) => (tag ? verticals.find((v) => v.product_tag === tag)?.vertical ?? tag : "");

  const isSample = !activeTag;
  const isEmpty = !!activeTag && !loading && candidates.length === 0;
  const allTriaged = !!activeTag && !loading && candidates.length > 0 && visible.length === 0;
  const ingestAge = daysSince(latestScanDate);
  const verticalLabel = labelFor(activeTag) || "your market";

  // ── Derived display values ─────────────────────────────────────
  const heroCandidate = visible[0] ?? null;
  const restCandidates = visible.slice(1);
  const heroOpp = roadmap?.opportunities?.[0] ?? null;
  const loudnessLabel = (s: number) =>
    s >= 75 ? "Severe" : s >= 55 ? "High" : s >= 35 ? "Medium" : "Mild";
  const effortLabel = (e: "S" | "M" | "L") =>
    e === "S" ? "Small lift" : e === "L" ? "Large lift" : "Medium lift";
  const moveLabel = heroOpp ? motionFor(heroOpp.motion).label : "Sketch it";
  const statusLine = (() => {
    if (isSample) return "Pick a vertical to load live signal";
    if (isEmpty) return "No live data yet";
    const parts: string[] = [];
    if (ingestAge !== null) parts.push(`Last scan · ${ingestAge === 0 ? "today" : `${ingestAge}d ago`}`);
    if (verticalEvidenceCount !== null) parts.push(`${verticalEvidenceCount.toLocaleString()} sources`);
    parts.push(`${candidates.length} candidates`);
    return parts.join(" · ");
  })();

  const sketchPrefill = (c: Candidate) =>
    `Problem: ${c.problem}\n\nProposed: ${c.proposed_solution}\n\nGrounded in real signal (${c.evidence.member_count} mentions across ${c.evidence.sources.map(niceSource).join(", ")}).`;

  return (
    <TooltipProvider delayDuration={200}>
      <HelmetProvider>
        <Helmet><title>Signal Board · what real people are complaining about right now</title></Helmet>

        <div className="min-h-screen bg-[#0a0a1a] text-[#ECECF5]" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
          <Navbar />

          {/* ── Header: vertical selector + status line ───────────── */}
          <header className="max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#1e1e5a]">
            <div className="flex items-center gap-5 min-w-0">
              <div className="flex items-center gap-2 text-[#4f46e5] shrink-0">
                <Radar className="h-4 w-4" />
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase">Signal Board</span>
              </div>
              <div className="h-4 w-px bg-[#1e1e5a] hidden sm:block" />
              {optionTags.length > 0 ? (
                <Select value={activeTag ?? undefined} onValueChange={(v) => setActiveTag(v)}>
                  <SelectTrigger className="h-9 min-w-[170px] bg-transparent border-[#1e1e5a] text-[#ECECF5] hover:border-[#4f46e5]">
                    <SelectValue placeholder="Pick a vertical" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141432] border-[#1e1e5a] text-[#ECECF5]">
                    {optionTags.map((t) => <SelectItem key={t} value={t}>{labelFor(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm text-[#8A8AA8]">No verticals configured</span>
              )}
              <span className="hidden md:inline text-xs text-[#8A8AA8] font-medium tracking-wide truncate">
                {statusLine}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-[#8A8AA8] hover:bg-[#141432] hover:text-[#ECECF5]"
                    title="Add a vertical"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={runScan}
                    disabled={scanning}
                    className="h-9 gap-2 bg-[#141432] hover:bg-[#1e1e5a] text-[#ECECF5] border border-[#1e1e5a]"
                  >
                    {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {scanning ? "Scanning…" : "Run scan"}
                  </Button>
                </>
              )}
            </div>
          </header>

          {/* mobile status line */}
          <div className="md:hidden max-w-7xl mx-auto px-6 pt-3 text-xs text-[#8A8AA8]">
            {statusLine}
          </div>

          {/* Live scan stepper */}
          {(scanning || scanSteps.length > 0) && (
            <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-4">
              <div className="rounded-xl border border-[#1e1e5a] bg-[#141432] p-3">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#8A8AA8] mb-2">
                  {scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                  {scanning ? "Mining live sources" : "Last run"}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {scanSteps.length === 0 && scanning && (
                    <span className="text-xs text-[#8A8AA8]">Spinning up adapters…</span>
                  )}
                  {scanSteps.map((s) => (
                    <span
                      key={s.name}
                      className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border ${
                        s.status === "skipped"
                          ? "opacity-40 border-[#1e1e5a] text-[#8A8AA8]"
                          : s.status === "degraded"
                          ? "border-amber-500/40 text-amber-300"
                          : "border-emerald-500/40 text-emerald-300"
                      }`}
                    >
                      {s.status === "skipped" ? <X className="h-3 w-3" /> :
                       s.status === "degraded" ? <AlertTriangle className="h-3 w-3" /> :
                       <CheckCircle2 className="h-3 w-3" />}
                      {niceSource(s.name)}
                      {s.status !== "skipped" && <span className="opacity-70">· {s.posts}</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <main className="max-w-7xl mx-auto px-6 lg:px-10 pt-12 pb-24">

            {/* ── HERO: Opportunity of the day ───────────────────── */}
            {heroCandidate ? (
              <section className="animate-in fade-in duration-700">
                <div className="flex flex-col gap-4 mb-10">
                  <span className="text-[#4f46e5] text-xs font-bold tracking-[0.25em] uppercase">
                    Opportunity of the day
                  </span>
                  <h1
                    className="font-extrabold tracking-tight leading-[1.05] max-w-4xl"
                    style={{ fontSize: "clamp(2.25rem, 5vw, 4.5rem)" }}
                  >
                    {heroCandidate.cluster_theme}
                  </h1>
                </div>

                <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
                  {/* LEFT: argument */}
                  <div className="lg:col-span-7 space-y-10">
                    <div className="space-y-3">
                      <p className="text-[#8A8AA8] text-xs font-bold uppercase tracking-[0.2em]">The repeated pain</p>
                      <p className="text-lg sm:text-xl text-[#ECECF5] leading-relaxed">
                        {heroCandidate.problem}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-[#1e1e5a] py-8">
                      <div>
                        <p className="text-[#8A8AA8] text-[11px] font-bold uppercase mb-1.5 tracking-wider">How sure we are</p>
                        <p className="text-2xl font-bold tabular-nums">{Math.round(heroCandidate.confidence)}%</p>
                      </div>
                      <div>
                        <p className="text-[#8A8AA8] text-[11px] font-bold uppercase mb-1.5 tracking-wider">How loud the complaint is</p>
                        <p className="text-2xl font-bold">{loudnessLabel(heroCandidate.pain_score)}</p>
                      </div>
                      <div>
                        <p className="text-[#8A8AA8] text-[11px] font-bold uppercase mb-1.5 tracking-wider">Lift</p>
                        <p className="text-2xl font-bold">{effortLabel(heroCandidate.effort)}</p>
                      </div>
                      <div>
                        <p className="text-[#8A8AA8] text-[11px] font-bold uppercase mb-1.5 tracking-wider">Recommended move</p>
                        <p className="text-2xl font-bold">{moveLabel}</p>
                      </div>
                    </div>

                    {/* Evidence quotes inline */}
                    {heroCandidate.representative_quotes?.length > 0 && (
                      <div className="space-y-4">
                        <p className="text-[#8A8AA8] text-xs font-bold uppercase tracking-[0.2em]">
                          What people are actually saying ({heroCandidate.evidence.member_count} real posts)
                        </p>
                        <div className="space-y-4">
                          {heroCandidate.representative_quotes.slice(0, 2).map((q, i) => {
                            const src = heroCandidate.evidence.sources[i] ?? heroCandidate.evidence.sources[0];
                            return (
                              <blockquote
                                key={i}
                                className="rounded-xl border border-[#1e1e5a] bg-[#141432] p-6 italic text-[#ECECF5]/90 relative"
                              >
                                <Quote className="absolute top-4 right-4 h-4 w-4 text-[#4f46e5]/40" />
                                <p className="leading-relaxed">"{q}"</p>
                                {src && (
                                  <p className="mt-3 not-italic text-xs text-[#4f46e5] font-bold tracking-wide">
                                    {niceSource(src)}
                                  </p>
                                )}
                              </blockquote>
                            );
                          })}
                        </div>

                        {/* Real source links */}
                        {heroCandidate.cluster_id && (
                          <div>
                            <button
                              onClick={() => toggleExpand(heroCandidate)}
                              className="text-xs font-bold text-[#4f46e5] inline-flex items-center gap-1.5 hover:brightness-125"
                            >
                              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedId === (heroCandidate.id ?? heroCandidate.cluster_theme) ? "rotate-180" : ""}`} />
                              {expandedId === (heroCandidate.id ?? heroCandidate.cluster_theme)
                                ? "Hide source posts"
                                : `Show ${heroCandidate.evidence.member_count} source posts`}
                            </button>
                            {expandedId === (heroCandidate.id ?? heroCandidate.cluster_theme) && (
                              <div className="mt-3 space-y-1.5 rounded-lg border border-[#1e1e5a] bg-[#0a0a1a] p-3">
                                {!(heroCandidate.cluster_id && evidenceCache[heroCandidate.cluster_id]) ? (
                                  <div className="flex items-center gap-2 text-xs text-[#8A8AA8]">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Loading source posts…
                                  </div>
                                ) : evidenceCache[heroCandidate.cluster_id!].length === 0 ? (
                                  <p className="text-xs text-[#8A8AA8]">No source rows linked yet.</p>
                                ) : (
                                  evidenceCache[heroCandidate.cluster_id!].slice(0, 8).map((r) => (
                                    <a
                                      key={r.id}
                                      href={r.source_url ?? "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group flex items-start gap-2 text-xs hover:bg-[#141432] rounded p-1.5 transition"
                                    >
                                      <span className="text-[10px] uppercase tracking-wider text-[#4f46e5] font-bold shrink-0 mt-0.5">{niceSource(r.source)}</span>
                                      <span className="flex-1 text-[#ECECF5]/80 group-hover:text-[#ECECF5] line-clamp-2">
                                        {r.title || r.body?.slice(0, 140) || "(untitled)"}
                                      </span>
                                      <ExternalLink className="h-3 w-3 text-[#8A8AA8] group-hover:text-[#4f46e5] shrink-0 mt-0.5" />
                                    </a>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* RIGHT: strategy panel (sticky) */}
                  <div className="lg:col-span-5 lg:sticky lg:top-24">
                    <div className="bg-[#141432] p-8 rounded-2xl border border-[#1e1e5a] space-y-7">
                      <div>
                        <h3 className="text-[11px] font-bold text-[#8A8AA8] uppercase tracking-[0.2em] mb-5">
                          {heroOpp ? "Strategy" : "What we'd build"}
                        </h3>
                        {heroOpp ? (
                          <div className="space-y-5 text-sm">
                            <div>
                              <p className="font-bold text-[#ECECF5] mb-1">What we'd build</p>
                              <p className="text-[#ECECF5]/75 leading-relaxed">{heroOpp.build}</p>
                            </div>
                            <div>
                              <p className="font-bold text-[#ECECF5] mb-1">Who'd buy it</p>
                              <p className="text-[#ECECF5]/75 leading-relaxed">{heroOpp.customer}</p>
                            </div>
                            {heroOpp.roi && (
                              <div>
                                <p className="font-bold text-[#ECECF5] mb-1">Why it pays</p>
                                <p className="text-[#ECECF5]/75 leading-relaxed">{heroOpp.roi}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-[#ECECF5]/80 leading-relaxed">
                            {heroCandidate.proposed_solution || "Riff this signal in Sketchpad to draft a build."}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => navigate("/simulate", { state: { prefillIdea: sketchPrefill(heroCandidate) } })}
                        className="w-full bg-[#6A2CF5] py-4 rounded-lg font-bold text-white hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-[#6A2CF5]/25 inline-flex items-center justify-center gap-2"
                      >
                        Sketch this idea
                        <ArrowUpRight className="h-4 w-4" />
                      </button>

                      {isAdmin && (
                        <div className="pt-2 border-t border-[#1e1e5a] flex items-center gap-4 text-[11px]">
                          <button
                            onClick={() => setStatus(0, "promoted")}
                            className="text-[#4f46e5] font-bold hover:brightness-125"
                          >
                            Promote
                          </button>
                          <button
                            onClick={() => setStatus(0, "dismissed")}
                            className="text-[#8A8AA8] hover:text-[#ECECF5]"
                          >
                            Dismiss
                          </button>
                          {isAdmin && !roadmap && (
                            <button
                              onClick={draftRoadmap}
                              disabled={drafting || isEmpty}
                              className="ml-auto text-[#4f46e5] font-bold hover:brightness-125 inline-flex items-center gap-1.5"
                            >
                              {drafting && <Loader2 className="h-3 w-3 animate-spin" />}
                              Draft roadmap
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section className="py-24 text-center">
                <Radar className="mx-auto h-10 w-10 text-[#1e1e5a]" />
                <p className="mt-4 text-lg font-bold">
                  {isSample
                    ? "Pick a vertical to load live signal."
                    : isEmpty
                    ? `No live data yet for ${labelFor(activeTag)}.`
                    : "No open candidates."}
                </p>
                <p className="mt-2 text-sm text-[#8A8AA8] max-w-md mx-auto">
                  {isSample
                    ? `The engine is listening to ${optionTags.length} configured vertical${optionTags.length === 1 ? "" : "s"}.`
                    : "The nightly scan will populate this board, or run one now."}
                </p>
                {isAdmin && !isSample && (
                  <Button onClick={runScan} disabled={scanning} className="mt-6 gap-2 bg-[#6A2CF5] hover:bg-[#5a24d1] text-white border-0">
                    {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {scanning ? "Scanning…" : "Run scan now"}
                  </Button>
                )}
              </section>
            )}

            {/* ── Stack reveal: the rest of the opportunities ───── */}
            {restCandidates.length > 0 && (
              <section className="mt-28">
                <div className="flex items-center justify-between mb-10 gap-6">
                  <h2 className="text-xl sm:text-2xl font-bold">
                    See {restCandidates.length} more {restCandidates.length === 1 ? "opportunity" : "opportunities"}
                  </h2>
                  <div className="h-px flex-grow bg-[#1e1e5a]" />
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {restCandidates.map((c, idx) => (
                    <button
                      key={(c.id ?? c.cluster_theme) + idx}
                      onClick={() => navigate("/simulate", { state: { prefillIdea: sketchPrefill(c) } })}
                      className="text-left bg-[#141432] p-6 rounded-xl border border-[#1e1e5a] hover:border-[#4f46e5] transition-colors group flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <span className="px-2 py-1 bg-[#1e1e5a] text-[10px] font-bold uppercase tracking-widest rounded text-[#ECECF5]/80">
                          {effortLabel(c.effort)}
                        </span>
                        <span className="text-[#4f46e5] font-bold text-xs group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                      <h4 className="font-bold mb-2 leading-snug">{c.cluster_theme}</h4>
                      <p className="text-sm text-[#8A8AA8] line-clamp-3 flex-1">{c.problem}</p>
                      <div className="mt-4 pt-3 border-t border-[#1e1e5a] flex items-center justify-between text-[11px] text-[#8A8AA8]">
                        <span>{loudnessLabel(c.pain_score)} · {Math.round(c.confidence)}% sure</span>
                        <span>{c.evidence.member_count} posts</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Search/filter footer — kept available but de-emphasized */}
            {!isSample && !isEmpty && candidates.length > 4 && (
              <section className="mt-20 pt-10 border-t border-[#1e1e5a]">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8AA8]" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search problems, quotes, themes…"
                      className="h-10 pl-9 text-sm bg-[#141432] border-[#1e1e5a] text-[#ECECF5] placeholder:text-[#8A8AA8]"
                    />
                  </div>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="h-10 w-full sm:w-[180px] text-sm bg-[#141432] border-[#1e1e5a] text-[#ECECF5]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141432] border-[#1e1e5a] text-[#ECECF5]">
                      <SelectItem value="pain">Sort: loudest pain</SelectItem>
                      <SelectItem value="confidence">Sort: most confident</SelectItem>
                      <SelectItem value="recent">Sort: most evidence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(query || sourceFilter) && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#8A8AA8]">
                    <span>Showing <span className="text-[#ECECF5] font-medium">{visible.length}</span> of {candidates.length}</span>
                    <button
                      onClick={() => { setQuery(""); setSourceFilter(null); }}
                      className="text-[#4f46e5] hover:brightness-125 font-bold"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </section>
            )}
          </main>

          {/* Admin: add a vertical */}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent className="bg-[#141432] border-[#1e1e5a] text-[#ECECF5]">
              <DialogHeader>
                <DialogTitle>Add a vertical</DialogTitle>
                <DialogDescription className="text-[#8A8AA8]">
                  Define a niche to listen to. The nightly scan mines these subreddits for these
                  keywords and ranks the pain it finds.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="v-name">Vertical</Label>
                  <Input id="v-name" placeholder="e.g. Wholesale distribution / 3PL"
                    value={newVertical} onChange={(e) => setNewVertical(e.target.value)}
                    className="bg-[#0a0a1a] border-[#1e1e5a] text-[#ECECF5]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-subs">Subreddits</Label>
                  <Input id="v-subs" placeholder="e.g. logistics, 3PL, supplychain"
                    value={newSubs} onChange={(e) => setNewSubs(e.target.value)}
                    className="bg-[#0a0a1a] border-[#1e1e5a] text-[#ECECF5]" />
                  <p className="text-[11px] text-[#8A8AA8]">Comma or space separated. Drop the r/ prefix.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="v-kw">Keywords</Label>
                  <Textarea id="v-kw" rows={3} placeholder="e.g. WMS, 3PL software, broker carrier identity, freight scam"
                    value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)}
                    className="bg-[#0a0a1a] border-[#1e1e5a] text-[#ECECF5]" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={saving} className="text-[#8A8AA8] hover:bg-[#1e1e5a] hover:text-[#ECECF5]">Cancel</Button>
                <Button onClick={createVertical} disabled={saving} className="gap-2 bg-[#6A2CF5] hover:bg-[#5a24d1] text-white">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add vertical
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </HelmetProvider>
    </TooltipProvider>
  );
};

export default SignalBoard;
