import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  enrichCreatorProfile,
  fullEnrichCreatorProfile,
  logCreditUsage,
  type CreatorCard,
  type EnrichedProfileResponse,
} from "@/lib/influencers-club";
import { useLists, type ListCreator } from "@/contexts/ListContext";
import {
  ExternalLink,
  ListPlus,
  BarChart3,
  Image,
  Users,
  Plus,
  Video,
  Loader2,
  Link,
  ShieldCheck,
  ChevronDown,
  Trash2,
  CalendarPlus,
  FolderPlus,
  Music,
  Check,
  Mail,
  MapPin,
  Globe,
  Briefcase,
  Ban,
  TrendingUp,
  ChevronRight,
  MoreHorizontal,
  Camera,
  Play,
  Eye,
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { cn, safeImageUrl, goodAvatarCache } from "@/lib/utils";
import { getCreatorAvatar } from "@/lib/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { approveForDirectory, detectBranch, extractAvatarFromEnrichment, extractBannerImage } from "@/lib/featured-creators";
import { getCrossPlatformSummary, formatCompactFollowers } from "@/lib/enrichment-platforms";
import CreateListModal from "@/components/CreateListModal";
import { PlatformIcon } from "@/lib/platform-icons";


const BRANCH_STYLES: Record<string, string> = {
  Army: "bg-green-800/10 text-green-800 dark:bg-green-800/20 dark:text-green-400",
  Navy: "bg-blue-900/10 text-blue-900 dark:bg-blue-900/20 dark:text-blue-400",
  "Air Force": "bg-sky-600/10 text-sky-700 dark:bg-sky-600/20 dark:text-sky-400",
  Marines: "bg-red-700/10 text-red-700 dark:bg-red-700/20 dark:text-red-400",
  "Coast Guard": "bg-orange-600/10 text-orange-700 dark:bg-orange-600/20 dark:text-orange-400",
  "Space Force": "bg-indigo-600/10 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-400",
};


const PLATFORM_ORDER = ["instagram", "tiktok", "youtube", "facebook", "twitter", "linkedin"];
const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  twitter: "X",
  linkedin: "LinkedIn",
};
const PLATFORM_PILL_STYLES: Record<string, { active: string; inactive: string }> = {
  instagram: { active: "bg-[#1a56db] text-white", inactive: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" },
  tiktok: { active: "bg-[#1a56db] text-white", inactive: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" },
  youtube: { active: "bg-[#1a56db] text-white", inactive: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" },
  facebook: { active: "bg-[#1a56db] text-white", inactive: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" },
  twitter: { active: "bg-[#1a56db] text-white", inactive: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" },
  linkedin: { active: "bg-[#1a56db] text-white", inactive: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" },
};

/**
 * Compute analytics from post_data when the RAW enrich endpoint is used.
 * The RAW endpoint (0.03 credits) returns post_data with per-post engagement
 * but no computed averages — those are only in the FULL endpoint (1.03 credits).
 */
function computeFromPostData(rec: Record<string, unknown> | undefined, followerCount: number) {
  const raw = rec?.post_data;
  const posts: Record<string, unknown>[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === "object") posts.push(item as Record<string, unknown>);
    }
  }
  if (posts.length === 0) {
    console.log("[computeFromPostData] No posts found. post_data type:", typeof raw, "isArray:", Array.isArray(raw));
    return { avgLikes: 0, avgComments: 0, avgViews: 0, engagement: 0, postsPerMonth: 0 };
  }

  let totalLikes = 0;
  let totalComments = 0;
  let totalViews = 0;
  let videoCount = 0;
  const dates: number[] = [];

  for (const p of posts) {
    // Support both nested engagement object and flat fields
    const eng = (p.engagement && typeof p.engagement === "object") ? p.engagement as Record<string, unknown> : p;
    const likes = Number(eng.likes ?? eng.like_count ?? 0) || 0;
    const comments = Number(eng.comments ?? eng.comment_count ?? 0) || 0;
    totalLikes += likes;
    totalComments += comments;
    const vc = Number(eng.view_count ?? eng.views ?? eng.play_count ?? 0) || 0;
    if (vc > 0) {
      totalViews += vc;
      videoCount++;
    }
    const d = new Date(p.created_at as string);
    if (!isNaN(d.getTime())) dates.push(d.getTime());
  }

  const avgLikes = totalLikes / posts.length;
  const avgComments = totalComments / posts.length;
  const avgViews = videoCount > 0 ? totalViews / videoCount : 0;
  const engagement = followerCount > 0 ? ((avgLikes + avgComments) / followerCount) * 100 : 0;

  let postsPerMonth = 0;
  if (dates.length >= 2) {
    dates.sort((a, b) => a - b);
    const daySpan = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
    if (daySpan > 0) postsPerMonth = (dates.length / daySpan) * 30;
  }

  console.log("[computeFromPostData]", posts.length, "posts → avgLikes:", Math.round(avgLikes), "avgComments:", Math.round(avgComments), "avgViews:", Math.round(avgViews), "postsPerMonth:", postsPerMonth.toFixed(1), "engagement:", engagement.toFixed(2));
  return { avgLikes, avgComments, avgViews, engagement, postsPerMonth };
}

/** Format numbers for display (9.4k, 1.2M). */
function formatNumber(n: number | undefined | null): string {
  if (n != null && n !== 0 && !Number.isFinite(n)) return "—";
  if (n == null || (n === 0 && n !== 0)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1);
}

function formatPercent(n: number | undefined | null): string {
  if (n != null && n !== 0 && !Number.isFinite(n)) return "—";
  if (n == null || (n === 0 && n !== 0)) return "—";
  return n.toFixed(2) + "%";
}

function formatIncome(min: number | undefined | null, max: number | undefined | null, _currency?: string): string {
  if ((min == null || min === 0) && (max == null || max === 0)) return "Income data not available.";
  return `$${Number(min ?? 0).toLocaleString()} – $${Number(max ?? 0).toLocaleString()} / 90 days`;
}

/** Legacy formatNum for any remaining call sites. */
function formatNum(n: number): string {
  return formatNumber(n);
}

/**
 * Normalise metrics from any platform's enrichment data record.
 * Tries direct IC fields first (FULL endpoint), then falls back to
 * computing averages from post_data (RAW endpoint — 0.03 credits).
 */
function getMetricsForPlatform(
  rec: Record<string, unknown> | undefined,
  platform: string,
  creatorCard?: Partial<CreatorCard> | null,
) {
  if (!rec) {
    return { followers: 0, engagement: 0, mediaCount: 0, postsPerMonth: 0, avgLikes: 0, avgComments: 0, avgSpecial: 0, avgViews: 0, totalLikes: 0 };
  }

  const pick = (...vals: (number | unknown)[]): number => {
    for (const v of vals) {
      const n = Number(v);
      if (n && isFinite(n) && n > 0) return n;
    }
    return 0;
  };

  // Only use creatorCard fallback for instagram — the card's followers/engagement
  // are from the search result (always IG) and would be wrong for other platforms.
  const cardForFallback = platform === "instagram" ? creatorCard : null;

  const fc = pick(
    rec.follower_count,
    rec.subscriber_count,
    cardForFallback?.followers,
  );

  // Always try computeFromPostData as a fallback — the RAW endpoint returns
  // post_data but NOT pre-computed averages for TikTok/YouTube/Twitter.
  const computed = computeFromPostData(rec, fc);

  const reelsObj = platform === "instagram"
    ? (rec.reels as Record<string, unknown> | undefined)
    : undefined;

  const engagement = pick(
    rec.engagement_percent, rec.engagement_rate,
    computed.engagement,
    cardForFallback?.engagementRate,
  );
  const mediaCount = pick(
    rec.media_count, rec.number_of_posts, rec.video_count,
    rec.tweet_count, rec.statuses_count,
    cardForFallback?.mediaCount,
  );
  const postsPerMonth = pick(
    rec.posting_frequency_recent_months, rec.posts_per_month,
    rec.videos_per_month, rec.posting_frequency,
    computed.postsPerMonth,
    cardForFallback?.postsPerMonth,
  );
  const avgLikes = pick(
    rec.avg_likes, rec.avg_like_count, rec.average_likes,
    computed.avgLikes,
    cardForFallback?.avgLikes,
  );
  const avgComments = pick(
    rec.avg_comments, rec.avg_comment_count, rec.average_comments,
    rec.avg_replies,
    computed.avgComments,
    cardForFallback?.avgComments,
  );

  let avgSpecial = 0;
  if (platform === "instagram") {
    avgSpecial = pick(
      reelsObj?.avg_like_count, reelsObj?.avg_likes,
      rec.avg_reel_likes,
      cardForFallback?.avgReelLikes,
    );
  } else if (platform === "tiktok") {
    avgSpecial = pick(rec.avg_shares, rec.avg_share_count, rec.average_shares);
  } else if (platform === "youtube") {
    avgSpecial = pick(rec.avg_short_plays, rec.avg_shorts_plays);
  } else if (platform === "twitter") {
    avgSpecial = pick(rec.avg_retweets, rec.avg_retweet_count);
  }

  const avgViews = pick(
    rec.avg_view_count, rec.avg_views, rec.average_views,
    rec.avg_impressions,
    reelsObj?.avg_view_count,
    rec.avg_reels_plays, rec.average_reels_plays,
    computed.avgViews,
    cardForFallback?.avgViews,
  );

  const totalLikes = pick(
    rec.total_likes, rec.total_like_count, rec.heart_count,
    rec.total_hearts, rec.likes_count,
  );

  return { followers: fc, engagement, mediaCount, postsPerMonth, avgLikes, avgComments, avgSpecial, avgViews, totalLikes };
}

/* ── Enrichment cache (Supabase) ── */
const ENRICH_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getEnrichCache(handle: string, platform: string, expectedName?: string): Promise<EnrichedProfileResponse | null> {
  try {
    const { data } = await supabase
      .from("creator_enrichment_cache")
      .select("enrichment_data, cached_at")
      .eq("username", handle.toLowerCase())
      .eq("platform", platform)
      .single();
    if (!data) return null;
    const cachedAt = new Date(data.cached_at).getTime();
    if (Date.now() - cachedAt > ENRICH_CACHE_TTL_MS) return null;

    // Validate cached profile name against expected name (prevents stale cross-account data)
    if (expectedName) {
      const enrichment = data.enrichment_data as EnrichedProfileResponse;
      const cachedName = String(
        enrichment?.instagram?.full_name ?? enrichment?.instagram?.name ?? enrichment?.result?.full_name ?? ""
      ).trim().toLowerCase();
      const expected = expectedName.trim().toLowerCase();
      if (cachedName && expected && cachedName !== expected) {
        const cachedWords = new Set(cachedName.split(/\s+/));
        const expectedWords = expected.split(/\s+/);
        const overlap = expectedWords.some((w: string) => w.length > 2 && cachedWords.has(w));
        if (!overlap) {
          console.warn(`[EnrichCache] Mismatch for @${handle}: cached "${cachedName}", expected "${expected}" — invalidating cache`);
          supabase
            .from("creator_enrichment_cache")
            .delete()
            .eq("username", handle.toLowerCase())
            .eq("platform", platform)
            .then(() => console.log(`[EnrichCache] Deleted stale cache for @${handle}`));
          return null;
        }
      }
    }

    return data.enrichment_data as EnrichedProfileResponse;
  } catch {
    return null;
  }
}

async function setEnrichCache(handle: string, platform: string, enrichment: EnrichedProfileResponse): Promise<void> {
  try {
    await supabase
      .from("creator_enrichment_cache")
      .upsert(
        {
          username: handle.toLowerCase(),
          platform,
          enrichment_data: enrichment,
          cached_at: new Date().toISOString(),
        },
        { onConflict: "username" },
      );
  } catch (err) {
    console.warn("[Enrich] Cache write failed:", err);
  }
}

interface CreatorProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creator: CreatorCard | null;
  onAddToList?: (creator: ListCreator) => void;
  onOpenCreator?: (username: string) => void;
  cachedEnrichment?: EnrichedProfileResponse | null;
  /** Hide "Add to Directory" buttons (e.g. when opened from a directory). */
  hideDirectoryActions?: boolean;
  /** If provided, shows a "Remove from Directory" button and calls this on click. */
  onRemoveFromDirectory?: () => void;
}

interface PostItem {
  id?: string;
  thumbnail?: string;
  caption?: string;
  likes?: number;
  comments?: number;
  views?: number;
  date?: string;
  permalink?: string;
}

interface SimilarAccount {
  id?: string;
  username?: string;
  name?: string;
  full_name?: string;
  avatar?: string;
  picture?: string;
  followers?: number;
  follower_count?: number;
  engagement_percent?: number;
  profile_url?: string;
  similarity?: number;
}

export default function CreatorProfileModal({
  open,
  onOpenChange,
  creator,
  onAddToList,
  onOpenCreator,
  cachedEnrichment,
  hideDirectoryActions,
  onRemoveFromDirectory,
}: CreatorProfileModalProps) {
  const navigate = useNavigate();
  const [enriched, setEnriched] = useState<EnrichedProfileResponse | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [enrichmentTimedOut, setEnrichmentTimedOut] = useState(false);
  const [enrichmentSource, setEnrichmentSource] = useState<"cache" | "api" | "prop" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("instagram");
  const [createListModalOpen, setCreateListModalOpen] = useState(false);
  const [postContentType, setPostContentType] = useState<"posts" | "reels">("posts");
  const [brokenPostImages, setBrokenPostImages] = useState<Set<string>>(new Set());
  const [similarAvatars, setSimilarAvatars] = useState<Record<string, string>>({});
  const [approvingDir, setApprovingDir] = useState(false);
  const [directoriesList, setDirectoriesList] = useState<{ id: string; name: string }[]>([]);
  const { addCreatorToList, lists, createList, isCreatorInList } = useLists();
  const { user } = useAuth();

  // Dropdown states for action buttons
  const [listDropdownOpen, setListDropdownOpen] = useState(false);
  const [dirDropdownOpen, setDirDropdownOpen] = useState(false);
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [newDirName, setNewDirName] = useState("");
  const [showNewDirInput, setShowNewDirInput] = useState(false);
  const [eventsList, setEventsList] = useState<{ id: string; title: string; start_date: string }[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [invitingEvent, setInvitingEvent] = useState(false);
  // Campaigns for this creator
  const [creatorCampaigns, setCreatorCampaigns] = useState<any[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  // Resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(330);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(330);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = ev.clientX - dragStartXRef.current;
      const newWidth = Math.max(250, Math.min(500, dragStartWidthRef.current + delta));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [sidebarWidth]);

  // Get Email state
  const [fetchingEmail, setFetchingEmail] = useState(false);
  const [fetchedEmail, setFetchedEmail] = useState<string | null>(null);
  const [emailNotFound, setEmailNotFound] = useState(false);
  const [platformEnrichments, setPlatformEnrichments] = useState<Record<string, Record<string, unknown>>>({});
  const [platformEnrichmentLoading, setPlatformEnrichmentLoading] = useState<Set<string>>(new Set());

  // Track whether user has manually selected a platform (prevents auto-switching)
  const userSelectedPlatformRef = useRef(false);

  const listDropdownRef = useRef<HTMLDivElement>(null);
  const dirDropdownRef = useRef<HTMLDivElement>(null);
  const eventDropdownRef = useRef<HTMLDivElement>(null);

  // Only use the actual username from the API — never derive one from the
  // display name.  Deriving "cbs_evening_news" from "CBS Evening News" would
  // enrich a completely different person and cause data merging bugs.
  const username = creator?.username;

  // Load directories for "Add to Directory" dropdown
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("directories")
        .select("id, name")
        .order("created_at", { ascending: true });
      if (data) setDirectoriesList(data as { id: string; name: string }[]);
    })();
  }, [user]);

  // Fetch upcoming events when event dropdown opens
  useEffect(() => {
    if (!eventDropdownOpen || !user) return;
    setEventsLoading(true);
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, start_date")
        .gte("start_date", new Date().toISOString())
        .order("start_date")
        .limit(10);
      if (data) setEventsList(data as { id: string; title: string; start_date: string }[]);
      setEventsLoading(false);
    })();
  }, [eventDropdownOpen, user]);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    if (!listDropdownOpen && !dirDropdownOpen && !eventDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (listDropdownOpen && listDropdownRef.current && !listDropdownRef.current.contains(e.target as Node)) {
        setListDropdownOpen(false);
        setShowNewListInput(false);
        setNewListName("");
        setSelectedListIds(new Set());
      }
      if (dirDropdownOpen && dirDropdownRef.current && !dirDropdownRef.current.contains(e.target as Node)) {
        setDirDropdownOpen(false);
        setShowNewDirInput(false);
        setNewDirName("");
      }
      if (eventDropdownOpen && eventDropdownRef.current && !eventDropdownRef.current.contains(e.target as Node)) {
        setEventDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setListDropdownOpen(false);
        setDirDropdownOpen(false);
        setEventDropdownOpen(false);
        setShowNewListInput(false);
        setShowNewDirInput(false);
        setSelectedListIds(new Set());
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [listDropdownOpen, dirDropdownOpen, eventDropdownOpen]);

  // Reset dropdowns when modal closes
  useEffect(() => {
    if (!open) {
      setListDropdownOpen(false);
      setDirDropdownOpen(false);
      setEventDropdownOpen(false);
      setShowNewListInput(false);
      setShowNewDirInput(false);
      setNewListName("");
      setNewDirName("");
      setSelectedListIds(new Set());
    }
  }, [open]);

  const controllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!open || !creator) {
      setEnriched(null);
      setError(null);
      setEnrichmentTimedOut(false);
      setSelectedPlatform("instagram");
      setEnrichmentLoading(false);
      setEnrichmentSource(null);
      setFetchingEmail(false);
      setFetchedEmail(null);
      setEmailNotFound(false);
      setBrokenPostImages(new Set());
      setPlatformEnrichments({});
      setPlatformEnrichmentLoading(new Set());
      userSelectedPlatformRef.current = false;
      setSidebarWidth(320);
      return;
    }

    // ── DIAGNOSTIC: log creator data sources on open ──
    console.log('MODAL PLATFORMS INPUT:', creator.socialPlatforms, creator.platforms);
    console.log('[DIAG] Creator opened:', creator.name, {
      platforms: creator.platforms,
      socialPlatforms: creator.socialPlatforms,
      followers: creator.followers,
    });

    const rawHandle = creator.username;
    const handle = typeof rawHandle === "string" ? rawHandle.replace(/^@/, "").trim() : "";
    if (!handle) {
      setEnriched(null);
      setError("No username available for this creator.");
      setEnrichmentLoading(false);
      return;
    }

    // Use cached enrichment from background enrichment if available,
    // but validate the data actually belongs to this creator.
    if (cachedEnrichment) {
      const cachedUsername = (cachedEnrichment.instagram?.username as string)?.toLowerCase();
      if (cachedUsername && cachedUsername !== handle.toLowerCase()) {
        console.warn("[Enrich] Cached enrichment username mismatch:", cachedUsername, "vs", handle, "— skipping cache");
        // Don't use mismatched cached data — fall through to fresh fetch
      } else {
        console.log("[Enrich] Using prop-cached enrichment for:", handle);
        setEnriched(cachedEnrichment);
        setEnrichmentLoading(false);
        setError(null);
        setEnrichmentSource("prop");
        return;
      }
    }

    console.log("[Enrich] useEffect fired, username:", handle);

    cancelledRef.current = false;

    // Cancel any in-flight request from a previous run (e.g. deps changed)
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const gen = ++generationRef.current;

    setError(null);
    setEnrichmentTimedOut(false);
    setEnrichmentLoading(true);

    const platform = "instagram";

    // Helper: fetch from IC API and update state
    const fetchFromApi = async (showLoading: boolean) => {
      if (showLoading) setEnrichmentLoading(true);
      console.log("[Enrich] Calling IC API for:", handle);
      const timeoutId = setTimeout(() => {
        console.log("[Enrich] TIMEOUT: Aborting after 45 seconds");
        controller.abort();
      }, 45000);

      try {
        const payload = await enrichCreatorProfile(handle, controller.signal, "instagram", true);
        clearTimeout(timeoutId);
        if (cancelledRef.current || generationRef.current !== gen) return;

        // Validate the returned profile belongs to the requested creator
        const returnedUsername = (payload?.instagram?.username as string)?.toLowerCase();
        if (returnedUsername && returnedUsername !== handle.toLowerCase()) {
          console.warn(`[Enrich] API returned profile for "${returnedUsername}" but requested "${handle}" — discarding`);
          if (showLoading) {
            setEnrichmentLoading(false);
            setEnriched(null);
            setError(null);
            setEnrichmentTimedOut(true);
          }
          return;
        }

        setEnrichmentLoading(false);
        setEnriched(payload);
        setError(null);
        setEnrichmentSource("api");

        // Save to Supabase cache for future lookups
        if (payload) {
          setEnrichCache(handle, platform, payload);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (cancelledRef.current || generationRef.current !== gen) return;
        if (showLoading) {
          setEnrichmentLoading(false);
          if ((err as Error)?.name === "AbortError") {
            setEnriched(null);
            setEnrichmentTimedOut(true);
            console.log("[Enrich] Request aborted (timeout or modal closed)");
          } else {
            console.error("[Enrich] Failed:", err);
            setEnriched(null);
            setEnrichmentTimedOut(true);
          }
        }
      }
    };

    // Check Supabase cache first, show instantly if available, then refresh in background
    (async () => {
      const cached = await getEnrichCache(handle, platform, creator?.name || undefined);
      if (cancelledRef.current || generationRef.current !== gen) return;

      if (cached) {
        console.log("[Enrich] Supabase cache hit for:", handle);
        setEnriched(cached);
        setEnrichmentLoading(false);
        setEnrichmentSource("cache");
        // Background refresh — don't show loading spinner, silently update data
        fetchFromApi(false);
        return;
      }

      // Cache miss — fetch from API with loading indicator
      await fetchFromApi(true);
    })();

    return () => {
      cancelledRef.current = true;
      controllerRef.current?.abort();
      controllerRef.current = null;
      // Do NOT set generationRef.current = 0 — it causes the winning request's .then to see gen !== ref and skip setEnriched (e.g. after Strict Mode first cleanup)
    };
  }, [open, creator?.id, creator?.username, username, cachedEnrichment]);

  // ── Multi-platform enrichment: fetch TikTok, YouTube, etc. data ──
  // After IG enrichment is done, enrich other platforms the creator has (RAW, 0.03 credits each).
  // Detects platforms from: creator card fields, enrichment result (creator_has, accounts, platform data keys).
  // Uses platform-specific handles from accounts array for accurate per-platform enrichment.
  useEffect(() => {
    if (!enriched || !open || !creator) return;
    const handle = (creator.username ?? "").replace(/^@/, "").trim();
    if (!handle) return;

    const rt = enriched.result ?? {};
    const detected = new Set<string>();
    const handleMap = new Map<string, string>(); // platform → platform-specific handle

    // 1. From creator card
    const cardPlats = creator.socialPlatforms ?? creator.platforms;
    if (Array.isArray(cardPlats)) {
      for (const p of cardPlats) { if (typeof p === "string") detected.add(p.toLowerCase()); }
    }

    // 2. From enrichment result.creator_has boolean flags
    const has = rt.creator_has as Record<string, boolean> | undefined;
    if (has && typeof has === "object") {
      for (const [k, v] of Object.entries(has)) {
        if (v) detected.add(k.toLowerCase());
      }
    }

    // 3. From enrichment result.accounts array — extract platform-specific handles
    const accounts = rt.accounts as { platform?: string; username?: string; handle?: string; url?: string }[] | undefined;
    if (Array.isArray(accounts)) {
      for (const acc of accounts) {
        const p = acc.platform?.toLowerCase();
        if (!p) continue;
        detected.add(p);
        const u = (acc.username || acc.handle || "").replace(/^@/, "").trim();
        if (u && !handleMap.has(p)) handleMap.set(p, u);
      }
    }

    // 4. From enrichment result.platform_links — extract handles from URLs
    const plinks = rt.platform_links as Record<string, string> | undefined;
    if (plinks && typeof plinks === "object") {
      for (const [k, url] of Object.entries(plinks)) {
        const p = k.toLowerCase();
        if (!url || typeof url !== "string") continue;
        detected.add(p);
        if (!handleMap.has(p)) {
          try {
            const path = new URL(url).pathname.replace(/\/$/, "");
            const seg = path.split("/").pop()?.replace(/^@/, "");
            if (seg) handleMap.set(p, seg);
          } catch { /* ignore invalid URLs */ }
        }
      }
    }

    // 5. From enrichment result platform data keys — use data directly if it has stats
    const KNOWN_PLATFORMS = ["tiktok", "youtube", "twitter", "facebook", "linkedin"];
    for (const p of KNOWN_PLATFORMS) {
      const platObj = (rt as Record<string, unknown>)[p];
      if (platObj && typeof platObj === "object") {
        detected.add(p);
        const pd = platObj as Record<string, unknown>;
        // Extract handle from existing platform data
        const u = ((pd.username ?? pd.handle ?? pd.custom_url) as string || "").replace(/^@/, "").trim();
        if (u && !handleMap.has(p)) handleMap.set(p, u);
        // If this platform data already has meaningful follower data, use it directly
        const followers = Number(pd.follower_count ?? pd.subscriber_count ?? 0);
        if (followers > 0 && !platformEnrichments[p]) {
          console.log(`[Enrich] Using existing result.${p} data directly: ${followers} followers`);
          setPlatformEnrichments(prev => ({ ...prev, [p]: pd }));
        }
      }
    }

    console.log("[Enrich] Multi-platform detection:", {
      detected: Array.from(detected),
      handleMap: Object.fromEntries(handleMap),
      creatorPlatforms: cardPlats,
      creator_has: has,
      accountsCount: Array.isArray(accounts) ? accounts.length : 0,
      resultKeys: Object.keys(rt).filter(k => KNOWN_PLATFORMS.includes(k)),
    });

    // Remove instagram and filter to only platforms we don't already have enrichments for
    detected.delete("instagram");
    const otherPlatforms = Array.from(detected).filter(p => !platformEnrichments[p]);
    if (otherPlatforms.length === 0) return;

    const controller = new AbortController();
    let cancelled = false;

    // Mark all platforms as loading
    setPlatformEnrichmentLoading(prev => {
      const next = new Set(prev);
      otherPlatforms.forEach(p => next.add(p));
      return next;
    });

    otherPlatforms.forEach(async (platform: string) => {
      if (cancelled) return;
      // Use platform-specific handle if available, otherwise fall back to IG handle
      const platHandle = handleMap.get(platform) || handle;
      console.log(`[Enrich] Multi-platform ${platform}: using handle "${platHandle}" (${platHandle === handle ? "same as IG" : "platform-specific"})`);
      try {
        const data = await enrichCreatorProfile(platHandle, controller.signal, platform, false);
        if (cancelled) return;
        if (data?.instagram && typeof data.instagram === "object") {
          const pd = data.instagram as Record<string, unknown>;
          const pdFollowers = Number(pd.follower_count ?? pd.subscriber_count ?? 0);
          const pdEngagement = Number(pd.engagement_percent ?? pd.engagement_rate ?? 0);
          const igFollowers = Number(igRecord?.follower_count ?? 0);

          console.log(`[Enrich] Multi-platform ${platform} enrichment:`, {
            handle: platHandle, pdFollowers, pdEngagement: pdEngagement.toFixed(2),
            igFollowers, keys: Object.keys(pd).length,
          });

          // Cross-contamination guard: skip ONLY if using same handle AND follower count matches IG exactly
          const isCrossContaminated = platHandle === handle
            && igFollowers > 100
            && pdFollowers === igFollowers;

          if (isCrossContaminated) {
            console.warn(`[Enrich] Multi-platform ${platform}: SKIPPING — same handle "${platHandle}" returned IG follower_count ${pdFollowers} (cross-contamination)`);
          } else {
            console.log(`[Enrich] Multi-platform ${platform}: ACCEPTED — followers=${pdFollowers}, engagement=${pdEngagement.toFixed(2)}`);
            setPlatformEnrichments(prev => ({ ...prev, [platform]: pd }));
          }
        } else {
          console.log(`[Enrich] Multi-platform ${platform}: enrichCreatorProfile returned ${data ? "no instagram field" : "null"}`);
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          console.warn(`[Enrich] Multi-platform ${platform} failed:`, err);
        }
      } finally {
        if (!cancelled) {
          setPlatformEnrichmentLoading(prev => {
            const next = new Set(prev);
            next.delete(platform);
            return next;
          });
        }
      }
    });

    return () => { cancelled = true; controller.abort(); setPlatformEnrichmentLoading(new Set()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enriched, open, creator?.id]);

  /** Two-level response: result (top-level) + result.instagram (ig) */
  const resultTop = enriched?.result ?? {};
  const ig = enriched?.instagram;

  const igRecord = ig && typeof ig === "object" ? (ig as Record<string, unknown>) : undefined;
  const reelsObj = igRecord?.reels as Record<string, unknown> | undefined;

  // Comprehensive enrichment debug logging
  useEffect(() => {
    if (!enriched) return;
    const handle = (creator?.username ?? "").replace(/^@/, "").toLowerCase();
    // Always dump full enrichment JSON so the user can inspect the actual API response structure
    console.log(`[Enrich] FULL ENRICHMENT JSON for @${handle}:`, JSON.stringify(enriched, null, 2));
    const rt = enriched.result ?? {};
    console.log("[Enrich] === FULL ENRICHMENT DEBUG ===");
    console.log("[Enrich] result keys:", Object.keys(rt));
    console.log("[Enrich] creator_has:", rt.creator_has);
    console.log("[Enrich] accounts:", rt.accounts);
    console.log("[Enrich] platform_links:", rt.platform_links);
    console.log("[Enrich] tiktok data:", rt.tiktok ? `YES (keys: ${Object.keys(rt.tiktok as object).length})` : "NONE");
    console.log("[Enrich] youtube data:", rt.youtube ? `YES (keys: ${Object.keys(rt.youtube as object).length})` : "NONE");
    console.log("[Enrich] twitter data:", rt.twitter ? `YES (keys: ${Object.keys(rt.twitter as object).length})` : "NONE");
    console.log("[Enrich] lookalikes:", Array.isArray(rt.lookalikes) ? `${(rt.lookalikes as unknown[]).length} accounts` : "NONE");
    if (rt.tiktok) console.log("[Enrich] TikTok sample:", { follower_count: (rt.tiktok as Record<string, unknown>).follower_count, engagement_percent: (rt.tiktok as Record<string, unknown>).engagement_percent });
    if (rt.youtube) console.log("[Enrich] YouTube sample:", { subscriber_count: (rt.youtube as Record<string, unknown>).subscriber_count, follower_count: (rt.youtube as Record<string, unknown>).follower_count, engagement_percent: (rt.youtube as Record<string, unknown>).engagement_percent });
    console.log("[Enrich] IG data:", {
      keys: igRecord ? Object.keys(igRecord).length : 0,
      media_count: igRecord?.media_count,
      post_data: Array.isArray(igRecord?.post_data) ? (igRecord!.post_data as unknown[]).length + " posts" : "none",
      follower_count: igRecord?.follower_count,
    });
    // Deep-log post data: find where IC hides posts and image URLs
    if (igRecord) {
      // Check every possible location for post arrays
      const postCandidates = ['post_data', 'recent_posts', 'posts', 'feed', 'media', 'top_posts', 'latest_posts'];
      for (const key of postCandidates) {
        const val = igRecord[key];
        if (Array.isArray(val) && val.length > 0) {
          console.log(`[Enrich] FOUND posts at igRecord.${key}: ${val.length} items`);
          const first = val[0] as Record<string, unknown>;
          console.log(`[Enrich] igRecord.${key}[0] ALL KEYS:`, Object.keys(first));
          console.log(`[Enrich] igRecord.${key}[0] FULL OBJECT:`, JSON.stringify(first, null, 2));
        }
      }
      // Also check user_profile sub-object
      const up = igRecord.user_profile as Record<string, unknown> | undefined;
      if (up && typeof up === 'object') {
        console.log("[Enrich] user_profile keys:", Object.keys(up));
        for (const key of postCandidates) {
          const val = up[key];
          if (Array.isArray(val) && val.length > 0) {
            console.log(`[Enrich] FOUND posts at user_profile.${key}: ${val.length} items`);
            const first = val[0] as Record<string, unknown>;
            console.log(`[Enrich] user_profile.${key}[0] ALL KEYS:`, Object.keys(first));
            console.log(`[Enrich] user_profile.${key}[0] FULL OBJECT:`, JSON.stringify(first, null, 2));
          }
        }
      }
      // Dump ALL igRecord top-level keys so we can spot any we missed
      console.log("[Enrich] ALL igRecord keys:", Object.keys(igRecord).sort());
    }
  }, [enriched, igRecord]);
  // Platform data: prefer multi-platform enrichment results, fall back to main enrichment result keys
  const tiktokData = platformEnrichments.tiktok ?? (resultTop as Record<string, unknown>).tiktok as Record<string, unknown> | undefined;
  const youtubeData = platformEnrichments.youtube ?? (resultTop as Record<string, unknown>).youtube as Record<string, unknown> | undefined;
  const twitterData = platformEnrichments.twitter ?? (resultTop as Record<string, unknown>).twitter as Record<string, unknown> | undefined;
  const facebookData = platformEnrichments.facebook ?? (resultTop as Record<string, unknown>).facebook as Record<string, unknown> | undefined;
  const linkedinData = platformEnrichments.linkedin ?? (resultTop as Record<string, unknown>).linkedin as Record<string, unknown> | undefined;

  // ── Auto-select platform with the most followers ──
  // Runs as platform enrichments arrive; stops once user manually picks a platform.
  useEffect(() => {
    if (userSelectedPlatformRef.current) return;
    if (!enriched) return;

    const candidates: [string, number][] = [];
    if (igRecord) candidates.push(["instagram", Number(igRecord.follower_count ?? 0)]);
    if (tiktokData) candidates.push(["tiktok", Number(tiktokData.follower_count ?? 0)]);
    if (youtubeData) candidates.push(["youtube", Number(youtubeData.subscriber_count ?? youtubeData.follower_count ?? 0)]);
    if (twitterData) candidates.push(["twitter", Number(twitterData.follower_count ?? 0)]);
    if (facebookData) candidates.push(["facebook", Number(facebookData.follower_count ?? facebookData.page_likes ?? 0)]);
    if (linkedinData) candidates.push(["linkedin", Number(linkedinData.follower_count ?? linkedinData.connections ?? 0)]);

    if (candidates.length > 0) {
      const best = candidates.reduce((a, b) => (b[1] > a[1] ? b : a));
      if (best[1] > 0 && best[0] !== selectedPlatform) {
        setSelectedPlatform(best[0]);
      }
    }
  }, [enriched, igRecord, tiktokData, youtubeData, twitterData, facebookData, linkedinData, selectedPlatform]);

  /** Merge platforms from all possible IC response shapes + creator card */
  const { availablePlatforms, platformHandles } = useMemo(() => {
    const handles = new Map<string, string>(); // platform → username
    const found = new Set<string>();

    // 1. creator_has boolean flags (most common in FULL enrichment)
    const has = resultTop.creator_has as Record<string, boolean> | undefined;
    if (has && typeof has === "object") {
      for (const [k, v] of Object.entries(has)) {
        if (v) found.add(k.toLowerCase());
      }
    }

    // 2. accounts array: [{ platform: "instagram", username: "..." }, ...]
    const accounts = (resultTop.accounts ?? (enriched as Record<string, unknown> | null)?.accounts) as { platform?: string; username?: string; handle?: string }[] | undefined;
    if (Array.isArray(accounts)) {
      for (const acc of accounts) {
        const p = acc.platform?.toLowerCase();
        if (!p) continue;
        found.add(p);
        const u = acc.username || acc.handle;
        if (u && !handles.has(p)) handles.set(p, u.replace(/^@/, ""));
      }
    }

    // 3. platform_links: { instagram: "url", tiktok: "url" }
    const plinks = (resultTop.platform_links ?? (enriched as Record<string, unknown> | null)?.platform_links) as Record<string, string> | undefined;
    if (plinks && typeof plinks === "object") {
      for (const [k, url] of Object.entries(plinks)) {
        const p = k.toLowerCase();
        if (!url) continue;
        found.add(p);
        if (!handles.has(p)) {
          try { const path = new URL(url).pathname.replace(/\/$/, ""); const seg = path.split("/").pop()?.replace(/^@/, ""); if (seg) handles.set(p, seg); } catch {}
        }
      }
    }

    // 4. Per-platform data objects (enrichment result keys)
    if (tiktokData) { found.add("tiktok"); if (!handles.has("tiktok") && tiktokData.username) handles.set("tiktok", String(tiktokData.username).replace(/^@/, "")); }
    if (youtubeData) { found.add("youtube"); if (!handles.has("youtube")) { const u = (youtubeData.custom_url as string) ?? (youtubeData.username as string); if (u) handles.set("youtube", u.replace(/^@/, "")); } }
    if (twitterData) { found.add("twitter"); if (!handles.has("twitter") && twitterData.username) handles.set("twitter", String(twitterData.username).replace(/^@/, "")); }
    if (facebookData) { found.add("facebook"); if (!handles.has("facebook") && facebookData.username) handles.set("facebook", String(facebookData.username).replace(/^@/, "")); }
    if (linkedinData) { found.add("linkedin"); if (!handles.has("linkedin") && linkedinData.username) handles.set("linkedin", String(linkedinData.username).replace(/^@/, "")); }
    if (ig) found.add("instagram");

    // 5. creator.socialPlatforms / creator.platforms from the card
    const cardPlatforms = creator?.socialPlatforms ?? creator?.platforms;
    if (Array.isArray(cardPlatforms)) {
      for (const p of cardPlatforms) { if (typeof p === "string") found.add(p.toLowerCase()); }
    }

    // Extract IG handle
    if (found.has("instagram") && !handles.has("instagram")) {
      const igU = (igRecord?.username as string) ?? (resultTop.username as string) ?? creator?.username;
      if (igU) handles.set("instagram", igU.replace(/^@/, ""));
    }

    // Fallback: always include at least instagram
    if (found.size === 0) found.add("instagram");

    const ordered = PLATFORM_ORDER.filter((p) => found.has(p));
    found.forEach((p) => { if (!ordered.includes(p)) ordered.push(p); });
    return { availablePlatforms: ordered, platformHandles: handles };
  }, [resultTop.creator_has, resultTop.accounts, resultTop.platform_links, resultTop.username, enriched, tiktokData, youtubeData, twitterData, facebookData, linkedinData, ig, igRecord, creator?.socialPlatforms, creator?.platforms, creator?.username]);

  const listCreator: ListCreator | null = creator
    ? {
        id: creator.id,
        name: creator.name,
        username: creator.username,
        avatar: creator.avatar,
        followers: creator.followers,
        engagementRate: creator.engagementRate,
        platforms: creator.platforms,
        bio: creator.bio,
        location: creator.location,
      }
    : null;

  const addedToList = listCreator ? isCreatorInList(listCreator.id) : false;

  const doApproveForDirectory = async (directoryId?: string) => {
    if (!creator) return null;
    const igData = ig as Record<string, unknown> | undefined;
    // Resolve the best avatar: enrichment first, then search-API avatar
    let resolvedAvatar = extractAvatarFromEnrichment(enriched) ?? creator.avatar ?? null;
    // Never save ui-avatars fallback URLs — they're generic placeholders, not real photos
    if (resolvedAvatar && resolvedAvatar.includes("ui-avatars.com")) resolvedAvatar = null;
    // Force https:// on the resolved Influencers.club image URL
    if (resolvedAvatar) resolvedAvatar = resolvedAvatar.replace(/^http:\/\//i, "https://");
    const bioText = (igData?.biography as string) ?? creator.bio ?? "";
    const branch = detectBranch(bioText);
    const socialPlatforms = creator.socialPlatforms ?? [];
    // Extract banner image from enrichment data
    const bannerUrl = extractBannerImage(enriched) ?? null;

    const { error: err } = await approveForDirectory({
      handle: creator.username ?? creator.id,
      display_name: creator.name,
      platform: creator.platforms?.[0] ?? "instagram",
      avatar_url: resolvedAvatar || null,
      follower_count: creator.followers ?? null,
      engagement_rate: creator.engagementRate ?? null,
      bio: bioText || null,
      branch,
      status: "veteran",
      platforms: socialPlatforms.length > 0 ? socialPlatforms : creator.platforms,
      category: creator.category ?? null,
      ic_avatar_url: resolvedAvatar || null,
      enrichment_data: enriched || null,
      added_by: user?.id ?? null,
      directory_id: directoryId || null,
      banner_image_url: bannerUrl,
    });
    return err;
  };

  const handleConfirmAddToLists = () => {
    if (!listCreator || selectedListIds.size === 0) return;
    for (const listId of selectedListIds) {
      addCreatorToList(listId, listCreator);
    }
    onAddToList?.(listCreator);
    toast.success(`Added to ${selectedListIds.size} list${selectedListIds.size !== 1 ? "s" : ""}`);
    setSelectedListIds(new Set());
    setListDropdownOpen(false);
  };

  const handleOpenCreateListModal = () => {
    setCreateListModalOpen(true);
  };

  const handleCreateListAndAdd = (name: string) => {
    if (!listCreator) return;
    const newId = createList(name);
    addCreatorToList(newId, listCreator);
    onAddToList?.(listCreator);
    toast.success(`Added ${listCreator.name} to ${name}`);
    setCreateListModalOpen(false);
  };

  const handleStandaloneApprove = async (directoryId?: string) => {
    setApprovingDir(true);
    const err = await doApproveForDirectory(directoryId);
    setApprovingDir(false);
    if (err) {
      toast.error(`Failed to add to directory: ${err}`);
    } else {
      const dirName = directoriesList.find((d) => d.id === directoryId)?.name ?? "directory";
      toast.success(`${creator?.name} added to ${dirName}`);
    }
    setDirDropdownOpen(false);
  };

  const handleInlineCreateList = () => {
    if (!newListName.trim()) return;
    const newId = createList(newListName.trim());
    setSelectedListIds((prev) => new Set(prev).add(newId));
    setNewListName("");
    setShowNewListInput(false);
  };

  const handleInlineCreateDir = async () => {
    if (!newDirName.trim() || !user) return;
    const { data, error: err } = await supabase
      .from("directories")
      .insert({ name: newDirName.trim(), user_id: user.id } as Record<string, unknown>)
      .select("id, name")
      .single();
    if (err || !data) {
      toast.error("Failed to create directory");
      return;
    }
    setDirectoriesList((prev) => [...prev, data as { id: string; name: string }]);
    await handleStandaloneApprove((data as { id: string; name: string }).id);
    setNewDirName("");
    setShowNewDirInput(false);
  };

  // Track which events this creator is already a speaker for
  const [speakerEventIds, setSpeakerEventIds] = useState<Set<string>>(new Set());

  // Fetch existing speaker assignments when event dropdown opens
  useEffect(() => {
    if (!eventDropdownOpen || !creator) return;
    (async () => {
      const { data } = await supabase
        .from("event_speakers")
        .select("event_id")
        .eq("creator_name", creator.name);
      if (data) setSpeakerEventIds(new Set(data.map((r: { event_id: string }) => r.event_id)));
    })();
  }, [eventDropdownOpen, creator?.name]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) setSpeakerEventIds(new Set());
  }, [open]);

  const handleInviteToEvent = async (eventId: string, eventTitle: string) => {
    if (!creator) return;
    // Prevent duplicate
    if (speakerEventIds.has(eventId)) {
      toast.warning(`${creator.name} is already added as a speaker for this event`);
      return;
    }
    setInvitingEvent(true);
    try {
      // Double-check server-side to prevent race conditions
      const { data: existing } = await supabase
        .from("event_speakers")
        .select("id")
        .eq("event_id", eventId)
        .eq("creator_name", creator.name)
        .limit(1);
      if (existing && existing.length > 0) {
        toast.warning(`${creator.name} is already added as a speaker for this event`);
        setSpeakerEventIds(prev => new Set(prev).add(eventId));
        setInvitingEvent(false);
        return;
      }
      // Get current speaker count for sort order
      const { count } = await supabase
        .from("event_speakers")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId);
      const { error: err } = await supabase.from("event_speakers").insert({
        event_id: eventId,
        creator_name: creator.name,
        avatar_url: extractAvatarFromEnrichment(enriched) ?? creator.avatar ?? null,
        bio: creator.bio || null,
        role: "presenter",
        sort_order: (count ?? 0),
        confirmed: false,
        added_by: user?.id ?? null,
      } as Record<string, unknown>);
      if (err) {
        if (err.code === "23505") {
          toast.warning(`${creator.name} is already added as a speaker for this event`);
          setSpeakerEventIds(prev => new Set(prev).add(eventId));
          setInvitingEvent(false);
          return;
        }
        throw err;
      }
      toast.success(`Invited ${creator.name} to ${eventTitle}`);
      setSpeakerEventIds(prev => new Set(prev).add(eventId));
      setEventDropdownOpen(false);
    } catch {
      toast.error("Failed to invite to event");
    } finally {
      setInvitingEvent(false);
    }
  };

  useEffect(() => {
    if (enriched && ig) {
      const igObj = ig as Record<string, unknown>;
      const posts = Array.isArray(igObj.post_data) ? igObj.post_data as unknown[] : [];
      console.log("[CreatorProfileModal] IG data:", {
        keys: Object.keys(igObj).sort(),
        media_count: igObj.media_count,
        post_data_count: posts.length,
        has_direct_analytics: !!(igObj.avg_likes || igObj.avg_like_count),
        computed_from_posts: posts.length > 0 ? "yes" : "no",
      });
    }
  }, [enriched, ig]);
  // growthObj and incomeObj are computed per-platform in the analytics useMemo below

  const displayUsername =
    (igRecord?.username as string) ?? (resultTop.username as string) ?? creator?.username ?? username ?? "";
  const displayName =
    (igRecord?.full_name as string) ?? (resultTop.first_name as string) ?? creator?.name ?? displayUsername ?? "—";
  // Avatar: getCreatorAvatar (all fields) → enrichment → cached working URL
  const enrichedAvatarUrl = safeImageUrl(extractAvatarFromEnrichment(enriched));
  const creatorPrimary = getCreatorAvatar(creator) || safeImageUrl(creator?.avatar);
  const cachedWorkingUrl = goodAvatarCache.get(displayUsername || creator?.username || "") || null;
  const modalAvatarInitial = creatorPrimary ?? enrichedAvatarUrl ?? cachedWorkingUrl ?? null;
  const [modalAvatarSrc, setModalAvatarSrc] = useState<string | null>(modalAvatarInitial);
  // Reset when the modal opens for a different creator or enrichment arrives
  const prevModalAvatar = useRef(modalAvatarInitial);
  useEffect(() => {
    if (modalAvatarInitial !== prevModalAvatar.current) {
      prevModalAvatar.current = modalAvatarInitial;
      setModalAvatarSrc(modalAvatarInitial);
    }
  }, [modalAvatarInitial]);
  const detectedBranch = useMemo(() => {
    const bioText = (igRecord?.biography as string) ?? creator?.bio ?? "";
    return creator?.branch || detectBranch(bioText);
  }, [igRecord, creator?.bio, creator?.branch]);

  // ── Resolve the active platform data record ──
  // Used by stats, charts, hashtags, audience analytics — single source of truth.
  // MUST be declared before any useMemo that references it (bio, stats, etc.)
  // Deps include platformEnrichments + enriched so it re-evaluates when data arrives.
  const activePlatformRecord = useMemo((): Record<string, unknown> | undefined => {
    // Re-derive from current state each time deps change
    const _resultTop = enriched?.result ?? {};
    const _ig = enriched?.instagram;
    const _igRec = _ig && typeof _ig === "object" ? (_ig as Record<string, unknown>) : undefined;

    const platMap: Record<string, Record<string, unknown> | undefined> = {
      instagram: _igRec,
      tiktok: platformEnrichments.tiktok ?? (_resultTop as Record<string, unknown>).tiktok as Record<string, unknown> | undefined,
      youtube: platformEnrichments.youtube ?? (_resultTop as Record<string, unknown>).youtube as Record<string, unknown> | undefined,
      twitter: platformEnrichments.twitter ?? (_resultTop as Record<string, unknown>).twitter as Record<string, unknown> | undefined,
      facebook: platformEnrichments.facebook ?? (_resultTop as Record<string, unknown>).facebook as Record<string, unknown> | undefined,
      linkedin: platformEnrichments.linkedin ?? (_resultTop as Record<string, unknown>).linkedin as Record<string, unknown> | undefined,
    };

    // No IG fallback — when a non-IG platform has no data yet, return undefined
    // so the sidebar shows "—" instead of misleading Instagram numbers.
    const chosen = platMap[selectedPlatform];

    console.log(`[activePlatformRecord] selectedPlatform="${selectedPlatform}"`,
      "→ record:", chosen ? `YES (${Object.keys(chosen).length} keys, follower_count=${chosen.follower_count}, subscriber_count=${chosen.subscriber_count})` : "undefined (no data for this platform)",
      "| sources:", {
        fromEnrichments: !!platformEnrichments[selectedPlatform],
        fromResultTop: !!((_resultTop as Record<string, unknown>)[selectedPlatform]),
      });

    return chosen;
  }, [selectedPlatform, platformEnrichments, enriched]);

  const bio = useMemo(() => {
    const rec = activePlatformRecord;
    if (rec) {
      const b = (rec.biography as string) ?? (rec.bio as string) ?? (rec.description as string);
      if (b) return b;
    }
    return creator?.bio ?? "";
  }, [activePlatformRecord, creator?.bio]);
  const location =
    (igRecord?.location as string) ??
    (igRecord?.country as string) ??
    (Array.isArray(igRecord?.locations) && igRecord.locations?.length ? String(igRecord.locations[0]) : null) ??
    (resultTop.location as string) ??
    creator?.location ??
    "";
  const languageCode = Array.isArray(igRecord?.language_code) && igRecord.language_code?.length ? String(igRecord.language_code[0]) : (resultTop.speaking_language as string) ?? "";
  const language = languageCode === "en" ? "English" : languageCode || "";
  const enrichedEmail = useMemo(() => {
    const e = resultTop.email as string | undefined;
    if (e) return e;
    const emails = resultTop.emails as string[] | undefined;
    if (Array.isArray(emails) && emails.length > 0) return emails[0];
    const igEmail = igRecord?.public_email as string | undefined;
    if (igEmail) return igEmail;
    return null;
  }, [resultTop.email, resultTop.emails, igRecord?.public_email]);

  const nicheClass = igRecord?.niche_class as string[] | undefined;
  const category =
    (igRecord?.category as string) ?? (Array.isArray(nicheClass) && nicheClass.length ? nicheClass.join(", ") : "") ?? "";
  const isVerified = Boolean(igRecord?.is_verified);

  // True when multi-platform enrichment is still fetching data for the selected platform
  const isPlatformStillLoading = selectedPlatform !== "instagram" && platformEnrichmentLoading.has(selectedPlatform);

  const { followers, engagement, mediaCount, postsPerMonth, avgLikes, avgComments, avgSpecial, avgViews, totalLikes } = useMemo(() => {
    const metrics = getMetricsForPlatform(activePlatformRecord, selectedPlatform, creator);
    console.log(`[PlatformStats] ${selectedPlatform} result:`, metrics,
      "record keys:", activePlatformRecord ? Object.keys(activePlatformRecord).length : 0,
      "post_data:", Array.isArray(activePlatformRecord?.post_data) ? (activePlatformRecord!.post_data as unknown[]).length : "none");
    return metrics;
  }, [activePlatformRecord, selectedPlatform, creator]);

  const statLabels = useMemo(() => {
    switch (selectedPlatform) {
      case "youtube":
        return { followers: "Subscribers", mediaCount: "Videos", postsPerMonth: "Videos per Month", avgSpecial: "Avg Short Plays", avgLikes: "Average Likes", avgComments: "Average Comments", avgViews: "Average Views" };
      case "tiktok":
        return { followers: "Followers", mediaCount: "Videos", postsPerMonth: "Videos per Month", avgSpecial: "Average Shares", avgLikes: "Average Likes", avgComments: "Average Comments", avgViews: "Average Views" };
      case "twitter":
        return { followers: "Followers", mediaCount: "Tweets", postsPerMonth: "Tweets per Month", avgSpecial: "Average Retweets", avgLikes: "Average Likes", avgComments: "Average Comments", avgViews: "Average Views" };
      default:
        return { followers: "Followers", mediaCount: "Number of Posts", postsPerMonth: "Posts per Month", avgSpecial: "Average Reel Likes", avgLikes: "Average Likes", avgComments: "Average Comments", avgViews: "Average Views" };
    }
  }, [selectedPlatform]);

  const platformHashtags = useMemo(() => {
    if (!activePlatformRecord) return [];
    const raw = activePlatformRecord.hashtags ?? activePlatformRecord.frequently_used_hashtags ?? activePlatformRecord.top_hashtags ?? activePlatformRecord.popular_hashtags ?? activePlatformRecord.tags;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 10).map((t: unknown) => {
      if (typeof t === "string") return t.replace(/^#/, "");
      if (t && typeof t === "object" && "name" in t) return String((t as { name: string }).name).replace(/^#/, "");
      return String(t);
    });
  }, [activePlatformRecord]);

  const postEngagementData = useMemo(() => {
    const raw = activePlatformRecord?.post_data;
    if (!Array.isArray(raw) || followers <= 0) return [];
    return raw.slice(0, 12).map((item: Record<string, unknown>, i: number) => {
      // Handle both nested engagement object and flat fields (TikTok/YouTube use flat)
      const eng = (item.engagement && typeof item.engagement === "object") ? item.engagement as Record<string, unknown> : item;
      const likes = Number(eng.likes ?? eng.like_count ?? eng.digg_count ?? 0);
      const comments = Number(eng.comments ?? eng.comment_count ?? 0);
      const er = ((likes + comments) / followers) * 100;
      return { post: `P${i + 1}`, er: Number(er.toFixed(2)) };
    });
  }, [activePlatformRecord, followers]);

  const [growthTimeRange, setGrowthTimeRange] = useState<"12" | "6" | "3">("12");

  const { incomeMin, incomeMax, income, followerGrowth, growthData, reelsPct, engagementDistro } = useMemo(() => {
    const platRecord = activePlatformRecord;

    const incObj = platRecord?.income as Record<string, unknown> | undefined;
    const iMin = incObj && typeof incObj === "object" ? (Number(incObj.min ?? 0) || undefined) : undefined;
    const iMax = incObj && typeof incObj === "object" ? (Number(incObj.max ?? 0) || undefined) : undefined;

    const growthRec = platRecord?.creator_follower_growth as Record<string, unknown> | undefined;
    const fGrowth = growthRec && typeof growthRec === "object"
      ? [
          growthRec["3_months_ago"] != null && `${Number(growthRec["3_months_ago"]).toFixed(2)}% (3mo)`,
          growthRec["6_months_ago"] != null && `${Number(growthRec["6_months_ago"]).toFixed(2)}% (6mo)`,
          growthRec["12_months_ago"] != null && `${Number(growthRec["12_months_ago"]).toFixed(2)}% (12mo)`,
        ]
          .filter(Boolean)
          .join(", ")
      : "";

    const rPct = selectedPlatform === "instagram"
      ? Number(igRecord?.reels_percentage_last_12_posts ?? 0)
      : 0;

    const gData: { period: string; growth: number; months: number }[] = [];
    if (growthRec && typeof growthRec === "object") {
      if (growthRec["12_months_ago"] != null) gData.push({ period: "12mo ago", growth: Number(growthRec["12_months_ago"]), months: 12 });
      if (growthRec["6_months_ago"] != null) gData.push({ period: "6mo ago", growth: Number(growthRec["6_months_ago"]), months: 6 });
      if (growthRec["3_months_ago"] != null) gData.push({ period: "3mo ago", growth: Number(growthRec["3_months_ago"]), months: 3 });
    }

    // Engagement distribution for income fallback (pie chart)
    const eDistro: { name: string; value: number; fill: string }[] = [];
    if (avgLikes > 0 || avgComments > 0 || avgViews > 0) {
      if (avgLikes > 0) eDistro.push({ name: "Avg Likes", value: Math.round(avgLikes), fill: "#ef4444" });
      if (avgComments > 0) eDistro.push({ name: "Avg Comments", value: Math.round(avgComments), fill: "#3b82f6" });
      if (avgViews > 0) eDistro.push({ name: "Avg Views", value: Math.round(avgViews), fill: "#8b5cf6" });
    }

    return {
      incomeMin: iMin,
      incomeMax: iMax,
      income: formatIncome(iMin, iMax),
      followerGrowth: fGrowth,
      growthData: gData,
      reelsPct: rPct,
      engagementDistro: eDistro,
    };
  }, [activePlatformRecord, selectedPlatform, igRecord, avgLikes, avgComments, avgViews]);

  const showEnrichmentLoading = enrichmentLoading && !enrichmentTimedOut;
  const showPlatformLoading = isPlatformStillLoading;
  const engagementDisplay = engagement != null && engagement > 0 ? engagement : null;
  const hasDataForPlatform = !!activePlatformRecord;


  const similarAccounts: SimilarAccount[] = useMemo(() => {
    // Try multiple field names for lookalike/similar data
    const raw = resultTop.lookalikes ?? resultTop.similar_accounts ?? resultTop.similar_users ?? resultTop.related_accounts;
    if (!Array.isArray(raw)) {
      console.log("[Similar] No similar accounts found. Tried: lookalikes, similar_accounts, similar_users, related_accounts. Available result keys:", Object.keys(resultTop));
      return [];
    }
    console.log("[Similar] Found", raw.length, "similar accounts. First item keys:", raw[0] ? Object.keys(raw[0]) : "empty");
    if (raw[0]) {
      const first = raw[0] as Record<string, unknown>;
      console.log("[Similar] First item FULL data:", JSON.stringify(first, null, 2).slice(0, 3000));
    }
    return raw.slice(0, 12).map((item: Record<string, unknown>) => {
      // IC API nests creator data inside item.profile, item.user_profile, or item.user
      const prof = (item.profile && typeof item.profile === "object") ? item.profile as Record<string, unknown> : undefined;
      const userProfile = (item.user_profile && typeof item.user_profile === "object") ? item.user_profile as Record<string, unknown> : undefined;
      const userObj = (item.user && typeof item.user === "object") ? item.user as Record<string, unknown> : undefined;
      const resolveAvatar = (): string | undefined => {
        const AVATAR_KEYS = [
          "picture", "profile_picture", "profile_picture_hd", "profile_pic_url",
          "profile_pic_url_hd", "avatar", "avatar_url", "picture_url",
          "image", "thumbnail", "photo", "image_url", "profile_image_url",
        ];
        // Check top-level item, then nested profile/user_profile/user objects
        for (const src of [item, prof, userProfile, userObj]) {
          if (!src) continue;
          for (const key of AVATAR_KEYS) {
            const v = src[key];
            if (typeof v === "string" && v.startsWith("http")) return v;
          }
        }
        return undefined;
      };
      const username = (item.username ?? prof?.username ?? userProfile?.username ?? userObj?.username ?? item.handle) as string | undefined;
      return {
        id: String(username ?? item.id ?? Math.random()),
        username,
        name: (item.full_name ?? prof?.full_name ?? userProfile?.full_name ?? userObj?.full_name ?? item.name ?? prof?.name ?? username) as string | undefined,
        full_name: (item.full_name ?? prof?.full_name ?? userProfile?.full_name ?? item.name ?? prof?.name) as string | undefined,
        avatar: resolveAvatar(),
        picture: (item.picture ?? prof?.picture ?? userProfile?.picture ?? userObj?.picture) as string | undefined,
        followers: Number(item.follower_count ?? prof?.follower_count ?? userProfile?.follower_count ?? item.followers ?? prof?.number_of_followers ?? item.subscriber_count ?? 0),
        follower_count: Number(item.follower_count ?? prof?.follower_count ?? userProfile?.follower_count ?? item.followers ?? 0),
        engagement_percent: Number(item.engagement_percent ?? prof?.engagement_percent ?? userProfile?.engagement_percent ?? item.engagement_rate ?? prof?.engagement_rate ?? 0),
        profile_url: (item.profile_url ?? item.url ?? prof?.profile_url) as string | undefined,
        similarity: Number(item.similarity ?? item.similarity_score ?? item.relevance_score ?? item.match_score ?? item.score ?? 0),
      };
    });
  }, [resultTop.lookalikes, resultTop.similar_accounts, resultTop.similar_users, resultTop.related_accounts]);

  // Fetch avatars for similar accounts via lightweight RAW enrich calls
  useEffect(() => {
    if (similarAccounts.length === 0) return;
    // Only fetch for accounts that don't already have an avatar
    const needAvatars = similarAccounts.filter(a => !a.avatar && !a.picture && a.username && !similarAvatars[a.username]);
    if (needAvatars.length === 0) return;
    let cancelled = false;
    (async () => {
      // Fetch in batches of 5 to avoid hammering the API
      const results: Record<string, string> = {};
      for (let i = 0; i < needAvatars.length; i += 5) {
        if (cancelled) break;
        const batch = needAvatars.slice(i, i + 5);
        const promises = batch.map(async (acc) => {
          try {
            const data = await enrichCreatorProfile(acc.username!, undefined, "instagram", false);
            const ig = data?.instagram;
            if (ig && typeof ig === "object") {
              const pic = (ig as Record<string, unknown>).profile_picture_hd ?? (ig as Record<string, unknown>).profile_picture ?? (ig as Record<string, unknown>).picture;
              if (typeof pic === "string" && pic.startsWith("http")) {
                results[acc.username!] = pic;
              }
            }
          } catch {
            // Silently skip failed enrichments
          }
        });
        await Promise.all(promises);
      }
      if (!cancelled && Object.keys(results).length > 0) {
        setSimilarAvatars(prev => ({ ...prev, ...results }));
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [similarAccounts.length]);

  // ── Fetch campaigns for this creator ──
  useEffect(() => {
    if (!open || !creator) return;
    setCampaignsLoading(true);
    const handle = creator.username ?? creator.name;
    supabase
      .from("cadence_campaigns")
      .select("*")
      .or(`created_for_name.ilike.%${handle}%`)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setCreatorCampaigns(data ?? []);
        setCampaignsLoading(false);
      })
      .catch(() => setCampaignsLoading(false));
  }, [open, creator?.username, creator?.name]);

  // ── Audience data hooks — use platform-specific data when available ──

  // Helper: resolve the active platform's data record for audience stats
  // Alias for audience analytics — reuse the shared activePlatformRecord
  const activePlatRecord = activePlatformRecord;

  const audienceGender = useMemo(() => {
    const rec = activePlatRecord;
    const raw = rec?.audience_gender ?? rec?.audience_genders ?? rec?.gender_split;
    if (!raw) return null;
    if (typeof raw === "object" && !Array.isArray(raw)) {
      const obj = raw as Record<string, number>;
      const male = Number(obj.male ?? obj.MALE ?? 0);
      const female = Number(obj.female ?? obj.FEMALE ?? 0);
      if (male === 0 && female === 0) return null;
      return { male, female };
    }
    if (Array.isArray(raw)) {
      let male = 0, female = 0;
      for (const item of raw) {
        const o = item as Record<string, unknown>;
        const code = String(o.code ?? o.gender ?? o.name ?? "").toLowerCase();
        const weight = Number(o.weight ?? o.value ?? o.percentage ?? 0);
        const pct = weight > 1 ? weight : weight * 100;
        if (code === "male") male = pct;
        if (code === "female") female = pct;
      }
      if (male === 0 && female === 0) return null;
      return { male, female };
    }
    return null;
  }, [activePlatRecord]);

  const audienceAge = useMemo(() => {
    const rec = activePlatRecord;
    const raw = rec?.audience_age ?? rec?.audience_ages ?? rec?.age_split;
    if (!Array.isArray(raw)) return [];
    return raw.map((item: Record<string, unknown>) => ({
      bracket: String(item.code ?? item.range ?? item.age_range ?? item.name ?? ""),
      percentage: (() => {
        const w = Number(item.weight ?? item.value ?? item.percentage ?? 0);
        return w > 1 ? w : w * 100;
      })(),
    })).filter((a: { bracket: string; percentage: number }) => a.bracket && a.percentage > 0)
      .sort((a: { percentage: number }, b: { percentage: number }) => b.percentage - a.percentage);
  }, [activePlatRecord]);

  const audienceReachability = useMemo(() => {
    const rec = activePlatRecord;
    const raw = rec?.audience_reachability ?? rec?.audience_reach;
    if (!Array.isArray(raw)) return [];
    return raw.map((item: Record<string, unknown>) => ({
      label: String(item.code ?? item.name ?? item.label ?? ""),
      percentage: (() => {
        const w = Number(item.weight ?? item.value ?? item.percentage ?? 0);
        return w > 1 ? w : w * 100;
      })(),
    })).filter((a: { label: string; percentage: number }) => a.label && a.percentage > 0);
  }, [activePlatRecord]);

  const audienceLanguages = useMemo(() => {
    const rec = activePlatRecord;
    const raw = rec?.audience_languages ?? rec?.audience_language;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 8).map((item: Record<string, unknown>) => ({
      language: String(item.code ?? item.name ?? item.language ?? ""),
      percentage: (() => {
        const w = Number(item.weight ?? item.value ?? item.percentage ?? 0);
        return w > 1 ? w : w * 100;
      })(),
    })).filter((a: { language: string; percentage: number }) => a.language && a.percentage > 0)
      .sort((a: { percentage: number }, b: { percentage: number }) => b.percentage - a.percentage);
  }, [activePlatRecord]);

  const audienceCredibility = useMemo(() => {
    const rec = activePlatRecord;
    const raw = rec?.audience_credibility ?? rec?.credibility_score ?? rec?.audience_quality;
    if (raw == null) return null;
    const score = Number(raw);
    if (!isFinite(score)) return null;
    const level = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
    return { score, level };
  }, [activePlatRecord]);

  const audienceBrandAffinity = useMemo(() => {
    const rec = activePlatRecord;
    const raw = rec?.audience_brand_affinity ?? rec?.brand_affinity;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 10).map((item: Record<string, unknown>) => ({
      name: String(item.name ?? item.brand ?? item.label ?? ""),
      percentage: (() => {
        const w = Number(item.weight ?? item.value ?? item.percentage ?? 0);
        return w > 1 ? w : w * 100;
      })(),
    })).filter((a: { name: string; percentage: number }) => a.name && a.percentage > 0);
  }, [activePlatRecord]);

  const audienceInterests = useMemo(() => {
    const rec = activePlatRecord;
    const raw = rec?.audience_interests ?? rec?.interests;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 12).map((item: unknown) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") return String((item as Record<string, unknown>).name ?? (item as Record<string, unknown>).label ?? (item as Record<string, unknown>).interest ?? "");
      return "";
    }).filter(Boolean);
  }, [activePlatRecord]);

  const crossPlatformSummary = useMemo(() => {
    const platformStats: { platform: string; followers: number; engagement: number }[] = [];
    if (igRecord) {
      platformStats.push({ platform: "Instagram", followers: Number(igRecord.follower_count ?? 0), engagement: Number(igRecord.engagement_percent ?? igRecord.engagement_rate ?? 0) });
    }
    if (tiktokData) {
      platformStats.push({ platform: "TikTok", followers: Number(tiktokData.follower_count ?? 0), engagement: Number(tiktokData.engagement_percent ?? tiktokData.engagement_rate ?? 0) });
    }
    if (youtubeData) {
      platformStats.push({ platform: "YouTube", followers: Number(youtubeData.subscriber_count ?? youtubeData.follower_count ?? 0), engagement: Number(youtubeData.engagement_percent ?? youtubeData.engagement_rate ?? 0) });
    }
    if (twitterData) {
      platformStats.push({ platform: "X", followers: Number(twitterData.follower_count ?? 0), engagement: Number(twitterData.engagement_percent ?? twitterData.engagement_rate ?? 0) });
    }
    if (facebookData) {
      platformStats.push({ platform: "Facebook", followers: Number(facebookData.follower_count ?? facebookData.page_likes ?? 0), engagement: Number(facebookData.engagement_percent ?? facebookData.engagement_rate ?? 0) });
    }
    if (linkedinData) {
      platformStats.push({ platform: "LinkedIn", followers: Number(linkedinData.follower_count ?? linkedinData.connections ?? 0), engagement: Number(linkedinData.engagement_percent ?? linkedinData.engagement_rate ?? 0) });
    }
    const totalReach = platformStats.reduce((s, p) => s + p.followers, 0);
    const mostEngaged = platformStats.length > 0 ? platformStats.reduce((best, p) => p.engagement > best.engagement ? p : best) : null;
    const avgEngagement = platformStats.length > 0 ? platformStats.reduce((s, p) => s + p.engagement, 0) / platformStats.length : 0;
    return { totalReach, mostEngaged, avgEngagement, platforms: platformStats };
  }, [igRecord, tiktokData, youtubeData, twitterData, facebookData, linkedinData]);

  const filteredPosts = useMemo(() => {
    const platRecord = activePlatformRecord;
    // IC puts posts in various fields — try them all
    const raw = (() => {
      if (!platRecord) return undefined;
      const POST_KEYS = ['post_data', 'recent_posts', 'posts', 'feed', 'top_posts', 'latest_posts'];
      for (const key of POST_KEYS) {
        const val = platRecord[key];
        if (Array.isArray(val) && val.length > 0) {
          console.log(`[Posts] Found posts at platRecord.${key}: ${val.length} items`);
          return val;
        }
      }
      // Also check user_profile sub-object
      const up = platRecord.user_profile as Record<string, unknown> | undefined;
      if (up && typeof up === 'object') {
        for (const key of POST_KEYS) {
          const val = up[key];
          if (Array.isArray(val) && val.length > 0) {
            console.log(`[Posts] Found posts at platRecord.user_profile.${key}: ${val.length} items`);
            return val;
          }
        }
      }
      return undefined;
    })();
    // Debug: log what we have
    console.log("[Posts] platRecord:", platRecord ? `YES (${Object.keys(platRecord).length} keys, keys: ${Object.keys(platRecord).sort().join(', ')})` : "undefined",
      "posts found:", Array.isArray(raw) ? `${raw.length} posts` : "none", "postContentType:", postContentType);
    if (!Array.isArray(raw)) return [];
    // Log first post's full structure so we can find image URL fields
    if (raw.length > 0) {
      const sample = raw[0] as Record<string, unknown>;
      console.log("[Posts] First post ALL keys:", Object.keys(sample));
      console.log("[Posts] First post full data:", JSON.stringify(sample, null, 2).slice(0, 3000));
    }
    const mapped = (raw as Record<string, unknown>[]).map((item, idx) => {
      const media = item.media as unknown[] | undefined;
      const firstMedia = Array.isArray(media) && media[0] && typeof media[0] === "object" ? (media[0] as Record<string, unknown>) : undefined;
      const engObj = (item.engagement && typeof item.engagement === "object") ? item.engagement as Record<string, unknown> : item;
      const isCarousel = Boolean(item.is_carousel) || (Array.isArray(media) && media.length > 1);
      // Flag as reel: IC uses product_type="clips" for IG reels, media_type=2 for videos
      const isReel = Boolean(
        item.is_reel || item.is_video || item.type === "reel" || item.type === "video"
        || item.product_type === "clips" || item.product_type === "reel"
        || (item.media_type === 2 && !item.is_carousel)
      );
      // Extract thumbnail — try many IC field patterns
      const isUrl = (v: unknown): v is string => typeof v === 'string' && v.startsWith('http');
      const thumbnail = (() => {
        const MEDIA_KEYS = ['url', 'thumbnail_url', 'media_url', 'display_url', 'image_url', 'src', 'thumbnail', 'preview_url'];
        const ITEM_KEYS = [
          'thumbnail', 'image', 'image_url', 'display_url', 'media_url', 'thumbnail_url',
          'video_thumbnail', 'preview_url', 'thumbnail_src', 'picture', 'thumbnail_resource',
          'cover', 'video_cover', 'cover_url', 'origin_cover', 'dynamic_cover',
        ];
        // 1. media array entries
        if (Array.isArray(media)) {
          for (const m of media) {
            if (isUrl(m)) return m;
            if (m && typeof m === 'object') {
              const mo = m as Record<string, unknown>;
              for (const k of MEDIA_KEYS) { if (isUrl(mo[k])) return mo[k] as string; }
            }
          }
        }
        // 2. firstMedia object
        if (firstMedia) {
          for (const k of MEDIA_KEYS) { if (isUrl(firstMedia[k])) return firstMedia[k] as string; }
        }
        // 3. item.images array
        const images = item.images as unknown[] | undefined;
        if (Array.isArray(images)) {
          for (const img of images) {
            if (isUrl(img)) return img;
            if (img && typeof img === 'object') {
              const io = img as Record<string, unknown>;
              for (const k of MEDIA_KEYS) { if (isUrl(io[k])) return io[k] as string; }
            }
          }
        }
        // 4. Direct item fields
        for (const k of ITEM_KEYS) { if (isUrl(item[k])) return item[k] as string; }
        // 5. image_versions2.candidates[0].url
        const iv2 = item.image_versions2 as Record<string, unknown> | undefined;
        if (iv2) {
          const candidates = iv2.candidates as unknown[] | undefined;
          if (Array.isArray(candidates) && candidates[0]) {
            const c = candidates[0] as Record<string, unknown>;
            if (isUrl(c.url)) return c.url as string;
          }
        }
        // 6. video.cover for TikTok
        const videoObj = item.video as Record<string, unknown> | undefined;
        if (videoObj) {
          for (const k of ['cover', 'origin_cover', 'dynamic_cover', 'thumbnail']) {
            if (isUrl(videoObj[k])) return videoObj[k] as string;
          }
        }
        // 7. carousel_media[0]
        const carousel = item.carousel_media as unknown[] | undefined;
        if (Array.isArray(carousel) && carousel[0] && typeof carousel[0] === 'object') {
          const cm = carousel[0] as Record<string, unknown>;
          for (const k of MEDIA_KEYS) { if (isUrl(cm[k])) return cm[k] as string; }
        }
        if (idx === 0) console.log("[Posts] WARNING: Could not extract thumbnail from first post");
        return undefined;
      })() as string | undefined;
      return {
        id: String(item.post_id ?? item.id ?? idx),
        thumbnail,
        caption: (item.caption ?? item.title ?? item.description) as string | undefined,
        likes: Number(engObj.likes ?? engObj.like_count ?? engObj.digg_count ?? 0),
        comments: Number(engObj.comments ?? engObj.comment_count ?? 0),
        views: Number(engObj.view_count ?? engObj.views ?? engObj.play_count ?? engObj.impressions ?? 0) || undefined,
        date: (item.created_at ?? item.create_time ?? item.published_at ?? item.taken_at_timestamp) as string | undefined,
        permalink: (item.post_url ?? item.video_url ?? item.url) as string | undefined,
        isCarousel,
        isReel,
      };
    });
    if (postContentType === "reels") return mapped.filter((p) => p.isReel);
    return mapped;
  }, [activePlatformRecord, postContentType]);

  const platformLink = useMemo(() => {
    const u = displayUsername || creator?.username;
    if (!u) return null;
    switch (selectedPlatform.toLowerCase()) {
      case "instagram":
        return `https://instagram.com/${u}`;
      case "tiktok":
        return tiktokData?.username ? `https://tiktok.com/@${tiktokData.username}` : `https://tiktok.com/@${u}`;
      case "youtube":
        return youtubeData?.custom_url ?? (youtubeData?.channel_id ? `https://youtube.com/channel/${youtubeData.channel_id}` : `https://youtube.com/@${u}`);
      case "twitter": {
        const handle = (twitterData?.username as string) ?? u;
        return `https://x.com/${handle}`;
      }
      case "linkedin":
        return `https://linkedin.com/in/${u}`;
      default:
        return `https://instagram.com/${u}`;
    }
  }, [selectedPlatform, displayUsername, creator?.username, tiktokData?.username, youtubeData?.custom_url, youtubeData?.channel_id, twitterData?.username]);

  const OTHER_LINKS_SHOWN = 4;
  const platformLinksFromEnrichment = useMemo(() => {
    const other = (resultTop.other_links as string[]) ?? (resultTop.links_in_bio as string[]) ?? [];
    if (!Array.isArray(other)) return { links: [] as { label: string; url: string }[], othersCount: 0 };
    const links = other
      .filter((url) => url && String(url).startsWith("http"))
      .slice(0, OTHER_LINKS_SHOWN)
      .map((url) => ({ label: "Link", url }));
    return { links, othersCount: Math.max(0, other.length - OTHER_LINKS_SHOWN) };
  }, [resultTop.other_links, resultTop.links_in_bio]);

  const handleGetEmail = async () => {
    if (!creator?.username) return;
    setFetchingEmail(true);
    setEmailNotFound(false);
    try {
      const data = await fullEnrichCreatorProfile(creator.username, undefined, selectedPlatform);
      const email = data?.result?.email as string | undefined;
      if (email) {
        setFetchedEmail(email);
      } else {
        setEmailNotFound(true);
      }
      // Merge FULL enrichment data so audience demographics populate
      if (data) {
        setEnriched(data);
        setEnrichmentSource("api");
      }
      if (user?.id) {
        logCreditUsage(user.id, "full_enrichment", 1.03, { handle: creator.username, source: "profile_modal" });
      }
    } catch (err) {
      console.error("[GetEmail] Error:", err);
      setEmailNotFound(true);
    } finally {
      setFetchingEmail(false);
    }
  };

  const displayEmail = fetchedEmail || enrichedEmail;

  console.table(creator);

  return (
    <>
      <CreateListModal
        open={createListModalOpen}
        onOpenChange={setCreateListModalOpen}
        onCreate={handleCreateListAndAdd}
      />
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "w-full border-l border-border dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-0 sm:max-w-[90vw] lg:max-w-7xl",
          "flex flex-col overflow-hidden"
        )}
      >
        {/* ── Top Platform Bar ── */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-[#0F1117] border-b border-gray-100 dark:border-gray-800 shrink-0">
          {availablePlatforms.map((p) => {
            const platData = p === "instagram" ? igRecord : p === "tiktok" ? tiktokData : p === "youtube" ? youtubeData : p === "twitter" ? twitterData : p === "facebook" ? facebookData : p === "linkedin" ? linkedinData : null;
            const pFollowers = Number((platData as Record<string, unknown>)?.follower_count ?? (platData as Record<string, unknown>)?.subscriber_count ?? 0);
            if (pFollowers <= 0) return null;
            const isActive = selectedPlatform.toLowerCase() === p.toLowerCase();
            const pEngagement = Number((platData as Record<string, unknown>)?.engagement_percent ?? (platData as Record<string, unknown>)?.engagement_rate ?? 0);
            const brandBorder = p === "instagram" ? "border-[#E1306C]" : p === "tiktok" ? "border-[#00C9B7]" : p === "youtube" ? "border-[#FF0000]" : p === "twitter" ? "border-gray-900 dark:border-white" : p === "facebook" ? "border-[#1877F2]" : p === "linkedin" ? "border-[#0A66C2]" : "border-gray-900";
            const brandText = p === "instagram" ? "text-[#E1306C]" : p === "tiktok" ? "text-[#00C9B7]" : p === "youtube" ? "text-[#FF0000]" : p === "twitter" ? "text-gray-900 dark:text-white" : p === "facebook" ? "text-[#1877F2]" : p === "linkedin" ? "text-[#0A66C2]" : "text-gray-900 dark:text-white";
            return (
              <button
                key={p}
                type="button"
                onClick={() => { userSelectedPlatformRef.current = true; setSelectedPlatform(p.toLowerCase()); }}
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 transition-all",
                  isActive
                    ? `${brandBorder} bg-white dark:bg-[#1A1D27] shadow-sm`
                    : "border-transparent bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                <PlatformIcon platform={p} size={20} />
                <div className="text-left min-w-0">
                  <p className="text-sm leading-tight whitespace-nowrap">
                    <span className={cn("font-bold", brandText)}>{formatNumber(pFollowers)}</span>
                    <span className="text-gray-500 ml-1 text-xs font-normal">{p === "youtube" ? "subs" : "followers"}</span>
                  </p>
                  <p className="text-[11px] text-green-600 leading-tight font-medium">{pEngagement > 0 ? `${formatPercent(pEngagement)} eng` : "—"}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex h-full flex-col md:flex-row overflow-hidden min-h-0">
          {/* ── Left Sidebar ── */}
          <ScrollArea className="shrink-0 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1117]" style={{ width: sidebarWidth }}>
          <div className="p-5 space-y-4">
            {/* Avatar */}
            <div className="mx-auto h-24 w-24 rounded-full overflow-hidden relative border-2 border-gray-200 dark:border-gray-700">
              {modalAvatarSrc ? (
                <img
                  src={modalAvatarSrc}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onLoad={() => {
                    const key = displayUsername || creator?.username || "";
                    if (key && modalAvatarSrc) goodAvatarCache.set(key, modalAvatarSrc);
                  }}
                  onError={() => {
                    if (modalAvatarSrc !== enrichedAvatarUrl && enrichedAvatarUrl) {
                      setModalAvatarSrc(enrichedAvatarUrl);
                    } else if (modalAvatarSrc !== cachedWorkingUrl && cachedWorkingUrl) {
                      setModalAvatarSrc(cachedWorkingUrl);
                    } else {
                      setModalAvatarSrc(null);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1e3a5f] to-[#2d5282] flex items-center justify-center text-white font-bold text-3xl">
                  {displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            {/* Name + handle */}
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {displayName}
                {isVerified && (
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-[#1e3a5f]/20 px-1.5 py-0.5 text-xs font-medium text-[#1e3a5f]">
                    Verified
                  </span>
                )}
              </p>
              {displayUsername && (
                <a
                  href={platformLink ?? `https://instagram.com/${displayUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#0064B1] hover:underline"
                >
                  @{displayUsername}
                </a>
              )}
            </div>

            {/* Bio */}
            {bio && (
              <p className="text-sm text-gray-400 dark:text-gray-500 line-clamp-3 leading-relaxed">{bio}</p>
            )}

            {/* Info rows */}
            <div className="space-y-1.5">
              {location && (
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>{location}</span>
                </div>
              )}
              {language && (
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Globe className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>{language}</span>
                </div>
              )}
              {category && (
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Briefcase className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>{category}</span>
                </div>
              )}
            </div>

            {/* Links Used */}
            {(platformLinksFromEnrichment.links.length > 0 || platformLinksFromEnrichment.othersCount > 0) && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Links Used</p>
                <div className="flex flex-wrap gap-1.5">
                  {platformLinksFromEnrichment.links.map(({ url }) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-[#1e3a5f] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors truncate max-w-[200px]"
                      title={url}
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{url.replace(/^https?:\/\//, "").slice(0, 24)}...</span>
                    </a>
                  ))}
                  {platformLinksFromEnrichment.othersCount > 0 && (
                    <span className="rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-500">
                      +{platformLinksFromEnrichment.othersCount} others
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Cross-Platform Summary is shown below in the dedicated section */}

            {/* Enrichment status */}
            {showEnrichmentLoading && (
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" /> Enriching...
                </span>
              </div>
            )}
            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Branch badge */}
              {detectedBranch && (
                <div className="flex flex-wrap gap-1.5 mb-1">
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", BRANCH_STYLES[detectedBranch] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400")}>
                    {detectedBranch}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-0.5 text-[11px] font-semibold">
                    Veteran
                  </span>
                </div>
              )}

              {/* Primary: Add to List + Three-dot menu */}
              <div className="flex gap-2">
                <div className="relative flex-1" ref={listDropdownRef}>
                  <Button
                    className="w-full bg-[#1e3a5f] hover:bg-[#2d5282] text-white rounded-lg text-sm"
                    disabled={!listCreator}
                    onClick={() => {
                      if (!listDropdownOpen && listCreator) {
                        const alreadyIn = new Set<string>();
                        for (const list of lists) {
                          if (list.creators.some((c) => c.id === listCreator.id)) alreadyIn.add(list.id);
                        }
                        setSelectedListIds(alreadyIn);
                      }
                      setListDropdownOpen(!listDropdownOpen);
                      setDirDropdownOpen(false);
                      setEventDropdownOpen(false);
                    }}
                  >
                    <ListPlus className="mr-2 h-4 w-4" />
                    Add to List
                    <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                  {listDropdownOpen && (
                    <div className="absolute left-0 right-0 bottom-full mb-1 z-50 bg-white dark:bg-[#1A1D27] rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 max-h-[260px] overflow-y-auto">
                      {lists.length === 0 ? (
                        <div className="py-3 px-3 text-xs text-gray-400 text-center">No lists yet</div>
                      ) : (
                        lists.map((list) => {
                          const alreadyIn = listCreator ? list.creators.some((c) => c.id === listCreator.id) : false;
                          const checked = selectedListIds.has(list.id);
                          return (
                            <label
                              key={list.id}
                              className="w-full flex items-center gap-2.5 py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm text-gray-700 dark:text-gray-300 transition-colors select-none"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setSelectedListIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(list.id)) next.delete(list.id);
                                    else next.add(list.id);
                                    return next;
                                  });
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]/40 shrink-0"
                              />
                              <span className="truncate flex-1">{list.name}</span>
                              {alreadyIn && <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                            </label>
                          );
                        })
                      )}
                      <div className="border-t border-gray-100 dark:border-gray-700">
                        {showNewListInput ? (
                          <div className="flex items-center gap-1.5 p-2">
                            <input
                              type="text"
                              value={newListName}
                              onChange={(e) => setNewListName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleInlineCreateList()}
                              placeholder="List name..."
                              autoFocus
                              className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1117] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/40"
                            />
                            <button type="button" onClick={handleInlineCreateList} className="p-1.5 rounded-lg bg-[#1e3a5f] text-white hover:bg-[#2d5282]">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowNewListInput(true)}
                            className="w-full flex items-center gap-2 py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm text-[#1e3a5f] font-medium text-left transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Create New List
                          </button>
                        )}
                      </div>
                      <div className="border-t border-gray-100 dark:border-gray-700 p-2">
                        <button
                          type="button"
                          disabled={selectedListIds.size === 0}
                          onClick={handleConfirmAddToLists}
                          className="w-full py-1.5 px-3 text-sm font-medium rounded-lg bg-[#1e3a5f] text-white hover:bg-[#2d5282] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Three-dot action menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 h-9 w-9 rounded-lg border-gray-200 dark:border-gray-700">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg">
                    {!hideDirectoryActions && (
                      <DropdownMenuItem onClick={() => { setDirDropdownOpen(true); setListDropdownOpen(false); setEventDropdownOpen(false); }}>
                        <FolderPlus className="mr-2 h-4 w-4 text-blue-600" />
                        Add to Directory
                      </DropdownMenuItem>
                    )}
                    {!hideDirectoryActions && (
                      <DropdownMenuItem onClick={() => { setEventDropdownOpen(true); setListDropdownOpen(false); setDirDropdownOpen(false); }}>
                        <CalendarPlus className="mr-2 h-4 w-4 text-blue-600" />
                        Invite to Event
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>
                      <Ban className="mr-2 h-4 w-4 text-gray-400" />
                      Exclude from Results
                    </DropdownMenuItem>
                    {!displayEmail && !emailNotFound && !fetchingEmail && creator?.username && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleGetEmail}>
                          <Mail className="mr-2 h-4 w-4 text-blue-600" />
                          Get Email (1 credit)
                        </DropdownMenuItem>
                      </>
                    )}
                    {onRemoveFromDirectory && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onRemoveFromDirectory} className="text-red-600 focus:text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove from Directory
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Directory dropdown (shows when triggered from menu) */}
              {dirDropdownOpen && !hideDirectoryActions && (
                <div className="relative" ref={dirDropdownRef}>
                  <div className="bg-white dark:bg-[#1A1D27] rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 max-h-[200px] overflow-y-auto">
                    {directoriesList.length === 0 ? (
                      <div className="py-3 px-3 text-xs text-gray-400 text-center">No directories yet</div>
                    ) : (
                      directoriesList.map((dir) => (
                        <button
                          key={dir.id}
                          type="button"
                          onClick={() => handleStandaloneApprove(dir.id)}
                          className="w-full flex items-center gap-2.5 py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm text-gray-700 dark:text-gray-300 text-left transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <FolderPlus className="h-3.5 w-3.5 text-blue-700 dark:text-blue-500" />
                          </div>
                          <span className="truncate flex-1">{dir.name}</span>
                        </button>
                      ))
                    )}
                    <div className="border-t border-gray-100 dark:border-gray-700">
                      {showNewDirInput ? (
                        <div className="flex items-center gap-1.5 p-2">
                          <input
                            type="text"
                            value={newDirName}
                            onChange={(e) => setNewDirName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleInlineCreateDir()}
                            placeholder="Directory name..."
                            autoFocus
                            className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1117] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/40"
                          />
                          <button type="button" onClick={handleInlineCreateDir} className="p-1.5 rounded-lg bg-[#1e3a5f] text-white hover:bg-[#2d5282]">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowNewDirInput(true)}
                          className="w-full flex items-center gap-2 py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm text-[#1e3a5f] font-medium text-left transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Create New Directory
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Event dropdown (shows when triggered from menu) */}
              {eventDropdownOpen && !hideDirectoryActions && (
                <div className="relative" ref={eventDropdownRef}>
                  <div className="bg-white dark:bg-[#1A1D27] rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 max-h-[200px] overflow-y-auto">
                    {eventsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    ) : eventsList.length === 0 ? (
                      <div className="py-3 px-3 text-xs text-gray-400 text-center">No upcoming events</div>
                    ) : (
                      eventsList.map((evt) => {
                        const alreadyAdded = speakerEventIds.has(evt.id);
                        return (
                          <button
                            key={evt.id}
                            type="button"
                            onClick={() => !alreadyAdded && handleInviteToEvent(evt.id, evt.title)}
                            disabled={alreadyAdded}
                            className={cn(
                              "w-full flex items-center gap-2.5 py-2 px-3 text-sm text-left transition-colors",
                              alreadyAdded
                                ? "opacity-60 cursor-default bg-gray-50 dark:bg-gray-800/30"
                                : "hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-gray-700 dark:text-gray-300"
                            )}
                          >
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                              alreadyAdded ? "bg-green-100 dark:bg-green-900/30" : "bg-blue-50 dark:bg-blue-900/30"
                            )}>
                              {alreadyAdded
                                ? <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                : <CalendarPlus className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium">{evt.title}</p>
                              <p className="text-[10px] text-gray-400">
                                {alreadyAdded
                                  ? "Already added"
                                  : new Date(evt.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Contact / Email */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Contact</p>
              {displayEmail ? (
                <a href={`mailto:${displayEmail}`} className="flex items-center gap-1.5 text-sm text-[#0064B1] hover:underline">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> {displayEmail}
                </a>
              ) : emailNotFound ? (
                <p className="text-sm text-gray-500">No email found</p>
              ) : fetchingEmail ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-600">Fetching...</span>
                </div>
              ) : creator?.username ? (
                <button onClick={handleGetEmail} className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800 hover:underline font-medium">
                  <Mail className="h-3.5 w-3.5" /> Get Email (1 credit)
                </button>
              ) : (
                <p className="text-sm text-gray-500">&mdash;</p>
              )}
            </div>

            {/* Cross-Platform Summary */}
            {crossPlatformSummary.totalReach > 0 && (
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-4">
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Cross-Platform Summary</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <Users className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Reach</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatNumber(crossPlatformSummary.totalReach)}</p>
                    </div>
                  </div>
                  {crossPlatformSummary.mostEngaged && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Most Engaged</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{crossPlatformSummary.mostEngaged.platform}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Avg Engagement</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPercent(crossPlatformSummary.avgEngagement)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Platforms row — uses availablePlatforms (same source as top bar) */}
            {(() => {
              if (availablePlatforms.length === 0) return null;
              return (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Platforms</p>
                  <div className="flex flex-wrap gap-2">
                    {availablePlatforms.map((p) => {
                      const isActive = selectedPlatform.toLowerCase() === p.toLowerCase();
                      const brandRing = p === "instagram" ? "ring-[#E1306C]" : p === "tiktok" ? "ring-[#00C9B7]" : p === "youtube" ? "ring-[#FF0000]" : p === "twitter" ? "ring-gray-900 dark:ring-white" : p === "facebook" ? "ring-[#1877F2]" : p === "linkedin" ? "ring-[#0A66C2]" : "ring-gray-900";
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => { userSelectedPlatformRef.current = true; setSelectedPlatform(p.toLowerCase()); }}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                            isActive ? `bg-white dark:bg-gray-900 ring-2 ${brandRing} shadow-sm` : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                          )}
                          title={PLATFORM_LABELS[p.toLowerCase()] ?? p}
                        >
                          <PlatformIcon platform={p} size={14} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Detailed Stats */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
              <div className="space-y-0 text-[13px]">
                {[
                  { label: statLabels.followers, value: followers ? formatNumber(followers) : null },
                  { label: "Engagement Rate", value: engagement != null && engagement > 0 ? formatPercent(engagement) : null },
                  { label: statLabels.mediaCount, value: mediaCount ? formatNumber(mediaCount) : null },
                  { label: statLabels.postsPerMonth, value: postsPerMonth ? formatNumber(postsPerMonth) : null },
                  { label: statLabels.avgViews, value: avgViews ? formatNumber(avgViews) : null },
                  ...(totalLikes > 0 ? [{ label: "Total Likes", value: formatNumber(totalLikes) }] : []),
                  { label: statLabels.avgSpecial, value: avgSpecial ? formatNumber(avgSpecial) : null },
                  { label: statLabels.avgLikes, value: avgLikes ? formatNumber(avgLikes) : null },
                  { label: statLabels.avgComments, value: avgComments ? formatNumber(avgComments) : null },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-1.5">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    {(showEnrichmentLoading || showPlatformLoading) && !value ? (
                      <Skeleton className="h-4 w-14 animate-pulse" />
                    ) : (
                      <span className={cn("font-semibold text-gray-900 dark:text-white", !value && "opacity-50")}>{value ?? "—"}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
          </ScrollArea>

          {/* ── Draggable Divider ── */}
          <div
            className="hidden md:flex items-center justify-center shrink-0 cursor-col-resize group relative"
            style={{ width: 6 }}
            onMouseDown={handleDividerMouseDown}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-[2px] group-active:w-[2px] bg-[#CBD5E1] transition-all" />
          </div>

          {/* ── Right Panel ── */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ minWidth: 400 }}>
            {error && (
              <div className="p-4 text-sm text-destructive bg-destructive/10 border-b border-border shrink-0">
                {error}
              </div>
            )}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {!hasDataForPlatform && !enrichmentLoading && !showPlatformLoading && (
                  <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border dark:border-gray-700 bg-muted/20 dark:bg-[#0F1117] p-4">
                    Data not available for {PLATFORM_LABELS[selectedPlatform] ?? selectedPlatform}.
                  </p>
                )}

                {/* Tab bar: Analytics | Posts | Similar Accounts */}
                  <Tabs defaultValue="analytics" className="w-full">
                    <TabsList className="flex justify-start gap-2 bg-transparent border-none rounded-none p-0 h-auto">
                      <TabsTrigger
                        value="analytics"
                        className="rounded-full px-4 py-2 text-sm font-medium cursor-pointer transition-colors border-none shadow-none bg-gray-100 text-gray-700 hover:bg-gray-200 data-[state=active]:bg-[#1B2A4A] data-[state=active]:text-white data-[state=active]:shadow-none"
                      >
                        <BarChart3 className="h-4 w-4 mr-1.5" /> Analytics
                      </TabsTrigger>
                      <TabsTrigger
                        value="posts"
                        className="rounded-full px-4 py-2 text-sm font-medium cursor-pointer transition-colors border-none shadow-none bg-gray-100 text-gray-700 hover:bg-gray-200 data-[state=active]:bg-[#1B2A4A] data-[state=active]:text-white data-[state=active]:shadow-none"
                      >
                        <Image className="h-4 w-4 mr-1.5" /> Posts
                      </TabsTrigger>
                      <TabsTrigger
                        value="similar"
                        className="rounded-full px-4 py-2 text-sm font-medium cursor-pointer transition-colors border-none shadow-none bg-gray-100 text-gray-700 hover:bg-gray-200 data-[state=active]:bg-[#1B2A4A] data-[state=active]:text-white data-[state=active]:shadow-none"
                      >
                        <Users className="h-4 w-4 mr-1.5" /> Similar Accounts
                      </TabsTrigger>
                      <TabsTrigger
                        value="campaigns"
                        className="rounded-full px-4 py-2 text-sm font-medium cursor-pointer transition-colors border-none shadow-none bg-gray-100 text-gray-700 hover:bg-gray-200 data-[state=active]:bg-[#1B2A4A] data-[state=active]:text-white data-[state=active]:shadow-none"
                      >
                        <CalendarPlus className="h-4 w-4 mr-1.5" /> Campaigns
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="analytics" className="mt-5 space-y-5">
                      {/* Engagement Per Post */}
                      {postEngagementData.length > 0 ? (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Engagement Per Post</p>
                          <p className="text-xs text-muted-foreground mb-3">Engagement rate for recent posts (likes + comments / followers)</p>
                          <div className="h-36 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={postEngagementData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <XAxis dataKey="post" tick={{ fontSize: 9 }} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                                <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "ER"]} />
                                <Bar dataKey="er" fill="#1e3a5f" radius={[3, 3, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ) : (showEnrichmentLoading || showPlatformLoading) ? (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Engagement Per Post</p>
                          <Skeleton className="h-36 w-full animate-pulse" />
                        </div>
                      ) : hasDataForPlatform ? (
                        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Engagement Per Post</p>
                          <p className="text-sm text-muted-foreground">Engagement data not available for {PLATFORM_LABELS[selectedPlatform] ?? selectedPlatform}.</p>
                        </div>
                      ) : null}

                      {/* Follower Growth Chart */}
                      {growthData.length > 0 ? (() => {
                        const filteredGrowth = growthData.filter(d => d.months <= Number(growthTimeRange));
                        const latestGrowth = filteredGrowth.length > 0 ? filteredGrowth[filteredGrowth.length - 1].growth : 0;
                        const followerDelta = followers > 0 ? Math.round(followers * Math.abs(latestGrowth) / (100 + Math.abs(latestGrowth))) : 0;
                        return (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Follower Growth</p>
                            <select
                              value={growthTimeRange}
                              onChange={e => setGrowthTimeRange(e.target.value as "12" | "6" | "3")}
                              className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-[#1a1a2e] text-gray-700 dark:text-gray-300"
                            >
                              <option value="12">Last 12 months</option>
                              <option value="6">Last 6 months</option>
                              <option value="3">Last 3 months</option>
                            </select>
                          </div>
                          <div className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={filteredGrowth} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`} />
                                <Tooltip formatter={(value: number) => [`${value > 0 ? "+" : ""}${value.toFixed(2)}%`, "Growth"]} />
                                <Line type="monotone" dataKey="growth" stroke={latestGrowth >= 0 ? "#22c55e" : "#ef4444"} strokeWidth={2} dot={{ r: 5, fill: latestGrowth >= 0 ? "#22c55e" : "#ef4444" }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            @{displayUsername || "creator"} {latestGrowth >= 0
                              ? `gained ~${formatNum(followerDelta)} followers (+${latestGrowth.toFixed(1)}%)`
                              : `declined ~${formatNum(followerDelta)} followers (${latestGrowth.toFixed(1)}%)`
                            } in the last {growthTimeRange} months
                          </p>
                        </div>
                        );
                      })() : (showEnrichmentLoading || showPlatformLoading) ? (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Follower Growth</p>
                          <Skeleton className="h-44 w-full" />
                        </div>
                      ) : hasDataForPlatform ? (
                        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Follower Growth</p>
                          <p className="text-sm text-muted-foreground">This account doesn&apos;t have enough follower history to show growth data.</p>
                        </div>
                      ) : null}

                      {/* Estimated Income / Engagement Overview fallback */}
                      {(incomeMin != null && incomeMax != null && (incomeMin > 0 || incomeMax > 0)) ? (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Estimated Income</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            @{displayUsername || "handle"} generated between{" "}
                            <span className="font-bold text-[#1e3a5f]">${formatNum(incomeMin)}</span> and{" "}
                            <span className="font-bold text-[#1e3a5f]">${formatNum(incomeMax)}</span> in income in the last 90 days.
                          </p>
                        </div>
                      ) : (showEnrichmentLoading || showPlatformLoading) ? (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Estimated Income</p>
                          <Skeleton className="h-4 w-full max-w-md" />
                        </div>
                      ) : hasDataForPlatform && engagementDistro.length > 0 ? (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Engagement Overview</p>
                          <p className="text-xs text-muted-foreground mb-3">Average engagement per post</p>
                          <div className="flex items-center gap-4">
                            <div className="h-32 w-32 flex-shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={engagementDistro} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={52} paddingAngle={3} />
                                  <Tooltip formatter={(value: number, name: string) => [formatNum(value), name]} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex flex-col gap-2 text-sm">
                              {engagementDistro.map(d => (
                                <div key={d.name} className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
                                  <span className="text-gray-600 dark:text-gray-400">{d.name}:</span>
                                  <span className="font-semibold text-gray-900 dark:text-white">{formatNum(d.value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : hasDataForPlatform ? (
                        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Engagement Overview</p>
                          <p className="text-sm text-muted-foreground">Not enough engagement data available for this account.</p>
                        </div>
                      ) : null}

                      {/* Top Creator Hashtags */}
                      {(showEnrichmentLoading || showPlatformLoading) && platformHashtags.length === 0 && (
                        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Top Creator Hashtags</p>
                          <div className="flex flex-wrap gap-2">
                            {[80, 64, 72, 56, 48, 60].map((w, i) => (
                              <Skeleton key={i} className="h-7 animate-pulse rounded-full" style={{ width: w }} />
                            ))}
                          </div>
                        </div>
                      )}
                      {platformHashtags.length > 0 && (
                        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Top Creator Hashtags</p>
                          <div className="flex flex-wrap gap-2">
                            {platformHashtags.map((tag: string) => (
                              <span key={tag} className="inline-block rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-transparent px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Audience Reachability */}
                      {audienceReachability && audienceReachability.length > 0 && (
                        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Audience Reachability</p>
                          <div className="space-y-2">
                            {audienceReachability.map((r) => (
                              <div key={r.label} className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 w-24 shrink-0 truncate">{r.label}</span>
                                <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                  <div className="h-full rounded-full bg-[#1e3a5f]" style={{ width: `${Math.min(r.percentage, 100)}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-10 text-right">{r.percentage.toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Audience Gender */}
                      {audienceGender && (
                        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Audience Gender</p>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">Male</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{audienceGender.male.toFixed(1)}%</span>
                              </div>
                              <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                <div className="h-full rounded-full bg-blue-500" style={{ width: `${audienceGender.male}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">Female</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{audienceGender.female.toFixed(1)}%</span>
                              </div>
                              <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                <div className="h-full rounded-full bg-pink-500" style={{ width: `${audienceGender.female}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Audience Age */}
                      {audienceAge.length > 0 && (
                        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Audience Age</p>
                          <div className="space-y-2">
                            {audienceAge.map((a) => (
                              <div key={a.bracket} className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 w-14 shrink-0">{a.bracket}</span>
                                <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(a.percentage, 100)}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-10 text-right">{a.percentage.toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Audience Languages */}
                      {audienceLanguages.length > 0 && (
                        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Audience Languages</p>
                          <div className="space-y-2">
                            {audienceLanguages.map((l) => (
                              <div key={l.language} className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 w-20 shrink-0 truncate">{l.language}</span>
                                <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(l.percentage, 100)}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-10 text-right">{l.percentage.toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Audience Credibility */}
                      {audienceCredibility && (
                        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Audience Credibility</p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                              <div className={cn("h-full rounded-full", audienceCredibility.level === "High" ? "bg-green-500" : audienceCredibility.level === "Medium" ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${Math.min(audienceCredibility.score, 100)}%` }} />
                            </div>
                            <span className={cn("text-xs font-semibold rounded-full px-2 py-0.5", audienceCredibility.level === "High" ? "bg-green-100 text-green-700" : audienceCredibility.level === "Medium" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700")}>
                              {audienceCredibility.score.toFixed(0)}% &mdash; {audienceCredibility.level}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Audience Brand Affinity */}
                      {audienceBrandAffinity.length > 0 && (
                        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Audience Brand Affinity</p>
                          <div className="space-y-2">
                            {audienceBrandAffinity.map((b) => (
                              <div key={b.name} className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 w-28 shrink-0 truncate">{b.name}</span>
                                <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                  <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(b.percentage, 100)}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-10 text-right">{b.percentage.toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Audience Interests */}
                      {audienceInterests.length > 0 && (
                        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Top Audience Interests</p>
                          <div className="flex flex-wrap gap-2">
                            {audienceInterests.map((interest) => (
                              <span key={interest} className="inline-block rounded-full bg-blue-50 dark:bg-blue-900/20 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="posts" className="mt-5">
                      {/* Posts / Reels toggle */}
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Latest Creator Posts</p>
                        <div className="flex rounded-full border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setPostContentType("posts")}
                            className={cn("px-3 py-1 text-xs font-medium transition-colors", postContentType === "posts" ? "bg-[#1e3a5f] text-white" : "text-gray-500 hover:bg-gray-50")}
                          >
                            Posts
                          </button>
                          <button
                            type="button"
                            onClick={() => setPostContentType("reels")}
                            className={cn("px-3 py-1 text-xs font-medium transition-colors", postContentType === "reels" ? "bg-[#1e3a5f] text-white" : "text-gray-500 hover:bg-gray-50")}
                          >
                            Reels
                          </button>
                        </div>
                      </div>

                      {filteredPosts.length === 0 && showEnrichmentLoading ? (
                        <div className="grid grid-cols-3 gap-3">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-[#0F1117]">
                              <Skeleton className="w-full aspect-square animate-pulse" />
                              <div className="p-2.5 space-y-1.5">
                                <Skeleton className="h-3 w-full animate-pulse" />
                                <Skeleton className="h-3 w-2/3 animate-pulse" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : filteredPosts.length === 0 ? (
                        <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border dark:border-gray-700 bg-muted/20 dark:bg-[#0F1117] p-4">
                          No {postContentType} data available.
                        </p>
                      ) : postContentType === "reels" ? (
                        /* ── Reels: vertical 9:16 cards with play overlay ── */
                        <div className="grid grid-cols-3 gap-3">
                          {filteredPosts.map((post) => (
                            <a
                              key={post.id}
                              href={post.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-[#0F1117] hover:shadow-md transition-shadow group"
                            >
                              <div className="relative overflow-hidden" style={{ aspectRatio: '9/16' }}>
                                {post.thumbnail && !brokenPostImages.has(post.id) ? (
                                  <img
                                    src={post.thumbnail}
                                    alt=""
                                    loading="lazy"
                                    className="absolute inset-0 w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={() => setBrokenPostImages(prev => new Set(prev).add(post.id))}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center gap-1">
                                    <Camera className="h-6 w-6 text-gray-300" />
                                    <span className="text-[10px] text-gray-400">No preview</span>
                                  </div>
                                )}
                                {/* Play button overlay */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="h-12 w-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm group-hover:bg-black/70 transition-colors">
                                    <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
                                  </div>
                                </div>
                                {/* Views badge bottom-left */}
                                {post.views != null && post.views > 0 && (
                                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-0.5 backdrop-blur-sm">
                                    <Eye className="h-3 w-3 text-white" />
                                    <span className="text-[10px] text-white font-medium">{formatNumber(post.views)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="p-2.5">
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 min-h-[2rem]">{post.caption || "—"}</p>
                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                                  {post.views != null && post.views > 0 && (
                                    <span>{formatNumber(post.views)} views</span>
                                  )}
                                  {post.date && (
                                    <span>{new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                  )}
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      ) : (
                        /* ── Posts: square 1:1 cards ── */
                        <div className="grid grid-cols-3 gap-3">
                          {filteredPosts.map((post) => (
                            <a
                              key={post.id}
                              href={post.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-[#0F1117] hover:shadow-md transition-shadow group"
                            >
                              <div className="relative overflow-hidden aspect-square">
                                {post.thumbnail && !brokenPostImages.has(post.id) ? (
                                  <img
                                    src={post.thumbnail}
                                    alt=""
                                    loading="lazy"
                                    className="absolute inset-0 w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={() => setBrokenPostImages(prev => new Set(prev).add(post.id))}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center gap-1">
                                    <Camera className="h-6 w-6 text-gray-300" />
                                    <span className="text-[10px] text-gray-400">No preview</span>
                                  </div>
                                )}
                                {post.isReel && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                      <Play className="h-4 w-4 text-white ml-0.5" fill="white" />
                                    </div>
                                  </div>
                                )}
                                {post.isCarousel && (
                                  <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                                    <ChevronRight className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="p-2.5">
                                {post.date && (
                                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">
                                    {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                  </p>
                                )}
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 min-h-[2rem]">{post.caption || "—"}</p>
                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                                  {post.views != null && post.views > 0 && (
                                    <span>{formatNumber(post.views)} views</span>
                                  )}
                                  <span>{formatNumber(post.likes)} likes</span>
                                  <span>{formatNumber(post.comments)} comments</span>
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="similar" className="mt-5">
                      {similarAccounts.length === 0 && showEnrichmentLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                              <Skeleton className="h-10 w-10 rounded-full shrink-0 animate-pulse" />
                              <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-24 animate-pulse" />
                                <Skeleton className="h-3 w-32 animate-pulse" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : similarAccounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border dark:border-gray-700 bg-muted/20 dark:bg-[#0F1117] p-4">
                          No similar accounts found.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1117]">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] text-gray-500 uppercase tracking-wider">
                                <th className="py-2.5 px-3">Creator</th>
                                <th className="py-2.5 px-3">Followers</th>
                                <th className="py-2.5 px-3">Engagement</th>
                                <th className="py-2.5 px-3">Similarity Score</th>
                                <th className="py-2.5 px-3"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {similarAccounts.map((acc) => {
                                const simPct = acc.similarity != null && acc.similarity > 0
                                  ? (acc.similarity <= 1 ? acc.similarity * 100 : acc.similarity)
                                  : 0;
                                // Avatar: from original data, or from enriched lookup
                                const avatarUrl = acc.avatar || acc.picture || (acc.username ? similarAvatars[acc.username] : undefined);
                                const initColor = `hsl(${((acc.username ?? acc.name ?? "?").charCodeAt(0) * 47) % 360}, 55%, 50%)`;
                                const initLetter = (acc.name ?? acc.username ?? "?").charAt(0).toUpperCase();
                                return (
                                  <tr key={acc.id ?? acc.username} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-2.5">
                                        {avatarUrl ? (
                                          <img
                                            src={safeImageUrl(avatarUrl)}
                                            alt=""
                                            className="h-9 w-9 rounded-full object-cover shrink-0"
                                            referrerPolicy="no-referrer"
                                            onError={(e) => {
                                              const el = e.target as HTMLImageElement;
                                              el.style.display = 'none';
                                              const fallback = el.nextElementSibling as HTMLElement | null;
                                              if (fallback) fallback.style.display = 'flex';
                                            }}
                                          />
                                        ) : null}
                                        <div
                                          className="h-9 w-9 rounded-full shrink-0 items-center justify-center text-white text-sm font-bold"
                                          style={{
                                            display: avatarUrl ? 'none' : 'flex',
                                            backgroundColor: initColor,
                                          }}
                                        >
                                          {initLetter}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{acc.name ?? acc.full_name ?? acc.username ?? "—"}</p>
                                          <p className="text-xs text-gray-500 truncate">@{acc.username ?? "—"}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{formatNumber(acc.followers ?? acc.follower_count)}</td>
                                    <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{acc.engagement_percent != null && acc.engagement_percent > 0 ? formatPercent(acc.engagement_percent) : "—"}</td>
                                    <td className="py-2.5 px-3 whitespace-nowrap">
                                      {simPct > 0 ? (
                                        <span className="inline-flex items-center rounded-lg bg-green-50 dark:bg-green-900/20 px-2.5 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
                                          {simPct.toFixed(0)}
                                        </span>
                                      ) : <span className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">N/A</span>}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      {onOpenCreator ? (
                                        <button
                                          type="button"
                                          onClick={() => onOpenCreator(acc.username ?? "")}
                                          className="text-xs font-medium text-[#1e3a5f] hover:underline"
                                        >
                                          View
                                        </button>
                                      ) : (
                                        <a
                                          href={acc.profile_url ?? (acc.username ? `https://instagram.com/${acc.username}` : "#")}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs font-medium text-[#1e3a5f] hover:underline"
                                        >
                                          View
                                        </a>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="campaigns" className="mt-5">
                      {campaignsLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                              <Skeleton className="h-4 w-32 mb-2 animate-pulse" />
                              <Skeleton className="h-3 w-48 animate-pulse" />
                            </div>
                          ))}
                        </div>
                      ) : creatorCampaigns.length === 0 ? (
                        <div className="text-center py-8">
                          <CalendarPlus className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                          <p className="text-sm text-muted-foreground mb-4">No campaigns found for this creator.</p>
                          <Button
                            size="sm"
                            className="bg-[#1B3A6B] hover:bg-[#152d54] text-white"
                            onClick={() => {
                              onOpenChange(false);
                              navigate(`/creator/create-post?tab=cadence&creatorName=${encodeURIComponent(creator?.name ?? "")}&creatorId=${encodeURIComponent(creator?.id ?? "")}`);
                            }}
                          >
                            <CalendarPlus className="h-4 w-4 mr-2" />
                            Create Campaign for {creator?.name?.split(" ")[0] ?? "Creator"}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mb-2"
                            onClick={() => {
                              onOpenChange(false);
                              navigate(`/creator/create-post?tab=cadence&creatorName=${encodeURIComponent(creator?.name ?? "")}&creatorId=${encodeURIComponent(creator?.id ?? "")}`);
                            }}
                          >
                            <CalendarPlus className="h-4 w-4 mr-2" />
                            Create Campaign for {creator?.name?.split(" ")[0] ?? "Creator"}
                          </Button>
                          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1117]">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] text-gray-500 uppercase tracking-wider">
                                  <th className="py-2.5 px-3">Campaign</th>
                                  <th className="py-2.5 px-3">Status</th>
                                  <th className="py-2.5 px-3">Duration</th>
                                  <th className="py-2.5 px-3">Start</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {creatorCampaigns.map((camp) => (
                                  <tr key={camp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="py-2.5 px-3">
                                      <p className="font-medium text-gray-900 dark:text-white">{camp.name}</p>
                                      {camp.created_for_name && (
                                        <p className="text-xs text-muted-foreground">for {camp.created_for_name}</p>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                        camp.status === "scheduled" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                        camp.status === "scheduling" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                      }`}>
                                        {camp.status}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{camp.duration_days}d</td>
                                    <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                      {camp.start_date ? new Date(camp.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  {/* Loading indicator at bottom of content */}
                  {showEnrichmentLoading && (
                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading creator insights...
                    </div>
                  )}
                </div>
              </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}
