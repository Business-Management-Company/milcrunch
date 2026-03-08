module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key =
    process.env.OPENAI_API_KEY ||
    process.env.VITE_OPENAI_API_KEY;

  if (!key) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  const { prompt, size = "1792x1024", quality = "standard" } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ error: "prompt is required" });
  }

  try {
    const resp = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size,
        quality,
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("[openai-image] API error:", data);
      return res.status(resp.status).json({
        error: data.error?.message || "Image generation failed",
      });
    }

    return res.status(200).json({
      url: data.data?.[0]?.url,
      revised_prompt: data.data?.[0]?.revised_prompt,
    });
  } catch (e) {
    console.error("[openai-image] Exception:", e.message);
    return res.status(502).json({ error: "OpenAI proxy error", message: e.message });
  }
}
