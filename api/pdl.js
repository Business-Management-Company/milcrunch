export default async function handler(req, res) {
  const key = process.env.PDL_API_KEY || process.env.VITE_PDL_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "PDL_API_KEY not configured" });
  }

  // req.url keeps the original path+query, strip the /api/pdl prefix
  const stripped = req.url.replace(/^\/api\/pdl/, "");
  const upstream = "https://api.peopledatalabs.com" + (stripped || "/");

  console.log("[PDL Proxy] →", upstream);

  try {
    const resp = await fetch(upstream, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": key,
      },
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });
    const data = await resp.text();
    console.log("[PDL Proxy] status:", resp.status, "len:", data.length);
    res.status(resp.status).setHeader("Content-Type", "application/json").send(data);
  } catch (e) {
    console.error("[PDL Proxy] error:", e.message);
    res.status(502).json({ error: "PDL proxy error", message: e.message });
  }
}
