import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getConnectedAccounts } from "@/lib/upload-post-sync";
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
  Instagram,
  Youtube,
  Facebook,
  Linkedin,
  Twitter,
  ExternalLink,
  Send,
  Plus,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

/* ── Platform SVG icons (brand) ── */
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.16 8.16 0 004.76 1.52V7.12a4.84 4.84 0 01-1-.43z" />
  </svg>
);
const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.186 24h-.007C5.965 24 2.615 20.272 2.615 14.71v-.586C2.615 8.478 6.236 4.635 12.051 4.635c5.587 0 8.964 3.525 8.964 8.527v.31c0 3.63-1.96 5.895-5.058 5.895-1.576 0-2.769-.658-3.308-1.85-.596 1.14-1.683 1.75-3.133 1.75-2.35 0-3.886-1.81-3.886-4.576 0-2.893 1.624-4.784 4.136-4.784 1.22 0 2.17.518 2.724 1.38l.07-.008V9.68h2.39v5.98c0 1.41.58 2.23 1.652 2.23 1.384 0 2.163-1.29 2.163-3.59v-.31c0-3.78-2.4-6.367-6.614-6.367-4.504 0-7.186 2.883-7.186 7.504v.586c0 4.38 2.387 7.127 6.688 7.127h.007c1.476 0 2.81-.302 3.963-.899l.867 1.877C14.923 23.65 13.595 24 12.186 24zM12.217 12c-1.427 0-2.256 1.066-2.256 2.689 0 1.62.76 2.614 2.073 2.614 1.336 0 2.132-1.048 2.132-2.674 0-1.585-.787-2.63-1.949-2.63z" />
  </svg>
);
const PinterestIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);
const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.066 13.39c.042.266.064.537.064.814 0 2.893-3.283 5.242-7.33 5.242-4.046 0-7.328-2.349-7.328-5.242 0-.277.022-.548.064-.814a1.606 1.606 0 01-.634-1.282 1.62 1.62 0 012.786-1.126c1.268-.868 2.98-1.42 4.895-1.47l.975-4.588a.36.36 0 01.432-.278l3.256.694a1.15 1.15 0 012.147.547 1.15 1.15 0 01-2.146.547l-2.836-.605-.868 4.082c1.876.065 3.548.618 4.79 1.472a1.615 1.615 0 012.783 1.126c0 .51-.236.965-.604 1.262zm-9.068 1.186a1.15 1.15 0 100-2.3 1.15 1.15 0 000 2.3zm5.282 2.044c-1.16 1.16-3.386 1.25-4.28 1.25s-3.12-.1-4.28-1.25a.386.386 0 01.546-.546c.73.73 2.29.99 3.734.99 1.444 0 3.004-.26 3.734-.99a.386.386 0 01.546.546zM14.85 14.576a1.15 1.15 0 100-2.3 1.15 1.15 0 000 2.3z" />
  </svg>
);
const BlueskyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C8.418 5.097 5.115 8.475 4.24 11.414c-.947 3.183.28 5.23 2.478 5.583-1.174.458-2.555 1.252-2.345 3.156.255 2.308 2.228 2.078 5.11 1.488.96-.196 1.632-.388 2.517-.388.885 0 1.557.192 2.517.388 2.882.59 4.855.82 5.11-1.488.21-1.904-1.171-2.698-2.345-3.156 2.198-.352 3.425-2.4 2.478-5.583C18.885 8.475 15.582 5.097 12 2z" />
  </svg>
);
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

/* ── Platform icon & color helpers ── */
const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  tiktok: TikTokIcon, instagram: Instagram, youtube: Youtube,
  facebook: Facebook, linkedin: Linkedin, x: Twitter, twitter: Twitter,
  threads: ThreadsIcon, pinterest: PinterestIcon, reddit: RedditIcon,
  bluesky: BlueskyIcon, google_business: GoogleIcon,
};
const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "text-gray-900", instagram: "text-pink-500", youtube: "text-red-600",
  facebook: "text-blue-600", linkedin: "text-blue-700", x: "text-gray-900",
  twitter: "text-gray-900", threads: "text-gray-900", pinterest: "text-red-600",
  reddit: "text-orange-500", bluesky: "text-blue-500", google_business: "text-blue-500",
};
const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube",
  facebook: "Facebook", linkedin: "LinkedIn", x: "X (Twitter)",
  twitter: "X (Twitter)", threads: "Threads", pinterest: "Pinterest",
  reddit: "Reddit", bluesky: "Bluesky", google_business: "Google Business",
};

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
                  const PIcon = PLATFORM_ICONS[a.platform] ?? Share2;
                  const color = PLATFORM_COLORS[a.platform] ?? "text-muted-foreground";
                  const label = PLATFORM_LABELS[a.platform] ?? a.platform;
                  return (
                    <div
                      key={a.platform}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border"
                    >
                      <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center shrink-0">
                        <PIcon className={`h-[18px] w-[18px] ${color}`} />
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
