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
  CalendarRange,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { createUploadPost, type UploadPostPlatform } from "@/services/upload-post";
import { resolveUploadPostUsername } from "@/lib/upload-post-sync";

type PostType = "single" | "campaign" | "cadence";
type StatusTab = "create" | "drafts" | "scheduled" | "published" | "failed";

const POST_TYPE_TABS: { value: PostType; label: string; icon: typeof FileText }[] = [
  { value: "single", label: "Single Post", icon: Pencil },
  { value: "campaign", label: "Campaign", icon: Layers },
  { value: "cadence", label: "Cadence", icon: CalendarRange },
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
    tabParam && ["drafts", "scheduled", "published", "failed"].includes(tabParam) ? tabParam : "create"
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
  const [draftsExpanded, setDraftsExpanded] = useState(false);

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
    setActiveTab("create");
    const params: Record<string, string> = {};
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

  // Fetch drafts when drafts bar is expanded or drafts tab active
  useEffect(() => {
    if ((!draftsExpanded && activeTab !== "drafts") || !user?.id) return;
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
  }, [draftsExpanded, activeTab, user?.id]);

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
        const err = result.error ?? "";
        if (/not found|uuid|profile/i.test(err)) {
          toast.error("Connect a social account to start posting. Go to My Socials to get started.");
        } else {
          toast.error("Publish failed — check your connected accounts");
        }
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

  const isFullscreen = activeTab === "create" && (postType === "cadence" || postType === "campaign");

  return (
    <CreatorLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)] -mt-2">
        {/* ═══ STICKY TOP BAR ═══ */}
        <div className="shrink-0 bg-card border-b border-border px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left — post type pills */}
            <div className="flex items-center gap-1.5">
              {POST_TYPE_TABS.map((tab) => {
                const isActive = postType === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => switchPostType(tab.value)}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap",
                      isActive
                        ? "bg-foreground text-background shadow-sm"
                        : "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    )}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Right — action buttons (only for single post create mode) */}
            {activeTab === "create" && postType === "single" && (
              <div className="flex items-center gap-2" id="post-actions-slot">
                {/* Actions injected from CreatePost via portal or kept inline */}
              </div>
            )}
          </div>
        </div>

        {/* ═══ STATUS TABS (only when not in create mode) ═══ */}
        {activeTab !== "create" && (
          <div className="shrink-0 bg-card px-4 sm:px-6 pb-3 pt-2 border-b border-border">
            <div className="flex gap-1.5 overflow-x-auto">
              <button
                onClick={() => switchTab("create")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap bg-muted text-muted-foreground hover:text-foreground"
              >
                <PenSquare className="h-3 w-3" />
                Back to Editor
              </button>
              {(["drafts", "scheduled", "published", "failed"] as const).map((tab) => {
                const isTabActive = activeTab === tab;
                const count = tab === "drafts" ? counts.drafts
                  : tab === "scheduled" ? counts.scheduled
                  : tab === "published" ? counts.published
                  : counts.failed;
                const icons = { drafts: FileText, scheduled: Calendar, published: CheckCircle, failed: XCircle };
                const Icon = icons[tab];
                return (
                  <button
                    key={tab}
                    onClick={() => switchTab(tab)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap capitalize",
                      isTabActive
                        ? tab === "failed" && count > 0
                          ? "bg-red-500 text-white"
                          : "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {tab}
                    {count > 0 && (
                      <span className={cn(
                        "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none",
                        isTabActive
                          ? "bg-background/25 text-background"
                          : tab === "failed" ? "bg-red-500 text-white" : "bg-muted-foreground/20 text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ CREATE TAB — embeds full CreatePost ═══ */}
        {activeTab === "create" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <CreatePost noLayout postType={postType} editDraft={editingDraft} />
          </div>
        )}

        {/* ═══ DRAFTS TAB (full page) ═══ */}
        {activeTab === "drafts" && (
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="px-4 sm:px-6 py-8 space-y-4">
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
                <div className="rounded-xl border border-border bg-card p-12 text-center">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No drafts yet. Use "Save Draft" when creating a post.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => switchTab("create")}>
                    Create a Post
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts.map((draft) => renderDraftCard(draft))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ SCHEDULED TAB ═══ */}
        {activeTab === "scheduled" && (
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="px-4 sm:px-6 py-8">
              <div className="rounded-xl border border-border bg-card p-12 text-center">
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

        {/* ═══ PUBLISHED TAB ═══ */}
        {activeTab === "published" && (
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="px-4 sm:px-6 py-8">
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <CheckCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Published posts will appear here.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ FAILED TAB ═══ */}
        {activeTab === "failed" && (
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="px-4 sm:px-6 py-8">
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <XCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Failed posts will appear here with retry option.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ COLLAPSIBLE DRAFTS BAR (at bottom, only in create mode) ═══ */}
        {activeTab === "create" && counts.drafts > 0 && (
          <div className="shrink-0 border-t border-border bg-card">
            <button
              type="button"
              onClick={() => setDraftsExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 sm:px-6 py-2.5 hover:bg-muted/30 transition-colors"
            >
              <span className="text-xs font-semibold text-muted-foreground">
                Drafts ({counts.drafts})
              </span>
              {draftsExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {draftsExpanded && (
              <div className="px-4 sm:px-6 pb-3 overflow-x-auto">
                {loadingDrafts ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex gap-3 pb-1">
                    {drafts.map((draft) => {
                      const platforms = parsePlatforms(draft.platforms);
                      const captionPreview = draft.caption
                        ? draft.caption.length > 80
                          ? draft.caption.slice(0, 80) + "..."
                          : draft.caption
                        : "No caption";
                      return (
                        <div
                          key={draft.id}
                          className="shrink-0 w-64 rounded-lg border border-border bg-background p-3 space-y-2 hover:border-foreground/20 transition-colors"
                        >
                          <p className="text-xs text-muted-foreground line-clamp-2">{captionPreview}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {platforms.map((p) => (
                                <PlatformIcon key={p} platform={p} size={14} />
                              ))}
                              <span className="text-[10px] text-muted-foreground ml-1">
                                {formatDate(draft.created_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingDraft({
                                    id: draft.id,
                                    caption: draft.caption,
                                    platforms: parsePlatforms(draft.platforms),
                                    media_url: draft.media_url,
                                    scheduled_at: draft.scheduled_at,
                                  });
                                  setDraftsExpanded(false);
                                }}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteDraft(draft.id)}
                                disabled={deletingId === draft.id}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-600 transition-colors"
                              >
                                {deletingId === draft.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </CreatorLayout>
  );

  function renderDraftCard(draft: DraftRow) {
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
        className="rounded-xl border border-border bg-card p-4 flex items-start gap-4 hover:border-foreground/20 transition-colors"
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
            className="h-7 text-xs gap-1 bg-teal-600 hover:bg-teal-700 text-white"
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
  }
}
