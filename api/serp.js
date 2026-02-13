export default async function handler(req, res) {
  const key = process.env.VITE_SERP_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "VITE_SERP_API_KEY not configured" });
  }

  // Extract query params from the request URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  url.searchParams.set("api_key", key);

  const upstream = `https://serpapi.com/search.json?${url.searchParams.toString()}`;

  try {
    const resp = await fetch(upstream, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const data = await resp.text();
    res.status(resp.status).setHeader("Content-Type", "application/json").send(data);
  } catch (e) {
    res.status(502).json({ error: "SerpAPI proxy error", message: e.message });
  }
}
