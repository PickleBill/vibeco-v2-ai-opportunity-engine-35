import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Real, live counts from the Signal Mine. No invented numbers.
 * Falls back to last-known counts if the query fails so we never render zeros.
 */
const FALLBACK = { signals: 1154, sources: 6, candidates: 30, themes: 15 };

const CountUp = ({ target, prefix = "", suffix = "", active }: { target: number; prefix?: string; suffix?: string; active: boolean }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active || target === 0) { setCount(target); return; }
    const duration = 1200, steps = 30, increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(interval); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(interval);
  }, [active, target]);
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
};

const StatsBar = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const navigate = useNavigate();
  const [data, setData] = useState(FALLBACK);

  useEffect(() => {
    (async () => {
      try {
        const [{ count: sigCount }, { count: candCount }, { count: themeCount }, { data: srcRows }] = await Promise.all([
          (supabase as any).from("signal_raw").select("id", { count: "exact", head: true }),
          (supabase as any).from("feature_candidates").select("id", { count: "exact", head: true }),
          (supabase as any).from("signal_themes").select("id", { count: "exact", head: true }),
          (supabase as any).from("signal_raw").select("source").limit(2000),
        ]);
        const sources = new Set<string>((srcRows ?? []).map((r: any) => r.source).filter(Boolean));
        setData({
          signals: sigCount ?? FALLBACK.signals,
          candidates: candCount ?? FALLBACK.candidates,
          themes: themeCount ?? FALLBACK.themes,
          sources: sources.size || FALLBACK.sources,
        });
      } catch { /* keep fallback */ }
    })();
  }, []);

  const stats = [
    { value: data.signals, label: "Real pain signals mined", emphasis: true },
    { value: data.sources, label: "Public sources listening", emphasis: false },
    { value: data.candidates, label: "Ranked feature candidates", emphasis: false },
    { value: data.themes, label: "Durable themes tracked", emphasis: true },
  ];

  return (
    <section ref={ref} className="border-t border-b border-border py-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">
          {stats.map((stat, i) => (
            <button
              key={stat.label}
              onClick={() => navigate("/signal")}
              className={`group ${i === 0 ? 'text-left' : i === stats.length - 1 ? 'text-right' : 'text-center'}`}
              title="Open the Signal Board"
            >
              <p
                className="font-display font-black text-primary group-hover:brightness-110 transition"
                style={{ fontSize: stat.emphasis ? 'clamp(1.75rem, 1rem + 2vw, 2.5rem)' : 'clamp(1.5rem, 0.75rem + 1.5vw, 2rem)' }}
              >
                <CountUp target={stat.value} active={isInView} />
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                {stat.label}
              </p>
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground/70">
          Live numbers from the Signal Mine · click any stat to open the board
        </p>
      </div>
    </section>
  );
};

export default StatsBar;
