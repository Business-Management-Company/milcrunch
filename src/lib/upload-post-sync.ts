import { supabase } from "@/integrations/supabase/client";
import {
  listUploadPostUsers,
  getUploadPostUser,
  getUploadPostUserAccounts,
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

/** Sync connected accounts from Upload-Post user profile into Supabase.
 *  Tries multiple endpoints with aggressive diagnostic logging. */
export async function syncConnectedAccountsFromUploadPost(userId: string): Promise<ConnectedAccountRow[]> {
  console.log("=".repeat(60));
  console.log("[SYNC] Starting sync for userId:", userId);
  console.log("=".repeat(60));

  // ── Step 1: Try single-user endpoint ──
  console.log("[SYNC] Step 1: Trying GET /api/uploadposts/users/{username}...");
  let profile = await getUploadPostUser(userId);
  console.log("[SYNC] Step 1 result — profile:", profile ? "found" : "null");
  if (profile) {
    console.log("[SYNC] Step 1 profile keys:", Object.keys(profile));
    console.log("[SYNC] Step 1 profile.connected_accounts:", JSON.stringify(profile.connected_accounts, null, 2));
    console.log("[SYNC] Step 1 profile.accounts:", JSON.stringify((profile as any).accounts, null, 2));
  }

  // ── Step 2: Try dedicated accounts endpoint ──
  console.log("[SYNC] Step 2: Trying GET /api/uploadposts/users/{username}/accounts...");
  const accountsFromEndpoint = await getUploadPostUserAccounts(userId);
  console.log("[SYNC] Step 2 result — accounts count:", accountsFromEndpoint.length);
  if (accountsFromEndpoint.length > 0) {
    console.log("[SYNC] Step 2 accounts:", JSON.stringify(accountsFromEndpoint, null, 2));
  }

  // ── Step 3: Fallback to list endpoint ──
  if (!profile) {
    console.log("[SYNC] Step 3: Falling back to GET /api/uploadposts/users (list all)...");
    const users = await listUploadPostUsers();
    console.log("[SYNC] Step 3 result — total users:", users.length);
    profile = users.find((u) => u.username === userId) ?? null;
    console.log("[SYNC] Step 3 found matching profile:", profile ? "yes" : "no");
    if (profile) {
      console.log("[SYNC] Step 3 profile keys:", Object.keys(profile));
      console.log("[SYNC] Step 3 profile.connected_accounts:", JSON.stringify(profile.connected_accounts, null, 2));
    }
  }

  // ── Merge accounts from all sources ──
  const fromProfile = (profile?.connected_accounts ?? (profile as any)?.accounts ?? []) as ConnectedAccount[];
  const allRaw = [...fromProfile];
  // Merge accounts endpoint results (avoid duplicates by id)
  for (const acc of accountsFromEndpoint) {
    const id = (acc as any).id ?? (acc as any).account_id ?? "";
    if (!allRaw.some((a) => ((a as any).id ?? (a as any).account_id ?? "") === id && id !== "")) {
      allRaw.push(acc);
    }
  }

  console.log("[SYNC] Merged raw accounts total:", allRaw.length);
  console.log("[SYNC] Merged raw accounts:", JSON.stringify(allRaw, null, 2));

  if (allRaw.length === 0) {
    console.log("[SYNC] ⚠ NO connected accounts found from ANY UploadPost endpoint for user:", userId);
    console.log("[SYNC] Returning existing Supabase data instead.");
    const existing = await getConnectedAccounts(userId);
    console.log("[SYNC] Existing connected_accounts in Supabase:", existing.length);
    return existing;
  }

  // ── Map fields generously ──
  const mapped = allRaw.map((acc, i) => {
    console.log(`[SYNC] Mapping account ${i} — raw keys:`, Object.keys(acc));
    const platform = (acc.platform ?? (acc as any).provider ?? (acc as any).type ?? "unknown").toString().toLowerCase();
    const accountId = ((acc as any).id ?? (acc as any).account_id ?? (acc as any).platform_user_id ?? "").toString();
    const username = acc.platform_username ?? (acc as any).username ?? (acc as any).name ?? (acc as any).account_name ?? null;
    const avatar = acc.profile_image_url ?? (acc as any).avatar ?? (acc as any).profile_image ?? (acc as any).image ?? (acc as any).avatar_url ?? null;
    const followers = acc.followers_count ?? (acc as any).follower_count ?? (acc as any).followers ?? null;

    const result = {
      platform,
      accountId,
      username: typeof username === "string" ? username : null,
      avatar: typeof avatar === "string" ? avatar : null,
      followers: typeof followers === "number" ? followers : null,
      raw: acc,
    };
    console.log(`[SYNC] Mapped account ${i}:`, JSON.stringify(result, null, 2));
    return result;
  });

  // ── Upsert to creator_social_connections ──
  console.log("[SYNC] Upserting", mapped.length, "accounts to creator_social_connections...");
  for (const r of mapped) {
    const upsertData = {
      user_id: userId,
      platform: r.platform === "twitter" ? "x" : r.platform,
      account_name: r.username,
      account_avatar: r.avatar,
      upload_post_account_id: r.accountId || null,
      connected_at: new Date().toISOString(),
    };
    console.log("[Supabase] upserting account:", JSON.stringify(upsertData, null, 2));

    const { data: upsertResult, error: upsertError } = await supabase
      .from("creator_social_connections")
      .upsert(upsertData, { onConflict: "user_id,platform" })
      .select();

    console.log("[Supabase] upsert result:", JSON.stringify(upsertResult, null, 2));
    console.log("[Supabase] upsert error:", upsertError ? JSON.stringify(upsertError, null, 2) : "none");
  }

  // ── Also sync to connected_accounts (legacy) ──
  const legacyRows = mapped.map((r) => ({
    user_id: userId,
    platform: r.platform,
    platform_user_id: r.accountId || null,
    platform_username: r.username,
    profile_image_url: r.avatar,
    followers_count: r.followers,
    raw_data: r.raw,
    updated_at: new Date().toISOString(),
  }));

  const delResult = await supabase.from("connected_accounts").delete().eq("user_id", userId).neq("is_demo", true);
  if (delResult.error?.message?.includes("is_demo")) {
    await supabase.from("connected_accounts").delete().eq("user_id", userId);
  }
  const { data: inserted, error: legacyError } = await supabase
    .from("connected_accounts")
    .insert(legacyRows)
    .select();

  if (legacyError) {
    console.warn("[SYNC] connected_accounts legacy insert failed:", legacyError.message);
  }

  // ── Re-fetch from creator_social_connections as source of truth ──
  console.log("[SYNC] Re-fetching creator_social_connections...");
  const { data: csc, error: fetchError } = await supabase
    .from("creator_social_connections")
    .select("*")
    .eq("user_id", userId)
    .order("platform");

  console.log("[Supabase] fetched connections:", JSON.stringify(csc, null, 2));
  console.log("[Supabase] fetch error:", fetchError ? JSON.stringify(fetchError, null, 2) : "none");
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

  return (inserted ?? []) as ConnectedAccountRow[];
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
