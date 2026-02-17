import { supabase } from "@/integrations/supabase/client";

/** Upload a creator's profile image to Supabase storage via the serverless proxy.
 *  Returns the permanent Supabase public URL, or null if upload fails. */
export async function uploadCreatorImage(
  imageUrl: string,
  handle: string
): Promise<string | null> {
  if (!imageUrl || !handle) return null;
  try {
    const resp = await fetch("/api/upload-creator-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl, handle }),
    });
    if (!resp.ok) {
      console.warn("[directories] Image upload failed:", resp.status);
      return null;
    }
    const data = await resp.json();
    return data.url || null;
  } catch (err) {
    console.warn("[directories] Image upload error:", err);
    return null;
  }
}

export interface Directory {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  event_id: string | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface DirectoryMember {
  id: string;
  directory_id: string;
  creator_handle: string;
  creator_name: string | null;
  avatar_url: string | null;
  ic_avatar_url: string | null;
  platform: string;
  branch: string | null;
  status: string | null;
  follower_count: number | null;
  engagement_rate: number | null;
  bio: string | null;
  category: string | null;
  platforms: string[];
  platform_urls: Record<string, string>;
  enrichment_data: unknown;
  paradedeck_verified: boolean;
  influencersclub_verified: boolean;
  profile_slug: string | null;
  sort_order: number;
  approved: boolean;
  added_by: string | null;
  added_at: string;
}

// ─── Directory CRUD ─────────────────────────────────────────

export async function fetchDirectories(): Promise<Directory[]> {
  const { data, error } = await supabase
    .from("directories")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[directories] fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as Directory[];
}

export async function fetchDirectoriesWithCounts(): Promise<Directory[]> {
  const dirs = await fetchDirectories();
  if (dirs.length === 0) return [];

  // Batch-fetch member counts
  const { data: counts, error: countErr } = await supabase
    .from("directory_members")
    .select("directory_id")
    .in("directory_id", dirs.map((d) => d.id));

  if (countErr) {
    console.error("[directories] member count fetch FAILED:", countErr.message, countErr.details, countErr.hint);
  }

  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    const did = (row as { directory_id: string }).directory_id;
    countMap.set(did, (countMap.get(did) ?? 0) + 1);
  }
  console.log("[directories] member counts:", Object.fromEntries(countMap));
  return dirs.map((d) => ({ ...d, member_count: countMap.get(d.id) ?? 0 }));
}

export async function createDirectory(data: {
  name: string;
  description?: string;
  cover_image_url?: string;
  event_id?: string | null;
  is_public?: boolean;
  created_by?: string;
}): Promise<{ directory: Directory | null; error: string | null }> {
  const { data: row, error } = await supabase
    .from("directories")
    .insert({
      name: data.name,
      description: data.description || null,
      cover_image_url: data.cover_image_url || null,
      event_id: data.event_id || null,
      is_public: data.is_public ?? true,
      created_by: data.created_by || null,
    })
    .select()
    .single();
  if (error) return { directory: null, error: error.message };
  return { directory: row as Directory, error: null };
}

