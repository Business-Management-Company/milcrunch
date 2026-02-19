import { useState, useEffect, createContext, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home, CalendarDays, Users, User, ArrowLeft,
  Bell, Loader2, AlertCircle, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import AttendeeNotifications from "@/pages/attendee/AttendeeNotifications";
import InstallBanner from "@/components/attendee/InstallBanner";

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
  theme_color: string | null;
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
type TabId = "home" | "schedule" | "community" | "profile";

const TABS: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "community", label: "Community", icon: Users },
  { id: "profile", label: "Profile", icon: User },
];

interface Props {
  activeTab: TabId;
  children: React.ReactNode;
  /** Show a back-arrow sticky header for detail / inner views */
  pageTitle?: string;
}

/* ---------- helpers ---------- */
const DEFAULT_THEME = "#6C5CE7";

/** Darken a hex color by a percentage (0-1) */
function darken(hex: string, amount: number): string {
  const c = hex.replace("#", "");
  const r = Math.max(0, Math.round(parseInt(c.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(c.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(c.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/* ======================================== */
const AttendeeLayout = ({ activeTab, children, pageTitle }: Props) => {
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
        .select("id, title, slug, description, start_date, end_date, venue, city, state, timezone, cover_image_url, capacity, is_published, theme_color");

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
      // Tables may not exist yet — keep mock default
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
    if (tabId === "home") navigate(base);
    else navigate(`${base}/${tabId}`);
  };

  /* ---- theme color ---- */
  const theme = event?.theme_color || DEFAULT_THEME;
  const themeDark = darken(theme, 0.15);

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
          <Button asChild style={{ backgroundColor: theme }} className="hover:opacity-90 text-white">
            <Link to="/attend">Browse Events</Link>
          </Button>
        </div>
      </div>
    );
  }

  const showBackHeader = !!pageTitle;

  return (
    <AttendeeContext.Provider value={{ event, eventSlug: eventSlug!, isRegistered, registrationId, refreshRegistration }}>
      {/* CSS custom properties for theme color */}
      <style>{`
        .attendee-theme-btn { background-color: ${theme}; }
        .attendee-theme-btn:hover { background-color: ${themeDark}; }
      `}</style>

      {/* Phone-frame wrapper for desktop */}
      <div className="min-h-screen bg-gray-200 flex justify-center">
        <div className="w-full max-w-[430px] min-h-screen bg-gray-50 flex flex-col shadow-2xl relative">

          {/* ---- Event Cover Banner (only on main tab views) ---- */}
          {!showBackHeader && event.cover_image_url && (
            <div className="w-full h-24 relative overflow-hidden shrink-0">
              <img
                src={event.cover_image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}

          {/* ---- Top Header: Main event header OR back-arrow detail header ---- */}
          {showBackHeader ? (
            /* Detail / inner view header with back arrow */
            <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 bg-[#0A0F1E] mx-auto max-w-[430px]">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="h-[22px] w-[22px] text-white" />
              </button>
              <h1 className="flex-1 text-center font-semibold text-white text-sm truncate mr-6">
                {pageTitle}
              </h1>
            </header>
          ) : (
            /* Main tab view header */
            <header
              className="sticky top-0 z-50 h-14 flex items-center px-4 gap-3"
              style={{ backgroundColor: theme }}
            >
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-white text-sm truncate">{event.title}</h1>
                <p className="text-xs text-white/70 truncate">
                  {event.venue && `${event.venue}`}
                  {event.city && ` · ${event.city}`}
                  {event.state && `, ${event.state}`}
                </p>
              </div>
              <button
                className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <Bell className={cn("h-5 w-5", notifOpen ? "text-white" : "text-white/70")} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              <span className="text-xs font-bold text-white tracking-tight shrink-0">
                MilCrunch<span className="font-extrabold">X</span>
              </span>
            </header>
          )}

          {/* ---- Notification Panel ---- */}
          {notifOpen && !showBackHeader && (
            <div className="absolute top-14 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-lg max-h-[70vh] overflow-y-auto" style={{ top: event.cover_image_url ? "calc(6rem + 3.5rem)" : "3.5rem" }}>
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
          <main className={cn("flex-1 overflow-y-auto pb-20", showBackHeader && "pt-14")}>
            <div className="w-full">
              {children}
            </div>
          </main>

          {/* ---- Install Banner ---- */}
          <InstallBanner eventTitle={event.title} themeColor={theme} />

          {/* ---- Bottom Tab Bar ---- */}
          <nav
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0F1E] border-t border-[#1F2937] flex items-center justify-around px-2 mx-auto max-w-[430px]"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
          >
            <div className="h-14 flex items-center justify-around w-full">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors"
                  >
                    <tab.icon
                      className="h-[22px] w-[22px] transition-colors"
                      style={{ color: isActive ? "#6C5CE7" : "#6B7280" }}
                    />
                    <span
                      className="text-[10px] font-medium transition-colors"
                      style={{ color: isActive ? "#6C5CE7" : "#6B7280" }}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </AttendeeContext.Provider>
  );
};

export default AttendeeLayout;
