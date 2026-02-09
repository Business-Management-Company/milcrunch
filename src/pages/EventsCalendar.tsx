import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  MapPin,
  Users,
  Mic2,
  Search,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EventType = "in_person" | "virtual" | "hybrid";

interface EventItem {
  id: string;
  name: string;
  dateLabel: string;
  dateSort: string;
  location: string;
  type: EventType;
  description: string;
  attendees: number;
  speakers: number;
}

const SEED_EVENTS: EventItem[] = [
  { id: "1", name: "Military Times Veterans Summit", dateLabel: "MAR 15", dateSort: "2026-03-15", location: "San Diego, CA", type: "in_person", description: "Annual gathering of veteran leaders, entrepreneurs, and advocates", attendees: 450, speakers: 24 },
  { id: "2", name: "PDX at Fort Liberty", dateLabel: "APR 5", dateSort: "2026-04-05", location: "Fort Liberty, NC", type: "in_person", description: "ParadeDeck Experience featuring military creators and live entertainment", attendees: 320, speakers: 12 },
  { id: "3", name: "MilSpouseFest San Diego", dateLabel: "APR 18", dateSort: "2026-04-18", location: "San Diego, CA", type: "hybrid", description: "The premier military spouse networking and empowerment event", attendees: 280, speakers: 18 },
  { id: "4", name: "Military Influencer Conference (MIC) 2026", dateLabel: "SEP 15-17", dateSort: "2026-09-15", location: "Washington, D.C.", type: "in_person", description: "The largest gathering of military influencers and content creators", attendees: 1200, speakers: 60 },
  { id: "5", name: "PDX at VFW National Convention", dateLabel: "AUG", dateSort: "2026-08-01", location: "TBD", type: "in_person", description: "ParadeDeck Experience at VFW's national convention", attendees: 0, speakers: 8 },
  { id: "6", name: "Veteran Entrepreneur Summit", dateLabel: "OCT 10", dateSort: "2026-10-10", location: "Austin, TX", type: "virtual", description: "Connecting veteran entrepreneurs with investors and mentors", attendees: 520, speakers: 20 },
  { id: "7", name: "Military Podcast Live", dateLabel: "JUN 22", dateSort: "2026-06-22", location: "Nashville, TN", type: "hybrid", description: "Live podcast recordings featuring top military content creators", attendees: 180, speakers: 15 },
  { id: "8", name: "Armed Forces Day PDX", dateLabel: "MAY 16", dateSort: "2026-05-16", location: "Multiple Locations", type: "in_person", description: "Nationwide ParadeDeck Experiences celebrating Armed Forces Day", attendees: 800, speakers: 30 },
];

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; className: string }> = {
  in_person: { label: "In-Person", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  virtual: { label: "Virtual", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  hybrid: { label: "Hybrid", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
};

type DateFilter = "upcoming" | "past" | "this_month" | "this_year";
type SortBy = "date" | "name" | "location";

export default function EventsCalendar() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("upcoming");
  const [sortBy, setSortBy] = useState<SortBy>("date");

  const filteredAndSorted = useMemo(() => {
    let list = SEED_EVENTS.filter((e) => {
      const matchesSearch =
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.location.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || e.type === typeFilter;
      if (!matchesSearch || !matchesType) return false;
      const d = e.dateSort;
      if (dateFilter === "past") return d < "2026-02-08";
      if (dateFilter === "this_month") return d >= "2026-02-01" && d < "2026-03-01";
      if (dateFilter === "this_year") return d >= "2026-01-01";
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "date") return a.dateSort.localeCompare(b.dateSort);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a.location.localeCompare(b.location);
    });
    return list;
  }, [search, typeFilter, dateFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#000741] dark:text-white">Events</h1>
          <p className="text-muted-foreground mt-0.5">Manage military and veteran community events</p>
        </div>
        <Button asChild className="bg-[#0064B1] hover:bg-[#053877] text-white rounded-lg shrink-0">
          <Link to="/pdx/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Link>
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events, locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "in_person", "virtual", "hybrid"] as const).map((f) => (
            <Button
              key={f}
              variant={typeFilter === f ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-full h-8",
                typeFilter === f && "bg-[#0064B1] hover:bg-[#053877]"
              )}
              onClick={() => setTypeFilter(f)}
            >
              {f === "all" ? "All Events" : EVENT_TYPE_CONFIG[f].label}
            </Button>
          ))}
        </div>
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="location">Location</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events grid or empty state */}
      {filteredAndSorted.length === 0 ? (
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-12 text-center">
          <Calendar className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#000741] dark:text-white mb-2">No events yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Create your first event with the PDX wizard.</p>
          <Button asChild className="bg-[#0064B1] hover:bg-[#053877] text-white rounded-lg">
            <Link to="/pdx/create">Create Event</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSorted.map((event) => {
            const typeConfig = EVENT_TYPE_CONFIG[event.type];
            return (
              <Card
                key={event.id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="rounded-lg bg-[#0064B1] text-white text-xs font-bold px-2.5 py-1.5 shrink-0">
                    {event.dateLabel}
                  </div>
                  <Badge variant="secondary" className={cn("text-xs shrink-0", typeConfig.className)}>
                    {typeConfig.label}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-[#000741] dark:text-white mb-1 line-clamp-2">
                  {event.name}
                </h3>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{event.location}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {event.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {event.attendees > 0 ? event.attendees.toLocaleString() : "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mic2 className="h-4 w-4" />
                    {event.speakers}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
