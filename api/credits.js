export default async function handler(req, res) {
  const apiKey = req.headers.authorization?.replace("Bearer ", "") || process.env.VITE_INFLUENCERS_CLUB_API_KEY;
  if (!apiKey) return res.status(401).json({ error: "No API key" });

  try {
    const upstream = await fetch("https://api-dashboard.influencers.club/public/v1/accounts/credits/", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const text = await upstream.text();
    console.log("[credits] Upstream status:", upstream.status);
    console.log("[credits] Raw response:", text.substring(0, 500));

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream ${upstream.status}`, raw: text.substring(0, 200) });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "Invalid JSON from upstream", raw: text.substring(0, 200) });
    }

    console.log("[credits] Parsed keys:", Object.keys(data));

    // Normalize: the API may return various field names. Map them all to a
    // consistent shape the frontend can rely on.
    const normalized = {
      credits_remaining:
        data.credits_remaining ??
        data.balance ??
        data.available_credits ??
        data.credits_available ??
        data.remaining ??
        data.credit_balance ??
        null,
      credits_used:
        data.credits_used ??
        data.used_credits ??
        data.used ??
        null,
      credits_total:
        data.credits_total ??
        data.total_credits ??
        data.total ??
        null,
      // Pass through the raw response too so we can see all fields
      _raw: data,
    };

    console.log("[credits] Normalized:", JSON.stringify(normalized));

    res.status(200).json(normalized);
  } catch (err) {
    console.error("[credits] Exception:", err.message);
    res.status(500).json({ error: err.message });
  }
}
