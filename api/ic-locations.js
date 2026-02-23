export default async function handler(req, res) {
  const query = req.query.query || "";
  const platform = req.query.platform || "instagram";

  if (!query) {
    return res.status(400).json({ error: "query parameter is required" });
  }

  const apiKey =
    req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
    process.env.VITE_INFLUENCERS_CLUB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const params = new URLSearchParams({ query, platform });
  const url = `https://api.influencers.club/public/v1/locations?${params}`;

  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await resp.text();
    res
      .status(resp.status)
      .setHeader("Content-Type", "application/json")
      .send(data);
  } catch (err) {
    console.error("[ic-locations] proxy error:", err);
    res.status(502).json({ error: "Upstream request failed" });
  }
}
