import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface PublishedEvent {
  id: string;
  title: string;
  slug: string;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  cover_image_url: string | null;
  theme_color: string | null;
}

const EventSelector = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<PublishedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data } = await supabase
        .from("events")
        .select("id, title, slug, start_date, end_date, venue, city, state, cover_image_url, theme_color")
        .eq("is_published", true)
        .order("start_date", { ascending: true });
      setEvents((data as unknown as PublishedEvent[]) || []);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const getLocation = (e: PublishedEvent) => {
    const parts = [e.venue, e.city, e.state].filter(Boolean);
    return parts.join(", ") || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-gray-50 flex flex-col shadow-2xl">
        {/* Header */}
        <header className="bg-[#0A0F1E] px-5 pt-12 pb-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-bold text-white">Events</h1>
            <span className="inline-flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="14" height="14"><polygon points="16,1 29,8.5 29,23.5 16,31 3,23.5 3,8.5" fill="#f59e0b"/></svg>
              <span className="text-xs font-bold text-white" style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800 }}>MilCrunch</span>
            </span>
          </div>
          <p className="text-sm text-gray-400">Select an event to get started</p>
        </header>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {events.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No events available</p>
              <p className="text-gray-400 text-sm mt-1">Check back soon for upcoming events</p>
            </div>
          ) : (
            events.map((evt) => {
              const dateStr = formatDate(evt.start_date);
              const location = getLocation(evt);
              const accent = evt.theme_color || "#1e3a5f";

              return (
                <button
                  key={evt.id}
                  onClick={() => navigate(`/attend/${evt.slug}`)}
                  className="w-full text-left bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                >
                  {/* Cover image */}
                  {evt.cover_image_url ? (
                    <div className="w-full h-36 relative overflow-hidden">
                      <img
                        src={evt.cover_image_url}
                        alt={evt.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    </div>
                  ) : (
                    <div
                      className="w-full h-20 flex items-center justify-center"
                      style={{ backgroundColor: accent }}
                    >
                      <Calendar className="w-8 h-8 text-white/40" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-4">
                    <h2 className="font-semibold text-gray-900 text-base leading-tight">{evt.title}</h2>
                    {dateStr && (
                      <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
                        <Calendar className="w-3.5 h-3.5" style={{ color: accent }} />
                        <span>{dateStr}</span>
                        {evt.end_date && evt.end_date !== evt.start_date && (
                          <span> – {formatDate(evt.end_date)}</span>
                        )}
                      </div>
                    )}
                    {location && (
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                        <MapPin className="w-3.5 h-3.5" style={{ color: accent }} />
                        <span className="truncate">{location}</span>
                      </div>
                    )}
                  </div>

                  {/* Accent bar */}
                  <div className="h-1" style={{ backgroundColor: accent }} />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default EventSelector;
