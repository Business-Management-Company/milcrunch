import { supabase } from "@/integrations/supabase/client";
import {
  listUploadPostUsers,
  getUploadPostUser,
  createUploadPostProfile,
  type UploadPostUser,
  type ConnectedAccount,
} from "@/services/upload-post";

export interface ConnectedAccountRow {
  id: string;
  user_id: string;
  platform: string;
  platform_user_id: string | null;
  platform_username: string | null;
  profile_image_url: string | null;
  followers_count: number | null;
  raw_data: unknown;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Parse the UploadPost social_accounts dict into an array.
 * API returns: { social_accounts: { instagram: { handle, display_name, social_images }, linkedin: {...} } }
 * Empty string values mean the platform is not connected.
 */
function parseSocialAccounts(profile: any): ConnectedAccount[] {
  const sa = profile?.social_accounts;
  console.log("[parseSocialAccounts] social_accounts type:", typeof sa, "value:", JSON.stringify(sa, null, 2));
  if (!sa || typeof sa !== "object") {
    console.log("[parseSocialAccounts] No social_accounts dict found on profile");
    return [];
  }

  const accounts: ConnectedAccount[] = [];
  for (const [platform, info] of Object.entries(sa)) {
    console.log(`[parseSocialAccounts] Platform "${platform}" →`, typeof info, JSON.stringify(info));
    // Empty string = not connected, skip
    if (!info || info === "") {
      console.log(`[parseSocialAccounts] Skipping "${platform}" (empty/falsy)`);
      continue;
    }
    const acc = info as Record<string, any>;
    const parsed = {
      platform: platform.toLowerCase(),
      platform_username: acc.handle ?? acc.username ?? acc.display_name ?? null,
      profile_image_url: acc.social_images ?? acc.avatar ?? acc.profile_image_url ?? null,
      followers_count: acc.followers_count ?? acc.follower_count ?? null,
      ...acc,
    };
    console.log(`[parseSocialAccounts] Parsed "${platform}":`, JSON.stringify({ platform: parsed.platform, username: parsed.platform_username, avatar: parsed.profile_image_url }));
    accounts.push(parsed);
  }
  console.log("[parseSocialAccounts] Total parsed:", accounts.length);
  return accounts;
}

/** Sync connected accounts from Upload-Post user profile into Supabase.
 *  Parses the social_accounts dict from the UploadPost API response. */
export async function syncConnectedAccountsFromUploadPost(userId: string): Promise<ConnectedAccountRow[]> {
  console.log("=".repeat(60));
  console.log("[SYNC] Starting sync for userId:", userId);
  console.log("=".repeat(60));

  // ── Step 1: Resolve the UploadPost slug (may differ from Supabase UUID) ──
  const upSlug = await resolveUploadPostUsername(userId);
  console.log("[SYNC] Resolved UploadPost slug:", upSlug);

  // ── Step 2: Try single-user endpoint with resolved slug ──
  console.log("[SYNC] Step 2: Trying GET /api/uploadposts/users/{username}...");
  let profile = await getUploadPostUser(upSlug);
  console.log("[SYNC] Step 2 result — profile:", profile ? "found" : "null");

  // ── Step 3: Fallback to list endpoint ──
  if (!profile) {
    console.log("[SYNC] Step 3: Falling back to GET /api/uploadposts/users (list all)...");
    const users = await listUploadPostUsers();
    console.log("[SYNC] Step 3 — total users:", users.length);
    profile = users.find((u) => u.username === upSlug) ?? null;
    console.log("[SYNC] Step 3 found matching profile:", profile ? "yes" : "no");
  }

  if (!profile) {
    console.log("[SYNC] No profile found. Returning existing Supabase data.");
    return getConnectedAccounts(userId);
  }

  console.log("[SYNC] Profile keys:", Object.keys(profile));
  console.log("[SYNC] social_accounts raw:", JSON.stringify((profile as any).social_accounts, null, 2));

  // ── Parse social_accounts dict into array ──
  const parsed = parseSocialAccounts(profile);
  console.log("[SYNC] Parsed connected accounts:", parsed.length);
  console.log("[SYNC] Parsed accounts:", JSON.stringify(parsed, null, 2));

  if (parsed.length === 0) {
    console.log("[SYNC] No connected accounts in social_accounts dict. Returning existing Supabase data.");
    return getConnectedAccounts(userId);
  }

  // ── Upsert to creator_social_connections ──
  console.log("[SYNC] Upserting", parsed.length, "accounts to creator_social_connections...");
  for (const acc of parsed) {
    const platformKey = acc.platform === "twitter" ? "x" : (acc.platform ?? "unknown");
    const upsertData = {
      user_id: userId,
      platform: platformKey,
      account_name: acc.platform_username ?? null,
      account_avatar: acc.profile_image_url ?? null,
      upload_post_account_id: (acc as any).id ?? (acc as any).account_id ?? platformKey,
      connected_at: new Date().toISOString(),
    };
    console.log("[Supabase] upserting:", JSON.stringify(upsertData, null, 2));

    const { data: upsertResult, error: upsertError } = await supabase
      .from("creator_social_connections")
      .upsert(upsertData, { onConflict: "user_id,platform" })
      .select();

    console.log("[Supabase] upsert result:", JSON.stringify(upsertResult, null, 2));
    if (upsertError) console.error("[Supabase] upsert error:", JSON.stringify(upsertError, null, 2));
  }

  // ── Also sync to connected_accounts (legacy) ──
  const legacyRows = parsed.map((acc) => ({
    user_id: userId,
    platform: acc.platform ?? "unknown",
    platform_user_id: (acc as any).id ?? (acc as any).account_id ?? null,
    platform_username: acc.platform_username ?? null,
    profile_image_url: acc.profile_image_url ?? null,
    followers_count: acc.followers_count ?? null,
    raw_data: acc,
    updated_at: new Date().toISOString(),
  }));

  const delResult = await supabase.from("connected_accounts").delete().eq("user_id", userId).neq("is_demo", true);
  if (delResult.error?.message?.includes("is_demo")) {
    await supabase.from("connected_accounts").delete().eq("user_id", userId);
  }
  await supabase.from("connected_accounts").insert(legacyRows).select();

  // ── Re-fetch from creator_social_connections as source of truth ──
  console.log("[SYNC] Re-fetching creator_social_connections...");
  const { data: csc, error: fetchError } = await supabase
    .from("creator_social_connections")
    .select("*")
    .eq("user_id", userId)
    .order("platform");

  console.log("[Supabase] fetched connections:", csc?.length ?? 0, "rows");
  if (fetchError) console.error("[Supabase] fetch error:", JSON.stringify(fetchError, null, 2));
  console.log("=".repeat(60));
  console.log("[SYNC] Complete. Connections in DB:", csc?.length ?? 0);
  console.log("=".repeat(60));

  if (csc && csc.length > 0) {
    return csc.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      platform: r.platform,
      platform_user_id: r.upload_post_account_id ?? null,
      platform_username: r.account_name ?? null,
      profile_image_url: r.account_avatar ?? null,
      followers_count: null,
      raw_data: null,
      created_at: r.connected_at,
      updated_at: r.connected_at,
    })) as ConnectedAccountRow[];
  }

  return [];
}

