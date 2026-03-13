import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import CreatorLayout from "@/components/layout/CreatorLayout";
import CreatorAIChat, { CreatorAIChatRef } from "@/components/creator/CreatorAIChat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getConnectedAccounts } from "@/lib/upload-post-sync";
import { supabase } from "@/integrations/supabase/client";
import {
  PenSquare,
  Link2,
  Copy,
  TrendingUp,
  MousePointer,
  Eye,
  Send,
  DollarSign,
  Sparkles,
  Users,
  CalendarDays,
  MapPin,
  FileText,
  ArrowRight,
  ArrowUpRight,
  Heart,
  MessageCircle,
  Share2,
  Instagram,
  Youtube,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/* ── TikTok icon (not in lucide) ── */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 3.76.92V6.69Z" />
    </svg>
  );
}

/* ── Demo data for @johnny-rocket ── */
const DEMO_ACCOUNTS = [
  { platform: "instagram", platform_username: "johnny.rocket", followers_count: 342_800 },
  { platform: "tiktok", platform_username: "johnny_rocket", followers_count: 389_493 },
  { platform: "youtube", platform_username: "JohnnyRocketVet", followers_count: 115_000 },
];

const DEMO_POSTS = [
  {
    title: "From the Frontlines to the Feed — My Story",
    platform: "instagram",
    date: "Mar 11, 2026",
    likes: 12_430,
    comments: 847,
    shares: 1_203,
  },
  {
    title: "Day in My Life: Veteran Entrepreneur Edition",
    platform: "tiktok",
    date: "Mar 8, 2026",
    likes: 38_920,
    comments: 2_104,
    shares: 5_612,
  },
  {
    title: "Why I Started MilCrunch — Full Breakdown",
    platform: "youtube",
    date: "Mar 3, 2026",
    likes: 4_210,
    comments: 631,
    shares: 892,
  },
];

const DEMO_EVENTS = [
  {
    name: "MilSpouseFest San Diego",
    date: "Apr 12, 2026",
    location: "San Diego Convention Center",
    role: "Featured Speaker",
  },
  {
    name: "Vet Creators Summit 2026",
    date: "May 3, 2026",
    location: "Fort Liberty, NC",
    role: "Panelist",
  },
];

const DEMO_WORTH = { tier: "Mid-Tier", minRate: 4_200, maxRate: 8_500 };

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getFirstName(displayName: string | null): string {
  if (!displayName) return "there";
  return displayName.trim().split(/\s+/)[0] || "there";
}

function platformIcon(platform: string, className: string = "h-3.5 w-3.5") {
  switch (platform) {
    case "instagram": return <Instagram className={className} />;
    case "tiktok": return <TikTokIcon className={className} />;
    case "youtube": return <Youtube className={className} />;
    default: return null;
  }
}

function platformColor(platform: string) {
  switch (platform) {
    case "instagram": return "bg-gradient-to-br from-purple-500 to-pink-500";
    case "tiktok": return "bg-black dark:bg-white/10";
    case "youtube": return "bg-red-600";
    default: return "bg-gray-500";
  }
}

