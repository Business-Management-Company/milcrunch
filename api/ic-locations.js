export default async function handler(req, res) {
  try {
    const body = req.body || {};
    const query = body.q || req.query.q || "";
    const platform = body.platform || req.query.platform || "instagram";

    if (!query) return res.status(400).json({ error: "q parameter is required" });

    const apiKey = process.env.INFLUENCERS_CLUB_API_KEY || process.env.VITE_INFLUENCERS_CLUB_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API key not configured" });

    const url = `https://api.influencers.club/public/v1/locations?query=${encodeURIComponent(query)}&platform=${platform}`;

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
    console.log("[ic-locations] response status:", response.status);

    const data = await response.json();
    return res.status(response.status).json(data);
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
