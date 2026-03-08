const { createClient } = require("@supabase/supabase-js");

const config = { maxDuration: 300 };

/**
 * POST /api/fix-avatars
 * Body: { handles: ["spouse.ly", ...] }
 *   or: { scan: true }              — scan + fix
 *   or: { scan: true, scanOnly: true } — audit only
 *
 * Optional: { table: "featured_creators" } — default is "directory_members"
 *
 * For each handle:
 *  1. Try IC Discovery API for a fresh avatar URL
 *  2. Download it, reject if too small (< 5 KB = placeholder)
 *  3. If IC fails or returns placeholder, try Instagram CDN directly
 *  4. Upload valid image to Supabase Storage, update DB
 */

const DISCOVERY_URL = "https://api-dashboard.influencers.club/public/v1/discovery/";
const ENRICH_URL = "https://api-dashboard.influencers.club/public/v1/creators/enrich/handle/raw/";
const MIN_AVATAR_BYTES = 5000; // IC placeholder is ~2556 bytes
const BUCKET = "creator-images";

/** Table-specific column mappings */
const TABLE_CONFIG = {
  directory_members: {
    handleCol: "creator_handle",
    avatarCols: ["avatar_url", "ic_avatar_url"],
    selectCols: "creator_handle, avatar_url, ic_avatar_url",
    updatePayload: (url) => ({ avatar_url: url, ic_avatar_url: url }),
  },
  featured_creators: {
    handleCol: "handle",
    avatarCols: ["avatar_url"],
    selectCols: "handle, avatar_url",
    updatePayload: (url) => ({ avatar_url: url }),
  },
};

const AVATAR_FIELDS = [
  "profile_picture_hd", "profile_picture", "picture",
  "profile_pic_url_hd", "profile_pic_url", "avatar",
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
  if (obj.basicInfo?.profilePicture) {
    const pp = obj.basicInfo.profilePicture;
    if (typeof pp === "string" && pp.trim() && !pp.includes("ui-avatars.com")) return pp;
  }
  return null;
}

/** Try IC Discovery API for a fresh avatar URL. */
async function tryDiscovery(handle, apiKey) {
  try {
    const res = await fetch(DISCOVERY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        platform: "instagram",
        filters: { username: handle },
        paging: { limit: 1, page: 1 },
      }),
    });
    if (!res.ok) return { url: null, reason: `Discovery HTTP ${res.status}` };
    const data = await res.json();
    const accounts = data.accounts;
    if (!Array.isArray(accounts) || accounts.length === 0) return { url: null, reason: "not found in Discovery" };
    const acc = accounts[0];
    const url = extractAvatar(acc.profile) || extractAvatar(acc.platformData) || extractAvatar(acc) || extractAvatar(acc.instagram);
    return { url, reason: url ? null : "no avatar fields in Discovery response" };
  } catch (e) {
    return { url: null, reason: `Discovery error: ${e.message}` };
  }
}

/** Try IC Raw Enrich API — more expensive but returns richer data. */
async function tryEnrich(handle, apiKey) {
  try {
    const res = await fetch(ENRICH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ handle, platform: "instagram", include_lookalikes: false, email_required: "preferred" }),
    });
    if (!res.ok) return { url: null, reason: `Enrich HTTP ${res.status}` };
    const data = await res.json();
    // Deep search through nested response
    const candidates = [data, data.result, data.instagram, data.result?.instagram, data.result?.profile, data.profile];
    for (const obj of candidates) {
      const url = extractAvatar(obj);
      if (url) return { url, reason: null };
    }
    return { url: null, reason: "no avatar in Enrich response" };
  } catch (e) {
    return { url: null, reason: `Enrich error: ${e.message}` };
  }
}

/** Download image, validate it's a real photo (not a tiny placeholder). Returns buffer or null. */
async function downloadAndValidate(url) {
  const resp = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "image/*,*/*",
    },
  });
  if (!resp.ok) return { buffer: null, reason: `HTTP ${resp.status}` };
  const buffer = Buffer.from(await resp.arrayBuffer());
  if (buffer.length < MIN_AVATAR_BYTES) {
    return { buffer: null, reason: `too small (${buffer.length} bytes — likely placeholder)` };
  }
  const head = buffer.slice(0, 200).toString("utf8").toLowerCase();
  if (head.includes("<!doctype") || head.includes("<html")) {
    return { buffer: null, reason: "HTML response, not image" };
  }
  return { buffer, contentType: resp.headers.get("content-type") || "image/jpeg" };
}

