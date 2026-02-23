export default async function handler(req, res) {
  try {
    const body = req.body || {};
    const query = body.q || req.query.q || "";
    const platform = body.platform || req.query.platform || "instagram";

    if (!query) return res.status(400).json({ error: "q parameter is required" });

    const apiKey = process.env.INFLUENCERS_CLUB_API_KEY || process.env.VITE_INFLUENCERS_CLUB_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API key not configured" });

    const url = `https://api-dashboard.influencers.club/public/v1/locations?query=${encodeURIComponent(query)}&platform=${platform}`;

    console.log("[ic-locations] fetching:", url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    const text = await response.text();
    console.log("[ic-locations] status:", response.status, "body:", text.substring(0, 300));

    // If upstream returned HTML (404 page etc.), return a clear error
    if (text.trimStart().startsWith("<")) {
      return res.status(502).json({
        error: "Upstream returned HTML, not JSON",
        upstreamStatus: response.status,
        upstreamUrl: url,
        snippet: text.substring(0, 200)
      });
    }

    try {
      const data = JSON.parse(text);
      return res.status(response.status).json(data);
    } catch {
      return res.status(502).json({ error: "Invalid JSON from upstream", snippet: text.substring(0, 200) });
    }
  } catch (err) {
    console.error("[ic-locations] error name:", err.name);
    console.error("[ic-locations] error message:", err.message);
    console.error("[ic-locations] error cause:", err.cause);
    return res.status(500).json({
      error: err.message,
      name: err.name,
      cause: String(err.cause || "")
    });
  }
}
