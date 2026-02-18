import { useState, useEffect, createContext, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar, Mic, Building2, User, Info, Bell, Loader2, AlertCircle, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import AttendeeNotifications from "@/pages/attendee/AttendeeNotifications";

/* ---------- types ---------- */
export interface AttendeeEvent {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  timezone: string | null;
  cover_image_url: string | null;
  capacity: number | null;
  is_published: boolean | null;
}

interface AttendeeContextType {
  event: AttendeeEvent;
  eventSlug: string;
  isRegistered: boolean;
  registrationId: string | null;
  refreshRegistration: () => Promise<void>;
}

const AttendeeContext = createContext<AttendeeContextType | null>(null);
export const useAttendeeEvent = () => {
  const ctx = useContext(AttendeeContext);
  if (!ctx) throw new Error("useAttendeeEvent must be used inside AttendeeLayout");
  return ctx;
};

/* ---------- tabs ---------- */
type TabId = "schedule" | "speakers" | "sponsors" | "info" | "profile";

const TABS: { id: TabId; label: string; icon: typeof Calendar }[] = [
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "speakers", label: "Speakers", icon: Mic },
  { id: "sponsors", label: "Sponsors", icon: Building2 },
  { id: "info", label: "Info", icon: Info },
  { id: "profile", label: "My Profile", icon: User },
];

interface Props {
  activeTab: TabId;
  children: React.ReactNode;
}

/* ======================================== */
const AttendeeLayout = ({ activeTab, children }: Props) => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<AttendeeEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  /* notifications */
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  useEffect(() => {
    if (eventSlug) fetchEvent();
  }, [eventSlug]);

  const fetchEvent = async () => {
    try {
      let query = supabase
        .from("events")
        .select("id, title, slug, description, start_date, end_date, venue, city, state, timezone, cover_image_url, capacity, is_published");

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventSlug!);
      if (isUUID) {
        query = query.eq("id", eventSlug!);
      } else {
        query = query.eq("slug", eventSlug!);
      }

      const { data, error: err } = await query.single();
      if (err || !data) {
        setError(true);
        return;
      }
      setEvent(data as unknown as AttendeeEvent);

      if (user) {
        await checkRegistration(data.id);
      }

      fetchUnreadCount(data.id);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const checkRegistration = async (eventId: string) => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("event_registrations")
        .select("id")
        .eq("event_id", eventId)
        .eq("email", user.email!)
        .eq("status", "confirmed")
        .maybeSingle();
      if (data) {
        setIsRegistered(true);
        setRegistrationId(data.id);
      }
    } catch {
      // Silent
    }
  };

  const fetchUnreadCount = async (eventId: string) => {
    try {
      const { count } = await supabase
        .from("event_notifications")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId);
      if (count !== null && count > 0) {
        if (user) {
          const { count: readCount } = await supabase
            .from("notification_reads")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);
          setUnreadCount(Math.max(0, (count || 0) - (readCount || 0)));
        } else {
          setUnreadCount(count || 0);
        }
      }
    } catch {
      // Tables may not exist yet -- keep mock default
    }
  };

  /* Realtime for new notifications */
  useEffect(() => {
    if (!event) return;
    const channel = supabase
      .channel(`notif-${event.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "event_notifications",
        filter: `event_id=eq.${event.id}`,
      }, () => {
        setUnreadCount((prev) => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [event?.id]);

  const refreshRegistration = async () => {
    if (event) await checkRegistration(event.id);
  };

  const handleTabClick = (tabId: TabId) => {
    const base = `/attend/${eventSlug}`;
    if (tabId === "schedule") navigate(base);
    else navigate(`${base}/${tabId}`);
  };

  /* ---- loading ---- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
      </div>
    );
  }

  /* ---- not found ---- */
  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
          <p className="text-gray-500 mb-6">The event you're looking for doesn't exist or has been removed.</p>
          <Button asChild className="bg-[#6C5CE7] hover:bg-[#5B4BD5] text-white">
            <Link to="/events">Browse Events</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AttendeeContext.Provider value={{ event, eventSlug: eventSlug!, isRegistered, registrationId, refreshRegistration }}>
      {/* Phone-frame wrapper for desktop */}
      <div className="min-h-screen bg-gray-200 flex justify-center">
        <div className="w-full max-w-[430px] min-h-screen bg-gray-50 flex flex-col shadow-2xl relative">
          {/* ---- Top Header (dark navy) ---- */}
          <header className="sticky top-0 z-50 bg-[#0A0F1E] h-14 flex items-center px-4 gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-white text-sm truncate">{event.title}</h1>
              <p className="text-xs text-gray-400 truncate">
                {event.venue && `${event.venue}`}
                {event.city && ` \u00B7 ${event.city}`}
                {event.state && `, ${event.state}`}
              </p>
            </div>
            <button
              className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
              onClick={() => setNotifOpen(!notifOpen)}
            >
              <Bell className={cn("h-5 w-5", notifOpen ? "text-[#6C5CE7]" : "text-gray-300")} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <span className="text-xs font-bold text-white tracking-tight shrink-0">
              recurrent<span className="text-[#6C5CE7] font-extrabold">X</span>
            </span>
          </header>

          {/* ---- Notification Panel ---- */}
          {notifOpen && (
            <div className="absolute top-14 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-lg max-h-[70vh] overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-base">Notifications</h2>
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
                <AttendeeNotifications
                  eventId={event.id}
                  onClearBadge={() => setUnreadCount(0)}
                />
              </div>
            </div>
          )}

          {/* ---- Content ---- */}
          <main className="flex-1 overflow-y-auto pb-20">
            <div className="w-full">
              {children}
            </div>
          </main>

          {/* ---- Bottom Tab Bar ---- */}
          <nav className="sticky bottom-0 z-50 bg-white border-t border-gray-200 h-16 flex items-center justify-around px-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors"
                >
                  <tab.icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-[#6C5CE7]" : "text-gray-400"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-medium transition-colors",
                      isActive ? "text-[#6C5CE7]" : "text-gray-400"
                    )}
                  >
                    {tab.label}
                  </span>
                  {isActive && (
                    <div className="w-1 h-1 rounded-full bg-[#6C5CE7] mt-0.5" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </AttendeeContext.Provider>
  );
};

export default AttendeeLayout;
