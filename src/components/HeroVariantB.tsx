import { useRef, useCallback, useState, useEffect } from "react";
import { motion, useReducedMotion, useSpring, useMotionValue } from "framer-motion";
import { useNavigate } from "react-router-dom";
import FadeIn from "./FadeIn";
import heroMindmap from "@/assets/hero-mindmap.jpg";

const headlineChars = "One conversation.".split("");
const taglineChars = "One live product.".split("");

const Hero = () => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

  // Magnetic CTA tracking
  const magnetX = useMotionValue(0);
  const magnetY = useMotionValue(0);
  const springX = useSpring(magnetX, { stiffness: 150, damping: 15 });
  const springY = useSpring(magnetY, { stiffness: 150, damping: 15 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (prefersReduced) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setGlowPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    },
    [prefersReduced]
  );

  const handleCtaMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (prefersReduced) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      magnetX.set(dx * 6);
      magnetY.set(dy * 6);
    },
    [prefersReduced, magnetX, magnetY]
  );

  const handleCtaMouseLeave = useCallback(() => {
    magnetX.set(0);
    magnetY.set(0);
  }, [magnetX, magnetY]);

  if (prefersReduced) {
    return <StaticHero navigate={navigate} />;
  }

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center pt-16 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Cursor-reactive radial glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-[background] duration-300"
        style={{
          background: `radial-gradient(600px circle at ${glowPos.x}% ${glowPos.y}%, hsl(var(--primary) / 0.08), transparent 60%)`,
        }}
      />

      {/* Static grid lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-full h-px bg-border/30" />
        <div className="absolute top-2/4 left-0 w-full h-px bg-border/20" />
        <div className="absolute top-3/4 left-0 w-full h-px bg-border/10" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          <div>
            <FadeIn>
              <p className="text-sm text-primary uppercase tracking-widest mb-6">
                idea → product → revenue
              </p>
            </FadeIn>

            {/* Character-level staggered reveal with scale pulse */}
            <h1 className="font-display font-black text-foreground leading-[1.05] mb-1 break-words" style={{ fontSize: "clamp(2.25rem, 4vw + 1.25rem, 4.25rem)" }}>
              {headlineChars.map((ch, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  style={{ whiteSpace: ch === " " ? "pre" : undefined }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.35,
                    delay: 0.2 + i * 0.03,
                    ease: "easeOut",
                  }}
                >
                  {ch}
                </motion.span>
              ))}
              <br />
              <span className="text-primary inline-block">
                {taglineChars.map((ch, i) => (
                  <motion.span
                    key={i}
                    className="inline-block"
                    style={{ whiteSpace: ch === " " ? "pre" : undefined }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.35,
                      delay: 0.8 + i * 0.03,
                      ease: "easeOut",
                    }}
                  >
                    {ch}
                  </motion.span>
                ))}
              </span>
            </h1>

            <FadeIn delay={1.4}>
              <p className="text-base text-foreground/80 leading-relaxed mb-8 max-w-lg mt-5">
                Tell us what you need. We ship — usually same day.
              </p>
            </FadeIn>
            <FadeIn delay={1.6}>
              <div className="flex flex-wrap gap-4">
                {/* Magnetic CTA */}
                <motion.button
                  onClick={() => navigate("/simulate")}
                  onMouseMove={handleCtaMouseMove}
                  onMouseLeave={handleCtaMouseLeave}
                  className="text-sm bg-primary text-primary-foreground px-6 py-3 rounded-full hover:opacity-90 transition-opacity inline-flex items-center gap-2"
                  style={{ x: springX, y: springY }}
                >
                  Test Your Idea
                </motion.button>
                <motion.button
                  onClick={() =>
                    document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })
                  }
                  onMouseMove={handleCtaMouseMove}
                  onMouseLeave={handleCtaMouseLeave}
                  className="text-sm border border-border text-foreground px-6 py-3 rounded-full hover:border-primary/50 hover:text-primary transition-colors"
                  style={{ x: springX, y: springY }}
                >
                  Talk to Us
                </motion.button>
              </div>
            </FadeIn>
          </div>

          {/* Mind-map image */}
          <FadeIn delay={1.0} className="hidden lg:flex items-center justify-center">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
                style={{
                  background: "radial-gradient(circle, hsl(var(--primary) / 0.2), transparent 70%)",
                  transform: "scale(1.3)",
                }}
              />
              <motion.img
                src={heroMindmap}
                alt="Creative brainstorming mind map — ideas to products to revenue"
                className="relative w-[420px] h-[420px] object-cover rounded-2xl"
                style={{
                  maskImage:
                    "radial-gradient(ellipse 85% 85% at center, black 50%, transparent 100%)",
                  WebkitMaskImage:
                    "radial-gradient(ellipse 85% 85% at center, black 50%, transparent 100%)",
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: 0.8 }}
              />
            </div>
          </FadeIn>
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
                onClick={() =>
                  document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })
                }
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
                  maskImage:
                    "radial-gradient(ellipse 85% 85% at center, black 50%, transparent 100%)",
                  WebkitMaskImage:
                    "radial-gradient(ellipse 85% 85% at center, black 50%, transparent 100%)",
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
