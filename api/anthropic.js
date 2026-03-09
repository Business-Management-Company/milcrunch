module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Health check for UptimeRobot
  if (req.method === "GET" || req.method === "HEAD") {
    return res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Read key — strip quotes/whitespace that break auth
  const raw = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || "";
  const key = raw.replace(/^["' ]+|["' ]+$/g, "").trim();

  if (!key) {
    console.error("[anthropic] No API key found. ANTHROPIC_API_KEY:", !!process.env.ANTHROPIC_API_KEY, "VITE_ANTHROPIC_API_KEY:", !!process.env.VITE_ANTHROPIC_API_KEY);
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await resp.text();

    if (resp.status === 401) {
      console.error("[anthropic] 401 from Anthropic API. Key length:", key.length, "Key prefix:", key.slice(0, 8) + "...");
    }

    res
      .status(resp.status)
      .setHeader("Content-Type", "application/json")
      .send(data);
  } catch (e) {
    console.error("[anthropic] Proxy error:", e.message);
    res
      .status(502)
      .json({ error: "Anthropic proxy error", message: e.message });
  }
}
