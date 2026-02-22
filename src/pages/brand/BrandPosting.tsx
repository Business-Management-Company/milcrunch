import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePresentationMode } from "@/hooks/usePresentationMode";
import { supabase } from "@/integrations/supabase/client";
import {
  uploadVideo,
  uploadPhotos,
  uploadText,
  type UploadPostPlatform,
  type UploadResult,
} from "@/services/upload-post";
import { getConnectedAccounts, type ConnectedAccountRow } from "@/lib/upload-post-sync";
import {
  Send,
  Clock,
  ImagePlus,
  X,
  Check,
  Loader2,
  AlertCircle,
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  Linkedin,
  FileVideo,
  Calendar,
  Trash2,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Hash,
  Save,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Pencil,
  Repeat2,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDemoMode } from "@/hooks/useDemoMode";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const PLATFORMS: {
  id: UploadPostPlatform;
  name: string;
  icon: React.ComponentType<{ className?: string }> | null;
  charLimit: number | null;
}[] = [
  { id: "instagram", name: "Instagram", icon: Instagram, charLimit: 2200 },
  { id: "tiktok", name: "TikTok", icon: null, charLimit: 2200 },
  { id: "youtube", name: "YouTube", icon: Youtube, charLimit: 5000 },
  { id: "x", name: "X", icon: Twitter, charLimit: 280 },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin, charLimit: 3000 },
  { id: "facebook", name: "Facebook", icon: Facebook, charLimit: 63206 },
];

const TikTokIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.39a8.16 8.16 0 003.76.92V6.86a4.85 4.85 0 01-.01-.17z" />
  </svg>
);

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-purple-500",
  tiktok: "bg-teal-500",
  x: "bg-blue-500",
  youtube: "bg-red-500",
  linkedin: "bg-blue-700",
  facebook: "bg-blue-600",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type PostStatus = "idle" | "posting" | "success" | "failed";
type ActiveTab = "queue" | "compose" | "calendar";

interface PlatformResult {
  status: PostStatus;
  error?: string;
  url?: string;
}

interface RecentPost {
  id: string;
  caption: string | null;
  platforms: string[] | null;
  status: string | null;
  file_url: string | null;
  scheduled_time: string | null;
  created_at: string;
  source?: "manual" | "campaign";
  campaign_name?: string;
  event_title?: string;
  campaign_id?: string;
  post_index?: number;
}

type PostType = "feed" | "story" | "reel";
type SendMode = "now" | "schedule" | "draft";
type PreviewTab = "instagram" | "tiktok" | "facebook" | "x";

/* ------------------------------------------------------------------ */
/* AI Caption Writer                                                   */
/* ------------------------------------------------------------------ */

interface AiCaption {
  text: string;
  charCount: number;
  platformFit: Record<string, "good" | "warning" | "over">;
}

async function generateCaptions(
  platforms: UploadPostPlatform[],
  context: string,
  mediaInfo?: string,
): Promise<AiCaption[]> {
  const platformNames = platforms
    .map((p) => PLATFORMS.find((x) => x.id === p)?.name ?? p)
    .join(", ");
  const platformLimits = platforms
    .map((p) => {
      const plat = PLATFORMS.find((x) => x.id === p);
      return `${plat?.name ?? p}: ${plat?.charLimit ?? "no"} char limit`;
    })
    .join("; ");

  const prompt = `Write 3 different social media caption options for posting to: ${platformNames}.
${mediaInfo ? `The media being posted: ${mediaInfo}.` : ""}
${context ? `Context / topic: ${context}` : ""}

Platform limits: ${platformLimits}

For each caption:
- Optimize length and tone for the selected platforms
- Include relevant hashtags where appropriate
- Vary the style: one professional, one casual/fun, one engaging/question-based

Return ONLY valid JSON array with 3 objects, each having a "text" field. No markdown, no code blocks, just the JSON array.`;

  const res = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error("AI request failed");
  const data = await res.json();
  const raw = data.content?.[0]?.text ?? "[]";
  const parsed: { text: string }[] = JSON.parse(raw);

  return parsed.map((item) => {
    const charCount = item.text.length;
    const platformFit: Record<string, "good" | "warning" | "over"> = {};
    for (const p of platforms) {
      const plat = PLATFORMS.find((x) => x.id === p);
      if (!plat?.charLimit) {
        platformFit[p] = "good";
      } else if (charCount > plat.charLimit) {
        platformFit[p] = "over";
      } else if (charCount > plat.charLimit - 30) {
        platformFit[p] = "warning";
      } else {
        platformFit[p] = "good";
      }
    }
    return { text: item.text, charCount, platformFit };
  });
}

