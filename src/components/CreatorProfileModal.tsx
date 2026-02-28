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
  fullEnrichCreatorProfile,
  logCreditUsage,
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
  MapPin,
  Globe,
  Briefcase,
  Ban,
  TrendingUp,
  ChevronRight,
  MoreHorizontal,
  Camera,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
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
import CreateListModal from "@/components/CreateListModal";

/** TikTok branded SVG icon with teal/pink accent */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.82a4.84 4.84 0 01-1-.13z" fill="currentColor" />
    </svg>
  );
}

/** Instagram gradient SVG icon */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FEDA75" />
          <stop offset="25%" stopColor="#FA7E1E" />
          <stop offset="50%" stopColor="#D62976" />
          <stop offset="75%" stopColor="#962FBF" />
          <stop offset="100%" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-grad)" strokeWidth="2" />
      <circle cx="12" cy="12" r="5" stroke="url(#ig-grad)" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig-grad)" />
    </svg>
  );
}

/** YouTube red play button SVG icon */
function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#FF0000" />
      <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FFF" />
    </svg>
  );
}

/** X (Twitter) black icon */
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** LinkedIn blue icon */
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2" />
    </svg>
  );
}

/** Facebook blue icon */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2" />
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

/** Render the branded colored icon for a platform */
function PlatformBrandIcon({ platform, className }: { platform: string; className?: string }) {
  switch (platform) {
    case "instagram": return <InstagramIcon className={className} />;
    case "tiktok": return <TikTokIcon className={className} />;
    case "youtube": return <YoutubeIcon className={className} />;
    case "twitter": return <XIcon className={className} />;
    case "facebook": return <FacebookIcon className={className} />;
    case "linkedin": return <LinkedInIcon className={className} />;
    default: return <ExternalLink className={cn(className, "text-gray-500")} />;
  }
}

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
  // Get Email state
  const [fetchingEmail, setFetchingEmail] = useState(false);
  const [fetchedEmail, setFetchedEmail] = useState<string | null>(null);
  const [emailNotFound, setEmailNotFound] = useState(false);
  const [platformEnrichments, setPlatformEnrichments] = useState<Record<string, Record<string, unknown>>>({});

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
      userSelectedPlatformRef.current = false;
      return;
    }
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
        const payload = await enrichCreatorProfile(handle, controller.signal, "instagram", true);
        clearTimeout(timeoutId);
        if (cancelledRef.current || generationRef.current !== gen) return;

        // Validate the returned profile belongs to the requested creator
        const returnedUsername = (payload?.instagram?.username as string)?.toLowerCase();
        if (returnedUsername && returnedUsername !== handle.toLowerCase()) {
          console.warn(`[Enrich] API returned profile for "${returnedUsername}" but requested "${handle}" — discarding`);
          setEnrichmentLoading(false);
          setEnriched(null);
          setError(null);
          setEnrichmentTimedOut(true); // show "data unavailable" state
          return;
        }

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

  // ── Multi-platform enrichment: fetch TikTok, YouTube, etc. data ──
  // After IG enrichment is done, enrich other platforms the creator has (RAW, 0.03 credits each).
  useEffect(() => {
    if (!enriched || !open || !creator) return;
    const handle = (creator.username ?? "").replace(/^@/, "").trim();
    if (!handle) return;

    const otherPlatforms = (creator.socialPlatforms ?? creator.platforms ?? [])
      .map((p: string) => p.toLowerCase())
      .filter((p: string) => p !== "instagram");
    if (otherPlatforms.length === 0) return;

    const controller = new AbortController();
    let cancelled = false;

    otherPlatforms.forEach(async (platform: string) => {
      if (cancelled) return;
      try {
        const data = await enrichCreatorProfile(handle, controller.signal, platform, false);
        if (cancelled) return;
        if (data?.instagram && typeof data.instagram === "object") {
          const pd = data.instagram as Record<string, unknown>;
          console.log(`[Enrich] Multi-platform ${platform} ALL KEYS:`, Object.keys(pd));
          console.log(`[Enrich] Multi-platform ${platform} stats:`, {
            follower_count: pd.follower_count,
            subscriber_count: pd.subscriber_count,
            engagement_percent: pd.engagement_percent,
            engagement_rate: pd.engagement_rate,
            media_count: pd.media_count,
            video_count: pd.video_count,
            avg_likes: pd.avg_likes,
            avg_views: pd.avg_view_count ?? pd.avg_views,
            post_data: Array.isArray(pd.post_data) ? `${(pd.post_data as unknown[]).length} posts` : "none",
          });
          setPlatformEnrichments(prev => ({ ...prev, [platform]: pd }));
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          console.warn(`[Enrich] Multi-platform ${platform} failed:`, err);
        }
      }
    });

    return () => { cancelled = true; controller.abort(); };
  }, [enriched, open, creator?.id, creator?.socialPlatforms, creator?.platforms]);

  /** Two-level response: result (top-level) + result.instagram (ig) */
  const resultTop = enriched?.result ?? {};
  const ig = enriched?.instagram;

  const igRecord = ig && typeof ig === "object" ? (ig as Record<string, unknown>) : undefined;
  const reelsObj = igRecord?.reels as Record<string, unknown> | undefined;

  // Comprehensive enrichment debug logging
  useEffect(() => {
    if (!enriched) return;
    console.log("FULL ENRICHMENT RESPONSE:", JSON.stringify(enriched, null, 2));
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
    // Log first post data structure for image debugging
    if (Array.isArray(igRecord?.post_data) && (igRecord!.post_data as unknown[]).length > 0) {
      const firstPost = (igRecord!.post_data as Record<string, unknown>[])[0];
      console.log("[Enrich] First post ALL keys:", Object.keys(firstPost));
      console.log("[Enrich] First post image fields:", {
        thumbnail: firstPost.thumbnail,
        image: firstPost.image,
        image_url: firstPost.image_url,
        display_url: firstPost.display_url,
        media_url: firstPost.media_url,
        media: firstPost.media,
        thumbnail_url: firstPost.thumbnail_url,
        video_url: firstPost.video_url,
      });
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
    // Resolve best avatar to carry over to Verification
    let resolvedPhoto = extractAvatarFromEnrichment(enriched) ?? creator?.avatar ?? null;
    if (resolvedPhoto && resolvedPhoto.includes("ui-avatars.com")) resolvedPhoto = null;
    if (resolvedPhoto) resolvedPhoto = resolvedPhoto.replace(/^http:\/\//i, "https://");

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
          profilePhotoUrl: resolvedPhoto || "",
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

    // Try to compute analytics from post_data (RAW endpoint), then check direct fields (FULL endpoint), then creator card fallbacks
    const computed = computeFromPostData(igRecord, fc);

    // Helper: pick first non-zero value
    const pick = (...vals: (number | undefined | null)[]): number => {
      for (const v of vals) {
        const n = Number(v);
        if (n && isFinite(n) && n > 0) return n;
      }
      return 0;
    };

    const result = {
      followers: fc,
      engagement: pick(igRecord?.engagement_percent as number, igRecord?.engagement_rate as number, computed.engagement, creator?.engagementRate),
      mediaCount: pick(igRecord?.media_count as number, igRecord?.number_of_posts as number, creator?.mediaCount),
      postsPerMonth: pick(igRecord?.posting_frequency_recent_months as number, igRecord?.posts_per_month as number, igRecord?.posting_frequency as number, computed.postsPerMonth, creator?.postsPerMonth),
      avgLikes: pick(igRecord?.avg_likes as number, igRecord?.avg_like_count as number, igRecord?.average_likes as number, computed.avgLikes, creator?.avgLikes),
      avgComments: pick(igRecord?.avg_comments as number, igRecord?.avg_comment_count as number, igRecord?.average_comments as number, computed.avgComments, creator?.avgComments),
      avgSpecial: pick(reelsObj?.avg_like_count as number, reelsObj?.avg_likes as number, igRecord?.avg_reel_likes as number, creator?.avgReelLikes),
      avgViews: pick(reelsObj?.avg_view_count as number, igRecord?.avg_reels_plays as number, igRecord?.average_reels_plays as number, igRecord?.avg_views as number, igRecord?.avg_view_count as number, computed.avgViews, creator?.avgViews),
    };
    console.log("[PlatformStats] IG result:", result, "enriched:", !!igRecord, "post_data:", Array.isArray(igRecord?.post_data) ? (igRecord!.post_data as unknown[]).length : "none");
    return result;
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
    (selectedPlatform === "twitter" && !!twitterData) ||
    (selectedPlatform === "facebook" && !!facebookData) ||
    (selectedPlatform === "linkedin" && !!linkedinData);

  const recentPosts: PostItem[] = useMemo(() => {
    let platRecord: Record<string, unknown> | undefined;
    if (selectedPlatform === "tiktok") platRecord = tiktokData;
    else if (selectedPlatform === "youtube") platRecord = youtubeData;
    else if (selectedPlatform === "twitter") platRecord = twitterData;
    else platRecord = igRecord;

    const raw = platRecord?.post_data;
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
  }, [selectedPlatform, igRecord?.post_data, tiktokData, youtubeData, twitterData]);

  const similarAccounts: SimilarAccount[] = useMemo(() => {
    // Try multiple field names for lookalike/similar data
    const raw = resultTop.lookalikes ?? resultTop.similar_accounts ?? resultTop.similar_users ?? resultTop.related_accounts;
    if (!Array.isArray(raw)) {
      console.log("[Similar] No similar accounts found. Tried: lookalikes, similar_accounts, similar_users, related_accounts. Available result keys:", Object.keys(resultTop));
      return [];
    }
    console.log("[Similar] Found", raw.length, "similar accounts. First item keys:", raw[0] ? Object.keys(raw[0]) : "empty");
    return raw.slice(0, 12).map((item: Record<string, unknown>) => ({
      id: String(item.username ?? item.id ?? Math.random()),
      username: (item.username ?? item.handle) as string | undefined,
      name: (item.full_name ?? item.name ?? item.username) as string | undefined,
      full_name: (item.full_name ?? item.name) as string | undefined,
      avatar: (item.profile_picture ?? item.picture ?? item.avatar ?? item.profile_pic_url ?? item.avatar_url) as string | undefined,
      picture: item.picture as string | undefined,
      followers: Number(item.follower_count ?? item.followers ?? item.subscriber_count ?? 0),
      follower_count: Number(item.follower_count ?? item.followers ?? 0),
      engagement_percent: Number(item.engagement_percent ?? item.engagement_rate ?? 0),
      profile_url: item.profile_url as string | undefined,
      similarity: Number(item.similarity ?? item.similarity_score ?? item.score ?? 0),
    }));
  }, [resultTop.lookalikes, resultTop.similar_accounts, resultTop.similar_users, resultTop.related_accounts]);

  // ── Audience data hooks (only populated when FULL enrichment data available) ──

  const audienceGender = useMemo(() => {
    const raw = igRecord?.audience_gender ?? igRecord?.audience_genders ?? igRecord?.gender_split;
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
  }, [igRecord]);

  const audienceAge = useMemo(() => {
    const raw = igRecord?.audience_age ?? igRecord?.audience_ages ?? igRecord?.age_split;
    if (!Array.isArray(raw)) return [];
    return raw.map((item: Record<string, unknown>) => ({
      bracket: String(item.code ?? item.range ?? item.age_range ?? item.name ?? ""),
      percentage: (() => {
        const w = Number(item.weight ?? item.value ?? item.percentage ?? 0);
        return w > 1 ? w : w * 100;
      })(),
    })).filter((a: { bracket: string; percentage: number }) => a.bracket && a.percentage > 0)
      .sort((a: { percentage: number }, b: { percentage: number }) => b.percentage - a.percentage);
  }, [igRecord]);

  const audienceReachability = useMemo(() => {
    const raw = igRecord?.audience_reachability ?? igRecord?.audience_reach;
    if (!Array.isArray(raw)) return [];
    return raw.map((item: Record<string, unknown>) => ({
      label: String(item.code ?? item.name ?? item.label ?? ""),
      percentage: (() => {
        const w = Number(item.weight ?? item.value ?? item.percentage ?? 0);
        return w > 1 ? w : w * 100;
      })(),
    })).filter((a: { label: string; percentage: number }) => a.label && a.percentage > 0);
  }, [igRecord]);

  const audienceLanguages = useMemo(() => {
    const raw = igRecord?.audience_languages ?? igRecord?.audience_language;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 8).map((item: Record<string, unknown>) => ({
      language: String(item.code ?? item.name ?? item.language ?? ""),
      percentage: (() => {
        const w = Number(item.weight ?? item.value ?? item.percentage ?? 0);
        return w > 1 ? w : w * 100;
      })(),
    })).filter((a: { language: string; percentage: number }) => a.language && a.percentage > 0)
      .sort((a: { percentage: number }, b: { percentage: number }) => b.percentage - a.percentage);
  }, [igRecord]);

  const audienceCredibility = useMemo(() => {
    const raw = igRecord?.audience_credibility ?? igRecord?.credibility_score ?? igRecord?.audience_quality;
    if (raw == null) return null;
    const score = Number(raw);
    if (!isFinite(score)) return null;
    const level = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
    return { score, level };
  }, [igRecord]);

  const audienceBrandAffinity = useMemo(() => {
    const raw = igRecord?.audience_brand_affinity ?? igRecord?.brand_affinity;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 10).map((item: Record<string, unknown>) => ({
      name: String(item.name ?? item.brand ?? item.label ?? ""),
      percentage: (() => {
        const w = Number(item.weight ?? item.value ?? item.percentage ?? 0);
        return w > 1 ? w : w * 100;
      })(),
    })).filter((a: { name: string; percentage: number }) => a.name && a.percentage > 0);
  }, [igRecord]);

  const audienceInterests = useMemo(() => {
    const raw = igRecord?.audience_interests ?? igRecord?.interests;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 12).map((item: unknown) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") return String((item as Record<string, unknown>).name ?? (item as Record<string, unknown>).label ?? (item as Record<string, unknown>).interest ?? "");
      return "";
    }).filter(Boolean);
  }, [igRecord]);

  const crossPlatformSummary = useMemo(() => {
    const platformStats: { platform: string; followers: number; engagement: number }[] = [];
    if (igRecord) {
      platformStats.push({ platform: "Instagram", followers: Number(igRecord.follower_count ?? 0), engagement: Number(igRecord.engagement_percent ?? igRecord.engagement_rate ?? 0) });
    }
    if (tiktokData) {
      platformStats.push({ platform: "TikTok", followers: Number(tiktokData.follower_count ?? 0), engagement: Number(tiktokData.engagement_percent ?? 0) });
    }
    if (youtubeData) {
      platformStats.push({ platform: "YouTube", followers: Number(youtubeData.subscriber_count ?? youtubeData.follower_count ?? 0), engagement: Number(youtubeData.engagement_percent ?? 0) });
    }
    if (twitterData) {
      platformStats.push({ platform: "X", followers: Number(twitterData.follower_count ?? 0), engagement: Number(twitterData.engagement_percent ?? 0) });
    }
    if (facebookData) {
      platformStats.push({ platform: "Facebook", followers: Number(facebookData.follower_count ?? facebookData.page_likes ?? 0), engagement: Number(facebookData.engagement_percent ?? 0) });
    }
    if (linkedinData) {
      platformStats.push({ platform: "LinkedIn", followers: Number(linkedinData.follower_count ?? linkedinData.connections ?? 0), engagement: Number(linkedinData.engagement_percent ?? 0) });
    }
    const totalReach = platformStats.reduce((s, p) => s + p.followers, 0);
    const mostEngaged = platformStats.length > 0 ? platformStats.reduce((best, p) => p.engagement > best.engagement ? p : best) : null;
    const avgEngagement = platformStats.length > 0 ? platformStats.reduce((s, p) => s + p.engagement, 0) / platformStats.length : 0;
    return { totalReach, mostEngaged, avgEngagement, platforms: platformStats };
  }, [igRecord, tiktokData, youtubeData, twitterData, facebookData, linkedinData]);

  const filteredPosts = useMemo(() => {
    // Use the selected platform's post data
    let platRecord: Record<string, unknown> | undefined;
    if (selectedPlatform === "tiktok") platRecord = tiktokData;
    else if (selectedPlatform === "youtube") platRecord = youtubeData;
    else if (selectedPlatform === "twitter") platRecord = twitterData;
    else platRecord = igRecord;

    const raw = platRecord?.post_data;
    if (!Array.isArray(raw)) return [];
    const mapped = (raw as Record<string, unknown>[]).map((item, idx) => {
      const media = item.media as unknown[] | undefined;
      const firstMedia = Array.isArray(media) && media[0] && typeof media[0] === "object" ? (media[0] as Record<string, unknown>) : undefined;
      const eng = item.engagement as Record<string, unknown> | undefined;
      const isCarousel = Array.isArray(media) && media.length > 1;
      const isReel = Boolean(item.is_reel ?? item.video_url ?? item.is_video);
      // Try multiple image sources from media array entries and direct item fields
      const thumbnail = (() => {
        const MEDIA_KEYS = ['url', 'thumbnail_url', 'media_url', 'display_url', 'image_url', 'src', 'thumbnail', 'preview_url'];
        const ITEM_KEYS = ['thumbnail', 'image', 'image_url', 'display_url', 'media_url', 'thumbnail_url', 'video_thumbnail', 'preview_url', 'thumbnail_src', 'picture', 'thumbnail_resource'];
        // 1. Try media array entries (object with url, or direct string)
        if (Array.isArray(media)) {
          for (const m of media) {
            if (typeof m === 'string' && m.startsWith('http')) return m;
            if (m && typeof m === 'object') {
              const mo = m as Record<string, unknown>;
              for (const k of MEDIA_KEYS) {
                const v = mo[k];
                if (typeof v === 'string' && v.startsWith('http')) return v;
              }
            }
          }
        }
        // 2. Try firstMedia fields (already extracted)
        if (firstMedia) {
          for (const k of MEDIA_KEYS) {
            const v = firstMedia[k];
            if (typeof v === 'string' && v.startsWith('http')) return v;
          }
        }
        // 3. Try direct item fields
        for (const k of ITEM_KEYS) {
          const v = item[k];
          if (typeof v === 'string' && v.startsWith('http')) return v;
        }
        return undefined;
      })() as string | undefined;
      return {
        id: String(item.post_id ?? item.id ?? Math.random()),
        thumbnail,
        caption: (item.caption as string) ?? undefined,
        likes: Number(eng?.likes ?? item.likes ?? 0),
        comments: Number(eng?.comments ?? item.comments ?? 0),
        date: (item.created_at as string) ?? undefined,
        permalink: (item.post_url as string) ?? undefined,
        isCarousel,
        isReel,
      };
    });
    if (postContentType === "reels") return mapped.filter((p) => p.isReel);
    return mapped;
  }, [selectedPlatform, igRecord?.post_data, tiktokData, youtubeData, twitterData, postContentType]);

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
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-[#0F1117] border-b border-gray-100 dark:border-gray-800 shrink-0 overflow-x-auto">
          {availablePlatforms.map((p) => {
            const isActive = selectedPlatform.toLowerCase() === p.toLowerCase();
            const platData = p === "instagram" ? igRecord : p === "tiktok" ? tiktokData : p === "youtube" ? youtubeData : p === "twitter" ? twitterData : p === "facebook" ? facebookData : p === "linkedin" ? linkedinData : null;
            const pFollowers = Number((platData as Record<string, unknown>)?.follower_count ?? (platData as Record<string, unknown>)?.subscriber_count ?? 0);
            const pEngagement = Number((platData as Record<string, unknown>)?.engagement_percent ?? (platData as Record<string, unknown>)?.engagement_rate ?? 0);
            return (
              <button
                key={p}
                type="button"
                onClick={() => { userSelectedPlatformRef.current = true; setSelectedPlatform(p.toLowerCase()); }}
                className={cn(
                  "flex-1 min-w-[140px] flex items-center gap-2.5 rounded-xl border-2 px-4 py-2 transition-colors",
                  isActive ? "border-[#3B82F6] bg-blue-50/50 dark:bg-blue-950/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] hover:border-gray-300"
                )}
              >
                <PlatformBrandIcon platform={p} className="h-6 w-6 shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-sm leading-tight">
                    <span className="font-bold text-[#E1306C]">{pFollowers > 0 ? formatNumber(pFollowers) : "—"}</span>
                    <span className="text-gray-500 ml-1 text-xs font-normal">{p === "youtube" ? "subscribers" : "followers"}</span>
                  </p>
                  <p className="text-[11px] text-green-600 leading-tight font-medium">{pEngagement > 0 ? `${formatPercent(pEngagement)} eng` : "—"}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex h-full flex-col md:flex-row overflow-hidden min-h-0">
          {/* ── Left Sidebar ── */}
          <ScrollArea className="w-full md:w-[280px] shrink-0 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0F1117]">
          <div className="p-5 space-y-4">
            {/* Avatar */}
            <div className="mx-auto h-24 w-24 rounded-full overflow-hidden relative border-2 border-gray-200 dark:border-gray-700">
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
                    {!hideDirectoryActions && <DropdownMenuSeparator />}
                    {!hideDirectoryActions && (
                      <DropdownMenuItem onClick={handleVerifyMilitary}>
                        <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                        Verify Military Status
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

            {/* Platforms row */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Platforms</p>
              <div className="flex flex-wrap gap-2">
                {availablePlatforms.map((p) => {
                  const isActive = selectedPlatform.toLowerCase() === p.toLowerCase();
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { userSelectedPlatformRef.current = true; setSelectedPlatform(p.toLowerCase()); }}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                        isActive ? "bg-[#3B82F6]/10 ring-2 ring-[#3B82F6]" : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                      )}
                      title={PLATFORM_LABELS[p.toLowerCase()] ?? p}
                    >
                      <PlatformBrandIcon platform={p} className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
              <div className="space-y-0 text-[13px]">
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
                  <div key={label} className="flex justify-between items-center py-1.5">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    {showEnrichmentLoading && !value ? (
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

          {/* ── Right Panel ── */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {error && (
              <div className="p-4 text-sm text-destructive bg-destructive/10 border-b border-border shrink-0">
                {error}
              </div>
            )}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {!hasDataForPlatform && !enrichmentLoading && (
                  <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border dark:border-gray-700 bg-muted/20 dark:bg-[#0F1117] p-4">
                    Data not available for this platform.
                  </p>
                )}

                {/* Tab bar: Analytics | Posts | Similar Accounts */}
                  <Tabs defaultValue="analytics" className="w-full">
                    <TabsList className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none p-0 h-auto">
                      <TabsTrigger
                        value="analytics"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a5f] data-[state=active]:text-[#1e3a5f] data-[state=active]:shadow-none text-gray-500 px-4 py-2.5 text-sm font-medium"
                      >
                        <BarChart3 className="h-4 w-4 mr-1.5" /> Analytics
                      </TabsTrigger>
                      <TabsTrigger
                        value="posts"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a5f] data-[state=active]:text-[#1e3a5f] data-[state=active]:shadow-none text-gray-500 px-4 py-2.5 text-sm font-medium"
                      >
                        <Image className="h-4 w-4 mr-1.5" /> Posts
                      </TabsTrigger>
                      <TabsTrigger
                        value="similar"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a5f] data-[state=active]:text-[#1e3a5f] data-[state=active]:shadow-none text-gray-500 px-4 py-2.5 text-sm font-medium"
                      >
                        <Users className="h-4 w-4 mr-1.5" /> Similar Accounts
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
                      ) : showEnrichmentLoading ? (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Engagement Per Post</p>
                          <Skeleton className="h-36 w-full animate-pulse" />
                        </div>
                      ) : null}

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
                          <p className="text-xs text-muted-foreground mt-2">
                            @{displayUsername || "creator"} {(() => { const total = growthData.reduce((s, d) => s + d.growth, 0); return total >= 0 ? `grew by ${total.toFixed(1)}%` : `declined by ${Math.abs(total).toFixed(1)}%`; })()} in the last 12 months
                          </p>
                        </div>
                      ) : showEnrichmentLoading ? (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0F1117] p-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Follower Growth</p>
                          <Skeleton className="h-44 w-full" />
                        </div>
                      ) : null}

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

                      {/* Top Creator Hashtags */}
                      {showEnrichmentLoading && platformHashtags.length === 0 && (
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
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          {filteredPosts.map((post) => (
                            <a
                              key={post.id}
                              href={post.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-[#0F1117] hover:shadow-md transition-shadow group"
                            >
                              <div className="relative">
                                {post.thumbnail && !brokenPostImages.has(post.id) ? (
                                  <img
                                    src={post.thumbnail}
                                    alt=""
                                    loading="lazy"
                                    className="w-full aspect-square object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      const img = e.target as HTMLImageElement;
                                      console.log("[PostImages] Image failed to load:", post.thumbnail);
                                      setBrokenPostImages(prev => new Set(prev).add(post.id));
                                    }}
                                  />
                                ) : (
                                  <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center gap-1">
                                    <Camera className="h-6 w-6 text-gray-300" />
                                    <span className="text-[10px] text-gray-400">No preview</span>
                                  </div>
                                )}
                                {post.isCarousel && (
                                  <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                                    <ChevronRight className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="p-2.5">
                                {post.date && <p className="text-[10px] text-gray-400 mb-0.5">{new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{post.caption || "—"}</p>
                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
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
                                <th className="py-2.5 px-3">Subscribers</th>
                                <th className="py-2.5 px-3">Engagement</th>
                                <th className="py-2.5 px-3">Similarity</th>
                                <th className="py-2.5 px-3"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {similarAccounts.map((acc) => {
                                const simPct = acc.similarity != null && acc.similarity > 0
                                  ? (acc.similarity <= 1 ? acc.similarity * 100 : acc.similarity)
                                  : 0;
                                return (
                                  <tr key={acc.id ?? acc.username} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-2.5">
                                        {acc.avatar ? (
                                          <img src={acc.avatar} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        ) : (
                                          <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                            <Users className="h-4 w-4 text-gray-400" />
                                          </div>
                                        )}
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
                                        <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/20 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                          {simPct.toFixed(0)}%
                                        </span>
                                      ) : "—"}
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
