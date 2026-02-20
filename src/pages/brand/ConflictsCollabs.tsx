import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Search,
  Loader2,
  AlertTriangle,
  Handshake,
  Send,
  Sparkles,
  Filter,
  Users,
  ArrowUpDown,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  capacity: number | null;
  is_published: boolean | null;
}

type ResultType = "conflict" | "collab";

interface ScanResult {
  type: ResultType;
  event: EventRow;
  /** 0-100 relevance score */
  score: number;
  dateProximity: number;
  reasons: string[];
  aiSuggestion: string;
}

type FilterMode = "both" | "conflicts" | "collabs";

/* ---------- analysis helpers ---------- */

const REGION_MAP: Record<string, string> = {
  AL: "Southeast", AK: "West", AZ: "Southwest", AR: "South", CA: "West",
  CO: "Mountain", CT: "Northeast", DE: "Mid-Atlantic", FL: "Southeast", GA: "Southeast",
  HI: "West", ID: "Mountain", IL: "Midwest", IN: "Midwest", IA: "Midwest",
  KS: "Midwest", KY: "South", LA: "South", ME: "Northeast", MD: "Mid-Atlantic",
  MA: "Northeast", MI: "Midwest", MN: "Midwest", MS: "South", MO: "Midwest",
  MT: "Mountain", NE: "Midwest", NV: "West", NH: "Northeast", NJ: "Mid-Atlantic",
  NM: "Southwest", NY: "Northeast", NC: "Southeast", ND: "Midwest", OH: "Midwest",
  OK: "South", OR: "West", PA: "Mid-Atlantic", RI: "Northeast", SC: "Southeast",
  SD: "Midwest", TN: "South", TX: "South", UT: "Mountain", VT: "Northeast",
  VA: "Mid-Atlantic", WA: "West", WV: "Mid-Atlantic", WI: "Midwest", WY: "Mountain",
  DC: "Mid-Atlantic",
};

function getRegion(state: string | null): string | null {
  if (!state) return null;
  return REGION_MAP[state.trim().toUpperCase()] ?? null;
}

function getLocation(ev: EventRow): string {
  return [ev.city, ev.state].filter(Boolean).join(", ") || ev.venue || "";
}

/** Compute audience-type similarity from event_type */
function audienceOverlap(a: EventRow, b: EventRow): number {
  if (!a.event_type || !b.event_type) return 30;
  const at = a.event_type.toLowerCase();
  const bt = b.event_type.toLowerCase();
  if (at === bt) return 85;
  // Group similar event types
  const militaryTypes = ["military", "veteran", "milspouse", "transition"];
  const networkTypes = ["conference", "networking", "summit", "expo"];
  const aIsMil = militaryTypes.some((t) => at.includes(t));
  const bIsMil = militaryTypes.some((t) => bt.includes(t));
  const aIsNet = networkTypes.some((t) => at.includes(t));
  const bIsNet = networkTypes.some((t) => bt.includes(t));
  if (aIsMil && bIsMil) return 75;
  if (aIsNet && bIsNet) return 60;
  return 30;
}

