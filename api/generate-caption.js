/**
 * POST /api/generate-caption
 *
 * Dedicated serverless function for AI caption generation.
 * Uses the multi-LLM fallback system (Claude -> OpenAI -> Gemini).
 *
 * Body: { topic: string, platforms: string[], tone?: string }
 * Returns: { caption: string, provider?: string }
 */
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { topic, platforms = ["Instagram"], tone } = req.body || {};

  if (!topic || typeof topic !== "string" || !topic.trim()) {
    return res.status(400).json({ error: "topic is required" });
  }

  const platformList = Array.isArray(platforms) ? platforms.join(", ") : String(platforms);
  const toneNote = tone ? `\nTone: ${tone}` : "";

  const systemPrompt = `You are an expert military social media content creator. Generate engaging, authentic captions optimized for the selected platforms. Include:
- A strong hook in the first line
- Authentic military community voice
- Platform-appropriate length and tone
- 5-10 highly relevant hashtags mixing broad (#military #veteran) and niche (#navylife #milspouse) tags
- A clear call to action
- Emoji where appropriate for the platform
Tailor the content specifically for the platform selected. Return ONLY the caption text, no explanation.`;

  const body = {
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Platform(s): ${platformList}${toneNote}\n\nWrite a caption about: ${topic.trim()}`,
      },
    ],
  };

  try {
    // Lazy-require to catch import errors
    let callWithFallback;
    try {
      ({ callWithFallback } = require("./_lib/ai-fallback"));
    } catch (importErr) {
      console.error("[generate-caption] FAILED to import ai-fallback:", importErr.message);
      // Fall back to direct Claude call
      return await directCaptionCall(body, res);
    }

    const result = await callWithFallback(body);

    if (result._allFailed) {
      return res.status(503).json({
        error: "AI caption generation is temporarily unavailable. Please try again.",
        caption: "",
      });
    }

    const caption = result.content?.[0]?.text ?? "";
    const provider = result._provider || "claude";

    res.setHeader("x-ai-provider", provider);
    return res.status(200).json({ caption, provider });
  } catch (e) {
    console.error("[generate-caption] TOP LEVEL ERROR:", e.message, e.stack);
    return res.status(500).json({ error: e.message });
  }
};

/** Emergency fallback — direct Claude if ai-fallback module fails */
async function directCaptionCall(body, res) {
  const key = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || "";
  if (!key) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured", caption: "" });
  }

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key.replace(/^["' ]+|["' ]+$/g, "").trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return res.status(resp.status).json({ error: `Anthropic API error (${resp.status})`, caption: "" });
    }

    const data = await resp.json();
    const caption = data.content?.[0]?.text ?? "";
    return res.status(200).json({ caption });
  } catch (e) {
    return res.status(502).json({ error: "Failed to reach Anthropic API", caption: "" });
  }
}
