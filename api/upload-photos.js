/**
 * Dedicated Vercel serverless function for uploading photos to UploadPost.
 * Separate from uploadpost-proxy to avoid nginx POST routing issues.
 *
 * GET  /api/upload-photos → health check
 * POST /api/upload-photos → upload photo(s) to UploadPost
 *   body: { user, platform, title, photos, scheduled_date?, async_upload?, first_comment? }
 */

const handler = async function handler(req, res) {
  console.log("[upload-photos] handler invoked:", req.method, req.url);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Health check for UptimeRobot
  if (req.method === "GET" || req.method === "HEAD") {
    return res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use GET for health check or POST to upload photos" });
  }

  const apiKey = process.env.UPLOAD_POST_API_KEY || process.env.VITE_UPLOAD_POST_API_KEY;
  if (!apiKey) {
    console.error("[upload-photos] No API key found");
    return res.status(500).json({ error: "UPLOAD_POST_API_KEY not configured on server." });
  }

  const { user, platform, title, photos, scheduled_date, async_upload, first_comment } = req.body || {};

  if (!user) return res.status(400).json({ error: "Missing 'user' field" });
  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ error: "Missing 'photos' array" });
  }

  // Resolve UUID user → real slug
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
  let resolvedUser = user;
  if (UUID_RE.test(user)) {
    console.warn("[upload-photos] user is a UUID:", user, "— resolving slug");
    try {
      const listRes = await fetch("https://api.upload-post.com/api/uploadposts/users", {
        method: "GET",
        headers: { "Content-Type": "application/json", apikey: apiKey, Authorization: `Apikey ${apiKey}` },
      });
      const listData = await listRes.json();
      const users = Array.isArray(listData) ? listData : listData?.profiles ?? listData?.users ?? listData?.data ?? [];
      const nonUuid = users.find((u) => u.username && !UUID_RE.test(u.username));
      if (nonUuid) {
        console.log("[upload-photos] Resolved to slug:", nonUuid.username);
        resolvedUser = nonUuid.username;
      }
    } catch (err) {
      console.warn("[upload-photos] UUID resolution failed:", err.message);
    }
  }

  console.log("[upload-photos] user:", resolvedUser, "platform:", platform, "photos:", photos.length);

  try {
    const form = new FormData();

    // String fields
    form.append("user", String(resolvedUser));
    if (Array.isArray(platform)) {
      for (const p of platform) form.append("platform[]", String(p));
    }
    if (title) form.append("title", String(title));
    if (scheduled_date) form.append("scheduled_date", String(scheduled_date));
    if (async_upload) form.append("async_upload", "true");
    if (first_comment) form.append("first_comment", String(first_comment));

    // Fetch each photo URL → binary buffer → Blob
    for (const photoUrl of photos) {
      const urlStr = String(photoUrl);
      console.log("[upload-photos] Fetching photo from:", urlStr);
      const imgRes = await fetch(urlStr);
      if (!imgRes.ok) {
        console.error("[upload-photos] Photo fetch failed:", imgRes.status);
        return res.status(502).json({ error: `Failed to fetch photo: HTTP ${imgRes.status}`, url: urlStr.slice(0, 200) });
      }
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const contentType = imgRes.headers.get("content-type") || "image/jpeg";
      console.log("[upload-photos] Photo fetched:", buffer.byteLength, "bytes, type:", contentType);

      if (buffer.byteLength === 0) {
        return res.status(502).json({ error: "Photo URL returned empty response", url: urlStr.slice(0, 200) });
      }

      form.append("photo", new Blob([buffer], { type: contentType }), "photo.jpg");
    }

    // Log form fields
    const fieldSummary = [];
    for (const [k, v] of form.entries()) {
      fieldSummary.push(v instanceof Blob ? `${k}: [Blob ${v.size}b]` : `${k}: ${String(v).slice(0, 80)}`);
    }
    console.log("[upload-photos] FormData:", fieldSummary.join(" | "));

    const upRes = await fetch("https://app.upload-post.com/api/upload_photos", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    const upText = await upRes.text();
    let upData;
    try { upData = JSON.parse(upText); } catch { upData = { _raw: upText }; }
    console.log("[upload-photos] response:", upRes.status, JSON.stringify(upData).slice(0, 2000));
    return res.status(upRes.status).json(upData);
  } catch (err) {
    console.error("[upload-photos] error:", err.message);
    return res.status(502).json({ error: `Upload failed: ${err.message}` });
  }
}

module.exports = handler;
module.exports.config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};
