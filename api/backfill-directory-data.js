import { createClient } from "@supabase/supabase-js";

/**
 * Backfill missing bio, category, and platform_urls on directory_members
 * from creator_enrichment_cache. Zero IC API credits — reads cached data only.
 *
 * POST /api/backfill-directory-data           — backfill all rows with missing data
 * POST /api/backfill-directory-data?debug=1   — dry run: show what would be updated
 */
export const config = { maxDuration: 120 };

const PLATFORM_ORDER = ["instagram", "tiktok", "youtube", "facebook", "twitter"];

function extractPlatforms(enrichmentData) {
  if (!enrichmentData || typeof enrichmentData !== "object") return { platforms: [], platformUrls: {} };
  const result = enrichmentData.result ?? enrichmentData;
  const platforms = [];
  const platformUrls = {};

  const urlBuilders = {
    instagram: (u) => `https://instagram.com/${u}`,
    tiktok: (u) => `https://tiktok.com/@${u}`,
    youtube: (u) => `https://youtube.com/@${u}`,
    facebook: (u) => `https://facebook.com/${u}`,
    twitter: (u) => `https://x.com/${u}`,
  };

  for (const key of PLATFORM_ORDER) {
    const pd = result[key];
    if (!pd || typeof pd !== "object") continue;
    const username = pd.username ?? pd.handle;
    if (!username || typeof username !== "string" || !username.trim()) continue;
    const clean = username.replace(/^@/, "").trim();
    const url = (typeof pd.url === "string" && pd.url.trim()) ? pd.url : (urlBuilders[key] ? urlBuilders[key](clean) : `https://${key}.com/${clean}`);
    platforms.push(key);
    platformUrls[key] = url;
  }
  return { platforms, platformUrls };
}

function extractBio(enrichmentData) {
  if (!enrichmentData || typeof enrichmentData !== "object") return null;
  const result = enrichmentData.result ?? enrichmentData;
  const ig = result.instagram;
  if (ig && typeof ig === "object" && ig.biography) return ig.biography;
  const tt = result.tiktok;
  if (tt && typeof tt === "object" && (tt.bio || tt.biography)) return tt.bio || tt.biography;
  const yt = result.youtube;
  if (yt && typeof yt === "object" && yt.description) return yt.description;
  return null;
}

function extractCategory(enrichmentData) {
  if (!enrichmentData || typeof enrichmentData !== "object") return null;
  const result = enrichmentData.result ?? enrichmentData;
  const ig = result.instagram;
  if (ig && typeof ig === "object") {
    return ig.category || ig.category_name || null;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const sb = createClient(supabaseUrl, supabaseKey);
  const debug = req.query?.debug === "1" || (req.body && req.body.debug);

  // Fetch directory_members with missing data
  const { data: members, error: fetchErr } = await sb
    .from("directory_members")
    .select("id, creator_handle, bio, category, platforms, platform_urls, enrichment_data")
    .not("creator_handle", "is", null);

  if (fetchErr) {
    return res.status(500).json({ error: fetchErr.message });
  }

  // Filter to rows that need backfill
  const needsBackfill = (members || []).filter((m) => {
    const missingBio = !m.bio;
    const missingCategory = !m.category;
    const emptyPlatformUrls = !m.platform_urls || Object.keys(m.platform_urls).length === 0;
    return missingBio || missingCategory || emptyPlatformUrls;
  });

  if (needsBackfill.length === 0) {
    return res.json({ message: "All directory_members already have complete data", total: (members || []).length, updated: 0 });
  }

  // Batch-fetch enrichment cache for all handles
  const handles = needsBackfill.map((m) => m.creator_handle.toLowerCase());
  const { data: cacheRows } = await sb
    .from("creator_enrichment_cache")
    .select("username, enrichment_data")
    .in("username", handles);

  const cacheMap = new Map();
  for (const row of cacheRows || []) {
    cacheMap.set(row.username, row.enrichment_data);
  }

  let updated = 0;
  let skipped = 0;
  const details = [];

  for (const member of needsBackfill) {
    const handle = member.creator_handle;
    // Try enrichment cache first, fall back to member's own enrichment_data
    const enrichData = cacheMap.get(handle.toLowerCase()) || member.enrichment_data;
    if (!enrichData) {
      skipped++;
      if (debug) details.push({ handle, status: "skipped — no enrichment data" });
      continue;
    }

    const updates = {};
    const changes = [];

    // Bio
    if (!member.bio) {
      const bio = extractBio(enrichData);
      if (bio) {
        updates.bio = bio;
        changes.push("bio");
      }
    }

    // Category
    if (!member.category) {
      const category = extractCategory(enrichData);
      if (category) {
        updates.category = category;
        changes.push("category");
      }
    }

    // Platform URLs
    if (!member.platform_urls || Object.keys(member.platform_urls).length === 0) {
      const { platforms, platformUrls } = extractPlatforms(enrichData);
      if (platforms.length > 0) {
        updates.platform_urls = platformUrls;
        updates.platforms = platforms;
        changes.push(`platforms(${platforms.join(",")})`);
      }
    }

    if (Object.keys(updates).length === 0) {
      skipped++;
      if (debug) details.push({ handle, status: "skipped — no extractable data" });
      continue;
    }

    if (debug) {
      details.push({ handle, wouldUpdate: changes });
      updated++;
      continue;
    }

    const { error: updateErr } = await sb
      .from("directory_members")
      .update(updates)
      .eq("id", member.id);

    if (updateErr) {
      details.push({ handle, error: updateErr.message });
    } else {
      updated++;
      details.push({ handle, updated: changes });
    }
  }

  return res.json({
    mode: debug ? "dry_run" : "applied",
    total: (members || []).length,
    needsBackfill: needsBackfill.length,
    updated,
    skipped,
    details: details.slice(0, 50),
  });
}
