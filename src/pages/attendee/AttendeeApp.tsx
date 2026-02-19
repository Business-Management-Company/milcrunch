import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Calendar, MessageCircle, Users, Bell, User, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AttendeeCommunity from "./AttendeeCommunity";
import AttendeePeople from "./AttendeePeople";
import AttendeeNotifications from "./AttendeeNotifications";
import AttendeeProfile from "./AttendeeProfile";
import { Badge } from "@/components/ui/badge";

/* ---------- types ---------- */
interface EventInfo {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  cover_image_url: string | null;
}

const TABS = [
  { key: "community", label: "Community", icon: MessageCircle },
  { key: "people", label: "People", icon: Users },
  { key: "notifications", label: "Alerts", icon: Bell },
  { key: "profile", label: "Profile", icon: User },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AttendeeApp() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("community");
  const [unreadNotifications, setUnreadNotifications] = useState(3); // mock

  const fetchEvent = useCallback(async () => {
    if (!eventSlug) return;
    setLoading(true);
    try {
      // Try by ID first, then by slug-like title match
      let query = supabase
        .from("events")
        .select("id, title, description, start_date, end_date, venue, city, state, cover_image_url")
        .limit(1);

      // If it looks like a UUID, search by id
      if (eventSlug.match(/^[0-9a-f-]{36}$/)) {
        query = query.eq("id", eventSlug);
      } else {
        // Search by slug pattern in title
        query = query.ilike("title", `%${eventSlug.replace(/-/g, "%")}%`);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      setEvent(data as unknown as EventInfo);
    } catch {
      // Fallback: use mock data for demo
      setEvent({
        id: "demo-mic-2026",
        title: "Military Influencer Conference 2026",
        description: "The premier military creator conference",
        start_date: "2026-09-18",
        end_date: "2026-09-20",
        venue: "San Diego Convention Center",
        city: "San Diego",
        state: "CA",
        cover_image_url: null,
      });
    } finally {
      setLoading(false);
    }
  }, [eventSlug]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0F1117]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
      </div>
    );
  }

  const eventId = event?.id || "demo";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F1117] flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#1A1D27] border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="font-bold text-sm truncate text-gray-900 dark:text-white">{event?.title || "Event"}</h1>
            {event?.venue && (
              <p className="text-xs text-muted-foreground truncate">{event.venue} — {event.city}, {event.state}</p>
            )}
          </div>
          <span className="text-xs font-bold text-[#6C5CE7] shrink-0 ml-2">MilCrunch<span className="font-extrabold">X</span></span>
        </div>
      </header>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-lg mx-auto px-4 py-4">
          {activeTab === "community" && (
            <AttendeeCommunity eventId={eventId} event={event} />
          )}
          {activeTab === "people" && (
            <AttendeePeople eventId={eventId} />
          )}
          {activeTab === "notifications" && (
            <AttendeeNotifications eventId={eventId} onClearBadge={() => setUnreadNotifications(0)} />
          )}
          {activeTab === "profile" && (
            <AttendeeProfile eventId={eventId} event={event} />
          )}
        </div>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#1A1D27] border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
        <div className="max-w-lg mx-auto flex">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors relative ${
                  isActive ? "text-[#6C5CE7]" : "text-gray-400 dark:text-gray-500"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {tab.key === "notifications" && unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                      {unreadNotifications}
                    </span>
                  )}
                </div>
                {tab.label}
                {isActive && <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-[#6C5CE7] rounded-b" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
