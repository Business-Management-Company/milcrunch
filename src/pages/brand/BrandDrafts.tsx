import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PlatformIcon, PLATFORM_NAMES } from "@/lib/platform-icons";
import { cn } from "@/lib/utils";
import {
  Loader2,
  FileText,
  Pencil,
  Trash2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { createUploadPost, type UploadPostPlatform } from "@/services/upload-post";
import { resolveUploadPostUsername } from "@/lib/upload-post-sync";

interface DraftRow {
  id: string;
  user_id: string;
  caption: string | null;
  platforms: string[] | null;
  media_url: string | null;
  media_type: string | null;
  scheduled_at: string | null;
  post_name: string | null;
  label: string | null;
  account_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export default function BrandDrafts() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDrafts = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("post_drafts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load drafts:", error);
      toast.error("Failed to load drafts");
    }
    setDrafts((data ?? []) as DraftRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchDrafts();
  }, [user?.id]);

  const handleDelete = async (id: string) => {
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

  const handlePublish = async (draft: DraftRow) => {
    if (!draft.platforms?.length) {
      toast.error("No platforms selected for this draft");
      return;
    }
    if (!draft.caption?.trim()) {
      toast.error("Draft has no caption");
      return;
    }
    if (!user?.id) {
      toast.error("Not logged in");
      return;
    }
    setPublishingId(draft.id);
    try {
      const upUser = await resolveUploadPostUsername(user.id);
      console.log("[BrandDrafts] Publishing draft", draft.id, "user:", upUser, "platforms:", draft.platforms);
      const result = await createUploadPost({
        text: draft.caption,
        user: upUser,
        platforms: draft.platforms as UploadPostPlatform[],
        media_url: draft.media_url || undefined,
        media_type: (draft.media_type === "video" || draft.media_type === "photo") ? draft.media_type : undefined,
      });
      if (result.success) {
        await supabase.from("post_drafts").delete().eq("id", draft.id);
        setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
        toast.success(`Published to ${draft.platforms?.length ?? 0} platform(s)!`);
      } else {
        toast.error("Publish failed — check your connected accounts");
      }
    } catch {
      toast.error("Publish failed");
    }
    setPublishingId(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Drafts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Posts saved as drafts from the Create Post page
          </p>
        </div>
        <Button asChild size="sm" className="bg-[#1B3A6B] hover:bg-[#152d54] text-white">
          <Link to="/brand/posting">
            <Send className="h-4 w-4 mr-2" />
            Create Post
          </Link>
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : drafts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No drafts yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            When you save a post as a draft, it will appear here.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/brand/posting">Create a Post</Link>
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
                className="rounded-xl border border-border bg-card p-4 flex items-start gap-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                {/* Media thumbnail */}
                <div className="shrink-0 h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {draft.media_url ? (
                    draft.media_type === "video" ? (
                      <video
                        src={draft.media_url}
                        className="h-full w-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={draft.media_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )
                  ) : (
                    <FileText className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Name + label row */}
                  <div className="flex items-center gap-2 mb-1">
                    {draft.post_name && (
                      <span className="text-sm font-semibold text-foreground truncate">
                        {draft.post_name}
                      </span>
                    )}
                    {draft.label && (
                      <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
                        {draft.label}
                      </span>
                    )}
                  </div>

                  {/* Caption preview */}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {captionPreview}
                  </p>

                  {/* Platform icons + date */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {platforms.map((p) => (
                        <PlatformIcon key={p} platform={p} size={18} />
                      ))}
                      {platforms.length === 0 && (
                        <span className="text-xs text-muted-foreground/60">No platforms</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(draft.created_at)}
                    </span>
                    {draft.media_type && (
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        draft.media_type === "video"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      )}>
                        {draft.media_type === "video" ? "Video" : "Image"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    asChild
                  >
                    <Link
                      to={`/brand/posting?draft=${draft.id}`}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-[#1B3A6B] hover:bg-[#152d54] text-white"
                    onClick={() => handlePublish(draft)}
                    disabled={isPublishing || !draft.platforms?.length}
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
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                    onClick={() => handleDelete(draft.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
