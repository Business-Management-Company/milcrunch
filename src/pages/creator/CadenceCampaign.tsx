import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getConnectedAccounts, type ConnectedAccountRow } from "@/lib/upload-post-sync";
import { createUploadPost } from "@/services/upload-post";
import {
  Loader2, Check, X, Plus, Upload, Pencil, ChevronLeft,
  Calendar, Clock, Sparkles, Search, UserCircle,
  Instagram, Youtube, Facebook, Linkedin, Twitter, Link2,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/* ── Platform icons (reused from CreatePost) ── */
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.16 8.16 0 004.76 1.52V7.12a4.84 4.84 0 01-1-.43z" /></svg>
);
const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007C5.965 24 2.615 20.272 2.615 14.71v-.586C2.615 8.478 6.236 4.635 12.051 4.635c5.587 0 8.964 3.525 8.964 8.527v.31c0 3.63-1.96 5.895-5.058 5.895-1.576 0-2.769-.658-3.308-1.85-.596 1.14-1.683 1.75-3.133 1.75-2.35 0-3.886-1.81-3.886-4.576 0-2.893 1.624-4.784 4.136-4.784 1.22 0 2.17.518 2.724 1.38l.07-.008V9.68h2.39v5.98c0 1.41.58 2.23 1.652 2.23 1.384 0 2.163-1.29 2.163-3.59v-.31c0-3.78-2.4-6.367-6.614-6.367-4.504 0-7.186 2.883-7.186 7.504v.586c0 4.38 2.387 7.127 6.688 7.127h.007c1.476 0 2.81-.302 3.963-.899l.867 1.877C14.923 23.65 13.595 24 12.186 24zM12.217 12c-1.427 0-2.256 1.066-2.256 2.689 0 1.62.76 2.614 2.073 2.614 1.336 0 2.132-1.048 2.132-2.674 0-1.585-.787-2.63-1.949-2.63z" /></svg>
);
const PinterestIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" /></svg>
);
const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.066 13.39c.042.266.064.537.064.814 0 2.893-3.283 5.242-7.33 5.242-4.046 0-7.328-2.349-7.328-5.242 0-.277.022-.548.064-.814a1.606 1.606 0 01-.634-1.282 1.62 1.62 0 012.786-1.126c1.268-.868 2.98-1.42 4.895-1.47l.975-4.588a.36.36 0 01.432-.278l3.256.694a1.15 1.15 0 012.147.547 1.15 1.15 0 01-2.146.547l-2.836-.605-.868 4.082c1.876.065 3.548.618 4.79 1.472a1.615 1.615 0 012.783 1.126c0 .51-.236.965-.604 1.262zm-9.068 1.186a1.15 1.15 0 100-2.3 1.15 1.15 0 000 2.3zm5.282 2.044c-1.16 1.16-3.386 1.25-4.28 1.25s-3.12-.1-4.28-1.25a.386.386 0 01.546-.546c.73.73 2.29.99 3.734.99 1.444 0 3.004-.26 3.734-.99a.386.386 0 01.546.546zM14.85 14.576a1.15 1.15 0 100-2.3 1.15 1.15 0 000 2.3z" /></svg>
);
const BlueskyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.418 5.097 5.115 8.475 4.24 11.414c-.947 3.183.28 5.23 2.478 5.583-1.174.458-2.555 1.252-2.345 3.156.255 2.308 2.228 2.078 5.11 1.488.96-.196 1.632-.388 2.517-.388.885 0 1.557.192 2.517.388 2.882.59 4.855.82 5.11-1.488.21-1.904-1.171-2.698-2.345-3.156 2.198-.352 3.425-2.4 2.478-5.583C18.885 8.475 15.582 5.097 12 2z" /></svg>
);
const GoogleBizIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
);

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
function platformIcon(p: string) { return PLATFORM_ICON_MAP[p.toLowerCase()] ?? Link2; }

