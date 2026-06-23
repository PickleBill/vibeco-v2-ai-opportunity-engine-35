import FadeIn from "./FadeIn";

const Thesis = () => (
  <section id="thesis" className="py-32 border-t border-border">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <div className="max-w-3xl mx-auto">
        <FadeIn>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-foreground leading-tight mb-8">
            The speed will blow your mind.
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="text-base text-foreground/80 leading-relaxed max-w-2xl">
            What used to take a team of developers and months of runway? We do it
            in hours with AI. You talk, we build, you show it to real people. It's
            not magic — it's just what happens when great tools meet real conviction.
          </p>
        </FadeIn>
      </div>
    </div>
  </section>
);

export default Thesis;
