import { Helmet, HelmetProvider } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import StatsBar from "../components/StatsBar";
import Model from "../components/Model";
import OpportunityScan from "../components/OpportunityScan";
import ProofShowcase from "../components/ProofShowcase";
import SocialProof from "../components/SocialProof";
import ContactForm from "../components/ContactForm";
import FinalCta from "../components/FinalCta";
import Footer from "../components/Footer";


const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "VibeCo",
  description:
    "VibeCo builds the AI Opportunity Engine: AI that reads inbound email and phone, then handles quoting, order intake, scheduling, and status-chasing — enterprise-proven, built for small companies.",
  url: "https://vibeco.dev",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "VibeCo",
  url: "https://vibeco.dev",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does VibeCo's AI Opportunity Engine do?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It brings the AI-operations playbook a national logistics company proved at scale — an AI that reads inbound email and phone, then handles quoting, order intake, scheduling, and status-chasing — to companies too small to build it themselves.",
      },
    },
    {
      "@type": "Question",
      name: "How does engagement start?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "With a discovery audit. We map where inbound email and phone eat your team's hours, then build a working proof against your real workflow before anything scales.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to be technical to work with VibeCo?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. You bring the business and the bottleneck. VibeCo finds the opportunity, builds the proof, and turns it into revenue.",
      },
    },
  ],
};

const Index = () => {
  return (
    <HelmetProvider>
      <Helmet>
        <title>VibeCo — The AI Opportunity Engine</title>
        <meta
          name="description"
          content="AI that reads your inbound email and phone, then handles quoting, order intake, scheduling, and status-chasing. The enterprise-proven operations playbook, built for companies your size."
        />
        <link rel="canonical" href="https://vibeco.dev" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="VibeCo — The AI Opportunity Engine" />
        <meta
          property="og:description"
          content="Enterprise-proven AI operations — quoting, intake, scheduling, status-chasing — built for small companies."
        />
        <meta property="og:url" content="https://vibeco.dev" />
        <meta property="og:site_name" content="VibeCo" />
        <meta property="og:image" content="https://vibeco.dev/og-image.png" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="VibeCo — The AI Opportunity Engine" />
        <meta
          name="twitter:description"
          content="Enterprise-proven AI operations — quoting, intake, scheduling, status-chasing — built for small companies."
        />
        <meta name="twitter:image" content="https://vibeco.dev/og-image.png" />

        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(websiteJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

        <div className="min-h-screen bg-background text-foreground scroll-smooth">
          <Navbar />
          <main>
            <Hero />
            <StatsBar />
            <Model />
            <OpportunityScan />
            <ProofShowcase />
            <SocialProof />
            <ContactForm />
            <FinalCta />
          </main>
          <Footer />
        </div>
      
    </HelmetProvider>
  );
};

export default Index;
