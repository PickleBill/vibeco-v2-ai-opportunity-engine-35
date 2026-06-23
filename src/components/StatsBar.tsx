import { useRef, useEffect, useState } from "react";
import { useInView } from "framer-motion";

const stats = [
  { value: 24, suffix: "/7", label: "Email & phone covered", emphasis: true },
  { value: 4, suffix: "", label: "Workflows handled end-to-end", emphasis: false },
  { value: 2, prefix: "", suffix: "+", label: "Proofs already shipped", emphasis: false },
  { value: 48, prefix: "< ", suffix: "hrs", label: "Scoped idea to demo", emphasis: true },
];


const CountUp = ({ target, prefix = "", suffix = "", active }: { target: number; prefix?: string; suffix?: string; active: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (target === 0) { setCount(0); return; }
    const duration = 1200;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [active, target]);

  return <span>{prefix}{count}{suffix}</span>;
};

const StatsBar = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="border-t border-b border-border py-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`${i === 0 ? 'text-left' : i === stats.length - 1 ? 'text-right' : 'text-center'}`}
            >
              <p
                className="font-display font-black text-primary"
                style={{ fontSize: stat.emphasis ? 'clamp(1.75rem, 1rem + 2vw, 2.5rem)' : 'clamp(1.5rem, 0.75rem + 1.5vw, 2rem)' }}
              >
                <CountUp target={stat.value} prefix={stat.prefix} suffix={stat.suffix} active={isInView} />
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
