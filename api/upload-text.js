/**
 * Dedicated Vercel serverless function for uploading text posts to UploadPost.
 *
 * POST /api/upload-text
 *   body: { user, platform, title, scheduled_date?, async_upload?, first_comment? }
 */
export default async function handler(req, res) {
  console.log("[upload-text] handler invoked:", req.method, req.url);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const apiKey = process.env.UPLOAD_POST_API_KEY || process.env.VITE_UPLOAD_POST_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "UPLOAD_POST_API_KEY not configured." });

  const { user, platform, title, scheduled_date, async_upload, first_comment } = req.body || {};
  if (!user) return res.status(400).json({ error: "Missing 'user'" });

  // Resolve UUID user → real slug
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
  let resolvedUser = user;
  if (UUID_RE.test(user)) {
    try {
      const listRes = await fetch("https://api.upload-post.com/api/uploadposts/users", {
        method: "GET",
        headers: { "Content-Type": "application/json", apikey: apiKey, Authorization: `Apikey ${apiKey}` },
      });
      const listData = await listRes.json();
      const users = Array.isArray(listData) ? listData : listData?.profiles ?? listData?.users ?? listData?.data ?? [];
      const nonUuid = users.find((u) => u.username && !UUID_RE.test(u.username));
      if (nonUuid) resolvedUser = nonUuid.username;
    } catch (err) {
      console.warn("[upload-text] UUID resolution failed:", err.message);
    }
  }

  try {
    const form = new FormData();
    form.append("user", String(resolvedUser));
    if (Array.isArray(platform)) {
      for (const p of platform) form.append("platform[]", String(p));
    }
    if (title) form.append("title", String(title));
    if (scheduled_date) form.append("scheduled_date", String(scheduled_date));
    if (async_upload) form.append("async_upload", "true");
    if (first_comment) form.append("first_comment", String(first_comment));

    console.log("[upload-text] user:", resolvedUser, "platform:", platform);

    const upRes = await fetch("https://app.upload-post.com/api/upload_text", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    const upText = await upRes.text();
    let upData;
    try { upData = JSON.parse(upText); } catch { upData = { _raw: upText }; }
    console.log("[upload-text] response:", upRes.status, JSON.stringify(upData).slice(0, 2000));
    return res.status(upRes.status).json(upData);
  } catch (err) {
    console.error("[upload-text] error:", err.message);
    return res.status(502).json({ error: `Upload failed: ${err.message}` });
  }
}
