import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ListPlus, Loader2, Plus, MapPin, ExternalLink, Mail, BadgeCheck, LayoutGrid, List, Save, Bookmark, ChevronDown, Trash2, ShieldCheck, Coins, AlertTriangle, UserSearch, Info, Link as LinkIcon, Sparkles, Users, Trophy, Filter, CircleCheck, Copy, UserPlus, X, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, goodAvatarCache } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { searchCreators, searchByUsername, searchLookalike, searchSimilarCreators, enrichCreatorProfile, fullEnrichCreatorProfile, fetchCredits, logCreditUsage, searchLocations, type CreatorCard, type EnrichedProfileResponse, type CreditBalance } from "@/lib/influencers-club";
import { smartSearch, classifyQuery, type SmartSearchResult, type ClassifiedQuery } from "@/lib/search-router";
import { upsertCreator } from "@/lib/creators-db";
import CreatorProfileModal from "@/components/CreatorProfileModal";
import CreateListModal from "@/components/CreateListModal";
import BulkActionBar from "@/components/BulkActionBar";
import { useLists } from "@/contexts/ListContext";
import { useAuth } from "@/contexts/AuthContext";
import { approveForDirectory, detectBranch, extractAvatarFromEnrichment, extractBannerImage, fetchShowcaseCreators, type ShowcaseCreator } from "@/lib/featured-creators";
import { saveCreatorAvatar } from "@/lib/directories";
import { getPlatformsFromEnrichmentData, getPlatformStatsFromEnrichment, formatCompactFollowers } from "@/lib/enrichment-platforms";
import { parseSmartQuery } from "@/lib/smart-search-parser";
import { isNaturalLanguageQuery, parseNaturalLanguageSearch, followersToRange, engagementToOption } from "@/lib/nl-search-parser";
import { PlatformIcon as BrandPlatformIcon } from "@/lib/platform-icons";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useDemoMode } from "@/hooks/useDemoMode";
import { addFullContact, getEmailLists, upsertEmailList, syncBulkContacts } from "@/lib/email-db";
import type { EmailList } from "@/lib/email-types";

const BRANCHES = ["Army", "Navy", "Air Force", "Marines", "Coast Guard"] as const;

