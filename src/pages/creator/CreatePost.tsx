import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getConnectedAccounts, resolveUploadPostUsername, type ConnectedAccountRow } from "@/lib/upload-post-sync";
import { createUploadPost, type UploadPostPlatform } from "@/services/upload-post";
import CadenceCampaign from "./CadenceCampaign";
import {
  Loader2, Check, X, Link2, Plus, Eye, EyeOff, Sparkles,
  Upload, Image, Video, FileText, Download, Camera, Palette,
  Hash, Smile, Braces, Calendar, Tag, Copy,
  ChevronDown, LayoutGrid, AlertTriangle, CheckCircle2,
  Heart, MessageCircle, Bookmark, MoreHorizontal, ThumbsUp, Repeat2, Send,
} from "lucide-react";
import { PlatformIcon, PLATFORM_NAMES } from "@/lib/platform-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* Google Drive icon (not a social platform — keep local) */
const GoogleDriveIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.71 3.5L1.15 15l3.43 5.93 6.56-11.36L7.71 3.5zm1.14 0l6.57 11.36H22L15.43 3.5H8.85zM16 15.5H2.87l3.43 5.93h13.13L16 15.5z" />
  </svg>
);

/* All platforms that could be connected */
const ALL_PLATFORMS = [
  "instagram", "facebook", "x", "linkedin",
  "tiktok", "youtube", "threads", "pinterest",
  "reddit", "bluesky", "google_business",
];

/* AI post ideas */
const AI_IDEAS = [
  "Share a behind-the-scenes look at your daily routine as a veteran creator.",
  "Post a 'then vs now' side-by-side showing your military journey to civilian life.",
  "Ask your audience: 'What does service mean to you?' to spark engagement.",
  "Highlight a fellow veteran creator or small business you admire.",
];

/* Platform-specific content limits */
const platformRules: Record<string, {
  maxChars?: number; maxHashtags?: number; maxImageMB?: number; maxVideoMB?: number;
  imageRatio?: string; minImagePx?: number; maxImages?: number;
  videoOnly?: boolean; imageRequired?: boolean;
  maxTitleChars?: number; maxDescChars?: number; minVideoDuration?: number;
}> = {
  instagram: { maxChars: 2200, maxHashtags: 30, maxImageMB: 8, maxVideoMB: 100, imageRatio: "1:1, 4:5, 16:9", minImagePx: 320 },
  facebook: { maxChars: 63206, maxImageMB: 4, maxVideoMB: 1024 },
  x: { maxChars: 280, maxImageMB: 5, maxVideoMB: 512, maxImages: 4 },
  linkedin: { maxChars: 3000, maxImageMB: 5, maxVideoMB: 200, maxImages: 9 },
  tiktok: { maxChars: 2200, videoOnly: true, maxVideoMB: 287, minVideoDuration: 3 },
  youtube: { maxTitleChars: 100, maxDescChars: 5000, videoOnly: true },
  pinterest: { maxChars: 500, imageRequired: true },
  threads: { maxChars: 500, maxImages: 10 },
  google_business: { maxChars: 1500, maxImageMB: 5 },
  googlebusiness: { maxChars: 1500, maxImageMB: 5 },
};

