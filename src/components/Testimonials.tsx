import FadeIn from "./FadeIn";

const testimonials = [
  {
    quote: "Described my app at 9 AM. By lunch I had a working prototype with real users signing up.",
    name: "Jordan M.",
    role: "Fitness coach → app founder",
    highlight: true,
  },
  {
    quote: "Two agencies quoted $80K. VibeCo shipped the same thing in a weekend on rev-share.",
    name: "Priya S.",
    role: "E-commerce operator",
    highlight: false,
  },
  {
    quote: "The simulator tore my assumptions apart — in the best way. Saved me from building the wrong thing.",
    name: "Marcus T.",
    role: "Serial entrepreneur",
    highlight: false,
  },
];

const Testimonials = () => {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <FadeIn>
          <p className="text-sm text-primary uppercase tracking-widest mb-3">
            From our partners
          </p>
          <h2
            className="font-display font-black text-foreground mb-14 max-w-2xl"
            style={{ fontSize: "clamp(1.75rem, 1rem + 2vw, 2.75rem)" }}
          >
            From their words, not ours.
          </h2>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.1}>
              <div
                className={`
                  relative p-6 lg:p-8 rounded-full border transition-colors duration-300
                  ${t.highlight
                    ? "border-primary/40 bg-primary/[0.04] md:row-span-1 md:-mt-4 md:mb-4"
                    : "border-border bg-surface hover:border-primary/20"
                  }
                `}
              >
                <blockquote
                  className="text-foreground/90 leading-relaxed mb-6"
                  style={{ fontSize: t.highlight ? "clamp(0.938rem, 0.8rem + 0.4vw, 1.063rem)" : "clamp(0.875rem, 0.75rem + 0.3vw, 0.938rem)" }}
                >
                  "{t.quote}"
                </blockquote>
                <div>
                  <p className="font-display text-sm font-bold text-foreground">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.role}
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

export default Testimonials;
