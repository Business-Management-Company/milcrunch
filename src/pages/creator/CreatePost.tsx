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
import { uploadText, uploadVideo, uploadPhotos, type UploadPostPlatform } from "@/services/upload-post";
import {
  Loader2, Send, Calendar, Check, Link2,
  Instagram, Youtube, Facebook, Linkedin, Twitter,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
};

function platformIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p === "instagram") return Instagram;
  if (p === "youtube") return Youtube;
  if (p === "facebook") return Facebook;
  if (p === "linkedin") return Linkedin;
  if (p === "twitter" || p === "x") return Twitter;
  // Fallback for platforms without a dedicated lucide icon
  return Link2;
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

  /* Fetch connected accounts — try connected_accounts table first, fall back to creator_social_connections */
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    getConnectedAccounts(user.id).then((accs) => {
      if (accs.length > 0) {
        setAccounts(accs);
        setLoading(false);
        return;
      }
      // Fallback to creator_social_connections
      supabase
        .from("creator_social_connections")
        .select("*")
        .eq("user_id", user.id)
        .order("platform")
        .then(({ data }) => {
          if (data?.length) {
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
    if (!user?.id || !title.trim()) {
      toast.error("Enter post content.");
      return;
    }
    const platformList = Array.from(selected) as UploadPostPlatform[];
    if (platformList.length === 0) {
      toast.error("Select at least one platform.");
      return;
    }
    setPosting(true);
    try {
      const scheduled = scheduledDate ? new Date(scheduledDate).toISOString() : undefined;
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
        setTitle("");
        setMediaUrl("");
        setScheduledDate("");
        setSelected(new Set());
      } else {
        toast.error(result.error ?? "Post failed.");
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
            <p className="text-sm font-medium text-foreground">No social accounts connected</p>
            <p className="text-xs text-muted-foreground mt-1">Connect your social accounts to start posting across platforms.</p>
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