/** Scan a table for broken avatar URLs. Returns { broken, details } arrays. */
async function scanTable(sb, tableName, cfg) {
  const { data: allRows, error: scanErr } = await sb
    .from(tableName)
    .select(cfg.selectCols);
  if (scanErr) throw new Error(scanErr.message);

  const broken = [];
  const details = [];

  for (const row of allRows || []) {
    const handle = row[cfg.handleCol];
    // Collect all avatar URLs from the configured columns
    const urls = cfg.avatarCols.map((col) => row[col] || "");
    const anyUrl = urls.find((u) => u) || "";
    const hasBadDomain = urls.some((u) => u.includes("cloudfront") || u.includes("ui-avatars"));
    const empty = !anyUrl;

    if (hasBadDomain || empty) {
      broken.push(handle);
      details.push({ handle, reason: empty ? "no URL" : "bad domain" });
      continue;
    }

    // URL looks like Supabase — verify the image actually exists and is real
    if (anyUrl.includes("supabase.co/storage/")) {
      try {
        const head = await fetch(anyUrl, { method: "HEAD" });
        const size = parseInt(head.headers.get("content-length") || "0", 10);
        const ct = (head.headers.get("content-type") || "").toLowerCase();
        if (!head.ok) {
          broken.push(handle);
          details.push({ handle, reason: `HTTP ${head.status}` });
        } else if (size < MIN_AVATAR_BYTES) {
          broken.push(handle);
          details.push({ handle, reason: `${size} bytes (placeholder)` });
        } else if (ct && !ct.startsWith("image/") && !ct.includes("octet-stream")) {
          broken.push(handle);
          details.push({ handle, reason: `bad content-type: ${ct}` });
        }
      } catch (e) {
        broken.push(handle);
        details.push({ handle, reason: `fetch error: ${e.message}` });
      }
    } else {
      // Non-Supabase, non-bad-domain URL — still needs migration
      broken.push(handle);
      details.push({ handle, reason: "not in Supabase Storage" });
    }
  }

  return { total: (allRows || []).length, broken, details };
}

