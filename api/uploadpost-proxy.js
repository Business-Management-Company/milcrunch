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
export default async function handler(req, res) {
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
    return res.status(405).json({ error: "Method not allowed. Use GET for health check or POST with { endpoint, method, body }." });
  }

  const { endpoint, method, body } = req.body || {};

  if (!endpoint) {
    return res.status(400).json({ error: "Missing 'endpoint' field in request body." });
  }

  const apiKey = process.env.UPLOAD_POST_API_KEY || process.env.VITE_UPLOAD_POST_API_KEY;
  if (!apiKey) {
    console.error("[uploadpost-proxy] No API key found in env (UPLOAD_POST_API_KEY / VITE_UPLOAD_POST_API_KEY)");
    return res.status(500).json({ error: "UPLOAD_POST_API_KEY not configured on server." });
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

  const url = `https://api.upload-post.com${endpoint}`;
  const httpMethod = (method || "GET").toUpperCase();

  // Upload endpoints require multipart/form-data, not JSON
  const UPLOAD_ENDPOINTS = ["/api/upload_text", "/api/upload_photos", "/api/upload_videos"];
  const isUploadEndpoint = UPLOAD_ENDPOINTS.some((ep) => endpoint.startsWith(ep));

  console.log(`[uploadpost-proxy] ${httpMethod} ${url} (formData: ${isUploadEndpoint})`);
  if (resolvedBody) console.log("[uploadpost-proxy] body:", JSON.stringify(resolvedBody).slice(0, 2000));

  try {
    const fetchOptions = {
      method: httpMethod,
      headers: {
        apikey: apiKey,
        Authorization: `Apikey ${apiKey}`,
      },
    };

    if (resolvedBody && httpMethod !== "GET" && httpMethod !== "HEAD") {
      if (isUploadEndpoint) {
        // Build multipart/form-data for upload endpoints
        const form = new FormData();
        for (const [key, value] of Object.entries(resolvedBody)) {
          if (value == null) continue;
          if (key === "platform" && Array.isArray(value)) {
            // UploadPost requires platform[] array bracket syntax
            for (const p of value) {
              form.append("platform[]", String(p));
            }
          } else if (key === "photos" && Array.isArray(value)) {
            for (const p of value) {
              form.append("photos[]", String(p));
            }
          } else if (Array.isArray(value)) {
            for (const v of value) {
              form.append(`${key}[]`, String(v));
            }
          } else {
            form.append(key, String(value));
          }
        }
        // Log form fields for debugging
        const formFields = {};
        for (const [k, v] of form.entries()) {
          if (formFields[k]) {
            if (!Array.isArray(formFields[k])) formFields[k] = [formFields[k]];
            formFields[k].push(v);
          } else {
            formFields[k] = v;
          }
        }
        console.log("[uploadpost-proxy] FormData fields:", JSON.stringify(formFields));
        fetchOptions.body = form;
        // Do NOT set Content-Type — fetch sets the multipart boundary automatically
      } else {
        // JSON for all other endpoints (user management, JWT, etc.)
        fetchOptions.headers["Content-Type"] = "application/json";
        fetchOptions.body = JSON.stringify(resolvedBody);
      }
    } else if (!isUploadEndpoint) {
      fetchOptions.headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, fetchOptions);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { _raw: text };
    }

    console.log(`[uploadpost-proxy] response: ${response.status} ${response.statusText}`);
    console.log("[uploadpost-proxy] response body:", JSON.stringify(data).slice(0, 2000));

    return res.status(response.status).json(data);
  } catch (err) {
    console.error("[uploadpost-proxy] fetch error:", err.message);
    return res.status(502).json({ error: `Proxy error: ${err.message}` });
  }
}
