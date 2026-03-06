/**
 * Upload-Post API — white-label social connect & content.
 * Connect once, use everywhere: bio page, scheduling, analytics, discovery.
 * @see https://docs.upload-post.com
 */

const API_BASE = "https://api.upload-post.com";

function getApiKey(): string {
  const key = import.meta.env.VITE_UPLOAD_POST_API_KEY;
  return typeof key === "string" ? key.trim() : "";
}

function getHeaders(json = true): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Apikey ${getApiKey()}`,
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
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
export async function createUploadPostProfile(userId: string): Promise<{ success?: boolean; username?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/api/uploadposts/users`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ username: userId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.message ?? data.error ?? res.statusText };
  return data;
}

/** List all user profiles with connected accounts. */
export async function listUploadPostUsers(): Promise<UploadPostUser[]> {
  const res = await fetch(`${API_BASE}/api/uploadposts/users`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  return Array.isArray(data) ? data : data.users ?? data.data ?? [];
}

/** Delete a user profile. */
export async function deleteUploadPostUser(username: string): Promise<{ success?: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/uploadposts/users`, {
    method: "DELETE",
    headers: getHeaders(),
    body: JSON.stringify({ username }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.message ?? data.error ?? res.statusText };
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

/** All supported UploadPost platforms for the connect UI. */
const ALL_PLATFORMS = [
  "tiktok", "instagram", "linkedin", "youtube", "facebook",
  "twitter", "threads", "pinterest", "reddit", "bluesky", "google_business",
];

/** MilCrunch logo URL used on the UploadPost connect page. */
const LOGO_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/icons/icon-512.png`
    : "https://milcrunch.com/icons/icon-512.png";

/** Generate secure connect URL for creator to link socials.
 *  On 409 (user already exists) falls back to a plain connect URL. */
export async function generateConnectUrl(opts: GenerateConnectOptions): Promise<GenerateJwtResponse> {
  const body: Record<string, unknown> = {
    username: opts.userId,
    // White-label branding
    logo_image: LOGO_URL,
    connect_title: "Connect Your Social Accounts",
    connect_description:
      "Link your social media accounts to MilCrunch to manage posts, track performance, and grow your military creator brand.",
    redirect_button_text: "Return to MilCrunch",
    show_calendar: false,
    // Always show all platforms; narrow to one only when a specific provider is requested
    platforms: opts.provider ? [opts.provider] : ALL_PLATFORMS,
  };
  if (opts.redirectUrl) body.redirect_url = opts.redirectUrl;

  console.log("[UploadPost] generate-jwt request body:", JSON.stringify(body, null, 2));

  const res = await fetch(`${API_BASE}/api/uploadposts/users/generate-jwt`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));

  // If JWT generated successfully, return it
  if (res.ok && data.access_url) {
    console.log("[UploadPost] JWT URL:", data.access_url, "| provider:", opts.provider ?? "all");
    return data;
  }

  // 409 = user already exists — try creating a fresh profile then retry once
  if (res.status === 409) {
    await createUploadPostProfile(opts.userId).catch(() => {});
    const retry = await fetch(`${API_BASE}/api/uploadposts/users/generate-jwt`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    const retryData = await retry.json().catch(() => ({}));
    if (retry.ok && retryData.access_url) {
      console.log("[UploadPost] JWT URL (retry):", retryData.access_url, "| provider:", opts.provider ?? "all");
      return retryData;
    }
    return { access_url: "https://app.upload-post.com/connect", success: true };
  }

  if (!res.ok) return { error: data.message ?? data.error ?? res.statusText };
  console.log("[UploadPost] JWT URL:", data.access_url, "| provider:", opts.provider ?? "all");
  return data;
}

/** Fetch a single user profile with connected accounts. */
export async function getUploadPostUser(username: string): Promise<UploadPostUser | null> {
  const url = `${API_BASE}/api/uploadposts/users/${encodeURIComponent(username)}`;
  console.log("[UploadPost] GET user:", url);
  const res = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  console.log("[UploadPost] GET user raw response:", JSON.stringify(data, null, 2));
  if (!res.ok) {
    console.warn("[UploadPost] GET user failed:", res.status, res.statusText);
    return null;
  }
  return data.user ?? data ?? null;
}

/** Validate JWT; returns profile with connected accounts. */
export async function validateUploadPostJwt(token: string): Promise<UploadPostUser | null> {
  const res = await fetch(`${API_BASE}/api/uploadposts/users/validate-jwt`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
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
  user: string; // Upload-Post username (= Supabase user id)
  platform: UploadPostPlatform[];
  video: string | File; // URL or file
  scheduled_date?: string; // ISO
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

/** Upload video. Use URL or File. */
export async function uploadVideo(opts: UploadVideoOptions): Promise<UploadResult> {
  const form = new FormData();
  form.append("title", opts.title);
  form.append("user", opts.user);
  opts.platform.forEach((p) => form.append("platform[]", p));
  if (typeof opts.video === "string") form.append("video", opts.video);
  else form.append("video", opts.video);
  if (opts.scheduled_date) form.append("scheduled_date", opts.scheduled_date);
  if (opts.async_upload) form.append("async_upload", "true");
  if (opts.first_comment) form.append("first_comment", opts.first_comment);
  if (opts.media_type) form.append("media_type", opts.media_type);

  const res = await fetch(`${API_BASE}/api/upload_videos`, {
    method: "POST",
    headers: { Authorization: `Apikey ${getApiKey()}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: data.message ?? data.error ?? res.statusText };
  return data;
}

/** Upload photos / carousel. */
export async function uploadPhotos(opts: UploadPhotosOptions): Promise<UploadResult> {
  const form = new FormData();
  form.append("title", opts.title);
  form.append("user", opts.user);
  opts.platform.forEach((p) => form.append("platform[]", p));
  opts.photos.forEach((photo) => form.append("photos[]", photo));
  if (opts.scheduled_date) form.append("scheduled_date", opts.scheduled_date);
  if (opts.async_upload) form.append("async_upload", "true");
  if (opts.first_comment) form.append("first_comment", opts.first_comment);
  if (opts.media_type) form.append("media_type", opts.media_type);

  const res = await fetch(`${API_BASE}/api/upload_photos`, {
    method: "POST",
    headers: { Authorization: `Apikey ${getApiKey()}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: data.message ?? data.error ?? res.statusText };
  return data;
}

/** Upload text-only post. */
export async function uploadText(opts: UploadTextOptions): Promise<UploadResult> {
  const form = new FormData();
  form.append("title", opts.title);
  form.append("user", opts.user);
  opts.platform.forEach((p) => form.append("platform[]", p));
  if (opts.scheduled_date) form.append("scheduled_date", opts.scheduled_date);
  if (opts.async_upload) form.append("async_upload", "true");
  if (opts.first_comment) form.append("first_comment", opts.first_comment);
  if (opts.media_type) form.append("media_type", opts.media_type);

  const res = await fetch(`${API_BASE}/api/upload_text`, {
    method: "POST",
    headers: { Authorization: `Apikey ${getApiKey()}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: data.message ?? data.error ?? res.statusText };
  return data;
}

// --- Unified post endpoint ---

export interface CreatePostOptions {
  text: string;
  account_ids: string[];
  media_url?: string;
  scheduled_at?: string;
}

export interface CreatePostResult {
  success?: boolean;
  id?: string;
  request_id?: string;
  error?: string;
  [key: string]: unknown;
}

/** Create a post via the unified UploadPost posts endpoint. */
export async function createUploadPost(opts: CreatePostOptions): Promise<CreatePostResult> {
  const body: Record<string, unknown> = {
    text: opts.text,
    account_ids: opts.account_ids,
  };
  if (opts.media_url) body.media_url = opts.media_url;
  if (opts.scheduled_at) body.scheduled_at = opts.scheduled_at;

  console.log("[UploadPost] POST /api/uploadposts/posts request:", JSON.stringify(body, null, 2));

  const res = await fetch(`${API_BASE}/api/uploadposts/posts`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  console.log("[UploadPost] POST /api/uploadposts/posts response:", res.status, JSON.stringify(data, null, 2));

  if (!res.ok) return { success: false, error: data.message ?? data.error ?? res.statusText };
  return { success: true, ...data };
}

/** Get upload status (async or scheduled). */
export async function getUploadStatus(params: { request_id?: string; job_id?: string }): Promise<UploadResult> {
  const q = new URLSearchParams();
  if (params.request_id) q.set("request_id", params.request_id);
  if (params.job_id) q.set("job_id", params.job_id);
  const res = await fetch(`${API_BASE}/api/uploadposts/status?${q.toString()}`, {
    method: "GET",
    headers: getHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: data.message ?? res.statusText };
  return data;
}
