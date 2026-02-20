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
  Shield,
  Info,
  CalendarCheck,
  CheckCircle2,
  Landmark,
} from "lucide-react";
import { format, differenceInDays, parseISO, isWithinInterval, addDays, subDays } from "date-fns";
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

/* ---- external results (ported from GTM scanner) ---- */

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

interface ObservanceConflict {
  name: string;
  date: Date;
  daysAway: number;
  direction: "before" | "after" | "same-day";
  suggestion: "leverage" | "caution";
}

interface ExternalResults {
  holidays: HolidayConflict[];
  observances: ObservanceConflict[];
  aiEvents: AIEvent[];
  aiFailed: boolean;
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

const SCAN_PHASES = [
  "Scanning Eventbrite for local events...",
  "Checking military installation calendars...",
  "Searching Facebook Events in the area...",
  "Scanning local Chamber of Commerce calendars...",
  "Checking regional business & networking events...",
  "Scanning military spouse & veteran community groups...",
  "Checking MilCrunch event calendar...",
  "Analyzing results for conflicts and collabs...",
];

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
  if (selectedAudience.includes("General Military")) return 40;
  return 20;
}

/* ========== location parsing ========== */

const US_STATES = new Set(Object.keys(REGION_MAP));

function parseLocationInput(input: string): ParsedLocation {
  const trimmed = input.trim();
  if (!trimmed) return { city: null, state: null };

  const commaMatch = trimmed.match(/^(.+?),\s*([A-Za-z]{2})\s*$/);
  if (commaMatch) {
    const st = commaMatch[2].toUpperCase();
    if (US_STATES.has(st)) return { city: commaMatch[1].trim(), state: st };
  }

  const spaceMatch = trimmed.match(/^(.+)\s+([A-Za-z]{2})$/);
  if (spaceMatch) {
    const st = spaceMatch[2].toUpperCase();
    if (US_STATES.has(st)) return { city: spaceMatch[1].trim(), state: st };
  }

  if (trimmed.length === 2 && US_STATES.has(trimmed.toUpperCase())) {
    return { city: null, state: trimmed.toUpperCase() };
  }

  return { city: trimmed, state: null };
}

/* ========== geographic matching ========== */

