/**
 * Military Relevance Scoring System
 *
 * Calculates a "Military Match Score" for creators returned from IC Discovery.
 * Tries to load terms from Supabase `military_terms` table, falls back to
 * a comprehensive hardcoded list consolidating all military keywords from the
 * codebase (verification.ts, FloatingAdminChat.tsx, BrandDiscover.tsx).
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────

export interface MilitaryTerm {
  term: string;
  category: "branch" | "rank" | "lifestyle" | "acronym" | "general" | "spouse";
}

export interface MilitaryBase {
  name: string;
  city: string;
  state: string;
  /** Additional location keywords that indicate proximity */
  aliases: string[];
}

export interface MilitaryScoreResult {
  /** 0–100 percentage score */
  score: number;
  /** Human-readable evidence strings */
  evidence: string[];
  /** Raw matched terms for debugging */
  matchedTerms: string[];
}

// ── Hardcoded Fallback Data ──────────────────────────────────────────────

const FALLBACK_TERMS: MilitaryTerm[] = [
  // Branches
  { term: "army", category: "branch" },
  { term: "navy", category: "branch" },
  { term: "air force", category: "branch" },
  { term: "marines", category: "branch" },
  { term: "marine corps", category: "branch" },
  { term: "coast guard", category: "branch" },
  { term: "space force", category: "branch" },
  { term: "national guard", category: "branch" },
  // Acronyms
  { term: "usmc", category: "acronym" },
  { term: "usaf", category: "acronym" },
  { term: "uscg", category: "acronym" },
  { term: "usn", category: "acronym" },
  { term: "dod", category: "acronym" },
  { term: "dd-214", category: "acronym" },
  { term: "dd214", category: "acronym" },
  { term: "mos", category: "acronym" },
  { term: "nco", category: "acronym" },
  { term: "pcs", category: "acronym" },
  { term: "tdy", category: "acronym" },
  { term: "bah", category: "acronym" },
  { term: "tricare", category: "acronym" },
  { term: "gi bill", category: "acronym" },
  // Ranks
  { term: "sergeant", category: "rank" },
  { term: "lieutenant", category: "rank" },
  { term: "captain", category: "rank" },
  { term: "major", category: "rank" },
  { term: "colonel", category: "rank" },
  { term: "general", category: "rank" },
  { term: "private", category: "rank" },
  { term: "corporal", category: "rank" },
  { term: "specialist", category: "rank" },
  { term: "petty officer", category: "rank" },
  { term: "seaman", category: "rank" },
  { term: "airman", category: "rank" },
  { term: "commander", category: "rank" },
  { term: "admiral", category: "rank" },
  { term: "warrant officer", category: "rank" },
  { term: "gunnery sergeant", category: "rank" },
  { term: "staff sergeant", category: "rank" },
  { term: "lance corporal", category: "rank" },
  // General military
  { term: "military", category: "general" },
  { term: "veteran", category: "general" },
  { term: "active duty", category: "general" },
  { term: "service member", category: "general" },
  { term: "servicemember", category: "general" },
  { term: "reserve", category: "general" },
  { term: "reservist", category: "general" },
  { term: "combat", category: "general" },
  { term: "deployment", category: "general" },
  { term: "deployed", category: "general" },
  { term: "infantry", category: "general" },
  { term: "special forces", category: "general" },
  { term: "ranger", category: "general" },
  { term: "seal", category: "general" },
  { term: "green beret", category: "general" },
  { term: "airborne", category: "general" },
  { term: "paratrooper", category: "general" },
  { term: "veterans affairs", category: "general" },
  { term: "armed forces", category: "general" },
  { term: "enlistment", category: "general" },
  { term: "enlisted", category: "general" },
  { term: "commissioning", category: "general" },
  { term: "jag", category: "general" },
  { term: "wounded warrior", category: "general" },
  { term: "gold star", category: "general" },
  { term: "blue star", category: "general" },
  { term: "purple heart", category: "general" },
  { term: "medal of honor", category: "general" },
  // Spouse / family
  { term: "military spouse", category: "spouse" },
  { term: "milspouse", category: "spouse" },
  { term: "milso", category: "spouse" },
  { term: "military wife", category: "spouse" },
  { term: "military husband", category: "spouse" },
  { term: "military family", category: "spouse" },
  { term: "milfam", category: "spouse" },
  { term: "army wife", category: "spouse" },
  { term: "navy wife", category: "spouse" },
  { term: "marine wife", category: "spouse" },
  // Lifestyle / content
  { term: "veteran owned", category: "lifestyle" },
  { term: "vet owned", category: "lifestyle" },
  { term: "military life", category: "lifestyle" },
  { term: "mil life", category: "lifestyle" },
  { term: "military transition", category: "lifestyle" },
  { term: "military community", category: "lifestyle" },
  { term: "military lifestyle", category: "lifestyle" },
  { term: "veteran entrepreneur", category: "lifestyle" },
  { term: "vetrepreneur", category: "lifestyle" },
  { term: "armylife", category: "lifestyle" },
  { term: "navylife", category: "lifestyle" },
  { term: "militarylife", category: "lifestyle" },
  { term: "veteranowned", category: "lifestyle" },
  { term: "militaryspouse", category: "lifestyle" },
  { term: "milspo", category: "lifestyle" },
];

