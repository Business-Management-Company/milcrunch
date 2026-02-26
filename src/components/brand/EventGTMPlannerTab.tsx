import { useState, useRef, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, ShieldAlert, CalendarCheck, Copy, Printer, Sparkles, Search,
  AlertTriangle, CheckCircle2, FileText, Shield, Info, MapPin, Link2, Save,
  Handshake, Send, Filter, Users, Radar, Landmark, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, isWithinInterval, addDays, subDays } from "date-fns";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ---------- types ---------- */
interface Props {
  eventId: string;
  eventTitle: string;
  eventDescription: string | null;
  eventType: string | null;
  startDate: string | null;
  endDate: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  capacity: number | null;
  speakerCount: number;
  sponsorCount: number;
  registrationCount: number;
}

interface HolidayConflict {
  name: string;
  date: Date;
  proximity: "same-day" | "within-3-days";
}

interface AIEvent {
  name: string;
  date: string;
  location: string;
  source: string;
  type: "conflict" | "collab";
  severity: "high" | "medium" | "low";
  reason: string;
  suggestion: string;
}

type FilterMode = "all" | "conflicts" | "collabs";

interface ObservanceConflict {
  name: string;
  date: Date;
  daysAway: number;
  direction: "before" | "after" | "same-day";
  suggestion: "leverage" | "caution";
}

interface ConflictResults {
  holidays: HolidayConflict[];
  observances: ObservanceConflict[];
  aiEvents: AIEvent[];
  aiFailed: boolean;
}

/* ---------- holidays ---------- */
function getHolidays(year: number): { name: string; date: Date }[] {
  // Fixed-date holidays
  const fixed = [
    { name: "New Year's Day", month: 0, day: 1 },
    { name: "Independence Day", month: 6, day: 4 },
    { name: "Veterans Day", month: 10, day: 11 },
    { name: "Christmas Day", month: 11, day: 25 },
    { name: "Armed Forces Day", month: 4, day: 17 }, // 3rd Saturday of May (approx)
    { name: "Flag Day", month: 5, day: 14 },
    { name: "Patriot Day (9/11)", month: 8, day: 11 },
    { name: "Pearl Harbor Remembrance Day", month: 11, day: 7 },
    { name: "National Guard Birthday", month: 11, day: 13 },
  ];

  // Nth-weekday holidays
  const nthWeekday = (m: number, weekday: number, n: number): Date => {
    const first = new Date(year, m, 1);
    let day = 1 + ((weekday - first.getDay() + 7) % 7);
    day += (n - 1) * 7;
    return new Date(year, m, day);
  };
  const lastMonday = (m: number): Date => {
    const last = new Date(year, m + 1, 0);
    const diff = (last.getDay() - 1 + 7) % 7;
    return new Date(year, m, last.getDate() - diff);
  };

  return [
    ...fixed.map((h) => ({ name: h.name, date: new Date(year, h.month, h.day) })),
    { name: "Martin Luther King Jr. Day", date: nthWeekday(0, 1, 3) },
    { name: "Presidents' Day", date: nthWeekday(1, 1, 3) },
    { name: "Memorial Day", date: lastMonday(4) },
    { name: "Labor Day", date: nthWeekday(8, 1, 1) },
    { name: "Columbus Day", date: nthWeekday(9, 1, 2) },
    { name: "Thanksgiving", date: nthWeekday(10, 4, 4) },
  ];
}

function findHolidayConflicts(startDate: string | null, endDate: string | null): HolidayConflict[] {
  if (!startDate) return [];
  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : start;
  const years = new Set([start.getFullYear(), end.getFullYear()]);
  const conflicts: HolidayConflict[] = [];

  for (const y of years) {
    for (const h of getHolidays(y)) {
      const eventInterval = { start: subDays(start, 0), end: addDays(end, 0) };
      if (isWithinInterval(h.date, eventInterval)) {
        conflicts.push({ name: h.name, date: h.date, proximity: "same-day" });
      } else {
        const nearInterval = { start: subDays(start, 3), end: addDays(end, 3) };
        if (isWithinInterval(h.date, nearInterval)) {
          conflicts.push({ name: h.name, date: h.date, proximity: "within-3-days" });
        }
      }
    }
  }
  return conflicts;
}

