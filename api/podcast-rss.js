module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url parameter", episodes: [] });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

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

    // Extract tag content, stripping CDATA wrappers
    function getTag(block, tag) {
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

    // Extract attribute from a tag
    function getAttr(block, tag, attr) {
      const re = new RegExp(
        "<" + tag + "\\s[^>]*?" + attr + '=["\']([^"\']*)["\']',
        "i"
      );
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

      let description =
        getTag(item, "content:encoded") ||
        getTag(item, "description") ||
        getTag(item, "itunes:summary") ||
        "";
      description = description.replace(/<[^>]+>/g, "").trim();
      if (description.length > 300) {
        description = description.substring(0, 300) + "...";
      }

      const pubDate =
        getTag(item, "pubDate") || getTag(item, "published") || "";

      const duration = getTag(item, "itunes:duration") || "";

      // Audio URL from <enclosure url="..."> or <media:content url="...">
      const audioUrl =
        getAttr(item, "enclosure", "url") ||
        getAttr(item, "media:content", "url") ||
        "";

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
    const channelBlock = xml.split(/<item[\s>]/i)[0] || xml;
    const feedTitle = getTag(channelBlock, "title");
    const feedAuthor = getTag(channelBlock, "itunes:author");
    let channelImageUrl =
      getAttr(channelBlock, "itunes:image", "href") || "";
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
    const isTimeout =
      err.name === "AbortError" || err.message?.includes("abort");
    console.error("[podcast-rss] Error:", err.message);
    return res.status(isTimeout ? 504 : 502).json({
      error: isTimeout
        ? "Feed timed out after 5 seconds"
        : "Failed to fetch or parse RSS feed",
      timeout: isTimeout,
      episodes: [],
    });
  }
}