/** Major US military installations with nearby city/location keywords. */
const MILITARY_BASES: MilitaryBase[] = [
  { name: "Norfolk Naval Station", city: "Norfolk", state: "VA", aliases: ["norfolk", "virginia beach", "hampton roads", "naval station norfolk"] },
  { name: "Fort Liberty", city: "Fayetteville", state: "NC", aliases: ["fort liberty", "fort bragg", "fayetteville"] },
  { name: "Camp Lejeune", city: "Jacksonville", state: "NC", aliases: ["camp lejeune", "jacksonville nc", "lejeune"] },
  { name: "Fort Hood / Fort Cavazos", city: "Killeen", state: "TX", aliases: ["fort hood", "fort cavazos", "killeen", "copperas cove"] },
  { name: "Joint Base San Antonio", city: "San Antonio", state: "TX", aliases: ["jbsa", "fort sam houston", "lackland", "randolph"] },
  { name: "Fort Campbell", city: "Clarksville", state: "TN", aliases: ["fort campbell", "clarksville"] },
  { name: "Joint Base Lewis-McChord", city: "Tacoma", state: "WA", aliases: ["jblm", "lewis-mcchord", "fort lewis", "tacoma", "lakewood wa"] },
  { name: "Fort Stewart", city: "Hinesville", state: "GA", aliases: ["fort stewart", "hinesville", "hunter army airfield"] },
  { name: "Camp Pendleton", city: "Oceanside", state: "CA", aliases: ["camp pendleton", "oceanside", "pendleton"] },
  { name: "Fort Benning / Fort Moore", city: "Columbus", state: "GA", aliases: ["fort benning", "fort moore", "columbus ga"] },
  { name: "Naval Base San Diego", city: "San Diego", state: "CA", aliases: ["naval base san diego", "san diego navy", "coronado"] },
  { name: "Fort Carson", city: "Colorado Springs", state: "CO", aliases: ["fort carson", "colorado springs"] },
  { name: "Joint Base Pearl Harbor-Hickam", city: "Honolulu", state: "HI", aliases: ["pearl harbor", "hickam", "schofield barracks"] },
  { name: "Fort Drum", city: "Watertown", state: "NY", aliases: ["fort drum", "watertown ny"] },
  { name: "Naval Station Jacksonville", city: "Jacksonville", state: "FL", aliases: ["nas jacksonville", "mayport", "naval station jacksonville"] },
  { name: "Fort Riley", city: "Junction City", state: "KS", aliases: ["fort riley", "junction city", "manhattan ks"] },
  { name: "Eglin Air Force Base", city: "Valparaiso", state: "FL", aliases: ["eglin", "hurlburt field", "valparaiso"] },
  { name: "MacDill Air Force Base", city: "Tampa", state: "FL", aliases: ["macdill", "tampa afb"] },
  { name: "Joint Base Langley-Eustis", city: "Hampton", state: "VA", aliases: ["langley", "eustis", "hampton va"] },
  { name: "Quantico", city: "Quantico", state: "VA", aliases: ["quantico", "marine corps base quantico"] },
  { name: "Fort Sill", city: "Lawton", state: "OK", aliases: ["fort sill", "lawton"] },
  { name: "Nellis Air Force Base", city: "Las Vegas", state: "NV", aliases: ["nellis", "creech afb"] },
  { name: "Fort Eisenhower", city: "Augusta", state: "GA", aliases: ["fort eisenhower", "fort gordon", "augusta ga"] },
  { name: "Naval Station Great Lakes", city: "Great Lakes", state: "IL", aliases: ["great lakes", "naval station great lakes"] },
  { name: "Fort Bliss", city: "El Paso", state: "TX", aliases: ["fort bliss", "el paso"] },
  { name: "Wright-Patterson AFB", city: "Dayton", state: "OH", aliases: ["wright-patterson", "wright patt", "wpafb"] },
  { name: "Pentagon", city: "Arlington", state: "VA", aliases: ["pentagon", "arlington va"] },
];

