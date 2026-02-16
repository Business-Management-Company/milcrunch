import { useState, useEffect, useCallback } from "react";
import {
  MessageCircle, Pin, ThumbsUp, Send, Megaphone, HelpCircle,
  MessagesSquare, Users, FileText, Clock, Loader2, RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/* ---------- types ---------- */
interface CommunityPost {
  id: string;
  event_id: string;
  user_id: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  content: string;
  post_type: string;
  is_pinned: boolean;
  likes_count: number;
  replies_count: number;
  created_at: string;
  updated_at: string;
}

interface CommunityReply {
  id: string;
  post_id: string;
  user_id: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  content: string;
  created_at: string;
}

interface Props {
  eventId: string;
  eventCreatedAt?: string | null;
  eventStartDate?: string | null;
  registrationCount: number;
}

const POST_TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Megaphone }> = {
  announcement: { label: "Announcement", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: Megaphone },
  discussion: { label: "Discussion", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: MessagesSquare },
  question: { label: "Question", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: HelpCircle },
  poll: { label: "Poll", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: FileText },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function Avatar({ name, url }: { name: string | null; url: string | null }) {
  if (url) {
    return <img src={url} alt={name || ""} className="h-9 w-9 rounded-full object-cover" />;
  }
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pd-blue to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
      {initials}
    </div>
  );
}

