import { useState, useEffect, useMemo } from "react";
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

const BrandDirectory = () => {
  const navigate = useNavigate();
  const [creators, setCreators] = useState<ShowcaseCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("sort_order");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

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
          <Button
            size="sm"
            className="rounded-lg bg-pd-blue hover:bg-pd-darkblue text-white ml-auto"
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

        {/* Table */}
        {!loading && (
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
