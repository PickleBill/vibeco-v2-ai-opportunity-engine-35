import { HelmetProvider, Helmet } from "react-helmet-async";
import { useSearchParams, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SimulatorShell from "@/components/simulator/SimulatorShell";

interface LocationState {
  prefillIdea?: string;
  forkedFrom?: string;
  resumeId?: string;
}

const Simulate = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;
  const resumeId = searchParams.get("id") || state.resumeId || undefined;

  return (
    <HelmetProvider>
      <Helmet>
        <title>AI Idea Simulator | VibeCo</title>
        <meta
          name="description"
          content="Describe your wildest idea and get an instant AI-generated business brief with industry analysis, features, and investor perspectives."
        />
      </Helmet>
      <Navbar />
      <SimulatorShell
        resumeId={resumeId}
        prefillIdea={state.prefillIdea}
        forkedFrom={state.forkedFrom}
      />
    </HelmetProvider>
  );
};

export default Simulate;
