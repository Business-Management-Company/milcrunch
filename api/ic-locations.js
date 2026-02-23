export default async function handler(req, res) {
  const query = req.query.query || "";
  const platform = req.query.platform || "instagram";

  if (!query) {
    return res.status(400).json({ error: "query parameter is required" });
  }

  const apiKey =
    req.headers["x-api-key"] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
    process.env.VITE_INFLUENCERS_CLUB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const params = new URLSearchParams({ query, platform });
  const url = `https://api-dashboard.influencers.club/public/v1/locations?${params}`;

  console.log("[ic-locations] GET", url, "| key present:", !!apiKey);

  try {
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const body = await resp.text();
    console.log("[ic-locations] upstream status:", resp.status, "| body (first 500):", body.substring(0, 500));

    res
      .status(resp.status)
      .setHeader("Content-Type", "application/json")
      .send(body);
  } catch (err) {
    console.error("[ic-locations] proxy error:", err.message || err);
    res.status(502).json({ error: "Upstream request failed", detail: err.message || String(err) });
  }
}
