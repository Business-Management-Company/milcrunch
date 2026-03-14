/**
 * POST /api/generate-caption
 *
 * Dedicated serverless function for AI caption generation.
 * Uses the multi-LLM fallback system (Claude -> OpenAI -> Gemini).
 *
 * Body: { topic: string, platforms: string[], tone?: string }
 * Returns: { caption: string, provider?: string }
 */
const { callWithFallback } = require("./_lib/ai-fallback");

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
    console.error("[generate-caption] Error:", e.message);
    return res.status(502).json({ error: "Failed to generate caption", message: e.message });
  }
};
