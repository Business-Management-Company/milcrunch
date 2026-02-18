import { useState, useEffect } from "react";
import {
  Lock, Play, Share2, Check, Calendar, Users, BarChart3, Video,
  Zap, Shield, ArrowRight, Mail, Loader2, Sun, Moon,
  FileText, Layers, Target, XCircle, CheckCircle2,
  Smartphone, Search, TrendingUp, Radio, Handshake,
  Mic, DollarSign, ClipboardList, BookOpen,
  Star, MapPin, User, Bell, Heart, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const SESSION_KEY = "prospectus_access";
const THEME_KEY = "prospectus_theme";

const TABS = [
  "Overview",
  "Events & Attendee App",
  "PDX Experience",
  "Creator Network",
  "365 Insights",
  "Streaming & Media",
  "Partnership Model",
] as const;

type TabId = (typeof TABS)[number];

const PILLARS = [
  {
    icon: Calendar,
    title: "Live Events → Year-Round Revenue",
    description:
      "Full event management, mobile attendee app, and 365 Insights that keep sponsors engaged between events — turning a 3-day spend into 12 months of measurable ROI.",
  },
  {
    icon: Users,
    title: "Creator & Community Network",
    description:
      "1,000+ verified military and veteran creators with authenticated profiles, audience analytics, and a built-in marketplace for brand partnerships.",
  },
  {
    icon: BarChart3,
    title: "Sponsor Intelligence",
    description:
      "Real-time ROI dashboards that quantify impressions, engagement, and attribution — so renewal conversations start with data, not guesswork.",
  },
  {
    icon: Video,
    title: "AI-Powered Media",
    description:
      "Stream → record → auto-clip → repurpose. AI handles framing, captions, highlight reels, and social clips — generating long-tail impressions for months after the event.",
  },
];

const SAAS_ROWS = [
  { tool: "Event Management Platform", cost: 500, replaces: "Event Management" },
  { tool: "Creator Discovery & Management", cost: 800, replaces: "Creator Discovery" },
  { tool: "Live Streaming Tools", cost: 50, replaces: "Live Streaming" },
  { tool: "Registration & Forms", cost: 50, replaces: "Registration Forms" },
  { tool: "Social Monitoring & Analytics", cost: 300, replaces: "Social Monitoring" },
  { tool: "Email & Outreach Platform", cost: 100, replaces: "Email & Outreach" },
  { tool: "Manual Creator Verification", cost: 2000, replaces: "Military ID Verification" },
];

const TAB_PLACEHOLDERS: Record<string, string> = {
  "Events & Attendee App":
    "See how RecurrentX powers end-to-end event creation, ticketing, check-in, and a mobile-first attendee experience.",
  "PDX Experience":
    "Discover the Parade Deck Experience — a turnkey live-stage production that turns any event into a multi-platform streaming powerhouse.",
  "Creator Network":
    "Explore our verified military creator marketplace — discovery, vetting, and campaign management in one place.",
  "365 Insights":
    "Learn how sponsors get year-round analytics, community engagement metrics, and automated renewal reports.",
  "Streaming & Media":
    "Watch our AI production pipeline in action — multi-camera streaming, auto-highlights, and social clip generation.",
  "Partnership Model":
    "Understand our pricing, revenue share, and white-label options for media companies and event organizers.",
};

const TAB_KB_CATEGORY: Record<string, string> = {
  "Events & Attendee App": "events-pdx",
  "PDX Experience": "events-pdx",
  "Creator Network": "creator-network",
  "365 Insights": "365-insights",
  "Streaming & Media": "streaming-media",
  "Partnership Model": "sponsorship-revenue",
};

/* ------------------------------------------------------------------ */
/* Access Gate (always dark)                                           */
/* ------------------------------------------------------------------ */

function AccessGate({ onAccess }: { onAccess: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setChecking(true);
    const { data } = await supabase
      .from("prospectus_access")
      .select("id")
      .eq("email", trimmed)
      .limit(1) as { data: { id: string }[] | null };
    setChecking(false);
    if (data && data.length > 0) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onAccess();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0F] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-2xl font-bold text-white tracking-tight">
            recurrent<span className="text-[#6C5CE7] font-extrabold">X</span>
          </span>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <div className="w-14 h-14 rounded-full bg-[#6C5CE7]/20 flex items-center justify-center mx-auto mb-5">
            <Lock className="h-6 w-6 text-[#6C5CE7]" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Investor & Partner Preview
          </h1>
          <p className="text-sm text-gray-400 mb-6">
            Enter your email address to view this document.
          </p>

          <div
            className={cn(
              "transition-transform",
              shake && "animate-[shake_0.4s_ease-in-out]"
            )}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Email address"
              autoFocus
              className={cn(
                "w-full px-4 py-3 rounded-xl bg-white/[0.06] border text-white text-sm",
                "placeholder:text-gray-500",
                "focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/50 transition-all",
                error
                  ? "border-red-500/60"
                  : "border-white/10"
              )}
            />
            {error && (
              <p className="text-red-400 text-sm mt-2">
                This email isn't on the approved list. Contact andrew@recurrentx.com to request access.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={checking}
            className="w-full mt-4 px-6 py-3 rounded-xl bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {checking ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</> : "Request Access"}
          </button>
        </div>

        <p className="text-gray-600 text-xs mt-6">
          Contact{" "}
          <a href="mailto:andrew@recurrentx.com" className="text-[#6C5CE7] hover:underline">
            andrew@recurrentx.com
          </a>{" "}
          to request access.
        </p>
      </div>

      {/* Shake keyframe */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab: Overview                                                       */
/* ------------------------------------------------------------------ */

function OverviewTab({ dark }: { dark: boolean }) {
  const saasTotal = SAAS_ROWS.reduce((s, r) => s + r.cost, 0);

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto pt-4">
        <h2
          className={cn(
            "text-3xl md:text-4xl font-extrabold leading-tight mb-2 transition-colors duration-300",
            dark ? "text-white" : "text-[#111827]"
          )}
        >
          Where the military and veteran community comes to be{" "}
          <span className="text-[#6C5CE7]">seen, heard, and understood.</span>
        </h2>
        <p
          className={cn(
            "text-lg md:text-xl font-semibold mb-4 transition-colors duration-300",
            dark ? "text-gray-300" : "text-[#374151]"
          )}
        >
          And where Recurrent turns that community into a permanent revenue engine.
        </p>
        <p
          className={cn(
            "text-base max-w-2xl mx-auto leading-relaxed transition-colors duration-300",
            dark ? "text-gray-400" : "text-[#6B7280]"
          )}
        >
          RecurrentX is the operating system military events and communities have been
          missing — built by a veteran, proven at MIC, and designed to turn every event
          into a year-round community that sponsors want to fund again and again.
        </p>
      </section>

      {/* Our Story */}
      <section className="max-w-4xl mx-auto">
        <div
          className={cn(
            "rounded-2xl p-8 md:p-10 transition-colors duration-300",
            dark
              ? "bg-[#111827] border border-white/[0.08]"
              : "bg-[#F9FAFB] border border-[#E5E7EB]"
          )}
        >
          <h3
            className={cn(
              "text-xl md:text-2xl font-extrabold text-center mb-8 leading-tight transition-colors duration-300",
              dark ? "text-white" : "text-[#111827]"
            )}
          >
            Built by Veterans.{" "}
            <span className="text-[#6C5CE7]">Proven at MIC.</span>
          </h3>

          <div className="space-y-5 max-w-3xl mx-auto">
            <p
              className={cn(
                "text-sm md:text-[15px] leading-relaxed transition-colors duration-300",
                dark ? "text-gray-300" : "text-[#374151]"
              )}
            >
              RecurrentX didn&rsquo;t start in a boardroom. It started with a problem Andrew
              Appleton couldn&rsquo;t stop thinking about as a veteran: the military and veteran
              community had no place to be seen, heard, and understood.
            </p>

            <p
              className={cn(
                "text-sm md:text-[15px] leading-relaxed transition-colors duration-300",
                dark ? "text-gray-300" : "text-[#374151]"
              )}
            >
              So he built one. Parade Deck started as a creator directory — a place where a
              veteran podcaster with 500 followers could build a profile, connect their social
              channels, and finally have a home for their content alongside authors, musicians,
              military spouses, and social media creators who were all trying to build something
              meaningful, with no support and no spotlight.
            </p>

            <div
              className={cn(
                "rounded-xl px-6 py-4 border-l-4 border-[#6C5CE7] transition-colors duration-300",
                dark ? "bg-white/[0.04]" : "bg-white"
              )}
            >
              <p
                className={cn(
                  "text-sm md:text-[15px] leading-relaxed font-semibold transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                342 creators joined. Sponsors started paying attention.
              </p>
            </div>

            <p
              className={cn(
                "text-sm md:text-[15px] leading-relaxed font-bold transition-colors duration-300",
                dark ? "text-white" : "text-[#111827]"
              )}
            >
              Then came MIC.
            </p>

            <p
              className={cn(
                "text-sm md:text-[15px] leading-relaxed transition-colors duration-300",
                dark ? "text-gray-300" : "text-[#374151]"
              )}
            >
              Recurrent brought Parade Deck to the Military Influencer Conference as a contracted
              partner. The idea was simple: build a dedicated stage inside the conference and run
              8 straight hours of live podcast sessions — 30 minutes each — giving the
              network&rsquo;s creators a real platform in front of a real audience.
            </p>

            <div
              className={cn(
                "rounded-xl px-6 py-5 border-l-4 border-[#6C5CE7] transition-colors duration-300",
                dark ? "bg-white/[0.04]" : "bg-white"
              )}
            >
              <p className="text-[#6C5CE7] text-2xl leading-none mb-2">&ldquo;</p>
              <p
                className={cn(
                  "text-base md:text-lg italic leading-relaxed transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                The Parade Deck stage brought so much energy to MIC!
              </p>
              <p
                className={cn(
                  "text-xs mt-3 transition-colors duration-300",
                  dark ? "text-gray-500" : "text-[#9CA3AF]"
                )}
              >
                &mdash; MIC 2024 Attendee
              </p>
            </div>

            <p
              className={cn(
                "text-sm md:text-[15px] leading-relaxed transition-colors duration-300",
                dark ? "text-gray-300" : "text-[#374151]"
              )}
            >
              Creators who had never been on a stage got standing ovations. Sponsors who watched
              the streams saw something they couldn&rsquo;t get from a banner ad — authentic
              engagement from a community that actually trusts its creators. Over 3 million
              YouTube impressions. A $150,000–$250,000 revenue opportunity from a single stage
              at a single event.
            </p>

            <p
              className={cn(
                "text-sm md:text-[15px] leading-relaxed transition-colors duration-300",
                dark ? "text-gray-300" : "text-[#374151]"
              )}
            >
              They did it for three years.
            </p>

            <p
              className={cn(
                "text-sm md:text-[15px] leading-relaxed transition-colors duration-300",
                dark ? "text-gray-300" : "text-[#374151]"
              )}
            >
              The lesson was clear: aggregate smaller, highly-engaged military creators — 20
              military spouses each with 5,000 followers — and you don&rsquo;t just reach an
              audience. You move one. Those followers are more authentic, more engaged, and more
              loyal than any mega-influencer&rsquo;s audience.
            </p>

            <p
              className={cn(
                "text-sm md:text-[15px] leading-relaxed font-semibold transition-colors duration-300",
                dark ? "text-white" : "text-[#111827]"
              )}
            >
              RecurrentX is the infrastructure that makes that repeatable. Not just at MIC. Not
              just for 3 days. But for every event, every activation, every day of the year.
            </p>
          </div>

          {/* Stats row */}
          <div className="mt-10 pt-8 border-t-2 border-[#6C5CE7]/30">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p
                  className={cn(
                    "text-2xl md:text-3xl font-extrabold transition-colors duration-300",
                    dark ? "text-white" : "text-[#111827]"
                  )}
                >
                  350+
                </p>
                <p
                  className={cn(
                    "text-xs mt-1 transition-colors duration-300",
                    dark ? "text-gray-500" : "text-[#9CA3AF]"
                  )}
                >
                  Verified creators in the network
                </p>
              </div>
              <div>
                <p
                  className={cn(
                    "text-2xl md:text-3xl font-extrabold transition-colors duration-300",
                    dark ? "text-white" : "text-[#111827]"
                  )}
                >
                  3M+
                </p>
                <p
                  className={cn(
                    "text-xs mt-1 transition-colors duration-300",
                    dark ? "text-gray-500" : "text-[#9CA3AF]"
                  )}
                >
                  Combined audience reach across platforms
                </p>
              </div>
              <div>
                <p
                  className={cn(
                    "text-2xl md:text-3xl font-extrabold transition-colors duration-300",
                    dark ? "text-white" : "text-[#111827]"
                  )}
                >
                  2 Years
                </p>
                <p
                  className={cn(
                    "text-xs mt-1 transition-colors duration-300",
                    dark ? "text-gray-500" : "text-[#9CA3AF]"
                  )}
                >
                  Proven success at Military Influencer Conference
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Gap in the Market */}
      <section className="max-w-4xl mx-auto">
        <div
          className={cn(
            "rounded-xl p-8 md:p-10 transition-colors duration-300",
            dark
              ? "bg-[#111827] border border-white/[0.08]"
              : "bg-[#F9FAFB] border border-[#E5E7EB]"
          )}
        >
          <h3
            className={cn(
              "text-xl md:text-2xl font-extrabold text-center mb-8 leading-tight transition-colors duration-300",
              dark ? "text-white" : "text-[#111827]"
            )}
          >
            Recurrent Describes the Community.{" "}
            <span className="text-[#6C5CE7]">RecurrentX Owns It.</span>
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left — What Exists Today */}
            <div>
              <h4
                className={cn(
                  "text-sm font-bold uppercase tracking-wide mb-4 transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#6B7280]"
                )}
              >
                What Exists Today
              </h4>
              <ul className="space-y-2.5">
                {[
                  "Video Production & Display Advertising",
                  "Email Sponsorships (one-time sends)",
                  "Live & Virtual Events (3 days, then dark)",
                  "Influencer Marketing (manual, unverified)",
                  "Custom Insights (static reports)",
                  "Branded Content (transactional)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <ArrowRight className={cn("h-4 w-4 mt-0.5 flex-shrink-0 transition-colors duration-300", dark ? "text-gray-500" : "text-[#9CA3AF]")} />
                    <span
                      className={cn(
                        "text-sm leading-snug transition-colors duration-300",
                        dark ? "text-gray-400" : "text-[#6B7280]"
                      )}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
              <p
                className={cn(
                  "text-xs mt-4 italic transition-colors duration-300",
                  dark ? "text-gray-600" : "text-[#9CA3AF]"
                )}
              >
                World-class execution. Zero recurring community infrastructure.
              </p>
            </div>

            {/* Right — What RecurrentX Adds */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide text-[#10B981] mb-4">
                What RecurrentX Adds
              </h4>
              <ul className="space-y-2.5">
                {[
                  "Year-round creator community platform",
                  "Verified military influencer network (1,000+)",
                  "365-day sponsor ROI dashboards",
                  "Attendee app that lives beyond the event",
                  "AI-powered campaign automation",
                  "Proprietary audience data that compounds annually",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span
                      className={cn(
                        "text-sm leading-snug font-medium transition-colors duration-300",
                        dark ? "text-gray-300" : "text-[#374151]"
                      )}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
              <p
                className={cn(
                  "text-xs mt-4 italic transition-colors duration-300",
                  dark ? "text-gray-600" : "text-[#9CA3AF]"
                )}
              >
                The infrastructure layer Recurrent&rsquo;s brands have been missing.
              </p>
            </div>
          </div>

          {/* Bottom statement */}
          <div className="mt-8 pt-6 border-t border-white/[0.08] text-center">
            <p
              className={cn(
                "text-base md:text-lg font-bold leading-relaxed transition-colors duration-300",
                dark ? "text-white" : "text-[#111827]"
              )}
            >
              Live events bring the community together for a few days.
              <br />
              <span className="text-[#6C5CE7]">RecurrentX keeps them together for 365.</span>
            </p>
          </div>
        </div>
      </section>

      {/* 4 Pillars */}
      <section>
        <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className={cn(
                "rounded-2xl p-6 transition-colors duration-300",
                dark
                  ? "bg-white/[0.04] border border-white/[0.08] hover:border-[#6C5CE7]/40"
                  : "bg-white border border-[#E5E7EB] hover:border-[#6C5CE7]/40"
              )}
            >
              <div className="w-11 h-11 rounded-xl bg-[#6C5CE7]/15 flex items-center justify-center mb-4">
                <p.icon className="h-5 w-5 text-[#6C5CE7]" />
              </div>
              <h3
                className={cn(
                  "font-bold text-base mb-2 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                {p.title}
              </h3>
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#6B7280]"
                )}
              >
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Events in Your Pocket */}
      <section className="max-w-4xl mx-auto">
        <div
          className={cn(
            "rounded-2xl p-8 md:p-10 transition-colors duration-300",
            dark
              ? "bg-[#111827] border border-white/[0.08]"
              : "bg-[#F9FAFB] border border-[#E5E7EB]"
          )}
        >
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#6C5CE7]/15 flex items-center justify-center mx-auto mb-4">
              <Smartphone className="h-6 w-6 text-[#6C5CE7]" />
            </div>
            <h3
              className={cn(
                "text-xl md:text-2xl font-extrabold mb-2 transition-colors duration-300",
                dark ? "text-white" : "text-[#111827]"
              )}
            >
              Events in Your Pocket
            </h3>
            <p
              className={cn(
                "text-sm max-w-xl mx-auto transition-colors duration-300",
                dark ? "text-gray-400" : "text-[#6B7280]"
              )}
            >
              The first mobile-first attendee app built specifically for military events — no App Store required.
            </p>
          </div>

          {/* 3-Phone Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {/* Phone 1 — QR Check-In */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative w-[240px] h-[480px] rounded-[2.2rem] border-[5px] overflow-hidden shadow-2xl transition-colors duration-300",
                  dark
                    ? "border-gray-700 bg-white shadow-black/40"
                    : "border-gray-800 bg-white shadow-gray-400/30"
                )}
              >
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-black rounded-b-2xl z-10" />
                {/* Screen */}
                <div className="w-full h-full flex flex-col bg-white">
                  {/* Status bar */}
                  <div className="h-[28px] bg-[#6C5CE7]" />
                  {/* Purple header with calendar icon */}
                  <div className="bg-[#6C5CE7] px-4 py-2.5 flex items-center justify-center gap-1.5">
                    <Calendar className="h-3 w-3 text-white/80" />
                    <div className="text-center">
                      <p className="text-white text-[10px] font-bold leading-tight">Military Influencer Conference 2026</p>
                    </div>
                  </div>
                  {/* QR Code area */}
                  <div className="flex-1 flex flex-col items-center justify-center px-5 bg-white">
                    {/* QR Code — dense 15x15 pattern */}
                    <div className="w-[130px] h-[130px] bg-white rounded-xl p-2 mb-4 shadow-md shadow-gray-200 border border-gray-100">
                      <div className="w-full h-full grid grid-cols-15 grid-rows-15 gap-[1px]">
                        {[
                          [1,1,1,1,1,1,1,0,1,0,1,0,1,1,1],
                          [1,0,0,0,0,0,1,0,0,1,0,0,1,0,1],
                          [1,0,1,1,1,0,1,0,1,1,0,1,1,0,1],
                          [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1],
                          [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1],
                          [1,0,0,0,0,0,1,0,0,1,0,1,1,0,1],
                          [1,1,1,1,1,1,1,0,1,0,1,0,1,1,1],
                          [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0],
                          [1,0,1,1,0,1,1,1,0,0,1,0,1,1,0],
                          [0,1,0,0,1,0,0,1,1,0,1,1,0,1,1],
                          [1,1,0,1,1,1,1,0,0,1,0,0,1,0,1],
                          [0,0,0,0,0,0,0,0,1,0,1,0,0,1,0],
                          [1,1,1,1,1,1,1,0,0,1,0,1,1,0,1],
                          [1,0,0,0,0,0,1,0,1,0,1,0,1,1,0],
                          [1,0,1,1,1,0,1,0,1,1,0,1,0,0,1],
                        ].map((row, ri) =>
                          row.map((v, ci) => (
                            <div
                              key={`qr1-${ri}-${ci}`}
                              className={cn(
                                "rounded-[0.5px]",
                                v
                                  ? ri >= 8 && ri <= 10 && ci >= 8 && ci <= 10
                                    ? "bg-[#6C5CE7]"
                                    : "bg-[#111827]"
                                  : "bg-white"
                              )}
                            />
                          ))
                        )}
                      </div>
                    </div>
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-[#6C5CE7] flex items-center justify-center mb-2 ring-2 ring-[#6C5CE7]/30 ring-offset-2 ring-offset-white">
                      <span className="text-white text-sm font-bold">CR</span>
                    </div>
                    {/* Name */}
                    <p className="text-[#111827] text-[16px] font-bold tracking-tight">Curtez Riggs</p>
                    {/* VIP Badge */}
                    <span className="mt-1.5 px-4 py-1 rounded-full bg-[#10B981] text-white text-[10px] font-bold tracking-wide uppercase">
                      VIP Attendee
                    </span>
                    {/* Scan info */}
                    <p className="text-gray-400 text-[9px] mt-3 flex items-center gap-1">
                      <span>Scan at registration</span>
                      <span className="text-gray-300">&bull;</span>
                      <span>Sep 23, 2026</span>
                    </p>
                  </div>
                  {/* Bottom nav with icons */}
                  <div className="h-[48px] bg-[#F9FAFB] border-t border-gray-200 flex items-center justify-around px-3">
                    <div className="flex flex-col items-center gap-0.5">
                      <Calendar className="h-3.5 w-3.5 text-[#6C5CE7]" />
                      <span className="text-[7px] text-[#6C5CE7] font-medium">Schedule</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-[7px] text-gray-400 font-medium">Map</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-[7px] text-gray-400 font-medium">Community</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-[7px] text-gray-400 font-medium">Profile</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Label */}
              <div className="mt-4 flex items-start gap-2 max-w-[240px]">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className={cn("text-sm font-medium transition-colors duration-300", dark ? "text-gray-300" : "text-[#374151]")}>
                  Instant QR check-in — no printed tickets
                </span>
              </div>
            </div>

            {/* Phone 2 — Schedule */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative w-[240px] h-[480px] rounded-[2.2rem] border-[5px] overflow-hidden shadow-2xl transition-colors duration-300",
                  dark
                    ? "border-gray-700 bg-white shadow-black/40"
                    : "border-gray-800 bg-white shadow-gray-400/30"
                )}
              >
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-black rounded-b-2xl z-10" />
                {/* Screen */}
                <div className="w-full h-full flex flex-col bg-white">
                  {/* Status bar */}
                  <div className="h-[28px] bg-[#6C5CE7]" />
                  {/* Purple header with search icon */}
                  <div className="bg-[#6C5CE7] px-4 py-2.5 flex items-center justify-between">
                    <div className="w-4" />
                    <p className="text-white text-xs font-bold">Schedule</p>
                    <Search className="h-3.5 w-3.5 text-white/80" />
                  </div>
                  {/* Day pills */}
                  <div className="bg-white px-3 py-2.5 flex items-center gap-1.5">
                    <span className="px-3 py-1 rounded-full bg-[#6C5CE7] text-white text-[9px] font-bold">
                      Day 1 &middot; Sep 23
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[9px] font-medium">
                      Day 2
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[9px] font-medium">
                      Day 3
                    </span>
                  </div>
                  {/* Session cards */}
                  <div className="flex-1 bg-[#F9FAFB] px-3 py-1 space-y-2 overflow-hidden">
                    {/* Card 1 — Opening Keynote */}
                    <div className="bg-white rounded-xl p-3 border-l-[3px] border-[#6C5CE7] relative shadow-sm">
                      <Star className="h-3 w-3 text-gray-300 absolute top-3 right-3" />
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="h-2.5 w-2.5 text-gray-400" />
                        <p className="text-gray-500 text-[9px] font-medium">9:00 AM</p>
                      </div>
                      <p className="text-[#111827] text-[11px] font-bold leading-tight">Opening Keynote</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <MapPin className="h-2.5 w-2.5 text-gray-400" />
                        <p className="text-gray-500 text-[9px]">Main Stage</p>
                      </div>
                    </div>
                    {/* Card 2 — Military Spouse Creator Panel */}
                    <div className="bg-white rounded-xl p-3 border-l-[3px] border-[#10B981] relative shadow-sm">
                      <Star className="h-3 w-3 text-gray-300 absolute top-3 right-3" />
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="h-2.5 w-2.5 text-gray-400" />
                        <p className="text-gray-500 text-[9px] font-medium">10:30 AM</p>
                      </div>
                      <p className="text-[#111827] text-[11px] font-bold leading-tight">Military Spouse Creator Panel</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <MapPin className="h-2.5 w-2.5 text-gray-400" />
                        <p className="text-gray-500 text-[9px]">PDX Stage</p>
                      </div>
                    </div>
                    {/* Card 3 — Brand Partnerships Workshop */}
                    <div className="bg-white rounded-xl p-3 border-l-[3px] border-[#3B82F6] relative shadow-sm">
                      <Star className="h-3 w-3 text-gray-300 absolute top-3 right-3" />
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="h-2.5 w-2.5 text-gray-400" />
                        <p className="text-gray-500 text-[9px] font-medium">1:00 PM</p>
                      </div>
                      <p className="text-[#111827] text-[11px] font-bold leading-tight">Brand Partnerships Workshop</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <MapPin className="h-2.5 w-2.5 text-gray-400" />
                        <p className="text-gray-500 text-[9px]">Room 204</p>
                      </div>
                    </div>
                  </div>
                  {/* Bottom nav */}
                  <div className="h-[48px] bg-[#F9FAFB] border-t border-gray-200 flex items-center justify-around px-3">
                    <div className="flex flex-col items-center gap-0.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-[7px] text-gray-400 font-medium">Schedule</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-[7px] text-gray-400 font-medium">Map</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-[7px] text-gray-400 font-medium">Community</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Star className="h-3.5 w-3.5 text-[#6C5CE7]" />
                      <span className="text-[7px] text-[#6C5CE7] font-medium">My Schedule</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Label */}
              <div className="mt-4 flex items-start gap-2 max-w-[240px]">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className={cn("text-sm font-medium transition-colors duration-300", dark ? "text-gray-300" : "text-[#374151]")}>
                  Live schedule with personal agenda builder
                </span>
              </div>
            </div>

            {/* Phone 3 — Community */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative w-[240px] h-[480px] rounded-[2.2rem] border-[5px] overflow-hidden shadow-2xl transition-colors duration-300",
                  dark
                    ? "border-gray-700 bg-white shadow-black/40"
                    : "border-gray-800 bg-white shadow-gray-400/30"
                )}
              >
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-black rounded-b-2xl z-10" />
                {/* Screen */}
                <div className="w-full h-full flex flex-col bg-white">
                  {/* Status bar */}
                  <div className="h-[28px] bg-[#6C5CE7]" />
                  {/* Purple header with bell icon */}
                  <div className="bg-[#6C5CE7] px-4 py-2.5 flex items-center justify-between">
                    <div className="w-4" />
                    <p className="text-white text-xs font-bold">Community</p>
                    <div className="relative">
                      <Bell className="h-3.5 w-3.5 text-white/80" />
                      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                    </div>
                  </div>
                  {/* Feed */}
                  <div className="flex-1 bg-[#F9FAFB] px-3 py-2.5 space-y-2.5 overflow-hidden">
                    {/* Post 1 */}
                    <div className="bg-white rounded-xl p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#3B82F6]/15 flex items-center justify-center ring-1 ring-[#3B82F6]/20">
                          <span className="text-[9px] font-bold text-[#3B82F6]">JM</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-[#111827] text-[10px] font-bold">Jake Morrison</p>
                          <p className="text-gray-400 text-[8px]">2h ago</p>
                        </div>
                      </div>
                      <p className="text-gray-600 text-[10px] leading-relaxed">
                        Just landed in Tampa! Who&rsquo;s heading to the PDX stage tomorrow? &#127908;
                      </p>
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <Heart className="h-3 w-3 text-red-400" />
                        <span className="text-gray-400 text-[9px] font-medium">12 likes</span>
                      </div>
                    </div>
                    {/* Post 2 */}
                    <div className="bg-white rounded-xl p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#14B8A6]/15 flex items-center justify-center ring-1 ring-[#14B8A6]/20">
                          <span className="text-[9px] font-bold text-[#14B8A6]">SR</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-[#111827] text-[10px] font-bold">Sarah Rodriguez</p>
                          <p className="text-gray-400 text-[8px]">4h ago</p>
                        </div>
                      </div>
                      <p className="text-gray-600 text-[10px] leading-relaxed">
                        Can&rsquo;t wait for the keynote. First time at MIC! &#127482;&#127480;
                      </p>
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <Heart className="h-3 w-3 text-red-400" />
                        <span className="text-gray-400 text-[9px] font-medium">8 likes</span>
                      </div>
                    </div>
                    {/* Nearby Attendees */}
                    <div className="bg-white rounded-xl p-3 shadow-sm">
                      <p className="text-[#111827] text-[10px] font-bold mb-2.5">Nearby Attendees</p>
                      <div className="flex items-center gap-1 mb-3">
                        <div className="w-7 h-7 rounded-full bg-[#6C5CE7] flex items-center justify-center ring-2 ring-white">
                          <span className="text-[8px] font-bold text-white">KL</span>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#3B82F6] flex items-center justify-center ring-2 ring-white -ml-2">
                          <span className="text-[8px] font-bold text-white">DW</span>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#10B981] flex items-center justify-center ring-2 ring-white -ml-2">
                          <span className="text-[8px] font-bold text-white">TP</span>
                        </div>
                        <span className="text-gray-500 text-[9px] ml-1.5 font-medium">47 attendees near you</span>
                      </div>
                      <button className="w-full py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-bold text-center transition-colors flex items-center justify-center gap-1">
                        &#128242; Share My Profile
                      </button>
                    </div>
                  </div>
                  {/* Bottom nav */}
                  <div className="h-[48px] bg-[#F9FAFB] border-t border-gray-200 flex items-center justify-around px-3">
                    <div className="flex flex-col items-center gap-0.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-[7px] text-gray-400 font-medium">Schedule</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-[7px] text-gray-400 font-medium">Map</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Users className="h-3.5 w-3.5 text-[#6C5CE7]" />
                      <span className="text-[7px] text-[#6C5CE7] font-medium">Community</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-[7px] text-gray-400 font-medium">Profile</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Label */}
              <div className="mt-4 flex items-start gap-2 max-w-[240px]">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className={cn("text-sm font-medium transition-colors duration-300", dark ? "text-gray-300" : "text-[#374151]")}>
                  QR networking and real-time community feed
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SaaS Replacement Calculator */}
      <section className="max-w-3xl mx-auto">
        <h3
          className={cn(
            "text-xl font-bold text-center mb-1 transition-colors duration-300",
            dark ? "text-white" : "text-[#111827]"
          )}
        >
          One Platform. One Bill. Serious Savings.
        </h3>
        <p
          className={cn(
            "text-center text-sm mb-6 transition-colors duration-300",
            dark ? "text-gray-500" : "text-[#6B7280]"
          )}
        >
          Stop paying for 7 tools that don&rsquo;t talk to each other.
        </p>

        <div
          className={cn(
            "rounded-2xl overflow-hidden transition-colors duration-300",
            dark
              ? "bg-white/[0.04] border border-white/[0.08]"
              : "bg-white border border-[#E5E7EB]"
          )}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                className={cn(
                  "transition-colors duration-300",
                  dark ? "border-b border-white/[0.08]" : "border-b border-[#E5E7EB]"
                )}
              >
                <th
                  className={cn(
                    "text-left font-medium px-5 py-3 transition-colors duration-300",
                    dark ? "text-gray-500" : "text-[#6B7280]"
                  )}
                >
                  Tool
                </th>
                <th
                  className={cn(
                    "text-left font-medium px-5 py-3 transition-colors duration-300",
                    dark ? "text-gray-500" : "text-[#6B7280]"
                  )}
                >
                  Replaces
                </th>
                <th
                  className={cn(
                    "text-right font-medium px-5 py-3 transition-colors duration-300",
                    dark ? "text-gray-500" : "text-[#6B7280]"
                  )}
                >
                  Cost/mo
                </th>
              </tr>
            </thead>
            <tbody>
              {SAAS_ROWS.map((row, i) => (
                <tr
                  key={row.tool}
                  className={cn(
                    "transition-colors duration-300",
                    dark
                      ? "border-b border-white/[0.05]"
                      : cn("border-b border-[#E5E7EB]/60", i % 2 === 1 && "bg-[#F9FAFB]")
                  )}
                >
                  <td
                    className={cn(
                      "px-5 py-3 font-medium transition-colors duration-300",
                      dark ? "text-white" : "text-[#111827]"
                    )}
                  >
                    {row.tool}
                  </td>
                  <td
                    className={cn(
                      "px-5 py-3 transition-colors duration-300",
                      dark ? "text-gray-400" : "text-[#6B7280]"
                    )}
                  >
                    {row.replaces}
                  </td>
                  <td
                    className={cn(
                      "px-5 py-3 text-right font-mono transition-colors duration-300",
                      dark ? "text-gray-300" : "text-[#374151]"
                    )}
                  >
                    ${row.cost.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#6C5CE7]/10">
                <td
                  colSpan={2}
                  className={cn(
                    "px-5 py-3 font-bold transition-colors duration-300",
                    dark ? "text-white" : "text-[#111827]"
                  )}
                >
                  Total you&rsquo;re replacing
                </td>
                <td className="px-5 py-3 text-right text-[#6C5CE7] font-bold font-mono text-base">
                  ${saasTotal.toLocaleString()}/mo
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div
          className={cn(
            "text-center mt-4 rounded-xl py-4 px-6 transition-colors duration-300",
            dark
              ? "bg-white/[0.04] border border-white/[0.08]"
              : "bg-white border border-[#E5E7EB]"
          )}
        >
          <p
            className={cn(
              "text-sm transition-colors duration-300",
              dark ? "text-gray-400" : "text-[#6B7280]"
            )}
          >
            RecurrentX consolidates{" "}
            <span className="text-[#6C5CE7] font-bold">${saasTotal.toLocaleString()}+/mo</span>{" "}
            in fragmented tools into one military-focused platform — saving organizations
            thousands every month.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center pb-4">
        <a
          href="mailto:andrew@recurrentx.com?subject=RecurrentX%20Demo%20Request"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white font-semibold transition-colors text-base"
        >
          <Mail className="h-5 w-5" />
          Schedule a Demo
          <ArrowRight className="h-4 w-4" />
        </a>
        <p
          className={cn(
            "text-xs mt-3 transition-colors duration-300",
            dark ? "text-gray-600" : "text-[#9CA3AF]"
          )}
        >
          andrew@recurrentx.com
        </p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab: PDX Experience                                                 */
/* ------------------------------------------------------------------ */

const PDX_PHASES = [
  { icon: Handshake, label: "Partnership", description: "Define the event relationship, assign your PDX team, and lock in dates and contacts." },
  { icon: ClipboardList, label: "Agenda & ROS", description: "Build a color-coded run-of-show with time blocks, speakers, and conflict detection." },
  { icon: DollarSign, label: "Budget", description: "Track estimated vs. actual costs with real-time margin and sponsor coverage calculations." },
  { icon: Handshake, label: "Sponsors", description: "Manage sponsor packages, obligation checklists, and deliverables per tier." },
  { icon: Users, label: "Creators", description: "Build a creator roster with reach calculators and social posting schedules." },
  { icon: Video, label: "Production", description: "Day-of checklist, multi-destination streaming setup, and emergency contacts." },
  { icon: FileText, label: "AAR Report", description: "AI-generated After Action Report with audience metrics, sponsor ROI, and PDF export." },
];

function PdxTab({ dark }: { dark: boolean }) {
  return (
    <div className="space-y-16">
      {/* Deep Dive link */}
      <div className="flex justify-end -mb-12">
        <a
          href="/kb/events-pdx"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
            dark
              ? "text-[#6C5CE7] bg-[#6C5CE7]/10 hover:bg-[#6C5CE7]/20"
              : "text-[#6C5CE7] bg-[#6C5CE7]/10 hover:bg-[#6C5CE7]/15"
          )}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Deep Dive
        </a>
      </div>
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto pt-4">
        <div className="w-14 h-14 rounded-2xl bg-[#6C5CE7]/15 flex items-center justify-center mx-auto mb-5">
          <Radio className="h-7 w-7 text-[#6C5CE7]" />
        </div>
        <h2
          className={cn(
            "text-3xl md:text-4xl font-extrabold leading-tight mb-3 transition-colors duration-300",
            dark ? "text-white" : "text-[#111827]"
          )}
        >
          The Parade Deck{" "}
          <span className="text-[#6C5CE7]">Experience</span>
        </h2>
        <p
          className={cn(
            "text-base max-w-2xl mx-auto leading-relaxed transition-colors duration-300",
            dark ? "text-gray-400" : "text-[#6B7280]"
          )}
        >
          A turnkey live-stage production that drops into any military event — delivering
          8+ hours of creator-led sessions, multi-platform streaming, and sponsor
          activations that turn dead stage time into a six-figure revenue engine.
        </p>
      </section>

      {/* Visual Timeline */}
      <section className="max-w-4xl mx-auto">
        <h3
          className={cn(
            "text-lg font-bold text-center mb-8 transition-colors duration-300",
            dark ? "text-white" : "text-[#111827]"
          )}
        >
          7 Phases. One Seamless Pipeline.
        </h3>
        <div className="relative">
          {/* Vertical line */}
          <div
            className={cn(
              "absolute left-[23px] top-4 bottom-4 w-px transition-colors duration-300",
              dark ? "bg-[#6C5CE7]/30" : "bg-[#6C5CE7]/20"
            )}
          />
          <div className="space-y-6">
            {PDX_PHASES.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={p.label + i} className="flex items-start gap-5 relative">
                  {/* Node */}
                  <div
                    className={cn(
                      "w-[46px] h-[46px] rounded-xl flex items-center justify-center flex-shrink-0 z-10 transition-colors duration-300",
                      dark
                        ? "bg-[#6C5CE7]/15 border border-[#6C5CE7]/30"
                        : "bg-[#6C5CE7]/10 border border-[#6C5CE7]/20"
                    )}
                  >
                    <Icon className="h-5 w-5 text-[#6C5CE7]" />
                  </div>
                  {/* Content */}
                  <div
                    className={cn(
                      "flex-1 rounded-xl p-5 transition-colors duration-300",
                      dark
                        ? "bg-white/[0.04] border border-white/[0.08]"
                        : "bg-white border border-[#E5E7EB]"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-[10px] font-bold text-[#6C5CE7] uppercase tracking-widest">
                        Phase {i + 1}
                      </span>
                    </div>
                    <h4
                      className={cn(
                        "font-bold text-sm mb-1 transition-colors duration-300",
                        dark ? "text-white" : "text-[#111827]"
                      )}
                    >
                      {p.label}
                    </h4>
                    <p
                      className={cn(
                        "text-sm leading-relaxed transition-colors duration-300",
                        dark ? "text-gray-400" : "text-[#6B7280]"
                      )}
                    >
                      {p.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="max-w-4xl mx-auto">
        <div
          className={cn(
            "rounded-2xl p-8 md:p-10 transition-colors duration-300",
            dark
              ? "bg-[#111827] border border-white/[0.08]"
              : "bg-[#F9FAFB] border border-[#E5E7EB]"
          )}
        >
          <h3
            className={cn(
              "text-lg font-bold text-center mb-8 transition-colors duration-300",
              dark ? "text-white" : "text-[#111827]"
            )}
          >
            PDX by the Numbers
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "8+", label: "Hours of live content per event" },
              { value: "$150K–$250K", label: "Revenue opportunity per stage" },
              { value: "3M+", label: "YouTube impressions from MIC" },
              { value: "30 min", label: "Session slots for creators" },
            ].map((stat) => (
              <div key={stat.label}>
                <p
                  className={cn(
                    "text-2xl md:text-3xl font-extrabold transition-colors duration-300",
                    dark ? "text-white" : "text-[#111827]"
                  )}
                >
                  {stat.value}
                </p>
                <p
                  className={cn(
                    "text-xs mt-1 transition-colors duration-300",
                    dark ? "text-gray-500" : "text-[#9CA3AF]"
                  )}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Callout */}
      <section className="max-w-3xl mx-auto">
        <div
          className={cn(
            "rounded-2xl p-8 text-center border-2 transition-colors duration-300",
            dark
              ? "bg-[#6C5CE7]/10 border-[#6C5CE7]/30"
              : "bg-[#6C5CE7]/5 border-[#6C5CE7]/20"
          )}
        >
          <h3
            className={cn(
              "text-lg font-bold mb-3 transition-colors duration-300",
              dark ? "text-white" : "text-[#111827]"
            )}
          >
            From Planning to Post-Event — All in One Wizard
          </h3>
          <p
            className={cn(
              "text-sm leading-relaxed max-w-xl mx-auto mb-6 transition-colors duration-300",
              dark ? "text-gray-400" : "text-[#6B7280]"
            )}
          >
            Every PDX deployment follows the same proven 7-phase pipeline — from partnership
            agreement through AI-generated After Action Reports. No spreadsheets, no email
            chains, no guesswork.
          </p>
          <a
            href="mailto:andrew@recurrentx.com?subject=PDX%20Experience%20Inquiry"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white font-semibold transition-colors text-sm"
          >
            <Mail className="h-4 w-4" />
            Book a PDX Demo
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Solution Brief data per tab                                         */
/* ------------------------------------------------------------------ */

interface SolutionBriefData {
  summary: string;
  components: string[];
  problemSolved: { pain: string; solution: string }[];
  summaryIcon: typeof FileText;
  componentsIcon: typeof Layers;
  problemIcon: typeof Target;
}

const SOLUTION_BRIEFS: Record<string, SolutionBriefData> = {
  "Events & Attendee App": {
    summaryIcon: Smartphone,
    componentsIcon: Layers,
    problemIcon: Target,
    summary:
      "RecurrentX replaces Whova with a mobile-first PWA attendee app that works before, during, and after every event — keeping the community engaged 365 days without requiring an App Store download.",
    components: [
      "Mobile schedule + agenda builder",
      "Speaker & sponsor discovery",
      "Community feed with real-time posts",
      "QR-based networking & lead retrieval",
      "Push notifications & announcements",
    ],
    problemSolved: [
      {
        pain: "Whova charges $5K–$15K per event and the app goes dark after Day 3",
        solution:
          "RecurrentX is included in the platform license with year-round community access",
      },
      {
        pain: "Attendees forget speakers and sponsors within a week",
        solution:
          "Persistent profiles and community keep relationships active long after the event ends",
      },
    ],
  },
  "PDX Experience": {
    summaryIcon: Radio,
    componentsIcon: Layers,
    problemIcon: Target,
    summary:
      "The Parade Deck Experience (PDX) is a turnkey live-stage production that drops into any military event — delivering 8+ hours of live podcast sessions, multi-platform streaming, and sponsor activations that generate $150K–$250K in revenue from a single stage.",
    components: [
      "7-phase event wizard (partnership → AAR)",
      "Run-of-show builder with conflict detection",
      "Sponsor integration with obligation tracking",
      "Creator roster with reach calculator",
      "Multi-destination live streaming",
      "AI-generated After Action Reports",
    ],
    problemSolved: [
      {
        pain: "Event stages sit dark between keynotes with no monetization",
        solution:
          "PDX fills every hour with creator-led sessions that sponsors pay to be part of",
      },
      {
        pain: "Post-event reporting takes weeks of manual work",
        solution:
          "AI generates executive After Action Reports with audience metrics, sponsor ROI, and strategic recommendations in minutes",
      },
    ],
  },
  "Creator Network": {
    summaryIcon: Search,
    componentsIcon: Layers,
    problemIcon: Target,
    summary:
      "A verified directory of 1,000+ military and veteran creators — influencers, podcasters, speakers, and authors — with AI-powered discovery, brand safety verification, and built-in campaign management.",
    components: [
      "AI-powered creator search with 20+ filters",
      "4-phase military verification pipeline",
      "Creator profile pages with social analytics",
      "Brand deal facilitation and list building",
      "Creator onboarding with social account connection",
    ],
    problemSolved: [
      {
        pain: "Brands can't verify if creators actually served",
        solution:
          "4-phase AI verification with confidence scores and evidence",
      },
      {
        pain: "Finding niche military creators requires 5+ different tools",
        solution:
          "One search finds verified creators across all platforms and niches",
      },
    ],
  },
  "365 Insights": {
    summaryIcon: TrendingUp,
    componentsIcon: Layers,
    problemIcon: Target,
    summary:
      "Year-round sponsor analytics that turn event spend into a measurable, data-driven asset — giving sponsors the ROI story they need to renew and upsell every year.",
    components: [
      "Multi-sponsor impression tracking",
      "12-month time-series dashboards",
      "YoY comparison and event benchmarking",
      "Exportable ROI reports",
      "Sponsor renewal pipeline tools",
    ],
    problemSolved: [
      {
        pain: 'Sponsors ask "what did I get?" with no data to answer',
        solution:
          "Real-time dashboards show impressions, engagement, and attribution by sponsor tier",
      },
      {
        pain: "Sponsor renewal rates under 50% industry-wide",
        solution:
          "Data-driven renewal conversations drive 85%+ retention target",
      },
    ],
  },
  "Streaming & Media": {
    summaryIcon: Radio,
    componentsIcon: Layers,
    problemIcon: Target,
    summary:
      "Multi-destination live streaming with AI post-production built in — replacing StreamYard, Restream, and manual video editing with one integrated media engine.",
    components: [
      "Multi-platform streaming (YouTube, Facebook, Twitch, custom RTMP)",
      "Browser-based streaming without hardware",
      "AI auto-framing and lower thirds",
      "Highlight reel generation",
      "Social clip repurposing via Upload-Post",
    ],
    problemSolved: [
      {
        pain: "StreamYard + Restream costs $50–$200/mo and still requires manual editing",
        solution:
          "RecurrentX streams to all platforms simultaneously with AI post-production included",
      },
      {
        pain: "Event recordings sit unwatched after the event",
        solution:
          "AI generates clips and schedules them across social channels for months of long-tail impressions",
      },
    ],
  },
  "Partnership Model": {
    summaryIcon: Handshake,
    componentsIcon: Layers,
    problemIcon: Target,
    summary:
      "A white-label platform licensing model that gives Recurrent.io full ownership of the technology under their brand — turning RecurrentX into the infrastructure layer for their entire event portfolio.",
    components: [
      "Platform license per event property",
      "Sponsor Dashboard access add-on ($5K–$10K per sponsor)",
      "Creator marketplace revenue share",
      "White-label branding options",
      "API access for custom integrations",
    ],
    problemSolved: [
      {
        pain: "Recurrent.io consolidates $3,800+/mo in SaaS tools across their event portfolio",
        solution:
          "One license replaces Eventbrite, Grin, StreamYard, Jotform, Brandwatch, and manual verification",
      },
      {
        pain: "No recurring data asset between events",
        solution:
          "RecurrentX builds a proprietary creator and audience database that grows in value with every event",
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Solution Brief component                                            */
/* ------------------------------------------------------------------ */

function SolutionBrief({ data, dark }: { data: SolutionBriefData; dark: boolean }) {
  const cardClass = cn(
    "rounded-xl p-6 transition-colors duration-300",
    dark
      ? "bg-[#1a1f2e] border border-white/[0.08]"
      : "bg-white border border-[#E5E7EB]"
  );

  return (
    <section className="mt-16">
      {/* Section heading */}
      <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#6C5CE7] mb-5">
        Solution Brief
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1 — Summary of Service */}
        <div className={cardClass}>
          <div className="w-10 h-10 rounded-lg bg-[#6C5CE7]/15 flex items-center justify-center mb-4">
            <data.summaryIcon className="h-5 w-5 text-[#6C5CE7]" />
          </div>
          <h4
            className={cn(
              "font-bold text-sm mb-3 transition-colors duration-300",
              dark ? "text-white" : "text-[#111827]"
            )}
          >
            Summary of Service
          </h4>
          <p
            className={cn(
              "text-sm leading-relaxed transition-colors duration-300",
              dark ? "text-gray-400" : "text-[#6B7280]"
            )}
          >
            {data.summary}
          </p>
        </div>

        {/* Card 2 — Major Components */}
        <div className={cardClass}>
          <div className="w-10 h-10 rounded-lg bg-[#6C5CE7]/15 flex items-center justify-center mb-4">
            <data.componentsIcon className="h-5 w-5 text-[#6C5CE7]" />
          </div>
          <h4
            className={cn(
              "font-bold text-sm mb-3 transition-colors duration-300",
              dark ? "text-white" : "text-[#111827]"
            )}
          >
            Major Components
          </h4>
          <ul className="space-y-2">
            {data.components.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-[#6C5CE7] mt-0.5 flex-shrink-0" />
                <span
                  className={cn(
                    "text-sm leading-snug transition-colors duration-300",
                    dark ? "text-gray-400" : "text-[#6B7280]"
                  )}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Card 3 — Problem Solved */}
        <div className={cardClass}>
          <div className="w-10 h-10 rounded-lg bg-[#6C5CE7]/15 flex items-center justify-center mb-4">
            <data.problemIcon className="h-5 w-5 text-[#6C5CE7]" />
          </div>
          <h4
            className={cn(
              "font-bold text-sm mb-3 transition-colors duration-300",
              dark ? "text-white" : "text-[#111827]"
            )}
          >
            Problem Solved
          </h4>
          <div className="space-y-4">
            {data.problemSolved.map((ps, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span
                    className={cn(
                      "text-sm leading-snug transition-colors duration-300",
                      dark ? "text-gray-500" : "text-[#9CA3AF]"
                    )}
                  >
                    {ps.pain}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span
                    className={cn(
                      "text-sm leading-snug font-medium transition-colors duration-300",
                      dark ? "text-gray-300" : "text-[#374151]"
                    )}
                  >
                    {ps.solution}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tab: Placeholder                                                    */
/* ------------------------------------------------------------------ */

function PlaceholderTab({
  title,
  description,
  dark,
}: {
  title: string;
  description: string;
  dark: boolean;
}) {
  const brief = SOLUTION_BRIEFS[title];
  const kbSlug = TAB_KB_CATEGORY[title];

  return (
    <div>
      {/* Deep Dive link */}
      {kbSlug && (
        <div className="flex justify-end mb-2">
          <a
            href={`/kb/${kbSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
              dark
                ? "text-[#6C5CE7] bg-[#6C5CE7]/10 hover:bg-[#6C5CE7]/20"
                : "text-[#6C5CE7] bg-[#6C5CE7]/10 hover:bg-[#6C5CE7]/15"
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Deep Dive
          </a>
        </div>
      )}
      {/* Video placeholder */}
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-[#6C5CE7]/15 flex items-center justify-center mb-6">
          <Play className="h-8 w-8 text-[#6C5CE7] ml-1" />
        </div>
        <h3
          className={cn(
            "text-xl font-bold mb-2 transition-colors duration-300",
            dark ? "text-white" : "text-[#111827]"
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            "text-sm max-w-md transition-colors duration-300",
            dark ? "text-gray-400" : "text-[#6B7280]"
          )}
        >
          {description}
        </p>
        <p className="text-[#6C5CE7] text-sm font-medium mt-4">Demo video coming soon</p>
      </div>

      {/* Solution Brief */}
      {brief && <SolutionBrief data={brief} dark={dark} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function Prospectus() {
  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("Overview");
  const [copied, setCopied] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "dark";
  });

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setHasAccess(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
  }, [darkMode]);

  if (!hasAccess) {
    return <AccessGate onAccess={() => setHasAccess(true)} />;
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: do nothing */
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-300",
        darkMode ? "bg-[#0A0A0F] text-white" : "bg-[#F9FAFB] text-[#111827]"
      )}
    >
      {/* Header */}
      <header
        className={cn(
          "sticky top-0 z-50 backdrop-blur-md transition-colors duration-300",
          darkMode
            ? "bg-[#0A0A0F]/90 border-b border-white/[0.06]"
            : "bg-white/90 border-b border-[#E5E7EB]"
        )}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Logo + tagline */}
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-lg font-bold tracking-tight transition-colors duration-300",
                darkMode ? "text-white" : "text-[#111827]"
              )}
            >
              recurrent<span className="text-[#6C5CE7] font-extrabold">X</span>
            </span>
            <span
              className={cn(
                "hidden md:inline text-xs border-l pl-3 transition-colors duration-300",
                darkMode
                  ? "text-gray-500 border-white/10"
                  : "text-[#6B7280] border-[#E5E7EB]"
              )}
            >
              The Operating System for Military Events & Communities
            </span>
          </div>

          {/* Theme toggle + Share button */}
          <div className="flex items-center gap-2">
            {/* Light / Dark toggle */}
            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300",
                darkMode
                  ? "bg-white/[0.06] text-gray-300 border border-white/10 hover:bg-white/[0.1]"
                  : "bg-[#111827] text-gray-200 border border-[#111827] hover:bg-[#1F2937]"
              )}
            >
              {darkMode ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            {/* Explore Demo */}
            <a
              href="/login?demo=true"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#10B981] hover:bg-[#059669] text-white transition-all duration-300"
            >
              🎯 Explore Demo
            </a>

            {/* Share button */}
            <button
              type="button"
              onClick={handleShare}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                copied
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : darkMode
                    ? "bg-white/[0.06] text-gray-300 border border-white/10 hover:bg-white/[0.1]"
                    : "bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F3F4F6]"
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied!
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" /> Share This
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-6xl mx-auto px-4 md:px-8 pb-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300",
                  activeTab === tab
                    ? "bg-[#6C5CE7] text-white"
                    : darkMode
                      ? "text-gray-400 hover:text-white hover:bg-white/[0.06]"
                      : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14">
        {activeTab === "Overview" && <OverviewTab dark={darkMode} />}
        {activeTab === "PDX Experience" && (
          <>
            <PdxTab dark={darkMode} />
            {SOLUTION_BRIEFS["PDX Experience"] && (
              <SolutionBrief data={SOLUTION_BRIEFS["PDX Experience"]} dark={darkMode} />
            )}
          </>
        )}
        {activeTab !== "Overview" && activeTab !== "PDX Experience" && (
          <PlaceholderTab
            title={activeTab}
            description={TAB_PLACEHOLDERS[activeTab] ?? "Content coming soon."}
            dark={darkMode}
          />
        )}
      </main>

      {/* Footer */}
      <footer
        className={cn(
          "border-t py-8 transition-colors duration-300",
          darkMode ? "border-white/[0.06]" : "border-[#E5E7EB]"
        )}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span
            className={cn(
              "text-xs transition-colors duration-300",
              darkMode ? "text-gray-600" : "text-[#9CA3AF]"
            )}
          >
            &copy; {new Date().getFullYear()} RecurrentX &middot; Confidential
          </span>
          <a
            href="mailto:andrew@recurrentx.com"
            className="text-xs text-[#6C5CE7] hover:underline"
          >
            andrew@recurrentx.com
          </a>
        </div>
      </footer>
    </div>
  );
}
