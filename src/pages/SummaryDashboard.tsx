import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search,
  ListPlus,
  ShieldCheck,
  Users,
  Calendar,
  Mic,
  BarChart3,
  Video,
  Sparkles,
  ArrowRight,
  Send,
  MapPin,
  Clock,
  ShoppingBag,
  Headphones,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Quick-action card definitions                                       */
/* ------------------------------------------------------------------ */

const ROW1 = [
  {
    title: "Find Creators",
    desc: "Search military & veteran creators by niche, branch, engagement",
    href: "/brand/discover",
    icon: Search,
  },
  {
    title: "Build a List",
    desc: "Curate creator lists for campaigns and outreach",
    href: "/brand/lists",
    icon: ListPlus,
  },
  {
    title: "Verify a Creator",
    desc: "Run military service verification checks",
    href: "/brand/verification",
    icon: ShieldCheck,
  },
  {
    title: "Manage Directory",
    desc: "Review and manage approved creators",
    href: "/brand/directory",
    icon: Users,
  },
];

const ROW2 = [
  {
    title: "Plan an Event",
    desc: "Create experiences and live events",
    href: "/brand/events/create",
    icon: Calendar,
  },
  {
    title: "Book a Speaker",
    desc: "Browse and book military speakers",
    href: "/speakers",
    icon: Mic,
  },
  {
    title: "Sponsor ROI",
    desc: "Track sponsor performance and analytics",
    href: "/sponsors",
    icon: BarChart3,
  },
  {
    title: "Go Live",
    desc: "Launch a live streaming experience",
    href: "/brand/events/create",
    icon: Video,
  },
];

/* ------------------------------------------------------------------ */
/* Pill button quick actions                                           */
/* ------------------------------------------------------------------ */

const PILLS_ROW1 = [
  { label: "Find Military Creators", icon: "🔍", href: "/brand/discover" },
  { label: "Build a Creator List", icon: "📋", href: "/brand/lists" },
  { label: "Browse Podcast Network", icon: "🎙️", href: "/brand/podcasts" },
  { label: "View Event Analytics", icon: "📊", href: "/brand/events" },
];

