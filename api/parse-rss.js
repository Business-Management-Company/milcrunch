import { XMLParser } from "fast-xml-parser";

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

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      isArray: (name) => name === "item",
    });

    const parsed = parser.parse(xml);
    const channel =
      parsed?.rss?.channel || parsed?.feed || parsed?.["rdf:RDF"]?.channel;

    if (!channel) {
      return res.status(422).json({ error: "No channel found in feed" });
    }

    const items = channel.item || [];
    const limit = Math.min(items.length, 20);
    const episodes = [];

    for (let i = 0; i < limit; i++) {
      const item = items[i];
      if (!item) continue;

      const enclosure = item.enclosure || {};
      const audioUrl =
        enclosure["@_url"] ||
        item["media:content"]?.["@_url"] ||
        "";

      const title =
        (typeof item.title === "object" ? item.title?.["#text"] : item.title) ||
        "Untitled";

      let description = "";
      const descRaw =
        item["content:encoded"] ||
        item.description ||
        item["itunes:summary"] ||
        "";
      if (typeof descRaw === "object") {
        description = descRaw["#text"] || "";
      } else {
        description = descRaw;
      }
      // Strip HTML tags for clean text
      description = description.replace(/<[^>]*>/g, "").trim();
      // Truncate to 300 chars
      if (description.length > 300) {
        description = description.slice(0, 300) + "...";
      }

      const pubDate = item.pubDate || item.published || "";
      const duration = item["itunes:duration"] || "";
      const artworkUrl =
        item["itunes:image"]?.["@_href"] ||
        item["media:thumbnail"]?.["@_url"] ||
        "";

      episodes.push({
        title,
        description,
        audioUrl,
        pubDate: typeof pubDate === "object" ? pubDate["#text"] || "" : pubDate,
        duration: typeof duration === "object" ? duration["#text"] || "" : String(duration),
        artworkUrl,
      });
    }

    // Also extract channel-level metadata
    const feedTitle =
      (typeof channel.title === "object"
        ? channel.title?.["#text"]
        : channel.title) || "";
    const feedAuthor = channel["itunes:author"] || "";
    const feedArtwork =
      channel["itunes:image"]?.["@_href"] ||
      channel.image?.url ||
      "";

    res
      .setHeader("Content-Type", "application/json; charset=utf-8")
      .setHeader(
        "Cache-Control",
        "public, s-maxage=3600, stale-while-revalidate=600"
      )
      .status(200)
      .json({
        title: feedTitle,
        author: typeof feedAuthor === "object" ? feedAuthor["#text"] || "" : feedAuthor,
        artworkUrl: feedArtwork,
        episodeCount: items.length,
        episodes,
      });
  } catch (err) {
    console.error("[parse-rss] Error:", err.message);
    return res.status(502).json({ error: "Failed to fetch or parse RSS feed" });
  }
}
