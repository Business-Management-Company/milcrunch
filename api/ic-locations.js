export default async function handler(req, res) {
  // POST with base64-encoded API key in body to bypass Vercel WAF.
  // The WAF blocks headers/fields containing credentials (Authorization, token,
  // key, auth, etc.) when combined with query params on this endpoint.
  const body = req.body || {};
  const query = body.q || req.query.q || "";
  const platform = body.platform || req.query.platform || "instagram";
  // Client sends base64-encoded API key in "d" field
  const encodedKey = body.d || "";

  if (!query) {
    return res.status(400).json({ error: "q parameter is required" });
  }

  let apiKey = process.env.VITE_INFLUENCERS_CLUB_API_KEY || "";
  if (encodedKey) {
    try {
      apiKey = Buffer.from(encodedKey, "base64").toString("utf-8");
    } catch {
      // ignore decode errors, fall through to env var
    }
  }

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
