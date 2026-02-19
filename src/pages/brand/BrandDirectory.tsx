import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Eye,
  EyeOff,
  Loader2,
  ArrowUpDown,
  RefreshCw,
  LayoutGrid,
  List,
  Instagram,
  Youtube,
  Twitter,
  Plus,
  ArrowLeft,
  FolderOpen,
  Trash2,
  Upload,
  Star,
  Pencil,
  ExternalLink,
} from "lucide-react";
import { cn, safeImageUrl, creatorAvatarUrl } from "@/lib/utils";
import {
  fetchDirectoriesWithCounts,
  fetchDirectoryMembers,
  createDirectory,
  deleteDirectory,
  toggleMemberApproval,
  removeMember,
  promoteListToDirectory,
  type Directory,
  type DirectoryMember,
} from "@/lib/directories";
import { formatFollowerCount, getInitials, extractAvatarFromEnrichment } from "@/lib/featured-creators";
import { useAuth } from "@/contexts/AuthContext";
import { useLists } from "@/contexts/ListContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDemoMode } from "@/hooks/useDemoMode";
import CreatorProfileModal from "@/components/CreatorProfileModal";
import { type CreatorCard, enrichCreatorProfile } from "@/lib/influencers-club";
import { uploadCreatorImage } from "@/lib/directories";

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
const VIEW_KEY = "pd_directory_view";

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

