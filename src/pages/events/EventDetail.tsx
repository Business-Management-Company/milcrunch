import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, MapPin, Clock, Users, Share2,
  ChevronRight, ChevronDown, Mic, Handshake,
  Ticket, Globe, ExternalLink, AlertCircle, Loader2,
  Sparkles, Lightbulb, Heart, Target, Star,
  Trophy, PartyPopper, BookOpen, GraduationCap,
  Laugh, UserPlus,
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
interface TicketRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number | null;
  sold: number;
  is_active: boolean;
  sort_order: number;
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

const FAQS = [
  { q: "What's included in my ticket?", a: "Your ticket includes access to all sessions, networking events, lunch, and event swag. VIP Experience tickets include a dinner with speakers and an exclusive swag bag." },
  { q: "Is there parking available?", a: "Yes, complimentary parking is available in the venue garage. Ride-share drop-off is at the main entrance." },
  { q: "Can I get a refund?", a: "Full refunds are available up to 7 days before the event. After that, tickets are non-refundable but transferable to another attendee." },
  { q: "Is the venue wheelchair accessible?", a: "Yes, the venue is fully ADA compliant with accessible entrances, restrooms, and seating areas." },
  { q: "Do I need to be military-affiliated to attend?", a: "Not at all! While our community is military-focused, everyone is welcome — veterans, active duty, military spouses, and civilians who support the mission." },
];

const PILLARS = [
  {
    title: "Inspiration",
    description: "General session content meant to motivate and inspire attendees to achieve their highest potential.",
    icon: Sparkles,
  },
  {
    title: "Innovation",
    description: "Entrepreneurs, change-makers, and creators pushing the boundaries of what's possible.",
    icon: Lightbulb,
  },
  {
    title: "Influence",
    description: "Community relationships drive those who lead via content — build your platform and amplify your voice.",
    icon: Target,
  },
  {
    title: "Inclusivity",
    description: "All are welcome. The diversity of our community is what makes us strong.",
    icon: Heart,
  },
  {
    title: "Impact",
    description: "Culture, advocacy, and nonprofits — creating lasting change for the military community.",
    icon: Star,
  },
];

const REASONS_TO_ATTEND = [
  { title: "3 Days of Remarkable Content", icon: BookOpen },
  { title: "A+ List of Engaging Speakers", icon: Mic },
  { title: "3000+ Attendees", icon: Users },
  { title: "100K in Cash & Prizes", icon: Trophy },
  { title: "70+ Resources", icon: GraduationCap },
  { title: "Mentorship & Collaboration", icon: Handshake },
  { title: "Comedy & Entertainment", icon: Laugh },
  { title: "Networking & Parties", icon: PartyPopper },
];

const TIER_ORDER = ["title", "platinum", "gold", "silver", "bronze", "community"];

const SESSION_COLORS: Record<string, string> = {
  keynote: "bg-amber-100 text-amber-800",
  panel: "bg-blue-100 text-blue-800",
  breakout: "bg-purple-100 text-purple-800",
  workshop: "bg-green-100 text-green-800",
  networking: "bg-cyan-100 text-cyan-800",
  meal: "bg-orange-100 text-orange-800",
  pdx_experience: "bg-pink-100 text-pink-800",
};

/* ---- countdown hook ---- */
function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

