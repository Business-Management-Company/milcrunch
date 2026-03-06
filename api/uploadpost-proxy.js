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

  const url = `https://api.upload-post.com${endpoint}`;
  const httpMethod = (method || "GET").toUpperCase();

  console.log(`[uploadpost-proxy] ${httpMethod} ${url}`);
  if (body) console.log("[uploadpost-proxy] body:", JSON.stringify(body).slice(0, 2000));

  try {
    const fetchOptions = {
      method: httpMethod,
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
        Authorization: `Apikey ${apiKey}`,
      },
    };

    if (body && httpMethod !== "GET" && httpMethod !== "HEAD") {
      fetchOptions.body = JSON.stringify(body);
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
