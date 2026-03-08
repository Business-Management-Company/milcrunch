/**
 * Vercel serverless proxy for Upload-Post API.
 * All UploadPost calls go through this to avoid CORS and keep the API key server-side.
 *
 * Frontend sends: POST /api/uploadpost-proxy
 *   body: { endpoint: "/api/uploadposts/users", method: "GET", body?: { ... } }
 *
 * Proxy forwards: <method> https://api.upload-post.com<endpoint>
 *   with apikey header added server-side.
 */
module.exports = async function handler(req, res) {
  console.log("[uploadpost-proxy] handler invoked:", req.method, req.url);

  // CORS headers — allow browser preflight and cross-origin requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Debug: log every request
  console.log('[proxy] method:', req.method, 'action:', req.body?.action, 'endpoint:', req.body?.endpoint);

  // Health check — visit /api/uploadpost-proxy in browser to verify function is live
  if (req.method === "GET") {
    const hasKey = !!(process.env.UPLOAD_POST_API_KEY || process.env.VITE_UPLOAD_POST_API_KEY);
    return res.status(200).json({
      status: "proxy alive",
      hasKey,
      keySource: process.env.UPLOAD_POST_API_KEY ? "UPLOAD_POST_API_KEY" : process.env.VITE_UPLOAD_POST_API_KEY ? "VITE_UPLOAD_POST_API_KEY" : "none",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    console.log('[proxy] returning 405 for method:', req.method);
    return res.status(405).json({ error: "Method not allowed. Use GET for health check or POST with { endpoint, method, body }." });
  }

  const { endpoint, method, body, action } = req.body || {};

  const apiKey = process.env.UPLOAD_POST_API_KEY || process.env.VITE_UPLOAD_POST_API_KEY;
  if (!apiKey) {
    console.error("[uploadpost-proxy] No API key found in env (UPLOAD_POST_API_KEY / VITE_UPLOAD_POST_API_KEY)");
    return res.status(500).json({ error: "UPLOAD_POST_API_KEY not configured on server." });
  }

  // ── Direct action: upload_photos ──
  if (action === "upload_photos") {
    const { user, platform, title, photos, scheduled_date, async_upload, first_comment } = req.body;
    if (!user) return res.status(400).json({ error: "Missing 'user'" });
    if (!photos || !Array.isArray(photos) || photos.length === 0) return res.status(400).json({ error: "Missing 'photos' array" });

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
      } catch (e) { console.warn("[uploadpost-proxy] UUID resolve failed:", e.message); }
    }

    console.log("[uploadpost-proxy] action=upload_photos user:", resolvedUser, "photos:", photos.length);
    try {
      const form = new FormData();
      form.append("user", String(resolvedUser));
      if (Array.isArray(platform)) { for (const p of platform) form.append("platform[]", String(p)); }
      if (title) form.append("title", String(title));
      if (scheduled_date) form.append("scheduled_date", String(scheduled_date));
      if (async_upload) form.append("async_upload", "true");
      if (first_comment) form.append("first_comment", String(first_comment));

      for (const photoUrl of photos) {
        const urlStr = String(photoUrl);
        console.log("[uploadpost-proxy] Fetching photo:", urlStr);
        const imgRes = await fetch(urlStr);
        if (!imgRes.ok) return res.status(502).json({ error: `Photo fetch failed: HTTP ${imgRes.status}` });
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const contentType = imgRes.headers.get("content-type") || "image/jpeg";
        if (buffer.byteLength === 0) return res.status(502).json({ error: "Photo empty" });
        form.append("photo", new Blob([buffer], { type: contentType }), "photo.jpg");
        console.log("[uploadpost-proxy] Photo fetched:", buffer.byteLength, "bytes");
      }

      const upRes = await fetch("https://app.upload-post.com/api/upload_photos", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      const upText = await upRes.text();
      let upData;
      try { upData = JSON.parse(upText); } catch { upData = { _raw: upText }; }
      console.log("[uploadpost-proxy] upload_photos response:", upRes.status, JSON.stringify(upData).slice(0, 2000));
      return res.status(upRes.status).json(upData);
    } catch (err) {
      console.error("[uploadpost-proxy] upload_photos error:", err.message);
      return res.status(502).json({ error: `Upload failed: ${err.message}` });
    }
  }

  // ── Direct action: upload_text ──
  if (action === "upload_text") {
    const { user, platform, title, scheduled_date, async_upload, first_comment } = req.body;
    if (!user) return res.status(400).json({ error: "Missing 'user'" });

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
      } catch (e) { console.warn("[uploadpost-proxy] UUID resolve failed:", e.message); }
    }

    console.log("[uploadpost-proxy] action=upload_text user:", resolvedUser);
    try {
      const form = new FormData();
      form.append("user", String(resolvedUser));
      if (Array.isArray(platform)) { for (const p of platform) form.append("platform[]", String(p)); }
      if (title) form.append("title", String(title));
      if (scheduled_date) form.append("scheduled_date", String(scheduled_date));
      if (async_upload) form.append("async_upload", "true");
      if (first_comment) form.append("first_comment", String(first_comment));

      const upRes = await fetch("https://app.upload-post.com/api/upload_text", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      const upText = await upRes.text();
      let upData;
      try { upData = JSON.parse(upText); } catch { upData = { _raw: upText }; }
      console.log("[uploadpost-proxy] upload_text response:", upRes.status, JSON.stringify(upData).slice(0, 2000));
      return res.status(upRes.status).json(upData);
    } catch (err) {
      console.error("[uploadpost-proxy] upload_text error:", err.message);
      return res.status(502).json({ error: `Upload failed: ${err.message}` });
    }
  }

  // ── Direct action: upload_videos ──
  if (action === "upload_videos") {
    const { user, platform, title, video, scheduled_date, async_upload, first_comment } = req.body;
    if (!user) return res.status(400).json({ error: "Missing 'user'" });
    if (!video) return res.status(400).json({ error: "Missing 'video' URL" });

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
      } catch (e) { console.warn("[uploadpost-proxy] UUID resolve failed:", e.message); }
    }

    console.log("[uploadpost-proxy] action=upload_videos user:", resolvedUser);
    try {
      const form = new FormData();
      form.append("user", String(resolvedUser));
      if (Array.isArray(platform)) { for (const p of platform) form.append("platform[]", String(p)); }
      if (title) form.append("title", String(title));
      form.append("video", String(video));
      if (scheduled_date) form.append("scheduled_date", String(scheduled_date));
      if (async_upload) form.append("async_upload", "true");
      if (first_comment) form.append("first_comment", String(first_comment));

      const upRes = await fetch("https://app.upload-post.com/api/upload_videos", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      const upText = await upRes.text();
      let upData;
      try { upData = JSON.parse(upText); } catch { upData = { _raw: upText }; }
      console.log("[uploadpost-proxy] upload_videos response:", upRes.status, JSON.stringify(upData).slice(0, 2000));
      return res.status(upRes.status).json(upData);
    } catch (err) {
      console.error("[uploadpost-proxy] upload_videos error:", err.message);
      return res.status(502).json({ error: `Upload failed: ${err.message}` });
    }
  }

  // ── Legacy endpoint-based proxy (non-action requests) ──
  if (!endpoint) {
    console.log('[proxy] no matching action, falling through. body:', JSON.stringify(req.body));
    return res.status(400).json({ error: "Missing 'endpoint' or 'action' field in request body." });
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

  // If the request body has a "user" field that looks like a UUID, try to swap it
  // for a real slug from the users list before sending to UploadPost
  let resolvedBody = body;
  if (body && body.user && UUID_RE.test(body.user)) {
    console.warn(`[uploadpost-proxy] WARNING: "user" field is a UUID: ${body.user} — attempting to resolve a real slug`);
    try {
      const listRes = await fetch("https://api.upload-post.com/api/uploadposts/users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
          Authorization: `Apikey ${apiKey}`,
        },
      });
      const listData = await listRes.json();
      const users = Array.isArray(listData) ? listData : listData?.users ?? listData?.data ?? [];
      const nonUuid = users.find((u) => u.username && !UUID_RE.test(u.username));
      if (nonUuid) {
        console.log(`[uploadpost-proxy] Resolved UUID user to slug: ${nonUuid.username}`);
        resolvedBody = { ...body, user: nonUuid.username };
      } else {
        console.warn("[uploadpost-proxy] No non-UUID profile found, proceeding with UUID");
      }
    } catch (lookupErr) {
      console.warn("[uploadpost-proxy] Failed to resolve UUID user:", lookupErr.message);
    }
  }

  const httpMethod = (method || "GET").toUpperCase();

  // Upload endpoints use app.upload-post.com with Bearer auth + multipart/form-data
  // All other endpoints use api.upload-post.com with Apikey auth + JSON
  const UPLOAD_ENDPOINTS = ["/api/upload_text", "/api/upload_photos", "/api/upload_videos"];
  const isUploadEndpoint = UPLOAD_ENDPOINTS.some((ep) => endpoint.startsWith(ep));
  const baseUrl = isUploadEndpoint ? "https://app.upload-post.com" : "https://api.upload-post.com";
  const url = `${baseUrl}${endpoint}`;

  console.log(`[uploadpost-proxy] ${httpMethod} ${url} (upload: ${isUploadEndpoint})`);
  if (resolvedBody) console.log("[uploadpost-proxy] body:", JSON.stringify(resolvedBody).slice(0, 2000));

  try {
    // ── upload_photos: dedicated handler with binary photo data ──
    if (endpoint.startsWith("/api/upload_photos") && resolvedBody && Array.isArray(resolvedBody.photos)) {
      const form = new FormData();

      // 1. String fields first
      if (resolvedBody.user) form.append("user", String(resolvedBody.user));
      if (Array.isArray(resolvedBody.platform)) {
        for (const p of resolvedBody.platform) form.append("platform[]", String(p));
      }
      if (resolvedBody.title) form.append("title", String(resolvedBody.title));
      if (resolvedBody.scheduled_date) form.append("scheduled_date", String(resolvedBody.scheduled_date));
      if (resolvedBody.async_upload) form.append("async_upload", "true");
      if (resolvedBody.first_comment) form.append("first_comment", String(resolvedBody.first_comment));

      // 2. Fetch each photo URL → binary buffer → Blob
      for (const photoUrl of resolvedBody.photos) {
        const urlStr = String(photoUrl);
        console.log("[uploadpost-proxy] Fetching photo binary from:", urlStr);
        try {
          const imgRes = await fetch(urlStr);
          if (!imgRes.ok) {
            console.error("[uploadpost-proxy] Photo fetch failed:", imgRes.status, imgRes.statusText);
            return res.status(502).json({ error: `Failed to fetch photo: HTTP ${imgRes.status}`, url: urlStr.slice(0, 200) });
          }
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const contentType = imgRes.headers.get("content-type") || "image/jpeg";
          console.log("[uploadpost-proxy] Photo fetched:", buffer.byteLength, "bytes, type:", contentType);

          if (buffer.byteLength === 0) {
            return res.status(502).json({ error: "Photo URL returned empty response", url: urlStr.slice(0, 200) });
          }

          form.append("photo", new Blob([buffer], { type: contentType }), "photo.jpg");
        } catch (fetchErr) {
          console.error("[uploadpost-proxy] Photo processing failed:", fetchErr.message);
          return res.status(502).json({ error: `Photo processing failed: ${fetchErr.message}`, url: urlStr.slice(0, 200) });
        }
      }

      // 3. Log and send
      const fieldSummary = [];
      for (const [k, v] of form.entries()) {
        fieldSummary.push(v instanceof Blob ? `${k}: [Blob ${v.size}b ${v.type}]` : `${k}: ${String(v).slice(0, 80)}`);
      }
      console.log("[uploadpost-proxy] FormData:", fieldSummary.join(" | "));

      const upRes = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });

      const upText = await upRes.text();
      let upData;
      try { upData = JSON.parse(upText); } catch { upData = { _raw: upText }; }
      console.log(`[uploadpost-proxy] upload_photos response: ${upRes.status}`, JSON.stringify(upData).slice(0, 2000));
      return res.status(upRes.status).json(upData);
    }

    // ── All other endpoints ──
    const fetchOptions = {
      method: httpMethod,
      headers: isUploadEndpoint
        ? { Authorization: `Bearer ${apiKey}` }
        : { "Content-Type": "application/json", apikey: apiKey, Authorization: `Apikey ${apiKey}` },
    };

    if (resolvedBody && httpMethod !== "GET" && httpMethod !== "HEAD") {
      if (isUploadEndpoint) {
        // upload_text / upload_videos: string-only FormData
        const form = new FormData();
        for (const [key, value] of Object.entries(resolvedBody)) {
          if (value == null) continue;
          if (key === "platform" && Array.isArray(value)) {
            for (const p of value) form.append("platform[]", String(p));
          } else if (Array.isArray(value)) {
            for (const v of value) form.append(`${key}[]`, String(v));
          } else {
            form.append(key, String(value));
          }
        }
        fetchOptions.body = form;
        // Do NOT set Content-Type — fetch sets the multipart boundary automatically
      } else {
        fetchOptions.body = JSON.stringify(resolvedBody);
      }
    }

    const response = await fetch(url, fetchOptions);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { _raw: text }; }

    console.log(`[uploadpost-proxy] response: ${response.status} ${response.statusText}`);
    console.log("[uploadpost-proxy] response body:", JSON.stringify(data).slice(0, 2000));

    return res.status(response.status).json(data);
  } catch (err) {
    console.error("[uploadpost-proxy] fetch error:", err.message);
    return res.status(502).json({ error: `Proxy error: ${err.message}` });
  }
}
