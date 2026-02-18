import { useState, useEffect } from "react";
import {
  Lock, Play, Share2, Check, Calendar, Users, Video,
  ArrowRight, Mail, Loader2, Sun, Moon, Monitor,
  FileText, Layers, Target, XCircle, CheckCircle2,
  Smartphone, Search, TrendingUp, Radio, Handshake,
  DollarSign, ClipboardList, BookOpen,
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

      {/* Origin Story */}
      <section className="text-center max-w-[760px] mx-auto pt-4">
        <h2
          className={cn(
            "text-[28px] font-bold leading-tight mb-6 transition-colors duration-300",
            dark ? "text-white" : "text-[#111827]"
          )}
        >
          RecurrentX didn&rsquo;t start in a boardroom.
        </h2>
        <div className="text-left space-y-4">
          <p
            className={cn(
              "text-base leading-relaxed transition-colors duration-300",
              dark ? "text-gray-300" : "text-[#374151]"
            )}
          >
            It started with a problem a veteran couldn&rsquo;t stop thinking about: the military
            and veteran community had no place to be seen, heard, and understood. So he built one.
          </p>
          <p
            className={cn(
              "text-base leading-relaxed transition-colors duration-300",
              dark ? "text-gray-300" : "text-[#374151]"
            )}
          >
            Parade Deck started as a creator directory — a place where a veteran podcaster with
            500 followers could build a profile, connect their social channels, and finally have
            a home for their content alongside authors, musicians, milspouses, and social media
            creators who were all trying to build something meaningful, with no support and no
            spotlight.
          </p>
          <p
            className={cn(
              "text-base leading-relaxed transition-colors duration-300",
              dark ? "text-gray-300" : "text-[#374151]"
            )}
          >
            That directory became a network. That network became a platform. And that platform
            became RecurrentX.
          </p>
        </div>
      </section>

      {/* Platform Capabilities */}
      <section className="max-w-[760px] mx-auto">
        <div
          className={cn(
            "border-t transition-colors duration-300 pt-10",
            dark ? "border-white/[0.08]" : "border-[#E5E7EB]"
          )}
        >
          <p
            className={cn(
              "text-[11px] font-semibold tracking-[0.15em] uppercase mb-8 transition-colors duration-300",
              dark ? "text-gray-500" : "text-[#9CA3AF]"
            )}
          >
            WHAT THE PLATFORM DOES
          </p>

          <div className="space-y-8">
            <div>
              <h4
                className={cn(
                  "text-base font-bold mb-2 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                Creator &amp; Influencer Discovery
              </h4>
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#374151]"
                )}
              >
                RecurrentX connects organizers and brands to a searchable database of millions of
                creator profiles — filterable by niche, platform, follower range, engagement rate,
                location, and military affiliation. Vetted military and veteran creators can build
                full media profiles, link their social channels, and be discovered for brand
                partnerships, speaking opportunities, podcast appearances, and event activations.
                Campaign managers can build targeted creator lists, sign deliverables, and track
                performance — all inside the platform.
              </p>
            </div>

            <div>
              <h4
                className={cn(
                  "text-base font-bold mb-2 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                Event Management &amp; Attendee Experience
              </h4>
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#374151]"
                )}
              >
                RecurrentX goes far beyond what a ticketing platform can offer. Event organizers
                get a full suite of tools: event creation and registration, session scheduling
                with conflict detection, speaker and sponsor management, QR-based attendee
                check-in, and a mobile-first attendee web app that requires no download. Attendees
                can build a personal agenda, connect with other attendees via QR networking, and
                participate in a real-time community feed — all from their phone browser.
              </p>
            </div>

            <div>
              <h4
                className={cn(
                  "text-base font-bold mb-2 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                Live Streaming &amp; Production
              </h4>
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#374151]"
                )}
              >
                The platform includes integrated live streaming management for multi-destination
                broadcasting. Production teams can manage run-of-show schedules, stream
                destinations, and day-of checklists from a single dashboard — built around the
                Parade Deck Experience model that has delivered 3M+ YouTube impressions at
                Military Influencer Conference.
              </p>
            </div>

            <div>
              <h4
                className={cn(
                  "text-base font-bold mb-2 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                Podcast Network
              </h4>
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#374151]"
                )}
              >
                RecurrentX hosts a dedicated military and veteran podcast network. Creators can
                publish episodes, build subscriber audiences, and connect their podcast presence
                directly to their creator profile — making their content discoverable to sponsors
                and event organizers looking for authentic voices.
              </p>
            </div>

            <div>
              <h4
                className={cn(
                  "text-base font-bold mb-2 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                Email Marketing
              </h4>
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#374151]"
                )}
              >
                A full email marketing suite — contacts database, list segmentation, drag-and-drop
                campaign builder, pre-built templates, and embeddable signup forms — built directly
                into the platform. Organizers can email attendees, creators, and sponsors from the
                same system they use to manage everything else, with send infrastructure powered
                by verified sending domains.
              </p>
            </div>

            <div>
              <h4
                className={cn(
                  "text-base font-bold mb-2 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                Sponsor &amp; Revenue Infrastructure
              </h4>
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#374151]"
                )}
              >
                Sponsors get more than a logo placement. RecurrentX tracks impressions, lead
                retrieval, content activations, and audience reach across the full event
                lifecycle — attributed to individual sponsorship packages. The 365 Insights
                dashboard shows sponsors quantifiable ROI week over week and month over month,
                so renewals are data-driven, not relationship-dependent.
              </p>
            </div>

            <div>
              <h4
                className={cn(
                  "text-base font-bold mb-2 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                Advertising &amp; Media Sales
              </h4>
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#374151]"
                )}
              >
                An integrated ad management system gives media teams a rate desk, CPM pricing
                controls, campaign management by advertiser, inventory tracking with profit
                margins, and a sales lead pipeline — purpose-built for military media
                organizations monetizing their audience through display and branded content
                placements.
              </p>
            </div>
          </div>
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
            {/* Phone 1 — Registration & Check-In */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative w-[240px] h-[480px] rounded-[2.2rem] border-[5px] overflow-hidden shadow-2xl transition-colors duration-300",
                  dark
                    ? "border-gray-700 bg-[#0f0f1a] shadow-black/40"
                    : "border-gray-800 bg-[#0f0f1a] shadow-gray-400/30"
                )}
              >
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-black rounded-b-2xl z-10" />
                {/* Screen content */}
                <div className="w-full h-full flex flex-col bg-[#0f0f1a]">
                  {/* Status bar spacer */}
                  <div className="h-[28px] bg-[#6C5CE7]" />
                  {/* Purple header */}
                  <div className="bg-[#6C5CE7] px-4 py-3 text-center">
                    <p className="text-white text-[10px] font-bold leading-tight">Military Influencer</p>
                    <p className="text-white text-[10px] font-bold leading-tight">Conference 2026</p>
                  </div>
                  {/* QR Code area */}
                  <div className="flex-1 flex flex-col items-center justify-center px-6 bg-[#111827]">
                    {/* QR Code pattern */}
                    <div className="w-[130px] h-[130px] bg-white rounded-xl p-2.5 mb-4">
                      <div className="w-full h-full grid grid-cols-9 grid-rows-9 gap-[2px]">
                        {[
                          [1,1,1,1,1,0,1,0,1],
                          [1,0,0,0,1,0,0,1,1],
                          [1,0,1,0,1,0,1,0,1],
                          [1,0,0,0,1,0,0,1,0],
                          [1,1,1,1,1,0,1,0,1],
                          [0,0,0,0,0,0,1,1,0],
                          [1,1,0,1,1,1,0,0,1],
                          [0,1,0,0,1,0,1,0,1],
                          [1,0,1,1,0,1,0,1,0],
                        ].map((row, ri) =>
                          row.map((v, ci) => (
                            <div
                              key={`qr-${ri}-${ci}`}
                              className={cn(
                                "rounded-[1px]",
                                v ? (ri === 6 ? "bg-[#6C5CE7]" : "bg-[#111827]") : "bg-white"
                              )}
                            />
                          ))
                        )}
                      </div>
                    </div>
                    <p className="text-white text-sm font-bold">Curtez Riggs</p>
                    <span className="mt-1.5 px-3 py-0.5 rounded-full bg-[#10B981] text-white text-[10px] font-semibold">
                      Attendee
                    </span>
                    <p className="text-gray-500 text-[9px] mt-3">Scan at registration desk</p>
                  </div>
                  {/* Bottom nav */}
                  <div className="h-[44px] bg-[#1a1f2e] border-t border-white/10 flex items-center justify-around px-4">
                    <div className="w-5 h-5 rounded bg-[#6C5CE7]/30" />
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="w-5 h-5 rounded bg-white/10" />
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

            {/* Phone 2 — Live Agenda */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative w-[240px] h-[480px] rounded-[2.2rem] border-[5px] overflow-hidden shadow-2xl transition-colors duration-300",
                  dark
                    ? "border-gray-700 bg-[#0f0f1a] shadow-black/40"
                    : "border-gray-800 bg-[#0f0f1a] shadow-gray-400/30"
                )}
              >
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-black rounded-b-2xl z-10" />
                {/* Screen content */}
                <div className="w-full h-full flex flex-col bg-[#0f0f1a]">
                  {/* Status bar spacer */}
                  <div className="h-[28px] bg-[#6C5CE7]" />
                  {/* Purple header */}
                  <div className="bg-[#6C5CE7] px-4 py-3">
                    <p className="text-white text-xs font-bold text-center">Schedule</p>
                  </div>
                  {/* Day pills */}
                  <div className="bg-[#111827] px-4 py-2.5 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#6C5CE7] text-white text-[10px] font-semibold">
                      Day 1 &middot; Sep 23
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-gray-400 text-[10px] font-medium">
                      Day 2
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-gray-400 text-[10px] font-medium">
                      Day 3
                    </span>
                  </div>
                  {/* Session cards */}
                  <div className="flex-1 bg-[#111827] px-3 py-2 space-y-2.5 overflow-hidden">
                    {/* Card 1 */}
                    <div className="bg-[#1a1f2e] rounded-lg p-3 border-l-[3px] border-[#6C5CE7] flex justify-between items-start">
                      <div>
                        <p className="text-gray-500 text-[9px] font-medium">9:00 AM</p>
                        <p className="text-white text-[11px] font-semibold mt-0.5">Opening Keynote</p>
                        <p className="text-gray-500 text-[9px] mt-1">Main Stage</p>
                      </div>
                      <div className="text-gray-600 text-[10px] mt-0.5">&#9734;</div>
                    </div>
                    {/* Card 2 */}
                    <div className="bg-[#1a1f2e] rounded-lg p-3 border-l-[3px] border-[#10B981] flex justify-between items-start">
                      <div>
                        <p className="text-gray-500 text-[9px] font-medium">10:30 AM</p>
                        <p className="text-white text-[11px] font-semibold mt-0.5">Military Spouse Creator Panel</p>
                        <p className="text-gray-500 text-[9px] mt-1">PDX Stage</p>
                      </div>
                      <div className="text-gray-600 text-[10px] mt-0.5">&#9734;</div>
                    </div>
                    {/* Card 3 */}
                    <div className="bg-[#1a1f2e] rounded-lg p-3 border-l-[3px] border-[#3B82F6] flex justify-between items-start">
                      <div>
                        <p className="text-gray-500 text-[9px] font-medium">1:00 PM</p>
                        <p className="text-white text-[11px] font-semibold mt-0.5">Brand Partnerships Workshop</p>
                        <p className="text-gray-500 text-[9px] mt-1">Room 204</p>
                      </div>
                      <div className="text-gray-600 text-[10px] mt-0.5">&#9734;</div>
                    </div>
                  </div>
                  {/* Bottom nav */}
                  <div className="h-[44px] bg-[#1a1f2e] border-t border-white/10 flex items-center justify-around px-4">
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="w-5 h-5 rounded bg-[#6C5CE7]/30" />
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="w-5 h-5 rounded bg-white/10" />
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

            {/* Phone 3 — Community Connections */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative w-[240px] h-[480px] rounded-[2.2rem] border-[5px] overflow-hidden shadow-2xl transition-colors duration-300",
                  dark
                    ? "border-gray-700 bg-[#0f0f1a] shadow-black/40"
                    : "border-gray-800 bg-[#0f0f1a] shadow-gray-400/30"
                )}
              >
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-black rounded-b-2xl z-10" />
                {/* Screen content */}
                <div className="w-full h-full flex flex-col bg-[#0f0f1a]">
                  {/* Status bar spacer */}
                  <div className="h-[28px] bg-[#6C5CE7]" />
                  {/* Purple header */}
                  <div className="bg-[#6C5CE7] px-4 py-3">
                    <p className="text-white text-xs font-bold text-center">Community</p>
                  </div>
                  {/* Feed */}
                  <div className="flex-1 bg-[#111827] px-3 py-3 space-y-3 overflow-hidden">
                    {/* Post 1 */}
                    <div className="bg-[#1a1f2e] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-[#6C5CE7]/30 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-[#6C5CE7]">JM</span>
                        </div>
                        <div>
                          <p className="text-white text-[10px] font-semibold">Jake Morrison</p>
                          <p className="text-gray-600 text-[8px]">2h ago</p>
                        </div>
                      </div>
                      <p className="text-gray-300 text-[10px] leading-relaxed">
                        Just landed in Tampa! Who&rsquo;s heading to the PDX stage tomorrow? &#127908;
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-gray-500">
                        <span className="text-[9px]">&#10084;</span>
                        <span className="text-[9px]">12</span>
                      </div>
                    </div>
                    {/* Post 2 */}
                    <div className="bg-[#1a1f2e] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-[#10B981]/30 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-[#10B981]">SR</span>
                        </div>
                        <div>
                          <p className="text-white text-[10px] font-semibold">Sarah Rodriguez</p>
                          <p className="text-gray-600 text-[8px]">4h ago</p>
                        </div>
                      </div>
                      <p className="text-gray-300 text-[10px] leading-relaxed">
                        Can&rsquo;t wait for the keynote. First time at MIC! &#127482;&#127480;
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-gray-500">
                        <span className="text-[9px]">&#10084;</span>
                        <span className="text-[9px]">8</span>
                      </div>
                    </div>
                    {/* Connect section */}
                    <div className="bg-[#1a1f2e] rounded-lg p-3">
                      <p className="text-white text-[10px] font-semibold mb-2">Connect</p>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-6 h-6 rounded-full bg-[#6C5CE7]/40 border-2 border-[#1a1f2e]" />
                        <div className="w-6 h-6 rounded-full bg-[#3B82F6]/40 border-2 border-[#1a1f2e] -ml-2.5" />
                        <div className="w-6 h-6 rounded-full bg-[#10B981]/40 border-2 border-[#1a1f2e] -ml-2.5" />
                        <span className="text-gray-500 text-[9px] ml-1">47 attendees near you</span>
                      </div>
                      <div className="w-full py-1.5 rounded-lg bg-[#10B981] text-white text-[10px] font-semibold text-center">
                        &#128241; Share My Profile
                      </div>
                    </div>
                  </div>
                  {/* Bottom nav */}
                  <div className="h-[44px] bg-[#1a1f2e] border-t border-white/10 flex items-center justify-around px-4">
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="w-5 h-5 rounded bg-[#6C5CE7]/30" />
                    <div className="w-5 h-5 rounded bg-white/10" />
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
/* Tab: Events & Attendee App                                          */
/* ------------------------------------------------------------------ */

function EventsAttendeeTab({ dark }: { dark: boolean }) {
  const brief = SOLUTION_BRIEFS["Events & Attendee App"];
  const kbSlug = TAB_KB_CATEGORY["Events & Attendee App"];

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
          Events &amp; Attendee App
        </h3>
        <p
          className={cn(
            "text-sm max-w-md transition-colors duration-300",
            dark ? "text-gray-400" : "text-[#6B7280]"
          )}
        >
          See how RecurrentX powers end-to-end event creation, ticketing, check-in, and a mobile-first attendee experience.
        </p>
        <p className="text-[#6C5CE7] text-sm font-medium mt-4">Demo video coming soon</p>
      </div>

      {/* Solution Brief */}
      {brief && <SolutionBrief data={brief} dark={dark} />}

      {/* PWA Showcase */}
      <section className="mt-16 max-w-4xl mx-auto">
        <p
          className={cn(
            "text-[11px] font-semibold tracking-[0.15em] uppercase mb-6 transition-colors duration-300",
            dark ? "text-gray-500" : "text-[#9CA3AF]"
          )}
        >
          PROGRESSIVE WEB APP (PWA) — NO APP STORE REQUIRED
        </p>

        <h3
          className={cn(
            "text-xl md:text-2xl font-extrabold leading-tight mb-2 transition-colors duration-300",
            dark ? "text-white" : "text-[#111827]"
          )}
        >
          Built for Organizers.{" "}
          <span className="text-[#6C5CE7]">Loved by Attendees.</span>
        </h3>
        <p
          className={cn(
            "text-base leading-relaxed mb-8 transition-colors duration-300",
            dark ? "text-gray-400" : "text-[#6B7280]"
          )}
        >
          Manage every detail from the backend — and watch it appear instantly in the attendee PWA.
        </p>

        {/* Admin + Phone Preview Mockup */}
        <div
          className={cn(
            "rounded-2xl border overflow-hidden transition-colors duration-300",
            dark
              ? "bg-[#111827] border-white/[0.08]"
              : "bg-[#F9FAFB] border-[#E5E7EB]"
          )}
        >
          <div className="flex flex-col md:flex-row">
            {/* Left — Admin Panel Mockup */}
            <div className="flex-1 p-6 md:p-8">
              <p
                className={cn(
                  "text-[10px] font-semibold tracking-widest uppercase mb-4 transition-colors duration-300",
                  dark ? "text-gray-500" : "text-[#9CA3AF]"
                )}
              >
                Event Admin Dashboard
              </p>
              {/* Simulated admin settings */}
              <div className="space-y-3">
                {/* Tab bar */}
                <div className="flex gap-1">
                  {["Details", "Schedule", "Sponsors", "Attendee App"].map((t, i) => (
                    <span
                      key={t}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors duration-300",
                        i === 3
                          ? "bg-[#6C5CE7] text-white"
                          : dark
                            ? "bg-white/[0.06] text-gray-400"
                            : "bg-white text-[#6B7280]"
                      )}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                {/* Settings fields */}
                <div
                  className={cn(
                    "rounded-xl p-4 space-y-3 transition-colors duration-300",
                    dark ? "bg-white/[0.04]" : "bg-white"
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-bold transition-colors duration-300",
                      dark ? "text-white" : "text-[#111827]"
                    )}
                  >
                    App Settings
                  </p>
                  {[
                    { label: "Event WiFi Network", value: "MIC-Guest-2026" },
                    { label: "WiFi Password", value: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" },
                    { label: "Emergency Contact", value: "(555) 012-3456" },
                    { label: "Venue Map URL", value: "maps.mic2026.com" },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-[11px] transition-colors duration-300",
                          dark ? "text-gray-400" : "text-[#6B7280]"
                        )}
                      >
                        {f.label}
                      </span>
                      <span
                        className={cn(
                          "text-[11px] font-medium transition-colors duration-300",
                          dark ? "text-gray-300" : "text-[#374151]"
                        )}
                      >
                        {f.value}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Toggle rows */}
                <div
                  className={cn(
                    "rounded-xl p-4 space-y-2.5 transition-colors duration-300",
                    dark ? "bg-white/[0.04]" : "bg-white"
                  )}
                >
                  {[
                    { label: "Push Notifications", on: true },
                    { label: "Community Feed", on: true },
                    { label: "QR Networking", on: true },
                    { label: "Sponsor Banner Ads", on: false },
                  ].map((toggle) => (
                    <div key={toggle.label} className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-[11px] transition-colors duration-300",
                          dark ? "text-gray-400" : "text-[#6B7280]"
                        )}
                      >
                        {toggle.label}
                      </span>
                      <div
                        className={cn(
                          "w-8 h-[18px] rounded-full relative transition-colors",
                          toggle.on ? "bg-[#6C5CE7]" : dark ? "bg-gray-600" : "bg-gray-300"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all",
                            toggle.on ? "left-[16px]" : "left-[2px]"
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Phone Preview */}
            <div className="flex items-center justify-center p-6 md:p-8 md:border-l border-t md:border-t-0 border-inherit">
              <div>
                <p
                  className={cn(
                    "text-[10px] font-semibold tracking-widest uppercase mb-3 text-center transition-colors duration-300",
                    dark ? "text-gray-500" : "text-[#9CA3AF]"
                  )}
                >
                  Live Attendee Preview
                </p>
                <div
                  className={cn(
                    "relative w-[200px] h-[400px] rounded-[2rem] border-[5px] overflow-hidden shadow-xl transition-colors duration-300",
                    dark
                      ? "border-gray-700 bg-white shadow-black/40"
                      : "border-gray-800 bg-white shadow-gray-400/30"
                  )}
                >
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80px] h-[20px] bg-black rounded-b-xl z-10" />
                  {/* Screen */}
                  <div className="w-full h-full flex flex-col bg-white">
                    <div className="h-[24px] bg-[#6C5CE7]" />
                    <div className="bg-[#6C5CE7] px-3 py-2 text-center">
                      <p className="text-white text-[9px] font-bold">MIC 2026</p>
                      <p className="text-white/70 text-[7px]">Sep 23–25, Washington DC</p>
                    </div>
                    {/* Info cards */}
                    <div className="flex-1 bg-[#F9FAFB] px-2.5 py-2 space-y-1.5 overflow-hidden">
                      <div className="bg-white rounded-lg p-2 shadow-sm">
                        <p className="text-[8px] font-bold text-[#111827]">WiFi</p>
                        <p className="text-[7px] text-gray-500">MIC-Guest-2026</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 shadow-sm">
                        <p className="text-[8px] font-bold text-[#111827]">Next Session</p>
                        <p className="text-[7px] text-gray-500">Opening Keynote - 9:00 AM</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 shadow-sm">
                        <p className="text-[8px] font-bold text-[#111827]">Notifications</p>
                        <p className="text-[7px] text-gray-500">3 new announcements</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 shadow-sm">
                        <p className="text-[8px] font-bold text-[#111827]">Community</p>
                        <p className="text-[7px] text-gray-500">47 attendees nearby</p>
                      </div>
                    </div>
                    {/* Bottom nav */}
                    <div className="h-[36px] bg-[#F9FAFB] border-t border-gray-200 flex items-center justify-around px-2">
                      <span className="text-[6px] text-[#6C5CE7] font-medium">Home</span>
                      <span className="text-[6px] text-gray-400 font-medium">Schedule</span>
                      <span className="text-[6px] text-gray-400 font-medium">Map</span>
                      <span className="text-[6px] text-gray-400 font-medium">Profile</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bullet points */}
        <div className="mt-8 space-y-3 max-w-2xl">
          {[
            "Manage WiFi credentials, FAQs, and notifications from one dashboard",
            "Live Attendee Preview shows exactly what attendees see on their phone — in real time",
            "No app download required — the PWA installs directly from the browser to any home screen",
          ].map((point) => (
            <div key={point} className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-300" : "text-[#374151]"
                )}
              >
                {point}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
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
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
    return "light";
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const darkMode =
    themeMode === "dark" || (themeMode === "system" && systemPrefersDark);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setHasAccess(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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
            {/* Theme toggle pill */}
            <div
              className={cn(
                "flex items-center gap-0.5 rounded-full px-1 py-1 border transition-colors duration-300",
                darkMode
                  ? "bg-white/[0.06] border-white/10"
                  : "bg-white border-[#E5E7EB]"
              )}
            >
              {([
                { mode: "light" as const, Icon: Sun },
                { mode: "dark" as const, Icon: Moon },
                { mode: "system" as const, Icon: Monitor },
              ]).map(({ mode, Icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setThemeMode(mode)}
                  className={cn(
                    "p-1.5 rounded-full transition-all duration-200",
                    themeMode === mode
                      ? darkMode
                        ? "bg-white/[0.12] text-white shadow-sm"
                        : "bg-white text-[#111827] shadow-sm"
                      : darkMode
                        ? "text-gray-500 hover:text-gray-300"
                        : "text-[#6B7280] hover:text-[#111827]"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </button>
              ))}
            </div>

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
        {activeTab === "Events & Attendee App" && (
          <EventsAttendeeTab dark={darkMode} />
        )}
        {activeTab !== "Overview" && activeTab !== "PDX Experience" && activeTab !== "Events & Attendee App" && (
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
