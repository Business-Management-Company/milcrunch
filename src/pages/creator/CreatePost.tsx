import { useState, useEffect } from "react";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getConnectedAccounts, type ConnectedAccountRow } from "@/lib/upload-post-sync";
import { createUploadPost, uploadText, uploadVideo, uploadPhotos, type UploadPostPlatform } from "@/services/upload-post";
import {
  Loader2, Send, Calendar, Check, Link2,
  Instagram, Youtube, Facebook, Linkedin, Twitter,
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

/* Brand colors per platform */
const BRAND_COLORS: Record<string, string> = {
  instagram: "#E4405F",
  youtube: "#FF0000",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  twitter: "#1DA1F2",
  x: "#000000",
  tiktok: "#000000",
  threads: "#000000",
  pinterest: "#E60023",
  reddit: "#FF4500",
  bluesky: "#0085FF",
  google_business: "#4285F4",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X",
  twitter: "X",
  threads: "Threads",
  pinterest: "Pinterest",
  reddit: "Reddit",
  bluesky: "Bluesky",
  google_business: "Google Business",
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

export default function CreatePost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<ConnectedAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"none" | "video" | "photo">("none");
  const [selected, setSelected] = useState<Set<string>>(new Set()); // platform strings
  const [scheduledDate, setScheduledDate] = useState("");
  const [posting, setPosting] = useState(false);

  /* Fetch connected accounts — try creator_social_connections first, fall back to connected_accounts */
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
          setAccounts(
            data.map((r: any) => ({
              id: r.id,
              user_id: r.user_id,
              platform: r.platform,
              platform_user_id: r.upload_post_account_id ?? null,
              platform_username: r.account_name ?? null,
              profile_image_url: r.account_avatar ?? null,
              followers_count: null,
              raw_data: null,
              created_at: r.connected_at,
              updated_at: r.connected_at,
            }))
          );
          setLoading(false);
          return;
        }
        // Fallback to connected_accounts
        getConnectedAccounts(user.id).then((accs) => {
          if (accs.length > 0) setAccounts(accs);
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
    if (!user?.id || !title.trim()) {
      toast.error("Enter post content.");
      return;
    }
    const selectedPlatforms = Array.from(selected);
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform.");
      return;
    }
    setPosting(true);
    try {
      // Gather upload_post_account_ids for selected platforms
      const accountIds = accounts
        .filter((a) => selectedPlatforms.includes(a.platform))
        .map((a) => a.platform_user_id)
        .filter((id): id is string => !!id);

      const scheduled = scheduledDate ? new Date(scheduledDate).toISOString() : undefined;

      // Use unified posts endpoint when we have account_ids
      if (accountIds.length > 0) {
        const result = await createUploadPost({
          text: title.trim(),
          account_ids: accountIds,
          media_url: (mediaType !== "none" && mediaUrl.trim()) ? mediaUrl.trim() : undefined,
          scheduled_at: scheduled,
        });
        if (result.success) {
          toast.success(scheduled ? "Post scheduled!" : "Post published!");
          setTitle(""); setMediaUrl(""); setScheduledDate(""); setSelected(new Set());
        } else {
          toast.error(result.error ?? "Post failed.");
        }
      } else {
        // Fallback to legacy per-type endpoints
        const platformList = selectedPlatforms as UploadPostPlatform[];
        let result;
        if (mediaType === "video" && mediaUrl.trim()) {
          result = await uploadVideo({ title: title.trim(), user: user.id, platform: platformList, video: mediaUrl.trim(), scheduled_date: scheduled, async_upload: true });
        } else if (mediaType === "photo" && mediaUrl.trim()) {
          result = await uploadPhotos({ title: title.trim(), user: user.id, platform: platformList, photos: [mediaUrl.trim()], scheduled_date: scheduled, async_upload: true });
        } else {
          result = await uploadText({ title: title.trim(), user: user.id, platform: platformList, scheduled_date: scheduled });
        }
        if (result.success) {
          toast.success(scheduled ? "Post scheduled!" : "Post published!");
          setTitle(""); setMediaUrl(""); setScheduledDate(""); setSelected(new Set());
        } else {
          toast.error(result.error ?? "Post failed.");
        }
      }
    } catch {
      toast.error("Post failed.");
    } finally {
      setPosting(false);
    }
  };

  const noAccounts = !loading && accounts.length === 0;

  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">Create Post</h1>
        <p className="text-muted-foreground">Compose and publish or schedule to your connected platforms.</p>
      </div>

      {/* No accounts banner */}
      {noAccounts && (
        <div className="mb-6 rounded-xl border border-border bg-muted/50 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Connect your social accounts to start posting</p>
            <p className="text-xs text-muted-foreground mt-1">Link your social media accounts to publish and schedule posts across platforms.</p>
          </div>
          <Button size="sm" onClick={() => navigate("/creator/socials")}>
            <Link2 className="h-4 w-4 mr-2" />
            Connect Accounts
          </Button>
        </div>
      )}

      <Card className="rounded-xl border-border max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> New post</CardTitle>
          <CardDescription>Text and optional media; select platforms to post to.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Post to: branded toggle chips */}
          {accounts.length > 0 && (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Post to</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {accounts.map((acc) => {
                  const PIcon = platformIcon(acc.platform);
                  const brandColor = BRAND_COLORS[acc.platform.toLowerCase()] ?? "#6b7280";
                  const isSelected = selected.has(acc.platform);
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => toggle(acc.platform)}
                      className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition-all"
                      style={{
                        border: `2px solid ${isSelected ? brandColor : "#e5e7eb"}`,
                        background: isSelected ? `${brandColor}10` : "transparent",
                        color: isSelected ? brandColor : "#9ca3af",
                      }}
                    >
                      <PIcon className="h-4 w-4" style={{ color: isSelected ? brandColor : "#9ca3af" }} />
                      <span>{PLATFORM_LABELS[acc.platform] ?? acc.platform}</span>
                      {acc.platform_username && (
                        <span className="text-[10px] opacity-60">@{acc.platform_username}</span>
                      )}
                      {isSelected && <Check className="h-3.5 w-3.5 ml-0.5" style={{ color: brandColor }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Content / caption */}
          <div>
            <Label>Content / caption</Label>
            <Textarea value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Write your post..." className="mt-1 min-h-[120px]" />
          </div>

          {/* Media */}
          <div>
            <Label>Media (optional)</Label>
            <div className="flex flex-wrap gap-4 mt-1">
              {(["none", "video", "photo"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={mediaType === t} onCheckedChange={() => setMediaType(t)} />
                  {t === "none" ? "Text only" : t === "video" ? "Video URL" : "Photo URL"}
                </label>
              ))}
            </div>
            {(mediaType === "video" || mediaType === "photo") && (
              <Input type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://..." className="mt-2" />
            )}
          </div>

          {/* Schedule */}
          <div>
            <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Schedule (optional)</Label>
            <Input type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="mt-1 max-w-xs" />
          </div>

          {/* Submit */}
          <Button onClick={handlePost} disabled={posting || noAccounts}>
            {posting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {scheduledDate ? "Schedule post" : "Post now"}
          </Button>
        </CardContent>
      </Card>
    </CreatorLayout>
  );
}
