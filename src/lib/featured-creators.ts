import { supabase } from "@/integrations/supabase/client";
import { generateProfileSlug, uploadCreatorImage } from "@/lib/directories";

// Homepage showcase functions use `featured_creators` table.
// Directory/network page functions use `directory_members` table
// with columns: creator_handle, creator_name, avatar_url, directory_id, etc.

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
  platform_urls?: Record<string, string>;
  enrichment_data?: unknown;
  featured_homepage?: boolean;
  avg_views?: string | null;
  avg_likes?: string | null;
}

/** Fetch up to 3 featured creators for the homepage hero cards. */
export async function fetchFeaturedHomepageCreators(): Promise<ShowcaseCreator[]> {
  const { data, error } = await supabase
    .from("featured_creators")
    .select("*")
    .eq("is_active", true)
    .eq("approved", true)
    .order("sort_order", { ascending: true })
    .limit(3);
  if (error) {
    console.warn("[featured-creators] Homepage featured fetch failed:", error.message);
    return [];
  }
  return (data ?? []).map((r: Record<string, unknown>) => mapFeaturedRow(r));
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

/** Showcase grid: approved directory members (deduplicated). */
export async function fetchShowcaseCreators(limit = 20): Promise<ShowcaseCreator[]> {
  const { data, error } = await supabase
    .from("directory_members")
    .select("*")
    .eq("approved", true)
    .order("sort_order", { ascending: true })
    .limit(limit * 2); // over-fetch for dedup
  if (error) {
    console.error("[featured-creators] Showcase fetch FAILED:", error.message, error.details, error.hint);
    return [];
  }
  console.log("[featured-creators] Showcase returned:", data?.length ?? 0, "approved rows");
  // Deduplicate by handle+platform
  const seen = new Set<string>();
  const unique: ShowcaseCreator[] = [];
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const handle = (r.creator_handle as string) ?? "";
    const platform = (r.platform as string) ?? "instagram";
    const key = `${handle}:${platform}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(mapDirectoryRow(r));
    if (unique.length >= limit) break;
  }
  return unique;
}

/** Map a raw featured_creators row to ShowcaseCreator. */
function mapFeaturedRow(r: Record<string, unknown>): ShowcaseCreator {
  return {
    id: r.id as string,
    display_name: (r.display_name as string) ?? "",
    handle: (r.handle as string) ?? "",
    platform: (r.platform as string) ?? "instagram",
    avatar_url: (r.avatar_url as string) ?? null,
    follower_count: (r.follower_count as number) ?? null,
    engagement_rate: (r.engagement_rate as number) ?? null,
    category: (r.category as string) ?? null,
    sort_order: (r.sort_order as number) ?? 0,
    is_active: (r.is_active as boolean) ?? true,
    is_verified: (r.is_verified as boolean) ?? false,
    approved: (r.approved as boolean) ?? true,
    created_at: (r.created_at as string) ?? null,
    branch: (r.branch as string) ?? null,
    status: (r.status as string) ?? null,
    bio: (r.bio as string) ?? null,
    platforms: Array.isArray(r.platforms) ? r.platforms as string[] : [],
    paradedeck_verified: (r.paradedeck_verified as boolean) ?? false,
    influencersclub_verified: (r.influencersclub_verified as boolean) ?? false,
    profile_slug: (r.profile_slug as string) ?? null,
    ic_avatar_url: (r.ic_avatar_url as string) ?? null,
    platform_urls: (r.platform_urls as Record<string, string>) ?? {},
    enrichment_data: r.enrichment_data ?? null,
    featured_homepage: (r.featured_homepage as boolean) ?? false,
    avg_views: (r.avg_views as string) ?? null,
    avg_likes: (r.avg_likes as string) ?? null,
  };
}

/** Map a raw directory_members row to ShowcaseCreator (shared by multiple fetch functions). */
function mapDirectoryRow(r: Record<string, unknown>): ShowcaseCreator {
  return {
    id: r.id as string,
    display_name: (r.creator_name as string) ?? "",
    handle: (r.creator_handle as string) ?? "",
    platform: (r.platform as string) ?? "instagram",
    avatar_url: (r.avatar_url as string) ?? null,
    follower_count: (r.follower_count as number) ?? null,
    engagement_rate: (r.engagement_rate as number) ?? null,
    category: (r.category as string) ?? null,
    sort_order: (r.sort_order as number) ?? 0,
    is_active: true,
    is_verified: false,
    approved: true,
    created_at: (r.added_at as string) ?? null,
    branch: (r.branch as string) ?? null,
    status: (r.status as string) ?? null,
    bio: (r.bio as string) ?? null,
    platforms: Array.isArray(r.platforms) ? r.platforms as string[] : [],
    paradedeck_verified: (r.paradedeck_verified as boolean) ?? false,
    influencersclub_verified: (r.influencersclub_verified as boolean) ?? false,
    profile_slug: (r.profile_slug as string) ?? null,
    ic_avatar_url: (r.ic_avatar_url as string) ?? null,
    platform_urls: (r.platform_urls as Record<string, string>) ?? {},
    enrichment_data: r.enrichment_data ?? null,
    featured_homepage: (r.featured_homepage as boolean) ?? false,
    avg_views: (r.avg_views as string) ?? null,
    avg_likes: (r.avg_likes as string) ?? null,
  };
}

/** Showcase from directory_members, shuffled for variety on each page load.
 *  Accepts a directory name (e.g. "Military Creator Network") — looks up the UUID first. */
export async function fetchShowcaseByDirectoryName(
  directoryName: string,
  limit = 25
): Promise<ShowcaseCreator[]> {
  let query = supabase
    .from("directory_members")
    .select("*")
    .eq("approved", true)
    .order("sort_order", { ascending: true })
    .limit(limit * 3);

  // Look up directory UUID by name, then filter
  if (directoryName) {
    const { data: dirRow } = await supabase
      .from("directories")
      .select("id")
      .ilike("name", `%${directoryName}%`)
      .limit(1)
      .maybeSingle();

    console.log("[featured-creators] directory lookup:", { directoryName, dirId: dirRow?.id ?? "NOT FOUND" });

    if (dirRow?.id) {
      query = query.eq("directory_id", dirRow.id);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("[featured-creators] Directory showcase fetch FAILED:", error.message);
    return [];
  }

  console.log("[featured-creators] Directory showcase returned:", data?.length ?? 0, "rows");

  // Deduplicate by handle+platform
  const seen = new Set<string>();
  const unique: ShowcaseCreator[] = [];
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const handle = (r.creator_handle as string) ?? "";
    const platform = (r.platform as string) ?? "instagram";
    const key = `${handle}:${platform}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(mapDirectoryRow(r));
  }

  // Fisher-Yates shuffle for random order on each page load
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }

  return unique.slice(0, limit);
}

