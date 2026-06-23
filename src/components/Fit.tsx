import FadeIn from "./FadeIn";
import { Check, X } from "lucide-react";

const good = [
  "You know your customers and their pain points cold",
  "You have an audience or client base ready to test with",
  "You're building tools that solve real problems for real businesses",
  "You're ready to ship and sell — not just brainstorm",
  "You want a partner, not a vendor",
];

const bad = [
  "Ideas without a clear customer or problem",
  "Shopping for the cheapest build over the best one",
  "Complex marketplaces with zero traction",
  "No clear path to revenue or urgency behind the idea",
  "Looking for someone to take orders, not think",
];

const Fit = () => (
  <section className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <FadeIn>
        <p className="text-sm text-muted-foreground uppercase tracking-widest mb-4">
          Who we partner with
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-16">
          Right fit? Wrong fit?
        </h2>
      </FadeIn>
      <div className="grid md:grid-cols-2 gap-8">
        <FadeIn delay={0.05}>
          <div className="bg-card border border-border rounded-lg p-8">
            <h3 className="font-display text-xl font-bold text-foreground mb-6">
              Great for you if…
            </h3>
            <ul className="space-y-4">
              {good.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check size={16} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground/70">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="bg-card border border-border rounded-lg p-8">
            <h3 className="font-display text-xl font-bold text-foreground mb-6">
              Probably not the right fit if…
            </h3>
            <ul className="space-y-4">
              {bad.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <X size={16} className="text-destructive/60 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>
      </div>
    </div>
  </section>
);

export default Fit;
