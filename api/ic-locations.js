export default async function handler(req, res) {
  try {
    const body = req.body || {};
    const query = body.q || req.query.q || "";
    const platform = body.platform || req.query.platform || "instagram";

    const apiKey = process.env.INFLUENCERS_CLUB_API_KEY || process.env.VITE_INFLUENCERS_CLUB_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API key not configured" });

    const url = `https://api-dashboard.influencers.club/public/v1/discovery/classifier/locations/${encodeURIComponent(platform)}/`;

    console.log("[ic-locations] fetching:", url);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    const text = await response.text();
    console.log("[ic-locations] status:", response.status, "length:", text.length);

    if (text.trimStart().startsWith("<")) {
      return res.status(502).json({ error: "Upstream returned HTML", upstreamStatus: response.status });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "Invalid JSON from upstream", snippet: text.substring(0, 200) });
    }

    // The endpoint returns ALL locations for a platform. Filter client-side by query.
    if (query && Array.isArray(data)) {
      const q = query.toLowerCase();
      data = data.filter((loc) => typeof loc === "string" && loc.toLowerCase().includes(q));
    }

    return res.status(response.status).json(data);
  } catch (err) {
    console.error("[ic-locations] error:", err.name, err.message, err.cause);
    return res.status(500).json({ error: err.message, name: err.name });
  }
}
