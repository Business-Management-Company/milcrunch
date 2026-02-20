import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ListPlus, Loader2, Plus, MapPin, ExternalLink, Mail, BadgeCheck, LayoutGrid, List, Save, Bookmark, ChevronDown, Trash2, ShieldCheck, Coins, AlertTriangle, UserSearch, Info, Link as LinkIcon } from "lucide-react";
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
import { searchCreators, searchByUsername, searchLookalike, enrichCreatorProfile, fullEnrichCreatorProfile, fetchCredits, logCreditUsage, type CreatorCard, type EnrichedProfileResponse, type CreditBalance } from "@/lib/influencers-club";
import { upsertCreator } from "@/lib/creators-db";
import CreatorProfileModal from "@/components/CreatorProfileModal";
import CreateListModal from "@/components/CreateListModal";
import BulkActionBar from "@/components/BulkActionBar";
import { useLists } from "@/contexts/ListContext";
import { useAuth } from "@/contexts/AuthContext";
import { approveForDirectory, detectBranch, extractAvatarFromEnrichment, extractBannerImage } from "@/lib/featured-creators";
import { saveCreatorAvatar } from "@/lib/directories";
import { parseSmartQuery } from "@/lib/smart-search-parser";
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
import { useDemoMode } from "@/hooks/useDemoMode";

const BRANCHES = ["Army", "Navy", "Air Force", "Marines", "Coast Guard"] as const;

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

const PLATFORM_URLS: Record<string, (u: string) => string> = {
  instagram: (u) => `https://instagram.com/${u}`,
  tiktok: (u) => `https://tiktok.com/@${u}`,
  youtube: (u) => `https://youtube.com/@${u}`,
  twitter: (u) => `https://x.com/${u}`,
  facebook: (u) => `https://facebook.com/${u}`,
  linkedin: (u) => `https://linkedin.com/in/${u}`,
};

const PLATFORM_SVGS: Record<string, React.ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="25%" stopColor="#fa7e1e" />
          <stop offset="50%" stopColor="#d62976" />
          <stop offset="75%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.97.24 2.43.403a4.088 4.088 0 011.47.96c.458.457.78.92.96 1.47.163.46.349 1.26.404 2.43.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.055 1.17-.241 1.97-.404 2.43a4.088 4.088 0 01-.96 1.47 4.088 4.088 0 01-1.47.96c-.46.163-1.26.349-2.43.404-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.055-1.97-.241-2.43-.404a4.088 4.088 0 01-1.47-.96 4.088 4.088 0 01-.96-1.47c-.163-.46-.349-1.26-.404-2.43C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.055-1.17.241-1.97.404-2.43a4.088 4.088 0 01.96-1.47 4.088 4.088 0 011.47-.96c.46-.163 1.26-.349 2.43-.404C8.416 2.175 8.796 2.163 12 2.163M12 0C8.741 0 8.333.014 7.053.072 5.775.131 4.902.333 4.14.63a6.21 6.21 0 00-2.228 1.45A6.21 6.21 0 00.462 4.308C.166 5.07-.036 5.944.005 7.222.014 8.333 0 8.741 0 12s.014 3.667.072 4.947c.059 1.278.261 2.15.558 2.913a6.21 6.21 0 001.45 2.228 6.21 6.21 0 002.228 1.45c.762.297 1.636.499 2.913.558C8.333 23.986 8.741 24 12 24s3.667-.014 4.947-.072c1.278-.059 2.15-.261 2.913-.558a6.21 6.21 0 002.228-1.45 6.21 6.21 0 001.45-2.228c.297-.762.499-1.636.558-2.913.058-1.28.072-1.688.072-4.947s-.014-3.667-.072-4.947c-.059-1.278-.261-2.15-.558-2.913a6.21 6.21 0 00-1.45-2.228A6.21 6.21 0 0019.86.462C19.098.166 18.224-.036 16.947.005 15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-black dark:text-white">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.82a4.84 4.84 0 01-1-.13z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
      <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px] text-black dark:text-white">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
};

