import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, MapPin, Clock, Users, Share2,
  ChevronRight, ChevronDown, Mic, Handshake,
  Ticket, Globe, ExternalLink, AlertCircle, Loader2,
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
  const agendaRef = useRef<HTMLDivElement>(null);
  const speakersRef = useRef<HTMLDivElement>(null);
  const sponsorsRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);

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
    <div className="min-h-screen bg-white">
      {/* ===== HERO ===== */}
      <div className="relative h-[420px] md:h-[480px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: event.image_url
              ? `url(${event.image_url})`
              : "linear-gradient(135deg, #000741 0%, #0064B1 50%, #10B981 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-emerald-500 text-white border-0 text-xs uppercase tracking-wide">
                {event.event_type || "Event"}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 max-w-3xl leading-tight">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-5 text-white/80 text-sm md:text-base">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDateRange(event.start_date, event.end_date)}
              </span>
              {(event.venue || event.city) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {[event.venue, event.city, event.state].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8"
              >
                <Link to={`/events/${event.id}/register`}>
                  Register Now
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                }}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== NAV BAR ===== */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-1 overflow-x-auto">
          {[
            { label: "About", ref: aboutRef },
            ...(agenda.length > 0 ? [{ label: "Agenda", ref: agendaRef }] : []),
            ...(speakers.length > 0 ? [{ label: "Speakers", ref: speakersRef }] : []),
            ...(sponsors.length > 0 ? [{ label: "Sponsors", ref: sponsorsRef }] : []),
            { label: "Location", ref: locationRef },
            { label: "FAQ", ref: faqRef },
          ].map((nav) => (
            <button
              key={nav.label}
              onClick={() => scrollTo(nav.ref)}
              className="px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-t-lg transition-colors whitespace-nowrap"
            >
              {nav.label}
            </button>
          ))}
          <div className="ml-auto py-2">
            <Button
              asChild
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Link to={`/events/${event.id}/register`}>Register</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-14">
            {/* ABOUT */}
            <section ref={aboutRef} className="scroll-mt-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Event</h2>
              <p className="text-gray-600 text-lg leading-relaxed whitespace-pre-wrap">
                {event.description || "Details coming soon. Check back for more information about this event."}
              </p>
              <div className="grid sm:grid-cols-3 gap-4 mt-8">
                <Card className="p-4 bg-gray-50 border-gray-200">
                  <Users className="w-6 h-6 text-emerald-500 mb-2" />
                  <p className="font-semibold text-gray-900">Network</p>
                  <p className="text-sm text-gray-500">Connect with leaders & creators</p>
                </Card>
                <Card className="p-4 bg-gray-50 border-gray-200">
                  <Mic className="w-6 h-6 text-blue-500 mb-2" />
                  <p className="font-semibold text-gray-900">Learn</p>
                  <p className="text-sm text-gray-500">Expert-led sessions & panels</p>
                </Card>
                <Card className="p-4 bg-gray-50 border-gray-200">
                  <Handshake className="w-6 h-6 text-purple-500 mb-2" />
                  <p className="font-semibold text-gray-900">Partner</p>
                  <p className="text-sm text-gray-500">Meet brands & sponsors</p>
                </Card>
              </div>
            </section>

            {/* AGENDA */}
            {agenda.length > 0 && (
              <section ref={agendaRef} className="scroll-mt-16">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Agenda</h2>
                <div className="space-y-8">
                  {Object.entries(groupedAgenda).map(([day, items]) => (
                    <div key={day}>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Day {day}
                        {event.start_date && (
                          <span className="text-gray-400 font-normal ml-2 text-sm">
                            {format(
                              new Date(new Date(event.start_date).getTime() + (Number(day) - 1) * 86400000),
                              "EEEE, MMMM d"
                            )}
                          </span>
                        )}
                      </h3>
                      <div className="space-y-3">
                        {items.map((a) => (
                          <Card key={a.id} className="p-4 border-gray-200 hover:border-gray-300 transition-colors">
                            <div className="flex gap-4">
                              <div className="text-sm font-medium text-emerald-600 w-24 shrink-0 pt-0.5">
                                {a.start_time ? `${a.start_time.slice(0, 5)}` : "TBD"}
                                {a.end_time ? `–${a.end_time.slice(0, 5)}` : ""}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900">{a.title}</h4>
                                  {a.session_type && (
                                    <Badge className={cn("text-xs capitalize", SESSION_COLORS[a.session_type] || "bg-gray-100 text-gray-700")}>
                                      {a.session_type.replace("_", " ")}
                                    </Badge>
                                  )}
                                </div>
                                {a.description && (
                                  <p className="text-sm text-gray-500">{a.description}</p>
                                )}
                                {a.location_room && (
                                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
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
            {speakers.length > 0 && (
              <section ref={speakersRef} className="scroll-mt-16">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Speakers</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {speakers.map((s) => (
                    <Card key={s.id} className="p-5 border-gray-200 text-center hover:shadow-md transition-shadow">
                      <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt={s.creator_name || ""} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl font-bold text-white">
                            {(s.creator_name || "?")[0]}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900">{s.creator_name}</h4>
                      {s.role && (
                        <Badge variant="outline" className="text-xs capitalize mt-1">{s.role}</Badge>
                      )}
                      {s.topic && (
                        <p className="text-sm text-emerald-600 mt-2 font-medium">{s.topic}</p>
                      )}
                      {s.bio && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.bio}</p>
                      )}
                      {s.creator_handle && (
                        <p className="text-xs text-gray-400 mt-1">@{s.creator_handle}</p>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* SPONSORS */}
            {sponsors.length > 0 && (
              <section ref={sponsorsRef} className="scroll-mt-16">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Sponsors</h2>
                <div className="space-y-8">
                  {Object.entries(sponsorsByTier).map(([tier, tierSponsors]) => (
                    <div key={tier}>
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        {tier} Sponsor{tierSponsors.length > 1 ? "s" : ""}
                      </h3>
                      <div
                        className={cn(
                          "grid gap-4",
                          tier === "title" ? "grid-cols-1 sm:grid-cols-2" :
                          tier === "platinum" || tier === "gold" ? "grid-cols-2 sm:grid-cols-3" :
                          "grid-cols-3 sm:grid-cols-4"
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
                                "border-gray-200 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow",
                                tier === "title" ? "p-6" : "p-4"
                              )}
                            >
                              {sp.logo_url ? (
                                <img
                                  src={sp.logo_url}
                                  alt={sp.sponsor_name}
                                  className={cn(
                                    "object-contain",
                                    tier === "title" ? "h-16" : "h-10"
                                  )}
                                />
                              ) : (
                                <p className={cn(
                                  "font-bold text-gray-700",
                                  tier === "title" ? "text-xl" : "text-sm"
                                )}>
                                  {sp.sponsor_name}
                                </p>
                              )}
                              {sp.description && tier === "title" && (
                                <p className="text-xs text-gray-500 mt-2">{sp.description}</p>
                              )}
                              {sp.website_url && (
                                <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-emerald-500 mt-2 transition-colors" />
                              )}
                            </Card>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* LOCATION */}
            <section ref={locationRef} className="scroll-mt-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Location</h2>
              {event.venue ? (
                <Card className="p-6 border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{event.venue}</h3>
                      <p className="text-gray-500">
                        {[event.city, event.state].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 h-48 rounded-lg bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Map coming soon</span>
                  </div>
                </Card>
              ) : (
                <Card className="p-6 border-gray-200 text-center">
                  <Globe className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Virtual Event</h3>
                  <p className="text-gray-500 text-sm">Access details will be sent after registration</p>
                </Card>
              )}
            </section>

            {/* FAQ */}
            <section ref={faqRef} className="scroll-mt-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
              <div className="space-y-2">
                {FAQS.map((faq, i) => (
                  <Card
                    key={i}
                    className={cn(
                      "border-gray-200 overflow-hidden transition-colors",
                      openFaq === i && "border-emerald-200 bg-emerald-50/30"
                    )}
                  >
                    <button
                      className="w-full p-4 flex items-center justify-between text-left"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    >
                      <span className="font-medium text-gray-900">{faq.q}</span>
                      <ChevronDown
                        className={cn(
                          "w-5 h-5 text-gray-400 transition-transform shrink-0 ml-4",
                          openFaq === i && "rotate-180"
                        )}
                      />
                    </button>
                    {openFaq === i && (
                      <div className="px-4 pb-4 text-sm text-gray-600">{faq.a}</div>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          </div>

          {/* ===== RIGHT COLUMN — STICKY SIDEBAR ===== */}
          <div className="lg:col-span-1">
            <Card className="sticky top-16 p-6 border-gray-200 shadow-lg">
              <h3 className="font-bold text-lg text-gray-900 mb-4">Event Details</h3>

              <div className="space-y-3 text-sm mb-6">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDateRange(event.start_date, event.end_date)}
                    </p>
                    {event.start_date && (
                      <p className="text-gray-500">
                        {format(new Date(event.start_date), "h:mm a")} {event.timezone || "ET"}
                      </p>
                    )}
                  </div>
                </div>

                {(event.venue || event.city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      {event.venue && <p className="font-medium text-gray-900">{event.venue}</p>}
                      <p className="text-gray-500">
                        {[event.city, event.state].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Ticket className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {lowestPrice === null
                        ? "Tickets coming soon"
                        : lowestPrice === 0
                        ? "Free"
                        : `From $${lowestPrice}`}
                    </p>
                    {tickets.length > 0 && (
                      <p className="text-gray-500">{tickets.length} ticket type{tickets.length > 1 ? "s" : ""} available</p>
                    )}
                  </div>
                </div>

                {event.capacity && (
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-gray-500">{event.capacity} attendee capacity</p>
                  </div>
                )}
              </div>

              {/* Ticket previews */}
              {tickets.length > 0 && (
                <div className="space-y-2 mb-6">
                  {tickets.map((t) => {
                    const remaining = t.quantity ? t.quantity - t.sold : null;
                    const soldOut = remaining !== null && remaining <= 0;
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "p-3 rounded-lg border border-gray-200 flex items-center justify-between",
                          soldOut && "opacity-50"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{t.name}</p>
                          {remaining !== null && !soldOut && remaining < 20 && (
                            <p className="text-xs text-orange-500">{remaining} left</p>
                          )}
                          {soldOut && <p className="text-xs text-red-500">Sold out</p>}
                        </div>
                        <p className="font-bold text-gray-900 text-sm shrink-0 ml-3">
                          {t.price === 0 ? "Free" : `$${t.price}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button
                asChild
                size="lg"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
              >
                <Link to={`/events/${event.id}/register`}>
                  Register Now
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>

              <p className="text-xs text-gray-400 text-center mt-3">
                Powered by <span className="font-semibold text-gray-600">recurrent</span><span className="font-bold text-emerald-500">X</span>
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* ===== MOBILE STICKY BOTTOM BAR ===== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg p-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{event.title}</p>
          <p className="text-xs text-gray-500">
            {lowestPrice === null ? "Coming soon" : lowestPrice === 0 ? "Free" : `From $${lowestPrice}`}
          </p>
        </div>
        <Button
          asChild
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shrink-0"
        >
          <Link to={`/events/${event.id}/register`}>Register</Link>
        </Button>
      </div>

      {/* spacer for mobile bottom bar */}
      <div className="lg:hidden h-20" />
    </div>
  );
};

export default EventDetail;
