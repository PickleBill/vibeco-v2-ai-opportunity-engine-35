import FadeIn from "./FadeIn";
import { Home, Scissors, Dumbbell, Briefcase, Trophy } from "lucide-react";

const personas = [
  {
    icon: Home,
    title: "Real Estate Agent",
    desc: "Build a client matching tool, automated follow-ups, or a neighborhood insights dashboard — live by tomorrow.",
  },
  {
    icon: Scissors,
    title: "Service Pro",
    desc: "Automate scheduling, route planning, invoicing — and stop losing jobs to missed calls. Built in hours.",
  },
  {
    icon: Dumbbell,
    title: "Fitness Coach",
    desc: "Create a personalized training app, meal tracker, or client progress portal — your clients use it tonight.",
  },
  {
    icon: Briefcase,
    title: "Consultant / Expert",
    desc: "Turn your methodology into a software product — capture recurring revenue from your expertise. No code needed.",
  },
  {
    icon: Trophy,
    title: "Sports Coach / Academy Owner",
    desc: "Build a drill library, video analysis platform, or athlete progress tracker — turn your methodology into recurring revenue.",
  },
];

const EverydayFounders = () => {
  return (
    <section id="everyday" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mb-16">
          <FadeIn>
            <p className="text-sm text-muted-foreground uppercase tracking-widest mb-4">
              Built for domain experts
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-6">
              You know the problem. We handle the tech.
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="text-base text-foreground/80 leading-relaxed">
              The best products come from people who live the problem every
              day. You don't need to code — you need to ship.
            </p>
          </FadeIn>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {personas.map((p, i) => (
            <FadeIn key={p.title} delay={i * 0.08}>
              <div className="group bg-card border border-border rounded-lg p-8 hover:border-primary/30 hover:shadow-warm transition-all duration-300">
                <p.icon
                  size={24}
                  className="text-primary mb-4 group-hover:scale-110 transition-transform duration-300"
                />
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  {p.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {p.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.4}>
          <p className="mt-12 text-sm text-muted-foreground text-center">
            Got a problem worth solving? That's all you need.
          </p>
        </FadeIn>
      </div>
    </section>
  );
};

export default EverydayFounders;
