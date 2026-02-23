import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  ShieldCheck,
  Instagram,
  Youtube,
  Twitter,
  ArrowLeft,
  ArrowRight,
  Search,
  X,
  ChevronDown,
  Heart,
} from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";
import {
  fetchShowcaseByDirectoryName,
  fillShowcaseAvatarsFromCache,
  fillMissingAvatarsFromApi,
  resolveBannerImages,
  formatFollowerCount,
  getInitials,
  extractAvatarFromEnrichment,
  type ShowcaseCreator,
} from "@/lib/featured-creators";
import { cn, safeImageUrl } from "@/lib/utils";
import { getCreatorAvatar } from "@/lib/avatar";

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const TikTokIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.39a8.16 8.16 0 003.76.92V6.86a4.85 4.85 0 01-.01-.17z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const BRANCHES = ["Army", "Navy", "Air Force", "Marines", "Coast Guard", "Space Force"];
const PLATFORMS = ["instagram", "tiktok", "youtube", "twitter"];
const PAGE_SIZE = 50;
const CACHE_KEY = "milcrunch_directory_v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type SortKey = "followers" | "engagement" | "recent" | "name";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "followers", label: "Followers" },
  { value: "engagement", label: "Engagement" },
  { value: "recent", label: "Recently Added" },
  { value: "name", label: "Name A\u2013Z" },
];

/* Branch → animated gradient mesh for card banners */
const BRANCH_GRADIENT: Record<string, string> = {
  default: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6B73FF 100%)",
  veteran: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6B73FF 100%)",
  Marines: "linear-gradient(135deg, #940000 0%, #6B0000 50%, #940000 100%)",
  Army: "linear-gradient(135deg, #4B5320 0%, #3a4118 50%, #4B5320 100%)",
  Navy: "linear-gradient(135deg, #000083 0%, #050058 50%, #000083 100%)",
  "Air Force": "linear-gradient(135deg, #003594 0%, #002070 50%, #003594 100%)",
  "Coast Guard": "linear-gradient(135deg, #005F9E 0%, #CC2529 50%, #005F9E 100%)",
  "National Guard": "linear-gradient(135deg, #4B5320 0%, #DAA520 50%, #4B5320 100%)",
};

/* Branch filter badge colors (selected state) */
const BRANCH_SELECTED: Record<string, string> = {
  Army: "bg-green-700 border-green-700 text-white",
  Navy: "bg-blue-800 border-blue-800 text-white",
  "Air Force": "bg-blue-600 border-blue-600 text-white",
  Marines: "bg-red-700 border-red-700 text-white",
  "Coast Guard": "bg-orange-600 border-orange-600 text-white",
  "Space Force": "bg-indigo-600 border-indigo-600 text-white",
};

/* Branch badge pill colors (on card) — stronger colors */
const BRANCH_BADGE: Record<string, string> = {
  Army: "bg-green-700 text-white",
  Navy: "bg-blue-800 text-white",
  "Air Force": "bg-sky-600 text-white",
  Marines: "bg-red-700 text-white",
  "Coast Guard": "bg-orange-600 text-white",
  "Space Force": "bg-indigo-600 text-white",
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4" />,
  tiktok: <TikTokIcon className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
};

const PLATFORM_COLOR: Record<string, string> = {
  instagram: "text-pink-500",
  tiktok: "text-gray-900",
  youtube: "text-red-600",
  twitter: "text-gray-700",
};

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X",
};

const KNOWN_PLATFORMS = ["instagram", "tiktok", "youtube", "twitter", "facebook", "linkedin", "twitch", "pinterest", "snapchat", "threads"];

/** Extract all platforms from ShowcaseCreator: platforms array, platform_urls, and enrichment_data. */
function getAllPlatforms(c: ShowcaseCreator): string[] {
  const set = new Set<string>();
  if (Array.isArray(c.platforms)) c.platforms.forEach((p) => set.add(p.toLowerCase()));
  if (c.platform_urls && typeof c.platform_urls === "object") {
    Object.entries(c.platform_urls).forEach(([k, v]) => { if (v) set.add(k.toLowerCase()); });
  }
  if (c.enrichment_data && typeof c.enrichment_data === "object") {
    const ed = c.enrichment_data as Record<string, unknown>;
    const result = (ed.result as Record<string, unknown>) ?? ed;
    const creatorHas = (result.creator_has ?? ed.creator_has) as Record<string, boolean> | undefined;
    if (creatorHas && typeof creatorHas === "object") {
      Object.entries(creatorHas).forEach(([k, v]) => { if (v) set.add(k.toLowerCase()); });
    }
    for (const pkey of KNOWN_PLATFORMS) {
      if (result[pkey] && typeof result[pkey] === "object") set.add(pkey);
    }
    const accounts = (result.accounts ?? ed.accounts) as { platform?: string }[] | undefined;
    if (Array.isArray(accounts)) {
      accounts.forEach((a) => { if (a.platform) set.add(a.platform.toLowerCase()); });
    }
    const plinks = (result.platform_links ?? ed.platform_links) as Record<string, string> | undefined;
    if (plinks && typeof plinks === "object") {
      Object.entries(plinks).forEach(([k, v]) => { if (v) set.add(k.toLowerCase()); });
    }
  }
  const ordered = KNOWN_PLATFORMS.filter((p) => set.has(p));
  set.forEach((p) => { if (!ordered.includes(p)) ordered.push(p); });
  return ordered;
}

