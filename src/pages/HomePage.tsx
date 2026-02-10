import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

/* ──────────────────────────────────────────────
   ParadeDeck Public Homepage
   Route: /
   Does NOT use AppLayout — standalone page.
   ────────────────────────────────────────────── */

// ── data ──
const stats = [
  { value: "340M+", label: "Profiles Indexed" },
  { value: "100+", label: "PDX Events" },
  { value: "6M+", label: "Creator Reach" },
  { value: "24/7", label: "PDTV Streaming" },
];

const upcomingEvents = [
  {
    name: "MilSpouseFest San Diego",
    date: "Mar 15, 2026",
    location: "San Diego, CA",
    tag: "MilSpouse",
  },
  {
    name: "PDX at Fort Liberty",
    date: "Apr 5, 2026",
    location: "Fort Liberty, NC",
    tag: "PDX Live",
  },
  {
    name: "MIC 2026",
    date: "Sep 2026",
    location: "Washington, D.C.",
    tag: "Conference",
  },
  {
    name: "PDX at VFW National",
    date: "Aug 2026",
    location: "TBD",
    tag: "PDX Live",
  },
];

const oldWay = [
  "3-day events, then silence until next year",
  "Sponsors pay for a weekend, not a community",
  "No year-round creator data or engagement",
  "Attendees vanish after the closing ceremony",
];

const pdWay = [
  "365-day community that lives between events",
  "Year-round sponsor exposure & attribution",
  "AI-powered creator discovery & verification",
  "First-party data on every creator interaction",
];

const brandFeatures = [
  {
    icon: "🎯",
    title: "AI Creator Discovery",
    desc: "Find verified military creators by branch, audience, niche, and engagement — powered by real-time data.",
  },
  {
    icon: "📊",
    title: "First-Party Data",
    desc: "Own your audience insights. Every click, view, and interaction feeds your dashboard — not a third party's.",
  },
  {
    icon: "🎙️",
    title: "PDX Live Experiences",
    desc: "Produce branded live-stage events at military installations, conferences, and VFW posts nationwide.",
  },
];

const creatorFeatures = [
  {
    icon: "🔗",
    title: "Smart BIO Link",
    desc: "Replace your Linktree with a ParadeDeck BIO — track every click with first-party data you actually own.",
  },
  {
    icon: "📱",
    title: "Connect Your Channels",
    desc: "Link Instagram, TikTok, YouTube, and podcasts. One verified profile brands can discover instantly.",
  },
  {
    icon: "🎤",
    title: "Get on Stage",
    desc: "Apply to speak, perform, or host at PDX events. Build your brand in front of live military audiences.",
  },
];

const partners = ["VFW", "MIC", "MilSpouseFest", "MBA", "IAVA"];