/* ---------- military installations by state ---------- */
const INSTALLATIONS_BY_STATE: Record<string, { name: string; city: string }[]> = {
  "Alabama": [{ name: "Fort Novosel", city: "Ozark" }, { name: "Redstone Arsenal", city: "Huntsville" }],
  "Alaska": [{ name: "Joint Base Elmendorf-Richardson", city: "Anchorage" }, { name: "Fort Wainwright", city: "Fairbanks" }],
  "Arizona": [{ name: "Fort Huachuca", city: "Sierra Vista" }, { name: "Davis-Monthan AFB", city: "Tucson" }, { name: "Luke AFB", city: "Glendale" }],
  "Arkansas": [{ name: "Little Rock AFB", city: "Jacksonville" }],
  "California": [{ name: "Camp Pendleton", city: "Oceanside" }, { name: "Naval Base San Diego", city: "San Diego" }, { name: "Edwards AFB", city: "Edwards" }, { name: "Travis AFB", city: "Fairfield" }, { name: "Fort Irwin", city: "Barstow" }, { name: "Vandenberg SFB", city: "Lompoc" }, { name: "NAS Lemoore", city: "Lemoore" }],
  "Colorado": [{ name: "Fort Carson", city: "Colorado Springs" }, { name: "Peterson SFB", city: "Colorado Springs" }, { name: "Buckley SFB", city: "Aurora" }, { name: "Schriever SFB", city: "Colorado Springs" }],
  "Connecticut": [{ name: "Naval Submarine Base New London", city: "Groton" }],
  "Delaware": [{ name: "Dover AFB", city: "Dover" }],
  "Florida": [{ name: "MacDill AFB", city: "Tampa" }, { name: "Eglin AFB", city: "Valparaiso" }, { name: "NAS Jacksonville", city: "Jacksonville" }, { name: "NAS Pensacola", city: "Pensacola" }, { name: "Patrick SFB", city: "Cocoa Beach" }, { name: "Hurlburt Field", city: "Mary Esther" }, { name: "Tyndall AFB", city: "Panama City" }],
  "Georgia": [{ name: "Fort Moore", city: "Columbus" }, { name: "Fort Stewart", city: "Hinesville" }, { name: "Moody AFB", city: "Valdosta" }, { name: "Robins AFB", city: "Warner Robins" }, { name: "Hunter Army Airfield", city: "Savannah" }, { name: "NAS Kings Bay", city: "Kings Bay" }],
  "Hawaii": [{ name: "Joint Base Pearl Harbor-Hickam", city: "Honolulu" }, { name: "Schofield Barracks", city: "Wahiawa" }, { name: "Marine Corps Base Hawaii", city: "Kaneohe" }],
  "Idaho": [{ name: "Mountain Home AFB", city: "Mountain Home" }],
  "Illinois": [{ name: "Scott AFB", city: "Belleville" }, { name: "Naval Station Great Lakes", city: "North Chicago" }],
  "Indiana": [{ name: "Crane Naval Surface Warfare Center", city: "Crane" }],
  "Kansas": [{ name: "Fort Riley", city: "Junction City" }, { name: "McConnell AFB", city: "Wichita" }, { name: "Fort Leavenworth", city: "Leavenworth" }],
  "Kentucky": [{ name: "Fort Campbell", city: "Hopkinsville" }, { name: "Fort Knox", city: "Radcliff" }],
  "Louisiana": [{ name: "Fort Johnson", city: "Leesville" }, { name: "Barksdale AFB", city: "Bossier City" }, { name: "NAS JRB New Orleans", city: "New Orleans" }],
  "Maine": [{ name: "Portsmouth Naval Shipyard", city: "Kittery" }],
  "Maryland": [{ name: "Fort Meade", city: "Fort Meade" }, { name: "Joint Base Andrews", city: "Camp Springs" }, { name: "Aberdeen Proving Ground", city: "Aberdeen" }, { name: "NAS Patuxent River", city: "Patuxent River" }],
  "Massachusetts": [{ name: "Hanscom AFB", city: "Bedford" }, { name: "Joint Base Cape Cod", city: "Buzzards Bay" }],
  "Michigan": [{ name: "Selfridge ANGB", city: "Harrison Township" }],
  "Mississippi": [{ name: "Keesler AFB", city: "Biloxi" }, { name: "Columbus AFB", city: "Columbus" }, { name: "NAS Meridian", city: "Meridian" }],
  "Missouri": [{ name: "Whiteman AFB", city: "Knob Noster" }, { name: "Fort Leonard Wood", city: "Waynesville" }],
  "Montana": [{ name: "Malmstrom AFB", city: "Great Falls" }],
  "Nebraska": [{ name: "Offutt AFB", city: "Bellevue" }],
  "Nevada": [{ name: "Nellis AFB", city: "Las Vegas" }, { name: "Creech AFB", city: "Indian Springs" }],
  "New Hampshire": [{ name: "Portsmouth Naval Shipyard", city: "Portsmouth" }],
  "New Jersey": [{ name: "Joint Base McGuire-Dix-Lakehurst", city: "Wrightstown" }],
  "New Mexico": [{ name: "Holloman AFB", city: "Alamogordo" }, { name: "Cannon AFB", city: "Clovis" }, { name: "Kirtland AFB", city: "Albuquerque" }, { name: "White Sands Missile Range", city: "Las Cruces" }],
  "New York": [{ name: "Fort Drum", city: "Watertown" }, { name: "West Point", city: "West Point" }],
  "North Carolina": [{ name: "Fort Liberty", city: "Fayetteville" }, { name: "Camp Lejeune", city: "Jacksonville" }, { name: "MCAS Cherry Point", city: "Havelock" }, { name: "Seymour Johnson AFB", city: "Goldsboro" }],
  "North Dakota": [{ name: "Minot AFB", city: "Minot" }, { name: "Grand Forks AFB", city: "Grand Forks" }],
  "Ohio": [{ name: "Wright-Patterson AFB", city: "Dayton" }],
  "Oklahoma": [{ name: "Fort Sill", city: "Lawton" }, { name: "Tinker AFB", city: "Oklahoma City" }, { name: "Altus AFB", city: "Altus" }, { name: "Vance AFB", city: "Enid" }],
  "Pennsylvania": [{ name: "Carlisle Barracks", city: "Carlisle" }],
  "Rhode Island": [{ name: "Naval Station Newport", city: "Newport" }],
  "South Carolina": [{ name: "Fort Jackson", city: "Columbia" }, { name: "Joint Base Charleston", city: "Charleston" }, { name: "MCAS Beaufort", city: "Beaufort" }, { name: "Shaw AFB", city: "Sumter" }],
  "South Dakota": [{ name: "Ellsworth AFB", city: "Rapid City" }],
  "Tennessee": [{ name: "NSA Mid-South", city: "Millington" }],
  "Texas": [{ name: "Fort Cavazos", city: "Killeen" }, { name: "Fort Sam Houston", city: "San Antonio" }, { name: "Fort Bliss", city: "El Paso" }, { name: "Dyess AFB", city: "Abilene" }, { name: "Laughlin AFB", city: "Del Rio" }, { name: "Sheppard AFB", city: "Wichita Falls" }, { name: "Joint Base San Antonio", city: "San Antonio" }, { name: "NAS Corpus Christi", city: "Corpus Christi" }, { name: "NAS JRB Fort Worth", city: "Fort Worth" }],
  "Utah": [{ name: "Hill AFB", city: "Ogden" }, { name: "Dugway Proving Ground", city: "Dugway" }],
  "Virginia": [{ name: "Naval Station Norfolk", city: "Norfolk" }, { name: "Fort Gregg-Adams", city: "Petersburg" }, { name: "Joint Base Langley-Eustis", city: "Hampton" }, { name: "MCB Quantico", city: "Quantico" }, { name: "Fort Belvoir", city: "Fort Belvoir" }, { name: "NAS Oceana", city: "Virginia Beach" }, { name: "Pentagon", city: "Arlington" }, { name: "Dam Neck", city: "Virginia Beach" }],
  "Washington": [{ name: "Joint Base Lewis-McChord", city: "Tacoma" }, { name: "Naval Base Kitsap", city: "Bremerton" }, { name: "Fairchild AFB", city: "Spokane" }, { name: "NAS Whidbey Island", city: "Oak Harbor" }],
  "West Virginia": [{ name: "Yeager Airport ANG", city: "Charleston" }],
  "Wisconsin": [{ name: "Fort McCoy", city: "Sparta" }],
  "Wyoming": [{ name: "F.E. Warren AFB", city: "Cheyenne" }],
  "District of Columbia": [{ name: "Joint Base Anacostia-Bolling", city: "Washington" }, { name: "Fort McNair", city: "Washington" }],
};

