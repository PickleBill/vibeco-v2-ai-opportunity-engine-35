import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Radar, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OppRow {
  rank: number;
  title: string;
  problem: string;
  motion: string;
  confidence: number;
  customer?: string;
}

const MOTION_LABEL: Record<string, string> = {
  build: "Build a tool",
  sell: "Pre-sell a service",
  partner: "Partner",
};

/**
 * One live opportunity, pulled from the highest-confidence row across
 * all opportunity_roadmaps. Renders nothing if no real data exists —
 * never invents content. Additive to the homepage.
 */
const HomeOpportunityCard = () => {
  const [opp, setOpp] = useState<(OppRow & { vertical: string; product_tag: string }) | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: rms } = await (supabase as any)
          .from("opportunity_roadmaps")
          .select("product_tag, opportunities, generated_at")
          .order("generated_at", { ascending: false })
          .limit(20);
        if (!rms?.length) return;

        let best: { row: OppRow; product_tag: string } | null = null;
        for (const r of rms as any[]) {
          for (const o of (r.opportunities ?? []) as OppRow[]) {
            if (!o?.title || !o?.problem) continue;
            const conf = Number(o.confidence ?? 0);
            if (!best || conf > Number(best.row.confidence ?? 0)) {
              best = { row: o, product_tag: r.product_tag };
            }
          }
        }
        if (!best) return;

        // Look up the human label for the vertical.
        const { data: v } = await (supabase as any)
          .from("signal_verticals")
          .select("vertical")
          .eq("product_tag", best.product_tag)
          .maybeSingle();

        setOpp({ ...best.row, product_tag: best.product_tag, vertical: v?.vertical ?? best.product_tag });
      } catch {
        /* silent — render nothing on failure */
      }
    })();
  }, []);

  if (!opp) return null;

  return (
    <section className="container max-w-4xl py-16">
      <div className="flex items-center gap-2 text-primary">
        <Radar className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">Live from the Signal Board</span>
      </div>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
        An opportunity the engine surfaced today
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pulled from real public complaints in <span className="text-foreground">{opp.vertical}</span>.
      </p>

      <Card className="mt-5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-bold flex-1 min-w-0">{opp.title}</h3>
          <Badge variant="default">{MOTION_LABEL[opp.motion?.toLowerCase()] ?? opp.motion}</Badge>
        </div>
        <p className="mt-3 text-sm text-foreground/90">{opp.problem}</p>
        <div className="mt-4">
          <Link
            to="/signal"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:brightness-110"
          >
            See the opportunity board <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Card>
    </section>
  );
};

export default HomeOpportunityCard;