/* ======================================== */
const EventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [agenda, setAgenda] = useState<AgendaRow[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerRow[]>([]);
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const aboutRef = useRef<HTMLDivElement>(null);
  const pillarsRef = useRef<HTMLDivElement>(null);
  const agendaRef = useRef<HTMLDivElement>(null);
  const speakersRef = useRef<HTMLDivElement>(null);
  const sponsorsRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);

  const countdown = useCountdown(event?.start_date ?? null);

  useEffect(() => {
    if (eventId) fetchAll();
  }, [eventId]);

  const fetchAll = async () => {
    try {
      const [evRes, tkRes, agRes, spkRes, spsRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, description, event_type, start_date, end_date, venue, city, state, timezone, image_url, capacity, is_published")
          .eq("id", eventId!)
          .single(),
        supabase
          .from("event_tickets")
          .select("*")
          .eq("event_id", eventId!)
          .eq("is_active", true)
          .order("sort_order"),
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
      setTickets((tkRes.data || []) as TicketRow[]);
      setAgenda((agRes.data || []) as AgendaRow[]);
      setSpeakers((spkRes.data || []) as SpeakerRow[]);
      setSponsors((spsRes.data || []) as SponsorRow[]);
    } catch (err) {
      console.error("Error loading event:", err);
    } finally {
      setLoading(false);
    }
  };

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const formatHeroDate = (start: string | null, end: string | null) => {
    if (!start) return "Date TBD";
    const s = new Date(start);
    if (!end) return format(s, "d MMMM yyyy").toUpperCase();
    const e = new Date(end);
    return `${format(s, "d")} - ${format(e, "d MMMM yyyy")}`.toUpperCase();
  };

  const lowestPrice = tickets.length > 0
    ? Math.min(...tickets.map((t) => t.price))
    : null;

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

  return (
    <div className="min-h-screen bg-gray-950">
      {/* ===== HERO ===== */}
      <div className="relative min-h-[560px] md:min-h-[640px] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{
            backgroundImage: event.image_url
              ? `url(${event.image_url})`
              : "linear-gradient(135deg, #000741 0%, #0a1628 40%, #0f2b1d 70%, #10B981 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

        <div className="relative z-10 w-full px-6 md:px-12 py-16">
          <div className="max-w-5xl mx-auto text-center">
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs uppercase tracking-widest mb-6 px-4 py-1.5">
              {event.event_type || "Conference"} &middot; {event.city}, {event.state}
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-[1.1] tracking-tight uppercase">
              {event.title}
            </h1>

            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              THE premier event for <span className="text-white font-semibold">THOSE WHO</span> shape and support the military community.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 text-white/90 text-base md:text-lg mb-8">
              <span className="flex items-center gap-2 font-semibold">
                <Calendar className="w-5 h-5 text-emerald-400" />
                {formatHeroDate(event.start_date, event.end_date)}
              </span>
              {(event.venue || event.city) && (
                <span className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  {event.venue}
                </span>
              )}
            </div>

            {/* Countdown Timer */}
            {event.start_date && new Date(event.start_date).getTime() > Date.now() && (
              <div className="flex items-center justify-center gap-3 md:gap-5 mb-10">
                {[
                  { value: countdown.days, label: "Days" },
                  { value: countdown.hours, label: "Hours" },
                  { value: countdown.minutes, label: "Minutes" },
                  { value: countdown.seconds, label: "Seconds" },
                ].map((unit) => (
                  <div key={unit.label} className="text-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                      <span className="text-2xl md:text-3xl font-bold text-white tabular-nums">
                        {String(unit.value).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 uppercase tracking-wider">{unit.label}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-10 py-6 text-lg rounded-xl shadow-lg shadow-emerald-500/25"
              >
                <Link to={`/events/${event.id}/register`}>
                  Register Now
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 text-white hover:bg-white/10 px-6 py-6 text-lg rounded-xl"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                }}
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== NAV BAR ===== */}
      <div className="sticky top-0 z-30 bg-gray-900 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-1 overflow-x-auto">
          {[
            { label: "About", ref: aboutRef },
            { label: "5 Pillars", ref: pillarsRef },
            ...(agenda.length > 0 ? [{ label: "Agenda", ref: agendaRef }] : []),
            ...(speakers.length > 0 ? [{ label: "Speakers", ref: speakersRef }] : []),
            ...(sponsors.length > 0 ? [{ label: "Sponsors", ref: sponsorsRef }] : []),
            { label: "Location", ref: locationRef },
            { label: "FAQ", ref: faqRef },
          ].map((nav) => (
            <button
              key={nav.label}
              onClick={() => scrollTo(nav.ref)}
              className="px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-t-lg transition-colors whitespace-nowrap"
            >
              {nav.label}
            </button>
          ))}
          <div className="ml-auto py-2">
            <Button
              asChild
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold"
            >
              <Link to={`/events/${event.id}/register`}>Register</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ===== ABOUT SECTION ===== */}
      <section ref={aboutRef} className="scroll-mt-16 bg-gray-950 py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 text-center">About This Event</h2>
          <p className="text-gray-400 text-lg leading-relaxed whitespace-pre-wrap text-center max-w-3xl mx-auto mb-12">
            {event.description || "Details coming soon. Check back for more information about this event."}
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            <Card className="p-6 bg-gray-900 border-gray-800 text-center">
              <Users className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
              <p className="font-semibold text-white text-lg">Network</p>
              <p className="text-sm text-gray-500 mt-1">Connect with leaders & creators</p>
            </Card>
            <Card className="p-6 bg-gray-900 border-gray-800 text-center">
              <Mic className="w-8 h-8 text-blue-400 mx-auto mb-3" />
              <p className="font-semibold text-white text-lg">Learn</p>
              <p className="text-sm text-gray-500 mt-1">Expert-led sessions & panels</p>
            </Card>
            <Card className="p-6 bg-gray-900 border-gray-800 text-center">
              <Handshake className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <p className="font-semibold text-white text-lg">Partner</p>
              <p className="text-sm text-gray-500 mt-1">Meet brands & sponsors</p>
            </Card>
          </div>
        </div>
      </section>

      {/* ===== 5 PILLARS ===== */}
      <section ref={pillarsRef} className="scroll-mt-16 bg-gray-900 py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">The 5 Pillars</h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            The foundation of everything we do — shaping the military community through purpose-driven connection.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="group bg-gray-950 border border-gray-800 rounded-2xl p-6 text-center hover:border-emerald-500/50 transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-500/20 transition-colors">
                    <Icon className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2">{pillar.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{pillar.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== MORE REASONS TO ATTEND ===== */}
      <section className="bg-gray-950 py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">More Reasons to Attend</h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            An experience like no other — designed for the military community, by the military community.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {REASONS_TO_ATTEND.map((reason) => {
              const Icon = reason.icon;
              return (
                <div
                  key={reason.title}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800 p-6 flex flex-col items-center text-center group hover:border-emerald-500/40 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm md:text-base leading-snug">
                    {reason.title}
                  </h3>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== MAIN CONTENT (Agenda, Speakers, Sponsors, Location, FAQ) ===== */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="space-y-20">

          {/* AGENDA */}
          {agenda.length > 0 && (
            <section ref={agendaRef} className="scroll-mt-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">Agenda</h2>
              <div className="space-y-10">
                {Object.entries(groupedAgenda).map(([day, items]) => (
                  <div key={day}>
                    <h3 className="text-lg font-semibold text-gray-300 mb-4">
                      Day {day}
                      {event.start_date && (
                        <span className="text-gray-500 font-normal ml-2 text-sm">
                          {format(
                            new Date(new Date(event.start_date).getTime() + (Number(day) - 1) * 86400000),
                            "EEEE, MMMM d"
                          )}
                        </span>
                      )}
                    </h3>
                    <div className="space-y-3">
                      {items.map((a) => (
                        <Card key={a.id} className="p-4 bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                          <div className="flex gap-4">
                            <div className="text-sm font-medium text-emerald-400 w-24 shrink-0 pt-0.5">
                              {a.start_time ? `${a.start_time.slice(0, 5)}` : "TBD"}
                              {a.end_time ? `–${a.end_time.slice(0, 5)}` : ""}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-white">{a.title}</h4>
                                {a.session_type && (
                                  <Badge className={cn("text-xs capitalize", SESSION_COLORS[a.session_type] || "bg-gray-700 text-gray-300")}>
                                    {a.session_type.replace("_", " ")}
                                  </Badge>
                                )}
                              </div>
                              {a.description && (
                                <p className="text-sm text-gray-500">{a.description}</p>
                              )}
                              {a.location_room && (
                                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {a.location_room}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SPEAKERS */}
          <section ref={speakersRef} className="scroll-mt-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">Featured Speakers</h2>
            <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
              Learn from the best — military creators, brand leaders, and industry experts.
            </p>
            {speakers.length > 0 ? (
              <>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {speakers.map((s) => (
                    <Card key={s.id} className="bg-gray-900 border-gray-800 overflow-hidden hover:border-emerald-500/40 transition-all duration-300 group">
                      <div className="aspect-square bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center overflow-hidden">
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt={s.creator_name || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <span className="text-5xl font-bold text-emerald-400/50">
                            {(s.creator_name || "?")[0]}
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <h4 className="font-bold text-white text-lg">{s.creator_name}</h4>
                        {s.role && (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs capitalize mt-1">{s.role}</Badge>
                        )}
                        {s.topic && (
                          <p className="text-sm text-gray-400 mt-3 font-medium leading-snug">{s.topic}</p>
                        )}
                        {s.bio && (
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">{s.bio}</p>
                        )}
                        {s.creator_handle && (
                          <p className="text-xs text-gray-600 mt-2">@{s.creator_handle}</p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 mt-10">
                  <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white px-6">
                    View All Speakers
                  </Button>
                  <Button className="bg-emerald-500 hover:bg-emerald-400 text-white px-6">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Become a Speaker
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Mic className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500">Speaker lineup coming soon.</p>
                <Button className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 mt-4">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Become a Speaker
                </Button>
              </div>
            )}
          </section>

          {/* SPONSORS */}
          <section ref={sponsorsRef} className="scroll-mt-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">Our Sponsors</h2>
            <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
              Proudly supported by brands that believe in the military community.
            </p>
            {sponsors.length > 0 ? (
              <>
                <div className="space-y-10">
                  {Object.entries(sponsorsByTier).map(([tier, tierSponsors]) => (
                    <div key={tier}>
                      <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-widest mb-4 text-center">
                        {tier} Sponsor{tierSponsors.length > 1 ? "s" : ""}
                      </h3>
                      <div
                        className={cn(
                          "flex flex-wrap items-center justify-center gap-6",
                          tier === "title" ? "gap-8" : ""
                        )}
                      >
                        {tierSponsors.map((sp) => (
                          <a
                            key={sp.id}
                            href={sp.website_url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group"
                          >
                            <Card
                              className={cn(
                                "bg-gray-900 border-gray-800 flex flex-col items-center justify-center text-center hover:border-emerald-500/40 transition-all duration-300",
                                tier === "title" ? "p-8 min-w-[200px]" : tier === "gold" || tier === "platinum" ? "p-6 min-w-[160px]" : "p-4 min-w-[120px]"
                              )}
                            >
                              {sp.logo_url ? (
                                <img
                                  src={sp.logo_url}
                                  alt={sp.sponsor_name}
                                  className={cn(
                                    "object-contain",
                                    tier === "title" ? "h-20" : tier === "gold" || tier === "platinum" ? "h-14" : "h-10"
                                  )}
                                />
                              ) : (
                                <p className={cn(
                                  "font-bold text-gray-300",
                                  tier === "title" ? "text-2xl" : "text-sm"
                                )}>
                                  {sp.sponsor_name}
                                </p>
                              )}
                              {sp.description && tier === "title" && (
                                <p className="text-xs text-gray-500 mt-3">{sp.description}</p>
                              )}
                              {sp.website_url && (
                                <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-emerald-400 mt-2 transition-colors" />
                              )}
                            </Card>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center mt-10">
                  <Button className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 font-semibold">
                    <Handshake className="w-4 h-4 mr-2" />
                    Become a Sponsor
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Handshake className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Sponsor lineup coming soon.</p>
                <Button className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 font-semibold">
                  Become a Sponsor
                </Button>
              </div>
            )}
          </section>

          {/* LOCATION */}
          <section ref={locationRef} className="scroll-mt-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">Location</h2>
            {event.venue ? (
              <Card className="p-8 bg-gray-900 border-gray-800">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xl">{event.venue}</h3>
                    <p className="text-gray-400 text-lg">
                      {[event.city, event.state].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
                <div className="mt-8 h-56 rounded-xl bg-gray-800 flex items-center justify-center border border-gray-700">
                  <span className="text-gray-500 text-sm">Map coming soon</span>
                </div>
              </Card>
            ) : (
              <Card className="p-8 bg-gray-900 border-gray-800 text-center">
                <Globe className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="font-semibold text-white text-lg">Virtual Event</h3>
                <p className="text-gray-500 text-sm">Access details will be sent after registration</p>
              </Card>
            )}
          </section>

          {/* FAQ */}
          <section ref={faqRef} className="scroll-mt-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
            <div className="max-w-3xl mx-auto space-y-3">
              {FAQS.map((faq, i) => (
                <Card
                  key={i}
                  className={cn(
                    "bg-gray-900 border-gray-800 overflow-hidden transition-all duration-200",
                    openFaq === i && "border-emerald-500/40"
                  )}
                >
                  <button
                    className="w-full p-5 flex items-center justify-between text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="font-medium text-white">{faq.q}</span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-gray-500 transition-transform shrink-0 ml-4",
                        openFaq === i && "rotate-180 text-emerald-400"
                      )}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed">{faq.a}</div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ===== STICKY REGISTRATION BAR (Desktop) ===== */}
      <div className="hidden lg:block fixed bottom-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="font-bold text-white">{event.title}</p>
              <p className="text-sm text-gray-400">
                {formatDateRange(event.start_date, event.end_date)} &middot; {[event.venue, event.city, event.state].filter(Boolean).join(", ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-emerald-400 font-semibold">
              {lowestPrice === null ? "Coming soon" : lowestPrice === 0 ? "Free" : `From $${lowestPrice}`}
            </p>
            <Button
              asChild
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8"
            >
              <Link to={`/events/${event.id}/register`}>
                Register Now
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ===== MOBILE STICKY BOTTOM BAR ===== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 p-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm truncate">{event.title}</p>
          <p className="text-xs text-gray-400">
            {lowestPrice === null ? "Coming soon" : lowestPrice === 0 ? "Free" : `From $${lowestPrice}`}
          </p>
        </div>
        <Button
          asChild
          className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold shrink-0"
        >
          <Link to={`/events/${event.id}/register`}>Register</Link>
        </Button>
      </div>

      {/* spacer for bottom bar */}
      <div className="h-20 lg:h-16" />

      {/* Footer branding */}
      <div className="bg-gray-950 border-t border-gray-800 py-8 text-center mb-16 lg:mb-12">
        <p className="text-sm text-gray-600">
          Powered by <span className="font-semibold text-gray-400">recurrent</span><span className="font-bold text-emerald-500">X</span>
        </p>
      </div>
    </div>
  );
};

export default EventDetail;