const ALL_PLATFORMS = [
  "instagram", "facebook", "twitter", "linkedin",
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
  files: File[];
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
  const [dailyTime, setDailyTime] = useState("09:00");

  // Voice profile
  const [useVoiceProfile, setUseVoiceProfile] = useState(true);
  const [voiceStyle, setVoiceStyle] = useState("");
  const [samplePost, setSamplePost] = useState("");
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Cadences
  const [cadences, setCadences] = useState<CadenceRule[]>([
    { id: crypto.randomUUID(), name: "", brief: "", days: new Set(), files: [] },
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

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
    setCadences((prev) => [...prev, { id: crypto.randomUUID(), name: "", brief: "", days: new Set(), files: [] }]);
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
  const handleCadenceFiles = (cadenceId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      setCadences((prev) => prev.map((c) => c.id === cadenceId ? { ...c, files: [...c.files, ...files] } : c));
    }
    e.target.value = "";
  };
  const removeCadenceFile = (cadenceId: string, fileIdx: number) => {
    setCadences((prev) => prev.map((c) =>
      c.id === cadenceId ? { ...c, files: c.files.filter((_, i) => i !== fileIdx) } : c
    ));
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
      if (cadence.files.length > 0) {
        const counter = fileCounters[cadence.id] ?? 0;
        mediaFile = cadence.files[counter % cadence.files.length];
        mediaPreviewUrl = URL.createObjectURL(mediaFile);
        mediaIsVideo = isVideoFile(mediaFile);
        fileCounters[cadence.id] = counter + 1;
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
        const systemPrompt = `You are a social media content writer for a military creator. Generate ONE post caption for the '${cadence.name}' content series. Brief: ${cadence.brief}. ${voiceStyle ? `Creator voice: ${voiceStyle}.` : ""} ${samplePost ? `Sample post style: ${samplePost}.` : ""} ${mediaFile ? `Media filename hint: ${mediaFile.name}.` : ""} ${mediaTypeContext} Include 5-8 relevant hashtags at the end. Return only the caption text and hashtags, nothing else.`;

        const res = await fetch("/api/anthropic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 500,
            messages: [{ role: "user", content: systemPrompt }],
          }),
        });

        let captionText = "";
        let hashtagsText = "";
        if (res.ok) {
          const data = await res.json();
          const fullText = data.content?.[0]?.text ?? "";
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
            fileCount: c.files.length,
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
        if (post.mediaFile && user?.id && campaignId) {
          const storagePath = `${creatorId ?? user.id}/${campaignId}/${post.cadenceName}/${post.mediaFile.name}`;
          const { data: uploadData } = await supabase.storage
            .from("cadence-media")
            .upload(storagePath, post.mediaFile, { upsert: true });
          if (uploadData?.path) {
            const { data: urlData } = supabase.storage
              .from("cadence-media")
              .getPublicUrl(uploadData.path);
            mediaUrl = urlData?.publicUrl;
          }
        }

        // Route based on media type: video → Reels/Shorts endpoint, image → standard post
        let result;
        if (post.mediaIsVideo && mediaUrl) {
          // Video: use the Reels/Shorts-compatible endpoint
          // Filter to video-capable platform accounts (Instagram, TikTok, YouTube)
          const videoCapablePlatforms = ["instagram", "tiktok", "youtube"];
          const videoAccountIds = accounts
            .filter((a) => selectedPlatforms.has(a.platform) && videoCapablePlatforms.includes(a.platform))
            .map((a) => a.platform_user_id)
            .filter((id): id is string => !!id);
          const postAccountIds = videoAccountIds.length > 0 ? videoAccountIds : post.accountIds;
          result = await createUploadPost({
            text,
            account_ids: postAccountIds,
            media_url: mediaUrl,
            scheduled_at: new Date(post.scheduledAt).toISOString(),
          });
        } else {
          result = await createUploadPost({
            text,
            account_ids: post.accountIds,
            media_url: mediaUrl,
            scheduled_at: new Date(post.scheduledAt).toISOString(),
          });
        }

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
                  const PIcon = platformIcon(p);
                  return <PIcon key={p} className="h-5 w-5" style={{ color: BRAND_COLORS[p] }} />;
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
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Section A: Campaign Basics ── */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#1B3A6B] text-white text-[10px] font-bold">A</span>
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
                onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Daily Post Time</label>
              <Input
                type="time"
                value={dailyTime}
                onChange={(e) => setDailyTime(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
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
                  const PIcon = platformIcon(platform);
                  const brandColor = BRAND_COLORS[platform] ?? "#6b7280";
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
                            : "opacity-30 hover:opacity-50"
                        }`}
                        style={{ backgroundColor: connected ? `${brandColor}15` : "#e5e7eb" }}
                      >
                        <PIcon className="h-5 w-5" style={{ color: connected ? brandColor : "#9ca3af" }} />
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
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#1B3A6B] text-white text-[10px] font-bold">B</span>
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
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#1B3A6B] text-white text-[10px] font-bold">C</span>
            Cadence Rules
          </h2>
          <p className="text-xs text-muted-foreground">Define your cadences — assign day patterns and upload media for each</p>

          {/* Day coverage indicator */}
          <div className="flex items-center gap-2 flex-wrap">
            {DAYS_OF_WEEK.map((d) => (
              <span
                key={d}
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  coveredDays.has(d)
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                }`}
              >
                {d} {coveredDays.has(d) ? "\u2713" : "\u2013"}
              </span>
            ))}
          </div>

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

                {/* Media upload */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Media (optional)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,video/mp4,video/quicktime,video/webm"
                      multiple
                      ref={(el) => { fileInputRefs.current[cadence.id] = el; }}
                      onChange={(e) => handleCadenceFiles(cadence.id, e)}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRefs.current[cadence.id]?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload jpg/png/mp4/mov
                    </button>
                    {cadence.files.length > 0 && (
                      <span className="text-xs text-muted-foreground">{cadence.files.length} file{cadence.files.length > 1 ? "s" : ""}</span>
                    )}
                  </div>
                  {cadence.files.length > 0 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                      {cadence.files.map((file, fi) => (
                        <div key={fi} className="relative shrink-0">
                          {file.type.startsWith("image") ? (
                            <img
                              src={URL.createObjectURL(file)}
                              className="h-16 w-16 rounded-lg object-cover border border-border"
                              alt={file.name}
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-lg bg-gray-100 dark:bg-gray-800 border border-border flex flex-col items-center justify-center">
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {file.name.split(".").pop()?.toUpperCase() ?? "VID"}
                              </span>
                              <span className="text-[8px] text-purple-500 font-medium mt-0.5">REEL</span>
                            </div>
                          )}
                          <button
                            onClick={() => removeCadenceFile(cadence.id, fi)}
                            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                          <p className="text-[9px] text-muted-foreground mt-0.5 truncate max-w-[64px]">{file.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <Button variant="outline" size="sm" className="w-full" onClick={addCadence}>
            <Plus className="h-4 w-4 mr-2" />
            Add Cadence
          </Button>
        </div>

        {/* Generate button */}
        <Button
          className="w-full h-11 bg-[#1B3A6B] hover:bg-[#152d54] text-white text-sm font-semibold"
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
    </div>
  );
}
