import { createClient } from "@supabase/supabase-js";

/**
 * Backfill: refresh ic_avatar_url for all directory_members.
 * Calls IC raw enrich API for fresh signed URLs, then downloads
 * each image and uploads to Supabase Storage for permanent avatar_url.
 *
 * POST /api/backfill-avatars           — refresh all creators
 * POST /api/backfill-avatars?debug=1   — return current avatar state
 */
export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const icApiKey =
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "") ||
    (req.body && req.body.ic_api_key) ||
    process.env.VITE_INFLUENCERS_CLUB_API_KEY ||
    process.env.INFLUENCERS_CLUB_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }
  if (!icApiKey) {
    return res.status(500).json({ error: "IC API key not configured" });
  }

  const sb = createClient(supabaseUrl, supabaseKey);

  // Debug mode: return current avatar state
  if (req.query?.debug === "1" || (req.body && req.body.debug)) {
    const { data: all, error } = await sb
      .from("directory_members")
      .select("id, creator_handle, platform, ic_avatar_url, avatar_url")
      .limit(50);
    return res.json({
      rows: (all || []).map((r) => ({
        handle: r.creator_handle,
        ic_avatar_url: r.ic_avatar_url || null,
        avatar_url: r.avatar_url || null,
      })),
      error: error?.message,
    });
  }

  // Ensure creator-avatars bucket exists (idempotent)
  await sb.storage.createBucket("creator-avatars", { public: true }).catch(() => {});

  // Fetch ALL directory_members (refresh all avatars since signed URLs expire)
  const { data: members, error: fetchErr } = await sb
    .from("directory_members")
    .select("id, creator_handle, platform");

  if (fetchErr) {
    return res.status(500).json({ error: fetchErr.message });
  }
  if (!members || members.length === 0) {
    return res.json({ message: "No creators found", updated: 0, total: 0 });
  }

  const IC_BASE = "https://api-dashboard.influencers.club";
  const results = [];
  let updated = 0;
  let failed = 0;
  let permanentUploads = 0;

  for (const member of members) {
    const handle = member.creator_handle;
    const platform = member.platform || "instagram";
    const row = { handle, ic_avatar: null, permanent: null, error: null };

    try {
      // 1. Call IC raw enrich API for fresh signed URL
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
        row.error = `IC API HTTP ${resp.status}`;
        failed++;
        results.push(row);
        await sleep(500);
        continue;
      }

      const data = await resp.json();
      const freshUrl = extractAvatar(data);

      if (!freshUrl) {
        row.error = "no avatar in IC response";
        failed++;
        results.push(row);
        await sleep(300);
        continue;
      }

      const httpsUrl = freshUrl.replace(/^http:\/\//i, "https://");
      row.ic_avatar = httpsUrl.substring(0, 100);

      // 2. Download image and upload to Supabase Storage for permanent URL
      let permanentUrl = null;
      try {
        const imgResp = await fetch(httpsUrl, {
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; MilCrunch/1.0)",
            Accept: "image/*,*/*",
          },
        });

        if (imgResp.ok) {
          const buffer = Buffer.from(await imgResp.arrayBuffer());
          const contentType = imgResp.headers.get("content-type") || "image/jpeg";
          const ext = contentType.includes("png")
            ? "png"
            : contentType.includes("webp")
              ? "webp"
              : "jpg";
          const safeName = handle.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
          const path = `${safeName}.${ext}`;

          const { error: uploadErr } = await sb.storage
            .from("creator-avatars")
            .upload(path, buffer, { contentType, upsert: true });

          if (!uploadErr) {
            const { data: urlData } = sb.storage
              .from("creator-avatars")
              .getPublicUrl(path);
            permanentUrl = urlData.publicUrl;
            row.permanent = permanentUrl;
            permanentUploads++;
          } else {
            row.error = `upload: ${uploadErr.message}`;
          }
        } else {
          row.error = `img fetch: ${imgResp.status}`;
        }
      } catch (imgErr) {
        row.error = `img: ${imgErr.message}`;
      }

      // 3. Update directory_members — prefer permanent URL for both columns
      const finalUrl = permanentUrl || httpsUrl;
      const updatePayload = { ic_avatar_url: finalUrl, avatar_url: finalUrl };

      const { error: updateErr } = await sb
        .from("directory_members")
        .update(updatePayload)
        .eq("id", member.id);

      if (updateErr) {
        row.error = `db update: ${updateErr.message}`;
        failed++;
      } else {
        updated++;
      }
    } catch (err) {
      row.error = err.message || "unknown error";
      failed++;
    }

    results.push(row);
    await sleep(300);
  }

  return res.json({
    total: members.length,
    updated,
    failed,
    permanentUploads,
    results,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    if (obj.basicInfo && obj.basicInfo.profilePicture) {
      const bi = obj.basicInfo.profilePicture;
      if (typeof bi === "string" && bi.trim() && !bi.includes("ui-avatars.com")) return bi;
    }
    return null;
  };

  const ig = data.instagram;
  const igResult = tryFields(ig);
  if (igResult) return igResult;

  const result = data.result;
  if (result && typeof result === "object") {
    const riResult = tryFields(result.instagram);
    if (riResult) return riResult;
    const rpResult = tryFields(result.profile);
    if (rpResult) return rpResult;
    const rlResult = tryFields(result);
    if (rlResult) return rlResult;
  }

  const tpResult = tryFields(data.profile);
  if (tpResult) return tpResult;

  return tryFields(data);
}
