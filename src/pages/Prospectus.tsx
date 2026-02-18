import { useState, useEffect } from "react";
import {
  Lock, Play, Share2, Check, Calendar, Users, BarChart3, Video,
  Zap, Shield, ArrowRight, Mail, Loader2, Sun, Moon,
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
  { tool: "Eventbrite / Cvent", cost: 500, replaces: "Event Management" },
  { tool: "Grin / AspireIQ", cost: 800, replaces: "Creator Discovery" },
  { tool: "StreamYard / Restream", cost: 50, replaces: "Live Streaming" },
  { tool: "Jotform / Typeform", cost: 50, replaces: "Registration Forms" },
  { tool: "Brandwatch / Sprout", cost: 300, replaces: "Social Monitoring" },
  { tool: "Mailchimp / Klaviyo", cost: 100, replaces: "Email & Outreach" },
  { tool: "Manual Verification", cost: 2000, replaces: "Military ID Verification" },
];

const TAB_PLACEHOLDERS: Record<string, string> = {
  "Events & Attendee App":
    "See how RecurrentX powers end-to-end event creation, ticketing, check-in, and a mobile-first attendee experience.",
  "Creator Network":
    "Explore our verified military creator marketplace — discovery, vetting, and campaign management in one place.",
  "365 Insights":
    "Learn how sponsors get year-round analytics, community engagement metrics, and automated renewal reports.",
  "Streaming & Media":
    "Watch our AI production pipeline in action — multi-camera streaming, auto-highlights, and social clip generation.",
  "Partnership Model":
    "Understand our pricing, revenue share, and white-label options for media companies and event organizers.",
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
            "text-3xl md:text-4xl font-extrabold leading-tight mb-4 transition-colors duration-300",
            dark ? "text-white" : "text-[#111827]"
          )}
        >
          You didn&rsquo;t sponsor a 3-day event.
          <br />
          <span className="text-[#6C5CE7]">You sponsored a 365-day community.</span>
        </h2>
        <p
          className={cn(
            "text-lg max-w-2xl mx-auto leading-relaxed transition-colors duration-300",
            dark ? "text-gray-400" : "text-[#6B7280]"
          )}
        >
          RecurrentX is the platform Recurrent.io needs to turn one-time military
          events into year-round revenue engines.
        </p>
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

      {/* SaaS Replacement Calculator */}
      <section className="max-w-3xl mx-auto">
        <h3
          className={cn(
            "text-xl font-bold text-center mb-1 transition-colors duration-300",
            dark ? "text-white" : "text-[#111827]"
          )}
        >
          SaaS Replacement Calculator
        </h3>
        <p
          className={cn(
            "text-center text-sm mb-6 transition-colors duration-300",
            dark ? "text-gray-500" : "text-[#6B7280]"
          )}
        >
          One platform. One bill. One login.
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
            in SaaS costs into one military-focused platform.
          </p>
        </div>
      </section>

      {/* Origin Note */}
      <section className="max-w-2xl mx-auto">
        <div
          className={cn(
            "rounded-2xl p-6 text-center transition-colors duration-300",
            dark
              ? "bg-white/[0.03] border border-white/[0.08]"
              : "bg-white border border-[#E5E7EB]"
          )}
        >
          <Shield className="h-6 w-6 text-[#6C5CE7] mx-auto mb-3" />
          <p
            className={cn(
              "text-sm leading-relaxed transition-colors duration-300",
              dark ? "text-gray-400" : "text-[#6B7280]"
            )}
          >
            Built on the foundation of{" "}
            <span
              className={cn(
                "font-semibold transition-colors duration-300",
                dark ? "text-white" : "text-[#111827]"
              )}
            >
              Parade Deck
            </span>{" "}
            — a military creator marketplace — RecurrentX evolved into the full
            operating system for military events and communities.
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
  return (
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
        {activeTab !== "Overview" && (
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
