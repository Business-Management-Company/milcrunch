import { useState, useEffect } from "react";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { getConnectedAccounts } from "@/lib/upload-post-sync";
import { uploadText, uploadVideo, uploadPhotos, type UploadPostPlatform } from "@/services/upload-post";
import { Loader2, Send, Calendar } from "lucide-react";
import { toast } from "sonner";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram", tiktok: "TikTok", linkedin: "LinkedIn", youtube: "YouTube",
  facebook: "Facebook", x: "X (Twitter)", threads: "Threads",
};

export default function CreatePost() {
  const { user } = useAuth();
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"none" | "video" | "photo">("none");
  const [platforms, setPlatforms] = useState<Set<UploadPostPlatform>>(new Set());
  const [scheduledDate, setScheduledDate] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getConnectedAccounts(user.id).then((accounts) => setConnectedPlatforms(accounts.map((a) => a.platform)));
  }, [user?.id]);

  const togglePlatform = (p: UploadPostPlatform) => {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const handlePost = async () => {
    if (!user?.id || !title.trim()) {
      toast.error("Enter post content.");
      return;
    }
    const platformList = Array.from(platforms);
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
        toast.success(scheduled ? "Post scheduled." : "Post published.");
        setTitle("");
        setMediaUrl("");
        setScheduledDate("");
      } else {
        toast.error(result.error ?? "Post failed.");
      }
    } catch {
      toast.error("Post failed.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">Create Post</h1>
        <p className="text-muted-foreground">Compose and publish or schedule to your connected platforms.</p>
      </div>
      <Card className="rounded-xl border-border max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> New post</CardTitle>
          <CardDescription>Text and optional media; select platforms to post to.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Content / caption</Label>
            <Textarea value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Write your post..." className="mt-1 min-h-[120px]" />
          </div>
          <div>
            <Label>Media (optional)</Label>
            <div className="flex flex-wrap gap-4 mt-1">
              {(["none", "video", "photo"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2">
                  <Checkbox checked={mediaType === t} onCheckedChange={() => setMediaType(t)} />
                  {t === "none" ? "Text only" : t === "video" ? "Video URL" : "Photo URL"}
                </label>
              ))}
            </div>
            {(mediaType === "video" || mediaType === "photo") && (
              <Input type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://..." className="mt-2" />
            )}
          </div>
          <div>
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-3 mt-2">
              {(["instagram", "tiktok", "x", "linkedin", "facebook", "threads"] as const).map((p) => (
                <label key={p} className={`flex items-center gap-2 ${connectedPlatforms.length > 0 && !connectedPlatforms.includes(p) ? "opacity-50" : ""}`}>
                  <Checkbox checked={platforms.has(p)} onCheckedChange={() => togglePlatform(p)} disabled={connectedPlatforms.length > 0 && !connectedPlatforms.includes(p)} />
                  {PLATFORM_LABELS[p] ?? p}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Schedule (optional)</Label>
            <Input type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="mt-1 max-w-xs" />
          </div>
          <Button onClick={handlePost} disabled={posting}>
            {posting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {scheduledDate ? "Schedule post" : "Post now"}
          </Button>
        </CardContent>
      </Card>
    </CreatorLayout>
  );
}
