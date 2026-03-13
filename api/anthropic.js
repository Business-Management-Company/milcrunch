const { logCost } = require("./_lib/cost-tracker");

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

    // Log cost if successful
    if (resp.status === 200) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.usage && parsed.usage.input_tokens && parsed.usage.output_tokens) {
          const model = req.body.model || "claude-sonnet-4-5";
          
          // Extract operation from system prompt or use generic
          let operation = "AI Chat";
          if (req.body.system && typeof req.body.system === "string") {
            if (req.body.system.includes("MilCrunch AI Assistant")) {
              operation = "Creator AI Chat";
            } else if (req.body.system.includes("sponsorship")) {
              operation = "Sponsorship Generation";
            } else if (req.body.system.includes("caption")) {
              operation = "Caption Generation";
            } else if (req.body.system.includes("brand")) {
              operation = "Brand Matching";
            }
          }
          
          // Log asynchronously (don't wait for response)
          logCost({
            customer: "BMC",
            project: "MilCrunch",
            service: "Anthropic",
            operation,
            model,
            tokensIn: parsed.usage.input_tokens,
            tokensOut: parsed.usage.output_tokens,
            metadata: {
              model: model,
              endpoint: req.url || "/api/anthropic"
            }
          }).catch(err => {
            console.error("[anthropic] Cost tracking error:", err.message);
          });
        }
      } catch (parseError) {
        console.error("[anthropic] Failed to parse response for cost tracking:", parseError.message);
      }
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
