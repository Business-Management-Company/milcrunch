import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchCredits } from "@/lib/influencers-club";
import {
  Users,
  Calendar,
  Mic2,
  BarChart3,
  Search,
  PlusCircle,
  Radio,
  TrendingUp,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATS = [
  {
    label: "Total Creators",
    value: "70,000+",
    subtext: "Indexed profiles",
    icon: Users,
    iconBg: "bg-[#0064B1]/10",
    iconColor: "text-[#0064B1]",
  },
  {
    label: "Active Events",
    value: "4",
    subtext: "Upcoming events",
    icon: Calendar,
    iconBg: "bg-[#0064B1]/10",
    iconColor: "text-[#0064B1]",
  },
  {
    label: "Podcast Network",
    value: "824",
    subtext: "Military podcasts",
    icon: Mic2,
    iconBg: "bg-[#0064B1]/10",
    iconColor: "text-[#0064B1]",
  },
  {
    label: "Creator Reach",
    value: "6M+",
    subtext: "Combined audience",
    icon: BarChart3,
    iconBg: "bg-[#0064B1]/10",
    iconColor: "text-[#0064B1]",
  },
];

const QUICK_ACTIONS = [
  {
    title: "Discover Creators",
    description: "Search and filter military & veteran creators",
    href: "/brand/discover",
    icon: Search,
    accent: "bg-[#0064B1] text-white hover:bg-[#053877]",
    iconBg: "bg-[#0064B1]/15 text-[#0064B1]",
  },
  {
    title: "Create Event",
    description: "Launch a new PDX or event",
    href: "/pdx/create",
    icon: PlusCircle,
    accent: "bg-[#F0A71F] text-[#000741] hover:bg-[#e09a1a]",
    iconBg: "bg-[#F0A71F]/20 text-[#F0A71F]",
  },
  {
    title: "Manage Podcasts",
    description: "Edit and moderate podcast catalog",
    href: "/admin/media/podcasts",
    icon: Radio,
    accent: "bg-[#6B21A8] text-white hover:bg-[#5B1A8A]",
    iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  },
  {
    title: "View Analytics",
    description: "Campaign performance and reach",
    href: "/analytics",
    icon: TrendingUp,
    accent: "bg-emerald-600 text-white hover:bg-emerald-700",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
];

const UPCOMING_EVENTS = [
  { name: "Military Times Veterans Summit", date: "Mar 15", location: "Washington, DC" },
  { name: "PDX at Fort Liberty", date: "Apr 5", location: "Fort Liberty, NC" },
  { name: "MIC 2026", date: "Sep", location: "Washington, DC" },
  { name: "PDX at VFW National", date: "Aug", location: "Louisville, KY" },
];

const PLATFORM_HIGHLIGHTS = [
  "AI-powered creator discovery across 340M+ profiles",
  "Enriched creator profiles with engagement analytics",
  "PDX event creation wizard with mobile experience",
  "824+ military & veteran podcasts indexed",
];

const FEATURED_CREATORS = [
  { name: "Jason", handle: "savagekingdomboerboels", followers: "359.1K", niche: "Veterans", initials: "JS" },
  { name: "Kevin", handle: "wheelchairkev", followers: "353.1K", niche: "Motivation", initials: "KW" },
  { name: "Taylor", handle: "tsyontz", followers: "96.8K", niche: "Military", initials: "TS" },
  { name: "Jon", handle: "itsjonlynch", followers: "88.6K", niche: "Military", initials: "JO" },
  { name: "David", handle: "frommilitarytomillionaire", followers: "107.9K", niche: "Military", initials: "DA" },
  { name: "Ashlee", handle: "thewomanandwarrior", followers: "34.6K", niche: "Military", initials: "AS" },
];

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function SummaryDashboard() {
  const today = formatDate();

  return (
    <div className="space-y-8">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#000741] dark:text-white tracking-tight">
            Welcome to ParadeDeck
          </h1>
          <p className="text-muted-foreground mt-0.5">Command Center Overview</p>
        </div>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-[#000741] dark:text-white mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.subtext}</p>
                </div>
                <div className={cn("rounded-full p-2.5", stat.iconBg, stat.iconColor)}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-[#000741] dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                to={action.href}
                className={cn(
                  "group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5 shadow-sm",
                  "hover:shadow-md transition-all hover:border-[#0064B1]/30 flex flex-col"
                )}
              >
                <div className={cn("rounded-lg p-2.5 w-fit mb-3", action.iconBg)}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-[#000741] dark:text-white">{action.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5 flex-1">{action.description}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-[#0064B1] mt-3 group-hover:gap-2 transition-all">
                  Go <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent activity — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#000741] dark:text-white mb-4">Upcoming Events</h2>
          <ul className="space-y-3">
            {UPCOMING_EVENTS.map((event) => (
              <li key={event.name} className="flex items-start gap-3">
                <span className="shrink-0 rounded-md bg-[#0064B1]/10 text-[#0064B1] text-xs font-semibold px-2.5 py-1">
                  {event.date}
                </span>
                <div>
                  <p className="font-medium text-[#000741] dark:text-white">{event.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {event.location}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <Link
            to="/events"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#0064B1] hover:underline"
          >
            View All Events <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#000741] dark:text-white mb-4">Platform Highlights</h2>
          <ul className="space-y-2.5">
            {PLATFORM_HIGHLIGHTS.map((highlight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-[#0064B1] mt-0.5">•</span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Featured Creators */}
      <div>
        <div className="flex items-end justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-[#000741] dark:text-white">Featured Creators</h2>
          <Link
            to="/brand/discover"
            className="text-sm font-medium text-[#0064B1] hover:underline inline-flex items-center gap-1"
          >
            View All Creators <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto pb-2 -mx-1">
          <div className="flex gap-4 min-w-0">
            {FEATURED_CREATORS.map((c) => (
              <Link
                key={c.handle}
                to="/brand/discover"
                className="group shrink-0 w-[180px] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4 shadow-sm hover:shadow-md hover:border-[#0064B1]/30 transition-all"
              >
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 mx-auto mb-3"
                  style={{ background: "linear-gradient(135deg, #0064B1 0%, #053877 100%)" }}
                >
                  {c.initials}
                </div>
                <p className="font-semibold text-[#000741] dark:text-white text-center truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground text-center truncate">@{c.handle}</p>
                <p className="text-xs text-muted-foreground text-center mt-0.5">{c.followers} followers</p>
                <span className="inline-block w-full text-center mt-2 bg-[#0064B1]/10 text-[#0064B1] rounded-full px-2 py-0.5 text-xs font-medium">
                  {c.niche}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
