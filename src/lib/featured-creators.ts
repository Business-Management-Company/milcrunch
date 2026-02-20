import { supabase } from "@/integrations/supabase/client";
import { generateProfileSlug, uploadCreatorImage, saveCreatorAvatar } from "@/lib/directories";
import { enrichCreatorProfile, type EnrichedProfileResponse } from "@/lib/influencers-club";

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
  profile_slug: string | null;
  ic_avatar_url: string | null;
  platform_urls?: Record<string, string>;
  enrichment_data?: unknown;
  featured_homepage?: boolean;
  avg_views?: string | null;
  avg_likes?: string | null;
  avg_comments?: number | null;
  post_count?: number | null;
  media_count?: number | null;
  banner_image_url?: string | null;
}

/** Permanent Supabase Storage URLs for hero creators — never expire */
const HERO_PERMANENT_AVATARS: Record<string, string> = {
  davebrayusa: "https://zribaooztsaatufbulku.supabase.co/storage/v1/object/public/creator-avatars/davebrayusa.jpg",
  therealdoctodd: "https://zribaooztsaatufbulku.supabase.co/storage/v1/object/public/creator-avatars/therealdoctodd.jpg",
  brittanyyycampbelll: "https://zribaooztsaatufbulku.supabase.co/storage/v1/object/public/creator-avatars/brittanyyycampbelll.jpg",
};

/** Hardcoded fallback creators shown when directory_members table is unavailable. */
const FALLBACK_HERO_CREATORS: ShowcaseCreator[] = [
  {
    id: "hero-davebrayusa",
    display_name: "DAVE BRAY USA",
    handle: "davebrayusa",
    platform: "instagram",
    avatar_url: HERO_PERMANENT_AVATARS.davebrayusa,
    follower_count: 14304,
    engagement_rate: null,
    category: "Musician/Band",
    sort_order: 1,
    is_active: true,
    is_verified: false,
    approved: true,
    created_at: null,
    branch: "Navy",
    status: "veteran",
    bio: "Download \"The Marines' Hymn\" Now!!",
    platforms: ["instagram"],
    featured_homepage: true,
    profile_slug: "davebrayusa",
    ic_avatar_url: HERO_PERMANENT_AVATARS.davebrayusa,
  },
  {
    id: "hero-therealdoctodd",
    display_name: "Doc Todd",
    handle: "therealdoctodd",
    platform: "instagram",
    avatar_url: HERO_PERMANENT_AVATARS.therealdoctodd,
    follower_count: 17535,
    engagement_rate: null,
    category: "Health & Wellness",
    sort_order: 2,
    is_active: true,
    is_verified: false,
    approved: true,
    created_at: null,
    branch: "Army",
    status: "veteran",
    bio: "They Call Me: Doc Todd — Mr. Post Traumatic Growth",
    platforms: ["instagram"],
    featured_homepage: true,
    profile_slug: "therealdoctodd",
    ic_avatar_url: HERO_PERMANENT_AVATARS.therealdoctodd,
  },
  {
    id: "hero-brittanyyycampbelll",
    display_name: "Brittany Campbell",
    handle: "brittanyyycampbelll",
    platform: "instagram",
    avatar_url: HERO_PERMANENT_AVATARS.brittanyyycampbelll,
    follower_count: 8355,
    engagement_rate: null,
    category: "Military Lifestyle",
    sort_order: 3,
    is_active: true,
    is_verified: false,
    approved: true,
    created_at: null,
    branch: "Air Force",
    status: "milspouse",
    bio: "Military lifestyle | wife + furr momma",
    platforms: ["instagram", "tiktok"],
    featured_homepage: true,
    profile_slug: "brittanyyycampbelll",
    ic_avatar_url: HERO_PERMANENT_AVATARS.brittanyyycampbelll,
  },
];

/** Fetch up to 3 featured creators for the homepage hero cards.
 *  Pulls from directory_members WHERE featured_homepage = true.
 *  Falls back to hardcoded creators if the table doesn't exist or is empty. */
