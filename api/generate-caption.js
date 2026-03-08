/**
 * POST /api/generate-caption
 *
 * Dedicated serverless function for AI caption generation.
 * Reads ANTHROPIC_API_KEY from server-side env (not exposed to client).
 *
 * Body: { topic: string, platforms: string[], tone?: string }
 * Returns: { caption: string }
 */
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error("[generate-caption] ANTHROPIC_API_KEY is not set");
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
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
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.error(`[generate-caption] Anthropic returned ${resp.status}:`, errText);
      return res.status(resp.status).json({
        error: `Anthropic API error (${resp.status})`,
        detail: errText,
      });
    }

    const data = await resp.json();
    const caption = data.content?.[0]?.text ?? "";

    return res.status(200).json({ caption });
  } catch (e) {
    console.error("[generate-caption] Fetch error:", e.message);
    return res.status(502).json({ error: "Failed to reach Anthropic API", message: e.message });
  }
}
