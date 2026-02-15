import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  Eye,
  EyeOff,
  Loader2,
  ArrowUpDown,
  RefreshCw,
  ImageDown,
  LayoutGrid,
  List,
  Instagram,
  Youtube,
  Twitter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchAllDirectoryCreators,
  toggleDirectoryApproval,
  removeFromDirectory,
  formatFollowerCount,
  getInitials,
  type ShowcaseCreator,
} from "@/lib/featured-creators";
import { searchCreators } from "@/lib/influencers-club";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BRANCH_STYLES: Record<string, string> = {
  Army: "bg-green-800/10 text-green-800",
  Navy: "bg-blue-900/10 text-blue-900",
  "Air Force": "bg-sky-600/10 text-sky-700",
  Marines: "bg-red-700/10 text-red-700",
  "Coast Guard": "bg-orange-600/10 text-orange-700",
  "Space Force": "bg-indigo-600/10 text-indigo-700",
};

type SortField = "sort_order" | "followers" | "engagement" | "added";
type ViewMode = "table" | "cards";

const VIEW_STORAGE_KEY = "pd_directory_view";

const TikTokIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.39a8.16 8.16 0 003.76.92V6.86a4.85 4.85 0 01-.01-.17z" />
  </svg>
);

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-3.5 w-3.5" />,
  tiktok: <TikTokIcon />,
  youtube: <Youtube className="h-3.5 w-3.5" />,
  twitter: <Twitter className="h-3.5 w-3.5" />,
};

