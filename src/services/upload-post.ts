/**
 * Upload-Post API — white-label social connect & content.
 * All calls are proxied through /api/uploadpost-proxy to avoid CORS
 * and keep the API key server-side.
 * @see https://docs.upload-post.com
 */

// --- Proxy helper ---

/** Send a request through the Vercel serverless proxy to avoid CORS. */
async function proxyFetch(
  endpoint: string,
  method: string = "GET",
  body?: unknown
): Promise<{ status: number; data: any }> {
  console.log(`[UploadPost] proxy → ${method} ${endpoint}`);
  if (body) console.log(`[UploadPost] proxy body:`, JSON.stringify(body, null, 2));

  const res = await fetch("/api/uploadpost-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, method, body }),
  });

  const data = await res.json().catch(() => ({}));
  console.log(`[UploadPost] proxy response status:`, res.status);
  console.log(`[UploadPost] proxy response body:`, JSON.stringify(data, null, 2));

  return { status: res.status, data };
}

// --- User profiles (white-label) ---

export interface UploadPostUser {
  username: string;
  connected_accounts?: ConnectedAccount[];
  [key: string]: unknown;
}

export interface ConnectedAccount {
  platform?: string;
  platform_username?: string;
  profile_image_url?: string;
  followers_count?: number;
  [key: string]: unknown;
}

/** Create a user profile in Upload-Post (username = Supabase user id). */
export async function createUploadPostProfile(
  userId: string
): Promise<{ success?: boolean; username?: string; error?: string }> {
  const { status, data } = await proxyFetch("/api/uploadposts/users", "POST", {
    username: userId,
  });
  if (status >= 400) return { error: data.message ?? data.error ?? `HTTP ${status}` };
  return data;
}

/** List all user profiles with connected accounts. */
export async function listUploadPostUsers(): Promise<UploadPostUser[]> {
  console.log("[UploadPost] GET all users via proxy");
  const { status, data } = await proxyFetch("/api/uploadposts/users", "GET");
  console.log("[UploadPost] GET all users status:", status);
  if (status >= 400) return [];
  // API returns { profiles: [...] }
  const users = Array.isArray(data)
    ? data
    : data.profiles ?? data.users ?? data.data ?? [];
  console.log("[UploadPost] GET all users parsed count:", users.length);
  if (users.length > 0) {
    console.log("[UploadPost] First user keys:", Object.keys(users[0]));
  }
  return users;
}

/** Delete a user profile. */
export async function deleteUploadPostUser(
  username: string
): Promise<{ success?: boolean; error?: string }> {
  const { status, data } = await proxyFetch("/api/uploadposts/users", "DELETE", {
    username,
  });
  if (status >= 400) return { error: data.message ?? data.error ?? `HTTP ${status}` };
  return data;
}

// --- JWT / Connect ---

export interface GenerateJwtResponse {
  access_url?: string;
  success?: boolean;
  duration?: string;
  error?: string;
}

export interface GenerateConnectOptions {
  userId: string;
  redirectUrl?: string;
  /** Single provider string to pre-select a platform (e.g. "tiktok", "twitter"). */
  provider?: string;
}

/** All supported UploadPost platforms for the connect UI.
 *  IMPORTANT: UploadPost uses "x" (not "twitter") per their API docs. */
const ALL_PLATFORMS = [
  "tiktok",
  "instagram",
  "linkedin",
  "youtube",
  "facebook",
  "x",
  "threads",
  "pinterest",
  "reddit",
  "bluesky",
  "google_business",
];

