import { useState, useEffect } from "react";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Eye, MousePointer, Clock, Loader2 } from "lucide-react";

interface EventRow {
  id: string;
  event_type: string;
  visitor_id: string;
  referral_source: string | null;
  utm_source: string | null;
  link_label: string | null;
  time_on_page_seconds: number | null;
  scroll_depth_percent: number | null;
  created_at: string;
}

export default function CreatorAnalytics() {
  const { user } = useAuth();
  const [handle, setHandle] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      const h = (user.user_metadata?.handle as string) ?? null;
      setHandle(h);
      if (!h) {
        setLoading(false);
        return;
      }
      const { data: ev } = await supabase
        .from("pixel_events")
        .select("id, event_type, visitor_id, referral_source, utm_source, link_label, time_on_page_seconds, scroll_depth_percent, created_at")
        .eq("creator_handle", h)
        .order("created_at", { ascending: false })
        .limit(200);
      setEvents((ev ?? []) as EventRow[]);
    })().finally(() => setLoading(false));
  }, [user?.id]);

  const pageViews = events.filter((e) => e.event_type === "page_view").length;
  const linkClicks = events.filter((e) => e.event_type === "link_click").length;
  const uniqueVisitors = new Set(events.map((e) => e.visitor_id)).size;
  const exitEvents = events.filter((e) => e.event_type === "page_exit");
  const avgTime = exitEvents.length
    ? Math.round(
        exitEvents.reduce((s, e) => s + (e.time_on_page_seconds ?? 0), 0) / exitEvents.length
      )
    : 0;

  const bySource: Record<string, number> = {};
  events.filter((e) => e.event_type === "page_view").forEach((e) => {
    const src = e.utm_source || e.referral_source || "direct";
    bySource[src] = (bySource[src] ?? 0) + 1;
  });

  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">
          Bio page analytics
        </h1>
        <p className="text-muted-foreground">
          Traffic and engagement for your creator bio page. Set your handle in Profile to see data.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : !handle ? (
        <Card className="p-6">
          <p className="text-muted-foreground">
            Add a public handle in your Profile to get a bio page (e.g. /c/yourhandle). Analytics will appear here.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Eye className="h-4 w-4" />
                <span className="text-sm">Page views</span>
              </div>
              <p className="text-2xl font-bold">{pageViews}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">Unique visitors</span>
              </div>
              <p className="text-2xl font-bold">{uniqueVisitors}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MousePointer className="h-4 w-4" />
                <span className="text-sm">Link clicks</span>
              </div>
              <p className="text-2xl font-bold">{linkClicks}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Avg. time on page</span>
              </div>
              <p className="text-2xl font-bold">{avgTime}s</p>
            </Card>
          </div>

          <Card className="p-6 mb-6">
            <h2 className="font-semibold text-foreground mb-3">Traffic sources</h2>
            <div className="space-y-2">
              {Object.entries(bySource)
                .sort((a, b) => b[1] - a[1])
                .map(([src, count]) => (
                  <div key={src} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{src}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              {Object.keys(bySource).length === 0 && (
                <p className="text-sm text-muted-foreground">No page views yet.</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-3">Recent activity</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.slice(0, 50).map((e) => (
                <div key={e.id} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">
                    {e.event_type}
                    {e.link_label ? ` · ${e.link_label}` : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
              {events.length === 0 && (
                <p className="text-sm text-muted-foreground">No events yet. Share your link: /c/{handle}</p>
              )}
            </div>
          </Card>
        </>
      )}
    </CreatorLayout>
  );
}
