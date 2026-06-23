import { useState, useRef, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Building2, Server, Cloud, Wand2, Zap } from "lucide-react";
import FadeIn from "./FadeIn";

const eras = [
  {
    id: 0,
    years: "1970s–80s",
    label: "Mainframes",
    icon: Building2,
    time: "3–5 years",
    cost: "$1M+",
    costValue: 100,
    timeValue: 95,
    opportunityValue: 5,
    desc: "Entire buildings, dedicated teams, millions in hardware. Software was a luxury only corporations could afford.",
  },
  {
    id: 1,
    years: "1990s–2000s",
    label: "Dev Shops",
    icon: Server,
    time: "6–12 months",
    cost: "$100K+",
    costValue: 70,
    timeValue: 70,
    opportunityValue: 15,
    desc: "Outsourced dev teams, six-figure budgets, on-premise servers. Startups were born but slowly.",
  },
  {
    id: 2,
    years: "2010s",
    label: "Cloud & Startups",
    icon: Cloud,
    time: "3–6 months",
    cost: "$50K+",
    costValue: 45,
    timeValue: 45,
    opportunityValue: 35,
    desc: "AWS, lean methodology, seed rounds. Faster — but still required engineers and runway.",
  },
  {
    id: 3,
    years: "2020–24",
    label: "No-Code & Early AI",
    icon: Wand2,
    time: "Weeks–Months",
    cost: "$5K+",
    costValue: 20,
    timeValue: 25,
    opportunityValue: 65,
    desc: "DIY tools democratized building, but you hit walls fast. Still limited, still slow for real products.",
  },
  {
    id: 4,
    years: "2025+",
    label: "AI-Native",
    icon: Zap,
    time: "Hours",
    cost: "$0 upfront",
    costValue: 3,
    timeValue: 5,
    opportunityValue: 95,
    desc: "One conversation. Live today. AI handles the stack — you bring the idea. Welcome to VibeCo.",
  },
];

