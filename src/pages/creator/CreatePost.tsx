import { useState, useEffect, useRef } from "react";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getConnectedAccounts, type ConnectedAccountRow } from "@/lib/upload-post-sync";
import { createUploadPost, uploadText, uploadVideo, uploadPhotos, type UploadPostPlatform } from "@/services/upload-post";
import CadenceCampaign from "./CadenceCampaign";
import {
  Loader2, Check, X, Link2, Plus, Eye, EyeOff, Sparkles,
  Upload, Image, Video, FileText, Download, Camera, Palette,
  Hash, Smile, Braces, Calendar, Tag, Copy,
  Instagram, Youtube, Facebook, Linkedin, Twitter,
  ChevronDown, LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/* ── SVG icons for platforms without lucide icons ── */
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.16 8.16 0 004.76 1.52V7.12a4.84 4.84 0 01-1-.43z" />
  </svg>
);
const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.186 24h-.007C5.965 24 2.615 20.272 2.615 14.71v-.586C2.615 8.478 6.236 4.635 12.051 4.635c5.587 0 8.964 3.525 8.964 8.527v.31c0 3.63-1.96 5.895-5.058 5.895-1.576 0-2.769-.658-3.308-1.85-.596 1.14-1.683 1.75-3.133 1.75-2.35 0-3.886-1.81-3.886-4.576 0-2.893 1.624-4.784 4.136-4.784 1.22 0 2.17.518 2.724 1.38l.07-.008V9.68h2.39v5.98c0 1.41.58 2.23 1.652 2.23 1.384 0 2.163-1.29 2.163-3.59v-.31c0-3.78-2.4-6.367-6.614-6.367-4.504 0-7.186 2.883-7.186 7.504v.586c0 4.38 2.387 7.127 6.688 7.127h.007c1.476 0 2.81-.302 3.963-.899l.867 1.877C14.923 23.65 13.595 24 12.186 24zM12.217 12c-1.427 0-2.256 1.066-2.256 2.689 0 1.62.76 2.614 2.073 2.614 1.336 0 2.132-1.048 2.132-2.674 0-1.585-.787-2.63-1.949-2.63z" />
  </svg>
);
const PinterestIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);
const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.066 13.39c.042.266.064.537.064.814 0 2.893-3.283 5.242-7.33 5.242-4.046 0-7.328-2.349-7.328-5.242 0-.277.022-.548.064-.814a1.606 1.606 0 01-.634-1.282 1.62 1.62 0 012.786-1.126c1.268-.868 2.98-1.42 4.895-1.47l.975-4.588a.36.36 0 01.432-.278l3.256.694a1.15 1.15 0 012.147.547 1.15 1.15 0 01-2.146.547l-2.836-.605-.868 4.082c1.876.065 3.548.618 4.79 1.472a1.615 1.615 0 012.783 1.126c0 .51-.236.965-.604 1.262zm-9.068 1.186a1.15 1.15 0 100-2.3 1.15 1.15 0 000 2.3zm5.282 2.044c-1.16 1.16-3.386 1.25-4.28 1.25s-3.12-.1-4.28-1.25a.386.386 0 01.546-.546c.73.73 2.29.99 3.734.99 1.444 0 3.004-.26 3.734-.99a.386.386 0 01.546.546zM14.85 14.576a1.15 1.15 0 100-2.3 1.15 1.15 0 000 2.3z" />
  </svg>
);
const BlueskyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C8.418 5.097 5.115 8.475 4.24 11.414c-.947 3.183.28 5.23 2.478 5.583-1.174.458-2.555 1.252-2.345 3.156.255 2.308 2.228 2.078 5.11 1.488.96-.196 1.632-.388 2.517-.388.885 0 1.557.192 2.517.388 2.882.59 4.855.82 5.11-1.488.21-1.904-1.171-2.698-2.345-3.156 2.198-.352 3.425-2.4 2.478-5.583C18.885 8.475 15.582 5.097 12 2z" />
  </svg>
);
const GoogleBizIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);
/* Google Drive icon */
const GoogleDriveIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.71 3.5L1.15 15l3.43 5.93 6.56-11.36L7.71 3.5zm1.14 0l6.57 11.36H22L15.43 3.5H8.85zM16 15.5H2.87l3.43 5.93h13.13L16 15.5z" />
  </svg>
);

