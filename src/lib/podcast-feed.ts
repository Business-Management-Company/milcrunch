/**
 * Fetch parsed podcast episodes from the server-side RSS parser.
 * The API (/api/parse-rss) fetches the feed, parses XML with fast-xml-parser,
 * and returns JSON episodes — no client-side XML parsing needed.
 */

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

export async function parsePodcastFeed(
  feedUrl: string
): Promise<ParsedPodcastFeed | null> {
  console.log("[parsePodcastFeed] Fetching feed:", feedUrl);
  try {
    const proxyUrl = `/api/parse-rss?url=${encodeURIComponent(feedUrl)}`;
    console.log("[parsePodcastFeed] Proxy URL:", proxyUrl);
    const res = await fetch(proxyUrl);
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error("[parsePodcastFeed] API error:", res.status, errorText);
      throw new Error(`RSS API returned ${res.status}`);
    }

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("[parsePodcastFeed] Response is not JSON:", text.slice(0, 200));
      throw new Error("RSS API returned non-JSON response");
    }

    console.log("[parsePodcastFeed] Got response:", {
      episodeCount: data.episodes?.length ?? 0,
      title: data.title,
      error: data.error,
    });

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.episodes || !Array.isArray(data.episodes)) {
      console.error("[parsePodcastFeed] No episodes array in response:", data);
      throw new Error("No episodes found in feed");
    }

    const episodes: ParsedEpisode[] = data.episodes.map((ep: any) => ({
      title: ep.title || "Untitled",
      description: ep.description || "",
      audioUrl: ep.audioUrl || "",
      duration: ep.duration || "",
      publishedAt: ep.pubDate || "",
      artworkUrl: ep.artworkUrl || "",
    }));

    return {
      title: data.title || "",
      description: "",
      author: data.author || "",
      artworkUrl: data.artworkUrl || "",
      websiteUrl: "",
      language: "",
      episodeCount: data.episodeCount || episodes.length,
      lastEpisodeDate: episodes[0]?.publishedAt || "",
      episodes,
    };
  } catch (err) {
    console.error("[parsePodcastFeed] Failed for", feedUrl, err);
    throw err;
  }
}
