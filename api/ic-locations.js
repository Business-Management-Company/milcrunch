export default async function handler(req, res) {
  // Accept both POST body and GET query params.
  // POST avoids Vercel WAF which blocks certain header+queryparam combos on GET.
  const body = req.body || {};
  const query = body.q || body.query || req.query.q || req.query.query || "";
  const platform = body.platform || req.query.platform || "instagram";
  const clientKey = body.cfg || "";

  if (!query) {
    return res.status(400).json({ error: "q parameter is required" });
  }

  const apiKey = clientKey || process.env.VITE_INFLUENCERS_CLUB_API_KEY;

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

    const respBody = await resp.text();
    console.log("[ic-locations] upstream status:", resp.status, "| body (first 500):", respBody.substring(0, 500));

    res
      .status(resp.status)
      .setHeader("Content-Type", "application/json")
      .send(respBody);
  } catch (err) {
    console.error("[ic-locations] proxy error:", err.message || err);
    res.status(502).json({ error: "Upstream request failed", detail: err.message || String(err) });
  }
}
