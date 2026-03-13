/**
 * Cost Tracker for MilCrunch
 * Logs API costs to OpenClaw cost tracking endpoint
 */

const COST_TRACKER_ENDPOINT = process.env.COST_TRACKER_ENDPOINT || 
  "https://openclaw.podlogix.co:40491/api/log-cost";

const COST_TRACKER_TOKEN = process.env.COST_TRACKER_TOKEN || "";

// Anthropic pricing (per 1M tokens)
const PRICING = {
  "claude-haiku-4-5": { input: 0.25, output: 1.25 },
  "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
  "claude-opus-4-6": { input: 15.0, output: 75.0 },
  "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0 }, // Map versioned model to base pricing
};

function calculateCost(model, inputTokens, outputTokens) {
  // Extract base model name
  const baseModel = model.includes("haiku") ? "claude-haiku-4-5" :
                    model.includes("opus") ? "claude-opus-4-6" :
                    "claude-sonnet-4-5"; // default to sonnet
  
  const pricing = PRICING[baseModel];
  if (!pricing) {
    console.warn(`[cost-tracker] Unknown model pricing: ${model}, using Sonnet rates`);
    return (inputTokens / 1_000_000) * 3.0 + (outputTokens / 1_000_000) * 15.0;
  }
  
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

async function logCost({
  customer = "BMC",
  project = "MilCrunch",
  service = "Anthropic",
  operation,
  model,
  tokensIn,
  tokensOut,
  metadata = {}
}) {
  const cost = calculateCost(model, tokensIn, tokensOut);
  
  const payload = {
    customer,
    project,
    service,
    operation,
    cost,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    metadata: {
      model,
      ...metadata
    }
  };
  
  try {
    // Log locally for debugging
    console.log(`[cost-tracker] ${customer}/${project} - ${operation}: $${cost.toFixed(6)} (${tokensIn}+${tokensOut} tokens)`);
    
    // Skip remote logging if no endpoint configured (local dev)
    if (!COST_TRACKER_ENDPOINT || COST_TRACKER_ENDPOINT.includes("localhost")) {
      console.log("[cost-tracker] Skipping remote log (no endpoint configured)");
      return { success: true, cost, local: true };
    }
    
    // Send to cost tracking endpoint
    const response = await fetch(COST_TRACKER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(COST_TRACKER_TOKEN && { "Authorization": `Bearer ${COST_TRACKER_TOKEN}` })
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.error(`[cost-tracker] Failed to log cost: ${response.status} ${response.statusText}`);
      return { success: false, cost, error: response.statusText };
    }
    
    return { success: true, cost };
  } catch (error) {
    console.error("[cost-tracker] Error logging cost:", error.message);
    return { success: false, cost, error: error.message };
  }
}

module.exports = { logCost, calculateCost };
