/**
 * Shared helper to extract verified social platforms from
 * Influencers.club enrichment_data stored in directory_members.
 *
 * enrichment_data.result contains platform keys (instagram, tiktok, youtube, etc.)
 * each with { username, url, ... } and a creator_has map of boolean flags.
 */

import { normalizePlatform } from "@/lib/platform-icons";

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
  x: {
    label: "X",
    pillClass: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
    urlBuilder: (u) => `https://x.com/${u}`,
  },
};

const PLATFORM_ORDER = ["instagram", "tiktok", "youtube", "facebook", "twitter", "x"];

/**
 * Extract verified social platforms from IC enrichment_data.
 * Only returns platforms with a non-empty username.
 * Excludes LinkedIn unless it appears as a direct IC platform key.
 */
export interface PlatformStats {
  platform: string;
  label: string;
  username: string;
  url: string;
  followers: number;
  engagementRate: number | null;
  avgLikes: number | null;
  avgComments: number | null;
}

export interface CrossPlatformSummary {
  totalReach: number;
  platformStats: PlatformStats[];
  mostEngagedPlatform: string | null;
  avgEngagement: number | null;
}

/**
 * Extract per-platform stats (followers, engagement) from enrichment_data.
 * Returns stats for each platform that has data in enrichment_data.result.
 */
export function getPlatformStatsFromEnrichment(enrichmentData: unknown): PlatformStats[] {
  if (!enrichmentData || typeof enrichmentData !== "object") return [];

  const ed = enrichmentData as Record<string, unknown>;
  const result = (ed.result as Record<string, unknown>) ?? ed;
  const stats: PlatformStats[] = [];

  const EXTENDED_ORDER = [...PLATFORM_ORDER, "linkedin"];
  const EXTENDED_CONFIG: Record<string, { label: string; urlBuilder: (u: string) => string }> = {
    ...Object.fromEntries(Object.entries(PLATFORM_CONFIG).map(([k, v]) => [k, { label: v.label, urlBuilder: v.urlBuilder }])),
    linkedin: { label: "LinkedIn", urlBuilder: (u: string) => `https://linkedin.com/in/${u}` },
  };

  for (const key of EXTENDED_ORDER) {
    const config = EXTENDED_CONFIG[key];
    if (!config) continue;

    const platformData = result[key];
    if (!platformData || typeof platformData !== "object") continue;

    const pd = platformData as Record<string, unknown>;
    const username = (pd.username ?? pd.handle) as string | undefined;
    if (!username || typeof username !== "string" || !username.trim()) continue;

    const cleanUsername = username.replace(/^@/, "").trim();
    const url = (typeof pd.url === "string" && pd.url.trim()) ? pd.url : config.urlBuilder(cleanUsername);

    const followers = Number(
      pd.follower_count ?? pd.followers ?? pd.subscriber_count ?? pd.subscribers ?? 0
    );
    const er = Number(pd.engagement_percent ?? pd.engagement_rate ?? pd.er ?? 0) || null;
    const avgLikes = Number(pd.avg_likes ?? pd.average_likes ?? 0) || null;
    const avgComments = Number(pd.avg_comments ?? pd.average_comments ?? 0) || null;

    stats.push({
      platform: normalizePlatform(key),
      label: config.label,
      username: cleanUsername,
      url,
      followers,
      engagementRate: er,
      avgLikes,
      avgComments,
    });
  }

  return stats;
}

/**
 * Build a cross-platform summary: total reach, most engaged, avg engagement.
 */
export function getCrossPlatformSummary(enrichmentData: unknown): CrossPlatformSummary {
  const platformStats = getPlatformStatsFromEnrichment(enrichmentData);
  const totalReach = platformStats.reduce((sum, p) => sum + p.followers, 0);

  let mostEngagedPlatform: string | null = null;
  let maxEr = 0;
  const erValues: number[] = [];

  for (const p of platformStats) {
    if (p.engagementRate && p.engagementRate > maxEr) {
      maxEr = p.engagementRate;
      mostEngagedPlatform = p.label;
    }
    if (p.engagementRate) erValues.push(p.engagementRate);
  }

  const avgEngagement = erValues.length > 0
    ? erValues.reduce((a, b) => a + b, 0) / erValues.length
    : null;

  return { totalReach, platformStats, mostEngagedPlatform, avgEngagement };
}

/**
 * Format a follower count compactly: 1234 → "1.2K", 1234567 → "1.2M"
 */
export function formatCompactFollowers(n: number): string {
  if (!n || n <= 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

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
