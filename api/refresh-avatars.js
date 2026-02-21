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

async function fetchAvatarUrl(handle, platform, apiKey) {
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
 * POST /api/refresh-avatars
 * Body: { directory_id? } — optional, refreshes all if omitted.
 * Also triggered daily by Vercel cron (no body).
 */
export default async function handler(req, res) {
  // Accept GET (Vercel cron) and POST (manual refresh button)
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

  // Fetch members to refresh
  let query = sb.from("directory_members").select("id, creator_handle, platform, ic_avatar_url").eq("approved", true);

  const body = req.method === "GET" ? {} : (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {});
  if (body.directory_id) {
    query = query.eq("directory_id", body.directory_id);
  }

  const { data: members, error: fetchErr } = await query;
  if (fetchErr) {
    return res.status(500).json({ error: fetchErr.message });
  }
  if (!members || members.length === 0) {
    return res.json({ total: 0, updated: 0, failed: 0 });
  }

  let updated = 0;
  let failed = 0;

  for (const m of members) {
    try {
      const freshUrl = await fetchAvatarUrl(m.creator_handle, m.platform, apiKey);
      if (freshUrl) {
        const { error: upErr } = await sb
          .from("directory_members")
          .update({ ic_avatar_url: freshUrl, avatar_url: freshUrl })
          .eq("id", m.id);
        if (!upErr) updated++;
        else failed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
    // 300ms delay between API calls
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log("[refresh-avatars] Done:", updated, "updated,", failed, "failed of", members.length);
  return res.json({ total: members.length, updated, failed });
}
