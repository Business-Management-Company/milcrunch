const { createClient } = require("@supabase/supabase-js");

const config = { maxDuration: 300 };

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

/** Call IC Discovery API → return fresh CDN avatar URL string. */
async function getAvatarUrlFromDiscovery(handle, platform, apiKey) {
  const res = await fetch(DISCOVERY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      platform: platform || "instagram",
      filters: { username: handle.replace('@', '').toLowerCase().trim() },
      paging: { limit: 1, page: 1 },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const accounts = data.accounts;
  if (!Array.isArray(accounts) || accounts.length === 0) return null;
  const acc = accounts[0];
  const returnedUsername = (acc?.profile?.username || acc?.username || '').toLowerCase().trim();
  const expectedUsername = handle.toLowerCase().trim();
  if (returnedUsername && returnedUsername !== expectedUsername) {
    console.log(`[Avatar] Handle mismatch: expected ${expectedUsername}, got ${returnedUsername}`);
    return null;
  }
  return (
    extractAvatar(acc.profile) ||
    extractAvatar(acc.platformData) ||
    extractAvatar(acc) ||
    extractAvatar(acc.instagram) ||
    null
  );
}

/** Try to upload a CDN image to Supabase Storage via the upload endpoint.
 *  Returns permanent URL on success, null on failure. */
async function tryUploadToStorage(handle, cdnUrl, baseUrl) {
  try {
    const resp = await fetch(`${baseUrl}/api/upload-creator-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle, imageUrl: cdnUrl, updateDb: false, serverFetch: true }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.url || null;
  } catch {
    return null;
  }
}

/**
 * GET or POST /api/refresh-avatars
 *
 * - Skips creators that already have permanent Supabase Storage URLs.
 * - For others: gets fresh CDN URL from Discovery API, tries to upload
 *   to Supabase Storage for a permanent URL, falls back to saving the CDN URL.
 *
 * - Daily cron (GET): refreshes all approved members missing permanent avatars.
 * - Manual (POST { directory_id }): refreshes one directory.
 */
const handler = async function handler(req, res) {
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

  let query = sb.from("directory_members").select("id, creator_handle, platform, ic_avatar_url, avatar_url").eq("approved", true);
  if (body.directory_id) query = query.eq("directory_id", body.directory_id);

  const { data: members, error: fetchErr } = await query;
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!members || members.length === 0) {
    return res.json({ total: 0, updated: 0, failed: 0, skipped: 0 });
  }

  // Determine the base URL for calling the upload endpoint
  const baseUrl = req.headers["x-forwarded-host"]
    ? `https://${req.headers["x-forwarded-host"]}`
    : req.headers["host"]
      ? `https://${req.headers["host"]}`
      : "https://milcrunch.com";

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const m of members) {
    // Skip creators that already have permanent Supabase Storage URLs
    const currentUrl = m.ic_avatar_url || m.avatar_url || "";
    if (currentUrl.includes("supabase.co/storage")) {
      skipped++;
      continue;
    }

    try {
      const cleanHandle = (m.creator_handle || '').replace('@', '').toLowerCase().trim();
      if (!cleanHandle) { failed++; continue; }
      const cdnUrl = await getAvatarUrlFromDiscovery(cleanHandle, m.platform, apiKey);
      if (cdnUrl && cdnUrl.includes('saxoneldridge')) { failed++; continue; }
      if (cdnUrl) {
        // Try uploading to Storage for a permanent URL
        let finalUrl = cdnUrl;
        const permUrl = await tryUploadToStorage(m.creator_handle, cdnUrl, baseUrl);
        if (permUrl) finalUrl = permUrl;

        const { error: upErr } = await sb
          .from("directory_members")
          .update({ ic_avatar_url: finalUrl, avatar_url: finalUrl })
          .eq("id", m.id);
        if (!upErr) updated++;
        else failed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log("[refresh-avatars] updated:", updated, "skipped:", skipped, "failed:", failed, "of", members.length);
  return res.json({ total: members.length, updated, failed, skipped });
}

module.exports = handler;
module.exports.config = config;
