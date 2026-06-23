import { useState } from "react";
import FadeIn from "./FadeIn";

const services = [
  {
    title: "We Build It",
    desc: "Describe what you need. We build and deploy it — often before the end of the day.",
    detail: "Everything from the idea to the live product — design, tech, the whole stack — handled.",
  },
  {
    title: "From Idea to Plan",
    desc: "We scope it, pressure-test it, and start building — often in the same conversation. No decks. No committees.",
    detail: "Who's the customer? What's the first version look like? How do we get it in front of people? We figure it out together, fast.",
  },
  {
    title: "Launch-Ready from Day One",
    desc: "Landing pages, onboarding flows, analytics, and SEO — all baked in from the start.",
    detail: "SEO, analytics, email capture — all the growth stuff, baked in. You launch and start learning immediately.",
  },
  {
    title: "Learn, Tweak, Grow",
    desc: "Iterate based on real feedback, not guesswork. We build the loops that turn hunches into traction.",
    detail: "Talk to users, read the data, tweak the product, repeat. Move fast, learn faster.",
  },
];

const Services = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="services" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <FadeIn>
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-4">
            What we do
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-16">
            You talk. We build. You ship.
          </h2>
        </FadeIn>
        <div className="grid sm:grid-cols-2 gap-6">
          {services.map((s, i) => (
            <FadeIn key={s.title} delay={i * 0.08}>
              <div
                className={`group relative bg-card border rounded-lg p-8 transition-all duration-500 overflow-hidden ${
                  hoveredIndex === i
                    ? "border-primary/50 shadow-warm scale-[1.01]"
                    : "border-border hover:border-primary/30"
                }`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className={`absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none ${
                    hoveredIndex === i ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    background: "radial-gradient(circle, hsl(var(--primary) / 0.2), transparent)",
                  }}
                />
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.desc}
                </p>
                <div
                  className={`overflow-hidden transition-all duration-500 ${
                    hoveredIndex === i ? "max-h-20 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
                  }`}
                >
                  <p className="text-xs text-primary leading-relaxed border-t border-border pt-3">
                    {s.detail}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