export default function CreatePost({ noLayout, postType }: { noLayout?: boolean; postType?: "single" | "cadence" } = {}) {
  const { user, creatorProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const qTab = searchParams.get("tab");
  const qCreatorName = searchParams.get("creatorName") ?? undefined;
  const qCreatorId = searchParams.get("creatorId") ?? undefined;

  const [ownTab, setOwnTab] = useState<"single" | "cadence">(qTab === "cadence" ? "cadence" : "single");
  const activeTab = postType ?? ownTab;
  const [accounts, setAccounts] = useState<ConnectedAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"none" | "video" | "photo">("none");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduledDate, setScheduledDate] = useState("");
  const [postName, setPostName] = useState("");
  const [postLabel, setPostLabel] = useState("");
  const [shortenUrls, setShortenUrls] = useState(false);
  const [shortening, setShortening] = useState(false);
  const [captionBeforeShorten, setCaptionBeforeShorten] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [showIdeas, setShowIdeas] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState("instagram");

  /* Image preview URLs */
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  useEffect(() => {
    const urls = mediaFiles.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [mediaFiles]);

  /* Fetch connected accounts */
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    supabase
      .from("creator_social_connections")
      .select("*")
      .eq("user_id", user.id)
      .order("platform")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const mapped = data.map((r: any) => ({
            id: r.id, user_id: r.user_id, platform: r.platform,
            platform_user_id: r.upload_post_account_id ?? null,
            platform_username: r.account_name ?? null,
            profile_image_url: r.account_avatar ?? null,
            followers_count: null, raw_data: null,
            created_at: r.connected_at, updated_at: r.connected_at,
          }));
          setAccounts(mapped);
          setLoading(false);
          return;
        }
        getConnectedAccounts(user.id).then((accs) => {
          if (accs.length > 0) {
            setAccounts(accs);
          }
          setLoading(false);
        });
      });
  }, [user?.id]);

  /* Auto-select preview platform from connected */
  useEffect(() => {
    const arr = Array.from(selected);
    if (arr.length > 0 && !selected.has(previewPlatform)) setPreviewPlatform(arr[0]);
  }, [selected]);

  const toggle = (platform: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  /* ── Post logic ── */
  const executePost = async (immediate: boolean) => {
    console.log("[PostNow] handler fired, immediate:", immediate);
    if (!user?.id || !caption.trim()) { toast.error("Enter a caption."); return; }
    const selectedPlatforms = Array.from(selected) as UploadPostPlatform[];
    if (selectedPlatforms.length === 0) { toast.error("Select at least one platform."); return; }
    if (hasErrors) { toast.error("Fix validation errors before posting."); return; }
    setPosting(true);
    try {
      const upUser = await resolveUploadPostUsername(user.id);
      console.log("[PostNow] resolved UploadPost user:", upUser, "platforms:", selectedPlatforms);
      const scheduled = (!immediate && scheduledDate) ? new Date(scheduledDate).toISOString() : undefined;

      // Upload file to Supabase Storage if user selected files (mediaUrl is only for pasted URLs)
      let finalMediaUrl: string | undefined;
      let finalMediaType: "photo" | "video" | undefined;

      if (mediaFiles.length > 0) {
        const file = mediaFiles[0];
        finalMediaType = file.type.startsWith("video/") ? "video" : "photo";
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        console.log("[PostNow] uploading media to Supabase Storage:", path, "type:", file.type, "size:", file.size);

        const { error: upErr } = await supabase.storage
          .from("post-media")
          .upload(path, file, { contentType: file.type });

        if (upErr) {
          toast.error(`Media upload failed: ${upErr.message}`);
          setPosting(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("post-media")
          .getPublicUrl(path);
        finalMediaUrl = urlData.publicUrl;
        console.log("[PostNow] uploaded media URL:", finalMediaUrl);
      } else if (mediaType !== "none" && mediaUrl.trim()) {
        finalMediaUrl = mediaUrl.trim();
        finalMediaType = mediaType as "photo" | "video";
      }

      const result = await createUploadPost({
        text: caption.trim(),
        user: upUser,
        platforms: selectedPlatforms,
        media_url: finalMediaUrl,
        media_type: finalMediaType,
        scheduled_at: scheduled,
      });
      if (result.success) {
        toast.success(immediate
          ? `Posted successfully to ${selectedPlatforms.length} platform${selectedPlatforms.length !== 1 ? "s" : ""}!`
          : "Post scheduled!");
        setCaption(""); setMediaUrl(""); setScheduledDate(""); setSelected(new Set()); setMediaFiles([]);
      } else { toast.error(result.error ?? "Post failed."); }
    } catch { toast.error("Post failed."); } finally { setPosting(false); }
  };

  const handlePost = () => executePost(false);
  const handlePostNow = () => executePost(true);

  const handleAiGenerate = async () => {
    console.log("[AI Caption] handler called, aiPrompt:", JSON.stringify(aiPrompt));
    if (!aiPrompt.trim()) {
      console.warn("[AI Caption] empty prompt, aborting");
      toast.error("Enter a prompt first.");
      return;
    }
    console.log("[AI Caption] generating for prompt:", aiPrompt.trim());
    setAiLoading(true);
    try {
      const platforms = selected.size > 0 ? Array.from(selected) : ["Instagram"];
      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiPrompt.trim(), platforms }),
      });
      console.log("[AI Caption] response status:", res.status, res.statusText);
      if (res.ok) {
        const data = await res.json();
        const text = data.caption ?? "";
        if (text) {
          setCaption((prev) => prev + (prev ? "\n\n" : "") + text);
          setShowAiInput(false);
          setAiPrompt("");
          toast.success("Caption generated!");
        } else {
          toast.error("AI returned an empty response — try again.");
        }
      } else {
        const errBody = await res.text().catch(() => "");
        console.error("[AI Caption] API error:", res.status, errBody);
        toast.error(`AI generation failed (${res.status}) — try again.`);
      }
    } catch (err) {
      console.error("[AI Caption] fetch error:", err);
      toast.error("AI generation failed.");
    } finally { setAiLoading(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      setMediaFiles((prev) => [...prev, ...files]);
      setMediaType(files[0].type.startsWith("video") ? "video" : "photo");
    }
    e.target.value = "";
  };

  const handleShortenToggle = async (checked: boolean) => {
    if (checked) {
      // Find all URLs in the caption
      const urlRegex = /https?:\/\/[^\s]+/g;
      const urls = caption.match(urlRegex);
      if (!urls || urls.length === 0) {
        setShortenUrls(true);
        toast.info("No URLs found in caption to shorten.");
        return;
      }
      // Save original so we can restore on toggle off
      setCaptionBeforeShorten(caption);
      setShortenUrls(true);
      setShortening(true);
      try {
        let updated = caption;
        for (const url of urls) {
          const res = await fetch("/api/shorten-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          if (res.ok) {
            const { short } = await res.json();
            if (short) updated = updated.replace(url, short);
          }
        }
        setCaption(updated);
        toast.success(`Shortened ${urls.length} URL${urls.length !== 1 ? "s" : ""}`);
      } catch {
        toast.error("URL shortening failed.");
      } finally {
        setShortening(false);
      }
    } else {
      // Restore original caption with full URLs
      setShortenUrls(false);
      if (captionBeforeShorten !== null) {
        setCaption(captionBeforeShorten);
        setCaptionBeforeShorten(null);
        toast.success("Original URLs restored");
      }
    }
  };

  const connectedPlatforms = new Set(accounts.map((a) => a.platform));
  const noAccounts = !loading && accounts.length === 0;
  const now = new Date();
  const defaultDateLabel = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const displayName = creatorProfile?.display_name ?? user?.user_metadata?.full_name ?? "Creator";
  const creatorHandle = creatorProfile?.handle ?? "creator";
  const avatarInitial = (displayName || "C").charAt(0).toUpperCase();
  const firstPreviewUrl = previewUrls.find((_, i) => mediaFiles[i]?.type.startsWith("image/")) ?? null;

  /* ── Platform validation warnings ── */
  const warnings = useMemo(() => {
    const items: { platform: string; type: "warning" | "error"; message: string }[] = [];
    for (const p of Array.from(selected)) {
      const rules = platformRules[p];
      if (!rules) continue;
      const name = PLATFORM_NAMES[p] ?? p;
      if (rules.maxChars) {
        const len = caption.length;
        if (len > rules.maxChars) items.push({ platform: p, type: "error", message: `${name}: ${len}/${rules.maxChars} chars (over limit)` });
        else if (len > rules.maxChars * 0.8 && len > 0) items.push({ platform: p, type: "warning", message: `${name}: ${len}/${rules.maxChars} chars (approaching limit)` });
      }
      // Hashtag count check
      if (rules.maxHashtags && caption.length > 0) {
        const hashtagCount = (caption.match(/#\w+/g) || []).length;
        if (hashtagCount > rules.maxHashtags) items.push({ platform: p, type: "error", message: `${name}: ${hashtagCount}/${rules.maxHashtags} hashtags (over limit)` });
        else if (hashtagCount > rules.maxHashtags * 0.8) items.push({ platform: p, type: "warning", message: `${name}: ${hashtagCount}/${rules.maxHashtags} hashtags (approaching limit)` });
      }
      // Video-only platform check
      if (rules.videoOnly && mediaFiles.length > 0) {
        const hasNonVideo = mediaFiles.some((f) => !f.type.startsWith("video/"));
        if (hasNonVideo) items.push({ platform: p, type: "error", message: `${name}: requires video content only` });
      }
      // Image required check
      if (rules.imageRequired && mediaFiles.length === 0 && !mediaUrl.trim()) {
        items.push({ platform: p, type: "warning", message: `${name}: an image is required` });
      }
      // Max images check
      if (rules.maxImages) {
        const imageCount = mediaFiles.filter((f) => f.type.startsWith("image/")).length;
        if (imageCount > rules.maxImages) items.push({ platform: p, type: "error", message: `${name}: ${imageCount}/${rules.maxImages} images (over limit)` });
      }
      // File size checks
      for (const file of mediaFiles) {
        const sizeMB = file.size / (1024 * 1024);
        if (file.type.startsWith("image/") && rules.maxImageMB && sizeMB > rules.maxImageMB) {
          items.push({ platform: p, type: "error", message: `${name}: image "${file.name}" exceeds ${rules.maxImageMB}MB limit (${sizeMB.toFixed(1)}MB)` });
        }
        if (file.type.startsWith("video/") && rules.maxVideoMB && sizeMB > rules.maxVideoMB) {
          items.push({ platform: p, type: "error", message: `${name}: video "${file.name}" exceeds ${rules.maxVideoMB}MB limit (${sizeMB.toFixed(1)}MB)` });
        }
      }
    }
    return items;
  }, [selected, caption, mediaFiles, mediaUrl]);

  const hasErrors = warnings.some((w) => w.type === "error");

  /* ── Preview mockup renderer ── */
  const renderPreview = () => {
    const img = firstPreviewUrl;
    const captionPreview = caption || "Your caption will appear here...";
    const isTikTok = previewPlatform === "tiktok";

    if (isTikTok) {
      return (
        <div className="bg-black text-white aspect-[9/16] relative overflow-hidden flex items-end">
          {img && <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />}
          {!img && <div className="absolute inset-0 bg-gradient-to-t from-black via-gray-900 to-gray-800" />}
          <div className="relative z-10 p-3 pb-4 flex gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold mb-1">@{creatorHandle}</p>
              <p className="text-[10px] leading-snug line-clamp-3 text-white/90">{captionPreview}</p>
            </div>
            <div className="flex flex-col items-center gap-3 shrink-0 pt-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">{avatarInitial}</div>
              <Heart className="h-5 w-5" /><span className="text-[9px] -mt-2">—</span>
              <MessageCircle className="h-5 w-5" /><span className="text-[9px] -mt-2">—</span>
              <Send className="h-5 w-5" />
            </div>
          </div>
        </div>
      );
    }

    const isX = previewPlatform === "x";
    const isLinkedIn = previewPlatform === "linkedin";
    const isFacebook = previewPlatform === "facebook";

    return (
      <div className="bg-white dark:bg-gray-900 p-3 space-y-2.5">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white text-xs font-bold shrink-0">{avatarInitial}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight truncate">{displayName}</p>
            {(isX || isLinkedIn) && <p className="text-[10px] text-gray-500 leading-tight">@{creatorHandle}</p>}
            {isFacebook && <p className="text-[10px] text-gray-500 leading-tight">Just now</p>}
          </div>
          <MoreHorizontal className="h-4 w-4 text-gray-400 shrink-0" />
        </div>

        {/* Caption — X shows before image, others after */}
        {isX && <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-4 whitespace-pre-wrap">{captionPreview}</p>}

        {/* Image */}
        {img ? (
          <img src={img} alt="" className={cn("w-full object-cover", isX ? "rounded-xl max-h-48" : "max-h-56")} />
        ) : (
          <div className={cn("w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center", isX ? "rounded-xl h-32" : "h-40")}>
            <Image className="h-8 w-8 text-gray-300" />
          </div>
        )}

        {/* Caption — Instagram/LinkedIn/Facebook show after image */}
        {!isX && <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-3 whitespace-pre-wrap">{captionPreview}</p>}

        {/* Engagement row */}
        <div className="flex items-center pt-1 border-t border-gray-100 dark:border-gray-800">
          {isX ? (
            <div className="flex items-center gap-5 text-gray-500">
              <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /><span className="text-[10px]">—</span></span>
              <span className="flex items-center gap-1"><Repeat2 className="h-3.5 w-3.5" /><span className="text-[10px]">—</span></span>
              <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /><span className="text-[10px]">—</span></span>
              <Send className="h-3.5 w-3.5 ml-auto" />
            </div>
          ) : isLinkedIn || isFacebook ? (
            <div className="flex items-center gap-4 text-gray-500 w-full">
              <span className="flex items-center gap-1 text-[10px]"><ThumbsUp className="h-3.5 w-3.5" /> Like</span>
              <span className="flex items-center gap-1 text-[10px]"><MessageCircle className="h-3.5 w-3.5" /> Comment</span>
              <span className="flex items-center gap-1 text-[10px]"><Repeat2 className="h-3.5 w-3.5" /> Repost</span>
              <span className="flex items-center gap-1 text-[10px] ml-auto"><Send className="h-3.5 w-3.5" /></span>
            </div>
          ) : (
            /* Instagram */
            <div className="flex items-center w-full">
              <div className="flex items-center gap-3 text-gray-800 dark:text-gray-200">
                <Heart className="h-5 w-5" />
                <MessageCircle className="h-5 w-5" />
                <Send className="h-5 w-5" />
              </div>
              <Bookmark className="h-5 w-5 ml-auto text-gray-800 dark:text-gray-200" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const Wrapper = noLayout ? ({ children }: { children: React.ReactNode }) => <>{children}</> : CreatorLayout;

  return (
    <Wrapper>
      <div className="flex flex-col min-h-screen -mt-2">
        {/* ── TAB BAR (only when NOT embedded with postType from parent) ── */}
        {!postType && (
        <div className="shrink-0 border-b border-border bg-card">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex">
            <button
              onClick={() => setOwnTab("single")}
              className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "single"
                  ? "border-[#1B3A6B] text-[#1B3A6B] dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
              Single Post
            </button>
            <button
              onClick={() => setOwnTab("cadence")}
              className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "cadence"
                  ? "border-[#1B3A6B] text-[#1B3A6B] dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Cadence Campaign
            </button>
          </div>
        </div>
        )}

        {/* ── CADENCE CAMPAIGN TAB ── */}
        {activeTab === "cadence" && (
          <CadenceCampaign
            prefilledCreatorId={qCreatorId}
            prefilledCreatorName={qCreatorName}
          />
        )}

        {/* ── SINGLE POST TAB ── */}
        {activeTab === "single" && <>
        {/* ── SCROLLABLE CONTENT ── */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F5F7FA" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-28">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* ═══ LEFT COLUMN — FORM ═══ */}
              <div className="lg:col-span-3 space-y-6">

            {/* ── 1. INSPIRATION BANNER ── */}
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800/40 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                  <span className="mr-1.5">💡</span>
                  Need inspiration for your post?
                  <span className="ml-1 text-xs text-green-600 dark:text-green-400">({AI_IDEAS.length})</span>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800/20 text-xs h-7 gap-1"
                  onClick={() => setShowIdeas(!showIdeas)}
                >
                  {showIdeas ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showIdeas ? "Hide" : "Show"}
                </Button>
              </div>
              {showIdeas && (
                <div className="mt-3 space-y-2">
                  {AI_IDEAS.map((idea, i) => (
                    <button
                      key={i}
                      onClick={() => { setCaption(idea); setShowIdeas(false); toast.success("Idea applied!"); }}
                      className="w-full text-left rounded-lg border border-green-200 dark:border-green-800/40 bg-white dark:bg-green-900/20 px-3 py-2.5 text-sm text-green-900 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-800/30 transition-colors"
                    >
                      <span className="text-green-500 mr-1.5">✦</span>{idea}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── 2. SELECT SOCIAL ACCOUNTS ── */}
            <div className="bg-white dark:bg-card rounded-2xl p-6 space-y-4" style={{ borderLeft: "4px solid #1B3A6B", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#1B3A6B" }}>A</span>
                Select Social Accounts
              </h2>
              {noAccounts ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Connect your social accounts to start posting</p>
                  <Button size="sm" onClick={() => navigate("/creator/socials")}>
                    <Link2 className="h-4 w-4 mr-2" />Connect Accounts
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-x-3 gap-y-4">
                  {ALL_PLATFORMS.map((platform) => {
                    const connected = connectedPlatforms.has(platform);
                    const isSelected = selected.has(platform);
                    const label = PLATFORM_NAMES[platform] ?? platform;
                    const tooltipText = !connected
                      ? "Not connected \u2014 click to connect"
                      : isSelected
                        ? "\u2713 Selected for this post \u2014 click to deselect"
                        : "\u2713 Connected \u2014 click to select";
                    return (
                      <button
                        key={platform}
                        onClick={() => connected ? toggle(platform) : navigate("/creator/socials")}
                        className="group/icon flex flex-col items-center gap-1.5 cursor-pointer"
                      >
                        <div className="relative">
                          {/* Tooltip */}
                          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 opacity-0 group-hover/icon:opacity-100 transition-opacity delay-150 group-hover/icon:delay-150">
                            <div className="whitespace-nowrap rounded-lg bg-[#1B3A6B] text-white text-[12px] font-medium px-3 py-1.5 shadow-lg">
                              {tooltipText}
                            </div>
                            <div className="flex justify-center -mt-px">
                              <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#1B3A6B]" />
                            </div>
                          </div>
                          <div
                            className={cn(
                              "h-[60px] w-[60px] rounded-full flex items-center justify-center transition-all",
                              connected
                                ? isSelected
                                  ? "ring-2 ring-offset-2 ring-[#1B3A6B] dark:ring-blue-400"
                                  : "hover:ring-2 hover:ring-offset-2 hover:ring-gray-200 dark:hover:ring-gray-600"
                                : "grayscale opacity-40 hover:opacity-60"
                            )}
                          >
                            <PlatformIcon platform={platform} size={32} />
                          </div>
                          {/* Badge — bottom right */}
                          {connected ? (
                            <span className="absolute -bottom-0.5 -right-0.5 h-[16px] w-[16px] rounded-full bg-green-500 border-2 border-white dark:border-card flex items-center justify-center group-hover/icon:bg-red-500 transition-colors">
                              <Check className="h-2 w-2 text-white group-hover/icon:hidden" />
                              <X className="h-2 w-2 text-white hidden group-hover/icon:block" />
                            </span>
                          ) : (
                            <span className="absolute -bottom-0.5 -right-0.5 h-[16px] w-[16px] rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-card flex items-center justify-center">
                              <Plus className="h-2 w-2 text-white" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none truncate max-w-[60px]">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── 3. WRITE A CAPTION ── */}
            <div className="bg-white dark:bg-card rounded-2xl p-6 space-y-4" style={{ borderLeft: "4px solid #1B3A6B", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#1B3A6B" }}>B</span>
                Write a Caption
              </h2>
              <div className="rounded-xl border border-border overflow-hidden">
                <Textarea
                  value={caption}
                  onChange={(e) => {
                    setCaption(e.target.value);
                    // If user edits while shortened, the stored original is stale
                    if (captionBeforeShorten !== null) {
                      setCaptionBeforeShorten(null);
                      setShortenUrls(false);
                    }
                  }}
                  placeholder="What do you want to talk about?"
                  className="border-0 focus-visible:ring-0 resize-none min-h-[120px] text-sm rounded-none"
                />
                {showAiInput && (
                  <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-muted/30">
                    <Sparkles className="h-4 w-4 text-green-600 shrink-0" />
                    <Input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
                      placeholder="Describe the caption you want..."
                      className="h-8 text-xs flex-1 border-0 bg-transparent focus-visible:ring-0"
                      autoFocus
                    />
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={handleAiGenerate} disabled={aiLoading}>
                      {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Generate"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowAiInput(false); setAiPrompt(""); }}>
                      Cancel
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                    onClick={() => setShowAiInput(!showAiInput)}
                  >
                    <Sparkles className="h-3 w-3" />
                    AI Assistant
                  </Button>
                  <span className="text-xs text-muted-foreground">{caption.length} characters</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-t border-border">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox checked={shortenUrls} onCheckedChange={(v) => handleShortenToggle(!!v)} disabled={shortening} className="h-3.5 w-3.5" />
                    {shortening ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Shorten URLs
                  </label>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Emoji"><Smile className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Hashtag"><Hash className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Variables"><Braces className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Link"><Link2 className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PLATFORM WARNINGS ── */}
            {selected.size > 0 && (
              <div className={cn(
                "rounded-xl px-4 py-3 text-sm transition-colors",
                warnings.length === 0
                  ? "border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800/40"
                  : hasErrors
                    ? "border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800/40"
                    : "border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/40"
              )}>
                {warnings.length === 0 ? (
                  /* ✅ All good — collapsed single line */
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-medium">All platforms look good</span>
                  </div>
                ) : (
                  /* ⚠️ / 🚫 Warnings & errors */
                  <div className="space-y-1.5">
                    {warnings.map((w, i) => (
                      <div key={i} className={cn("flex items-start gap-2 text-xs",
                        w.type === "error" ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
                      )}>
                        <span className="shrink-0 mt-px">{w.type === "error" ? "🚫" : "⚠️"}</span>
                        <span>{w.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Per-platform char counts — always visible when platforms are selected */}
                {(() => {
                  const charPlatforms = Array.from(selected).filter((p) => platformRules[p]?.maxChars);
                  if (charPlatforms.length === 0) return null;
                  return (
                    <div className={cn("flex flex-wrap gap-x-4 gap-y-1", warnings.length > 0 ? "pt-2 mt-2 border-t border-current/10" : "mt-1.5")}>
                      {charPlatforms.map((p) => {
                        const max = platformRules[p].maxChars!;
                        const len = caption.length;
                        const remaining = max - len;
                        const pct = len / max;
                        return (
                          <span
                            key={p}
                            className={cn(
                              "text-[11px] font-medium",
                              pct > 1 ? "text-red-600 dark:text-red-400"
                                : pct > 0.8 ? "text-amber-600 dark:text-amber-400"
                                : "text-gray-500 dark:text-gray-400"
                            )}
                          >
                            {PLATFORM_NAMES[p] ?? p}: {len}/{max}
                            {remaining >= 0 ? ` (${remaining} left)` : ` (${Math.abs(remaining)} over)`}
                          </span>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── 4. ADD MEDIA ── */}
            <div className="bg-white dark:bg-card rounded-2xl p-6 space-y-4" style={{ borderLeft: "4px solid #7C3AED", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#7C3AED" }}>C</span>
                Add Media
                {mediaFiles.length > 0 && (
                  <span className="ml-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {mediaFiles.length} file{mediaFiles.length !== 1 ? "s" : ""}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { icon: Upload, label: "File" },
                  { icon: Image, label: "Image" },
                  { icon: Video, label: "Video" },
                  { icon: FileText, label: "Document" },
                  { icon: Download, label: "Import" },
                  { icon: Camera, label: "Screenshot" },
                  { icon: Palette, label: "Design" },
                  { icon: GoogleDriveIcon, label: "Drive" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5" />{label}
                  </button>
                ))}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              {/* Upload zone (hidden when files exist) */}
              {mediaFiles.length === 0 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-border hover:border-[#7C3AED]/40 transition-colors p-8 flex flex-col items-center gap-3"
                >
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rotate-[-6deg] rounded-lg border-2 border-border bg-muted/50" />
                    <div className="absolute inset-0 rotate-[3deg] rounded-lg border-2 border-border bg-card" />
                    <div className="absolute inset-0 rounded-lg border-2 border-border bg-card flex items-center justify-center">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-foreground">Upload media</span>
                    <p className="text-xs text-muted-foreground mt-0.5">or drag and drop your file</p>
                  </div>
                </button>
              )}
              {/* Image previews + file list */}
              {mediaFiles.length > 0 && (
                <div className="space-y-3">
                  {/* Thumbnail previews */}
                  <div className="flex flex-wrap gap-2">
                    {mediaFiles.map((file, i) => {
                      if (!file.type.startsWith("image/")) return null;
                      return (
                        <div key={i} className="relative group">
                          <img
                            src={previewUrls[i]}
                            alt={file.name}
                            className="h-[200px] max-w-full rounded-lg object-cover border border-border"
                          />
                          <button
                            onClick={() => setMediaFiles((prev) => prev.filter((_, j) => j !== i))}
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {/* File rows */}
                  {mediaFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground truncate flex-1">{file.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => setMediaFiles((prev) => prev.filter((_, j) => j !== i))} className="text-destructive hover:text-destructive/80">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {/* Add more button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add more files
                  </button>
                </div>
              )}
              {/* URL input fallback */}
              {mediaFiles.length === 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Or paste a URL:</span>
                    <div className="flex gap-2">
                      {(["photo", "video"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setMediaType(t)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors capitalize ${
                            mediaType === t ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  {mediaType !== "none" && (
                    <Input
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder={`https://example.com/my-${mediaType}.${mediaType === "video" ? "mp4" : "jpg"}`}
                      className="h-8 text-xs"
                    />
                  )}
                </div>
              )}
            </div>

            {/* ── 5. POST DETAILS ── */}
            <div className="bg-white dark:bg-card rounded-2xl p-6 space-y-4" style={{ borderLeft: "4px solid #0D9488", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#0D9488" }}>D</span>
                Post Details
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Select when to publish</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="datetime-local"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        placeholder={defaultDateLabel}
                        className="h-9 text-xs pl-9"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Name your post (optional)</label>
                    <Input
                      value={postName}
                      onChange={(e) => setPostName(e.target.value)}
                      placeholder="e.g. Weekly Update #12"
                      className="h-9 text-xs"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs gap-1.5 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20 mt-5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Clone to other calendars
                  </Button>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Add a label to track campaigns</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={postLabel}
                      onChange={(e) => setPostLabel(e.target.value)}
                      placeholder="Select or create a label..."
                      className="h-9 text-xs pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-4" />
              </div>

              {/* ═══ RIGHT COLUMN — PREVIEW ═══ */}
              <div className="lg:col-span-2 hidden lg:block">
                <div className="sticky top-8 space-y-4">
                  <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                    <div className="px-5 py-4 border-b border-border">
                      <h3 className="text-sm font-semibold text-foreground">Preview</h3>
                    </div>
                    {/* Platform tabs */}
                    {selected.size > 0 && (
                      <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-border">
                        {Array.from(selected).map((p) => (
                          <button
                            key={p}
                            onClick={() => setPreviewPlatform(p)}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-colors",
                              previewPlatform === p
                                ? "bg-[#1B3A6B] text-white"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <PlatformIcon platform={p} size={14} />
                            {PLATFORM_NAMES[p] ?? p}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Phone frame */}
                    <div className="p-4">
                      <div className="rounded-[24px] border-[3px] border-gray-300 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-900">
                        {/* Status bar */}
                        <div className="h-5 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                          <span className="text-[8px] text-muted-foreground font-medium">9:41</span>
                        </div>
                        {selected.size === 0 ? (
                          <div className="p-6 text-center">
                            <Image className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-xs text-muted-foreground">Select a platform to preview</p>
                          </div>
                        ) : (
                          renderPreview()
                        )}
                        {/* Home indicator */}
                        <div className="h-5 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                          <div className="w-16 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Character counts card */}
                  {selected.size > 0 && (
                    <div className="bg-white dark:bg-card rounded-xl p-4 shadow-sm border border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Character Counts</p>
                      <div className="space-y-1">
                        {Array.from(selected).map((p) => {
                          const rules = platformRules[p];
                          if (!rules?.maxChars) return null;
                          const name = PLATFORM_NAMES[p] ?? p;
                          const len = caption.length;
                          const max = rules.maxChars;
                          const pct = len / max;
                          return (
                            <div key={p} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{name}</span>
                              <span className={cn("font-medium", pct > 1 ? "text-red-500" : pct > 0.8 ? "text-amber-500" : "text-green-600")}>
                                {len}/{max}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── FIXED BOTTOM ACTION BAR ── */}
        <div className="fixed bottom-0 right-0 md:left-60 left-0 z-50 border-t border-border bg-white dark:bg-card px-4 sm:px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => toast.info("Progress saved!")}
            >
              Save progress
            </Button>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1 pr-7"
                  onClick={async () => {
                    if (!user?.id) return;
                    if (!caption.trim() && selected.size === 0) {
                      toast.error("Add a caption or select platforms first");
                      return;
                    }
                    const { error } = await supabase.from("post_drafts").insert({
                      user_id: user.id,
                      caption: caption.trim(),
                      platforms: Array.from(selected),
                      media_url: mediaUrl || null,
                      scheduled_at: scheduledDate ? new Date(scheduledDate).toISOString() : null,
                    });
                    if (error) {
                      console.error("Draft save error:", error);
                      toast.error("Failed to save draft");
                    } else {
                      toast.success("Saved as draft!");
                      setCaption(""); setMediaUrl(""); setScheduledDate("");
                      setPostName(""); setPostLabel("");
                    }
                  }}
                >
                  Save as draft
                </Button>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={() => handlePost()}
                disabled={posting || noAccounts || hasErrors}
              >
                {posting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Schedule
              </Button>
              <Button
                size="sm"
                className="h-9 text-xs bg-[#1B3A6B] hover:bg-[#152d54] text-white"
                onClick={() => handlePostNow()}
                disabled={posting || noAccounts || hasErrors}
              >
                {posting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Post Now
              </Button>
            </div>
          </div>
        </div>
        </>}
      </div>
    </Wrapper>
  );
}
