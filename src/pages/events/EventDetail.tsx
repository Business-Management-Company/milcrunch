import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Calendar, MapPin, ChevronRight, AlertCircle, Loader2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

/* ---------- types ---------- */
interface EventRow {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  timezone: string | null;
  image_url: string | null;
  capacity: number | null;
  is_published: boolean | null;
}
interface AgendaRow {
  id: string;
  day_number: number;
  start_time: string | null;
  end_time: string | null;
  title: string;
  description: string | null;
  location_room: string | null;
  session_type: string | null;
  sort_order: number;
}
interface SpeakerRow {
  id: string;
  creator_name: string | null;
  creator_handle: string | null;
  avatar_url: string | null;
  role: string | null;
  topic: string | null;
  bio: string | null;
  confirmed: boolean | null;
}
interface SponsorRow {
  id: string;
  sponsor_name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string | null;
  description: string | null;
}

const TIER_ORDER = ["title", "platinum", "gold", "silver", "bronze", "community"];

/* ---- countdown (days only) ---- */
function useDaysUntil(targetDate: string | null) {
  const [days, setDays] = useState(0);

  useEffect(() => {
    if (!targetDate) return;
    const calc = () => {
      const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
      setDays(Math.ceil(diff / 86400000));
    };
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [targetDate]);

  return days;
}

/* ======================================== */
const EventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [agenda, setAgenda] = useState<AgendaRow[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerRow[]>([]);
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const daysUntil = useDaysUntil(event?.start_date ?? null);

  useEffect(() => {
    if (eventId) fetchAll();
  }, [eventId]);

  const fetchAll = async () => {
    try {
      const [evRes, agRes, spkRes, spsRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, description, event_type, start_date, end_date, venue, city, state, timezone, image_url, capacity, is_published")
          .eq("id", eventId!)
          .single(),
        supabase
          .from("event_agenda")
          .select("*")
          .eq("event_id", eventId!)
          .order("day_number")
          .order("sort_order"),
        supabase
          .from("event_speakers")
          .select("*")
          .eq("event_id", eventId!)
          .order("sort_order"),
        supabase
          .from("event_sponsors")
          .select("*")
          .eq("event_id", eventId!)
          .order("sort_order"),
      ]);

      if (evRes.error) throw evRes.error;
      setEvent(evRes.data as unknown as EventRow);
      setAgenda((agRes.data || []) as AgendaRow[]);
      setSpeakers((spkRes.data || []) as SpeakerRow[]);
      setSponsors((spsRes.data || []) as SponsorRow[]);
    } catch (err) {
      console.error("Error loading event:", err);
    } finally {
      setLoading(false);
    }
  };

  /* helpers */
  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start) return "Date TBD";
    const s = new Date(start);
    if (!end) return format(s, "MMMM d, yyyy");
    const e = new Date(end);
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return `${format(s, "MMMM d")}–${format(e, "d, yyyy")}`;
    }
    return `${format(s, "MMMM d")} – ${format(e, "MMMM d, yyyy")}`;
  };

  const groupedAgenda = agenda.reduce<Record<number, AgendaRow[]>>((acc, item) => {
    (acc[item.day_number] = acc[item.day_number] || []).push(item);
    return acc;
  }, {});

  const sortedSponsors = [...sponsors].sort(
    (a, b) => TIER_ORDER.indexOf(a.tier || "community") - TIER_ORDER.indexOf(b.tier || "community")
  );
  const sponsorsByTier = sortedSponsors.reduce<Record<string, SponsorRow[]>>((acc, s) => {
    const tier = s.tier || "community";
    (acc[tier] = acc[tier] || []).push(s);
    return acc;
  }, {});

  /* ---- loading / error ---- */
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  if (!event) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="p-8 text-center border-gray-200">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
          <p className="text-gray-500 mb-4">This event doesn't exist or has been removed.</p>
          <Button asChild><Link to="/">Back to Home</Link></Button>
        </Card>
      </div>
    );
  }

  const isFuture = event.start_date && new Date(event.start_date).getTime() > Date.now();

  return (
    <div className="min-h-screen bg-white">
      {/* ===== HERO ===== */}
      <div className="relative border-b border-gray-200 py-20 md:py-28 overflow-hidden">
        {event.image_url ? (
          <>
            <img
              src={event.image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling?.remove();
                e.currentTarget.parentElement?.classList.add("bg-gray-50");
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gray-50" />
        )}
        <div className={cn("max-w-3xl mx-auto px-6 text-center relative z-10")}>
          <h1 className={cn("text-3xl md:text-5xl font-bold mb-5 leading-tight", event.image_url ? "text-white drop-shadow-lg" : "text-[#000741]")}>
            {event.title}
          </h1>

          <div className={cn("flex flex-col sm:flex-row items-center justify-center gap-4 text-base mb-8", event.image_url ? "text-white/90" : "text-gray-600")}>
            <span className="flex items-center gap-2">
              <Calendar className={cn("w-4 h-4", event.image_url ? "text-purple-300" : "text-purple-500")} />
              {formatDateRange(event.start_date, event.end_date)}
            </span>
            {(event.venue || event.city) && (
              <span className="flex items-center gap-2">
                <MapPin className={cn("w-4 h-4", event.image_url ? "text-purple-300" : "text-purple-500")} />
                {[event.venue, event.city, event.state].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>

          {isFuture && (
            <p className={cn("font-medium text-sm mb-6", event.image_url ? "text-purple-200" : "text-purple-600")}>
              {daysUntil} days until the event
            </p>
          )}

          <Button
            asChild
            size="lg"
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold px-10"
          >
            <Link to={`/events/${event.id}/register`}>
              Register Now
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ===== ABOUT ===== */}
      <section className="py-14 md:py-16 border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
            {event.description || "Details coming soon."}
          </p>
        </div>
      </section>

      {/* ===== AGENDA ===== */}
      {agenda.length > 0 && (
        <section className="py-14 md:py-16 border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Agenda</h2>
            <div className="space-y-8">
              {Object.entries(groupedAgenda).map(([day, items]) => (
                <div key={day}>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Day {day}
                    {event.start_date && (
                      <span className="ml-2 normal-case tracking-normal text-gray-400 font-normal">
                        — {format(
                          new Date(new Date(event.start_date).getTime() + (Number(day) - 1) * 86400000),
                          "EEEE, MMMM d"
                        )}
                      </span>
                    )}
                  </h3>
                  <div className="divide-y divide-gray-100">
                    {items.map((a) => (
                      <div key={a.id} className="py-3 flex gap-4 text-sm">
                        <span className="text-gray-400 w-28 shrink-0 tabular-nums">
                          {a.start_time ? a.start_time.slice(0, 5) : "TBD"}
                          {a.end_time ? ` – ${a.end_time.slice(0, 5)}` : ""}
                        </span>
                        <span className="text-gray-900 font-medium flex-1">{a.title}</span>
                        {a.location_room && (
                          <span className="text-gray-400 shrink-0">{a.location_room}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== SPEAKERS ===== */}
      {speakers.length > 0 && (
        <section className="py-14 md:py-16 border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Speakers</h2>
            <div className="flex flex-wrap gap-6">
              {speakers.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt={s.creator_name || ""} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-semibold text-gray-400">
                        {(s.creator_name || "?")[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{s.creator_name}</p>
                    {s.role && (
                      <p className="text-xs text-gray-500 capitalize">{s.role}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== SPONSORS ===== */}
      {sponsors.length > 0 && (
        <section className="py-14 md:py-16 border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Sponsors</h2>
            <div className="space-y-6">
              {Object.entries(sponsorsByTier).map(([tier, tierSponsors]) => (
                <div key={tier}>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 capitalize">
                    {tier}
                  </p>
                  <div className="flex flex-wrap items-center gap-5">
                    {tierSponsors.map((sp) => (
                      <a
                        key={sp.id}
                        href={sp.website_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center justify-center rounded-lg border border-gray-100 bg-gray-50 hover:border-gray-200 transition-colors",
                          tier === "title" ? "px-6 py-4" : "px-4 py-3"
                        )}
                      >
                        {sp.logo_url ? (
                          <img
                            src={sp.logo_url}
                            alt={sp.sponsor_name}
                            className={cn("object-contain", tier === "title" ? "h-10" : "h-7")}
                          />
                        ) : (
                          <span className={cn(
                            "font-semibold text-gray-700",
                            tier === "title" ? "text-lg" : "text-sm"
                          )}>
                            {sp.sponsor_name}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== REGISTER CTA ===== */}
      <section className="py-16 md:py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to join?</h2>
          <p className="text-gray-500 mb-6">
            {formatDateRange(event.start_date, event.end_date)}
            {event.venue && ` · ${event.venue}`}
          </p>
          <Button
            asChild
            size="lg"
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold px-10"
          >
            <Link to={`/events/${event.id}/register`}>
              Register Now
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
          <p className="text-xs text-gray-400 mt-6">
            Powered by <span className="font-semibold text-gray-500">recurrent</span><span className="font-bold text-purple-500">X</span>
          </p>
        </div>
      </section>
    </div>
  );
};

export default EventDetail;
