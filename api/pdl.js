export default async function handler(req, res) {
  const key = process.env.VITE_PDL_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "VITE_PDL_API_KEY not configured" });
  }

  const stripped = req.url.replace(/^\/api\/pdl/, "");
  const upstream = "https://api.peopledatalabs.com" + (stripped || "/");

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
    res.status(resp.status).setHeader("Content-Type", "application/json").send(data);
  } catch (e) {
    res.status(502).json({ error: "PDL proxy error", message: e.message });
  }
}