export async function updateDirectory(
  id: string,
  updates: Partial<Pick<Directory, "name" | "description" | "cover_image_url" | "event_id" | "is_public">>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("directories")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteDirectory(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("directories").delete().eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

// ─── Directory Member CRUD ──────────────────────────────────

export async function fetchDirectoryMembers(directoryId: string): Promise<DirectoryMember[]> {
  const { data: { session } } = await supabase.auth.getSession();
  console.log("[directories] fetchDirectoryMembers →", {
    directoryId,
    userId: session?.user?.id ?? "NO SESSION",
    role: (session?.user?.user_metadata as Record<string, unknown>)?.role ?? "unknown",
  });

  const { data, error } = await supabase
    .from("directory_members")
    .select("*")
    .eq("directory_id", directoryId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[directories] members fetch FAILED:", error.message, error.details, error.hint);
    return [];
  }

  console.log("[directories] members returned:", data?.length ?? 0, "rows for directory", directoryId);
  if ((data?.length ?? 0) === 0) {
    // RLS debug: try a count without directory filter to see if ANY rows are readable
    const { count, error: countErr } = await supabase
      .from("directory_members")
      .select("*", { count: "exact", head: true });
    console.warn("[directories] RLS DEBUG — total readable rows across all directories:", count, countErr?.message ?? "OK");
  }

  return (data ?? []).map(mapMemberRow);
}

export async function addToDirectory(
  directoryId: string,
  data: {
    handle: string;
    display_name: string;
    platform: string;
    avatar_url?: string | null;
    ic_avatar_url?: string | null;
    follower_count?: number | null;
    engagement_rate?: number | null;
    bio?: string | null;
    branch?: string | null;
    status?: string | null;
    platforms?: string[];
    platform_urls?: Record<string, string>;
    category?: string | null;
    enrichment_data?: unknown;
    added_by?: string | null;
  }
): Promise<{ error: string | null }> {
  const handle = data.handle.replace(/^@/, "").trim();

  // Get max sort_order for this directory
  const { data: maxRow } = await supabase
    .from("directory_members")
    .select("sort_order")
    .eq("directory_id", directoryId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = ((maxRow as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0) + 1;

  const slug = generateProfileSlug(data.display_name, handle);

  // Upload profile image to Supabase storage for permanent URL
  // Skip if caller already uploaded (avatar_url is already a Supabase storage URL)
  let permanentAvatarUrl = data.avatar_url || null;
  if (permanentAvatarUrl && permanentAvatarUrl.includes("supabase.co/storage")) {
    // Already a permanent URL — no re-upload needed
  } else {
    const sourceImageUrl = data.ic_avatar_url || data.avatar_url;
    if (sourceImageUrl) {
      const uploaded = await uploadCreatorImage(sourceImageUrl, handle);
      if (uploaded) permanentAvatarUrl = uploaded;
    }
  }

  const payload = {
    directory_id: directoryId,
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
    enrichment_data: data.enrichment_data || null,
    approved: true,
    sort_order: nextOrder,
    added_by: data.added_by || null,
    added_at: new Date().toISOString(),
    profile_slug: slug,
  };

  console.log("[addToDirectory] Upserting:", { directoryId, handle, columns: Object.keys(payload) });

  const { error } = await supabase.from("directory_members").upsert(
    payload,
    { onConflict: "directory_id,creator_handle,platform", ignoreDuplicates: false }
  );
  if (error) {
    console.error("[addToDirectory] UPSERT FAILED:", error.message, error.details, error.hint, error.code);
    return { error: `${error.message}${error.details ? ` (${error.details})` : ""}` };
  }
  return { error: null };
}

export async function toggleMemberApproval(
  id: string,
  approved: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("directory_members")
    .update({ approved })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function removeMember(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("directory_members")
    .update({ approved: false })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

// ─── Showcase: all approved members across public directories ──

export async function fetchShowcaseFromDirectories(limit = 40): Promise<DirectoryMember[]> {
  // Fetch approved members from all public directories, deduplicated by handle
  const { data, error } = await supabase
    .from("directory_members")
    .select("*")
    .eq("approved", true)
    .order("sort_order", { ascending: true })
    .limit(limit * 2); // over-fetch to allow for dedup

  if (error) {
    console.error("[directories] showcase fetch FAILED:", error.message, error.details, error.hint);
    return [];
  }
  console.log("[directories] showcase returned:", data?.length ?? 0, "approved rows");

  // Deduplicate by handle (keep first occurrence)
  const seen = new Set<string>();
  const unique: DirectoryMember[] = [];
  for (const row of data ?? []) {
    const member = mapMemberRow(row);
    const key = `${member.creator_handle}:${member.platform}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(member);
    }
    if (unique.length >= limit) break;
  }
  return unique;
}

// ─── Bulk promote from list ─────────────────────────────────

export async function promoteListToDirectory(
  directoryId: string,
  creators: {
    handle: string;
    display_name: string;
    platform: string;
    avatar_url?: string | null;
    ic_avatar_url?: string | null;
    follower_count?: number | null;
    engagement_rate?: number | null;
    bio?: string | null;
    branch?: string | null;
    platforms?: string[];
    category?: string | null;
  }[],
  addedBy?: string
): Promise<{ added: number; failed: number }> {
  let added = 0;
  let failed = 0;
  for (const c of creators) {
    const { error } = await addToDirectory(directoryId, {
      ...c,
      added_by: addedBy || null,
    });
    if (error) failed++;
    else added++;
  }
  return { added, failed };
}

// ─── Slug generation ────────────────────────────────────────

/** Generate a URL-safe slug from a display name (e.g. "Jocko Willink" → "jocko-willink") */
export function generateProfileSlug(displayName: string, handle: string): string {
  // Prefer slugifying the display name; fall back to handle
  const source = displayName?.trim() || handle?.trim() || "creator";
  return source
    .toLowerCase()
    .replace(/['']/g, "")           // remove apostrophes
    .replace(/[^a-z0-9]+/g, "-")    // non-alphanumeric → dash
    .replace(/^-+|-+$/g, "")        // trim leading/trailing dashes
    || handle?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "creator";
}

// ─── Helper ─────────────────────────────────────────────────

function mapMemberRow(row: Record<string, unknown>): DirectoryMember {
  return {
    id: row.id as string,
    directory_id: row.directory_id as string,
    creator_handle: row.creator_handle as string,
    creator_name: (row.creator_name as string) ?? null,
    avatar_url: (row.avatar_url as string) ?? null,
    ic_avatar_url: (row.ic_avatar_url as string) ?? null,
    platform: (row.platform as string) ?? "instagram",
    branch: (row.branch as string) ?? null,
    status: (row.status as string) ?? null,
    follower_count: (row.follower_count as number) ?? null,
    engagement_rate: (row.engagement_rate as number) ?? null,
    bio: (row.bio as string) ?? null,
    category: (row.category as string) ?? null,
    platforms: Array.isArray(row.platforms) ? (row.platforms as string[]) : [],
    platform_urls: (row.platform_urls as Record<string, string>) ?? {},
    enrichment_data: row.enrichment_data ?? null,
    paradedeck_verified: (row.paradedeck_verified as boolean) ?? false,
    influencersclub_verified: (row.influencersclub_verified as boolean) ?? false,
    profile_slug: (row.profile_slug as string) ?? null,
    sort_order: (row.sort_order as number) ?? 0,
    approved: (row.approved as boolean) ?? true,
    added_by: (row.added_by as string) ?? null,
    added_at: (row.added_at as string) ?? new Date().toISOString(),
  };
}
