import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Inbox as InboxIcon, TrendingUp, AlertCircle, Zap, ArrowRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

interface AutoEvaluatedIdea {
  id: string;
  idea: string;
  created_at: string;
  brief: any;
  auto_score: number | null;
  auto_verdict: string | null;
  auto_source: string | null;
}

const verdictConfig: Record<string, { label: string; color: string; bg: string; icon: typeof TrendingUp }> = {
  "high-confidence": {
    label: "High Confidence",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    icon: TrendingUp,
  },
  "worth-exploring": {
    label: "Worth Exploring",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    icon: Zap,
  },
  "needs-work": {
    label: "Needs Work",
    color: "text-muted-foreground",
    bg: "bg-muted/10 border-muted-foreground/30",
    icon: AlertCircle,
  },
};

/**
 * Inbox — auto-evaluated ideas queued for review.
 *
 * This is where ideas from the Idea Lab (or any external source) land
 * after being auto-evaluated by the flywheel. Ranked by confidence score.
 *
 * Click an idea → opens the full report → refine / Thunderdome / ship.
 */
export default function Inbox() {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState<AutoEvaluatedIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "high-confidence" | "worth-exploring" | "needs-work">("all");

  useEffect(() => {
    loadIdeas();
  }, []);

  async function loadIdeas() {
    setLoading(true);
    // NOTE: auto_score / auto_verdict / auto_source columns exist in a
    // migration but aren't in the generated Supabase types yet — cast through
    // `unknown` until types regenerate. Tracked for Sprint 3 wiring.
    const { data, error } = await (supabase.from as unknown as (t: string) => {
      select: (cols: string) => {
        not: (col: string, op: string, val: null) => {
          order: (col: string, opts: { ascending: boolean; nullsFirst: boolean }) => {
            limit: (n: number) => Promise<{ data: unknown; error: unknown }>;
          };
        };
      };
    })("idea_reports")
      .select("id, idea, created_at, brief, auto_score, auto_verdict, auto_source")
      .not("auto_source", "is", null)
      .order("auto_score", { ascending: false, nullsFirst: false })
      .limit(100);

    if (error) {
      toast.error("Failed to load inbox");
      console.error(error);
    } else {
      setIdeas((data as unknown as AutoEvaluatedIdea[]) || []);
    }
    setLoading(false);
  }

  const filtered = filter === "all" ? ideas : ideas.filter((i) => i.auto_verdict === filter);

  const counts = {
    all: ideas.length,
    "high-confidence": ideas.filter((i) => i.auto_verdict === "high-confidence").length,
    "worth-exploring": ideas.filter((i) => i.auto_verdict === "worth-exploring").length,
    "needs-work": ideas.filter((i) => i.auto_verdict === "needs-work").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <InboxIcon size={22} className="text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">Idea Inbox</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
          Auto-evaluated ideas from the Idea Lab and other sources. Ranked by confidence score.
          Click any idea to see the full analysis and refine into a Lovable prompt.
        </p>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {(["all", "high-confidence", "worth-exploring", "needs-work"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                filter === f
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-card border-border text-muted-foreground hover:border-border/80"
              }`}
            >
              {f === "all" ? "All" : verdictConfig[f]?.label} ({counts[f]})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading inbox...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 rounded-lg border border-dashed border-border text-center">
            <InboxIcon size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filter === "all"
                ? "No auto-evaluated ideas yet. Connect the Idea Lab or call the auto-evaluate endpoint to populate."
                : `No ideas in this category.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((idea, idx) => (
              <IdeaCard key={idea.id} idea={idea} index={idx} onClick={() => navigate(`/report/${idea.id}`)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function IdeaCard({
  idea,
  index,
  onClick,
}: {
  idea: AutoEvaluatedIdea;
  index: number;
  onClick: () => void;
}) {
  const verdict = idea.auto_verdict || "needs-work";
  const config = verdictConfig[verdict] || verdictConfig["needs-work"];
  const Icon = config.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="w-full text-left p-5 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-border/80 transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Score */}
        <div className={`flex-shrink-0 w-16 h-16 rounded-lg ${config.bg} border flex flex-col items-center justify-center`}>
          <span className={`font-display text-xl font-bold ${config.color}`}>
            {idea.auto_score ?? "—"}
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">score</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Icon size={12} className={config.color} />
            <span className={`text-[10px] uppercase tracking-wider ${config.color}`}>
              {config.label}
            </span>
            {idea.auto_source && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">
                  from {idea.auto_source}
                </span>
              </>
            )}
            <span className="text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock size={10} />
              {new Date(idea.created_at).toLocaleDateString()}
            </span>
          </div>

          <p className="font-display text-sm font-medium text-foreground mb-2 line-clamp-2">
            {idea.idea}
          </p>

          {idea.brief?.thesis_statement && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {idea.brief.thesis_statement}
            </p>
          )}
        </div>

        <ArrowRight
          size={18}
          className="flex-shrink-0 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all"
        />
      </div>
    </motion.button>
  );
}
