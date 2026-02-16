import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  ShieldCheck,
  BadgeCheck,
  Instagram,
  Youtube,
  Twitter,
  ArrowLeft,
  Search,
  X,
} from "lucide-react";
import {
  fetchShowcaseByDirectoryName,
  formatFollowerCount,
  getInitials,
  type ShowcaseCreator,
} from "@/lib/featured-creators";

const TikTokIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.39a8.16 8.16 0 003.76.92V6.86a4.85 4.85 0 01-.01-.17z" />
  </svg>
);

const BRANCHES = ["Army", "Navy", "Air Force", "Marines", "Coast Guard", "Space Force"];
const PLATFORMS = ["instagram", "tiktok", "youtube", "twitter"];
const PAGE_SIZE = 50;

const BRANCH_STYLES: Record<string, string> = {
  Army: "bg-green-800/10 text-green-800",
  Navy: "bg-blue-900/10 text-blue-900",
  "Air Force": "bg-sky-600/10 text-sky-700",
  Marines: "bg-red-700/10 text-red-700",
  "Coast Guard": "bg-orange-600/10 text-orange-700",
  "Space Force": "bg-indigo-600/10 text-indigo-700",
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-3.5 w-3.5" />,
  tiktok: <TikTokIcon className="h-3.5 w-3.5" />,
  youtube: <Youtube className="h-3.5 w-3.5" />,
  twitter: <Twitter className="h-3.5 w-3.5" />,
};

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X / Twitter",
};

