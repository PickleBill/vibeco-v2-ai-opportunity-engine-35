import { HelmetProvider, Helmet } from "react-helmet-async";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, Radar, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import SimulatorShell from "@/components/simulator/SimulatorShell";

interface LocationState {
  prefillIdea?: string;
  forkedFrom?: string;
  resumeId?: string;
}

/**
 * Idea-stage sketchpad. Same simulator engine — reframed as the "before you
 * build" surface, paired with /signal which is the "what's the world actually
 * asking for" surface. The two cross-link so a user can validate a sketch
 * against live signal and vice versa.
 */
const Simulate = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as LocationState;
  const resumeId = searchParams.get("id") || state.resumeId || undefined;

  return (
    <HelmetProvider>
      <Helmet>
        <title>Idea-stage sketchpad · VibeCo</title>
        <meta
          name="description"
          content="Sketch an idea in plain English. Get an instant business brief, multi-perspective critique, and a Lovable-ready build prompt — before you commit to building."
        />
      </Helmet>
      <Navbar />

      {/* Reframing strip — only renders for a fresh visit (no resume). */}
      {!resumeId && (
        <div className="border-b border-border bg-surface/40">
          <div className="container max-w-4xl py-6 flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-[16rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary flex items-center gap-2">
                <Sparkles size={13} /> Idea-stage sketchpad
              </p>
              <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight">
                Sketch the idea before you build it.
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Plain English in. Brief, critique, and a build prompt out. Pair it with the{" "}
                <button onClick={() => navigate("/signal")} className="text-primary hover:underline">
                  Signal Board
                </button>{" "}
                to ground the sketch against real customer pain.
              </p>
            </div>
            <button
              onClick={() => navigate("/signal")}
              className="text-xs font-semibold text-primary hover:brightness-110 inline-flex items-center gap-1.5 shrink-0"
            >
              <Radar size={13} />
              Open Signal Board
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}

      <SimulatorShell
        resumeId={resumeId}
        prefillIdea={state.prefillIdea}
        forkedFrom={state.forkedFrom}
      />
    </HelmetProvider>
  );
};

export default Simulate;
