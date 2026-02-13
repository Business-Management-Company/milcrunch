import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Search, ListPlus, Loader2, Plus, MapPin, ExternalLink, Mail, BadgeCheck, LayoutGrid, List, Save, Bookmark, ChevronDown, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { searchCreators, enrichCreatorProfile, type CreatorCard, type EnrichedProfileResponse } from "@/lib/influencers-club";
import { upsertCreator } from "@/lib/creators-db";
import CreatorProfileModal from "@/components/CreatorProfileModal";
import CreateListModal from "@/components/CreateListModal";
import BulkActionBar from "@/components/BulkActionBar";
import { useLists } from "@/contexts/ListContext";
import { useAuth } from "@/contexts/AuthContext";
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

const BRANCHES = ["Army", "Navy", "Air Force", "Marines", "Coast Guard"] as const;

const LAST_SEARCH_KEY = "pd_discover_last_search";

interface SavedSearchFilters {
  searchQuery: string;
  platform: string;
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

const PLATFORM_URLS: Record<string, (u: string) => string> = {
  instagram: (u) => `https://instagram.com/${u}`,
  tiktok: (u) => `https://tiktok.com/@${u}`,
  youtube: (u) => `https://youtube.com/@${u}`,
  twitter: (u) => `https://x.com/${u}`,
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

  if (result.email) partial.hasEmail = true;

  const creatorHas = result.creator_has as Record<string, boolean> | undefined;
  if (creatorHas && typeof creatorHas === "object") {
    const platforms: string[] = ["instagram"];
    if (creatorHas.tiktok) platforms.push("tiktok");
    if (creatorHas.youtube) platforms.push("youtube");
    if (creatorHas.twitter) platforms.push("twitter");
    if (creatorHas.facebook) platforms.push("facebook");
    if (creatorHas.linkedin) platforms.push("linkedin");
    if (creatorHas.twitch) platforms.push("twitch");
    if (creatorHas.podcast) platforms.push("podcast");
    partial.socialPlatforms = platforms;
  }

  const hashtags = instagram.hashtags;
  if (Array.isArray(hashtags) && hashtags.length > 0) {
    partial.hashtags = hashtags.slice(0, 10).map((t: unknown) => {
      if (typeof t === "string") return t.replace(/^#/, "");
      if (t && typeof t === "object" && "name" in t) return String((t as { name: string }).name).replace(/^#/, "");
      return String(t);
    });
  }

  const links = instagram.links_in_bio;
  if (Array.isArray(links) && links.length > 0) {
    const externalLinks: { label: string; url?: string }[] = [];
    links.forEach((item: unknown) => {
      const o = item as Record<string, unknown>;
      const url = (o.url ?? o.href ?? o.link ?? o) as string | undefined;
      if (typeof url !== "string" || !url.startsWith("http")) return;
      const lower = url.toLowerCase();
      let label = (o.label ?? o.title) as string | undefined;
      if (!label) {
        if (lower.includes("linktr.ee") || lower.includes("linktree")) label = "Linktree";
        else if (lower.includes("amazon")) label = "Amazon";
        else if (lower.includes("shopify")) label = "Shopify";
        else if (lower.includes("bio.site")) label = "Bio.link";
        else label = "Link";
      }
      externalLinks.push({ label: String(label), url });
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

  return partial;
}

const EnrichShimmer = () => (
  <div className="h-3 w-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse inline-block" />
);

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
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return String(count);
}

const BrandDiscover = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [platform, setPlatform] = useState<string>("instagram");
  const [followersRange, setFollowersRange] = useState<string>("any");
  const [engagementMin, setEngagementMin] = useState<string>("any");
  const [locationFilter, setLocationFilter] = useState("");
  const [niche, setNiche] = useState<string>("All niches");
  const [gender, setGender] = useState<string>("any");
  const [language, setLanguage] = useState<string>("any");
  const [keywordsInBio, setKeywordsInBio] = useState("");
  const [sortBy, setSortBy] = useState<string>("confidence");
  const [selectedBranches, setSelectedBranches] = useState<Set<Branch>>(new Set());
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

  const { lists, addCreatorToList, createList, isCreatorInList } = useLists();
  const { user } = useAuth();

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
    setSearchQuery(f.searchQuery);
    setPlatform(f.platform);
    setFollowersRange(f.followersRange);
    setEngagementMin(f.engagementMin);
    setLocationFilter(f.locationFilter);
    setNiche(f.niche);
    setGender(f.gender);
    setLanguage(f.language);
    setKeywordsInBio(f.keywordsInBio);
    setSortBy(f.sortBy);
    setSelectedBranches(new Set(f.selectedBranches as Branch[]));
  }, []);

  // Save last search to localStorage whenever a search runs
  const persistLastSearch = useCallback((filters: SavedSearchFilters) => {
    try { localStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(filters)); } catch { /* quota */ }
  }, []);

  // Load saved searches from Supabase
  const loadSavedSearches = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("saved_searches")
      .select("id, name, search_query, filters, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.error("[SavedSearch] Load failed:", error.message, error);
    if (data) setSavedSearches(data as SavedSearchRow[]);
  }, [user]);

