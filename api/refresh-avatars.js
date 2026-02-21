import { createClient } from "@supabase/supabase-js";

export const config = { maxDuration: 300 };

const BUCKET = "creator-avatars";
const DISCOVERY_URL = "https://api-dashboard.influencers.club/public/v1/discovery/";
const AVATAR_FIELDS = [
  "picture", "profile_picture_hd", "profile_picture",
  "profile_pic_url", "profile_pic_url_hd", "avatar",
  "avatar_url", "image_url", "photo", "thumbnail",
];

function extractAvatar(obj) {
  if (!obj || typeof obj !== "object") return null;
  for (const key of AVATAR_FIELDS) {
    const val = obj[key];
    if (val && typeof val === "string" && val.trim() && !val.includes("ui-avatars.com")) {
      return val.replace(/^http:\/\//i, "https://");
    }
  }
  return null;
}

/** Call IC Discovery API → return the fresh CDN avatar URL string. */
async function getAvatarUrlFromDiscovery(handle, platform, apiKey) {
  const res = await fetch(DISCOVERY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      platform: platform || "instagram",
      filters: { username: handle },
      paging: { limit: 1, page: 1 },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const accounts = data.accounts;
  if (!Array.isArray(accounts) || accounts.length === 0) return null;
  const acc = accounts[0];
  return (
    extractAvatar(acc.profile) ||
    extractAvatar(acc.platformData) ||
    extractAvatar(acc) ||
    extractAvatar(acc.instagram) ||
    null
  );
}

/**
 * Fetch the image bytes from a fresh CDN URL, validate, upload to Supabase Storage.
 * Returns the permanent Supabase public URL, or null on failure.
 */
async function uploadImageToStorage(sb, handle, cdnUrl) {
  const imgResp = await fetch(cdnUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  if (!imgResp.ok) {
    console.warn("[upload]", handle, "CDN fetch failed:", imgResp.status);
    return null;
  }

  const respType = imgResp.headers.get("content-type") || "";
  if (!respType.startsWith("image/")) {
    console.warn("[upload]", handle, "not image:", respType);
    return null;
  }

  const buf = Buffer.from(await imgResp.arrayBuffer());

  if (buf.length < 5000) {
    console.warn("[upload]", handle, "too small:", buf.length, "bytes");
    return null;
  }

  const head = buf.slice(0, 200).toString("utf8").toLowerCase();
  if (head.includes("<!doctype") || head.includes("<html")) {
    console.warn("[upload]", handle, "HTML not image");
    return null;
  }

  const safeName = handle.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  const path = `${safeName}/avatar.jpg`;

  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: respType.split(";")[0], upsert: true });

  if (error) return null;

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * GET or POST /api/refresh-avatars
 *
 * For each creator: Discovery API → fresh CDN URL → fetch image → upload to Storage → save permanent URL.
 *
 * - Cron (GET, daily): only processes rows where ic_avatar_url IS NULL.
 * - Manual button (POST { force: true }): processes all rows.
 * - Never overwrites a permanent URL with null if anything fails.
 */
export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "GET or POST only" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const apiKey = process.env.INFLUENCERS_CLUB_API_KEY || process.env.VITE_INFLUENCERS_CLUB_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }
  if (!apiKey) {
    return res.status(500).json({ error: "IC API key not configured" });
  }

  const sb = createClient(supabaseUrl, supabaseKey);

  const body = req.method === "GET" ? {} : (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {});
  const force = !!body.force;

  let query = sb.from("directory_members").select("id, creator_handle, platform, ic_avatar_url").eq("approved", true);
  if (body.directory_id) query = query.eq("directory_id", body.directory_id);

  // Cron: only fill missing avatars. Force: refresh everything.
  if (!force) {
    query = query.is("ic_avatar_url", null);
  }

  const { data: members, error: fetchErr } = await query;
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!members || members.length === 0) {
    return res.json({ total: 0, updated: 0, skipped: 0, failed: 0 });
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const m of members) {
    try {
      // Skip rows that already have a permanent Supabase URL (unless force)
      if (!force && m.ic_avatar_url && m.ic_avatar_url.includes("supabase.co/storage")) {
        skipped++;
        continue;
      }

      // Step 1: Get fresh CDN URL from Discovery API
      const cdnUrl = await getAvatarUrlFromDiscovery(m.creator_handle, m.platform, apiKey);
      if (!cdnUrl) {
        console.warn("[refresh]", m.creator_handle, "no avatar from Discovery API");
        skipped++;
        continue;
      }
      console.log("[refresh]", m.creator_handle, "got CDN URL:", cdnUrl.substring(0, 100));

      // Step 2: Fetch image bytes and upload to Supabase Storage
      const permanentUrl = await uploadImageToStorage(sb, m.creator_handle, cdnUrl);

      if (permanentUrl) {
        // Step 3a: Save permanent Supabase Storage URL
        console.log("[refresh]", m.creator_handle, "uploaded →", permanentUrl);
        const { error: upErr } = await sb
          .from("directory_members")
          .update({ ic_avatar_url: permanentUrl, avatar_url: permanentUrl })
          .eq("id", m.id);
        if (!upErr) updated++;
        else failed++;
      } else {
        // Step 3b: Upload failed — save the fresh CDN URL as fallback
        // (will work for ~24h, better than nothing)
        console.warn("[refresh]", m.creator_handle, "upload failed, saving CDN URL as fallback");
        const { error: upErr } = await sb
          .from("directory_members")
          .update({ ic_avatar_url: cdnUrl, avatar_url: cdnUrl })
          .eq("id", m.id);
        if (!upErr) updated++;
        else failed++;
      }
    } catch (err) {
      console.warn("[refresh-avatars]", m.creator_handle, "error:", err.message);
      failed++;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("[refresh-avatars]", force ? "FORCE" : "cron", "— updated:", updated, "skipped:", skipped, "failed:", failed, "of", members.length);
  return res.json({ total: members.length, updated, skipped, failed });
}
