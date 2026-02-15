import { supabase } from "@/integrations/supabase/client";

export interface FeaturedCreator {
  id: string;
  display_name: string;
  handle: string;
  platform: string;
  avatar_url: string | null;
  follower_count: number | null;
  engagement_rate: number | null;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  is_verified: boolean;
  approved: boolean;
  created_at: string | null;
}

export interface ShowcaseCreator extends FeaturedCreator {
  branch: string | null;
  status: string | null;
  bio: string | null;
  platforms: string[];
  paradedeck_verified: boolean;
  influencersclub_verified: boolean;
  profile_slug: string | null;
  ic_avatar_url: string | null;
}

/** For hero: top 3 active + approved featured creators by sort_order. */
export async function fetchFeaturedHero(limit = 3): Promise<FeaturedCreator[]> {
  const { data, error } = await supabase
    .from("featured_creators")
    .select("*")
    .eq("is_active", true)
    .eq("approved", true)
    .order("sort_order", { ascending: true })
    .limit(limit);
  if (error) {
    console.warn("[featured-creators] Hero fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as FeaturedCreator[];
}

/** For Big Names grid: up to 8 active + approved featured creators. */
export async function fetchFeaturedGrid(limit = 8): Promise<FeaturedCreator[]> {
  const { data, error } = await supabase
    .from("featured_creators")
    .select("*")
    .eq("is_active", true)
    .eq("approved", true)
    .order("sort_order", { ascending: true })
    .limit(limit);
  if (error) {
    console.warn("[featured-creators] Grid fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as FeaturedCreator[];
}

/** Showcase grid: 20 active + approved featured creators with branch/status/platforms data. */
export async function fetchShowcaseCreators(limit = 20): Promise<ShowcaseCreator[]> {
  const { data, error } = await supabase
    .from("featured_creators")
    .select("*")
    .eq("is_active", true)
    .eq("approved", true)
    .order("sort_order", { ascending: true })
    .limit(limit);
  if (error) {
    console.warn("[featured-creators] Showcase fetch failed:", error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row as FeaturedCreator),
    branch: (row.branch as string) ?? null,
    status: (row.status as string) ?? null,
    bio: (row.bio as string) ?? null,
    platforms: Array.isArray(row.platforms) ? row.platforms as string[] : [],
    paradedeck_verified: (row.paradedeck_verified as boolean) ?? false,
    influencersclub_verified: (row.influencersclub_verified as boolean) ?? false,
    profile_slug: (row.profile_slug as string) ?? null,
    ic_avatar_url: (row.ic_avatar_url as string) ?? null,
  }));
}

/** Detect military branch from bio text. Returns null if not found. */
export function detectBranch(bio: string): string | null {
  const patterns: [RegExp, string][] = [
    [/\barmy\b/i, "Army"],
    [/\bnavy\b/i, "Navy"],
    [/\bair\s*force\b/i, "Air Force"],
    [/\bmarine[s]?\b|\busmc\b/i, "Marines"],
    [/\bcoast\s*guard\b/i, "Coast Guard"],
    [/\bspace\s*force\b/i, "Space Force"],
    [/\bnational\s*guard\b/i, "National Guard"],
  ];
  for (const [pattern, branch] of patterns) {
    if (pattern.test(bio)) return branch;
  }
  return null;
}

/** Upsert a creator into featured_creators with approved = true for directory. */
export async function approveForDirectory(data: {
  handle: string;
  display_name: string;
  platform: string;
  avatar_url?: string | null;
  follower_count?: number | null;
  engagement_rate?: number | null;
  bio?: string | null;
  branch?: string | null;
  status?: string | null;
  platforms?: string[];
  platform_urls?: Record<string, string>;
  category?: string | null;
  ic_avatar_url?: string | null;
  enrichment_data?: unknown;
  source_list_id?: string | null;
  added_by?: string | null;
}): Promise<{ error: string | null }> {
  const handle = data.handle.replace(/^@/, "").trim();
  // Get max sort_order so new entries go to end
  const { data: maxRow } = await supabase
    .from("featured_creators")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (maxRow?.[0]?.sort_order ?? 0) + 1;

  const payload: Record<string, unknown> = {
    display_name: data.display_name,
    handle,
    platform: data.platform || "instagram",
    avatar_url: data.avatar_url || null,
    follower_count: data.follower_count ?? null,
    engagement_rate: data.engagement_rate ?? null,
    bio: data.bio || null,
    branch: data.branch || null,
    status: data.status || null,
    platforms: data.platforms || [],
    platform_urls: data.platform_urls || {},
    category: data.category || null,
    ic_avatar_url: data.ic_avatar_url || null,
    approved: true,
    is_active: true,
    sort_order: nextOrder,
    added_at: new Date().toISOString(),
  };

  if (data.enrichment_data) payload.enrichment_data = data.enrichment_data;
  if (data.source_list_id) payload.source_list_id = data.source_list_id;
  if (data.added_by) payload.added_by = data.added_by;

  // Upsert by handle + platform
  const { error } = await supabase
    .from("featured_creators")
    .upsert(payload, { onConflict: "platform,handle", ignoreDuplicates: false });

  if (error) return { error: error.message };
  return { error: null };
}

/** Toggle approved status of a featured creator. */
export async function toggleDirectoryApproval(id: string, approved: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("featured_creators")
    .update({ approved })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

/** Fetch ALL directory creators (both approved and unapproved) for admin management. */
export async function fetchAllDirectoryCreators(): Promise<ShowcaseCreator[]> {
  const { data, error } = await supabase
    .from("featured_creators")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.warn("[featured-creators] Admin fetch failed:", error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row as FeaturedCreator),
    branch: (row.branch as string) ?? null,
    status: (row.status as string) ?? null,
    bio: (row.bio as string) ?? null,
    platforms: Array.isArray(row.platforms) ? row.platforms as string[] : [],
    paradedeck_verified: (row.paradedeck_verified as boolean) ?? false,
    influencersclub_verified: (row.influencersclub_verified as boolean) ?? false,
    profile_slug: (row.profile_slug as string) ?? null,
    ic_avatar_url: (row.ic_avatar_url as string) ?? null,
  }));
}

/** Soft-remove a creator from directory (set approved = false, keep data). */
export async function removeFromDirectory(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("featured_creators")
    .update({ approved: false })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

export function formatFollowerCount(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function getInitials(displayName: string, handle: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (displayName.length >= 2) return displayName.slice(0, 2).toUpperCase();
  if (handle.length >= 2) return handle.slice(0, 2).toUpperCase();
  return "?";
}
