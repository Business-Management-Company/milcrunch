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

/** Generate secure connect URL for creator to link socials. */
export async function generateConnectUrl(userId: string, redirectUrl?: string): Promise<GenerateJwtResponse> {
  const body: Record<string, string> = { username: userId };
  if (redirectUrl) body.redirect_url = redirectUrl;
  const res = await fetch(`${API_BASE}/api/uploadposts/users/generate-jwt`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.message ?? data.error ?? res.statusText };
  return data;
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
