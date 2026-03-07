import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Plus, MapPin, Users, Mic, Handshake, Search, Loader2, Sparkles, Send, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  cover_image_url: string | null;
  is_published: boolean | null;
  capacity: number | null;
}

interface EventWithCounts extends EventRow {
  speaker_count: number;
  sponsor_count: number;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  published: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500",
};

const TYPE_LABELS: Record<string, string> = {
  conference: "Conference",
  meetup: "Meetup",
  pdx_experience: "Experience",
  virtual: "Virtual",
  hybrid: "Hybrid",
  live: "In-Person",
};

function BrandEventCover({ event }: { event: EventWithCounts }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasImage = !!event.cover_image_url && !imgFailed;

  return (
    <div className={`h-48 overflow-hidden relative ${hasImage ? "" : "flex items-center justify-center bg-gradient-to-br from-pd-blue/20 to-pd-darkblue/30 dark:from-pd-blue/10 dark:to-pd-darkblue/20"}`}>
      {hasImage ? (
        <img
          src={event.cover_image_url!}
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Calendar className="h-12 w-12 text-pd-blue/40" />
      )}
      <div className="absolute top-3 right-3 flex gap-1.5 z-10">
        <Badge className={STATUS_STYLES[event.is_published ? "published" : "draft"] + " text-xs font-medium capitalize"}>
          {event.is_published ? "published" : "draft"}
        </Badge>
      </div>
    </div>
  );
}

