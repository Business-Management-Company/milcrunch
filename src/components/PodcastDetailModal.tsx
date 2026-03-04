import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Mic2,
  ExternalLink,
  Play,
  Pause,
  Loader2,
  Volume2,
  AlertCircle,
  Headphones,
} from "lucide-react";
import { parsePodcastFeed, type ParsedEpisode } from "@/lib/podcast-feed";
import type { Database } from "@/integrations/supabase/types";

type Podcast = Database["public"]["Tables"]["podcasts"]["Row"];

interface PodcastDetailModalProps {
  podcast: Podcast | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Detect listening platform from a URL */
function detectPlatform(url: string): { name: string; color: string } | null {
  const lower = url.toLowerCase();
  if (lower.includes("apple.com") || lower.includes("itunes.apple"))
    return { name: "Apple Podcasts", color: "bg-[#872EC4] hover:bg-[#6e25a0]" };
  if (lower.includes("spotify.com"))
    return { name: "Spotify", color: "bg-[#1DB954] hover:bg-[#1aa34a]" };
  if (lower.includes("amazon.com") || lower.includes("audible.com") || lower.includes("music.amazon"))
    return { name: "Amazon", color: "bg-[#FF9900] hover:bg-[#e68a00]" };
  if (lower.includes("youtube.com") || lower.includes("youtu.be"))
    return { name: "YouTube", color: "bg-[#FF0000] hover:bg-[#cc0000]" };
  if (lower.includes("iheart.com"))
    return { name: "iHeart", color: "bg-[#C6002B] hover:bg-[#a30024]" };
  return null;
}

export default function PodcastDetailModal({
  podcast,
  open,
  onOpenChange,
}: PodcastDetailModalProps) {
  const [episodes, setEpisodes] = useState<ParsedEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasFeed = !!(podcast?.rss_url);

  useEffect(() => {
    if (!open || !podcast) {
      setEpisodes([]);
      setPlayingIndex(null);
      setFetchError(null);
      return;
    }

    if (!podcast.rss_url) {
      // No RSS feed — don't try to load episodes
      setEpisodes([]);
      setFetchError(null);
      return;
    }

    setLoadingEpisodes(true);
    setFetchError(null);
    parsePodcastFeed(podcast.rss_url)
      .then((feed) => {
        setEpisodes(feed?.episodes.slice(0, 20) ?? []);
        if (feed && feed.episodes.length === 0) {
          setFetchError("Feed loaded but contains no episodes.");
        }
        setLoadingEpisodes(false);
      })
      .catch((err) => {
        console.error("[PodcastModal] Feed fetch failed:", err);
        setFetchError(err?.message || "Failed to load episodes.");
        setEpisodes([]);
        setLoadingEpisodes(false);
      });
  }, [open, podcast?.rss_url]);

  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingIndex(null);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [open]);

