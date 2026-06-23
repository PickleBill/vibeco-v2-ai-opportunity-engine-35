import FadeIn from "./FadeIn";

const SocialProof = () => {
  return (
    <section className="py-24 border-t border-border bg-surface">
      <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
        <FadeIn>
          <p className="text-sm text-primary uppercase tracking-widest mb-8">
            Proven where it counts
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <blockquote
            className="font-display font-bold text-foreground leading-snug mb-10"
            style={{ fontSize: "clamp(1.5rem, 1rem + 2vw, 2.5rem)" }}
          >
            &ldquo;The AI didn't replace the team&nbsp;&mdash; it gave them back the day. The
            quoting and chasing just&nbsp;<span className="text-primary">handled itself</span>.&rdquo;
          </blockquote>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="text-sm text-muted-foreground">
            Operations lead &middot; national logistics company
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="mt-12 pt-10 border-t border-border max-w-2xl mx-auto">
            <p className="text-sm text-foreground/80 leading-relaxed">
              This playbook ran across a high-volume logistics operation before we ever packaged it.
              We're bringing that same enterprise-grade motion to companies too small to build it
              for themselves.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};

export default SocialProof;