export default function CreatorDashboard() {
  const { user, creatorProfile } = useAuth();
  const chatRef = useRef<CreatorAIChatRef>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<{ platform: string; platform_username: string | null; followers_count: number | null }[]>([]);
  const [pageViews, setPageViews] = useState(0);
  const [linkClicks, setLinkClicks] = useState(0);
  const [showWorth, setShowWorth] = useState(false);
  const [worthEstimate, setWorthEstimate] = useState({ tier: "", minRate: 0, maxRate: 0 });
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const h = (user.user_metadata?.handle as string) ?? null;
      setHandle(h);

      // Check if this is the demo user
      const email = user.email ?? "";
      const isDemoUser = email === "andrew@podlogix.co" || h === "johnny-rocket";

      if (isDemoUser) {
        setIsDemo(true);
        setAccounts(DEMO_ACCOUNTS);
        setPageViews(12_450);
        setLinkClicks(3_821);
        setWorthEstimate(DEMO_WORTH);
        setShowWorth(true);
        return;
      }

      if (!h) return;
      const { data: ev } = await supabase
        .from("pixel_events")
        .select("event_type, created_at")
        .eq("creator_handle", h)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      const events = (ev ?? []) as { event_type: string }[];
      setPageViews(events.filter((e) => e.event_type === "page_view").length);
      setLinkClicks(events.filter((e) => e.event_type === "link_click").length);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    // Skip fetching real accounts for the demo user — first effect already seeded DEMO_ACCOUNTS
    const email = user.email ?? "";
    const h = (user.user_metadata?.handle as string) ?? null;
    if (email === "andrew@podlogix.co" || h === "johnny-rocket") return;
    (async () => {
      const { data: csc } = await supabase
        .from("creator_social_connections")
        .select("*")
        .eq("user_id", user.id)
        .order("platform");
      if (csc && csc.length > 0) {
        setAccounts(
          csc.map((r: any) => ({
            platform: r.platform,
            platform_username: r.account_name ?? null,
            followers_count: null,
          }))
        );
        return;
      }
      const list = await getConnectedAccounts(user.id);
      setAccounts(
        list.map((a) => ({
          platform: a.platform,
          platform_username: a.platform_username ?? null,
          followers_count: a.followers_count ?? null,
        }))
      );
    })();
  }, [user?.id, isDemo]);

  const totalFollowers = accounts.reduce((s, a) => s + (a.followers_count ?? 0), 0);
  const engagementRate = isDemo ? 6.8 : 0;
  const displayName = isDemo ? "Johnny Rocket" : (creatorProfile?.display_name ?? user?.user_metadata?.full_name ?? "");
  const firstName = getFirstName(displayName);
  const bioUrl = handle ? `${typeof window !== "undefined" ? window.location.origin : ""}/c/${handle}` : "";

  const copyBioLink = () => {
    if (!bioUrl) {
      toast.error("Set your handle in Profile first.");
      return;
    }
    navigator.clipboard.writeText(bioUrl);
    toast.success("Bio link copied!");
  };

  const calculateWorth = () => {
    let minRate = 0, maxRate = 0, tier = "";
    const f = totalFollowers;
    if (f < 1000) { tier = "Starter"; minRate = 5; maxRate = 25; }
    else if (f < 10000) { tier = "Nano"; minRate = 10; maxRate = 100; }
    else if (f < 50000) { tier = "Micro"; minRate = 100; maxRate = 500; }
    else if (f < 500000) { tier = "Mid-Tier"; minRate = 500; maxRate = 5000; }
    else if (f < 1000000) { tier = "Macro"; minRate = 5000; maxRate = 10000; }
    else { tier = "Mega"; minRate = 10000; maxRate = 50000; }
    const platformMult = Math.min(1 + (accounts.length - 1) * 0.15, 2);
    setWorthEstimate({
      tier,
      minRate: Math.round(minRate * platformMult),
      maxRate: Math.round(maxRate * platformMult),
    });
    setShowWorth(true);
  };

  const fmtNum = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const timeLabel = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const AI_CHIPS = [
    { label: "\u270d\ufe0f Write a caption", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-l-blue-500", text: "text-blue-700 dark:text-blue-300" },
    { label: "\ud83c\udfaf Find brands to pitch", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-l-purple-500", text: "text-purple-700 dark:text-purple-300" },
    { label: "\ud83d\udcc5 Plan my content this week", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-l-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
    { label: "\ud83d\udcc8 Grow my following", bg: "bg-pink-50 dark:bg-pink-900/20", border: "border-l-pink-500", text: "text-pink-700 dark:text-pink-300" },
    { label: "\ud83d\udc8c Draft a sponsorship email", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-l-amber-500", text: "text-amber-700 dark:text-amber-300" },
    { label: "\ud83d\udd25 Analyze my best posts", bg: "bg-teal-50 dark:bg-teal-900/20", border: "border-l-teal-500", text: "text-teal-700 dark:text-teal-300" },
  ];

  /* Stat card config with trend data */
  const statCards = [
    {
      label: "Total Followers",
      value: fmtNum(totalFollowers),
      icon: Users,
      trend: isDemo ? "+12.4%" : null,
      trendUp: true,
      subtitle: isDemo ? `${accounts.length} platforms connected` : accounts.length > 0 ? `${accounts.length} connected` : "No accounts",
      gradient: "from-blue-600 to-indigo-700",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      label: "Engagement Rate",
      value: engagementRate > 0 ? `${engagementRate}%` : "—",
      icon: TrendingUp,
      trend: isDemo ? "+1.2%" : null,
      trendUp: true,
      subtitle: isDemo ? "Above avg for your tier" : "Connect accounts to track",
      gradient: "from-emerald-600 to-teal-700",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
    {
      label: "Bio Page Views",
      value: fmtNum(pageViews),
      icon: Eye,
      trend: isDemo ? "+23.1%" : null,
      trendUp: true,
      subtitle: "This month",
      gradient: "from-violet-600 to-purple-700",
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
    },
    {
      label: "Link Clicks",
      value: fmtNum(linkClicks),
      icon: MousePointer,
      trend: isDemo ? "+8.7%" : null,
      trendUp: true,
      subtitle: "This month",
      gradient: "from-amber-500 to-orange-600",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
    },
  ];

  const recentPosts = isDemo ? DEMO_POSTS : [];
  const upcomingEvents = isDemo ? DEMO_EVENTS : [];

  return (
    <CreatorLayout>
      <div className="w-full max-w-full overflow-x-hidden space-y-6">

        {/* ── 1. GREETING ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-full">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#1B3A6B] dark:text-white">
              {getGreeting()}, {firstName} {"\ud83d\udc4b"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{dateLabel} &middot; {timeLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" className="bg-[#1B3A6B] hover:bg-[#152d54] text-white">
              <Link to="/creator/post">
                <Send className="h-4 w-4 mr-2" />
                Create Post
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/creator/bio">
                <Link2 className="h-4 w-4 mr-2" />
                Edit Bio
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={copyBioLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Bio Link
            </Button>
          </div>
        </div>

        {/* ── 2. AI AGENT CHAT BAR (Hero) ── */}
        <div className="relative rounded-2xl overflow-hidden shadow-lg">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#000741] via-[#0B1A4D] to-[#122B6E]" />
          {/* Glow accent border */}
          <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#4A7BF7]/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#9B51E0]/10 rounded-full blur-3xl" />

          <div className="relative py-7 px-8">
            {/* Header row */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="relative flex items-center justify-center h-8 w-8">
                <div className="absolute inset-0 rounded-lg bg-[#4A7BF7]/20 animate-pulse" />
                <Sparkles className="relative h-5 w-5 text-[#7EB0FF] drop-shadow-[0_0_6px_rgba(126,176,255,0.6)]" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#7EB0FF]">AI Assistant</span>
            </div>

            {/* Input row */}
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-3 flex-1 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-5 py-3.5 cursor-pointer hover:bg-white/[0.14] transition-colors"
                onClick={() => chatRef.current?.open()}
              >
                <span className="text-[15px] font-medium text-white/80">What do you need help with today?</span>
              </div>
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#4A7BF7] to-[#6C5CE7] hover:from-[#5A88FF] hover:to-[#7D6DF0] text-white font-semibold h-12 px-7 shrink-0 shadow-lg shadow-[#4A7BF7]/25 rounded-xl"
                onClick={() => chatRef.current?.open()}
              >
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            {/* Chips */}
            <div className="mt-5 flex flex-wrap gap-2">
              {AI_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => chatRef.current?.openWithMessage(chip.label)}
                  className={`px-3.5 py-1.5 rounded-lg border-l-2 text-xs font-medium transition-all hover:scale-[1.03] hover:shadow-md ${chip.bg} ${chip.border} ${chip.text}`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 3. STATS ROW ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="rounded-xl bg-white dark:bg-card border border-gray-100 dark:border-border overflow-hidden relative group hover:shadow-md transition-shadow">
              {/* Top accent bar */}
              <div className={`h-1 w-full bg-gradient-to-r ${stat.gradient}`} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-[#1B3A6B] dark:text-white">{stat.value}</p>
                      {stat.trend && (
                        <span className={`inline-flex items-center text-xs font-semibold ${stat.trendUp ? "text-emerald-600" : "text-red-500"}`}>
                          <ArrowUpRight className={`h-3 w-3 mr-0.5 ${stat.trendUp ? "" : "rotate-90"}`} />
                          {stat.trend}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{stat.subtitle}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl ${stat.iconBg} flex items-center justify-center shrink-0`}>
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── 4. PLATFORM BREAKDOWN (demo only) ── */}
        {isDemo && (
          <Card className="rounded-xl bg-white dark:bg-card border border-gray-100 dark:border-border">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-4">Platform Breakdown</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {DEMO_ACCOUNTS.map((acc) => (
                  <div key={acc.platform} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                    <div className={`h-9 w-9 rounded-lg ${platformColor(acc.platform)} flex items-center justify-center text-white`}>
                      {platformIcon(acc.platform, "h-4 w-4")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1B3A6B] dark:text-white">{fmtNum(acc.followers_count!)}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">@{acc.platform_username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── 5. BOTTOM ROW ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Recent Posts */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Recent Posts
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                  <Link to="/creator/posts">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentPosts.length === 0 ? (
                <div className="text-center py-8">
                  <PenSquare className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No posts yet.</p>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/creator/post">Create a Post</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPosts.map((post, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <div className={`h-8 w-8 rounded-lg ${platformColor(post.platform)} flex items-center justify-center text-white shrink-0 mt-0.5`}>
                        {platformIcon(post.platform, "h-3.5 w-3.5")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#1B3A6B] dark:text-white leading-tight line-clamp-1">{post.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{post.date}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-0.5"><Heart className="h-3 w-3" />{fmtNum(post.likes)}</span>
                          <span className="inline-flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{fmtNum(post.comments)}</span>
                          <span className="inline-flex items-center gap-0.5"><Share2 className="h-3 w-3" />{fmtNum(post.shares)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Upcoming Events
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                  <Link to="/creator/events">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No upcoming events.</p>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/creator/events">Browse Events</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((ev, i) => (
                    <div key={i} className="p-3 rounded-lg border border-gray-100 dark:border-border hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1B3A6B] dark:text-white leading-tight">{ev.name}</p>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {ev.date}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {ev.location}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {ev.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Know Your Worth */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Know Your Worth
              </CardTitle>
              <CardDescription className="text-xs">Sponsored post value estimator</CardDescription>
            </CardHeader>
            <CardContent>
              {!showWorth ? (
                <div className="text-center py-4">
                  <DollarSign className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-xs text-muted-foreground mb-4">
                    What should brands pay you?
                  </p>
                  <Button size="sm" onClick={calculateWorth} disabled={accounts.length === 0} className="bg-[#1B3A6B] hover:bg-[#152d54] text-white">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Calculate
                  </Button>
                  {accounts.length === 0 && (
                    <p className="text-[11px] text-muted-foreground mt-2">Connect accounts first.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-center py-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Per Sponsored Post</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      ${worthEstimate.minRate.toLocaleString()} – ${worthEstimate.maxRate.toLocaleString()}
                    </p>
                    <Badge variant="secondary" className="mt-1.5 text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      {worthEstimate.tier} Creator
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex justify-between items-center p-1.5 rounded bg-gray-50 dark:bg-white/5">
                      <span>Story / Reel</span>
                      <span className="font-medium text-foreground">${Math.round(worthEstimate.minRate * 0.6).toLocaleString()} – ${Math.round(worthEstimate.maxRate * 0.6).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-1.5 rounded bg-gray-50 dark:bg-white/5">
                      <span>Feed Post</span>
                      <span className="font-medium text-foreground">${worthEstimate.minRate.toLocaleString()} – ${worthEstimate.maxRate.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-1.5 rounded bg-gray-50 dark:bg-white/5">
                      <span>Video / YouTube</span>
                      <span className="font-medium text-foreground">${Math.round(worthEstimate.minRate * 2).toLocaleString()} – ${Math.round(worthEstimate.maxRate * 2).toLocaleString()}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowWorth(false)}>
                    Recalculate
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <CreatorAIChat ref={chatRef} />
    </CreatorLayout>
  );
}