const PILLS_ROW2 = [
  { label: "Find Keynote Speakers", icon: "🎤", href: "/brand/discover" },
  { label: "Verify a Creator", icon: "✅", href: "/brand/discover" },
  { label: "Manage Events", icon: "📅", href: "/brand/events" },
  { label: "SWAG Store", icon: "🏪", href: "/swag" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function SummaryDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");

  // User's first name
  const fullName =
    (user?.user_metadata?.full_name as string) ??
    (user?.user_metadata?.display_name as string) ??
    "";
  const firstName = fullName.split(" ")[0] || "there";

  // Network stats
  const [directoryCount, setDirectoryCount] = useState<number | null>(null);
  const [totalReach, setTotalReach] = useState<number | null>(null);
  const [listCount, setListCount] = useState<number | null>(null);

  // Upcoming events
  const [events, setEvents] = useState<
    { id: string; name: string; date_label: string; location: string }[]
  >([]);

  // Recent activity
  const [activity, setActivity] = useState<
    { label: string; time: string }[]
  >([]);

  useEffect(() => {
    // Directory count + total reach (from directory_members)
    supabase
      .from("directory_members")
      .select("follower_count", { count: "exact" })
      .eq("approved", true)
      .then(({ data, count }) => {
        setDirectoryCount(count ?? 0);
        const reach = (data ?? []).reduce(
          (sum, r) => sum + ((r.follower_count as number) ?? 0),
          0,
        );
        setTotalReach(reach);
      });

    // List count
    supabase
      .from("influencer_lists")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setListCount(count ?? 0));

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
            { id: "2", name: "RecurrentX at Fort Liberty", date_label: "Apr 5", location: "Fort Liberty, NC" },
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

  // Smart command router
  const handleSubmit = () => {
    const q = prompt.trim().toLowerCase();
    if (!q) return;
    setPrompt("");

    if (q.includes("creator") || q.includes("influencer")) {
      navigate("/brand/discover");
    } else if (q.includes("event")) {
      navigate("/brand/events");
    } else if (q.includes("podcast")) {
      navigate("/brand/podcasts");
    } else if (q.includes("sponsor")) {
      navigate("/brand/events");
    } else if (q.includes("analytics") || q.includes("report")) {
      navigate("/brand/attribution");
    } else if (q.includes("list") || q.includes("directory")) {
      navigate("/brand/directory");
    } else {
      toast("I can help with creators, events, podcasts, sponsors, and analytics. Try asking about one of those!");
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center pt-4">
        <h1 className="text-3xl md:text-4xl font-bold text-[#000741] dark:text-white tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">
          What can I help you with?
        </p>
      </div>

      {/* AI Prompt Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="relative flex items-center">
          <Sparkles className="absolute left-4 h-5 w-5 text-[#6C5CE7]" />
          <input
            type="text"
            placeholder="Ask me anything about creators, events, or campaigns..."
            className={cn(
              "w-full pl-12 pr-14 py-4 rounded-2xl text-base",
              "border-2 border-purple-200 dark:border-purple-800 focus:border-[#6C5CE7]",
              "bg-white dark:bg-[#1A1D27]",
              "shadow-sm hover:shadow-md focus:shadow-md focus:ring-2 focus:ring-[#6C5CE7]/30",
              "outline-none transition-all placeholder:text-gray-400",
            )}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!prompt.trim()}
            className={cn(
              "absolute right-3 rounded-xl p-2 transition-colors",
              prompt.trim()
                ? "bg-[#6C5CE7] text-white hover:bg-[#5B4BD1]"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400",
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Pill Quick Actions */}
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap justify-center gap-2.5">
            {PILLS_ROW1.map((pill) => (
              <Link
                key={pill.label}
                to={pill.href}
                className={cn(
                  "flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300",
                  "hover:border-[#6C5CE7] hover:text-[#6C5CE7] hover:bg-purple-50 dark:hover:bg-purple-900/20",
                  "transition-all",
                )}
              >
                <span>{pill.icon}</span>
                {pill.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2.5">
            {PILLS_ROW2.map((pill) => (
              <Link
                key={pill.label}
                to={pill.href}
                className={cn(
                  "flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300",
                  "hover:border-[#6C5CE7] hover:text-[#6C5CE7] hover:bg-purple-50 dark:hover:bg-purple-900/20",
                  "transition-all",
                )}
              >
                <span>{pill.icon}</span>
                {pill.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action Cards — Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ROW1.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href + card.title}
              to={card.href}
              className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="rounded-lg bg-[#6C5CE7]/10 p-2.5 w-fit mb-3">
                <Icon className="h-5 w-5 text-[#6C5CE7]" />
              </div>
              <h3 className="font-semibold text-[#000741] dark:text-white text-sm">
                {card.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {card.desc}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Quick Action Cards — Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-6">
        {ROW2.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href + card.title}
              to={card.href}
              className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="rounded-lg bg-[#6C5CE7]/10 p-2.5 w-fit mb-3">
                <Icon className="h-5 w-5 text-[#6C5CE7]" />
              </div>
              <h3 className="font-semibold text-[#000741] dark:text-white text-sm">
                {card.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {card.desc}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Three-column section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5">
          <h2 className="font-semibold text-[#000741] dark:text-white mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recent Activity
          </h2>
          <ul className="space-y-3">
            {activity.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#6C5CE7] mt-2 shrink-0" />
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

        {/* Upcoming Events */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5">
          <h2 className="font-semibold text-[#000741] dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Upcoming Events
          </h2>
          {events.length > 0 ? (
            <ul className="space-y-3">
              {events.map((event) => (
                <li key={event.id} className="flex items-start gap-3">
                  <span className="shrink-0 rounded-md bg-[#6C5CE7]/10 text-[#6C5CE7] text-xs font-semibold px-2 py-1">
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
                className="text-sm text-[#6C5CE7] hover:underline font-medium mt-1 inline-block"
              >
                Create one →
              </Link>
            </div>
          )}
          <Link
            to="/events"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#6C5CE7] hover:underline"
          >
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Network Stats */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5">
          <h2 className="font-semibold text-[#000741] dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Network Stats
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Creators in Directory</span>
              <span className="text-lg font-bold text-[#000741] dark:text-white">
                {directoryCount != null ? formatCount(directoryCount) : "—"}
              </span>
            </div>
            <div className="h-px bg-gray-100 dark:bg-gray-800" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Combined Reach</span>
              <span className="text-lg font-bold text-[#000741] dark:text-white">
                {totalReach != null ? formatCount(totalReach) : "—"}
              </span>
            </div>
            <div className="h-px bg-gray-100 dark:bg-gray-800" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Lists</span>
              <span className="text-lg font-bold text-[#000741] dark:text-white">
                {listCount != null ? listCount : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