export async function fetchFeaturedHomepageCreators(): Promise<ShowcaseCreator[]> {
  try {
    const { data, error } = await supabase
      .from("directory_members")
      .select("id, creator_handle, creator_name, platform, avatar_url, ic_avatar_url, follower_count, engagement_rate, post_count, avg_comments, avg_views, avg_likes, category, sort_order, branch, status, bio, platforms, profile_slug, platform_urls, enrichment_data, featured_homepage, approved")
      .eq("featured_homepage", true)
      .order("sort_order", { ascending: true })
      .limit(3);

    if (!error && data && data.length > 0) {
      console.log("[featured-creators] Homepage: using DB creators:", data.length);
      return data.map((r: Record<string, unknown>) => mapDirectoryRow(r));
    }

    if (error) {
      console.warn("[featured-creators] Homepage DB query failed:", error.message);
    }
  } catch (err) {
    console.warn("[featured-creators] Homepage DB query error:", err);
  }

  console.log("[featured-creators] Homepage: using fallback hero creators");
  return FALLBACK_HERO_CREATORS;
}

const HERO_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Check creator_enrichment_cache for a cached enrichment response. */
async function getHeroEnrichCache(
  handle: string,
  platform: string,
): Promise<EnrichedProfileResponse | null> {
  try {
    const { data } = await supabase
      .from("creator_enrichment_cache")
      .select("enrichment_data, cached_at")
      .eq("username", handle.toLowerCase())
      .eq("platform", platform)
      .single();
    if (!data) return null;
    const cachedAt = new Date(data.cached_at).getTime();
    if (Date.now() - cachedAt > HERO_CACHE_TTL_MS) return null;
    return data.enrichment_data as EnrichedProfileResponse;
  } catch {
    return null;
  }
}

/** Write enrichment data into creator_enrichment_cache. */
async function setHeroEnrichCache(
  handle: string,
  platform: string,
  enrichment: EnrichedProfileResponse,
): Promise<void> {
  try {
    await supabase
      .from("creator_enrichment_cache")
      .upsert(
        {
          username: handle.toLowerCase(),
          platform,
          enrichment_data: enrichment,
          cached_at: new Date().toISOString(),
        },
        { onConflict: "username" },
      );
  } catch (err) {
    console.warn("[HeroEnrich] Cache write failed:", err);
  }
}

// GET /public/v1/creators/{handle} endpoint removed — returns 404.
// All enrichment goes through POST /public/v1/creators/enrich/handle/raw/.

/** Deep-search a nested object for a numeric value by field name (up to 3 levels). */
function deepFindNumber(obj: unknown, keys: string[]): number {
  if (!obj || typeof obj !== "object") return 0;
  const o = obj as Record<string, unknown>;

  const checkKeys = (target: Record<string, unknown>): number => {
    for (const k of keys) {
      if (k in target && target[k] != null && target[k] !== "") {
        const n = Number(target[k]);
        if (!isNaN(n) && n > 0) return n;
      }
    }
    return 0;
  };

  // Level 0: top level
  const l0 = checkKeys(o);
  if (l0 > 0) return l0;

  // Level 1: one level into object children
  for (const val of Object.values(o)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const child = val as Record<string, unknown>;
      const l1 = checkKeys(child);
      if (l1 > 0) return l1;

      // Level 2: two levels deep (e.g. instagram.reels.avg_view_count)
      for (const innerVal of Object.values(child)) {
        if (innerVal && typeof innerVal === "object" && !Array.isArray(innerVal)) {
          const l2 = checkKeys(innerVal as Record<string, unknown>);
          if (l2 > 0) return l2;
        }
      }
    }
  }
  return 0;
}

/** Extract hero-relevant stats from any enrichment/stats response. */
function extractHeroStats(
  data: Record<string, unknown>,
): {
  follower_count: number;
  engagement_rate: number;
  avg_views: number;
  avg_likes: number;
  avg_comments: number;
  media_count: number;
} {
  const follower_count = deepFindNumber(data, ["follower_count", "followers", "subscriberCount", "number_of_followers"]);
  const engagement_rate = deepFindNumber(data, ["engagement_percent", "engagement_rate", "engagementRate", "er"]);
  const avg_views = deepFindNumber(data, ["avg_views", "avg_view_count", "avgViews", "average_views", "avg_reels_plays", "average_reels_plays"]);
  const avg_likes = deepFindNumber(data, ["avg_likes", "avg_like_count", "avgLikes", "average_likes"]);
  const avg_comments = deepFindNumber(data, ["avg_comments", "avg_comment_count", "avgComments", "average_comments"]);
  const media_count = deepFindNumber(data, ["media_count", "mediaCount", "posts_count", "postsCount", "total_posts"]);

  console.log("[HeroEnrich] extractHeroStats →", { follower_count, engagement_rate, avg_views, avg_likes, avg_comments, media_count });
  return { follower_count, engagement_rate, avg_views, avg_likes, avg_comments, media_count };
}

