/**
 * Smart Search Router — detects query type and routes to the cheapest/best API.
 *
 * Detection rules (checked in order):
 * 1. Starts with @ → HANDLE (Enrich raw, 0.03 credits)
 * 2. Contains social media URL → Extract handle, HANDLE search
 * 3. Single word, looks like username → Try HANDLE first, fall back to KEYWORD
 * 4. Two-three words, looks like person name → Try concatenated handle + keyword in parallel
 * 5. Multiple words / general topic → KEYWORD search (Discovery API)
 * 6. Contains filter hints → Parse into Discovery filters
 *
 * Cross-platform fallback: When a handle lookup fails on the primary platform,
 * automatically tries instagram → tiktok → youtube → twitter before giving up.
 */

import {
  searchByUsername,
  searchCreators,
  type SearchCreatorsOptions,
  type SearchCreatorsResult,
  type CreatorCard,
} from "@/lib/influencers-club";

/* ------------------------------------------------------------------ */
/* Query classification                                                */
/* ------------------------------------------------------------------ */

export type QueryType =
  | "handle"       // Exact @username or extracted from URL
  | "username"     // Single word that looks like a username
  | "person_name"  // Two-three words that look like a real name
  | "keyword";     // General topic / multi-word search

export interface ClassifiedQuery {
  type: QueryType;
  /** Cleaned handle (no @, lowercase) for handle/username/name searches */
  handle: string | null;
  /** Original query for keyword fallback */
  keyword: string;
  /** Platform extracted from URL if applicable */
  detectedPlatform: string | null;
  /** Human-readable hint for the search bar */
  hint: string;
  /** Handle variations to try for name searches */
  handleVariations: string[];
}

const URL_PATTERNS: { regex: RegExp; platform: string }[] = [
  { regex: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i, platform: "instagram" },
  { regex: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@?([a-zA-Z0-9_.]+)/i, platform: "tiktok" },
  { regex: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/@?([a-zA-Z0-9_.]+)/i, platform: "youtube" },
  { regex: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/i, platform: "twitter" },
];

const ALL_PLATFORMS = ["instagram", "tiktok", "youtube", "twitter"];

/** Returns true if the string looks like a single username (no spaces, common chars) */
function looksLikeUsername(s: string): boolean {
  return /^[a-z0-9][a-z0-9._]{1,29}$/i.test(s) && !/\s/.test(s);
}

/** Returns true if the string looks like a person's name (2-3 words, alphabetic) */
function looksLikePersonName(s: string): boolean {
  const parts = s.trim().split(/\s+/);
  if (parts.length < 2 || parts.length > 3) return false;
  // Each part should be alphabetic (allowing hyphens and apostrophes)
  return parts.every(p => /^[a-zA-Z][a-zA-Z'-]{0,20}$/.test(p));
}

/** Generate handle variations from a person's name (2-3 words) */
function generateHandleVariations(name: string): string[] {
  const parts = name.trim().toLowerCase().split(/\s+/);

  if (parts.length === 2) {
    const [first, last] = parts;
    return [
      `${first}${last}`,           // rileytejcek
      `${first}.${last}`,          // riley.tejcek
      `${first}_${last}`,          // riley_tejcek
      `${last}${first}`,           // tejcekriley
      `${first}${last[0]}`,        // rileyt
      `${first[0]}${last}`,        // rtejcek
    ];
  }

  if (parts.length === 3) {
    const [first, middle, last] = parts;
    return [
      `${first}${middle}${last}`,       // mariamendezreed
      `${first}.${middle}.${last}`,     // maria.mendez.reed
      `${first}_${middle}_${last}`,     // maria_mendez_reed
      `${first}${last}`,               // mariareed
      `${first}.${last}`,              // maria.reed
      `${first}${middle[0]}${last}`,   // mariamreed
    ];
  }

  return [name.toLowerCase().replace(/\s+/g, "")];
}

export function classifyQuery(raw: string): ClassifiedQuery {
  const trimmed = raw.trim();

  // 1. Starts with @
  if (trimmed.startsWith("@")) {
    const handle = trimmed.slice(1).toLowerCase().trim();
    return {
      type: "handle",
      handle,
      keyword: handle,
      detectedPlatform: null,
      hint: "Searching by exact username...",
      handleVariations: [handle],
    };
  }

  // 2. URL detection
  for (const { regex, platform } of URL_PATTERNS) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      const handle = match[1].toLowerCase();
      return {
        type: "handle",
        handle,
        keyword: handle,
        detectedPlatform: platform,
        hint: `Searching ${platform} profile...`,
        handleVariations: [handle],
      };
    }
  }

  // 3. Single word, looks like username
  if (!trimmed.includes(" ") && looksLikeUsername(trimmed)) {
    const handle = trimmed.toLowerCase();
    return {
      type: "username",
      handle,
      keyword: handle,
      detectedPlatform: null,
      hint: "Searching by name and handle...",
      handleVariations: [handle],
    };
  }

  // 4. Two-three words, looks like a person name
  if (looksLikePersonName(trimmed)) {
    const variations = generateHandleVariations(trimmed);
    return {
      type: "person_name",
      handle: variations[0],  // Primary: firstlast or firstmiddlelast
      keyword: trimmed,
      detectedPlatform: null,
      hint: "Searching by name and handle...",
      handleVariations: variations,
    };
  }

  // 5. Everything else → keyword search
  return {
    type: "keyword",
    handle: null,
    keyword: trimmed,
    detectedPlatform: null,
    hint: "Searching by keywords...",
    handleVariations: [],
  };
}

