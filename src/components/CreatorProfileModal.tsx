import { useEffect, useState, useMemo, useRef } from "react";
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
  type CreatorCard,
  type EnrichedProfileResponse,
} from "@/lib/influencers-club";
import { useLists, type ListCreator } from "@/contexts/ListContext";
import {
  Instagram,
  ExternalLink,
  ListPlus,
  BarChart3,
  Image,
  Users,
  Plus,
  Video,
  Youtube,
  Loader2,
  Link,
  ShieldCheck,
  ChevronDown,
  Trash2,
  CalendarPlus,
  FolderPlus,
  X,
  Facebook,
  Music,
  Check,
  Mail,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn, safeImageUrl, goodAvatarCache } from "@/lib/utils";
import { getCreatorAvatar } from "@/lib/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { approveForDirectory, detectBranch, extractAvatarFromEnrichment, extractBannerImage } from "@/lib/featured-creators";
import CreateListModal from "@/components/CreateListModal";

/** TikTok brand SVG icon (matches PlatformIcons.tsx) */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.82a4.84 4.84 0 01-1-.13z" />
    </svg>
  );
}

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
const PLATFORM_PILL_STYLES: Record<string, { active: string; inactive: string; icon: React.ComponentType<{ className?: string }> }> = {
  instagram: { active: "bg-[#1a56db] text-white", inactive: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50", icon: Instagram },
  tiktok: { active: "bg-[#1a56db] text-white", inactive: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50", icon: TikTokIcon },
  youtube: { active: "bg-[#1a56db] text-white", inactive: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50", icon: Youtube },
  facebook: { active: "bg-[#1a56db] text-white", inactive: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50", icon: Facebook },
  twitter: { active: "bg-[#1a56db] text-white", inactive: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50", icon: X },
  linkedin: { active: "bg-[#1a56db] text-white", inactive: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50", icon: ExternalLink },
};

/**
 * Compute analytics from post_data when the RAW enrich endpoint is used.
 * The RAW endpoint (0.03 credits) returns post_data with per-post engagement
 * but no computed averages — those are only in the FULL endpoint (1.03 credits).
 */
function computeFromPostData(igRecord: Record<string, unknown> | undefined, followerCount: number) {
  const posts = Array.isArray(igRecord?.post_data) ? (igRecord.post_data as Record<string, unknown>[]) : [];
  console.log("[DEBUG-computeFromPostData] posts.length:", posts.length, "followerCount:", followerCount, "post_data type:", typeof igRecord?.post_data, "isArray:", Array.isArray(igRecord?.post_data));
  if (posts.length === 0) return { avgLikes: 0, avgComments: 0, avgViews: 0, engagement: 0, postsPerMonth: 0 };

  let totalLikes = 0;
  let totalComments = 0;
  let totalViews = 0;
  let videoCount = 0;
  const dates: number[] = [];

  for (const p of posts) {
    const eng = p.engagement as Record<string, unknown> | undefined;
    if (eng) {
      totalLikes += Number(eng.likes ?? 0);
      totalComments += Number(eng.comments ?? 0);
      const vc = Number(eng.view_count ?? 0);
      if (vc > 0) {
        totalViews += vc;
        videoCount++;
      }
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

/* ── Enrichment cache (Supabase) ── */
const ENRICH_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getEnrichCache(handle: string, platform: string): Promise<EnrichedProfileResponse | null> {
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
  /** Hide "Add to Directory" and "Verify Military Status" buttons (e.g. when opened from a directory). */
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

  const listDropdownRef = useRef<HTMLDivElement>(null);
  const dirDropdownRef = useRef<HTMLDivElement>(null);
  const eventDropdownRef = useRef<HTMLDivElement>(null);

  const username = creator?.username ?? (creator?.name?.replace(/\s+/g, "_").toLowerCase());

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
      return;
    }
    const rawHandle = creator.username || username;
    const handle = typeof rawHandle === "string" ? rawHandle.replace(/^@/, "").trim() : "";
    if (!handle) {
      setEnriched(null);
      setError("No username available for this creator.");
      setEnrichmentLoading(false);
      return;
    }

    // Use cached enrichment from background enrichment if available
    if (cachedEnrichment) {
      console.log("[Enrich] Using prop-cached enrichment for:", handle);
      setEnriched(cachedEnrichment);
      setEnrichmentLoading(false);
      setError(null);
      setEnrichmentSource("prop");
      return;
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

    // Check Supabase cache first, then fall back to IC API
    (async () => {
      // 1. Check Supabase cache
      const cached = await getEnrichCache(handle, platform);
      if (cancelledRef.current || generationRef.current !== gen) return;

      if (cached) {
        console.log("[Enrich] Supabase cache hit for:", handle);
        setEnriched(cached);
        setEnrichmentLoading(false);
        setEnrichmentSource("cache");
        return;
      }

      // 2. Cache miss — call IC API (0.03 credits)
      console.log("[Enrich] Cache miss, calling IC API for:", handle);
      const timeoutId = setTimeout(() => {
        console.log("[Enrich] TIMEOUT: Aborting after 45 seconds");
        controller.abort();
      }, 45000);

      try {
        const payload = await enrichCreatorProfile(handle, controller.signal);
        clearTimeout(timeoutId);
        if (cancelledRef.current || generationRef.current !== gen) return;
        setEnrichmentLoading(false);
        setEnriched(payload);
        setError(null);
        setEnrichmentSource("api");

        // 3. Save to Supabase cache for future lookups
        if (payload) {
          setEnrichCache(handle, platform, payload);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (cancelledRef.current || generationRef.current !== gen) return;
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
    })();

    return () => {
      cancelledRef.current = true;
      controllerRef.current?.abort();
      controllerRef.current = null;
      // Do NOT set generationRef.current = 0 — it causes the winning request's .then to see gen !== ref and skip setEnriched (e.g. after Strict Mode first cleanup)
    };
  }, [open, creator?.id, creator?.username, username, cachedEnrichment]);

  /** Two-level response: result (top-level) + result.instagram (ig) */
  const resultTop = enriched?.result ?? {};
  const ig = enriched?.instagram;

  const igRecord = ig && typeof ig === "object" ? (ig as Record<string, unknown>) : undefined;
  const reelsObj = igRecord?.reels as Record<string, unknown> | undefined;

  // === DEBUG: Log enrichment data shape ===
  useEffect(() => {
    if (!enriched) return;
    console.log("[DEBUG-ENRICH] enriched object keys:", Object.keys(enriched));
    console.log("[DEBUG-ENRICH] resultTop keys:", Object.keys(resultTop));
    console.log("[DEBUG-ENRICH] igRecord keys:", igRecord ? Object.keys(igRecord) : "NO igRecord");
    if (igRecord) {
      console.log("[DEBUG-ENRICH] igRecord.post_data:", Array.isArray(igRecord.post_data) ? `Array(${(igRecord.post_data as unknown[]).length})` : typeof igRecord.post_data, igRecord.post_data);
      console.log("[DEBUG-ENRICH] igRecord analytics fields:", {
        avg_likes: igRecord.avg_likes, avg_like_count: igRecord.avg_like_count, average_likes: igRecord.average_likes,
        avg_comments: igRecord.avg_comments, avg_comment_count: igRecord.avg_comment_count,
        avg_views: igRecord.avg_views, avg_view_count: igRecord.avg_view_count, avg_reels_plays: igRecord.avg_reels_plays,
        media_count: igRecord.media_count, number_of_posts: igRecord.number_of_posts,
        posting_frequency_recent_months: igRecord.posting_frequency_recent_months, posts_per_month: igRecord.posts_per_month,
        follower_count: igRecord.follower_count, engagement_percent: igRecord.engagement_percent,
        reels: igRecord.reels,
      });
      // Log first post_data item if present
      if (Array.isArray(igRecord.post_data) && (igRecord.post_data as unknown[]).length > 0) {
        console.log("[DEBUG-ENRICH] post_data[0]:", JSON.stringify((igRecord.post_data as unknown[])[0]).substring(0, 500));
      }
    }
  }, [enriched, resultTop, igRecord]);
  const tiktokData = (resultTop as Record<string, unknown>).tiktok as Record<string, unknown> | undefined;
  const youtubeData = (resultTop as Record<string, unknown>).youtube as Record<string, unknown> | undefined;
  const twitterData = (resultTop as Record<string, unknown>).twitter as Record<string, unknown> | undefined;

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
  }, [resultTop.creator_has, resultTop.accounts, resultTop.platform_links, resultTop.username, enriched, tiktokData, youtubeData, twitterData, ig, igRecord, creator?.socialPlatforms, creator?.platforms, creator?.username]);

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

  const handleInviteToEvent = async (eventId: string, eventTitle: string) => {
    if (!creator) return;
    setInvitingEvent(true);
    try {
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
      if (err) throw err;
      toast.success(`Invited ${creator.name} to ${eventTitle}`);
      setEventDropdownOpen(false);
    } catch {
      toast.error("Failed to invite to event");
    } finally {
      setInvitingEvent(false);
    }
  };

  const handleVerifyMilitary = () => {
    const BRANCH_PATTERNS: [RegExp, string][] = [
      [/\barmy\b/i, "Army"],
      [/\bnavy\b/i, "Navy"],
      [/\bair\s*force\b/i, "Air Force"],
      [/\bmarine[s]?\b|\busmc\b/i, "Marines"],
      [/\bcoast\s*guard\b/i, "Coast Guard"],
      [/\bspace\s*force\b/i, "Space Force"],
    ];
    const RANK_PATTERNS = /\b(Private|Corporal|Specialist|Sergeant|Staff Sergeant|Gunnery Sergeant|First Sergeant|Master Sergeant|Sergeant Major|Lieutenant|Captain|Major|Colonel|General|Admiral|Commander|Petty Officer|Seaman|Airman|Warrant Officer)\b/i;
    const bioText = (igRecord?.biography as string) ?? creator?.bio ?? "";
    const fullName = (igRecord?.full_name as string) ?? creator?.name ?? "";
    let claimedBranch = "";
    for (const [pattern, branch] of BRANCH_PATTERNS) {
      if (pattern.test(bioText) || pattern.test(fullName)) { claimedBranch = branch; break; }
    }
    const rankMatch = bioText.match(RANK_PATTERNS);
    const claimedRank = rankMatch ? rankMatch[1] : "";
    // Gather links from enrichment
    const linkedinUrl = (() => {
      const profiles = resultTop.profiles as { url?: string; network?: string }[] | undefined;
      if (Array.isArray(profiles)) {
        const li = profiles.find((p) => p.network === "linkedin" || (p.url ?? "").includes("linkedin"));
        if (li?.url) return li.url;
      }
      const links = (resultTop.other_links as string[]) ?? (resultTop.links_in_bio as string[]) ?? [];
      if (Array.isArray(links)) {
        const li = links.find((u) => typeof u === "string" && u.includes("linkedin.com"));
        if (li) return li;
      }
      return "";
    })();
    const websiteUrl = (() => {
      const links = (resultTop.other_links as string[]) ?? (resultTop.links_in_bio as string[]) ?? [];
      if (Array.isArray(links)) {
        const site = links.find((u) => typeof u === "string" && !u.includes("linkedin") && !u.includes("instagram") && !u.includes("tiktok") && !u.includes("youtube") && !u.includes("twitter") && !u.includes("facebook"));
        if (site) return site;
      }
      return "";
    })();
    const platforms = availablePlatforms.map((p) => `${p}: @${displayUsername}`).join(", ");
    const notes = [bioText, platforms].filter(Boolean).join("\n\n");
    // Extract city/state from location string (e.g. "San Diego, CA" or "San Diego, California, US")
    let prefillCity = "";
    let prefillState = "";
    if (location) {
      const parts = location.split(",").map((s: string) => s.trim());
      if (parts.length >= 2) {
        prefillCity = parts[0];
        const stateCandidate = parts[1].replace(/,?\s*(US|USA|United States)$/i, "").trim();
        // Accept 2-letter state codes or full state names
        if (stateCandidate.length === 2) prefillState = stateCandidate.toUpperCase();
        else prefillState = stateCandidate;
      } else if (parts.length === 1) {
        prefillCity = parts[0];
      }
    }
    onOpenChange(false);
    navigate("/verification", {
      state: {
        prefill: {
          fullName,
          claimedBranch,
          claimedRank,
          claimedStatus: "veteran",
          linkedinUrl,
          websiteUrl,
          notes,
          city: prefillCity,
          state: prefillState,
          source: "discovery",
          sourceUsername: displayUsername,
        },
      },
    });
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

  const bio = useMemo(() => {
    if (selectedPlatform === "tiktok" && tiktokData) {
      return (tiktokData.biography as string) ?? (tiktokData.bio as string) ?? creator?.bio ?? "";
    }
    if (selectedPlatform === "youtube" && youtubeData) {
      return (youtubeData.description as string) ?? (youtubeData.biography as string) ?? creator?.bio ?? "";
    }
    if (selectedPlatform === "twitter" && twitterData) {
      return (twitterData.biography as string) ?? (twitterData.bio as string) ?? (twitterData.description as string) ?? creator?.bio ?? "";
    }
    return (igRecord?.biography as string) ?? creator?.bio ?? "";
  }, [selectedPlatform, tiktokData, youtubeData, twitterData, igRecord, creator?.bio]);
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

  const { followers, engagement, mediaCount, postsPerMonth, avgLikes, avgComments, avgSpecial, avgViews } = useMemo(() => {
    if (selectedPlatform === "tiktok" && tiktokData) {
      return {
        followers: Number(tiktokData.follower_count ?? 0),
        engagement: Number(tiktokData.engagement_percent ?? 0),
        mediaCount: Number(tiktokData.media_count ?? tiktokData.video_count ?? 0),
        postsPerMonth: Number(tiktokData.posting_frequency_recent_months ?? 0),
        avgLikes: Number(tiktokData.avg_likes ?? tiktokData.avg_like_count ?? 0),
        avgComments: Number(tiktokData.avg_comments ?? tiktokData.avg_comment_count ?? 0),
        avgSpecial: Number(tiktokData.avg_shares ?? tiktokData.avg_share_count ?? 0),
        avgViews: Number(tiktokData.avg_view_count ?? tiktokData.avg_views ?? 0),
      };
    }
    if (selectedPlatform === "youtube" && youtubeData) {
      return {
        followers: Number(youtubeData.subscriber_count ?? youtubeData.follower_count ?? 0),
        engagement: Number(youtubeData.engagement_percent ?? 0),
        mediaCount: Number(youtubeData.video_count ?? youtubeData.media_count ?? 0),
        postsPerMonth: Number(youtubeData.posting_frequency_recent_months ?? 0),
        avgLikes: Number(youtubeData.avg_likes ?? youtubeData.avg_like_count ?? 0),
        avgComments: Number(youtubeData.avg_comments ?? youtubeData.avg_comment_count ?? 0),
        avgSpecial: Number(youtubeData.avg_short_plays ?? youtubeData.avg_shorts_plays ?? 0),
        avgViews: Number(youtubeData.avg_view_count ?? youtubeData.avg_views ?? 0),
      };
    }
    if (selectedPlatform === "twitter" && twitterData) {
      return {
        followers: Number(twitterData.follower_count ?? 0),
        engagement: Number(twitterData.engagement_percent ?? 0),
        mediaCount: Number(twitterData.media_count ?? twitterData.tweet_count ?? twitterData.statuses_count ?? 0),
        postsPerMonth: Number(twitterData.posting_frequency_recent_months ?? 0),
        avgLikes: Number(twitterData.avg_likes ?? twitterData.avg_like_count ?? 0),
        avgComments: Number(twitterData.avg_comments ?? twitterData.avg_comment_count ?? twitterData.avg_replies ?? 0),
        avgSpecial: Number(twitterData.avg_retweets ?? twitterData.avg_retweet_count ?? 0),
        avgViews: Number(twitterData.avg_views ?? twitterData.avg_view_count ?? twitterData.avg_impressions ?? 0),
      };
    }
    // RAW endpoint: compute from post_data. FULL endpoint: use direct fields.
    const fc = Number(igRecord?.follower_count ?? creator?.followers ?? 0);
    const computed = computeFromPostData(igRecord, fc);
    console.log("[DEBUG-STATS] Instagram default — fc:", fc, "computed:", computed, "igRecord?.media_count:", igRecord?.media_count, "igRecord?.number_of_posts:", igRecord?.number_of_posts);
    return {
      followers: fc,
      engagement: Number(igRecord?.engagement_percent ?? igRecord?.engagement_rate ?? 0) || computed.engagement || Number(creator?.engagementRate ?? 0),
      mediaCount: Number(igRecord?.media_count ?? igRecord?.number_of_posts ?? 0),
      postsPerMonth: Number(igRecord?.posting_frequency_recent_months ?? igRecord?.posts_per_month ?? igRecord?.posting_frequency ?? 0) || computed.postsPerMonth,
      avgLikes: Number(igRecord?.avg_likes ?? igRecord?.avg_like_count ?? igRecord?.average_likes ?? 0) || computed.avgLikes,
      avgComments: Number(igRecord?.avg_comments ?? igRecord?.avg_comment_count ?? igRecord?.average_comments ?? 0) || computed.avgComments,
      avgSpecial: Number(reelsObj?.avg_like_count ?? reelsObj?.avg_likes ?? igRecord?.avg_reel_likes ?? 0),
      avgViews: Number(reelsObj?.avg_view_count ?? igRecord?.avg_reels_plays ?? igRecord?.average_reels_plays ?? igRecord?.avg_views ?? igRecord?.avg_view_count ?? 0) || computed.avgViews,
    };
  }, [selectedPlatform, tiktokData, youtubeData, twitterData, igRecord, reelsObj, creator]);

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
    let platData: Record<string, unknown> | undefined;
    if (selectedPlatform === "tiktok") platData = tiktokData;
    else if (selectedPlatform === "youtube") platData = youtubeData;
    else if (selectedPlatform === "twitter") platData = twitterData;
    else platData = igRecord;
    if (!platData) return [];
    const raw = platData.hashtags ?? platData.frequently_used_hashtags ?? platData.top_hashtags ?? platData.popular_hashtags ?? platData.tags;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 10).map((t: unknown) => {
      if (typeof t === "string") return t.replace(/^#/, "");
      if (t && typeof t === "object" && "name" in t) return String((t as { name: string }).name).replace(/^#/, "");
      return String(t);
    });
  }, [selectedPlatform, tiktokData, youtubeData, twitterData, igRecord]);

  const postEngagementData = useMemo(() => {
    let platRecord: Record<string, unknown> | undefined;
    if (selectedPlatform === "tiktok") platRecord = tiktokData;
    else if (selectedPlatform === "youtube") platRecord = youtubeData;
    else if (selectedPlatform === "twitter") platRecord = twitterData;
    else platRecord = igRecord;

    const raw = platRecord?.post_data;
    if (!Array.isArray(raw) || followers <= 0) return [];
    return raw.slice(0, 12).map((item: Record<string, unknown>, i: number) => {
      const eng = item.engagement as Record<string, unknown> | undefined;
      const likes = Number(eng?.likes ?? 0);
      const comments = Number(eng?.comments ?? 0);
      const er = ((likes + comments) / followers) * 100;
      return { post: `P${i + 1}`, er: Number(er.toFixed(2)) };
    });
  }, [selectedPlatform, tiktokData, youtubeData, twitterData, igRecord, followers]);

  const { incomeMin, incomeMax, income, followerGrowth, growthData, reelsPct } = useMemo(() => {
    // Pick the platform-specific data record for analytics
    let platRecord: Record<string, unknown> | undefined;
    if (selectedPlatform === "tiktok") platRecord = tiktokData;
    else if (selectedPlatform === "youtube") platRecord = youtubeData;
    else if (selectedPlatform === "twitter") platRecord = twitterData;
    else platRecord = igRecord;

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

    const gData: { period: string; growth: number }[] = [];
    if (growthRec && typeof growthRec === "object") {
      if (growthRec["12_months_ago"] != null) gData.push({ period: "12mo", growth: Number(growthRec["12_months_ago"]) });
      if (growthRec["6_months_ago"] != null) gData.push({ period: "6mo", growth: Number(growthRec["6_months_ago"]) });
      if (growthRec["3_months_ago"] != null) gData.push({ period: "3mo", growth: Number(growthRec["3_months_ago"]) });
    }

    return {
      incomeMin: iMin,
      incomeMax: iMax,
      income: formatIncome(iMin, iMax),
      followerGrowth: fGrowth,
      growthData: gData,
      reelsPct: rPct,
    };
  }, [selectedPlatform, tiktokData, youtubeData, twitterData, igRecord]);

  const showEnrichmentLoading = enrichmentLoading && !enrichmentTimedOut;
  const engagementDisplay = engagement != null && engagement > 0 ? engagement : null;
  const hasDataForPlatform =
    (selectedPlatform === "instagram" && !!ig) ||
    (selectedPlatform === "tiktok" && !!tiktokData) ||
    (selectedPlatform === "youtube" && !!youtubeData) ||
    (selectedPlatform === "twitter" && !!twitterData);

  const recentPosts: PostItem[] = useMemo(() => {
    const raw = igRecord?.post_data;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 12).map((item: Record<string, unknown>) => {
      const media = item.media as unknown[] | undefined;
      const firstMedia = Array.isArray(media) && media[0] && typeof media[0] === "object" ? (media[0] as Record<string, unknown>) : undefined;
      const engagement = item.engagement as Record<string, unknown> | undefined;
      return {
        id: String(item.post_id ?? item.id ?? Math.random()),
        thumbnail: (firstMedia?.url ?? item.thumbnail ?? item.image_url) as string | undefined,
        caption: (item.caption as string) ?? undefined,
        likes: Number(engagement?.likes ?? item.likes ?? 0),
        comments: Number(engagement?.comments ?? item.comments ?? 0),
        date: (item.created_at as string) ?? undefined,
        permalink: (item.post_url as string) ?? undefined,
      };
    });
  }, [igRecord?.post_data]);

  const similarAccounts: SimilarAccount[] = useMemo(() => {
    const raw = resultTop.lookalikes;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 12).map((item: Record<string, unknown>) => ({
      id: String(item.username ?? Math.random()),
      username: item.username as string | undefined,
      name: (item.full_name ?? item.username) as string | undefined,
      full_name: item.full_name as string | undefined,
      avatar: (item.profile_picture ?? item.picture) as string | undefined,
      picture: item.picture as string | undefined,
      followers: Number(item.follower_count ?? item.followers ?? 0),
      follower_count: Number(item.follower_count ?? item.followers ?? 0),
      engagement_percent: Number(item.engagement_percent ?? 0),
      profile_url: item.profile_url as string | undefined,
    }));
  }, [resultTop.lookalikes]);

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
          "w-full border-l border-border dark:border-gray-800 bg-card dark:bg-[#1A1D27] p-0 sm:max-w-[90%]",
          "flex flex-col overflow-hidden"
        )}
      >
        <div className="flex h-full flex-col md:flex-row overflow-hidden">
          {/* Left panel - fixed ~350px */}
          <div className="flex w-full flex-col border-r border-border dark:border-gray-800 bg-white dark:bg-[#0F1117] p-6 md:w-[350px] shrink-0">
            <div className="mx-auto mb-4 h-40 w-40 rounded-full overflow-hidden relative border-2 border-gray-200 dark:border-gray-700">
              {modalAvatarSrc ? (
                <img
                  src={modalAvatarSrc}
                  alt={displayName}
                  className="w-full h-full object-cover"
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
            <p className="text-lg font-bold text-center text-gray-900 dark:text-white">
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
                className="text-sm text-center text-[#1e3a5f] hover:underline mb-2 block"
              >
                @{displayUsername}
              </a>
            )}
            {/* Enrichment status badge */}
            <div className="flex justify-center mb-2">
              {showEnrichmentLoading && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" /> Enriching… (0.03 credits)
                </span>
              )}
              {enrichmentSource === "cache" && !showEnrichmentLoading && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  <Check className="h-3 w-3" /> Cached
                </span>
              )}
            </div>
            {detectedBranch && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", BRANCH_STYLES[detectedBranch] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400")}>
                  {detectedBranch}
                </span>
                <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-0.5 text-[11px] font-semibold">
                  Veteran
                </span>
              </div>
            )}
            <div className="space-y-2">
              {/* ── Add to List ── */}
              <div className="relative" ref={listDropdownRef}>
                <Button
                  className="w-full bg-[#1e3a5f] hover:bg-[#2d5282] text-white rounded-lg"
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
                  + Add to List
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

              {/* ── Add to Directory ── */}
              {!hideDirectoryActions && (
                <div className="relative" ref={dirDropdownRef}>
                  <Button
                    variant="outline"
                    className="w-full bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-500 border-blue-400 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/50 rounded-lg"
                    disabled={approvingDir}
                    onClick={() => { setDirDropdownOpen(!dirDropdownOpen); setListDropdownOpen(false); setEventDropdownOpen(false); }}
                  >
                    {approvingDir ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
                    Add to Directory
                    <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                  {dirDropdownOpen && (
                    <div className="absolute left-0 right-0 bottom-full mb-1 z-50 bg-white dark:bg-[#1A1D27] rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 max-h-[200px] overflow-y-auto">
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
                  )}
                </div>
              )}

              {/* ── Invite to Event ── */}
              {!hideDirectoryActions && (
                <div className="relative" ref={eventDropdownRef}>
                  <Button
                    variant="outline"
                    className="w-full bg-white dark:bg-transparent text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
                    disabled={invitingEvent}
                    onClick={() => { setEventDropdownOpen(!eventDropdownOpen); setListDropdownOpen(false); setDirDropdownOpen(false); }}
                  >
                    {invitingEvent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
                    Invite to Event
                    <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                  {eventDropdownOpen && (
                    <div className="absolute left-0 right-0 bottom-full mb-1 z-50 bg-white dark:bg-[#1A1D27] rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 max-h-[200px] overflow-y-auto">
                      {eventsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        </div>
                      ) : eventsList.length === 0 ? (
                        <div className="py-3 px-3 text-xs text-gray-400 text-center">No upcoming events</div>
                      ) : (
                        eventsList.map((evt) => (
                          <button
                            key={evt.id}
                            type="button"
                            onClick={() => handleInviteToEvent(evt.id, evt.title)}
                            className="w-full flex items-center gap-2.5 py-2 px-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm text-gray-700 dark:text-gray-300 text-left transition-colors"
                          >
                            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                              <CalendarPlus className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium">{evt.title}</p>
                              <p className="text-[10px] text-gray-400">
                                {new Date(evt.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {onRemoveFromDirectory && (
                <Button
                  variant="outline"
                  className="w-full bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-950/40 rounded-lg"
                  onClick={onRemoveFromDirectory}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove from Directory
                </Button>
              )}
              {!hideDirectoryActions && (
                <Button
                  variant="outline"
                  className="w-full bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-500 border-blue-400 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/50 rounded-lg"
                  onClick={handleVerifyMilitary}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Verify Military Status
                </Button>
              )}
            </div>
            <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
            <div className="space-y-0 text-sm">
              {[
                { label: statLabels.followers, value: followers ? formatNumber(followers) : null },
                { label: "Engagement Rate", value: engagement != null && engagement > 0 ? formatPercent(engagement) : null },
                { label: statLabels.mediaCount, value: mediaCount ? formatNumber(mediaCount) : null },
                { label: statLabels.postsPerMonth, value: postsPerMonth ? formatNumber(postsPerMonth) : null },
                { label: statLabels.avgViews, value: avgViews ? formatNumber(avgViews) : null },
                { label: statLabels.avgSpecial, value: avgSpecial ? formatNumber(avgSpecial) : null },
                { label: statLabels.avgLikes, value: avgLikes ? formatNumber(avgLikes) : null },
                { label: statLabels.avgComments, value: avgComments ? formatNumber(avgComments) : null },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">{label}</span>
                  {showEnrichmentLoading && !value ? (
                    <Skeleton className="h-4 w-16 animate-pulse" />
                  ) : (
                    <span className={cn("font-semibold text-gray-900 dark:text-white transition-opacity duration-500", value ? "opacity-100" : "opacity-60")}>{value ?? "—"}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right panel - flex-1 scrollable */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {error && (
              <div className="p-4 text-sm text-destructive bg-destructive/10 border-b border-border shrink-0">
                {error}
              </div>
            )}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Platform tabs - pills with platform-specific colors and per-platform handles */}
                <div className="flex flex-wrap gap-2">
                  {availablePlatforms.map((p) => {
                    const isActive = selectedPlatform.toLowerCase() === p.toLowerCase();
                    const style = PLATFORM_PILL_STYLES[p.toLowerCase()];
                    const label = PLATFORM_LABELS[p.toLowerCase()] ?? p;
                    const handle = platformHandles.get(p.toLowerCase()) || displayUsername;
                    const IconComp = style?.icon ?? Video;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedPlatform(p.toLowerCase())}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? (style?.active ?? "bg-[#1e3a5f] text-white")
                            : (style?.inactive ?? "bg-gray-200 text-gray-600 hover:bg-gray-300")
                        )}
                      >
                        <IconComp className="h-4 w-4" />
                        {handle ? `@${handle}` : label}
                      </button>
                    );
                  })}
                </div>

                {!hasDataForPlatform && !enrichmentLoading && (
                  <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border dark:border-gray-700 bg-muted/20 dark:bg-[#0F1117] p-4">
                    Data not available for this platform.
                  </p>
                )}

                {hasDataForPlatform && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-muted/30 dark:bg-[#0F1117] p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">{PLATFORM_LABELS[selectedPlatform] ?? selectedPlatform}</p>
                    <div className="flex flex-wrap gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground">{statLabels.followers}</p>
                        <p className="text-lg font-bold text-[#000741] dark:text-white">{formatNumber(followers)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Engagement</p>
                        <p className="text-lg font-bold text-[#000741] dark:text-white">{formatPercent(engagement)}</p>
                      </div>
                      {mediaCount > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground">{statLabels.mediaCount}</p>
                          <p className="text-lg font-bold text-[#000741] dark:text-white">{formatNumber(mediaCount)}</p>
                        </div>
                      )}
                      {avgViews > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Views</p>
                          <p className="text-lg font-bold text-[#000741] dark:text-white">{formatNumber(avgViews)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Info grid - 3 columns in light gray/blue-50 card */}
                <div className="rounded-xl bg-blue-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Bio</p>
                      {showEnrichmentLoading && !bio ? (
                        <div className="mt-1 space-y-1">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-4/5" />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-line">{bio || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Name</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{displayName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Location</p>
                      {showEnrichmentLoading && !location ? (
                        <Skeleton className="h-4 w-32 mt-1" />
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{location || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Language</p>
                      {showEnrichmentLoading && !language ? (
                        <Skeleton className="h-4 w-20 mt-1" />
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{language || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Business Category</p>
                      {showEnrichmentLoading && !category ? (
                        <Skeleton className="h-4 w-24 mt-1" />
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{category || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Email</p>
                      {showEnrichmentLoading && !enrichedEmail ? (
                        <Skeleton className="h-4 w-32 mt-1" />
                      ) : enrichedEmail ? (
                        <a href={`mailto:${enrichedEmail}`} className="text-sm text-[#1e3a5f] hover:underline mt-1 flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 shrink-0" /> {enrichedEmail}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">—</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Platform Links - circular social icons, only for platforms creator has */}
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Platform Links</p>
                  <div className="flex flex-wrap gap-3">
                    {availablePlatforms.map((p) => {
                      const href =
                        p === "instagram"
                          ? `https://instagram.com/${displayUsername}`
                          : p === "tiktok"
                            ? (tiktokData?.username ? `https://tiktok.com/@${tiktokData.username}` : `https://tiktok.com/@${displayUsername}`)
                            : p === "youtube"
                              ? (youtubeData?.custom_url ?? (youtubeData?.channel_id ? `https://youtube.com/channel/${youtubeData.channel_id}` : `https://youtube.com/@${displayUsername}`))
                              : p === "twitter"
                                ? `https://x.com/${(twitterData?.username as string) ?? displayUsername}`
                                : p === "linkedin"
                                  ? `https://linkedin.com/in/${displayUsername}`
                                  : "#";
                      return (
                        <a
                          key={p}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-[#1e3a5f] hover:text-white transition-colors"
                          title={PLATFORM_LABELS[p] ?? p}
                        >
                          {(p === "instagram" && <Instagram className="h-5 w-5" />) ||
                            (p === "tiktok" && <TikTokIcon className="h-5 w-5" />) ||
                            (p === "youtube" && <Youtube className="h-5 w-5" />) ||
                            (p === "facebook" && <Facebook className="h-5 w-5" />) ||
                            (p === "twitter" && <X className="h-5 w-5" />) || (
                              <ExternalLink className="h-5 w-5" />
                            )}
                        </a>
                      );
                    })}
                  </div>
                </div>

                {/* Links Used - pill badges */}
                {(platformLinksFromEnrichment.links.length > 0 || platformLinksFromEnrichment.othersCount > 0) && (
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Links Used</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      {platformLinksFromEnrichment.links.map(({ url }) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1 text-sm text-[#1e3a5f] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors truncate max-w-[220px]"
                          title={url}
                        >
                          <Link className="h-3 w-3 shrink-0" />
                          <span className="truncate">{url.replace(/^https?:\/\//, "").slice(0, 28)}…</span>
                        </a>
                      ))}
                      {platformLinksFromEnrichment.othersCount > 0 && (
                        <span className="rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                          + {platformLinksFromEnrichment.othersCount} others
                        </span>
                      )}
                    </div>
                  </div>
                )}

                  {/* Tab bar: Analytics | Posts | Similar Accounts */}
                  <Tabs defaultValue="analytics" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 gap-2 h-auto">
                      <TabsTrigger
                        value="analytics"
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white data-[state=active]:border-[#1e3a5f] text-gray-600 dark:text-gray-400 py-2.5"
                      >
                        <BarChart3 className="h-4 w-4" /> Analytics
                      </TabsTrigger>
                      <TabsTrigger
                        value="posts"
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white data-[state=active]:border-[#1e3a5f] text-gray-600 dark:text-gray-400 py-2.5"
                      >
                        <Image className="h-4 w-4" /> Posts
                      </TabsTrigger>
                      <TabsTrigger
                        value="similar"
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white data-[state=active]:border-[#1e3a5f] text-gray-600 dark:text-gray-400 py-2.5"
                      >
                        <Users className="h-4 w-4" /> Similar Accounts
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="analytics" className="mt-4 space-y-5">
                      {/* Follower Growth Chart */}
                      {growthData.length > 0 ? (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Follower Growth</p>
                          <div className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={growthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`} />
                                <Tooltip formatter={(value: number) => [`${value > 0 ? "+" : ""}${value.toFixed(2)}%`, "Growth"]} />
                                <Bar dataKey="growth" radius={[4, 4, 0, 0]}>
                                  {growthData.map((entry, i) => (
                                    <Cell key={i} fill={entry.growth >= 0 ? "#22c55e" : "#ef4444"} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          {followerGrowth && (
                            <p className="text-xs text-muted-foreground mt-2">{String(followerGrowth)}</p>
                          )}
                        </div>
                      ) : showEnrichmentLoading ? (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Follower Growth</p>
                          <Skeleton className="h-44 w-full" />
                        </div>
                      ) : null}

                      {/* Engagement Per Post */}
                      {postEngagementData.length > 0 && (
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
                      )}

                      {/* Key Metrics Grid */}
                      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                        <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Key Metrics</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: "Avg Likes", value: avgLikes, fmt: formatNumber },
                            { label: "Avg Comments", value: avgComments, fmt: formatNumber },
                            { label: "Avg Views", value: avgViews, fmt: formatNumber },
                            { label: statLabels.postsPerMonth, value: postsPerMonth, fmt: (v: number) => `${formatNumber(v)}/mo` },
                          ].filter(({ value }) => value > 0).map(({ label, value, fmt }) => (
                            <div key={label} className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 text-center">
                              <p className="text-lg font-bold text-[#000741] dark:text-white">{fmt(value)}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                            </div>
                          ))}
                        </div>
                        {selectedPlatform === "instagram" && reelsPct > 0 && (
                          <p className="text-xs text-muted-foreground mt-3">Reels make up {reelsPct}% of last 12 posts</p>
                        )}
                      </div>

                      {/* Estimated Income */}
                      {(incomeMin != null && incomeMax != null && (incomeMin > 0 || incomeMax > 0)) ? (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Estimated Income</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            @{displayUsername || "handle"} generated between{" "}
                            <span className="font-bold text-[#1e3a5f]">${formatNum(incomeMin)}</span> and{" "}
                            <span className="font-bold text-[#1e3a5f]">${formatNum(incomeMax)}</span> in income in the last 90 days.
                          </p>
                        </div>
                      ) : showEnrichmentLoading ? (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Estimated Income</p>
                          <Skeleton className="h-4 w-full max-w-md" />
                        </div>
                      ) : null}

                      {/* Hashtag Cloud */}
                      {platformHashtags.length > 0 && (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Top Hashtags</p>
                          <div className="flex flex-wrap gap-2">
                            {platformHashtags.map((tag: string, i: number) => {
                              const sizes = ["text-lg", "text-base", "text-base", "text-sm", "text-sm", "text-sm", "text-xs", "text-xs", "text-xs", "text-xs"];
                              const opacities = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55];
                              return (
                                <span
                                  key={tag}
                                  className={cn(
                                    "inline-block rounded-lg bg-[#1e3a5f]/10 px-3 py-1.5 font-medium text-[#1e3a5f] transition-colors hover:bg-[#1e3a5f]/20",
                                    sizes[i] ?? "text-xs"
                                  )}
                                  style={{ opacity: opacities[i] ?? 0.55 }}
                                >
                                  #{tag}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="posts" className="mt-4">
                      {recentPosts.length === 0 ? (
                        <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border dark:border-gray-700 bg-muted/20 dark:bg-[#0F1117] p-4">
                          No post data available.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {recentPosts.map((post) => (
                            <a
                              key={post.id}
                              href={post.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-muted/30 dark:bg-[#0F1117] hover:shadow-md transition-shadow"
                            >
                              {post.thumbnail ? (
                                <img src={post.thumbnail} alt="" className="w-full aspect-square object-cover" />
                              ) : (
                                <div className="w-full aspect-square bg-muted flex items-center justify-center">
                                  <Image className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                              <div className="p-2">
                                <p className="text-xs text-muted-foreground line-clamp-2">{post.caption || "—"}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <span>{formatNumber(post.likes)} likes</span>
                                  <span>{formatNumber(post.comments)} comments</span>
                                </div>
                                {post.date && <p className="text-xs text-muted-foreground mt-0.5">{post.date}</p>}
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="similar" className="mt-4">
                      {similarAccounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border dark:border-gray-700 bg-muted/20 dark:bg-[#0F1117] p-4">
                          No similar creators found.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {similarAccounts.map((acc) => (
                            <a
                              key={acc.id ?? acc.username}
                              href={acc.profile_url ?? (acc.username ? `https://instagram.com/${acc.username}` : "#")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4 hover:shadow-md transition-shadow"
                            >
                              {acc.avatar ? (
                                <img src={acc.avatar} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <Users className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-[#000741] dark:text-white truncate">@{acc.username ?? "—"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatNumber(acc.followers ?? acc.follower_count)} followers
                                  {acc.engagement_percent != null && acc.engagement_percent > 0 && ` · ${formatPercent(acc.engagement_percent)} engagement`}
                                </p>
                              </div>
                              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}
