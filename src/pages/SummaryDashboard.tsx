import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePresentationMode } from "@/hooks/usePresentationMode";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  BarChart3,
  Sparkles,
  ArrowRight,
  MapPin,
  Clock,
  Search,
  ListPlus,
  CheckCircle,
  Mail,
  Presentation,
  FolderOpen,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchDirectoriesWithCounts, type Directory } from "@/lib/directories";

/* ------------------------------------------------------------------ */
/* Quick-action card definitions                                       */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatDateTime(): string {
  const now = new Date();
  const day = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} \u2022 ${time}`;
}

export default function SummaryDashboard() {
  useAuth();
  const [prompt, setPrompt] = useState("");

  const pres = usePresentationMode();
  const firstName = pres.firstName;

  // Network stats — top 3 directories with member counts
  const [topDirectories, setTopDirectories] = useState<Directory[]>([]);

  // Upcoming events
  const [events, setEvents] = useState<
    { id: string; name: string; date_label: string; location: string }[]
  >([]);

  // Recent activity
  const [activity, setActivity] = useState<
    { label: string; time: string }[]
  >([]);

  useEffect(() => {
    // Top 3 directories with member counts
    fetchDirectoriesWithCounts().then((dirs) => {
      setTopDirectories(dirs.slice(0, 3));
    });

    // Upcoming events
    supabase
      .from("events")
      .select("id, title, start_date, city, state")
      .order("start_date", { ascending: true })
      .limit(3)
      .then(({ data, error }) => {
        if (error) {
          console.error("[SummaryDashboard] events query failed:", error.message);
        }
        if (data && data.length > 0) {
          setEvents(
            data.map((e) => {
              const row = e as Record<string, unknown>;
              const startDate = row.start_date as string | null;
              let dateLabel = "";
              if (startDate) {
                try { dateLabel = new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
                catch { dateLabel = startDate; }
              }
              return {
                id: row.id as string,
                name: (row.title as string) ?? "Event",
                date_label: dateLabel,
                location: [row.city, row.state].filter(Boolean).join(", "),
              };
            }),
          );
        } else {
          setEvents([
            { id: "1", name: "MilSpouseFest San Diego", date_label: "Mar 15", location: "San Diego, CA" },
            { id: "2", name: "MilCrunch at Fort Liberty", date_label: "Apr 5", location: "Fort Liberty, NC" },
            { id: "3", name: "MIC 2026", date_label: "Sep 15-17", location: "Washington, DC" },
          ]);
        }
      });

    // Recent activity — placeholder until we have an activity feed
    setActivity([
      { label: "Creator directory updated", time: "2 hours ago" },
      { label: "New list created: Q1 Outreach", time: "Yesterday" },
      { label: "3 creators added to Fitness list", time: "2 days ago" },
      { label: "Fort Liberty event created", time: "3 days ago" },
      { label: "Verification completed for @mattbest11x", time: "4 days ago" },
    ]);
  }, []);

  // Send the query to the floating AI Agent Chat panel
  const handleSubmit = () => {
    const q = prompt.trim();
    if (!q) return;
    window.dispatchEvent(new CustomEvent("open-ai-chat", { detail: { message: q } }));
    setPrompt("");
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto -m-6 p-6 min-h-full bg-[#F8F9FA] dark:bg-transparent rounded-xl">
      {/* Centered heading */}
      <div className="text-center pt-4">
        <div className="inline-flex items-center gap-2.5 mb-2">
          <Sparkles className="h-7 w-7 text-[#1e3a5f]" />
          <h1 className="text-2xl md:text-3xl font-bold text-[#000741] dark:text-white tracking-tight">
            {getGreeting()}, <span className="text-amber-400">{firstName}</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{formatDateTime()}</p>
      </div>

      {/* Large chat-style input card */}
      <div className="max-w-3xl mx-auto">
        <div className={cn(
          "rounded-2xl border bg-white dark:bg-[#1A1D27] transition-all",
          prompt.trim()
            ? "border-[#1e3a5f] shadow-[0_0_20px_rgba(30,58,95,0.15)]"
            : "border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg",
        )}>
          <textarea
            placeholder="Describe what you need — find creators, plan an event, build a list..."
            className="w-full min-h-[80px] px-6 pt-5 pb-2 text-base bg-transparent outline-none resize-none placeholder:text-gray-400 dark:text-white"
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between px-6 pb-4">
            <Sparkles className="h-5 w-5 text-[#1e3a5f]/40" />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
                prompt.trim()
                  ? "bg-[#1e3a5f] text-white hover:bg-[#2d5282] shadow-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed",
              )}
            >
              Get started
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Pills — flowing layout */}
      <div className="flex flex-wrap justify-center gap-2.5 max-w-3xl mx-auto">
        {[
          { icon: Search, label: "Find Creators", color: "#1e3a5f", prompt: "Help me find creators" },
          { icon: ListPlus, label: "Build a List", color: "#0EA5E9", prompt: "Help me build a creator list" },
          { icon: Rocket, label: "Build an Event", color: "#8B5CF6", prompt: "I want to build an event." },
          { icon: BarChart3, label: "Event Analytics", color: "#22C55E", prompt: "Show me event analytics" },
          { icon: Presentation, label: "Find Speakers", color: "#EC4899", prompt: "Help me find speakers for an event" },
          { icon: CheckCircle, label: "Verify Creator", color: "#14B8A6", prompt: "Help me verify a creator" },
          { icon: Calendar, label: "Manage Events", color: "#0EA5E9", prompt: "Show me all upcoming events" },
          { icon: Mail, label: "Email Campaigns", color: "#F43F5E", prompt: "Show me email campaigns" },
        ].map((pill) => (
          <button
            key={pill.label}
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-ai-chat", { detail: { message: pill.prompt } }))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-100 dark:border-gray-700 bg-white dark:bg-[#1A1D27] shadow-sm text-sm font-medium text-[#000741] dark:text-gray-200 hover:shadow-md transition-all"
            style={{ "--tw-border-opacity": 1 } as React.CSSProperties}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = pill.color;
              e.currentTarget.style.backgroundColor = `${pill.color}08`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "";
              e.currentTarget.style.backgroundColor = "";
            }}
          >
            <pill.icon className="h-4 w-4" style={{ color: pill.color }} />
            {pill.label}
          </button>
        ))}
      </div>

      {/* Three-column section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Recent Activity */}
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden shadow-sm border-l-4 border-l-blue-500">
          <div className="px-6 py-3 bg-gradient-to-r from-[#1e3a5f]/10 to-[#1e3a5f]/5 border-b border-[#1e3a5f]/10">
            <h2 className="font-bold text-[#000741] dark:text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#1e3a5f]/15">
                <Clock className="h-4 w-4 text-[#1e3a5f]" />
              </span>
              Recent Activity
            </h2>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              {activity.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f] mt-2 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-[#000741] dark:text-white truncate">
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden shadow-sm border-l-4 border-l-amber-500">
          <div className="px-6 py-3 bg-gradient-to-r from-[#0EA5E9]/10 to-[#0EA5E9]/5 border-b border-[#0EA5E9]/10">
            <h2 className="font-bold text-[#000741] dark:text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#0EA5E9]/15">
                <Calendar className="h-4 w-4 text-[#0EA5E9]" />
              </span>
              Upcoming Events
            </h2>
          </div>
          <div className="p-6">
            {events.length > 0 ? (
              <ul className="space-y-3">
                {events.map((event) => (
                  <li key={event.id} className="flex items-start gap-3">
                    <span className="shrink-0 rounded-md bg-[#0EA5E9]/10 text-[#0EA5E9] text-xs font-semibold px-2 py-1">
                      {event.date_label}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#000741] dark:text-white truncate">
                        {event.name}
                      </p>
                      {event.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No upcoming events</p>
                <Link
                  to="/brand/events/create"
                  className="text-sm text-[#0EA5E9] hover:underline font-medium mt-1 inline-block"
                >
                  Create one →
                </Link>
              </div>
            )}
            <Link
              to="/events"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#0EA5E9] hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Network Stats — Top Directories */}
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden shadow-sm border-l-4 border-l-green-500">
          <div className="px-6 py-3 bg-gradient-to-r from-[#22C55E]/10 to-[#22C55E]/5 border-b border-[#22C55E]/10">
            <h2 className="font-bold text-[#000741] dark:text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#22C55E]/15">
                <FolderOpen className="h-4 w-4 text-[#22C55E]" />
              </span>
              Directories
            </h2>
          </div>
          <div className="p-6">
            {topDirectories.length > 0 ? (
              <ul className="space-y-3">
                {topDirectories.map((dir, i) => (
                  <li key={dir.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#000741] dark:text-white truncate">
                        {dir.name}
                      </span>
                      <span className="shrink-0 ml-2 text-sm font-bold text-[#22C55E]">
                        {dir.member_count ?? 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dir.member_count === 1 ? "1 creator" : `${dir.member_count ?? 0} creators`}
                    </p>
                    {i < topDirectories.length - 1 && (
                      <div className="h-px bg-gray-100 dark:bg-gray-800 mt-3" />
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No directories yet</p>
            )}
            <Link
              to="/brand/directories"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#22C55E] hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
