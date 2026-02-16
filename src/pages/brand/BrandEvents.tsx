import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Plus, MapPin, Users, Mic, Handshake, Search, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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
  completed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const TYPE_LABELS: Record<string, string> = {
  conference: "Conference",
  meetup: "Meetup",
  pdx_experience: "PDX Experience",
  virtual: "Virtual",
  hybrid: "Hybrid",
  live: "In-Person",
};

function BrandEventCover({ event }: { event: EventWithCounts }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasImage = !!event.cover_image_url && !imgFailed;

  return (
    <div className="h-40 bg-gradient-to-br from-pd-blue/20 to-pd-darkblue/30 dark:from-pd-blue/10 dark:to-pd-darkblue/20 flex items-center justify-center relative">
      {hasImage ? (
        <img
          src={event.cover_image_url!}
          alt={event.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Calendar className="h-12 w-12 text-pd-blue/40" />
      )}
      <div className="absolute top-3 right-3 flex gap-1.5">
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

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, event_type, start_date, end_date, venue, city, state, cover_image_url, is_published, capacity")
        .order("start_date", { ascending: false });
      if (error) throw error;

      // Fetch speaker and sponsor counts
      const eventIds = (data || []).map((e: EventRow) => e.id);
      const [speakerRes, sponsorRes] = await Promise.all([
        eventIds.length > 0
          ? supabase.from("event_speakers").select("event_id").in("event_id", eventIds)
          : { data: [], error: null },
        eventIds.length > 0
          ? supabase.from("event_sponsors").select("event_id").in("event_id", eventIds)
          : { data: [], error: null },
      ]);

      const speakerCounts: Record<string, number> = {};
      const sponsorCounts: Record<string, number> = {};
      (speakerRes.data || []).forEach((r: { event_id: string }) => {
        speakerCounts[r.event_id] = (speakerCounts[r.event_id] || 0) + 1;
      });
      (sponsorRes.data || []).forEach((r: { event_id: string }) => {
        sponsorCounts[r.event_id] = (sponsorCounts[r.event_id] || 0) + 1;
      });

      setEvents(
        (data || []).map((e: EventRow) => ({
          ...e,
          speaker_count: speakerCounts[e.id] || 0,
          sponsor_count: sponsorCounts[e.id] || 0,
        }))
      );
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start) return "No date set";
    const s = format(new Date(start), "MMM d, yyyy");
    if (!end) return s;
    const e = format(new Date(end), "MMM d, yyyy");
    return `${s} – ${e}`;
  };

  return (
    <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-1">Events</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Create and manage events, conferences, and PDX experiences.
            </p>
          </div>
          <Button asChild className="bg-pd-blue hover:bg-pd-darkblue text-white">
            <Link to="/brand/events/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Link>
          </Button>
        </div>

        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700"
          />
        </div>

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
                <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden hover:border-pd-blue/50 hover:shadow-md transition-all h-full flex flex-col">
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