/* ------------------------------------------------------------------ */
/* Helper: get platform icon component                                 */
/* ------------------------------------------------------------------ */
function getPlatformIcon(pid: string) {
  if (pid === "tiktok") return TikTokIcon;
  return PLATFORMS.find((p) => p.id === pid)?.icon ?? null;
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function BrandPosting() {
  const { user, effectiveUserId } = useAuth();
  const { guardAction } = useDemoMode();
  const userId = effectiveUserId ?? null;

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>("queue");

  // Connected accounts
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccountRow[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Compose state
  const [caption, setCaption] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<UploadPostPlatform[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [platformResults, setPlatformResults] = useState<Record<string, PlatformResult>>({});

  // New features
  const [firstComment, setFirstComment] = useState("");
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [postType, setPostType] = useState<PostType>("feed");
  const [sendMode, setSendMode] = useState<SendMode>("now");
  const [showSendMenu, setShowSendMenu] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("instagram");

  // AI caption state
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const [aiCaptions, setAiCaptions] = useState<AiCaption[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Recent posts
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Inline edit state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editScheduledTime, setEditScheduledTime] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Queue bulk selection
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Actions menu
  const [actionsMenuId, setActionsMenuId] = useState<string | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const sendMenuRef = useRef<HTMLDivElement>(null);

  // Load connected accounts
  useEffect(() => {
    if (!userId) return;
    setLoadingAccounts(true);
    getConnectedAccounts(userId)
      .then(setConnectedAccounts)
      .finally(() => setLoadingAccounts(false));
  }, [userId]);

  // Load recent posts (manual + campaign)
  const loadRecentPosts = useCallback(async () => {
    if (!userId) return;
    setLoadingPosts(true);

    // 1. Manual posts from social_posts
    const { data: manualRows } = await supabase
      .from("social_posts")
      .select("id, caption, platforms, status, file_url, scheduled_time, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    const manualPosts: RecentPost[] = ((manualRows ?? []) as RecentPost[]).map((p) => ({ ...p, source: "manual" as const }));

    // 2. Campaign posts from event_campaigns
    const { data: campaignRows } = await supabase
      .from("event_campaigns")
      .select("id, campaign_name, title, posts, event_id, created_at, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    const campaignPosts: RecentPost[] = [];
    if (campaignRows) {
      const eventIds = [...new Set(campaignRows.map((c: any) => c.event_id).filter(Boolean))];
      let eventMap = new Map<string, string>();
      if (eventIds.length > 0) {
        const { data: evts } = await supabase.from("events").select("id, title").in("id", eventIds);
        for (const ev of evts ?? []) eventMap.set((ev as any).id, (ev as any).title);
      }

      for (const campaign of campaignRows as any[]) {
        const posts = (campaign.posts ?? []) as any[];
        const cName = campaign.campaign_name || campaign.title || "Campaign";
        const eTitle = eventMap.get(campaign.event_id) || "";
        posts.forEach((post: any, idx: number) => {
          campaignPosts.push({
            id: `campaign-${campaign.id}-${idx}`,
            caption: post.caption || null,
            platforms: post.platform ? [post.platform] : null,
            status: "queued",
            file_url: null,
            scheduled_time: null,
            created_at: campaign.created_at,
            source: "campaign",
            campaign_name: cName,
            event_title: eTitle,
            campaign_id: campaign.id,
            post_index: idx,
          });
        });
      }
    }

    setRecentPosts([...campaignPosts, ...manualPosts]);
    setLoadingPosts(false);
  }, [userId]);

  useEffect(() => {
    loadRecentPosts();
  }, [loadRecentPosts]);

  // Close send menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sendMenuRef.current && !sendMenuRef.current.contains(e.target as Node)) {
        setShowSendMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Connected platform IDs
  const connectedPlatformIds = new Set(connectedAccounts.map((a) => a.platform));
  const availablePlatforms = PLATFORMS.filter((p) => connectedPlatformIds.has(p.id));

  // Default all available platforms to checked once accounts load
  useEffect(() => {
    if (availablePlatforms.length > 0 && selectedPlatforms.length === 0) {
      setSelectedPlatforms(availablePlatforms.map((p) => p.id));
    }
  }, [connectedAccounts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Character limit
  const minCharLimit = selectedPlatforms.reduce((min, pid) => {
    const p = PLATFORMS.find((x) => x.id === pid);
    return p?.charLimit ? Math.min(min, p.charLimit) : min;
  }, Infinity);
  const effectiveLimit = minCharLimit === Infinity ? null : minCharLimit;
  const charWarning = effectiveLimit && caption.length > effectiveLimit - 30;
  const charOver = effectiveLimit && caption.length > effectiveLimit;

  // Post type needed?
  const showPostType =
    selectedPlatforms.includes("instagram") || selectedPlatforms.includes("tiktok");

  /* ---------------------------------------------------------------- */
  /* Queue data                                                        */
  /* ---------------------------------------------------------------- */
  const queuePosts = useMemo(
    () => recentPosts.filter((p) => p.status === "queued" || p.status === "draft"),
    [recentPosts],
  );

  const queueGrouped = useMemo(() => {
    const groups = new Map<string, { name: string; posts: RecentPost[] }>();
    const ungrouped: RecentPost[] = [];
    for (const post of queuePosts) {
      if (post.campaign_id) {
        const existing = groups.get(post.campaign_id);
        if (existing) {
          existing.posts.push(post);
        } else {
          groups.set(post.campaign_id, {
            name: post.campaign_name || "Campaign",
            posts: [post],
          });
        }
      } else {
        ungrouped.push(post);
      }
    }
    return { campaigns: Array.from(groups.entries()), ungrouped };
  }, [queuePosts]);

  /* ---------------------------------------------------------------- */
  /* Calendar data                                                     */
  /* ---------------------------------------------------------------- */
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();

  const calendarPosts = useMemo(() => {
    return recentPosts.filter((p) => {
      if (!p.scheduled_time) return false;
      const d = new Date(p.scheduled_time);
      return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth;
    });
  }, [recentPosts, calendarYear, calendarMonth]);

  const postsByDay = useMemo(() => {
    const map = new Map<number, RecentPost[]>();
    for (const p of calendarPosts) {
      const day = new Date(p.scheduled_time!).getDate();
      const existing = map.get(day);
      if (existing) existing.push(p);
      else map.set(day, [p]);
    }
    return map;
  }, [calendarPosts]);

  const selectedDayPosts = selectedDay ? (postsByDay.get(selectedDay) ?? []) : [];

  // File handling
  const handleFileSelect = (f: File) => {
    setFile(f);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  };

  const clearFile = () => {
    setFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Toggle platform
  const togglePlatform = (id: UploadPostPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // AI caption generation
  const handleGenerateCaptions = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform first.");
      return;
    }
    setAiLoading(true);
    setAiCaptions([]);
    try {
      const mediaInfo = file ? `${file.name} (${file.type})` : undefined;
      const captions = await generateCaptions(selectedPlatforms, aiContext, mediaInfo);
      setAiCaptions(captions);
      setShowAiPrompt(false);
    } catch {
      toast.error("Failed to generate captions. Try again.");
    } finally {
      setAiLoading(false);
    }
  };

  // Save as draft
  const handleSaveDraft = async () => {
    if (!userId) return;
    try {
      await supabase.from("social_posts").insert({
        user_id: userId,
        caption: caption.trim(),
        platforms: selectedPlatforms,
        file_url: file?.name || null,
        scheduled_time: null,
        status: "draft",
        results: {},
      } as Record<string, unknown>);
      toast.success("Draft saved!");
      loadRecentPosts();
    } catch {
      toast.error("Failed to save draft.");
    }
  };

  // Post
  const handlePost = async () => {
    if (guardAction("social_post")) return;
    if (sendMode === "draft") {
      await handleSaveDraft();
      return;
    }

    if (!userId || selectedPlatforms.length === 0 || (!caption.trim() && !file)) {
      toast.error("Add a caption or media and select at least one platform.");
      return;
    }

    setPosting(true);
    const initResults: Record<string, PlatformResult> = {};
    selectedPlatforms.forEach((p) => (initResults[p] = { status: "posting" }));
    setPlatformResults(initResults);

    try {
      const schedDate =
        sendMode === "schedule" && scheduledTime
          ? new Date(scheduledTime).toISOString()
          : undefined;

      let result: UploadResult;

      const fc = firstComment.trim() || undefined;
      const mt = showPostType && postType !== "feed" ? postType : undefined;

      if (file?.type.startsWith("video/")) {
        result = await uploadVideo({
          title: caption.trim(),
          user: userId,
          platform: selectedPlatforms,
          video: file,
          scheduled_date: schedDate,
          first_comment: fc,
          media_type: mt,
        });
      } else if (file) {
        result = await uploadPhotos({
          title: caption.trim(),
          user: userId,
          platform: selectedPlatforms,
          photos: [file],
          scheduled_date: schedDate,
          first_comment: fc,
          media_type: mt,
        });
      } else {
        result = await uploadText({
          title: caption.trim(),
          user: userId,
          platform: selectedPlatforms,
          scheduled_date: schedDate,
          first_comment: fc,
          media_type: mt,
        });
      }

      // Parse per-platform results
      const finalResults: Record<string, PlatformResult> = {};
      if (result.results) {
        for (const [plat, res] of Object.entries(result.results)) {
          finalResults[plat] = {
            status: res.success ? "success" : "failed",
            error: res.error,
          };
        }
      } else if (result.success || result.id || result.request_id) {
        selectedPlatforms.forEach((p) => (finalResults[p] = { status: "success" }));
      } else {
        selectedPlatforms.forEach(
          (p) => (finalResults[p] = { status: "failed", error: result.error })
        );
      }
      setPlatformResults(finalResults);

      const anySuccess = Object.values(finalResults).some((r) => r.status === "success");
      const overallStatus = anySuccess ? "posted" : "failed";

      // Save to social_posts
      await supabase.from("social_posts").insert({
        user_id: userId,
        caption: caption.trim(),
        platforms: selectedPlatforms,
        file_url: file?.name || null,
        scheduled_time: schedDate || null,
        status: schedDate ? "scheduled" : overallStatus,
        results: finalResults,
      } as Record<string, unknown>);

      if (anySuccess) {
        toast.success(schedDate ? "Post scheduled!" : "Post published!");
      } else {
        toast.error(result.error || "Post failed. Check platform statuses.");
      }

      loadRecentPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Post failed";
      toast.error(msg);
      const failResults: Record<string, PlatformResult> = {};
      selectedPlatforms.forEach((p) => (failResults[p] = { status: "failed", error: msg }));
      setPlatformResults(failResults);
    } finally {
      setPosting(false);
    }
  };

  // Reset compose
  const resetCompose = () => {
    setCaption("");
    setSelectedPlatforms([]);
    clearFile();
    setSendMode("now");
    setScheduledTime("");
    setPlatformResults({});
    setFirstComment("");
    setPostType("feed");
    setShowMoreOptions(false);
    setAiCaptions([]);
    setAiContext("");
    setShowAiPrompt(false);
  };

  // Inline edit handlers
  const handleStartEdit = (post: RecentPost) => {
    setEditingPostId(post.id);
    setEditCaption(post.caption || "");
    setEditScheduledTime(post.scheduled_time ? new Date(post.scheduled_time).toISOString().slice(0, 16) : "");
    setActionsMenuId(null);
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditCaption("");
    setEditScheduledTime("");
  };

  const handleSaveEdit = async (post: RecentPost) => {
    if (guardAction("social_post")) return;
    setEditSaving(true);
    try {
      if (post.source === "campaign" && post.campaign_id != null && post.post_index != null) {
        const { data: campaign } = await supabase
          .from("event_campaigns")
          .select("posts")
          .eq("id", post.campaign_id)
          .single();
        if (campaign) {
          const posts = [...((campaign as any).posts ?? [])];
          if (posts[post.post_index]) {
            posts[post.post_index] = { ...posts[post.post_index], caption: editCaption.trim() };
            await supabase.from("event_campaigns").update({ posts } as Record<string, unknown>).eq("id", post.campaign_id);
          }
        }
      } else {
        const updates: Record<string, unknown> = { caption: editCaption.trim() };
        if (editScheduledTime) updates.scheduled_time = new Date(editScheduledTime).toISOString();
        await supabase.from("social_posts").update(updates).eq("id", post.id);
      }
      toast.success("Post updated!");
      setEditingPostId(null);
      loadRecentPosts();
    } catch {
      toast.error("Failed to update post.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleApproveSchedule = async (post: RecentPost) => {
    if (guardAction("social_post")) return;
    setActionsMenuId(null);
    if (post.source === "campaign") {
      try {
        await supabase.from("social_posts").insert({
          user_id: userId,
          caption: post.caption,
          platforms: post.platforms,
          status: "scheduled",
          file_url: null,
          scheduled_time: new Date(Date.now() + 3600000).toISOString(),
          results: {},
        } as Record<string, unknown>);
        toast.success("Post approved and scheduled!");
        loadRecentPosts();
      } catch {
        toast.error("Failed to schedule post.");
      }
    } else {
      try {
        await supabase.from("social_posts").update({ status: "scheduled" } as Record<string, unknown>).eq("id", post.id);
        toast.success("Post scheduled!");
        loadRecentPosts();
      } catch {
        toast.error("Failed to schedule post.");
      }
    }
  };

  const handleRemoveFromQueue = async (post: RecentPost) => {
    if (guardAction("social_post")) return;
    setActionsMenuId(null);
    if (post.source === "campaign" && post.campaign_id != null && post.post_index != null) {
      try {
        const { data: campaign } = await supabase
          .from("event_campaigns")
          .select("posts")
          .eq("id", post.campaign_id)
          .single();
        if (campaign) {
          const posts = [...((campaign as any).posts ?? [])];
          posts.splice(post.post_index, 1);
          await supabase.from("event_campaigns").update({ posts } as Record<string, unknown>).eq("id", post.campaign_id);
        }
        toast.success("Post removed from queue.");
        loadRecentPosts();
      } catch {
        toast.error("Failed to remove post.");
      }
    } else {
      try {
        await supabase.from("social_posts").update({ status: "draft" } as Record<string, unknown>).eq("id", post.id);
        toast.success("Post moved to drafts.");
        loadRecentPosts();
      } catch {
        toast.error("Failed to update post.");
      }
    }
  };

  // Bulk approve
  const handleBulkApprove = async () => {
    if (guardAction("social_post")) return;
    const postsToApprove = queuePosts.filter((p) => selectedPostIds.has(p.id));
    let count = 0;
    for (const post of postsToApprove) {
      try {
        if (post.source === "campaign") {
          await supabase.from("social_posts").insert({
            user_id: userId,
            caption: post.caption,
            platforms: post.platforms,
            status: "scheduled",
            file_url: null,
            scheduled_time: new Date(Date.now() + 3600000).toISOString(),
            results: {},
          } as Record<string, unknown>);
        } else {
          await supabase.from("social_posts").update({ status: "scheduled" } as Record<string, unknown>).eq("id", post.id);
        }
        count++;
      } catch {
        // continue with others
      }
    }
    toast.success(`${count} post${count !== 1 ? "s" : ""} approved and scheduled!`);
    setSelectedPostIds(new Set());
    loadRecentPosts();
  };

  // Close actions menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setActionsMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const canPost =
    sendMode === "draft"
      ? caption.trim().length > 0 || file
      : selectedPlatforms.length > 0 &&
        (caption.trim().length > 0 || file) &&
        !charOver &&
        !posting;

  const hasResults = Object.keys(platformResults).length > 0;

  const pres = usePresentationMode();
  const displayName = pres.displayName;
  const displayInitial = (pres.initials?.[0] ?? displayName[0])?.toUpperCase() || "R";

  /* ---------------------------------------------------------------- */
  /* Preview Renderers                                                 */
  /* ---------------------------------------------------------------- */

  const previewCaption = caption.trim() || "";
  const previewUsername = displayName.toLowerCase().replace(/\s+/g, "");

  const InstagramPreview = () => (
    <div className="bg-white dark:bg-[#0F1117] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-w-[320px] mx-auto">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] p-[2px]">
          <div className="w-full h-full rounded-full bg-white dark:bg-[#0F1117] flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-gray-300">
            {displayInitial}
          </div>
        </div>
        <span className="text-xs font-semibold text-gray-900 dark:text-white">{previewUsername}</span>
        <MoreHorizontal className="h-4 w-4 text-gray-400 ml-auto" />
      </div>
      {filePreview ? (
        <img src={filePreview} alt="Preview" className="w-full aspect-square object-cover" />
      ) : file ? (
        <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <FileVideo className="h-10 w-10 text-gray-400" />
        </div>
      ) : (
        <div className="w-full aspect-square bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
          <ImagePlus className="h-10 w-10 text-gray-300 dark:text-gray-600" />
        </div>
      )}
      <div className="flex items-center gap-4 px-3 py-2.5">
        <Heart className="h-5 w-5 text-gray-900 dark:text-white" />
        <MessageCircle className="h-5 w-5 text-gray-900 dark:text-white" />
        <Share2 className="h-5 w-5 text-gray-900 dark:text-white" />
        <Bookmark className="h-5 w-5 text-gray-900 dark:text-white ml-auto" />
      </div>
      <div className="px-3 pb-3">
        {previewCaption ? (
          <p className="text-xs text-gray-900 dark:text-gray-200 leading-relaxed">
            <span className="font-semibold">{previewUsername}</span>{" "}
            {previewCaption.length > 125
              ? <>{previewCaption.slice(0, 125)}<span className="text-gray-400">... more</span></>
              : previewCaption}
          </p>
        ) : (
          <p className="text-xs text-gray-400 italic">Caption preview...</p>
        )}
      </div>
    </div>
  );

  const XPreview = () => (
    <div className="bg-white dark:bg-[#0F1117] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-w-[320px] mx-auto p-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-[#6C5CE7] flex items-center justify-center text-white text-sm font-bold shrink-0">
          {displayInitial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{displayName}</span>
            <span className="text-xs text-gray-400">@{previewUsername}</span>
          </div>
          {previewCaption ? (
            <p className="text-sm text-gray-900 dark:text-gray-200 mt-1 whitespace-pre-wrap leading-relaxed">
              {previewCaption}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic mt-1">Your post preview...</p>
          )}
          {previewCaption.length > 280 && (
            <p className="text-xs text-red-500 font-medium mt-1.5">
              {previewCaption.length}/280 — over X character limit
            </p>
          )}
          {filePreview && (
            <img src={filePreview} alt="Preview" className="w-full rounded-xl mt-3 border border-gray-200 dark:border-gray-700" />
          )}
          <div className="flex items-center justify-between mt-3 text-gray-400 max-w-[240px]">
            <MessageCircle className="h-4 w-4" />
            <Repeat2 className="h-4 w-4" />
            <Heart className="h-4 w-4" />
            <Share2 className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );

  const TikTokPreview = () => (
    <div className="bg-black rounded-2xl border border-gray-700 overflow-hidden max-w-[200px] mx-auto relative" style={{ height: 360 }}>
      {filePreview ? (
        <img src={filePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center">
          {file ? <FileVideo className="h-10 w-10 text-gray-500" /> : <ImagePlus className="h-10 w-10 text-gray-600" />}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center">
          <Heart className="h-6 w-6 text-white" />
          <span className="text-[10px] text-white mt-0.5">0</span>
        </div>
        <div className="flex flex-col items-center">
          <MessageCircle className="h-6 w-6 text-white" />
          <span className="text-[10px] text-white mt-0.5">0</span>
        </div>
        <div className="flex flex-col items-center">
          <Share2 className="h-6 w-6 text-white" />
          <span className="text-[10px] text-white mt-0.5">0</span>
        </div>
      </div>
      <div className="absolute bottom-3 left-3 right-14">
        <p className="text-white text-xs font-semibold">@{previewUsername}</p>
        {previewCaption ? (
          <p className="text-white text-[10px] mt-1 leading-relaxed line-clamp-2">{previewCaption}</p>
        ) : (
          <p className="text-gray-400 text-[10px] mt-1 italic">Caption...</p>
        )}
      </div>
    </div>
  );

  const FacebookPreview = () => (
    <div className="bg-white dark:bg-[#0F1117] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-w-[320px] mx-auto">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-sm font-bold">
          {displayInitial}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{displayName}</p>
          <p className="text-[10px] text-gray-400">Just now</p>
        </div>
      </div>
      <div className="px-4 pb-2">
        {previewCaption ? (
          <p className="text-sm text-gray-900 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{previewCaption}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">Your post preview...</p>
        )}
      </div>
      {filePreview && (
        <img src={filePreview} alt="Preview" className="w-full" />
      )}
      {file && !filePreview && (
        <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <FileVideo className="h-10 w-10 text-gray-400" />
        </div>
      )}
      <div className="flex items-center border-t border-gray-200 dark:border-gray-700 mt-2">
        <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
          <ThumbsUp className="h-4 w-4" /> Like
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
          <MessageCircle className="h-4 w-4" /> Comment
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Queue Post Card                                                   */
  /* ---------------------------------------------------------------- */
  const QueueCard = ({ post }: { post: RecentPost }) => {
    const isEditing = editingPostId === post.id;
    const isSelected = selectedPostIds.has(post.id);
    const platforms = (post.platforms as string[] | null) ?? [];

    return (
      <div
        className={cn(
          "bg-white dark:bg-[#1A1D27] rounded-xl border p-4 transition-all",
          isSelected
            ? "border-[#6C5CE7] ring-1 ring-[#6C5CE7]/20"
            : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700",
        )}
      >
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1117] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30"
            />
            {post.source !== "campaign" && (
              <input
                type="datetime-local"
                value={editScheduledTime}
                onChange={(e) => setEditScheduledTime(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1117] text-xs focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30"
              />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSaveEdit(post)}
                disabled={editSaving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#6C5CE7] text-white text-xs font-medium hover:bg-[#5B4BD1] disabled:opacity-50"
              >
                {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Save
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <button
              type="button"
              onClick={() => {
                setSelectedPostIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(post.id)) next.delete(post.id);
                  else next.add(post.id);
                  return next;
                });
              }}
              className={cn(
                "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                isSelected
                  ? "bg-[#6C5CE7] border-[#6C5CE7]"
                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0F1117]",
              )}
            >
              {isSelected && <Check className="h-3 w-3 text-white" />}
            </button>

            {/* Platform icon */}
            <div className="shrink-0">
              {platforms.length > 0 ? (
                <div className="flex -space-x-1">
                  {platforms.slice(0, 2).map((pid) => {
                    const Icon = getPlatformIcon(pid);
                    return (
                      <div
                        key={pid}
                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-[#1A1D27] flex items-center justify-center"
                      >
                        {Icon && <Icon className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                {post.caption ? (post.caption.length > 100 ? post.caption.slice(0, 100) + "..." : post.caption) : "No caption"}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                {post.scheduled_time && (
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(post.scheduled_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                    post.status === "queued" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                    post.status === "draft" && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                    post.status === "scheduled" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                  )}
                >
                  {post.status || "draft"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleApproveSchedule(post)}
                className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 transition-colors"
                title="Approve"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleStartEdit(post)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleRemoveFromQueue(post)}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-pd-navy dark:text-white">
            Social Posting
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your campaign queue, compose posts, and view your content calendar.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-800 mb-6">
          <div className="flex gap-6">
            {([
              { id: "queue" as const, label: "Queue", count: queuePosts.length },
              { id: "compose" as const, label: "Compose", count: null },
              { id: "calendar" as const, label: "Calendar", count: null },
            ]).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative pb-3 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "text-[#6C5CE7]"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
                )}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  {tab.count !== null && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                        activeTab === tab.id
                          ? "bg-[#6C5CE7]/10 text-[#6C5CE7]"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </span>
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6C5CE7] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: Queue                                                  */}
        {/* ============================================================ */}
        {activeTab === "queue" && (
          <div>
            {/* Bulk actions bar */}
            {queuePosts.length > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPostIds.size === queuePosts.length) {
                      setSelectedPostIds(new Set());
                    } else {
                      setSelectedPostIds(new Set(queuePosts.map((p) => p.id)));
                    }
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                      selectedPostIds.size === queuePosts.length && queuePosts.length > 0
                        ? "bg-[#6C5CE7] border-[#6C5CE7]"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0F1117]",
                    )}
                  >
                    {selectedPostIds.size === queuePosts.length && queuePosts.length > 0 && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  Select All
                </button>
                {selectedPostIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkApprove}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6C5CE7] text-white text-sm font-medium hover:bg-[#5B4BD1] transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    Approve Selected ({selectedPostIds.size})
                  </button>
                )}
              </div>
            )}

            {loadingPosts ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : queuePosts.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No posts in queue.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("compose")}
                  className="mt-3 text-sm text-[#6C5CE7] font-medium hover:underline"
                >
                  Generate a campaign to get started →
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Campaign groups */}
                {queueGrouped.campaigns.map(([campaignId, group]) => (
                  <div key={campaignId}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6C5CE7]" />
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {group.name}
                      </h3>
                      <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        {group.posts.length} post{group.posts.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.posts.map((post) => (
                        <QueueCard key={post.id} post={post} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Ungrouped posts */}
                {queueGrouped.ungrouped.length > 0 && (
                  <div>
                    {queueGrouped.campaigns.length > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Individual Posts
                        </h3>
                        <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                          {queueGrouped.ungrouped.length}
                        </span>
                      </div>
                    )}
                    <div className="space-y-2">
                      {queueGrouped.ungrouped.map((post) => (
                        <QueueCard key={post.id} post={post} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: Compose                                                */}
        {/* ============================================================ */}
        {activeTab === "compose" && (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* LEFT — Compose */}
            <div className="lg:col-span-3 space-y-5">
              {/* Caption */}
              <div className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What do you want to share?"
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1117] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7] transition-all"
                />
                <div className="flex items-center justify-between mt-2">
                  <p
                    className={cn(
                      "text-xs",
                      charOver
                        ? "text-red-500 font-semibold"
                        : charWarning
                          ? "text-amber-500"
                          : "text-gray-400"
                    )}
                  >
                    {caption.length}
                    {effectiveLimit && ` / ${effectiveLimit}`} characters
                    {charOver && " — over limit for " + selectedPlatforms.find((p) => {
                      const plat = PLATFORMS.find((x) => x.id === p);
                      return plat?.charLimit && caption.length > plat.charLimit;
                    })}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      if (showAiPrompt) {
                        setShowAiPrompt(false);
                      } else {
                        setAiCaptions([]);
                        setShowAiPrompt(true);
                      }
                    }}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#6C5CE7] hover:text-[#5B4BD1] transition-colors disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Write with AI
                  </button>
                </div>

                {/* AI Prompt Popover */}
                {showAiPrompt && (
                  <div className="mt-3 p-3 rounded-xl bg-[#6C5CE7]/5 dark:bg-[#6C5CE7]/10 border border-[#6C5CE7]/20">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      What's this post about? <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={aiContext}
                      onChange={(e) => setAiContext(e.target.value)}
                      placeholder="e.g. Behind the scenes at our military appreciation event..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F1117] text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
                      onKeyDown={(e) => e.key === "Enter" && handleGenerateCaptions()}
                    />
                    <button
                      type="button"
                      onClick={handleGenerateCaptions}
                      disabled={aiLoading || selectedPlatforms.length === 0}
                      className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6C5CE7] text-white text-xs font-semibold hover:bg-[#5B4BD1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" /> Generate 3 Options
                        </>
                      )}
                    </button>
                    {selectedPlatforms.length === 0 && (
                      <p className="text-[10px] text-amber-500 mt-1.5">Select platforms first so AI can optimize for them.</p>
                    )}
                  </div>
                )}

                {/* AI Caption Options */}
                {aiCaptions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Pick a caption:</p>
                    {aiCaptions.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setCaption(opt.text);
                          setAiCaptions([]);
                        }}
                        className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#6C5CE7]/40 hover:bg-[#6C5CE7]/5 dark:hover:bg-[#6C5CE7]/10 transition-all group"
                      >
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed line-clamp-4">
                          {opt.text}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-gray-400">{opt.charCount} chars</span>
                          <div className="flex gap-1.5">
                            {Object.entries(opt.platformFit).map(([pid, fit]) => {
                              const plat = PLATFORMS.find((p) => p.id === pid);
                              return (
                                <span
                                  key={pid}
                                  className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                    fit === "good" && "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                                    fit === "warning" && "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
                                    fit === "over" && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                                  )}
                                >
                                  {plat?.name ?? pid}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Media upload */}
              <div className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Media <span className="text-gray-400 font-normal">— Optional</span>
                </label>
                {file ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-full max-h-64 object-contain bg-gray-50 dark:bg-[#0F1117]"
                      />
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-6 bg-gray-50 dark:bg-[#0F1117]">
                        <FileVideo className="h-8 w-8 text-[#6C5CE7]" />
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {(file.size / (1024 * 1024)).toFixed(1)} MB
                          </p>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={clearFile}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    ref={dropRef}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl px-6 py-10 text-center cursor-pointer hover:border-[#6C5CE7]/40 transition-colors"
                  >
                    <ImagePlus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Drag & drop or{" "}
                      <span className="text-[#6C5CE7] font-medium">click to upload</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Image (PNG, JPG, WebP) or Video (MP4)
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/mp4"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
              </div>

              {/* Platform selector */}
              <div className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Publish To
                  </label>
                  {availablePlatforms.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPlatforms(
                          selectedPlatforms.length === availablePlatforms.length
                            ? []
                            : availablePlatforms.map((p) => p.id)
                        )
                      }
                      className="text-xs font-medium text-[#6C5CE7] hover:underline"
                    >
                      {selectedPlatforms.length === availablePlatforms.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  )}
                </div>
                {loadingAccounts ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading connected accounts...
                  </div>
                ) : availablePlatforms.length === 0 ? (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      No connected accounts found. Connect your socials from the{" "}
                      <a href="/brand/integrations" className="underline font-medium">
                        Settings
                      </a>{" "}
                      page first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availablePlatforms.map((p) => {
                      const selected = selectedPlatforms.includes(p.id);
                      const Icon = p.id === "tiktok" ? TikTokIcon : p.icon;
                      const account = connectedAccounts.find(
                        (a) => a.platform === p.id
                      );
                      return (
                        <label
                          key={p.id}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all",
                            selected
                              ? "border-[#6C5CE7] bg-[#6C5CE7]/5 dark:bg-[#6C5CE7]/10"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          )}
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                              selected
                                ? "bg-[#6C5CE7] border-[#6C5CE7]"
                                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0F1117]"
                            )}
                            onClick={(e) => { e.preventDefault(); togglePlatform(p.id); }}
                          >
                            {selected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                            {Icon && <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</p>
                            {account?.platform_username && (
                              <p className="text-[10px] text-gray-400 truncate">@{account.platform_username}</p>
                            )}
                          </div>
                          {selected && (
                            <span className="text-[10px] font-medium text-[#6C5CE7] bg-[#6C5CE7]/10 px-2 py-0.5 rounded-full shrink-0">
                              Active
                            </span>
                          )}
                        </label>
                      );
                    })}
                    {selectedPlatforms.length > 0 && (
                      <p className="text-xs text-gray-400 pt-1">
                        Posting simultaneously to {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}

                {/* Post Type selector */}
                {showPostType && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Post Type
                    </label>
                    <div className="inline-flex rounded-lg bg-gray-100 dark:bg-[#0F1117] p-0.5">
                      {(["feed", "story", "reel"] as PostType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setPostType(type)}
                          className={cn(
                            "px-4 py-1.5 rounded-md text-xs font-medium transition-all capitalize",
                            postType === type
                              ? "bg-white dark:bg-[#1A1D27] text-[#6C5CE7] shadow-sm"
                              : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* More Options */}
              <div className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  className="flex items-center justify-between w-full px-5 py-3.5"
                >
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                    More Options
                  </span>
                  {showMoreOptions ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                {showMoreOptions && (
                  <div className="px-5 pb-5 pt-0 border-t border-gray-100 dark:border-gray-800">
                    <div className="pt-4">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5" />
                        First Comment
                      </label>
                      <textarea
                        value={firstComment}
                        onChange={(e) => setFirstComment(e.target.value)}
                        placeholder="Great for hashtags on Instagram & TikTok"
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1117] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7] transition-all"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">
                        This will be posted as the first comment on Instagram & TikTok.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Send actions */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1" ref={sendMenuRef}>
                  <div className="flex">
                    <button
                      type="button"
                      onClick={handlePost}
                      disabled={!canPost}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-l-xl text-sm font-semibold transition-all",
                        canPost
                          ? "bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      {posting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Posting...
                        </>
                      ) : sendMode === "draft" ? (
                        <>
                          <Save className="h-4 w-4" /> Save Draft
                        </>
                      ) : sendMode === "schedule" ? (
                        <>
                          <Clock className="h-4 w-4" /> Schedule Post
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> Post Now
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSendMenu(!showSendMenu)}
                      className={cn(
                        "flex items-center justify-center px-3 py-3 rounded-r-xl border-l text-sm transition-all",
                        canPost || sendMode === "draft"
                          ? "bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white border-[#5B4BD1]"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border-gray-200 dark:border-gray-700"
                      )}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {showSendMenu && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden z-20">
                      <button
                        type="button"
                        onClick={() => { setSendMode("now"); setShowSendMenu(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#0F1117] transition-colors",
                          sendMode === "now" && "text-[#6C5CE7] font-medium"
                        )}
                      >
                        <Send className="h-4 w-4" />
                        <div>
                          <p className="font-medium">Post Immediately</p>
                          <p className="text-[10px] text-gray-400">Publish to selected platforms now</p>
                        </div>
                        {sendMode === "now" && <Check className="h-4 w-4 ml-auto text-[#6C5CE7]" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSendMode("schedule"); setShowSendMenu(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#0F1117] transition-colors border-t border-gray-100 dark:border-gray-800",
                          sendMode === "schedule" && "text-[#6C5CE7] font-medium"
                        )}
                      >
                        <Calendar className="h-4 w-4" />
                        <div>
                          <p className="font-medium">Schedule for...</p>
                          <p className="text-[10px] text-gray-400">Pick a date & time to publish</p>
                        </div>
                        {sendMode === "schedule" && <Check className="h-4 w-4 ml-auto text-[#6C5CE7]" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSendMode("draft"); setShowSendMenu(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#0F1117] transition-colors border-t border-gray-100 dark:border-gray-800",
                          sendMode === "draft" && "text-[#6C5CE7] font-medium"
                        )}
                      >
                        <Save className="h-4 w-4" />
                        <div>
                          <p className="font-medium">Save as Draft</p>
                          <p className="text-[10px] text-gray-400">Save without posting</p>
                        </div>
                        {sendMode === "draft" && <Check className="h-4 w-4 ml-auto text-[#6C5CE7]" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule picker */}
              {sendMode === "schedule" && (
                <div className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Schedule for
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1117] text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7] transition-all"
                  />
                </div>
              )}

              {hasResults && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={resetCompose}
                    className="flex items-center gap-2 text-sm text-[#6C5CE7] hover:underline font-medium"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> New Post
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT — Preview + Status */}
            <div className="lg:col-span-2 space-y-5">
              {/* Per-platform preview */}
              <div className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Preview
                </h3>

                <div className="flex rounded-lg bg-gray-100 dark:bg-[#0F1117] p-0.5 mb-4">
                  {(["instagram", "tiktok", "facebook", "x"] as PreviewTab[]).map((tab) => {
                    const plat = PLATFORMS.find((p) => p.id === tab);
                    const Icon = tab === "tiktok" ? TikTokIcon : plat?.icon;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setPreviewTab(tab)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all",
                          previewTab === tab
                            ? "bg-white dark:bg-[#1A1D27] text-[#6C5CE7] shadow-sm"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                        )}
                      >
                        {Icon && <Icon className="h-3.5 w-3.5" />}
                        {plat?.name ?? tab}
                      </button>
                    );
                  })}
                </div>

                {previewTab === "instagram" && <InstagramPreview />}
                {previewTab === "x" && <XPreview />}
                {previewTab === "tiktok" && <TikTokPreview />}
                {previewTab === "facebook" && <FacebookPreview />}
              </div>

              {/* Platform status */}
              {(selectedPlatforms.length > 0 || hasResults) && (
                <div className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Platform Status
                  </h3>
                  <div className="space-y-2.5">
                    {(hasResults
                      ? Object.keys(platformResults)
                      : selectedPlatforms
                    ).map((pid) => {
                      const plat = PLATFORMS.find((p) => p.id === pid);
                      const result = platformResults[pid];
                      const status: PostStatus = result?.status ?? "idle";
                      const Icon = plat?.id === "tiktok" ? TikTokIcon : plat?.icon;

                      return (
                        <div
                          key={pid}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-[#0F1117] border border-gray-100 dark:border-gray-800"
                        >
                          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                            {Icon && <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">
                            {plat?.name ?? pid}
                          </span>
                          {status === "idle" && (
                            <span className="text-xs text-gray-400">Ready</span>
                          )}
                          {status === "posting" && (
                            <Loader2 className="h-4 w-4 animate-spin text-[#6C5CE7]" />
                          )}
                          {status === "success" && (
                            <div className="flex items-center gap-1.5">
                              <Check className="h-4 w-4 text-green-500" />
                              <span className="text-xs text-green-600 font-medium">
                                Posted
                              </span>
                            </div>
                          )}
                          {status === "failed" && (
                            <div className="flex items-center gap-1.5">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <span className="text-xs text-red-600 font-medium">
                                Failed
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {Object.entries(platformResults).some(
                    ([, r]) => r.status === "failed" && r.error
                  ) && (
                    <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                      {Object.entries(platformResults)
                        .filter(([, r]) => r.status === "failed" && r.error)
                        .map(([pid, r]) => (
                          <p key={pid} className="text-xs text-red-600 dark:text-red-400">
                            <span className="font-medium capitalize">{pid}:</span>{" "}
                            {r.error}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quick tips */}
              <div className="bg-[#6C5CE7]/5 dark:bg-[#6C5CE7]/10 rounded-xl border border-[#6C5CE7]/20 p-4">
                <h4 className="text-xs font-semibold text-[#6C5CE7] uppercase tracking-wider mb-2">
                  Tips
                </h4>
                <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <li>X (Twitter) has a 280-character limit</li>
                  <li>Instagram requires an image or video</li>
                  <li>Videos work best on TikTok and YouTube</li>
                  <li>Use "First Comment" for hashtags on Instagram</li>
                  <li>Schedule posts for peak engagement times</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: Calendar                                               */}
        {/* ============================================================ */}
        {activeTab === "calendar" && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Calendar Grid */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                {/* Month navigation */}
                <div className="flex items-center justify-between mb-5">
                  <button
                    type="button"
                    onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                    {calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-2">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-2">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for offset */}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayPosts = postsByDay.get(day) ?? [];
                    const isToday =
                      day === new Date().getDate() &&
                      calendarMonth === new Date().getMonth() &&
                      calendarYear === new Date().getFullYear();
                    const isSelected = selectedDay === day;

                    // Collect unique platform colors for this day
                    const platformDots = new Set<string>();
                    for (const p of dayPosts) {
                      for (const plat of (p.platforms ?? [])) {
                        platformDots.add(plat);
                      }
                    }

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        className={cn(
                          "aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all text-sm",
                          isSelected
                            ? "bg-[#6C5CE7] text-white"
                            : isToday
                              ? "bg-[#6C5CE7]/10 text-[#6C5CE7] font-semibold"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300",
                          dayPosts.length > 0 && !isSelected && "font-medium",
                        )}
                      >
                        <span>{day}</span>
                        {dayPosts.length > 0 && (
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {Array.from(platformDots).slice(0, 4).map((plat) => (
                              <div
                                key={plat}
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  isSelected ? "bg-white/70" : (PLATFORM_COLORS[plat] || "bg-gray-400"),
                                )}
                              />
                            ))}
                          </div>
                        )}
                        {dayPosts.length > 0 && (
                          <span
                            className={cn(
                              "absolute top-0.5 right-0.5 text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center",
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-[#6C5CE7]/10 text-[#6C5CE7]",
                            )}
                          >
                            {dayPosts.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Side panel — selected day's posts */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 p-5 sticky top-4">
                {selectedDay ? (
                  <>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      {new Date(calendarYear, calendarMonth, selectedDay).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </h3>
                    {selectedDayPosts.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No posts scheduled for this day.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedDayPosts.map((post) => {
                          const platforms = (post.platforms as string[] | null) ?? [];
                          const isEditing = editingPostId === post.id;
                          return (
                            <div
                              key={post.id}
                              className="bg-gray-50 dark:bg-[#0F1117] rounded-lg p-3 border border-gray-100 dark:border-gray-800"
                            >
                              {isEditing ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editCaption}
                                    onChange={(e) => setEditCaption(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30"
                                  />
                                  <input
                                    type="datetime-local"
                                    value={editScheduledTime}
                                    onChange={(e) => setEditScheduledTime(e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] text-xs focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEdit(post)}
                                      disabled={editSaving}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#6C5CE7] text-white text-xs font-medium hover:bg-[#5B4BD1] disabled:opacity-50"
                                    >
                                      {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEdit}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400"
                                    >
                                      <X className="h-3 w-3" /> Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 mb-2">
                                    {platforms.map((pid) => {
                                      const Icon = getPlatformIcon(pid);
                                      return (
                                        <div
                                          key={pid}
                                          className="w-6 h-6 rounded-full bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-700 flex items-center justify-center"
                                        >
                                          {Icon && <Icon className="h-3 w-3 text-gray-600 dark:text-gray-400" />}
                                        </div>
                                      );
                                    })}
                                    {post.scheduled_time && (
                                      <span className="text-[10px] text-gray-400 ml-auto">
                                        {new Date(post.scheduled_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3 mb-2">
                                    {post.caption || "No caption"}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    <span
                                      className={cn(
                                        "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                        post.status === "scheduled" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                        post.status === "posted" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                        post.status === "queued" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                        (post.status === "draft" || !post.status) && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                                      )}
                                    >
                                      {post.status || "draft"}
                                    </span>
                                    <div className="ml-auto flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEdit(post)}
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                                        title="Edit"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Click a day to see scheduled posts
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Colored dots indicate platforms with scheduled content.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
