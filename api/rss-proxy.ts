/**
 * CORS proxy for RSS feeds. Browser cannot fetch arbitrary RSS URLs due to CORS.
 * GET /api/rss-proxy?url=<encoded feed URL>
 */
export default async function handler(
  req: { method?: string; query?: { url?: string } },
  res: { setHeader: (k: string, v: string) => void; status: (n: number) => { send: (b: string) => void; json: (b: object) => void }; send: (b: string) => void; json: (b: object) => void }
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const url = typeof req.query?.url === "string" ? req.query.url : null;
  if (!url) {
    return res.status(400).json({ error: "Missing url query parameter" });
  }
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "MilCrunch-RSS-Proxy/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return res.status(response.status).send(`Upstream error: ${response.status}`);
    }
    const xml = await response.text();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).send(xml);
  } catch (err) {
    console.error("[rss-proxy] Failed to fetch:", url, err);
    res.status(502).json({ error: "Failed to fetch feed" });
  }
}
