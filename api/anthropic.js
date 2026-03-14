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
    // Lazy-require to catch import errors inside the handler
    let callWithFallback, logCost;
    try {
      ({ callWithFallback } = require("./_lib/ai-fallback"));
      console.log("[anthropic] ai-fallback module loaded OK");
    } catch (importErr) {
      console.error("[anthropic] FAILED to import ai-fallback:", importErr.message, importErr.stack);
      // Fall back to direct Claude call if the fallback module is broken
      return await directClaudeCall(req, res);
    }
    try {
      ({ logCost } = require("./_lib/cost-tracker"));
    } catch (importErr) {
      console.warn("[anthropic] cost-tracker import failed (non-fatal):", importErr.message);
      logCost = () => Promise.resolve(); // no-op
    }

    const result = await callWithFallback(req.body);

    // Set provider header so frontend can show which AI responded
    const provider = result._provider || "claude";
    const service = result._service || "Anthropic";
    res.setHeader("x-ai-provider", provider);

    // Log cost
    if (result.usage && result.usage.input_tokens && result.usage.output_tokens) {
      const model = result.model || req.body.model || "claude-sonnet-4-5";

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
        metadata: { model, provider, endpoint: req.url || "/api/anthropic" },
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
  } catch (err) {
    console.error("[anthropic] TOP LEVEL ERROR:", err.message, err.stack);
    res.status(500).json({ error: err.message, stack: err.stack?.split("\n").slice(0, 5) });
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