function CreatorCard({ creator: c, inView, index }: { creator: ShowcaseCreator; inView: boolean; index: number }) {
  const [imgSrc, setImgSrc] = useState<string | null>(c.avatar_url || c.ic_avatar_url || null);
  const [imgFailed, setImgFailed] = useState(false);

  const handleImgError = () => {
    if (imgSrc === c.avatar_url && c.ic_avatar_url && c.ic_avatar_url !== c.avatar_url) {
      setImgSrc(c.ic_avatar_url);
    } else {
      setImgFailed(true);
    }
  };

  const showImage = !!imgSrc && !imgFailed;
  const platforms = c.platforms ?? [];
  const branchStyle = BRANCH_STYLES[c.branch ?? ""] ?? "bg-gray-100 text-gray-700";

  return (
    <Link
      to={`/creators/${c.profile_slug || c.handle}`}
      className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col items-center text-center"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.5s ease-out ${Math.min(index, 20) * 50}ms, transform 0.5s ease-out ${Math.min(index, 20) * 50}ms, box-shadow 0.3s ease`,
      }}
    >
      <div className="relative mb-3">
        <div className={`w-[72px] h-[72px] rounded-full overflow-hidden ${c.paradedeck_verified ? "ring-[3px] ring-purple-500 ring-offset-2" : "ring-1 ring-gray-200"}`}>
          {showImage ? (
            <img src={imgSrc!} alt={c.display_name} className="w-full h-full object-cover" loading="lazy" onError={handleImgError} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#6C5CE7] to-[#5B4BD1] flex items-center justify-center text-white font-bold text-lg">
              {getInitials(c.display_name, c.handle)}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 mb-1.5">
        <h3 className="font-semibold text-[#000741] text-sm leading-tight truncate max-w-[120px]">{c.display_name}</h3>
        {c.paradedeck_verified && (
          <Tooltip>
            <TooltipTrigger asChild><ShieldCheck className="h-4 w-4 text-purple-500 shrink-0" /></TooltipTrigger>
            <TooltipContent side="top" className="text-xs">RecurrentX Verified</TooltipContent>
          </Tooltip>
        )}
        {c.influencersclub_verified && (
          <Tooltip>
            <TooltipTrigger asChild><BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" /></TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Creator Verified</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex items-center gap-1.5 mb-2 flex-wrap justify-center">
        {c.branch && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${branchStyle}`}>{c.branch}</span>}
        {c.status && <span className="text-[10px] text-gray-500 font-medium">{c.status}</span>}
      </div>
      <p className="text-sm font-bold text-[#000741] mb-2">
        {formatFollowerCount(c.follower_count)}
        <span className="text-xs font-normal text-gray-400 ml-1">followers</span>
      </p>
      {platforms.length > 0 && (
        <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-500 transition-colors">
          {platforms.map((p) => <span key={p}>{PLATFORM_ICON[p] ?? null}</span>)}
        </div>
      )}
    </Link>
  );
}

export default function Creators() {
  const [allCreators, setAllCreators] = useState<ShowcaseCreator[]>([]);
  const [inView, setInView] = useState(false);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch ALL members from Military Creator Network (large limit, no shuffle for directory page)
    fetchShowcaseByDirectoryName("Military Creator Network", 500).then((data) => setAllCreators(data));
  }, []);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, branchFilter, platformFilter]);

  const filtered = useMemo(() => {
    let list = allCreators;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.display_name.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q)
      );
    }
    if (branchFilter) {
      list = list.filter((c) => c.branch === branchFilter);
    }
    if (platformFilter) {
      list = list.filter((c) => (c.platforms ?? []).includes(platformFilter));
    }
    return list;
  }, [allCreators, search, branchFilter, platformFilter]);

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
    <div className="min-h-screen bg-white text-[#000741]">
      {/* Top bar */}
      <header className="h-14 flex items-center justify-between px-4 md:px-8 border-b border-gray-200 bg-white sticky top-0 z-40">
        <Link to="/">
          <span className="font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <span className="text-[#000741]">recurrent</span>
            <span className="text-[#6C5CE7] font-extrabold">X</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-[#6C5CE7]">Sign In</Link>
          <Link to="/signup">
            <Button size="sm" className="rounded-lg bg-[#ED1C24] hover:bg-[#ED1C24]/90 text-white px-5 font-semibold">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      <main className="px-4 md:px-8 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#6C5CE7] mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>

          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#000741] mb-3">
              Military Creator Directory
            </h1>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              The #1 network for verified military and veteran content creators. Discover authentic voices from those who served.
            </p>
          </div>

          {/* Search + Filters */}
          <div className="mb-8 space-y-4">
            {/* Search bar */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or handle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-10 rounded-xl border-gray-200"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Branch filter chips */}
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <span className="text-xs font-medium text-gray-500 mr-1">Branch:</span>
              {BRANCHES.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBranchFilter(branchFilter === b ? null : b)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    branchFilter === b
                      ? "bg-[#6C5CE7] text-white border-[#6C5CE7]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#6C5CE7]/30 hover:text-[#6C5CE7]"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            {/* Platform filter chips */}
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <span className="text-xs font-medium text-gray-500 mr-1">Platform:</span>
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatformFilter(platformFilter === p ? null : p)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                    platformFilter === p
                      ? "bg-[#6C5CE7] text-white border-[#6C5CE7]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#6C5CE7]/30 hover:text-[#6C5CE7]"
                  }`}
                >
                  {PLATFORM_ICON[p]}
                  {PLATFORM_LABEL[p] ?? p}
                </button>
              ))}
            </div>

            {/* Active filter summary */}
            {hasFilters && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <span>{filtered.length} creator{filtered.length !== 1 ? "s" : ""} found</span>
                <button type="button" onClick={clearFilters} className="text-[#6C5CE7] hover:underline font-medium">
                  Clear filters
                </button>
              </div>
            )}
          </div>

          <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {paged.map((c, i) => (
              <CreatorCard key={c.id} creator={c} inView={inView} index={i} />
            ))}
          </div>

          {paged.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg font-medium mb-2">No creators found</p>
              <p className="text-sm">
                {hasFilters
                  ? "Try adjusting your filters or search terms."
                  : "Check back soon — we're onboarding verified military creators."}
              </p>
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="text-center mt-10">
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border-[#6C5CE7] text-[#6C5CE7] hover:bg-[#6C5CE7]/10 px-8"
              >
                Load More ({filtered.length - paged.length} remaining)
              </Button>
            </div>
          )}
        </div>
      </main>

      <footer className="px-4 md:px-8 py-8 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-sm text-gray-500">&copy; 2026 RecurrentX. All rights reserved.</p>
          <Link to="/" className="text-sm text-[#6C5CE7] hover:underline">Home</Link>
        </div>
      </footer>
    </div>
  );
}