// ── Term Cache ───────────────────────────────────────────────────────────

let cachedTerms: MilitaryTerm[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Load military terms — tries Supabase `military_terms` table first,
 * falls back to hardcoded list.
 */
async function loadTerms(): Promise<MilitaryTerm[]> {
  if (cachedTerms && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedTerms;
  }

  try {
    const { data, error } = await supabase
      .from("military_terms" as string)
      .select("term, category")
      .limit(500);

    if (!error && data && data.length > 0) {
      cachedTerms = (data as { term: string; category: string }[]).map((row) => ({
        term: row.term.toLowerCase(),
        category: (row.category || "general") as MilitaryTerm["category"],
      }));
      cacheTimestamp = Date.now();
      console.log(`[MilitaryScoring] Loaded ${cachedTerms.length} terms from Supabase`);
      return cachedTerms;
    }
  } catch {
    // Table doesn't exist or RLS blocks — fall through to hardcoded
  }

  cachedTerms = FALLBACK_TERMS;
  cacheTimestamp = Date.now();
  return cachedTerms;
}

// ── Scoring ──────────────────────────────────────────────────────────────

/** Minimum fields needed to score a creator. */
export interface ScorableCreator {
  bio?: string;
  hashtags?: string[];
  location?: string;
  name?: string;
  username?: string;
  category?: string;
  nicheClass?: string;
  specialties?: string[];
}

/**
 * Calculate military relevance score for a single creator.
 *
 * Scoring:
 *   - Hashtag match  = 2 points per term
 *   - Bio match      = 1 point per term
 *   - Category/niche = 1 point per term
 *   - Name/username  = 1 point per term
 *   - Location near base = 1 point per base matched
 *
 * Returns score as 0–100 percentage and evidence array.
 */
export function scoreCreator(
  creator: ScorableCreator,
  terms: MilitaryTerm[],
): MilitaryScoreResult {
  const hashtagText = (creator.hashtags ?? []).join(" ").toLowerCase();
  const bioText = (creator.bio ?? "").toLowerCase();
  const locationText = (creator.location ?? "").toLowerCase();
  const nameText = [(creator.name ?? ""), (creator.username ?? "")].join(" ").toLowerCase();
  const nicheText = [
    creator.category ?? "",
    creator.nicheClass ?? "",
    ...(creator.specialties ?? []),
  ].join(" ").toLowerCase();

  let points = 0;
  const matchedTerms: string[] = [];
  const hashtagMatches: string[] = [];
  const bioMatches: string[] = [];
  const nameMatches: string[] = [];
  const nicheMatches: string[] = [];

  for (const { term } of terms) {
    const inHashtags = hashtagText.includes(term);
    const inBio = bioText.includes(term);
    const inName = nameText.includes(term);
    const inNiche = nicheText.includes(term);

    if (inHashtags) {
      points += 2;
      hashtagMatches.push(term);
      matchedTerms.push(term);
    }
    if (inBio) {
      points += 1;
      bioMatches.push(term);
      if (!matchedTerms.includes(term)) matchedTerms.push(term);
    }
    if (inName) {
      points += 1;
      nameMatches.push(term);
      if (!matchedTerms.includes(term)) matchedTerms.push(term);
    }
    if (inNiche) {
      points += 1;
      nicheMatches.push(term);
      if (!matchedTerms.includes(term)) matchedTerms.push(term);
    }
  }

  // Location near military base check
  const baseMatches: string[] = [];
  if (locationText) {
    for (const base of MILITARY_BASES) {
      const hit = base.aliases.some((alias) => locationText.includes(alias));
      if (hit) {
        points += 1;
        baseMatches.push(base.name);
      }
    }
  }

  // Build evidence strings
  const evidence: string[] = [];
  if (hashtagMatches.length > 0) {
    evidence.push(`Uses ${hashtagMatches.slice(0, 4).map((t) => `#${t}`).join(", ")} hashtag${hashtagMatches.length > 1 ? "s" : ""}`);
  }
  if (bioMatches.length > 0) {
    evidence.push(`Mentions ${bioMatches.slice(0, 4).map((t) => `"${t}"`).join(", ")} in bio`);
  }
  if (nameMatches.length > 0) {
    evidence.push(`Name/username contains ${nameMatches.slice(0, 3).map((t) => `"${t}"`).join(", ")}`);
  }
  if (nicheMatches.length > 0) {
    evidence.push(`Niche: ${nicheMatches.slice(0, 3).join(", ")}`);
  }
  if (baseMatches.length > 0) {
    evidence.push(`Located near ${baseMatches.slice(0, 2).join(", ")}`);
  }

  // Normalize: cap at 100. The max realistic score is ~20+ points for a
  // highly military creator. We use 15 as the "perfect" threshold so
  // strong matches hit 100% without needing every single term.
  const MAX_POINTS = 15;
  const score = Math.min(100, Math.round((points / MAX_POINTS) * 100));

  return { score, evidence, matchedTerms };
}

/**
 * Score an array of creators and attach military_score + military_evidence.
 * This is the main entry point called from searchCreators().
 */
export async function scoreMilitaryRelevance<
  T extends ScorableCreator,
>(creators: T[]): Promise<(T & { militaryScore: number; militaryEvidence: string[] })[]> {
  const terms = await loadTerms();

  return creators.map((c, i) => {
    const result = scoreCreator(c, terms);
    if (i < 3) {
      console.log(`[MilitaryScoring] Creator #${i} ${c.username}: bio="${(c.bio ?? "").substring(0, 80)}", hashtags=${(c.hashtags ?? []).slice(0, 5).join(",")}, score=${result.score}, evidence=`, result.evidence);
    }
    return {
      ...c,
      militaryScore: result.score,
      militaryEvidence: result.evidence,
    };
  });
}

/**
 * Returns true if the search query contains military-related keywords,
 * which signals that results should be sorted by military score.
 */
export function isMilitaryQuery(query: string): boolean {
  const q = query.toLowerCase();
  const militarySignals = [
    "military", "veteran", "army", "navy", "air force", "marines",
    "coast guard", "national guard", "milspouse", "milso", "mil ",
    "active duty", "service member", "usmc", "usaf", "uscg",
    "deployment", "combat", "military spouse", "military wife",
    "military family", "enlisted", "gi bill", "wounded warrior",
    "gold star", "blue star",
  ];
  return militarySignals.some((signal) => q.includes(signal));
}
