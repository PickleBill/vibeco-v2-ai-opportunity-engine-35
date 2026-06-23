import { useState } from "react";
import { motion } from "framer-motion";
import FadeIn from "./FadeIn";
import { TrendingUp } from "lucide-react";

const projects = [
  {
    name: "Courtana",
    thesis: "Competitive racquet sports lack accessible, real-time performance analytics for amateur players.",
    built: "AI-powered async coaching platform — upload match footage, receive instant shot-by-shot analysis with improvement plans.",
    kpi: "68%",
    kpiLabel: "7-day return rate",
    color: "from-primary/20 to-primary/5",
  },
  {
    name: "GreenPaws",
    thesis: "Local lawn care is a high-frequency, high-loyalty vertical with zero modern booking infrastructure.",
    built: "Premium service platform with instant quoting, automated scheduling, and before/after showcases.",
    kpi: "3.2×",
    kpiLabel: "booking conversion lift",
    color: "from-primary/15 to-primary/5",
  },
  {
    name: "Unicorse",
    thesis: "Luxury real estate sellers need data-driven market intelligence, not generic listing pages.",
    built: "Seller-focused platform with live market comps, AI-generated home valuations, and premium listing experience.",
    kpi: "4×",
    kpiLabel: "avg. session duration",
    color: "from-primary/10 to-primary/5",
  },
];

const Builds = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="builds" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <FadeIn>
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-4">
            Selected Builds
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-16">
            Real thesis. Real traction.
          </h2>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6">
          {projects.map((p, i) => (
            <FadeIn key={p.name} delay={i * 0.1}>
              <div
                className={`group relative bg-card border rounded-lg overflow-hidden transition-all duration-500 h-full ${
                  hoveredIndex === i
                    ? "border-primary/50 shadow-warm-lg scale-[1.02]"
                    : "border-border hover:border-primary/30"
                }`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none ${
                    hoveredIndex === i ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    background: "radial-gradient(circle, hsl(var(--primary) / 0.25), transparent)",
                  }}
                />
                <div className={`h-32 bg-gradient-to-br ${p.color} flex items-center justify-center`}>
                  <div className="w-3/4 bg-background/60 border border-border rounded-md p-3 shadow-deep">
                    <div className="h-2 w-1/2 bg-secondary rounded-full mb-2" />
                    <div className="h-2 w-3/4 bg-secondary rounded-full mb-2" />
                    <div className="flex gap-2">
                      <div className="h-5 flex-1 bg-primary/20 rounded-full" />
                      <div className="h-5 w-10 bg-primary/30 rounded-full" />
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-[10px] text-primary uppercase tracking-widest mb-2">
                      Thesis
                    </p>
                    <h3 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {p.thesis}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                      What we shipped
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {p.built}
                    </p>
                  </div>
                  {/* Animated result card on hover */}
                  <div
                    className={`overflow-hidden transition-all duration-500 ${
                      hoveredIndex === i ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <motion.div
                      initial={false}
                      animate={hoveredIndex === i ? { y: 0, opacity: 1 } : { y: 8, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-border pt-4 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <TrendingUp size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-display text-2xl font-black text-primary leading-none">
                          {p.kpi}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                          {p.kpiLabel}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Builds;