  // Save current search to Supabase
  const handleSaveSearch = async () => {
    if (!user || !saveSearchName.trim()) return;
    setSavingSearch(true);
    const filters = getCurrentFilters();
    const { error } = await supabase.from("saved_searches").insert({
      user_id: user.id,
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
    await supabase.from("saved_searches").delete().eq("id", id);
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  };

  const pendingAutoSearch = useRef(false);

  // Load a saved search: apply filters then trigger search
  const handleLoadSavedSearch = useCallback((saved: SavedSearchRow) => {
    applyFilters(saved.filters);
    pendingAutoSearch.current = true;
  }, [applyFilters]);

  // Load saved searches on mount
  useEffect(() => { loadSavedSearches(); }, [loadSavedSearches]);

  // Auto-load last search from localStorage on mount
  useEffect(() => {
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;
    try {
      const raw = localStorage.getItem(LAST_SEARCH_KEY);
      if (!raw) return;
      const filters = JSON.parse(raw) as SavedSearchFilters;
      if (!filters.searchQuery?.trim()) return;
      applyFilters(filters);
      pendingAutoSearch.current = true;
    } catch { /* corrupt data */ }
  }, [applyFilters]);

  const runSearch = useCallback(() => {
    const q = searchQuery.trim().replace(/^@/, "");
    if (!q) {
      setApiResults(null);
      setApiLoading(false);
      return;
    }
    setApiLoading(true);
    setCurrentPage(1);
    enrichAbortRef.current?.abort();
    enrichedSetRef.current = new Set();
    setEnrichCache({});
    setEnrichRawCache({});
    setEnrichingIds(new Set());
    const followerOpt = FOLLOWER_OPTIONS.find((o) => o.value === followersRange);
    const engagementOpt = ENGAGEMENT_OPTIONS.find((o) => o.value === engagementMin);
    const branchKeys = selectedBranches.size > 0 ? Array.from(selectedBranches) : [];
    const bioKeys = keywordsInBio.trim() ? keywordsInBio.split(",").map((k) => k.trim()).filter(Boolean) : [];
    const keywords_in_bio = [...branchKeys, ...bioKeys].length > 0 ? [...branchKeys, ...bioKeys] : [""];
    const options = {
      platform: platform.toLowerCase(),
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
    searchCreators(q, options)
      .then((result) => {
        if (searchQueryRef.current.trim().replace(/^@/, "") === q) setApiResults(result);
      })
      .catch((err) => {
        if (searchQueryRef.current.trim().replace(/^@/, "") === q) setApiResults(null);
        console.warn("[BrandDiscover] API search failed:", err);
      })
      .finally(() => {
        if (searchQueryRef.current.trim().replace(/^@/, "") === q) setApiLoading(false);
      });
  }, [searchQuery, platform, followersRange, engagementMin, sortBy, selectedBranches, persistLastSearch, getCurrentFilters]);

  // Fire search after auto-load applies filters (runs once after state updates)
  useEffect(() => {
    if (pendingAutoSearch.current && searchQuery.trim()) {
      pendingAutoSearch.current = false;
      runSearch();
    }
  }, [searchQuery, runSearch]);

  const loadMore = useCallback(() => {
    const q = searchQuery.trim().replace(/^@/, "");
    if (!q || !apiResults) return;
    const nextPage = currentPage + 1;
    setLoadingMore(true);
    const followerOpt = FOLLOWER_OPTIONS.find((o) => o.value === followersRange);
    const engagementOpt = ENGAGEMENT_OPTIONS.find((o) => o.value === engagementMin);
    const keywords_in_bio = selectedBranches.size > 0 ? Array.from(selectedBranches) : [""];
    searchCreators(q, {
      platform: platform.toLowerCase(),
      number_of_followers: { min: followerOpt?.min ?? null, max: followerOpt?.max ?? null },
      engagement_percent: { min: engagementOpt?.min ?? null, max: null },
      keywords_in_bio,
      sort_by: (sortBy === "confidence" ? "relevancy" : sortBy) as "relevancy" | "followers" | "engagement",
      location: locationFilter.trim() || undefined,
      gender: gender !== "any" ? gender : undefined,
      language: language !== "any" ? language : undefined,
      page: nextPage,
    })
      .then((result) => {
        setApiResults((prev) => prev ? {
          ...prev,
          creators: [...prev.creators, ...result.creators],
        } : result);
        setCurrentPage(nextPage);
      })
      .catch((err) => console.warn("[BrandDiscover] Load more failed:", err))
      .finally(() => setLoadingMore(false));
  }, [searchQuery, apiResults, currentPage, platform, followersRange, engagementMin, sortBy, selectedBranches, locationFilter]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch();
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setPlatform("instagram");
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
  const creators = apiResults?.creators ?? [];

  // Background enrichment: enrich creators in parallel batches of 10 with Supabase caching
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

              // Cache miss — call the API
              const data = await enrichCreatorProfile(creator.username!, controller.signal);
              if (data && !controller.signal.aborted) {
                enrichedSetRef.current.add(creator.id);
                const partial = extractFromEnrichment(data);
                setEnrichCache((prev) => ({ ...prev, [creator.id]: partial }));
                setEnrichRawCache((prev) => ({ ...prev, [creator.id]: data }));
                // Save to Supabase cache (fire-and-forget)
                setCachedEnrichment(creator.username!, data);
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
  }, [apiResults]);

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
    high: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
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

  const creatorToListPayload = (c: CreatorCard) => ({
    id: c.id,
    name: c.name,
    username: c.username,
    avatar: c.avatar,
    followers: c.followers,
    engagementRate: c.engagementRate,
    platforms: c.platforms,
    bio: c.bio,
    location: c.location,
  });

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
      await upsertCreator({
        display_name: c.name,
        handle: c.username ?? c.id,
        platform: c.platforms?.[0] ?? "instagram",
        avatar_url: c.avatar ?? null,
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
      await upsertCreator({
        display_name: c.name,
        handle: c.username ?? c.id,
        platform: c.platforms?.[0] ?? "instagram",
        avatar_url: c.avatar ?? null,
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
      <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">
              Discover Creators
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Search and filter military and veteran creators by branch, follower range, and
              specialty. Build lists and invite them to events and campaigns.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-2xl mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, handle, or keyword…"
              className="pl-12 h-12 rounded-xl border border-border dark:border-gray-700 bg-background dark:bg-[#1A1D27] shadow-sm focus-visible:ring-2 transition-shadow hover:shadow-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-[140px] rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={followersRange} onValueChange={setFollowersRange}>
              <SelectTrigger className="w-[140px] rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border">
                <SelectValue placeholder="Followers" />
              </SelectTrigger>
              <SelectContent>
                {FOLLOWER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={engagementMin} onValueChange={setEngagementMin}>
              <SelectTrigger className="w-[160px] rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border">
                <SelectValue placeholder="Engagement" />
              </SelectTrigger>
              <SelectContent>
                {ENGAGEMENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Location"
              className="w-[140px] rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
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
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-[160px] rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[160px] rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border">
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
              className="w-[300px] rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700 border-border"
              value={keywordsInBio}
              onChange={(e) => setKeywordsInBio(e.target.value)}
            />
            <Button onClick={runSearch} className="rounded-lg shrink-0 bg-pd-blue hover:bg-pd-darkblue text-white">
              Search Creators
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
            {savedSearches.length > 0 && (
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
                        <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">Platforms</th>
                        <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">Followers</th>
                        <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">Engage</th>
                        <th className="text-center p-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                        <th className="text-center p-3 font-medium text-gray-500 dark:text-gray-400">Links</th>
                        <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">Hashtags</th>
                        <th className="p-3 w-24"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayCreators.map((baseCreator, _idx) => {
                        const creator = getMergedCreator(baseCreator);
                        if (_idx === 0) console.log("[BrandDiscover] First creator (table):", creator);
                        const socialPlatforms = creator.socialPlatforms ?? [];
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
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.has(creator.id)}
                                onCheckedChange={() => toggleSelect(creator.id)}
                                aria-label={`Select ${creator.name}`}
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="relative shrink-0">
                                  <img src={creator.avatar} alt={creator.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                                  {creator.isVerified && (
                                    <BadgeCheck className="absolute -top-1 -left-1 h-4 w-4 text-[#0064B1] bg-white dark:bg-[#1A1D27] rounded-full" aria-label="Verified" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-[#000741] dark:text-white truncate flex items-center gap-1">
                                    {creator.name}
                                    {isActiveEnrich && <Loader2 className="h-3 w-3 animate-spin text-gray-400 shrink-0" />}
                                  </p>
                                  <p className="text-xs text-[#0064B1] truncate">{creator.username ? `@${creator.username}` : ""}</p>
                                  {creator.location && (
                                    <p className="text-xs text-gray-400 truncate flex items-center gap-0.5"><MapPin className="h-3 w-3 shrink-0" />{creator.location}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                {socialPlatforms.slice(0, 5).map((p) => (
                                  <PlatformIcon key={p} platform={p} username={creator.username} />
                                ))}
                                {pending && socialPlatforms.length <= 1 && <EnrichShimmer />}
                              </div>
                            </td>
                            <td className="p-3 text-right font-semibold text-[#000741] dark:text-white tabular-nums">{formatFollowers(creator.followers)}</td>
                            <td className="p-3 text-right font-semibold text-[#000741] dark:text-white tabular-nums">{typeof creator.engagementRate === "number" ? `${creator.engagementRate.toFixed(2)}%` : "—"}</td>
                            <td className="p-3 text-center">
                              {creator.hasEmail ? (
                                <Mail className="h-4 w-4 text-blue-500 mx-auto" title="Email available" />
                              ) : pending ? (
                                <div className="mx-auto"><EnrichShimmer /></div>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {linkCount > 0 ? (
                                <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  {linkCount}
                                </span>
                              ) : pending ? (
                                <div className="mx-auto"><EnrichShimmer /></div>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                            <td className="p-3">
                              {hashtags.length > 0 ? (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {hashtags.slice(0, 2).map((tag) => (
                                    <span key={tag} className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[11px] px-2 py-0.5">
                                      #{tag}
                                    </span>
                                  ))}
                                  {hashtags.length > 2 && (
                                    <span className="text-[11px] text-gray-400">+{hashtags.length - 2}</span>
                                  )}
                                </div>
                              ) : pending ? (
                                <div className="flex gap-1"><EnrichShimmer /><EnrichShimmer /></div>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
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
                          "bg-white border-gray-200 hover:shadow-md hover:border-[#0064B1]/30",
                          "dark:bg-[#1A1D27] dark:border-gray-800 dark:hover:border-[#0064B1]/30"
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
                          <div className="relative shrink-0">
                            <img
                              src={creator.avatar}
                              alt={creator.name}
                              className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-md"
                            />
                            {creator.isVerified && (
                              <BadgeCheck className="absolute -top-1 -left-1 h-5 w-5 text-[#0064B1] bg-white dark:bg-[#1A1D27] rounded-full" aria-label="Verified" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-base text-[#000741] dark:text-white truncate flex items-center gap-1.5">
                              {creator.name}
                              {creator.hasEmail && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 ml-1" title="Email available for outreach"><Mail className="h-3 w-3" />Email</span>
                              )}
                            </h3>
                            <p className="text-sm text-[#0064B1] truncate">
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
                            {creator.hasEmail && (
                              <span
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-900/30"
                                title="Email available"
                              >
                                <Mail className="h-3.5 w-3.5 text-blue-500" />
                              </span>
                            )}
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
                                className="inline-flex items-center rounded-full bg-[#0064B1]/10 text-[#0064B1] dark:bg-[#0064B1]/20 dark:text-[#0064B1] text-xs px-2 py-0.5 font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                            {nicheTags.length > 3 && (
                              <span className="inline-flex items-center rounded-full bg-[#0064B1]/10 text-[#0064B1] dark:bg-[#0064B1]/20 dark:text-[#0064B1] text-xs px-2 py-0.5">
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
                            <Button size="sm" className="w-full rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" disabled>
                              Added ✓
                            </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" className="w-full rounded-lg bg-[#000741] hover:bg-[#053877] text-white dark:bg-[#000741] dark:hover:bg-[#053877]">
                                  <ListPlus className="h-4 w-4 mr-2" />
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
      />
    </>
  );
};

export default BrandDiscover;
