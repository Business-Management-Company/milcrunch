/**
 * Smart Search Router — detects query type and routes to the cheapest/best API.
 *
 * Detection rules (checked in order):
 * 1. Starts with @ → HANDLE (Enrich raw, 0.03 credits)
 * 2. Contains social media URL → Extract handle, HANDLE search
 * 3. Single word, looks like username → Try HANDLE first, fall back to KEYWORD
 * 4. Two words, looks like person name → Try concatenated handle + keyword in parallel
 * 5. Multiple words / general topic → KEYWORD search (Discovery API)
 * 6. Contains filter hints → Parse into Discovery filters
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
  | "person_name"  // Two words that look like a real name
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

/** Returns true if the string looks like a single username (no spaces, common chars) */
function looksLikeUsername(s: string): boolean {
  return /^[a-z0-9][a-z0-9._]{1,29}$/i.test(s) && !/\s/.test(s);
}

/** Returns true if the string looks like a person's name (2 words, capitalized or could be) */
function looksLikePersonName(s: string): boolean {
  const parts = s.trim().split(/\s+/);
  if (parts.length !== 2) return false;
  // Each part should be alphabetic (allowing hyphens)
  return parts.every(p => /^[a-zA-Z][a-zA-Z'-]{0,20}$/.test(p));
}

/** Generate handle variations from a person's name */
function generateHandleVariations(name: string): string[] {
  const parts = name.trim().toLowerCase().split(/\s+/);
  if (parts.length !== 2) return [name.toLowerCase().replace(/\s+/g, "")];

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

  // 4. Two words, looks like a person name
  if (looksLikePersonName(trimmed)) {
    const variations = generateHandleVariations(trimmed);
    return {
      type: "person_name",
      handle: variations[0],  // Primary: firstlast
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
 */
export async function smartSearch(
  raw: string,
  options: SearchCreatorsOptions = {}
): Promise<SmartSearchResult> {
  const classification = classifyQuery(raw);
  const platform = options.platform || classification.detectedPlatform || "instagram";

  switch (classification.type) {
    case "handle": {
      // Direct handle lookup — cheapest (0.03 credits)
      try {
        const result = await searchByUsername(classification.handle!, platform);
        if (result.creators.length > 0) {
          return {
            exactMatch: result.creators[0],
            relatedCreators: [],
            relatedTotal: 0,
            classification,
            exactMatchRaw: result.rawResponse,
          };
        }
      } catch (err) {
        console.warn("[SmartSearch] Handle lookup failed:", err);
      }
      // If handle lookup fails, fall back to keyword search
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
      // Single word — try as handle AND keyword in parallel
      const [handleResult, keywordResult] = await Promise.allSettled([
        searchByUsername(classification.handle!, platform),
        searchCreators(classification.keyword, options),
      ]);

      const exact = handleResult.status === "fulfilled" && handleResult.value.creators.length > 0
        ? handleResult.value.creators[0]
        : null;
      const exactRaw = handleResult.status === "fulfilled" && handleResult.value.creators.length > 0
        ? handleResult.value.rawResponse
        : null;

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
      // Try multiple handle variations in parallel + keyword search
      const variations = classification.handleVariations.slice(0, 3); // Max 3 to save credits

      const [handleResults, keywordResult] = await Promise.allSettled([
        // Try up to 3 handle variations in parallel
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
