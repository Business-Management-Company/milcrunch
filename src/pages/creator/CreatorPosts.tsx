import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import CreatorLayout from "@/components/layout/CreatorLayout";
import CreatePost, { type DraftEdit } from "./CreatePost";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/lib/platform-icons";
import { cn } from "@/lib/utils";
import {
  PenSquare,
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Send,
  Pencil,
  LayoutGrid,
  CalendarRange,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { createUploadPost, type UploadPostPlatform } from "@/services/upload-post";
import { resolveUploadPostUsername } from "@/lib/upload-post-sync";

type PostType = "single" | "campaign" | "cadence";
type StatusTab = "create" | "drafts" | "scheduled" | "published" | "failed";

const POST_TYPE_TABS: { value: PostType; label: string; icon: typeof FileText }[] = [
  { value: "single", label: "Single Post", icon: Pencil },
  { value: "campaign", label: "Campaign", icon: Layers },
  { value: "cadence", label: "Cadence Campaign", icon: CalendarRange },
];

const STATUS_TABS: { value: StatusTab; label: string; icon: typeof PenSquare }[] = [
  { value: "create", label: "Create", icon: PenSquare },
  { value: "drafts", label: "Drafts", icon: FileText },
  { value: "scheduled", label: "Scheduled", icon: Calendar },
  { value: "published", label: "Published", icon: CheckCircle },
  { value: "failed", label: "Failed", icon: XCircle },
];

interface DraftRow {
  id: string;
  caption: string | null;
  platforms: string[] | null;
  media_url: string | null;
  scheduled_at: string | null;
  created_at: string;
}

interface StatusCounts {
  drafts: number;
  scheduled: number;
  published: number;
  failed: number;
}

export default function CreatorPosts() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab") as StatusTab | null;
  const typeParam = searchParams.get("type") as PostType | null;

  const [postType, setPostType] = useState<PostType>(
    typeParam && POST_TYPE_TABS.some((t) => t.value === typeParam) ? typeParam : "single"
  );
  const [activeTab, setActiveTab] = useState<StatusTab>(
    tabParam && STATUS_TABS.some((t) => t.value === tabParam) ? tabParam : "create"
  );

  // Draft editing
  const [editingDraft, setEditingDraft] = useState<DraftEdit | null>(null);

  // Counts
  const [counts, setCounts] = useState<StatusCounts>({ drafts: 0, scheduled: 0, published: 0, failed: 0 });

  // Drafts state
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const switchTab = (tab: StatusTab) => {
    setActiveTab(tab);
    if (tab !== "create") setEditingDraft(null);
    const params: Record<string, string> = {};
    if (tab !== "create") params.tab = tab;
    if (postType !== "single") params.type = postType;
    setSearchParams(params);
  };

  const switchPostType = (type: PostType) => {
    setPostType(type);
    const params: Record<string, string> = {};
    if (activeTab !== "create") params.tab = activeTab;
    if (type !== "single") params.type = type;
    setSearchParams(params);
  };

  // Fetch counts on mount and when user changes
  useEffect(() => {
    if (!user?.id) return;
    const fetchCounts = async () => {
      const [draftsRes, scheduledRes, publishedRes, failedRes] = await Promise.all([
        supabase.from("post_drafts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("social_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "scheduled"),
        supabase.from("social_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("status", ["success", "published"]),
        supabase.from("social_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "failed"),
      ]);
      setCounts({
        drafts: draftsRes.count ?? 0,
        scheduled: scheduledRes.count ?? 0,
        published: publishedRes.count ?? 0,
        failed: failedRes.count ?? 0,
      });
    };
    fetchCounts();
  }, [user?.id, activeTab]);

  // Fetch drafts when tab activates
  useEffect(() => {
    if (activeTab !== "drafts" || !user?.id) return;
    setLoadingDrafts(true);
    supabase
      .from("post_drafts")
      .select("id, caption, platforms, media_url, scheduled_at, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("Drafts load error:", error);
        setDrafts((data ?? []) as DraftRow[]);
        setLoadingDrafts(false);
      });
  }, [activeTab, user?.id]);

  const handleDeleteDraft = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("post_drafts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete draft");
    } else {
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      setCounts((prev) => ({ ...prev, drafts: Math.max(0, prev.drafts - 1) }));
      toast.success("Draft deleted");
    }
    setDeletingId(null);
  };

  const handlePublishDraft = async (draft: DraftRow) => {
    const plats = parsePlatforms(draft.platforms);
    if (!plats.length) {
      toast.error("No platforms selected for this draft");
      return;
    }
    if (!draft.caption?.trim()) {
      toast.error("Draft has no caption");
      return;
    }
    if (!user?.id) return;
    setPublishingId(draft.id);
    try {
      const upUser = await resolveUploadPostUsername(user.id);
      const result = await createUploadPost({
        text: draft.caption,
        user: upUser,
        platforms: plats as UploadPostPlatform[],
        media_url: draft.media_url || undefined,
      });
      if (result.success) {
        await supabase.from("post_drafts").delete().eq("id", draft.id);
        setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
        setCounts((prev) => ({ ...prev, drafts: Math.max(0, prev.drafts - 1) }));
        toast.success(`Published to ${plats.length} platform(s)!`);
      } else {
        toast.error("Publish failed — check your connected accounts");
      }
    } catch {
      toast.error("Publish failed");
    }
    setPublishingId(null);
  };

  /** Defensively parse platforms — may be string (double-encoded jsonb) or array */
  const parsePlatforms = (raw: unknown): string[] => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") { try { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch {} }
    return [];
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const getCount = (tab: StatusTab) =>
    tab === "drafts" ? counts.drafts
    : tab === "scheduled" ? counts.scheduled
    : tab === "published" ? counts.published
    : tab === "failed" ? counts.failed
    : 0;

  return (
    <CreatorLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)] -mt-2">
        {/* ── ROW 1: Post Type — pill toggle ── */}
        <div className="shrink-0 bg-card px-4 sm:px-6 pt-4 pb-2">
          <div className="max-w-6xl mx-auto flex gap-2">
            {POST_TYPE_TABS.map((tab) => {
              const isActive = postType === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => switchPostType(tab.value)}
                  className={cn(
                    "inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap",
                    isActive
                      ? "bg-[#1B3A6B] text-white shadow-sm"
                      : "bg-white dark:bg-card text-gray-500 border border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── ROW 2: Status — small pill tabs ── */}
        <div className="shrink-0 bg-card px-4 sm:px-6 pb-3">
          <div className="max-w-6xl mx-auto flex gap-1.5 overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.value;
              const count = getCount(tab.value);
              const isFailed = tab.value === "failed";
              const showCount = count > 0 && tab.value !== "create";
              return (
                <button
                  key={tab.value}
                  onClick={() => switchTab(tab.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap",
                    isActive
                      ? isFailed && count > 0
                        ? "bg-red-500 text-white"
                        : "bg-[#1B3A6B] text-white"
                      : "bg-[#F3F4F6] dark:bg-gray-800 text-[#374151] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-300"
                  )}
                >
                  {tab.label}
                  {showCount && (
                    <span className={cn(
                      "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none",
                      isActive
                        ? "bg-white/25 text-white"
                        : isFailed
                          ? "bg-red-500 text-white"
                          : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CREATE TAB — embeds full CreatePost ── */}
        {activeTab === "create" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <CreatePost noLayout postType={postType} editDraft={editingDraft} />
          </div>
        )}

        {/* ── DRAFTS TAB ── */}
        {activeTab === "drafts" && (
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F5F7FA" }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Saved Drafts</h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => switchTab("create")}
                >
                  <PenSquare className="h-3.5 w-3.5 mr-1.5" />
                  New Post
                </Button>
              </div>

              {loadingDrafts ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : drafts.length === 0 ? (
                <div className="rounded-xl border border-border bg-white dark:bg-card p-12 text-center">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No drafts yet. Use "Save as draft" when creating a post.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => switchTab("create")}>
                    Create a Post
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts.map((draft) => {
                    const isPublishing = publishingId === draft.id;
                    const isDeleting = deletingId === draft.id;
                    const platforms = parsePlatforms(draft.platforms);
                    const captionPreview = draft.caption
                      ? draft.caption.length > 140
                        ? draft.caption.slice(0, 140) + "..."
                        : draft.caption
                      : "No caption";

                    return (
                      <div
                        key={draft.id}
                        className="rounded-xl border border-border bg-white dark:bg-card p-4 flex items-start gap-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                      >
                        {/* Media thumbnail */}
                        <div className="shrink-0 h-[60px] w-[60px] rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {draft.media_url ? (
                            <img src={draft.media_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <FileText className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-1.5">
                            {captionPreview}
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              {platforms.map((p) => (
                                <PlatformIcon key={p} platform={p} size={16} />
                              ))}
                              {platforms.length === 0 && (
                                <span className="text-xs text-muted-foreground/60">No platforms</span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(draft.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              setEditingDraft({
                                id: draft.id,
                                caption: draft.caption,
                                platforms: parsePlatforms(draft.platforms),
                                media_url: draft.media_url,
                                scheduled_at: draft.scheduled_at,
                              });
                              setActiveTab("create");
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1 bg-[#1B3A6B] hover:bg-[#152d54] text-white"
                            onClick={() => handlePublishDraft(draft)}
                            disabled={isPublishing || !platforms.length}
                          >
                            {isPublishing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            Publish
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                            onClick={() => handleDeleteDraft(draft.id)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SCHEDULED TAB ── */}
        {activeTab === "scheduled" && (
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F5F7FA" }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
              <div className="rounded-xl border border-border bg-white dark:bg-card p-12 text-center">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No scheduled posts. Use "Schedule" when creating a post.
                </p>
                <Button size="sm" variant="outline" onClick={() => switchTab("create")}>
                  Create a Post
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── PUBLISHED TAB ── */}
        {activeTab === "published" && (
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F5F7FA" }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
              <div className="rounded-xl border border-border bg-white dark:bg-card p-12 text-center">
                <CheckCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Published posts will appear here.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── FAILED TAB ── */}
        {activeTab === "failed" && (
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F5F7FA" }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
              <div className="rounded-xl border border-border bg-white dark:bg-card p-12 text-center">
                <XCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Failed posts will appear here with retry option.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </CreatorLayout>
  );
}
