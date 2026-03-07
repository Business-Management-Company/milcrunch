import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
  ChevronDown, LayoutGrid,
} from "lucide-react";
import { PlatformIcon } from "@/lib/platform-icons";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/* Google Drive icon (not a social platform — keep local) */
const GoogleDriveIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.71 3.5L1.15 15l3.43 5.93 6.56-11.36L7.71 3.5zm1.14 0l6.57 11.36H22L15.43 3.5H8.85zM16 15.5H2.87l3.43 5.93h13.13L16 15.5z" />
  </svg>
);

/* All platforms that could be connected */
const ALL_PLATFORMS = [
  "instagram", "facebook", "x", "linkedin",
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
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read query params for deep-linking from CreatorProfileModal
  const qTab = searchParams.get("tab");
  const qCreatorName = searchParams.get("creatorName") ?? undefined;
  const qCreatorId = searchParams.get("creatorId") ?? undefined;

  const [activeTab, setActiveTab] = useState<"single" | "cadence">(qTab === "cadence" ? "cadence" : "single");
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
    console.log("[AI Caption] generating for prompt:", aiPrompt.trim());
    setAiLoading(true);
    try {
      const res = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: `You are a social media caption writer for a military creator. Write a compelling social media caption based on this prompt: "${aiPrompt.trim()}". Include 3-5 relevant hashtags at the end. Return only the caption text and hashtags, nothing else.`,
            },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text ?? "";
        if (text) {
          setCaption((prev) => prev + (prev ? "\n\n" : "") + text);
          setShowAiInput(false);
          setAiPrompt("");
          toast.success("Caption generated!");
        } else {
          console.error("[AI Caption] empty response:", data);
          toast.error("AI returned an empty response — try again.");
        }
      } else {
        const errBody = await res.text().catch(() => "");
        console.error("[AI Caption] API error:", res.status, errBody);
        toast.error("AI generation failed — try again.");
      }
    } catch (err) {
      console.error("[AI Caption] fetch error:", err);
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
        {activeTab === "cadence" && (
          <CadenceCampaign
            prefilledCreatorId={qCreatorId}
            prefilledCreatorName={qCreatorName}
          />
        )}

        {/* ── SINGLE POST TAB ── */}
        {activeTab === "single" && <>
        {/* ── SCROLLABLE CONTENT ── */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F5F7FA" }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

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
            <div className="bg-white dark:bg-card rounded-2xl p-6 space-y-4" style={{ borderLeft: "4px solid #1B3A6B", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#1B3A6B" }}>A</span>
                Select Social Accounts
              </h2>
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
                        >
                          <PlatformIcon platform={platform} size={28} />
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
            <div className="bg-white dark:bg-card rounded-2xl p-6 space-y-4" style={{ borderLeft: "4px solid #C8A84B", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#C8A84B" }}>B</span>
                Write a Caption
              </h2>
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
            <div className="bg-white dark:bg-card rounded-2xl p-6 space-y-4" style={{ borderLeft: "4px solid #7C3AED", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#7C3AED" }}>C</span>
                Add Media
                {mediaFiles.length > 0 && (
                  <span className="ml-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {mediaFiles.length} file{mediaFiles.length !== 1 ? "s" : ""}
                  </span>
                )}
              </h2>
              {/* Upload type toolbar */}
              <div className="flex items-center gap-1 flex-wrap">
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
                className="w-full rounded-xl border-2 border-dashed border-border hover:border-[#7C3AED]/40 transition-colors p-8 flex flex-col items-center gap-3"
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
                <div className="space-y-2">
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
                <div className="space-y-2">
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
            <div className="bg-white dark:bg-card rounded-2xl p-6 space-y-4" style={{ borderLeft: "4px solid #0D9488", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#0D9488" }}>D</span>
                Post Details
              </h2>
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

            <div className="h-4" />
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