const BrandEvents = () => {
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [regCounts, setRegCounts] = useState<Record<string, number>>({});

  /* AI Agent */
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setFetchError(null);
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, event_type, start_date, end_date, venue, city, state, cover_image_url, is_published, capacity")
        .order("start_date", { ascending: false });

      if (error) {
        console.error("[BrandEvents] events query FAILED:", error.message, error.details, error.hint, error.code);
        setFetchError(`Events query failed: ${error.message}${error.hint ? ` (${error.hint})` : ""}`);
        return;
      }

      console.log("[BrandEvents] Loaded", data?.length ?? 0, "events");

      // Fetch speaker and sponsor counts
      const eventIds = (data || []).map((e: EventRow) => e.id);
      const [speakerRes, sponsorRes, regRes] = await Promise.all([
        eventIds.length > 0
          ? supabase.from("event_speakers").select("event_id").in("event_id", eventIds)
          : { data: [], error: null },
        eventIds.length > 0
          ? supabase.from("event_sponsors").select("event_id").in("event_id", eventIds)
          : { data: [], error: null },
        eventIds.length > 0
          ? supabase.from("event_registrations").select("event_id").in("event_id", eventIds)
          : { data: [], error: null },
      ]);

      const speakerCounts: Record<string, number> = {};
      const sponsorCounts: Record<string, number> = {};
      const registrationCounts: Record<string, number> = {};
      (speakerRes.data || []).forEach((r: { event_id: string }) => {
        speakerCounts[r.event_id] = (speakerCounts[r.event_id] || 0) + 1;
      });
      (sponsorRes.data || []).forEach((r: { event_id: string }) => {
        sponsorCounts[r.event_id] = (sponsorCounts[r.event_id] || 0) + 1;
      });
      (regRes.data || []).forEach((r: { event_id: string }) => {
        registrationCounts[r.event_id] = (registrationCounts[r.event_id] || 0) + 1;
      });
      setRegCounts(registrationCounts);

      setEvents(
        (data || []).map((e: EventRow) => ({
          ...e,
          speaker_count: speakerCounts[e.id] || 0,
          sponsor_count: sponsorCounts[e.id] || 0,
        }))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[BrandEvents] Failed to load events:", msg);
      setFetchError(`Failed to load events: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start) return "No date set";
    // Parse date parts manually to avoid UTC timezone shift
    const parseDateLocal = (str: string) => {
      const [y, m, d] = str.split("T")[0].split("-").map(Number);
      return new Date(y, m - 1, d);
    };
    const s = format(parseDateLocal(start), "MMM d, yyyy");
    if (!end) return s;
    const e = format(parseDateLocal(end), "MMM d, yyyy");
    return `${s} – ${e}`;
  };

  /* AI Agent handler */
  const handleAiSubmit = async () => {
    const q = aiPrompt.trim();
    if (!q || aiLoading) return;
    setAiLoading(true);
    setAiResponse(null);
    try {
      const eventsContext = events.map((e) => ({
        title: e.title,
        type: e.event_type,
        date: formatDateRange(e.start_date, e.end_date),
        location: [e.venue, e.city, e.state].filter(Boolean).join(", ") || "TBD",
        status: e.is_published ? "published" : "draft",
        capacity: e.capacity ?? "not set",
        registrations: regCounts[e.id] ?? 0,
        speakers: e.speaker_count,
        sponsors: e.sponsor_count,
      }));

      const res = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 1024,
          system: `You are a helpful event strategy assistant for MilCrunch, a military and veteran event management platform. The user manages the following events:\n\n${JSON.stringify(eventsContext, null, 2)}\n\nToday's date is ${format(new Date(), "MMMM d, yyyy")}. Answer concisely and actionably. Use bullet points when listing. If you reference an event, use its exact title.`,
          messages: [{ role: "user", content: q }],
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const text = (data.content?.[0]?.text ?? "").trim();
      setAiResponse(text || "No response generated.");
      setAiPrompt("");
    } catch (e) {
      console.error("[BrandEvents] AI error:", e);
      toast.error("AI request failed. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-1">Events</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Create and manage events, conferences, and experiences.
            </p>
          </div>
          <Button asChild className="bg-pd-blue hover:bg-pd-darkblue text-white">
            <Link to="/brand/events/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Link>
          </Button>
        </div>

        {/* AI Agent Prompt Bar */}
        <div className="mb-6">
          <div className="relative flex items-center">
            <Sparkles className="absolute left-4 h-5 w-5 text-[#1e3a5f]" />
            <input
              type="text"
              placeholder="Ask about your events... e.g. 'Which event has the most registrations?' or 'What should I focus on this week?'"
              className={cn(
                "w-full pl-12 pr-14 py-4 rounded-2xl text-sm",
                "border-2 border-blue-300 dark:border-blue-800 focus:border-[#1e3a5f]",
                "bg-white dark:bg-[#1A1D27]",
                "shadow-sm hover:shadow-md focus:shadow-md focus:ring-2 focus:ring-[#1e3a5f]/30",
                "outline-none transition-all placeholder:text-gray-400",
              )}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAiSubmit(); }}
              disabled={aiLoading}
            />
            <button
              type="button"
              onClick={handleAiSubmit}
              disabled={!aiPrompt.trim() || aiLoading}
              className={cn(
                "absolute right-3 rounded-xl p-2 transition-colors",
                aiPrompt.trim() && !aiLoading
                  ? "bg-[#1e3a5f] text-white hover:bg-[#2d5282]"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400",
              )}
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* AI Response Card */}
        {aiResponse && (
          <div className="mb-6 rounded-2xl border-2 border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-5 relative">
            <button
              type="button"
              onClick={() => setAiResponse(null)}
              className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3 pr-8">
              <div className="w-7 h-7 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4 text-[#1e3a5f]" />
              </div>
              <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap min-w-0">
                {aiResponse}
              </div>
            </div>
          </div>
        )}

        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700"
          />
        </div>

        {fetchError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
            <p className="font-medium">Error loading events</p>
            <p className="mt-1">{fetchError}</p>
            <p className="mt-2 text-xs text-red-500">Check browser console for details. This may be an RLS policy issue.</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              {search ? "No events match your search" : "No events yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {search ? "Try a different search term." : "Create your first event to get started."}
            </p>
            {!search && (
              <Button asChild className="bg-pd-blue hover:bg-pd-darkblue text-white">
                <Link to="/brand/events/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Link>
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((event) => (
              <Link key={event.id} to={`/brand/events/${event.id}`} className="block group">
                <Card className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-[#1A1D27] hover:border-pd-blue/50 hover:shadow-md transition-all h-full flex flex-col">
                  {/* Cover image or placeholder */}
                  <BrandEventCover event={event} />

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {TYPE_LABELS[event.event_type || "conference"] || event.event_type}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg text-foreground mb-1 group-hover:text-pd-blue transition-colors line-clamp-2">
                      {event.title}
                    </h3>

                    <div className="text-sm text-muted-foreground space-y-1 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{formatDateRange(event.start_date, event.end_date)}</span>
                      </div>
                      {(event.venue || event.city) && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {[event.venue, event.city, event.state].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-gray-100 dark:border-gray-800">
                      <span className="flex items-center gap-1">
                        <Mic className="h-3.5 w-3.5" />
                        {event.speaker_count} speaker{event.speaker_count !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Handshake className="h-3.5 w-3.5" />
                        {event.sponsor_count} sponsor{event.sponsor_count !== 1 ? "s" : ""}
                      </span>
                      {event.capacity && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {event.capacity} cap
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandEvents;