/** Analyze a candidate event against the selected event */
function analyzeEvent(selected: EventRow, candidate: EventRow): ScanResult | null {
  if (candidate.id === selected.id) return null;

  const selStart = selected.start_date ? parseISO(selected.start_date) : null;
  const candStart = candidate.start_date ? parseISO(candidate.start_date) : null;
  if (!selStart || !candStart) return null;

  const daysDiff = Math.abs(differenceInDays(candStart, selStart));
  const selRegion = getRegion(selected.state);
  const candRegion = getRegion(candidate.state);
  const sameRegion = selRegion && candRegion && selRegion === candRegion;
  const sameState = selected.state && candidate.state &&
    selected.state.trim().toUpperCase() === candidate.state.trim().toUpperCase();
  const overlap = audienceOverlap(selected, candidate);

  const reasons: string[] = [];
  let score = 0;
  let type: ResultType;

  // --- CONFLICT detection ---
  // Same or nearby date + same region + similar audience
  const isConflict = daysDiff <= 14 && (sameState || sameRegion) && overlap >= 50;

  if (isConflict) {
    type = "conflict";
    // Date proximity score
    if (daysDiff === 0) { score += 40; reasons.push("Same date"); }
    else if (daysDiff <= 3) { score += 35; reasons.push(`${daysDiff} day${daysDiff > 1 ? "s" : ""} apart`); }
    else if (daysDiff <= 7) { score += 25; reasons.push(`${daysDiff} days apart`); }
    else { score += 15; reasons.push(`${daysDiff} days apart`); }
    // Region
    if (sameState) { score += 25; reasons.push("Same state"); }
    else if (sameRegion) { score += 15; reasons.push(`Same region (${candRegion})`); }
    // Audience overlap
    score += Math.round(overlap * 0.35);
    reasons.push(`~${overlap}% audience overlap`);

    // AI suggestion
    let aiSuggestion: string;
    if (daysDiff <= 3 && sameState) {
      aiSuggestion = "Consider rescheduling to avoid direct competition, or explore a joint promotion to share audiences.";
    } else if (daysDiff <= 7) {
      aiSuggestion = "Differentiate your event messaging and target distinct audience segments to reduce cannibalization.";
    } else {
      aiSuggestion = "Consider cross-promoting — attendees of one event are likely interested in the other.";
    }

    return { type, event: candidate, score: Math.min(score, 100), dateProximity: daysDiff, reasons, aiSuggestion };
  }

  // --- COLLAB detection ---
  // Complementary topics, similar audiences, within 60 days
  if (daysDiff > 60) return null;

  const isCollab = overlap >= 30 || (daysDiff <= 30 && sameRegion);
  if (!isCollab) return null;

  type = "collab";
  // Proximity bonus
  if (daysDiff <= 7) { score += 20; reasons.push(`${daysDiff} day${daysDiff > 1 ? "s" : ""} apart — easy cross-promo`); }
  else if (daysDiff <= 21) { score += 15; reasons.push(`${daysDiff} days apart`); }
  else { score += 8; reasons.push(`${daysDiff} days apart`); }
  // Region synergy
  if (sameRegion && !sameState) { score += 20; reasons.push(`Same region (${candRegion}) — shared audience`); }
  else if (sameState) { score += 10; reasons.push("Same state"); }
  // Complementary audience
  if (overlap >= 50 && overlap < 85) { score += 25; reasons.push("Complementary audience"); }
  else if (overlap >= 30) { score += 15; reasons.push("Overlapping audience"); }
  // Different event type = complementary
  const selType = (selected.event_type || "").toLowerCase();
  const candType = (candidate.event_type || "").toLowerCase();
  if (selType && candType && selType !== candType) {
    score += 10;
    reasons.push("Different format — complementary content");
  }

  if (score < 15) return null;

  const aiSuggestion = sameRegion
    ? "Great collab opportunity — shared regional audience could benefit from cross-event promotion or a joint sponsor package."
    : "Similar audiences could benefit from content collaboration — consider guest speakers, shared social campaigns, or a joint announcement.";

  return { type, event: candidate, score: Math.min(score, 100), dateProximity: daysDiff, reasons, aiSuggestion };
}

/* ---------- collab pitch generation ---------- */
function generateCollabPitch(selected: EventRow, target: EventRow): string {
  const selDate = selected.start_date ? format(parseISO(selected.start_date), "MMM d, yyyy") : "TBD";
  const tarDate = target.start_date ? format(parseISO(target.start_date), "MMM d, yyyy") : "TBD";
  return `Subject: Collab Opportunity — ${selected.title} x ${target.title}

Hi there,

I'm reaching out from ${selected.title} (${selDate}, ${getLocation(selected) || "location TBD"}).

We noticed your upcoming event, ${target.title} (${tarDate}, ${getLocation(target) || "location TBD"}), targets a similar military community audience. We think there's a great opportunity to collaborate:

- Cross-promote to each other's attendee lists
- Share speakers or panelists between events
- Offer bundled ticket discounts for both events
- Co-create content leading up to both events

Would you be open to a quick call to explore this? I think our communities would both benefit.

Best,
[Your Name]
${selected.title} Team`;
}