/** Enrich an array of ShowcaseCreators with live Influencers.club data.
 *  Tries creator_enrichment_cache first (7-day TTL), then POST enrich API.
 *  Falls back to existing data on any failure. */
export async function enrichHomepageHeroCreators(
  creators: ShowcaseCreator[],
): Promise<ShowcaseCreator[]> {
  const enriched = await Promise.all(
    creators.map(async (c) => {
      const handle = c.handle;
      const platform = c.platform || "instagram";
      try {
        // 1. Check DB cache (gracefully returns null if table doesn't exist)
        let responseData: Record<string, unknown> | null = null;
        const cached = await getHeroEnrichCache(handle, platform);

        if (cached) {
          console.log("[HeroEnrich] Cache hit for", handle);
          responseData = cached as unknown as Record<string, unknown>;
        } else {
          console.log("[HeroEnrich] Cache miss for", handle, "— calling POST enrich");
          const enrichment = await enrichCreatorProfile(handle, undefined, platform);
          responseData = enrichment as unknown as Record<string, unknown>;

          // Try to cache (silently fails if table doesn't exist)
          if (responseData) {
            await setHeroEnrichCache(handle, platform, responseData as unknown as EnrichedProfileResponse);
          }
        }

        if (!responseData) return c; // API returned null — keep existing data

        // 2. Extract stats (deep search across all response shapes)
        const stats = extractHeroStats(responseData);

        // 3. Extract avatar from enrichment
        const enrichAvatar = extractAvatarFromEnrichment(responseData);

        // 3b. Cache avatar to permanent Supabase Storage (fire-and-forget)
        if (enrichAvatar && !enrichAvatar.includes("supabase.co/storage")) {
          saveCreatorAvatar(handle, enrichAvatar).catch(() => {});
        }

        // 4. Merge: prefer API data when > 0, keep existing data as fallback
        //    IMPORTANT: Never overwrite a permanent Supabase Storage URL with an expiring CDN URL
        const existingAvatarIsPermanent = (c.avatar_url || "").includes("supabase.co/storage");
        const existingIcIsPermanent = (c.ic_avatar_url || "").includes("supabase.co/storage");
        return {
          ...c,
          follower_count: stats.follower_count || c.follower_count,
          engagement_rate: stats.engagement_rate || c.engagement_rate,
          avatar_url: existingAvatarIsPermanent ? c.avatar_url : (enrichAvatar || c.avatar_url),
          ic_avatar_url: existingIcIsPermanent ? c.ic_avatar_url : (enrichAvatar || c.ic_avatar_url),
          enrichment_data: responseData,
          avg_views: stats.avg_views > 0 ? formatFollowerCount(stats.avg_views) : (c.avg_views || null),
          avg_likes: stats.avg_likes > 0 ? formatFollowerCount(stats.avg_likes) : (c.avg_likes || null),
          avg_comments: stats.avg_comments > 0 ? stats.avg_comments : (c.avg_comments ?? null),
          post_count: stats.media_count > 0 ? stats.media_count : (c.post_count ?? null),
          media_count: stats.media_count > 0 ? stats.media_count : (c.media_count || null),
        };
      } catch (err) {
        console.warn("[HeroEnrich] Failed for", handle, ":", err);
        return c; // Fallback to existing data
      }
    }),
  );
  return enriched;
}

/** Batch-fill avatars for showcase creators from the enrichment cache.
 *  Only reads from cache — does NOT call the IC API (too many credits).
 *  Also writes ic_avatar_url back to directory_members so future loads
 *  don't need the cache lookup. */
