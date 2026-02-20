import { createClient } from "@supabase/supabase-js";

/**
 * One-time backfill: populate ic_avatar_url for all directory_members
 * where it's currently NULL, using the Influencers.club raw enrich API.
 *
 * POST /api/backfill-avatars  (no body needed)
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const icApiKey = process.env.VITE_INFLUENCERS_CLUB_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }
  if (!icApiKey) {
    return res.status(500).json({ error: "IC API key not configured" });
  }

  const sb = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch all directory_members with NULL ic_avatar_url
  const { data: members, error: fetchErr } = await sb
    .from("directory_members")
    .select("id, creator_handle, platform")
    .is("ic_avatar_url", null);

  if (fetchErr) {
    return res.status(500).json({ error: fetchErr.message });
  }
  if (!members || members.length === 0) {
    return res.json({ message: "No rows to backfill", updated: 0, total: 0 });
  }

  const IC_BASE = "https://api-dashboard.influencers.club";
  const results = [];
  let updated = 0;
  let failed = 0;

  for (const member of members) {
    const handle = member.creator_handle;
    const platform = member.platform || "instagram";
    const row = { handle, platform, avatar: null, error: null };

    try {
      // 2. Call IC raw enrich API
      const resp = await fetch(
        `${IC_BASE}/public/v1/creators/enrich/handle/raw/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${icApiKey}`,
          },
          body: JSON.stringify({
            handle,
            platform,
            include_lookalikes: false,
            email_required: "preferred",
          }),
        }
      );

      if (!resp.ok) {
        row.error = `HTTP ${resp.status}`;
        failed++;
        results.push(row);
        // Rate limit: wait a bit before continuing
        await sleep(500);
        continue;
      }

      const data = await resp.json();

      // 3. Extract avatar URL from response
      const avatarUrl = extractAvatar(data);
      if (!avatarUrl) {
        row.error = "no avatar found in response";
        failed++;
        results.push(row);
        await sleep(300);
        continue;
      }

      // 4. Force https
      const httpsUrl = avatarUrl.replace(/^http:\/\//i, "https://");
      row.avatar = httpsUrl;

      // 5. Update directory_members
      const { error: updateErr } = await sb
        .from("directory_members")
        .update({ ic_avatar_url: httpsUrl })
        .eq("id", member.id);

      if (updateErr) {
        row.error = `update failed: ${updateErr.message}`;
        failed++;
      } else {
        updated++;
      }
    } catch (err) {
      row.error = err.message || "unknown error";
      failed++;
    }

    results.push(row);

    // Rate limit: 300ms between requests
    await sleep(300);
  }

  return res.json({
    total: members.length,
    updated,
    failed,
    results,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract avatar URL from IC raw enrich response.
 * Checks multiple nesting levels: instagram.picture, result.instagram.*,
 * result.profile.*, top-level profile.*, top-level fields.
 */
function extractAvatar(data) {
  if (!data || typeof data !== "object") return null;

  const tryFields = (obj) => {
    if (!obj || typeof obj !== "object") return null;
    const url =
      obj.profile_picture_hd ||
      obj.profile_picture ||
      obj.picture ||
      obj.profile_pic_url ||
      obj.avatar ||
      obj.image_url ||
      null;
    if (url && typeof url === "string" && url.trim() && !url.includes("ui-avatars.com")) {
      return url;
    }
    // Check basicInfo.profilePicture
    if (obj.basicInfo && obj.basicInfo.profilePicture) {
      const bi = obj.basicInfo.profilePicture;
      if (typeof bi === "string" && bi.trim() && !bi.includes("ui-avatars.com")) return bi;
    }
    return null;
  };

  // 1. instagram level
  const ig = data.instagram;
  const igResult = tryFields(ig);
  if (igResult) return igResult;

  // 2. result.instagram
  const result = data.result;
  if (result && typeof result === "object") {
    const riResult = tryFields(result.instagram);
    if (riResult) return riResult;
    // result.profile
    const rpResult = tryFields(result.profile);
    if (rpResult) return rpResult;
    // result level
    const rlResult = tryFields(result);
    if (rlResult) return rlResult;
  }

  // 3. top-level profile
  const tpResult = tryFields(data.profile);
  if (tpResult) return tpResult;

  // 4. top-level fields directly
  return tryFields(data);
}