/* ------------------------------------------------------------------ */
/* Skeleton Card                                                       */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col animate-pulse">
      {/* Banner shimmer */}
      <div className="h-20 w-full bg-gray-200" />
      {/* Avatar placeholder */}
      <div className="flex justify-center -mt-8">
        <div className="w-16 h-16 rounded-full border-4 border-white bg-gray-200 shadow-lg" />
      </div>
      {/* Content */}
      <div className="p-4 flex flex-col items-center gap-2.5">
        <div className="h-4 w-28 bg-gray-200 rounded-md" />
        <div className="h-3 w-20 bg-gray-100 rounded-md" />
        <div className="h-5 w-16 bg-gray-200 rounded-full" />
        <div className="flex gap-6 mt-1">
          <div className="text-center">
            <div className="h-4 w-12 bg-gray-200 rounded-md mb-1" />
            <div className="h-2.5 w-14 bg-gray-100 rounded-md" />
          </div>
          <div className="text-center">
            <div className="h-4 w-10 bg-gray-200 rounded-md mb-1" />
            <div className="h-2.5 w-16 bg-gray-100 rounded-md" />
          </div>
        </div>
        <div className="flex gap-2 mt-1">
          <div className="h-4 w-4 bg-gray-100 rounded" />
          <div className="h-4 w-4 bg-gray-100 rounded" />
        </div>
        <div className="border-t border-gray-100 mt-1 pt-3 w-full">
          <div className="h-4 w-24 bg-gray-100 rounded-md mx-auto" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Creator Card                                                        */
/* ------------------------------------------------------------------ */

