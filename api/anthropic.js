module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Expose-Headers", "X-AI-Provider");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Health check for UptimeRobot
  if (req.method === "GET" || req.method === "HEAD") {
    return res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Lazy-require to catch import errors inside the handler
    let callWithFallback;
    try {
      ({ callWithFallback } = require("./_lib/ai-fallback"));
      console.log("[anthropic] ai-fallback module loaded OK");
    } catch (importErr) {
      console.error("[anthropic] FAILED to import ai-fallback:", importErr.message, importErr.stack);
      return await directClaudeCall(req, res);
    }

    const result = await callWithFallback(req.body);

    if (result._allFailed) {
      res.setHeader("X-AI-Provider", result.provider || "Unavailable");
      return res.status(503).json({
        error: "AI temporarily unavailable",
        failedProvider: result.provider || null,
        content: [{ text: "" }],
      });
    }

    // Set header BEFORE sending json
    res.setHeader("X-AI-Provider", result.provider || "Claude");
    return res.status(200).json({ content: [{ text: result.text }] });
  } catch (err) {
    console.error("[anthropic] TOP LEVEL ERROR:", err.message, err.stack);
    res.setHeader("X-AI-Provider", "Unavailable");
    return res.status(503).json({ error: err.message, content: [{ text: "" }] });
  }
};

/**
 * Emergency fallback — direct Claude call if ai-fallback module fails to load.
 * This preserves the original behavior so the API doesn't completely break.
 */
async function directClaudeCall(req, res) {
  const raw = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || "";
  const key = raw.replace(/^["' ]+|["' ]+$/g, "").trim();

  if (!key) {
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
    res.status(resp.status).setHeader("Content-Type", "application/json").send(data);
  } catch (e) {
    console.error("[anthropic] Direct Claude fallback error:", e.message);
    res.status(502).json({ error: "Anthropic proxy error", message: e.message });
  }
}
