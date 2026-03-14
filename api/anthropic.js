const { logCost } = require("./_lib/cost-tracker");
const { callWithFallback } = require("./_lib/ai-fallback");

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

  try {
    const result = await callWithFallback(req.body);

    // Set provider header so frontend can show which AI responded
    const provider = result._provider || "claude";
    const service = result._service || "Anthropic";
    res.setHeader("x-ai-provider", provider);

    // Log cost
    if (result.usage && result.usage.input_tokens && result.usage.output_tokens) {
      const model = result.model || req.body.model || "claude-sonnet-4-5";

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

      logCost({
        customer: "BMC",
        project: "MilCrunch",
        service,
        operation,
        model,
        tokensIn: result.usage.input_tokens,
        tokensOut: result.usage.output_tokens,
        metadata: {
          model,
          provider,
          endpoint: req.url || "/api/anthropic",
        },
      }).catch((err) => {
        console.error("[anthropic] Cost tracking error:", err.message);
      });
    }

    // Return all-failed as 503
    if (result._allFailed) {
      return res.status(503).setHeader("Content-Type", "application/json").json(result);
    }

    // Strip internal fields before sending to client
    const { _service, _allFailed, _errors, ...clientData } = result;
    res.status(200).setHeader("Content-Type", "application/json").json(clientData);
  } catch (e) {
    console.error("[anthropic] Proxy error:", e.message);
    res.status(502).json({ error: "AI proxy error", message: e.message });
  }
};
