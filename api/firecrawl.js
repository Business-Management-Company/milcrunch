module.exports = async function handler(req, res) {
  const key = process.env.FIRECRAWL_API_KEY || process.env.VITE_FIRECRAWL_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "FIRECRAWL_API_KEY not configured" });
  }

  const stripped = req.url.replace(/^\/api\/firecrawl/, "");
  const upstream = "https://api.firecrawl.dev" + (stripped || "/");

  try {
    const resp = await fetch(upstream, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });
    const data = await resp.text();
    res.status(resp.status).setHeader("Content-Type", "application/json").send(data);
  } catch (e) {
    res.status(502).json({ error: "Firecrawl proxy error", message: e.message });
  }
}
