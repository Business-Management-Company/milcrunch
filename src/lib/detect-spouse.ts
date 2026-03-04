import { supabase } from "@/integrations/supabase/client";

/**
 * Keywords that indicate military spouse status.
 * Checked against bio, intelligence_summary, handle/username, full_name, job titles.
 */
const SPOUSE_PATTERNS: RegExp[] = [
  /\bmil[\s-]?spouse\b/i,
  /\bmilitary\s+spouse\b/i,
  /\bmilitary\s+wife\b/i,
  /\bmilitary\s+husband\b/i,
  /\bnavy\s+wife\b/i,
  /\barmy\s+wife\b/i,
  /\bmarine\s+wife\b/i,
  /\bair\s+force\s+wife\b/i,
  /\bnavy\s+husband\b/i,
  /\barmy\s+husband\b/i,
  /\bspouse\s+of\b/i,
  /\bmarried\s+to\s+a\b/i,
  /\bmilitary\s+family\b/i,
  /\bmilfam\b/i,
  /\bmilso\b/i,
];

const HANDLE_PATTERNS: RegExp[] = [
  /milspouse/i,
  /milwife/i,
  /militaryspouse/i,
];

const STATUS_MATCH = /\bspouse\b/i;

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/**
 * Deep-search enrichment_data for text fields that might contain spouse keywords.
 * Checks: bio, biography, description, intelligence_summary, about, category.
 */
function searchEnrichmentText(enrichData: unknown): string {
  if (!enrichData || typeof enrichData !== "object") return "";
  const TEXT_KEYS = [
    "bio", "biography", "description", "intelligence_summary",
    "about", "category", "full_name", "name", "username",
  ];
  const parts: string[] = [];

  const extract = (obj: Record<string, unknown>, depth: number) => {
    if (depth > 3) return;
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === "string" && (TEXT_KEYS.includes(key) || key.toLowerCase().includes("bio") || key.toLowerCase().includes("summary"))) {
        parts.push(val);
      } else if (val && typeof val === "object" && !Array.isArray(val)) {
        extract(val as Record<string, unknown>, depth + 1);
      }
    }
  };
  extract(enrichData as Record<string, unknown>, 0);
  return parts.join(" ");
}

/**
 * Extract job titles from enrichment data (PDL/LinkedIn work history).
 */
function extractJobTitles(enrichData: unknown): string {
  if (!enrichData || typeof enrichData !== "object") return "";
  const data = enrichData as Record<string, unknown>;
  const titles: string[] = [];

  // Check pdl_data.experience or work_history
  for (const key of ["experience", "work_history", "jobs", "positions"]) {
    const arr = (data[key] ?? (data.pdl_data as Record<string, unknown>)?.[key]) as unknown[];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (item && typeof item === "object") {
          const job = item as Record<string, unknown>;
          if (typeof job.title === "string") titles.push(job.title);
          if (typeof job.job_title === "string") titles.push(job.job_title);
          if (typeof job.role === "string") titles.push(job.role);
          if (typeof job.company === "string") titles.push(job.company);
        }
      }
    }
  }
  return titles.join(" ");
}

export interface SpouseDetectable {
  status?: string | null;
  bio?: string | null;
  handle?: string | null;
  creator_handle?: string | null;
  display_name?: string | null;
  creator_name?: string | null;
  profile_slug?: string | null;
  enrichment_data?: unknown;
  work_history?: unknown;
}

/**
 * Detect whether a creator is a military spouse by examining all available fields.
 * Returns true if any signal is found.
 */
export function detectMilitarySpouse(creator: SpouseDetectable): boolean {
  // 1. military_status / status field
  const status = creator.status ?? "";
  if (STATUS_MATCH.test(status)) return true;

  // 2. Bio text
  const bio = creator.bio ?? "";
  if (matchesAny(bio, SPOUSE_PATTERNS)) return true;

  // 3. Handle / username
  const handle = creator.handle ?? creator.creator_handle ?? "";
  if (matchesAny(handle, HANDLE_PATTERNS)) return true;

  // 4. Display name
  const name = creator.display_name ?? creator.creator_name ?? "";
  if (matchesAny(name, SPOUSE_PATTERNS)) return true;

  // 5. Profile slug (e.g. brittany-campbell-milspouse-lifestyle)
  const slug = creator.profile_slug ?? "";
  if (matchesAny(slug, HANDLE_PATTERNS)) return true;

  // 6. Enrichment data text fields (bio, intelligence_summary, etc.)
  const enrichText = searchEnrichmentText(creator.enrichment_data);
  if (matchesAny(enrichText, SPOUSE_PATTERNS)) return true;

  // 7. Job titles from work history / PDL data
  const jobText = extractJobTitles(creator.enrichment_data) +
    " " + extractJobTitles(creator.work_history);
  if (matchesAny(jobText, SPOUSE_PATTERNS)) return true;

  return false;
}

/**
 * If spouse is detected but military_status is null or doesn't include "spouse",
 * upsert military_status = "Military Spouse" in directory_members.
 * Fire-and-forget — does not block render.
 */
export function backgroundUpdateSpouseStatus(
  creatorId: string,
  currentStatus: string | null,
): void {
  // Only update if status doesn't already reflect spouse
  if (currentStatus && STATUS_MATCH.test(currentStatus)) return;

  supabase
    .from("directory_members")
    .update({ status: "Military Spouse" })
    .eq("id", creatorId)
    .then(({ error }) => {
      if (error) {
        console.warn("[SpouseDetect] Background upsert failed:", error.message);
      } else {
        console.log("[SpouseDetect] Updated status to 'Military Spouse' for:", creatorId);
      }
    });
}
