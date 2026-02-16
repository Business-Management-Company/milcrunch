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
} from "lucide-react";
import { parsePodcastFeed, type ParsedEpisode } from "@/lib/podcast-feed";
import type { Database } from "@/integrations/supabase/types";

type Podcast = Database["public"]["Tables"]["podcasts"]["Row"];

interface PodcastDetailModalProps {
  podcast: Podcast | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PodcastDetailModal({
  podcast,
  open,
  onOpenChange,
}: PodcastDetailModalProps) {
  const [episodes, setEpisodes] = useState<ParsedEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!open || !podcast?.feed_url) {
      setEpisodes([]);
      setPlayingUrl(null);
      return;
    }
    setLoadingEpisodes(true);
    parsePodcastFeed(podcast.feed_url).then((feed) => {
      setEpisodes(feed?.episodes.slice(0, 20) ?? []);
      setLoadingEpisodes(false);
    });
  }, [open, podcast?.feed_url]);

  useEffect(() => {
    if (!open) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingUrl(null);
    }
  }, [open]);

  function handlePlay(audioUrl: string) {
    if (playingUrl === audioUrl) {
      audioRef.current?.pause();
      setPlayingUrl(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(audioUrl);
    audio.play();
    audio.onended = () => setPlayingUrl(null);
    audioRef.current = audio;
    setPlayingUrl(audioUrl);
  }

  if (!podcast) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        <div className="p-6 pb-4">
          <DialogHeader>
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#c4b5fd] to-[#a78bfa] flex items-center justify-center">
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
                  <span className="inline-block mt-2 rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] px-2.5 py-0.5 text-xs font-medium">
                    {podcast.category}
                  </span>
                )}
                <div className="flex items-center gap-2 mt-3">
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
                        Visit Website
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

        <div className="border-t border-gray-100 px-6 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Recent Episodes
          </p>

          {loadingEpisodes ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading episodes...
            </div>
          ) : episodes.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No episodes available.</p>
          ) : (
            <div className="space-y-2">
              {episodes.map((ep, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-3 flex items-start gap-3"
                >
                  {ep.audioUrl ? (
                    <button
                      type="button"
                      onClick={() => handlePlay(ep.audioUrl)}
                      className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-[#6C5CE7] text-white flex items-center justify-center hover:bg-[#5A4BD1] transition-colors"
                    >
                      {playingUrl === ep.audioUrl ? (
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
                        {stripHtml(ep.description)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {playingUrl && (
          <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-3">
            <audio
              src={playingUrl}
              controls
              autoPlay
              className="w-full h-10"
              style={{
                accentColor: "#6C5CE7",
              }}
              onEnded={() => setPlayingUrl(null)}
              ref={(el) => {
                if (el) audioRef.current = el;
              }}
            />
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

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent ?? html;
}