/* Brand colors per platform */
const BRAND_COLORS: Record<string, string> = {
  instagram: "#E4405F", youtube: "#FF0000", facebook: "#1877F2",
  linkedin: "#0A66C2", twitter: "#1DA1F2", x: "#000000",
  tiktok: "#000000", threads: "#000000", pinterest: "#E60023",
  reddit: "#FF4500", bluesky: "#0085FF", google_business: "#4285F4",
};

const PLATFORM_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram, youtube: Youtube, facebook: Facebook,
  linkedin: Linkedin, x: Twitter, twitter: Twitter, tiktok: TikTokIcon,
  threads: ThreadsIcon, pinterest: PinterestIcon, reddit: RedditIcon,
  bluesky: BlueskyIcon, google_business: GoogleBizIcon,
};

function platformIcon(platform: string) {
  return PLATFORM_ICON_MAP[platform.toLowerCase()] ?? Link2;
}

/* All platforms that could be connected */
const ALL_PLATFORMS = [
  "instagram", "facebook", "twitter", "linkedin",
  "tiktok", "youtube", "threads", "pinterest",
  "reddit", "bluesky", "google_business",
];

/* AI post ideas */
const AI_IDEAS = [
  "Share a behind-the-scenes look at your daily routine as a veteran creator.",
  "Post a 'then vs now' side-by-side showing your military journey to civilian life.",
  "Ask your audience: 'What does service mean to you?' to spark engagement.",
  "Highlight a fellow veteran creator or small business you admire.",
];

