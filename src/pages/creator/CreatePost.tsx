import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import CampaignTab from "./CampaignTab";
import {
  Loader2, Check, X, Link2, Plus, Sparkles, ArrowRight,
  Upload, Image, Video, FileText, Download, Camera, Palette,
  Hash, Smile, Braces, Calendar, Tag, Copy,
  LayoutGrid, AlertTriangle, CheckCircle2,
  Heart, MessageCircle, Bookmark, MoreHorizontal, ThumbsUp, Repeat2, Send,
  Paperclip,
} from "lucide-react";
import { PlatformIcon, PLATFORM_NAMES } from "@/lib/platform-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* All platforms that could be connected */
const ALL_PLATFORMS = [
  "instagram", "tiktok", "youtube", "facebook",
  "linkedin", "x", "threads", "pinterest",
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

/* Platform accent colors for pills */
const PLATFORM_PILL_COLORS: Record<string, string> = {
  instagram: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-800",
  tiktok: "bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600",
  youtube: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
  facebook: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  linkedin: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800",
  x: "bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600",
  threads: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600",
  pinterest: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
};

const PLATFORM_DOT_COLORS: Record<string, string> = {
  instagram: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600",
  tiktok: "bg-black dark:bg-white",
  youtube: "bg-red-600",
  facebook: "bg-blue-600",
  linkedin: "bg-sky-600",
  x: "bg-gray-900 dark:bg-white",
  threads: "bg-gray-800 dark:bg-gray-200",
  pinterest: "bg-red-600",
};

export interface DraftEdit {
  id: string;
  caption: string | null;
  platforms: string[] | null;
  media_url: string | null;
  scheduled_at: string | null;
}

export default function CreatePost({ noLayout, postType, editDraft }: { noLayout?: boolean; postType?: "single" | "campaign" | "cadence"; editDraft?: DraftEdit | null } = {}) {
  const { user, creatorProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const qTab = searchParams.get("tab");
  const qCreatorName = searchParams.get("creatorName") ?? undefined;
  const qCreatorId = searchParams.get("creatorId") ?? undefined;

  const [ownTab, setOwnTab] = useState<"single" | "campaign" | "cadence">(qTab === "cadence" ? "cadence" : qTab === "campaign" ? "campaign" : "single");
  const activeTab = postType ?? ownTab;
  const [accounts, setAccounts] = useState<ConnectedAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"none" | "video" | "photo">("none");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [postName, setPostName] = useState("");
  const [postLabel, setPostLabel] = useState("");
  const [shortenUrls, setShortenUrls] = useState(false);
  const [shortening, setShortening] = useState(false);
  const [captionBeforeShorten, setCaptionBeforeShorten] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState("instagram");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveDraftIdRef = useRef<string | null>(null);

  /* Auto-save draft (status='autosave') on caption change with 500ms debounce */
  const runAutoSave = useCallback(async (text: string) => {
    if (!user?.id || !text.trim()) return;
    setAutoSaveStatus("saving");
    const payload = {
      caption: text.trim(),
      media_url: mediaUrl || null,
      platforms: Array.from(selected),
      status: "autosave" as const,
    };
    let err;
    if (autoSaveDraftIdRef.current) {
      ({ error: err } = await supabase.from("post_drafts").update(payload).eq("id", autoSaveDraftIdRef.current));
    } else {
      const res = await supabase.from("post_drafts").insert({ ...payload, user_id: user.id }).select("id").single();
      err = res.error;
      if (res.data) autoSaveDraftIdRef.current = res.data.id;
    }
    if (err) console.error("[AutoSave] error:", err);
    setAutoSaveStatus("saved");
    setTimeout(() => setAutoSaveStatus((s) => s === "saved" ? "idle" : s), 2500);
  }, [user?.id, mediaUrl, selected]);

  /* Populate form when editing a draft */
  useEffect(() => {
    if (!editDraft) { setDraftId(null); return; }
    setDraftId(editDraft.id);
    setCaption(editDraft.caption ?? "");
    setSelected(new Set(editDraft.platforms ?? []));
    setMediaUrl(editDraft.media_url ?? "");
    setMediaType(editDraft.media_url ? "photo" : "none");
    setScheduledDate(editDraft.scheduled_at ? editDraft.scheduled_at.slice(0, 16) : "");
    setScheduleMode(editDraft.scheduled_at ? "later" : "now");
    setMediaFiles([]);
    setPostName("");
    setPostLabel("");
  }, [editDraft]);

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

      let finalMediaUrl: string | undefined;
      let finalMediaType: "photo" | "video" | undefined;

      if (mediaFiles.length > 0) {
        const file = mediaFiles[0];
        finalMediaType = file.type.startsWith("video/") ? "video" : "photo";
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

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

        supabase.from("creator_media").insert({
          user_id: user.id,
          filename: file.name,
          file_url: finalMediaUrl,
          file_type: file.type.startsWith("video/") ? "video" : "image",
          file_size: file.size,
        }).then(({ error: mlErr }) => {
          if (mlErr) console.error("[MediaLibrary] insert error:", mlErr);
        });
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
      } else {
        const err = result.error ?? "Post failed.";
        if (/not found|uuid|profile/i.test(err)) {
          toast.error("Connect a social account to start posting. Go to My Socials to get started.");
        } else {
          toast.error(err);
        }
      }
    } catch { toast.error("Post failed."); } finally { setPosting(false); }
  };

  const handlePost = () => executePost(false);
  const handlePostNow = () => executePost(true);

  /* ── Save draft (explicit, status='draft') ── */
  const handleSaveDraft = async () => {
    if (!user?.id) return;
    if (!caption.trim() && selected.size === 0) {
      toast.error("Add a caption or select platforms first");
      return;
    }

    let savedMediaUrl = mediaUrl || null;
    if (mediaFiles.length > 0) {
      const file = mediaFiles[0];
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("post-media")
        .upload(path, file, { contentType: file.type });
      if (upErr) { toast.error(`Media upload failed: ${upErr.message}`); return; }
      const { data: urlData } = supabase.storage.from("post-media").getPublicUrl(path);
      savedMediaUrl = urlData.publicUrl;

      supabase.from("creator_media").insert({
        user_id: user.id, filename: file.name, file_url: savedMediaUrl,
        file_type: file.type.startsWith("video/") ? "video" : "image", file_size: file.size,
      }).then(({ error: mlErr }) => { if (mlErr) console.error("[MediaLibrary] insert error:", mlErr); });
    }

    const draftPayload = {
      caption: caption.trim(), media_url: savedMediaUrl,
      platforms: Array.from(selected), status: "draft" as const,
    };

    let error;
    const effectiveId = draftId || autoSaveDraftIdRef.current;
    if (effectiveId) {
      ({ error } = await supabase.from("post_drafts").update(draftPayload).eq("id", effectiveId));
    } else {
      ({ error } = await supabase.from("post_drafts").insert({ ...draftPayload, user_id: user.id }));
    }

    if (error) { console.error("Draft save error:", error); toast.error("Failed to save draft"); }
    else {
      toast.success(draftId ? "Draft updated!" : "Saved as draft!");
      setCaption(""); setMediaUrl(""); setScheduledDate("");
      setPostName(""); setPostLabel(""); setMediaFiles([]); setDraftId(null);
      autoSaveDraftIdRef.current = null;
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Enter a prompt first.");
      return;
    }
    setAiLoading(true);
    try {
      const platforms = selected.size > 0 ? Array.from(selected) : ["Instagram"];
      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiPrompt.trim(), platforms }),
      });
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
        toast.error(`AI generation failed (${res.status}) — try again.`);
      }
    } catch {
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
      const urlRegex = /https?:\/\/[^\s]+/g;
      const urls = caption.match(urlRegex);
      if (!urls || urls.length === 0) {
        setShortenUrls(true);
        toast.info("No URLs found in caption to shorten.");
        return;
      }
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

  const displayName = creatorProfile?.display_name ?? user?.user_metadata?.full_name ?? "Creator";
  const creatorHandle = creatorProfile?.handle ?? "creator";
  const avatarInitial = (displayName || "C").charAt(0).toUpperCase();
  const firstPreviewUrl = previewUrls.find((_, i) => mediaFiles[i]?.type.startsWith("image/"))
    ?? (mediaType === "photo" && mediaUrl.trim() ? mediaUrl.trim() : null);

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
      if (rules.maxHashtags && caption.length > 0) {
        const hashtagCount = (caption.match(/#\w+/g) || []).length;
        if (hashtagCount > rules.maxHashtags) items.push({ platform: p, type: "error", message: `${name}: ${hashtagCount}/${rules.maxHashtags} hashtags (over limit)` });
        else if (hashtagCount > rules.maxHashtags * 0.8) items.push({ platform: p, type: "warning", message: `${name}: ${hashtagCount}/${rules.maxHashtags} hashtags (approaching limit)` });
      }
      if (rules.videoOnly && mediaFiles.length > 0) {
        const hasNonVideo = mediaFiles.some((f) => !f.type.startsWith("video/"));
        if (hasNonVideo) items.push({ platform: p, type: "error", message: `${name}: requires video content only` });
      }
      if (rules.imageRequired && mediaFiles.length === 0 && !mediaUrl.trim()) {
        items.push({ platform: p, type: "warning", message: `${name}: an image is required` });
      }
      if (rules.maxImages) {
        const imageCount = mediaFiles.filter((f) => f.type.startsWith("image/")).length;
        if (imageCount > rules.maxImages) items.push({ platform: p, type: "error", message: `${name}: ${imageCount}/${rules.maxImages} images (over limit)` });
      }
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
              <Heart className="h-5 w-5" /><span className="text-[9px] -mt-2">&mdash;</span>
              <MessageCircle className="h-5 w-5" /><span className="text-[9px] -mt-2">&mdash;</span>
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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white text-xs font-bold shrink-0">{avatarInitial}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight truncate">{displayName}</p>
            {(isX || isLinkedIn) && <p className="text-[10px] text-gray-500 leading-tight">@{creatorHandle}</p>}
            {isFacebook && <p className="text-[10px] text-gray-500 leading-tight">Just now</p>}
          </div>
          <MoreHorizontal className="h-4 w-4 text-gray-400 shrink-0" />
        </div>

        {isX && <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-4 whitespace-pre-wrap">{captionPreview}</p>}

        {img ? (
          <img src={img} alt="" className={cn("w-full object-cover", isX ? "rounded-xl max-h-48" : "max-h-56")} />
        ) : (
          <div className={cn("w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center", isX ? "rounded-xl h-32" : "h-40")}>
            <Image className="h-8 w-8 text-gray-300" />
          </div>
        )}

        {!isX && <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-3 whitespace-pre-wrap">{captionPreview}</p>}

        <div className="flex items-center pt-1 border-t border-gray-100 dark:border-gray-800">
          {isX ? (
            <div className="flex items-center gap-5 text-gray-500">
              <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /><span className="text-[10px]">&mdash;</span></span>
              <span className="flex items-center gap-1"><Repeat2 className="h-3.5 w-3.5" /><span className="text-[10px]">&mdash;</span></span>
              <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /><span className="text-[10px]">&mdash;</span></span>
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
      <div className="flex flex-col flex-1 min-h-0">
        {/* ── TAB BAR (only when NOT embedded with postType from parent) ── */}
        {!postType && (
        <div className="shrink-0 border-b border-border bg-card">
          <div className="px-4 sm:px-6 flex">
            <button
              onClick={() => setOwnTab("single")}
              className={`px-4 py-3 text-[13px] font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "single"
                  ? "border-teal-500 text-teal-600"
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
                  ? "border-teal-500 text-teal-600"
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

        {/* ── CAMPAIGN TAB ── */}
        {activeTab === "campaign" && <CampaignTab />}

        {/* ── SINGLE POST TAB ── */}
        {activeTab === "single" && <>
        {/* ── TOP ACTION BAR ── */}
        <div className="shrink-0 bg-card border-b border-border px-4 sm:px-6 py-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* Left: auto-save indicator */}
            <div className="flex items-center gap-2">
              {autoSaveStatus !== "idle" && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  {autoSaveStatus === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
                  {autoSaveStatus === "saved" && <Check className="h-3 w-3 text-teal-500" />}
                  {autoSaveStatus === "saving" ? "Saving..." : "Draft saved"}
                </span>
              )}
            </div>
            {/* Right: action buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleSaveDraft}
              >
                Save Draft
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => handlePost()}
                disabled={posting || noAccounts || hasErrors}
              >
                {posting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Schedule
              </Button>
              <Button
                size="sm"
                className="h-9 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5"
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

        {/* ── SCROLLABLE TWO-COLUMN CONTENT ── */}
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="flex gap-6 p-6 min-h-full">

            {/* ═══ LEFT EDITOR COLUMN ═══ */}
            <div className="flex-1 min-w-0 space-y-6">

              {/* ── Section 1: Platform selector (inline pills) ── */}
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Post to</p>
                {noAccounts ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    <Link2 className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-medium text-foreground mb-1">No social accounts connected</p>
                    <p className="text-xs text-muted-foreground mb-3">Connect platforms in My Socials to start posting.</p>
                    <Button size="sm" variant="outline" onClick={() => navigate("/creator/socials")}>
                      Connect Socials <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {ALL_PLATFORMS.map((platform) => {
                      const connected = connectedPlatforms.has(platform);
                      const isSelected = selected.has(platform);
                      const label = PLATFORM_NAMES[platform] ?? platform;
                      return (
                        <button
                          key={platform}
                          onClick={() => connected ? toggle(platform) : navigate("/creator/socials")}
                          className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                            !connected
                              ? "border-border text-muted-foreground/50 opacity-50 hover:opacity-70"
                              : isSelected
                                ? cn(PLATFORM_PILL_COLORS[platform] ?? "bg-teal-50 text-teal-700 border-teal-200")
                                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                          )}
                        >
                          {isSelected ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <span className={cn("h-2 w-2 rounded-full shrink-0", PLATFORM_DOT_COLORS[platform] ?? "bg-gray-400")} />
                          )}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Section 2: Caption editor ── */}
              <div className="space-y-0">
                <Textarea
                  value={caption}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCaption(val);
                    if (captionBeforeShorten !== null) {
                      setCaptionBeforeShorten(null);
                      setShortenUrls(false);
                    }
                    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
                    autoSaveTimerRef.current = setTimeout(() => runAutoSave(val), 500);
                  }}
                  placeholder="What do you want to share today?"
                  className="border-0 focus-visible:ring-0 resize-none min-h-[200px] text-sm bg-muted/30 rounded-xl rounded-b-none px-4 py-4"
                />
                {/* AI prompt inline */}
                {showAiInput && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20 border-t border-border">
                    <Sparkles className="h-4 w-4 text-teal-500 shrink-0" />
                    <Input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
                      placeholder="Describe the caption you want..."
                      className="h-8 text-xs flex-1 border-0 bg-transparent focus-visible:ring-0"
                      autoFocus
                    />
                    <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white" onClick={handleAiGenerate} disabled={aiLoading}>
                      {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Generate"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowAiInput(false); setAiPrompt(""); }}>
                      Cancel
                    </Button>
                  </div>
                )}
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 bg-muted/20 rounded-b-xl border-t border-border">
                  <div className="flex items-center gap-1">
                    <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded hover:bg-muted transition-colors" title="Attach Media"><Paperclip className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Hashtag"><Hash className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Emoji"><Smile className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Link"><Link2 className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-900/20"
                      onClick={() => setShowAiInput(!showAiInput)}
                    >
                      <Sparkles className="h-3 w-3" />
                      AI Assistant
                    </Button>
                    <span className="text-xs text-muted-foreground">{caption.length}</span>
                  </div>
                </div>
              </div>

              {/* URL shortening */}
              <div className="flex items-center px-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox checked={shortenUrls} onCheckedChange={(v) => handleShortenToggle(!!v)} disabled={shortening} className="h-3.5 w-3.5" />
                  {shortening ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Shorten URLs
                </label>
              </div>

              {/* ── Platform validation warnings ── */}
              {selected.size > 0 && warnings.length > 0 && (
                <div className={cn(
                  "rounded-xl px-4 py-3 text-sm",
                  hasErrors
                    ? "border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800/40"
                    : "border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/40"
                )}>
                  <div className="space-y-1.5">
                    {warnings.map((w, i) => (
                      <div key={i} className={cn("flex items-start gap-2 text-xs",
                        w.type === "error" ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
                      )}>
                        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                        <span>{w.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.size > 0 && warnings.length === 0 && caption.length > 0 && (
                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 px-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">All platforms look good</span>
                </div>
              )}

              {/* ── Section 3: Media attachment ── */}
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {/* Thumbnail strip */}
                {mediaFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {mediaFiles.map((file, i) => {
                      if (!file.type.startsWith("image/")) return null;
                      return (
                        <div key={i} className="relative group">
                          <img
                            src={previewUrls[i]}
                            alt={file.name}
                            className="h-24 w-24 rounded-lg object-cover border border-border"
                          />
                          <button
                            onClick={() => setMediaFiles((prev) => prev.filter((_, j) => j !== i))}
                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="h-24 w-24 rounded-lg border-2 border-dashed border-border hover:border-foreground/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                )}
                {/* File rows (non-image) */}
                {mediaFiles.filter((f) => !f.type.startsWith("image/")).map((file, i) => (
                  <div key={`f-${i}`} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-foreground truncate flex-1">{file.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => setMediaFiles((prev) => prev.filter((_, j) => j !== mediaFiles.indexOf(file)))} className="text-destructive hover:text-destructive/80">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {/* Add media button when no files */}
                {mediaFiles.length === 0 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-border hover:border-foreground/30 transition-colors p-6 flex items-center justify-center gap-3 text-muted-foreground hover:text-foreground"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="text-sm">Add media</span>
                  </button>
                )}
                {/* URL input fallback */}
                {mediaFiles.length === 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Or paste a URL:</span>
                    <div className="flex gap-1.5">
                      {(["photo", "video"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setMediaType(t)}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-full border transition-colors capitalize",
                            mediaType === t
                              ? "border-teal-400 bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400"
                              : "border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    {mediaType !== "none" && (
                      <Input
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        placeholder={`https://example.com/my-${mediaType}.${mediaType === "video" ? "mp4" : "jpg"}`}
                        className="h-8 text-xs flex-1"
                      />
                    )}
                  </div>
                )}
                {/* Image preview for pasted/draft URL */}
                {mediaType === "photo" && mediaUrl.trim() && mediaFiles.length === 0 && (
                  <div className="relative group inline-block">
                    <img
                      src={mediaUrl.trim()}
                      alt="Media preview"
                      className="h-24 rounded-lg object-cover border border-border"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <button
                      onClick={() => { setMediaUrl(""); setMediaType("none"); }}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Section 4: Schedule toggle (single post only) ── */}
              <div className="space-y-3 border-t border-border pt-6">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setScheduleMode("now")}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                      scheduleMode === "now"
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Post immediately
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleMode("later")}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                      scheduleMode === "later"
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Schedule for later
                  </button>
                </div>
                {scheduleMode === "later" && (
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="datetime-local"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="h-9 text-xs pl-9"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ═══ RIGHT PREVIEW COLUMN ═══ */}
            <div className="hidden lg:block w-80 shrink-0">
              <div className="sticky top-0 space-y-4">
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Preview</p>
                    {/* Platform pills */}
                    {selected.size > 0 && (
                      <div className="flex gap-1">
                        {Array.from(selected).map((p) => (
                          <button
                            key={p}
                            onClick={() => setPreviewPlatform(p)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors",
                              previewPlatform === p
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {p !== "x" && <PlatformIcon platform={p} size={12} />}
                            {PLATFORM_NAMES[p] ?? p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Phone frame */}
                  <div className="p-4">
                    <div className="rounded-[24px] border-[3px] border-gray-200 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-900">
                      <div className="h-5 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                        <span className="text-[8px] text-muted-foreground font-medium">9:41</span>
                      </div>
                      {selected.size === 0 ? (
                        <div className="p-6 text-center">
                          <Image className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                          <p className="text-xs text-muted-foreground">Start writing to see your preview</p>
                        </div>
                      ) : (
                        renderPreview()
                      )}
                      <div className="h-5 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                        <div className="w-16 h-1 rounded-full bg-gray-200 dark:bg-gray-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stat estimates */}
                {selected.size > 0 && (
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Estimates</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Est. reach</span>
                      <span className="text-foreground font-medium">2.4K – 8.1K</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Best time to post</span>
                      <span className="text-foreground font-medium">6:00 PM</span>
                    </div>
                  </div>
                )}

                {/* Character counts */}
                {selected.size > 0 && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Character Counts</p>
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
                            <span className={cn("font-medium", pct > 1 ? "text-red-500" : pct > 0.8 ? "text-amber-500" : "text-teal-600")}>
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

        </>}
      </div>
    </Wrapper>
  );
}
