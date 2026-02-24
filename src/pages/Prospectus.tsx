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
  "Streaming & Media",
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
  "Streaming & Media": "Streaming",
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
  "Streaming & Media": "streaming-media",
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

function ProspectusMedia({
  videoUrl,
  imageUrl,
  dark,
  isSuperAdmin,
}: {
  videoUrl?: string;
  imageUrl?: string;
  dark: boolean;
  isSuperAdmin: boolean;
}) {
  // Priority 1: Video
  if (videoUrl) {
    const parsed = parseVideoEmbed(videoUrl);
    if (parsed) {
      if (parsed.type === "mp4") {
        return (
          <video
            src={parsed.embedUrl}
            controls
            className="w-full aspect-video rounded-xl bg-black"
            preload="metadata"
          />
        );
      }
      return (
        <iframe
          src={parsed.embedUrl}
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
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

const IMAGE_BUCKET = "prospectus-images";
const ACCEPTED_IMAGE_TYPES = ".jpg,.jpeg,.png,.webp";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

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

  // --- Video upload ---
  const handleVideoUpload = async (tab: string, file: File) => {
    if (file.size > MAX_VIDEO_SIZE) {
      alert(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 100 MB.`);
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const path = `${tabSlug(tab)}-video.${ext}`;
    setUploading(`video-${tab}`);
    setUploadProgress(0);
    const progressTimer = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 8, 90));
    }, 200);
    const { error } = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    clearInterval(progressTimer);
    if (error) {
      console.error("[ManageContent] video upload error:", error);
      alert(`Upload failed: ${error.message}`);
      setUploading(null);
      setUploadProgress(0);
      return;
    }
    setUploadProgress(100);
    const { data: { publicUrl } } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path);
    setVideoDraft((d) => ({ ...d, [tab]: publicUrl }));
    setTimeout(() => { setUploading(null); setUploadProgress(0); }, 500);
  };

  const handleVideoDelete = async (tab: string) => {
    const url = videoDraft[tab];
    if (!url) return;
    if (url.includes(VIDEO_BUCKET)) {
      const pathMatch = url.split(`${VIDEO_BUCKET}/`)[1];
      if (pathMatch) await supabase.storage.from(VIDEO_BUCKET).remove([pathMatch]);
    }
    setVideoDraft((d) => ({ ...d, [tab]: "" }));
  };

  // --- Image upload ---
  const handleImageUpload = async (tab: string, file: File) => {
    if (file.size > MAX_IMAGE_SIZE) {
      alert(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 5 MB.`);
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${tabSlug(tab)}-image.${ext}`;
    setUploading(`image-${tab}`);
    setUploadProgress(0);
    const progressTimer = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 10, 90));
    }, 150);
    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    clearInterval(progressTimer);
    if (error) {
      console.error("[ManageContent] image upload error:", error);
      alert(`Upload failed: ${error.message}`);
      setUploading(null);
      setUploadProgress(0);
      return;
    }
    setUploadProgress(100);
    const { data: { publicUrl } } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    setImageDraft((d) => ({ ...d, [tab]: publicUrl }));
    setTimeout(() => { setUploading(null); setUploadProgress(0); }, 500);
  };

  const handleImageDelete = async (tab: string) => {
    const url = imageDraft[tab];
    if (!url) return;
    if (url.includes(IMAGE_BUCKET)) {
      const pathMatch = url.split(`${IMAGE_BUCKET}/`)[1];
      if (pathMatch) await supabase.storage.from(IMAGE_BUCKET).remove([pathMatch]);
    }
    setImageDraft((d) => ({ ...d, [tab]: "" }));
  };

  // --- Save media ---
  const handleSaveMedia = async () => {
    setSaving(true);
    const upserts = TABS.map((tab) => ({
      tab_name: tab,
      video_url: videoDraft[tab]?.trim() || null,
      image_url: imageDraft[tab]?.trim() || null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("prospectus_videos")
      .upsert(upserts, { onConflict: "tab_name" });
    setSaving(false);
    if (error) {
      console.error("[ManageContent] media save error:", error);
      alert("Failed to save media — check console");
      return;
    }
    onSaveMedia(videoDraft, imageDraft);
    onClose();
  };

  // --- Save content ---
  const handleSaveContent = async () => {
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
    const { error } = await supabase
      .from("prospectus_tab_content")
      .upsert(upserts, { onConflict: "tab_name" });
    setContentSaving(false);
    if (error) {
      console.error("[ManageContent] content save error:", error);
      alert("Failed to save content — check console");
      return;
    }
    onSaveContent(contentDraft);
    onClose();
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

function OverviewTab({ dark, videoUrl, isSuperAdmin }: { dark: boolean; videoUrl?: string; isSuperAdmin: boolean }) {
  const saasTotal = SAAS_ROWS.reduce((s, r) => s + r.cost, 0);

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
            "text-lg md:text-xl font-semibold mb-4 transition-colors duration-300",
            dark ? "text-gray-300" : "text-[#374151]"
          )}
        >
          And where Recurrent turns that community into a permanent revenue engine.
        </p>
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

      {/* Origin Story */}
      <section className="text-center max-w-[760px] mx-auto pt-4">
        <h2
          className={cn(
            "text-[28px] font-bold leading-tight mb-6 transition-colors duration-300",
            dark ? "text-white" : "text-[#111827]"
          )}
        >
          MilCrunch didn&rsquo;t start in a boardroom.
        </h2>
        <div className="text-left space-y-4">
          <p
            className={cn(
              "text-base leading-relaxed transition-colors duration-300",
              dark ? "text-gray-300" : "text-[#374151]"
            )}
          >
            It started with a problem a veteran couldn&rsquo;t stop thinking about: the military
            and veteran community had no place to be seen, heard, and understood. So he built one.
          </p>
          <p
            className={cn(
              "text-base leading-relaxed transition-colors duration-300",
              dark ? "text-gray-300" : "text-[#374151]"
            )}
          >
            MilCrunch started as a creator directory — a place where a veteran podcaster with
            500 followers could build a profile, connect their social channels, and finally have
            a home for their content alongside authors, musicians, milspouses, and social media
            creators who were all trying to build something meaningful, with no support and no
            spotlight.
          </p>
          <p
            className={cn(
              "text-base leading-relaxed transition-colors duration-300",
              dark ? "text-gray-300" : "text-[#374151]"
            )}
          >
            That directory became a network. That network became a platform. And that platform
            became MilCrunch.
          </p>

          <div style={{ margin: "24px 0" }}>
            <ProspectusMedia videoUrl={videoUrl} dark={dark} isSuperAdmin={isSuperAdmin} />
          </div>
        </div>
      </section>


      {/* Platform Capabilities */}
      <section className="max-w-[760px] mx-auto">
        <div
          className={cn(
            "border-t transition-colors duration-300 pt-10",
            dark ? "border-white/[0.08]" : "border-[#E5E7EB]"
          )}
        >
          <p
            className={cn(
              "text-[11px] font-semibold tracking-[0.15em] uppercase mb-8 transition-colors duration-300",
              dark ? "text-gray-500" : "text-[#9CA3AF]"
            )}
          >
            WHAT THE PLATFORM DOES
          </p>

          <div className="space-y-8">
            <div>
              <h4
                className={cn(
                  "text-base font-bold mb-2 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                Creator &amp; Influencer Discovery
              </h4>
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#374151]"
                )}
              >
                MilCrunch connects organizers and brands to a searchable database of millions of
                creator profiles — filterable by niche, platform, follower range, engagement rate,
                location, and military affiliation. Vetted military and veteran creators can build
                full media profiles, link their social channels, and be discovered for brand
                partnerships, speaking opportunities, podcast appearances, and event activations.
                Campaign managers can build targeted creator lists, sign deliverables, and track
                performance — all inside the platform.
              </p>
            </div>

            <div>
              <h4
                className={cn(
                  "text-base font-bold mb-2 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                Event Management &amp; Attendee Experience
              </h4>
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#374151]"
                )}
              >
                MilCrunch goes far beyond what a ticketing platform can offer. Event organizers
                get a full suite of tools: event creation and registration, session scheduling
                with conflict detection, speaker and sponsor management, QR-based attendee
                check-in, and a mobile-first attendee web app that requires no download. Attendees
                can build a personal agenda, connect with other attendees via QR networking, and
                participate in a real-time community feed — all from their phone browser.
              </p>
            </div>

            <div>
              <h4
                className={cn(
                  "text-base font-bold mb-2 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                Live Streaming &amp; Production
              </h4>
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#374151]"
                )}
              >
                The platform includes integrated live streaming management for multi-destination
                broadcasting. Production teams can manage run-of-show schedules, stream
                destinations, and day-of checklists from a single dashboard — built around the
                MilCrunch Experience model that has delivered 3M+ YouTube impressions at
                Military Influencer Conference.
              </p>
            </div>

            <div>
              <h4
                className={cn(
                  "text-base font-bold mb-2 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                Podcast Network
              </h4>
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#374151]"
                )}
              >
                MilCrunch hosts a dedicated military and veteran podcast network. Creators can
                publish episodes, build subscriber audiences, and connect their podcast presence
                directly to their creator profile — making their content discoverable to sponsors
                and event organizers looking for authentic voices.
              </p>
            </div>

            <div>
              <h4
                className={cn(
                  "text-base font-bold mb-2 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                Email Marketing
              </h4>
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#374151]"
                )}
              >
                A full email marketing suite — contacts database, list segmentation, drag-and-drop
                campaign builder, pre-built templates, and embeddable signup forms — built directly
                into the platform. Organizers can email attendees, creators, and sponsors from the
                same system they use to manage everything else, with send infrastructure powered
                by verified sending domains.
              </p>
            </div>

            <div>
              <h4
                className={cn(
                  "text-base font-bold mb-2 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                Sponsor &amp; Revenue Infrastructure
              </h4>
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#374151]"
                )}
              >
                Sponsors get more than a logo placement. MilCrunch tracks impressions, lead
                retrieval, content activations, and audience reach across the full event
                lifecycle — attributed to individual sponsorship packages. The 365 Insights
                dashboard shows sponsors quantifiable ROI week over week and month over month,
                so renewals are data-driven, not relationship-dependent.
              </p>
            </div>

            <div>
              <h4
                className={cn(
                  "text-base font-bold mb-2 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}
              >
                Advertising &amp; Media Sales
              </h4>
              <p
                className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#374151]"
                )}
              >
                An integrated ad management system gives media teams a rate desk, CPM pricing
                controls, campaign management by advertiser, inventory tracking with profit
                margins, and a sales lead pipeline — purpose-built for military media
                organizations monetizing their audience through display and branded content
                placements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Events in Your Pocket */}
      <section className="max-w-4xl mx-auto">
        <div
          className={cn(
            "rounded-2xl p-8 md:p-10 transition-colors duration-300",
            dark
              ? "bg-[#111827] border border-white/[0.08]"
              : "bg-[#F9FAFB] border border-[#E5E7EB]"
          )}
        >
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#1e3a5f]/15 flex items-center justify-center mx-auto mb-4">
              <Smartphone className="h-6 w-6 text-[#1e3a5f]" />
            </div>
            <h3
              className={cn(
                "text-xl md:text-2xl font-extrabold mb-2 transition-colors duration-300",
                dark ? "text-white" : "text-[#111827]"
              )}
            >
              Events in Your Pocket
            </h3>
            <p
              className={cn(
                "text-sm max-w-xl mx-auto transition-colors duration-300",
                dark ? "text-gray-400" : "text-[#6B7280]"
              )}
            >
              The first mobile-first attendee app built specifically for military events — no App Store required.
            </p>
          </div>

          {/* 3-Phone Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {/* Phone 1 — Registration & Check-In */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative w-[240px] h-[480px] rounded-[2.2rem] border-[5px] overflow-hidden shadow-2xl transition-colors duration-300",
                  dark
                    ? "border-gray-700 bg-[#0f0f1a] shadow-black/40"
                    : "border-gray-800 bg-[#0f0f1a] shadow-gray-400/30"
                )}
              >
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-black rounded-b-2xl z-10" />
                {/* Screen content */}
                <div className="w-full h-full flex flex-col bg-[#0f0f1a]">
                  {/* Status bar spacer */}
                  <div className="h-[28px] bg-[#1e3a5f]" />
                  {/* Purple header */}
                  <div className="bg-[#1e3a5f] px-4 py-3 text-center">
                    <p className="text-white text-[10px] font-bold leading-tight">Military Influencer</p>
                    <p className="text-white text-[10px] font-bold leading-tight">Conference 2026</p>
                  </div>
                  {/* QR Code area */}
                  <div className="flex-1 flex flex-col items-center justify-center px-6 bg-[#111827]">
                    {/* QR Code pattern */}
                    <div className="w-[130px] h-[130px] bg-white rounded-xl p-2.5 mb-4">
                      <div className="w-full h-full grid grid-cols-9 grid-rows-9 gap-[2px]">
                        {[
                          [1,1,1,1,1,0,1,0,1],
                          [1,0,0,0,1,0,0,1,1],
                          [1,0,1,0,1,0,1,0,1],
                          [1,0,0,0,1,0,0,1,0],
                          [1,1,1,1,1,0,1,0,1],
                          [0,0,0,0,0,0,1,1,0],
                          [1,1,0,1,1,1,0,0,1],
                          [0,1,0,0,1,0,1,0,1],
                          [1,0,1,1,0,1,0,1,0],
                        ].map((row, ri) =>
                          row.map((v, ci) => (
                            <div
                              key={`qr-${ri}-${ci}`}
                              className={cn(
                                "rounded-[1px]",
                                v ? (ri === 6 ? "bg-[#1e3a5f]" : "bg-[#111827]") : "bg-white"
                              )}
                            />
                          ))
                        )}
                      </div>
                    </div>
                    <p className="text-white text-sm font-bold">Curtez Riggs</p>
                    <span className="mt-1.5 px-3 py-0.5 rounded-full bg-[#10B981] text-white text-[10px] font-semibold">
                      Attendee
                    </span>
                    <p className="text-gray-500 text-[9px] mt-3">Scan at registration desk</p>
                  </div>
                  {/* Bottom nav */}
                  <div className="h-[44px] bg-[#1a1f2e] border-t border-white/10 flex items-center justify-around px-4">
                    <div className="w-5 h-5 rounded bg-[#1e3a5f]/30" />
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="w-5 h-5 rounded bg-white/10" />
                  </div>
                </div>
              </div>
              {/* Label */}
              <div className="mt-4 flex items-start gap-2 max-w-[240px]">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className={cn("text-sm font-medium transition-colors duration-300", dark ? "text-gray-300" : "text-[#374151]")}>
                  Instant QR check-in — no printed tickets
                </span>
              </div>
            </div>

            {/* Phone 2 — Live Agenda */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative w-[240px] h-[480px] rounded-[2.2rem] border-[5px] overflow-hidden shadow-2xl transition-colors duration-300",
                  dark
                    ? "border-gray-700 bg-[#0f0f1a] shadow-black/40"
                    : "border-gray-800 bg-[#0f0f1a] shadow-gray-400/30"
                )}
              >
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-black rounded-b-2xl z-10" />
                {/* Screen content */}
                <div className="w-full h-full flex flex-col bg-[#0f0f1a]">
                  {/* Status bar spacer */}
                  <div className="h-[28px] bg-[#1e3a5f]" />
                  {/* Purple header */}
                  <div className="bg-[#1e3a5f] px-4 py-3">
                    <p className="text-white text-xs font-bold text-center">Schedule</p>
                  </div>
                  {/* Day pills */}
                  <div className="bg-[#111827] px-4 py-2.5 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#1e3a5f] text-white text-[10px] font-semibold">
                      Day 1 &middot; Sep 23
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-gray-400 text-[10px] font-medium">
                      Day 2
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-gray-400 text-[10px] font-medium">
                      Day 3
                    </span>
                  </div>
                  {/* Session cards */}
                  <div className="flex-1 bg-[#111827] px-3 py-2 space-y-2.5 overflow-hidden">
                    {/* Card 1 */}
                    <div className="bg-[#1a1f2e] rounded-lg p-3 border-l-[3px] border-[#1e3a5f] flex justify-between items-start">
                      <div>
                        <p className="text-gray-500 text-[9px] font-medium">9:00 AM</p>
                        <p className="text-white text-[11px] font-semibold mt-0.5">Opening Keynote</p>
                        <p className="text-gray-500 text-[9px] mt-1">Main Stage</p>
                      </div>
                      <div className="text-gray-600 text-[10px] mt-0.5">&#9734;</div>
                    </div>
                    {/* Card 2 */}
                    <div className="bg-[#1a1f2e] rounded-lg p-3 border-l-[3px] border-[#10B981] flex justify-between items-start">
                      <div>
                        <p className="text-gray-500 text-[9px] font-medium">10:30 AM</p>
                        <p className="text-white text-[11px] font-semibold mt-0.5">Military Spouse Creator Panel</p>
                        <p className="text-gray-500 text-[9px] mt-1">Experience Stage</p>
                      </div>
                      <div className="text-gray-600 text-[10px] mt-0.5">&#9734;</div>
                    </div>
                    {/* Card 3 */}
                    <div className="bg-[#1a1f2e] rounded-lg p-3 border-l-[3px] border-[#3B82F6] flex justify-between items-start">
                      <div>
                        <p className="text-gray-500 text-[9px] font-medium">1:00 PM</p>
                        <p className="text-white text-[11px] font-semibold mt-0.5">Brand Partnerships Workshop</p>
                        <p className="text-gray-500 text-[9px] mt-1">Room 204</p>
                      </div>
                      <div className="text-gray-600 text-[10px] mt-0.5">&#9734;</div>
                    </div>
                  </div>
                  {/* Bottom nav */}
                  <div className="h-[44px] bg-[#1a1f2e] border-t border-white/10 flex items-center justify-around px-4">
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="w-5 h-5 rounded bg-[#1e3a5f]/30" />
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="w-5 h-5 rounded bg-white/10" />
                  </div>
                </div>
              </div>
              {/* Label */}
              <div className="mt-4 flex items-start gap-2 max-w-[240px]">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className={cn("text-sm font-medium transition-colors duration-300", dark ? "text-gray-300" : "text-[#374151]")}>
                  Live schedule with personal agenda builder
                </span>
              </div>
            </div>

            {/* Phone 3 — Community Connections */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "relative w-[240px] h-[480px] rounded-[2.2rem] border-[5px] overflow-hidden shadow-2xl transition-colors duration-300",
                  dark
                    ? "border-gray-700 bg-[#0f0f1a] shadow-black/40"
                    : "border-gray-800 bg-[#0f0f1a] shadow-gray-400/30"
                )}
              >
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-black rounded-b-2xl z-10" />
                {/* Screen content */}
                <div className="w-full h-full flex flex-col bg-[#0f0f1a]">
                  {/* Status bar spacer */}
                  <div className="h-[28px] bg-[#1e3a5f]" />
                  {/* Purple header */}
                  <div className="bg-[#1e3a5f] px-4 py-3">
                    <p className="text-white text-xs font-bold text-center">Community</p>
                  </div>
                  {/* Feed */}
                  <div className="flex-1 bg-[#111827] px-3 py-3 space-y-3 overflow-hidden">
                    {/* Post 1 */}
                    <div className="bg-[#1a1f2e] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-[#1e3a5f]/30 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-[#1e3a5f]">JM</span>
                        </div>
                        <div>
                          <p className="text-white text-[10px] font-semibold">Jake Morrison</p>
                          <p className="text-gray-600 text-[8px]">2h ago</p>
                        </div>
                      </div>
                      <p className="text-gray-300 text-[10px] leading-relaxed">
                        Just landed in Tampa! Who&rsquo;s heading to the Experience stage tomorrow? &#127908;
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-gray-500">
                        <span className="text-[9px]">&#10084;</span>
                        <span className="text-[9px]">12</span>
                      </div>
                    </div>
                    {/* Post 2 */}
                    <div className="bg-[#1a1f2e] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-[#10B981]/30 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-[#10B981]">SR</span>
                        </div>
                        <div>
                          <p className="text-white text-[10px] font-semibold">Sarah Rodriguez</p>
                          <p className="text-gray-600 text-[8px]">4h ago</p>
                        </div>
                      </div>
                      <p className="text-gray-300 text-[10px] leading-relaxed">
                        Can&rsquo;t wait for the keynote. First time at MIC! &#127482;&#127480;
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-gray-500">
                        <span className="text-[9px]">&#10084;</span>
                        <span className="text-[9px]">8</span>
                      </div>
                    </div>
                    {/* Connect section */}
                    <div className="bg-[#1a1f2e] rounded-lg p-3">
                      <p className="text-white text-[10px] font-semibold mb-2">Connect</p>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-6 h-6 rounded-full bg-[#1e3a5f]/40 border-2 border-[#1a1f2e]" />
                        <div className="w-6 h-6 rounded-full bg-[#3B82F6]/40 border-2 border-[#1a1f2e] -ml-2.5" />
                        <div className="w-6 h-6 rounded-full bg-[#10B981]/40 border-2 border-[#1a1f2e] -ml-2.5" />
                        <span className="text-gray-500 text-[9px] ml-1">47 attendees near you</span>
                      </div>
                      <div className="w-full py-1.5 rounded-lg bg-[#10B981] text-white text-[10px] font-semibold text-center">
                        &#128241; Share My Profile
                      </div>
                    </div>
                  </div>
                  {/* Bottom nav */}
                  <div className="h-[44px] bg-[#1a1f2e] border-t border-white/10 flex items-center justify-around px-4">
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="w-5 h-5 rounded bg-[#1e3a5f]/30" />
                    <div className="w-5 h-5 rounded bg-white/10" />
                  </div>
                </div>
              </div>
              {/* Label */}
              <div className="mt-4 flex items-start gap-2 max-w-[240px]">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className={cn("text-sm font-medium transition-colors duration-300", dark ? "text-gray-300" : "text-[#374151]")}>
                  QR networking and real-time community feed
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SaaS Replacement Calculator */}
      <section className="max-w-3xl mx-auto">
        <h3
          className={cn(
            "text-xl font-bold text-center mb-1 transition-colors duration-300",
            dark ? "text-white" : "text-[#111827]"
          )}
        >
          One Platform. One Bill. Serious Savings.
        </h3>
        <p
          className={cn(
            "text-center text-sm mb-6 transition-colors duration-300",
            dark ? "text-gray-500" : "text-[#6B7280]"
          )}
        >
          Stop paying for 7 tools that don&rsquo;t talk to each other.
        </p>

        <div
          className={cn(
            "rounded-2xl overflow-hidden transition-colors duration-300",
            dark
              ? "bg-white/[0.04] border border-white/[0.08]"
              : "bg-white border border-[#E5E7EB]"
          )}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                className={cn(
                  "transition-colors duration-300",
                  dark ? "border-b border-white/[0.08]" : "border-b border-[#E5E7EB]"
                )}
              >
                <th
                  className={cn(
                    "text-left font-medium px-5 py-3 transition-colors duration-300",
                    dark ? "text-gray-500" : "text-[#6B7280]"
                  )}
                >
                  Tool
                </th>
                <th
                  className={cn(
                    "text-left font-medium px-5 py-3 transition-colors duration-300",
                    dark ? "text-gray-500" : "text-[#6B7280]"
                  )}
                >
                  Replaces
                </th>
                <th
                  className={cn(
                    "text-right font-medium px-5 py-3 transition-colors duration-300",
                    dark ? "text-gray-500" : "text-[#6B7280]"
                  )}
                >
                  Cost/mo
                </th>
              </tr>
            </thead>
            <tbody>
              {SAAS_ROWS.map((row, i) => (
                <tr
                  key={row.tool}
                  className={cn(
                    "transition-colors duration-300",
                    dark
                      ? "border-b border-white/[0.05]"
                      : cn("border-b border-[#E5E7EB]/60", i % 2 === 1 && "bg-[#F9FAFB]")
                  )}
                >
                  <td
                    className={cn(
                      "px-5 py-3 font-medium transition-colors duration-300",
                      dark ? "text-white" : "text-[#111827]"
                    )}
                  >
                    {row.tool}
                  </td>
                  <td
                    className={cn(
                      "px-5 py-3 transition-colors duration-300",
                      dark ? "text-gray-400" : "text-[#6B7280]"
                    )}
                  >
                    {row.replaces}
                  </td>
                  <td
                    className={cn(
                      "px-5 py-3 text-right font-mono transition-colors duration-300",
                      dark ? "text-gray-300" : "text-[#374151]"
                    )}
                  >
                    ${row.cost.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#1e3a5f]/10">
                <td
                  colSpan={2}
                  className={cn(
                    "px-5 py-3 font-bold transition-colors duration-300",
                    dark ? "text-white" : "text-[#111827]"
                  )}
                >
                  Total you&rsquo;re replacing
                </td>
                <td className="px-5 py-3 text-right text-[#1e3a5f] font-bold font-mono text-base">
                  ${saasTotal.toLocaleString()}/mo
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div
          className={cn(
            "text-center mt-4 rounded-xl py-4 px-6 transition-colors duration-300",
            dark
              ? "bg-white/[0.04] border border-white/[0.08]"
              : "bg-white border border-[#E5E7EB]"
          )}
        >
          <p
            className={cn(
              "text-sm transition-colors duration-300",
              dark ? "text-gray-400" : "text-[#6B7280]"
            )}
          >
            MilCrunch consolidates{" "}
            <span className="text-[#1e3a5f] font-bold">${saasTotal.toLocaleString()}+/mo</span>{" "}
            in fragmented tools into one military-focused platform — saving organizations
            thousands every month.
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
  "Streaming & Media": {
    headline: "Professional Live",
    headlineAccent: "Production Infrastructure",
    description:
      "Built from our experience producing 100+ live interviews at Military Influencer Conference, MilCrunch provides enterprise-grade streaming capabilities for military events.",
    sections: [
      {
        heading: "Capabilities",
        items: [
          "Multi-Platform Streaming \u2014 Simultaneous broadcast to YouTube, Facebook, Instagram, LinkedIn",
          "Professional Production \u2014 Multi-camera switching, graphics overlays, sponsor integration",
          "VOD Archive \u2014 Automatic recording and post-event content library",
          "Sponsor Showcases \u2014 Branded segments, booth tours, product demos",
          "Creator Interviews \u2014 Structured format for authentic conversations",
        ],
      },
    ],
    bottomNote: {
      heading: "Production Quality",
      text: "Broadcast-quality streaming without broadcast-level costs. Perfect for military conferences, expos, and virtual events.",
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
            {TABS.map((tab) => {
              const isFinancials = tab === "Financial Model";
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300",
                    isFinancials
                      ? activeTab === tab
                        ? "bg-[#1e3a5f] text-white shadow-lg shadow-[#1e3a5f]/30"
                        : "bg-[#1e3a5f]/90 text-white hover:bg-[#1e3a5f] shadow-md shadow-[#1e3a5f]/20"
                      : activeTab === tab
                        ? "bg-[#1e3a5f] text-white"
                        : darkMode
                          ? "text-gray-400 hover:text-white hover:bg-white/[0.06]"
                          : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]"
                  )}
                >
                  {isFinancials && <DollarSign className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />}
                  {TAB_LABELS[tab]}
                </button>
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
            <ProspectusMedia videoUrl={videoUrls[activeTab]} imageUrl={imageUrls[activeTab]} dark={darkMode} isSuperAdmin={!!isSuperAdmin} />
          </div>
        )}

        {activeTab === "Overview" && <OverviewTab dark={darkMode} videoUrl={videoUrls["Overview"]} isSuperAdmin={!!isSuperAdmin} />}
        {activeTab === "Events & Attendee App" && <ContentTab dark={darkMode} tab="Events & Attendee App" dbContent={tabContent["Events & Attendee App"]} />}
        {activeTab === "MilCrunch Experience" && <ContentTab dark={darkMode} tab="MilCrunch Experience" dbContent={tabContent["MilCrunch Experience"]} />}
        {activeTab === "Discovery" && <ContentTab dark={darkMode} tab="Discovery" dbContent={tabContent["Discovery"]} />}
        {activeTab === "Verification" && <ContentTab dark={darkMode} tab="Verification" dbContent={tabContent["Verification"]} />}
        {activeTab === "365 Insights" && <ContentTab dark={darkMode} tab="365 Insights" dbContent={tabContent["365 Insights"]} />}
        {activeTab === "Streaming & Media" && <ContentTab dark={darkMode} tab="Streaming & Media" dbContent={tabContent["Streaming & Media"]} />}
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
    </div>
  );
}