function CreatorCard({
  creator: c,
  inView,
  index,
}: {
  creator: ShowcaseCreator;
  inView: boolean;
  index: number;
}) {
  const avatarUrl = getCreatorAvatar(c) ?? safeImageUrl(extractAvatarFromEnrichment(c.enrichment_data));
  const platforms = getAllPlatforms(c);
  const badgeClass = BRANCH_BADGE[c.branch ?? ""] ?? "bg-gray-500 text-white";
  const isVerified = !!c.featured_homepage;
  const branchGradient = BRANCH_GRADIENT[c.branch ?? ""] ?? BRANCH_GRADIENT.default;

  return (
    <Link
      to={`/creators/${c.profile_slug || c.handle}`}
      className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "scale(1)" : "translateY(24px) scale(0.97)",
        transition: `opacity 0.45s ease-out ${Math.min(index, 20) * 35}ms, transform 0.45s ease-out ${Math.min(index, 20) * 35}ms, box-shadow 0.3s ease`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {/* Banner — animated branch gradient mesh */}
      <div className="h-20 w-full relative overflow-hidden">
        <div
          className="absolute inset-0 animate-mesh-shift"
          style={{ backgroundImage: branchGradient, opacity: 0.75 }}
        />
        {/* Branch label on banner */}
        {c.branch && (
          <span className="absolute top-2.5 right-2.5 text-[10px] font-bold uppercase tracking-wider text-white/80 drop-shadow-sm">
            {c.branch}
          </span>
        )}
      </div>

      {/* Avatar overlapping banner — with verification ring */}
      <div className="flex justify-center -mt-8 relative z-10">
        <div
          className={cn(
            "w-16 h-16 rounded-full border-[3px] shadow-lg overflow-hidden bg-white relative",
            isVerified ? "border-[#1e3a5f]" : "border-white",
          )}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={c.display_name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { console.log('[IMG ERROR] failed to load:', e.currentTarget.src); e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove('hidden'); }}
            />
          ) : null}
          <div className={`w-full h-full bg-gradient-to-br from-[#1e3a5f] to-[#2d5282] flex items-center justify-center text-white font-bold text-base ${avatarUrl ? 'hidden' : ''}`}>
              {getInitials(c.display_name, c.handle)}
            </div>

          {/* Verified checkmark overlay */}
          {isVerified && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#1e3a5f] flex items-center justify-center ring-2 ring-white">
              <ShieldCheck className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col items-center flex-1">
        {/* Name + inline verification badges */}
        <div className="flex items-center gap-1 mb-0.5">
          <h3 className="font-semibold text-gray-900 text-sm text-center leading-snug break-words">
            {c.display_name}
          </h3>
          {c.featured_homepage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">MilCrunch Verified</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Handle */}
        <p className="text-xs text-gray-400 text-center">@{c.handle}</p>

        {/* Branch badge — bold pill */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center">
          {c.branch && (
            <span className={cn("text-[11px] font-bold px-3 py-1 rounded-full shadow-sm", badgeClass)}>
              {c.branch}
            </span>
          )}
          {c.status && (
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
              {c.status}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">
              {formatFollowerCount(c.follower_count)}
            </p>
            <p className="text-[11px] text-gray-400">Followers</p>
          </div>
          {c.avg_likes != null && String(c.avg_likes) !== "0" && String(c.avg_likes) !== "—" && (
            <div className="text-center">
              <p className="text-sm font-bold text-gray-900 flex items-center justify-center gap-1">
                <Heart className="h-3 w-3 text-pink-500 fill-pink-500" />
                {formatFollowerCount(Number(c.avg_likes))}
              </p>
              <p className="text-[11px] text-gray-400">Avg Likes</p>
            </div>
          )}
        </div>

        {/* Platform icons */}
        {platforms.length > 0 && (
          <div className="flex items-center justify-center gap-2.5 mt-2.5">
            {platforms.map((p) => (
              <span
                key={p}
                className={cn("transition-colors", PLATFORM_COLOR[p] ?? "text-gray-400")}
              >
                {PLATFORM_ICON[p] ?? null}
              </span>
            ))}
          </div>
        )}

        {/* View Profile link */}
        <div className="border-t border-gray-100 mt-3 pt-3 w-full">
          <span className="flex items-center justify-center gap-1 text-sm font-medium text-[#1e3a5f] group-hover:gap-2 transition-all">
            View Profile <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Cache helpers                                                       */
/* ------------------------------------------------------------------ */

function getCachedCreators(): ShowcaseCreator[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data as ShowcaseCreator[];
  } catch {
    return null;
  }
}

function setCachedCreators(data: ShowcaseCreator[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* quota exceeded — ignore */ }
}

/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function Creators() {
  const [allCreators, setAllCreators] = useState<ShowcaseCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [inView, setInView] = useState(false);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("followers");
  const [sortOpen, setSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Load data: cache-first, then refresh in background
  useEffect(() => {
    const cached = getCachedCreators();
    if (cached && cached.length > 0) {
      setAllCreators(cached);
      setLoading(false);
      // Refresh in background + persist CDN avatars
      fetchShowcaseByDirectoryName("Military Creator Network", 500).then(async (fresh) => {
        if (fresh.length > 0) {
          setAllCreators(fresh);
          setCachedCreators(fresh);
          const withAvatars = await fillShowcaseAvatarsFromCache(fresh);
          setAllCreators(withAvatars);
          setCachedCreators(withAvatars);
          // Fetch missing avatars from IC API (0.03 credits each, capped)
          const withApiAvatars = await fillMissingAvatarsFromApi(withAvatars);
          setAllCreators(withApiAvatars);
          setCachedCreators(withApiAvatars);
          // Resolve banner images (from enrichment_data + IC API)
          const withBanners = await resolveBannerImages(withApiAvatars);
          setAllCreators(withBanners);
          setCachedCreators(withBanners);
        }
      });
    } else {
      fetchShowcaseByDirectoryName("Military Creator Network", 500).then(async (data) => {
        setAllCreators(data);
        setLoading(false);
        if (data.length > 0) setCachedCreators(data);
        const withAvatars = await fillShowcaseAvatarsFromCache(data);
        setAllCreators(withAvatars);
        if (withAvatars.length > 0) setCachedCreators(withAvatars);
        // Fetch missing avatars from IC API (0.03 credits each, capped)
        const withApiAvatars = await fillMissingAvatarsFromApi(withAvatars);
        setAllCreators(withApiAvatars);
        if (withApiAvatars.length > 0) setCachedCreators(withApiAvatars);
        // Resolve banner images (from enrichment_data + IC API)
        const withBanners = await resolveBannerImages(withApiAvatars);
        setAllCreators(withBanners);
        if (withBanners.length > 0) setCachedCreators(withBanners);
      });
    }
  }, []);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset page on filter/sort change
  useEffect(() => {
    setPage(1);
  }, [search, branchFilter, platformFilter, sortBy]);

  const filtered = useMemo(() => {
    let list = allCreators;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.display_name.toLowerCase().includes(q) ||
          c.handle.toLowerCase().includes(q),
      );
    }

    // Branch filter
    if (branchFilter) {
      list = list.filter((c) => c.branch === branchFilter);
    }

    // Platform filter
    if (platformFilter) {
      list = list.filter((c) => (c.platforms ?? []).includes(platformFilter));
    }

    // Sort
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "followers":
          return (b.follower_count ?? 0) - (a.follower_count ?? 0);
        case "engagement":
          return (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0);
        case "recent":
          return (b.created_at ?? "").localeCompare(a.created_at ?? "");
        case "name":
          return a.display_name.localeCompare(b.display_name);
        default:
          return 0;
      }
    });

    return list;
  }, [allCreators, search, branchFilter, platformFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = page < totalPages;

  const clearFilters = () => {
    setSearch("");
    setBranchFilter(null);
    setPlatformFilter(null);
  };
  const hasFilters = !!search.trim() || !!branchFilter || !!platformFilter;

  return (
    <div className="min-h-screen bg-gray-50 text-[#1A1A2E]">
      <PublicNav />

      <main className="px-4 md:px-8 pt-24 pb-12 md:pt-28 md:pb-16">
        <div className="max-w-7xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f] mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1A2E] mb-3">
              Military Influencer Network
            </h1>
            <p className="text-[#6B7280] text-lg max-w-2xl mx-auto">
              The #1 network for verified military and veteran content creators.
              Discover authentic voices from those who served.
            </p>
          </div>

          {/* Search + Filters */}
          <div className="mb-8 space-y-4">
            {/* Search bar */}
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or handle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  "w-full pl-11 pr-10 py-3 rounded-full text-sm",
                  "border border-gray-200 bg-white shadow-sm",
                  "focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]",
                  "placeholder:text-gray-400 transition-all",
                )}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Branch filter chips */}
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <span className="text-xs font-medium text-gray-500 mr-1">
                Branch:
              </span>
              {BRANCHES.map((b) => {
                const isActive = branchFilter === b;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBranchFilter(isActive ? null : b)}
                    className={cn(
                      "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
                      isActive
                        ? BRANCH_SELECTED[b] ?? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
                    )}
                  >
                    {b}
                  </button>
                );
              })}
            </div>

            {/* Platform filter chips */}
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <span className="text-xs font-medium text-gray-500 mr-1">
                Platform:
              </span>
              {PLATFORMS.map((p) => {
                const isActive = platformFilter === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatformFilter(isActive ? null : p)}
                    className={cn(
                      "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5",
                      isActive
                        ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
                    )}
                  >
                    <span className={isActive ? "text-white" : PLATFORM_COLOR[p]}>
                      {PLATFORM_ICON[p]}
                    </span>
                    {PLATFORM_LABEL[p] ?? p}
                  </button>
                );
              })}
            </div>

            {/* Active filter summary */}
            {hasFilters && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <span>
                  {filtered.length} creator{filtered.length !== 1 ? "s" : ""}{" "}
                  found
                </span>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[#1e3a5f] hover:underline font-medium"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* Sort bar */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {loading ? "Loading creators\u2026" : `${filtered.length} creator${filtered.length !== 1 ? "s" : ""}`}
            </p>
            <div ref={sortRef} className="relative">
              <button
                type="button"
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm transition-colors"
              >
                Sort by:{" "}
                <span className="font-medium">
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    sortOpen && "rotate-180",
                  )}
                />
              </button>
              {sortOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.value);
                        setSortOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm transition-colors",
                        sortBy === opt.value
                          ? "bg-blue-50 text-[#1e3a5f] font-medium"
                          : "text-gray-600 hover:bg-gray-50",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Grid */}
          <div
            ref={gridRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {loading
              ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
              : paged.map((c, i) => (
                  <CreatorCard key={c.id} creator={c} inView={inView} index={i} />
                ))
            }
          </div>

          {!loading && paged.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg font-medium mb-2">No creators found</p>
              <p className="text-sm">
                {hasFilters
                  ? "Try adjusting your filters or search terms."
                  : "Check back soon \u2014 we\u2019re onboarding verified military creators."}
              </p>
            </div>
          )}

          {/* Load More */}
          {!loading && hasMore && (
            <div className="text-center mt-10">
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/10 px-8"
              >
                Load More ({filtered.length - paged.length} remaining)
              </Button>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
