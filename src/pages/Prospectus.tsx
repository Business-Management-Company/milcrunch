import { useState, useEffect, useRef } from "react";
import {
  Lock, Play, Share2, Check, Calendar, Users, Video,
  ArrowRight, Mail, Loader2, Sun, Moon, Monitor,
  CheckCircle2, Smartphone, DollarSign, BookOpen,
  Settings, X, Save, Upload, Trash2, ImageIcon, Plus, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import FinancialModelTab from "@/components/prospectus/FinancialModelTab";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const SESSION_KEY = "prospectus_access";
const THEME_KEY = "prospectus_theme";

const TABS = [
  "Overview",
  "Events & Attendee App",
  "MilCrunch Experience",
  "Discovery",
  "Verification",
  "365 Insights",
  "Streaming/Media",
  "Partnership Model",
  "Financial Model",
] as const;

type TabId = (typeof TABS)[number];

/** Abbreviated labels so all tabs fit on one line */
const TAB_LABELS: Record<TabId, string> = {
  "Overview": "Overview",
  "Events & Attendee App": "Events & App",
  "MilCrunch Experience": "Experience",
  "Discovery": "Discovery",
  "Verification": "Verification",
  "365 Insights": "365 Insights",
  "Streaming/Media": "Streaming",
  "Partnership Model": "Partnership",
  "Financial Model": "Financials",
};


const SAAS_ROWS = [
  { tool: "Event Management Platform", cost: 500, replaces: "Event Management" },
  { tool: "Creator Discovery & Management", cost: 800, replaces: "Creator Discovery" },
  { tool: "Live Streaming Tools", cost: 50, replaces: "Live Streaming" },
  { tool: "Registration & Forms", cost: 50, replaces: "Registration Forms" },
  { tool: "Social Monitoring & Analytics", cost: 300, replaces: "Social Monitoring" },
  { tool: "Email & Outreach Platform", cost: 100, replaces: "Email & Outreach" },
  { tool: "Manual Creator Verification", cost: 2000, replaces: "Military ID Verification" },
];

const TAB_KB_CATEGORY: Record<string, string> = {
  "Events & Attendee App": "events-pdx",
  "MilCrunch Experience": "events-pdx",
  "Discovery": "creator-network",
  "365 Insights": "365-insights",
  "Streaming/Media": "streaming-media",
  "Partnership Model": "sponsorship-revenue",
};

/* ------------------------------------------------------------------ */
/* Video helpers                                                       */
/* ------------------------------------------------------------------ */

type VideoUrls = Record<string, string>;

function parseVideoEmbed(url: string): { type: "youtube" | "vimeo" | "mp4"; embedUrl: string } | null {
  if (!url?.trim()) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0` };
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) return { type: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  if (/\.mp4(\?|$)/i.test(url) || /\.webm(\?|$)/i.test(url)) return { type: "mp4", embedUrl: url };
  return null;
}

/** Returns "video", "image", or "none" for a given tab's media */
function getMediaType(videoUrl?: string, imageUrl?: string): "video" | "image" | "none" {
  if (videoUrl && parseVideoEmbed(videoUrl)) return "video";
  if (imageUrl) return "image";
  return "none";
}

function ProspectusMedia({
  videoUrl,
  imageUrl,
  dark,
  isSuperAdmin,
  onVideoEnded,
}: {
  videoUrl?: string;
  imageUrl?: string;
  dark: boolean;
  isSuperAdmin: boolean;
  onVideoEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // MP4 ended event
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !onVideoEnded) return;
    const handler = () => onVideoEnded();
    el.addEventListener("ended", handler);
    return () => el.removeEventListener("ended", handler);
  }, [onVideoEnded]);

  // YouTube postMessage API — listen for state change "ended" (state === 0)
  useEffect(() => {
    if (!onVideoEnded || !videoUrl) return;
    const parsed = parseVideoEmbed(videoUrl);
    if (!parsed || parsed.type === "mp4") return;

    const handler = (e: MessageEvent) => {
      try {
        // YouTube sends JSON with event "onStateChange", info.playerState 0 = ended
        if (typeof e.data === "string") {
          const msg = JSON.parse(e.data);
          if (msg.event === "onStateChange" && msg.info === 0) {
            onVideoEnded();
          }
        }
        // Vimeo sends JSON with event "ended"
        if (typeof e.data === "string") {
          const msg = JSON.parse(e.data);
          if (msg.event === "ended" || msg.method === "ended") {
            onVideoEnded();
          }
        }
      } catch {
        // Not a JSON message, ignore
      }
    };
    window.addEventListener("message", handler);

    // Enable YouTube JS API and Vimeo event listening once iframe loads
    const iframe = iframeRef.current;
    if (iframe) {
      const onLoad = () => {
        try {
          if (parsed.type === "youtube") {
            iframe.contentWindow?.postMessage(
              JSON.stringify({ event: "listening", id: 1 }),
              "*"
            );
          }
          if (parsed.type === "vimeo") {
            iframe.contentWindow?.postMessage(
              JSON.stringify({ method: "addEventListener", value: "ended" }),
              "*"
            );
          }
        } catch { /* cross-origin, ignored */ }
      };
      iframe.addEventListener("load", onLoad);
      return () => {
        window.removeEventListener("message", handler);
        iframe.removeEventListener("load", onLoad);
      };
    }
    return () => window.removeEventListener("message", handler);
  }, [onVideoEnded, videoUrl]);

  // Priority 1: Video
  if (videoUrl) {
    const parsed = parseVideoEmbed(videoUrl);
    if (parsed) {
      if (parsed.type === "mp4") {
        return (
          <video
            ref={videoRef}
            src={parsed.embedUrl}
            controls
            className="w-full aspect-video rounded-xl bg-black"
            preload="metadata"
          />
        );
      }
      // For YouTube, enable JS API; for Vimeo, enable API
      let embedSrc = parsed.embedUrl;
      if (parsed.type === "youtube") {
        embedSrc += (embedSrc.includes("?") ? "&" : "?") + "enablejsapi=1&origin=" + window.location.origin;
      }
      if (parsed.type === "vimeo") {
        embedSrc += (embedSrc.includes("?") ? "&" : "?") + "api=1";
      }
      return (
        <iframe
          ref={iframeRef}
          src={embedSrc}
          title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full aspect-video rounded-xl"
          style={{ border: 0 }}
        />
      );
    }
  }

  // Priority 2: Image
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Tab content"
        className="w-full rounded-xl object-cover max-h-[500px]"
      />
    );
  }

  // Priority 3: Placeholder (super admin only)
  if (!isSuperAdmin) return null;
  return (
    <div
      className={cn(
        "w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors duration-300",
        dark ? "border-white/10 bg-white/[0.02]" : "border-gray-300 bg-gray-50"
      )}
    >
      <Play className={cn("h-10 w-10", dark ? "text-gray-600" : "text-gray-400")} />
      <p className={cn("text-sm font-medium", dark ? "text-gray-500" : "text-gray-400")}>
        No media uploaded yet
      </p>
      <p className={cn("text-xs", dark ? "text-gray-600" : "text-gray-400")}>
        Use &ldquo;Manage Content&rdquo; to add video or image
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Manage Content Panel (super_admin)                                  */
/* ------------------------------------------------------------------ */

const VIDEO_BUCKET = "prospectus-videos";
const ACCEPTED_VIDEO_TYPES = ".mp4,.mov,.webm,.avi";
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

const IMAGE_BUCKET = "prospectus-images";
const ACCEPTED_IMAGE_TYPES = ".jpg,.jpeg,.png,.webp";
const MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25 MB

type ImageUrls = Record<string, string>;

function tabSlug(tab: string): string {
  return tab.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const CONTENT_TABS = TABS.filter(
  (t) => t !== "Overview" && t !== "Financial Model"
);

function ManageContentPanel({
  open,
  onClose,
  videos,
  images,
  tabContent,
  onSaveMedia,
  onSaveContent,
  dark,
}: {
  open: boolean;
  onClose: () => void;
  videos: VideoUrls;
  images: ImageUrls;
  tabContent: Record<string, TabContent>;
  onSaveMedia: (v: VideoUrls, i: ImageUrls) => void;
  onSaveContent: (c: Record<string, TabContent>) => void;
  dark: boolean;
}) {
  const [panelTab, setPanelTab] = useState<"media" | "content">("media");

  // --- Media state ---
  const [videoDraft, setVideoDraft] = useState<VideoUrls>({});
  const [imageDraft, setImageDraft] = useState<ImageUrls>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const imageFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // --- Content state ---
  const [contentDraft, setContentDraft] = useState<Record<string, TabContent>>({});
  const [contentSaving, setContentSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setVideoDraft({ ...videos });
      setImageDraft({ ...images });
      // Initialize content draft from DB content, falling back to hardcoded
      const cd: Record<string, TabContent> = {};
      for (const tab of CONTENT_TABS) {
        const src = tabContent[tab] || TAB_CONTENT[tab];
        if (src) {
          cd[tab] = {
            headline: src.headline,
            headlineAccent: src.headlineAccent || "",
            description: src.description,
            sections: src.sections.map((s) => ({
              heading: s.heading,
              items: [...s.items],
            })),
            bottomNote: src.bottomNote
              ? { heading: src.bottomNote.heading, text: src.bottomNote.text }
              : undefined,
          };
        }
      }
      setContentDraft(cd);
    }
  }, [open, videos, images, tabContent]);

  // --- Auth check helper ---
  const ensureSession = async (): Promise<boolean> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error("[ManageContent] getSession error:", error);
    }
    if (!session) {
      console.error("[ManageContent] No active session. User must be logged in to upload.");
      // Try refreshing the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        console.error("[ManageContent] Session refresh failed:", refreshError);
        alert("Your session has expired. Please log in again before saving.");
        return false;
      }
      console.log("[ManageContent] Session refreshed successfully. User:", refreshData.session.user.email);
      return true;
    }
    console.log("[ManageContent] Active session confirmed. User:", session.user.email, "| Role:", session.user.role);
    return true;
  };

  // --- Video upload ---
  const handleVideoUpload = async (tab: string, file: File) => {
    console.log(`[ManageContent] Video upload: ${file.name}, ${(file.size / 1024 / 1024).toFixed(1)} MB, type: ${file.type}`);
    if (file.size > MAX_VIDEO_SIZE) {
      alert(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 500 MB.`);
      return;
    }
    if (!(await ensureSession())) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const path = `${tabSlug(tab)}-video.${ext}`;
    setUploading(`video-${tab}`);
    setUploadProgress(0);
    const progressTimer = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 8, 90));
    }, 200);
    try {
      const { error } = await supabase.storage
        .from(VIDEO_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      clearInterval(progressTimer);
      if (error) {
        console.error("[ManageContent] video upload error:", JSON.stringify(error, null, 2));
        alert(`Upload failed: ${error.message}`);
        setUploading(null);
        setUploadProgress(0);
        return;
      }
      setUploadProgress(100);
      const { data: { publicUrl } } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path);
      setVideoDraft((d) => ({ ...d, [tab]: publicUrl }));
      setTimeout(() => { setUploading(null); setUploadProgress(0); }, 500);
    } catch (err) {
      clearInterval(progressTimer);
      console.error("[ManageContent] video upload exception:", err);
      alert(`Upload failed unexpectedly — check console`);
      setUploading(null);
      setUploadProgress(0);
    }
  };

  const handleVideoDelete = async (tab: string) => {
    const url = videoDraft[tab];
    if (!url) return;
    if (url.includes(VIDEO_BUCKET)) {
      const pathMatch = url.split(`${VIDEO_BUCKET}/`)[1];
      if (pathMatch) {
        const { error } = await supabase.storage.from(VIDEO_BUCKET).remove([pathMatch]);
        if (error) console.error("[ManageContent] video delete error:", JSON.stringify(error, null, 2));
      }
    }
    setVideoDraft((d) => ({ ...d, [tab]: "" }));
  };

  // --- Image upload ---
  const handleImageUpload = async (tab: string, file: File) => {
    if (file.size > MAX_IMAGE_SIZE) {
      alert(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 25 MB.`);
      return;
    }
    if (!(await ensureSession())) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${tabSlug(tab)}-image.${ext}`;
    setUploading(`image-${tab}`);
    setUploadProgress(0);
    const progressTimer = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 10, 90));
    }, 150);
    try {
      const { error } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      clearInterval(progressTimer);
      if (error) {
        console.error("[ManageContent] image upload error:", JSON.stringify(error, null, 2));
        alert(`Upload failed: ${error.message}`);
        setUploading(null);
        setUploadProgress(0);
        return;
      }
      setUploadProgress(100);
      const { data: { publicUrl } } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
      setImageDraft((d) => ({ ...d, [tab]: publicUrl }));
      setTimeout(() => { setUploading(null); setUploadProgress(0); }, 500);
    } catch (err) {
      clearInterval(progressTimer);
      console.error("[ManageContent] image upload exception:", err);
      alert(`Upload failed unexpectedly — check console`);
      setUploading(null);
      setUploadProgress(0);
    }
  };

  const handleImageDelete = async (tab: string) => {
    const url = imageDraft[tab];
    if (!url) return;
    if (url.includes(IMAGE_BUCKET)) {
      const pathMatch = url.split(`${IMAGE_BUCKET}/`)[1];
      if (pathMatch) {
        const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([pathMatch]);
        if (error) console.error("[ManageContent] image delete error:", JSON.stringify(error, null, 2));
      }
    }
    setImageDraft((d) => ({ ...d, [tab]: "" }));
  };

  // --- Save media ---
  const handleSaveMedia = async () => {
    if (!(await ensureSession())) return;
    setSaving(true);
    const upserts = TABS.map((tab) => ({
      tab_name: tab,
      video_url: videoDraft[tab]?.trim() || null,
      image_url: imageDraft[tab]?.trim() || null,
      updated_at: new Date().toISOString(),
    }));
    try {
      console.log("[ManageContent] Saving media upserts:", JSON.stringify(upserts, null, 2));
      const { data, error } = await supabase
        .from("prospectus_videos")
        .upsert(upserts, { onConflict: "tab_name" })
        .select();
      setSaving(false);
      if (error) {
        console.error("[ManageContent] media save error:", JSON.stringify({
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }, null, 2));
        alert(`Failed to save media: ${error.message}${error.hint ? ` (${error.hint})` : ""}`);
        return;
      }
      console.log("[ManageContent] media saved successfully:", data);
      onSaveMedia(videoDraft, imageDraft);
      onClose();
    } catch (err) {
      setSaving(false);
      console.error("[ManageContent] media save exception:", err);
      alert("Failed to save media — check console");
    }
  };

  // --- Save content ---
  const handleSaveContent = async () => {
    if (!(await ensureSession())) return;
    setContentSaving(true);
    const upserts = CONTENT_TABS.filter((tab) => contentDraft[tab]).map((tab) => {
      const c = contentDraft[tab];
      return {
        tab_name: tab,
        headline: c.headline || null,
        headline_accent: c.headlineAccent || null,
        description: c.description || null,
        sections: c.sections,
        bottom_note: c.bottomNote || null,
        updated_at: new Date().toISOString(),
      };
    });
    try {
      console.log("[ManageContent] Saving content upserts:", JSON.stringify(upserts, null, 2));
      const { data, error } = await supabase
        .from("prospectus_tab_content")
        .upsert(upserts, { onConflict: "tab_name" })
        .select();
      setContentSaving(false);
      if (error) {
        console.error("[ManageContent] content save error:", JSON.stringify({
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }, null, 2));
        alert(`Failed to save content: ${error.message}${error.hint ? ` (${error.hint})` : ""}`);
        return;
      }
      console.log("[ManageContent] content saved successfully:", data);
      onSaveContent(contentDraft);
      onClose();
    } catch (err) {
      setContentSaving(false);
      console.error("[ManageContent] content save exception:", err);
      alert("Failed to save content — check console");
    }
  };

  // --- Content editor helpers ---
  const updateContent = (tab: string, field: string, value: string) => {
    setContentDraft((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [field]: value },
    }));
  };

  const updateSection = (tab: string, idx: number, field: "heading" | "items", value: string | string[]) => {
    setContentDraft((prev) => {
      const sections = [...(prev[tab]?.sections || [])];
      sections[idx] = { ...sections[idx], [field]: value };
      return { ...prev, [tab]: { ...prev[tab], sections } };
    });
  };

  const addSection = (tab: string) => {
    setContentDraft((prev) => {
      const sections = [...(prev[tab]?.sections || []), { heading: "", items: [""] }];
      return { ...prev, [tab]: { ...prev[tab], sections } };
    });
  };

  const removeSection = (tab: string, idx: number) => {
    setContentDraft((prev) => {
      const sections = (prev[tab]?.sections || []).filter((_, i) => i !== idx);
      return { ...prev, [tab]: { ...prev[tab], sections } };
    });
  };

  const updateBottomNote = (tab: string, field: "heading" | "text", value: string) => {
    setContentDraft((prev) => {
      const existing = prev[tab]?.bottomNote || { heading: "", text: "" };
      return {
        ...prev,
        [tab]: { ...prev[tab], bottomNote: { ...existing, [field]: value } },
      };
    });
  };

  if (!open) return null;

  const isUploading = !!uploading;
  const inputCls = cn(
    "w-full rounded-lg px-3 py-2 text-sm border transition-colors",
    dark
      ? "bg-white/5 border-white/10 placeholder:text-gray-500 focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
      : "bg-white border-gray-300 placeholder:text-gray-400 focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
  );

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div
        className={cn(
          "fixed top-0 right-0 z-[61] h-full w-full max-w-md shadow-2xl flex flex-col transition-colors duration-300",
          dark ? "bg-[#111827] text-white" : "bg-white text-[#111827]"
        )}
      >
        {/* Header */}
        <div className={cn("flex items-center justify-between px-5 py-4 border-b", dark ? "border-white/10" : "border-gray-200")}>
          <h3 className="text-base font-bold">Manage Content</h3>
          <button type="button" onClick={onClose} className="p-1 hover:opacity-70">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className={cn("flex px-5 pt-3 gap-1 border-b", dark ? "border-white/10" : "border-gray-200")}>
          {(["media", "content"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPanelTab(t)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2",
                panelTab === t
                  ? "border-[#1e3a5f] text-[#1e3a5f]"
                  : cn("border-transparent", dark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")
              )}
            >
              {t === "media" ? "Media" : "Content"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {panelTab === "media" && TABS.map((tab) => {
            const videoVal = videoDraft[tab] ?? "";
            const imageVal = imageDraft[tab] ?? "";
            const parsed = videoVal ? parseVideoEmbed(videoVal) : null;
            const isVideoUploading = uploading === `video-${tab}`;
            const isImageUploading = uploading === `image-${tab}`;

            return (
              <div key={tab} className={cn("pb-4 border-b", dark ? "border-white/10" : "border-gray-100")}>
                <label className="text-sm font-semibold block mb-1.5">
                  {TAB_LABELS[tab]}
                </label>

                {/* --- Video section --- */}
                <p className={cn("text-xs font-medium mb-1 flex items-center gap-1", dark ? "text-gray-400" : "text-gray-500")}>
                  <Video className="h-3 w-3" /> Video
                </p>
                <input
                  type="text"
                  value={videoVal}
                  onChange={(e) => setVideoDraft((d) => ({ ...d, [tab]: e.target.value }))}
                  placeholder="Paste URL or upload a file"
                  className={inputCls}
                />
                {videoVal && !isVideoUploading && (
                  <p className={cn("text-xs mt-1", parsed ? "text-emerald-500" : "text-amber-500")}>
                    {parsed ? `${parsed.type.toUpperCase()} detected` : "Unrecognized URL format"}
                  </p>
                )}
                {isVideoUploading && (
                  <div className="mt-2">
                    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#1e3a5f] rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="text-xs text-[#1e3a5f] mt-1">Uploading... {uploadProgress}%</p>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    ref={(el) => { videoFileRefs.current[tab] = el; }}
                    type="file"
                    accept={ACCEPTED_VIDEO_TYPES}
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(tab, f); e.target.value = ""; }}
                  />
                  <button
                    type="button"
                    onClick={() => videoFileRefs.current[tab]?.click()}
                    disabled={isUploading}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50",
                      dark ? "border-white/10 hover:bg-white/5" : "border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {videoVal ? "Replace" : "Upload"}
                  </button>
                  {videoVal && (
                    <button type="button" onClick={() => handleVideoDelete(tab)} disabled={isUploading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
                {videoVal && parsed && (
                  <div className={cn("mt-2 rounded-lg overflow-hidden border", dark ? "border-white/10" : "border-gray-200")}>
                    {parsed.type === "mp4" ? (
                      <video src={parsed.embedUrl} controls className="w-full aspect-video bg-black" preload="metadata" />
                    ) : (
                      <iframe src={parsed.embedUrl} title={`${TAB_LABELS[tab]} preview`} className="w-full aspect-video" style={{ border: 0 }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    )}
                  </div>
                )}

                {/* --- Image section --- */}
                <p className={cn("text-xs font-medium mt-3 mb-1 flex items-center gap-1", dark ? "text-gray-400" : "text-gray-500")}>
                  <ImageIcon className="h-3 w-3" /> Image (fallback when no video)
                </p>
                {isImageUploading && (
                  <div className="mt-1 mb-2">
                    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#1e3a5f] rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="text-xs text-[#1e3a5f] mt-1">Uploading... {uploadProgress}%</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={(el) => { imageFileRefs.current[tab] = el; }}
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES}
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(tab, f); e.target.value = ""; }}
                  />
                  <button
                    type="button"
                    onClick={() => imageFileRefs.current[tab]?.click()}
                    disabled={isUploading}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50",
                      dark ? "border-white/10 hover:bg-white/5" : "border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {imageVal ? "Replace" : "Upload"}
                  </button>
                  {imageVal && (
                    <button type="button" onClick={() => handleImageDelete(tab)} disabled={isUploading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
                {imageVal && (
                  <div className={cn("mt-2 rounded-lg overflow-hidden border", dark ? "border-white/10" : "border-gray-200")}>
                    <img src={imageVal} alt={`${TAB_LABELS[tab]} image`} className="w-full max-h-48 object-cover" />
                  </div>
                )}
              </div>
            );
          })}

          {panelTab === "content" && CONTENT_TABS.map((tab) => {
            const c = contentDraft[tab];
            if (!c) return null;
            return (
              <div key={tab} className={cn("pb-5 border-b", dark ? "border-white/10" : "border-gray-100")}>
                <label className="text-sm font-semibold block mb-2">{TAB_LABELS[tab]}</label>

                {/* Headline */}
                <label className={cn("text-xs block mb-0.5", dark ? "text-gray-400" : "text-gray-500")}>Headline</label>
                <input type="text" value={c.headline} onChange={(e) => updateContent(tab, "headline", e.target.value)} className={inputCls} />

                {/* Headline accent */}
                <label className={cn("text-xs block mt-2 mb-0.5", dark ? "text-gray-400" : "text-gray-500")}>Headline Accent</label>
                <input type="text" value={c.headlineAccent || ""} onChange={(e) => updateContent(tab, "headlineAccent", e.target.value)} className={inputCls} />

                {/* Description */}
                <label className={cn("text-xs block mt-2 mb-0.5", dark ? "text-gray-400" : "text-gray-500")}>Description</label>
                <textarea value={c.description} onChange={(e) => updateContent(tab, "description", e.target.value)} rows={3} className={inputCls} />

                {/* Sections */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className={cn("text-xs font-medium", dark ? "text-gray-400" : "text-gray-500")}>Sections</label>
                    <button type="button" onClick={() => addSection(tab)}
                      className="flex items-center gap-1 text-xs text-[#1e3a5f] hover:underline">
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>
                  {c.sections.map((section, idx) => (
                    <div key={idx} className={cn("p-3 rounded-lg mb-2", dark ? "bg-white/5" : "bg-gray-50")}>
                      <div className="flex items-center justify-between mb-1">
                        <input
                          type="text"
                          value={section.heading}
                          onChange={(e) => updateSection(tab, idx, "heading", e.target.value)}
                          placeholder="Section heading"
                          className={cn(inputCls, "text-xs font-medium")}
                        />
                        {c.sections.length > 1 && (
                          <button type="button" onClick={() => removeSection(tab, idx)}
                            className="ml-2 p-1 text-red-500 hover:text-red-700 flex-shrink-0">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <label className={cn("text-xs block mt-1 mb-0.5", dark ? "text-gray-500" : "text-gray-400")}>Items (one per line)</label>
                      <textarea
                        value={section.items.join("\n")}
                        onChange={(e) => updateSection(tab, idx, "items", e.target.value.split("\n"))}
                        rows={Math.max(3, section.items.length + 1)}
                        className={cn(inputCls, "text-xs")}
                      />
                    </div>
                  ))}
                </div>

                {/* Bottom note */}
                <div className="mt-3">
                  <label className={cn("text-xs font-medium block mb-1", dark ? "text-gray-400" : "text-gray-500")}>Bottom Note</label>
                  <input
                    type="text"
                    value={c.bottomNote?.heading || ""}
                    onChange={(e) => updateBottomNote(tab, "heading", e.target.value)}
                    placeholder="Note heading"
                    className={cn(inputCls, "mb-1")}
                  />
                  <textarea
                    value={c.bottomNote?.text || ""}
                    onChange={(e) => updateBottomNote(tab, "text", e.target.value)}
                    placeholder="Note text"
                    rows={2}
                    className={inputCls}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={cn("px-5 py-4 border-t", dark ? "border-white/10" : "border-gray-200")}>
          <button
            type="button"
            onClick={panelTab === "media" ? handleSaveMedia : handleSaveContent}
            disabled={saving || contentSaving || isUploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1e3a5f] hover:bg-[#2d5282] text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {(saving || contentSaving) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {(saving || contentSaving) ? "Saving…" : panelTab === "media" ? "Save Media" : "Save Content"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Access Gate (always dark)                                           */
/* ------------------------------------------------------------------ */

function AccessGate({ onAccess }: { onAccess: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setChecking(true);

    // Allow any @recurrent.io email automatically
    if (trimmed.endsWith("@recurrent.io")) {
      setChecking(false);
      sessionStorage.setItem(SESSION_KEY, "1");
      onAccess();
      return;
    }

    const { data } = await supabase
      .from("prospectus_access")
      .select("id")
      .eq("email", trimmed)
      .limit(1) as { data: { id: string }[] | null };
    setChecking(false);
    if (data && data.length > 0) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onAccess();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0F] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-2xl font-bold text-white tracking-tight">
            MilCrunch<span className="text-[#3b82f6] font-extrabold">X</span>
          </span>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <div className="w-14 h-14 rounded-full bg-[#1e3a5f]/20 flex items-center justify-center mx-auto mb-5">
            <Lock className="h-6 w-6 text-[#1e3a5f]" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Investor & Partner Preview
          </h1>
          <p className="text-sm text-gray-400 mb-6">
            Enter your email address to view this document.
          </p>

          <div
            className={cn(
              "transition-transform",
              shake && "animate-[shake_0.4s_ease-in-out]"
            )}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Email address"
              autoFocus
              className={cn(
                "w-full px-4 py-3 rounded-xl bg-white/[0.06] border text-white text-sm",
                "placeholder:text-gray-500",
                "focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/50 transition-all",
                error
                  ? "border-red-500/60"
                  : "border-white/10"
              )}
            />
            {error && (
              <p className="text-red-400 text-sm mt-2">
                This email isn't on the approved list. Contact andrew@recurrentx.com to request access.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={checking}
            className="w-full mt-4 px-6 py-3 rounded-xl bg-[#1e3a5f] hover:bg-[#2d5282] text-white font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {checking ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</> : "Request Access"}
          </button>
        </div>

        <p className="text-gray-600 text-xs mt-6">
          Contact{" "}
          <a href="mailto:andrew@recurrentx.com" className="text-[#1e3a5f] hover:underline">
            andrew@recurrentx.com
          </a>{" "}
          to request access.
        </p>
      </div>

      {/* Shake keyframe */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/* Tab: Overview                                                       */
/* ------------------------------------------------------------------ */

function OverviewTab({ dark, videoUrl, imageUrl, isSuperAdmin, onVideoEnded }: { dark: boolean; videoUrl?: string; imageUrl?: string; isSuperAdmin: boolean; onVideoEnded?: () => void }) {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto pt-4">
        <h2
          className={cn(
            "text-3xl md:text-4xl font-extrabold leading-tight mb-2 transition-colors duration-300",
            dark ? "text-white" : "text-[#111827]"
          )}
        >
          Where the military and veteran community comes to be{" "}
          <span className="text-[#1e3a5f]">seen, heard, and understood.</span>
        </h2>
        <p
          className={cn(
            "text-base max-w-2xl mx-auto leading-relaxed transition-colors duration-300",
            dark ? "text-gray-400" : "text-[#6B7280]"
          )}
        >
          MilCrunch is the operating system military events and communities have been
          missing — built by a veteran, proven at MIC, and designed to turn every event
          into a year-round community that sponsors want to fund again and again.
        </p>
      </section>

      <div className="max-w-3xl mx-auto" style={{ margin: "24px auto" }}>
        <ProspectusMedia videoUrl={videoUrl} imageUrl={imageUrl} dark={dark} isSuperAdmin={isSuperAdmin} onVideoEnded={onVideoEnded} />
      </div>

      {/* Origin Story */}
      <section className="text-center max-w-[760px] mx-auto pt-4">
        <h2
          className={cn(
            "text-[28px] font-bold leading-tight mb-6 transition-colors duration-300",
            dark ? "text-white" : "text-[#111827]"
          )}
        >
          MilCrunch didn&rsquo;t start in a pitch deck or a conference room.
        </h2>
        <div className="text-left space-y-4">
          <p
            className={cn(
              "text-base leading-relaxed transition-colors duration-300",
              dark ? "text-gray-300" : "text-[#374151]"
            )}
          >
            It started with a problem a veteran couldn&rsquo;t let go of: the military and veteran
            community needed a place to be heard, seen, and understood &mdash; in one home.
          </p>
          <p
            className={cn(
              "text-base leading-relaxed transition-colors duration-300",
              dark ? "text-gray-300" : "text-[#374151]"
            )}
          >
            That home was the Parade Deck Experience &mdash; where every military influencer,
            veteran creator, spouse-owned business, and podcaster could show up, build a real
            presence, and be discovered.
          </p>
          <p
            className={cn(
              "text-base leading-relaxed transition-colors duration-300",
              dark ? "text-gray-300" : "text-[#374151]"
            )}
          >
            Now, Parade Deck&rsquo;s name and infrastructure are being rebranded as{" "}
            <strong className={dark ? "text-white" : "text-[#111827]"}>MilCrunch</strong> &mdash;
            with a meaningful upgrade in AI technology that makes the platform faster, easier to
            grow on, and built for scale.
          </p>
        </div>
      </section>

      {/* Core Platform */}
      <section className="max-w-[760px] mx-auto">
        <div
          className={cn(
            "border-t transition-colors duration-300 pt-10",
            dark ? "border-white/[0.08]" : "border-[#E5E7EB]"
          )}
        >
          <p
            className={cn(
              "text-base leading-relaxed font-semibold mb-6 transition-colors duration-300",
              dark ? "text-white" : "text-[#111827]"
            )}
          >
            MilCrunch is the essential infrastructure for media companies and brands that want to
            authentically engage the military community.
          </p>
          <p
            className={cn(
              "text-[11px] font-semibold tracking-[0.15em] uppercase mb-6 transition-colors duration-300",
              dark ? "text-gray-500" : "text-[#9CA3AF]"
            )}
          >
            AT ITS CORE
          </p>
          <ul className="space-y-5">
            {[
              {
                title: "Creator Discovery & Network Directory",
                desc: "Find the right voices with precision using proprietary Military Match Scores, branch and location filters, and AI-powered search",
              },
              {
                title: "Multi-Phase AI Verification",
                desc: "Web intelligence and confidence scoring that eliminates stolen valor and protects credibility",
              },
              {
                title: "Event Management",
                desc: "Event creation, registration, and attendee experience in one system \u2014 complete with a high-performance Progressive Web App for schedules, speaker bios, and networking (no downloads required)",
              },
              {
                title: "AI-Powered Go-to-Market",
                desc: "Automated campaign building, one-click streaming integrations, and real-time ROI tracking",
              },
              {
                title: "Email & Campaign Automation",
                desc: "Targeted outreach to verified military creators and communities",
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="text-[#1e3a5f] mt-1 shrink-0">&#x2022;</span>
                <div>
                  <strong className={cn("transition-colors duration-300", dark ? "text-white" : "text-[#111827]")}>
                    {item.title}
                  </strong>
                  {" \u2014 "}
                  <span className={cn("text-sm transition-colors duration-300", dark ? "text-gray-400" : "text-[#374151]")}>
                    {item.desc}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p
            className={cn(
              "text-base leading-relaxed font-semibold mt-8 transition-colors duration-300",
              dark ? "text-white" : "text-[#111827]"
            )}
          >
            One platform.{" "}
            <span className={cn("font-normal transition-colors duration-300", dark ? "text-gray-300" : "text-[#374151]")}>
              Military creator discovery, verification, event management, email automation, live
              streaming, and performance insights &mdash; built by veterans, for the community.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}

/* Old tab components removed — replaced by ContentTab + TAB_CONTENT below */

/* ------------------------------------------------------------------ */
/* Tab content data for all non-Overview, non-Financial tabs            */
/* ------------------------------------------------------------------ */

interface TabContent {
  headline: string;
  headlineAccent?: string;
  heroImage?: string;
  description: string;
  sections: { heading: string; items: string[] }[];
  bottomNote?: { heading: string; text: string };
}

const TAB_CONTENT: Record<string, TabContent> = {
  "Events & Attendee App": {
    headline: "Mobile-First Event Management",
    headlineAccent: "Built for Military Communities",
    description:
      "MilCrunch replaces platforms like Whova with a military-native PWA that works before, during, and after every event \u2014 no App Store required. Attendees get instant QR check-in, live schedules, and year-round community access.",
    sections: [
      {
        heading: "Key Features",
        items: [
          "PWA Technology \u2014 Works on any device, zero downloads",
          "QR Code Check-In \u2014 Instant registration and badge printing",
          "Live Event Feed \u2014 Real-time updates, announcements, schedule changes",
          "Sponsor Integration \u2014 Booth locations, branded content, ROI tracking",
          "Post-Event Engagement \u2014 Community continues beyond event day",
        ],
      },
    ],
    bottomNote: {
      heading: "Why It Matters",
      text: "Traditional event apps die when the conference ends. MilCrunch keeps attendees connected 365 days a year, solving the \u201Cone-and-done\u201D problem that plagues military events.",
    },
  },
  "MilCrunch Experience": {
    headline: "From the Team That Built the",
    headlineAccent: "Parade Deck Experience",
    description:
      "For three years, we operated the Parade Deck Experience at Military Influencer Conference \u2014 the premier live streaming stage showcasing military creators. That hands-on experience taught us what military event producers actually need: a platform that understands the unique dynamics of military communities.",
    sections: [
      {
        heading: "Track Record",
        items: [
          "3 Years running MilCon\u2019s featured stage",
          "100+ Creators interviewed and showcased",
          "Live Production \u2014 Multi-camera streaming, sponsor integration",
          "Community Building \u2014 Created connections between creators, brands, and service members",
        ],
      },
    ],
    bottomNote: {
      heading: "From Experience to Platform",
      text: "We took everything we learned from producing live events and built it into software. MilCrunch is the event platform we wish existed when we were running PDX.",
    },
  },
  "Discovery": {
    headline: "Military Creator",
    headlineAccent: "Intelligence Engine",
    description:
      "MilCrunch integrates with Influencers.club\u2019s 310M+ creator database to provide military-specific discovery powered by proprietary relevance scoring. Find verified military creators, veterans, and military spouses with confidence.",
    sections: [
      {
        heading: "Key Features",
        items: [
          "Military Match Scoring \u2014 AI-powered relevance algorithm using 95+ military terms, 27 base locations, and branch identification",
          "Advanced Filtering \u2014 Search by branch, location, follower count, engagement rate, niche",
          "Platform Coverage \u2014 Instagram, TikTok, YouTube, Twitter/X, Twitch",
          "Real-Time Data \u2014 Live follower counts, engagement metrics, content analysis",
          "Evidence-Based Results \u2014 See exactly why each creator matched (hashtags, bio, location proximity)",
        ],
      },
    ],
    bottomNote: {
      heading: "Competitive Advantage",
      text: "Generic influencer platforms return gyms and businesses when you search \u201Cmilitary Norfolk.\u201D MilCrunch returns actual military spouses and veterans because we understand the domain.",
    },
  },
  "Verification": {
    headline: "4-Phase AI Verification Pipeline",
    headlineAccent: "for Military Authenticity",
    description:
      "Military affiliation fraud is rampant in influencer marketing. MilCrunch\u2019s proprietary verification system combines People Data Labs, web intelligence, and AI analysis to deliver 85\u201395% confidence scores on military status.",
    sections: [
      {
        heading: "Verification Process",
        items: [
          "Phase 1: Identity Verification \u2014 People Data Labs integration for identity resolution",
          "Phase 2: Web Intelligence \u2014 Multi-source web search for military evidence",
          "Phase 3: Deep Extraction \u2014 AI-powered content analysis across social platforms",
          "Phase 4: Confidence Scoring \u2014 Evidence synthesis and military status determination",
        ],
      },
      {
        heading: "Output",
        items: [
          "Intelligence Summary \u2014 AI-generated brief on military background",
          "Evidence Sources \u2014 25\u201330 verified sources with relevance scoring",
          "Military/Civilian Career Timeline \u2014 Service history and transition points",
          "Social Verification \u2014 Platform authenticity checks",
          "Media & Appearances \u2014 Public speaking, podcast appearances, published work",
          "Background Review \u2014 Public records and reputation analysis",
        ],
      },
    ],
    bottomNote: {
      heading: "Why It Matters",
      text: "Brands pay premium rates for military influencers. Our verification ensures they\u2019re getting authentic military voices, not stolen valor.",
    },
  },
  "365 Insights": {
    headline: "Year-Round",
    headlineAccent: "Community Intelligence",
    description:
      "Military creators don\u2019t go dormant between conferences. MilCrunch tracks engagement, content performance, and community sentiment 365 days a year to help brands make informed partnership decisions.",
    sections: [
      {
        heading: "Key Features",
        items: [
          "Engagement Tracking \u2014 Monitor creator performance across all platforms",
          "Content Analysis \u2014 AI-powered theme detection and sentiment analysis",
          "Audience Demographics \u2014 Military affiliation, geographic distribution, interests",
          "Partnership Opportunities \u2014 Smart matching between brands and creators",
          "ROI Measurement \u2014 Track campaign performance from impression to conversion",
        ],
      },
    ],
    bottomNote: {
      heading: "Data-Driven Decisions",
      text: "Know which creators are trending, which niches are growing, and where to invest your marketing budget before competitors do.",
    },
  },
  "Streaming/Media": {
    headline: "The Living Room is",
    headlineAccent: "the New Feed",
    heroImage: "https://github.com/user-attachments/assets/c9dfc6b0-9e45-42f5-9704-41cf697f42c7",
    description:
      "YouTube, Instagram, and TikTok are no longer just phone apps. All three have launched dedicated Apple TV, Fire TV, and Roku applications — moving creator content from the palm of your hand to the biggest screen in the house. This isn't a trend. It's a platform shift.",
    sections: [
      {
        heading: "Why This Matters for Recurrent",
        items: [
          "Every major content platform is racing to own living room distribution. Recurrent's military media portfolio — We Are The Mighty, Task & Purpose, Military.com content partnerships — currently lives on websites and social feeds. That's yesterday's distribution model.",
        ],
      },
      {
        heading: "The Opportunity: A Recurrent Streaming App",
        items: [
          "A new distribution channel — not dependent on social algorithms or search rankings, but a direct presence on every connected TV",
          "Direct audience access — push notifications, featured content, curated playlists on the viewer's terms",
          "Advertising inventory — pre-roll, mid-roll, and sponsored content blocks with premium CPMs that OTT/CTV commands",
          "Partner content distribution — existing advertising and media partners get immediate access to a new channel, not just event coverage but year-round branded content",
          "Event amplification — MilCon keynotes, panels, and live streams delivered directly to living rooms, expanding reach beyond attendees",
        ],
      },
      {
        heading: "MilCrunch Makes This Possible",
        items: [
          "MilCrunch already has the live streaming infrastructure, creator content pipeline, and event production experience from three years running the Parade Deck Experience at MIC. The platform provides the content engine — the app provides the distribution.",
        ],
      },
      {
        heading: "The Podcast Distribution Gap",
        items: [
          "The military and veteran podcast space is exploding. Shows like Zero Blog Thirty, Jocko Podcast, The Veteran Podcast, and dozens of smaller creators are building loyal audiences — but they're stuck on Apple Podcasts and Spotify with zero visual distribution.",
        ],
      },
      {
        heading: "These Creators Are Screaming for a Platform That Gives Them",
        items: [
          "Video podcast distribution — most military podcasts already record video but have no CTV outlet",
          "Cross-promotion — discovery across other military shows instead of competing in a sea of 4 million podcasts",
          "Sponsor visibility — brands sponsoring military podcasts get audio mentions but no visual placement on the biggest screen in the house",
          "Event integration — podcast recordings at MilCon and MilSpouseFest become on-demand CTV content, extending the event lifecycle",
        ],
      },
      {
        heading: "The Data Backs It Up",
        items: [
          "Connected TV is the fastest-growing ad channel in digital media. CTV ad spend is projected to exceed $30B by 2026. Meanwhile, podcast advertising continues to grow at 20%+ annually. A Recurrent streaming app sits at the intersection of both — combining the loyalty of podcast audiences with the premium CPMs of CTV advertising.",
        ],
      },
      {
        heading: "One App, Three Revenue Streams",
        items: [
          "Advertising — CTV pre-roll and mid-roll at $25–40 CPMs (vs $5–10 on social)",
          "Subscriptions — Premium access to exclusive military content, early event access, ad-free viewing",
          "Syndication — License military creator content to other platforms and media partners",
        ],
      },
    ],
    bottomNote: {
      heading: "The Bottom Line",
      text: "A Recurrent streaming app doesn't just distribute content. It creates an entirely new revenue engine built on the military community's most engaged creators. Social platforms figured out that the living room is where attention lives. Recurrent should too.",
    },
  },
  "Partnership Model": {
    headline: "Connect Brands with",
    headlineAccent: "Military Communities",
    description:
      "MilCrunch facilitates authentic partnerships between brands and military creators, solving the discovery problem that keeps military marketing inefficient.",
    sections: [
      {
        heading: "For Brands",
        items: [
          "Vetted Creator Network \u2014 Pre-verified military authenticity",
          "Campaign Management \u2014 End-to-end influencer campaign execution",
          "ROI Tracking \u2014 Measure impact from awareness to conversion",
          "Community Access \u2014 Reach military families through trusted voices",
        ],
      },
      {
        heading: "For Creators",
        items: [
          "Brand Opportunities \u2014 Get discovered by companies seeking military partnerships",
          "Fair Compensation \u2014 Transparent rate cards and payment processing",
          "Content Support \u2014 Guidance on brand partnerships that maintain authenticity",
          "Community Connection \u2014 Network with other military creators",
        ],
      },
    ],
    bottomNote: {
      heading: "Win-Win-Win",
      text: "Brands reach military audiences authentically. Creators monetize their platforms. Military communities get relevant products and services.",
    },
  },
  "Financial Model": {
    headline: "Built for Acquisition:",
    headlineAccent: "Clean Revenue Model & Technical Moat",
    description:
      "MilCrunch operates on a proven B2B SaaS model with multiple revenue streams and proprietary technology that creates sustainable competitive advantages.",
    sections: [
      {
        heading: "Revenue Streams",
        items: [
          "Event Management \u2014 Per-event licensing for conferences and expos",
          "Creator Discovery \u2014 Subscription tiers for brand access to verified military creators",
          "Verification Services \u2014 API access for third-party platforms",
          "Streaming Production \u2014 Live event production and VOD hosting",
        ],
      },
      {
        heading: "Technical Moat",
        items: [
          "Military Relevance Algorithm \u2014 Proprietary scoring system (95+ terms, 27 bases, branch ID)",
          "Verification Pipeline \u2014 4-phase AI system with 85\u201395% accuracy",
          "Creator Database \u2014 Curated network of verified military creators",
          "Event Infrastructure \u2014 Battle-tested PWA with 3 years production experience",
        ],
      },
      {
        heading: "Acquisition Value",
        items: [
          "Immediate Revenue \u2014 Existing contracts and proven pricing",
          "Scalable Technology \u2014 SaaS platform ready for 10x growth",
          "Defensible Position \u2014 Domain expertise and technical differentiation",
          "Customer Pipeline \u2014 Military event producers actively seeking alternatives to Whova",
        ],
      },
      {
        heading: "Growth Potential",
        items: [
          "Expand to All Military Events \u2014 500+ military conferences annually",
          "Enterprise Partnerships \u2014 USO, MOAA, veteran service organizations",
          "International \u2014 Allied militaries (UK, Canada, Australia)",
          "Adjacent Markets \u2014 First responders, government contractors",
        ],
      },
    ],
  },
};

function ContentTab({ dark, tab, dbContent }: { dark: boolean; tab: string; dbContent?: TabContent }) {
  const content = dbContent || TAB_CONTENT[tab];
  const kbSlug = TAB_KB_CATEGORY[tab];

  if (!content) {
    return (
      <div className="py-24 text-center">
        <p className={cn("text-sm", dark ? "text-gray-400" : "text-gray-500")}>Content coming soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Deep Dive link */}
      {kbSlug && (
        <div className="flex justify-end -mb-8">
          <a
            href={`/kb/${kbSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
              dark
                ? "text-[#1e3a5f] bg-[#1e3a5f]/10 hover:bg-[#1e3a5f]/20"
                : "text-[#1e3a5f] bg-[#1e3a5f]/10 hover:bg-[#1e3a5f]/15"
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Deep Dive
          </a>
        </div>
      )}

      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto pt-4">
        <h2
          className={cn(
            "text-3xl md:text-4xl font-extrabold leading-tight mb-4 transition-colors duration-300",
            dark ? "text-white" : "text-[#111827]"
          )}
        >
          {content.headline}{" "}
          {content.headlineAccent && (
            <span className="text-[#1e3a5f]">{content.headlineAccent}</span>
          )}
        </h2>
        {content.heroImage && (
          <img
            src={content.heroImage}
            alt=""
            className="w-full max-w-3xl mx-auto rounded-xl shadow-md my-6 object-cover"
          />
        )}
        <p
          className={cn(
            "text-base max-w-2xl mx-auto leading-relaxed transition-colors duration-300",
            dark ? "text-gray-400" : "text-[#6B7280]"
          )}
        >
          {content.description}
        </p>
      </section>

      {/* Sections */}
      {content.sections.map((section) => (
        <section key={section.heading} className="max-w-3xl mx-auto">
          <h3
            className={cn(
              "text-lg font-bold mb-4 transition-colors duration-300",
              dark ? "text-white" : "text-[#111827]"
            )}
          >
            {section.heading}
          </h3>
          <div className="space-y-3">
            {section.items.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <p
                  className={cn(
                    "text-sm leading-relaxed transition-colors duration-300",
                    dark ? "text-gray-300" : "text-[#374151]"
                  )}
                >
                  {item}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Bottom note */}
      {content.bottomNote && (
        <section
          className={cn(
            "max-w-3xl mx-auto rounded-xl p-6 transition-colors duration-300",
            dark
              ? "bg-white/[0.04] border border-white/[0.08]"
              : "bg-white border border-[#E5E7EB]"
          )}
        >
          <h3
            className={cn(
              "text-base font-bold mb-2 transition-colors duration-300",
              dark ? "text-white" : "text-[#111827]"
            )}
          >
            {content.bottomNote.heading}
          </h3>
          <p
            className={cn(
              "text-sm leading-relaxed transition-colors duration-300",
              dark ? "text-gray-400" : "text-[#6B7280]"
            )}
          >
            {content.bottomNote.text}
          </p>
        </section>
      )}
    </div>
  );
}


/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function Prospectus() {
  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("Overview");
  const [copied, setCopied] = useState(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
    return "light";
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const [videoUrls, setVideoUrls] = useState<VideoUrls>({});
  const [imageUrls, setImageUrls] = useState<ImageUrls>({});
  const [tabContent, setTabContent] = useState<Record<string, TabContent>>({});
  const [manageOpen, setManageOpen] = useState(false);

  // Tab gating: track which tabs are unlocked (by index). Index 0 always unlocked.
  const [unlockedUpTo, setUnlockedUpTo] = useState(0);
  const [justUnlocked, setJustUnlocked] = useState<number | null>(null);
  const [lockedTooltip, setLockedTooltip] = useState<string | null>(null);
  const imageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isSuperAdmin } = useAuth();

  const darkMode =
    themeMode === "dark" || (themeMode === "system" && systemPrefersDark);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setHasAccess(true);
    }
  }, []);

  // Fetch saved media URLs (video + image)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("prospectus_videos")
        .select("tab_name, video_url, image_url");
      if (data) {
        const vMap: VideoUrls = {};
        const iMap: ImageUrls = {};
        for (const row of data as { tab_name: string; video_url: string | null; image_url: string | null }[]) {
          if (row.video_url) vMap[row.tab_name] = row.video_url;
          if (row.image_url) iMap[row.tab_name] = row.image_url;
        }
        setVideoUrls(vMap);
        setImageUrls(iMap);
      }
    })();
  }, []);

  // Fetch saved tab content
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("prospectus_tab_content")
        .select("*");
      if (data) {
        const map: Record<string, TabContent> = {};
        for (const row of data as {
          tab_name: string;
          headline: string | null;
          headline_accent: string | null;
          description: string | null;
          sections: { heading: string; items: string[] }[] | null;
          bottom_note: { heading: string; text: string } | null;
        }[]) {
          map[row.tab_name] = {
            headline: row.headline || "",
            headlineAccent: row.headline_accent || undefined,
            description: row.description || "",
            sections: row.sections || [],
            bottomNote: row.bottom_note || undefined,
          };
        }
        setTabContent(map);
      }
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Super admin bypasses gating — unlock all tabs
  useEffect(() => {
    if (isSuperAdmin) setUnlockedUpTo(TABS.length - 1);
  }, [isSuperAdmin]);

  /** Unlock the next tab after the current one */
  const unlockNextTab = () => {
    const currentIdx = TABS.indexOf(activeTab);
    if (currentIdx >= 0 && currentIdx === unlockedUpTo && currentIdx < TABS.length - 1) {
      const next = currentIdx + 1;
      setUnlockedUpTo(next);
      setJustUnlocked(next);
      setTimeout(() => setJustUnlocked(null), 2000);
    }
  };

  // Image fallback: start a 10-second timer when viewing a tab with only an image
  // No-media: unlock immediately when navigating to a tab with no media
  useEffect(() => {
    // Clear previous timer
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }

    // Super admin already unlocked
    if (isSuperAdmin) return;

    const currentIdx = TABS.indexOf(activeTab);
    // Only run gating logic if this tab is the frontier (the one we need to watch to unlock next)
    if (currentIdx !== unlockedUpTo || currentIdx >= TABS.length - 1) return;

    const mediaType = getMediaType(videoUrls[activeTab], imageUrls[activeTab]);

    if (mediaType === "none") {
      // No media at all — unlock next tab immediately
      unlockNextTab();
    } else if (mediaType === "image") {
      // Image only — unlock after 10 seconds
      imageTimerRef.current = setTimeout(() => {
        unlockNextTab();
      }, 10_000);
    }
    // If video, user must watch to the end (handled by onVideoEnded callback)

    return () => {
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current);
        imageTimerRef.current = null;
      }
    };
  }, [activeTab, unlockedUpTo, videoUrls, imageUrls, isSuperAdmin]);

  if (!hasAccess) {
    return <AccessGate onAccess={() => setHasAccess(true)} />;
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: do nothing */
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-300",
        darkMode ? "bg-[#0A0A0F] text-white" : "bg-[#F9FAFB] text-[#111827]"
      )}
    >
      {/* Header */}
      <header
        className={cn(
          "sticky top-0 z-50 backdrop-blur-md transition-colors duration-300",
          darkMode
            ? "bg-[#0A0A0F]/90 border-b border-white/[0.06]"
            : "bg-white/90 border-b border-[#E5E7EB]"
        )}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Logo + tagline */}
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-lg font-bold tracking-tight transition-colors duration-300",
                darkMode ? "text-white" : "text-[#111827]"
              )}
            >
              MilCrunch<span className="text-[#3b82f6] font-extrabold">X</span>
            </span>
            <span
              className={cn(
                "hidden md:inline text-xs border-l pl-3 transition-colors duration-300",
                darkMode
                  ? "text-gray-500 border-white/10"
                  : "text-[#6B7280] border-[#E5E7EB]"
              )}
            >
              The Operating System for Military Events & Communities
            </span>
          </div>

          {/* Theme toggle + Share button */}
          <div className="flex items-center gap-2">
            {/* Theme toggle pill */}
            <div
              className={cn(
                "flex items-center gap-0.5 rounded-full px-1 py-1 border transition-colors duration-300",
                darkMode
                  ? "bg-white/[0.06] border-white/10"
                  : "bg-white border-[#E5E7EB]"
              )}
            >
              {([
                { mode: "light" as const, Icon: Sun },
                { mode: "dark" as const, Icon: Moon },
                { mode: "system" as const, Icon: Monitor },
              ]).map(({ mode, Icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setThemeMode(mode)}
                  className={cn(
                    "p-1.5 rounded-full transition-all duration-200",
                    themeMode === mode
                      ? darkMode
                        ? "bg-white/[0.12] text-white shadow-sm"
                        : "bg-white text-[#111827] shadow-sm"
                      : darkMode
                        ? "text-gray-500 hover:text-gray-300"
                        : "text-[#6B7280] hover:text-[#111827]"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </button>
              ))}
            </div>

            {/* Explore Demo */}
            <a
              href="/login?demo=true"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#1e3a5f] hover:bg-[#2d5282] text-white transition-all duration-300"
            >
              🎯 Explore Demo
            </a>

            {/* Share button */}
            <button
              type="button"
              onClick={handleShare}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                copied
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : darkMode
                    ? "bg-white/[0.06] text-gray-300 border border-white/10 hover:bg-white/[0.1]"
                    : "bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F3F4F6]"
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied!
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" /> Share This
                </>
              )}
            </button>

            {/* Manage Tab Videos — super_admin only */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setManageOpen(true)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300",
                  darkMode
                    ? "bg-white/[0.06] text-gray-400 border border-white/10 hover:bg-white/[0.1] hover:text-gray-200"
                    : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700"
                )}
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Manage Content</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-6xl mx-auto px-4 md:px-8 pb-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {TABS.map((tab, idx) => {
              const isFinancials = tab === "Financial Model";
              const isLocked = idx > unlockedUpTo;
              const isJustUnlocked = idx === justUnlocked;
              const isActive = activeTab === tab;

              return (
                <div key={tab} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        setLockedTooltip(tab);
                        setTimeout(() => setLockedTooltip(null), 2000);
                        return;
                      }
                      setActiveTab(tab);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-1.5",
                      isLocked
                        ? "opacity-40 cursor-not-allowed"
                        : isJustUnlocked
                          ? "animate-[unlockPulse_0.6s_ease-out]"
                          : "",
                      !isLocked && (
                        isFinancials
                          ? isActive
                            ? "bg-[#1e3a5f] text-white shadow-lg shadow-[#1e3a5f]/30"
                            : "bg-[#1e3a5f]/90 text-white hover:bg-[#1e3a5f] shadow-md shadow-[#1e3a5f]/20"
                          : isActive
                            ? "bg-[#1e3a5f] text-white"
                            : darkMode
                              ? "text-gray-400 hover:text-white hover:bg-white/[0.06]"
                              : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]"
                      ),
                      isLocked && (
                        darkMode
                          ? "text-gray-600"
                          : "text-gray-400"
                      )
                    )}
                  >
                    {isFinancials && !isLocked && <DollarSign className="h-3.5 w-3.5 -mt-0.5" />}
                    {isLocked && <Lock className="h-3 w-3" />}
                    {TAB_LABELS[tab]}
                  </button>
                  {/* Locked tooltip */}
                  {lockedTooltip === tab && (
                    <div
                      className={cn(
                        "absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap z-50 shadow-lg",
                        darkMode
                          ? "bg-white/10 text-gray-300 border border-white/10"
                          : "bg-gray-800 text-white"
                      )}
                    >
                      Watch the current video to unlock
                      <div
                        className={cn(
                          "absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45",
                          darkMode ? "bg-white/10 border-l border-t border-white/10" : "bg-gray-800"
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14">
        {/* Tab media — rendered above content for non-Overview tabs */}
        {activeTab !== "Overview" && (videoUrls[activeTab] || imageUrls[activeTab] || isSuperAdmin) && (
          <div className="mb-8">
            <ProspectusMedia
              videoUrl={videoUrls[activeTab]}
              imageUrl={imageUrls[activeTab]}
              dark={darkMode}
              isSuperAdmin={!!isSuperAdmin}
              onVideoEnded={unlockNextTab}
            />
          </div>
        )}

        {activeTab === "Overview" && <OverviewTab dark={darkMode} videoUrl={videoUrls["Overview"]} imageUrl={imageUrls["Overview"]} isSuperAdmin={!!isSuperAdmin} onVideoEnded={unlockNextTab} />}
        {activeTab === "Events & Attendee App" && <ContentTab dark={darkMode} tab="Events & Attendee App" dbContent={tabContent["Events & Attendee App"]} />}
        {activeTab === "MilCrunch Experience" && <ContentTab dark={darkMode} tab="MilCrunch Experience" dbContent={tabContent["MilCrunch Experience"]} />}
        {activeTab === "Discovery" && <ContentTab dark={darkMode} tab="Discovery" dbContent={tabContent["Discovery"]} />}
        {activeTab === "Verification" && <ContentTab dark={darkMode} tab="Verification" dbContent={tabContent["Verification"]} />}
        {activeTab === "365 Insights" && <ContentTab dark={darkMode} tab="365 Insights" dbContent={tabContent["365 Insights"]} />}
        {activeTab === "Streaming/Media" && <ContentTab dark={darkMode} tab="Streaming/Media" dbContent={tabContent["Streaming/Media"]} />}
        {activeTab === "Partnership Model" && <ContentTab dark={darkMode} tab="Partnership Model" dbContent={tabContent["Partnership Model"]} />}
        {activeTab === "Financial Model" && <FinancialModelTab dark={darkMode} />}
      </main>

      {/* Footer */}
      <footer
        className={cn(
          "border-t py-8 transition-colors duration-300",
          darkMode ? "border-white/[0.06]" : "border-[#E5E7EB]"
        )}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 text-center">
          <span
            className={cn(
              "text-xs transition-colors duration-300",
              darkMode ? "text-gray-600" : "text-[#9CA3AF]"
            )}
          >
            &copy; {new Date().getFullYear()} MilCrunch &middot; Confidential
          </span>
        </div>
      </footer>

      {/* Manage Content Panel */}
      {isSuperAdmin && (
        <ManageContentPanel
          open={manageOpen}
          onClose={() => setManageOpen(false)}
          videos={videoUrls}
          images={imageUrls}
          tabContent={tabContent}
          onSaveMedia={(v, i) => { setVideoUrls(v); setImageUrls(i); }}
          onSaveContent={(c) => setTabContent(c)}
          dark={darkMode}
        />
      )}

      {/* Unlock pulse animation */}
      <style>{`
        @keyframes unlockPulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); transform: scale(1); }
          50% { box-shadow: 0 0 12px 4px rgba(34, 197, 94, 0.3); transform: scale(1.05); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
