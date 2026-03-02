import { supabase } from "@/integrations/supabase/client";

// ── Legacy "creators" table has been retired ──
// All creator data now lives in directory_members (single source of truth).
// This file retains the exported interface + utility functions so callers
// (HomePage, CreatorBioPage, BrandDiscover) continue to work.

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

/** Get a single creator by handle (for bio page). Queries directory_members. */
export async function getCreatorByHandle(handle: string): Promise<CreatorRow | null> {
  const normalized = handle.replace(/^@/, "").trim().toLowerCase();
  const { data, error } = await supabase
    .from("directory_members")
    .select("id, creator_name, creator_handle, platform, avatar_url, follower_count, engagement_rate, category, bio, added_at, featured_homepage, sort_order")
    .ilike("creator_handle", normalized)
    .order("platform", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    display_name: (data.creator_name as string) ?? normalized,
    handle: (data.creator_handle as string) ?? normalized,
    platform: (data.platform as string) ?? "instagram",
    avatar_url: (data.avatar_url as string) ?? null,
    follower_count: (data.follower_count as number) ?? null,
    engagement_rate: (data.engagement_rate as number) ?? null,
    category: (data.category as string) ?? null,
    bio: (data.bio as string) ?? null,
    location: null,
    is_verified: false,
    is_featured: !!(data.featured_homepage),
    featured_section: "grid",
    featured_sort_order: (data.sort_order as number) ?? 999,
    created_at: (data.added_at as string) ?? null,
  } as CreatorRow;
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

/** Upsert creator into directory_members by (platform, creator_handle). Used by Discovery Import. */
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
  const handle = row.handle.replace(/^@/, "").trim().toLowerCase();
  const platform = row.platform ?? "instagram";

  // Check if this creator already exists in directory_members
  const { data: existing } = await supabase
    .from("directory_members")
    .select("id")
    .eq("platform", platform)
    .ilike("creator_handle", handle)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from("directory_members")
      .update({
        creator_name: row.display_name.trim(),
        avatar_url: row.avatar_url ?? null,
        follower_count: row.follower_count ?? null,
        engagement_rate: row.engagement_rate ?? null,
        category: row.category ?? null,
        bio: row.bio ?? null,
      })
      .eq("id", existing.id);
    if (error) {
      console.warn("[creators-db] update error:", error.message);
      return null;
    }
    return { id: existing.id };
  }

  // Insert new record — need a directory_id. Use the first available directory.
  const { data: dir } = await supabase
    .from("directories")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!dir) {
    console.warn("[creators-db] No directories found — cannot insert creator");
    return null;
  }

  const { data, error } = await supabase
    .from("directory_members")
    .insert({
      directory_id: dir.id,
      creator_name: row.display_name.trim(),
      creator_handle: handle,
      platform,
      avatar_url: row.avatar_url ?? null,
      follower_count: row.follower_count ?? null,
      engagement_rate: row.engagement_rate ?? null,
      category: row.category ?? null,
      bio: row.bio ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.warn("[creators-db] insert error:", error.message);
    return null;
  }
  return data as { id: string };
}
