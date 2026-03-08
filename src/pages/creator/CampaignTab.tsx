import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  getConnectedAccounts,
  resolveUploadPostUsername,
  type ConnectedAccountRow,
} from "@/lib/upload-post-sync";
import { createUploadPost, type UploadPostPlatform } from "@/services/upload-post";
import { PlatformIcon, PLATFORM_NAMES } from "@/lib/platform-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  Calendar,
  Upload,
  Check,
  X,
  Link2,
  FileText,
  Save,
  Send,
  Image,
  Video,
} from "lucide-react";

const ALL_PLATFORMS = [
  "instagram", "facebook", "x", "linkedin",
  "tiktok", "youtube", "threads", "pinterest",
  "reddit", "bluesky", "google_business",
];

interface CampaignPost {
  id: string;
  caption: string;
  mediaFile: File | null;
  mediaUrl: string;
  mediaType: "none" | "photo" | "video";
  scheduledAt: string;
  platformOverride: string[] | null; // null = inherit campaign platforms
  sortOrder: number;
}

function newPost(sortOrder: number): CampaignPost {
  return {
    id: crypto.randomUUID(),
    caption: "",
    mediaFile: null,
    mediaUrl: "",
    mediaType: "none",
    scheduledAt: "",
    platformOverride: null,
    sortOrder,
  };
}

/** Distribute posts evenly between start 9 AM and end 5 PM */
function spreadDates(posts: CampaignPost[], start: string, end: string): CampaignPost[] {
  if (!start || !end || posts.length === 0) return posts;
  const startMs = new Date(start + "T09:00:00").getTime();
  const endMs = new Date(end + "T17:00:00").getTime();
  if (endMs <= startMs) return posts;
  const interval = posts.length > 1 ? (endMs - startMs) / (posts.length - 1) : 0;
  return posts.map((p, i) => ({
    ...p,
    scheduledAt: new Date(startMs + interval * i).toISOString().slice(0, 16),
  }));
}

