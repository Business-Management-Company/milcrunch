import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";

interface EventRow {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  city: string | null;
  state: string | null;
  venue: string | null;
  cover_image_url: string | null;
  is_published: boolean | null;
  description: string | null;
}

function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();
}

function isPastEvent(endDate: string | null, startDate: string | null): boolean {
  const d = endDate || startDate;
  if (!d) return false;
  return new Date(d) < new Date();
}

function getLocationLabel(city: string | null, state: string | null): string {
  if (city && state) return `${city}, ${state}`.toUpperCase();
  if (city) return city.toUpperCase();
  if (state) return state.toUpperCase();
  return "";
}

const CARD_GRADIENTS = [
  "from-blue-600 to-blue-800",
  "from-purple-500 to-purple-700",
  "from-indigo-500 to-purple-700",
  "from-slate-500 to-slate-700",
  "from-cyan-600 to-blue-700",
  "from-purple-600 to-purple-800",
  "from-violet-500 to-indigo-700",
  "from-sky-500 to-blue-700",
];

function EventCard({ event, index }: { event: EventRow; index: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const past = isPastEvent(event.end_date, event.start_date);
  const location = getLocationLabel(event.city, event.state);
  const hasImage = !!event.cover_image_url && !imgFailed;
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <Link
      to={`/events/${event.id}`}
      className="group relative rounded-2xl overflow-hidden h-[340px] block shadow-sm hover:shadow-xl transition-shadow duration-300"
    >
      {/* Background image or gradient fallback */}
      {hasImage ? (
        <img
          src={event.cover_image_url!}
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      )}

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 group-hover:from-black/70 group-hover:via-black/30 transition-colors duration-300" />

      {/* Completed badge */}
      {past && (
        <div className="absolute top-4 right-4 z-10">
          <span className="bg-white/20 backdrop-blur-sm text-white/90 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
            Completed
          </span>
        </div>
      )}

      {/* Text overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="font-medium tracking-wide">
            {formatEventDate(event.start_date)}
          </span>
        </div>
        {location && (
          <div className="flex items-center gap-2 text-white/70 text-sm mb-3">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="font-medium tracking-wide">{location}</span>
          </div>
        )}
        <h3 className="text-xl font-bold text-white mb-3 leading-snug">
          {event.title}
        </h3>
        <div className="flex items-center gap-2 text-[#6C5CE7] font-semibold text-sm opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          {past ? "View Details" : "Register"} <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

export default function PublicEvents() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, start_date, end_date, city, state, venue, cover_image_url, is_published, description")
        .eq("is_published", true)
        .order("start_date", { ascending: true });
      if (error) console.error("Failed to load events:", error);
      setEvents((data as EventRow[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <PublicNav />

      {/* Hero */}
      <section className="pt-28 pb-12 px-4 md:px-8 bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-[#1A1A2E]">
            Upcoming Events
          </h1>
          <p className="text-lg md:text-xl text-[#6B7280] max-w-2xl mx-auto">
            MIC. MilSpouseFest. And more. Join the military community at an event near you.
          </p>
        </div>
      </section>

      {/* Events Grid */}
      <section className="px-4 md:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-[340px]" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20">
              <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No events published yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
