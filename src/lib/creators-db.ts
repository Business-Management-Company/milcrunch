import { supabase } from "@/integrations/supabase/client";

export type FeaturedSection = "hero" | "grid" | "both";

export interface CreatorRow {
  id: string;
  display_name: string;
  handle: string;
  platform: string;
  avatar_url: string | null;
  follower_count: number | null;
  engagement_rate: number | null;
  category: string | null;
  bio: string | null;
  location: string | null;
  is_verified: boolean;
  is_featured: boolean;
  featured_section: string;
  featured_sort_order: number;
  created_at: string | null;
}

/** Hero: 3 cards from creators where is_featured and section in (hero, both). */
export async function fetchFeaturedHero(limit = 3): Promise<CreatorRow[]> {
  const { data, error } = await supabase
    .from("creators")
    .select("*")
    .eq("is_featured", true)
    .in("featured_section", ["hero", "both"])
    .order("featured_sort_order", { ascending: true })
    .limit(limit);
  if (error) {
    console.warn("[creators] Hero fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as CreatorRow[];
}

/** Big Names grid: up to 8 from creators where is_featured and section in (grid, both). */
export async function fetchFeaturedGrid(limit = 8): Promise<CreatorRow[]> {
  const { data, error } = await supabase
    .from("creators")
    .select("*")
    .eq("is_featured", true)
    .in("featured_section", ["grid", "both"])
    .order("featured_sort_order", { ascending: true })
    .limit(limit);
  if (error) {
    console.warn("[creators] Grid fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as CreatorRow[];
}

/** Directory: all creators, optional filter by is_featured. */
export async function fetchCreators(options: {
  featuredOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<CreatorRow[]> {
  let q = supabase.from("creators").select("*").order("created_at", { ascending: false });
  if (options.featuredOnly) q = q.eq("is_featured", true);
  if (options.limit != null) q = q.limit(options.limit);
  if (options.offset != null) q = q.range(options.offset, options.offset + (options.limit ?? 50) - 1);
  const { data, error } = await q;
  if (error) {
    console.warn("[creators] Fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as CreatorRow[];
}

/** Get a single creator by handle (for bio page). Prefers instagram row if multiple platforms. */
export async function getCreatorByHandle(handle: string): Promise<CreatorRow | null> {
  const normalized = handle.replace(/^@/, "").trim().toLowerCase();
  const { data, error } = await supabase
    .from("creators")
    .select("*")
    .ilike("handle", normalized)
    .order("platform", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as CreatorRow;
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

/** Upsert creator by (platform, handle); returns id. Use for import from Discovery (avatar_url = profile picture). */
export async function upsertCreator(row: {
  display_name: string;
  handle: string;
  platform?: string;
  avatar_url?: string | null;
  follower_count?: number | null;
  engagement_rate?: number | null;
  category?: string | null;
  bio?: string | null;
  location?: string | null;
  is_verified?: boolean;
}): Promise<{ id: string } | null> {
  const handle = row.handle.replace(/^@/, "").trim();
  const { data, error } = await supabase
    .from("creators")
    .upsert(
      {
        display_name: row.display_name.trim(),
        handle,
        platform: row.platform ?? "instagram",
        avatar_url: row.avatar_url ?? null,
        follower_count: row.follower_count ?? null,
        engagement_rate: row.engagement_rate ?? null,
        category: row.category ?? null,
        bio: row.bio ?? null,
        location: row.location ?? null,
        is_verified: row.is_verified ?? false,
      },
      { onConflict: "platform,handle", ignoreDuplicates: false }
    )
    .select("id")
    .single();
  if (error) {
    console.warn("[creators-db] upsert error:", error.message);
    return null;
  }
  return data as { id: string };
}

/** Set featured state for a creator. */
export async function setFeatured(
  creatorId: string,
  payload: { is_featured: boolean; featured_section?: FeaturedSection; featured_sort_order?: number }
): Promise<boolean> {
  const { error } = await supabase.from("creators").update(payload).eq("id", creatorId);
  return !error;
}