function geoMatches(
  plan: ParsedLocation,
  candidate: EventRow,
  radiusMiles: number,
): { matches: boolean; reason: string | null; score: number } {
  if (radiusMiles === 0) {
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
  if (sameCity) return { matches: true, reason: "Same city", score: 30 };
  if (sameState) return { matches: true, reason: "Same state", score: 20 };
  if (sameRegion) return { matches: true, reason: `Same region (${candRegion})`, score: 12 };
  return { matches: false, reason: null, score: 0 };
}

/* ========== holidays (ported from GTM scanner) ========== */

function getHolidays(year: number): { name: string; date: Date }[] {
  const fixed = [
    { name: "New Year's Day", month: 0, day: 1 },
    { name: "Independence Day", month: 6, day: 4 },
    { name: "Veterans Day", month: 10, day: 11 },
    { name: "Christmas Day", month: 11, day: 25 },
    { name: "Armed Forces Day", month: 4, day: 17 },
    { name: "Flag Day", month: 5, day: 14 },
    { name: "Patriot Day (9/11)", month: 8, day: 11 },
    { name: "Pearl Harbor Remembrance Day", month: 11, day: 7 },
    { name: "National Guard Birthday", month: 11, day: 13 },
  ];

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

function findHolidayConflicts(startDate: Date, endDate: Date | null): HolidayConflict[] {
  const end = endDate ?? startDate;
  const years = new Set([startDate.getFullYear(), end.getFullYear()]);
  const conflicts: HolidayConflict[] = [];

  for (const y of years) {
    for (const h of getHolidays(y)) {
      const eventInterval = { start: subDays(startDate, 0), end: addDays(end, 0) };
      if (isWithinInterval(h.date, eventInterval)) {
        conflicts.push({ name: h.name, date: h.date, proximity: "same-day" });
      } else {
        const nearInterval = { start: subDays(startDate, 3), end: addDays(end, 3) };
        if (isWithinInterval(h.date, nearInterval)) {
          conflicts.push({ name: h.name, date: h.date, proximity: "within-3-days" });
        }
      }
    }
  }
  return conflicts;
}

/* ========== military observances (ported from GTM scanner) ========== */

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

  const mothersDay = nthWeekday(4, 0, 2);
  const milSpouseDay = new Date(mothersDay);
  milSpouseDay.setDate(milSpouseDay.getDate() - 2);

  return [
    { name: "Veterans Day", date: new Date(year, 10, 11) },
    { name: "Memorial Day", date: lastWeekday(4, 1) },
    { name: "Armed Forces Day", date: nthWeekday(4, 6, 3) },
    { name: "Military Spouse Appreciation Day", date: milSpouseDay },
    { name: "Gold Star Mother's Day", date: lastWeekday(8, 0) },
    { name: "POW/MIA Recognition Day", date: nthWeekday(8, 5, 3) },
    { name: "Pearl Harbor Remembrance Day", date: new Date(year, 11, 7) },
  ];
}

function findObservanceConflicts(startDate: Date, endDate: Date | null): ObservanceConflict[] {
  const end = endDate ?? startDate;
  const years = new Set([startDate.getFullYear(), end.getFullYear()]);
  const conflicts: ObservanceConflict[] = [];

  for (const y of years) {
    for (const obs of getMilitaryObservances(y)) {
      const obsTime = obs.date.getTime();
      const startTime = startDate.getTime();
      const endTime = end.getTime();
      const msPerDay = 86400000;

      if (obsTime >= startTime && obsTime <= endTime) {
        conflicts.push({ name: obs.name, date: obs.date, daysAway: 0, direction: "same-day", suggestion: "leverage" });
        continue;
      }

      const daysBefore = Math.round((startTime - obsTime) / msPerDay);
      if (daysBefore > 0 && daysBefore <= 7) {
        conflicts.push({
          name: obs.name, date: obs.date, daysAway: daysBefore,
          direction: "before",
          suggestion: daysBefore <= 3 ? "leverage" : "caution",
        });
        continue;
      }

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

/* ========== military installations by state (ported from GTM scanner) ========== */

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

const ABBREV_TO_STATE: Record<string, string> = {
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

function getNearbyBases(stateInput: string | null): { name: string; city: string }[] {
  if (!stateInput) return [];
  const norm = stateInput.trim().toLowerCase();
  for (const [key, bases] of Object.entries(INSTALLATIONS_BY_STATE)) {
    if (key.toLowerCase() === norm) return bases;
  }
  const fullName = ABBREV_TO_STATE[stateInput.trim().toUpperCase()];
  if (fullName && INSTALLATIONS_BY_STATE[fullName]) return INSTALLATIONS_BY_STATE[fullName];
  return [];
}

/* ========== analysis (internal events) ========== */

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

  const isConflict = daysDiff <= 14 && geo.matches && audienceScore >= 50;

  if (isConflict) {
    if (daysDiff === 0) { score += 40; reasons.push("Same date"); }
    else if (daysDiff <= 3) { score += 35; reasons.push(`${daysDiff} day${daysDiff > 1 ? "s" : ""} apart`); }
    else if (daysDiff <= 7) { score += 25; reasons.push(`${daysDiff} days apart`); }
    else { score += 15; reasons.push(`${daysDiff} days apart`); }

    score += geo.score;
    if (geo.reason) reasons.push(geo.reason);

    score += Math.round(audienceScore * 0.35);
    reasons.push(`~${audienceScore}% audience overlap`);

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

  if (daysDiff > 60) return null;

  const isCollab = (audienceScore >= 30 || geo.matches) && daysDiff > 0;
  if (!isCollab) return null;

  if (daysDiff <= 7) { score += 20; reasons.push(`${daysDiff} day${daysDiff > 1 ? "s" : ""} apart`); }
  else if (daysDiff <= 21) { score += 15; reasons.push(`${daysDiff} days apart`); }
  else { score += 8; reasons.push(`${daysDiff} days apart`); }

  if (geo.matches && geo.reason) {
    score += geo.score;
    reasons.push(geo.reason);
  }

  if (audienceScore >= 50) { score += 25; reasons.push("Strong audience overlap"); }
  else if (audienceScore >= 30) { score += 15; reasons.push("Overlapping audience"); }

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
  const [scanPhase, setScanPhase] = useState("");
  const [results, setResults] = useState<ScanResult[]>([]);
  const [externalResults, setExternalResults] = useState<ExternalResults | null>(null);
  const [filter, setFilter] = useState<FilterMode>("both");
  const [searchQuery, setSearchQuery] = useState("");
  const [pitchModal, setPitchModal] = useState<{ target: EventRow } | null>(null);
  const [aiPitchTarget, setAiPitchTarget] = useState<AIEvent | null>(null);
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

  const toggleAudience = (aud: string) => {
    setAudienceTypes((prev) =>
      prev.includes(aud) ? prev.filter((a) => a !== aud) : [...prev, aud],
    );
  };

  // Run scan — now includes external scanning
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
    setExternalResults(null);
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

    const locationStr = [parsedLoc.city, parsedLoc.state].filter(Boolean).join(", ") || locationInput;
    const dateRangeStr = dateRange.to
      ? `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`
      : format(dateRange.from, "MMM d, yyyy");

    // 1. Holidays & observances (instant, local computation)
    setScanPhase("Checking holidays & military observances...");
    const holidays = findHolidayConflicts(dateRange.from, dateRange.to ?? null);
    const observances = findObservanceConflicts(dateRange.from, dateRange.to ?? null);

    // 2. Internal platform events
    setScanPhase("Scanning platform events...");
    const scanResults: ScanResult[] = [];
    for (const candidate of allEvents) {
      const result = analyzePlannedEvent(plan, candidate);
      if (result) scanResults.push(result);
    }
    scanResults.sort((a, b) => {
      if (a.type !== b.type) return a.type === "conflict" ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      return a.dateProximity - b.dateProximity;
    });
    setResults(scanResults);

    // 3. AI-powered multi-source scan
    setScanPhase(SCAN_PHASES[0]);
    let phaseIdx = 0;
    const cycleInterval = setInterval(() => {
      phaseIdx = (phaseIdx + 1) % SCAN_PHASES.length;
      setScanPhase(SCAN_PHASES[phaseIdx]);
    }, 800);

    let aiEvents: AIEvent[] = [];
    let aiFailed = false;

    try {
      const nearbyBases = getNearbyBases(parsedLoc.state);
      const baseContext = nearbyBases.length > 0
        ? `\nNearby military installations: ${nearbyBases.slice(0, 5).map((b) => `${b.name} (${b.city})`).join(", ")}.`
        : "";

      const aiResp = await callAnthropic(
        `You are an event intelligence tool for military community event planners. Given a planned event's location, date range, and target audience, generate realistic competing events (conflicts) and potential collaboration opportunities (collabs) as if you searched Eventbrite, Facebook Events, military installation calendars, local and regional Chamber of Commerce event calendars, and military community groups.

Return ONLY a valid JSON array of event objects. Each event:
{
  "name": "Event Name",
  "date": "Mon DD, YYYY",
  "location": "City, ST",
  "source": "Eventbrite" | "Facebook Events" | "Military Installation Calendar" | "Community Groups" | "MilCrunch Calendar" | "Chamber of Commerce",
  "type": "conflict" | "collab",
  "severity": "high" | "medium" | "low",
  "reason": "Brief explanation of why this is a conflict or collab opportunity",
  "suggestion": "Actionable recommendation for the event planner"
}

Guidelines:
- Generate 8-15 realistic events, mix of conflicts and collabs
- For conflicts: events competing for the same audience in the same timeframe and area
- For collabs: complementary events good for cross-promotion, shared speakers, or joint marketing
- Include events from at least 3 different sources
- Military installation events should reference real bases near the location
- Severity: high = same week and nearby, medium = same month or overlapping audience, low = tangential
- Make events realistic with specific names, real-sounding dates within the timeframe, and plausible venues
- Include both military-specific and civilian events that could attract a military audience
- Include 1-3 Chamber of Commerce events (networking mixers, business expos, small business workshops, etc.)
- Chamber of Commerce events should be COLLAB when they serve overlapping audiences (veteran business owners, military spouse entrepreneurs, local business community) — include reason "Chamber partnership could drive local business sponsor leads"
- Chamber of Commerce events should be CONFLICT only when they directly compete for the same date, location, and audience`,
        `Planned event details:
- Name: "${eventName || "Untitled Event"}"
- Date: ${dateRangeStr}
- Location: ${locationStr}
- Search Radius: ${radius} miles
- Target Audience: ${audienceTypes.join(", ") || "General Military"}
- Event Type: ${eventType || "General"}${baseContext}

Generate realistic competing events and collaboration opportunities.`,
        4096,
      );

      const cleaned = aiResp.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(cleaned);
      aiEvents = (Array.isArray(parsed) ? parsed : parsed.events || []).filter(
        (e: any) => e.name && e.type && (e.type === "conflict" || e.type === "collab"),
      );
    } catch (e) {
      console.warn("[C&C] AI scan failed:", e);
      aiFailed = true;
    } finally {
      clearInterval(cycleInterval);
    }

    // Save external results
    const external: ExternalResults = { holidays, observances, aiEvents, aiFailed };
    setExternalResults(external);

    const totalExternal = holidays.length + observances.length + aiEvents.length;
    const totalInternal = scanResults.length;

    if (totalExternal === 0 && totalInternal === 0) {
      toast.success("No conflicts or collab opportunities found — you're clear!");
    } else {
      const parts: string[] = [];
      if (holidays.length) parts.push(`${holidays.length} holiday conflict${holidays.length > 1 ? "s" : ""}`);
      if (observances.length) parts.push(`${observances.length} observance${observances.length > 1 ? "s" : ""}`);
      const extConflicts = aiEvents.filter((e) => e.type === "conflict").length;
      const extCollabs = aiEvents.filter((e) => e.type === "collab").length;
      if (extConflicts) parts.push(`${extConflicts} competing event${extConflicts > 1 ? "s" : ""}`);
      if (extCollabs) parts.push(`${extCollabs} collab opportunit${extCollabs > 1 ? "ies" : "y"}`);
      const conflicts = scanResults.filter((r) => r.type === "conflict").length;
      const collabs = scanResults.filter((r) => r.type === "collab").length;
      if (conflicts) parts.push(`${conflicts} platform conflict${conflicts > 1 ? "s" : ""}`);
      if (collabs) parts.push(`${collabs} collab opportunit${collabs > 1 ? "ies" : "y"}`);
      toast.info(`Found ${parts.join(", ")}`);
    }

    // AI-enhance top internal results
    if (scanResults.length > 0) {
      setScanPhase("Generating AI insights...");
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

        setResults((prev) =>
          prev.map((r) => {
            const aiSug = suggMap.get(r.event.id);
            return aiSug ? { ...r, aiSuggestion: aiSug } : r;
          }),
        );
      } catch (err) {
        console.warn("[C&C] AI enhancement failed:", err);
      }
    }

    setScanning(false);
    setScanPhase("");
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
      console.error("[C&C] Pitch generation failed:", err);
      setGeneratedPitch(
        `Subject: Collaboration Opportunity — ${planName} x ${target.title}\n\nHi there,\n\nI'm reaching out from ${planName} (${planDate}, ${locationInput || "location TBD"}).\n\nWe noticed your upcoming event, ${target.title} (${targetDate}, ${getLocation(target) || "location TBD"}), targets a similar military community audience. We think there's a great opportunity to collaborate:\n\n- Cross-promote to each other's attendee lists\n- Share speakers or panelists between events\n- Offer bundled ticket discounts for both events\n- Co-create content leading up to both events\n\nWould you be open to a quick call to explore this?\n\nBest,\n[Your Name]`,
      );
    } finally {
      setGeneratingPitch(false);
    }
  };

  // Generate AI pitch for external (AI-scanned) collab events
  const generateExternalPitch = async (ev: AIEvent) => {
    setPitchModal(null);
    setAiPitchTarget(ev);
    setGeneratingPitch(true);
    setGeneratedPitch("");

    const isChamber = ev.source.toLowerCase().includes("chamber");
    const planDate = dateRange?.from ? format(dateRange.from, "MMM d, yyyy") : "TBD";
    const planEndDate = dateRange?.to ? ` - ${format(dateRange.to, "MMM d, yyyy")}` : "";
    const planName = eventName || "our upcoming event";

    const chamberContext = isChamber
      ? `\n\nIMPORTANT: This is a Chamber of Commerce event. Specifically emphasize co-marketing opportunities targeting veteran-owned businesses and military spouse entrepreneurs in the ${locationInput || "local"} area. Suggest joint outreach to veteran business owners, military spouse entrepreneur networks, and local business community leaders. Frame the partnership as a way to drive local business sponsor leads for both organizations.`
      : "";

    try {
      const pitch = await callAnthropic(
        `You are writing a collaboration outreach email for a military community event organizer on MilCrunch. Write a professional, warm, and specific collaboration pitch email. Include a subject line. Keep it concise but compelling. Suggest 3-4 specific collaboration ideas relevant to these events.${chamberContext}`,
        `Write a collab pitch email from:
- Event: "${planName}" on ${planDate}${planEndDate} in ${locationInput || "TBD"}
- Type: ${eventType || "Event"}, Audience: ${audienceTypes.join(", ") || "Military community"}

To the organizers of:
- Event: "${ev.name}" on ${ev.date} in ${ev.location}
- Source: ${ev.source}

Both events serve overlapping audiences. Write the email.`,
        1500,
      );
      setGeneratedPitch(pitch);
    } catch (err) {
      console.error("[C&C] External pitch generation failed:", err);
      if (isChamber) {
        setGeneratedPitch(
          `Subject: Partnership Opportunity — ${planName} x ${ev.name}\n\nHi there,\n\nI'm reaching out from ${planName} (${planDate}, ${locationInput || "location TBD"}).\n\nWe noticed your upcoming event, ${ev.name} (${ev.date}, ${ev.location}), and believe there's a strong opportunity to collaborate — especially around supporting veteran-owned businesses and military spouse entrepreneurs in the ${locationInput || "local"} area.\n\nHere are some ideas:\n\n- Co-market to veteran-owned businesses and military spouse entrepreneurs in the area\n- Cross-promote to each other's attendee and member lists\n- Joint sponsor packages targeting businesses that want to reach the military community\n- Feature veteran and military spouse business owners as speakers or panelists\n\nWould you be open to a quick call to explore this?\n\nBest,\n[Your Name]`,
        );
      } else {
        setGeneratedPitch(
          `Subject: Collaboration Opportunity — ${planName} x ${ev.name}\n\nHi there,\n\nI'm reaching out from ${planName} (${planDate}, ${locationInput || "location TBD"}).\n\nWe noticed your upcoming event, ${ev.name} (${ev.date}, ${ev.location}), targets a similar military community audience. We think there's a great opportunity to collaborate:\n\n- Cross-promote to each other's attendee lists\n- Share speakers or panelists between events\n- Offer bundled ticket discounts for both events\n- Co-create content leading up to both events\n\nWould you be open to a quick call to explore this?\n\nBest,\n[Your Name]`,
        );
      }
    } finally {
      setGeneratingPitch(false);
    }
  };

  // Filtered results (internal only — external shown separately)
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
          Plan a new event and scan for scheduling conflicts, competing events, and collaboration opportunities.
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

      {/* Scanning state */}
      {scanning && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
            <p className="text-sm text-muted-foreground">
              {scanPhase || "Scanning..."}
            </p>
          </div>
        </div>
      )}

      {/* ========== EXTERNAL RESULTS ========== */}
      {!scanning && externalResults && (
        <div className="space-y-4">
          {/* Holiday Conflicts */}
          {externalResults.holidays.length > 0 && (
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Federal Holiday Conflicts
              </p>
              <div className="space-y-2">
                {externalResults.holidays.map((h, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border",
                      h.proximity === "same-day"
                        ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                        : "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30",
                    )}
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
              </div>
            </Card>
          )}

          {/* Military Observance Conflicts */}
          {externalResults.observances.length > 0 && (
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Military Observances
              </p>
              <div className="space-y-2">
                {externalResults.observances.map((obs, i) => {
                  const isSameDay = obs.direction === "same-day";
                  const isLeverage = obs.suggestion === "leverage";
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg border border-purple-200 bg-purple-50/60 dark:border-purple-800/50 dark:bg-purple-950/20"
                    >
                      <Info className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-purple-900 dark:text-purple-200">{obs.name}</span>
                          <span className="text-xs text-purple-600 dark:text-purple-400">
                            {format(obs.date, "MMM d, yyyy")}
                          </span>
                        </div>
                        <p className="text-xs text-purple-700/80 dark:text-purple-300/70 mt-1">
                          {isSameDay
                            ? `Falls during your event. Consider theming sessions or marketing around ${obs.name} to boost engagement.`
                            : obs.direction === "before"
                            ? `${obs.daysAway} day${obs.daysAway > 1 ? "s" : ""} before your event. ${
                                isLeverage
                                  ? `Close enough to tie in ${obs.name} messaging — use it to build pre-event momentum.`
                                  : `Be aware that attendees may have ${obs.name}-related commitments.`
                              }`
                            : `${obs.daysAway} day${obs.daysAway > 1 ? "s" : ""} after your event. ${
                                isLeverage
                                  ? `Leverage proximity to ${obs.name} in post-event content and follow-up campaigns.`
                                  : `Some attendees may be traveling or attending ${obs.name} events.`
                              }`
                          }
                        </p>
                      </div>
                      <Badge className="text-[10px] shrink-0 bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-0">
                        {isLeverage ? "Leverage" : "Caution"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* AI-Generated Events */}
          {externalResults.aiEvents.length > 0 && (() => {
            const aiConflicts = externalResults.aiEvents.filter((e) => e.type === "conflict");
            const aiCollabs = externalResults.aiEvents.filter((e) => e.type === "collab");

            const sourceIcon = (source: string) => {
              const s = source.toLowerCase();
              if (s.includes("chamber")) return <Landmark className="h-3 w-3" />;
              if (s.includes("military") || s.includes("installation")) return <Shield className="h-3 w-3" />;
              if (s.includes("facebook") || s.includes("community")) return <Users className="h-3 w-3" />;
              if (s.includes("milcrunch")) return <CalendarCheck className="h-3 w-3" />;
              return <Radar className="h-3 w-3" />;
            };

            return (
              <>
                {/* External Conflicts */}
                {aiConflicts.length > 0 && (
                  <Card className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                      Competing Events
                    </p>
                    <div className="space-y-2">
                      {aiConflicts.map((ev, i) => (
                        <div
                          key={i}
                          className={cn(
                            "p-3 rounded-lg border",
                            ev.severity === "high"
                              ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                              : ev.severity === "medium"
                              ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30"
                              : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/30",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <AlertTriangle className={cn(
                              "h-4 w-4 shrink-0 mt-0.5",
                              ev.severity === "high" ? "text-red-500" : ev.severity === "medium" ? "text-yellow-500" : "text-gray-400",
                            )} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{ev.name}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                                  {sourceIcon(ev.source)}
                                  {ev.source}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{ev.date} · {ev.location}</p>
                              <p className="text-xs text-muted-foreground/80 mt-1">{ev.reason}</p>
                              <div className="text-xs p-2 rounded-md mt-1.5 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                                <Sparkles className="h-3 w-3 inline mr-1 opacity-70" />
                                {ev.suggestion}
                              </div>
                            </div>
                            <Badge
                              variant={ev.severity === "high" ? "destructive" : "secondary"}
                              className={cn("text-xs shrink-0", ev.severity === "low" && "bg-gray-100 text-gray-600")}
                            >
                              {ev.severity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* External Collabs */}
                {aiCollabs.length > 0 && (
                  <Card className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                      Collaboration Opportunities
                    </p>
                    <div className="space-y-2">
                      {aiCollabs.map((ev, i) => {
                        const isChamber = ev.source.toLowerCase().includes("chamber");
                        return (
                          <div
                            key={i}
                            className="p-3 rounded-lg border border-teal-200 bg-teal-50/60 dark:border-teal-800/50 dark:bg-teal-950/20"
                          >
                            <div className="flex items-start gap-3">
                              <Handshake className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium">{ev.name}</span>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                                    {sourceIcon(ev.source)}
                                    {ev.source}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{ev.date} · {ev.location}</p>
                                <p className="text-xs text-muted-foreground/80 mt-1">{ev.reason}</p>
                                {isChamber && (
                                  <p className="text-xs text-teal-700 dark:text-teal-300 font-medium mt-1">
                                    <Landmark className="h-3 w-3 inline mr-1" />
                                    Chamber partnership could drive local business sponsor leads.
                                  </p>
                                )}
                                <div className="text-xs p-2 rounded-md mt-1.5 bg-teal-50/80 text-teal-800 dark:bg-teal-950/30 dark:text-teal-300">
                                  <Sparkles className="h-3 w-3 inline mr-1 opacity-70" />
                                  {ev.suggestion}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-teal-300 text-teal-700 hover:bg-teal-50 shrink-0"
                                onClick={() => generateExternalPitch(ev)}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Reach Out
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </>
            );
          })()}

          {/* Fallback note */}
          {externalResults.aiFailed && (
            <p className="text-xs text-muted-foreground italic px-1">
              Note: External event scan was unavailable. Only holiday/observance conflicts and platform events are shown.
            </p>
          )}

          {/* Complete all-clear */}
          {externalResults.holidays.length === 0 &&
           externalResults.observances.length === 0 &&
           externalResults.aiEvents.length === 0 &&
           results.length === 0 && (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <p className="font-medium">All clear!</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  No scheduling conflicts, competing events, or collaboration opportunities found.
                  You&apos;re in the clear to proceed.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ========== INTERNAL PLATFORM RESULTS ========== */}
      {!scanning && results.length > 0 && (
        <>
          {/* Section header for platform events */}
          {externalResults && (
            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Platform Events
              </p>
            </div>
          )}

          {/* Filter bar */}
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

          {/* No results after filter */}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No results match your filter.
            </div>
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
        </>
      )}

      {/* Pitch modal */}
      {(pitchModal || aiPitchTarget) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setPitchModal(null); setAiPitchTarget(null); }}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Collab Pitch Email</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {eventName || "Your Event"} → {pitchModal?.target.title ?? aiPitchTarget?.name ?? ""}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setPitchModal(null); setAiPitchTarget(null); }} className="h-7 w-7 p-0">
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
                    const targetName = pitchModal?.target.title ?? aiPitchTarget?.name ?? "";
                    const subject = encodeURIComponent(subjectMatch?.[1] || `Collab Opportunity — ${eventName || "Our Event"} x ${targetName}`);
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
