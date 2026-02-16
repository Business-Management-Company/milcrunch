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
  try {
    const proxyUrl = `/api/parse-rss?url=${encodeURIComponent(feedUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) {
      console.error("[parsePodcastFeed] API error:", res.status);
      return null;
    }

    const data = await res.json();

    if (!data.episodes || !Array.isArray(data.episodes)) {
      console.error("[parsePodcastFeed] No episodes array in response");
      return null;
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
    return null;
  }
}
