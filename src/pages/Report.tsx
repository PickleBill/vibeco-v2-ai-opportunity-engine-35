import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Users,
  Layers,
  DollarSign,
  TrendingUp,
  Eye,
  MessageSquare,
  ImageIcon,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { copyToClipboard } from "@/lib/copyToClipboard";

const sectionMeta = [
  { key: "problem", label: "Problem / Opportunity", icon: AlertTriangle },
  { key: "target_customer", label: "Target Customer", icon: Users },
  { key: "core_features", label: "Core Features", icon: Layers },
  { key: "revenue_model", label: "Revenue Model", icon: DollarSign },
  { key: "industry_trends", label: "Industry & Competitors", icon: TrendingUp },
  { key: "investor_perspective", label: "Investor Perspective & Next Steps", icon: Eye },
  { key: "customer_perspective", label: "Customer Perspective", icon: MessageSquare },
] as const;

interface BriefData {
  problem: string;
  target_customer: string;
  core_features: { name: string; description: string }[];
  revenue_model: string;
  industry_trends: string;
  investor_perspective: string;
  customer_perspective: string;
}

interface ReportData {
  id: string;
  idea: string;
  brief: BriefData;
  lovable_prompt: string | null;
  concept_image_url: string | null;
  logo_image_url: string | null;
  highlights: string[];
  created_at: string;
}

const Report = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const { data, error } = await (supabase.from("idea_reports") as any)
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) { setNotFound(true); }
      else { setReport(data as ReportData); }
      setLoading(false);
    })();
  }, [id]);

  const handleCopyPrompt = async () => {
    if (!report?.lovable_prompt) return;
    const ok = await copyToClipboard(report.lovable_prompt);
    if (ok) {
      setCopied(true);
      toast.success("Prompt copied!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Failed to copy.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading report...</div>
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Report not found.</p>
        <Link to="/simulate" className="text-sm text-primary hover:underline">
          Try the simulator →
        </Link>
      </div>
    );
  }

  const highlightSet = new Set(report.highlights || []);

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <p className="text-xs text-primary uppercase tracking-widest mb-1">VibeCo AI Report</p>
          {report.logo_image_url && (
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-primary/20 bg-card/60"
                style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.15)" }}>
                <img src={report.logo_image_url} alt="Product mark" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
          <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground mb-2">
            {report.idea}
          </h1>
          <p className="text-xs text-muted-foreground">
            Generated {new Date(report.created_at).toLocaleDateString()}
          </p>
        </motion.div>

        {report.concept_image_url && (
          <div className="mb-8 rounded-lg overflow-hidden border border-border/30">
            <div className="relative">
              <img src={report.concept_image_url} alt="Product concept" className="w-full h-48 sm:h-64 object-cover" />
              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-background/80 backdrop-blur-sm">
                <ImageIcon size={10} className="text-primary" />
                <span className="text-[10px] text-muted-foreground">Product Vision</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-px rounded-lg mb-8"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.4), hsl(var(--accent) / 0.2))" }}>
          <div className="p-6 sm:p-8 rounded-lg bg-background">
            <div className="grid gap-6">
              {sectionMeta.map((section, i) => {
                const Icon = section.icon;
                const value = report.brief[section.key as keyof BriefData];
                return (
                  <motion.div key={section.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} className="text-primary" />
                      <h4 className="font-display text-sm font-bold text-foreground uppercase tracking-wide">{section.label}</h4>
                      {highlightSet.has(section.key) && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-[10px] text-primary">
                          <Sparkles size={10} className="fill-primary" />
                          Resonates
                        </span>
                      )}
                    </div>
                    {section.key === "core_features" && Array.isArray(value) ? (
                      <div className="grid gap-2 ml-5">
                        {(value as BriefData["core_features"]).map((feat, fi) => (
                          <p key={fi} className="text-base text-foreground/90 leading-relaxed">
                            <span className="text-primary font-bold">{fi + 1}.</span>{" "}
                            <span className="font-semibold">{feat.name}</span> — {feat.description}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-base text-foreground/90 leading-relaxed ml-5">{value as string}</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {report.lovable_prompt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mb-8">
            <div className="border border-border/30 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/20">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  One-shot prompt — paste into Lovable to build your landing page
                </span>
                <button onClick={handleCopyPrompt}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50">
                  {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="p-4 max-h-48 overflow-y-auto">
                <pre className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {report.lovable_prompt}
                </pre>
              </div>
            </div>
          </motion.div>
        )}

        <div className="text-center pt-4 border-t border-border/20">
          <p className="text-sm text-muted-foreground mb-3">Want to simulate your own idea?</p>
          <Link to="/simulate"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            Try the simulator <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Report;
