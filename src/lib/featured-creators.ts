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

/** For hero: top 3 active featured creators by sort_order. */
export async function fetchFeaturedHero(limit = 3): Promise<FeaturedCreator[]> {
  const { data, error } = await supabase
    .from("featured_creators")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(limit);
  if (error) {
    console.warn("[featured-creators] Hero fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as FeaturedCreator[];
}

/** For Big Names grid: up to 8 active featured creators. */
export async function fetchFeaturedGrid(limit = 8): Promise<FeaturedCreator[]> {
  const { data, error } = await supabase
    .from("featured_creators")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(limit);
  if (error) {
    console.warn("[featured-creators] Grid fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as FeaturedCreator[];
}

/** Showcase grid: 20 active featured creators with branch/status/platforms data. */
export async function fetchShowcaseCreators(limit = 20): Promise<ShowcaseCreator[]> {
  const { data, error } = await supabase
    .from("featured_creators")
    .select("*")
    .eq("is_active", true)
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