/* ======================================== */
const EventCommunityTab = ({ eventId, eventCreatedAt, eventStartDate, registrationCount }: Props) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  /* composer state */
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<string>("discussion");

  /* replies state */
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, CommunityReply[]>>({});
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  /* ---------- fetch posts ---------- */
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("event_community_posts")
        .select("*")
        .eq("event_id", eventId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPosts((data || []) as unknown as CommunityPost[]);
    } catch (err) {
      console.error("Error loading community posts:", err);
      toast.error("Failed to load community posts");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  /* ---------- fetch replies ---------- */
  const fetchReplies = async (postId: string) => {
    setLoadingReplies((p) => ({ ...p, [postId]: true }));
    try {
      const { data, error } = await supabase
        .from("event_community_replies")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setReplies((p) => ({ ...p, [postId]: (data || []) as unknown as CommunityReply[] }));
    } catch (err) {
      console.error("Error loading replies:", err);
    } finally {
      setLoadingReplies((p) => ({ ...p, [postId]: false }));
    }
  };

  /* ---------- create post ---------- */
  const createPost = async () => {
    if (!newContent.trim()) return;
    setPosting(true);
    try {
      const authorName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        "Anonymous";
      const { error } = await supabase.from("event_community_posts").insert({
        event_id: eventId,
        user_id: user?.id,
        author_name: authorName,
        author_avatar_url: user?.user_metadata?.avatar_url || null,
        content: newContent.trim(),
        post_type: newType,
      } as Record<string, unknown>);
      if (error) throw error;
      setNewContent("");
      setNewType("discussion");
      toast.success("Post published!");
      fetchPosts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  /* ---------- create reply ---------- */
  const createReply = async (postId: string) => {
    const text = replyContent[postId]?.trim();
    if (!text) return;
    setReplyingTo(postId);
    try {
      const authorName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        "Anonymous";
      const { error } = await supabase.from("event_community_replies").insert({
        post_id: postId,
        user_id: user?.id,
        author_name: authorName,
        author_avatar_url: user?.user_metadata?.avatar_url || null,
        content: text,
      } as Record<string, unknown>);
      if (error) throw error;
      setReplyContent((p) => ({ ...p, [postId]: "" }));
      // Increment replies_count on the post
      await supabase
        .from("event_community_posts")
        .update({ replies_count: (posts.find((p) => p.id === postId)?.replies_count || 0) + 1 } as Record<string, unknown>)
        .eq("id", postId);
      fetchReplies(postId);
      fetchPosts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reply");
    } finally {
      setReplyingTo(null);
    }
  };

  /* ---------- like post ---------- */
  const likePost = async (post: CommunityPost) => {
    try {
      await supabase
        .from("event_community_posts")
        .update({ likes_count: post.likes_count + 1 } as Record<string, unknown>)
        .eq("id", post.id);
      fetchPosts();
    } catch {
      toast.error("Failed to like post");
    }
  };

  /* ---------- toggle expand ---------- */
  const toggleExpand = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      if (!replies[postId]) fetchReplies(postId);
    }
  };

  /* ---------- stats ---------- */
  const daysDiff = eventStartDate
    ? Math.ceil((new Date(eventStartDate).getTime() - Date.now()) / 86400000)
    : null;
  const activeSince = posts.length > 0
    ? new Date(posts[posts.length - 1].created_at).toLocaleDateString()
    : eventCreatedAt
      ? new Date(eventCreatedAt).toLocaleDateString()
      : "—";

  const userRole = user?.user_metadata?.role;
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  /* ======================================== */
  return (
    <div className="space-y-5">
      {/* 365 Banner */}
      <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
          <RefreshCw className="inline h-4 w-4 mr-1.5 -mt-0.5" />
          365 Community — This space stays active year-round. Connect before, during, and after the event.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center bg-white dark:bg-[#1A1D27] border-gray-200 dark:border-gray-800">
          <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xl font-bold">{registrationCount}</p>
          <p className="text-xs text-muted-foreground">Members</p>
        </Card>
        <Card className="p-3 text-center bg-white dark:bg-[#1A1D27] border-gray-200 dark:border-gray-800">
          <MessageCircle className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xl font-bold">{posts.length}</p>
          <p className="text-xs text-muted-foreground">Posts</p>
        </Card>
        <Card className="p-3 text-center bg-white dark:bg-[#1A1D27] border-gray-200 dark:border-gray-800">
          <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-semibold mt-1">{activeSince}</p>
          <p className="text-xs text-muted-foreground">Active Since</p>
        </Card>
        <Card className="p-3 text-center bg-white dark:bg-[#1A1D27] border-gray-200 dark:border-gray-800">
          {daysDiff !== null && daysDiff > 0 ? (
            <>
              <p className="text-xl font-bold text-emerald-600">{daysDiff}</p>
              <p className="text-xs text-muted-foreground">Days Until Event</p>
            </>
          ) : daysDiff !== null && daysDiff <= 0 ? (
            <>
              <p className="text-xl font-bold text-blue-600">{Math.abs(daysDiff)}</p>
              <p className="text-xs text-muted-foreground">Days Since Event</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold mt-1">—</p>
              <p className="text-xs text-muted-foreground">Countdown</p>
            </>
          )}
        </Card>
      </div>

      {/* Post Composer */}
      <Card className="p-4 bg-white dark:bg-[#1A1D27] border-gray-200 dark:border-gray-800">
        <Textarea
          placeholder="Share an update, ask a question, or start a discussion..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows={3}
          className="mb-3"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {(["discussion", "question", ...(isAdmin ? ["announcement"] : [])] as string[]).map((t) => {
              const cfg = POST_TYPE_CONFIG[t];
              return (
                <Button
                  key={t}
                  size="sm"
                  variant={newType === t ? "default" : "outline"}
                  className={newType === t ? "bg-pd-blue text-white" : ""}
                  onClick={() => setNewType(t)}
                >
                  <cfg.icon className="h-3.5 w-3.5 mr-1" />
                  {cfg.label}
                </Button>
              );
            })}
          </div>
          <Button size="sm" onClick={createPost} disabled={posting || !newContent.trim()}>
            {posting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Post
          </Button>
        </div>
      </Card>

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-8 text-center bg-white dark:bg-[#1A1D27] border-gray-200 dark:border-gray-800">
          <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No posts yet. Be the first to start a conversation!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const cfg = POST_TYPE_CONFIG[post.post_type] || POST_TYPE_CONFIG.discussion;
            const isExpanded = expandedPost === post.id;
            const postReplies = replies[post.id] || [];
            const isLoadingReplies = loadingReplies[post.id];

            return (
              <Card
                key={post.id}
                className="bg-white dark:bg-[#1A1D27] border-gray-200 dark:border-gray-800 overflow-hidden"
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <Avatar name={post.author_name} url={post.author_avatar_url} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{post.author_name || "Anonymous"}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                        {post.is_pinned && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 dark:text-amber-400">
                            <Pin className="h-2.5 w-2.5 mr-0.5" /> Pinned
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
                      </div>
                      {/* Content */}
                      <p className="mt-1.5 text-sm whitespace-pre-wrap">{post.content}</p>
                      {/* Actions */}
                      <div className="flex items-center gap-3 mt-3">
                        <button
                          onClick={() => likePost(post)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-blue-600 transition-colors"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          {post.likes_count > 0 && post.likes_count}
                        </button>
                        <button
                          onClick={() => toggleExpand(post.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-blue-600 transition-colors"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {post.replies_count > 0 ? `${post.replies_count} replies` : "Reply"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Replies */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#12141C] px-4 py-3 space-y-3">
                    {isLoadingReplies ? (
                      <div className="flex justify-center py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : postReplies.length > 0 ? (
                      postReplies.map((reply) => (
                        <div key={reply.id} className="flex gap-2.5">
                          <Avatar name={reply.author_name} url={reply.author_avatar_url} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs">{reply.author_name || "Anonymous"}</span>
                              <span className="text-[10px] text-muted-foreground">{timeAgo(reply.created_at)}</span>
                            </div>
                            <p className="text-sm mt-0.5">{reply.content}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-1">No replies yet</p>
                    )}

                    {/* Reply composer */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Write a reply..."
                        value={replyContent[post.id] || ""}
                        onChange={(e) => setReplyContent((p) => ({ ...p, [post.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); createReply(post.id); } }}
                        className="flex-1 text-sm px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] focus:outline-none focus:ring-1 focus:ring-pd-blue"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => createReply(post.id)}
                        disabled={replyingTo === post.id || !replyContent[post.id]?.trim()}
                      >
                        {replyingTo === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventCommunityTab;
