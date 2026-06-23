import { useState } from "react";
import FadeIn from "./FadeIn";
import { ExternalLink, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const projects = [
  {
    name: "Courtana",
    desc: "AI-powered async coaching platform — delivers your methodology to every student, every session.",
    url: "https://courtanacoach.lovable.app",
    category: "Sports Tech",
    thumbnail: "/builds/courtana.png",
  },
  {
    name: "LitiGator AI",
    desc: "AI-powered mass arbitration intelligence — win more class action cases with predictive analytics.",
    url: "https://litigator.lovable.app",
    category: "Legal Tech",
    thumbnail: "/builds/litigator.png",
  },
  {
    name: "NauticSim",
    desc: "LNG carrier digital twin simulator for decarbonization, CII compliance, and voyage optimization.",
    url: "https://naughtydata.lovable.app",
    category: "Maritime / Energy",
    thumbnail: "/builds/nauticsim.png",
  },
  {
    name: "State Policy Partners",
    desc: "Government affairs simplified — track legislation, manage advocacy campaigns, and connect with policymakers.",
    url: "https://lobbyhobby.lovable.app",
    category: "GovTech",
    thumbnail: "/builds/statepolicy.png",
  },
  {
    name: "SizzleAI",
    desc: "AI sous chef — real-time computer vision watches your pan and guides you to a perfect meal, hands-free.",
    url: "https://sous-chef-vision.lovable.app",
    category: "Food Tech / AI",
    thumbnail: "/builds/sizzleai.png",
  },
  {
    name: "HeadsUp",
    desc: "ML-powered edge cameras that prevent injuries and eliminate unplanned downtime in industrial facilities.",
    url: "https://headsuptime.lovable.app",
    category: "Industrial Safety",
    thumbnail: "/builds/headsup.png",
  },
  {
    name: "Freakshow",
    desc: "Next-gen haptic pickleball paddles with neural-grip sensors and pro performance tech.",
    url: "https://freak-flow-hub.lovable.app",
    category: "Sports / E-Commerce",
    thumbnail: "/builds/freakshow.png",
  },
  {
    name: "RAUM",
    desc: "Luxury real estate platform with home valuations, neighborhood intelligence, and premium marketing.",
    url: "https://unicorse.lovable.app",
    category: "Real Estate",
    thumbnail: "/builds/raum.png",
  },
  {
    name: "PicklePro Draft",
    desc: "Talent scouting and brand growth platform for pickleball's rising stars and mentors.",
    url: "https://audition.lovable.app",
    category: "Sports / Creator",
    thumbnail: "/builds/picklepro.png",
  },
  {
    name: "The Load",
    desc: "Gamified household task draft for couples — score brownie points and settle the score.",
    url: "https://theload.lovable.app",
    category: "Lifestyle",
    thumbnail: "/builds/theload.png",
  },
  {
    name: "FactFudge",
    desc: "The Site About Nothing — AI serves real and fake facts on any topic. You guess which is which.",
    url: "https://factfudge.lovable.app",
    category: "Entertainment",
    thumbnail: "/builds/factfudge.png",
  },
  {
    name: "Green Paws",
    desc: "Premium lawn care platform for Raleigh & Wake County with service booking and before/after showcases.",
    url: "https://greenpaws.lovable.app",
    category: "Local Services",
    thumbnail: "/builds/greenpaws.png",
  },
  {
    name: "Raleigh Crafting",
    desc: "Handmade resin art, creative workshops, pop-up markets, and hosted craft experiences.",
    url: "https://raleighcrafting.lovable.app",
    category: "Community",
    thumbnail: "/builds/raleighcrafting.png",
  },
  {
    name: "Moore Life & Wellness",
    desc: "Compassionate virtual therapy practice for teens and adults across North Carolina.",
    url: "https://mooremental.lovable.app",
    category: "Health & Wellness",
    thumbnail: "/builds/moorelife.png",
  },
];

const ProjectShowcase = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const navigate = useNavigate();

  return (
    <section id="projects" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            <FadeIn>
              <div className="flex items-center gap-3 mb-4">
                <p className="text-xs text-primary tracking-[0.3em] uppercase">
                  Live Builds
                </p>
                <span className="text-xs text-primary border border-primary/20 rounded-full px-3 py-1 bg-primary/5">
                  {projects.length} live builds
                </span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-4">
                Shipped. Not mockups.
              </h2>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every project below went from conversation to live product — most in under 48 hours.
              </p>
            </FadeIn>
          </div>
          <FadeIn delay={0.15}>
            <button
              onClick={() => navigate("/simulate")}
              className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-6 py-3 rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Sparkles size={14} />
              Test Your Idea
            </button>
          </FadeIn>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project, index) => (
            <FadeIn key={project.name} delay={index * 0.03}>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group block rounded-lg border overflow-hidden transition-all duration-300 ${
                  hoveredIndex === index
                    ? "border-primary/40 shadow-lg"
                    : "border-border/60 hover:border-primary/20"
                }`}
                style={
                  hoveredIndex === index
                    ? { boxShadow: "0 0 30px hsl(var(--primary) / 0.08)" }
                    : {}
                }
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                  <img
                    src={project.thumbnail}
                    alt={`${project.name} screenshot`}
                    loading="lazy"
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement!.classList.add("bg-primary/10", "flex", "items-center", "justify-center");
                      const badge = document.createElement("span");
                      badge.className = "font-display text-lg font-bold text-primary/40";
                      badge.textContent = project.name;
                      e.currentTarget.parentElement!.appendChild(badge);
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm text-primary border border-primary/20">
                      {project.category}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 bg-card/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display text-base font-bold text-foreground">
                      {project.name}
                    </h3>
                    <ExternalLink
                      size={13}
                      className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {project.desc}
                  </p>
                </div>
              </a>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectShowcase;
