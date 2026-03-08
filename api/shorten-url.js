/**
 * Vercel serverless proxy for TinyURL shortening API.
 * Avoids CORS issues when calling from the browser.
 *
 * POST /api/shorten-url
 *   body: { url: "https://example.com/long-url" }
 *   returns: { short: "https://tinyurl.com/abc123" }
 */
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { url } = req.body || {};
  if (!url) {
    return res.status(400).json({ error: "Missing 'url' field" });
  }

  try {
    const response = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
    );
    const short = await response.text();

    if (!short.startsWith("http")) {
      return res.status(502).json({ error: "TinyURL returned unexpected response", raw: short });
    }

    return res.status(200).json({ short: short.trim() });
  } catch (err) {
    console.error("[shorten-url] error:", err.message);
    return res.status(502).json({ error: `Shortener failed: ${err.message}` });
  }
}