function PlatformIcon({ platform, username }: { platform: string; username?: string }) {
  const plat = platform.toLowerCase();
  const svg = PLATFORM_SVGS[plat];
  const buildUrl = PLATFORM_URLS[plat];
  const url = username && buildUrl ? buildUrl(username) : null;

  const icon = (
    <span
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-md transition-opacity",
        url ? "hover:opacity-70 cursor-pointer" : "opacity-40"
      )}
      title={platform}
      aria-label={platform}
    >
      {svg ?? <span className="text-xs font-bold text-gray-400">{plat[0]?.toUpperCase() ?? "?"}</span>}
    </span>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex"
      >
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
  if (creatorHas && typeof creatorHas === "object") {
    const platforms: string[] = [];
    // Add each platform the creator has (don't hardcode instagram — it may not be their platform)
    if (creatorHas.instagram) platforms.push("instagram");
    if (creatorHas.tiktok) platforms.push("tiktok");
    if (creatorHas.youtube) platforms.push("youtube");
    if (creatorHas.twitter) platforms.push("twitter");
    if (creatorHas.facebook) platforms.push("facebook");
    if (creatorHas.linkedin) platforms.push("linkedin");
    if (creatorHas.twitch) platforms.push("twitch");
    if (creatorHas.podcast) platforms.push("podcast");
    // If creator_has exists but no platforms were truthy, fall back to instagram
    if (platforms.length === 0) platforms.push("instagram");
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
          onLoad={() => _goodAvatarCache.set(cacheKey, displaySrc!)}
          onError={() => setErrCount((c) => c + 1)}
          className={`${size} rounded-full object-cover ${borderClass} absolute inset-0 z-10`}
        />
      )}
      <div className={`${size} rounded-full bg-gradient-to-br from-[#6C5CE7] to-[#5B4BD1] flex items-center justify-center text-white font-bold ${size === "w-14 h-14" ? "text-sm" : "text-xs"} ${borderClass}`}>
        {getDiscoverInitials(name)}
      </div>
      {verified && (
        <BadgeCheck className={`absolute -top-1 -left-1 ${badgeClass || "h-4 w-4"} text-blue-500 bg-white dark:bg-[#1A1D27] rounded-full z-20`} aria-label="Verified" />
      )}
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

