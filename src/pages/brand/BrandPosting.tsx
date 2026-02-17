import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

type PostStatus = "idle" | "posting" | "success" | "failed";

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
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function BrandPosting() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Connected accounts
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccountRow[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Compose state
  const [caption, setCaption] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<UploadPostPlatform[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [posting, setPosting] = useState(false);
  const [platformResults, setPlatformResults] = useState<Record<string, PlatformResult>>({});

  // Recent posts
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Load connected accounts
  useEffect(() => {
    if (!userId) return;
    setLoadingAccounts(true);
    getConnectedAccounts(userId)
      .then(setConnectedAccounts)
      .finally(() => setLoadingAccounts(false));
  }, [userId]);

  // Load recent posts
  const loadRecentPosts = useCallback(async () => {
    if (!userId) return;
    setLoadingPosts(true);
    const { data } = await supabase
      .from("social_posts")
      .select("id, caption, platforms, status, file_url, scheduled_time, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setRecentPosts((data as RecentPost[] | null) ?? []);
    setLoadingPosts(false);
  }, [userId]);

  useEffect(() => {
    loadRecentPosts();
  }, [loadRecentPosts]);

  // Connected platform IDs
  const connectedPlatformIds = new Set(connectedAccounts.map((a) => a.platform));
  const availablePlatforms = PLATFORMS.filter((p) => connectedPlatformIds.has(p.id));

  // Character limit
  const minCharLimit = selectedPlatforms.reduce((min, pid) => {
    const p = PLATFORMS.find((x) => x.id === pid);
    return p?.charLimit ? Math.min(min, p.charLimit) : min;
  }, Infinity);
  const effectiveLimit = minCharLimit === Infinity ? null : minCharLimit;
  const charWarning = effectiveLimit && caption.length > effectiveLimit - 30;
  const charOver = effectiveLimit && caption.length > effectiveLimit;

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

  // Post
  const handlePost = async () => {
    if (!userId || selectedPlatforms.length === 0 || (!caption.trim() && !file)) {
      toast.error("Add a caption or media and select at least one platform.");
      return;
    }

    setPosting(true);
    const initResults: Record<string, PlatformResult> = {};
    selectedPlatforms.forEach((p) => (initResults[p] = { status: "posting" }));
    setPlatformResults(initResults);

    try {
      const schedDate = scheduling && scheduledTime ? new Date(scheduledTime).toISOString() : undefined;

      let result: UploadResult;

      if (file?.type.startsWith("video/")) {
        result = await uploadVideo({
          title: caption.trim(),
          user: userId,
          platform: selectedPlatforms,
          video: file,
          scheduled_date: schedDate,
        });
      } else if (file) {
        result = await uploadPhotos({
          title: caption.trim(),
          user: userId,
          platform: selectedPlatforms,
          photos: [file],
          scheduled_date: schedDate,
        });
      } else {
        result = await uploadText({
          title: caption.trim(),
          user: userId,
          platform: selectedPlatforms,
          scheduled_date: schedDate,
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
    setScheduling(false);
    setScheduledTime("");
    setPlatformResults({});
  };

  const canPost =
    selectedPlatforms.length > 0 &&
    (caption.trim().length > 0 || file) &&
    !charOver &&
    !posting;

  const hasResults = Object.keys(platformResults).length > 0;

  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-pd-navy dark:text-white">
              Social Posting
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Compose and publish to all your connected platforms at once.
            </p>
          </div>
          {hasResults && (
            <button
              type="button"
              onClick={resetCompose}
              className="flex items-center gap-2 text-sm text-[#6C5CE7] hover:underline font-medium"
            >
              <RefreshCw className="h-3.5 w-3.5" /> New Post
            </button>
          )}
        </div>

        {/* Two-column layout */}
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
              </div>
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
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Platforms
              </label>
              {loadingAccounts ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading connected accounts...
                </div>
              ) : availablePlatforms.length === 0 ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    No connected accounts found. Connect your socials from the{" "}
                    <a href="/brand/settings" className="underline font-medium">
                      Settings
                    </a>{" "}
                    page first.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availablePlatforms.map((p) => {
                    const selected = selectedPlatforms.includes(p.id);
                    const Icon = p.id === "tiktok" ? TikTokIcon : p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePlatform(p.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all",
                          selected
                            ? "bg-[#6C5CE7] text-white border-[#6C5CE7]"
                            : "bg-white dark:bg-[#0F1117] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#6C5CE7]/40"
                        )}
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        {p.name}
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePost}
                disabled={!canPost}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all",
                  canPost
                    ? "bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                )}
              >
                {posting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Posting...
                  </>
                ) : scheduling ? (
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
                onClick={() => setScheduling(!scheduling)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border transition-all",
                  scheduling
                    ? "bg-[#6C5CE7]/10 text-[#6C5CE7] border-[#6C5CE7]/30"
                    : "bg-white dark:bg-[#1A1D27] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#6C5CE7]/40"
                )}
              >
                <Calendar className="h-4 w-4" /> Schedule
              </button>
            </div>

            {scheduling && (
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

            {/* Recent posts */}
            <div className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Recent Posts
                </h3>
              </div>
              {loadingPosts ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : recentPosts.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No posts yet. Compose your first post above.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#0F1117] text-left">
                        <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase">
                          Caption
                        </th>
                        <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase">
                          Platforms
                        </th>
                        <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPosts.map((post) => (
                        <tr
                          key={post.id}
                          className="border-t border-gray-100 dark:border-gray-800"
                        >
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                            {new Date(post.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                            {post.caption || "—"}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-1.5 flex-wrap">
                              {(post.platforms as string[] | null)?.map((p) => (
                                <span
                                  key={p}
                                  className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 capitalize"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={cn(
                                "text-xs font-medium px-2.5 py-1 rounded-full",
                                post.status === "posted" &&
                                  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                post.status === "scheduled" &&
                                  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                post.status === "failed" &&
                                  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                post.status === "draft" &&
                                  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                              )}
                            >
                              {post.status || "draft"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Preview + Status */}
          <div className="lg:col-span-2 space-y-5">
            {/* Phone preview */}
            <div className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Preview
              </h3>
              <div className="bg-gray-50 dark:bg-[#0F1117] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-w-[320px] mx-auto">
                {/* Mock phone header */}
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-8 h-8 rounded-full bg-[#6C5CE7] flex items-center justify-center text-white text-xs font-bold">
                    {user?.user_metadata?.display_name?.[0]?.toUpperCase() || "R"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                      {user?.user_metadata?.display_name || "RecurrentX"}
                    </p>
                    <p className="text-[10px] text-gray-400">Just now</p>
                  </div>
                </div>

                {/* Image */}
                {filePreview && (
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="w-full aspect-square object-cover"
                  />
                )}
                {file && !filePreview && (
                  <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <FileVideo className="h-10 w-10 text-gray-400" />
                  </div>
                )}

                {/* Caption */}
                <div className="px-4 py-3">
                  {caption.trim() ? (
                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {caption.length > 200 ? caption.slice(0, 200) + "..." : caption}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      Your caption will appear here...
                    </p>
                  )}
                </div>
              </div>
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

                {/* Error details */}
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
                <li>Schedule posts for peak engagement times</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