/* ======================================== */
export default function ConflictsCollabs() {
  const [allEvents, setAllEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [filter, setFilter] = useState<FilterMode>("both");
  const [searchQuery, setSearchQuery] = useState("");
  const [pitchModal, setPitchModal] = useState<{ selected: EventRow; target: EventRow } | null>(null);

  // Load all events
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, event_type, start_date, end_date, venue, city, state, capacity, is_published")
        .order("start_date", { ascending: true });
      if (error) {
        console.error("Failed to load events:", error);
        toast.error("Failed to load events");
      }
      const events = (data ?? []) as EventRow[];
      setAllEvents(events);
      // Auto-select first upcoming published event
      const now = new Date();
      const upcoming = events.find(
        (e) => e.is_published && e.start_date && parseISO(e.start_date) >= now,
      );
      if (upcoming) setSelectedId(upcoming.id);
      else if (events.length > 0) setSelectedId(events[0].id);
      setLoading(false);
    })();
  }, []);

  const selectedEvent = allEvents.find((e) => e.id === selectedId) ?? null;

  // Run scan when event is selected
  const runScan = () => {
    if (!selectedEvent) return;
    setScanning(true);
    setResults([]);

    // Simulate brief analysis delay for UX
    setTimeout(() => {
      const scanResults: ScanResult[] = [];
      for (const candidate of allEvents) {
        const result = analyzeEvent(selectedEvent, candidate);
        if (result) scanResults.push(result);
      }
      // Sort: conflicts first, then by score desc, then by date proximity
      scanResults.sort((a, b) => {
        if (a.type !== b.type) return a.type === "conflict" ? -1 : 1;
        if (b.score !== a.score) return b.score - a.score;
        return a.dateProximity - b.dateProximity;
      });
      setResults(scanResults);
      setScanning(false);
      const conflicts = scanResults.filter((r) => r.type === "conflict").length;
      const collabs = scanResults.filter((r) => r.type === "collab").length;
      if (scanResults.length === 0) {
        toast.success("No conflicts or collab opportunities found");
      } else {
        toast.info(`Found ${conflicts} conflict${conflicts !== 1 ? "s" : ""} and ${collabs} collab opportunity${collabs !== 1 ? "ies" : "y"}`);
      }
    }, 600);
  };

  // Auto-scan when selection changes
  useEffect(() => {
    if (selectedEvent) runScan();
  }, [selectedId]);

  const filtered = useMemo(() => {
    let list = results;
    if (filter === "conflicts") list = list.filter((r) => r.type === "conflict");
    if (filter === "collabs") list = list.filter((r) => r.type === "collab");
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) =>
        r.event.title.toLowerCase().includes(q) ||
        getLocation(r.event).toLowerCase().includes(q),
      );
    }
    return list;
  }, [results, filter, searchQuery]);

  const conflictCount = results.filter((r) => r.type === "conflict").length;
  const collabCount = results.filter((r) => r.type === "collab").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conflicts & Collabs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Scan for scheduling conflicts and collaboration opportunities across all platform events.
        </p>
      </div>

      {/* Event selector */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Your Event</label>
            <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an event..." />
              </SelectTrigger>
              <SelectContent>
                {allEvents.filter((e) => e.is_published).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    <span className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {e.title}
                      {e.start_date && (
                        <span className="text-xs text-muted-foreground">
                          ({format(parseISO(e.start_date), "MMM d, yyyy")})
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={runScan} disabled={!selectedEvent || scanning} size="sm" className="shrink-0">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            {scanning ? "Scanning..." : "Rescan"}
          </Button>
        </div>
        {selectedEvent && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {selectedEvent.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(selectedEvent.start_date), "MMM d, yyyy")}
              </span>
            )}
            {getLocation(selectedEvent) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {getLocation(selectedEvent)}
              </span>
            )}
            {selectedEvent.event_type && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {selectedEvent.event_type}
              </Badge>
            )}
          </div>
        )}
      </Card>

      {/* Filter bar */}
      {results.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1 rounded-lg border p-0.5 bg-muted/30">
              <button
                onClick={() => setFilter("both")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  filter === "both" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Both ({results.length})
              </button>
              <button
                onClick={() => setFilter("conflicts")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  filter === "conflicts" ? "bg-red-50 shadow-sm text-red-700" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Conflicts ({conflictCount})
              </button>
              <button
                onClick={() => setFilter("collabs")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  filter === "collabs" ? "bg-teal-50 shadow-sm text-teal-700" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Collabs ({collabCount})
              </button>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter results..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
      )}

      {/* Results list */}
      {scanning && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#6C5CE7]" />
            <p className="text-sm text-muted-foreground">Scanning {allEvents.length} events for conflicts & opportunities...</p>
          </div>
        </div>
      )}

      {!scanning && results.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No results match your filter.
        </div>
      )}

      {!scanning && results.length === 0 && selectedEvent && (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-medium">No conflicts or collab opportunities found</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Your event doesn't overlap with any others on the platform. As more events are added, rescan to check.
            </p>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((result) => {
          const isConflict = result.type === "conflict";
          const ev = result.event;
          return (
            <Card
              key={ev.id}
              className={cn(
                "p-4 border-l-4 transition-shadow hover:shadow-md",
                isConflict ? "border-l-red-500" : "border-l-teal-500",
              )}
            >
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Left: type indicator + info */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Type badge + event title */}
                  <div className="flex items-start gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5",
                        isConflict
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-teal-100 text-teal-700 border-teal-200",
                      )}
                    >
                      {isConflict ? (
                        <><AlertTriangle className="h-3 w-3 mr-1 inline" />Conflict</>
                      ) : (
                        <><Handshake className="h-3 w-3 mr-1 inline" />Collab</>
                      )}
                    </Badge>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm leading-tight">{ev.title}</h3>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {ev.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(ev.start_date), "MMM d, yyyy")}
                      </span>
                    )}
                    {getLocation(ev) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {getLocation(ev)}
                      </span>
                    )}
                    {ev.event_type && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {ev.event_type}
                      </span>
                    )}
                  </div>

                  {/* Reason tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {result.reasons.map((reason, i) => (
                      <span
                        key={i}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-medium",
                          isConflict
                            ? "bg-red-50 text-red-600"
                            : "bg-teal-50 text-teal-600",
                        )}
                      >
                        {reason}
                      </span>
                    ))}
                  </div>

                  {/* AI suggestion */}
                  <div className={cn(
                    "text-xs p-2.5 rounded-md mt-1",
                    isConflict ? "bg-amber-50 text-amber-800" : "bg-teal-50 text-teal-800",
                  )}>
                    <Sparkles className="h-3 w-3 inline mr-1 opacity-70" />
                    {result.aiSuggestion}
                  </div>
                </div>

                {/* Right: score + action */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                  {/* Score ring */}
                  <div className="relative h-12 w-12 shrink-0">
                    <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor"
                        className="text-gray-100" strokeWidth="4" />
                      <circle cx="24" cy="24" r="20" fill="none"
                        stroke="currentColor"
                        className={isConflict ? "text-red-500" : "text-teal-500"}
                        strokeWidth="4"
                        strokeDasharray={`${(result.score / 100) * 125.6} 125.6`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                      {result.score}
                    </span>
                  </div>

                  {!isConflict && selectedEvent && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-teal-300 text-teal-700 hover:bg-teal-50"
                      onClick={() => setPitchModal({ selected: selectedEvent, target: ev })}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Reach Out
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pitch modal */}
      {pitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPitchModal(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Collab Pitch Email</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pitchModal.selected.title} → {pitchModal.target.title}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setPitchModal(null)} className="h-7 w-7 p-0">
                &times;
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 rounded-lg p-4 border text-gray-800 leading-relaxed">
                {generateCollabPitch(pitchModal.selected, pitchModal.target)}
              </pre>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(generateCollabPitch(pitchModal.selected, pitchModal.target));
                  toast.success("Copied to clipboard");
                }}
              >
                Copy
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const pitch = generateCollabPitch(pitchModal.selected, pitchModal.target);
                  const subject = encodeURIComponent(`Collab Opportunity \u2014 ${pitchModal.selected.title} x ${pitchModal.target.title}`);
                  const body = encodeURIComponent(pitch);
                  window.open(`mailto:?subject=${subject}&body=${body}`);
                }}
              >
                <Send className="h-3 w-3 mr-1" />
                Open in Email
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