const BRANCH_COLORS: Record<string, { selected: string; unselected: string }> = {
  Army: { selected: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700", unselected: "hover:bg-green-50 hover:text-green-700 hover:border-green-200 dark:hover:bg-green-950/20 dark:hover:text-green-400" },
  Navy: { selected: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-700", unselected: "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:hover:bg-blue-950/20 dark:hover:text-blue-400" },
  "Air Force": { selected: "bg-sky-100 text-sky-600 border-sky-300 dark:bg-sky-900/40 dark:text-sky-400 dark:border-sky-700", unselected: "hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 dark:hover:bg-sky-950/20 dark:hover:text-sky-400" },
  Marines: { selected: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-700", unselected: "hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:hover:bg-red-950/20 dark:hover:text-red-400" },
  "Coast Guard": { selected: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-700", unselected: "hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 dark:hover:bg-orange-950/20 dark:hover:text-orange-400" },
};

const LAST_SEARCH_KEY = "pd_discover_last_search";

interface SavedSearchFilters {
  searchQuery: string;
  platform: string[];
  followersRange: string;
  engagementMin: string;
  locationFilter: string;
  niche: string;
  gender: string;
  language: string;
  keywordsInBio: string;
  sortBy: string;
  selectedBranches: string[];
}

interface SavedSearchRow {
  id: string;
  name: string;
  search_query: string;
  filters: SavedSearchFilters;
  created_at: string;
}

const CREATOR_TYPES = [
  { value: "all", label: "All Creators", icon: "", keywords: [] as string[], links: [] as string[], platformOverride: null as string | null },
  { value: "podcasters", label: "Podcasters", icon: "🎙️", keywords: ["podcast", "podcaster", "host", "episodes", "spotify", "apple podcasts"], links: ["spotify", "podcasts.apple", "anchor.fm", "buzzsprout", "podbean"], platformOverride: null },
  { value: "speakers", label: "Keynote Speakers", icon: "🎤", keywords: ["keynote", "speaker", "motivational speaker", "public speaker", "TEDx", "conference speaker"], links: ["speakerflow", "speaking", "keynote"], platformOverride: null },
  { value: "authors", label: "Authors", icon: "📚", keywords: ["author", "bestselling", "book", "writer", "published", "novelist", "nonfiction"], links: ["amazon.com/author", "goodreads", "barnesandnoble"], platformOverride: null },
  { value: "youtube", label: "YouTube Creators", icon: "▶️", keywords: ["youtuber", "youtube", "creator", "vlogger", "content creator"], links: [], platformOverride: "youtube" },
  { value: "tiktok", label: "TikTok Creators", icon: "🎵", keywords: [], links: [], platformOverride: "tiktok" },
  { value: "ambassadors", label: "Brand Ambassadors", icon: "🤝", keywords: ["ambassador", "partner", "sponsored", "affiliate", "brand rep", "collab"], links: [], platformOverride: null },
] as const;

const ALL_SOCIAL_PLATFORMS = ["instagram", "tiktok", "youtube", "twitter", "facebook", "linkedin"] as const;

/** Build the best profile URL for a creator to pass to Find Similar API. */
function getCreatorProfileUrl(creator: CreatorCard, fallbackPlatform: string): string | undefined {
  // Check external links for an existing Instagram URL
  if (creator.externalLinks) {
    const igLink = creator.externalLinks.find(
      (l) => l.url && /instagram\.com\//i.test(l.url)
    );
    if (igLink?.url) return igLink.url;
  }
  // Build from username
  const handle = (creator.username ?? "").replace(/^@/, "").trim();
  if (!handle) return undefined;
  const plat = fallbackPlatform.toLowerCase();
  if (plat === "tiktok") return `https://www.tiktok.com/@${handle}/`;
  if (plat === "youtube") return `https://www.youtube.com/@${handle}/`;
  if (plat === "twitter") return `https://twitter.com/${handle}/`;
  return `https://www.instagram.com/${handle}/`;
}

const NON_PERSONAL_DOMAINS = new Set([
  "bbc.com", "bbc.co.uk", "cnn.com", "nytimes.com", "washingtonpost.com",
  "theguardian.com", "reuters.com", "apnews.com", "nbcnews.com", "abcnews.go.com",
  "foxnews.com", "sony.com", "microsoft.com", "apple.com", "google.com",
  "wikipedia.org", "imdb.com", "rottentomatoes.com", "museum.org",
  "si.edu", "nasa.gov", "smithsonianmag.com",
]);

function getPersonalLinks(externalLinks: { label: string; url?: string }[]): string[] {
  return externalLinks
    .filter((link) => {
      const url = link.url;
      if (!url) return false;
      const lower = url.toLowerCase();
      if (lower.includes("/company/") || lower.includes("/school/")) return false;
      try {
        const host = new URL(lower).hostname.replace(/^www\./, "");
        if (NON_PERSONAL_DOMAINS.has(host)) return false;
      } catch {
        return false;
      }
      return true;
    })
    .map((link) => {
      try {
        return new URL(link.url!).hostname.replace(/^www\./, "");
      } catch {
        return link.url!;
      }
    })
    .slice(0, 5);
}

const PLATFORM_URLS: Record<string, (u: string) => string> = {
  instagram: (u) => `https://instagram.com/${u}`,
  tiktok: (u) => `https://tiktok.com/@${u}`,
  youtube: (u) => `https://youtube.com/@${u}`,
  twitter: (u) => `https://x.com/${u}`,
  facebook: (u) => `https://facebook.com/${u}`,
  linkedin: (u) => `https://linkedin.com/in/${u}`,
};

function PlatformIcon({ platform, username, size = 20 }: { platform: string; username?: string; size?: number }) {
  const plat = platform.toLowerCase();
  const buildUrl = PLATFORM_URLS[plat];
  const url = username && buildUrl ? buildUrl(username) : null;
  const icon = <BrandPlatformIcon platform={plat} size={size} />;
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex">
        {icon}
      </a>
    );
  }
  return icon;
}
function extractFromEnrichment(data: EnrichedProfileResponse): Partial<CreatorCard> {
  const { result, instagram } = data;
  const partial: Partial<CreatorCard> = {};

  console.log("[extractFromEnrichment] result:", result, "instagram keys:", Object.keys(instagram));

  if (result.email) partial.hasEmail = true;

  // Engagement rate from enrichment
  const erVal =
    Number(instagram.engagement_percent) || Number(instagram.engagement_rate) || Number(instagram.er) || 0;
  if (erVal > 0) partial.engagementRate = Number(erVal.toFixed(2));

  const creatorHas = result.creator_has as Record<string, boolean> | undefined;
  const platforms: string[] = [];
  if (creatorHas && typeof creatorHas === "object") {
    // Add each platform the creator has
    if (creatorHas.instagram) platforms.push("instagram");
    if (creatorHas.tiktok) platforms.push("tiktok");
    if (creatorHas.youtube) platforms.push("youtube");
    if (creatorHas.twitter) platforms.push("twitter");
    if (creatorHas.facebook) platforms.push("facebook");
    if (creatorHas.linkedin) platforms.push("linkedin");
    if (creatorHas.twitch) platforms.push("twitch");
    if (creatorHas.podcast) platforms.push("podcast");
  }
  // Also detect platforms from actual data keys in the enrichment result
  // (creator_has is often incomplete — IC RAW endpoint may not return all flags)
  const ENRICH_PLATFORM_KEYS = ["instagram", "tiktok", "youtube", "twitter", "facebook", "linkedin"];
  for (const p of ENRICH_PLATFORM_KEYS) {
    if (!platforms.includes(p)) {
      const pd = result[p];
      if (pd && typeof pd === "object") {
        const d = pd as Record<string, unknown>;
        if (d.username || d.handle || d.follower_count || d.subscriber_count) {
          platforms.push(p);
        }
      }
    }
  }
  if (platforms.length > 0) {
    partial.socialPlatforms = platforms;
  }

  // Hashtags: try direct field (FULL endpoint), then aggregate from post_data (RAW endpoint)
  let hashtags = instagram.hashtags ?? instagram.frequently_used_hashtags ?? instagram.top_hashtags;
  if (!Array.isArray(hashtags) || hashtags.length === 0) {
    const posts = Array.isArray(instagram.post_data) ? (instagram.post_data as Record<string, unknown>[]) : [];
    const postTags = posts.flatMap((p) => Array.isArray(p.hashtags) ? p.hashtags as string[] : []);
    if (postTags.length > 0) hashtags = postTags;
  }
  if (Array.isArray(hashtags) && hashtags.length > 0) {
    const mapped = hashtags.map((t: unknown) => {
      if (typeof t === "string") return t.replace(/^#/, "");
      if (t && typeof t === "object") {
        const o = t as Record<string, unknown>;
        const val = o.name ?? o.tag ?? o.hashtag ?? o.label ?? o.value;
        if (val) return String(val).replace(/^#/, "");
      }
      return String(t);
    }).filter((t) => t && t !== "undefined" && t !== "null");
    partial.hashtags = [...new Set(mapped)].slice(0, 20);
  }

  const links = instagram.links_in_bio ?? instagram.external_links ?? instagram.bio_links;
  if (Array.isArray(links) && links.length > 0) {
    const externalLinks: { label: string; url?: string }[] = [];
    links.forEach((item: unknown) => {
      if (typeof item === "string" && item.trim()) {
        const url = item.startsWith("http") ? item : `https://${item}`;
        externalLinks.push({ label: "Link", url });
        return;
      }
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const url = (o.url ?? o.href ?? o.link) as string | undefined;
        const label = (o.label ?? o.title ?? o.name) as string | undefined;
        if (typeof url === "string" && url.trim()) {
          const finalUrl = url.startsWith("http") ? url : `https://${url}`;
          const lower = finalUrl.toLowerCase();
          let displayLabel = label;
          if (!displayLabel) {
            if (lower.includes("linktr")) displayLabel = "Linktree";
            else if (lower.includes("amazon")) displayLabel = "Amazon";
            else if (lower.includes("shopify")) displayLabel = "Shopify";
            else displayLabel = "Link";
          }
          externalLinks.push({ label: String(displayLabel), url: finalUrl });
        }
      }
    });
    if (externalLinks.length > 0) partial.externalLinks = externalLinks;
  }

  const city = instagram.city as string | undefined;
  const state = instagram.state as string | undefined;
  const country = instagram.country as string | undefined;
  const loc = [city, state, country].filter(Boolean).join(", ").trim();
  if (loc) partial.location = loc;

  if (instagram.is_verified) partial.isVerified = true;

  if (instagram.biography && typeof instagram.biography === "string") {
    partial.bio = instagram.biography as string;
  }

  // Extract avatar from enrichment so getMergedCreator() has it
  const avatarUrl =
    (instagram.profile_picture_hd as string) ||
    (instagram.profile_picture as string) ||
    (instagram.picture as string) ||
    (instagram.profile_pic_url as string) ||
    (instagram.avatar as string) ||
    (instagram.avatar_url as string) ||
    (instagram.profile_image_url as string) ||
    null;
  console.log("[extractFromEnrichment] Avatar fields:", {
    profile_picture_hd: instagram.profile_picture_hd,
    profile_picture: instagram.profile_picture,
    picture: instagram.picture,
    profile_pic_url: instagram.profile_pic_url,
    avatar: instagram.avatar,
    avatar_url: instagram.avatar_url,
    profile_image_url: instagram.profile_image_url,
    resolved: avatarUrl,
  });
  if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.trim() && !avatarUrl.includes("ui-avatars.com")) {
    partial.avatar = avatarUrl.replace(/^http:\/\//i, "https://");
  }

  return partial;
}

const EnrichShimmer = () => (
  <div className="h-3 w-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse inline-block" />
);

/** Force image URL to HTTPS to prevent mixed-content flash. */
function safeImgUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  return url.replace(/^http:\/\//i, "https://");
}

/** Generate initials from name for avatar fallback. */
function getDiscoverInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

/** Use shared avatar cache from utils so CreatorProfileModal can also read it */
const _goodAvatarCache = goodAvatarCache;

/** Avatar component that caches the last good image and never flashes to initials
 *  if a previously loaded image exists for this creator. */
function DiscoverAvatar({ url, name, username, size = "w-10 h-10", borderClass = "border border-gray-200 dark:border-gray-700", verified, badgeClass }: {
  url: string | null | undefined;
  name: string;
  username?: string;
  size?: string;
  borderClass?: string;
  verified?: boolean;
  badgeClass?: string;
}) {
  const safeSrc = safeImgUrl(url);
  const cacheKey = username || name;
  const [errCount, setErrCount] = useState(0);
  const prevUrl = useRef(safeSrc);

  if (safeSrc !== prevUrl.current) {
    prevUrl.current = safeSrc;
    setErrCount(0);
  }

  const cachedSrc = _goodAvatarCache.get(cacheKey) || null;
  let displaySrc: string | null = null;
  if (errCount === 0 && safeSrc) displaySrc = safeSrc;
  else if (errCount <= 1 && cachedSrc && cachedSrc !== safeSrc) displaySrc = cachedSrc;

  return (
    <div className={`relative shrink-0 ${size}`}>
      {displaySrc && (
        <img
          src={displaySrc}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => _goodAvatarCache.set(cacheKey, displaySrc!)}
          onError={() => setErrCount((c) => c + 1)}
          className={`${size} rounded-full object-cover ${borderClass} absolute inset-0 z-10`}
        />
      )}
      <div className={`${size} rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2d5282] flex items-center justify-center text-white font-bold ${size === "w-14 h-14" ? "text-sm" : "text-xs"} ${borderClass}`}>
        {getDiscoverInitials(name)}
      </div>
      {verified && (
        <BadgeCheck className={`absolute -top-1 -left-1 ${badgeClass || "h-4 w-4"} text-blue-500 bg-white dark:bg-[#1A1D27] rounded-full z-20`} aria-label="Verified" />
      )}
    </div>
  );
}

const SEARCH_STATUS_TEXTS = [
  "Searching creators…",
  "Analyzing profiles…",
  "Finding top matches…",
  "Ranking by relevance…",
];

/** 4×2 grid of cycling creator avatars shown while search loads. */
function SearchShowcase({ avatars }: { avatars: { url: string; name: string }[] }) {
  const GRID_SIZE = 8;
  const INITIAL_KEY_MAX = GRID_SIZE; // keys 0..7 are the initial seed (no glow)
  const [grid, setGrid] = useState<{ url: string; name: string; key: number }[]>([]);
  const [statusIdx, setStatusIdx] = useState(0);
  const nextKey = useRef(GRID_SIZE);

  // Seed the grid on mount / when avatars change
  useEffect(() => {
    if (avatars.length === 0) return;
    const shuffled = [...avatars].sort(() => Math.random() - 0.5);
    setGrid(shuffled.slice(0, GRID_SIZE).map((a, i) => ({ ...a, key: i })));
    nextKey.current = GRID_SIZE;
  }, [avatars]);

  // Swap 2–3 random slots every 1.5s
  useEffect(() => {
    if (avatars.length <= GRID_SIZE) return;
    const interval = setInterval(() => {
      setGrid((prev) => {
        const next = [...prev];
        const swapCount = 2 + Math.floor(Math.random() * 2); // 2 or 3
        const usedSlots = new Set<number>();
        const currentUrls = new Set(next.map((g) => g.url));
        const pool = avatars.filter((a) => !currentUrls.has(a.url));
        if (pool.length === 0) return prev;
        for (let s = 0; s < swapCount && pool.length > 0; s++) {
          let slotIdx: number;
          do { slotIdx = Math.floor(Math.random() * GRID_SIZE); } while (usedSlots.has(slotIdx));
          usedSlots.add(slotIdx);
          const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
          next[slotIdx] = { ...pick, key: nextKey.current++ };
        }
        return next;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [avatars]);

  // Cycle status text every 2s
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx((i) => (i + 1) % SEARCH_STATUS_TEXTS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (grid.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">{SEARCH_STATUS_TEXTS[statusIdx]}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-8">
      <div className="grid grid-cols-4 gap-4">
        {grid.map((item) => {
          const isFresh = item.key >= INITIAL_KEY_MAX;
          return (
            <div
              key={item.key}
              className={cn(
                "relative animate-in fade-in zoom-in-90 duration-500",
                isFresh && "avatar-ring-pulse"
              )}
            >
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-sm bg-gradient-to-br from-[#1e3a5f] to-[#2d5282]">
                <img
                  src={safeImgUrl(item.url)}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium transition-all">{SEARCH_STATUS_TEXTS[statusIdx]}</span>
      </div>
    </div>
  );
}

/** If this handle matches a directory_members row, upload the enrichment avatar
 *  to Supabase storage and update the row with the permanent URL (fire-and-forget). */
function maybeUpdateFeaturedAvatar(handle: string, data: EnrichedProfileResponse) {
  try {
    const ig = data.instagram;
    const avatarUrl =
      (ig?.picture as string) ||
      (ig?.profile_pic_url as string) ||
      (ig?.profile_pic_url_hd as string) ||
      (ig?.profile_picture as string) ||
      null;
    if (!avatarUrl) return;

    // Save to permanent Supabase Storage (fire-and-forget, also updates DB)
    saveCreatorAvatar(handle, avatarUrl).catch(() => {});
  } catch {
    // non-critical — ignore
  }
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Batch-fetch permanent avatar URLs from directory_members for a set of handles.
 *  Returns a Map<lowercase_handle, permanentUrl> — only includes rows where the
 *  avatar is a non-expired Supabase Storage URL (skips scontent/cdninstagram). */
async function getDirectoryAvatarBatch(
  handles: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (handles.length === 0) return out;
  try {
    const lower = handles.map((h) => h.toLowerCase());
    const { data } = await supabase
      .from("directory_members")
      .select("creator_handle, ic_avatar_url, avatar_url")
      .in("creator_handle", lower);
    if (!data) return out;
    for (const row of data) {
      const url = row.ic_avatar_url || row.avatar_url;
      if (
        url &&
        url.includes("supabase.co/storage") &&
        !url.includes("scontent") &&
        !url.includes("cdninstagram")
      ) {
        out.set(row.creator_handle.toLowerCase(), url);
      }
    }
  } catch (err) {
    console.warn("[DirectoryAvatarCache] Batch lookup failed:", err);
  }
  return out;
}

async function getCachedEnrichment(username: string, expectedName?: string): Promise<EnrichedProfileResponse | null> {
  try {
    const { data, error } = await supabase
      .from("creator_enrichment_cache")
      .select("enrichment_data, cached_at")
      .eq("username", username.toLowerCase())
      .eq("platform", "instagram")
      .single();
    if (error || !data) return null;
    const cachedAt = new Date(data.cached_at).getTime();
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null;

    // Validate cached profile name against expected name (prevents stale cross-account data)
    if (expectedName) {
      const enrichment = data.enrichment_data as EnrichedProfileResponse;
      const cachedName = String(
        enrichment?.instagram?.full_name ?? enrichment?.instagram?.name ?? enrichment?.result?.full_name ?? ""
      ).trim().toLowerCase();
      const expected = expectedName.trim().toLowerCase();
      if (cachedName && expected && cachedName !== expected) {
        // Check if names share at least one word (partial match OK)
        const cachedWords = new Set(cachedName.split(/\s+/));
        const expectedWords = expected.split(/\s+/);
        const overlap = expectedWords.some((w) => w.length > 2 && cachedWords.has(w));
        if (!overlap) {
          console.warn(`[EnrichCache] Mismatch for @${username}: cached "${cachedName}", expected "${expected}" — invalidating cache`);
          // Delete the stale cache entry (fire-and-forget)
          supabase
            .from("creator_enrichment_cache")
            .delete()
            .eq("username", username.toLowerCase())
            .eq("platform", "instagram")
            .then(() => console.log(`[EnrichCache] Deleted stale cache for @${username}`));
          return null;
        }
      }
    }

    return data.enrichment_data as EnrichedProfileResponse;
  } catch {
    return null;
  }
}

async function setCachedEnrichment(username: string, enrichment: EnrichedProfileResponse): Promise<void> {
  try {
    await supabase
      .from("creator_enrichment_cache")
      .upsert({
        username: username.toLowerCase(),
        platform: "instagram",
        enrichment_data: enrichment,
        cached_at: new Date().toISOString(),
      }, { onConflict: "username" });
  } catch (err) {
    console.warn("[EnrichCache] Failed to write cache:", err);
  }
}

/** Batch-fetch cached enrichments for multiple usernames. Returns a Map of username → email. */
async function getBatchCachedEmails(usernames: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (usernames.length === 0) return result;
  try {
    const lowerNames = usernames.map((u) => u.toLowerCase());
    const { data, error } = await supabase
      .from("creator_enrichment_cache")
      .select("username, enrichment_data, cached_at")
      .in("username", lowerNames);
    if (error || !data) return result;
    const now = Date.now();
    for (const row of data) {
      const cachedAt = new Date(row.cached_at).getTime();
      if (now - cachedAt > CACHE_TTL_MS) continue;
      const enrichment = row.enrichment_data as EnrichedProfileResponse | null;
      const email = enrichment?.result?.email;
      if (email && typeof email === "string") {
        result.set(row.username, email);
      }
    }
  } catch {
    // Silently fail — cache is optional
  }
  return result;
}

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "Twitter/X" },
] as const;
const FOLLOWER_OPTIONS = [
  { value: "any", label: "All Followers", min: null as number | null, max: null as number | null },
  { value: "nano", label: "Nano (1K–10K)", min: 1000, max: 10000 },
  { value: "micro", label: "Micro (10K–50K)", min: 10000, max: 50000 },
  { value: "mid-micro", label: "Micro (50K–100K)", min: 50000, max: 100000 },
  { value: "mid", label: "Mid-tier (100K–500K)", min: 100000, max: 500000 },
  { value: "macro", label: "Macro (500K–1M)", min: 500000, max: 1000000 },
  { value: "mega", label: "Mega (1M+)", min: 1000000, max: null as number | null },
] as const;
const ENGAGEMENT_OPTIONS = [
  { value: "any", label: "Engagement", min: null as number | null },
  { value: "1", label: ">1%", min: 1 },
  { value: "2", label: ">2%", min: 2 },
  { value: "3", label: ">3%", min: 3 },
  { value: "5", label: ">5%", min: 5 },
] as const;
const NICHE_OPTIONS = [
  "All niches",
  "Fitness",
  "Lifestyle",
  "Comedy",
  "Education",
  "Podcast",
  "Speaking",
  "Writing",
] as const;
const SORT_OPTIONS = [
  { value: "confidence", label: "Confidence" },
  { value: "relevancy", label: "Relevancy" },
  { value: "followers", label: "Followers" },
  { value: "engagement", label: "Engagement" },
] as const;
const GENDER_OPTIONS = [
  { value: "any", label: "All Genders" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;
const LANGUAGE_OPTIONS = [
  { value: "any", label: "All Languages" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "ko", label: "Korean" },
  { value: "ja", label: "Japanese" },
  { value: "ar", label: "Arabic" },
] as const;

type Branch = (typeof BRANCHES)[number];

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

/** Deduplicate creators by id, keeping the first occurrence. */
function deduplicateCreators(cards: CreatorCard[]): CreatorCard[] {
  const seen = new Set<string>();
  return cards.filter((c) => {
    // Deduplicate by username (unique per platform) rather than id, because
    // IDs from the IC API may not be stable across pagination pages.
    const key = c.username?.toLowerCase() ?? c.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Resolve selected platforms to the list of API platform strings to query. */
function resolveSearchPlatforms(selected: string[] | undefined | null, creatorTypeOverride: string | null): string[] {
  if (creatorTypeOverride) return [creatorTypeOverride];
  const safe = Array.isArray(selected) ? selected : [];
  if (safe.length === 0) return ["instagram"];
  return safe.map((p) => p.toLowerCase());
}

// Error boundary to prevent white screen on crash
class DiscoverErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[BrandDiscover] Render crash:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <h2 className="text-xl font-semibold text-[#000741] dark:text-white">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
            The Discover page encountered an error. This may be caused by corrupted saved search data.
          </p>
          <pre className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-lg p-3 max-w-lg overflow-auto">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => {
              try { localStorage.removeItem(LAST_SEARCH_KEY); } catch { /* */ }
              this.setState({ hasError: false, error: null });
            }}
            className="px-4 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5282] transition-colors text-sm font-medium"
          >
            Clear cache & reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const BrandDiscover = () => {
  const { guardAction } = useDemoMode();
  const [urlSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"keyword" | "username" | "lookalike">("keyword");
  const [creatorType, setCreatorType] = useState<string>("all");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [platform, setPlatform] = useState<string[]>([]);
  const [platformFilter, setPlatformFilter] = useState<Set<string>>(new Set());
  const [followersRange, setFollowersRange] = useState<string>("any");
  const [engagementMin, setEngagementMin] = useState<string>("any");
  const [locationFilter, setLocationFilter] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const locationAbortRef = useRef<AbortController | null>(null);
  const locationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationWrapperRef = useRef<HTMLDivElement>(null);
  const [niche, setNiche] = useState<string>("All niches");
  const [gender, setGender] = useState<string>("any");
  const [language, setLanguage] = useState<string>("any");
  const [keywordsInBio, setKeywordsInBio] = useState("");
  const [sortBy, setSortBy] = useState<string>("confidence");
  const [selectedBranches, setSelectedBranches] = useState<Set<Branch>>(new Set());
  const [smartFiltersApplied, setSmartFiltersApplied] = useState<string[]>([]);
  const [aiParsing, setAiParsing] = useState(false);
  const [nlBanner, setNlBanner] = useState<string | null>(null);
  const [trendingCreators, setTrendingCreators] = useState<ShowcaseCreator[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [apiResults, setApiResults] = useState<{ creators: CreatorCard[]; total: number; rawResponse: unknown } | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileCreator, setProfileCreator] = useState<CreatorCard | null>(null);
  const [createListModalOpen, setCreateListModalOpen] = useState(false);
  const [createListPendingCreator, setCreateListPendingCreator] = useState<CreatorCard | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [createListForBulkImportOpen, setCreateListForBulkImportOpen] = useState(false);
  const [createListForBulkAddOpen, setCreateListForBulkAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [enrichCache, setEnrichCache] = useState<Record<string, Partial<CreatorCard>>>({});
  const [enrichRawCache, setEnrichRawCache] = useState<Record<string, EnrichedProfileResponse>>({});
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const enrichedSetRef = useRef<Set<string>>(new Set());
  const enrichAbortRef = useRef<AbortController | null>(null);
  const searchQueryRef = useRef(searchQuery);
  // Only sync ref when searchQuery state actually changes — NOT on every render.
  // Rendering from filter-state updates (location, gender, etc.) must not overwrite
  // the ref that executeSearch set to the effective/simplified query.
  useEffect(() => { searchQueryRef.current = searchQuery; }, [searchQuery]);

  // Showcase avatars for search-loading animation
  const [showcaseAvatars, setShowcaseAvatars] = useState<{ url: string; name: string }[]>([]);

  // Credit balance state
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);

  // "Get Contact Info" state
  const [contactConfirmCreator, setContactConfirmCreator] = useState<CreatorCard | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactEmails, setContactEmails] = useState<Record<string, string>>({}); // creatorId → email

  // Post-enrichment actions dialog
  const [postEnrichCreator, setPostEnrichCreator] = useState<CreatorCard | null>(null);
  const [postEnrichEmail, setPostEnrichEmail] = useState("");
  const [contactListsForDialog, setContactListsForDialog] = useState<EmailList[]>([]);

  // Email List Modal state
  const [emailListModalOpen, setEmailListModalOpen] = useState(false);
  const [emailListModalMode, setEmailListModalMode] = useState<"single" | "bulk">("single");
  const [emailListModalCreator, setEmailListModalCreator] = useState<CreatorCard | null>(null);
  const [emailListModalEmail, setEmailListModalEmail] = useState<string | null>(null);
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [emailListsLoading, setEmailListsLoading] = useState(false);
  const [selectedEmailListId, setSelectedEmailListId] = useState("");
  const [newEmailListName, setNewEmailListName] = useState("");
  const [creatingEmailList, setCreatingEmailList] = useState(false);
  const [addingToEmailList, setAddingToEmailList] = useState(false);
  const [bulkEnrichProgress, setBulkEnrichProgress] = useState<{
    current: number; total: number; found: number; notFound: number;
  } | null>(null);

  // Username search fallback state
  const [usernameNotFound, setUsernameNotFound] = useState<{
    handle: string;
    platform: string;
    fallbackResults: CreatorCard[] | null;
    foundOnPlatform: string | null;
    foundOnPlatformResults: CreatorCard[] | null;
  } | null>(null);

  // Smart search state
  const [searchHint, setSearchHint] = useState<string>("");
  const [similarCreators, setSimilarCreators] = useState<CreatorCard[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  const { lists, addCreatorToList, createList, isCreatorInList, getCreatorListNames } = useLists();
  const { user, effectiveUserId, isSuperAdmin } = useAuth();
  const [approvingDir, setApprovingDir] = useState(false);
  const [directoriesList, setDirectoriesList] = useState<{ id: string; name: string }[]>([]);
  // Track which handles are already in each directory (dir_id → Set<handle>)
  const [directoryHandles, setDirectoryHandles] = useState<Map<string, Set<string>>>(new Map());

  // Load directories + their member handles for duplicate detection
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: dirs } = await supabase
        .from("directories")
        .select("id, name")
        .order("created_at", { ascending: true });
      if (dirs) {
        setDirectoriesList(dirs as { id: string; name: string }[]);
        // Fetch all member handles in one query
        const { data: members } = await supabase
          .from("directory_members")
          .select("directory_id, creator_handle");
        const map = new Map<string, Set<string>>();
        for (const m of members ?? []) {
          const did = (m as { directory_id: string }).directory_id;
          const h = (m as { creator_handle: string }).creator_handle.toLowerCase();
          if (!map.has(did)) map.set(did, new Set());
          map.get(did)!.add(h);
        }
        setDirectoryHandles(map);
      }
    })();
  }, [user]);

  /** Check if a handle is already in a specific directory */
  const isInDirectory = (handle: string | undefined, dirId: string): boolean => {
    if (!handle) return false;
    return directoryHandles.get(dirId)?.has(handle.replace(/^@/, "").toLowerCase()) ?? false;
  };

  /** Check if a handle is in ANY directory */
  const isInAnyDirectory = (handle: string | undefined): boolean => {
    if (!handle) return false;
    const h = handle.replace(/^@/, "").toLowerCase();
    for (const handles of directoryHandles.values()) {
      if (handles.has(h)) return true;
    }
    return false;
  };

  // --- Location autocomplete ---
  const handleLocationInputChange = useCallback((value: string) => {
    setLocationInput(value);
    // If user clears input, clear the selected location too
    if (!value.trim()) {
      setLocationFilter("");
      setLocationSuggestions([]);
      setLocationDropdownOpen(false);
      setLocationLoading(false);
      return;
    }
    // If user edits a previously selected location, clear the filter
    // so raw text never gets sent to the API
    setLocationFilter("");
    // Debounce API call
    if (locationTimerRef.current) clearTimeout(locationTimerRef.current);
    locationAbortRef.current?.abort();
    setLocationLoading(true);
    setLocationDropdownOpen(true);
    locationTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      locationAbortRef.current = controller;
      try {
        const results = await searchLocations(value, "instagram", controller.signal);
        if (!controller.signal.aborted) {
          setLocationSuggestions(results);
          setLocationLoading(false);
          setLocationDropdownOpen(results.length > 0);
        }
      } catch {
        if (!controller.signal.aborted) setLocationLoading(false);
      }
    }, 300);
  }, []);

  const handleLocationSelect = useCallback((loc: string) => {
    setLocationFilter(loc);
    setLocationInput(loc);
    setLocationDropdownOpen(false);
    setLocationSuggestions([]);
    setLocationLoading(false);
  }, []);

  // Close location dropdown on outside click
  useEffect(() => {
    if (!locationDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (locationWrapperRef.current && !locationWrapperRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [locationDropdownOpen]);

  // --- Saved searches state ---
  const [savedSearches, setSavedSearches] = useState<SavedSearchRow[]>([]);
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [savingSearch, setSavingSearch] = useState(false);
  const didAutoLoad = useRef(false);

  const getCurrentFilters = useCallback((): SavedSearchFilters => ({
    searchQuery,
    platform,
    followersRange,
    engagementMin,
    locationFilter,
    niche,
    gender,
    language,
    keywordsInBio,
    sortBy,
    selectedBranches: Array.from(selectedBranches),
  }), [searchQuery, platform, followersRange, engagementMin, locationFilter, niche, gender, language, keywordsInBio, sortBy, selectedBranches]);

  const applyFilters = useCallback((f: SavedSearchFilters) => {
    try {
      setSearchQuery(f.searchQuery ?? "");
      // platform may be a string (old saved searches) or null/undefined
      const rawPlatform = f.platform;
      setPlatform(
        Array.isArray(rawPlatform) ? rawPlatform
        : typeof rawPlatform === "string" && rawPlatform ? [rawPlatform]
        : []
      );
      setFollowersRange(f.followersRange ?? "any");
      setEngagementMin(f.engagementMin ?? "any");
      setLocationFilter(f.locationFilter ?? "");
      setLocationInput(f.locationFilter ?? "");
      setNiche(f.niche ?? "All niches");
      setGender(f.gender ?? "any");
      setLanguage(f.language ?? "any");
      setKeywordsInBio(f.keywordsInBio ?? "");
      setSortBy(f.sortBy ?? "confidence");
      setSelectedBranches(new Set(Array.isArray(f.selectedBranches) ? f.selectedBranches as Branch[] : []));
    } catch (err) {
      console.error("[BrandDiscover] applyFilters crashed:", err, "filters:", f);
    }
  }, []);

  // Save last search to localStorage whenever a search runs
  const persistLastSearch = useCallback((filters: SavedSearchFilters) => {
    try { localStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(filters)); } catch { /* quota */ }
  }, []);

  // Build a shareable URL from current filter state
  const buildSearchUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (platform.length > 0 && platform[0]) params.set("platform", platform[0]);
    if (selectedBranches.size > 0) params.set("branch", Array.from(selectedBranches).join(","));
    if (locationFilter.trim()) params.set("location", locationFilter.trim());
    if (followersRange !== "any") params.set("followers", followersRange);
    if (engagementMin !== "any") params.set("engagement", engagementMin);
    if (gender !== "any") params.set("gender", gender);
    if (sortBy !== "confidence") params.set("sort", sortBy);
    if (viewMode !== "list") params.set("view", viewMode);
    if (niche !== "All niches") params.set("niche", niche);
    if (language !== "any") params.set("language", language);
    if (keywordsInBio.trim()) params.set("keywords", keywordsInBio.trim());
    const qs = params.toString();
    return `${window.location.pathname}${qs ? `?${qs}` : ""}`;
  }, [searchQuery, platform, selectedBranches, locationFilter, followersRange, engagementMin, gender, sortBy, viewMode, niche, language, keywordsInBio]);

  // Update browser URL with current search (replaceState to avoid history spam)
  const updateUrlWithSearch = useCallback(() => {
    const url = buildSearchUrl();
    window.history.replaceState(null, "", url);
  }, [buildSearchUrl]);

  // Copy shareable search link to clipboard
  const handleCopySearchLink = useCallback(() => {
    const url = `${window.location.origin}${buildSearchUrl()}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied!");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  }, [buildSearchUrl]);

  // Load saved searches from Supabase
  const loadSavedSearches = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("saved_searches")
        .select("id, name, search_query, filters, created_at")
        .eq("user_id", effectiveUserId!)
        .order("created_at", { ascending: false });
      if (error) console.error("[SavedSearch] Load failed:", error.message, error);
      if (data) setSavedSearches(data as SavedSearchRow[]);
    } catch (err) {
      console.error("[SavedSearch] loadSavedSearches crashed:", err);
    }
  }, [user]);

  // Save current search to Supabase
  const handleSaveSearch = async () => {
    if (guardAction("save")) return;
    if (!user || !saveSearchName.trim()) return;
    setSavingSearch(true);
    const filters = getCurrentFilters();
    const { error } = await supabase.from("saved_searches").insert({
      user_id: effectiveUserId!,
      name: saveSearchName.trim(),
      search_query: filters.searchQuery,
      filters,
    });
    setSavingSearch(false);
    if (error) {
      console.error("[SavedSearch] Insert failed:", error.message, error.details, error.hint, error);
      toast.error(`Failed to save search: ${error.message}`);
    } else {
      toast.success(`Saved "${saveSearchName.trim()}"`);
      setSaveSearchOpen(false);
      setSaveSearchName("");
      loadSavedSearches();
    }
  };

  // Delete a saved search
  const handleDeleteSavedSearch = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (guardAction("delete")) return;
    await supabase.from("saved_searches").delete().eq("id", id);
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  };

  const pendingAutoSearch = useRef(false);

  // Load a saved search: apply filters then trigger search
  const handleLoadSavedSearch = useCallback((saved: SavedSearchRow) => {
    try {
      if (!saved.filters || typeof saved.filters !== "object") {
        console.error("[SavedSearch] Invalid filters in saved search:", saved);
        toast.error("Saved search has invalid data");
        return;
      }
      applyFilters(saved.filters);
      pendingAutoSearch.current = true;
    } catch (err) {
      console.error("[SavedSearch] handleLoadSavedSearch crashed:", err, "saved:", saved);
      toast.error("Failed to load saved search");
    }
  }, [applyFilters]);

  // Fetch credit balance
  const refreshCredits = useCallback(async () => {
    setCreditLoading(true);
    const data = await fetchCredits();
    if (data) setCreditBalance(data);
    setCreditLoading(false);
  }, []);

  // Load saved searches and credits on mount
  useEffect(() => { loadSavedSearches(); refreshCredits(); }, [loadSavedSearches, refreshCredits]);

  // Load trending creators for empty state
  useEffect(() => {
    setTrendingLoading(true);
    fetchShowcaseCreators(8)
      .then((creators) => setTrendingCreators(creators))
      .catch(() => console.warn("[BrandDiscover] Failed to load trending creators"))
      .finally(() => setTrendingLoading(false));
  }, []);

  // Load 30 showcase avatars for search-loading animation
  useEffect(() => {
    fetchShowcaseCreators(30)
      .then((creators) => {
        const avatars = creators
          .filter((c) => c.ic_avatar_url || c.avatar_url)
          .map((c) => ({ url: (c.ic_avatar_url || c.avatar_url)!, name: c.display_name }));
        setShowcaseAvatars(avatars);
      })
      .catch(() => {});
  }, []);

  // Get Contact Info handler (full enrichment - 1.03 credits)
  const handleGetContactInfo = async (creator: CreatorCard) => {
    if (!creator.username) return;
    setContactLoading(true);
    try {
      // Check Supabase cache first to avoid double-charging
      const cached = await getCachedEnrichment(creator.username, creator.name || undefined);
      const cachedEmail = cached?.result?.email ? String(cached.result.email) : null;
      if (cachedEmail) {
        setContactEmails((prev) => ({ ...prev, [creator.id]: cachedEmail }));
        const partial = extractFromEnrichment(cached!);
        setEnrichCache((prev) => ({ ...prev, [creator.id]: partial }));
        setEnrichRawCache((prev) => ({ ...prev, [creator.id]: cached! }));
        setPostEnrichCreator(creator);
        setPostEnrichEmail(cachedEmail);
        getEmailLists().then(setContactListsForDialog).catch(() => {});
        toast.success(`Email found for ${creator.name} (cached)`);
        setContactLoading(false);
        setContactConfirmCreator(null);
        return;
      }

      const data = await fullEnrichCreatorProfile(creator.username, undefined, enrichPlatform);
      const foundEmail = data?.result?.email ? String(data.result.email) : null;
      if (foundEmail) {
        setContactEmails((prev) => ({ ...prev, [creator.id]: foundEmail }));
        setPostEnrichCreator(creator);
        setPostEnrichEmail(foundEmail);
        getEmailLists().then(setContactListsForDialog).catch(() => {});
      } else {
        toast.info(`No email found for ${creator.name}`);
      }
      // Update the enrichment caches with the richer data
      if (data) {
        const partial = extractFromEnrichment(data);
        setEnrichCache((prev) => ({ ...prev, [creator.id]: partial }));
        setEnrichRawCache((prev) => ({ ...prev, [creator.id]: data }));
        // Persist to Supabase cache so future lookups skip the API
        setCachedEnrichment(creator.username, data);
      }
      // Log credit usage
      if (effectiveUserId) {
        logCreditUsage(effectiveUserId, "full_enrichment", 1.03, { handle: creator.username });
      }
      refreshCredits();
    } catch (err) {
      toast.error(`Failed to get contact info: ${(err as Error).message}`);
    } finally {
      setContactLoading(false);
      setContactConfirmCreator(null);
    }
  };

  // Post-enrichment: add creator to email_contacts
  const handleAddToContacts = async (creator: CreatorCard, email: string, listId: string) => {
    const nameParts = (creator.name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    try {
      await addFullContact({
        list_id: listId,
        email,
        first_name: firstName,
        last_name: lastName,
        source: "enrichment" as any,
        metadata: {
          username: creator.username,
          platform: enrichPlatform,
          followers: creator.followers,
          avatar: creator.avatar,
        },
      });
      toast.success(`${creator.name} added to contacts`);
      setPostEnrichCreator(null);
    } catch (err) {
      toast.error(`Failed to add contact: ${(err as Error).message}`);
    }
  };

  // ── Email List Modal handlers ──

  const handleOpenEmailListModal = async (creator?: CreatorCard, preknownEmail?: string) => {
    setEmailListModalMode(creator ? "single" : "bulk");
    setEmailListModalCreator(creator ?? null);
    setEmailListModalEmail(preknownEmail ?? (creator ? contactEmails[creator.id] ?? null : null));
    setSelectedEmailListId("");
    setNewEmailListName("");
    setBulkEnrichProgress(null);
    setAddingToEmailList(false);
    setEmailListModalOpen(true);
    setEmailListsLoading(true);
    try {
      const lists = await getEmailLists();
      setEmailLists(lists);
    } catch { setEmailLists([]); }
    finally { setEmailListsLoading(false); }
  };

  const handleCreateEmailList = async () => {
    const name = newEmailListName.trim();
    if (!name) return;
    setCreatingEmailList(true);
    const result = await upsertEmailList({ name });
    if (result) {
      setEmailLists((prev) => [result, ...prev]);
      setSelectedEmailListId(result.id);
      setNewEmailListName("");
      toast.success(`Created "${name}"`);
    } else {
      toast.error("Failed to create email list");
    }
    setCreatingEmailList(false);
  };

  const creatorToEmailContact = (creator: CreatorCard, email: string) => {
    const nameParts = (creator.name || "").split(" ");
    const enriched = enrichCache[creator.id] ?? {};
    const raw = enrichRawCache[creator.id];
    const creatorHas = raw?.result?.creator_has as Record<string, boolean> | undefined;
    const platforms = creator.socialPlatforms ?? enriched.socialPlatforms ?? [];

    // Build per-platform handle map for getSocials() in ContactDrawer
    const platformHandles: Record<string, string> = {};
    const handle = creator.username?.replace(/^@/, "");
    if (handle) {
      // Save the handle under its primary platform key
      platformHandles[enrichPlatform] = handle;
      // For other platforms in creator_has, save the handle too (same creator)
      if (creatorHas) {
        for (const p of ["instagram", "tiktok", "youtube", "twitter", "linkedin"]) {
          if (creatorHas[p] && !platformHandles[p]) platformHandles[p] = handle;
        }
      }
    }

    const enrichedAvatar = enriched.avatar || (raw ? extractAvatarFromEnrichment(raw) : null);

    return {
      email,
      first_name: nameParts[0] || undefined,
      last_name: nameParts.slice(1).join(" ") || undefined,
      source: "creator" as const,
      metadata: {
        ...platformHandles,
        username: creator.username,
        platform: enrichPlatform,
        followers: creator.followers,
        engagement_rate: creator.engagementRate,
        avatar: enrichedAvatar || creator.avatar,
        location: creator.location ?? enriched.location,
        bio: creator.bio,
        hashtags: creator.hashtags ?? enriched.hashtags,
        external_links: creator.externalLinks ?? enriched.externalLinks,
        social_platforms: platforms,
      },
    };
  };

  const handleAddSingleToEmailList = async () => {
    if (!selectedEmailListId) { toast.error("Select an email list first"); return; }
    if (!emailListModalCreator) return;
    setAddingToEmailList(true);
    const creator = emailListModalCreator;
    let email = emailListModalEmail || contactEmails[creator.id] || null;

    // Enrich if no email — check cache first to avoid double-charging
    if (!email && creator.username) {
      const cached = await getCachedEnrichment(creator.username, creator.name || undefined);
      const cachedEmail = cached?.result?.email ? String(cached.result.email) : null;
      if (cachedEmail) {
        email = cachedEmail;
        setContactEmails((prev) => ({ ...prev, [creator.id]: cachedEmail }));
        if (cached) {
          const partial = extractFromEnrichment(cached);
          setEnrichCache((prev) => ({ ...prev, [creator.id]: partial }));
          setEnrichRawCache((prev) => ({ ...prev, [creator.id]: cached }));
        }
      }
    }
    if (!email) {
      if (!creator.username) { toast.error("No username available to look up email"); setAddingToEmailList(false); return; }
      try {
        const data = await fullEnrichCreatorProfile(creator.username, undefined, enrichPlatform);
        const foundEmail = data?.result?.email ? String(data.result.email) : null;
        if (foundEmail) {
          email = foundEmail;
          setContactEmails((prev) => ({ ...prev, [creator.id]: foundEmail }));
        }
        if (data) {
          const partial = extractFromEnrichment(data);
          setEnrichCache((prev) => ({ ...prev, [creator.id]: partial }));
          setEnrichRawCache((prev) => ({ ...prev, [creator.id]: data }));
          setCachedEnrichment(creator.username, data);
        }
        if (effectiveUserId) logCreditUsage(effectiveUserId, "full_enrichment", 1.03, { handle: creator.username });
        refreshCredits();
      } catch (err) {
        toast.error(`Failed to enrich: ${(err as Error).message}`);
        setAddingToEmailList(false);
        return;
      }
    }

    if (!email) { toast.error(`No email found for ${creator.name}`); setAddingToEmailList(false); return; }

    try {
      const payload = creatorToEmailContact(creator, email);
      await addFullContact({ list_id: selectedEmailListId, ...payload });
      const listName = emailLists.find((l) => l.id === selectedEmailListId)?.name ?? "list";
      toast.success(`Added ${creator.name} to ${listName} and Contacts`);
      setEmailListModalOpen(false);
    } catch (err) {
      toast.error(`Failed to add contact: ${(err as Error).message}`);
    } finally {
      setAddingToEmailList(false);
    }
  };

  const handleBulkAddToEmailList = async () => {
    if (!selectedEmailListId) { toast.error("Select an email list first"); return; }
    const selected = creators.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) return;
    setAddingToEmailList(true);

    const withEmail: { creator: CreatorCard; email: string }[] = [];
    const needEnrich: CreatorCard[] = [];
    for (const c of selected) {
      const existing = contactEmails[c.id];
      if (existing) { withEmail.push({ creator: c, email: existing }); }
      else if (c.username) { needEnrich.push(c); }
    }

    // Check cache first to avoid unnecessary API calls
    if (needEnrich.length > 0) {
      const cachedEmails = await getBatchCachedEmails(needEnrich.map((c) => c.username!));
      const stillNeed: CreatorCard[] = [];
      for (const c of needEnrich) {
        const cachedEmail = cachedEmails.get(c.username!.toLowerCase());
        if (cachedEmail) {
          withEmail.push({ creator: c, email: cachedEmail });
          setContactEmails((prev) => ({ ...prev, [c.id]: cachedEmail }));
        } else {
          stillNeed.push(c);
        }
      }
      needEnrich.length = 0;
      needEnrich.push(...stillNeed);
    }

    // Enrich those that still need it
    if (needEnrich.length > 0) {
      setBulkEnrichProgress({ current: 0, total: needEnrich.length, found: 0, notFound: 0 });
      let found = 0, notFound = 0;
      for (let i = 0; i < needEnrich.length; i++) {
        const c = needEnrich[i];
        try {
          const data = await fullEnrichCreatorProfile(c.username!, undefined, enrichPlatform);
          const foundEmail = data?.result?.email ? String(data.result.email) : null;
          if (foundEmail) {
            withEmail.push({ creator: c, email: foundEmail });
            setContactEmails((prev) => ({ ...prev, [c.id]: foundEmail }));
            found++;
            if (data) {
              const partial = extractFromEnrichment(data);
              setEnrichCache((prev) => ({ ...prev, [c.id]: partial }));
              setEnrichRawCache((prev) => ({ ...prev, [c.id]: data }));
              setCachedEnrichment(c.username!, data);
            }
          } else { notFound++; }
          if (effectiveUserId) logCreditUsage(effectiveUserId, "full_enrichment", 1.03, { handle: c.username });
        } catch { notFound++; }
        setBulkEnrichProgress({ current: i + 1, total: needEnrich.length, found, notFound });
      }
      refreshCredits();
    }

    if (withEmail.length > 0) {
      const contacts = withEmail.map(({ creator, email }) => creatorToEmailContact(creator, email));
      const result = await syncBulkContacts(selectedEmailListId, contacts);
      const listName = emailLists.find((l) => l.id === selectedEmailListId)?.name ?? "list";
      toast.success(
        `Added ${result.inserted} contact${result.inserted !== 1 ? "s" : ""} to ${listName}` +
        (result.duplicates > 0 ? ` (${result.duplicates} already existed)` : "")
      );
    } else {
      toast.warning("No emails found for any selected creators");
    }

    setBulkEnrichProgress(null);
    setAddingToEmailList(false);
    setEmailListModalOpen(false);
    setSelectedIds(new Set());
  };

  // Auto-load from URL query params (AI handoff) or localStorage on mount
  useEffect(() => {
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;

    // URL params from AI Chat → Discovery handoff take priority
    const params = new URLSearchParams(window.location.search);
    const urlQ = params.get("q") || params.get("query") || params.get("search");
    if (urlQ?.trim()) {
      const query = urlQ.trim();
      setSearchQuery(query);
      const urlPlatform = params.get("platform");
      if (urlPlatform) setPlatform([urlPlatform]);
      // Followers — accept "followers=nano" (value key) or legacy "min_followers=1000"
      const urlFollowers = params.get("followers");
      if (urlFollowers) {
        const match = FOLLOWER_OPTIONS.find((o) => o.value === urlFollowers);
        if (match) setFollowersRange(match.value);
      } else {
        const minF = params.get("min_followers");
        const maxF = params.get("max_followers");
        if (minF || maxF) {
          const minVal = minF ? Number(minF) : null;
          const maxVal = maxF ? Number(maxF) : null;
          const match = FOLLOWER_OPTIONS.find((o) =>
            o.min === minVal && o.max === maxVal
          ) ?? FOLLOWER_OPTIONS.find((o) =>
            o.min != null && minVal != null && o.min <= minVal && (o.max == null || (maxVal != null && o.max >= maxVal))
          );
          if (match) setFollowersRange(match.value);
        }
      }
      // Engagement — accept "engagement=3" (value key) or legacy "min_engagement=3"
      const urlEngagement = params.get("engagement");
      if (urlEngagement) {
        const match = ENGAGEMENT_OPTIONS.find((o) => o.value === urlEngagement);
        if (match) setEngagementMin(match.value);
      } else {
        const minE = params.get("min_engagement");
        if (minE) {
          const engVal = Number(minE);
          const match = ENGAGEMENT_OPTIONS.find((o) => o.min === engVal);
          if (match) setEngagementMin(match.value);
        }
      }
      // Branch
      const urlBranch = params.get("branch");
      if (urlBranch) {
        const branches = urlBranch.split(",").filter((b) =>
          (BRANCHES as readonly string[]).includes(b)
        ) as Branch[];
        if (branches.length > 0) setSelectedBranches(new Set(branches));
      }
      // Category
      const urlCategory = params.get("category");
      if (urlCategory) {
        const match = CREATOR_TYPES.find((ct) => ct.value === urlCategory);
        if (match) setCreatorType(match.value);
      }
      // Location
      const urlLocation = params.get("location");
      if (urlLocation) { setLocationFilter(urlLocation); setLocationInput(urlLocation); }
      // Gender
      const urlGender = params.get("gender");
      if (urlGender) setGender(urlGender);
      // Sort
      const urlSort = params.get("sort");
      if (urlSort) setSortBy(urlSort);
      // View mode
      const urlView = params.get("view");
      if (urlView === "grid" || urlView === "list") setViewMode(urlView);
      // Niche
      const urlNiche = params.get("niche");
      if (urlNiche) setNiche(urlNiche);
      // Language
      const urlLang = params.get("language");
      if (urlLang) setLanguage(urlLang);
      // Keywords in bio
      const urlKeywords = params.get("keywords");
      if (urlKeywords) setKeywordsInBio(urlKeywords);

      pendingAutoSearch.current = true;
      return;
    }

    // Super admin demo: pre-load "mil spouse" search
    if (isSuperAdmin) {
      setSearchQuery("mil spouse");
      searchQueryRef.current = "mil spouse";
      pendingAutoSearch.current = true;
      return;
    }

    // localStorage auto-load removed — only pre-populate from URL params
  }, [applyFilters, urlSearchParams, isSuperAdmin]);

  const runSearch = useCallback(() => {
    const q = searchQuery.trim().replace(/^@/, "");
    const ctConfig = CREATOR_TYPES.find((ct) => ct.value === creatorType);
    const hasActiveFilters = followersRange !== "any" || engagementMin !== "any" ||
                             selectedBranches.size > 0 || locationFilter.trim() !== "" ||
                             keywordsInBio.trim() !== "" || creatorType !== "all";
    if (!q && !hasActiveFilters) {
      setApiResults(null);
      setApiLoading(false);
      return;
    }
    setApiLoading(true);
    setCurrentPage(1);
    setUsernameNotFound(null);
    enrichAbortRef.current?.abort();
    enrichedSetRef.current = new Set();
    setEnrichCache({});
    setEnrichRawCache({});
    setEnrichingIds(new Set());
    const followerOpt = FOLLOWER_OPTIONS.find((o) => o.value === followersRange);
    const engagementOpt = ENGAGEMENT_OPTIONS.find((o) => o.value === engagementMin);
    const branchKeys = selectedBranches.size > 0 ? Array.from(selectedBranches) : [];
    const bioKeys = keywordsInBio.trim() ? keywordsInBio.split(",").map((k) => k.trim()).filter(Boolean) : [];
    const ctKeywords = ctConfig?.keywords ?? [];
    // Only send explicit filter values — don't merge search query terms here.
    // ai_search handles semantic matching; military scoring ranks results after.
    const allBioKeys = [...new Set([...branchKeys, ...bioKeys, ...ctKeywords])];
    const keywords_in_bio = allBioKeys.length > 0 ? allBioKeys : [""];
    const searchPlatforms = resolveSearchPlatforms(platform, ctConfig?.platformOverride ?? null);
    const baseOptions = {
      number_of_followers: {
        min: followerOpt?.min ?? null,
        max: followerOpt?.max ?? null,
      },
      engagement_percent: {
        min: engagementOpt?.min ?? null,
        max: null as number | null,
      },
      keywords_in_bio,
      sort_by: (sortBy === "confidence" ? "relevancy" : sortBy) as "relevancy" | "followers" | "engagement",
      location: locationFilter.trim() || undefined,
      gender: gender !== "any" ? gender : undefined,
      language: language !== "any" ? language : undefined,
    };
    persistLastSearch(getCurrentFilters());
    updateUrlWithSearch();
    // Run parallel searches for each selected platform, merge & deduplicate
    Promise.all(
      searchPlatforms.map((plat) =>
        searchCreators(q, { ...baseOptions, platform: plat })
          .catch((err) => { console.warn(`[BrandDiscover] Search failed for ${plat}:`, err); return null; })
      )
    )
      .then((results) => {
        if (searchQueryRef.current.trim().replace(/^@/, "") !== q) return;
        const valid = results.filter((r): r is NonNullable<typeof r> => r !== null);
        if (valid.length === 0) { setApiResults(null); return; }
        const allCreators = deduplicateCreators(valid.flatMap((r) => r.creators));
        const total = Math.max(...valid.map((r) => r.total));
        setApiResults({ creators: allCreators, total, rawResponse: valid[0].rawResponse });
        if (effectiveUserId) logCreditUsage(effectiveUserId, "discovery_search", 0.15 * searchPlatforms.length, { query: q, platforms: searchPlatforms, results: total });
        refreshCredits();
      })
      .finally(() => {
        if (searchQueryRef.current.trim().replace(/^@/, "") === q) setApiLoading(false);
      });
  }, [searchQuery, platform, followersRange, engagementMin, sortBy, selectedBranches, locationFilter, keywordsInBio, creatorType, persistLastSearch, getCurrentFilters, updateUrlWithSearch, user, refreshCredits]);

  // Fire search after auto-load applies filters (runs once after state updates)
  // Guard: only consume the flag when searchQuery is non-empty so the effect
  // doesn't fire with a stale empty-string closure on the initial render
  // (the URL-params effect sets pendingAutoSearch=true in the same render cycle
  // before React has committed the searchQuery state update).
  useEffect(() => {
    if (pendingAutoSearch.current && searchQuery.trim()) {
      pendingAutoSearch.current = false;
      const timer = setTimeout(() => {
        runSearch();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, runSearch]);

  const loadMore = useCallback(() => {
    const q = searchQuery.trim().replace(/^@/, "");
    const hasActiveFilters = followersRange !== "any" || engagementMin !== "any" ||
                             selectedBranches.size > 0 || locationFilter.trim() !== "" ||
                             keywordsInBio.trim() !== "";
    if ((!q && !hasActiveFilters) || !apiResults) return;
    const nextPage = currentPage + 1;
    setLoadingMore(true);
    const followerOpt = FOLLOWER_OPTIONS.find((o) => o.value === followersRange);
    const engagementOpt = ENGAGEMENT_OPTIONS.find((o) => o.value === engagementMin);
    const branchKeys = selectedBranches.size > 0 ? Array.from(selectedBranches) : [];
    const bioKeys = keywordsInBio.trim() ? keywordsInBio.split(",").map((k) => k.trim()).filter(Boolean) : [];
    const ctConfig = CREATOR_TYPES.find((ct) => ct.value === creatorType);
    const ctKeywords = ctConfig?.keywords ?? [];
    const allBioKeysMore = [...new Set([...branchKeys, ...bioKeys, ...ctKeywords])];
    const keywords_in_bio = allBioKeysMore.length > 0 ? allBioKeysMore : [""];
    const searchPlatforms = resolveSearchPlatforms(platform, ctConfig?.platformOverride ?? null);
    const baseOptions = {
      number_of_followers: { min: followerOpt?.min ?? null, max: followerOpt?.max ?? null },
      engagement_percent: { min: engagementOpt?.min ?? null, max: null as number | null },
      keywords_in_bio,
      sort_by: (sortBy === "confidence" ? "relevancy" : sortBy) as "relevancy" | "followers" | "engagement",
      location: locationFilter.trim() || undefined,
      gender: gender !== "any" ? gender : undefined,
      language: language !== "any" ? language : undefined,
      page: nextPage,
    };
    Promise.all(
      searchPlatforms.map((plat) =>
        searchCreators(q, { ...baseOptions, platform: plat })
          .catch(() => null)
      )
    )
      .then((results) => {
        const valid = results.filter((r): r is NonNullable<typeof r> => r !== null);
        if (valid.length === 0) return;
        const newCreators = deduplicateCreators(valid.flatMap((r) => r.creators));
        setApiResults((prev) => prev ? {
          ...prev,
          creators: deduplicateCreators([...prev.creators, ...newCreators]),
        } : { creators: newCreators, total: Math.max(...valid.map((r) => r.total)), rawResponse: valid[0].rawResponse });
        setCurrentPage(nextPage);
      })
      .catch((err) => console.warn("[BrandDiscover] Load more failed:", err))
      .finally(() => setLoadingMore(false));
  }, [searchQuery, apiResults, currentPage, platform, creatorType, followersRange, engagementMin, sortBy, selectedBranches, locationFilter]);

  // Username / Lookalike search handler
  const runModeSearch = useCallback(() => {
    // Strip @, trim whitespace, lowercase for case-insensitive matching
    const q = searchQuery.trim().replace(/^@/, "").toLowerCase();
    if (!q) {
      setApiResults(null);
      return;
    }
    const plats = Array.isArray(platform) ? platform : [];
    const currentPlatform = (plats.length > 0 ? plats[0] : "instagram").toLowerCase();
    console.log(`[BrandDiscover] ${searchMode} search — cleaned value: "${q}" (platform: ${currentPlatform})`);
    setApiLoading(true);
    setCurrentPage(1);
    setUsernameNotFound(null);
    enrichAbortRef.current?.abort();
    enrichedSetRef.current = new Set();
    setEnrichCache({});
    setEnrichRawCache({});
    setEnrichingIds(new Set());
    setSmartFiltersApplied([]);

    const searchFn = searchMode === "username" ? searchByUsername : searchLookalike;

    searchFn(q, currentPlatform)
      .then((result) => {
        if (searchQueryRef.current.trim().replace(/^@/, "").toLowerCase() !== q) return;

        // For username search, the raw response IS the enrichment data
        // (searchByUsername already calls the RAW enrich endpoint). Extract enrichment
        // fields and merge them into the creator card BEFORE setting state so the
        // first render already shows all platforms, hashtags, ER, avatar, etc.
        // (Lookalike mode returns multiple creators that need individual enrichment.)
        if (searchMode === "username" && result.creators.length > 0 && result.rawResponse) {
          const raw = result.rawResponse as Record<string, unknown>;
          const apiResult = raw?.result as Record<string, unknown> | undefined;
          const platKey = currentPlatform === "all" ? "instagram" : currentPlatform;
          const platData = (apiResult?.[platKey] as Record<string, unknown>) ??
            (platKey !== "instagram" ? (apiResult?.instagram as Record<string, unknown>) : undefined);

          if (apiResult && platData) {
            const enrichResponse: EnrichedProfileResponse = {
              result: apiResult,
              instagram: platData,
            };

            result.creators.forEach((creator) => {
              // Validate enrichment data matches this specific creator
              const enrichedUsername = (platData.username as string)?.toLowerCase();
              if (enrichedUsername && creator.username && enrichedUsername !== creator.username.toLowerCase()) {
                console.warn(`[usernameEnrich] Enrichment username "${enrichedUsername}" doesn't match card "${creator.username}" — skipping merge`);
                enrichedSetRef.current.add(creator.id);
                return;
              }
              console.log("Enriching username result:", creator.username, "creator_has:", apiResult.creator_has);
              const partial = extractFromEnrichment(enrichResponse);
              // Merge enrichment data directly into the card
              Object.assign(creator, partial);
              // Pre-populate caches so background enrichment skips this creator
              enrichedSetRef.current.add(creator.id);
              setEnrichCache((prev) => ({ ...prev, [creator.id]: partial }));
              setEnrichRawCache((prev) => ({ ...prev, [creator.id]: enrichResponse }));
              // Save to Supabase cache (fire-and-forget)
              if (creator.username) setCachedEnrichment(creator.username, enrichResponse);
              maybeUpdateFeaturedAvatar(creator.username ?? "", enrichResponse);
            });
          }
        }

        setApiResults(result);
        if (effectiveUserId) logCreditUsage(effectiveUserId, "discovery_search", 0.15, { query: q, mode: searchMode, results: result.total });
        refreshCredits();
      })
      .catch(async (err) => {
        if (searchQueryRef.current.trim().replace(/^@/, "").toLowerCase() !== q) return;

        const cause = (err as Error & { cause?: Record<string, unknown> })?.cause;
        const status = (err as Error).message?.match(/(\d{3})/)?.[1];
        console.warn(`[BrandDiscover] ${searchMode} search failed (status ${status}):`, err, "cause:", cause);

        // Only do fallback for username mode on 400/404 (user not found)
        if (searchMode === "username" && (status === "400" || status === "404")) {
          // Set "not found" state — don't toast an error
          setApiResults({ creators: [], total: 0, rawResponse: null });
          const notFoundState: typeof usernameNotFound = {
            handle: q,
            platform: currentPlatform,
            fallbackResults: null,
            foundOnPlatform: null,
            foundOnPlatformResults: null,
          };
          setUsernameNotFound(notFoundState);

          // Auto-fallback 1: keyword search with same term
          try {
            const keywordResult = await searchCreators(q, { platform: currentPlatform });
            if (searchQueryRef.current.trim().replace(/^@/, "").toLowerCase() === q) {
              setUsernameNotFound((prev) => prev ? { ...prev, fallbackResults: keywordResult.creators } : prev);
            }
          } catch (kwErr) {
            console.warn("[BrandDiscover] Keyword fallback also failed:", kwErr);
          }

          // Auto-fallback 2: try other platforms silently
          const otherPlatforms = ["instagram", "tiktok", "youtube", "twitter"].filter((p) => p !== currentPlatform);
          for (const tryPlatform of otherPlatforms) {
            if (searchQueryRef.current.trim().replace(/^@/, "").toLowerCase() !== q) break;
            try {
              const altResult = await searchByUsername(q, tryPlatform);
              if (altResult.creators.length > 0) {
                console.log(`[BrandDiscover] Found @${q} on ${tryPlatform}!`);
                if (searchQueryRef.current.trim().replace(/^@/, "").toLowerCase() === q) {
                  setUsernameNotFound((prev) => prev ? { ...prev, foundOnPlatform: tryPlatform, foundOnPlatformResults: altResult.creators } : prev);
                }
                break; // Stop after first match
              }
            } catch {
              // Platform didn't find them either, continue
            }
          }
        } else {
          // Non-400 error — show toast as before
          setApiResults(null);
          const detail = cause?.error ?? cause?.details ?? cause?.message ?? "";
          toast.error(`Search failed: ${(err as Error).message}${detail ? ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`);
        }
      })
      .finally(() => {
        if (searchQueryRef.current.trim().replace(/^@/, "").toLowerCase() === q) setApiLoading(false);
      });
  }, [searchQuery, searchMode, platform, user, refreshCredits]);

  // Core search executor — shared by both NL and regex paths
  const executeSearch = useCallback((effectiveQuery: string, overrides: {
    effPlatforms?: string[]; effFollowers?: string; effEngagement?: string;
    effBranches?: string[]; effLocation?: string; effGender?: string;
  } = {}) => {
    const ctConfig = CREATOR_TYPES.find((ct) => ct.value === creatorType);
    const effPlatforms = overrides.effPlatforms ?? platform;
    const searchPlatforms = resolveSearchPlatforms(effPlatforms, ctConfig?.platformOverride ?? null);
    const effFollowers = overrides.effFollowers ?? followersRange;
    const effEngagement = overrides.effEngagement ?? engagementMin;
    const effBranches = overrides.effBranches ?? Array.from(selectedBranches);
    const effLocation = overrides.effLocation ?? locationFilter;
    const effGender = overrides.effGender ?? gender;
    const followerOpt = FOLLOWER_OPTIONS.find((o) => o.value === effFollowers);
    const engagementOpt = ENGAGEMENT_OPTIONS.find((o) => o.value === effEngagement);
    const bioKeys = keywordsInBio.trim() ? keywordsInBio.split(",").map((k) => k.trim()).filter(Boolean) : [];
    const ctKeywords = ctConfig?.keywords ?? [];
    const kw = [...new Set([...effBranches, ...bioKeys, ...ctKeywords])];
    const keywords_in_bio = kw.length > 0 ? kw : [""];
    const baseOptions = {
      number_of_followers: { min: followerOpt?.min ?? null, max: followerOpt?.max ?? null },
      engagement_percent: { min: engagementOpt?.min ?? null, max: null as number | null },
      keywords_in_bio,
      sort_by: (sortBy === "confidence" ? "relevancy" : sortBy) as "relevancy" | "followers" | "engagement",
      location: effLocation?.trim() || undefined,
      gender: effGender !== "any" ? effGender : undefined,
      language: language !== "any" ? language : undefined,
      platform: searchPlatforms[0],
    };

    persistLastSearch({
      searchQuery: effectiveQuery, platform: effPlatforms, followersRange: effFollowers,
      engagementMin: effEngagement, locationFilter: effLocation || "", niche, gender: effGender, language,
      keywordsInBio, sortBy, selectedBranches: effBranches,
    });
    // Update URL with search params (build directly from overrides to avoid stale state)
    {
      const p = new URLSearchParams();
      if (effectiveQuery) p.set("q", effectiveQuery);
      if (effPlatforms.length > 0 && effPlatforms[0]) p.set("platform", effPlatforms[0]);
      if (effBranches.length > 0) p.set("branch", effBranches.join(","));
      if (effLocation?.trim()) p.set("location", effLocation.trim());
      if (effFollowers !== "any") p.set("followers", effFollowers);
      if (effEngagement !== "any") p.set("engagement", effEngagement);
      if (effGender !== "any") p.set("gender", effGender);
      if (sortBy !== "confidence") p.set("sort", sortBy);
      if (viewMode !== "list") p.set("view", viewMode);
      if (niche !== "All niches") p.set("niche", niche);
      if (language !== "any") p.set("language", language);
      if (keywordsInBio.trim()) p.set("keywords", keywordsInBio.trim());
      const qs = p.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }

    smartSearch(effectiveQuery, baseOptions)
      .then((result: SmartSearchResult) => {
        if (searchQueryRef.current.trim().replace(/^@/, "") !== effectiveQuery.replace(/^@/, "")) return;

        // Pre-populate enrichment cache from exact match raw response if available
        if (result.exactMatch && result.exactMatchRaw) {
          const raw = result.exactMatchRaw as Record<string, unknown>;
          const apiResult = raw?.result as Record<string, unknown> | undefined;
          const platKey = searchPlatforms[0] === "all" ? "instagram" : searchPlatforms[0];
          const platData = (apiResult?.[platKey] as Record<string, unknown>) ??
            (platKey !== "instagram" ? (apiResult?.instagram as Record<string, unknown>) : undefined);

          if (apiResult && platData) {
            const enrichResponse: EnrichedProfileResponse = { result: apiResult, instagram: platData };
            const partial = extractFromEnrichment(enrichResponse);
            Object.assign(result.exactMatch, partial);
            enrichedSetRef.current.add(result.exactMatch.id);
            setEnrichCache((prev) => ({ ...prev, [result.exactMatch!.id]: partial }));
            setEnrichRawCache((prev) => ({ ...prev, [result.exactMatch!.id]: enrichResponse }));
            if (result.exactMatch.username) setCachedEnrichment(result.exactMatch.username, enrichResponse);
            maybeUpdateFeaturedAvatar(result.exactMatch.username ?? "", enrichResponse);
          }
        }

        const allCreators = result.exactMatch
          ? [result.exactMatch, ...result.relatedCreators.filter((c) => c.id !== result.exactMatch!.id)]
          : result.relatedCreators;

        if (allCreators.length > 0) {
          setApiResults({
            creators: allCreators.sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0)),
            total: result.relatedTotal + (result.exactMatch ? 1 : 0),
            rawResponse: result.exactMatchRaw,
          });
        } else {
          setApiResults(null);
        }

        if (effectiveUserId) {
          const creditCost = result.exactMatch ? 0.03 : 0;
          logCreditUsage(effectiveUserId, "discovery_search", creditCost + 0.15, {
            query: effectiveQuery, smartType: result.classification.type, results: result.relatedTotal,
          });
        }
        refreshCredits();
      })
      .catch((err) => {
        console.warn("[BrandDiscover] Smart search failed:", err);
        if (searchQueryRef.current.trim().replace(/^@/, "") === effectiveQuery.replace(/^@/, "")) {
          setApiResults(null);
        }
      })
      .finally(() => {
        if (searchQueryRef.current.trim().replace(/^@/, "") === effectiveQuery.replace(/^@/, "")) {
          setApiLoading(false);
        }
      });
  }, [platform, followersRange, engagementMin, sortBy, selectedBranches, locationFilter, keywordsInBio, creatorType, gender, language, niche, persistLastSearch, effectiveUserId, refreshCredits]);

  const handleSmartSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;

    // Route to dedicated handler when explicitly in username or lookalike mode.
    // runModeSearch has cross-platform fallback and keyword fallback for usernames.
    if (searchMode === "username" || searchMode === "lookalike") {
      runModeSearch();
      return;
    }

    // Clear previous NL banner
    setNlBanner(null);

    // Reset common state
    setCurrentPage(1);
    setUsernameNotFound(null);
    enrichAbortRef.current?.abort();
    enrichedSetRef.current = new Set();
    setEnrichCache({});
    setEnrichRawCache({});
    setEnrichingIds(new Set());

    // ── AI Natural Language path ──────────────────────────────────
    if (isNaturalLanguageQuery(q)) {
      setAiParsing(true);
      setApiLoading(true);
      parseNaturalLanguageSearch(q)
        .then((nlResult) => {
          setAiParsing(false);
          if (nlResult.success) {
            const f = nlResult.filters;
            // Apply parsed filters to UI state
            const labels: string[] = [];
            if (f.branch) { setSelectedBranches(new Set([f.branch] as Branch[])); labels.push(f.branch); }
            if (f.location) { setLocationFilter(f.location); setLocationInput(f.location); labels.push(f.location); }
            if (f.platform) { setPlatform([f.platform]); labels.push(f.platform.charAt(0).toUpperCase() + f.platform.slice(1)); }
            if (f.gender) { setGender(f.gender); labels.push(f.gender.charAt(0).toUpperCase() + f.gender.slice(1)); }
            if (f.category) { setCreatorType(f.category); labels.push(f.category); }

            let effFollowers = followersRange;
            if (f.min_followers) {
              effFollowers = followersToRange(f.min_followers);
              setFollowersRange(effFollowers);
              labels.push(`${f.min_followers >= 1000 ? `${(f.min_followers / 1000).toFixed(0)}K` : f.min_followers}+ followers`);
            }
            let effEngagement = engagementMin;
            if (f.engagement_min) {
              effEngagement = engagementToOption(f.engagement_min);
              setEngagementMin(effEngagement);
              labels.push(`>${f.engagement_min}% engagement`);
            }

            setSmartFiltersApplied(labels);
            setNlBanner(nlResult.summary);

            const effectiveQuery = f.keyword || "military";
            searchQueryRef.current = effectiveQuery;

            executeSearch(effectiveQuery, {
              effPlatforms: f.platform ? [f.platform] : platform,
              effFollowers,
              effEngagement,
              effBranches: f.branch ? [f.branch] : Array.from(selectedBranches),
              effLocation: f.location || locationFilter,
              effGender: f.gender || gender,
            });
          } else {
            // AI failed → fall back to regex path
            runRegexSearch(q);
          }
        })
        .catch(() => {
          setAiParsing(false);
          // AI failed → fall back to regex path
          runRegexSearch(q);
        });
      return;
    }

    // ── Standard regex path ──────────────────────────────────────
    setApiLoading(true);
    runRegexSearch(q);
  }, [searchQuery, searchMode, platform, followersRange, engagementMin, sortBy, selectedBranches, locationFilter, keywordsInBio, creatorType, gender, language, niche, persistLastSearch, getCurrentFilters, runModeSearch, effectiveUserId, refreshCredits, executeSearch]);

  // Regex-based filter parsing + search (original flow)
  const runRegexSearch = useCallback((q: string) => {
    const parsed = parseSmartQuery(q);
    if (parsed.appliedLabels.length > 0) {
      if (parsed.platform) setPlatform([parsed.platform]);
      if (parsed.followersRange) setFollowersRange(parsed.followersRange);
      if (parsed.engagementMin) setEngagementMin(parsed.engagementMin);
      if (parsed.branches.length > 0) setSelectedBranches(new Set(parsed.branches as Branch[]));
      if (parsed.location) { setLocationFilter(parsed.location); setLocationInput(parsed.location); }
      setSmartFiltersApplied(parsed.appliedLabels);
    } else {
      setSmartFiltersApplied([]);
    }

    const effectiveQuery = parsed.appliedLabels.length > 0
      ? (parsed.remainingQuery.trim() || "military")
      : q;

    if (effectiveQuery !== q) {
      searchQueryRef.current = effectiveQuery;
    }

    setApiLoading(true);
    executeSearch(effectiveQuery, {
      effPlatforms: parsed.platform ? [parsed.platform] : undefined,
      effFollowers: parsed.followersRange || undefined,
      effEngagement: parsed.engagementMin || undefined,
      effBranches: parsed.branches.length > 0 ? parsed.branches : undefined,
      effLocation: parsed.location || undefined,
    });
  }, [executeSearch]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSmartSearch();
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSearchMode("keyword");
    setCreatorType("all");
    setPlatform([]);
    setFollowersRange("any");
    setEngagementMin("any");
    setLocationFilter("");
    setLocationInput("");
    setNiche("All niches");
    setSortBy("confidence");
    setSelectedBranches(new Set());
    setApiResults(null);
    setGender("any");
    setLanguage("any");
    setKeywordsInBio("");
    setSmartFiltersApplied([]);
    setNlBanner(null);
    enrichAbortRef.current?.abort();
    enrichedSetRef.current = new Set();
    setEnrichCache({});
    setEnrichRawCache({});
    setEnrichingIds(new Set());
  };

  const toggleBranch = (branch: Branch) => {
    setSelectedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(branch)) next.delete(branch);
      else next.add(branch);
      return next;
    });
  };

  const hasSearched = apiResults !== null;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (locationFilter) count++;
    if (followersRange !== "any") count++;
    if (engagementMin !== "any") count++;
    if (gender !== "any") count++;
    if (niche !== "All niches") count++;
    if (language !== "any") count++;
    if (keywordsInBio.trim()) count++;
    if (selectedBranches.size > 0) count++;
    return count;
  }, [locationFilter, followersRange, engagementMin, gender, niche, language, keywordsInBio, selectedBranches]);

  // Show fallback keyword results when username search returned 0 direct results
  const creators = ((apiResults?.creators ?? []).length > 0
    ? (apiResults?.creators ?? [])
    : (usernameNotFound?.fallbackResults ?? [])
  ).filter((c) => (c.followers ?? 0) >= 100);

  // Pre-populate contactEmails from Supabase enrichment cache (batch query).
  // Creators enriched in a previous session get the green email icon immediately.
  useEffect(() => {
    const usernames = creators
      .filter((c) => c.username && !contactEmails[c.id])
      .map((c) => c.username!);
    if (usernames.length === 0) return;
    getBatchCachedEmails(usernames).then((emailMap) => {
      if (emailMap.size === 0) return;
      const updates: Record<string, string> = {};
      for (const c of creators) {
        if (c.username && !contactEmails[c.id]) {
          const email = emailMap.get(c.username.toLowerCase());
          if (email) updates[c.id] = email;
        }
      }
      if (Object.keys(updates).length > 0) {
        setContactEmails((prev) => ({ ...prev, ...updates }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiResults]);

  // Background enrichment: enrich creators in parallel batches of 10 with Supabase caching
  // IMPORTANT: checks directory_members for permanent avatar URLs FIRST to avoid
  // burning IC API credits on creators whose avatars are already in Supabase Storage.
  const safePlatform = Array.isArray(platform) ? platform : [];
  const enrichPlatform = safePlatform.length > 0 ? safePlatform[0].toLowerCase() : "instagram";
  useEffect(() => {
    const creatorsToEnrich = (apiResults?.creators ?? []).filter(
      (c) => c.username && !enrichedSetRef.current.has(c.id)
    );
    if (creatorsToEnrich.length === 0) return;

    const controller = new AbortController();
    enrichAbortRef.current = controller;
    const BATCH_SIZE = 10;

    const run = async () => {
      // ── Pre-flight: batch-check directory_members for permanent avatars ──
      const allHandles = creatorsToEnrich
        .map((c) => c.username!)
        .filter(Boolean);
      const dirAvatars = await getDirectoryAvatarBatch(allHandles);
      if (dirAvatars.size > 0) {
        console.log(`[Enrich] Skipping ${dirAvatars.size} creators — permanent avatars in directory_members`);
      }

      for (let i = 0; i < creatorsToEnrich.length; i += BATCH_SIZE) {
        if (controller.signal.aborted) break;

        const batch = creatorsToEnrich.slice(i, i + BATCH_SIZE);
        const batchIds = new Set(batch.map((c) => c.id));
        setEnrichingIds(batchIds);

        const results = await Promise.allSettled(
          batch.map(async (creator) => {
            try {
              // ── 1. Check directory_members for a permanent Supabase Storage avatar ──
              const permAvatar = dirAvatars.get(creator.username!.toLowerCase());
              if (permAvatar && !controller.signal.aborted) {
                enrichedSetRef.current.add(creator.id);
                setEnrichCache((prev) => ({
                  ...prev,
                  [creator.id]: { avatar: permAvatar },
                }));
                return; // skip enrichment entirely — no credits burned
              }

              // ── 2. Check Supabase enrichment cache (7-day TTL) ──
              const cached = await getCachedEnrichment(creator.username!, creator.name || undefined);
              if (cached && !controller.signal.aborted) {
                enrichedSetRef.current.add(creator.id);
                const partial = extractFromEnrichment(cached);
                setEnrichCache((prev) => ({ ...prev, [creator.id]: partial }));
                setEnrichRawCache((prev) => ({ ...prev, [creator.id]: cached }));
                return;
              }

              // ── 3. Cache miss — call the IC API (costs credits) ──
              const data = await enrichCreatorProfile(creator.username!, controller.signal, enrichPlatform);
              if (data && !controller.signal.aborted) {
                // Validate the returned profile matches the requested creator
                const returnedUsername = (data.instagram?.username as string)?.toLowerCase();
                if (returnedUsername && creator.username && returnedUsername !== creator.username.toLowerCase()) {
                  console.warn(`[BgEnrich] API returned "${returnedUsername}" but requested "${creator.username}" — skipping`);
                  enrichedSetRef.current.add(creator.id);
                  return;
                }
                enrichedSetRef.current.add(creator.id);
                const partial = extractFromEnrichment(data);
                setEnrichCache((prev) => ({ ...prev, [creator.id]: partial }));
                setEnrichRawCache((prev) => ({ ...prev, [creator.id]: data }));
                // Save to Supabase cache (fire-and-forget)
                setCachedEnrichment(creator.username!, data);
                // If this handle matches a featured creator, save their avatar
                maybeUpdateFeaturedAvatar(creator.username!, data);
              }
            } catch (err) {
              if ((err as Error)?.name === "AbortError") throw err;
              console.warn("[BrandDiscover] Enrichment failed for", creator.username, err);
              enrichedSetRef.current.add(creator.id);
            }
          })
        );

        const aborted = results.some(
          (r) => r.status === "rejected" && (r.reason as Error)?.name === "AbortError"
        );
        if (aborted || controller.signal.aborted) break;
      }
      if (!controller.signal.aborted) setEnrichingIds(new Set());
    };

    run();

    return () => {
      controller.abort();
    };
  }, [apiResults, enrichPlatform]);

  const getMergedCreator = (c: CreatorCard): CreatorCard => {
    const enriched = enrichCache[c.id];
    return enriched ? { ...c, ...enriched } : c;
  };
  const enrichRunning = enrichingIds.size > 0;

  // Confidence scoring: combines military domain score (from military-scoring.ts)
  // with keyword-match scoring against the user's search terms.
  const getConfidence = useCallback((creator: CreatorCard) => {
    const targets: string[] = [];
    if (searchQuery.trim()) targets.push(...searchQuery.trim().toLowerCase().split(/\s+/));
    if (niche !== "All niches") targets.push(niche.toLowerCase());
    selectedBranches.forEach((b) => targets.push(b.toLowerCase()));
    if (keywordsInBio.trim()) targets.push(...keywordsInBio.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean));
    if (targets.length === 0 && !creator.militaryScore) return { level: "none" as const, score: 0, matches: [] as string[], evidence: [] as string[], militaryPct: 0 };

    // Keyword match scoring (search terms vs creator content)
    const bioText = (creator.bio ?? "").toLowerCase();
    const hashtagText = (creator.hashtags ?? []).join(" ").toLowerCase();
    const nicheText = [creator.nicheClass ?? "", creator.category ?? "", ...(creator.specialties ?? [])].join(" ").toLowerCase();
    const nameText = [(creator.name ?? ""), (creator.username ?? "")].join(" ").toLowerCase();

    let keywordScore = 0;
    const allMatches: string[] = [];
    const stopWords = new Set(["in", "on", "at", "the", "a", "an", "and", "or", "for", "with", "who", "that", "from", "based", "near", "around"]);
    const contentTargets = targets.filter((t) => t.length > 2 && !stopWords.has(t));

    for (const t of contentTargets) {
      const inHashtags = hashtagText.includes(t);
      const inBio = bioText.includes(t);
      const inNiche = nicheText.includes(t);
      const inName = nameText.includes(t);
      if (inHashtags || inBio || inNiche || inName) allMatches.push(t);
      if (inHashtags) keywordScore += 0.25;
      if (inBio) keywordScore += 0.20;
      if (inNiche) keywordScore += 0.10;
      if (inName) keywordScore += 0.10;
    }

    // Blend: 60% military domain score + 40% keyword match score
    const milNorm = (creator.militaryScore ?? 0) / 100; // 0–1
    const kwNorm = Math.min(1, keywordScore); // 0–1
    const blended = milNorm * 0.6 + kwNorm * 0.4;

    // Include military evidence terms in matches
    if (creator.militaryEvidence) {
      allMatches.push(...creator.militaryEvidence);
    }

    const uniqueMatches = [...new Set(allMatches)];
    const level = blended >= 0.4 ? "high" : blended >= 0.15 ? "medium" : "low";
    // Use blended score as displayed percentage — combines military scoring + keyword match
    const militaryPct = Math.round(blended * 100);
    const evidence = creator.militaryEvidence ?? [];
    // Also build keyword-based evidence when military scoring didn't produce any
    const keywordEvidence = evidence.length > 0 ? evidence : allMatches.length > 0
      ? [`Matched keywords: ${allMatches.slice(0, 5).map((t) => `"${t}"`).join(", ")}`]
      : [];
    return { level: level as "high" | "medium" | "low", score: blended, matches: uniqueMatches, evidence: keywordEvidence, militaryPct };
  }, [searchQuery, niche, selectedBranches, keywordsInBio]);
  // Sort by confidence when selected (client-side sort) + platform filter
  const displayCreators = useMemo(() => {
    let filtered = creators;
    // Client-side platform filter: only show creators who have selected platform(s) with followers > 0
    if (platformFilter.size > 0) {
      filtered = filtered.filter((c) => {
        const rawEnrich = enrichRawCache[c.id];
        if (rawEnrich) {
          const platStats = getPlatformStatsFromEnrichment(rawEnrich);
          // OR logic: creator passes if they have ANY of the selected platforms
          return Array.from(platformFilter).some((pf) =>
            platStats.some((ps) => ps.platform === pf && ps.followers > 0)
          );
        }
        // Fallback: check creator.platforms or socialPlatforms array
        const cardPlats = (c.socialPlatforms ?? c.platforms ?? []).map((p) => p.toLowerCase());
        return Array.from(platformFilter).some((pf) => cardPlats.includes(pf));
      });
    }
    if (sortBy !== "confidence") return filtered;
    return [...filtered].sort((a, b) => getConfidence(b).score - getConfidence(a).score);
  }, [creators, sortBy, getConfidence, platformFilter, enrichRawCache]);

  // Top Creator — highest follower count from results
  const topCreator = useMemo(() => {
    if (creators.length === 0) return null;
    const best = creators.reduce((top, c) => ((c.followers ?? 0) > (top.followers ?? 0) ? c : top), creators[0]);
    if (!best || (best.followers ?? 0) === 0) return null;
    return best;
  }, [creators]);

  const totalFromApi = apiResults?.total ?? 0;
  const resultsLabel =
    hasSearched && !apiLoading
      ? platformFilter.size > 0
        ? `Showing ${displayCreators.length} of ${creators.length} results (filtered by platform)`
        : `Showing ${creators.length} of ${totalFromApi >= 1000 ? formatFollowers(totalFromApi) : totalFromApi.toLocaleString()} results`
      : "";

  const creatorToListPayload = (c: CreatorCard) => {
    // Pull enriched avatar from raw cache if available
    const raw = enrichRawCache[c.id];
    const enrichedAvatar = extractAvatarFromEnrichment(raw);
    return {
      id: c.id,
      name: c.name,
      username: c.username,
      avatar: enrichedAvatar || c.avatar,
      followers: c.followers,
      engagementRate: c.engagementRate,
      platforms: c.platforms,
      bio: c.bio,
      location: c.location,
    };
  };

  const doApproveForDirectory = async (creator: CreatorCard, directoryId?: string) => {
    const handle = creator.username ?? creator.id;
    const creatorAny = creator as unknown as Record<string, unknown>;

    // ── Log search-API creator BEFORE enrichment call ──
    console.log("[ADD] creator top-level keys:", Object.keys(creatorAny));
    console.log("[ADD] avatar candidates:", {
      picture: creatorAny.picture,
      avatar: creatorAny.avatar,
      profile_picture: creatorAny.profile_picture,
      profile_pic_url: creatorAny.profile_pic_url,
      thumbnail: creatorAny.thumbnail,
      image: creatorAny.image,
      photo: creatorAny.photo,
      image_url: creatorAny.image_url,
      picture_url: creatorAny.picture_url,
      profile_image_url: creatorAny.profile_image_url,
    });
    // Also log any string value that looks like an image URL
    const creatorUrls = Object.entries(creatorAny)
      .filter(([, v]) => typeof v === "string" && (v as string).match(/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)/i))
      .map(([k, v]) => `${k}: ${(v as string).substring(0, 150)}`);
    if (creatorUrls.length > 0) {
      console.log("[ADD] image-like URLs on creator:", creatorUrls);
    }

    let raw = enrichRawCache[creator.id];

    // If creator hasn't been enriched yet, call enrichment API to get real avatar
    if (!raw) {
      console.log("[doApproveForDirectory] No enrichment cache for", handle, "— calling enrich API");
      try {
        const enrichResult = await enrichCreatorProfile(handle, undefined, creator.platforms?.[0] ?? "instagram");
        if (enrichResult) {
          raw = enrichResult as unknown as EnrichedProfileResponse;
          // Cache it for future use
          setEnrichRawCache((prev) => ({ ...prev, [creator.id]: raw! }));
        }
      } catch (err) {
        console.warn("[doApproveForDirectory] Enrichment failed for", handle, ":", err);
      }
    }

    const igData = raw?.instagram as Record<string, unknown> | undefined;

    // Try to upload avatar to Supabase Storage for a permanent URL.
    // Browser can fetch IG CDN images fine (unlike server-side).
    let avatarUrl = creator.avatar || null;
    if (avatarUrl) {
      try {
        const permanentUrl = await saveCreatorAvatar(handle, avatarUrl);
        if (permanentUrl) {
          console.log("[doApproveForDirectory] Permanent avatar:", permanentUrl);
          avatarUrl = permanentUrl;
        }
      } catch (err) {
        console.warn("[doApproveForDirectory] Avatar upload failed, using CDN URL:", err);
      }
    }

    const bioText = (igData?.biography as string) ?? creator.bio ?? "";
    const branch = detectBranch(bioText);
    const socialPlatforms = creator.socialPlatforms ?? [];

    // Extract banner image from enrichment data
    const bannerUrl = extractBannerImage(raw) ?? null;

    // Extract platform URLs from enrichment data
    const enrichPlatforms = getPlatformsFromEnrichmentData(raw);
    const platformUrls: Record<string, string> = {};
    for (const ep of enrichPlatforms) {
      platformUrls[ep.platform] = ep.url;
    }
    const enrichedPlatformNames = enrichPlatforms.map((ep) => ep.platform);

    // Extract category from IC enrichment
    const enrichCategory = (igData?.category as string) || (igData?.category_name as string) || creator.category || null;

    // Resolve follower count: enrichment may have fresher data than search
    const followerCount =
      (igData?.follower_count as number) ||
      (igData?.followers as number) ||
      (igData?.number_of_followers as number) ||
      creator.followers ||
      null;

    // Resolve engagement rate
    const engagementRate =
      (igData?.engagement_percent as number) ||
      (igData?.engagement_rate as number) ||
      creator.engagementRate ||
      null;

    const { error } = await approveForDirectory({
      handle,
      display_name: creator.name,
      platform: creator.platforms?.[0] ?? "instagram",
      avatar_url: avatarUrl,
      follower_count: followerCount,
      engagement_rate: engagementRate,
      bio: bioText || null,
      branch,
      status: "veteran",
      platforms: enrichedPlatformNames.length > 0 ? enrichedPlatformNames : (socialPlatforms.length > 0 ? socialPlatforms : creator.platforms),
      platform_urls: Object.keys(platformUrls).length > 0 ? platformUrls : undefined,
      category: enrichCategory,
      ic_avatar_url: avatarUrl,
      enrichment_data: raw || null,
      added_by: effectiveUserId ?? null,
      directory_id: directoryId || null,
      banner_image_url: bannerUrl,
    });

    if (error) {
      console.error("[doApproveForDirectory] FAILED for", handle, ":", error);
    }
    return error;
  };

  const handleAddToList = (listId: string, listName: string, creator: CreatorCard) => {
    addCreatorToList(listId, creatorToListPayload(creator));
    toast.success(`Added ${creator.name} to ${listName}`);
  };

  const handleOpenCreateListForCreator = (creator: CreatorCard) => {
    setCreateListPendingCreator(creator);
    setCreateListModalOpen(true);
  };

  const handleCreateListAndAdd = (name: string) => {
    const newId = createList(name);
    if (createListPendingCreator) {
      addCreatorToList(newId, creatorToListPayload(createListPendingCreator));
      toast.success(`Added ${createListPendingCreator.name} to ${name}`);
      setCreateListPendingCreator(null);
    }
  };

  const handleStandaloneApprove = async (creator: CreatorCard, directoryId?: string) => {
    if (!directoryId) return;
    const handle = creator.username ?? creator.id;

    // Warn if already in this directory
    if (isInDirectory(handle, directoryId)) {
      const dirName = directoriesList.find((d) => d.id === directoryId)?.name ?? "directory";
      toast.warning(`${creator.name} is already in ${dirName}`);
      return;
    }

    setApprovingDir(true);
    const error = await doApproveForDirectory(creator, directoryId);
    setApprovingDir(false);
    if (error) {
      toast.error(`Failed to add to directory: ${error}`);
    } else {
      const dirName = directoriesList.find((d) => d.id === directoryId)?.name ?? "directory";
      toast.success(`${creator.name} added to ${dirName}`);
      // Update local tracking
      setDirectoryHandles((prev) => {
        const next = new Map(prev);
        const set = new Set(next.get(directoryId) ?? []);
        set.add(handle.replace(/^@/, "").toLowerCase());
        next.set(directoryId, set);
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === creators.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(creators.map((c) => c.id)));
  };

  const selectedCreators = creators.filter((c) => selectedIds.has(c.id));

  const handleBulkAddToList = (listId: string) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    selectedCreators.forEach((c) => addCreatorToList(listId, creatorToListPayload(c)));
    toast.success(`Added ${selectedCreators.length} creator${selectedCreators.length !== 1 ? "s" : ""} to ${list?.name ?? "list"}`);
    setSelectedIds(new Set());
  };

  const handleImportAll = async () => {
    const toImport = selectedCreators;
    if (toImport.length === 0) return;
    setImportProgress({ current: 0, total: toImport.length });
    let done = 0;
    for (const c of toImport) {
      // Use enriched avatar if available, skip ui-avatars fallbacks
      const enrichedAvatar = extractAvatarFromEnrichment(enrichRawCache[c.id]);
      const bestAvatar = enrichedAvatar || (c.avatar?.includes("ui-avatars.com") ? null : c.avatar) || null;
      await upsertCreator({
        display_name: c.name,
        handle: c.username ?? c.id,
        platform: c.platforms?.[0] ?? "instagram",
        avatar_url: bestAvatar,
        follower_count: c.followers ?? null,
        engagement_rate: c.engagementRate ?? null,
        category: c.category ?? null,
        bio: c.bio ?? null,
        location: c.location ?? null,
        is_verified: c.isVerified ?? false,
      });
      done++;
      setImportProgress({ current: done, total: toImport.length });
    }
    setImportProgress(null);
    setSelectedIds(new Set());
    toast.success(`Imported ${done} creator${done !== 1 ? "s" : ""} to Directory`);
  };

  const handleImportAndAddToList = async (listId: string) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    const toImport = selectedCreators;
    if (toImport.length === 0) return;
    setImportProgress({ current: 0, total: toImport.length });
    let done = 0;
    for (const c of toImport) {
      const enrichedAvatar = extractAvatarFromEnrichment(enrichRawCache[c.id]);
      const bestAvatar = enrichedAvatar || (c.avatar?.includes("ui-avatars.com") ? null : c.avatar) || null;
      await upsertCreator({
        display_name: c.name,
        handle: c.username ?? c.id,
        platform: c.platforms?.[0] ?? "instagram",
        avatar_url: bestAvatar,
        follower_count: c.followers ?? null,
        engagement_rate: c.engagementRate ?? null,
        category: c.category ?? null,
        bio: c.bio ?? null,
        location: c.location ?? null,
        is_verified: c.isVerified ?? false,
      });
      addCreatorToList(listId, creatorToListPayload(c));
      done++;
      setImportProgress({ current: done, total: toImport.length });
    }
    setImportProgress(null);
    setSelectedIds(new Set());
    toast.success(`Imported and added ${done} creator${done !== 1 ? "s" : ""} to ${list.name}`);
  };

  const handleBulkAddToDirectory = async (directoryId: string) => {
    const toAdd = selectedCreators;
    if (toAdd.length === 0) return;
    setApprovingDir(true);
    let added = 0;
    let failed = 0;
    let lastError = "";
    for (const c of toAdd) {
      const error = await doApproveForDirectory(c, directoryId);
      if (error) {
        failed++;
        lastError = error;
        console.error(`[BulkAddToDirectory] Failed for ${c.name}:`, error);
      } else {
        added++;
      }
    }
    setApprovingDir(false);
    const dirName = directoriesList.find((d) => d.id === directoryId)?.name ?? "directory";
    if (failed > 0) {
      toast.error(`Added ${added}, failed ${failed} to ${dirName}: ${lastError}`);
    } else {
      toast.success(`Added ${added} creator${added !== 1 ? "s" : ""} to ${dirName}`);
    }
    setSelectedIds(new Set());
  };

  return (
    <>
      {/* Save Search Modal */}
      <Dialog open={saveSearchOpen} onOpenChange={setSaveSearchOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="save-search-name">Search name</Label>
            <Input
              id="save-search-name"
              placeholder="e.g. Military fitness influencers"
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveSearch(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveSearchOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSearch} disabled={savingSearch || !saveSearchName.trim()} className="bg-pd-blue hover:bg-pd-darkblue text-white">
              {savingSearch ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!importProgress} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Importing creators</DialogTitle>
          </DialogHeader>
          {importProgress && (
            <>
              <p className="text-sm text-muted-foreground">
                Importing {importProgress.current} of {importProgress.total} creators...
              </p>
              <Progress value={(importProgress.current / importProgress.total) * 100} className="h-2" />
            </>
          )}
        </DialogContent>
      </Dialog>
      <CreateListModal
        open={createListForBulkImportOpen}
        onOpenChange={setCreateListForBulkImportOpen}
        onCreate={(name) => {
          const newId = createList(name);
          setCreateListForBulkImportOpen(false);
          setTimeout(() => handleImportAndAddToList(newId), 0);
        }}
      />
      <CreateListModal
        open={createListForBulkAddOpen}
        onOpenChange={setCreateListForBulkAddOpen}
        onCreate={(name) => {
          const newId = createList(name);
          setCreateListForBulkAddOpen(false);
          setTimeout(() => handleBulkAddToList(newId), 0);
        }}
      />
      <CreatorProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        creator={profileCreator}
        cachedEnrichment={profileCreator ? enrichRawCache[profileCreator.id] ?? null : null}
        onOpenCreator={(username) => {
          setProfileCreator({
            id: username,
            name: username,
            username,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&size=128`,
            followers: 0,
            engagementRate: 0,
            platforms: ["instagram"],
            bio: "",
          });
          setProfileModalOpen(true);
        }}
      />
      <CreateListModal
        open={createListModalOpen}
        onOpenChange={(open) => {
          setCreateListModalOpen(open);
          if (!open) setCreateListPendingCreator(null);
        }}
        onCreate={handleCreateListAndAdd}
      />
      {/* Get Contact Info Confirmation Dialog */}
      <Dialog open={!!contactConfirmCreator} onOpenChange={(open) => { if (!open) setContactConfirmCreator(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserSearch className="h-5 w-5 text-blue-700" />
              Get Contact Info
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              This will use <span className="font-bold text-foreground">1.03 credits</span> to retrieve email and contact details for:
            </p>
            {contactConfirmCreator && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <DiscoverAvatar url={contactConfirmCreator.avatar} name={contactConfirmCreator.name} username={contactConfirmCreator.username} />
                <div>
                  <p className="font-semibold text-sm">{contactConfirmCreator.name}</p>
                  <p className="text-xs text-muted-foreground">@{contactConfirmCreator.username}</p>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">Continue?</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setContactConfirmCreator(null)} disabled={contactLoading}>Cancel</Button>
            <Button
              onClick={() => contactConfirmCreator && handleGetContactInfo(contactConfirmCreator)}
              disabled={contactLoading}
              className="bg-blue-700 hover:bg-blue-800 text-white"
            >
              {contactLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
              Get Contact Info (1.03 cr)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-Enrichment Actions Dialog */}
      <Dialog open={!!postEnrichCreator} onOpenChange={(open) => { if (!open) setPostEnrichCreator(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleCheck className="h-5 w-5 text-green-500" />
              Email Found!
            </DialogTitle>
          </DialogHeader>
          {postEnrichCreator && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <DiscoverAvatar url={postEnrichCreator.avatar} name={postEnrichCreator.name} username={postEnrichCreator.username} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{postEnrichCreator.name}</p>
                  <p className="text-xs text-muted-foreground">@{postEnrichCreator.username}</p>
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mt-0.5 truncate">{postEnrichEmail}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">What would you like to do next?</p>
              <div className="space-y-2">
                {/* Add to Email List */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => { handleOpenEmailListModal(postEnrichCreator, postEnrichEmail); setPostEnrichCreator(null); }}
                >
                  <ListPlus className="h-4 w-4" />
                  Add to Email List
                </Button>
                {/* Copy Email */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => { navigator.clipboard.writeText(postEnrichEmail); toast.success("Email copied!"); setPostEnrichCreator(null); }}
                >
                  <Copy className="h-4 w-4" />
                  Copy Email
                </Button>
                {/* Close */}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground"
                  onClick={() => setPostEnrichCreator(null)}
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email List Modal */}
      <Dialog open={emailListModalOpen} onOpenChange={(open) => { if (!open && !addingToEmailList) setEmailListModalOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Add to Email List
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Single mode: creator preview */}
            {emailListModalMode === "single" && emailListModalCreator && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <DiscoverAvatar url={emailListModalCreator.avatar} name={emailListModalCreator.name} username={emailListModalCreator.username} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{emailListModalCreator.name}</p>
                    <p className="text-xs text-muted-foreground">@{emailListModalCreator.username}</p>
                  </div>
                </div>
                {(emailListModalEmail || contactEmails[emailListModalCreator.id]) ? (
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="h-3 w-3 text-green-500" />
                    <span className="text-green-600 dark:text-green-400 font-medium">{emailListModalEmail || contactEmails[emailListModalCreator.id]}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs text-amber-700 dark:text-amber-400">No email on file. Will enrich for 1.03 credits.</span>
                  </div>
                )}
              </div>
            )}

            {/* Bulk mode: summary */}
            {emailListModalMode === "bulk" && (() => {
              const bulkWithEmail = selectedCreators.filter((c) => !!contactEmails[c.id]).length;
              const bulkNeedEnrich = selectedCreators.filter((c) => !contactEmails[c.id] && !!c.username).length;
              const bulkCost = (bulkNeedEnrich * 1.03).toFixed(2);
              return (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 space-y-1.5">
                  <p className="text-sm font-medium">{selectedCreators.length} creator{selectedCreators.length !== 1 ? "s" : ""} selected</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-green-500" /> {bulkWithEmail} have emails</span>
                    {bulkNeedEnrich > 0 && (
                      <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" /> {bulkNeedEnrich} need enrichment ({bulkCost} credits)</span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Bulk enrichment progress */}
            {bulkEnrichProgress && (
              <div className="space-y-2">
                <Progress value={(bulkEnrichProgress.current / bulkEnrichProgress.total) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Enriching {bulkEnrichProgress.current} of {bulkEnrichProgress.total}…
                  {bulkEnrichProgress.found > 0 && <span className="text-green-600"> {bulkEnrichProgress.found} found</span>}
                  {bulkEnrichProgress.notFound > 0 && <span className="text-amber-600">, {bulkEnrichProgress.notFound} not found</span>}
                </p>
              </div>
            )}

            {/* Email list picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email List</Label>
              {emailListsLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading lists…
                </div>
              ) : (
                <Select value={selectedEmailListId} onValueChange={setSelectedEmailListId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an email list…" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailLists.length === 0 && (
                      <SelectItem value="__none" disabled>No email lists — create one below</SelectItem>
                    )}
                    {emailLists.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Create new list inline */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="New list name…"
                value={newEmailListName}
                onChange={(e) => setNewEmailListName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateEmailList(); }}
                className="flex-1 h-9"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateEmailList}
                disabled={!newEmailListName.trim() || creatingEmailList}
                className="shrink-0"
              >
                {creatingEmailList ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEmailListModalOpen(false)} disabled={addingToEmailList}>Cancel</Button>
            <Button
              onClick={emailListModalMode === "single" ? handleAddSingleToEmailList : handleBulkAddToEmailList}
              disabled={addingToEmailList || !selectedEmailListId}
              className="bg-blue-700 hover:bg-blue-800 text-white"
            >
              {addingToEmailList ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
              {emailListModalMode === "single"
                ? (emailListModalEmail || (emailListModalCreator && contactEmails[emailListModalCreator.id]))
                  ? "Add to List"
                  : "Enrich & Add (1.03 cr)"
                : `Add ${selectedCreators.length} Creator${selectedCreators.length !== 1 ? "s" : ""}`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h1 className="text-2xl font-bold text-pd-navy dark:text-white">
                Discover Influencers, Content Creators, Speakers & More!
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Find and connect with military and veteran influencers, creators, and speakers
              </p>
            </div>
            {/* Credits Pill */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium cursor-default shrink-0",
                  creditBalance && (creditBalance.credits_remaining ?? 0) <= 0
                    ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
                    : creditBalance && (creditBalance.credits_remaining ?? 0) < 10
                    ? "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-400"
                    : "bg-gray-50 border-gray-200 text-gray-700 dark:bg-[#1A1D27] dark:border-gray-700 dark:text-gray-300"
                )}>
                  <Coins className={cn(
                    "h-3.5 w-3.5",
                    creditBalance && (creditBalance.credits_remaining ?? 0) <= 0
                      ? "text-red-500"
                      : creditBalance && (creditBalance.credits_remaining ?? 0) < 10
                      ? "text-yellow-500"
                      : "text-gray-500 dark:text-gray-400"
                  )} />
                  {creditLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : creditBalance ? (
                    `${Number(creditBalance.credits_remaining ?? creditBalance.credits_total ?? 0).toFixed(0)} credits`
                  ) : (
                    "--"
                  )}
                  {creditBalance && (creditBalance.credits_remaining ?? 0) < 10 && (creditBalance.credits_remaining ?? 0) > 0 && (
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>Search ~0.15 credits</p>
                <p>Enrich 0.03 credits</p>
                <p>Contact 1.03 credits</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Hero Search Card */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-b from-gray-50/80 to-white dark:from-[#1A1D27] dark:to-[#1A1D27] p-5 mb-2 shadow-sm">
            {/* Primary search row */}
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-[150px] h-11 rounded-lg bg-white dark:bg-[#0F1117] dark:border-gray-600 border-gray-200 justify-between font-normal text-sm"
                  >
                    <span className="truncate">
                      {(safePlatform).length === 0
                        ? "All Platforms"
                        : safePlatform.length === 1
                          ? PLATFORMS.find((p) => p.value === safePlatform[0])?.label ?? safePlatform[0]
                          : `${safePlatform.length} Platforms`}
                    </span>
                    <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-1" align="start">
                  {PLATFORMS.map((p) => {
                    const isChecked = safePlatform.includes(p.value);
                    return (
                      <label
                        key={p.value}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm",
                          isChecked
                            ? "bg-blue-50 dark:bg-blue-950/30"
                            : "hover:bg-muted"
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            setPlatform(
                              checked
                                ? [...safePlatform, p.value]
                                : safePlatform.filter((v) => v !== p.value)
                            );
                          }}
                          className="border-gray-300 data-[state=checked]:bg-[#1e3a5f] data-[state=checked]:border-[#1e3a5f]"
                        />
                        {p.label}
                      </label>
                    );
                  })}
                </PopoverContent>
              </Popover>
              <Select value={searchMode} onValueChange={(v) => setSearchMode(v as "keyword" | "username" | "lookalike")}>
                <SelectTrigger className="w-[130px] h-11 rounded-lg bg-white dark:bg-[#0F1117] dark:border-gray-600 border-gray-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">
                    <div className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5" />
                      Keyword
                    </div>
                  </SelectItem>
                  <SelectItem value="username">
                    <div className="flex items-center gap-2">
                      <UserSearch className="h-3.5 w-3.5" />
                      Username
                    </div>
                  </SelectItem>
                  <SelectItem value="lookalike">
                    <div className="flex items-center gap-2">
                      <UserSearch className="h-3.5 w-3.5" />
                      Lookalike
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={
                    searchMode === "username"
                      ? "Enter exact username (e.g. tonitrucks)"
                      : searchMode === "lookalike"
                      ? "Find creators similar to (e.g. tonitrucks)"
                      : "Search by name, handle, or keyword..."
                  }
                  className="pl-12 h-12 text-base rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#0F1117] shadow-sm focus-visible:ring-2 focus-visible:ring-[#1e3a5f]/30 transition-shadow hover:shadow-md"
                  value={searchQuery}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearchQuery(v);
                    if (v.trim()) {
                      const classified = classifyQuery(v);
                      setSearchHint(classified.hint);
                      if (classified.type === "handle" || classified.type === "username") {
                        setSearchMode("username");
                      } else {
                        setSearchMode("keyword");
                      }
                      if (classified.detectedPlatform) {
                        setPlatform([classified.detectedPlatform]);
                      }
                    } else {
                      setSearchHint("");
                    }
                  }}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
              <Button onClick={handleSmartSearch} className="h-12 rounded-xl shrink-0 bg-[#1e3a5f] hover:bg-[#2d5282] text-white px-8 shadow-sm font-medium">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {/* Secondary row: Creator type + hint + Save/Saved */}
            <div className="flex items-center gap-3 mt-3">
              <Select value={creatorType} onValueChange={setCreatorType}>
                <SelectTrigger className="w-[170px] h-9 rounded-lg bg-white dark:bg-[#0F1117] dark:border-gray-600 border-gray-200 text-sm">
                  <SelectValue placeholder="Creator Type" />
                </SelectTrigger>
                <SelectContent>
                  {CREATOR_TYPES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      <span className="flex items-center gap-2">
                        {ct.icon && <span>{ct.icon}</span>}
                        {ct.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {searchHint && searchQuery.trim() && (
                <div className="flex items-center gap-1.5 text-xs text-[#1e3a5f]/70">
                  <Sparkles className="h-3 w-3" />
                  {searchHint}
                </div>
              )}
              <div className="flex-1" />
              {searchQuery.trim() && (
                <>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-2" onClick={() => { setSaveSearchName(""); setSaveSearchOpen(true); }}>
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  {apiResults && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-2" onClick={handleCopySearchLink}>
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Copy Link
                    </Button>
                  )}
                </>
              )}
              {(savedSearches ?? []).length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-2">
                      <Bookmark className="h-3 w-3 mr-1" />
                      Saved
                      <ChevronDown className="h-2.5 w-2.5 ml-1 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {savedSearches.map((s) => (
                      <DropdownMenuItem key={s.id} onClick={() => handleLoadSavedSearch(s)} className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-sm">{s.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{s.search_query}</p>
                        </div>
                        <button
                          className="ml-2 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 shrink-0"
                          onClick={(e) => handleDeleteSavedSearch(s.id, e)}
                          aria-label={`Delete ${s.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Smart suggestions — inside hero when idle */}
            {!apiResults && !apiLoading && !searchQuery.trim() && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-700/50 mt-4 pt-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Try a search</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Military spouse creators on Instagram", icon: "🎖️" },
                      { label: "Army veterans with 10k+ followers", icon: "💪" },
                      { label: "TikTok military fitness creators", icon: "🎵" },
                      { label: "Navy veteran podcasters", icon: "🎙️" },
                    ].map((suggestion) => (
                      <button
                        key={suggestion.label}
                        onClick={() => {
                          setSearchQuery(suggestion.label);
                          searchQueryRef.current = suggestion.label;
                          const classified = classifyQuery(suggestion.label);
                          setSearchHint(classified.hint);
                          setTimeout(() => handleSmartSearch(), 50);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-[#1e3a5f]/15 bg-white dark:bg-[#0F1117] text-[#1e3a5f] dark:text-blue-300 hover:bg-[#1e3a5f]/5 dark:hover:bg-blue-950/30 transition-colors"
                      >
                        <span>{suggestion.icon}</span>
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Filters toggle + active filter badges + branch pills — tight row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 rounded-lg text-xs gap-1.5",
                showMoreFilters && "bg-[#1e3a5f]/5 border-[#1e3a5f]/30 text-[#1e3a5f]"
              )}
              onClick={() => setShowMoreFilters((v) => !v)}
            >
              <Filter className="h-3.5 w-3.5" />
              More Filters
              {activeFilterCount > 0 && (
                <span className="relative -top-0.5 ml-0.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[11px] font-bold rounded-full bg-red-500 text-white shadow-sm">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={cn("h-3 w-3 ml-0.5 transition-transform", showMoreFilters && "rotate-180")} />
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={clearFilters}>
                Clear all
              </Button>
            )}
            {creatorType !== "all" && (() => {
              const ct = CREATOR_TYPES.find((t) => t.value === creatorType);
              return ct ? (
                <Badge variant="secondary" className="bg-[#1e3a5f]/10 text-[#1e3a5f] border-[#1e3a5f]/20 text-xs font-medium gap-1.5 pr-1">
                  {ct.icon && <span>{ct.icon}</span>}
                  {ct.label}
                  <button
                    onClick={() => setCreatorType("all")}
                    className="ml-1 hover:bg-[#1e3a5f]/20 rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px] font-bold"
                  >
                    ✕
                  </button>
                </Badge>
              ) : null;
            })()}
            {smartFiltersApplied.length > 0 && smartFiltersApplied.map((label) => (
              <Badge key={label} variant="secondary" className="bg-pd-blue/10 text-pd-blue border-pd-blue/20 text-xs font-medium">
                {label}
              </Badge>
            ))}
          </div>

          {/* Collapsible filter panel */}
          {showMoreFilters && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A1D27]/50 p-4 mb-2 animate-in slide-in-from-top-2 duration-200">
              <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Location</label>
                  <div className="relative" ref={locationWrapperRef}>
                    <Input
                      placeholder="City, state, country..."
                      className="w-[180px] h-9 rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border pr-8 text-sm"
                      value={locationInput}
                      onChange={(e) => handleLocationInputChange(e.target.value)}
                      onFocus={() => { if (locationSuggestions.length > 0) setLocationDropdownOpen(true); }}
                    />
                    {locationLoading && (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                    {locationDropdownOpen && (locationSuggestions.length > 0 || locationLoading) && (
                      <div className="absolute z-50 top-full left-0 mt-1 w-[320px] max-h-[240px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] shadow-lg">
                        {locationLoading && locationSuggestions.length === 0 && (
                          <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Searching locations...
                          </div>
                        )}
                        {locationSuggestions.map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors"
                            onClick={() => handleLocationSelect(loc)}
                          >
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{loc}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Followers</label>
                  <Select value={followersRange} onValueChange={setFollowersRange}>
                    <SelectTrigger className="w-[150px] h-9 rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border text-sm">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      {FOLLOWER_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Engagement</label>
                  <Select value={engagementMin} onValueChange={setEngagementMin}>
                    <SelectTrigger className="w-[130px] h-9 rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border text-sm">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENGAGEMENT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Gender</label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="w-[120px] h-9 rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border text-sm">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Niche</label>
                  <Select value={niche} onValueChange={setNiche}>
                    <SelectTrigger className="w-[130px] h-9 rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      {NICHE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Language</label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-[130px] h-9 rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border text-sm">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Bio Keywords</label>
                  <Input
                    placeholder="e.g. veteran, milspouse"
                    className="w-[200px] h-9 rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border text-sm"
                    value={keywordsInBio}
                    onChange={(e) => setKeywordsInBio(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Military Branch Pills */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">Branch</span>
            {BRANCHES.map((branch) => {
              const selected = selectedBranches.has(branch);
              const colors = BRANCH_COLORS[branch];
              return (
                <button
                  key={branch}
                  onClick={() => toggleBranch(branch)}
                  className={cn(
                    "inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border transition-all",
                    selected
                      ? colors.selected
                      : cn("text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 bg-transparent", colors.unselected)
                  )}
                >
                  {branch}
                </button>
              );
            })}
          </div>

          {apiLoading && (
            aiParsing ? (
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Sparkles className="h-4 w-4 animate-pulse text-[#1e3a5f]" />
                <span className="text-sm text-[#1e3a5f]">AI parsing your search…</span>
              </div>
            ) : (
              <div className="mb-4">
                <SearchShowcase avatars={showcaseAvatars} />
              </div>
            )
          )}

          {/* NL search banner — shows what AI interpreted */}
          {nlBanner && !apiLoading && (
            <div className="flex items-center justify-between rounded-lg bg-[#1e3a5f]/5 border border-[#1e3a5f]/15 px-4 py-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-[#1e3a5f] dark:text-blue-300">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>{nlBanner}</span>
              </div>
              <button
                onClick={() => setNlBanner(null)}
                className="text-[#1e3a5f]/40 hover:text-[#1e3a5f] dark:text-blue-300/40 dark:hover:text-blue-300 text-sm ml-3 shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {/* Empty state: trending creators */}
          {!hasSearched && !apiLoading && (
            <div>
              {trendingLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading trending creators...</span>
                </div>
              ) : trendingCreators.length > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <h2 className="text-lg font-semibold text-foreground">Trending Military Creators</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {trendingCreators.map((tc) => {
                      const branchColor = tc.branch ? BRANCH_COLORS[tc.branch] : null;
                      return (
                        <Card
                          key={tc.id}
                          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4 cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all"
                          onClick={() => {
                            const mapped: CreatorCard = {
                              id: tc.id,
                              name: tc.display_name,
                              username: tc.handle,
                              avatar: tc.ic_avatar_url || tc.avatar_url || "",
                              bio: tc.bio || "",
                              followers: tc.follower_count || 0,
                              engagementRate: tc.engagement_rate || 0,
                              platforms: tc.platforms?.length ? tc.platforms : [tc.platform || "instagram"],
                              category: tc.category || undefined,
                              socialPlatforms: tc.platforms || [],
                              hashtags: [],
                              externalLinks: [],
                              isVerified: tc.is_verified,
                              hasEmail: false,
                            };
                            setProfileCreator(mapped);
                            setProfileModalOpen(true);
                          }}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <DiscoverAvatar
                              src={tc.ic_avatar_url || tc.avatar_url || ""}
                              name={tc.display_name}
                              size={48}
                              isVerified={tc.is_verified}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm text-foreground truncate">{tc.display_name}</p>
                              <p className="text-xs text-muted-foreground truncate">@{tc.handle}</p>
                            </div>
                          </div>
                          {tc.bio && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{tc.bio}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {tc.follower_count != null && tc.follower_count > 0 && (
                              <span className="text-xs font-medium text-foreground">
                                {tc.follower_count >= 1_000_000 ? `${(tc.follower_count / 1_000_000).toFixed(1)}M` : tc.follower_count >= 1_000 ? `${(tc.follower_count / 1_000).toFixed(1)}K` : tc.follower_count} followers
                              </span>
                            )}
                            {tc.branch && (
                              <span className={cn(
                                "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                                branchColor ? branchColor.selected : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                              )}>
                                {tc.branch}
                              </span>
                            )}
                            {tc.category && !tc.branch && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                                {tc.category}
                              </span>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-12 md:p-16 text-center">
                  <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">
                    Search for military and veteran creators
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Enter a search term above and click Search or press Enter to find creators by name, handle, or keyword.
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Username not found — inline fallback UI */}
          {usernameNotFound && !apiLoading && (
            <Card className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-6 mb-4">
              <div className="flex items-start gap-3">
                <UserSearch className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    No exact match found for <span className="font-bold">@{usernameNotFound.handle}</span> on {usernameNotFound.platform.charAt(0).toUpperCase() + usernameNotFound.platform.slice(1)}
                  </p>

                  {/* Found on another platform */}
                  {usernameNotFound.foundOnPlatform && usernameNotFound.foundOnPlatformResults && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        Found @{usernameNotFound.handle} on {usernameNotFound.foundOnPlatform.charAt(0).toUpperCase() + usernameNotFound.foundOnPlatform.slice(1)} instead!
                      </p>
                      <Button
                        size="sm"
                        className="mt-2 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          setPlatform([usernameNotFound.foundOnPlatform!]);
                          setApiResults({ creators: usernameNotFound.foundOnPlatformResults!, total: usernameNotFound.foundOnPlatformResults!.length, rawResponse: null });
                          setUsernameNotFound(null);
                        }}
                      >
                        Show {usernameNotFound.foundOnPlatform.charAt(0).toUpperCase() + usernameNotFound.foundOnPlatform.slice(1)} results
                      </Button>
                    </div>
                  )}

                  {/* Try another platform */}
                  {!usernameNotFound.foundOnPlatform && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Try searching on another platform:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {["instagram", "tiktok", "youtube", "twitter"].filter((p) => p !== usernameNotFound.platform).map((p) => (
                          <Badge
                            key={p}
                            variant="outline"
                            className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 transition-colors capitalize"
                            onClick={() => {
                              setPlatform([p]);
                              setUsernameNotFound(null);
                              // Trigger search on next render via the platform change
                              setTimeout(() => {
                                setApiLoading(true);
                                const cleanQ = searchQuery.trim().replace(/^@/, "").toLowerCase();
                                searchByUsername(cleanQ, p)
                                  .then((result) => {
                                    setApiResults(result);
                                    if (result.creators.length === 0) {
                                      setUsernameNotFound({ handle: cleanQ, platform: p, fallbackResults: null, foundOnPlatform: null, foundOnPlatformResults: null });
                                    }
                                  })
                                  .catch(() => {
                                    setApiResults({ creators: [], total: 0, rawResponse: null });
                                    setUsernameNotFound({ handle: cleanQ, platform: p, fallbackResults: null, foundOnPlatform: null, foundOnPlatformResults: null });
                                  })
                                  .finally(() => setApiLoading(false));
                              }, 0);
                            }}
                          >
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Switch to keyword mode */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Or try keyword search instead:</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSearchMode("keyword");
                        setUsernameNotFound(null);
                        // Run keyword search with same term
                        setTimeout(() => {
                          const cleanQ = searchQuery.trim().replace(/^@/, "");
                          setSearchQuery(cleanQ);
                          searchQueryRef.current = cleanQ;
                        }, 0);
                      }}
                    >
                      <Search className="h-3.5 w-3.5 mr-1.5" />
                      Search "{usernameNotFound.handle}" as keyword
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Keyword fallback results from username not-found */}
          {usernameNotFound?.fallbackResults && usernameNotFound.fallbackResults.length > 0 && !apiLoading && (
            <div className="mb-4">
              <p className="text-sm font-medium text-foreground mb-3">
                Did you mean one of these? <span className="text-muted-foreground font-normal">Similar creators matching "{usernameNotFound.handle}"</span>
              </p>
            </div>
          )}

          {/* Results: after search */}
          {hasSearched && !apiLoading && (
            <>
              {/* Platform filter toggle buttons */}
              {creators.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">Filter:</span>
                  {(["instagram", "tiktok", "youtube", "twitter"] as const).map((pKey) => {
                    const isOn = platformFilter.has(pKey);
                    const label = pKey === "instagram" ? "Instagram" : pKey === "tiktok" ? "TikTok" : pKey === "youtube" ? "YouTube" : "X";
                    const brandActive = pKey === "instagram" ? "border-[#E1306C] bg-[#E1306C]/10 text-[#E1306C]"
                      : pKey === "tiktok" ? "border-[#00C9B7] bg-[#00C9B7]/10 text-[#00C9B7]"
                      : pKey === "youtube" ? "border-[#FF0000] bg-[#FF0000]/10 text-[#FF0000]"
                      : "border-gray-900 bg-gray-900/10 text-gray-900 dark:border-white dark:bg-white/10 dark:text-white";
                    return (
                      <button
                        key={pKey}
                        type="button"
                        onClick={() => setPlatformFilter((prev) => {
                          const next = new Set(prev);
                          if (next.has(pKey)) next.delete(pKey); else next.add(pKey);
                          return next;
                        })}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                          isOn ? brandActive : "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                      >
                        <PlatformIcon platform={pKey} />
                        {label}
                      </button>
                    );
                  })}
                  {platformFilter.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setPlatformFilter(new Set())}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">{resultsLabel}</p>
                  {creators.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.size === displayCreators.length}
                        onCheckedChange={selectAll}
                        aria-label="Select all on page"
                      />
                      <span className="text-sm text-muted-foreground">Select all</span>
                    </div>
                  )}
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px] rounded-lg bg-background dark:bg-slate-800 border-border">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>Sort by: {o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex rounded-lg border border-border bg-background dark:bg-slate-800 p-0.5">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Exact Match Card */}
              {/* Top Creator Card */}
              {topCreator && (
                <div className="mb-6">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                    <Trophy className="h-4 w-4" />
                    Top Creator
                  </p>
                  <Card
                    className="relative rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-6 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => { setProfileCreator(getMergedCreator(topCreator)); setProfileModalOpen(true); }}
                  >
                    <div className="flex items-center gap-4">
                      <DiscoverAvatar url={topCreator.avatar} name={topCreator.name} username={topCreator.username} size="w-16 h-16" borderClass="border-2 border-amber-200 dark:border-amber-800 shadow-md" verified={topCreator.isVerified} badgeClass="h-5 w-5 text-amber-600" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate flex items-center gap-2">
                          {topCreator.name}
                          {topCreator.isVerified && <BadgeCheck className="h-4 w-4 text-[#6C5CE7] shrink-0" />}
                          {isInAnyDirectory(topCreator.username) && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-500" title="In directory"><ShieldCheck className="h-3 w-3" /></span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">@{topCreator.username}</p>
                        {topCreator.bio && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{topCreator.bio}</p>}
                        {(() => {
                          const tags = getMergedCreator(topCreator).hashtags ?? [];
                          if (tags.length === 0) return null;
                          const queryWords = searchQuery.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
                          const isMatch = (tag: string) => {
                            const t = tag.toLowerCase();
                            return queryWords.some((w) => t.includes(w) || w.includes(t));
                          };
                          const sorted = [...tags].sort((a, b) => (isMatch(b) ? 1 : 0) - (isMatch(a) ? 1 : 0));
                          const shown = sorted.slice(0, 5);
                          const extra = tags.length - 5;
                          return (
                            <div className="flex items-center gap-1 flex-wrap mt-1.5">
                              {shown.map((tag) => (
                                <span
                                  key={tag}
                                  className={cn(
                                    "inline-flex items-center rounded-full text-[11px] px-2 py-0.5",
                                    isMatch(tag)
                                      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                                  )}
                                >
                                  #{tag.length > 14 ? `${tag.slice(0, 14)}…` : tag}
                                </span>
                              ))}
                              {extra > 0 && (
                                <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-[11px] px-2 py-0.5">
                                  +{extra}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-6 shrink-0">
                        <div className="text-center">
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 block">Followers</span>
                          <span className="font-bold text-gray-900 dark:text-white tabular-nums">{formatFollowers(topCreator.followers)}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 block">Engagement</span>
                          <span className="font-bold text-amber-500 tabular-nums">{typeof getMergedCreator(topCreator).engagementRate === "number" ? getMergedCreator(topCreator).engagementRate!.toFixed(2) : "—"}%</span>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              const profileUrl = getCreatorProfileUrl(topCreator, platform[0] || "instagram");
                              if (!profileUrl) { toast.error("No handle available to find similar creators"); return; }
                              setSimilarLoading(true);
                              searchSimilarCreators(topCreator.username ?? "", platform[0] || "instagram", 10, profileUrl)
                                .then((res) => setSimilarCreators(res.creators))
                                .catch((err) => toast.error(err?.message || "Failed to find similar creators"))
                                .finally(() => setSimilarLoading(false));
                            }}
                            disabled={similarLoading}
                          >
                            {similarLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Users className="h-3 w-3 mr-1" />}
                            Find Similar
                          </Button>
                          <Button size="sm" className="text-xs bg-[#000741] hover:bg-[#2d5282] text-white" onClick={() => handleOpenEmailListModal(topCreator)}>
                            <ListPlus className="h-3 w-3 mr-1" /> Add to List
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Similar Creators from "Find Similar" */}
              {similarCreators.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-[#6C5CE7]" />
                      Similar Creators
                    </p>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setSimilarCreators([])}>
                      Clear
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {similarCreators.slice(0, 8).map((sc) => (
                      <Card
                        key={sc.id}
                        className="p-3 cursor-pointer hover:shadow-md transition-all border-[#6C5CE7]/20"
                        onClick={() => { setProfileCreator(sc); setProfileModalOpen(true); }}
                      >
                        <div className="flex items-center gap-3">
                          <DiscoverAvatar url={sc.avatar} name={sc.name} username={sc.username} size="w-10 h-10" verified={sc.isVerified} />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{sc.name}</p>
                            <p className="text-xs text-gray-400 truncate">@{sc.username} &middot; {formatFollowers(sc.followers)}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {creators.length > 0 ? (
                <>
                {viewMode === "list" ? (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                        <th className="p-3 w-8"></th>
                        <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">Creator</th>
                        <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">Social Links</th>
                        <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">Followers</th>
                        <th className="text-center p-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                        <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            ER
                            <span title="Engagement Rate: average interactions per post divided by follower count">
                              <Info className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                            </span>
                          </span>
                        </th>
                        <th className="text-center p-3 font-medium text-gray-500 dark:text-gray-400">External Links Used</th>
                        <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">Frequently Used Hashtags</th>
                        <th className="p-3 w-24"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayCreators.map((baseCreator, _idx) => {
                        const creator = getMergedCreator(baseCreator);
                        console.log(`[BrandDiscover] Creator[${_idx}] (table):`, { name: creator.name, username: creator.username, socialPlatforms: creator.socialPlatforms, hasEmail: creator.hasEmail, hashtags: creator.hashtags, externalLinks: creator.externalLinks, full: creator });
                        const socialPlatforms = creator.socialPlatforms ?? [];
                        const socialSet = new Set(socialPlatforms.map((p) => p.toLowerCase()));
                        const personalLinks = getPersonalLinks(creator.externalLinks ?? []);
                        const linkCount = personalLinks.length;
                        const hashtags = creator.hashtags ?? [];
                        const pending = enrichRunning && !enrichCache[baseCreator.id] && !!baseCreator.username;
                        const isActiveEnrich = enrichingIds.has(baseCreator.id);
                        return (
                          <tr
                            key={creator.id}
                            className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                            onClick={() => { setProfileCreator(creator); setProfileModalOpen(true); }}
                          >
                            {/* Checkbox */}
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.has(creator.id)}
                                onCheckedChange={() => toggleSelect(creator.id)}
                                aria-label={`Select ${creator.name}`}
                              />
                            </td>
                            {/* Creator */}
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <DiscoverAvatar url={creator.avatar} name={creator.name} username={creator.username} verified={creator.isVerified} />
                                <div className="min-w-0">
                                  <p className="font-semibold text-[#000741] dark:text-white truncate flex items-center gap-1">
                                    {creator.name}
                                    {isActiveEnrich && <Loader2 className="h-3 w-3 animate-spin text-gray-400 shrink-0" />}
                                    {isInAnyDirectory(creator.username) && (
                                      <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 dark:bg-blue-900/30 px-1 py-0.5 text-[9px] font-semibold text-blue-700 dark:text-blue-500" title="In directory"><ShieldCheck className="h-2.5 w-2.5" /></span>
                                    )}
                                  </p>
                                  {creator.username && (
                                    <p className="text-xs text-gray-400 truncate">@{creator.username}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            {/* Social Links */}
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              {(() => {
                                const rawEnrich = enrichRawCache[baseCreator.id];
                                const platStats = rawEnrich ? getPlatformStatsFromEnrichment(rawEnrich) : [];
                                const platStatsMap = new Map(platStats.map((ps) => [ps.platform, ps]));
                                const displayPlats = socialPlatforms.length > 0 ? socialPlatforms : (platStats.length > 0 ? platStats.map((ps) => ps.platform) : []);
                                return displayPlats.length > 0 ? (
                                  <div className="flex items-center gap-1.5">
                                    {displayPlats.slice(0, 5).map((p) => {
                                      const ps = platStatsMap.get(p);
                                      return (
                                        <span key={p} className="inline-flex items-center gap-0.5">
                                          <PlatformIcon platform={p} username={ps?.username ?? creator.username} />
                                          {ps && ps.followers > 0 && <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{formatCompactFollowers(ps.followers)}</span>}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-600">—</span>
                                );
                              })()}
                            </td>
                            {/* Followers */}
                            <td className="p-3 text-right font-semibold text-[#000741] dark:text-white tabular-nums">{formatFollowers(creator.followers)}</td>
                            {/* Email */}
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              {contactEmails[creator.id] ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center justify-center cursor-default">
                                        <Mail className="h-4 w-4 text-green-500" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">{contactEmails[creator.id]}</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => { navigator.clipboard.writeText(contactEmails[creator.id]); toast.success("Email copied!"); }}
                                        className="inline-flex items-center justify-center rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">Copy email</TooltipContent>
                                  </Tooltip>
                                </div>
                              ) : creator.username ? (
                                <button
                                  onClick={() => setContactConfirmCreator(creator)}
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                  title="Get email (1.03 credits)"
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                  Get
                                </button>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                            {/* ER */}
                            <td className="p-3 text-right font-semibold text-[#000741] dark:text-white tabular-nums">{creator.engagementRate ? `${creator.engagementRate.toFixed(2)}%` : "—"}</td>
                            {/* External Links Used */}
                            <td className="p-3 text-center">
                              {linkCount > 0 ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[11px] font-medium px-2.5 py-0.5 cursor-default"
                                  title={personalLinks.join("\n")}
                                >
                                  <LinkIcon className="h-3 w-3" />
                                  {linkCount}
                                </span>
                              ) : pending ? (
                                <div className="mx-auto"><EnrichShimmer /></div>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                            {/* Frequently Used Hashtags */}
                            <td className="p-3">
                              {hashtags.length > 0 ? (
                                <div
                                  className="flex items-center gap-1 flex-nowrap"
                                  title={hashtags.map((t) => `#${t}`).join(", ")}
                                >
                                  {hashtags.slice(0, 2).map((tag) => (
                                    <span key={tag} className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[11px] px-2 py-0.5 shrink-0">
                                      #{tag.length > 12 ? `${tag.slice(0, 12)}…` : tag}
                                    </span>
                                  ))}
                                  {hashtags.length > 2 && (
                                    <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-[11px] px-2 py-0.5 shrink-0">
                                      +{hashtags.length - 2}
                                    </span>
                                  )}
                                </div>
                              ) : pending ? (
                                <div className="flex gap-1"><EnrichShimmer /><EnrichShimmer /></div>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                            {/* Actions */}
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <Button size="sm" variant="outline" className="h-7 text-xs rounded-md" onClick={() => handleOpenEmailListModal(creator)}>
                                  <ListPlus className="h-3 w-3 mr-1" /> Add
                                </Button>
                                {directoriesList.length > 0 && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                                        title="Add to Directory"
                                        disabled={approvingDir}
                                      >
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      {directoriesList.map((dir) => (
                                        <DropdownMenuItem key={dir.id} onClick={() => handleStandaloneApprove(creator, dir.id)}>
                                          {dir.name}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {displayCreators.map((baseCreator, _idx) => {
                    const creator = getMergedCreator(baseCreator);
                    if (_idx === 0) console.log("[BrandDiscover] First creator object:", creator);
                    if (_idx < 3) console.log(`[MilBadge] ${creator.username}: militaryScore=${creator.militaryScore}, militaryEvidence=`, creator.militaryEvidence);
                    const nicheTags = [
                      creator.nicheClass,
                      creator.category,
                      ...(creator.specialties ?? []),
                    ].filter(Boolean) as string[];
                    const confidence = getConfidence(creator);
                    if (_idx < 3) console.log(`[MilBadge] ${creator.username}: confidence.level=${confidence.level}, militaryPct=${confidence.militaryPct}, evidence=`, confidence.evidence);
                    const instagramUrl = creator.username
                      ? `https://instagram.com/${creator.username}`
                      : null;
                    const socialPlatforms = creator.socialPlatforms ?? [];
                    const personalLinks = getPersonalLinks(creator.externalLinks ?? []);
                    const linkCount = personalLinks.length;
                    // Derive keyword tag from bio/category
                    const tagColors = [
                      "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
                      "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                      "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-500",
                      "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
                      "bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
                    ];
                    const bioLower = (creator.bio || "").toLowerCase() + " " + (creator.category || "").toLowerCase() + " " + (creator.nicheClass || "").toLowerCase();
                    const derivedTag = bioLower.match(/military spouse|milspouse/) ? "MilSpouse"
                      : bioLower.includes("veteran") ? "Veteran"
                      : bioLower.match(/fitness|health/) ? "Fitness"
                      : bioLower.includes("lifestyle") ? "Lifestyle"
                      : bioLower.match(/food|cooking/) ? "Food"
                      : bioLower.match(/entrepreneur|founder/) ? "Entrepreneur"
                      : bioLower.includes("podcast") ? "Podcaster"
                      : "Creator";

                    return (
                      <Card
                        key={creator.id}
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "relative rounded-2xl border p-6 flex flex-col transition-all duration-200 cursor-pointer shadow-sm",
                          "bg-white border-gray-200 hover:shadow-md hover:border-[#6C5CE7]/30",
                          "dark:bg-[#1A1D27] dark:border-gray-800 dark:hover:border-[#6C5CE7]/30",
                          confidence.level === "high" && "ring-1 ring-emerald-300/60 border-emerald-200 dark:ring-emerald-700/40 dark:border-emerald-800",
                          confidence.level === "medium" && "border-amber-200 dark:border-amber-800/60",
                        )}
                        onClick={() => {
                          setProfileCreator(creator);
                          setProfileModalOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setProfileCreator(creator);
                            setProfileModalOpen(true);
                          }
                        }}
                      >
                        {/* Checkbox top-left */}
                        <div className="absolute top-4 left-4 z-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(creator.id)}
                            onCheckedChange={() => toggleSelect(creator.id)}
                            aria-label={`Select ${creator.name}`}
                          />
                        </div>

                        {/* Tag pill top-right */}
                        <span className={`absolute top-3 right-4 text-xs px-2 py-0.5 rounded-full font-medium ${tagColors[_idx % tagColors.length]}`}>
                          {derivedTag}
                        </span>

                        {/* Header: Avatar + Name + Handle — pl-7 clears the checkbox */}
                        <div className="flex items-center gap-3 mb-4 pl-7">
                          <DiscoverAvatar url={creator.avatar} name={creator.name} username={creator.username} size="w-14 h-14" borderClass="border-2 border-white dark:border-slate-700 shadow-md" verified={creator.isVerified} badgeClass="h-5 w-5 text-[#6C5CE7]" />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-base text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                              {creator.name}
                              {(creator.hasEmail || contactEmails[creator.id]) && !contactEmails[creator.id] && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 ml-1" title="Email available"><Mail className="h-3 w-3" /></span>
                              )}
                              {isInAnyDirectory(creator.username) && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-500 ml-1" title="In directory"><ShieldCheck className="h-3 w-3" /></span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-400 dark:text-gray-500 truncate">
                              {creator.username ? `@${creator.username}` : "\u00A0"}
                            </p>
                          </div>
                        </div>

                        {/* Thin divider */}
                        <div className="border-t border-gray-100 dark:border-gray-800 mb-3" />

                        {/* Military Match Badge */}
                        {confidence.level !== "none" && confidence.militaryPct > 0 && (
                          <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border cursor-help",
                                  confidence.level === "high" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
                                  confidence.level === "medium" && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
                                  confidence.level === "low" && "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700",
                                )}>
                                  <span>🎖️</span>
                                  <span>{confidence.militaryPct}% Military Match</span>
                                  <Info className="h-3 w-3 opacity-50" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" align="start" className="max-w-xs p-3">
                                <p className="font-semibold text-xs mb-1.5">Military Match Evidence</p>
                                {confidence.evidence.length > 0 ? (
                                  <ul className="space-y-1">
                                    {confidence.evidence.map((e, i) => (
                                      <li key={i} className="flex items-start gap-1.5 text-xs">
                                        <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
                                        <span>{e}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-muted-foreground">Matched via search keywords</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )}

                        {/* Stats — 2×2 grid for breathing room */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                          <div>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 block">Followers</span>
                            <span className="font-bold text-gray-900 dark:text-white tabular-nums">{formatFollowers(creator.followers)}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 block">Engagement</span>
                            <span className="font-bold text-emerald-500 tabular-nums">{typeof creator.engagementRate === "number" ? creator.engagementRate.toFixed(2) : "—"}%</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 block flex items-center gap-1"><Heart className="h-3 w-3 text-pink-500 fill-pink-500" />Avg Likes</span>
                            <span className="font-bold text-gray-900 dark:text-white tabular-nums">{creator.avgLikes ? formatFollowers(creator.avgLikes) : "—"}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 block">Posts/Mo</span>
                            <span className="font-bold text-gray-900 dark:text-white tabular-nums">{creator.postsPerMonth ?? "—"}</span>
                          </div>
                        </div>

                        {/* Social Platform Icons with follower counts */}
                        {(() => {
                          const rawEnrich = enrichRawCache[baseCreator.id];
                          const platStats = rawEnrich ? getPlatformStatsFromEnrichment(rawEnrich) : [];
                          const platStatsMap = new Map(platStats.map((ps) => [ps.platform, ps]));
                          const displayPlats = socialPlatforms.length > 0 ? socialPlatforms : (platStats.length > 0 ? platStats.map((ps) => ps.platform) : []);
                          return displayPlats.length > 0 ? (
                            <div className="flex items-center gap-2 mb-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                              {displayPlats.slice(0, 5).map((p) => {
                                const ps = platStatsMap.get(p);
                                return (
                                  <span key={p} className="inline-flex items-center gap-0.5">
                                    <PlatformIcon platform={p} username={ps?.username ?? creator.username} />
                                    {ps && ps.followers > 0 && (
                                      <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{formatCompactFollowers(ps.followers)}</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          ) : null;
                        })()}

                        {/* Email / contact */}
                        {creator.username && (
                          <div className="flex items-center gap-2 mb-4 flex-wrap">
                            {contactEmails[creator.id] ? (
                              <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1 rounded-md bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400 cursor-default">
                                      <Mail className="h-3 w-3" />{contactEmails[creator.id]}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">{contactEmails[creator.id]}</TooltipContent>
                                </Tooltip>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(contactEmails[creator.id]); toast.success("Email copied!"); }}
                                  className="inline-flex items-center justify-center rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                  title="Copy email"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            ) : creator.username ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setContactConfirmCreator(creator); }}
                                className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                title="Get email (1.03 credits)"
                              >
                                <UserSearch className="h-3 w-3" />Get Contact
                              </button>
                            ) : null}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-auto space-y-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            className="flex items-center justify-center gap-2 w-full text-center rounded-lg bg-[#000741] hover:bg-[#2d5282] text-white dark:bg-[#000741] dark:hover:bg-[#2d5282]"
                            onClick={() => handleOpenEmailListModal(creator)}
                          >
                            <ListPlus className="h-4 w-4" />
                            Add to List
                          </Button>
                          <div className="flex gap-2 items-center">
                            {directoriesList.length > 0 && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center justify-center gap-2 w-full text-center rounded-lg flex-1 text-blue-800 border-blue-400 hover:bg-blue-50 dark:text-blue-500 dark:border-blue-800 dark:hover:bg-blue-950/30"
                                    disabled={approvingDir}
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Add to Directory
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48">
                                  {directoriesList.map((dir) => (
                                    <DropdownMenuItem key={dir.id} onClick={() => handleStandaloneApprove(creator, dir.id)}>
                                      {isInDirectory(creator.username, dir.id) && <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-blue-600 shrink-0" />}
                                      {dir.name}
                                      {isInDirectory(creator.username, dir.id) && <span className="ml-auto text-[10px] text-blue-500">Added</span>}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              className="rounded-lg h-9 w-9 shrink-0"
                              title="Find similar creators"
                              disabled={similarLoading}
                              onClick={() => {
                                const profileUrl = getCreatorProfileUrl(creator, platform[0] || "instagram");
                                if (!profileUrl) { toast.error("No handle available to find similar creators"); return; }
                                setSimilarLoading(true);
                                searchSimilarCreators(creator.username ?? "", platform[0] || "instagram", 10, profileUrl)
                                  .then((res) => { setSimilarCreators(res.creators); window.scrollTo({ top: 0, behavior: "smooth" }); })
                                  .catch((err) => toast.error(err?.message || "Failed to find similar creators"))
                                  .finally(() => setSimilarLoading(false));
                              }}
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            {instagramUrl ? (
                              <Button
                                variant="outline"
                                size="icon"
                                className="rounded-lg h-9 w-9 shrink-0"
                                asChild
                              >
                                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Open Instagram" onClick={(e) => e.stopPropagation()}>
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                )}
                {creators.length < totalFromApi && (
                  <div className="flex justify-center mt-8">
                    <Button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="rounded-lg bg-pd-blue hover:bg-pd-darkblue text-white px-8 py-3"
                    >
                      {loadingMore ? "Loading..." : `Load More (${creators.length} of ${totalFromApi >= 1000 ? formatFollowers(totalFromApi) : totalFromApi.toLocaleString()})`}
                    </Button>
                  </div>
                )}
                </>
              ) : (
                <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-8 text-center">
                  <p className="text-muted-foreground">
                    No creators match your search or filters. Try adjusting the search or clearing filters.
                  </p>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      <BulkActionBar
        mode="discovery"
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onAddToEmailList={() => handleOpenEmailListModal()}
        onImportAll={handleImportAll}
        onImportAndAddToList={handleImportAndAddToList}
        listOptions={lists.map((l) => ({ id: l.id, name: l.name }))}
        onCreateListForImport={() => setCreateListForBulkImportOpen(true)}
        onAddToDirectory={handleBulkAddToDirectory}
        directoryOptions={directoriesList}
      />
    </>
  );
};

function BrandDiscoverWithBoundary() {
  return (
    <DiscoverErrorBoundary>
      <BrandDiscover />
    </DiscoverErrorBoundary>
  );
}

export default BrandDiscoverWithBoundary;
