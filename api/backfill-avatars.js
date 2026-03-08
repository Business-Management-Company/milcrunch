const { createClient } = require("@supabase/supabase-js");

/**
 * Backfill: refresh ic_avatar_url + banner_image_url for directory_members.
 * Calls IC raw enrich API for fresh signed URLs, then downloads
 * each image and uploads to Supabase Storage for permanent avatar_url.
 *
 * POST /api/backfill-avatars              — refresh ALL creators (calls IC API — costs credits)
 * POST /api/backfill-avatars?nullOnly=1   — only creators missing ic_avatar_url
 * POST /api/backfill-avatars?missingAvatars=1 — only rows where BOTH avatar_url AND ic_avatar_url are NULL (and creator_handle is set)
 * POST /api/backfill-avatars?fromCache=1  — extract avatars from existing enrichment_data/creator_enrichment_cache (ZERO API credits)
 * POST /api/backfill-avatars?debug=1      — return current avatar state
 */
const config = { maxDuration: 300 };

const handler = async function handler(req, res) {
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
  const nullOnly = req.query?.nullOnly === "1" || (req.body && req.body.nullOnly);
  const missingAvatars = req.query?.missingAvatars === "1" || (req.body && req.body.missingAvatars);
  const fromCache = req.query?.fromCache === "1" || (req.body && req.body.fromCache);
  const targetHandles = req.body?.handles; // optional: array of specific handles to process

  // ── fromCache mode: extract avatars from existing enrichment_data (ZERO credits) ──
  if (fromCache) {
    return handleFromCache(sb, res);
  }

  // Debug mode: return current avatar state
  if (req.query?.debug === "1" || (req.body && req.body.debug)) {
    const { data: all, error } = await sb
      .from("directory_members")
      .select("id, creator_handle, platform, ic_avatar_url, avatar_url, banner_image_url")
      .limit(100);
    return res.json({
      rows: (all || []).map((r) => ({
        handle: r.creator_handle,
        ic_avatar_url: r.ic_avatar_url || null,
        avatar_url: r.avatar_url || null,
        banner_image_url: r.banner_image_url || null,
      })),
      error: error?.message,
    });
  }

  // Ensure creator-avatars bucket exists (idempotent)
  await sb.storage.createBucket("creator-avatars", { public: true }).catch(() => {});

  // Fetch directory_members to process
  let query = sb
    .from("directory_members")
    .select("id, creator_handle, platform, ic_avatar_url, avatar_url, banner_image_url");

  if (Array.isArray(targetHandles) && targetHandles.length > 0) {
    // Targeted mode: process only specific handles (force re-enrich)
    query = query.in("creator_handle", targetHandles.map(h => h.toLowerCase()));
  } else if (missingAvatars) {
    // Only rows where BOTH avatar fields are NULL and creator_handle is set
    query = query
      .is("avatar_url", null)
      .is("ic_avatar_url", null)
      .not("creator_handle", "is", null);
  } else if (nullOnly) {
    // Only fetch records missing avatar or banner
    query = query.or("ic_avatar_url.is.null,banner_image_url.is.null");
  }

  const { data: members, error: fetchErr } = await query;

  if (fetchErr) {
    return res.status(500).json({ error: fetchErr.message });
  }
  if (!members || members.length === 0) {
    return res.json({ message: "No creators to process", updated: 0, total: 0 });
  }

  const IC_BASE = "https://api-dashboard.influencers.club";
  const results = [];
  let updated = 0;
  let failed = 0;
  let permanentUploads = 0;
  let bannersFound = 0;

  for (const member of members) {
    const handle = member.creator_handle;
    const platform = member.platform || "instagram";
    const row = { handle, ic_avatar: null, permanent: null, banner: null, error: null };

    // Skip if already has permanent avatar AND banner (when nullOnly)
    const hasPermanent = member.ic_avatar_url && member.ic_avatar_url.includes("supabase.co/storage");
    const hasBanner = !!member.banner_image_url;
    if (nullOnly && !missingAvatars && hasPermanent && hasBanner) {
      results.push({ ...row, error: "already complete — skipped" });
      continue;
    }
    // missingAvatars mode: pre-filter ensures both are null, no skip needed

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
      const bannerUrl = extractBanner(data);

      if (bannerUrl) {
        row.banner = bannerUrl.substring(0, 100);
        bannersFound++;
      }

      if (!freshUrl && !bannerUrl) {
        row.error = "no avatar or banner in IC response";
        failed++;
        results.push(row);
        await sleep(300);
        continue;
      }

      // 2. Download avatar and upload to Supabase Storage for permanent URL
      let permanentUrl = null;
      if (freshUrl && !hasPermanent) {
        const httpsUrl = freshUrl.replace(/^http:\/\//i, "https://");
        row.ic_avatar = httpsUrl.substring(0, 100);

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
            const safeName = handle.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
            const path = `${safeName}/avatar.jpg`;

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
      }

      // 3. Update directory_members
      const updatePayload = {};
      if (freshUrl) {
        const finalUrl = permanentUrl || freshUrl.replace(/^http:\/\//i, "https://");
        updatePayload.ic_avatar_url = finalUrl;
        updatePayload.avatar_url = finalUrl;
      }
      if (bannerUrl && !hasBanner) {
        updatePayload.banner_image_url = bannerUrl;
      }

      if (Object.keys(updatePayload).length > 0) {
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
      } else {
        row.error = "nothing to update";
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
    bannersFound,
    results,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fromCache mode: backfill avatar_url from existing enrichment_data in
 * directory_members and creator_enrichment_cache — zero IC API calls.
 */
async function handleFromCache(sb, res) {
  // 1. Find directory_members missing avatar_url
  const { data: members, error: fetchErr } = await sb
    .from("directory_members")
    .select("id, creator_handle, platform, avatar_url, ic_avatar_url, enrichment_data")
    .or("avatar_url.is.null,avatar_url.eq.");

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!members || members.length === 0) {
    return res.json({ message: "All directory_members already have avatar_url", updated: 0, total: 0 });
  }

  // Ensure creator-avatars bucket exists
  await sb.storage.createBucket("creator-avatars", { public: true }).catch(() => {});

  let updated = 0;
  let failed = 0;
  let fromEnrichment = 0;
  let fromCacheTable = 0;
  const results = [];

  for (const m of members) {
    const row = { handle: m.creator_handle, source: null, avatar: null, error: null };

    // Try 1: extract from directory_members.enrichment_data
    let avatarUrl = m.enrichment_data ? extractAvatar(m.enrichment_data) : null;
    if (avatarUrl) {
      row.source = "enrichment_data";
      fromEnrichment++;
    }

    // Try 2: fall back to creator_enrichment_cache
    if (!avatarUrl && m.creator_handle) {
      const { data: cached } = await sb
        .from("creator_enrichment_cache")
        .select("enrichment_data")
        .eq("username", m.creator_handle.toLowerCase())
        .limit(1)
        .maybeSingle();
      if (cached?.enrichment_data) {
        avatarUrl = extractAvatar(cached.enrichment_data);
        if (avatarUrl) {
          row.source = "creator_enrichment_cache";
          fromCacheTable++;
        }
      }
    }

    if (!avatarUrl) {
      row.error = "no avatar in enrichment data or cache";
      failed++;
      results.push(row);
      continue;
    }

    // Download and upload to Supabase Storage for permanent URL
    let permanentUrl = null;
    const httpsUrl = avatarUrl.replace(/^http:\/\//i, "https://");

    // Skip download if it's already a Supabase Storage URL
    if (httpsUrl.includes("supabase.co/storage")) {
      permanentUrl = httpsUrl;
    } else {
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
          const safeName = m.creator_handle.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
          const path = `${safeName}/avatar.jpg`;
          const { error: uploadErr } = await sb.storage
            .from("creator-avatars")
            .upload(path, buffer, { contentType, upsert: true });
          if (!uploadErr) {
            const { data: urlData } = sb.storage.from("creator-avatars").getPublicUrl(path);
            permanentUrl = urlData.publicUrl;
          } else {
            row.error = `upload: ${uploadErr.message}`;
          }
        } else {
          // Image expired but we still have the URL — save it as-is
          permanentUrl = httpsUrl;
          row.error = `img fetch ${imgResp.status}, using URL as-is`;
        }
      } catch (imgErr) {
        permanentUrl = httpsUrl;
        row.error = `img fetch failed: ${imgErr.message}, using URL as-is`;
      }
    }

    const finalUrl = permanentUrl || httpsUrl;
    row.avatar = finalUrl.substring(0, 120);

    const { error: updateErr } = await sb
      .from("directory_members")
      .update({ avatar_url: finalUrl, ic_avatar_url: finalUrl })
      .eq("id", m.id);

    if (updateErr) {
      row.error = `db update: ${updateErr.message}`;
      failed++;
    } else {
      updated++;
    }

    results.push(row);
    await sleep(200);
  }

  return res.json({
    mode: "fromCache",
    message: "Backfilled avatar_url from cached enrichment data (zero IC API credits used)",
    total: members.length,
    updated,
    failed,
    fromEnrichment,
    fromCacheTable,
    results,
  });
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
    const ri = tryFields(result.instagram);
    if (ri) return ri;
    const rp = tryFields(result.profile);
    if (rp) return rp;
    const rl = tryFields(result);
    if (rl) return rl;
  }

  const tp = tryFields(data.profile);
  if (tp) return tp;

  return tryFields(data);
}

/** Extract banner/cover image from enrichment data or first post thumbnail. */
function extractBanner(data) {
  if (!data || typeof data !== "object") return null;
  const ig = data.instagram || (data.result && data.result.instagram) || data.result || data;

  // Check explicit cover/banner fields
  for (const key of ["cover_photo", "profile_cover", "banner_url", "cover_image"]) {
    if (ig[key] && typeof ig[key] === "string") {
      return ig[key].replace(/^http:\/\//i, "https://");
    }
  }

  // Fallback: first post thumbnail
  const posts = ig.post_data || ig.posts || ig.recent_posts;
  if (!Array.isArray(posts) || posts.length === 0) return null;

  for (const post of posts.slice(0, 6)) {
    const media = post.media;
    if (Array.isArray(media) && media.length > 0) {
      const m = media[0];
      if (m.url && typeof m.url === "string") return m.url.replace(/^http:\/\//i, "https://");
    }
    if (post.thumbnail && typeof post.thumbnail === "string")
      return post.thumbnail.replace(/^http:\/\//i, "https://");
    if (post.image_url && typeof post.image_url === "string")
      return post.image_url.replace(/^http:\/\//i, "https://");
  }

  return null;
}

module.exports = handler;
module.exports.config = config;