/** MilCrunch logo URL used on the UploadPost connect page. */
const LOGO_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/icons/icon-512.png`
    : "https://milcrunch.com/icons/icon-512.png";

/** Generate secure connect URL for creator to link socials.
 *  On 409 (user already exists) falls back to a plain connect URL. */
export async function generateConnectUrl(
  opts: GenerateConnectOptions
): Promise<GenerateJwtResponse> {
  const body: Record<string, unknown> = {
    username: opts.userId,
    logo_image: LOGO_URL,
    connect_title: "Connect Your Social Accounts",
    connect_description:
      "Link your social media accounts to MilCrunch to manage posts, track performance, and grow your military creator brand.",
    redirect_button_text: "Return to MilCrunch",
    show_calendar: false,
    platforms: opts.provider ? [opts.provider] : ALL_PLATFORMS,
  };
  if (opts.redirectUrl) body.redirect_url = opts.redirectUrl;

  console.log("[UploadPost] generate-jwt request body:", JSON.stringify(body, null, 2));

  const { status, data } = await proxyFetch(
    "/api/uploadposts/users/generate-jwt",
    "POST",
    body
  );

  if (status < 400 && data.access_url) {
    console.log("[UploadPost] ✅ JWT connect URL:", data.access_url);
    console.log("[UploadPost] Provider requested:", opts.provider ?? "all", "| Platforms sent:", body.platforms);
    return data;
  }
  console.warn("[UploadPost] generate-jwt returned status", status, "without access_url. Response:", JSON.stringify(data));

  // 409 = user already exists — just retry once WITHOUT creating a new profile.
  // NEVER call createUploadPostProfile here — that's ensureUploadPostProfile's job.
  if (status === 409) {
    console.log("[UploadPost] 409 — user exists. Retrying generate-jwt without creating a new profile...");
    const retry = await proxyFetch("/api/uploadposts/users/generate-jwt", "POST", body);
    if (retry.status < 400 && retry.data.access_url) {
      console.log(
        "[UploadPost] JWT URL (retry):",
        retry.data.access_url,
        "| provider:",
        opts.provider ?? "all"
      );
      return retry.data;
    }
    return { error: data.message ?? data.error ?? "User exists but JWT generation failed" };
  }

  if (status >= 400)
    return { error: data.message ?? data.error ?? `HTTP ${status}` };

  console.log("[UploadPost] JWT URL:", data.access_url, "| provider:", opts.provider ?? "all");
  return data;
}

/** Fetch a single user profile with connected accounts. */
export async function getUploadPostUser(
  username: string
): Promise<UploadPostUser | null> {
  const endpoint = `/api/uploadposts/users/${encodeURIComponent(username)}`;
  console.log("[UploadPost] GET single user:", endpoint);

  const { status, data } = await proxyFetch(endpoint, "GET");

  console.log("[UploadPost] GET single user status:", status);
  console.log("[UploadPost] GET single user raw response keys:", Object.keys(data));

  if (status >= 400) {
    console.warn("[UploadPost] GET single user FAILED:", status);
    return null;
  }

  const profile = data.user ?? data.profile ?? data ?? null;
  if (profile) {
    console.log("[UploadPost] Parsed profile keys:", Object.keys(profile));
    console.log("[UploadPost] social_accounts field:", JSON.stringify(profile.social_accounts, null, 2));
  }
  return profile;
}

/** Try the /accounts endpoint. */
export async function getUploadPostUserAccounts(
  username: string
): Promise<ConnectedAccount[]> {
  // Try 1: /users/{username}/accounts
  const ep1 = `/api/uploadposts/users/${encodeURIComponent(username)}/accounts`;
  console.log("[UploadPost] GET user accounts (path 1):", ep1);
  const r1 = await proxyFetch(ep1, "GET");
  console.log("[UploadPost] GET user accounts (path 1) status:", r1.status);
  console.log("[UploadPost] GET user accounts (path 1) response:", JSON.stringify(r1.data, null, 2));
  if (r1.status < 400) {
    const accs = Array.isArray(r1.data)
      ? r1.data
      : r1.data.accounts ?? r1.data.data ?? r1.data.connected_accounts ?? [];
    if (accs.length > 0) return accs;
  }

  // Try 2: /users/accounts?username=...
  const ep2 = `/api/uploadposts/users/accounts?username=${encodeURIComponent(username)}`;
  console.log("[UploadPost] GET user accounts (path 2):", ep2);
  const r2 = await proxyFetch(ep2, "GET");
  console.log("[UploadPost] GET user accounts (path 2) status:", r2.status);
  console.log("[UploadPost] GET user accounts (path 2) response:", JSON.stringify(r2.data, null, 2));
  if (r2.status < 400) {
    const accs = Array.isArray(r2.data)
      ? r2.data
      : r2.data.accounts ?? r2.data.data ?? r2.data.connected_accounts ?? [];
    if (accs.length > 0) return accs;
  }

  return [];
}

/** Validate JWT; returns profile with connected accounts. */
export async function validateUploadPostJwt(
  token: string
): Promise<UploadPostUser | null> {
  const { status, data } = await proxyFetch(
    "/api/uploadposts/users/validate-jwt",
    "POST",
    { token }
  );
  if (status >= 400) return null;
  return data.user ?? data ?? null;
}

// --- Content upload ---

export const UPLOAD_POST_PLATFORMS = [
  "tiktok",
  "instagram",
  "linkedin",
  "youtube",
  "facebook",
  "x",
  "threads",
  "pinterest",
  "reddit",
  "bluesky",
] as const;

export type UploadPostPlatform = (typeof UPLOAD_POST_PLATFORMS)[number];

export interface UploadVideoOptions {
  title: string;
  user: string;
  platform: UploadPostPlatform[];
  video: string | File;
  scheduled_date?: string;
  async_upload?: boolean;
  first_comment?: string;
  media_type?: string;
}

export interface UploadPhotosOptions {
  title: string;
  user: string;
  platform: UploadPostPlatform[];
  photos: (string | File)[];
  scheduled_date?: string;
  async_upload?: boolean;
  first_comment?: string;
  media_type?: string;
}

export interface UploadTextOptions {
  title: string;
  user: string;
  platform: UploadPostPlatform[];
  scheduled_date?: string;
  async_upload?: boolean;
  first_comment?: string;
  media_type?: string;
}

export interface UploadResult {
  success?: boolean;
  id?: string;
  request_id?: string;
  job_id?: string;
  data?: { status?: string; platforms?: { name: string; url?: string }[] };
  results?: Record<string, { success?: boolean; error?: string }>;
  error?: string;
}

/** Upload video via dedicated /api/upload-videos serverless function. */
export async function uploadVideo(opts: UploadVideoOptions): Promise<UploadResult> {
  const body: Record<string, unknown> = {
    title: opts.title,
    user: opts.user,
    platform: opts.platform,
  };
  if (typeof opts.video === "string") body.video = opts.video;
  if (opts.scheduled_date) body.scheduled_date = opts.scheduled_date;
  if (opts.async_upload) body.async_upload = true;
  if (opts.first_comment) body.first_comment = opts.first_comment;

  console.log("[UploadPost] upload-videos direct POST:", JSON.stringify(body, null, 2));

  const res = await fetch("/api/upload-videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  console.log("[UploadPost] upload-videos response:", res.status, JSON.stringify(data, null, 2));

  if (res.status >= 400)
    return { success: false, error: data.message ?? data.error ?? `HTTP ${res.status}` };
  return data;
}

/** Upload photos via dedicated /api/upload-photos serverless function. */
export async function uploadPhotos(opts: UploadPhotosOptions): Promise<UploadResult> {
  const body: Record<string, unknown> = {
    title: opts.title,
    user: opts.user,
    platform: opts.platform,
    photos: opts.photos.filter((p): p is string => typeof p === "string"),
  };
  if (opts.scheduled_date) body.scheduled_date = opts.scheduled_date;
  if (opts.async_upload) body.async_upload = true;
  if (opts.first_comment) body.first_comment = opts.first_comment;

  console.log("[UploadPost] upload-photos direct POST:", JSON.stringify(body, null, 2));

  const res = await fetch("/api/upload-photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  console.log("[UploadPost] upload-photos response:", res.status, JSON.stringify(data, null, 2));

  if (res.status >= 400)
    return { success: false, error: data.message ?? data.error ?? `HTTP ${res.status}` };
  return data;
}

/** Upload text-only post via dedicated /api/upload-text serverless function. */
export async function uploadText(opts: UploadTextOptions): Promise<UploadResult> {
  const body: Record<string, unknown> = {
    title: opts.title,
    user: opts.user,
    platform: opts.platform,
  };
  if (opts.scheduled_date) body.scheduled_date = opts.scheduled_date;
  if (opts.async_upload) body.async_upload = true;
  if (opts.first_comment) body.first_comment = opts.first_comment;

  console.log("[UploadPost] upload-text direct POST:", JSON.stringify(body, null, 2));

  const res = await fetch("/api/upload-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  console.log("[UploadPost] upload-text response:", res.status, JSON.stringify(data, null, 2));

  if (res.status >= 400)
    return { success: false, error: data.message ?? data.error ?? `HTTP ${res.status}` };
  return data;
}

// --- Unified post helper ---

export interface CreatePostOptions {
  /** Caption / post text */
  text: string;
  /** UploadPost profile username (resolved slug, not UUID) */
  user: string;
  /** Target platform names (e.g. ["instagram", "x"]) */
  platforms: UploadPostPlatform[];
  /** Optional media URL — determines photo vs text post */
  media_url?: string;
  /** "video" | "photo" — if media_url is set, specify type. Defaults to "photo". */
  media_type?: "video" | "photo";
  /** ISO-8601 scheduled date (omit for immediate) */
  scheduled_at?: string;
}

export interface CreatePostResult {
  success?: boolean;
  id?: string;
  request_id?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * Create a post via the correct UploadPost upload endpoint.
 * Routes to /api/upload_text, /api/upload_photos, or /api/upload_videos
 * based on whether media is attached.
 */
export async function createUploadPost(
  opts: CreatePostOptions
): Promise<CreatePostResult> {
  console.log("[createUploadPost] called with:", { text: opts.text?.slice(0, 50), user: opts.user, platforms: opts.platforms, media_url: opts.media_url, media_type: opts.media_type });
  const hasMedia = !!opts.media_url?.trim();
  const isVideo = hasMedia && opts.media_type === "video";

  if (isVideo) {
    return uploadVideo({
      title: opts.text,
      user: opts.user,
      platform: opts.platforms,
      video: opts.media_url!,
      scheduled_date: opts.scheduled_at,
      async_upload: true,
    });
  } else if (hasMedia) {
    return uploadPhotos({
      title: opts.text,
      user: opts.user,
      platform: opts.platforms,
      photos: [opts.media_url!],
      scheduled_date: opts.scheduled_at,
      async_upload: true,
    });
  } else {
    return uploadText({
      title: opts.text,
      user: opts.user,
      platform: opts.platforms,
      scheduled_date: opts.scheduled_at,
    });
  }
}

/** Get upload status (async or scheduled). */
export async function getUploadStatus(params: {
  request_id?: string;
  job_id?: string;
}): Promise<UploadResult> {
  const q = new URLSearchParams();
  if (params.request_id) q.set("request_id", params.request_id);
  if (params.job_id) q.set("job_id", params.job_id);

  const { status, data } = await proxyFetch(
    `/api/uploadposts/status?${q.toString()}`,
    "GET"
  );
  if (status >= 400)
    return { success: false, error: data.message ?? `HTTP ${status}` };
  return data;
}