function getNearbyBases(eventState: string | null): { name: string; city: string }[] {
  if (!eventState) return [];
  // Try exact match first, then partial
  const normalize = (s: string) => s.trim().toLowerCase();
  const stateNorm = normalize(eventState);
  for (const [key, bases] of Object.entries(INSTALLATIONS_BY_STATE)) {
    if (normalize(key) === stateNorm) return bases;
  }
  // Abbreviation fallback
  const ABBREV: Record<string, string> = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
    CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
    HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
    KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
    MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
    MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
    NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
    OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
    SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
    VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
    DC: "District of Columbia",
  };
  const fullName = ABBREV[eventState.trim().toUpperCase()];
  if (fullName && INSTALLATIONS_BY_STATE[fullName]) return INSTALLATIONS_BY_STATE[fullName];
  return [];
}

/* ---------- military observances (7-day window) ---------- */
function getMilitaryObservances(year: number): { name: string; date: Date }[] {
  const nthWeekday = (m: number, weekday: number, n: number): Date => {
    const first = new Date(year, m, 1);
    let day = 1 + ((weekday - first.getDay() + 7) % 7);
    day += (n - 1) * 7;
    return new Date(year, m, day);
  };
  const lastWeekday = (m: number, weekday: number): Date => {
    const last = new Date(year, m + 1, 0);
    const diff = (last.getDay() - weekday + 7) % 7;
    return new Date(year, m, last.getDate() - diff);
  };

  // Military Spouse Appreciation Day: Friday before Mother's Day (2nd Sunday of May)
  const mothersDay = nthWeekday(4, 0, 2);
  const milSpouseDay = new Date(mothersDay);
  milSpouseDay.setDate(milSpouseDay.getDate() - 2); // Friday before Sunday

  return [
    { name: "Veterans Day", date: new Date(year, 10, 11) },
    { name: "Memorial Day", date: lastWeekday(4, 1) }, // Last Monday of May
    { name: "Armed Forces Day", date: nthWeekday(4, 6, 3) }, // 3rd Saturday of May
    { name: "Military Spouse Appreciation Day", date: milSpouseDay },
    { name: "Gold Star Mother's Day", date: lastWeekday(8, 0) }, // Last Sunday of September
    { name: "POW/MIA Recognition Day", date: nthWeekday(8, 5, 3) }, // 3rd Friday of September
    { name: "Pearl Harbor Remembrance Day", date: new Date(year, 11, 7) },
  ];
}

function findObservanceConflicts(startDate: string | null, endDate: string | null): ObservanceConflict[] {
  if (!startDate) return [];
  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : start;
  const years = new Set([start.getFullYear(), end.getFullYear()]);
  const conflicts: ObservanceConflict[] = [];

  for (const y of years) {
    for (const obs of getMilitaryObservances(y)) {
      const obsTime = obs.date.getTime();
      const startTime = start.getTime();
      const endTime = end.getTime();
      const msPerDay = 86400000;

      // Check if observance falls during event
      if (obsTime >= startTime && obsTime <= endTime) {
        conflicts.push({ name: obs.name, date: obs.date, daysAway: 0, direction: "same-day", suggestion: "leverage" });
        continue;
      }

      // Check 7-day window before event start
      const daysBefore = Math.round((startTime - obsTime) / msPerDay);
      if (daysBefore > 0 && daysBefore <= 7) {
        conflicts.push({
          name: obs.name, date: obs.date, daysAway: daysBefore,
          direction: "before",
          suggestion: daysBefore <= 3 ? "leverage" : "caution",
        });
        continue;
      }

      // Check 7-day window after event end
      const daysAfter = Math.round((obsTime - endTime) / msPerDay);
      if (daysAfter > 0 && daysAfter <= 7) {
        conflicts.push({
          name: obs.name, date: obs.date, daysAway: daysAfter,
          direction: "after",
          suggestion: daysAfter <= 3 ? "leverage" : "caution",
        });
      }
    }
  }
  return conflicts;
}

/* ---------- Anthropic helper ---------- */
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

/* ---------- source icon helper ---------- */
function sourceIcon(source: string) {
  const s = source.toLowerCase();
  if (s.includes("chamber")) return <Landmark className="h-3 w-3" />;
  if (s.includes("military") || s.includes("installation")) return <Shield className="h-3 w-3" />;
  if (s.includes("facebook") || s.includes("community")) return <Users className="h-3 w-3" />;
  if (s.includes("milcrunch")) return <CalendarCheck className="h-3 w-3" />;
  return <Radar className="h-3 w-3" />;
}