// ── components ──

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/Parade-Deck-Flag-logo.png"
            alt="ParadeDeck"
            className="h-8 w-auto"
          />
          <span
            className={`text-lg font-bold tracking-tight transition-colors ${
              scrolled ? "text-[#000741]" : "text-white"
            }`}
          >
            ParadeDeck
          </span>
        </Link>

        {/* links */}
        <div className="hidden md:flex items-center gap-8">
          {["For Brands", "For Creators", "Events"].map((t) => (
            <a
              key={t}
              href={`#${t.toLowerCase().replace(/\s/g, "-")}`}
              className={`text-sm font-medium transition-colors ${
                scrolled
                  ? "text-gray-600 hover:text-[#000741]"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {t}
            </a>
          ))}
          <Link
            to="/brand/discover"
            className={`text-sm font-medium px-4 py-2 rounded-lg border transition-all ${
              scrolled
                ? "border-[#000741] text-[#000741] hover:bg-[#000741]/5"
                : "border-white/40 text-white hover:bg-white/10"
            }`}
          >
            Sign In
          </Link>
          <Link
            to="/brand/discover"
            className="text-sm font-semibold px-5 py-2 rounded-lg bg-[#0064B1] text-white hover:bg-[#0064B1]/90 transition-all shadow-lg shadow-[#0064B1]/20"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-[#000741]">
      {/* background layers */}
      <div className="absolute inset-0">
        {/* gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#000741] via-[#053877] to-[#000741]" />
        {/* geometric accent */}
        <div
          className="absolute top-0 right-0 w-[60%] h-full opacity-[0.07]"
          style={{
            background:
              "repeating-linear-gradient(45deg, transparent, transparent 60px, #F0A71F 60px, #F0A71F 61px)",
          }}
        />
        {/* radial glow */}
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[#0064B1]/15 blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#000741] to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16 w-full">
        <div className="max-w-3xl">
          {/* badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#F0A71F] animate-pulse" />
            <span className="text-xs font-medium text-white/80 tracking-wide uppercase">
              Command Center — Now Live
            </span>
          </div>

          {/* headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
            The Military
            <br />
            <span className="bg-gradient-to-r from-[#F0A71F] to-[#ED1C24] bg-clip-text text-transparent">
              Creator Network
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/70 max-w-xl leading-relaxed mb-10">
            Connecting brands with military and veteran creators,{" "}
            <span className="text-white font-medium">365 days a year</span>.
            AI-powered discovery. First-party data. Live stage experiences.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 mb-16">
            <Link
              to="/brand/discover"
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#0064B1] text-white font-semibold text-base shadow-xl shadow-[#0064B1]/25 hover:shadow-[#0064B1]/40 hover:bg-[#0064B1]/90 transition-all"
            >
              Discover Creators
              <svg
                className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
            <a
              href="#for-creators"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/20 text-white font-semibold text-base hover:bg-white/5 transition-all"
            >
              Join as Creator
            </a>
          </div>

          {/* stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {s.value}
                </div>
                <div className="text-xs text-white/50 font-medium uppercase tracking-wider mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* decorative bottom edge */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" className="w-full">
          <path d="M0 60V20C360 0 720 0 1080 20L1440 40V60H0Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}

function ProblemSolution() {
  return (
    <section className="py-24 bg-white" id="problem-solution">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#000741] tracking-tight mb-4">
            From One-and-Done Events
            <br />
            to{" "}
            <span className="text-[#0064B1]">Year-Round Community</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            The industry's biggest events generate 3 days of engagement, then go
            silent. ParadeDeck changes that.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* old way */}
          <div className="relative rounded-2xl border-2 border-[#ED1C24]/20 bg-[#ED1C24]/[0.03] p-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ED1C24]/10 text-[#BF2228] text-xs font-bold uppercase tracking-wider mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ED1C24]" />
              The Old Way
            </div>
            <ul className="space-y-4">
              {oldWay.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-[#ED1C24]/60 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span className="text-gray-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* PD way */}
          <div className="relative rounded-2xl border-2 border-[#0064B1]/20 bg-[#0064B1]/[0.03] p-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0064B1]/10 text-[#0064B1] text-xs font-bold uppercase tracking-wider mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F0A71F]" />
              The ParadeDeck Way
            </div>
            <ul className="space-y-4">
              {pdWay.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-[#0064B1] flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  <span className="text-gray-700 font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function EventsSection() {
  return (
    <section className="py-24 bg-gray-50" id="events">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#000741] tracking-tight mb-3">
              Upcoming Events
            </h2>
            <p className="text-gray-500">
              Live stage experiences across the military community.
            </p>
          </div>
          <Link
            to="/brand/discover"
            className="hidden sm:inline-flex text-sm font-semibold text-[#0064B1] hover:underline"
          >
            View All →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {upcomingEvents.map((ev) => (
            <div
              key={ev.name}
              className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-[#0064B1]/30 transition-all duration-200 cursor-pointer"
            >
              <div className="inline-block px-2.5 py-1 rounded-md bg-[#000741]/5 text-[#000741] text-[11px] font-bold uppercase tracking-wider mb-4">
                {ev.tag}
              </div>
              <h3 className="font-bold text-[#000741] mb-2 group-hover:text-[#0064B1] transition-colors">
                {ev.name}
              </h3>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
                {ev.date}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                  />
                </svg>
                {ev.location}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureGrid({
  id,
  badge,
  title,
  subtitle,
  features,
  bgClass = "bg-white",
}: {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  features: { icon: string; title: string; desc: string }[];
  bgClass?: string;
}) {
  return (
    <section className={`py-24 ${bgClass}`} id={id}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-block px-3 py-1 rounded-full bg-[#0064B1]/10 text-[#0064B1] text-xs font-bold uppercase tracking-wider mb-4">
            {badge}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#000741] tracking-tight mb-3">
            {title}
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">{subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((f) => (
            <div
              key={f.title}
              className="text-center p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-5">{f.icon}</div>
              <h3 className="text-lg font-bold text-[#000741] mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-8">
          Trusted by Military & Veteran Organizations
        </p>
        <div className="flex flex-wrap justify-center items-center gap-10 sm:gap-16">
          {partners.map((p) => (
            <span
              key={p}
              className="text-xl sm:text-2xl font-bold text-gray-300 tracking-wide"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTABanner() {
  return (
    <section className="py-24 bg-[#000741] relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          background:
            "repeating-linear-gradient(-45deg, transparent, transparent 40px, #F0A71F 40px, #F0A71F 41px)",
        }}
      />
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
          You already own the audience.
          <br />
          <span className="text-[#F0A71F]">
            Give them a home between events.
          </span>
        </h2>
        <p className="text-white/60 mb-10 max-w-lg mx-auto">
          Turn 3-day event attendees into a 365-day community. ParadeDeck is the
          operating system for military creator engagement.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/brand/discover"
            className="px-8 py-3.5 rounded-xl bg-[#0064B1] text-white font-semibold shadow-xl shadow-[#0064B1]/25 hover:shadow-[#0064B1]/40 transition-all"
          >
            Request a Demo
          </Link>
          <Link
            to="/brand/discover"
            className="px-8 py-3.5 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 transition-all"
          >
            Explore the Platform
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-10 bg-[#000741] border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <img
            src="/Parade-Deck-Flag-logo.png"
            alt="ParadeDeck"
            className="h-6 w-auto"
          />
          <span className="text-sm font-bold text-white/80">ParadeDeck</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-white/40">
          <a href="#" className="hover:text-white/70 transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-white/70 transition-colors">
            Terms
          </a>
          <a href="#" className="hover:text-white/70 transition-colors">
            Contact
          </a>
        </div>
        <p className="text-xs text-white/30">
          © 2026 ParadeDeck. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

// ── main export ──

export default function Homepage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <ProblemSolution />
      <EventsSection />
      <FeatureGrid
        id="for-brands"
        badge="For Brands"
        title="Find & Activate Military Creators"
        subtitle="AI-powered discovery, verified audiences, and live activation — all in one platform."
        features={brandFeatures}
      />
      <FeatureGrid
        id="for-creators"
        badge="For Creators"
        title="Own Your Audience. Get Discovered."
        subtitle="Stop renting your audience on social platforms. Build your brand with first-party data."
        features={creatorFeatures}
        bgClass="bg-gray-50"
      />
      <SocialProof />
      <CTABanner />
      <Footer />
    </div>
  );
}
