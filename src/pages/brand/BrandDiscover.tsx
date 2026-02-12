import { useState, useRef, useCallback } from "react";
import { Search, ListPlus, Loader2, Plus, MapPin, ExternalLink, Mail, BadgeCheck } from "lucide-react";
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
import { searchCreators, type CreatorCard } from "@/lib/influencers-club";
import { upsertCreator } from "@/lib/creators-db";
import CreatorProfileModal from "@/components/CreatorProfileModal";
import CreateListModal from "@/components/CreateListModal";
import BulkActionBar from "@/components/BulkActionBar";
import { useLists } from "@/contexts/ListContext";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BRANCHES = ["Army", "Navy", "Air Force", "Marines", "Coast Guard"] as const;

const PLATFORM_ICON_STYLES: Record<string, string> = {
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500 text-white",
  tiktok: "bg-black dark:bg-white text-white dark:text-black",
  youtube: "bg-red-600 text-white",
  twitter: "bg-sky-500 text-white",
  facebook: "bg-blue-600 text-white",
  linkedin: "bg-blue-700 text-white",
  podcast: "bg-violet-600 text-white",
  twitch: "bg-purple-600 text-white",
};
function PlatformIcon({ platform }: { platform: string }) {
  const plat = platform.toLowerCase();
  const icons: Record<string, string> = {
    instagram: "📷", tiktok: "♪", youtube: "▶", twitter: "𝕏",
    facebook: "f", linkedin: "in", twitch: "◉", podcast: "🎙",
  };
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[11px] text-gray-600 dark:text-gray-300"
      title={platform}
      aria-label={platform}
    >
      {icons[plat] ?? plat[0]?.toUpperCase() ?? "?"}
    </span>
  );
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
  const [sortBy, setSortBy] = useState<string>("relevancy");
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
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const { lists, addCreatorToList, createList, isCreatorInList } = useLists();

  const runSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) {
      setApiResults(null);
      setApiLoading(false);
      return;
    }
    setApiLoading(true);
    setCurrentPage(1);
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
      sort_by: sortBy as "relevancy" | "followers" | "engagement",
      location: locationFilter.trim() || undefined,
      gender: gender !== "any" ? gender : undefined,
      language: language !== "any" ? language : undefined,
    };
    searchCreators(q, options)
      .then((result) => {
        if (searchQueryRef.current.trim() === q) setApiResults(result);
      })
      .catch((err) => {
        if (searchQueryRef.current.trim() === q) setApiResults(null);
    setGender("any");
    setLanguage("any");
    setKeywordsInBio("");
        console.warn("[BrandDiscover] API search failed:", err);
      })
      .finally(() => {
        if (searchQueryRef.current.trim() === q) setApiLoading(false);
      });
  }, [searchQuery, platform, followersRange, engagementMin, sortBy, selectedBranches]);

  const loadMore = useCallback(() => {
    const q = searchQuery.trim();
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
      sort_by: sortBy as "relevancy" | "followers" | "engagement",
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
    setSortBy("relevancy");
    setSelectedBranches(new Set());
    setApiResults(null);
    setGender("any");
    setLanguage("any");
    setKeywordsInBio("");
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
              </div>

              {creators.length > 0 ? (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {creators.map((creator) => {
                    const nicheTags = [
                      ...(creator.hashtags ?? []).map((t) => (t.startsWith("#") ? t : `#${t}`)),
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
                    const showLinksBadge = linkCount > 0;
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
                          <img
                            src={creator.avatar}
                            alt={creator.name}
                            className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-white dark:border-slate-700 shadow-md"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-base text-[#000741] dark:text-white truncate flex items-center gap-1.5">
                              {creator.name}
                              {creator.isVerified && (
                                <BadgeCheck className="h-4 w-4 shrink-0 text-[#0064B1]" aria-label="Verified" />
                              )}
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
                        {socialPlatforms.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            {socialPlatforms.slice(0, 6).map((platform) => (
                              <PlatformIcon key={platform} platform={platform} />
                            ))}
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
                            <p className="text-lg font-bold text-[#000741] dark:text-white tabular-nums">
                              {showLinksBadge ? `🔗 ${linkCount}` : "—"}
                            </p>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Links</p>
                          </div>
                        </div>
                        {showLinksBadge && (
                          <p className="text-xs text-gray-400 dark:text-muted-foreground mb-1">
                            🔗 {linkCount} link{linkCount !== 1 ? "s" : ""}
                          </p>
                        )}
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
