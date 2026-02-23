import { createClient } from "@supabase/supabase-js";

export const config = { maxDuration: 300 };

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

async function getFreshAvatarUrl(handle, platform, apiKey) {
  const res = await fetch(DISCOVERY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      platform: platform || "instagram",
      filters: { username: handle.replace("@", "").toLowerCase().trim() },
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

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const apiKey = process.env.INFLUENCERS_CLUB_API_KEY || process.env.VITE_INFLUENCERS_CLUB_API_KEY;

  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: "Supabase not configured" });
  if (!apiKey) return res.status(500).json({ error: "IC API key not configured" });

  const sb = createClient(supabaseUrl, supabaseKey);
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 1000;
  const dryRun = req.query.dry === "true";

  const { data: creators, error: fetchErr } = await sb
    .from("directory_members")
    .select("id, creator_handle, platform, ic_avatar_url")
    .like("ic_avatar_url", "%d32n50yyqb954y.cloudfront.net%")
    .limit(limit);

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!creators || creators.length === 0) {
    return res.json({ message: "No CloudFront avatars remaining.", total: 0 });
  }

  if (dryRun) {
    return res.json({ message: "Dry run", total: creators.length, handles: creators.map(c => c.creator_handle) });
  }

  const baseUrl = req.headers["x-forwarded-host"]
    ? `https://${req.headers["x-forwarded-host"]}`
    : req.headers["host"]
      ? `https://${req.headers["host"]}`
      : "https://milcrunch.com";

  const results = [];
  let migrated = 0;
  let failed = 0;

  for (const creator of creators) {
    const handle = (creator.creator_handle || "").replace("@", "").toLowerCase().trim();
    if (!handle) { results.push({ handle, status: "skipped", reason: "no handle" }); failed++; continue; }

    try {
      // 1. Get fresh CDN avatar from IC Discovery API
      const freshUrl = await getFreshAvatarUrl(handle, creator.platform, apiKey);
      if (!freshUrl) {
        results.push({ handle, status: "failed", reason: "no avatar from IC API" });
        failed++;
        await sleep(300);
        continue;
      }

      // 2. Upload to Supabase Storage via save-avatar endpoint
      const saveRes = await fetch(`${baseUrl}/api/save-avatar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: freshUrl, handle }),
      });

      if (!saveRes.ok) {
        const errBody = await saveRes.text();
        results.push({ handle, status: "failed", reason: `save-avatar ${saveRes.status}: ${errBody.substring(0, 100)}` });
        failed++;
        await sleep(300);
        continue;
      }

      const { url: permanentUrl } = await saveRes.json();
      results.push({ handle, status: "migrated", url: permanentUrl });
      migrated++;
    } catch (err) {
      results.push({ handle, status: "failed", reason: err.message });
      failed++;
    }

    await sleep(300);
  }

  return res.json({
    message: `Done: ${migrated} migrated, ${failed} failed of ${creators.length}`,
    total: creators.length,
    migrated,
    failed,
    results,
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
