import { createClient } from "@supabase/supabase-js";

export const config = { maxDuration: 300 };

/**
 * POST /api/fix-avatars
 * Body: { handles: ["spouse.ly", "suzannemccurdy_", ...] }
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.INFLUENCERS_CLUB_API_KEY || process.env.VITE_INFLUENCERS_CLUB_API_KEY;

  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: "Supabase not configured" });
  if (!apiKey) return res.status(500).json({ error: "IC API key not configured" });

  const sb = createClient(supabaseUrl, supabaseKey);

  // scan=true mode: find all broken avatars and fix them
  // Checks both URL format AND actual image file size to catch placeholders
  // that were uploaded to Supabase Storage by earlier migrations.
  if (body.scan) {
    const { data: allMembers, error: scanErr } = await sb
      .from("directory_members")
      .select("creator_handle, avatar_url, ic_avatar_url");
    if (scanErr) return res.status(500).json({ error: scanErr.message });

    const broken = [];
    const details = [];

    for (const m of allMembers || []) {
      const av = m.avatar_url || "";
      const ic = m.ic_avatar_url || "";
      const hasBadDomain = av.includes("cloudfront") || ic.includes("cloudfront") || av.includes("ui-avatars") || ic.includes("ui-avatars");
      const empty = !av && !ic;

      if (hasBadDomain || empty) {
        broken.push(m.creator_handle);
        details.push({ handle: m.creator_handle, reason: empty ? "no URL" : "bad domain" });
        continue;
      }

      // URL looks like Supabase — verify the image actually exists and is real
      const checkUrl = av || ic;
      if (checkUrl.includes("supabase.co/storage/")) {
        try {
          const head = await fetch(checkUrl, { method: "HEAD" });
          const size = parseInt(head.headers.get("content-length") || "0", 10);
          const ct = (head.headers.get("content-type") || "").toLowerCase();
          if (!head.ok) {
            broken.push(m.creator_handle);
            details.push({ handle: m.creator_handle, reason: `HTTP ${head.status}` });
          } else if (size < MIN_AVATAR_BYTES) {
            broken.push(m.creator_handle);
            details.push({ handle: m.creator_handle, reason: `${size} bytes (placeholder)` });
          } else if (ct && !ct.startsWith("image/")) {
            broken.push(m.creator_handle);
            details.push({ handle: m.creator_handle, reason: `bad content-type: ${ct}` });
          }
        } catch (e) {
          broken.push(m.creator_handle);
          details.push({ handle: m.creator_handle, reason: `fetch error: ${e.message}` });
        }
      } else {
        // Non-Supabase, non-bad-domain URL — still needs migration
        broken.push(m.creator_handle);
        details.push({ handle: m.creator_handle, reason: "not in Supabase Storage" });
      }
    }

    if (body.scanOnly) {
      return res.json({ total: (allMembers || []).length, broken: broken.length, handles: broken, details });
    }

    if (broken.length === 0) {
      return res.json({ message: "All avatars are healthy", total: (allMembers || []).length, broken: 0 });
    }

    body.handles = broken;
  }

  const handles = body.handles;
  if (!Array.isArray(handles) || handles.length === 0) {
    return res.status(400).json({ error: "Provide { handles: [...] } or { scan: true }" });
  }

  const results = [];

  for (const rawHandle of handles) {
    const handle = rawHandle.replace("@", "").toLowerCase().trim();
    const log = { handle, steps: [], status: "pending", finalUrl: null };

    try {
      // Step 1: Try IC Discovery API
      log.steps.push("Trying IC Discovery...");
      const disc = await tryDiscovery(handle, apiKey);
      let imageUrl = null;

      if (disc.url) {
        log.steps.push(`Discovery returned URL: ${disc.url.substring(0, 80)}...`);
        const dl = await downloadAndValidate(disc.url);
        if (dl.buffer) {
          log.steps.push(`Downloaded ${dl.buffer.length} bytes — valid image`);
          imageUrl = disc.url;
          // Upload directly since we have the buffer
          const path = `avatars/${handle}.jpg`;
          const { error: upErr } = await sb.storage.from(BUCKET).upload(path, dl.buffer, { contentType: dl.contentType, upsert: true });
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
            const { error: upErr } = await sb.storage.from(BUCKET).upload(path, dl.buffer, { contentType: dl.contentType, upsert: true });
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
        // Instagram's public profile_pic endpoint (no auth needed)
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
            // Try to extract profile_pic_url from meta tags or JSON
            const ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/);
            const picMatch = html.match(/"profile_pic_url_hd"\s*:\s*"([^"]+)"/) || html.match(/"profile_pic_url"\s*:\s*"([^"]+)"/);
            const extractedUrl = (picMatch?.[1] || ogMatch?.[1] || "").replace(/\\u0026/g, "&");
            if (extractedUrl && extractedUrl.startsWith("http")) {
              log.steps.push(`Instagram page returned avatar: ${extractedUrl.substring(0, 80)}...`);
              const dl = await downloadAndValidate(extractedUrl);
              if (dl.buffer) {
                const path = `avatars/${handle}.jpg`;
                const { error: upErr } = await sb.storage.from(BUCKET).upload(path, dl.buffer, { contentType: dl.contentType, upsert: true });
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
        const { error: dbErr } = await sb
          .from("directory_members")
          .update({ avatar_url: log.finalUrl, ic_avatar_url: log.finalUrl })
          .eq("creator_handle", handle);
        if (dbErr) {
          log.steps.push(`DB update error: ${dbErr.message}`);
          log.status = "partial";
        } else {
          log.steps.push("DB updated successfully");
          log.status = "fixed";
        }
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
