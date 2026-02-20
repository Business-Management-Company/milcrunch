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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Target,
  Radar,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ========== types ========== */

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
  score: number;
  dateProximity: number;
  reasons: string[];
  aiSuggestion: string;
}

type FilterMode = "both" | "conflicts" | "collabs";

interface ParsedLocation {
  city: string | null;
  state: string | null;
}

/* ========== constants ========== */

const AUDIENCE_TYPES = [
  "Veteran",
  "Active Duty",
  "Military Spouse",
  "Military Family",
  "General Military",
] as const;

const EVENT_TYPES = [
  "Conference",
  "Meetup",
  "Workshop",
  "Gala",
  "Festival",
  "Other",
] as const;

const RADIUS_OPTIONS = [
  { value: "25", label: "25 miles" },
  { value: "50", label: "50 miles" },
  { value: "100", label: "100 miles" },
  { value: "200", label: "200 miles" },
  { value: "0", label: "Nationwide" },
] as const;

/* ========== region map ========== */

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

/* ========== audience keyword mapping ========== */

const AUDIENCE_KEYWORDS: Record<string, string[]> = {
  Veteran: ["veteran", "vet", "transition", "vso"],
  "Active Duty": ["military", "active duty", "service member", "active-duty", "armed forces"],
  "Military Spouse": ["spouse", "milspouse", "mil-spouse", "partner"],
  "Military Family": ["family", "milspouse", "spouse", "dependent", "mil-family"],
  "General Military": ["military", "veteran", "armed forces", "defense", "service"],
};

function computeAudienceOverlap(selectedAudience: string[], candidateEventType: string | null): number {
  if (!candidateEventType || selectedAudience.length === 0) return 30;
  const et = candidateEventType.toLowerCase();

  // Collect all keywords from selected audience types
  const keywords = new Set<string>();
  for (const aud of selectedAudience) {
    for (const kw of AUDIENCE_KEYWORDS[aud] ?? []) {
      keywords.add(kw);
    }
  }

  let matchCount = 0;
  for (const kw of keywords) {
    if (et.includes(kw)) matchCount++;
  }

  if (matchCount >= 3) return 90;
  if (matchCount >= 2) return 75;
  if (matchCount >= 1) return 55;

  // If "General Military" is selected, give moderate overlap to anything
  if (selectedAudience.includes("General Military")) return 40;
  return 20;
}

/* ========== location parsing ========== */

const US_STATES = new Set(Object.keys(REGION_MAP));

function parseLocationInput(input: string): ParsedLocation {
  const trimmed = input.trim();
  if (!trimmed) return { city: null, state: null };

  // "City, ST" or "City, State"
  const commaMatch = trimmed.match(/^(.+?),\s*([A-Za-z]{2})\s*$/);
  if (commaMatch) {
    const st = commaMatch[2].toUpperCase();
    if (US_STATES.has(st)) return { city: commaMatch[1].trim(), state: st };
  }

  // "City ST" (space separated, state at end)
  const spaceMatch = trimmed.match(/^(.+)\s+([A-Za-z]{2})$/);
  if (spaceMatch) {
    const st = spaceMatch[2].toUpperCase();
    if (US_STATES.has(st)) return { city: spaceMatch[1].trim(), state: st };
  }

  // Just a state code
  if (trimmed.length === 2 && US_STATES.has(trimmed.toUpperCase())) {
    return { city: null, state: trimmed.toUpperCase() };
  }

  // Assume it's a city name without state
  return { city: trimmed, state: null };
}

/* ========== geographic matching ========== */

