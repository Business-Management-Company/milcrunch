module.exports = async function handler(req, res) {
  const key = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "YOUTUBE_API_KEY not configured" });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  url.searchParams.set("key", key);

  // Build the upstream path from the proxy path
  // Requests come as /api/youtube?part=snippet&type=video&q=...
  const upstream = `https://www.googleapis.com/youtube/v3/search?${url.searchParams.toString()}`;

  try {
    const resp = await fetch(upstream, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    const data = await resp.text();
    res.status(resp.status).setHeader("Content-Type", "application/json").send(data);
  } catch (e) {
    res.status(502).json({ error: "YouTube API proxy error", message: e.message });
  }
}