  function handlePlay(index: number) {
    const ep = episodes[index];
    if (!ep?.audioUrl) return;

    if (playingIndex === index) {
      if (audioRef.current?.paused) {
        audioRef.current.play();
      } else {
        audioRef.current?.pause();
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
    }

    const audio = new Audio(ep.audioUrl);
    audio.volume = volume;
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onended = () => {
      setPlayingIndex(null);
      setCurrentTime(0);
      setDuration(0);
    };
    audio.play().catch(() => {});
    audioRef.current = audio;
    setPlayingIndex(index);
    setCurrentTime(0);
    setDuration(0);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  }

  function handleVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const vol = Number(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  }

  function isPlaying(index: number) {
    return playingIndex === index && audioRef.current && !audioRef.current.paused;
  }

  if (!podcast) return null;

  const nowPlaying = playingIndex !== null ? episodes[playingIndex] : null;
  const platformInfo = podcast.website_url ? detectPlatform(podcast.website_url) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        <div className="p-6 pb-4">
          <DialogHeader>
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#93c5fd] to-[#3b82f6] flex items-center justify-center">
                {(podcast.image_url || podcast.artwork_url) ? (
                  <img
                    src={(podcast.image_url || podcast.artwork_url)!}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }}
                  />
                ) : null}
                <Mic2 className={`h-10 w-10 text-white/80 ${(podcast.image_url || podcast.artwork_url) ? "hidden" : ""}`} />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-bold text-[#000741] leading-tight">
                  {podcast.title ?? "Untitled"}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  {podcast.author ?? "Unknown host"}
                </DialogDescription>
                {podcast.category && (
                  <span className="inline-block mt-2 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] px-2.5 py-0.5 text-xs font-medium">
                    {podcast.category}
                  </span>
                )}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {podcast.website_url && (
                    <a
                      href={podcast.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs gap-1.5"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {platformInfo ? `Listen on ${platformInfo.name}` : "Visit Website"}
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          {podcast.description && (
            <p className="text-sm text-gray-600 mt-4 leading-relaxed line-clamp-4">
              {podcast.description}
            </p>
          )}
        </div>

        {/* Platform-only podcast (no RSS feed) */}
        {!hasFeed && (
          <div className="border-t border-gray-100 px-6 py-8">
            <div className="text-center">
              <Headphones className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600 mb-1">
                This podcast is available on external platforms
              </p>
              <p className="text-xs text-gray-400 mb-5">
                Episodes are not available for in-app playback
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {podcast.website_url && (
                  <a href={podcast.website_url} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="sm"
                      className={`rounded-lg text-xs gap-1.5 text-white ${platformInfo?.color || "bg-[#1e3a5f] hover:bg-[#2d5282]"}`}
                    >
                      <Headphones className="h-3.5 w-3.5" />
                      {platformInfo ? `Listen on ${platformInfo.name}` : "Listen Now"}
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RSS-based podcast with episode player */}
        {hasFeed && (
          <div className="border-t border-gray-100 px-6 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Recent Episodes
            </p>

            {loadingEpisodes ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading episodes...
              </div>
            ) : fetchError ? (
              <div className="py-4 space-y-3">
                <div className="flex items-start gap-2 px-3 py-3 rounded-lg bg-amber-50 border border-amber-100">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-700">Episodes unavailable — try listening on:</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {podcast.title && (
                    <>
                      <a
                        href={`https://podcasts.apple.com/search?term=${encodeURIComponent(podcast.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" className="rounded-lg text-xs gap-1.5 bg-[#872EC4] hover:bg-[#6e25a0] text-white">
                          <Headphones className="h-3.5 w-3.5" />
                          Apple Podcasts
                        </Button>
                      </a>
                      <a
                        href={`https://open.spotify.com/search/${encodeURIComponent(podcast.title)}/shows`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" className="rounded-lg text-xs gap-1.5 bg-[#1DB954] hover:bg-[#1aa34a] text-white">
                          <Headphones className="h-3.5 w-3.5" />
                          Spotify
                        </Button>
                      </a>
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(podcast.title + " podcast")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" className="rounded-lg text-xs gap-1.5 bg-[#FF0000] hover:bg-[#cc0000] text-white">
                          <Headphones className="h-3.5 w-3.5" />
                          YouTube
                        </Button>
                      </a>
                    </>
                  )}
                  {podcast.website_url && (
                    <a href={podcast.website_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="rounded-lg text-xs gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Website
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ) : episodes.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No episodes available.</p>
            ) : (
              <div className="space-y-2">
                {episodes.map((ep, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 flex items-start gap-3 transition-colors ${
                      playingIndex === i
                        ? "border-[#1e3a5f]/30 bg-[#1e3a5f]/5"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    {ep.audioUrl ? (
                      <button
                        type="button"
                        onClick={() => handlePlay(i)}
                        className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center hover:bg-[#2d5282] transition-colors"
                      >
                        {isPlaying(i) ? (
                          <Pause className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="h-3.5 w-3.5 ml-0.5" />
                        )}
                      </button>
                    ) : (
                      <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <Mic2 className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#000741] line-clamp-2">
                        {ep.title || "Untitled Episode"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {ep.publishedAt && (
                          <span className="text-xs text-gray-400">
                            {formatDate(ep.publishedAt)}
                          </span>
                        )}
                        {ep.duration && (
                          <span className="text-xs text-gray-400">
                            · {ep.duration}
                          </span>
                        )}
                      </div>
                      {ep.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {ep.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {nowPlaying && (
          <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-3 space-y-2">
            <p className="text-xs font-medium text-[#1e3a5f] truncate">
              {nowPlaying.title}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handlePlay(playingIndex!)}
                className="shrink-0 w-7 h-7 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center hover:bg-[#2d5282] transition-colors"
              >
                {isPlaying(playingIndex!) ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3 ml-0.5" />
                )}
              </button>
              <span className="text-[10px] text-gray-400 w-10 text-right tabular-nums shrink-0">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 accent-[#1e3a5f] cursor-pointer"
              />
              <span className="text-[10px] text-gray-400 w-10 tabular-nums shrink-0">
                {formatTime(duration)}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Volume2 className="h-3.5 w-3.5 text-gray-400" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={handleVolume}
                  className="w-16 h-1 accent-[#1e3a5f] cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