/* ------------------------------------------------------------------ */
/* Cross-platform handle search                                        */
/* ------------------------------------------------------------------ */

/**
 * Try to find a user by handle across multiple platforms.
 * Tries the primary platform first, then falls back to others.
 * Returns the first successful result, or null if not found on any platform.
 */
async function crossPlatformHandleSearch(
  handle: string,
  primaryPlatform: string
): Promise<SearchCreatorsResult | null> {
  const platformsToTry = [
    primaryPlatform,
    ...ALL_PLATFORMS.filter(p => p !== primaryPlatform),
  ];

  for (const tryPlatform of platformsToTry) {
    try {
      const result = await searchByUsername(handle, tryPlatform);
      if (result.creators.length > 0) {
        console.log(`[SmartSearch] Found @${handle} on ${tryPlatform}`);
        return result;
      }
    } catch (err) {
      console.log(`[SmartSearch] @${handle} not on ${tryPlatform}: ${(err as Error).message?.substring(0, 100)}`);
    }
  }

  console.warn(`[SmartSearch] No exact username match for @${handle} on any platform`);
  return null;
}

/* ------------------------------------------------------------------ */
/* Smart search execution                                              */
/* ------------------------------------------------------------------ */

export interface SmartSearchResult {
  /** Exact match found via handle/username lookup */
  exactMatch: CreatorCard | null;
  /** Related creators from keyword/discovery search */
  relatedCreators: CreatorCard[];
  /** Total from discovery API */
  relatedTotal: number;
  /** The query classification used */
  classification: ClassifiedQuery;
  /** Raw API response for enrichment data passthrough */
  exactMatchRaw: unknown;
}

/**
 * Execute a smart search — tries the cheapest API first, runs parallel strategies
 * for ambiguous queries, and always returns the best results.
 *
 * Cross-platform: When handle/username lookup fails on the primary platform,
 * automatically tries all other platforms before falling back to keyword search.
 */
export async function smartSearch(
  raw: string,
  options: SearchCreatorsOptions = {}
): Promise<SmartSearchResult> {
  const classification = classifyQuery(raw);
  const platform = options.platform || classification.detectedPlatform || "instagram";

  console.log(`[SmartSearch] Query: "${raw}" → type: ${classification.type}, handle: ${classification.handle}, platform: ${platform}`);

  switch (classification.type) {
    case "handle": {
      // Direct handle lookup with cross-platform fallback
      const found = await crossPlatformHandleSearch(classification.handle!, platform);
      if (found) {
        return {
          exactMatch: found.creators[0],
          relatedCreators: [],
          relatedTotal: 0,
          classification,
          exactMatchRaw: found.rawResponse,
        };
      }

      // No exact match on any platform — keyword fallback
      console.warn(`[SmartSearch] No exact username match for @${classification.handle}, falling back to keyword search`);
      const fallback = await searchCreators(classification.keyword, options);
      return {
        exactMatch: null,
        relatedCreators: fallback.creators,
        relatedTotal: fallback.total,
        classification,
        exactMatchRaw: null,
      };
    }

    case "username": {
      // Single word — try as handle (cross-platform) AND keyword in parallel
      const [handleResult, keywordResult] = await Promise.allSettled([
        crossPlatformHandleSearch(classification.handle!, platform),
        searchCreators(classification.keyword, options),
      ]);

      const found = handleResult.status === "fulfilled" ? handleResult.value : null;
      const exact = found?.creators[0] ?? null;
      const exactRaw = found?.rawResponse ?? null;

      const related = keywordResult.status === "fulfilled"
        ? keywordResult.value.creators.filter(c =>
            // Don't duplicate exact match in related results
            !exact || c.username?.toLowerCase() !== exact.username?.toLowerCase()
          )
        : [];
      const relatedTotal = keywordResult.status === "fulfilled" ? keywordResult.value.total : 0;

      return {
        exactMatch: exact,
        relatedCreators: related,
        relatedTotal,
        classification,
        exactMatchRaw: exactRaw,
      };
    }

    case "person_name": {
      // Try multiple handle variations (on primary platform) + keyword search in parallel
      const variations = classification.handleVariations.slice(0, 4);
      console.log(`[SmartSearch] Person name "${raw}" — trying handle variations:`, variations);

      const [handleResults, keywordResult] = await Promise.allSettled([
        // Try up to 4 handle variations in parallel on the primary platform
        Promise.any(
          variations.map(async (handle) => {
            const result = await searchByUsername(handle, platform);
            if (result.creators.length === 0) throw new Error("No result");
            return result;
          })
        ),
        searchCreators(classification.keyword, options),
      ]);

      const exact = handleResults.status === "fulfilled" ? handleResults.value.creators[0] : null;
      const exactRaw = handleResults.status === "fulfilled" ? handleResults.value.rawResponse : null;

      if (!exact) {
        console.log(`[SmartSearch] No handle match for name "${raw}", showing keyword results only`);
      }

      const related = keywordResult.status === "fulfilled"
        ? keywordResult.value.creators.filter(c =>
            !exact || c.username?.toLowerCase() !== exact.username?.toLowerCase()
          )
        : [];
      const relatedTotal = keywordResult.status === "fulfilled" ? keywordResult.value.total : 0;

      return {
        exactMatch: exact,
        relatedCreators: related,
        relatedTotal,
        classification,
        exactMatchRaw: exactRaw,
      };
    }

    case "keyword":
    default: {
      // Pure keyword search
      const result = await searchCreators(classification.keyword, options);
      return {
        exactMatch: null,
        relatedCreators: result.creators,
        relatedTotal: result.total,
        classification,
        exactMatchRaw: null,
      };
    }
  }
}
