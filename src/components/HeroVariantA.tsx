import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import FadeIn from "./FadeIn";
import heroMindmap from "@/assets/hero-mindmap.jpg";

const headlineWords = ["One", "conversation."];
const taglineChars = "One live product.".split("");

const wordSpring = { type: "spring" as const, stiffness: 90, damping: 12 };

const Hero = () => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Subtle background accent */}
      <div
        className="absolute top-0 right-0 w-1/2 h-1/2 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 80% 20%, hsl(var(--primary) / 0.04), transparent 60%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          <div>
            <FadeIn>
              <p className="text-sm font-semibold text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <span className="w-8 h-px bg-primary" />
                idea &rarr; product &rarr; revenue
              </p>
            </FadeIn>

            {/* Staggered word reveal */}
            <div className="font-display font-extrabold text-foreground leading-[1.05] mb-1 break-words" style={{ fontSize: "clamp(2.25rem, 4vw + 1.25rem, 4.25rem)" }}>
              {prefersReduced ? (
                <FadeIn delay={0.1}>
                  <h1>
                    One conversation.
                    <br />
                    <span className="text-primary">One live product.</span>
                  </h1>
                </FadeIn>
              ) : (
                <h1>
                  {headlineWords.map((word, i) => (
                    <motion.span
                      key={word}
                      className="inline-block mr-[0.3em]"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...wordSpring, delay: 0.3 + i * 0.15 }}
                    >
                      {word}
                    </motion.span>
                  ))}
                  <br />
                  <span className="text-primary inline-block">
                    {taglineChars.map((ch, i) => (
                      <motion.span
                        key={i}
                        className="inline-block"
                        style={{ whiteSpace: ch === " " ? "pre" : undefined }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.08, delay: 0.9 + i * 0.035 }}
                      >
                        {ch}
                      </motion.span>
                    ))}
                  </span>
                </h1>
              )}
            </div>

            <FadeIn delay={1.5}>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg mt-5">
                Tell us what you need. We ship — usually same day.
              </p>
            </FadeIn>
            <FadeIn delay={1.9}>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate("/simulate")}
                  className="font-display text-sm font-semibold bg-primary text-primary-foreground px-7 py-3.5 rounded-full hover:brightness-110 transition-all inline-flex items-center gap-2"
                >
                  Test Your Idea
                </button>
                <button
                  onClick={() => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-sm font-medium border-2 border-foreground/15 text-foreground px-7 py-3.5 rounded-full hover:border-primary hover:text-primary transition-colors"
                >
                  Talk to Us
                </button>
              </div>
            </FadeIn>
          </div>

          {/* Parallax mind-map image */}
          <FadeIn delay={0.5} className="hidden lg:flex items-center justify-center">
            <motion.div className="relative" style={{ y: prefersReduced ? 0 : imageY }}>
              <motion.img
                src={heroMindmap}
                alt="Creative brainstorming mind map — ideas to products to revenue"
                className="relative w-[420px] h-[420px] object-cover rounded-2xl shadow-warm-lg"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              />
            </motion.div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
};

export default Hero;
