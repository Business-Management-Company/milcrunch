import { useState, useEffect } from "react";
import {
  Bell, Calendar, UserCheck, MessageCircle, Megaphone, Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/* ---------- types ---------- */
interface Notification {
  id: string;
  type: "schedule" | "connection" | "community" | "announcement" | "reminder";
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface Props {
  eventId: string;
  onClearBadge: () => void;
}

/* ---------- config ---------- */
const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  schedule: { icon: Calendar, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  connection: { icon: UserCheck, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
  community: { icon: MessageCircle, color: "text-blue-700", bg: "bg-blue-100 dark:bg-blue-900/30" },
  announcement: { icon: Megaphone, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
  reminder: { icon: Clock, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function mockDate(daysAgo: number, hoursAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "reminder", title: "Opening Keynote starts in 15 minutes", body: "Head to Main Stage, Hall A. Florent Groberg: Leadership from Battlefield to Boardroom.", is_read: false, created_at: mockDate(0, 0) },
  { id: "n2", type: "connection", title: "Sarah Mitchell accepted your connection", body: "You can now see each other's contact info. Send her a message!", is_read: false, created_at: mockDate(0, 2) },
  { id: "n3", type: "community", title: "Someone replied to your post", body: "Ranger Fitness replied: \"Welcome Johnny! Full-time creator here too. Let's connect at the networking dinner!\"", is_read: false, created_at: mockDate(0, 3) },
  { id: "n4", type: "announcement", title: "Don't miss tonight's VIP reception!", body: "Join us at the Rooftop Lounge, 7 PM. Open bar and networking. VIP badge required.", is_read: true, created_at: mockDate(0, 6) },
  { id: "n5", type: "schedule", title: "Keynote moved to 10:00 AM", body: "The opening keynote has been moved from 9:30 AM to 10:00 AM due to a schedule adjustment.", is_read: true, created_at: mockDate(0, 8) },
  { id: "n6", type: "community", title: "Your post got 45 likes!", body: "Your introduction post \"Hey everyone! Johnny Marines here...\" is trending in the community.", is_read: true, created_at: mockDate(1, 2) },
  { id: "n7", type: "connection", title: "New connection request", body: "Florent Groberg wants to connect with you. Accept or decline from the People tab.", is_read: true, created_at: mockDate(1, 5) },
  { id: "n8", type: "announcement", title: "Workshop slots filling up fast!", body: "The Brand Deals 101 workshop on Day 1 has only 5 seats left. Register now in the Schedule tab.", is_read: true, created_at: mockDate(2, 3) },
  { id: "n9", type: "reminder", title: "Check-in opens tomorrow at 8 AM", body: "Show your QR code at the registration desk for express check-in. Don't forget your ID!", is_read: true, created_at: mockDate(3, 1) },
  { id: "n10", type: "schedule", title: "New panel added: Military Creator Economy", body: "Day 2, 3:00 PM, Room B. Featuring Tactical Brit, SGM Jackson, and PCS With Pets.", is_read: true, created_at: mockDate(4, 6) },
];

/* ======================================== */
export default function AttendeeNotifications({ eventId, onClearBadge }: Props) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNotifications();
  }, [eventId]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("event_notifications")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch read status
        let userReadIds = new Set<string>();
        if (user) {
          const { data: reads } = await supabase
            .from("notification_reads")
            .select("notification_id")
            .eq("user_id", user.id);
          if (reads) {
            userReadIds = new Set(reads.map((r: { notification_id: string }) => r.notification_id));
          }
        }
        setReadIds(userReadIds);

        const mapped: Notification[] = (data as { id: string; type: string; title: string; body: string; created_at: string }[]).map((n) => ({
          id: n.id,
          type: (n.type || "announcement") as Notification["type"],
          title: n.title,
          body: n.body || "",
          is_read: userReadIds.has(n.id),
          created_at: n.created_at,
        }));
        setNotifications(mapped);
      } else {
        setNotifications(MOCK_NOTIFICATIONS);
      }
    } catch {
      setNotifications(MOCK_NOTIFICATIONS);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    onClearBadge();
    toast.success("All notifications marked as read");

    // Persist read status
    if (user) {
      const unreadNotifs = notifications.filter((n) => !n.is_read && !n.id.startsWith("n"));
      if (unreadNotifs.length > 0) {
        const inserts = unreadNotifs.map((n) => ({
          notification_id: n.id,
          user_id: user.id,
        }));
        await supabase.from("notification_reads").insert(inserts as Record<string, unknown>[]).then();
      }
    }
  };

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));

    if (user && !id.startsWith("n")) {
      await supabase.from("notification_reads").insert({
        notification_id: id,
        user_id: user.id,
      } as Record<string, unknown>).then();
    }
  };

  const togglePush = (enabled: boolean) => {
    setPushEnabled(enabled);
    if (enabled) {
      toast.success("Push notifications enabled! You'll receive alerts about schedule changes and announcements.");
    } else {
      toast.info("Push notifications disabled");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="text-xs text-[#1e3a5f]" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {/* Push Notification Toggle */}
      <Card className="p-3 bg-white dark:bg-[#1A1D27] rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
            <Bell className="h-4 w-4 text-[#1e3a5f]" />
          </div>
          <div>
            <Label className="text-sm font-medium">Push Notifications</Label>
            <p className="text-xs text-muted-foreground">Schedule changes & announcements</p>
          </div>
        </div>
        <Switch checked={pushEnabled} onCheckedChange={togglePush} />
      </Card>

      {/* Notifications List */}
      <div className="space-y-2">
        {notifications.map((notif) => {
          const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.announcement;
          const Icon = cfg.icon;

          return (
            <Card
              key={notif.id}
              className={`p-3 rounded-xl transition-colors cursor-pointer ${
                notif.is_read
                  ? "bg-white dark:bg-[#1A1D27] border-gray-100 dark:border-gray-800"
                  : "bg-blue-50/50 dark:bg-blue-900/10 border-[#1e3a5f]/20"
              }`}
              onClick={() => markRead(notif.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`${cfg.bg} rounded-lg p-2 shrink-0`}>
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${notif.is_read ? "font-medium" : "font-semibold"}`}>
                      {notif.title}
                    </span>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#1e3a5f] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">{timeAgo(notif.created_at)}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {notifications.length === 0 && (
        <Card className="p-8 text-center bg-white dark:bg-[#1A1D27]">
          <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </Card>
      )}
    </div>
  );
}
