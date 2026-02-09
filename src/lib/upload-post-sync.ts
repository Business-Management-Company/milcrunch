import { supabase } from "@/integrations/supabase/client";
import {
  listUploadPostUsers,
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

/** Sync connected accounts from Upload-Post user profile into Supabase connected_accounts. */
export async function syncConnectedAccountsFromUploadPost(userId: string): Promise<ConnectedAccountRow[]> {
  const users = await listUploadPostUsers();
  const profile = users.find((u) => u.username === userId);
  const accounts = (profile?.connected_accounts ?? []) as ConnectedAccount[];

  if (accounts.length === 0) {
    await supabase.from("connected_accounts").delete().eq("user_id", userId);
    return [];
  }

  const rows = accounts.map((acc) => ({
    user_id: userId,
    platform: (acc.platform ?? "unknown").toLowerCase(),
    platform_user_id: acc.platform_user_id ?? acc.id ?? null,
    platform_username: acc.platform_username ?? acc.username ?? null,
    profile_image_url: acc.profile_image_url ?? null,
    followers_count: acc.followers_count ?? null,
    raw_data: acc,
    updated_at: new Date().toISOString(),
  }));

  // Upsert: delete existing for this user, then insert current set.
  await supabase.from("connected_accounts").delete().eq("user_id", userId);
  const { data: inserted, error } = await supabase
    .from("connected_accounts")
    .insert(rows)
    .select();

  if (error) {
    console.warn("[upload-post-sync] Insert failed:", error.message);
    return [];
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

/** Ensure Upload-Post profile exists for this user; create if not. */
export async function ensureUploadPostProfile(userId: string): Promise<{ ok: boolean; error?: string }> {
  const users = await listUploadPostUsers();
  if (users.some((u) => u.username === userId)) return { ok: true };
  const result = await createUploadPostProfile(userId);
  if (result.error) return { ok: false, error: result.error };
  return { ok: true };
}
