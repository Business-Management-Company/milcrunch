import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import CreatorLayout from "@/components/layout/CreatorLayout";
import CreatePost from "./CreatePost";
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
} from "lucide-react";
import { toast } from "sonner";
import { createUploadPost, type UploadPostPlatform } from "@/services/upload-post";
import { resolveUploadPostUsername } from "@/lib/upload-post-sync";

type TopTab = "create" | "drafts" | "scheduled" | "published" | "failed";

const TABS: { value: TopTab; label: string; icon: typeof PenSquare }[] = [
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
  media_type: string | null;
  post_name: string | null;
  label: string | null;
  account_ids: string[] | null;
  created_at: string;
}

export default function CreatorPosts() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as TopTab | null;
  const [activeTab, setActiveTab] = useState<TopTab>(
    tabParam && TABS.some((t) => t.value === tabParam) ? tabParam : "create"
  );

  // Drafts state
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const switchTab = (tab: TopTab) => {
    setActiveTab(tab);
    setSearchParams(tab === "create" ? {} : { tab });
  };

  // Fetch drafts when tab activates
  useEffect(() => {
    if (activeTab !== "drafts" || !user?.id) return;
    setLoadingDrafts(true);
    supabase
      .from("post_drafts")
      .select("*")
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
      toast.success("Draft deleted");
    }
    setDeletingId(null);
  };

  const handlePublishDraft = async (draft: DraftRow) => {
    if (!draft.platforms?.length) {
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
        platforms: draft.platforms as UploadPostPlatform[],
        media_url: draft.media_url || undefined,
        media_type:
          draft.media_type === "video" || draft.media_type === "photo"
            ? draft.media_type
            : undefined,
      });
      if (result.success) {
        await supabase.from("post_drafts").delete().eq("id", draft.id);
        setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
        toast.success(`Published to ${draft.platforms.length} platform(s)!`);
      } else {
        toast.error("Publish failed — check your connected accounts");
      }
    } catch {
      toast.error("Publish failed");
    }
    setPublishingId(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <CreatorLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)] -mt-2">
        {/* ── TOP TAB BAR ── */}
        <div className="shrink-0 border-b border-border bg-card">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => switchTab(tab.value)}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
                  activeTab === tab.value
                    ? "border-[#1B3A6B] text-[#1B3A6B] dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── CREATE TAB — embeds full CreatePost ── */}
        {activeTab === "create" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <CreatePost noLayout />
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
                    const platforms = draft.platforms ?? [];
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
                        <div className="shrink-0 h-14 w-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {draft.media_url ? (
                            draft.media_type === "video" ? (
                              <video src={draft.media_url} className="h-full w-full object-cover" muted />
                            ) : (
                              <img src={draft.media_url} alt="" className="h-full w-full object-cover" />
                            )
                          ) : (
                            <FileText className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {(draft.post_name || draft.label) && (
                            <div className="flex items-center gap-2 mb-0.5">
                              {draft.post_name && (
                                <span className="text-sm font-semibold truncate">{draft.post_name}</span>
                              )}
                              {draft.label && (
                                <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
                                  {draft.label}
                                </span>
                              )}
                            </div>
                          )}
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
                              switchTab("create");
                              // TODO: load draft into CreatePost form
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
