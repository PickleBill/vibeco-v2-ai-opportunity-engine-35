import FadeIn from "./FadeIn";
import { useDiscoveryAudit } from "./discovery/DiscoveryAuditProvider";
import { ExternalLink, ArrowUpRight } from "lucide-react";

type Proof = {
  name: string;
  category: string;
  problem: string;
  result: string;
  status: "Live" | "In build" | "Piloting";
  url?: string;
};

const proofs: Proof[] = [
  {
    name: "Courtana",
    category: "Sports Tech",
    problem: "Pickleball venues had no way to capture, score, and replay play on their courts automatically.",
    result: "AI smart-court tech that turns every court into a recording, scoring, and coaching surface.",
    status: "Live",
    url: "https://courtanacoach.lovable.app",
  },
  {
    name: "Pickle DaaS",
    category: "Data Infrastructure",
    problem: "Fragmented court, player, and match data had no clean, queryable home.",
    result: "A data pipeline product that ingests, normalizes, and serves the sport's data on demand.",
    status: "In build",
  },
  {
    name: "Logistics Ops Engine",
    category: "Operations AI",
    problem: "Inbound email and phone buried the team in quoting, intake, scheduling, and follow-up.",
    result: "The enterprise-proven playbook this whole engine is built on — now being packaged for SMBs.",
    status: "Piloting",
  },
];

const statusStyles: Record<Proof["status"], string> = {
  Live: "text-primary border-primary/30 bg-primary/10",
  "In build": "text-violet border-violet/30 bg-violet/10",
  Piloting: "text-muted-foreground border-border bg-muted/40",
};

const ProofShowcase = () => {
  const { open: openDiscovery } = useDiscoveryAudit();
  return (
    <section id="proofs" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-2xl mb-16">
          <FadeIn>
            <p className="text-sm text-primary uppercase tracking-widest mb-4">
              Built proofs
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-4">
              Shipped, not theorized.
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Each one started as a bottleneck and became working software. Same engine, different
              industries.
            </p>
          </FadeIn>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {proofs.map((p, i) => {
            const Wrapper: any = p.url ? "a" : "div";
            const wrapperProps = p.url
              ? { href: p.url, target: "_blank", rel: "noopener noreferrer" }
              : {};
            return (
              <FadeIn key={p.name} delay={i * 0.06}>
                <Wrapper
                  {...wrapperProps}
                  className={`group flex flex-col h-full rounded-lg border border-border bg-card p-7 transition-all duration-300 ${
                    p.url ? "hover:border-primary/40 hover:shadow-warm cursor-pointer" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-5">
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusStyles[p.status]}`}
                    >
                      {p.status}
                    </span>
                    {p.url && (
                      <ExternalLink
                        size={14}
                        className="text-muted-foreground group-hover:text-primary transition-colors"
                      />
                    )}
                  </div>

                  <h3 className="font-display text-xl font-bold text-foreground mb-1.5">
                    {p.name}
                  </h3>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-5">
                    {p.category}
                  </p>

                  <div className="space-y-4 flex-1">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1">
                        Problem
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed">{p.problem}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1">
                        Result
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed">{p.result}</p>
                    </div>
                  </div>
                </Wrapper>
              </FadeIn>
            );
          })}

          {/* Room for more — editorial placeholder */}
          <FadeIn delay={proofs.length * 0.06}>
            <button
              onClick={openDiscovery}
              className="group flex flex-col items-start justify-center h-full min-h-[200px] rounded-lg border border-dashed border-border p-7 text-left hover:border-violet/40 transition-colors"
            >
              <ArrowUpRight size={22} className="text-violet mb-4" />
              <h3 className="font-display text-lg font-bold text-foreground mb-1.5">
                Your operation, next.
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Bring a bottleneck. We'll scope the proof.
              </p>
            </button>
          </FadeIn>
        </div>
      </div>
    </section>
  );
};

export default ProofShowcase;