export async function fillShowcaseAvatarsFromCache(
  creators: ShowcaseCreator[],
): Promise<ShowcaseCreator[]> {
  // Only process creators with no usable avatar
  const needsAvatar = creators.filter(
    (c) => !c.ic_avatar_url && !c.avatar_url && !extractAvatarFromEnrichment(c.enrichment_data),
  );
  if (needsAvatar.length === 0) return creators;

  console.log("[ShowcaseEnrich] Filling avatars from cache for", needsAvatar.length, "creators");

  // Batch-fetch from enrichment cache
  const handles = needsAvatar.map((c) => c.handle.toLowerCase());
  const { data: cacheRows } = await supabase
    .from("creator_enrichment_cache")
    .select("username, enrichment_data")
    .in("username", handles);

  if (!cacheRows || cacheRows.length === 0) {
    console.log("[ShowcaseEnrich] No cache hits");
    return creators;
  }

  const cacheMap = new Map<string, Record<string, unknown>>();
  for (const row of cacheRows) {
    cacheMap.set(
      (row.username as string).toLowerCase(),
      row.enrichment_data as Record<string, unknown>,
    );
  }
  console.log("[ShowcaseEnrich] Cache hits:", cacheMap.size, "of", handles.length);

  // Merge avatars and write back to directory_members
  const result = creators.map((c) => {
    if (c.ic_avatar_url || c.avatar_url) return c; // already has avatar
    // Check enrichment_data on the row itself first
    let avatar = extractAvatarFromEnrichment(c.enrichment_data);
    if (!avatar) {
      const cached = cacheMap.get(c.handle.toLowerCase());
      if (cached) {
        avatar = extractAvatarFromEnrichment(cached);
      }
    }
    if (avatar) {
      // Cache to permanent Storage (fire-and-forget)
      if (!avatar.includes("supabase.co/storage")) {
        saveCreatorAvatar(c.handle, avatar).catch(() => {});
      }
      return { ...c, avatar_url: avatar, ic_avatar_url: avatar };
    }
    return c;
  });

  return result;
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
    profile_slug: (r.profile_slug as string) ?? null,
    ic_avatar_url: (r.ic_avatar_url as string) ?? null,
    platform_urls: (r.platform_urls as Record<string, string>) ?? {},
    enrichment_data: r.enrichment_data ?? null,
    featured_homepage: (r.featured_homepage as boolean) ?? false,
    avg_views: (r.avg_views as string) ?? null,
    avg_likes: (r.avg_likes as string) ?? null,
    avg_comments: r.avg_comments != null ? Number(r.avg_comments) : null,
    post_count: r.post_count != null ? Number(r.post_count) : null,
    media_count: (r.media_count as number) ?? null,
    banner_image_url: (r.banner_image_url as string) ?? null,
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
    profile_slug: (r.profile_slug as string) ?? null,
    ic_avatar_url: (r.ic_avatar_url as string) ?? null,
    platform_urls: (r.platform_urls as Record<string, string>) ?? {},
    enrichment_data: r.enrichment_data ?? null,
    featured_homepage: (r.featured_homepage as boolean) ?? false,
    avg_views: (r.avg_views as string) ?? null,
    avg_likes: (r.avg_likes as string) ?? null,
    avg_comments: r.avg_comments != null ? Number(r.avg_comments) : null,
    post_count: r.post_count != null ? Number(r.post_count) : null,
    media_count: (r.media_count as number) ?? null,
    banner_image_url: (r.banner_image_url as string) ?? null,
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
    .order("follower_count", { ascending: false, nullsFirst: false })
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
    ic_avatar_url: permanentAvatarUrl || data.ic_avatar_url || null,
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
    .upsert(payload, { onConflict: "creator_handle", ignoreDuplicates: false });

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
    if (url && typeof url === "string" && url.trim() && !url.includes("ui-avatars.com")) return url.replace(/^http:\/\//i, "https://");
    const bi = obj.basicInfo as Record<string, unknown> | undefined;
    if (bi) {
      const biUrl = (bi.profilePicture as string) || null;
      if (biUrl && typeof biUrl === "string" && biUrl.trim() && !biUrl.includes("ui-avatars.com")) return biUrl.replace(/^http:\/\//i, "https://");
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
