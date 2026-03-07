import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getConnectedAccounts, resolveUploadPostUsername, type ConnectedAccountRow } from "@/lib/upload-post-sync";
import { createUploadPost, type UploadPostPlatform } from "@/services/upload-post";
import {
  Loader2, Check, X, Plus, Upload, Pencil, ChevronLeft,
  Calendar, Clock, Sparkles, Search, UserCircle, Link2,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { PlatformIcon } from "@/lib/platform-icons";

const ALL_PLATFORMS = [
  "instagram", "facebook", "x", "linkedin",
  "tiktok", "youtube", "threads", "pinterest",
  "reddit", "bluesky", "google_business",
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type DayOfWeek = typeof DAYS_OF_WEEK[number];

const CADENCE_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif"];

function isVideoFile(file: File): boolean {
  const ext = file.name.toLowerCase();
  return VIDEO_EXTENSIONS.some((e) => ext.endsWith(e)) || file.type.startsWith("video/");
}

interface CadenceRule {
  id: string;
  name: string;
  brief: string;
  days: Set<DayOfWeek>;
}

interface MediaLibraryFile {
  id: string;
  file: File;
  previewUrl: string;
  cadenceTag: string; // cadence name or "" (untagged)
  isVideo: boolean;
}

interface GeneratedPost {
  date: string;
  dayOfWeek: DayOfWeek;
  cadenceName: string;
  cadenceColor: string;
  caption: string;
  hashtags: string;
  mediaFile: File | null;
  mediaPreviewUrl: string | null;
  mediaIsVideo: boolean;
  accountIds: string[];
  scheduledAt: string;
}

interface CreatorSearchResult {
  id: string;
  user_id: string | null;
  creator_name: string;
  creator_handle: string;
  avatar_url: string | null;
  platform: string;
}

interface CadenceCampaignProps {
  /** Pre-fill with a specific creator (used from CreatorProfileModal) */
  prefilledCreatorId?: string;
  prefilledCreatorName?: string;
}

export default function CadenceCampaign({ prefilledCreatorId, prefilledCreatorName }: CadenceCampaignProps = {}) {
  const { user, role, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // "Post As" mode
  const canPostOnBehalf = isSuperAdmin || role === "brand" || role === "admin";
  const [postAsMode, setPostAsMode] = useState<"myself" | "creator">(prefilledCreatorId ? "creator" : "myself");
  const [creatorSearch, setCreatorSearch] = useState(prefilledCreatorName ?? "");
  const [creatorResults, setCreatorResults] = useState<CreatorSearchResult[]>([]);
  const [searchingCreators, setSearchingCreators] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<CreatorSearchResult | null>(
    prefilledCreatorId && prefilledCreatorName
      ? { id: prefilledCreatorId, user_id: prefilledCreatorId, creator_name: prefilledCreatorName, creator_handle: "", avatar_url: null, platform: "" }
      : null
  );
  const [showCreatorDropdown, setShowCreatorDropdown] = useState(false);
  const creatorSearchRef = useRef<HTMLDivElement>(null);

  // Connected accounts
  const [accounts, setAccounts] = useState<ConnectedAccountRow[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());

  // Steps
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Campaign basics
  const [campaignName, setCampaignName] = useState("");
  const [duration, setDuration] = useState(30);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1 + 30 - 1);
    return d.toISOString().split("T")[0];
  });
  const [dailyTime, setDailyTime] = useState("09:00");

  // Keep Duration / Start Date / End Date in sync
  const handleDurationChange = (newDuration: number) => {
    const clamped = Math.max(1, Math.min(365, newDuration));
    setDuration(clamped);
    const s = new Date(startDate + "T00:00:00");
    if (!isNaN(s.getTime())) {
      const e = new Date(s);
      e.setDate(e.getDate() + clamped - 1);
      setEndDate(e.toISOString().split("T")[0]);
    }
  };
  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    const s = new Date(newStart + "T00:00:00");
    if (!isNaN(s.getTime())) {
      const e = new Date(s);
      e.setDate(e.getDate() + duration - 1);
      setEndDate(e.toISOString().split("T")[0]);
    }
  };
  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    const s = new Date(startDate + "T00:00:00");
    const e = new Date(newEnd + "T00:00:00");
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      setDuration(Math.max(1, Math.min(365, diff)));
    }
  };

  // Voice profile
  const [useVoiceProfile, setUseVoiceProfile] = useState(true);
  const [voiceStyle, setVoiceStyle] = useState("");
  const [samplePost, setSamplePost] = useState("");
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Cadences
  const [cadences, setCadences] = useState<CadenceRule[]>([
    { id: crypto.randomUUID(), name: "", brief: "", days: new Set() },
  ]);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);

  // Review
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduleProgress, setScheduleProgress] = useState(0);

  // Media library
  const [mediaLibrary, setMediaLibrary] = useState<MediaLibraryFile[]>([]);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // Choose from existing media library modal
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [existingMedia, setExistingMedia] = useState<Array<{ id: string; filename: string; file_url: string; file_type: string; file_size: number; cadence_tag: string | null }>>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [selectedExisting, setSelectedExisting] = useState<Set<string>>(new Set());

  // The effective user whose accounts to load
  const effectiveUserId = postAsMode === "creator" && selectedCreator?.user_id
    ? selectedCreator.user_id
    : user?.id;

  // ── Creator search ──
  useEffect(() => {
    if (postAsMode !== "creator" || creatorSearch.trim().length < 2) {
      setCreatorResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingCreators(true);
      const term = `%${creatorSearch.trim()}%`;
      const { data } = await supabase
        .from("directory_members")
        .select("id, user_id, creator_name, creator_handle, avatar_url, platform")
        .or(`creator_name.ilike.${term},creator_handle.ilike.${term}`)
        .limit(8);
      setCreatorResults((data ?? []) as CreatorSearchResult[]);
      setSearchingCreators(false);
      setShowCreatorDropdown(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [creatorSearch, postAsMode]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (creatorSearchRef.current && !creatorSearchRef.current.contains(e.target as Node)) {
        setShowCreatorDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fetch accounts for effective user ──
  useEffect(() => {
    if (!effectiveUserId) return;
    setLoadingAccounts(true);
    supabase
      .from("creator_social_connections")
      .select("*")
      .eq("user_id", effectiveUserId)
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
          setSelectedPlatforms(new Set(mapped.map((a: any) => a.platform)));
          setLoadingAccounts(false);
          return;
        }
        getConnectedAccounts(effectiveUserId).then((accs) => {
          if (accs.length > 0) {
            setAccounts(accs);
            setSelectedPlatforms(new Set(accs.map((a) => a.platform)));
          } else {
            setAccounts([]);
            setSelectedPlatforms(new Set());
          }
          setLoadingAccounts(false);
        });
      });
  }, [effectiveUserId]);

  // ── Fetch voice profile ──
  useEffect(() => {
    if (!user?.id) return;
    setLoadingProfile(true);
    supabase
      .from("creator_voice_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setVoiceStyle(data.style_description ?? "");
          setSamplePost(data.sample_post ?? "");
          setHasExistingProfile(true);
          setUseVoiceProfile(true);
        }
        setLoadingProfile(false);
      })
      .catch(() => setLoadingProfile(false));
  }, [user?.id]);

  // ── Save voice profile ──
  const saveVoiceProfile = useCallback(async () => {
    if (!user?.id) return;
    const payload = {
      user_id: user.id,
      style_description: voiceStyle.trim(),
      sample_post: samplePost.trim(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("creator_voice_profiles")
      .upsert(payload, { onConflict: "user_id" });
    if (error) {
      console.error("Voice profile save error:", error);
      toast.error("Failed to save voice profile");
    } else {
      setHasExistingProfile(true);
      toast.success("Voice profile saved");
    }
  }, [user?.id, voiceStyle, samplePost]);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };

  // ── Cadence helpers ──
  const addCadence = () => {
    setCadences((prev) => [...prev, { id: crypto.randomUUID(), name: "", brief: "", days: new Set() }]);
  };
  const removeCadence = (id: string) => {
    setCadences((prev) => prev.filter((c) => c.id !== id));
  };
  const updateCadence = (id: string, field: keyof CadenceRule, value: any) => {
    setCadences((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };
  const toggleDay = (cadenceId: string, day: DayOfWeek) => {
    setCadences((prev) => prev.map((c) => {
      if (c.id !== cadenceId) return c;
      const next = new Set(c.days);
      if (next.has(day)) next.delete(day); else next.add(day);
      return { ...c, days: next };
    }));
  };
  // Media library helpers
  const autoTagFile = (file: File): string => {
    const normalized = file.name.toLowerCase().replace(/[-_]/g, " ").replace(/\.[^.]+$/, "");
    for (const c of cadences) {
      if (c.name.trim() && normalized.includes(c.name.trim().toLowerCase().replace(/[-_]/g, " "))) {
        return c.name.trim();
      }
    }
    return "";
  };

  const handleMediaLibraryFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const maxTotal = 20;
    const remaining = maxTotal - mediaLibrary.length;
    if (remaining <= 0) { toast.error("Maximum 20 files allowed"); e.target.value = ""; return; }
    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) toast.error(`Only ${remaining} more file(s) allowed (max 20)`);
    const newEntries: MediaLibraryFile[] = toAdd.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      cadenceTag: autoTagFile(file),
      isVideo: isVideoFile(file),
    }));
    setMediaLibrary((prev) => [...prev, ...newEntries]);
    e.target.value = "";
  };

  const removeMediaFile = (id: string) => {
    setMediaLibrary((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((m) => m.id !== id);
    });
  };

  const updateMediaTag = (id: string, tag: string) => {
    setMediaLibrary((prev) => prev.map((m) => m.id === id ? { ...m, cadenceTag: tag } : m));
  };

  const handleMediaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(jpg|jpeg|png|mp4|mov)$/i.test(f.name)
    );
    if (files.length === 0) return;
    const maxTotal = 20;
    const remaining = maxTotal - mediaLibrary.length;
    if (remaining <= 0) { toast.error("Maximum 20 files allowed"); return; }
    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) toast.error(`Only ${remaining} more file(s) allowed (max 20)`);
    const newEntries: MediaLibraryFile[] = toAdd.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      cadenceTag: autoTagFile(file),
      isVideo: isVideoFile(file),
    }));
    setMediaLibrary((prev) => [...prev, ...newEntries]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openLibraryModal = async () => {
    if (!user?.id) return;
    setShowLibraryModal(true);
    setLoadingExisting(true);
    setSelectedExisting(new Set());
    const { data } = await supabase
      .from("creator_media")
      .select("id, filename, file_url, file_type, file_size, cadence_tag")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setExistingMedia((data ?? []) as any);
    setLoadingExisting(false);
  };

  const importSelectedMedia = async () => {
    const toImport = existingMedia.filter((m) => selectedExisting.has(m.id));
    const maxTotal = 20;
    const remaining = maxTotal - mediaLibrary.length;
    if (remaining <= 0) { toast.error("Maximum 20 files reached"); return; }
    const items = toImport.slice(0, remaining);

    // For each selected item, create a local entry by fetching the file
    for (const item of items) {
      try {
        const resp = await fetch(item.file_url);
        const blob = await resp.blob();
        const file = new File([blob], item.filename, { type: blob.type });
        const entry: MediaLibraryFile = {
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          cadenceTag: item.cadence_tag ?? "",
          isVideo: item.file_type === "video",
        };
        setMediaLibrary((prev) => [...prev, entry]);
      } catch {
        // skip failed fetches
      }
    }
    setShowLibraryModal(false);
    toast.success(`${items.length} file${items.length !== 1 ? "s" : ""} imported`);
  };

  // Day coverage
  const coveredDays = new Set<DayOfWeek>();
  cadences.forEach((c) => c.days.forEach((d) => coveredDays.add(d)));
  const allDaysCovered = DAYS_OF_WEEK.every((d) => coveredDays.has(d));

  const dayAssignments: Record<string, string[]> = {};
  cadences.forEach((c) => c.days.forEach((d) => {
    if (!dayAssignments[d]) dayAssignments[d] = [];
    dayAssignments[d].push(c.id);
  }));

  const connectedPlatforms = new Set(accounts.map((a) => a.platform));

  const getDayOfWeek = (date: Date): DayOfWeek => {
    const map: DayOfWeek[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return map[date.getDay()];
  };

  // ── AI Generation ──
  const handleGenerate = async () => {
    if (!user?.id) return;
    if (!campaignName.trim()) { toast.error("Enter a campaign name"); return; }
    if (selectedPlatforms.size === 0) { toast.error("Select at least one platform"); return; }
    if (!allDaysCovered) { toast.error("All 7 days must be covered by cadences"); return; }
    if (postAsMode === "creator" && !selectedCreator) { toast.error("Select a creator to post on behalf of"); return; }
    for (const c of cadences) {
      if (!c.name.trim()) { toast.error("Give each cadence a name"); return; }
      if (!c.brief.trim()) { toast.error(`Add a brief/prompt for "${c.name}"`); return; }
      if (c.days.size === 0) { toast.error(`Assign days to "${c.name}"`); return; }
    }

    if (voiceStyle.trim()) {
      await saveVoiceProfile();
    }

    setStep(2);
    setGenerating(true);
    setGenProgress(0);

    const start = new Date(startDate + "T00:00:00");
    const posts: GeneratedPost[] = [];
    setGenTotal(duration);

    const cadenceByDay: Record<string, CadenceRule> = {};
    cadences.forEach((c) => c.days.forEach((d) => { cadenceByDay[d] = c; }));
    const fileCounters: Record<string, number> = {};
    const untaggedCounter = { value: 0 };

    // Group media library files by cadence tag
    const mediaByTag: Record<string, MediaLibraryFile[]> = {};
    const untaggedMedia = mediaLibrary.filter((m) => !m.cadenceTag);
    mediaLibrary.forEach((m) => {
      if (m.cadenceTag) {
        if (!mediaByTag[m.cadenceTag]) mediaByTag[m.cadenceTag] = [];
        mediaByTag[m.cadenceTag].push(m);
      }
    });

    const accountIds = accounts
      .filter((a) => selectedPlatforms.has(a.platform))
      .map((a) => a.platform_user_id)
      .filter((id): id is string => !!id);

    for (let i = 0; i < duration; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dow = getDayOfWeek(date);
      const cadence = cadenceByDay[dow];
      if (!cadence) continue;

      let mediaFile: File | null = null;
      let mediaPreviewUrl: string | null = null;
      let mediaIsVideo = false;

      // Find media tagged to this cadence, falling back to untagged
      const taggedFiles = mediaByTag[cadence.name.trim()] ?? [];
      if (taggedFiles.length > 0) {
        const counter = fileCounters[cadence.name.trim()] ?? 0;
        const entry = taggedFiles[counter % taggedFiles.length];
        mediaFile = entry.file;
        mediaPreviewUrl = entry.previewUrl;
        mediaIsVideo = entry.isVideo;
        fileCounters[cadence.name.trim()] = counter + 1;
      } else if (untaggedMedia.length > 0) {
        const entry = untaggedMedia[untaggedCounter.value % untaggedMedia.length];
        mediaFile = entry.file;
        mediaPreviewUrl = entry.previewUrl;
        mediaIsVideo = entry.isVideo;
        untaggedCounter.value++;
      }

      const scheduledAt = `${date.toISOString().split("T")[0]}T${dailyTime}:00`;
      const cadenceColor = CADENCE_COLORS[cadences.indexOf(cadence) % CADENCE_COLORS.length];

      // Build AI prompt with media type context
      const mediaTypeContext = mediaFile
        ? isVideoFile(mediaFile)
          ? "This is a VIDEO REEL — write a punchy opening hook in the first line under 8 words, then the caption."
          : "This is an IMAGE POST — write a descriptive engaging caption."
        : "";

      try {
        const topic = `Content series: "${cadence.name}"\nBrief: ${cadence.brief}${voiceStyle ? `\nCreator voice: ${voiceStyle}` : ""}${samplePost ? `\nSample post style: ${samplePost}` : ""}${mediaFile ? `\nMedia filename hint: ${mediaFile.name}` : ""}${mediaTypeContext ? `\n${mediaTypeContext}` : ""}`;

        const res = await fetch("/api/generate-caption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, platforms: ["Instagram"] }),
        });

        let captionText = "";
        let hashtagsText = "";
        if (res.ok) {
          const data = await res.json();
          const fullText = data.caption ?? "";
          const hashtagMatch = fullText.match(/(#\S+(?:\s+#\S+)*)\s*$/);
          if (hashtagMatch) {
            hashtagsText = hashtagMatch[1];
            captionText = fullText.slice(0, fullText.lastIndexOf(hashtagMatch[1])).trim();
          } else {
            captionText = fullText;
          }
        } else {
          captionText = `[${cadence.name}] — AI generation failed, please edit manually.`;
        }

        posts.push({
          date: date.toISOString().split("T")[0], dayOfWeek: dow,
          cadenceName: cadence.name, cadenceColor,
          caption: captionText, hashtags: hashtagsText,
          mediaFile, mediaPreviewUrl, mediaIsVideo,
          accountIds, scheduledAt,
        });
      } catch {
        posts.push({
          date: date.toISOString().split("T")[0], dayOfWeek: dow,
          cadenceName: cadence.name, cadenceColor,
          caption: `[${cadence.name}] — AI generation error, please edit manually.`,
          hashtags: "", mediaFile: null, mediaPreviewUrl: null, mediaIsVideo: false,
          accountIds, scheduledAt,
        });
      }

      setGenProgress(i + 1);
      setGeneratedPosts([...posts]);
    }

    setGeneratedPosts(posts);
    setGenerating(false);
    setStep(3);
  };

  // ── Schedule all posts ──
  const handleScheduleAll = async () => {
    if (generatedPosts.length === 0) return;
    setScheduling(true);
    setScheduleProgress(0);
    let success = 0;

    // Determine user IDs for the campaign record
    const creatorId = postAsMode === "creator" && selectedCreator?.user_id
      ? selectedCreator.user_id
      : user?.id ?? null;
    const createdBy = user?.id ?? null;
    const createdForName = postAsMode === "creator" && selectedCreator
      ? selectedCreator.creator_name
      : null;

    let campaignId: string | null = null;
    if (user?.id) {
      const { data: campData } = await supabase
        .from("cadence_campaigns")
        .insert({
          user_id: creatorId,
          created_by: createdBy,
          creator_id: creatorId,
          created_for_name: createdForName,
          name: campaignName,
          duration_days: duration,
          start_date: startDate,
          daily_post_time: dailyTime + ":00",
          platform_account_ids: Array.from(selectedPlatforms),
          cadences: cadences.map((c) => ({
            name: c.name, brief: c.brief,
            days: Array.from(c.days),
          })),
          status: "scheduling",
        })
        .select("id")
        .single();
      campaignId = campData?.id ?? null;
    }

    for (let i = 0; i < generatedPosts.length; i++) {
      const post = generatedPosts[i];
      const text = post.caption + (post.hashtags ? "\n\n" + post.hashtags : "");

      try {
        let mediaUrl: string | undefined;
        if (post.mediaFile && user?.id) {
          const uid = creatorId ?? user.id;
          const cid = campaignId ?? "draft";
          const cadTag = post.cadenceName || "untagged";

          // A) Campaign media storage
          const campaignPath = `${uid}/${cid}/${cadTag}/${post.mediaFile.name}`;
          const { data: uploadData } = await supabase.storage
            .from("cadence-media")
            .upload(campaignPath, post.mediaFile, { upsert: true });
          if (uploadData?.path) {
            const { data: urlData } = supabase.storage
              .from("cadence-media")
              .getPublicUrl(uploadData.path);
            mediaUrl = urlData?.publicUrl;
          }

          // B) Master media library storage (fire-and-forget)
          const libPath = `${uid}/media/${Date.now()}-${post.mediaFile.name}`;
          supabase.storage
            .from("creator-media-library")
            .upload(libPath, post.mediaFile, { upsert: true })
            .then(({ data: libUpload }) => {
              if (libUpload?.path) {
                const { data: libUrl } = supabase.storage
                  .from("creator-media-library")
                  .getPublicUrl(libUpload.path);
                supabase.from("creator_media").insert({
                  user_id: uid,
                  filename: post.mediaFile!.name,
                  file_url: libUrl?.publicUrl ?? null,
                  file_type: post.mediaIsVideo ? "video" : "image",
                  file_size: post.mediaFile!.size,
                  cadence_tag: cadTag,
                  campaign_id: campaignId,
                });
              }
            });
        }

        // Resolve UploadPost profile slug and publish via correct endpoint
        const upUser = await resolveUploadPostUsername(effectiveUserId ?? user?.id ?? "");
        const platforms = Array.from(selectedPlatforms) as UploadPostPlatform[];
        const result = await createUploadPost({
          text,
          user: upUser,
          platforms,
          media_url: mediaUrl,
          media_type: post.mediaIsVideo ? "video" : mediaUrl ? "photo" : undefined,
          scheduled_at: new Date(post.scheduledAt).toISOString(),
        });

        if (user?.id && campaignId) {
          await supabase.from("cadence_posts").insert({
            campaign_id: campaignId,
            user_id: creatorId,
            scheduled_at: new Date(post.scheduledAt).toISOString(),
            cadence_name: post.cadenceName,
            caption: post.caption,
            hashtags: post.hashtags,
            media_url: mediaUrl ?? null,
            upload_post_id: result.id ?? null,
            status: result.success ? "scheduled" : "failed",
          });
        }

        if (result.success) success++;
      } catch {
        // continue
      }

      setScheduleProgress(i + 1);
    }

    if (campaignId) {
      await supabase.from("cadence_campaigns").update({ status: "scheduled" }).eq("id", campaignId);
    }

    setScheduling(false);
    toast.success(`${success} of ${generatedPosts.length} posts scheduled!`);
  };

  // ── Calendar grid helpers ──
  const getCalendarWeeks = () => {
    if (generatedPosts.length === 0) return [];
    const weeks: (GeneratedPost | null)[][] = [];
    let currentWeek: (GeneratedPost | null)[] = [];

    const firstDate = new Date(generatedPosts[0].date + "T00:00:00");
    const firstDow = firstDate.getDay();
    const mondayOffset = firstDow === 0 ? 6 : firstDow - 1;
    for (let i = 0; i < mondayOffset; i++) currentWeek.push(null);

    let postIdx = 0;
    const start = new Date(startDate + "T00:00:00");
    for (let i = 0; i < duration; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      const mondayIdx = dow === 0 ? 6 : dow - 1;

      if (currentWeek.length > 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      while (currentWeek.length < mondayIdx) currentWeek.push(null);

      const matchingPost = generatedPosts[postIdx];
      if (matchingPost && matchingPost.date === d.toISOString().split("T")[0]) {
        currentWeek.push(matchingPost);
        postIdx++;
      } else {
        currentWeek.push(null);
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }
    return weeks;
  };

  // ── RENDER ──

  // Step 2: AI Generation progress
  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-6">
        <Sparkles className="h-12 w-12 text-blue-500 mx-auto animate-pulse" />
        <h2 className="text-xl font-bold">Generating {genTotal} posts...</h2>
        <p className="text-sm text-muted-foreground">
          Using AI to create captions for your {campaignName} campaign
          {postAsMode === "creator" && selectedCreator && (
            <span className="block mt-1">for <strong>{selectedCreator.creator_name}</strong></span>
          )}
        </p>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-[#1B3A6B] h-full rounded-full transition-all duration-300"
            style={{ width: `${genTotal > 0 ? (genProgress / genTotal) * 100 : 0}%` }}
          />
        </div>
        <p className="text-sm font-medium">{genProgress} / {genTotal} complete</p>
        {generating && <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />}
      </div>
    );
  }

  // Step 3: Review & Approve
  if (step === 3) {
    const weeks = getCalendarWeeks();
    const cadenceBreakdown: Record<string, number> = {};
    generatedPosts.forEach((p) => {
      cadenceBreakdown[p.cadenceName] = (cadenceBreakdown[p.cadenceName] ?? 0) + 1;
    });

    const endDate = new Date(startDate + "T00:00:00");
    endDate.setDate(endDate.getDate() + duration - 1);

    return (
      <div className="flex flex-col h-full">
        {/* Edit drawer */}
        {editingIdx !== null && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-end">
            <div className="w-full max-w-md h-full bg-card border-l border-border p-6 overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Edit Post — {generatedPosts[editingIdx].date}</h3>
                <Button variant="ghost" size="sm" onClick={() => setEditingIdx(null)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="inline-block px-2 py-0.5 rounded text-xs text-white font-medium" style={{ backgroundColor: generatedPosts[editingIdx].cadenceColor }}>
                    {generatedPosts[editingIdx].cadenceName}
                  </div>
                  {generatedPosts[editingIdx].mediaIsVideo && (
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-medium">REEL</span>
                  )}
                </div>
                {generatedPosts[editingIdx].mediaPreviewUrl && (
                  generatedPosts[editingIdx].mediaIsVideo ? (
                    <video src={generatedPosts[editingIdx].mediaPreviewUrl!} className="w-full h-40 object-cover rounded-lg" controls />
                  ) : (
                    <img src={generatedPosts[editingIdx].mediaPreviewUrl!} className="w-full h-40 object-cover rounded-lg" alt="" />
                  )
                )}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Caption</label>
                  <Textarea
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    className="min-h-[200px] text-sm"
                  />
                </div>
                <Button
                  className="w-full bg-[#1B3A6B] hover:bg-[#152d54] text-white"
                  onClick={() => {
                    setGeneratedPosts((prev) => prev.map((p, i) =>
                      i === editingIdx ? { ...p, caption: editCaption } : p
                    ));
                    setEditingIdx(null);
                    toast.success("Post updated");
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
            <div>
              <h2 className="text-lg font-bold">Review Your {generatedPosts.length}-Day Campaign</h2>
              <p className="text-sm text-muted-foreground">
                {campaignName}
                {postAsMode === "creator" && selectedCreator && (
                  <span> &middot; for {selectedCreator.creator_name}</span>
                )}
              </p>
            </div>
          </div>
          <Button
            className="bg-[#1B3A6B] hover:bg-[#152d54] text-white"
            onClick={handleScheduleAll}
            disabled={scheduling}
          >
            {scheduling ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Scheduling... {scheduleProgress}/{generatedPosts.length}</>
            ) : (
              <><Calendar className="h-4 w-4 mr-2" />Schedule All</>
            )}
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar summary */}
          <div className="w-64 shrink-0 border-r border-border p-4 space-y-4 overflow-y-auto hidden lg:block">
            {postAsMode === "creator" && selectedCreator && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Creating for</p>
                <div className="flex items-center gap-2">
                  {selectedCreator.avatar_url ? (
                    <img src={selectedCreator.avatar_url} className="h-6 w-6 rounded-full object-cover" alt="" />
                  ) : (
                    <UserCircle className="h-6 w-6 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium truncate">{selectedCreator.creator_name}</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total posts</p>
              <p className="text-2xl font-bold">{generatedPosts.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Platforms</p>
              <div className="flex gap-1.5">
                {Array.from(selectedPlatforms).map((p) => {
                  return <PlatformIcon key={p} platform={p} size={20} />;
                })}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Date range</p>
              <p className="text-sm font-medium">
                {new Date(startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} &ndash; {endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Cadence breakdown</p>
              <div className="space-y-1.5">
                {Object.entries(cadenceBreakdown).map(([name, count]) => {
                  const c = cadences.find((cc) => cc.name === name);
                  const color = c ? CADENCE_COLORS[cadences.indexOf(c) % CADENCE_COLORS.length] : "#6b7280";
                  return (
                    <div key={name} className="flex items-center gap-2 text-sm">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="truncate">{name}</span>
                      <span className="text-muted-foreground ml-auto">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="space-y-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map((post, di) => (
                    <div
                      key={di}
                      className={`min-h-[100px] rounded-lg border p-1.5 text-xs ${
                        post ? "border-border bg-card hover:border-blue-300 transition-colors" : "border-transparent bg-gray-50 dark:bg-gray-900/30"
                      }`}
                    >
                      {post && (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] text-white font-medium truncate max-w-[80%]" style={{ backgroundColor: post.cadenceColor }}>
                              {post.cadenceName}
                            </span>
                            <button
                              onClick={() => {
                                setEditingIdx(generatedPosts.indexOf(post));
                                setEditCaption(post.caption + (post.hashtags ? "\n\n" + post.hashtags : ""));
                              }}
                              className="p-0.5 rounded hover:bg-muted"
                            >
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </div>
                          {post.mediaPreviewUrl && (
                            post.mediaIsVideo ? (
                              <div className="relative w-full h-12 rounded mb-1 bg-gray-900 flex items-center justify-center overflow-hidden">
                                <video src={post.mediaPreviewUrl} className="w-full h-full object-cover" muted />
                                <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-purple-600 text-white px-1 rounded">REEL</span>
                              </div>
                            ) : (
                              <img src={post.mediaPreviewUrl} className="w-full h-12 object-cover rounded mb-1" alt="" />
                            )
                          )}
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                            {post.caption.slice(0, 60)}{post.caption.length > 60 ? "..." : ""}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(post.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: Campaign Setup ──
  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F5F7FA" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Section A: Campaign Basics ── */}
        <div className="bg-white dark:bg-card rounded-2xl p-6 space-y-4" style={{ borderLeft: "4px solid #1B3A6B", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
            <span className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#1B3A6B" }}>A</span>
            Campaign Basics
          </h2>

          {/* ── Post As selector ── */}
          {canPostOnBehalf && (
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Post as</label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => { setPostAsMode("myself"); setSelectedCreator(null); setCreatorSearch(""); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    postAsMode === "myself"
                      ? "bg-[#1B3A6B] text-white"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <UserCircle className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
                  Myself
                </button>
                <button
                  onClick={() => setPostAsMode("creator")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    postAsMode === "creator"
                      ? "bg-[#1B3A6B] text-white"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <Search className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
                  On behalf of a creator
                </button>
              </div>

              {postAsMode === "creator" && (
                <div className="relative" ref={creatorSearchRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={creatorSearch}
                      onChange={(e) => { setCreatorSearch(e.target.value); setSelectedCreator(null); }}
                      onFocus={() => creatorResults.length > 0 && setShowCreatorDropdown(true)}
                      placeholder="Search creator by name or handle..."
                      className="h-9 text-sm pl-9"
                    />
                    {searchingCreators && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>

                  {/* Selected creator badge */}
                  {selectedCreator && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800/40 px-3 py-2">
                      {selectedCreator.avatar_url ? (
                        <img src={selectedCreator.avatar_url} className="h-7 w-7 rounded-full object-cover" alt="" />
                      ) : (
                        <UserCircle className="h-7 w-7 text-green-600" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300 truncate">{selectedCreator.creator_name}</p>
                        {selectedCreator.creator_handle && (
                          <p className="text-xs text-green-600 dark:text-green-400 truncate">@{selectedCreator.creator_handle}</p>
                        )}
                      </div>
                      <button onClick={() => { setSelectedCreator(null); setCreatorSearch(""); }} className="text-green-600 hover:text-green-800">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Search dropdown */}
                  {showCreatorDropdown && creatorResults.length > 0 && !selectedCreator && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
                      {creatorResults.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCreator(c);
                            setCreatorSearch(c.creator_name);
                            setShowCreatorDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted transition-colors"
                        >
                          {c.avatar_url ? (
                            <img src={c.avatar_url} className="h-8 w-8 rounded-full object-cover shrink-0" alt="" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-gray-500">{(c.creator_name || "?").charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{c.creator_name}</p>
                            <p className="text-xs text-muted-foreground truncate">@{c.creator_handle} &middot; {c.platform}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Campaign Name</label>
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. March Content Push"
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duration (days)</label>
              <Input
                type="number"
                min={1}
                max={365}
                value={duration}
                onChange={(e) => handleDurationChange(parseInt(e.target.value) || 1)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <div className="max-w-[calc(33.333%-0.5rem)]">
            <label className="text-xs text-muted-foreground mb-1 block">Daily Post Time</label>
            <Input
              type="time"
              value={dailyTime}
              onChange={(e) => setDailyTime(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Platform selector */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">
              Platforms
              {postAsMode === "creator" && selectedCreator && (
                <span className="ml-1 text-green-600 dark:text-green-400">({selectedCreator.creator_name}'s accounts)</span>
              )}
            </label>
            {loadingAccounts ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : accounts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {postAsMode === "creator" && selectedCreator
                    ? `${selectedCreator.creator_name} has no connected social accounts`
                    : "Connect social accounts first"}
                </p>
                {postAsMode === "myself" && (
                  <Button size="sm" onClick={() => navigate("/creator/socials")}>
                    <Link2 className="h-4 w-4 mr-2" />Connect Accounts
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {ALL_PLATFORMS.map((platform) => {
                  const connected = connectedPlatforms.has(platform);
                  const isSelected = selectedPlatforms.has(platform);
                  return (
                    <button
                      key={platform}
                      onClick={() => connected ? togglePlatform(platform) : (postAsMode === "myself" ? navigate("/creator/socials") : undefined)}
                      className="relative group"
                      title={connected ? platform : `Connect ${platform}`}
                    >
                      <div
                        className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                          connected
                            ? isSelected
                              ? "ring-2 ring-offset-2 ring-green-500"
                              : "opacity-80 hover:opacity-100"
                            : "opacity-30 hover:opacity-50 grayscale"
                        }`}
                      >
                        <PlatformIcon platform={platform} size={48} />
                      </div>
                      <div className={`absolute -top-0.5 -right-0.5 rounded-full flex items-center justify-center text-white ${
                        connected ? isSelected ? "bg-green-500" : "bg-gray-400" : "bg-gray-300"
                      }`} style={{ width: 18, height: 18 }}>
                        {connected ? (
                          isSelected ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />
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
        </div>

        {/* ── Section B: Tone & Voice Profile ── */}
        <div className="bg-white dark:bg-card rounded-2xl p-6 space-y-3" style={{ borderLeft: "4px solid #C8A84B", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
            <span className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#C8A84B" }}>B</span>
            Tone & Voice Profile
          </h2>

          {hasExistingProfile && (
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={`relative h-5 w-9 rounded-full transition-colors ${useVoiceProfile ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                onClick={() => setUseVoiceProfile(!useVoiceProfile)}
              >
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${useVoiceProfile ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm">Use my voice profile</span>
            </label>
          )}

          {(!hasExistingProfile || !useVoiceProfile) && !loadingProfile && (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Describe your content style</label>
                <Textarea
                  value={voiceStyle}
                  onChange={(e) => setVoiceStyle(e.target.value)}
                  placeholder="Casual and motivational, military veteran audience, uses humor, avoids politics"
                  className="min-h-[80px] text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sample Post (optional)</label>
                <Textarea
                  value={samplePost}
                  onChange={(e) => setSamplePost(e.target.value)}
                  placeholder="Paste one of your best posts here — AI will clone the tone"
                  className="min-h-[80px] text-sm"
                />
              </div>
            </>
          )}

          {hasExistingProfile && useVoiceProfile && (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800/40 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              Voice profile loaded. <button onClick={() => setUseVoiceProfile(false)} className="underline">Edit</button>
            </div>
          )}
        </div>

        {/* ── Section C: Cadence Rules ── */}
        <div className="bg-white dark:bg-card rounded-2xl p-6 space-y-3" style={{ borderLeft: "4px solid #0D9488", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
            <span className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#0D9488" }}>C</span>
            Cadence Rules
          </h2>
          <p className="text-xs text-muted-foreground">Define your cadences — assign day patterns and content briefs</p>

          {cadences.map((cadence, idx) => {
            const color = CADENCE_COLORS[idx % CADENCE_COLORS.length];
            return (
              <div key={cadence.id} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <Input
                    value={cadence.name}
                    onChange={(e) => updateCadence(cadence.id, "name", e.target.value)}
                    placeholder="Cadence Name (e.g. Deal of the Week)"
                    className="h-8 text-sm flex-1"
                  />
                  {cadences.length > 1 && (
                    <button onClick={() => removeCadence(cadence.id)} className="text-red-500 hover:text-red-700 p-1">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <Textarea
                  value={cadence.brief}
                  onChange={(e) => updateCadence(cadence.id, "brief", e.target.value)}
                  placeholder="Brief/Prompt (e.g. Promote a sponsor deal with urgency and a CTA)"
                  className="min-h-[60px] text-sm"
                />

                {/* Day picker */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Days of week</label>
                  <div className="flex gap-1.5">
                    {DAYS_OF_WEEK.map((d) => {
                      const isActive = cadence.days.has(d);
                      const assignedElsewhere = dayAssignments[d]?.length > 0 && !dayAssignments[d]?.includes(cadence.id);
                      return (
                        <button
                          key={d}
                          onClick={() => toggleDay(cadence.id, d)}
                          disabled={assignedElsewhere}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            isActive
                              ? "text-white"
                              : assignedElsewhere
                                ? "bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                          }`}
                          style={isActive ? { backgroundColor: color } : undefined}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          })}

          <Button variant="outline" size="sm" className="w-full" onClick={addCadence}>
            <Plus className="h-4 w-4 mr-2" />
            Add Cadence
          </Button>
        </div>

        {/* ── Day Coverage Indicator (between C and D) ── */}
        <div className="bg-white dark:bg-card rounded-2xl p-4" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          {allDaysCovered ? (
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              All 7 days covered
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {DAYS_OF_WEEK.map((d) => {
                const assignedCadence = cadences.find((c) => c.days.has(d));
                const cadenceIdx = assignedCadence ? cadences.indexOf(assignedCadence) : -1;
                const color = cadenceIdx >= 0 ? CADENCE_COLORS[cadenceIdx % CADENCE_COLORS.length] : undefined;
                const abbrev = assignedCadence?.name?.trim() ? (assignedCadence.name.trim().length > 6 ? assignedCadence.name.trim().slice(0, 5) + "…" : assignedCadence.name.trim()) : undefined;
                return (
                  <div
                    key={d}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                        assignedCadence
                          ? "text-white"
                          : "border-2 border-red-400 text-red-500 dark:border-red-500 dark:text-red-400"
                      }`}
                      style={assignedCadence ? { backgroundColor: color } : undefined}
                    >
                      {assignedCadence ? d : `${d} !`}
                    </span>
                    {abbrev && (
                      <span className="text-[9px] text-muted-foreground truncate max-w-[60px]">{abbrev}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Section D: Media Library ── */}
        <div className="bg-white dark:bg-card rounded-2xl p-6 space-y-3" style={{ borderLeft: "4px solid #7C3AED", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-3">
            <span className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#7C3AED" }}>D</span>
            Media Library
            {mediaLibrary.length > 0 && (
              <span className="ml-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {mediaLibrary.length} file{mediaLibrary.length !== 1 ? "s" : ""} uploaded
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">
            Upload media for this campaign. Tag each file to a cadence so the AI knows which media to use.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleMediaDrop}
            onClick={() => mediaInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 cursor-pointer hover:bg-muted/40 hover:border-muted-foreground/30 transition-colors"
          >
            <Upload className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">Drop files here or click to browse</p>
            <p className="text-xs text-muted-foreground/70">jpg, png, mp4, mov &middot; max 20 files</p>
            <input
              type="file"
              ref={mediaInputRef}
              onChange={handleMediaLibraryFiles}
              accept="image/jpeg,image/png,video/mp4,video/quicktime"
              multiple
              className="hidden"
            />
          </div>

          {/* Choose from existing media library */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={openLibraryModal}
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
            Choose from Media Library
          </Button>

          {/* Media grid */}
          {mediaLibrary.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {mediaLibrary.map((item) => {
                const cadenceNames = cadences.filter((c) => c.name.trim()).map((c) => c.name.trim());
                return (
                  <div key={item.id} className="rounded-xl border border-border overflow-hidden bg-card">
                    {/* Thumbnail */}
                    <div className="relative h-28 bg-gray-100 dark:bg-gray-800">
                      {item.isVideo ? (
                        <>
                          <video src={item.previewUrl} className="w-full h-full object-cover" muted />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-8 w-8 rounded-full bg-black/50 flex items-center justify-center">
                              <div className="ml-0.5 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-white" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <img src={item.previewUrl} className="w-full h-full object-cover" alt={item.file.name} />
                      )}
                      {/* Remove button */}
                      <button
                        onClick={() => removeMediaFile(item.id)}
                        className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {/* Type badge */}
                      <span className={`absolute bottom-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.isVideo
                          ? "bg-purple-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}>
                        {item.isVideo ? "REEL" : "IMAGE"}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="px-2.5 py-2 space-y-1.5">
                      <p className="text-[11px] font-medium truncate" title={item.file.name}>{item.file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatFileSize(item.file.size)}</p>
                      {/* Cadence tag dropdown */}
                      <div className="flex items-center gap-1.5">
                        <select
                          value={item.cadenceTag}
                          onChange={(e) => updateMediaTag(item.id, e.target.value)}
                          className="flex-1 h-7 rounded-md border border-border bg-background px-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Untagged</option>
                          {cadenceNames.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        {!item.cadenceTag && (
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                            Untagged
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Generate button */}
        <Button
          className="w-full h-12 bg-[#1B3A6B] hover:bg-[#152d54] text-white text-sm font-semibold rounded-2xl shadow-lg"
          disabled={!allDaysCovered || generating || accounts.length === 0 || (postAsMode === "creator" && !selectedCreator)}
          onClick={handleGenerate}
        >
          {generating ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" />Generate Campaign</>
          )}
        </Button>

        {!allDaysCovered && cadences.some((c) => c.days.size > 0) && (
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
            All 7 days of the week must be assigned to a cadence before generating
          </p>
        )}

        <div className="h-4" />
      </div>

      {/* ── Choose from Media Library Modal ── */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowLibraryModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col"
            style={{ maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-lg font-semibold">Choose from Media Library</h3>
                <p className="text-xs text-muted-foreground">Select files to reuse in this campaign</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedExisting.size > 0 && (
                  <Button
                    className="bg-[#1B3A6B] hover:bg-[#152d54] text-white text-xs"
                    onClick={importSelectedMedia}
                  >
                    Import {selectedExisting.size} file{selectedExisting.size !== 1 ? "s" : ""}
                  </Button>
                )}
                <button onClick={() => setShowLibraryModal(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingExisting ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : existingMedia.length === 0 ? (
                <div className="text-center py-16">
                  <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No media in your library yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Upload media using the drop zone above</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {existingMedia.map((item) => {
                    const isSelected = selectedExisting.has(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedExisting((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                          });
                        }}
                        className={`rounded-xl border-2 overflow-hidden text-left transition-colors ${
                          isSelected
                            ? "border-[#1B3A6B] ring-2 ring-[#1B3A6B]/20"
                            : "border-border hover:border-gray-300"
                        }`}
                      >
                        <div className="relative h-24 bg-gray-100 dark:bg-gray-800">
                          {item.file_type === "video" ? (
                            <video src={item.file_url} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={item.file_url} className="w-full h-full object-cover" alt={item.filename} />
                          )}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-[#1B3A6B] text-white flex items-center justify-center">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          <span className={`absolute bottom-1 left-1 text-[9px] font-bold px-1 py-0.5 rounded ${
                            item.file_type === "video" ? "bg-purple-600 text-white" : "bg-blue-600 text-white"
                          }`}>
                            {item.file_type === "video" ? "REEL" : "IMAGE"}
                          </span>
                        </div>
                        <div className="px-2 py-1.5">
                          <p className="text-[10px] font-medium truncate">{item.filename}</p>
                          {item.cadence_tag && (
                            <span className="text-[9px] text-muted-foreground">{item.cadence_tag}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
