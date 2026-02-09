/**
 * Fetch and parse an RSS podcast feed.
 * Tries direct fetch first; falls back to allorigins CORS proxy on failure.
 * Timeout: 10 seconds.
 */

const CORS_PROXY = "https://api.allorigins.win/raw?url=";
const TIMEOUT_MS = 10000;

export interface ParsedEpisode {
  title: string;
  description: string;
  audioUrl: string;
  duration: string;
  publishedAt: string;
  artworkUrl: string;
}

export interface ParsedPodcastFeed {
  title: string;
  description: string;
  author: string;
  artworkUrl: string;
  websiteUrl: string;
  language: string;
  episodeCount: number;
  lastEpisodeDate: string;
  episodes: ParsedEpisode[];
}

function decodeHtmlEntities(text: string): string {
  const doc = new DOMParser().parseFromString(`<div>${text}</div>`, "text/html");
  return doc.documentElement.textContent ?? text;
}

function getText(el: Element | null, tag: string): string {
  if (!el) return "";
  const child = el.getElementsByTagName(tag)[0];
  return child ? decodeHtmlEntities(child.textContent?.trim() ?? "") : "";
}

function getAttr(el: Element | null, tag: string, attr: string): string {
  if (!el) return "";
  const child = el.getElementsByTagName(tag)[0];
  if (!child) return "";
  return child.getAttribute(attr) ?? child.getAttribute(attr.replace("href", "href")) ?? "";
}

// iTunes namespace often used without prefix in RSS
function getItunesOrChannel(el: Document, tag: string): string {
  const channel = el.getElementsByTagName("channel")[0];
  if (!channel) return "";
  const byTag = channel.getElementsByTagName(tag)[0];
  if (byTag) return decodeHtmlEntities(byTag.textContent?.trim() ?? "");
  const itunes = channel.getElementsByTagName("itunes:author")[0]
    ?? channel.querySelector("[*|author]");
  if (tag === "itunes:author" && itunes) return decodeHtmlEntities(itunes.textContent?.trim() ?? "");
  const image = channel.getElementsByTagName("itunes:image")[0] ?? channel.querySelector("[*|image]");
  if (tag === "itunes:image" && image) return image.getAttribute("href") ?? "";
  return "";
}

function getChannelText(doc: Document, tag: string): string {
  const channel = doc.getElementsByTagName("channel")[0];
  if (!channel) return "";
  const el = channel.getElementsByTagName(tag)[0];
  return el ? decodeHtmlEntities(el.textContent?.trim() ?? "") : "";
}

function getChannelAttr(doc: Document, tag: string, attr: string): string {
  const channel = doc.getElementsByTagName("channel")[0];
  if (!channel) return "";
  const el = channel.getElementsByTagName(tag)[0];
  return el?.getAttribute(attr) ?? "";
}

function parseItems(doc: Document, limit: number): ParsedEpisode[] {
  const channel = doc.getElementsByTagName("channel")[0];
  if (!channel) return [];
  const items = channel.getElementsByTagName("item");
  const episodes: ParsedEpisode[] = [];
  for (let i = 0; i < Math.min(items.length, limit); i++) {
    const item = items[i];
    const enclosure = item.getElementsByTagName("enclosure")[0];
    const audioUrl = enclosure?.getAttribute("url") ?? "";
    const title = getText(item, "title");
    const descEl = item.getElementsByTagName("description")[0];
    const description = descEl ? decodeHtmlEntities(descEl.textContent?.trim() ?? "") : "";
    const durationEl = item.getElementsByTagName("duration")[0] ?? item.querySelector("[*|duration]");
    const duration = durationEl ? durationEl.textContent?.trim() ?? "" : "";
    const pubDateEl = item.getElementsByTagName("pubDate")[0];
    const publishedAt = pubDateEl ? pubDateEl.textContent?.trim() ?? "" : "";
    const imageEl = item.getElementsByTagName("itunes:image")[0] ?? item.querySelector("[*|image]");
    const artworkUrl = imageEl?.getAttribute("href") ?? "";
    episodes.push({
      title,
      description,
      audioUrl,
      duration,
      publishedAt,
      artworkUrl,
    });
  }
  return episodes;
}

export async function parsePodcastFeed(feedUrl: string): Promise<ParsedPodcastFeed | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let xml: string;
    try {
      const res = await fetch(feedUrl, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      xml = await res.text();
    } catch (directErr) {
      const proxyUrl = CORS_PROXY + encodeURIComponent(feedUrl);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
      xml = await res.text();
    } finally {
      clearTimeout(timeout);
    }

    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const channel = doc.getElementsByTagName("channel")[0];
    if (!channel) {
      console.error("[parsePodcastFeed] No channel element in feed:", feedUrl);
      return null;
    }

    const title = getChannelText(doc, "title");
    const description = getChannelText(doc, "description");
    const author =
      getChannelText(doc, "itunes:author") ||
      (channel.querySelector("[*|author]")?.textContent?.trim() ?? "");
    let artworkUrl = getChannelAttr(doc, "itunes:image", "href");
    if (!artworkUrl) {
      const img = channel.getElementsByTagName("image")[0];
      const urlEl = img?.getElementsByTagName("url")[0];
      artworkUrl = urlEl?.textContent?.trim() ?? "";
    }
    const websiteUrl = getChannelText(doc, "link");
    const language = getChannelText(doc, "language") || "en";

    const items = channel.getElementsByTagName("item");
    const episodeCount = items.length;
    let lastEpisodeDate = "";
    if (items.length > 0) {
      const first = items[0];
      const pub = first.getElementsByTagName("pubDate")[0];
      if (pub) lastEpisodeDate = pub.textContent?.trim() ?? "";
    }

    const episodes = parseItems(doc, 10);

    return {
      title,
      description,
      author: decodeHtmlEntities(author),
      artworkUrl,
      websiteUrl,
      language,
      episodeCount,
      lastEpisodeDate,
      episodes,
    };
  } catch (err) {
    clearTimeout(timeout);
    console.error("[parsePodcastFeed] Failed for", feedUrl, err);
    return null;
  }
}