const handler = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.INFLUENCERS_CLUB_API_KEY || process.env.VITE_INFLUENCERS_CLUB_API_KEY;

  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: "Supabase not configured" });
  if (!apiKey) return res.status(500).json({ error: "IC API key not configured" });

  const sb = createClient(supabaseUrl, supabaseKey);

  // Determine which table(s) to operate on
  const tableName = body.table || "directory_members";
  const isAll = tableName === "all";
  const cfg = isAll ? TABLE_CONFIG.directory_members : TABLE_CONFIG[tableName];
  if (!cfg && !isAll) return res.status(400).json({ error: `Unknown table: ${tableName}. Use "directory_members", "featured_creators", or "all"` });

  // scan=true mode: find all broken avatars and optionally fix them
  if (body.scan) {
    try {
      // Support scanning both tables at once
      if (body.table === "all") {
        const dmResult = await scanTable(sb, "directory_members", TABLE_CONFIG.directory_members);
        const fcResult = await scanTable(sb, "featured_creators", TABLE_CONFIG.featured_creators);

        if (body.scanOnly) {
          return res.json({
            directory_members: { total: dmResult.total, broken: dmResult.broken.length, handles: dmResult.broken, details: dmResult.details },
            featured_creators: { total: fcResult.total, broken: fcResult.broken.length, handles: fcResult.broken, details: fcResult.details },
          });
        }

        // Combine broken handles (dedup)
        const allBroken = [...new Set([...dmResult.broken, ...fcResult.broken])];
        if (allBroken.length === 0) {
          return res.json({ message: "All avatars are healthy across both tables" });
        }
        // Fix mode: update both tables (handled in step 4 below)
        body.handles = allBroken;
        body._fixBothTables = true;
      } else {
        const result = await scanTable(sb, tableName, cfg);

        if (body.scanOnly) {
          return res.json({ table: tableName, total: result.total, broken: result.broken.length, handles: result.broken, details: result.details });
        }

        if (result.broken.length === 0) {
          return res.json({ message: `All avatars healthy in ${tableName}`, table: tableName, total: result.total, broken: 0 });
        }

        body.handles = result.broken;
      }
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  const handles = body.handles;
  if (!Array.isArray(handles) || handles.length === 0) {
    return res.status(400).json({ error: 'Provide { handles: [...] } or { scan: true }. Optional: { table: "featured_creators" | "all" }' });
  }

  const results = [];

  for (const rawHandle of handles) {
    const handle = rawHandle.replace("@", "").toLowerCase().trim();
    const log = { handle, steps: [], status: "pending", finalUrl: null };

    try {
      // Step 1: Try IC Discovery API
      log.steps.push("Trying IC Discovery...");
      const disc = await tryDiscovery(handle, apiKey);

      if (disc.url) {
        log.steps.push(`Discovery returned URL: ${disc.url.substring(0, 80)}...`);
        const dl = await downloadAndValidate(disc.url);
        if (dl.buffer) {
          log.steps.push(`Downloaded ${dl.buffer.length} bytes — valid image`);
          const path = `avatars/${handle}.jpg`;
          const { error: upErr } = await sb.storage.from(BUCKET).upload(path, dl.buffer, { contentType: "image/jpeg", upsert: true });
          if (upErr) {
            log.steps.push(`Upload error: ${upErr.message}`);
          } else {
            const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(path);
            log.finalUrl = publicUrl;
            log.steps.push(`Uploaded → ${publicUrl}`);
          }
        } else {
          log.steps.push(`Discovery image rejected: ${dl.reason}`);
        }
      } else {
        log.steps.push(`Discovery failed: ${disc.reason}`);
      }

      // Step 2: If Discovery didn't work, try IC Raw Enrich
      if (!log.finalUrl) {
        log.steps.push("Trying IC Raw Enrich...");
        const enr = await tryEnrich(handle, apiKey);
        if (enr.url) {
          log.steps.push(`Enrich returned URL: ${enr.url.substring(0, 80)}...`);
          const dl = await downloadAndValidate(enr.url);
          if (dl.buffer) {
            log.steps.push(`Downloaded ${dl.buffer.length} bytes — valid image`);
            const path = `avatars/${handle}.jpg`;
            const { error: upErr } = await sb.storage.from(BUCKET).upload(path, dl.buffer, { contentType: "image/jpeg", upsert: true });
            if (upErr) {
              log.steps.push(`Upload error: ${upErr.message}`);
            } else {
              const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(path);
              log.finalUrl = publicUrl;
              log.steps.push(`Uploaded → ${publicUrl}`);
            }
          } else {
            log.steps.push(`Enrich image rejected: ${dl.reason}`);
          }
        } else {
          log.steps.push(`Enrich failed: ${enr.reason}`);
        }
      }

      // Step 3: If both IC methods failed, try Instagram CDN directly
      if (!log.finalUrl) {
        log.steps.push("Trying Instagram CDN directly...");
        const igUrl = `https://www.instagram.com/${handle}/?__a=1&__d=dis`;
        try {
          const igResp = await fetch(igUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            redirect: "follow",
          });
          if (igResp.ok) {
            const html = await igResp.text();
            const ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/);
            const picMatch = html.match(/"profile_pic_url_hd"\s*:\s*"([^"]+)"/) || html.match(/"profile_pic_url"\s*:\s*"([^"]+)"/);
            const extractedUrl = (picMatch?.[1] || ogMatch?.[1] || "").replace(/\\u0026/g, "&");
            if (extractedUrl && extractedUrl.startsWith("http")) {
              log.steps.push(`Instagram page returned avatar: ${extractedUrl.substring(0, 80)}...`);
              const dl = await downloadAndValidate(extractedUrl);
              if (dl.buffer) {
                const path = `avatars/${handle}.jpg`;
                const { error: upErr } = await sb.storage.from(BUCKET).upload(path, dl.buffer, { contentType: "image/jpeg", upsert: true });
                if (!upErr) {
                  const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(path);
                  log.finalUrl = publicUrl;
                  log.steps.push(`Uploaded → ${publicUrl}`);
                } else {
                  log.steps.push(`Upload error: ${upErr.message}`);
                }
              } else {
                log.steps.push(`Instagram image rejected: ${dl.reason}`);
              }
            } else {
              log.steps.push("No avatar URL found in Instagram page");
            }
          } else {
            log.steps.push(`Instagram returned ${igResp.status}`);
          }
        } catch (igErr) {
          log.steps.push(`Instagram fetch error: ${igErr.message}`);
        }
      }

      // Step 4: Update database if we got a valid image
      if (log.finalUrl) {
        const tablesToUpdate = body._fixBothTables
          ? ["directory_members", "featured_creators"]
          : [tableName];

        for (const tbl of tablesToUpdate) {
          const tCfg = TABLE_CONFIG[tbl];
          const { error: dbErr } = await sb
            .from(tbl)
            .update(tCfg.updatePayload(log.finalUrl))
            .eq(tCfg.handleCol, handle);
          if (dbErr) {
            log.steps.push(`${tbl} DB update error: ${dbErr.message}`);
          } else {
            log.steps.push(`${tbl} DB updated ✓`);
          }
        }
        log.status = "fixed";
      } else {
        log.status = "failed";
        log.steps.push("ALL METHODS EXHAUSTED — no valid avatar found");
      }
    } catch (err) {
      log.steps.push(`Exception: ${err.message}`);
      log.status = "failed";
    }

    results.push(log);
    await new Promise(r => setTimeout(r, 500));
  }

  const fixed = results.filter(r => r.status === "fixed").length;
  const failed = results.filter(r => r.status !== "fixed").length;
  return res.json({ message: `${fixed} fixed, ${failed} failed`, results });
}

module.exports = handler;
module.exports.config = config;
