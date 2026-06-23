import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import FadeIn from "./FadeIn";
import heroMindmap from "@/assets/hero-mindmap.jpg";

const gridLines = [
  { top: "25%", opacity: 0.3, delay: 0 },
  { top: "50%", opacity: 0.2, delay: 0.15 },
  { top: "75%", opacity: 0.1, delay: 0.3 },
];

const ctaSpring = { type: "spring" as const, stiffness: 280, damping: 20 };

const Hero = () => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <StaticHero navigate={navigate} />;
  }

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Animated grid lines — scaleX from center */}
      <div className="absolute inset-0 pointer-events-none">
        {gridLines.map((line) => (
          <motion.div
            key={line.top}
            className="absolute left-0 w-full h-px bg-border"
            style={{ top: line.top, opacity: line.opacity, transformOrigin: "center" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.0, delay: line.delay * 1.67, ease: "easeOut" }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          <div>
            <motion.p
              className="text-sm text-primary uppercase tracking-widest mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              idea → product → revenue
            </motion.p>

            {/* Blur-to-sharp headline */}
            <motion.h1
              className="font-display font-black text-foreground leading-[1.05] mb-1 break-words"
              style={{ fontSize: "clamp(2.25rem, 4vw + 1.25rem, 4.25rem)" }}
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.0, delay: 0.7, ease: "easeOut" }}
            >
              One conversation.
              <br />
              <motion.span
                className="text-primary inline-block"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.0 }}
              >
                One live product.
              </motion.span>
            </motion.h1>

            <motion.p
              className="text-base text-foreground/80 leading-relaxed mb-4 max-w-lg mt-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.3 }}
            >
              Tell us what you need. We ship — usually same day.
            </motion.p>

            {/* Spring-scaled CTAs */}
            <motion.div
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...ctaSpring, delay: 1.7 }}
            >
              <button
                onClick={() => navigate("/simulate")}
                className="text-sm bg-primary text-primary-foreground px-6 py-3 rounded-full hover:opacity-90 transition-opacity inline-flex items-center gap-2"
              >
                Test Your Idea
              </button>
              <button
                onClick={() => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })}
                className="text-sm border border-border text-foreground px-6 py-3 rounded-full hover:border-primary/50 hover:text-primary transition-colors"
              >
                Talk to Us
              </button>
            </motion.div>
          </div>

          {/* Mind-map: fade in last with scale */}
          <div className="hidden lg:flex items-center justify-center">
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, delay: 1.6, ease: "easeOut" }}
            >
              <div
                className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
                style={{
                  background: "radial-gradient(circle, hsl(var(--primary) / 0.2), transparent 70%)",
                  transform: "scale(1.3)",
                }}
              />
              <img
                src={heroMindmap}
                alt="Creative brainstorming mind map — ideas to products to revenue"
                className="relative w-[420px] h-[420px] object-cover rounded-2xl"
                style={{
                  maskImage: "radial-gradient(ellipse 85% 85% at center, black 50%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(ellipse 85% 85% at center, black 50%, transparent 100%)",
                }}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* Static fallback for prefers-reduced-motion */
function StaticHero({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-full h-px bg-border/30" />
        <div className="absolute top-2/4 left-0 w-full h-px bg-border/20" />
        <div className="absolute top-3/4 left-0 w-full h-px bg-border/10" />
      </div>
      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          <div>
            <p className="text-sm text-primary uppercase tracking-widest mb-6">
              idea → product → revenue
            </p>
            <h1 className="font-display font-black text-foreground leading-[1.05] mb-6 break-words" style={{ fontSize: "clamp(2.25rem, 4vw + 1.25rem, 4.25rem)" }}>
              One conversation.
              <br />
              <span className="text-primary">One live product.</span>
            </h1>
            <p className="text-base text-foreground/80 leading-relaxed mb-4 max-w-lg">
              Tell us what you need. We ship — usually same day.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate("/simulate")}
                className="text-sm bg-primary text-primary-foreground px-6 py-3 rounded-full hover:opacity-90 transition-opacity inline-flex items-center gap-2"
              >
                Test Your Idea
              </button>
              <button
                onClick={() => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })}
                className="text-sm border border-border text-foreground px-6 py-3 rounded-full hover:border-primary/50 hover:text-primary transition-colors"
              >
                Talk to Us
              </button>
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
                style={{
                  background: "radial-gradient(circle, hsl(var(--primary) / 0.2), transparent 70%)",
                  transform: "scale(1.3)",
                }}
              />
              <img
                src={heroMindmap}
                alt="Creative brainstorming mind map — ideas to products to revenue"
                className="relative w-[420px] h-[420px] object-cover rounded-2xl"
                style={{
                  maskImage: "radial-gradient(ellipse 85% 85% at center, black 50%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(ellipse 85% 85% at center, black 50%, transparent 100%)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