function geoMatches(
  plan: ParsedLocation,
  candidate: EventRow,
  radiusMiles: number,
): { matches: boolean; reason: string | null; score: number } {
  if (radiusMiles === 0) {
    // Nationwide — everything matches, no geo bonus
    return { matches: true, reason: null, score: 0 };
  }

  const planCity = plan.city?.toLowerCase().trim() ?? null;
  const planState = plan.state?.toUpperCase().trim() ?? null;
  const candCity = candidate.city?.toLowerCase().trim() ?? null;
  const candState = candidate.state?.toUpperCase().trim() ?? null;

  const sameCity = planCity && candCity && planCity === candCity;
  const sameState = planState && candState && planState === candState;
  const planRegion = getRegion(planState);
  const candRegion = getRegion(candState);
  const sameRegion = planRegion && candRegion && planRegion === candRegion;

  if (radiusMiles <= 25) {
    if (sameCity) return { matches: true, reason: "Same city", score: 30 };
    return { matches: false, reason: null, score: 0 };
  }
  if (radiusMiles <= 50) {
    if (sameCity) return { matches: true, reason: "Same city", score: 30 };
    if (sameState) return { matches: true, reason: "Same state", score: 20 };
    return { matches: false, reason: null, score: 0 };
  }
  if (radiusMiles <= 100) {
    if (sameCity) return { matches: true, reason: "Same city", score: 30 };
    if (sameState) return { matches: true, reason: "Same state", score: 20 };
    return { matches: false, reason: null, score: 0 };
  }
  // 200 mi → same region
  if (sameCity) return { matches: true, reason: "Same city", score: 30 };
  if (sameState) return { matches: true, reason: "Same state", score: 20 };
  if (sameRegion) return { matches: true, reason: `Same region (${candRegion})`, score: 12 };
  return { matches: false, reason: null, score: 0 };
}

/* ========== analysis ========== */

interface PlanInput {
  location: ParsedLocation;
  startDate: Date | null;
  endDate: Date | null;
  radiusMiles: number;
  audienceTypes: string[];
  eventType: string;
}

function analyzePlannedEvent(plan: PlanInput, candidate: EventRow): ScanResult | null {
  const candStart = candidate.start_date ? parseISO(candidate.start_date) : null;
  if (!candStart || !plan.startDate) return null;

  const daysDiff = Math.abs(differenceInDays(candStart, plan.startDate));
  const geo = geoMatches(plan.location, candidate, plan.radiusMiles);
  const audienceScore = computeAudienceOverlap(plan.audienceTypes, candidate.event_type);

  const reasons: string[] = [];
  let score = 0;

  // --- CONFLICT detection ---
  const isConflict = daysDiff <= 14 && geo.matches && audienceScore >= 50;

  if (isConflict) {
    // Date proximity score
    if (daysDiff === 0) { score += 40; reasons.push("Same date"); }
    else if (daysDiff <= 3) { score += 35; reasons.push(`${daysDiff} day${daysDiff > 1 ? "s" : ""} apart`); }
    else if (daysDiff <= 7) { score += 25; reasons.push(`${daysDiff} days apart`); }
    else { score += 15; reasons.push(`${daysDiff} days apart`); }

    // Geo score
    score += geo.score;
    if (geo.reason) reasons.push(geo.reason);

    // Audience overlap
    score += Math.round(audienceScore * 0.35);
    reasons.push(`~${audienceScore}% audience overlap`);

    // Static fallback suggestion (AI will replace later)
    let aiSuggestion: string;
    if (daysDiff <= 3 && geo.score >= 20) {
      aiSuggestion = "Direct scheduling conflict. Consider rescheduling to avoid competition, or explore a joint event.";
    } else if (daysDiff <= 7) {
      aiSuggestion = "Close date proximity. Differentiate your messaging and target distinct audience segments.";
    } else {
      aiSuggestion = "Moderate overlap. Cross-promote to capture both audiences.";
    }

    return { type: "conflict", event: candidate, score: Math.min(score, 100), dateProximity: daysDiff, reasons, aiSuggestion };
  }

  // --- COLLAB detection ---
  if (daysDiff > 60) return null;

  const isCollab = (audienceScore >= 30 || geo.matches) && daysDiff > 0;
  if (!isCollab) return null;

  // Proximity bonus
  if (daysDiff <= 7) { score += 20; reasons.push(`${daysDiff} day${daysDiff > 1 ? "s" : ""} apart`); }
  else if (daysDiff <= 21) { score += 15; reasons.push(`${daysDiff} days apart`); }
  else { score += 8; reasons.push(`${daysDiff} days apart`); }

  // Geo synergy
  if (geo.matches && geo.reason) {
    score += geo.score;
    reasons.push(geo.reason);
  }

  // Audience synergy
  if (audienceScore >= 50) { score += 25; reasons.push("Strong audience overlap"); }
  else if (audienceScore >= 30) { score += 15; reasons.push("Overlapping audience"); }

  // Complementary event type
  const candType = (candidate.event_type || "").toLowerCase();
  const planType = plan.eventType.toLowerCase();
  if (planType && candType && planType !== candType) {
    score += 10;
    reasons.push("Complementary format");
  }

  if (score < 15) return null;

  const aiSuggestion = geo.matches
    ? "Shared regional audience could benefit from cross-event promotion or a joint sponsor package."
    : "Similar audiences — consider guest speakers, shared social campaigns, or a joint announcement.";

  return { type: "collab", event: candidate, score: Math.min(score, 100), dateProximity: daysDiff, reasons, aiSuggestion };
}