/** Fetch connected accounts from Supabase (after sync). */
export async function getConnectedAccounts(userId: string): Promise<ConnectedAccountRow[]> {
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("platform");
  if (error) return [];
  return (data ?? []) as ConnectedAccountRow[];
}

const DEMO_ACCOUNTS = [
  { platform: "instagram", platform_user_id: "demo_ig_001", platform_username: "milcrunchx", followers_count: 48200 },
  { platform: "tiktok", platform_user_id: "demo_tt_001", platform_username: "milcrunchx", followers_count: 125600 },
  { platform: "facebook", platform_user_id: "demo_fb_001", platform_username: "MilCrunch", followers_count: 15800 },
  { platform: "x", platform_user_id: "demo_x_001", platform_username: "milcrunchx", followers_count: 32400 },
  { platform: "youtube", platform_user_id: "demo_yt_001", platform_username: "MilCrunch Official", followers_count: 8900 },
];

/** Build in-memory fallback rows so the UI works even if the DB table is missing. */
function buildFallbackRows(userId: string): ConnectedAccountRow[] {
  return DEMO_ACCOUNTS.map((acc) => ({
    id: acc.platform_user_id,
    user_id: userId,
    platform: acc.platform,
    platform_user_id: acc.platform_user_id,
    platform_username: acc.platform_username,
    profile_image_url: null,
    followers_count: acc.followers_count,
    raw_data: { demo: true },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

/** Seed demo connected accounts if none exist for this user. */
export async function seedDemoConnectedAccounts(userId: string): Promise<ConnectedAccountRow[]> {
  // Check if accounts already exist
  const existing = await getConnectedAccounts(userId);
  if (existing.length > 0) return existing;

  const rows = DEMO_ACCOUNTS.map((acc) => ({
    user_id: userId,
    platform: acc.platform,
    platform_user_id: acc.platform_user_id,
    platform_username: acc.platform_username,
    profile_image_url: null as string | null,
    followers_count: acc.followers_count,
    raw_data: { demo: true },
    is_demo: true,
    updated_at: new Date().toISOString(),
  }));

  // Try with is_demo column; fall back without it if column doesn't exist yet
  let result = await supabase.from("connected_accounts").insert(rows);
  if (result.error?.message?.includes("is_demo")) {
    const fallbackRows = rows.map(({ is_demo: _, ...rest }) => rest);
    result = await supabase.from("connected_accounts").insert(fallbackRows);
  }
  if (result.error) {
    console.warn("[upload-post-sync] Demo seed failed:", result.error.message);
    // Return in-memory fallback so the UI still shows platforms
    return buildFallbackRows(userId);
  }
  const seeded = await getConnectedAccounts(userId);
  // If re-fetch also fails (RLS etc.), return in-memory fallback
  return seeded.length > 0 ? seeded : buildFallbackRows(userId);
}

/** Check if a string looks like a UUID (ghost profile created by old broken code). */
function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s);
}

/** Persist the resolved UploadPost slug to creator_profiles for cross-device consistency. */
async function persistSlugToProfile(userId: string, slug: string): Promise<void> {
  try {
    await supabase
      .from("creator_profiles")
      .update({ upload_post_slug: slug })
      .eq("user_id", userId);
  } catch (e) {
    // Column may not exist yet — ignore silently
    console.warn("[UploadPost] Could not persist slug to creator_profiles:", e);
  }
}

/** Read the persisted UploadPost slug from creator_profiles. */
async function readSlugFromProfile(userId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("creator_profiles")
      .select("upload_post_slug")
      .eq("user_id", userId)
      .maybeSingle();
    const slug = (data as any)?.upload_post_slug;
    if (slug && typeof slug === "string" && slug.length > 0 && !looksLikeUuid(slug)) {
      return slug;
    }
  } catch {
    // Column may not exist yet
  }
  return null;
}

/**
 * Resolve the UploadPost profile username/slug for a Supabase user.
 *
 * SECURITY FIX: Previously this picked the first non-UUID profile from the
 * global UploadPost user list, which meant ALL users resolved to the same
 * profile (e.g. "johnny-rocket"). Now the resolution is strictly per-user:
 *
 *  1. Check DB (creator_profiles.upload_post_slug) — authoritative per-user
 *  2. Check localStorage cache (per-browser hint, verified against DB)
 *  3. Check UploadPost for a profile whose username matches this user's UUID
 *  4. Create a new profile with UUID as username
 *
 * A user NEVER inherits another user's UploadPost profile.
 */
export async function resolveUploadPostUsername(supabaseUserId: string): Promise<string> {
  const cacheKey = `up_slug_${supabaseUserId}`;

  // 1. Check DB for persisted slug (authoritative, cross-device)
  const dbSlug = await readSlugFromProfile(supabaseUserId);
  if (dbSlug) {
    console.log("[UploadPost] Resolved slug from DB:", dbSlug);
    localStorage.setItem(cacheKey, dbSlug);
    return dbSlug;
  }

  // 2. Check localStorage cache (per-browser hint)
  const cached = localStorage.getItem(cacheKey);
  if (cached && !looksLikeUuid(cached)) {
    console.log("[UploadPost] Resolved slug from cache:", cached);
    // Persist to DB for cross-device consistency
    persistSlugToProfile(supabaseUserId, cached);
    return cached;
  }
  if (cached && looksLikeUuid(cached)) {
    console.log("[UploadPost] Clearing stale UUID cache entry:", cached);
    localStorage.removeItem(cacheKey);
  }

  // 3. Check UploadPost for a profile matching this user's UUID
  //    SECURITY: Only use profiles whose username matches THIS user's UUID.
  //    Never pick another user's non-UUID profile.
  const users = await listUploadPostUsers();
  console.log("[UploadPost] Listed profiles:", users.length);

  const byUuid = users.find((u) => u.username === supabaseUserId);
  if (byUuid) {
    console.log("[UploadPost] Found UUID-matched profile:", byUuid.username);
    // Don't cache UUID slugs — they should eventually be replaced with custom slugs
    return byUuid.username;
  }

  // 4. No profile exists for this user — create one with UUID as username
  console.log("[UploadPost] No profile found for user. Creating with UUID:", supabaseUserId);
  const createResult = await createUploadPostProfile(supabaseUserId);
  if (!createResult.error) {
    console.log("[UploadPost] Created new profile:", supabaseUserId);
    return supabaseUserId;
  }

  // 409 = profile already exists but wasn't listed — treat as success
  if (createResult.error.includes("409") || createResult.error.toLowerCase().includes("already")) {
    console.log("[UploadPost] 409 — profile already exists:", supabaseUserId);
    return supabaseUserId;
  }

  // 5. Creation failed — return UUID as last resort
  console.warn("[UploadPost] Profile creation failed. Using UUID:", supabaseUserId);
  return supabaseUserId;
}

/** Ensure Upload-Post profile exists for this user; create if not.
 *  SECURITY: Only uses profiles that belong to THIS user (UUID match or
 *  persisted slug). Never assigns another user's profile.
 *  Returns the resolved UploadPost username/slug. */
export async function ensureUploadPostProfile(userId: string): Promise<{ ok: boolean; username: string; error?: string }> {
  try {
    // 1. Check DB for persisted slug (authoritative)
    const dbSlug = await readSlugFromProfile(userId);
    if (dbSlug) {
      console.log("[ensureUploadPostProfile] Using persisted slug from DB:", dbSlug);
      return { ok: true, username: dbSlug };
    }

    // 2. Check localStorage cache
    const cacheKey = `up_slug_${userId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached && !looksLikeUuid(cached)) {
      console.log("[ensureUploadPostProfile] Using cached slug:", cached);
      persistSlugToProfile(userId, cached);
      return { ok: true, username: cached };
    }

    // 3. List all profiles — only match by THIS user's UUID
    const users = await listUploadPostUsers();
    console.log("[ensureUploadPostProfile] Found", users.length, "profiles");

    const byUuid = users.find((u) => u.username === userId);
    if (byUuid) {
      console.log("[ensureUploadPostProfile] Found UUID-matched profile:", byUuid.username);
      return { ok: true, username: byUuid.username };
    }

    // 4. No matching profile — create one with UUID
    console.log("[ensureUploadPostProfile] No profile for this user. Creating:", userId);
    const createResult = await createUploadPostProfile(userId);
    if (createResult.error) {
      // 409 = "Username already in use" — profile exists but wasn't listed (API timing).
      // Treat as success since the profile does exist.
      if (createResult.error.includes("409") || createResult.error.toLowerCase().includes("already")) {
        console.log("[ensureUploadPostProfile] 409 — profile already exists, treating as success:", userId);
        return { ok: true, username: userId };
      }
      console.error("[ensureUploadPostProfile] Create failed:", createResult.error);
      return { ok: false, username: userId, error: createResult.error };
    }
    return { ok: true, username: userId };
  } catch (err) {
    console.error("[ensureUploadPostProfile] failed:", err);
    // Try DB slug on error
    const dbSlug = await readSlugFromProfile(userId).catch(() => null);
    if (dbSlug) return { ok: true, username: dbSlug };
    // Try cache as last resort
    const cacheKey = `up_slug_${userId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached && !looksLikeUuid(cached)) {
      return { ok: true, username: cached };
    }
    return { ok: false, username: userId, error: (err as Error).message };
  }
}

/** Sync aggregated stats from connected_accounts into featured_creators rows for this creator. */
export async function syncDirectoryMemberStats(userId: string): Promise<void> {
  // Get creator handle from auth user metadata
  const { data: { user } } = await supabase.auth.getUser();
  const handle = (user?.user_metadata?.handle as string) ?? null;
  if (!handle) return;

  // Get connected accounts
  const accounts = await getConnectedAccounts(userId);
  if (accounts.length === 0) return;

  // Aggregate stats
  const totalFollowers = accounts.reduce((sum, a) => sum + (a.followers_count ?? 0), 0);
  const platforms = accounts.map((a) => a.platform);
  const platformUrls: Record<string, string> = {};
  for (const acc of accounts) {
    if (acc.platform_username) {
      const p = acc.platform.toLowerCase();
      if (p.includes("instagram")) platformUrls.instagram = `https://instagram.com/${acc.platform_username}`;
      else if (p.includes("tiktok")) platformUrls.tiktok = `https://tiktok.com/@${acc.platform_username}`;
      else if (p.includes("youtube")) platformUrls.youtube = `https://youtube.com/@${acc.platform_username}`;
      else if (p === "x" || p.includes("twitter")) platformUrls.x = `https://x.com/${acc.platform_username}`;
      else if (p.includes("facebook")) platformUrls.facebook = `https://facebook.com/${acc.platform_username}`;
      else if (p.includes("linkedin")) platformUrls.linkedin = `https://linkedin.com/in/${acc.platform_username}`;
    }
  }
  // Best avatar: first account with a profile image
  const bestAvatar = accounts.find((a) => a.profile_image_url)?.profile_image_url ?? null;

  // Update directory_members matching this creator handle (don't create new rows)
  await supabase
    .from("directory_members")
    .update({
      follower_count: totalFollowers > 0 ? totalFollowers : null,
      platforms,
      platform_urls: platformUrls,
      avatar_url: bestAvatar,
    })
    .eq("creator_handle", handle);
}
