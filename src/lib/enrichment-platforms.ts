/**
 * Shared helper to extract verified social platforms from
 * Influencers.club enrichment_data stored in directory_members.
 *
 * enrichment_data.result contains platform keys (instagram, tiktok, youtube, etc.)
 * each with { username, url, ... } and a creator_has map of boolean flags.
 */

export interface EnrichmentPlatform {
  platform: string;
  label: string;
  username: string;
  url: string;
  pillClass: string;
}

const PLATFORM_CONFIG: Record<string, { label: string; pillClass: string; urlBuilder: (u: string) => string }> = {
  instagram: {
    label: "Instagram",
    pillClass: "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100",
    urlBuilder: (u) => `https://instagram.com/${u}`,
  },
  tiktok: {
    label: "TikTok",
    pillClass: "bg-slate-900 text-white border-slate-900 hover:bg-slate-800",
    urlBuilder: (u) => `https://tiktok.com/@${u}`,
  },
  youtube: {
    label: "YouTube",
    pillClass: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    urlBuilder: (u) => `https://youtube.com/@${u}`,
  },
  facebook: {
    label: "Facebook",
    pillClass: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    urlBuilder: (u) => `https://facebook.com/${u}`,
  },
  twitter: {
    label: "X",
    pillClass: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
    urlBuilder: (u) => `https://x.com/${u}`,
  },
};

const PLATFORM_ORDER = ["instagram", "tiktok", "youtube", "facebook", "twitter"];

/**
 * Extract verified social platforms from IC enrichment_data.
 * Only returns platforms with a non-empty username.
 * Excludes LinkedIn unless it appears as a direct IC platform key.
 */
export function getPlatformsFromEnrichmentData(enrichmentData: unknown): EnrichmentPlatform[] {
  if (!enrichmentData || typeof enrichmentData !== "object") return [];

  const ed = enrichmentData as Record<string, unknown>;
  const result = (ed.result as Record<string, unknown>) ?? ed;

  const platforms: EnrichmentPlatform[] = [];

  for (const key of PLATFORM_ORDER) {
    const config = PLATFORM_CONFIG[key];
    if (!config) continue;

    const platformData = result[key];
    if (!platformData || typeof platformData !== "object") continue;

    const pd = platformData as Record<string, unknown>;
    const username = (pd.username ?? pd.handle) as string | undefined;
    if (!username || typeof username !== "string" || !username.trim()) continue;

    const cleanUsername = username.replace(/^@/, "").trim();
    const url = (typeof pd.url === "string" && pd.url.trim()) ? pd.url : config.urlBuilder(cleanUsername);

    platforms.push({
      platform: key,
      label: config.label,
      username: cleanUsername,
      url,
      pillClass: config.pillClass,
    });
  }

  return platforms;
}