/** Fetch a single directory member by handle (for profile page). */
export async function fetchDirectoryMemberByHandle(
  handle: string
): Promise<ShowcaseCreator | null> {
  const h = handle.replace(/^@/, "").trim().toLowerCase();

  // Try by creator_handle
  const { data: byHandle } = await supabase
    .from("directory_members")
    .select("*")
    .ilike("creator_handle", h)
    .eq("approved", true)
    .limit(1);
  if (byHandle?.length) return mapDirectoryRow(byHandle[0] as Record<string, unknown>);

  // Try by profile_slug
  const { data: bySlug } = await supabase
    .from("directory_members")
    .select("*")
    .ilike("profile_slug", h)
    .eq("approved", true)
    .limit(1);
  if (bySlug?.length) return mapDirectoryRow(bySlug[0] as Record<string, unknown>);

  return null;
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

/** Upsert a creator into the directory_members table. */
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
  directory_id?: string | null;
}): Promise<{ error: string | null }> {
  const handle = data.handle.replace(/^@/, "").trim();

  // Get max sort_order
  const { data: maxRow } = await supabase
    .from("directory_members")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = ((maxRow as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0) + 1;

  const slug = generateProfileSlug(data.display_name, handle);

  // Upload profile image to Supabase storage for permanent URL
  let permanentAvatarUrl = data.avatar_url || null;
  if (permanentAvatarUrl && permanentAvatarUrl.includes("ui-avatars.com")) {
    permanentAvatarUrl = null;
  }
  if (permanentAvatarUrl && permanentAvatarUrl.includes("supabase.co/storage")) {
    // Already a permanent URL — no re-upload needed
  } else {
    const sourceImageUrl = data.ic_avatar_url || data.avatar_url;
    if (sourceImageUrl && !sourceImageUrl.includes("ui-avatars.com")) {
      const uploaded = await uploadCreatorImage(sourceImageUrl, handle);
      if (uploaded) permanentAvatarUrl = uploaded;
    }
  }

  const payload: Record<string, unknown> = {
    creator_handle: handle,
    creator_name: data.display_name,
    platform: data.platform || "instagram",
    avatar_url: permanentAvatarUrl,
    ic_avatar_url: data.ic_avatar_url || null,
    follower_count: data.follower_count ?? null,
    engagement_rate: data.engagement_rate ?? null,
    bio: data.bio || null,
    branch: data.branch || null,
    status: data.status || null,
    platforms: data.platforms || [],
    platform_urls: data.platform_urls || {},
    category: data.category || null,
    approved: true,
    sort_order: nextOrder,
    added_by: data.added_by || null,
    directory_id: data.directory_id || null,
    profile_slug: slug,
  };

  if (data.enrichment_data) payload.enrichment_data = data.enrichment_data;
  if (data.source_list_id) payload.source_list_id = data.source_list_id;

  console.log("[approveForDirectory] Upserting to directory_members:", {
    creator_handle: handle,
    platform: payload.platform,
    columns: Object.keys(payload),
  });

  const { error } = await supabase
    .from("directory_members")
    .upsert(payload, { onConflict: "platform,creator_handle", ignoreDuplicates: false });

  if (error) {
    console.error("[approveForDirectory] UPSERT FAILED:", error.message, error.details, error.hint, error.code);
    return { error: `${error.message}${error.details ? ` (${error.details})` : ""}${error.hint ? ` — hint: ${error.hint}` : ""}` };
  }
  console.log("[approveForDirectory] Success:", handle);
  return { error: null };
}

/** Toggle approved status of a directory member. */
export async function toggleDirectoryApproval(id: string, approved: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("directory_members")
    .update({ approved })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

/** Fetch ALL directory members (both approved and unapproved) for admin management.
 * @deprecated Use fetchDirectoryMembers from lib/directories instead. */
export async function fetchAllDirectoryCreators(): Promise<ShowcaseCreator[]> {
  const { data, error } = await supabase
    .from("directory_members")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.warn("[featured-creators] Admin fetch failed:", error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => mapDirectoryRow(row));
}

/** Soft-remove a creator from directory (set approved = false, keep data). */
export async function removeFromDirectory(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("directory_members")
    .update({ approved: false })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

/** Extract the best avatar URL from enrichment data, checking multiple field paths.
 *  Checks: profile_picture_hd, profile_picture, picture, profile_pic_url, avatar,
 *  basicInfo.profilePicture — in both instagram-level and top-level locations. */
export function extractAvatarFromEnrichment(enrichData: unknown): string | null {
  if (!enrichData || typeof enrichData !== "object") return null;
  const data = enrichData as Record<string, unknown>;

  const tryFields = (obj: Record<string, unknown> | undefined): string | null => {
    if (!obj) return null;
    const url =
      (obj.profile_picture_hd as string) ||
      (obj.profile_picture as string) ||
      (obj.picture as string) ||
      (obj.profile_pic_url as string) ||
      (obj.avatar as string) ||
      null;
    if (url && typeof url === "string" && url.trim() && !url.includes("ui-avatars.com")) return url;
    const bi = obj.basicInfo as Record<string, unknown> | undefined;
    if (bi) {
      const biUrl = (bi.profilePicture as string) || null;
      if (biUrl && typeof biUrl === "string" && biUrl.trim() && !biUrl.includes("ui-avatars.com")) return biUrl;
    }
    return null;
  };

  // 1. Instagram-level (most common enrichment path)
  const ig = data.instagram as Record<string, unknown> | undefined;
  const igResult = tryFields(ig);
  if (igResult) return igResult;

  // 2. result.instagram (alternative nesting)
  const result = data.result as Record<string, unknown> | undefined;
  if (result) {
    const resultIg = result.instagram as Record<string, unknown> | undefined;
    const riResult = tryFields(resultIg);
    if (riResult) return riResult;
    // 3. result.profile
    const profile = result.profile as Record<string, unknown> | undefined;
    const rpResult = tryFields(profile);
    if (rpResult) return rpResult;
  }

  // 4. Top-level profile
  const topProfile = data.profile as Record<string, unknown> | undefined;
  const tpResult = tryFields(topProfile);
  if (tpResult) return tpResult;

  // 5. Top-level fields directly
  return tryFields(data);
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
