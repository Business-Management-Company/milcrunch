module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url parameter" });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MilCrunch/1.0 Podcast Player",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "RSS feed returned " + response.status, episodes: [] });
    }

    const xml = await response.text();

    // Helper: extract tag content, stripping CDATA wrappers
    function getTag(block, tag) {
      // Try namespace-prefixed first (itunes:duration, content:encoded, etc.)
      const re = new RegExp(
        "<" + tag + "[^>]*>([\\s\\S]*?)<\\/" + tag + ">",
        "i"
      );
      const match = block.match(re);
      if (!match) return "";
      return match[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .trim();
    }

    // Helper: extract attribute from a self-closing or open tag
    function getAttr(block, tag, attr) {
      const re = new RegExp("<" + tag + "\\s[^>]*?" + attr + '=["\']([^"\']*)["\']', "i");
      const match = block.match(re);
      return match ? match[1] : "";
    }

    // Extract items (RSS <item> or Atom <entry>)
    const itemMatches =
      xml.match(/<item[\s\S]*?<\/item>/gi) ||
      xml.match(/<entry[\s\S]*?<\/entry>/gi) ||
      [];

    const episodes = [];
    const limit = Math.min(itemMatches.length, 20);

    for (let i = 0; i < limit; i++) {
      const item = itemMatches[i];

      const title = getTag(item, "title");

      // Description: prefer content:encoded, then description, then itunes:summary
      let description =
        getTag(item, "content:encoded") ||
        getTag(item, "description") ||
        getTag(item, "itunes:summary") ||
        "";
      // Strip HTML tags
      description = description.replace(/<[^>]+>/g, "").trim();
      if (description.length > 300) {
        description = description.substring(0, 300) + "...";
      }

      const pubDate = getTag(item, "pubDate") || getTag(item, "published") || "";

      const duration = getTag(item, "itunes:duration") || "";

      // Audio URL: try enclosure url attr, then media:content url attr
      const audioUrl =
        getAttr(item, "enclosure", "url") ||
        getAttr(item, "media:content", "url") ||
        "";

      // Episode artwork
      const artworkUrl =
        getAttr(item, "itunes:image", "href") ||
        getAttr(item, "media:thumbnail", "url") ||
        "";

      episodes.push({
        title: title || "Untitled",
        description,
        audioUrl,
        pubDate,
        duration: String(duration),
        artworkUrl,
      });
    }

    // Channel-level metadata
    // Get the channel block (everything before the first <item>)
    const channelBlock = xml.split(/<item[\s>]/i)[0] || xml;
    const feedTitle = getTag(channelBlock, "title");
    const feedAuthor = getTag(channelBlock, "itunes:author");
    const feedArtwork =
      getAttr(channelBlock, "itunes:image", "href") ||
      getTag(channelBlock, "image>\\s*<url") || // nested <image><url>...</url></image>
      "";

    // Try to get image URL from <image><url>...</url></image> pattern
    let channelImageUrl = feedArtwork;
    if (!channelImageUrl) {
      const imageBlock = channelBlock.match(/<image[\s\S]*?<\/image>/i);
      if (imageBlock) {
        channelImageUrl = getTag(imageBlock[0], "url");
      }
    }

    res
      .setHeader("Content-Type", "application/json; charset=utf-8")
      .setHeader(
        "Cache-Control",
        "public, s-maxage=3600, stale-while-revalidate=600"
      )
      .status(200)
      .json({
        title: feedTitle,
        author: feedAuthor,
        artworkUrl: channelImageUrl,
        episodeCount: itemMatches.length,
        episodes,
      });
  } catch (err) {
    console.error("[parse-rss] Error:", err.message);
    return res
      .status(502)
      .json({ error: "Failed to fetch or parse RSS feed", episodes: [] });
  }
}
