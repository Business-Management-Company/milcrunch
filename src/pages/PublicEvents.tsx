import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

export default function PublicEvents() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, start_date, end_date, city, state, venue, cover_image_url, is_published, description")
        .eq("is_published", true)
        .order("start_date", { ascending: true });
      setEvents((data as EventRow[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="shrink-0">
            <span className="font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <span className="text-white">recurrent</span>
              <span className="text-[#10B981] font-extrabold">X</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm text-white/70 hover:text-white transition-colors">Home</Link>
            <Link to="/creators" className="text-sm text-white/70 hover:text-white transition-colors">Creators</Link>
            <Link to="/events" className="text-sm text-white font-medium">Events</Link>
            <Link to="/podcasts" className="text-sm text-white/70 hover:text-white transition-colors">Podcasts</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-white/70 hover:text-white transition-colors">Sign In</Link>
            <Link to="/signup" className="text-sm bg-[#10B981] hover:bg-[#0d9668] text-white px-4 py-1.5 rounded-lg font-medium transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            Upcoming Events
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto">
            MIC. MilSpouseFest. PDX Live. Join the military community at an event near you.
          </p>
        </div>
      </section>

      {/* Events Grid */}
      <section className="px-4 md:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-2xl bg-white/5 animate-pulse h-[340px]" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20">
              <CalendarDays className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 text-lg">No events published yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => {
                const past = isPastEvent(event.end_date, event.start_date);
                const location = getLocationLabel(event.city, event.state);
                const hasImage = !!event.cover_image_url;

                return (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="group relative rounded-2xl overflow-hidden h-[340px] block"
                  >
                    {/* Background image or gradient */}
                    {hasImage ? (
                      <img
                        src={event.cover_image_url!}
                        alt={event.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />
                    )}

                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 group-hover:from-black/70 group-hover:via-black/30 transition-colors duration-300" />

                    {/* Completed badge */}
                    {past && (
                      <div className="absolute top-4 right-4 z-10">
                        <span className="bg-white/20 backdrop-blur-sm text-white/90 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                          Completed
                        </span>
                      </div>
                    )}

                    {/* Text overlay — always visible */}
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
                      {/* Title + CTA — slide up on hover */}
                      <h3 className="text-xl font-bold text-white mb-3 leading-snug">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[#10B981] font-semibold text-sm opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                        {past ? "View Details" : "Register"} <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/">
            <span className="font-bold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <span className="text-white">recurrent</span>
              <span className="text-[#10B981] font-extrabold">X</span>
            </span>
          </Link>
          <p className="text-sm text-white/30">&copy; 2026 RecurrentX. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