/** Map a DirectoryMember to the CreatorCard shape the profile drawer expects. */
function memberToCreatorCard(m: DirectoryMember): CreatorCard {
  return {
    id: m.id,
    name: m.creator_name ?? m.creator_handle,
    username: m.creator_handle,
    avatar: creatorAvatarUrl(m.ic_avatar_url, m.avatar_url, (m as Record<string, unknown>).profile_image_url as string) || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.creator_name ?? m.creator_handle)}&background=random&size=128`,
    followers: m.follower_count ?? 0,
    engagementRate: m.engagement_rate ?? 0,
    platforms: m.platforms ?? ["instagram"],
    bio: m.bio ?? "",
    location: undefined,
    category: m.category ?? undefined,
    socialPlatforms: m.platforms ?? ["instagram"],
    branch: m.branch ?? undefined,
  };
}

// ─── Main Component ─────────────────────────────────────────

const BrandDirectory = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, user, effectiveUserId } = useAuth();
  const { guardAction } = useDemoMode();
  const { lists } = useLists();

  // Directory-level state
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [dirsLoading, setDirsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Detail-level state
  const [selectedDir, setSelectedDir] = useState<Directory | null>(null);
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("sort_order");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(VIEW_KEY) as ViewMode) || "table"; } catch { return "table"; }
  });
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteListId, setPromoteListId] = useState("");
  const [promoting, setPromoting] = useState(false);

  // Refresh photos state
  const [refreshingPhotos, setRefreshingPhotos] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number } | null>(null);

  // Edit modal state (avg_views, avg_likes)
  const [editMember, setEditMember] = useState<DirectoryMember | null>(null);
  const [editAvgViews, setEditAvgViews] = useState("");
  const [editAvgLikes, setEditAvgLikes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Creator profile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCreator, setDrawerCreator] = useState<CreatorCard | null>(null);
  const [drawerMemberId, setDrawerMemberId] = useState<string | null>(null);

  const openCreatorDrawer = (m: DirectoryMember) => {
    setDrawerCreator(memberToCreatorCard(m));
    setDrawerMemberId(m.id);
    setDrawerOpen(true);
  };

  const handleRemoveFromDirectory = () => {
    if (!drawerMemberId || !drawerCreator) return;
    handleRemove(drawerMemberId, drawerCreator.name);
    setDrawerOpen(false);
  };

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    try { localStorage.setItem(VIEW_KEY, mode); } catch { /* quota */ }
  };

  // ─── Load directories ──────────────────────────────────────

  const loadDirectories = useCallback(async () => {
    setDirsLoading(true);
    const data = await fetchDirectoriesWithCounts();
    setDirectories(data);
    setDirsLoading(false);
  }, []);

  useEffect(() => { loadDirectories(); }, [loadDirectories]);

  // ─── Load members when directory selected ──────────────────

  const loadMembers = useCallback(async (dirId: string) => {
    setMembersLoading(true);
    const data = await fetchDirectoryMembers(dirId);
    setMembers(data);
    setMembersLoading(false);
  }, []);

  const openDirectory = (dir: Directory) => {
    setSelectedDir(dir);
    setSearchQuery("");
    setBranchFilter("all");
    loadMembers(dir.id);
  };

  const goBack = () => {
    setSelectedDir(null);
    setMembers([]);
    loadDirectories();
  };

  // ─── Create directory ──────────────────────────────────────

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { directory, error } = await createDirectory({
      name: newName.trim(),
      description: newDesc.trim() || undefined,
      created_by: effectiveUserId,
    });
    setCreating(false);
    if (error) {
      toast.error(`Failed to create directory: ${error}`);
    } else {
      toast.success(`Created "${directory!.name}"`);
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      loadDirectories();
    }
  };

  // ─── Delete directory ──────────────────────────────────────

  const handleDeleteDir = async (dir: Directory) => {
    if (!confirm(`Delete "${dir.name}" and all its members? This cannot be undone.`)) return;
    const { error } = await deleteDirectory(dir.id);
    if (error) toast.error(`Failed to delete: ${error}`);
    else {
      toast.success(`Deleted "${dir.name}"`);
      loadDirectories();
    }
  };

  // ─── Member actions ────────────────────────────────────────

  const handleToggleApproved = async (id: string, currentApproved: boolean) => {
    setTogglingIds((prev) => new Set(prev).add(id));
    const { error } = await toggleMemberApproval(id, !currentApproved);
    setTogglingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    if (error) {
      toast.error(`Failed to update: ${error}`);
    } else {
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, approved: !currentApproved } : m)));
      toast.success(!currentApproved ? "Creator is now visible publicly" : "Creator hidden from public directory");
    }
  };

  const handleRemove = async (id: string, name: string) => {
    const { error } = await removeMember(id);
    if (error) {
      toast.error(`Failed to remove: ${error}`);
    } else {
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, approved: false } : m)));
      toast.success(`${name} removed from public directory`);
    }
  };

  // ─── Promote from list ─────────────────────────────────────

  const handlePromote = async () => {
    if (!promoteListId || !selectedDir) return;
    const list = lists.find((l) => l.id === promoteListId);
    if (!list || list.creators.length === 0) {
      toast.error("Selected list has no creators");
      return;
    }
    setPromoting(true);
    const mapped = list.creators.map((c) => ({
      handle: c.username || c.id,
      display_name: c.name,
      platform: c.platform || "instagram",
      avatar_url: c.avatar || null,
      ic_avatar_url: c.avatar || null,
      follower_count: c.followers ?? null,
      engagement_rate: c.engagementRate ?? null,
      bio: c.bio || null,
      branch: c.branch || null,
      platforms: c.platforms || [],
      category: c.category || null,
    }));
    const { added, failed } = await promoteListToDirectory(selectedDir.id, mapped, effectiveUserId);
    setPromoting(false);
    setPromoteOpen(false);
    setPromoteListId("");
    toast.success(`Added ${added} creator${added !== 1 ? "s" : ""}${failed > 0 ? `, ${failed} failed` : ""}`);
    loadMembers(selectedDir.id);
  };

  // ─── Featured on Homepage toggle ────────────────────────────

  const handleToggleFeatured = async (member: DirectoryMember) => {
    if (guardAction("update")) return;
    const newValue = !member.featured_homepage;
    if (newValue) {
      // Check max 3
      const currentFeatured = members.filter((m) => m.featured_homepage && m.id !== member.id).length;
      if (currentFeatured >= 3) {
        toast.error("Maximum 3 featured creators. Remove one first.");
        return;
      }
    }
    const { error } = await supabase
      .from("directory_members")
      .update({ featured_homepage: newValue })
      .eq("id", member.id);
    if (error) {
      toast.error(`Failed to update: ${error.message}`);
    } else {
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, featured_homepage: newValue } : m)));
      toast.success(newValue ? `${member.creator_name} featured on homepage` : `${member.creator_name} removed from homepage`);
    }
  };

  // ─── Edit avg_views / avg_likes ────────────────────────────

  const openEditModal = (member: DirectoryMember) => {
    setEditMember(member);
    setEditAvgViews(member.avg_views ?? "");
    setEditAvgLikes(member.avg_likes ?? "");
  };

  const handleSaveEdit = async () => {
    if (guardAction("update")) return;
    if (!editMember) return;
    setEditSaving(true);
    const { error } = await supabase
      .from("directory_members")
      .update({ avg_views: editAvgViews || null, avg_likes: editAvgLikes || null })
      .eq("id", editMember.id);
    setEditSaving(false);
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
    } else {
      setMembers((prev) => prev.map((m) =>
        m.id === editMember.id ? { ...m, avg_views: editAvgViews || null, avg_likes: editAvgLikes || null } : m
      ));
      toast.success("Stats updated");
      setEditMember(null);
    }
  };

  // ─── Refresh photos for creators missing avatars ──────────

  const handleRefreshPhotos = async () => {
    const needsPhoto = members.filter((m) => {
      const url = m.avatar_url;
      return !url || url.includes("ui-avatars.com");
    });
    if (needsPhoto.length === 0) {
      toast.info("All creators already have photos");
      return;
    }

    setRefreshingPhotos(true);
    setRefreshProgress({ current: 0, total: needsPhoto.length });
    let updated = 0;

    for (let i = 0; i < needsPhoto.length; i++) {
      const m = needsPhoto[i];
      setRefreshProgress({ current: i + 1, total: needsPhoto.length });

      try {
        const data = await enrichCreatorProfile(m.creator_handle, undefined, m.platform || "instagram");
        if (!data) continue;

        const avatarUrl = extractAvatarFromEnrichment(data);
        if (!avatarUrl) continue;

        // Upload to Supabase storage for a permanent URL
        let permanentUrl = avatarUrl;
        const uploaded = await uploadCreatorImage(avatarUrl, m.creator_handle);
        if (uploaded) permanentUrl = uploaded;

        const { error } = await supabase
          .from("directory_members")
          .update({ avatar_url: permanentUrl, ic_avatar_url: avatarUrl })
          .eq("id", m.id);

        if (!error) {
          updated++;
          setMembers((prev) =>
            prev.map((mem) =>
              mem.id === m.id ? { ...mem, avatar_url: permanentUrl, ic_avatar_url: avatarUrl } : mem
            )
          );
        } else {
          console.warn("[RefreshPhotos] Update failed for", m.creator_handle, error.message);
        }
      } catch (err) {
        console.warn("[RefreshPhotos] Enrichment failed for", m.creator_handle, err);
      }
    }

    setRefreshingPhotos(false);
    setRefreshProgress(null);
    toast.success(`Photos updated for ${updated} creator${updated !== 1 ? "s" : ""}`);
  };

  // ─── Filtering & sorting ───────────────────────────────────

  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.approved).length;
    return { total, active, hidden: total - active };
  }, [members]);

  const branches = useMemo(() => {
    const set = new Set(members.map((m) => m.branch).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [members]);

  const filtered = useMemo(() => {
    let list = [...members];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) =>
        (m.creator_name ?? "").toLowerCase().includes(q) ||
        m.creator_handle.toLowerCase().includes(q) ||
        (m.bio ?? "").toLowerCase().includes(q)
      );
    }
    if (branchFilter !== "all") list = list.filter((m) => m.branch === branchFilter);
    switch (sortField) {
      case "followers": list.sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0)); break;
      case "engagement": list.sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0)); break;
      case "added": list.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime()); break;
      default: list.sort((a, b) => a.sort_order - b.sort_order);
    }
    return list;
  }, [members, searchQuery, branchFilter, sortField]);

  // ─── RENDER: Directory list ────────────────────────────────

  if (!selectedDir) {
    return (
      <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">Directories</h1>
              <p className="text-gray-500 dark:text-gray-400">
                Manage public-facing curated collections of creators.
              </p>
            </div>
            <Button
              className="rounded-lg bg-pd-blue hover:bg-pd-darkblue text-white"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Directory
            </Button>
          </div>

          {dirsLoading && (
            <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading directories...</span>
            </div>
          )}

          {!dirsLoading && directories.length === 0 && (
            <Card className="p-12 text-center bg-white dark:bg-[#1A1D27] border-border">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No directories yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Create your first directory to start organizing creators into public collections.
              </p>
              <Button className="bg-pd-blue hover:bg-pd-darkblue text-white" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Directory
              </Button>
            </Card>
          )}

          {!dirsLoading && directories.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {directories.map((dir) => (
                <Card
                  key={dir.id}
                  className="bg-white dark:bg-[#1A1D27] border-border hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => openDirectory(dir)}
                >
                  {dir.cover_image_url && (
                    <div className="h-32 rounded-t-lg overflow-hidden">
                      <img src={dir.cover_image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground text-lg truncate group-hover:text-pd-blue transition-colors">
                          {dir.name}
                        </h3>
                        {dir.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{dir.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); handleDeleteDir(dir); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span className="font-medium text-foreground">{dir.member_count ?? 0}</span>
                        <span>creators</span>
                      </div>
                      {dir.is_public ? (
                        <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-700 dark:text-purple-400">
                          <Eye className="h-3 w-3 mr-1" /> Public
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-500">
                          <EyeOff className="h-3 w-3 mr-1" /> Private
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Create Directory Modal */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Directory</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="dir-name">Name</Label>
                  <Input
                    id="dir-name"
                    placeholder='e.g., "MIC 2026 Speakers"'
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="dir-desc">Description (optional)</Label>
                  <Textarea
                    id="dir-desc"
                    placeholder="A brief description of this directory..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button
                  className="bg-pd-blue hover:bg-pd-darkblue text-white"
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // ─── RENDER: Directory detail ──────────────────────────────

  return (
    <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Directories
          </Button>
          <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">{selectedDir.name}</h1>
          {selectedDir.description && (
            <p className="text-gray-500 dark:text-gray-400">{selectedDir.description}</p>
          )}
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
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white dark:bg-[#1A1D27] border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Eye className="h-5 w-5 text-purple-600" />
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

        {/* Search + Filters + Actions */}
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
              {branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
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
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => loadMembers(selectedDir.id)} disabled={membersLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", membersLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg text-gray-600 dark:text-gray-400" onClick={handleRefreshPhotos} disabled={refreshingPhotos || membersLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", refreshingPhotos && "animate-spin")} />
            {refreshProgress ? `Refreshing ${refreshProgress.current} of ${refreshProgress.total}...` : "Refresh Photos"}
          </Button>
          {/* View toggle */}
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ml-auto">
            <button type="button" onClick={() => handleViewChange("table")} className={cn("p-1.5 transition-colors", viewMode === "table" ? "bg-pd-blue text-white" : "bg-background text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800")} title="Table view">
              <List className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => handleViewChange("cards")} className={cn("p-1.5 transition-colors", viewMode === "cards" ? "bg-pd-blue text-white" : "bg-background text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800")} title="Card view">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <a href="/brand/discover" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="rounded-lg border-[#6C5CE7] text-[#6C5CE7] hover:bg-purple-50 dark:hover:bg-purple-950/30">
              <Search className="h-4 w-4 mr-1.5" />
              Discover Creators
            </Button>
          </a>
          <Button size="sm" className="rounded-lg bg-pd-blue hover:bg-pd-darkblue text-white" onClick={() => navigate("/brand/discover")}>
            Add from Discovery
          </Button>
          {lists.length > 0 && (
            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setPromoteOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              Promote from List
            </Button>
          )}
        </div>

        {/* Loading */}
        {membersLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading creators...</span>
          </div>
        )}

        {/* Card View */}
        {!membersLoading && viewMode === "cards" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((m) => {
                const imgSrc = creatorAvatarUrl(m.ic_avatar_url, m.avatar_url, (m as Record<string, unknown>).profile_image_url as string);
                const branchStyle = BRANCH_STYLES[m.branch ?? ""] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
                const isToggling = togglingIds.has(m.id);
                const platforms = m.platforms ?? [];
                return (
                  <Card key={m.id} className={cn("p-5 bg-white dark:bg-[#1A1D27] border-border flex flex-col items-center text-center cursor-pointer hover:shadow-lg transition-shadow", !m.approved && "opacity-60")} onClick={() => openCreatorDrawer(m)}>
                    <div className="w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-full overflow-hidden mb-3 border-[3px] border-white dark:border-gray-700 ring-1 ring-gray-200 dark:ring-gray-600 relative shadow-sm">
                      {imgSrc && (
                        <img
                          src={imgSrc}
                          alt={m.creator_name ?? ""}
                          className="w-full h-full object-cover absolute inset-0"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      <div className="w-full h-full bg-gradient-to-br from-[#6C5CE7] to-[#5B4BD1] flex items-center justify-center text-white font-bold text-lg">
                        {getInitials(m.creator_name ?? "", m.creator_handle)}
                      </div>
                    </div>
                    <h3 className="font-semibold text-[#000741] dark:text-white text-sm truncate max-w-full">{m.creator_name}</h3>
                    <p className="text-xs text-[#6C5CE7] mb-2 truncate max-w-full">@{m.creator_handle}</p>
                    {m.branch && <Badge variant="outline" className={cn("text-[10px] font-semibold border-0 mb-2", branchStyle)}>{m.branch}</Badge>}
                    <div className="flex items-center gap-4 text-xs mb-3">
                      <div><span className="font-bold text-[#000741] dark:text-white">{formatFollowerCount(m.follower_count)}</span><span className="text-muted-foreground ml-1">followers</span></div>
                      <div><span className="font-bold text-[#000741] dark:text-white">{typeof m.engagement_rate === "number" ? `${m.engagement_rate.toFixed(1)}%` : "—"}</span><span className="text-muted-foreground ml-1">eng.</span></div>
                    </div>
                    {platforms.length > 0 && <div className="flex items-center gap-2 text-gray-400 mb-4">{platforms.map((p) => <span key={p}>{PLATFORM_ICON[p] ?? null}</span>)}</div>}
                    <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-800 w-full justify-center flex-wrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-medium">Public</span>
                        {isToggling ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Switch checked={m.approved} onCheckedChange={() => handleToggleApproved(m.id, m.approved)} />}
                      </div>
                      <button
                        type="button"
                        title={m.featured_homepage ? "Remove from homepage" : "Feature on homepage"}
                        className={cn("p-1 rounded transition-colors", m.featured_homepage ? "text-yellow-500 hover:text-yellow-600" : "text-gray-300 hover:text-yellow-400")}
                        onClick={() => handleToggleFeatured(m)}
                      >
                        <Star className={cn("h-4 w-4", m.featured_homepage && "fill-current")} />
                      </button>
                      <button
                        type="button"
                        title="Edit stats"
                        className="p-1 rounded text-gray-400 hover:text-pd-blue transition-colors"
                        onClick={() => openEditModal(m)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {m.approved && (
                        <Button variant="ghost" size="sm" className="text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg h-7 px-2" onClick={() => handleRemove(m.id, m.creator_name ?? "")}>
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
                {searchQuery || branchFilter !== "all" ? "No creators match your filters." : "No creators in this directory yet."}
              </div>
            )}
          </>
        )}

        {/* Table View */}
        {!membersLoading && viewMode === "table" && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                  <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">Creator</th>
                  <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">Branch</th>
                  <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">Followers</th>
                  <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">Engagement</th>
                  <th className="text-center p-3 font-medium text-gray-500 dark:text-gray-400">Public</th>
                  <th className="text-center p-3 font-medium text-gray-500 dark:text-gray-400">Hero</th>
                  <th className="text-center p-3 font-medium text-gray-500 dark:text-gray-400 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const imgSrc = creatorAvatarUrl(m.ic_avatar_url, m.avatar_url, (m as Record<string, unknown>).profile_image_url as string);
                  const branchStyle = BRANCH_STYLES[m.branch ?? ""] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
                  const isToggling = togglingIds.has(m.id);
                  return (
                    <tr key={m.id} className={cn("border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer", !m.approved && "opacity-60")} onClick={() => openCreatorDrawer(m)}>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 relative">
                            {imgSrc && (
                              <img
                                src={imgSrc}
                                alt={m.creator_name ?? ""}
                                className="w-full h-full object-cover absolute inset-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            )}
                            <div className="w-full h-full bg-gradient-to-br from-[#6C5CE7] to-[#5B4BD1] flex items-center justify-center text-white font-bold text-xs">
                              {getInitials(m.creator_name ?? "", m.creator_handle)}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#000741] dark:text-white truncate">{m.creator_name}</p>
                            <p className="text-xs text-[#6C5CE7] truncate">@{m.creator_handle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {m.branch ? <Badge variant="outline" className={cn("text-[10px] font-semibold border-0", branchStyle)}>{m.branch}</Badge> : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="p-3 text-right font-semibold text-[#000741] dark:text-white tabular-nums">{formatFollowerCount(m.follower_count)}</td>
                      <td className="p-3 text-right font-semibold text-[#000741] dark:text-white tabular-nums">{typeof m.engagement_rate === "number" ? `${m.engagement_rate.toFixed(2)}%` : "—"}</td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                          {isToggling ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Switch checked={m.approved} onCheckedChange={() => handleToggleApproved(m.id, m.approved)} />}
                        </div>
                      </td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title={m.featured_homepage ? "Remove from homepage" : "Feature on homepage"}
                          className={cn("p-1 rounded transition-colors", m.featured_homepage ? "text-yellow-500 hover:text-yellow-600" : "text-gray-300 hover:text-yellow-400")}
                          onClick={() => handleToggleFeatured(m)}
                        >
                          <Star className={cn("h-4 w-4", m.featured_homepage && "fill-current")} />
                        </button>
                      </td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="Edit stats"
                            className="p-1 rounded text-gray-400 hover:text-pd-blue transition-colors"
                            onClick={() => openEditModal(m)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {m.approved && (
                            <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => handleRemove(m.id, m.creator_name ?? "")}>
                              Remove
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery || branchFilter !== "all" ? "No creators match your filters." : "No creators in this directory yet. Add creators from Discovery."}
              </div>
            )}
          </div>
        )}

        {/* Promote from List Modal */}
        <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Promote List to Directory</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Label>Select a List</Label>
              <Select value={promoteListId} onValueChange={setPromoteListId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a list..." />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.creators.length} creators)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPromoteOpen(false)}>Cancel</Button>
              <Button
                className="bg-pd-blue hover:bg-pd-darkblue text-white"
                onClick={handlePromote}
                disabled={promoting || !promoteListId}
              >
                {promoting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Promote All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Stats Modal */}
        <Dialog open={!!editMember} onOpenChange={(open) => { if (!open) setEditMember(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Stats — {editMember?.creator_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="avg-views">Avg Views</Label>
                <Input
                  id="avg-views"
                  placeholder='e.g., "1.2M"'
                  value={editAvgViews}
                  onChange={(e) => setEditAvgViews(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="avg-likes">Avg Likes</Label>
                <Input
                  id="avg-likes"
                  placeholder='e.g., "45.3K"'
                  value={editAvgLikes}
                  onChange={(e) => setEditAvgLikes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
              <Button
                className="bg-pd-blue hover:bg-pd-darkblue text-white"
                onClick={handleSaveEdit}
                disabled={editSaving}
              >
                {editSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Creator Profile Drawer */}
        <CreatorProfileModal
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          creator={drawerCreator}
          hideDirectoryActions
          onRemoveFromDirectory={handleRemoveFromDirectory}
        />
      </div>
    </div>
  );
};

export default BrandDirectory;