export default function CreatePost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"single" | "cadence">("single");
  const [accounts, setAccounts] = useState<ConnectedAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"none" | "video" | "photo">("none");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduledDate, setScheduledDate] = useState("");
  const [postName, setPostName] = useState("");
  const [postLabel, setPostLabel] = useState("");
  const [shortenUrls, setShortenUrls] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showIdeas, setShowIdeas] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

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
          setSelected(new Set(mapped.map((a: any) => a.platform)));
          setLoading(false);
          return;
        }
        getConnectedAccounts(user.id).then((accs) => {
          if (accs.length > 0) {
            setAccounts(accs);
            setSelected(new Set(accs.map((a) => a.platform)));
          }
          setLoading(false);
        });
      });
  }, [user?.id]);

  const toggle = (platform: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  const handlePost = async () => {
    if (!user?.id || !caption.trim()) { toast.error("Enter a caption."); return; }
    const selectedPlatforms = Array.from(selected);
    if (selectedPlatforms.length === 0) { toast.error("Select at least one platform."); return; }
    setPosting(true);
    try {
      const accountIds = accounts
        .filter((a) => selectedPlatforms.includes(a.platform))
        .map((a) => a.platform_user_id)
        .filter((id): id is string => !!id);
      const scheduled = scheduledDate ? new Date(scheduledDate).toISOString() : undefined;
      if (accountIds.length > 0) {
        const result = await createUploadPost({
          text: caption.trim(), account_ids: accountIds,
          media_url: (mediaType !== "none" && mediaUrl.trim()) ? mediaUrl.trim() : undefined,
          scheduled_at: scheduled,
        });
        if (result.success) {
          toast.success(scheduled ? "Post scheduled!" : "Post published!");
          setCaption(""); setMediaUrl(""); setScheduledDate(""); setSelected(new Set());
        } else { toast.error(result.error ?? "Post failed."); }
      } else {
        const platformList = selectedPlatforms as UploadPostPlatform[];
        let result;
        if (mediaType === "video" && mediaUrl.trim()) {
          result = await uploadVideo({ title: caption.trim(), user: user.id, platform: platformList, video: mediaUrl.trim(), scheduled_date: scheduled, async_upload: true });
        } else if (mediaType === "photo" && mediaUrl.trim()) {
          result = await uploadPhotos({ title: caption.trim(), user: user.id, platform: platformList, photos: [mediaUrl.trim()], scheduled_date: scheduled, async_upload: true });
        } else {
          result = await uploadText({ title: caption.trim(), user: user.id, platform: platformList, scheduled_date: scheduled });
        }
        if (result.success) {
          toast.success(scheduled ? "Post scheduled!" : "Post published!");
          setCaption(""); setMediaUrl(""); setScheduledDate(""); setSelected(new Set());
        } else { toast.error(result.error ?? "Post failed."); }
      }
    } catch { toast.error("Post failed."); } finally { setPosting(false); }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/ai-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setCaption((prev) => prev + (prev ? "\n\n" : "") + (data.caption ?? data.text ?? ""));
        setShowAiInput(false);
        setAiPrompt("");
        toast.success("Caption generated!");
      } else {
        toast.error("AI generation failed — try again.");
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

  const connectedPlatforms = new Set(accounts.map((a) => a.platform));
  const noAccounts = !loading && accounts.length === 0;
  const now = new Date();
  const defaultDateLabel = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <CreatorLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)] -mt-2">
        {/* ── TAB BAR ── */}
        <div className="shrink-0 border-b border-border bg-card">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 flex">
            <button
              onClick={() => setActiveTab("single")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "single"
                  ? "border-[#1B3A6B] text-[#1B3A6B] dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
              Single Post
            </button>
            <button
              onClick={() => setActiveTab("cadence")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "cadence"
                  ? "border-[#1B3A6B] text-[#1B3A6B] dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Cadence Campaign
            </button>
          </div>
        </div>

        {/* ── CADENCE CAMPAIGN TAB ── */}
        {activeTab === "cadence" && <CadenceCampaign />}

        {/* ── SINGLE POST TAB ── */}
        {activeTab === "single" && <>
        {/* ── SCROLLABLE CONTENT ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

            {/* ── 1. INSPIRATION BANNER ── */}
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800/40 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                  <span className="mr-1.5">💡</span>
                  Need inspiration for your post?
                  <span className="ml-1 text-xs text-green-600 dark:text-green-400">({AI_IDEAS.length})</span>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800/20 text-xs h-7 gap-1"
                  onClick={() => setShowIdeas(!showIdeas)}
                >
                  {showIdeas ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showIdeas ? "Hide" : "Show"}
                </Button>
              </div>
              {showIdeas && (
                <div className="mt-3 space-y-2">
                  {AI_IDEAS.map((idea, i) => (
                    <button
                      key={i}
                      onClick={() => { setCaption(idea); setShowIdeas(false); toast.success("Idea applied!"); }}
                      className="w-full text-left rounded-lg border border-green-200 dark:border-green-800/40 bg-white dark:bg-green-900/20 px-3 py-2.5 text-sm text-green-900 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-800/30 transition-colors"
                    >
                      <span className="text-green-500 mr-1.5">✦</span>{idea}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── 2. SELECT SOCIAL ACCOUNTS ── */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Select social accounts</h2>
              {noAccounts ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Connect your social accounts to start posting</p>
                  <Button size="sm" onClick={() => navigate("/creator/socials")}>
                    <Link2 className="h-4 w-4 mr-2" />Connect Accounts
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {ALL_PLATFORMS.map((platform) => {
                    const connected = connectedPlatforms.has(platform);
                    const isSelected = selected.has(platform);
                    const PIcon = platformIcon(platform);
                    const brandColor = BRAND_COLORS[platform] ?? "#6b7280";
                    return (
                      <button
                        key={platform}
                        onClick={() => connected ? toggle(platform) : navigate("/creator/socials")}
                        className="relative group"
                        title={connected ? platform : `Connect ${platform}`}
                      >
                        <div
                          className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                            connected
                              ? isSelected
                                ? "ring-2 ring-offset-2 ring-green-500"
                                : "opacity-80 hover:opacity-100"
                              : "opacity-30 hover:opacity-50"
                          }`}
                          style={{ backgroundColor: connected ? `${brandColor}15` : "#e5e7eb" }}
                        >
                          <PIcon className="h-5 w-5" style={{ color: connected ? brandColor : "#9ca3af" }} />
                        </div>
                        {/* Badge overlay — top-right */}
                        <div className={`absolute -top-0.5 -right-0.5 h-4.5 w-4.5 rounded-full flex items-center justify-center text-white ${
                          connected
                            ? isSelected ? "bg-green-500" : "bg-gray-400"
                            : "bg-gray-300"
                        }`} style={{ width: 18, height: 18 }}>
                          {connected ? (
                            isSelected
                              ? <Check className="h-2.5 w-2.5" />
                              : <X className="h-2.5 w-2.5" />
                          ) : (
                            <Plus className="h-2.5 w-2.5" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── 3. WRITE A CAPTION ── */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Write a caption</h2>
              <div className="rounded-xl border border-border overflow-hidden">
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What do you want to talk about?"
                  className="border-0 focus-visible:ring-0 resize-none min-h-[120px] text-sm rounded-none"
                />
                {/* AI prompt inline input */}
                {showAiInput && (
                  <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-muted/30">
                    <Sparkles className="h-4 w-4 text-green-600 shrink-0" />
                    <Input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
                      placeholder="Describe the caption you want..."
                      className="h-8 text-xs flex-1 border-0 bg-transparent focus-visible:ring-0"
                      autoFocus
                    />
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={handleAiGenerate} disabled={aiLoading}>
                      {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Generate"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowAiInput(false); setAiPrompt(""); }}>
                      Cancel
                    </Button>
                  </div>
                )}
                {/* Bottom toolbar */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                    onClick={() => setShowAiInput(!showAiInput)}
                  >
                    <Sparkles className="h-3 w-3" />
                    AI Assistant
                  </Button>
                  <span className="text-xs text-muted-foreground">{caption.length} characters</span>
                </div>
                {/* Emoji / hashtag / variables / link toolbar */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-border">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox checked={shortenUrls} onCheckedChange={(v) => setShortenUrls(!!v)} className="h-3.5 w-3.5" />
                    Shorten URLs
                  </label>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Emoji"><Smile className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Hashtag"><Hash className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Variables"><Braces className="h-4 w-4 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Link"><Link2 className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 4. ADD MEDIA ── */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">
                Add images, videos, and PDF documents
                <span className="text-muted-foreground font-normal ml-1">({mediaFiles.length})</span>
              </h2>
              {/* Upload type toolbar */}
              <div className="flex items-center gap-1 mb-3 flex-wrap">
                {[
                  { icon: Upload, label: "File" },
                  { icon: Image, label: "Image" },
                  { icon: Video, label: "Video" },
                  { icon: FileText, label: "Document" },
                  { icon: Download, label: "Import" },
                  { icon: Camera, label: "Screenshot" },
                  { icon: Palette, label: "Design" },
                  { icon: GoogleDriveIcon, label: "Drive" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5" />{label}
                  </button>
                ))}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              {/* Upload zone */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-border hover:border-green-400 transition-colors p-8 flex flex-col items-center gap-3"
              >
                {/* Stacked card illustration */}
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rotate-[-6deg] rounded-lg border-2 border-border bg-muted/50" />
                  <div className="absolute inset-0 rotate-[3deg] rounded-lg border-2 border-border bg-card" />
                  <div className="absolute inset-0 rounded-lg border-2 border-border bg-card flex items-center justify-center">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-foreground">Upload media</span>
                  <p className="text-xs text-muted-foreground mt-0.5">or drag and drop your file</p>
                </div>
              </button>
              {/* Show uploaded files */}
              {mediaFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {mediaFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground truncate flex-1">{file.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => setMediaFiles((prev) => prev.filter((_, j) => j !== i))} className="text-destructive hover:text-destructive/80">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* URL input fallback */}
              {mediaFiles.length === 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Or paste a URL:</span>
                    <div className="flex gap-2">
                      {(["photo", "video"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setMediaType(t)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors capitalize ${
                            mediaType === t ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  {mediaType !== "none" && (
                    <Input
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder={`https://example.com/my-${mediaType}.${mediaType === "video" ? "mp4" : "jpg"}`}
                      className="h-8 text-xs"
                    />
                  )}
                </div>
              )}
            </div>

            {/* ── 5. POST DETAILS ── */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Set post details</h2>
              <div className="space-y-3">
                {/* Schedule */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Select when to publish</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="datetime-local"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        placeholder={defaultDateLabel}
                        className="h-9 text-xs pl-9"
                      />
                    </div>
                  </div>
                </div>
                {/* Post name + Clone button */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Name your post (optional)</label>
                    <Input
                      value={postName}
                      onChange={(e) => setPostName(e.target.value)}
                      placeholder="e.g. Weekly Update #12"
                      className="h-9 text-xs"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs gap-1.5 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20 mt-5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Clone to other calendars
                  </Button>
                </div>
                {/* Label */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Add a label to track campaigns</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={postLabel}
                      onChange={(e) => setPostLabel(e.target.value)}
                      placeholder="Select or create a label..."
                      className="h-9 text-xs pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── 6. STICKY BOTTOM ACTION BAR ── */}
        <div className="shrink-0 border-t border-border bg-card px-4 sm:px-6 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => toast.info("Progress saved!")}
            >
              Save progress
            </Button>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1 pr-7"
                  onClick={() => {
                    toast.success("Saved as draft!");
                    setCaption(""); setMediaUrl(""); setScheduledDate("");
                  }}
                >
                  Save as draft
                </Button>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              </div>
              <Button
                size="sm"
                className="h-9 text-xs bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                onClick={handlePost}
                disabled={posting || noAccounts}
              >
                {posting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                {scheduledDate ? "Schedule" : "Schedule"}
              </Button>
            </div>
          </div>
        </div>
        </>}
      </div>
    </CreatorLayout>
  );
}
