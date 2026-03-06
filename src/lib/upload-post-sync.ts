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

  // ── Step 1: Try single-user endpoint ──
  console.log("[SYNC] Step 1: Trying GET /api/uploadposts/users/{username}...");
  let profile = await getUploadPostUser(userId);
  console.log("[SYNC] Step 1 result — profile:", profile ? "found" : "null");

  // ── Step 2: Fallback to list endpoint ──
  if (!profile) {
    console.log("[SYNC] Step 2: Falling back to GET /api/uploadposts/users (list all)...");
    const users = await listUploadPostUsers();
    console.log("[SYNC] Step 2 — total users:", users.length);
    profile = users.find((u) => u.username === userId) ?? null;
    console.log("[SYNC] Step 2 found matching profile:", profile ? "yes" : "no");
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

/** Ensure Upload-Post profile exists for this user; create if not. */
export async function ensureUploadPostProfile(userId: string): Promise<{ ok: boolean; error?: string }> {
  const users = await listUploadPostUsers();
  if (users.some((u) => u.username === userId)) return { ok: true };
  const result = await createUploadPostProfile(userId);
  if (result.error) {
    const msg = result.error.toLowerCase();
    if (msg.includes("already in use") || msg.includes("already exists")) {
      return { ok: true };
    }
    return { ok: false, error: result.error };
  }
  return { ok: true };
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
