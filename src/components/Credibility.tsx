import FadeIn from "./FadeIn";

const traits = [
  "Thinks like a founder — what makes money, how to grow it, how to reach people.",
  "Product-aware — design and growth are built in from day one, not afterthoughts.",
  "Visually opinionated — craft matters. We ship things worth looking at.",
  "Biased toward shipping — ideas are cheap. Testable products aren't.",
  "Structured around upside — on the right deals, we put skin in the game.",
];

const Credibility = () => (
  <section className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <div className="max-w-3xl">
        <FadeIn>
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-4">
            Operating style
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-8">
            Builder, not vendor.
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="text-sm text-foreground/80 leading-relaxed mb-10">
            Led by a builder who's shipped across industries. Not a services
            play — a thinking partnership.
          </p>
        </FadeIn>
        <ul className="space-y-4">
          {traits.map((t, i) => (
            <FadeIn key={i} delay={0.15 + i * 0.05}>
              <li className="flex items-start gap-3">
                <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                <span className="text-sm text-foreground/80 leading-relaxed">
                  {t}
                </span>
              </li>
            </FadeIn>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

export default Credibility;
