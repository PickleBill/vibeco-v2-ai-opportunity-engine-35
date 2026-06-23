import { useParams } from "react-router-dom";

// ============================================================================
// EDIT THESE THREE VARIABLES TO PERSONALIZE PER RECIPIENT
// ============================================================================
const recipient_name = "Friend";

const personal_intro =
  "It was great catching up. I've been thinking about what you said and pulled together a short briefing — the kind of thing I'd want to read on my phone in five minutes. No pitch, no ask. Just a clean look at where the real opportunity is right now, and a couple of small things I wired up after our conversation.";

const topics_to_discuss = [
  "Why the CH Robinson numbers matter more than the usual AI talking points",
  "A simple loop: discover → validate → ship — and why most teams skip the middle step",
  "Where I think your team's first real win lives, and how cheap it is to find out",
];
// ============================================================================

const Briefing = () => {
  const { name } = useParams<{ name?: string }>();
  const greetingName = name
    ? decodeURIComponent(name).replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : recipient_name;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-50">
      <div className="mx-auto max-w-2xl px-6 py-20 sm:px-8 sm:py-28 md:py-32">
        {/* ── Opening ─────────────────────────────────────────────── */}
        <header className="mb-24">
          <div className="mb-8 text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/80">
            A briefing for {greetingName}
          </div>
          <h1 className="text-balance font-light leading-[1.05] tracking-tight text-white text-4xl sm:text-5xl md:text-6xl">
            Hey {greetingName} —
          </h1>
          <p className="mt-8 text-pretty text-lg leading-relaxed text-zinc-300 sm:text-xl">
            {personal_intro}
          </p>
        </header>

        {/* ── Section 1: Verified Proof ───────────────────────────── */}
        <section className="mb-24">
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex items-center rounded-sm border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
              Verified
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              CH Robinson · public logistics co.
            </span>
          </div>
          <h2 className="mb-10 text-balance text-3xl font-light leading-tight tracking-tight text-white sm:text-4xl">
            What happens when a real operating company actually ships AI into the workflow.
          </h2>

          <dl className="space-y-8 border-l border-zinc-800 pl-6">
            <div>
              <dt className="text-sm uppercase tracking-wider text-zinc-500">Emailed load tenders</dt>
              <dd className="mt-1 text-xl text-zinc-100">
                From <span className="text-white">~4 hours</span> to{" "}
                <span className="text-white">~90 seconds</span>.
              </dd>
            </div>
            <div>
              <dt className="text-sm uppercase tracking-wider text-zinc-500">Price quotes</dt>
              <dd className="mt-1 text-xl text-zinc-100">
                <span className="text-white">~32 seconds</span> per quote ·{" "}
                <span className="text-white">1M+</span> delivered by AI.
              </dd>
            </div>
            <div>
              <dt className="text-sm uppercase tracking-wider text-zinc-500">Appointments</dt>
              <dd className="mt-1 text-xl text-zinc-100">
                <span className="text-white">3,000 / day</span> in under{" "}
                <span className="text-white">60 seconds</span>, across{" "}
                <span className="text-white">43,000</span> locations.
              </dd>
            </div>
            <div>
              <dt className="text-sm uppercase tracking-wider text-zinc-500">Agent footprint</dt>
              <dd className="mt-1 text-xl text-zinc-100">
                <span className="text-white">30+</span> AI agents running{" "}
                <span className="text-white">3M+</span> tasks.
              </dd>
            </div>
            <div>
              <dt className="text-sm uppercase tracking-wider text-zinc-500">Management-cited gains</dt>
              <dd className="mt-1 text-xl text-zinc-100">
                <span className="text-white">~30%</span> productivity, later roughly{" "}
                <span className="text-white">40%</span> more shipments per person per day.
              </dd>
            </div>
          </dl>

          <p className="mt-10 border-t border-zinc-800 pt-6 text-sm leading-relaxed text-zinc-500">
            Honest caveat: AI is part of the margin story, not the sole cause. I'm not claiming AI alone
            moved the stock — but the operational deltas are real, public, and measurable.
          </p>
        </section>

        {/* ── Section 2: What I Wired Up ──────────────────────────── */}
        <section className="mb-24">
          <div className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            Work in progress
          </div>
          <h2 className="mb-8 text-balance text-3xl font-light leading-tight tracking-tight text-white sm:text-4xl">
            I riffed on our conversation and wired this up.
          </h2>
          <p className="mb-12 text-pretty text-lg leading-relaxed text-zinc-400">
            Not a finished product. Not a polished pitch. Just three small pieces I built to think out
            loud about how a team would actually do this.
          </p>

          <ol className="space-y-10">
            <li>
              <div className="mb-2 font-mono text-xs text-zinc-600">01</div>
              <h3 className="mb-2 text-xl font-medium text-white">Discover → Validate → Ship loop</h3>
              <p className="text-pretty leading-relaxed text-zinc-400">
                A simple operating rhythm. Most teams jump from "interesting idea" straight to building.
                The middle step — cheaply validating before writing code — is where the wins compound.
              </p>
            </li>
            <li>
              <div className="mb-2 font-mono text-xs text-zinc-600">02</div>
              <h3 className="mb-2 text-xl font-medium text-white">Opportunity scanner</h3>
              <p className="text-pretty leading-relaxed text-zinc-400">
                Point it at a company. It returns a worst-workflow hypothesis and a rough ROI envelope.
                Crude, but it gets the conversation off "AI strategy" and onto a specific painful hour
                in someone's week.
              </p>
            </li>
            <li>
              <div className="mb-2 font-mono text-xs text-zinc-600">03</div>
              <h3 className="mb-2 text-xl font-medium text-white">Discovery kit</h3>
              <p className="text-pretty leading-relaxed text-zinc-400">
                A short set of unbiased operator interview questions. Designed to surface real friction
                without leading the witness toward an AI-shaped answer.
              </p>
            </li>
          </ol>
        </section>

        {/* ── Section 3: Takeaways ────────────────────────────────── */}
        <section className="mb-24">
          <h2 className="mb-10 text-balance text-3xl font-light leading-tight tracking-tight text-white sm:text-4xl">
            Why this is worth a real look — now.
          </h2>
          <ul className="space-y-6">
            {[
              "The CH Robinson numbers prove the ceiling isn't theoretical. A regulated, low-margin, paper-heavy industry is already getting 30–40% productivity gains in production.",
              "The bottleneck is no longer model capability. It's identifying the right workflow and shipping a small thing fast. That's a process problem, not a tech problem.",
              "Validating the first opportunity costs almost nothing — a week of focused discovery beats a quarter of strategy decks.",
              "Whoever in your space sets up the discover-validate-ship loop first compounds a real advantage. Late movers will be buying the same off-the-shelf tools as everyone else.",
            ].map((point, i) => (
              <li key={i} className="flex gap-4">
                <span
                  className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400"
                  aria-hidden
                />
                <span className="text-pretty text-lg leading-relaxed text-zinc-200">{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Hidden topics anchor (used to tailor the conversation) ── */}
        <section className="sr-only" aria-label="Topics to discuss">
          <ul>
            {topics_to_discuss.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>

        {/* ── Close ───────────────────────────────────────────────── */}
        <footer className="border-t border-zinc-800 pt-12">
          <p className="text-pretty text-xl leading-relaxed text-zinc-300">
            That's it. If any of this lands —{" "}
            <span style={{ color: "#6A2CF5" }} className="font-medium">
              just text me your reaction.
            </span>{" "}
            No form, no calendar link. I'd rather hear what you actually think.
          </p>
          <p className="mt-8 text-xs uppercase tracking-[0.2em] text-zinc-600">
            Briefing for {greetingName}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Briefing;
