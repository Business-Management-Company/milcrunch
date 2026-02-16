export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const feedUrl = req.query.url;
  if (!feedUrl) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "RecurrentX/1.0 Podcast Feed Parser",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Feed returned ${response.status}` });
    }

    const xml = await response.text();

    res
      .setHeader("Content-Type", "text/xml; charset=utf-8")
      .setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=600")
      .status(200)
      .send(xml);
  } catch (err) {
    console.error("[parse-rss] Error fetching feed:", err.message);
    return res.status(502).json({ error: "Failed to fetch RSS feed" });
  }
}
