import FadeIn from "./FadeIn";
import { ArrowRight } from "lucide-react";
import { useDiscoveryAudit } from "./discovery/DiscoveryAuditProvider";

const scrollTo = (id: string) =>
  document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });

const FinalCta = () => {
  const { open: openDiscovery } = useDiscoveryAudit();
  return (
    <section
      className="py-32 border-t border-border"
      style={{ background: "radial-gradient(ellipse 60% 40% at 50% 100%, hsl(var(--violet) / 0.10), transparent)" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
        <FadeIn>
          <p className="text-xs text-primary tracking-[0.3em] uppercase mb-4">
            ready when you are
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-foreground mb-6">
            See where AI takes work off your plate.
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="text-base text-muted-foreground mb-10 max-w-md mx-auto">
            A discovery audit maps your inbound email and phone, then shows the first workflow
            worth automating — concrete, scoped to you.
          </p>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={openDiscovery}
              className="group relative font-display text-sm font-semibold bg-violet text-violet-foreground px-10 py-4 rounded-full hover:brightness-110 transition-all duration-300 inline-flex items-center gap-2 shadow-violet"
            >
              Book a discovery audit
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => scrollTo("#scan")}
              className="text-sm border border-primary/40 text-primary px-8 py-4 rounded-full hover:bg-primary/10 transition-all duration-300 inline-flex items-center gap-2"
            >
              Run an opportunity scan
            </button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};

export default FinalCta;