export default function CampaignTab() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Campaign meta
  const [campaignName, setCampaignName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mode, setMode] = useState<"manual" | "spread_evenly">("manual");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());

  // Posts
  const [posts, setPosts] = useState<CampaignPost[]>([newPost(0)]);

  // Connected accounts
  const [accounts, setAccounts] = useState<ConnectedAccountRow[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const connectedPlatforms = new Set(accounts.map((a) => a.platform));

  // Actions
  const [saving, setSaving] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  // File input refs per post
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /* Fetch connected accounts */
  useEffect(() => {
    if (!user?.id) return;
    setLoadingAccounts(true);
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
          setLoadingAccounts(false);
          return;
        }
        getConnectedAccounts(user.id).then((accs) => {
          if (accs.length > 0) setAccounts(accs);
          setLoadingAccounts(false);
        });
      });
  }, [user?.id]);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  const noAccounts = accounts.length === 0 && !loadingAccounts;

  // Auto-spread when mode or dates change
  useEffect(() => {
    if (mode === "spread_evenly" && startDate && endDate) {
      setPosts((prev) => spreadDates(prev, startDate, endDate));
    }
  }, [mode, startDate, endDate]);

  const addPost = () => {
    const np = newPost(posts.length);
    let updated = [...posts, np];
    if (mode === "spread_evenly" && startDate && endDate) {
      updated = spreadDates(updated, startDate, endDate);
    }
    setPosts(updated);
  };

  const removePost = (id: string) => {
    let updated = posts.filter((p) => p.id !== id);
    if (updated.length === 0) updated = [newPost(0)];
    if (mode === "spread_evenly" && startDate && endDate) {
      updated = spreadDates(updated, startDate, endDate);
    }
    setPosts(updated);
  };

  const updatePost = (id: string, patch: Partial<CampaignPost>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const handleFileSelect = (postId: string, file: File) => {
    const isVideo = file.type.startsWith("video/");
    updatePost(postId, {
      mediaFile: file,
      mediaUrl: URL.createObjectURL(file),
      mediaType: isVideo ? "video" : "photo",
    });
  };

  /** Upload a single media file to Supabase Storage and return its public URL */
  const uploadMedia = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user!.id}/campaign-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("post-media")
      .upload(path, file, { contentType: file.type });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data: urlData } = supabase.storage.from("post-media").getPublicUrl(path);
    return urlData.publicUrl;
  };

  /** Save campaign + posts to Supabase */
  const handleSave = async () => {
    if (!user?.id) return;
    if (!campaignName.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    setSaving(true);
    try {
      // Upload any media files first
      const postsWithMedia = await Promise.all(
        posts.map(async (p) => {
          if (p.mediaFile) {
            const url = await uploadMedia(p.mediaFile);
            return { ...p, mediaUrl: url, mediaFile: null };
          }
          return p;
        })
      );
      setPosts(postsWithMedia.map((p) => ({ ...p, mediaFile: null } as CampaignPost)));

      const campaignPayload = {
        user_id: user.id,
        name: campaignName.trim(),
        description: description.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        platforms: Array.from(selectedPlatforms),
        mode,
        status: "draft",
        updated_at: new Date().toISOString(),
      };

      let cId = campaignId;
      if (cId) {
        const { error } = await supabase.from("campaigns").update(campaignPayload).eq("id", cId);
        if (error) throw error;
        // Clear existing posts for re-insert
        await supabase.from("campaign_posts").delete().eq("campaign_id", cId);
      } else {
        const { data, error } = await (supabase.from("campaigns") as any)
          .insert(campaignPayload)
          .select("id")
          .single();
        if (error) throw error;
        cId = data.id;
        setCampaignId(cId);
      }

      // Insert posts
      const postRows = postsWithMedia.map((p, i) => ({
        campaign_id: cId,
        user_id: user.id,
        caption: p.caption || null,
        media_url: p.mediaUrl || null,
        media_type: p.mediaType === "none" ? null : p.mediaType,
        scheduled_at: p.scheduledAt ? new Date(p.scheduledAt).toISOString() : null,
        platforms: p.platformOverride,
        sort_order: i,
        status: "draft",
      }));

      const { error: insertErr } = await (supabase.from("campaign_posts") as any).insert(postRows);
      if (insertErr) throw insertErr;

      toast.success("Campaign saved");
    } catch (err: any) {
      console.error("Save campaign error:", err);
      toast.error(err.message || "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  /** Schedule all posts via UploadPost */
  const handleScheduleAll = async () => {
    if (!user?.id) return;
    if (selectedPlatforms.size === 0) {
      toast.error("Select at least one platform");
      return;
    }
    if (!campaignName.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    // Calculate spread dates if needed
    let finalPosts = [...posts];
    if (mode === "spread_evenly" && startDate && endDate) {
      finalPosts = spreadDates(finalPosts, startDate, endDate);
      setPosts(finalPosts);
    }

    const postsWithContent = finalPosts.filter((p) => p.caption.trim());
    if (postsWithContent.length === 0) {
      toast.error("Add at least one post with a caption");
      return;
    }

    const postsWithSchedule = postsWithContent.filter((p) => p.scheduledAt);
    if (postsWithSchedule.length === 0) {
      toast.error("At least one post must have a scheduled date/time");
      return;
    }

    setScheduling(true);
    try {
      // Save first
      await handleSave();

      const upUser = await resolveUploadPostUsername(user.id);
      let successCount = 0;
      let failCount = 0;

      for (const post of postsWithSchedule) {
        const plats = post.platformOverride ?? Array.from(selectedPlatforms);
        if (plats.length === 0) continue;

        let mediaUrl = post.mediaUrl;
        // Upload media if it's a local file
        if (post.mediaFile) {
          mediaUrl = await uploadMedia(post.mediaFile);
        }

        const result = await createUploadPost({
          text: post.caption,
          user: upUser,
          platforms: plats as UploadPostPlatform[],
          media_url: mediaUrl || undefined,
          media_type: post.mediaType === "none" ? undefined : post.mediaType,
          scheduled_at: new Date(post.scheduledAt).toISOString(),
        });

        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      // Update campaign status
      if (campaignId) {
        await supabase.from("campaigns").update({ status: "scheduled" }).eq("id", campaignId);
      }

      if (successCount > 0) {
        toast.success(`Scheduled ${successCount} post${successCount > 1 ? "s" : ""}${failCount > 0 ? ` (${failCount} failed)` : ""}`);
      } else {
        toast.error("Failed to schedule posts");
      }
    } catch (err: any) {
      console.error("Schedule error:", err);
      toast.error(err.message || "Failed to schedule campaign");
    } finally {
      setScheduling(false);
    }
  };

  return (
    <>
      {/* ── TOP ACTION BAR ── */}
      <div className="shrink-0 bg-card border-b border-border px-4 sm:px-6 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-end gap-2">
          <span className="text-[12px] font-semibold text-muted-foreground mr-1 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
            {posts.length} post{posts.length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-[#1B3A6B]/30 text-[#1B3A6B] hover:bg-[#1B3A6B]/5"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Save Campaign
          </Button>
          <Button
            size="sm"
            className="h-9 text-xs bg-[#1B3A6B] hover:bg-[#152d54] text-white font-semibold px-5"
            onClick={handleScheduleAll}
            disabled={scheduling || saving || noAccounts || selectedPlatforms.size === 0}
          >
            {scheduling ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Schedule All
          </Button>
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F5F7FA" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* ═══ SECTION A: CAMPAIGN DETAILS ═══ */}
          <div
            className="bg-white dark:bg-card rounded-2xl p-6 space-y-4"
            style={{ borderLeft: "4px solid #1B3A6B", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
          >
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
              <span
                className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                A
              </span>
              Campaign Details
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Spring Product Launch"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional campaign description..."
                  rows={2}
                  className="mt-1 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Mode toggle */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Campaign Mode</label>
                <div className="flex gap-1 rounded-full border border-border p-0.5 w-fit">
                  {(["manual", "spread_evenly"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-medium transition-colors",
                        mode === m
                          ? "bg-[#1B3A6B] text-white"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {m === "manual" ? "Manual" : "Spread Evenly"}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {mode === "manual"
                    ? "Set each post\u2019s date and time individually."
                    : "Posts are auto-distributed evenly between start and end dates."}
                </p>
              </div>
            </div>
          </div>

          {/* ═══ SECTION B: PLATFORM SELECTOR ═══ */}
          <div
            className="bg-white dark:bg-card rounded-2xl p-6 space-y-4"
            style={{ borderLeft: "4px solid #1B3A6B", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
          >
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
              <span
                className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                B
              </span>
              Select Platforms
            </h2>
            {noAccounts ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Connect your social accounts to start posting
                </p>
                <Button size="sm" onClick={() => navigate("/creator/socials")}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Connect Accounts
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-x-3 gap-y-4">
                {ALL_PLATFORMS.map((platform) => {
                  const connected = connectedPlatforms.has(platform);
                  const isSelected = selectedPlatforms.has(platform);
                  const label = PLATFORM_NAMES[platform] ?? platform;
                  return (
                    <button
                      key={platform}
                      onClick={() =>
                        connected ? togglePlatform(platform) : navigate("/creator/socials")
                      }
                      className="group/icon flex flex-col items-center gap-1.5 cursor-pointer"
                    >
                      <div className="relative">
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

          {/* ═══ SECTION C: POST LIST ═══ */}
          <div
            className="bg-white dark:bg-card rounded-2xl p-6 space-y-4"
            style={{ borderLeft: "4px solid #1B3A6B", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
          >
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
              <span
                className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                C
              </span>
              Posts
            </h2>

            <div className="space-y-4">
              {posts.map((post, idx) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-border bg-gray-50 dark:bg-gray-900/40 p-4 space-y-3"
                >
                  {/* Post header */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      Post #{idx + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                      onClick={() => removePost(post.id)}
                      disabled={posts.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Caption */}
                  <Textarea
                    value={post.caption}
                    onChange={(e) => updatePost(post.id, { caption: e.target.value })}
                    placeholder="Write your caption..."
                    rows={3}
                    className="resize-none bg-white dark:bg-card"
                  />

                  {/* Media upload */}
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      ref={(el) => { fileInputRefs.current[post.id] = el; }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(post.id, file);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => fileInputRefs.current[post.id]?.click()}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {post.mediaUrl ? "Change Media" : "Add Media"}
                    </Button>
                    {post.mediaUrl && (
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0">
                          {post.mediaType === "video" ? (
                            <div className="h-full w-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                              <Video className="h-4 w-4 text-muted-foreground" />
                            </div>
                          ) : (
                            <img src={post.mediaUrl} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <button
                          onClick={() => updatePost(post.id, { mediaFile: null, mediaUrl: "", mediaType: "none" })}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Date/Time + Platform override row */}
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground">Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={post.scheduledAt}
                        onChange={(e) => updatePost(post.id, { scheduledAt: e.target.value })}
                        disabled={mode === "spread_evenly"}
                        className={cn("mt-1 text-sm", mode === "spread_evenly" && "opacity-60")}
                      />
                      {mode === "spread_evenly" && post.scheduledAt && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Auto-assigned: {new Date(post.scheduledAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={post.platformOverride !== null}
                          onChange={(e) =>
                            updatePost(post.id, {
                              platformOverride: e.target.checked
                                ? Array.from(selectedPlatforms)
                                : null,
                            })
                          }
                          className="rounded border-gray-300"
                        />
                        Override campaign platforms
                      </label>
                      {post.platformOverride !== null && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {ALL_PLATFORMS.filter((p) => connectedPlatforms.has(p)).map((platform) => {
                            const isOn = post.platformOverride!.includes(platform);
                            return (
                              <button
                                key={platform}
                                onClick={() => {
                                  const next = isOn
                                    ? post.platformOverride!.filter((x) => x !== platform)
                                    : [...post.platformOverride!, platform];
                                  updatePost(post.id, { platformOverride: next });
                                }}
                                className={cn(
                                  "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                                  isOn
                                    ? "ring-2 ring-offset-1 ring-[#1B3A6B]"
                                    : "opacity-30 hover:opacity-60"
                                )}
                              >
                                <PlatformIcon platform={platform} size={20} />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Post button */}
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={addPost}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Post
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