async function getCachedEnrichment(username: string): Promise<EnrichedProfileResponse | null> {
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
  { value: "any", label: "All Engagement", min: null as number | null },
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
    if (seen.has(c.id)) return false;
    seen.add(c.id);
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
            className="px-4 py-2 bg-[#6C5CE7] text-white rounded-lg hover:bg-[#5A4BD1] transition-colors text-sm font-medium"
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
  const [followersRange, setFollowersRange] = useState<string>("any");
  const [engagementMin, setEngagementMin] = useState<string>("any");
  const [locationFilter, setLocationFilter] = useState("");
  const [niche, setNiche] = useState<string>("All niches");
  const [gender, setGender] = useState<string>("any");
  const [language, setLanguage] = useState<string>("any");
  const [keywordsInBio, setKeywordsInBio] = useState("");
  const [sortBy, setSortBy] = useState<string>("confidence");
  const [selectedBranches, setSelectedBranches] = useState<Set<Branch>>(new Set());
  const [smartFiltersApplied, setSmartFiltersApplied] = useState<string[]>([]);
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
  searchQueryRef.current = searchQuery;

  // Credit balance state
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);

  // "Get Contact Info" state
  const [contactConfirmCreator, setContactConfirmCreator] = useState<CreatorCard | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactEmails, setContactEmails] = useState<Record<string, string>>({}); // creatorId → email

  // Username search fallback state
  const [usernameNotFound, setUsernameNotFound] = useState<{
    handle: string;
    platform: string;
    fallbackResults: CreatorCard[] | null;
    foundOnPlatform: string | null;
    foundOnPlatformResults: CreatorCard[] | null;
  } | null>(null);

  const { lists, addCreatorToList, createList, isCreatorInList } = useLists();
  const { user, effectiveUserId, isSuperAdmin } = useAuth();
  const [approvingDir, setApprovingDir] = useState(false);
  const [directoriesList, setDirectoriesList] = useState<{ id: string; name: string }[]>([]);

  // Load directories for "Add to Directory" dropdown (all brand users)
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

  // Get Contact Info handler (full enrichment - 1.03 credits)
  const handleGetContactInfo = async (creator: CreatorCard) => {
    if (!creator.username) return;
    setContactLoading(true);
    try {
      const data = await fullEnrichCreatorProfile(creator.username, undefined, enrichPlatform);
      if (data?.result?.email) {
        setContactEmails((prev) => ({ ...prev, [creator.id]: String(data.result.email) }));
        toast.success(`Email found for ${creator.name}`);
      } else {
        toast.info(`No email found for ${creator.name}`);
      }
      // Update the enrichment caches with the richer data
      if (data) {
        const partial = extractFromEnrichment(data);
        setEnrichCache((prev) => ({ ...prev, [creator.id]: partial }));
        setEnrichRawCache((prev) => ({ ...prev, [creator.id]: data }));
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

  // Auto-load from URL query params (AI handoff) or localStorage on mount
  useEffect(() => {
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;

    // URL params from AI Chat → Discovery handoff take priority
    const urlQ = urlSearchParams.get("q");
    if (urlQ?.trim()) {
      setSearchQuery(urlQ.trim());
      const urlPlatform = urlSearchParams.get("platform");
      if (urlPlatform) setPlatform([urlPlatform]);
      const minF = urlSearchParams.get("min_followers");
      const maxF = urlSearchParams.get("max_followers");
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
      const minE = urlSearchParams.get("min_engagement");
      if (minE) {
        const engVal = Number(minE);
        const match = ENGAGEMENT_OPTIONS.find((o) => o.min === engVal);
        if (match) setEngagementMin(match.value);
      }
      const urlBranch = urlSearchParams.get("branch");
      if (urlBranch) {
        const branches = urlBranch.split(",").filter((b) =>
          (BRANCHES as readonly string[]).includes(b)
        ) as Branch[];
        if (branches.length > 0) setSelectedBranches(new Set(branches));
      }
      const urlCategory = urlSearchParams.get("category");
      if (urlCategory) {
        const match = CREATOR_TYPES.find((ct) => ct.value === urlCategory);
        if (match) setCreatorType(match.value);
      }
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
    const allBioKeys = [...branchKeys, ...bioKeys, ...ctKeywords];
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
  }, [searchQuery, platform, followersRange, engagementMin, sortBy, selectedBranches, locationFilter, keywordsInBio, creatorType, persistLastSearch, getCurrentFilters, user, refreshCredits]);

  // Fire search after auto-load applies filters (runs once after state updates)
  useEffect(() => {
    if (pendingAutoSearch.current) {
      pendingAutoSearch.current = false;
      runSearch();
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
    const keywords_in_bio = selectedBranches.size > 0 ? Array.from(selectedBranches) : [""];
    const ctConfig = CREATOR_TYPES.find((ct) => ct.value === creatorType);
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

  const handleSmartSearch = useCallback(() => {
    // Route to username/lookalike handler when not in keyword mode
    if (searchMode !== "keyword") {
      runModeSearch();
      return;
    }

    const parsed = parseSmartQuery(searchQuery);
    if (parsed.appliedLabels.length === 0) {
      setSmartFiltersApplied([]);
      runSearch();
      return;
    }
    // Apply parsed filters to UI state (updates dropdowns)
    if (parsed.platform) setPlatform([parsed.platform]);
    if (parsed.followersRange) setFollowersRange(parsed.followersRange);
    if (parsed.engagementMin) setEngagementMin(parsed.engagementMin);
    if (parsed.branches.length > 0) setSelectedBranches(new Set(parsed.branches as Branch[]));
    if (parsed.location) setLocationFilter(parsed.location);
    // Default to "military" when all text was parsed into filters
    const effectiveQuery = parsed.remainingQuery.trim() || "military";
    setSearchQuery(effectiveQuery);
    searchQueryRef.current = effectiveQuery;
    setSmartFiltersApplied(parsed.appliedLabels);
    // Execute search directly with parsed values (don't rely on effect timing)
    setApiLoading(true);
    setCurrentPage(1);
    enrichAbortRef.current?.abort();
    enrichedSetRef.current = new Set();
    setEnrichCache({});
    setEnrichRawCache({});
    setEnrichingIds(new Set());
    const ctConfig = CREATOR_TYPES.find((ct) => ct.value === creatorType);
    const effPlatforms = parsed.platform ? [parsed.platform] : platform;
    const searchPlatforms = resolveSearchPlatforms(effPlatforms, ctConfig?.platformOverride ?? null);
    const effFollowers = parsed.followersRange || followersRange;
    const effEngagement = parsed.engagementMin || engagementMin;
    const effBranches = parsed.branches.length > 0 ? parsed.branches : Array.from(selectedBranches);
    const effLocation = parsed.location || locationFilter;
    const followerOpt = FOLLOWER_OPTIONS.find((o) => o.value === effFollowers);
    const engagementOpt = ENGAGEMENT_OPTIONS.find((o) => o.value === effEngagement);
    const bioKeys = keywordsInBio.trim() ? keywordsInBio.split(",").map((k) => k.trim()).filter(Boolean) : [];
    const ctKeywords = ctConfig?.keywords ?? [];
    const kw = [...effBranches, ...bioKeys, ...ctKeywords];
    const keywords_in_bio = kw.length > 0 ? kw : [""];
    const baseOptions = {
      number_of_followers: { min: followerOpt?.min ?? null, max: followerOpt?.max ?? null },
      engagement_percent: { min: engagementOpt?.min ?? null, max: null as number | null },
      keywords_in_bio,
      sort_by: (sortBy === "confidence" ? "relevancy" : sortBy) as "relevancy" | "followers" | "engagement",
      location: effLocation?.trim() || undefined,
      gender: gender !== "any" ? gender : undefined,
      language: language !== "any" ? language : undefined,
    };
    persistLastSearch({
      searchQuery: effectiveQuery, platform: effPlatforms, followersRange: effFollowers,
      engagementMin: effEngagement, locationFilter: effLocation || "", niche, gender, language,
      keywordsInBio, sortBy, selectedBranches: effBranches,
    });
    Promise.all(
      searchPlatforms.map((plat) =>
        searchCreators(effectiveQuery, { ...baseOptions, platform: plat })
          .catch(() => null)
      )
    )
      .then((results) => {
        if (searchQueryRef.current !== effectiveQuery) return;
        const valid = results.filter((r): r is NonNullable<typeof r> => r !== null);
        if (valid.length === 0) { setApiResults(null); return; }
        const allCreators = deduplicateCreators(valid.flatMap((r) => r.creators));
        setApiResults({ creators: allCreators, total: Math.max(...valid.map((r) => r.total)), rawResponse: valid[0].rawResponse });
      })
      .catch((err) => {
        if (searchQueryRef.current === effectiveQuery) setApiResults(null);
        console.warn("[BrandDiscover] Smart search failed:", err);
      })
      .finally(() => {
        if (searchQueryRef.current === effectiveQuery) setApiLoading(false);
      });
  }, [searchQuery, searchMode, platform, followersRange, engagementMin, sortBy, selectedBranches, locationFilter, keywordsInBio, creatorType, gender, language, niche, persistLastSearch, runSearch, runModeSearch]);

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
    setNiche("All niches");
    setSortBy("confidence");
    setSelectedBranches(new Set());
    setApiResults(null);
    setGender("any");
    setLanguage("any");
    setKeywordsInBio("");
    setSmartFiltersApplied([]);
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
  // Show fallback keyword results when username search returned 0 direct results
  const creators = (apiResults?.creators ?? []).length > 0
    ? (apiResults?.creators ?? [])
    : (usernameNotFound?.fallbackResults ?? []);

  // Background enrichment: enrich creators in parallel batches of 10 with Supabase caching
  // Capture current platform so enrichment uses the correct one for each search
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
      for (let i = 0; i < creatorsToEnrich.length; i += BATCH_SIZE) {
        if (controller.signal.aborted) break;

        const batch = creatorsToEnrich.slice(i, i + BATCH_SIZE);
        const batchIds = new Set(batch.map((c) => c.id));
        setEnrichingIds(batchIds);

        const results = await Promise.allSettled(
          batch.map(async (creator) => {
            try {
              // Check Supabase cache first
              const cached = await getCachedEnrichment(creator.username!);
              if (cached && !controller.signal.aborted) {
                enrichedSetRef.current.add(creator.id);
                const partial = extractFromEnrichment(cached);
                setEnrichCache((prev) => ({ ...prev, [creator.id]: partial }));
                setEnrichRawCache((prev) => ({ ...prev, [creator.id]: cached }));
                return;
              }

              // Cache miss — call the API with the correct platform
              const data = await enrichCreatorProfile(creator.username!, controller.signal, enrichPlatform);
              if (data && !controller.signal.aborted) {
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

  // Confidence scoring: how well does this creator match the search terms?
  const getConfidence = useCallback((creator: CreatorCard) => {
    const targets: string[] = [];
    const militaryVariants = ["military", "veteran", "military spouse", "milspouse", "milso", "army", "navy", "air force", "marines", "coast guard", "national guard", "usmc", "usaf", "vet", "service member", "active duty", "reserve"];
    if (searchQuery.trim()) targets.push(...searchQuery.trim().toLowerCase().split(/\s+/));
    if (niche !== "All niches") targets.push(niche.toLowerCase());
    selectedBranches.forEach((b) => targets.push(b.toLowerCase()));
    if (keywordsInBio.trim()) targets.push(...keywordsInBio.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean));
    if (targets.length === 0) return { level: "none" as const, score: 0, matches: [] as string[] };
    const creatorText = [
      creator.bio ?? "",
      ...(creator.hashtags ?? []),
      creator.nicheClass ?? "",
      creator.category ?? "",
      ...(creator.specialties ?? []),
      creator.name ?? "",
    ].join(" ").toLowerCase();
    const matches = targets.filter((t) => creatorText.includes(t));
    const milMatches = militaryVariants.filter((v) => creatorText.includes(v));
    const milBoost = milMatches.length > 0 ? 0.4 : 0;
    const baseScore = targets.length > 0 ? matches.length / targets.length : 0;
    const score = Math.min(1, baseScore + milBoost);
    const allMatches = [...new Set([...matches, ...milMatches])];
    const level = score >= 0.6 ? "high" : score >= 0.3 ? "medium" : "low";
    return { level: level as "high" | "medium" | "low", score, matches: allMatches };
  }, [searchQuery, niche, selectedBranches, keywordsInBio]);
  const confidenceColors = {
    high: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    none: "hidden",
  };
  // Sort by confidence when selected (client-side sort)
  const displayCreators = useMemo(() => {
    if (sortBy !== "confidence") return creators;
    return [...creators].sort((a, b) => getConfidence(b).score - getConfidence(a).score);
  }, [creators, sortBy, getConfidence]);

  const totalFromApi = apiResults?.total ?? 0;
  const resultsLabel =
    hasSearched && !apiLoading
      ? `Showing ${creators.length} of ${totalFromApi >= 1000 ? formatFollowers(totalFromApi) : totalFromApi.toLocaleString()} results`
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
    let raw = enrichRawCache[creator.id];
    const handle = creator.username ?? creator.id;

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

    // Log the FULL creator object from search API so we can see exact field names
    console.log("[doApproveForDirectory] FULL creator object:", JSON.parse(JSON.stringify(creator)));
    if (raw) console.log("[doApproveForDirectory] FULL enrichment raw:", JSON.parse(JSON.stringify(raw)));

    // Resolve the best avatar URL from enrichment data
    const enrichAvatar = extractAvatarFromEnrichment(raw);

    // Resolve the search-API avatar (already mapped from picture/profile_picture/etc.)
    const searchAvatar = (creator.avatar && !creator.avatar.includes("ui-avatars.com"))
      ? creator.avatar.replace(/^http:\/\//i, "https://")
      : null;

    // Best avatar: enrichment first, then search-API avatar
    const bestAvatar = enrichAvatar || searchAvatar || null;

    const bioText = (igData?.biography as string) ?? creator.bio ?? "";
    const branch = detectBranch(bioText);
    const socialPlatforms = creator.socialPlatforms ?? [];

    // Extract banner image from enrichment data
    const bannerUrl = extractBannerImage(raw) ?? null;

    console.log("[doApproveForDirectory] Avatar resolution:", {
      handle,
      searchAvatar,
      enrichAvatar,
      bestAvatar,
      creatorFollowers: creator.followers,
      creatorEngagement: creator.engagementRate,
    });

    // Persist avatar to Supabase storage if it's an external URL
    let persistedAvatarUrl = bestAvatar;
    if (persistedAvatarUrl && persistedAvatarUrl.includes("ui-avatars.com")) {
      persistedAvatarUrl = null;
    }
    if (persistedAvatarUrl && !persistedAvatarUrl.includes("supabase.co")) {
      try {
        const resp = await fetch("/api/upload-creator-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: persistedAvatarUrl, handle }),
        });
        if (resp.ok) {
          const { url } = await resp.json();
          if (url) persistedAvatarUrl = url;
        } else {
          console.warn("[doApproveForDirectory] Image upload failed:", resp.status, "— keeping CDN URL");
        }
      } catch (uploadErr) {
        console.warn("[doApproveForDirectory] Image upload error:", uploadErr, "— keeping CDN URL");
      }
    }

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

    console.log("[doApproveForDirectory] INSERT payload:", {
      handle,
      name: creator.name,
      directoryId,
      avatar_url: persistedAvatarUrl,
      ic_avatar_url: bestAvatar,
      follower_count: followerCount,
      engagement_rate: engagementRate,
    });

    const { error } = await approveForDirectory({
      handle,
      display_name: creator.name,
      platform: creator.platforms?.[0] ?? "instagram",
      avatar_url: persistedAvatarUrl || bestAvatar,
      follower_count: followerCount,
      engagement_rate: engagementRate,
      bio: bioText || null,
      branch,
      status: "veteran",
      platforms: socialPlatforms.length > 0 ? socialPlatforms : creator.platforms,
      category: creator.category ?? null,
      ic_avatar_url: bestAvatar,
      enrichment_data: raw || null,
      added_by: effectiveUserId ?? null,
      directory_id: directoryId || null,
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
    setApprovingDir(true);
    const error = await doApproveForDirectory(creator, directoryId);
    setApprovingDir(false);
    if (error) {
      toast.error(`Failed to add to directory: ${error}`);
    } else {
      const dirName = directoriesList.find((d) => d.id === directoryId)?.name ?? "directory";
      toast.success(`${creator.name} added to ${dirName}`);
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
              <UserSearch className="h-5 w-5 text-purple-600" />
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
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {contactLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
              Get Contact Info (1.03 cr)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">
                Discover Creators
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Search and filter military and veteran creators by branch, follower range, and
                specialty. Build lists and invite them to events and campaigns.
              </p>
            </div>
            {/* Credit Balance Card */}
            <div className="shrink-0">
              <div className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
                creditBalance && (creditBalance.credits_remaining ?? 0) <= 0
                  ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                  : creditBalance && (creditBalance.credits_remaining ?? 0) < 10
                  ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800"
                  : "bg-white border-gray-200 dark:bg-[#1A1D27] dark:border-gray-800"
              )}>
                <Coins className={cn(
                  "h-5 w-5 shrink-0",
                  creditBalance && (creditBalance.credits_remaining ?? 0) <= 0
                    ? "text-red-500"
                    : creditBalance && (creditBalance.credits_remaining ?? 0) < 10
                    ? "text-yellow-500"
                    : "text-purple-500"
                )} />
                <div>
                  <p className="font-semibold text-foreground">
                    {creditLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin inline" />
                    ) : creditBalance ? (
                      `${Number(creditBalance.credits_remaining ?? creditBalance.credits_total ?? 0).toFixed(2)} credits`
                    ) : (
                      "Credits: --"
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Search ~0.15 · Enrich 0.03 · Contact 1.03
                  </p>
                </div>
                {creditBalance && (creditBalance.credits_remaining ?? 0) < 10 && (creditBalance.credits_remaining ?? 0) > 0 && (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                )}
                {creditBalance && (creditBalance.credits_remaining ?? 0) <= 0 && (
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">No credits</span>
                )}
              </div>
            </div>
          </div>

          {/* Search bar row: Platform + Mode + Input + Search */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-[170px] h-12 rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border justify-between font-normal"
                >
                  <span className="truncate">
                    {(safePlatform).length === 0
                      ? "All Platforms"
                      : safePlatform.length === 1
                        ? PLATFORMS.find((p) => p.value === safePlatform[0])?.label ?? safePlatform[0]
                        : `${safePlatform.length} Platforms`}
                  </span>
                  <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
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
                          ? "bg-purple-50 dark:bg-purple-950/30"
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
                        className="border-gray-300 data-[state=checked]:bg-[#6C5CE7] data-[state=checked]:border-[#6C5CE7]"
                      />
                      {p.label}
                    </label>
                  );
                })}
              </PopoverContent>
            </Popover>
            <Select value={searchMode} onValueChange={(v) => setSearchMode(v as "keyword" | "username" | "lookalike")}>
              <SelectTrigger className="w-[150px] h-12 rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border">
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
            <Select value={creatorType} onValueChange={setCreatorType}>
              <SelectTrigger className="w-[180px] h-12 rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border">
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
            <div className="relative flex-1 min-w-[200px] max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder={
                  searchMode === "username"
                    ? "Enter exact username (e.g. tonitrucks)"
                    : searchMode === "lookalike"
                    ? "Find creators similar to (e.g. tonitrucks)"
                    : "Search military creators, fitness, lifestyle..."
                }
                className="pl-12 h-12 rounded-xl border border-border dark:border-gray-700 bg-background dark:bg-[#1A1D27] shadow-sm focus-visible:ring-2 transition-shadow hover:shadow-md"
                value={searchQuery}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchQuery(v);
                  if (v.startsWith("@") && searchMode === "keyword") {
                    setSearchMode("username");
                  }
                }}
                onKeyDown={handleSearchKeyDown}
              />
            </div>
            <Button onClick={handleSmartSearch} className="h-12 rounded-lg shrink-0 bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white px-6">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Active creator type pill + smart search applied filters */}
          {(creatorType !== "all" || smartFiltersApplied.length > 0) && (
            <div className="flex items-center gap-2 text-sm mb-4 flex-wrap">
              {creatorType !== "all" && (() => {
                const ct = CREATOR_TYPES.find((t) => t.value === creatorType);
                return ct ? (
                  <Badge variant="secondary" className="bg-[#6C5CE7]/10 text-[#6C5CE7] border-[#6C5CE7]/20 text-xs font-medium gap-1.5 pr-1">
                    {ct.icon && <span>{ct.icon}</span>}
                    Filtering: {ct.label}
                    <button
                      onClick={() => setCreatorType("all")}
                      className="ml-1 hover:bg-[#6C5CE7]/20 rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px] font-bold"
                    >
                      ✕
                    </button>
                  </Badge>
                ) : null;
              })()}
              {smartFiltersApplied.length > 0 && (
                <>
                  <Search className="h-3.5 w-3.5 shrink-0 text-pd-blue/80" />
                  <span className="text-muted-foreground">Smart filters:</span>
                  {smartFiltersApplied.map((label) => (
                    <Badge key={label} variant="secondary" className="bg-pd-blue/10 text-pd-blue border-pd-blue/20 text-xs font-medium">
                      {label}
                    </Badge>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Filter bar — primary filters always visible */}
          <div className="flex flex-wrap items-end gap-3 mb-2">
            <Input
              placeholder="Location"
              className="w-[140px] rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
            <Select value={followersRange} onValueChange={setFollowersRange}>
              <SelectTrigger className="w-[160px] rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border">
                <SelectValue placeholder="Followers" />
              </SelectTrigger>
              <SelectContent>
                {FOLLOWER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={engagementMin} onValueChange={setEngagementMin}>
              <SelectTrigger className="w-[140px] rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border">
                <SelectValue placeholder="Engagement" />
              </SelectTrigger>
              <SelectContent>
                {ENGAGEMENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-[130px] rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setShowMoreFilters((v) => !v)}
            >
              <ChevronDown className={cn("h-3.5 w-3.5 mr-1 transition-transform", showMoreFilters && "rotate-180")} />
              {showMoreFilters ? "Less Filters" : "More Filters"}
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={clearFilters}>
              Clear Filters
            </Button>
            {searchQuery.trim() && (
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => { setSaveSearchName(""); setSaveSearchOpen(true); }}>
                <Save className="h-3.5 w-3.5 mr-1" />
                Save Search
              </Button>
            )}
            {(savedSearches ?? []).length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-lg">
                    <Bookmark className="h-3.5 w-3.5 mr-1" />
                    Saved
                    <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
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

          {/* Collapsible extra filters */}
          {showMoreFilters && (
            <div className="flex flex-wrap items-end gap-3 mb-4 pl-0 animate-in slide-in-from-top-2 duration-200">
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger className="w-[140px] rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border">
                  <SelectValue placeholder="Niche" />
                </SelectTrigger>
                <SelectContent>
                  {NICHE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[150px] rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Keywords in bio (comma separated)"
                className="w-[280px] rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border"
                value={keywordsInBio}
                onChange={(e) => setKeywordsInBio(e.target.value)}
              />
            </div>
          )}

          {/* Military Branch */}
          <div className="mb-6">
            <p className="text-sm font-medium text-foreground mb-2">Military Branch</p>
            <div className="flex flex-wrap gap-2">
              {BRANCHES.map((branch) => {
                const selected = selectedBranches.has(branch);
                return (
                  <Badge
                    key={branch}
                    variant="outline"
                    className={cn(
                      "cursor-pointer transition-colors rounded-md",
                      selected
                        ? "bg-pd-blue/15 text-pd-blue border-pd-blue/50"
                        : "hover:bg-muted hover:text-foreground border-border"
                    )}
                    onClick={() => toggleBranch(branch)}
                  >
                    {branch}
                  </Badge>
                );
              })}
            </div>
          </div>

          {apiLoading && (
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Searching creators…</span>
            </div>
          )}

          {/* Empty state: no search yet */}
          {!hasSearched && !apiLoading && (
            <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-12 md:p-16 text-center">
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                Search for military and veteran creators
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Enter a search term above and click Search Creators or press Enter to find creators by name, handle, or keyword.
              </p>
            </Card>
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
                            className="cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 transition-colors capitalize"
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
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">{resultsLabel}</p>
                  {creators.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.size === creators.length}
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
                        const linkCount = (creator.externalLinks ?? []).length;
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
                                  </p>
                                  {creator.username && (
                                    <p className="text-xs text-gray-400 truncate">@{creator.username}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            {/* Social Links — only active platforms */}
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                {pending && socialSet.size <= 1 ? (
                                  <EnrichShimmer />
                                ) : socialSet.size > 0 ? (
                                  ALL_SOCIAL_PLATFORMS.filter((p) => socialSet.has(p)).map((p) => (
                                    <PlatformIcon key={p} platform={p} username={creator.username} />
                                  ))
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-600">—</span>
                                )}
                              </div>
                            </td>
                            {/* Followers */}
                            <td className="p-3 text-right font-semibold text-[#000741] dark:text-white tabular-nums">{formatFollowers(creator.followers)}</td>
                            {/* Email */}
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              {contactEmails[creator.id] ? (
                                <a href={`mailto:${contactEmails[creator.id]}`} title={contactEmails[creator.id]} className="inline-flex items-center justify-center">
                                  <Mail className="h-4 w-4 text-blue-500 hover:text-blue-600" />
                                </a>
                              ) : creator.hasEmail ? (
                                <button
                                  onClick={() => setContactConfirmCreator(creator)}
                                  className="inline-flex items-center justify-center"
                                  title="Get email (1.03 credits)"
                                >
                                  <Mail className="h-4 w-4 text-purple-500 hover:text-purple-600" />
                                </button>
                              ) : pending ? (
                                <div className="mx-auto"><EnrichShimmer /></div>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                            {/* ER */}
                            <td className="p-3 text-right font-semibold text-[#000741] dark:text-white tabular-nums">{creator.engagementRate ? `${creator.engagementRate.toFixed(2)}%` : "—"}</td>
                            {/* External Links Used */}
                            <td className="p-3 text-center">
                              {linkCount > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[11px] font-medium px-2.5 py-0.5">
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
                                {isCreatorInList(creator.id) ? (
                                  <span className="text-xs text-gray-400">Added</span>
                                ) : (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-md">
                                        <ListPlus className="h-3 w-3 mr-1" /> Add
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {lists.map((list) => (
                                        <DropdownMenuItem key={list.id} onClick={() => handleAddToList(list.id, list.name, creator)}>
                                          {list.name}
                                        </DropdownMenuItem>
                                      ))}
                                      <DropdownMenuItem onClick={() => handleOpenCreateListForCreator(creator)}>
                                        <Plus className="mr-2 h-4 w-4" /> Create New List
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                {directoriesList.length > 0 && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
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
                    const nicheTags = [
                      creator.nicheClass,
                      creator.category,
                      ...(creator.specialties ?? []),
                    ].filter(Boolean) as string[];
                    const confidence = getConfidence(creator);
                    const instagramUrl = creator.username
                      ? `https://instagram.com/${creator.username}`
                      : null;
                    const socialPlatforms = creator.socialPlatforms ?? [];
                    const externalLinks = creator.externalLinks ?? [];
                    const linkCount = externalLinks.length;
                    return (
                      <Card
                        key={creator.id}
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "relative rounded-xl border p-5 flex flex-col transition-all duration-200 cursor-pointer",
                          "bg-white border-gray-200 hover:shadow-md hover:border-[#6C5CE7]/30",
                          "dark:bg-[#1A1D27] dark:border-gray-800 dark:hover:border-[#6C5CE7]/30"
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
                        <div className="absolute top-4 left-4 z-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(creator.id)}
                            onCheckedChange={() => toggleSelect(creator.id)}
                            aria-label={`Select ${creator.name}`}
                          />
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <DiscoverAvatar url={creator.avatar} name={creator.name} username={creator.username} size="w-14 h-14" borderClass="border-2 border-white dark:border-slate-700 shadow-md" verified={creator.isVerified} badgeClass="h-5 w-5 text-[#6C5CE7]" />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-base text-[#000741] dark:text-white truncate flex items-center gap-1.5">
                              {creator.name}
                              {(creator.hasEmail || contactEmails[creator.id]) && !contactEmails[creator.id] && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 ml-1" title="Email available for outreach"><Mail className="h-3 w-3" />Email</span>
                              )}
                            </h3>
                            <p className="text-sm text-[#6C5CE7] truncate">
                              {creator.username ? `@${creator.username}` : "\u00A0"}
                            </p>
                            {creator.location && (
                              <p className="flex items-center gap-1 text-xs text-gray-400 dark:text-muted-foreground truncate mt-0.5">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {creator.location}
                              </p>
                            )}
                          </div>
                        </div>
                        {(socialPlatforms.length > 0 || creator.hasEmail) && (
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            {socialPlatforms.slice(0, 6).map((platform) => (
                              <PlatformIcon key={platform} platform={platform} username={creator.username} />
                            ))}
                            {contactEmails[creator.id] ? (
                              <a
                                href={`mailto:${contactEmails[creator.id]}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 rounded-md bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400 hover:underline"
                                title={contactEmails[creator.id]}
                              >
                                <Mail className="h-3 w-3" />{contactEmails[creator.id]}
                              </a>
                            ) : creator.hasEmail ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setContactConfirmCreator(creator); }}
                                className="inline-flex items-center gap-1 rounded-md bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                                title="Get email (1.03 credits)"
                              >
                                <UserSearch className="h-3 w-3" />Get Contact
                              </button>
                            ) : null}
                          </div>
                        )}
                        {creator.hashtags && creator.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {creator.hashtags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[11px] px-2 py-0.5"
                              >
                                #{tag}
                              </span>
                            ))}
                            {creator.hashtags.length > 3 && (
                              <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-[11px] px-2 py-0.5">
                                +{creator.hashtags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        {confidence.level !== "none" && (
                          <div className="mb-2 flex items-center gap-1.5" title={confidence.matches.length > 0 ? `Matching: ${confidence.matches.join(", ")}` : "No keyword matches found"}>
                            <span className={`inline-flex items-center rounded-full text-xs px-2 py-0.5 font-semibold ${confidenceColors[confidence.level]}`}>
                              {confidence.level === "high" ? "High Match" : confidence.level === "medium" ? "Mid Match" : "Low Match"}
                            </span>
                            <span className="text-xs text-gray-400">{Math.round(confidence.score * 100)}%</span>
                          </div>
                        )}
                        {creator.bio && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                            {creator.bio}
                          </p>
                        )}
                        {nicheTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {nicheTags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] dark:bg-[#6C5CE7]/20 dark:text-[#6C5CE7] text-xs px-2 py-0.5 font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                            {nicheTags.length > 3 && (
                              <span className="inline-flex items-center rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] dark:bg-[#6C5CE7]/20 dark:text-[#6C5CE7] text-xs px-2 py-0.5">
                                +{nicheTags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-center gap-4 py-2 mb-3 text-center border-y border-gray-100 dark:border-gray-800">
                          <div>
                            <p className="text-lg font-bold text-[#000741] dark:text-white tabular-nums">
                              {formatFollowers(creator.followers)}
                            </p>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Followers</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-[#000741] dark:text-white tabular-nums">
                              {typeof creator.engagementRate === "number"
                                ? creator.engagementRate.toFixed(2)
                                : "—"}%
                            </p>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Engagement</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-[#000741] dark:text-white tabular-nums flex items-center justify-center gap-1">
                              <ExternalLink className="h-4 w-4 text-gray-400" />
                              {linkCount}
                            </p>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Links</p>
                          </div>
                        </div>
                        <div className="mt-auto space-y-2" onClick={(e) => e.stopPropagation()}>
                          {isCreatorInList(creator.id) ? (
                            <Button size="sm" className="flex items-center justify-center gap-2 w-full text-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" disabled>
                              Added ✓
                            </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" className="flex items-center justify-center gap-2 w-full text-center rounded-lg bg-[#000741] hover:bg-[#5B4BD1] text-white dark:bg-[#000741] dark:hover:bg-[#5B4BD1]">
                                  <ListPlus className="h-4 w-4" />
                                  Add to List
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                                {lists.map((list) => (
                                  <DropdownMenuItem key={list.id} onClick={() => handleAddToList(list.id, list.name, creator)}>
                                    {list.name}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem onClick={() => handleOpenCreateListForCreator(creator)}>
                                  <Plus className="mr-2 h-4 w-4" />
                                  Create New List
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          <div className="flex gap-2 items-center">
                            {directoriesList.length > 0 && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center justify-center gap-2 w-full text-center rounded-lg flex-1 text-purple-700 border-purple-300 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-950/30"
                                    disabled={approvingDir}
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Add to Directory
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48">
                                  {directoriesList.map((dir) => (
                                    <DropdownMenuItem key={dir.id} onClick={() => handleStandaloneApprove(creator, dir.id)}>
                                      {dir.name}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
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
        onAddToList={handleBulkAddToList}
        listOptions={lists.map((l) => ({ id: l.id, name: l.name }))}
        onCreateList={() => setCreateListForBulkAddOpen(true)}
        onImportAll={handleImportAll}
        onImportAndAddToList={handleImportAndAddToList}
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
