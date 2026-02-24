import { useState, useEffect } from "react";
import {
  Eye,
  Clock,
  Mic,
  Video,
  ScreenShare,
  Settings,
  Square,
  Sparkles,
  Monitor,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Platform SVG icons (inline for reliability)
function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

export default function StreamingStudioMockup() {
  const [elapsed, setElapsed] = useState(0);

  // Animate the duration counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const h = Math.floor(elapsed / 3600).toString().padStart(2, "0");
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, "0");
  const s = (elapsed % 60).toString().padStart(2, "0");
  const duration = `${h}:${m}:${s}`;

  return (
    <div className="space-y-3">
      {/* Preview label */}
      <div className="flex items-center gap-2">
        <Monitor className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
          Streaming Interface Preview
        </span>
        <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400">
          DEMO
        </Badge>
      </div>

      {/* Main broadcast frame */}
      <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-blue-900/20 border-2 border-gray-800 dark:border-gray-700 bg-gray-900">
        {/* Video feed */}
        <div className="relative aspect-video">
          <img
            src="/streaming/mic-2025-panel.jpg"
            alt="MIC 2025 Military Influencer Conference - Live Panel"
            className="w-full h-full object-cover"
          />

          {/* Dark gradient overlays for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />

          {/* TOP LEFT: LIVE badge + event title */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-md shadow-lg shadow-red-600/40">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-bold tracking-wider">LIVE</span>
            </div>
            <div className="bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md">
              <span className="text-white/90 text-xs font-medium">MIC 2025 — Main Stage Panel</span>
            </div>
          </div>

          {/* TOP RIGHT: Viewer count + Duration */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md">
              <Eye className="w-3.5 h-3.5 text-white/80" />
              <span className="text-white text-xs font-medium">1,247 watching</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md">
              <Clock className="w-3.5 h-3.5 text-white/80" />
              <span className="text-white text-xs font-mono font-medium">{duration}</span>
            </div>
          </div>

          {/* BOTTOM LEFT: Lower third / event info */}
          <div className="absolute bottom-14 sm:bottom-16 left-3 sm:left-4">
            <div className="bg-gradient-to-r from-[#000741] to-[#0064B1] px-3 py-1.5 rounded-md shadow-lg">
              <p className="text-white text-[10px] uppercase tracking-widest font-medium opacity-80">
                Military Influencer Conference
              </p>
              <p className="text-white text-sm font-bold">
                Women in Military Media — Panel Discussion
              </p>
            </div>
          </div>

          {/* BOTTOM RIGHT: Streaming platforms */}
          <div className="absolute bottom-14 sm:bottom-16 right-3 sm:right-4 flex items-center gap-1.5">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-md">
              <span className="text-[10px] text-white/60 font-medium uppercase tracking-wide mr-0.5">Streaming to</span>
              <YoutubeIcon className="w-4 h-4 text-red-500" />
              <FacebookIcon className="w-4 h-4 text-blue-500" />
              <InstagramIcon className="w-4 h-4 text-pink-500" />
            </div>
          </div>

          {/* BOTTOM: Controls bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm px-3 sm:px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80">
                <Mic className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80">
                <Video className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80">
                <ScreenShare className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80">
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* AI Production indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/60">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>AI Production <span className="text-green-400 font-medium">Active</span></span>
            </div>

            <button className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors">
              <Square className="w-3 h-3" />
              End Stream
            </button>
          </div>
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Preview of the MilCrunch multi-platform streaming interface — stream to YouTube, Facebook & Instagram simultaneously with AI-powered production.
      </p>
    </div>
  );
}