const BrandDirectory = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [creators, setCreators] = useState<ShowcaseCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("sort_order");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [backfillProgress, setBackfillProgress] = useState<{ current: number; total: number } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode) || "table"; } catch { return "table"; }
  });

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    try { localStorage.setItem(VIEW_STORAGE_KEY, mode); } catch { /* quota */ }
  };

  const loadCreators = async () => {
    setLoading(true);
    const data = await fetchAllDirectoryCreators();
    setCreators(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCreators();
  }, []);

  const stats = useMemo(() => {
    const total = creators.length;
    const active = creators.filter((c) => c.approved).length;
    const hidden = total - active;
    return { total, active, hidden };
  }, [creators]);

  const filtered = useMemo(() => {
    let list = [...creators];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.display_name.toLowerCase().includes(q) ||
          c.handle.toLowerCase().includes(q) ||
          (c.bio ?? "").toLowerCase().includes(q)
      );
    }

    if (branchFilter !== "all") {
      list = list.filter((c) => c.branch === branchFilter);
    }

    switch (sortField) {
      case "followers":
        list.sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0));
        break;
      case "engagement":
        list.sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0));
        break;
      case "added":
        list.sort((a, b) => {
          const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bDate - aDate;
        });
        break;
      default:
        list.sort((a, b) => a.sort_order - b.sort_order);
    }

    return list;
  }, [creators, searchQuery, branchFilter, sortField]);

  const handleToggleApproved = async (id: string, currentApproved: boolean) => {
    setTogglingIds((prev) => new Set(prev).add(id));
    const { error } = await toggleDirectoryApproval(id, !currentApproved);
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (error) {
      toast.error(`Failed to update: ${error}`);
    } else {
      setCreators((prev) =>
        prev.map((c) => (c.id === id ? { ...c, approved: !currentApproved } : c))
      );
      toast.success(!currentApproved ? "Creator is now visible publicly" : "Creator hidden from public directory");
    }
  };

  const handleRemove = async (id: string, name: string) => {
    const { error } = await removeFromDirectory(id);
    if (error) {
      toast.error(`Failed to remove: ${error}`);
    } else {
      setCreators((prev) =>
        prev.map((c) => (c.id === id ? { ...c, approved: false } : c))
      );
      toast.success(`${name} removed from public directory`);
    }
  };

  const branches = useMemo(() => {
    const set = new Set(creators.map((c) => c.branch).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [creators]);

  const handleBackfillAvatars = async () => {
    const missing = creators.filter((c) => !c.avatar_url && !c.ic_avatar_url);
    if (missing.length === 0) {
      toast.info("All creators already have avatars");
      return;
    }
    setBackfillProgress({ current: 0, total: missing.length });
    let updated = 0;
    let failed = 0;
    const BATCH_SIZE = 5;

    const fetchOne = async (creator: ShowcaseCreator) => {
      const result = await searchCreators(creator.handle, {
        platform: creator.platform || "instagram",
        page: 1,
      });
      const match = result.creators[0];
      if (match?.avatar && !match.avatar.includes("ui-avatars.com")) {
        const { error } = await supabase
          .from("featured_creators")
          .update({ ic_avatar_url: match.avatar })
          .eq("id", creator.id);
        if (!error) {
          setCreators((prev) =>
            prev.map((c) => (c.id === creator.id ? { ...c, ic_avatar_url: match.avatar } : c))
          );
          return true;
        }
      }
      return false;
    };

    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(fetchOne));
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) updated++;
        else if (r.status === "rejected") failed++;
      }
      setBackfillProgress({ current: Math.min(i + BATCH_SIZE, missing.length), total: missing.length });
    }

    setBackfillProgress(null);
    if (failed > 0) {
      toast.success(`Updated ${updated} avatar${updated !== 1 ? "s" : ""}, ${failed} failed`);
    } else {
      toast.success(`Updated ${updated} avatar${updated !== 1 ? "s" : ""}`);
    }
  };

  return (
    <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">
            Creator Directory
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your public creator directory. Toggle visibility to control who appears on the homepage and /creators page.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-white dark:bg-[#1A1D27] border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total in Directory</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white dark:bg-[#1A1D27] border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Eye className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active (Public)</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white dark:bg-[#1A1D27] border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <EyeOff className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.hidden}</p>
                <p className="text-xs text-muted-foreground">Hidden</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, handle, or bio..."
              className="pl-9 rounded-lg bg-background dark:bg-[#1A1D27]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[160px] rounded-lg bg-background dark:bg-[#1A1D27]">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
            <SelectTrigger className="w-[160px] rounded-lg bg-background dark:bg-[#1A1D27]">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sort_order">Sort Order</SelectItem>
              <SelectItem value="followers">Followers</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
              <SelectItem value="added">Date Added</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={loadCreators}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={handleBackfillAvatars}
              disabled={!!backfillProgress}
            >
              {backfillProgress ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Fetching avatars... {backfillProgress.current} of {backfillProgress.total} complete
                </>
              ) : (
                <>
                  <ImageDown className="h-4 w-4 mr-1.5" />
                  Fetch Missing Avatars
                </>
              )}
            </Button>
          )}
          {/* View toggle */}
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ml-auto">
            <button
              type="button"
              onClick={() => handleViewChange("table")}
              className={cn(
                "p-1.5 transition-colors",
                viewMode === "table"
                  ? "bg-pd-blue text-white"
                  : "bg-background text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleViewChange("cards")}
              className={cn(
                "p-1.5 transition-colors",
                viewMode === "cards"
                  ? "bg-pd-blue text-white"
                  : "bg-background text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <Button
            size="sm"
            className="rounded-lg bg-pd-blue hover:bg-pd-darkblue text-white"
            onClick={() => navigate("/brand/discover")}
          >
            Add from Discovery
          </Button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading directory...</span>
          </div>
        )}

        {/* Card View */}
        {!loading && viewMode === "cards" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((creator) => {
                const imgSrc = creator.avatar_url || creator.ic_avatar_url || null;
                const branchStyle = BRANCH_STYLES[creator.branch ?? ""] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
                const isToggling = togglingIds.has(creator.id);
                const platforms = creator.platforms ?? [];

                return (
                  <Card
                    key={creator.id}
                    className={cn(
                      "p-5 bg-white dark:bg-[#1A1D27] border-border flex flex-col items-center text-center",
                      !creator.approved && "opacity-60"
                    )}
                  >
                    {/* Avatar */}
                    <div className="w-[72px] h-[72px] rounded-full overflow-hidden mb-3 border border-gray-200 dark:border-gray-700">
                      {imgSrc ? (
                        <img src={imgSrc} alt={creator.display_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#0064B1] to-[#053877] flex items-center justify-center text-white font-bold text-lg">
                          {getInitials(creator.display_name, creator.handle)}
                        </div>
                      )}
                    </div>

                    {/* Name + handle */}
                    <h3 className="font-semibold text-[#000741] dark:text-white text-sm truncate max-w-full">
                      {creator.display_name}
                    </h3>
                    <p className="text-xs text-[#0064B1] mb-2 truncate max-w-full">@{creator.handle}</p>

                    {/* Branch badge */}
                    {creator.branch && (
                      <Badge variant="outline" className={cn("text-[10px] font-semibold border-0 mb-2", branchStyle)}>
                        {creator.branch}
                      </Badge>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-xs mb-3">
                      <div>
                        <span className="font-bold text-[#000741] dark:text-white">{formatFollowerCount(creator.follower_count)}</span>
                        <span className="text-muted-foreground ml-1">followers</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#000741] dark:text-white">
                          {typeof creator.engagement_rate === "number" ? `${creator.engagement_rate.toFixed(1)}%` : "—"}
                        </span>
                        <span className="text-muted-foreground ml-1">eng.</span>
                      </div>
                    </div>

                    {/* Platform icons */}
                    {platforms.length > 0 && (
                      <div className="flex items-center gap-2 text-gray-400 mb-4">
                        {platforms.map((p) => (
                          <span key={p}>{PLATFORM_ICON[p] ?? null}</span>
                        ))}
                      </div>
                    )}

                    {/* Public toggle + Remove */}
                    <div className="flex items-center gap-3 mt-auto pt-2 border-t border-gray-100 dark:border-gray-800 w-full justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-medium">Public</span>
                        {isToggling ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Switch
                            checked={creator.approved}
                            onCheckedChange={() => handleToggleApproved(creator.id, creator.approved)}
                          />
                        )}
                      </div>
                      {creator.approved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg h-7 px-2"
                          onClick={() => handleRemove(creator.id, creator.display_name)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery || branchFilter !== "all"
                  ? "No creators match your filters."
                  : "No creators in the directory yet. Add creators from Discovery."}
              </div>
            )}
          </>
        )}

        {/* Table View */}
        {!loading && viewMode === "table" && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                  <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">Creator</th>
                  <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">Branch</th>
                  <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">Followers</th>
                  <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">Engagement</th>
                  <th className="text-center p-3 font-medium text-gray-500 dark:text-gray-400">Public</th>
                  <th className="text-center p-3 font-medium text-gray-500 dark:text-gray-400 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((creator) => {
                  const imgSrc = creator.avatar_url || creator.ic_avatar_url || null;
                  const branchStyle = BRANCH_STYLES[creator.branch ?? ""] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
                  const isToggling = togglingIds.has(creator.id);

                  return (
                    <tr
                      key={creator.id}
                      className={cn(
                        "border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors",
                        !creator.approved && "opacity-60"
                      )}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                            {imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={creator.display_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#0064B1] to-[#053877] flex items-center justify-center text-white font-bold text-xs">
                                {getInitials(creator.display_name, creator.handle)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#000741] dark:text-white truncate">
                              {creator.display_name}
                            </p>
                            <p className="text-xs text-[#0064B1] truncate">@{creator.handle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {creator.branch ? (
                          <Badge variant="outline" className={cn("text-[10px] font-semibold border-0", branchStyle)}>
                            {creator.branch}
                          </Badge>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-semibold text-[#000741] dark:text-white tabular-nums">
                        {formatFollowerCount(creator.follower_count)}
                      </td>
                      <td className="p-3 text-right font-semibold text-[#000741] dark:text-white tabular-nums">
                        {typeof creator.engagement_rate === "number" ? `${creator.engagement_rate.toFixed(2)}%` : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center">
                          {isToggling ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Switch
                              checked={creator.approved}
                              onCheckedChange={() => handleToggleApproved(creator.id, creator.approved)}
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {creator.approved && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                            onClick={() => handleRemove(creator.id, creator.display_name)}
                          >
                            Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery || branchFilter !== "all"
                  ? "No creators match your filters."
                  : "No creators in the directory yet. Add creators from Discovery."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandDirectory;