const SpeedTimeline = () => {
  const [activeEra, setActiveEra] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgWidth, setSvgWidth] = useState(600);

  useEffect(() => {
    const updateWidth = () => {
      if (svgRef.current) {
        setSvgWidth(svgRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Auto-animate on first view
  useEffect(() => {
    if (!isInView) return;
    const timer = setTimeout(() => {
      let step = 0;
      const interval = setInterval(() => {
        step++;
        const val = Math.min(step, 100);
        setSliderValue(val);
        setActiveEra(Math.min(Math.floor(val / 25), 4));
        if (val >= 100) clearInterval(interval);
      }, 80);
      return () => clearInterval(interval);
    }, 400);
    return () => clearTimeout(timer);
  }, [isInView]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSliderValue(val);
    setActiveEra(Math.min(Math.floor(val / 25), 4));
  };

  const progress = sliderValue / 100;
  const svgHeight = 200;
  const chartPadding = { top: 20, bottom: 30, left: 30, right: 10 };
  const chartHeight = svgHeight - chartPadding.top - chartPadding.bottom;
  const chartWidth = svgWidth - chartPadding.left - chartPadding.right;

  // Interpolate values based on slider progress
  const getInterpolatedValue = (key: "costValue" | "timeValue" | "opportunityValue") => {
    const idx = progress * 4;
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, 4);
    const t = idx - lo;
    return eras[lo][key] * (1 - t) + eras[hi][key] * t;
  };

  // Generate smooth curve points for a metric
  const generateLine = (key: "timeValue" | "opportunityValue") => {
    const steps = 100;
    const maxStep = Math.floor(steps * progress);
    const points: string[] = [];
    for (let i = 0; i <= maxStep; i++) {
      const t = i / steps;
      const idx = t * 4;
      const lo = Math.floor(idx);
      const hi = Math.min(lo + 1, 4);
      const frac = idx - lo;
      const val = eras[lo][key] * (1 - frac) + eras[hi][key] * frac;
      const x = chartPadding.left + (i / steps) * chartWidth;
      const y = chartPadding.top + chartHeight * (1 - val / 100);
      points.push(`${x},${y}`);
    }
    return points.length > 1 ? `M ${points.join(" L ")}` : "";
  };

  // Cost bars — one per era, only shown up to current progress
  const visibleEras = eras.filter((_, i) => i <= Math.floor(progress * 4 + 0.1));

  return (
    <section ref={sectionRef} className="py-32 border-t border-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <FadeIn>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-foreground leading-tight mb-4 max-w-3xl">
            50 years of cost collapse.
            <br />
            <span className="text-primary">We're at the bottom.</span>
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="text-sm text-muted-foreground mb-16 max-w-lg">
            Drag the slider. Watch what used to cost $1M become free.
          </p>
        </FadeIn>

        {/* Chart */}
        <FadeIn delay={0.15}>
          <div className="relative mb-2">
            {/* Y-axis labels */}
            <div className="flex justify-between mb-1 px-1">
              <span className="text-[10px] text-destructive uppercase tracking-widest flex items-center gap-1">
                Cost ↓
              </span>
              <span className="text-[10px] uppercase tracking-widest flex items-center gap-1" style={{ color: "hsl(142 70% 45%)" }}>
                Opportunity ↑
              </span>
            </div>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full"
              style={{ height: svgHeight }}
              preserveAspectRatio="none"
            >
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((t) => (
                <line
                  key={t}
                  x1={chartPadding.left + t * chartWidth}
                  y1={chartPadding.top}
                  x2={chartPadding.left + t * chartWidth}
                  y2={chartPadding.top + chartHeight}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              ))}

              {/* Cost bars (red, declining) — compressed scale for visual clarity */}
              {visibleEras.map((era) => {
                // Compress cost values so decline is visible: [100,70,45,20,3] → [100,78,58,38,15]
                const compressedCost = 15 + (era.costValue / 100) * 85;
                const barWidth = chartWidth / 5 * 0.55;
                const spacing = chartWidth / (eras.length);
                const barX = chartPadding.left + spacing * era.id + (spacing - barWidth) / 2;
                const barH = (compressedCost / 100) * chartHeight;
                const barY = chartPadding.top + chartHeight - barH;
                return (
                  <motion.rect
                    key={`cost-${era.id}`}
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barH}
                    rx={3}
                    fill="hsl(var(--destructive) / 0.25)"
                    stroke="hsl(var(--destructive) / 0.5)"
                    strokeWidth={1}
                    initial={{ height: 0, y: chartPadding.top + chartHeight }}
                    animate={{ height: barH, y: barY }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                );
              })}

              {/* Time to market line (muted) */}
              <motion.path
                d={generateLine("timeValue")}
                fill="none"
                stroke="hsl(var(--muted-foreground) / 0.5)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="6 4"
              />

              {/* Opportunity line (bold ascending, green) */}
              <motion.path
                d={generateLine("opportunityValue")}
                fill="none"
                stroke="hsl(142 70% 45%)"
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Opportunity glow */}
              <motion.path
                d={generateLine("opportunityValue")}
                fill="none"
                stroke="hsl(142 70% 45% / 0.25)"
                strokeWidth={10}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="blur(4px)"
              />

              {/* Opportunity end dot */}
              {progress > 0.05 && (() => {
                const val = getInterpolatedValue("opportunityValue");
                const cx = chartPadding.left + progress * chartWidth;
                const cy = chartPadding.top + chartHeight * (1 - val / 100);
                return (
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill="hsl(142 70% 45%)"
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                );
              })()}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--destructive) / 0.4)" }} />
              <span className="text-[10px] text-muted-foreground">Cost</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-0.5 rounded" style={{ backgroundColor: "hsl(var(--muted-foreground) / 0.5)", borderStyle: "dashed" }} />
              <span className="text-[10px] text-muted-foreground">Time to Market</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-1 rounded" style={{ backgroundColor: "hsl(142 70% 45%)" }} />
              <span className="text-[10px] text-muted-foreground">Market Opportunity</span>
            </div>
          </div>
        </FadeIn>

        {/* Slider */}
        <FadeIn delay={0.2}>
          <div className="relative mb-12">
            <input
              type="range"
              min={0}
              max={100}
              value={sliderValue}
              onChange={handleSliderChange}
              className="timeline-slider w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${sliderValue}%, hsl(var(--muted)) ${sliderValue}%, hsl(var(--muted)) 100%)`,
              }}
            />
            {/* Era markers */}
            <div className="flex justify-between mt-2">
              {eras.map((era) => (
                <button
                  key={era.id}
                  onClick={() => {
                    const val = era.id * 25;
                    setSliderValue(val);
                    setActiveEra(era.id);
                  }}
                  className={`text-[10px] transition-colors duration-200 ${
                    activeEra === era.id
                      ? "text-primary font-bold"
                      : "text-muted-foreground"
                  }`}
                >
                  {era.years}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Era Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {eras.map((era) => {
            const Icon = era.icon;
            const isActive = activeEra === era.id;

            return (
              <motion.button
                key={era.id}
                onClick={() => {
                  setActiveEra(era.id);
                  setSliderValue(era.id * 25);
                }}
                className={`text-left p-4 rounded-full border transition-all duration-300 ${
                  isActive
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-background hover:border-muted-foreground/30"
                }`}
                animate={{
                  scale: isActive ? 1.02 : 1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <Icon
                  size={20}
                  className={`mb-2 transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <p
                  className={`font-display text-sm font-bold mb-1 transition-colors ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {era.label}
                </p>
                <div className="flex gap-3 mb-2">
                  <span className="text-[10px] text-primary">
                    {era.time}
                  </span>
                  <span className={`text-[10px] ${era.id === 4 ? "text-primary font-bold" : "text-destructive"}`}>
                    {era.cost}
                  </span>
                </div>
                <AnimatePresence>
                  {isActive && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-muted-foreground leading-relaxed"
                    >
                      {era.desc}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SpeedTimeline;
