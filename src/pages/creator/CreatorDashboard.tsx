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
  ExternalLink,
  Send,
} from "lucide-react";
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

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: profile } = await supabase
        .from("creator_profiles")
        .select("handle")
        .eq("user_id", user.id)
        .maybeSingle();
      const h = (profile as { handle?: string } | null)?.handle ?? null;
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
    getConnectedAccounts(user.id).then((list) => {
      setAccounts(
        list.map((a) => ({
          platform: a.platform,
          platform_username: a.platform_username ?? null,
          followers_count: a.followers_count ?? null,
        }))
      );
    });
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

        {/* Platform breakdown */}
        <Card className="rounded-xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Platform breakdown</CardTitle>
            <CardDescription>Connected accounts and follower counts</CardDescription>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Connect your socials in{" "}
                <Link to="/creator/socials" className="text-primary hover:underline">My Socials</Link>
                {" "}to see stats here.
              </p>
            ) : (
              <div className="space-y-3">
                {accounts.map((a) => (
                  <div
                    key={a.platform}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                        <Instagram className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">{a.platform}</p>
                        <p className="text-sm text-muted-foreground">{a.platform_username ? `@${a.platform_username}` : "—"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{a.followers_count != null ? (a.followers_count >= 1000 ? `${(a.followers_count / 1000).toFixed(1)}K` : a.followers_count) : "—"}</p>
                      <p className="text-xs text-muted-foreground">followers</p>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" asChild>
                  <Link to="/creator/socials">Connect more</Link>
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
