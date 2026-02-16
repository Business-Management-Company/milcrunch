import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useContext } from "react";
import { AdminChatContext } from "@/contexts/AdminChatContext";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    desc: "Create PDX experiences and live events",
    href: "/pdx/create",
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
    href: "/pdx/create",
    icon: Video,
  },
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
  const adminChat = useContext(AdminChatContext);
  const inputRef = useRef<HTMLInputElement>(null);
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

    // Upcoming events (seed data if table doesn't exist yet)
    supabase
      .from("events")
      .select("id, name, date_label, location")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setEvents(
            data.map((e) => ({
              id: e.id,
              name: (e as Record<string, unknown>).name as string ?? "Event",
              date_label: (e as Record<string, unknown>).date_label as string ?? "",
              location: (e as Record<string, unknown>).location as string ?? "",
            })),
          );
        } else {
          setEvents([
            { id: "1", name: "MilSpouseFest San Diego", date_label: "Mar 15", location: "San Diego, CA" },
            { id: "2", name: "PDX at Fort Liberty", date_label: "Apr 5", location: "Fort Liberty, NC" },
            { id: "3", name: "MIC 2026", date_label: "Sep 15-17", location: "Washington, DC" },
          ]);
        }
      });

    // Recent activity — placeholder until we have an activity feed
    setActivity([
      { label: "Creator directory updated", time: "2 hours ago" },
      { label: "New list created: Q1 Outreach", time: "Yesterday" },
      { label: "3 creators added to Fitness list", time: "2 days ago" },
      { label: "PDX Fort Liberty event created", time: "3 days ago" },
      { label: "Verification completed for @mattbest11x", time: "4 days ago" },
    ]);
  }, []);

  // Submit prompt → send via Admin AI Chat
  const handleSubmit = () => {
    const q = prompt.trim();
    if (!q || !adminChat) return;
    setPrompt("");
    adminChat.sendMessage(q);
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center pt-4">
        <h1 className="text-3xl md:text-4xl font-bold text-[#000741] dark:text-white tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">
          What would you like to do today?
        </p>
      </div>

      {/* AI Prompt Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="relative flex items-center">
          <Sparkles className="absolute left-4 h-5 w-5 text-[#6C5CE7]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask me anything about creators, events, sponsors, or campaigns..."
            className={cn(
              "w-full pl-12 pr-14 py-4 rounded-2xl text-base",
              "border border-gray-200 dark:border-gray-700",
              "bg-white dark:bg-[#1A1D27]",
              "shadow-sm hover:shadow-md focus:shadow-md focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7]",
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
                to="/pdx/create"
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
