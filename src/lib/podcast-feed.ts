/**
 * Fetch parsed podcast episodes from the server-side RSS parser.
 * The API (/api/podcast-rss) fetches the feed, parses XML,
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
  rssUrl: string
): Promise<ParsedPodcastFeed | null> {
  try {
    const proxyUrl = `/api/podcast-rss?url=${encodeURIComponent(rssUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let parsed: any = {};
      try { parsed = JSON.parse(errorText); } catch {}
      const msg = parsed.timeout
        ? "Feed timed out"
        : `RSS API returned ${res.status}`;
      const err = new Error(msg);
      (err as any).timeout = !!parsed.timeout;
      throw err;
    }

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("RSS API returned non-JSON response");
    }

    if (data.error) {
      const err = new Error(data.error);
      (err as any).timeout = !!data.timeout;
      throw err;
    }

    if (!data.episodes || !Array.isArray(data.episodes)) {
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
    console.error("[parsePodcastFeed] Failed for", rssUrl, err);
    throw err;
  }
}
