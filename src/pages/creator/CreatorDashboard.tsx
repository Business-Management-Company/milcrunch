import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getConnectedAccounts, syncConnectedAccountsFromUploadPost } from "@/lib/upload-post-sync";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3,
  PenSquare,
  Link2,
  Copy,
  Bell,
  TrendingUp,
  MousePointer,
  Eye,
  ExternalLink,
  Send,
  Plus,
  Share2,
  Check,
  Circle,
  RefreshCw,
  DollarSign,
  Sparkles,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PlatformIcon, PLATFORM_NAMES } from "@/lib/platform-icons";
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
  const [handle, setHandle] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<{ platform: string; platform_username: string | null; followers_count: number | null }[]>([]);
  const [pageViews, setPageViews] = useState(0);
  const [linkClicks, setLinkClicks] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; type: string; title: string; message: string | null; link: string | null; is_read: boolean; created_at: string }[]>([]);
  const navigate = useNavigate();
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
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

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("creator_notifications")
      .select("id, type, title, message, link, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setNotifications((data ?? []) as typeof notifications));
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

  const handleSync = async (platform: string, type: string) => {
    if (!user?.id) return;
    setSyncing(true);
    try {
      await syncConnectedAccountsFromUploadPost(user.id);
      const list = await getConnectedAccounts(user.id);
      if (list.length > 0) {
        setAccounts(list.map((a) => ({
          platform: a.platform,
          platform_username: a.platform_username ?? null,
          followers_count: a.followers_count ?? null,
        })));
      }
      const label = PLATFORM_NAMES[platform] ?? platform;
      const action = type === "full" ? "Full sync" : type === "posts" ? "Posts sync" : "Insights sync";
      toast.success(`${label}: ${action} complete`);
    } catch {
      toast.error("Sync failed. Try again.");
    } finally {
      setSyncing(false);
    }
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

  return (
    <CreatorLayout>
      <div className="space-y-8">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-headline font-bold text-foreground">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-muted-foreground mt-0.5">Here&apos;s what&apos;s happening with your creator presence.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm">
              <Link to="/creator/post/new">
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
            <Button variant="ghost" size="icon" aria-label="Notifications" asChild>
              <Link to="/creator/settings">
                <Bell className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-xl border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Followers</p>
              <p className="text-2xl font-bold mt-1">{totalFollowers >= 1000 ? `${(totalFollowers / 1000).toFixed(1)}K` : totalFollowers}</p>
              <p className="text-xs text-muted-foreground mt-1">Across connected platforms</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Engagement Rate</p>
              <p className="text-2xl font-bold mt-1">—</p>
              <p className="text-xs text-muted-foreground mt-1">From connected accounts</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                Bio Page Views
              </p>
              <p className="text-2xl font-bold mt-1">{pageViews}</p>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MousePointer className="h-3.5 w-3.5" />
                Link Clicks
              </p>
              <p className="text-2xl font-bold mt-1">{linkClicks}</p>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* My Social Channels */}
        <Card className="rounded-xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">My Social Channels</CardTitle>
            <CardDescription>Connected social media accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-6">
                <Share2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground mb-3">Connect your social accounts to track your audience.</p>
                <Button size="sm" asChild>
                  <Link to="/creator/socials">Connect Accounts</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {accounts.map((a) => {
                  const label = PLATFORM_NAMES[a.platform] ?? a.platform;
                  return (
                    <div
                      key={a.platform}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border"
                    >
                      <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center shrink-0">
                        <PlatformIcon platform={a.platform} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.platform_username ? `@${a.platform_username}` : "—"}
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full shrink-0">
                        Connected
                      </span>
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" className="w-full mt-1" asChild>
                  <Link to="/creator/socials">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Connect More
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Social Media Setup + Know Your Worth */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Social Media Setup */}
          <Card className="rounded-xl border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Social Media Setup
              </CardTitle>
              <CardDescription>Platform integration status &amp; sync</CardDescription>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <div className="text-center py-6">
                  <Share2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Connect accounts to see setup status.</p>
                  <Button size="sm" asChild>
                    <Link to="/creator/socials">Connect Accounts</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {accounts.map((acc) => {
                    const isExpanded = expandedPlatform === acc.platform;
                    const label = PLATFORM_NAMES[acc.platform] ?? acc.platform;
                    const checks = [
                      { label: "Account Connected", done: true },
                      { label: "Profile Synced", done: !!acc.platform_username },
                      { label: "Posts & Engagement Imported", done: false },
                      { label: "Insights Available", done: false },
                      { label: "Audience Data Available", done: (acc.followers_count ?? 0) > 0 },
                      { label: "Daily Auto-Sync Enabled", done: true },
                    ];
                    const completed = checks.filter((c) => c.done).length;
                    return (
                      <div key={acc.platform} className="rounded-xl border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedPlatform(isExpanded ? null : acc.platform)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center shrink-0">
                            <PlatformIcon platform={acc.platform} size={18} />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-medium text-sm">{label}</p>
                            <p className="text-xs text-muted-foreground">{completed}/{checks.length} steps complete</p>
                          </div>
                          <span className={cn(
                            "text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0",
                            completed === checks.length
                              ? "text-green-600 bg-green-50 dark:bg-green-950/30"
                              : "text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                          )}>
                            {completed === checks.length ? "Complete" : `${completed}/${checks.length}`}
                          </span>
                          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-180")} />
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border bg-muted/30 p-3 space-y-2">
                            {checks.map((item) => (
                              <div key={item.label} className="flex items-center gap-2.5 text-sm">
                                {item.done ? (
                                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                                )}
                                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                              </div>
                            ))}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-border mt-3">
                              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => navigate("/creator/socials")}>
                                Reconnect
                              </Button>
                              <Button variant="outline" size="sm" className="text-xs h-7" disabled={syncing} onClick={() => handleSync(acc.platform, "posts")}>
                                {syncing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                Sync Posts
                              </Button>
                              <Button variant="outline" size="sm" className="text-xs h-7" disabled={syncing} onClick={() => handleSync(acc.platform, "insights")}>
                                Sync Insights
                              </Button>
                              <Button variant="outline" size="sm" className="text-xs h-7" disabled={syncing} onClick={() => handleSync(acc.platform, "full")}>
                                <RefreshCw className={cn("h-3 w-3 mr-1", syncing && "animate-spin")} />
                                Run Sync
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Know Your Worth */}
          <Card className="rounded-xl border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Know Your Worth
              </CardTitle>
              <CardDescription>Estimate your sponsored post value</CardDescription>
            </CardHeader>
            <CardContent>
              {!showWorth ? (
                <div className="text-center py-6">
                  <DollarSign className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Find out what brands should pay for a sponsored post based on your audience size and reach.
                  </p>
                  <Button onClick={calculateWorth} disabled={accounts.length === 0}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Calculate My Value
                  </Button>
                  {accounts.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-3">Connect social accounts first.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-2">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Estimated Rate Per Sponsored Post</p>
                    <p className="text-3xl font-bold text-foreground">${worthEstimate.minRate.toLocaleString()} – ${worthEstimate.maxRate.toLocaleString()}</p>
                    <Badge variant="secondary" className="mt-2">{worthEstimate.tier} Creator</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total Followers</p>
                      <p className="font-bold text-sm">{fmtFollowers(totalFollowers)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Platforms</p>
                      <p className="font-bold text-sm">{accounts.length}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>Story / Reel</span><span className="font-medium text-foreground">${Math.round(worthEstimate.minRate * 0.6).toLocaleString()} – ${Math.round(worthEstimate.maxRate * 0.6).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Feed Post</span><span className="font-medium text-foreground">${worthEstimate.minRate.toLocaleString()} – ${worthEstimate.maxRate.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Video / YouTube</span><span className="font-medium text-foreground">${Math.round(worthEstimate.minRate * 2).toLocaleString()} – ${Math.round(worthEstimate.maxRate * 2).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Brand Partnership (Monthly)</span><span className="font-medium text-foreground">${Math.round(worthEstimate.maxRate * 4).toLocaleString()}+</span></div>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Based on industry benchmarks. Actual rates vary by niche, content quality, and audience demographics.
                  </p>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setShowWorth(false)}>
                    Recalculate
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent activity */}
          <Card className="rounded-xl border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent activity</CardTitle>
              <CardDescription>Outreach, event invites, milestones</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6">No recent activity.</p>
              ) : (
                <ul className="space-y-3">
                  {notifications.slice(0, 5).map((n) => (
                    <li key={n.id} className="flex items-start gap-3 text-sm">
                      <span className="text-muted-foreground shrink-0">•</span>
                      <div>
                        <p className="font-medium">{n.title}</p>
                        {n.message && <p className="text-muted-foreground">{n.message}</p>}
                      </div>
                      {n.link && (
                        <Link to={n.link} className="text-primary hover:underline shrink-0">View</Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Bio page mini analytics */}
          <Card className="rounded-xl border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Bio page</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 py-4">
                <div>
                  <p className="text-2xl font-bold">{pageViews}</p>
                  <p className="text-xs text-muted-foreground">Views (30d)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{linkClicks}</p>
                  <p className="text-xs text-muted-foreground">Link clicks (30d)</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/creator/analytics">
                  View full analytics
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Content performance */}
        <Card className="rounded-xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Content performance
            </CardTitle>
            <CardDescription>Recent posts from connected platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground py-6">
              Posts from Upload-Post will appear here.{" "}
              <Link to="/creator/post/new" className="text-primary hover:underline">Create a post</Link> to get started.
            </p>
            <Button asChild>
              <Link to="/creator/post/new">
                <PenSquare className="h-4 w-4 mr-2" />
                Create new post
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </CreatorLayout>
  );
}
