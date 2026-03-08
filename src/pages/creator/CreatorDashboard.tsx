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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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

export default function CreatorDashboard() {
  const { user, creatorProfile } = useAuth();
  const chatRef = useRef<CreatorAIChatRef>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<{ platform: string; platform_username: string | null; followers_count: number | null }[]>([]);
  const [pageViews, setPageViews] = useState(0);
  const [linkClicks, setLinkClicks] = useState(0);
  const [showWorth, setShowWorth] = useState(false);
  const [worthEstimate, setWorthEstimate] = useState({ tier: "", minRate: 0, maxRate: 0 });

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const h = (user.user_metadata?.handle as string) ?? null;
      setHandle(h);
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
    (async () => {
      // Try creator_social_connections first (persisted on connect)
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
      // Fallback to connected_accounts table
      const list = await getConnectedAccounts(user.id);
      setAccounts(
        list.map((a) => ({
          platform: a.platform,
          platform_username: a.platform_username ?? null,
          followers_count: a.followers_count ?? null,
        }))
      );
    })();
  }, [user?.id]);

  const totalFollowers = accounts.reduce((s, a) => s + (a.followers_count ?? 0), 0);
  const displayName = creatorProfile?.display_name ?? user?.user_metadata?.full_name ?? "";
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

  const fmtFollowers = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const timeLabel = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const AI_CHIPS = [
    ["Write a caption for my next post", "Find brands to pitch", "Plan my content this week"],
    ["Grow my Instagram following", "Draft a sponsorship email", "Analyze my best posts"],
  ];

  return (
    <CreatorLayout>
      <div className="w-full max-w-full overflow-x-hidden space-y-6">

        {/* ── 1. GREETING ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-full">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#1B3A6B] dark:text-white">
              {getGreeting()}, {firstName}
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

        {/* ── 2. AI AGENT CHAT BAR ── */}
        <Card className="rounded-2xl bg-white dark:bg-card border border-gray-200 dark:border-border shadow-sm" style={{ borderBottom: "2px solid #1B3A6B" }}>
          <CardContent className="py-6 px-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 flex-1 rounded-xl bg-[#F3F4F6] dark:bg-white/5 px-4 py-3 cursor-pointer" onClick={() => chatRef.current?.open()}>
                <Sparkles className="h-5 w-5 text-[#1B3A6B] shrink-0" />
                <span className="text-sm text-[#6B7280]">What do you need help with today?</span>
              </div>
              <Button size="sm" className="bg-[#1B3A6B] hover:bg-[#152d54] text-white h-11 px-5 shrink-0" onClick={() => chatRef.current?.open()}>
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {AI_CHIPS.map((row, ri) => (
                <div key={ri} className="flex flex-wrap gap-2">
                  {row.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => chatRef.current?.openWithMessage(chip)}
                      className="px-3 py-1.5 rounded-full bg-[#F3F4F6] dark:bg-white/10 text-xs text-[#374151] dark:text-gray-300 hover:bg-[#E5E7EB] dark:hover:bg-white/20 transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── 3. STATS ROW ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Followers", value: totalFollowers >= 1000 ? `${(totalFollowers / 1000).toFixed(1)}K` : String(totalFollowers), icon: Users },
            { label: "Engagement Rate", value: "—", icon: TrendingUp },
            { label: "Bio Page Views", value: String(pageViews), icon: Eye },
            { label: "Link Clicks", value: String(linkClicks), icon: MousePointer },
          ].map((stat) => (
            <Card key={stat.label} className="rounded-xl bg-white dark:bg-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold text-[#1B3A6B] dark:text-white mt-1">{stat.value}</p>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-[#1B3A6B]/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <stat.icon className="h-4 w-4 text-[#1B3A6B]/60 dark:text-white/40" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── 4. BOTTOM ROW ── */}
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
              <div className="text-center py-8">
                <PenSquare className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No posts yet.</p>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/creator/post">Create a Post</Link>
                </Button>
              </div>
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
              <div className="text-center py-8">
                <MapPin className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No upcoming events.</p>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/creator/events">Browse Events</Link>
                </Button>
              </div>
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
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Per Sponsored Post</p>
                    <p className="text-2xl font-bold text-[#1B3A6B] dark:text-white">${worthEstimate.minRate.toLocaleString()} – ${worthEstimate.maxRate.toLocaleString()}</p>
                    <Badge variant="secondary" className="mt-1.5 text-[10px]">{worthEstimate.tier} Creator</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>Story / Reel</span><span className="font-medium text-foreground">${Math.round(worthEstimate.minRate * 0.6).toLocaleString()} – ${Math.round(worthEstimate.maxRate * 0.6).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Feed Post</span><span className="font-medium text-foreground">${worthEstimate.minRate.toLocaleString()} – ${worthEstimate.maxRate.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Video / YouTube</span><span className="font-medium text-foreground">${Math.round(worthEstimate.minRate * 2).toLocaleString()} – ${Math.round(worthEstimate.maxRate * 2).toLocaleString()}</span></div>
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
