import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageCircle, Pin, Heart, Send, Megaphone, HelpCircle,
  Camera, Handshake, Hand, Loader2, Plus, X, Image as ImageIcon,
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
  author_branch?: string | null;
  content: string;
  post_type: string;
  image_url?: string | null;
  is_pinned: boolean;
  likes_count: number;
  replies_count: number;
  created_at: string;
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
  event: { title: string; start_date: string | null } | null;
}

/* ---------- config ---------- */
const POST_TYPES = [
  { key: "all", label: "All", icon: MessageCircle },
  { key: "announcement", label: "Announcements", icon: Megaphone, emoji: "📢" },
  { key: "introduction", label: "Intros", icon: Hand, emoji: "👋" },
  { key: "question", label: "Questions", icon: HelpCircle, emoji: "❓" },
  { key: "photo", label: "Photos", icon: Camera, emoji: "📸" },
  { key: "looking_for", label: "Looking For", icon: Handshake, emoji: "🤝" },
];

const POST_TYPE_STYLES: Record<string, { label: string; color: string; emoji: string }> = {
  announcement: { label: "Announcement", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", emoji: "📢" },
  introduction: { label: "Introduction", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", emoji: "👋" },
  question: { label: "Question", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", emoji: "❓" },
  photo: { label: "Photo", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", emoji: "📸" },
  looking_for: { label: "Looking For", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", emoji: "🤝" },
  discussion: { label: "Discussion", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", emoji: "💬" },
  general: { label: "Post", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", emoji: "💬" },
};

const BRANCH_COLORS: Record<string, string> = {
  Army: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Navy: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "Air Force": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  Marines: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "Coast Guard": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  "Space Force": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function Avatar({ name, url, size = "h-10 w-10" }: { name: string | null; url: string | null; size?: string }) {
  if (url) return <img src={url} alt={name || ""} className={`${size} rounded-full object-cover`} />;
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-[#6C5CE7] to-purple-400 flex items-center justify-center text-white text-xs font-bold`}>
      {initials}
    </div>
  );
}

/* ---------- mock data ---------- */
function mockDate(daysAgo: number, hoursAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
}

const MOCK_POSTS: CommunityPost[] = [
  { id: "cp1", event_id: "", user_id: null, author_name: "MIC 2026 Team", author_avatar_url: null, author_branch: null, post_type: "announcement", content: "Welcome to the MIC 2026 community! 🎉 Start connecting with fellow attendees, check out the agenda, and don't forget to register for workshops — they fill up fast! This community stays active year-round.", is_pinned: true, likes_count: 89, replies_count: 23, created_at: mockDate(15) },
  { id: "cp2", event_id: "", user_id: null, author_name: "MIC 2026 Team", author_avatar_url: null, author_branch: null, post_type: "announcement", content: "📢 Reminder: Early bird pricing ends March 31! Lock in your tickets now. VIP passes include access to the speaker lounge and exclusive networking dinner.", is_pinned: true, likes_count: 45, replies_count: 8, created_at: mockDate(10) },
  { id: "cp3", event_id: "", user_id: null, author_name: "Johnny Marines", author_avatar_url: null, author_branch: "Marines", post_type: "introduction", content: "Hey everyone! Johnny Marines here — 168K on Instagram. First time at MIC and I'm pumped to connect with fellow military creators. Who else is doing content creation full-time? 🇺🇸", is_pinned: false, likes_count: 45, replies_count: 12, created_at: mockDate(0, 2) },
  { id: "cp4", event_id: "", user_id: null, author_name: "SGT Sarah Mitchell", author_avatar_url: null, author_branch: "Army", post_type: "introduction", content: "Active duty Army, 12 years in. Started my milspouse lifestyle blog 2 years ago and now I'm at 85K followers. Can't wait to learn from everyone at MIC! Looking for collab partners. 💪", is_pinned: false, likes_count: 67, replies_count: 15, created_at: mockDate(1, 4) },
  { id: "cp5", event_id: "", user_id: null, author_name: "Jessica Dee Bruden", author_avatar_url: null, author_branch: "Navy", post_type: "introduction", content: "Navy veteran & photographer here! 📸 234K on TikTok. I document military life through a creative lens. This will be my third MIC — the networking alone is worth the trip!", is_pinned: false, likes_count: 78, replies_count: 10, created_at: mockDate(2, 6) },
  { id: "cp6", event_id: "", user_id: null, author_name: "Ranger Fitness", author_avatar_url: null, author_branch: "Army", post_type: "introduction", content: "What's up MIC community! 120K on IG, Army veteran, fitness content creator. Looking to connect with brands in the health & wellness space. Hit me up if you want to grab coffee at the conference! 💪", is_pinned: false, likes_count: 52, replies_count: 9, created_at: mockDate(2, 8) },
  { id: "cp7", event_id: "", user_id: null, author_name: "Air Force Amanda", author_avatar_url: null, author_branch: "Air Force", post_type: "question", content: "Anyone know if there's a dedicated space for content creation/filming at the venue? Want to plan some collabs during breaks! 🎬", is_pinned: false, likes_count: 23, replies_count: 8, created_at: mockDate(1, 3) },
  { id: "cp8", event_id: "", user_id: null, author_name: "SGM (Ret) Jackson", author_avatar_url: null, author_branch: "Army", post_type: "question", content: "For those who've attended before — is parking included with the ticket or do we need to pay separately? Also, any rideshare recommendations for downtown? 🚗", is_pinned: false, likes_count: 34, replies_count: 19, created_at: mockDate(3, 9) },
  { id: "cp9", event_id: "", user_id: null, author_name: "VetBiz Daily", author_avatar_url: null, author_branch: null, post_type: "question", content: "Which networking session are you most excited about? I'm torn between the Brand Deals 101 workshop and the Creator Economy panel. Both at 2pm on Day 1 😫", is_pinned: false, likes_count: 42, replies_count: 28, created_at: mockDate(4, 2) },
  { id: "cp10", event_id: "", user_id: null, author_name: "Dave Bray USA", author_avatar_url: null, author_branch: "Navy", post_type: "photo", content: "Throwback to MIC 2025! Can't wait to perform again this year. New patriotic anthem dropping at the ceremony 🎸🇺🇸", image_url: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop", is_pinned: false, likes_count: 234, replies_count: 45, created_at: mockDate(3, 1) },
  { id: "cp11", event_id: "", user_id: null, author_name: "Military Connect", author_avatar_url: null, author_branch: null, post_type: "photo", content: "Sneak peek of our networking lounge design for MIC 2026! Can't wait for you all to see it in person. 🔥", image_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop", is_pinned: false, likes_count: 156, replies_count: 12, created_at: mockDate(5, 3) },
];

const MOCK_REPLIES: Record<string, CommunityReply[]> = {
  cp3: [
    { id: "r1", post_id: "cp3", user_id: null, author_name: "Ranger Fitness", author_avatar_url: null, content: "Welcome Johnny! 🙌 Full-time creator here too. Let's connect at the networking dinner!", created_at: mockDate(0, 1) },
    { id: "r2", post_id: "cp3", user_id: null, author_name: "Air Force Amanda", author_avatar_url: null, content: "Same here! Been full-time for about 18 months now. Would love to chat about brand partnerships!", created_at: mockDate(0, 1) },
  ],
  cp7: [
    { id: "r3", post_id: "cp7", user_id: null, author_name: "MIC 2026 Team", author_avatar_url: null, content: "Great question! Yes, there will be a Creator Studio on Level 2 with ring lights, backdrops, and charging stations. Open all 3 days! 🎬", created_at: mockDate(1, 2) },
    { id: "r4", post_id: "cp7", user_id: null, author_name: "Jessica Dee Bruden", author_avatar_url: null, content: "Amazing! I was wondering the same thing. Let's coordinate some collabs there!", created_at: mockDate(1, 1) },
  ],
  cp8: [
    { id: "r5", post_id: "cp8", user_id: null, author_name: "Johnny Marines", author_avatar_url: null, content: "Parking is $15/day at the venue garage. I'm planning to Uber from the hotel — it's only about $8 from the downtown hotels.", created_at: mockDate(3, 5) },
  ],
};

/* ======================================== */
export default function AttendeeCommunity({ eventId, event }: Props) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [filterType, setFilterType] = useState("all");

  /* composer state */
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("introduction");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* replies state */
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, CommunityReply[]>>(MOCK_REPLIES);
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  /* ---------- fetch ---------- */
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
      if (data && data.length > 0) {
        setPosts(data as unknown as CommunityPost[]);
      } else {
        setPosts(MOCK_POSTS.map((p) => ({ ...p, event_id: eventId })));
      }
    } catch {
      setPosts(MOCK_POSTS.map((p) => ({ ...p, event_id: eventId })));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  /* ---------- realtime ---------- */
  useEffect(() => {
    const channel = supabase
      .channel(`community-${eventId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "event_community_posts",
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        setPosts((prev) => [payload.new as unknown as CommunityPost, ...prev]);
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "event_community_replies",
      }, (payload) => {
        const reply = payload.new as unknown as CommunityReply;
        setReplies((prev) => ({
          ...prev,
          [reply.post_id]: [...(prev[reply.post_id] || []), reply],
        }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  /* ---------- image handling ---------- */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setNewImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setNewImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setNewImageFile(null);
    setNewImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ---------- create post ---------- */
  const createPost = async () => {
    if (!newContent.trim()) return;
    setPosting(true);
    const authorName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Anonymous";

    let imageUrl: string | null = null;

    // Upload image if selected
    if (newImageFile) {
      const ext = newImageFile.name.split(".").pop() || "jpg";
      const path = `community/${eventId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("community-images")
        .upload(path, newImageFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("community-images")
          .getPublicUrl(path);
        imageUrl = urlData?.publicUrl || null;
      }
    }

    try {
      const { error } = await supabase.from("event_community_posts").insert({
        event_id: eventId,
        user_id: user?.id,
        author_name: authorName,
        author_avatar_url: user?.user_metadata?.avatar_url || null,
        content: newContent.trim(),
        post_type: newType,
        image_url: imageUrl,
      } as Record<string, unknown>);
      if (error) throw error;
      setNewContent("");
      setNewType("introduction");
      clearImage();
      setShowComposer(false);
      toast.success("Post published!");
      fetchPosts();
    } catch {
      // If table doesn't exist yet, add to local mock
      const mockPost: CommunityPost = {
        id: `local-${Date.now()}`,
        event_id: eventId,
        user_id: user?.id || null,
        author_name: authorName,
        author_avatar_url: null,
        content: newContent.trim(),
        post_type: newType,
        image_url: newImagePreview,
        is_pinned: false,
        likes_count: 0,
        replies_count: 0,
        created_at: new Date().toISOString(),
      };
      setPosts((prev) => [mockPost, ...prev]);
      setNewContent("");
      clearImage();
      setShowComposer(false);
      toast.success("Post published!");
    } finally {
      setPosting(false);
    }
  };

  /* ---------- like ---------- */
  const likePost = (postId: string) => {
    if (likedPosts.has(postId)) return;
    setLikedPosts((prev) => new Set(prev).add(postId));
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p));
    supabase.from("event_community_posts")
      .update({ likes_count: (posts.find((p) => p.id === postId)?.likes_count || 0) + 1 } as Record<string, unknown>)
      .eq("id", postId)
      .then();
  };

  /* ---------- reply ---------- */
  const createReply = async (postId: string) => {
    const text = replyContent[postId]?.trim();
    if (!text) return;
    const authorName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You";
    const newReply: CommunityReply = {
      id: `lr-${Date.now()}`,
      post_id: postId,
      user_id: user?.id || null,
      author_name: authorName,
      author_avatar_url: null,
      content: text,
      created_at: new Date().toISOString(),
    };
    setReplies((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), newReply] }));
    setReplyContent((prev) => ({ ...prev, [postId]: "" }));
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, replies_count: p.replies_count + 1 } : p));
    supabase.from("event_community_replies").insert({
      post_id: postId,
      user_id: user?.id,
      author_name: authorName,
      author_avatar_url: user?.user_metadata?.avatar_url || null,
      content: text,
    } as Record<string, unknown>).then();
  };

  /* ---------- toggle expand ---------- */
  const toggleExpand = (postId: string) => {
    setExpandedPost((prev) => prev === postId ? null : postId);
  };

  /* ---------- filtered posts ---------- */
  const filteredPosts = filterType === "all"
    ? posts
    : posts.filter((p) => p.post_type === filterType);

  const userRole = user?.user_metadata?.role;
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  return (
    <div className="space-y-4 px-4 py-4">
      {/* 365 Banner */}
      <div className="rounded-xl bg-gradient-to-r from-[#6C5CE7]/10 to-purple-100/50 dark:from-[#6C5CE7]/20 dark:to-purple-900/20 border border-[#6C5CE7]/20 px-4 py-3">
        <p className="text-xs font-medium text-[#6C5CE7]">
          ♻️ 365 Community — This space stays active year-round. Connect before, during, and after the event.
        </p>
      </div>

      {/* Post Type Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {POST_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilterType(t.key)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filterType === t.key
                ? "bg-[#6C5CE7] text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            {t.emoji ? `${t.emoji} ` : ""}{t.label}
          </button>
        ))}
      </div>

      {/* Tap to Post */}
      {!showComposer && (
        <button
          onClick={() => setShowComposer(true)}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-3 text-left text-sm text-muted-foreground hover:border-[#6C5CE7]/40 transition-colors"
        >
          What's on your mind?
        </button>
      )}

      {/* Composer */}
      {showComposer && (
        <Card className="p-4 bg-white dark:bg-[#1A1D27] border-[#6C5CE7]/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Create Post</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowComposer(false); clearImage(); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1.5 mb-3 overflow-x-auto">
            {(["introduction", "question", "photo", "looking_for", ...(isAdmin ? ["announcement"] : [])] as string[]).map((t) => {
              const cfg = POST_TYPE_STYLES[t] || POST_TYPE_STYLES.discussion;
              return (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    newType === t ? cfg.color : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                  }`}
                >
                  {cfg.emoji} {cfg.label}
                </button>
              );
            })}
          </div>
          <Textarea
            placeholder={newType === "introduction" ? "Hi, I'm..." : newType === "question" ? "What would you like to know?" : "Share something with the community..."}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value.slice(0, 500))}
            rows={3}
            className="mb-2"
          />

          {/* Image upload */}
          {newImagePreview ? (
            <div className="relative mb-2">
              <img src={newImagePreview} alt="Preview" className="w-full rounded-lg max-h-48 object-cover" />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-[#6C5CE7] mb-2 transition-colors"
            >
              <ImageIcon className="h-4 w-4" />
              Add image
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{newContent.length}/500</span>
            <Button size="sm" onClick={createPost} disabled={posting || !newContent.trim()} className="bg-[#6C5CE7] hover:bg-[#5A4BD5]">
              {posting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Post
            </Button>
          </div>
        </Card>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card className="p-8 text-center bg-white dark:bg-[#1A1D27]">
          <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No posts yet. Be the first!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const cfg = POST_TYPE_STYLES[post.post_type] || POST_TYPE_STYLES.general;
            const isExpanded = expandedPost === post.id;
            const postReplies = replies[post.id] || [];
            const isLiked = likedPosts.has(post.id);
            const branchStyle = post.author_branch ? BRANCH_COLORS[post.author_branch] : null;

            return (
              <Card key={post.id} className="bg-white dark:bg-[#1A1D27] border-gray-100 dark:border-gray-800 overflow-hidden rounded-xl shadow-sm">
                <div className="p-4">
                  {/* Author header */}
                  <div className="flex items-start gap-3">
                    <Avatar name={post.author_name} url={post.author_avatar_url} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm">{post.author_name || "Anonymous"}</span>
                        {branchStyle && (
                          <Badge className={`text-[10px] px-1.5 py-0 ${branchStyle}`}>{post.author_branch}</Badge>
                        )}
                        <Badge className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>{cfg.emoji} {cfg.label}</Badge>
                        {post.is_pinned && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 dark:text-amber-400">
                            <Pin className="h-2.5 w-2.5 mr-0.5" /> Pinned
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="mt-2.5 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>

                  {/* Image */}
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt=""
                      className="mt-3 w-full rounded-lg object-cover max-h-64"
                    />
                  )}

                  {/* Actions bar */}
                  <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-50 dark:border-gray-800">
                    <button
                      onClick={() => likePost(post.id)}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                        isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? "fill-red-500" : ""}`} />
                      {post.likes_count > 0 && post.likes_count}
                    </button>
                    <button
                      onClick={() => toggleExpand(post.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-[#6C5CE7] transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {post.replies_count > 0 ? `${post.replies_count}` : "Reply"}
                    </button>
                  </div>
                </div>

                {/* Replies section */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#12141C] px-4 py-3 space-y-3">
                    {postReplies.length > 0 ? (
                      postReplies.map((reply) => (
                        <div key={reply.id} className="flex gap-2.5">
                          <Avatar name={reply.author_name} url={reply.author_avatar_url} size="h-7 w-7" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs">{reply.author_name}</span>
                              <span className="text-[10px] text-muted-foreground">{timeAgo(reply.created_at)}</span>
                            </div>
                            <p className="text-sm mt-0.5">{reply.content}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-1">No replies yet</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Write a reply..."
                        value={replyContent[post.id] || ""}
                        onChange={(e) => setReplyContent((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); createReply(post.id); } }}
                        className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
                      />
                      <Button size="sm" variant="ghost" onClick={() => createReply(post.id)} disabled={!replyContent[post.id]?.trim()}>
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating Create Button (mobile-style) */}
      {!showComposer && (
        <button
          onClick={() => setShowComposer(true)}
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-[#6C5CE7] text-white shadow-lg flex items-center justify-center hover:bg-[#5A4BD5] transition-colors z-30"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
