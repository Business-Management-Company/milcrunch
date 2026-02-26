/**
 * AI-powered natural language search parser for Discovery page.
 * Detects conversational queries and uses Claude Haiku to extract
 * structured search filters, then builds a human-readable summary.
 */

export interface NLSearchFilters {
  count?: number;
  branch?: string;
  location?: string;
  keyword?: string;
  min_followers?: number;
  max_followers?: number;
  platform?: string;
  gender?: string;
  engagement_min?: number;
  category?: string;
}

export interface NLSearchResult {
  success: boolean;
  filters: NLSearchFilters;
  summary: string;
}

// ── Detection ────────────────────────────────────────────────────────

const TRIGGER_PHRASES = [
  "looking for",
  "find me",
  "show me",
  "i need",
  "i want",
  "can you find",
  "search for",
  "get me",
  "help me find",
  "i'm looking",
  "im looking",
  "who are",
  "give me",
];

const NL_CONNECTORS = /\b(in|with|who|that|from|based|located|living|near|around|have|has|over|under|between|more than|at least)\b/i;

/**
 * Returns true if the query looks like a natural language sentence
 * rather than a simple keyword or handle search.
 */
export function isNaturalLanguageQuery(query: string): boolean {
  const q = query.trim();
  if (!q || q.startsWith("@")) return false;
  // URL check
  if (/^https?:\/\//i.test(q)) return false;
  // Single word → keyword search
  if (q.split(/\s+/).length <= 2) return false;

  const lower = q.toLowerCase();

  // Check for trigger phrases
  if (TRIGGER_PHRASES.some((p) => lower.includes(p))) return true;

  // Longer query with connectors → likely NL
  const wordCount = q.split(/\s+/).length;
  if (wordCount > 5 && NL_CONNECTORS.test(q)) return true;

  return false;
}

// ── Follower / Engagement mapping ────────────────────────────────────

export function followersToRange(min: number): string {
  if (min >= 1_000_000) return "mega";
  if (min >= 500_000) return "macro";
  if (min >= 100_000) return "mid";
  if (min >= 50_000) return "mid-micro";
  if (min >= 10_000) return "micro";
  if (min >= 1_000) return "nano";
  return "any";
}

export function engagementToOption(val: number): string {
  const options = [1, 2, 3, 5];
  return String(options.reduce((prev, curr) =>
    Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
  ));
}

function formatFollowerCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}

// ── Summary builder ──────────────────────────────────────────────────

function buildSummary(f: NLSearchFilters): string {
  const parts: string[] = [];
  if (f.count) parts.push(`${f.count}`);
  if (f.gender) parts.push(f.gender);
  if (f.branch) parts.push(f.branch);
  if (f.category) parts.push(f.category);
  if (parts.length === 0 && f.keyword) parts.push(f.keyword);
  if (parts.length === 0) parts.push("creators");
  else if (!f.category) parts.push("creators");

  let summary = parts.join(" ");
  if (f.location) summary += ` in ${f.location}`;
  if (f.min_followers) summary += ` with ${formatFollowerCount(f.min_followers)}+ followers`;
  if (f.platform) summary += ` on ${f.platform.charAt(0).toUpperCase() + f.platform.slice(1)}`;
  if (f.engagement_min) summary += ` (>${f.engagement_min}% engagement)`;

  // Capitalize first letter
  return summary.charAt(0).toUpperCase() + summary.slice(1);
}

// ── AI Parser ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You extract search filters from creator discovery queries on a military influencer platform. Return ONLY valid JSON with this schema (omit null/undefined fields):

{
  "count": number,
  "branch": "Army" | "Navy" | "Air Force" | "Marines" | "Coast Guard",
  "location": "city, state or region string",
  "keyword": "remaining search keywords after filters extracted",
  "min_followers": number,
  "max_followers": number,
  "platform": "instagram" | "tiktok" | "youtube" | "twitter",
  "gender": "male" | "female",
  "engagement_min": number,
  "category": "podcasters" | "speakers" | "authors" | "brand-ambassadors"
}

Rules:
- Parse follower counts: "50k" = 50000, "1M" = 1000000, "10k+" means min_followers
- "veteran", "military", "mil spouse" etc. are keywords, not branches
- Only set branch for explicit branch mentions (Army, Navy, etc.)
- location should be the most specific location mentioned
- keyword should contain the core search topic (fitness, lifestyle, etc.), NOT the structural words
- If no specific keyword topic beyond military/veteran, omit keyword`;

export async function parseNaturalLanguageSearch(query: string): Promise<NLSearchResult> {
  try {
    const res = await fetch("/api/anthropic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: query }],
      }),
    });

    if (!res.ok) {
      console.warn("[nl-search-parser] API returned", res.status);
      return { success: false, filters: {}, summary: "" };
    }

    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? "";

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      console.warn("[nl-search-parser] No JSON found in response");
      return { success: false, filters: {}, summary: "" };
    }

    const filters: NLSearchFilters = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

    // Validate we got at least one useful filter
    const hasFilters = filters.branch || filters.location || filters.keyword ||
      filters.min_followers || filters.platform || filters.gender ||
      filters.engagement_min || filters.category || filters.count;

    if (!hasFilters) {
      return { success: false, filters: {}, summary: "" };
    }

    const summary = buildSummary(filters);
    console.log("[nl-search-parser] Parsed:", filters, "→", summary);

    return { success: true, filters, summary };
  } catch (err) {
    console.warn("[nl-search-parser] Parse failed:", err);
    return { success: false, filters: {}, summary: "" };
  }
}