/* ========== callAnthropic ========== */

async function callAnthropic(system: string, userMessage: string, maxTokens = 4096): Promise<string> {
  const res = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return (data.content?.[0]?.text ?? "").trim();
}

/* ========== component ========== */

export default function ConflictsCollabs() {
  // Form state
  const [locationInput, setLocationInput] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [radius, setRadius] = useState("50");
  const [audienceTypes, setAudienceTypes] = useState<string[]>([]);
  const [eventType, setEventType] = useState("");
  const [eventName, setEventName] = useState("");

  // Data
  const [allEvents, setAllEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [filter, setFilter] = useState<FilterMode>("both");
  const [searchQuery, setSearchQuery] = useState("");
  const [pitchModal, setPitchModal] = useState<{ target: EventRow } | null>(null);
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [generatedPitch, setGeneratedPitch] = useState("");

  // Load all events on mount
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
      setAllEvents((data ?? []) as EventRow[]);
      setLoading(false);
    })();
  }, []);

  // Toggle audience type
  const toggleAudience = (aud: string) => {
    setAudienceTypes((prev) =>
      prev.includes(aud) ? prev.filter((a) => a !== aud) : [...prev, aud],
    );
  };

  // Run scan
  const runScan = async () => {
    if (!locationInput.trim()) {
      toast.error("Enter a city, state, or zip code");
      return;
    }
    if (!dateRange?.from) {
      toast.error("Select an event date");
      return;
    }

    setScanning(true);
    setResults([]);
    setFilter("both");

    const parsedLoc = parseLocationInput(locationInput);
    const plan: PlanInput = {
      location: parsedLoc,
      startDate: dateRange.from,
      endDate: dateRange.to ?? null,
      radiusMiles: Number(radius),
      audienceTypes,
      eventType: eventType || "General",
    };

    // Run local analysis
    const scanResults: ScanResult[] = [];
    for (const candidate of allEvents) {
      const result = analyzePlannedEvent(plan, candidate);
      if (result) scanResults.push(result);
    }

    // Sort: conflicts first, then by score desc
    scanResults.sort((a, b) => {
      if (a.type !== b.type) return a.type === "conflict" ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      return a.dateProximity - b.dateProximity;
    });

    setResults(scanResults);

    const conflicts = scanResults.filter((r) => r.type === "conflict").length;
    const collabs = scanResults.filter((r) => r.type === "collab").length;

    if (scanResults.length === 0) {
      toast.success("No conflicts or collab opportunities found — you're clear!");
    } else {
      toast.info(`Found ${conflicts} conflict${conflicts !== 1 ? "s" : ""} and ${collabs} collab opportunit${collabs !== 1 ? "ies" : "y"}`);
    }

    // Enhance top results with AI suggestions
    if (scanResults.length > 0) {
      try {
        const topResults = scanResults.slice(0, 8);
        const planSummary = {
          name: eventName || "Planned Event",
          date: dateRange.from ? format(dateRange.from, "MMM d, yyyy") : "TBD",
          endDate: dateRange.to ? format(dateRange.to, "MMM d, yyyy") : null,
          location: locationInput,
          audience: audienceTypes.join(", ") || "General Military",
          eventType: eventType || "Event",
        };

        const eventsForAI = topResults.map((r) => ({
          id: r.event.id,
          type: r.type,
          name: r.event.title,
          date: r.event.start_date ? format(parseISO(r.event.start_date), "MMM d, yyyy") : "TBD",
          location: getLocation(r.event),
          eventType: r.event.event_type || "Unknown",
          score: r.score,
          reasons: r.reasons,
        }));

        const aiResp = await callAnthropic(
          `You are an event planning advisor for MilCrunch, a military community platform. Given a planned event and a list of existing events that are flagged as potential conflicts or collaboration opportunities, provide a brief 1-2 sentence actionable suggestion for each.

For CONFLICTS: Suggest specific alternative date windows, differentiation strategies, or how to minimize audience cannibalization. Be specific about dates when possible.
For COLLABS: Suggest specific partnership ideas like cross-promotion tactics, shared speakers, bundled tickets, joint sponsor packages, or co-marketing campaigns.

Return ONLY a JSON array: [{"id":"event-id","suggestion":"your suggestion"}]`,
          JSON.stringify({ plannedEvent: planSummary, events: eventsForAI }),
          2048,
        );

        const cleaned = aiResp.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
        const suggestions: { id: string; suggestion: string }[] = JSON.parse(cleaned);
        const suggMap = new Map(suggestions.map((s) => [s.id, s.suggestion]));

        // Update results with AI suggestions
        setResults((prev) =>
          prev.map((r) => {
            const aiSug = suggMap.get(r.event.id);
            return aiSug ? { ...r, aiSuggestion: aiSug } : r;
          }),
        );
      } catch (err) {
        console.warn("[ConflictsCollabs] AI enhancement failed, using fallback suggestions:", err);
        // Keep static suggestions already set
      }
    }

    setScanning(false);
  };

  // Generate AI collab pitch
  const generatePitch = async (target: EventRow) => {
    setPitchModal({ target });
    setGeneratingPitch(true);
    setGeneratedPitch("");

    const planDate = dateRange?.from ? format(dateRange.from, "MMM d, yyyy") : "TBD";
    const planEndDate = dateRange?.to ? ` - ${format(dateRange.to, "MMM d, yyyy")}` : "";
    const targetDate = target.start_date ? format(parseISO(target.start_date), "MMM d, yyyy") : "TBD";
    const planName = eventName || "our upcoming event";

    try {
      const pitch = await callAnthropic(
        `You are writing a collaboration outreach email for a military community event organizer on MilCrunch. Write a professional, warm, and specific collaboration pitch email. Include a subject line. Keep it concise but compelling. Suggest 3-4 specific collaboration ideas relevant to these events.`,
        `Write a collab pitch email from:
- Event: "${planName}" on ${planDate}${planEndDate} in ${locationInput || "TBD"}
- Type: ${eventType || "Event"}, Audience: ${audienceTypes.join(", ") || "Military community"}

To the organizers of:
- Event: "${target.title}" on ${targetDate} in ${getLocation(target) || "TBD"}
- Type: ${target.event_type || "Event"}

Both events serve overlapping military audiences. Write the email.`,
        1500,
      );
      setGeneratedPitch(pitch);
    } catch (err) {
      console.error("[ConflictsCollabs] Pitch generation failed:", err);
      // Fallback to static template
      setGeneratedPitch(
        `Subject: Collaboration Opportunity — ${planName} x ${target.title}\n\nHi there,\n\nI'm reaching out from ${planName} (${planDate}, ${locationInput || "location TBD"}).\n\nWe noticed your upcoming event, ${target.title} (${targetDate}, ${getLocation(target) || "location TBD"}), targets a similar military community audience. We think there's a great opportunity to collaborate:\n\n- Cross-promote to each other's attendee lists\n- Share speakers or panelists between events\n- Offer bundled ticket discounts for both events\n- Co-create content leading up to both events\n\nWould you be open to a quick call to explore this?\n\nBest,\n[Your Name]`,
      );
    } finally {
      setGeneratingPitch(false);
    }
  };

  // Filtered results
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
          Plan a new event and scan for scheduling conflicts or collaboration opportunities across all platform events.
        </p>
      </div>

      {/* Planning form */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-purple-600" />
          <h2 className="font-semibold text-sm">Plan Your Event</h2>
        </div>

        <div className="space-y-4">
          {/* Row 1: Location, Date, Radius */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Location (City, State or Zip)
              </label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="San Diego, CA"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Event Date or Date Range
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10",
                      !dateRange?.from && "text-muted-foreground",
                    )}
                  >
                    <Calendar className="mr-2 h-3.5 w-3.5" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
                      ) : (
                        format(dateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      "Pick a date"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Mile Radius
              </label>
              <Select value={radius} onValueChange={setRadius}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Audience Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Audience Type
            </label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_TYPES.map((aud) => (
                <button
                  key={aud}
                  onClick={() => toggleAudience(aud)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    audienceTypes.includes(aud)
                      ? "bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-600 dark:text-purple-300"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {aud}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Event Type + Event Name + Scan button */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Event Type
              </label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Event Name <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <Input
                placeholder="e.g. MilCrunch Veterans Summit"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
            </div>

            <Button
              onClick={runScan}
              disabled={scanning || !locationInput.trim() || !dateRange?.from}
              className="bg-purple-600 hover:bg-purple-700 text-white h-10 px-5"
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Radar className="h-4 w-4 mr-2" />
              )}
              {scanning ? "Scanning..." : "Scan for Conflicts & Collabs"}
            </Button>
          </div>
        </div>
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

      {/* Scanning state */}
      {scanning && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
            <p className="text-sm text-muted-foreground">
              Scanning {allEvents.length} events for conflicts & opportunities...
            </p>
          </div>
        </div>
      )}

      {/* No results after filter */}
      {!scanning && results.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No results match your filter.
        </div>
      )}

      {/* No results at all */}
      {!scanning && results.length === 0 && dateRange?.from && locationInput.trim() && (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-medium">All clear!</p>
            <p className="text-sm text-muted-foreground max-w-md">
              No scheduling conflicts or collaboration opportunities found for your planned event.
              You&apos;re in the clear to proceed.
            </p>
          </div>
        </Card>
      )}

      {/* Result cards */}
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
                {/* Left: info */}
                <div className="flex-1 min-w-0 space-y-2">
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

                  {!isConflict && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-teal-300 text-teal-700 hover:bg-teal-50"
                      onClick={() => generatePitch(ev)}
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
                  {eventName || "Your Event"} → {pitchModal.target.title}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setPitchModal(null)} className="h-7 w-7 p-0">
                &times;
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {generatingPitch ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600 mr-2" />
                  <span className="text-sm text-muted-foreground">Generating pitch with AI...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 rounded-lg p-4 border text-gray-800 leading-relaxed">
                  {generatedPitch}
                </pre>
              )}
            </div>
            {!generatingPitch && generatedPitch && (
              <div className="p-4 border-t flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPitch);
                    toast.success("Copied to clipboard");
                  }}
                >
                  Copy
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const subjectMatch = generatedPitch.match(/^Subject:\s*(.+)/m);
                    const subject = encodeURIComponent(subjectMatch?.[1] || `Collab Opportunity — ${eventName || "Our Event"} x ${pitchModal.target.title}`);
                    const body = encodeURIComponent(generatedPitch.replace(/^Subject:.+\n\n?/, ""));
                    window.open(`mailto:?subject=${subject}&body=${body}`);
                  }}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Open in Email
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
