import { useState, useEffect, createContext, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar, Mic, Building2, User, Info, Bell, Loader2, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
type TabId = "schedule" | "speakers" | "sponsors" | "profile" | "info";

const TABS: { id: TabId; label: string; icon: typeof Calendar }[] = [
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "speakers", label: "Speakers", icon: Mic },
  { id: "sponsors", label: "Sponsors", icon: Building2 },
  { id: "profile", label: "My Profile", icon: User },
  { id: "info", label: "Info", icon: Info },
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

  useEffect(() => {
    if (eventSlug) fetchEvent();
  }, [eventSlug]);

  const fetchEvent = async () => {
    try {
      // Try slug first, fall back to ID
      let query = supabase
        .from("events")
        .select("id, title, slug, description, start_date, end_date, venue, city, state, timezone, cover_image_url, capacity, is_published");

      // If it looks like a UUID, query by ID
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

      // Check registration
      if (user) {
        await checkRegistration(data.id);
      }
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
                {event.city && ` · ${event.city}`}
                {event.state && `, ${event.state}`}
              </p>
            </div>
            <span className="text-xs font-bold text-white tracking-tight shrink-0">
              recurrent<span className="text-[#6C5CE7] font-extrabold">X</span>
            </span>
          </header>

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