/* ── Collapsible section wrapper ── */
function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 group w-full text-left"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            open && "rotate-90",
          )}
        />
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
          {count != null && count > 0 && (
            <span className="ml-1.5 text-[10px] font-semibold normal-case tracking-normal">({count})</span>
          )}
        </p>
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================================== */
export default function EventGTMPlannerTab({
  eventId,
  eventTitle,
  eventDescription,
  eventType,
  startDate,
  endDate,
  venue,
  city,
  state,
  capacity,
  speakerCount,
  sponsorCount,
  registrationCount,
}: Props) {
  /* Conflict Scanner */
  const [scanning, setScanning] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictResults | null>(null);
  const [dateWindow, setDateWindow] = useState<"15" | "30" | "60">("15");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  /* Pitch email */
  const [pitchTarget, setPitchTarget] = useState<AIEvent | null>(null);
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [generatedPitch, setGeneratedPitch] = useState("");

  /* GTM Strategy */
  const [generatingGTM, setGeneratingGTM] = useState(false);
  const [gtmPlan, setGtmPlan] = useState<string | null>(null);

  /* Supervisor Summary */
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const gtmRef = useRef<HTMLDivElement>(null);

  /* Share state */
  const [sharing, setSharing] = useState(false);

  /* Super admin demo persistence */
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    if (!isSuperAdmin) return;
    try {
      const savedConflicts = localStorage.getItem("demo_conflicts");
      const savedGtm = localStorage.getItem("demo_gtm");
      const savedSummary = localStorage.getItem("demo_summary");
      if (savedConflicts) {
        const parsed = JSON.parse(savedConflicts);
        setConflicts({
          holidays: parsed.holidays ?? [],
          observances: parsed.observances ?? [],
          aiEvents: parsed.aiEvents ?? [],
          aiFailed: parsed.aiFailed ?? false,
        });
      }
      if (savedGtm) setGtmPlan(savedGtm);
      if (savedSummary) setSummary(savedSummary);
    } catch { /* ignore parse errors */ }
  }, [isSuperAdmin]);

  const saveDemoState = (key: string, value: unknown) => {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    toast.success("Saved as demo state");
  };

  const location = [city, state].filter(Boolean).join(", ");
  const dateRange = startDate
    ? endDate && endDate !== startDate
      ? `${format(parseISO(startDate), "MMM d, yyyy")} – ${format(parseISO(endDate), "MMM d, yyyy")}`
      : format(parseISO(startDate), "MMM d, yyyy")
    : "TBD";

  /* Filtered AI events */
  const filteredAIEvents = useMemo(() => {
    const list = conflicts?.aiEvents ?? [];
    if (filterMode === "conflicts") return list.filter((e) => e.type === "conflict");
    if (filterMode === "collabs") return list.filter((e) => e.type === "collab");
    return list;
  }, [conflicts, filterMode]);

  const aiConflictCount = conflicts?.aiEvents?.filter((e) => e.type === "conflict").length ?? 0;
  const aiCollabCount = conflicts?.aiEvents?.filter((e) => e.type === "collab").length ?? 0;

  /* ---- Conflicts & Collabs Scanner ---- */
  const runConflictScan = async () => {
    if (!startDate) {
      toast.error("Set an event date to enable conflict scanning");
      return;
    }

    setScanning(true);
    setConflicts(null);
    setFilterMode("all");

    try {
      // 1. Local checks (instant)
      const holidays = findHolidayConflicts(startDate, endDate);
      const observances = findObservanceConflicts(startDate, endDate);

      // 2. AI-powered multi-source scan
      let aiEvents: AIEvent[] = [];
      let aiFailed = false;

      const nearbyBases = getNearbyBases(state);
      const baseContext = nearbyBases.length > 0
        ? `\nNearby military installations: ${nearbyBases.slice(0, 5).map((b) => `${b.name} (${b.city})`).join(", ")}.`
        : "";

      const windowDays = Number(dateWindow);

      try {
        const aiResp = await callAnthropic(
          `You are an event intelligence tool for military community event planners. Given a planned event's details, generate realistic competing events (conflicts) and potential collaboration opportunities (collabs) within a specified date window, as if you searched Eventbrite, Facebook Events, military installation calendars, local Chamber of Commerce event calendars, MilSpouse Network groups, and the MilCrunch Calendar.

Return ONLY a valid JSON array of event objects. Each event:
{
  "name": "Event Name",
  "date": "Mon DD, YYYY",
  "location": "City, ST",
  "source": "Eventbrite" | "Facebook Events" | "Military Installation Calendar" | "MilSpouse Network" | "MilCrunch Calendar" | "Chamber of Commerce",
  "type": "conflict" | "collab",
  "severity": "high" | "medium" | "low",
  "reason": "Brief explanation of why this is a conflict or collab opportunity",
  "suggestion": "Actionable recommendation for the event planner"
}

Guidelines:
- Only generate events that fall within ${windowDays} days before to 7 days after the planned event date
- Generate 8-15 realistic events, mix of conflicts and collabs
- For conflicts: events competing for the same audience in the same timeframe and area
- For collabs: complementary events good for cross-promotion, shared speakers, or joint marketing
- Include events from at least 3 different sources
- Military installation events should reference real bases near the location
- Severity: high = same week and nearby, medium = same month or overlapping audience, low = tangential
- Make events realistic with specific names, real-sounding dates within the timeframe, and plausible venues
- Include both military-specific and civilian events that could attract a military audience
- Include 1-3 Chamber of Commerce events (networking mixers, business expos, small business workshops)
- Chamber of Commerce events should be COLLAB when they serve overlapping audiences (veteran business owners, military spouse entrepreneurs)
- Chamber of Commerce events should be CONFLICT only when they directly compete for the same date, location, and audience`,
          `Planned event details:
- Name: "${eventTitle}"
- Type: ${eventType || "General"}
- Date: ${dateRange}
- Location: ${venue ? `${venue}, ` : ""}${location || "TBD"}
- Capacity: ${capacity || "TBD"}
- Description: ${eventDescription || "N/A"}
- Date Window: ${windowDays} days before to 7 days after event date${baseContext}

Generate realistic competing events and collaboration opportunities within the date window.`,
          4096,
        );

        const cleaned = aiResp.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
        const parsed = JSON.parse(cleaned);
        aiEvents = (Array.isArray(parsed) ? parsed : parsed.events || []).filter(
          (e: any) => e.name && e.type && (e.type === "conflict" || e.type === "collab"),
        );
      } catch (e) {
        console.warn("[GTM] AI scan failed:", e);
        aiFailed = true;
      }

      setConflicts({ holidays, observances, aiEvents, aiFailed });

      const total = holidays.length + observances.length + aiEvents.length;
      if (total === 0) {
        toast.success("No conflicts or collabs detected!");
      } else {
        const parts: string[] = [];
        if (holidays.length) parts.push(`${holidays.length} holiday conflict${holidays.length > 1 ? "s" : ""}`);
        if (observances.length) parts.push(`${observances.length} observance${observances.length > 1 ? "s" : ""}`);
        const extConflicts = aiEvents.filter((e) => e.type === "conflict").length;
        const extCollabs = aiEvents.filter((e) => e.type === "collab").length;
        if (extConflicts) parts.push(`${extConflicts} competing event${extConflicts > 1 ? "s" : ""}`);
        if (extCollabs) parts.push(`${extCollabs} collab opportunit${extCollabs > 1 ? "ies" : "y"}`);
        toast.info(`Found ${parts.join(", ")}`);
      }
    } catch (e) {
      console.error("[GTM] Conflict scan error:", e);
      toast.error("Conflict scan failed");
    } finally {
      setScanning(false);
    }
  };

  /* ---- Generate collab pitch email ---- */
  const generateCollabPitch = async (ev: AIEvent) => {
    setPitchTarget(ev);
    setGeneratingPitch(true);
    setGeneratedPitch("");

    const isChamber = ev.source.toLowerCase().includes("chamber");
    const chamberContext = isChamber
      ? `\n\nIMPORTANT: This is a Chamber of Commerce event. Emphasize co-marketing opportunities targeting veteran-owned businesses and military spouse entrepreneurs in the ${location || "local"} area. Suggest joint outreach to veteran business owners, military spouse entrepreneur networks, and local business community leaders.`
      : "";

    try {
      const pitch = await callAnthropic(
        `You are writing a collaboration outreach email for a military community event organizer on MilCrunch. Write a professional, warm, and specific collaboration pitch email. Include a subject line. Keep it concise but compelling. Suggest 3-4 specific collaboration ideas relevant to these events.${chamberContext}`,
        `Write a collab pitch email from:
- Event: "${eventTitle}" on ${dateRange} in ${location || "TBD"}
- Type: ${eventType || "Event"}

To the organizers of:
- Event: "${ev.name}" on ${ev.date} in ${ev.location}
- Source: ${ev.source}

Both events serve overlapping military audiences. Write the email.`,
        1500,
      );
      setGeneratedPitch(pitch);
    } catch (err) {
      console.error("[GTM] Pitch generation failed:", err);
      setGeneratedPitch(
        `Subject: Collaboration Opportunity — ${eventTitle} x ${ev.name}\n\nHi there,\n\nI'm reaching out from ${eventTitle} (${dateRange}, ${location || "location TBD"}).\n\nWe noticed your upcoming event, ${ev.name} (${ev.date}, ${ev.location}), targets a similar military community audience. We think there's a great opportunity to collaborate:\n\n- Cross-promote to each other's attendee lists\n- Share speakers or panelists between events\n- Offer bundled ticket discounts for both events\n- Co-create content leading up to both events\n\nWould you be open to a quick call to explore this?\n\nBest,\n[Your Name]`,
      );
    } finally {
      setGeneratingPitch(false);
    }
  };

  /* ---- GTM Strategy ---- */
  const generateGTM = async () => {
    setGeneratingGTM(true);
    setGtmPlan(null);
    try {
      const conflictContext = conflicts
        ? `\n\nKnown scheduling conflicts:\n${
            conflicts.holidays.map((h) => `- Holiday: ${h.name} (${format(h.date, "MMM d, yyyy")}, ${h.proximity})`).join("\n")
          }${
            conflicts.aiEvents.filter((e) => e.type === "conflict").length > 0
              ? "\n" + conflicts.aiEvents
                  .filter((e) => e.type === "conflict")
                  .map((e) => `- Competing event: ${e.name} on ${e.date} in ${e.location} (${e.severity} severity, source: ${e.source})`).join("\n")
              : ""
          }${
            conflicts.aiEvents.filter((e) => e.type === "collab").length > 0
              ? "\n\nPotential collaboration opportunities:\n" + conflicts.aiEvents
                  .filter((e) => e.type === "collab")
                  .map((e) => `- Collab: ${e.name} on ${e.date} in ${e.location} (${e.reason})`).join("\n")
              : ""
          }${
            conflicts.observances.length > 0
              ? "\n" + conflicts.observances.map((o) => `- Military observance: ${o.name} on ${format(o.date, "MMM d, yyyy")} (${o.daysAway === 0 ? "during event" : `${o.daysAway} days ${o.direction}`}, suggestion: ${o.suggestion})`).join("\n")
              : ""
          }`
        : "";

      const plan = await callAnthropic(
        `You are a Go-To-Market strategist specializing in military and veteran community events. You create detailed, actionable GTM plans tuned for military/veteran audiences — referencing VSOs (Veterans Service Organizations), base MWR offices, mil-specific media outlets, military influencer networks, and DoD community channels.`,
        `Create a comprehensive Go-To-Market plan for this event:

**Event:** ${eventTitle}
**Type:** ${eventType || "General"}
**Date:** ${dateRange}
**Location:** ${venue ? `${venue}, ` : ""}${location || "TBD"}
**Capacity:** ${capacity || "TBD"}
**Description:** ${eventDescription || "N/A"}

Current status:
- ${speakerCount} speaker(s) confirmed
- ${sponsorCount} sponsor(s) secured
- ${registrationCount} registration(s) received
${conflictContext}

Structure the plan with these 10 sections:
1. **Executive Summary** — 2-3 sentence overview of the GTM approach
2. **Target Segments** — Primary and secondary audience segments with estimated reach
3. **Timeline** — Week-by-week marketing timeline leading up to the event
4. **Channels** — Specific marketing channels ranked by expected ROI (include mil-specific channels)
5. **Content Strategy** — Content calendar with specific post types, themes, and messaging
6. **Partnerships** — VSOs, base MWR offices, mil influencers, and organizations to partner with
7. **Registration Tactics** — Strategies to drive registrations (early bird, group discounts, unit referrals)
8. **Risk Mitigation** — Potential risks and contingency plans (including any detected conflicts)
9. **Budget Allocation** — Suggested budget breakdown by channel (percentages)
10. **KPIs & Success Metrics** — Measurable targets for each phase

Be specific, actionable, and realistic. Reference actual military/veteran organizations and channels where appropriate.`,
        4096
      );
      setGtmPlan(plan);
      toast.success("GTM plan generated");
    } catch (e) {
      console.error("[GTM] Strategy generation error:", e);
      toast.error("Failed to generate GTM plan");
    } finally {
      setGeneratingGTM(false);
    }
  };

  /* ---- Supervisor Summary ---- */
  const generateSummary = async () => {
    setGeneratingSummary(true);
    setSummary(null);
    try {
      const brief = await callAnthropic(
        `You write military-style executive briefings. Use clear, concise language. Structure information for rapid consumption by senior leadership. Use the standard military briefing format.`,
        `Generate a supervisor-ready executive summary for this event:

**Event:** ${eventTitle}
**Type:** ${eventType || "General"}
**Date:** ${dateRange}
**Location:** ${venue ? `${venue}, ` : ""}${location || "TBD"}
**Capacity:** ${capacity || "TBD"}
**Description:** ${eventDescription || "N/A"}

Current readiness metrics:
- Speakers confirmed: ${speakerCount}
- Sponsors secured: ${sponsorCount}
- Registrations received: ${registrationCount}
- Capacity utilization: ${capacity ? `${Math.round((registrationCount / capacity) * 100)}%` : "N/A"}

Format as a military-style executive brief with these sections:
1. **BLUF (Bottom Line Up Front)** — One sentence summary of event readiness
2. **Overview** — Event purpose, scope, and target audience (3-4 sentences)
3. **Readiness Assessment** — Current status across key areas (speakers, sponsors, registrations, logistics)
4. **Risk Assessment** — Top 3 risks with likelihood and impact ratings (High/Medium/Low)
5. **Key Decisions Needed** — Action items requiring leadership approval
6. **Resource Requirements** — Outstanding needs (budget, personnel, equipment)
7. **Recommendation** — Clear recommendation with next steps and timeline

Keep it concise — this should fit on one printed page. Use bullet points where appropriate.`,
        2048
      );
      setSummary(brief);
      toast.success("Executive summary generated");
    } catch (e) {
      console.error("[GTM] Summary generation error:", e);
      toast.error("Failed to generate summary");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const printSummary = () => {
    const el = summaryRef.current;
    if (!el) return;
    const printWin = window.open("", "_blank");
    if (!printWin) { toast.error("Popup blocked — allow popups to print"); return; }
    printWin.document.write(`<!DOCTYPE html><html><head><title>${eventTitle} — Executive Summary</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #111; font-size: 13px; line-height: 1.5; }
        h2 { font-size: 16px; margin-top: 20px; margin-bottom: 6px; }
        h3 { font-size: 14px; margin-top: 16px; margin-bottom: 4px; }
        h4 { font-size: 13px; margin-top: 12px; margin-bottom: 4px; }
        ul { margin: 4px 0; padding-left: 20px; }
        li { margin-bottom: 2px; }
        p { margin: 4px 0; }
        strong { font-weight: 600; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { font-size: 18px; margin: 0; }
        .header p { font-size: 12px; color: #555; margin: 2px 0 0; }
        .classification { text-align: center; font-size: 11px; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; }
      </style></head><body>
      <div class="classification">For Official Use Only</div>
      <div class="header"><h1>${eventTitle}</h1><p>Executive Summary — ${dateRange}</p><p>Generated ${format(new Date(), "dd MMM yyyy HHmm")}</p></div>
      ${el.innerHTML}
      </body></html>`);
    printWin.document.close();
    printWin.print();
  };

  const printGTM = () => {
    const el = gtmRef.current;
    if (!el) return;
    const printWin = window.open("", "_blank");
    if (!printWin) { toast.error("Popup blocked — allow popups to print"); return; }
    printWin.document.write(`<!DOCTYPE html><html><head><title>${eventTitle} — GTM Strategy</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #111; font-size: 13px; line-height: 1.5; }
        h2 { font-size: 16px; margin-top: 20px; margin-bottom: 6px; }
        h3 { font-size: 14px; margin-top: 16px; margin-bottom: 4px; }
        h4 { font-size: 13px; margin-top: 12px; margin-bottom: 4px; }
        ul { margin: 4px 0; padding-left: 20px; }
        li { margin-bottom: 2px; }
        p { margin: 4px 0; }
        strong { font-weight: 600; }
        .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { font-size: 18px; margin: 0; }
        .header p { font-size: 12px; color: #555; margin: 2px 0 0; }
        .brand { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 6px; }
        .brand span { color: #1e3a5f; }
      </style></head><body>
      <div class="brand">MilCrunch<span>X</span></div>
      <div class="header"><h1>${eventTitle}</h1><p>Go-To-Market Strategy — ${dateRange}</p><p>Generated ${format(new Date(), "dd MMM yyyy HHmm")}</p></div>
      ${el.innerHTML}
      </body></html>`);
    printWin.document.close();
    printWin.print();
  };

  const shareReport = async (type: "gtm" | "summary", content: string) => {
    if (!content || sharing) return;
    setSharing(true);
    try {
      const res = await fetch("/api/shared-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          report_type: type,
          event_title: eventTitle,
          event_date_range: dateRange,
          content,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Server ${res.status}`);
      }
      const { id } = await res.json();
      const shareUrl = `${window.location.origin}/shared/${id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied!");
    } catch (e) {
      console.error("[GTM] Share error:", e);
      toast.error(`Failed to create share link: ${(e as Error).message}`);
    } finally {
      setSharing(false);
    }
  };

  /* ======================================== */
  return (
    <div className="space-y-6">
      {/* Section A — Conflicts & Collabs */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-semibold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" /> Conflicts & Collabs
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date window dropdown */}
            <Select value={dateWindow} onValueChange={(v) => setDateWindow(v as "15" | "30" | "60")}>
              <SelectTrigger className="w-[190px] h-8 text-xs">
                <SelectValue placeholder="Date window" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 days before event</SelectItem>
                <SelectItem value="30">30 days before event</SelectItem>
                <SelectItem value="60">60 days before event</SelectItem>
              </SelectContent>
            </Select>

            {isSuperAdmin && conflicts && (
              <Button size="sm" variant="outline" className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
                onClick={() => saveDemoState("demo_conflicts", conflicts)}>
                <Save className="h-4 w-4 mr-1.5" /> Save as Demo
              </Button>
            )}
            <Button size="sm" onClick={runConflictScan} disabled={scanning || !startDate}>
              {scanning ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Search className="h-4 w-4 mr-1.5" />}
              {scanning ? "Scanning\u2026" : "Scan for Conflicts"}
            </Button>
          </div>
        </div>

        {/* No-date warning */}
        {!startDate && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-sm text-amber-700 dark:text-amber-300">
              Set an event date to enable date-filtered conflict scanning.
            </span>
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-4">
          Check for US holidays, military observance dates, competing events, and collaboration opportunities near your event dates.
        </p>

        {/* Filter bar — shown when AI events exist */}
        {conflicts && conflicts.aiEvents.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1 rounded-lg border p-0.5 bg-muted/30">
              <button
                onClick={() => setFilterMode("all")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  filterMode === "all" ? "bg-white shadow-sm text-foreground dark:bg-gray-800" : "text-muted-foreground hover:text-foreground",
                )}
              >
                All ({conflicts.aiEvents.length})
              </button>
              <button
                onClick={() => setFilterMode("conflicts")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  filterMode === "conflicts" ? "bg-red-50 shadow-sm text-red-700 dark:bg-red-950 dark:text-red-300" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Conflicts ({aiConflictCount})
              </button>
              <button
                onClick={() => setFilterMode("collabs")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  filterMode === "collabs" ? "bg-teal-50 shadow-sm text-teal-700 dark:bg-teal-950 dark:text-teal-300" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Collabs ({aiCollabCount})
              </button>
            </div>
          </div>
        )}

        {conflicts && (
          <div className="space-y-4">
            {/* Holiday conflicts */}
            {conflicts.holidays.length > 0 && (
              <CollapsibleSection title="Federal Holiday Conflicts" count={conflicts.holidays.length}>
                {conflicts.holidays.map((h, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      h.proximity === "same-day"
                        ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                        : "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30"
                    }`}
                  >
                    {h.proximity === "same-day" ? (
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    ) : (
                      <CalendarCheck className="h-4 w-4 text-yellow-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{h.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(h.date, "MMM d, yyyy")}
                      </span>
                    </div>
                    <Badge variant={h.proximity === "same-day" ? "destructive" : "secondary"} className="text-xs shrink-0">
                      {h.proximity === "same-day" ? "Same day" : "Within 3 days"}
                    </Badge>
                  </div>
                ))}
              </CollapsibleSection>
            )}

            {/* Military Observance Conflicts */}
            {conflicts.observances.length > 0 && (
              <CollapsibleSection title="Military Observance Conflicts" count={conflicts.observances.length}>
                {conflicts.observances.map((obs, i) => {
                  const isSameDay = obs.direction === "same-day";
                  const isLeverage = obs.suggestion === "leverage";
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg border border-blue-300 bg-blue-50/60 dark:border-blue-800/50 dark:bg-blue-950/20"
                    >
                      <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-300">{obs.name}</span>
                          <span className="text-xs text-blue-700 dark:text-blue-500">
                            {format(obs.date, "MMM d, yyyy")}
                          </span>
                        </div>
                        <p className="text-xs text-blue-800/80 dark:text-blue-400/70 mt-1">
                          {isSameDay
                            ? `Falls during your event. Consider theming sessions or marketing around ${obs.name} to boost engagement and attendance.`
                            : obs.direction === "before"
                            ? `${obs.daysAway} day${obs.daysAway > 1 ? "s" : ""} before your event. ${
                                isLeverage
                                  ? `Close enough to tie in ${obs.name} messaging — use it to build pre-event momentum.`
                                  : `Be aware that attendees may have ${obs.name}-related commitments. Consider adjusting outreach timing.`
                              }`
                            : `${obs.daysAway} day${obs.daysAway > 1 ? "s" : ""} after your event. ${
                                isLeverage
                                  ? `Leverage proximity to ${obs.name} in post-event content and follow-up campaigns.`
                                  : `Some attendees may be traveling or attending ${obs.name} events. Monitor registration trends.`
                              }`
                          }
                        </p>
                      </div>
                      <Badge className="text-[10px] shrink-0 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400 border-0">
                        {isLeverage ? "Leverage" : "Caution"}
                      </Badge>
                    </div>
                  );
                })}
              </CollapsibleSection>
            )}

            {/* AI-Scanned Events (Conflicts & Collabs) */}
            {filteredAIEvents.length > 0 && (
              <CollapsibleSection
                title={filterMode === "conflicts" ? "Competing Events" : filterMode === "collabs" ? "Collaboration Opportunities" : "Events & Opportunities"}
                count={filteredAIEvents.length}
              >
                {filteredAIEvents.map((ev, i) => {
                  const isConflict = ev.type === "conflict";
                  const isChamber = ev.source.toLowerCase().includes("chamber");
                  return (
                    <div
                      key={i}
                      className={cn(
                        "p-3 rounded-lg border border-l-4",
                        isConflict ? "border-l-red-500" : "border-l-teal-500",
                        isConflict
                          ? ev.severity === "high"
                            ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                            : ev.severity === "medium"
                            ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30"
                            : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/30"
                          : "border-teal-200 bg-teal-50/60 dark:border-teal-800/50 dark:bg-teal-950/20",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {isConflict ? (
                          <AlertTriangle className={cn(
                            "h-4 w-4 shrink-0 mt-0.5",
                            ev.severity === "high" ? "text-red-500" : ev.severity === "medium" ? "text-yellow-500" : "text-gray-400",
                          )} />
                        ) : (
                          <Handshake className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{ev.name}</span>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0",
                                isConflict
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "bg-teal-100 text-teal-700 border-teal-200",
                              )}
                            >
                              {isConflict ? "Conflict" : "Collab"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                              {sourceIcon(ev.source)}
                              {ev.source}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{ev.date} · {ev.location}</p>
                          <p className="text-xs text-muted-foreground/80 mt-1">{ev.reason}</p>
                          {isChamber && !isConflict && (
                            <p className="text-xs text-teal-700 dark:text-teal-300 font-medium mt-1">
                              <Landmark className="h-3 w-3 inline mr-1" />
                              Chamber partnership could drive local business sponsor leads.
                            </p>
                          )}
                          <div className={cn(
                            "text-xs p-2 rounded-md mt-1.5",
                            isConflict
                              ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                              : "bg-teal-50/80 text-teal-800 dark:bg-teal-950/30 dark:text-teal-300",
                          )}>
                            <Sparkles className="h-3 w-3 inline mr-1 opacity-70" />
                            {ev.suggestion}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Badge
                            variant={ev.severity === "high" ? "destructive" : "secondary"}
                            className={cn("text-xs", ev.severity === "low" && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400")}
                          >
                            {ev.severity}
                          </Badge>
                          {!isConflict && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-teal-300 text-teal-700 hover:bg-teal-50"
                              onClick={() => generateCollabPitch(ev)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Reach Out
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CollapsibleSection>
            )}

            {/* All clear */}
            {conflicts.holidays.length === 0 && conflicts.observances.length === 0 && conflicts.aiEvents.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-300">No scheduling conflicts detected</span>
              </div>
            )}

            {/* Fallback note */}
            {conflicts.aiFailed && (
              <p className="text-xs text-muted-foreground italic">
                Note: External event scan was unavailable. Only holiday/observance conflicts are shown.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Pitch email modal */}
      {pitchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPitchTarget(null)}>
          <div
            className="bg-white dark:bg-[#1A1D27] rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Collab Pitch Email</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {eventTitle} → {pitchTarget.name}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setPitchTarget(null)} className="h-7 w-7 p-0">
                &times;
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {generatingPitch ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-700 mr-2" />
                  <span className="text-sm text-muted-foreground">Generating pitch with AI...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border text-gray-800 dark:text-gray-200 leading-relaxed">
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
                  <Copy className="h-4 w-4 mr-1" /> Copy
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const subjectMatch = generatedPitch.match(/^Subject:\s*(.+)/m);
                    const subject = encodeURIComponent(subjectMatch?.[1] || `Collab Opportunity — ${eventTitle} x ${pitchTarget.name}`);
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

      {/* Section B — AI GTM Strategy */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" /> AI GTM Strategy
          </h3>
          <div className="flex gap-2">
            {gtmPlan && (
              <>
                <Button size="sm" variant="outline" onClick={() => copyText(gtmPlan, "GTM plan")}>
                  <Copy className="h-4 w-4 mr-1.5" /> Copy
                </Button>
                <Button size="sm" variant="outline" onClick={printGTM}>
                  <Printer className="h-4 w-4 mr-1.5" /> Print
                </Button>
                <Button size="sm" variant="outline" onClick={() => shareReport("gtm", gtmPlan)} disabled={sharing}>
                  {sharing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Link2 className="h-4 w-4 mr-1.5" />} Share
                </Button>
                {isSuperAdmin && (
                  <Button size="sm" variant="outline" className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
                    onClick={() => saveDemoState("demo_gtm", gtmPlan)}>
                    <Save className="h-4 w-4 mr-1.5" /> Save as Demo
                  </Button>
                )}
              </>
            )}
            <Button size="sm" onClick={generateGTM} disabled={generatingGTM}>
              {generatingGTM ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              {generatingGTM ? "Generating\u2026" : "Generate GTM Plan"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Generate an AI-powered Go-To-Market strategy tailored for military/veteran audiences.
          {conflicts ? " Detected conflicts will be factored into risk mitigation." : " Run the conflict scanner first for best results."}
        </p>

        {gtmPlan && (
          <CollapsibleSection title="Generated GTM Plan">
            <div ref={gtmRef} className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-gray-50/50 dark:bg-gray-900/30 max-h-[600px] overflow-y-auto">
              <MarkdownRenderer content={gtmPlan} />
            </div>
          </CollapsibleSection>
        )}

      </Card>

      {/* Section C — Supervisor Summary */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" /> Supervisor Summary
          </h3>
          <div className="flex gap-2">
            {summary && (
              <>
                <Button size="sm" variant="outline" onClick={() => copyText(summary, "Executive summary")}>
                  <Copy className="h-4 w-4 mr-1.5" /> Copy
                </Button>
                <Button size="sm" variant="outline" onClick={printSummary}>
                  <Printer className="h-4 w-4 mr-1.5" /> Print
                </Button>
                <Button size="sm" variant="outline" onClick={() => shareReport("summary", summary)} disabled={sharing}>
                  {sharing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Link2 className="h-4 w-4 mr-1.5" />} Share
                </Button>
                {isSuperAdmin && (
                  <Button size="sm" variant="outline" className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
                    onClick={() => saveDemoState("demo_summary", summary)}>
                    <Save className="h-4 w-4 mr-1.5" /> Save as Demo
                  </Button>
                )}
              </>
            )}
            <Button size="sm" onClick={generateSummary} disabled={generatingSummary}>
              {generatingSummary ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileText className="h-4 w-4 mr-1.5" />}
              {generatingSummary ? "Generating\u2026" : "Generate Summary"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Generate a military-style executive brief with BLUF, readiness assessment, and risk analysis — ready to send up the chain.
        </p>

        {summary && (
          <CollapsibleSection title="Generated Executive Brief">
            <div ref={summaryRef} className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-gray-50/50 dark:bg-gray-900/30">
              <MarkdownRenderer content={summary} />
            </div>
          </CollapsibleSection>
        )}
      </Card>
    </div>
  );
}
