import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
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
  MoreHorizontal,
  ShieldCheck,
  ListPlus,
  FolderPlus,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { cn, safeImageUrl } from "@/lib/utils";
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
import { type CreatorCard } from "@/lib/influencers-club";
import { PlatformIcons } from "@/components/PlatformIcons";
import AddToDestinationModal, { type DestinationCreator } from "@/components/AddToDestinationModal";

interface PreviewMember {
  directory_id: string;
  creator_name: string | null;
  ic_avatar_url: string | null;
  avatar_url: string | null;
}

interface DirectoryWithPreview extends Directory {
  previewMembers?: PreviewMember[];
}

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

/** Avatar component — renders permanent Supabase URL with onError fallback to initials. */
function DirAvatar({ m, size = "lg" }: { m: DirectoryMember; size?: "sm" | "lg" }) {
  const src = m.ic_avatar_url || m.avatar_url || null;
  const [failed, setFailed] = useState(!src);
  const prevSrc = useRef(src);
  if (src !== prevSrc.current) {
    prevSrc.current = src;
    setFailed(!src);
  }
  const isLg = size === "lg";

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Instagram returns a tiny default avatar when the real one is missing.
    // Detect it by checking natural dimensions — real profile pics are > 50px.
    const img = e.currentTarget;
    if (img.naturalWidth < 50 || img.naturalHeight < 50) {
      setFailed(true);
    }
  };

  return (
    <div className={cn(
      "rounded-full overflow-hidden relative",
      isLg ? "w-[72px] h-[72px] md:w-[88px] md:h-[88px] mb-3 border-[3px] border-white dark:border-gray-700 ring-1 ring-gray-200 dark:ring-gray-600 shadow-sm" : "w-10 h-10 shrink-0 border border-gray-200 dark:border-gray-700",
    )}>
      {src && !failed ? (
        <img
          src={src}
          alt={m.creator_name ?? ""}
          className="w-full h-full object-cover"
          onLoad={handleLoad}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className={cn(
          "w-full h-full bg-gradient-to-br from-[#1e3a5f] to-[#2d5282] flex items-center justify-center text-white font-bold",
          isLg ? "text-lg" : "text-xs",
        )}>
          {getInitials(m.creator_name ?? "", m.creator_handle)}
        </div>
      )}
    </div>
  );
}

const KNOWN_PLATFORMS = ["instagram", "tiktok", "youtube", "twitter", "facebook", "linkedin", "twitch", "pinterest", "snapchat", "threads"];

/** Merge platforms from m.platforms, m.platform_urls keys, and enrichment_data.result.creator_has. */
function getAllPlatforms(m: DirectoryMember): string[] {
  const set = new Set<string>();
  // 1. platforms array
  if (Array.isArray(m.platforms)) {
    m.platforms.forEach((p) => set.add(p.toLowerCase()));
  }
  // 2. platform_urls keys
  if (m.platform_urls && typeof m.platform_urls === "object") {
    Object.keys(m.platform_urls).forEach((k) => {
      if (m.platform_urls[k]) set.add(k.toLowerCase());
    });
  }
  // 3. enrichment_data → result.creator_has (boolean flags)
  if (m.enrichment_data && typeof m.enrichment_data === "object") {
    const ed = m.enrichment_data as Record<string, unknown>;
    const creatorHas =
      ((ed.result as Record<string, unknown>)?.creator_has as Record<string, boolean>) ??
      (ed.creator_has as Record<string, boolean>);
    if (creatorHas && typeof creatorHas === "object") {
      Object.entries(creatorHas).forEach(([k, v]) => {
        if (v) set.add(k.toLowerCase());
      });
    }
  }
  // Return in canonical order, known platforms first
  const ordered = KNOWN_PLATFORMS.filter((p) => set.has(p));
  set.forEach((p) => { if (!ordered.includes(p)) ordered.push(p); });
  return ordered;
}

/** Map a DirectoryMember to the CreatorCard shape the profile drawer expects. */
function memberToCreatorCard(m: DirectoryMember): CreatorCard {
  const enrichAvatar = extractAvatarFromEnrichment(m.enrichment_data);
  const allPlatforms = getAllPlatforms(m);
  return {
    id: m.id,
    name: m.creator_name ?? m.creator_handle,
    username: m.creator_handle,
    avatar: safeImageUrl(m.ic_avatar_url) ?? safeImageUrl(m.avatar_url) ?? safeImageUrl(enrichAvatar) ?? "",
    followers: m.follower_count ?? 0,
    engagementRate: m.engagement_rate ?? 0,
    platforms: allPlatforms.length > 0 ? allPlatforms : ["instagram"],
    bio: m.bio ?? "",
    location: undefined,
    category: m.category ?? undefined,
    socialPlatforms: allPlatforms.length > 0 ? allPlatforms : ["instagram"],
    branch: m.branch ?? undefined,
  };
}

// ─── Main Component ─────────────────────────────────────────

const BrandDirectory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSuperAdmin, user, effectiveUserId } = useAuth();
  const { guardAction } = useDemoMode();
  const { lists, addCreatorToList } = useLists();

  // Directory-level state
  const [directories, setDirectories] = useState<DirectoryWithPreview[]>([]);
  const [dirsLoading, setDirsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [dirViewMode, setDirViewMode] = useState<'card' | 'list'>('card');

  // Directory card menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [dirImageTargetId, setDirImageTargetId] = useState<string | null>(null);
  const dirImageInputRef = useRef<HTMLInputElement>(null);

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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [destModalOpen, setDestModalOpen] = useState(false);
  const [destModalTab, setDestModalTab] = useState<"directory" | "list">("directory");

  // Inline title/description editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");

  // Edit modal state (avg_views, avg_likes)
  // Manual add-to-directory dialog
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const [manualAddHandle, setManualAddHandle] = useState("");
  const [manualAddName, setManualAddName] = useState("");
  const [manualAddLoading, setManualAddLoading] = useState(false);

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
    if (data.length > 0) {
      const { data: previewRows } = await supabase
        .from("directory_members")
        .select("directory_id, creator_name, ic_avatar_url, avatar_url")
        .in("directory_id", data.map((d) => d.id))
        .order("sort_order", { ascending: true });
      const previewMap = new Map<string, PreviewMember[]>();
      for (const row of (previewRows ?? []) as PreviewMember[]) {
        const arr = previewMap.get(row.directory_id) ?? [];
        if (arr.length < 4) arr.push(row);
        previewMap.set(row.directory_id, arr);
      }
      setDirectories(data.map((d) => ({ ...d, previewMembers: previewMap.get(d.id) ?? [] })));
    } else {
      setDirectories(data);
    }
    setDirsLoading(false);
  }, []);

  useEffect(() => { loadDirectories(); }, [loadDirectories]);

  // Close directory card menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenuId]);

  const handleDirStartRename = (dirId: string, currentName: string) => {
    setOpenMenuId(null);
    setRenamingId(dirId);
    setRenameValue(currentName);
  };

  const handleDirFinishRename = async () => {
    if (renamingId && renameValue.trim()) {
      const { error } = await supabase.from("directories").update({ name: renameValue.trim() }).eq("id", renamingId);
      if (error) { toast.error("Failed to rename"); }
      else {
        setDirectories((prev) => prev.map((d) => d.id === renamingId ? { ...d, name: renameValue.trim() } : d));
        toast.success("Directory renamed");
      }
    }
    setRenamingId(null);
  };

  const handleDirChangeImage = (dirId: string) => {
    setOpenMenuId(null);
    setDirImageTargetId(dirId);
    dirImageInputRef.current?.click();
  };

  const handleDirImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dirImageTargetId) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `directories/${dirImageTargetId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("list-avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Failed to upload image"); }
    else {
      const { data: urlData } = supabase.storage.from("list-avatars").getPublicUrl(path);
      if (urlData?.publicUrl) {
        await supabase.from("directories").update({ cover_image_url: urlData.publicUrl }).eq("id", dirImageTargetId);
        setDirectories((prev) => prev.map((d) => d.id === dirImageTargetId ? { ...d, cover_image_url: urlData.publicUrl } : d));
        toast.success("Directory image updated");
      }
    }
    setDirImageTargetId(null);
    e.target.value = "";
  };

  const handleDirConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    const dir = directories.find((d) => d.id === deleteConfirmId);
    const { error } = await deleteDirectory(deleteConfirmId);
    if (error) toast.error(`Failed to delete: ${error}`);
    else {
      setDirectories((prev) => prev.filter((d) => d.id !== deleteConfirmId));
      toast.success(`Deleted "${dir?.name}"`);
    }
    setDeleteConfirmId(null);
  };

  // Reset to list view when nav link clicked while already on this page
  useEffect(() => {
    if (location.state?.reset && selectedDir) {
      setSelectedDir(null);
      setMembers([]);
    }
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Load members when directory selected ──────────────────

  const loadMembers = useCallback(async (dirId: string) => {
    setMembersLoading(true);
    const data = await fetchDirectoryMembers(dirId);
    setMembers(data);
    setMembersLoading(false);
  }, []);

  const openDirectory = (dir: Directory) => {
    setSelectedDir(dir);
    setTitleValue(dir.name);
    setDescValue(dir.description || "");
    setSearchQuery("");
    setBranchFilter("all");
    setSelectedIds(new Set());
    loadMembers(dir.id);
  };

  const goBack = () => {
    setSelectedDir(null);
    setMembers([]);
    setSelectedIds(new Set());
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
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      toast.success(`${name} removed from directory`);
    }
  };

  const handleVerify = (m: DirectoryMember) => {
    navigate("/brand/verification", {
      state: {
        prefill: {
          fullName: m.creator_name ?? "",
          claimedBranch: m.branch ?? "",
          claimedType: "",
          claimedStatus: "",
          linkedinUrl: "",
          websiteUrl: "",
          notes: `Added from directory: ${selectedDir?.name ?? ""}`,
          source: "instagram",
          sourceUsername: m.creator_handle ?? "",
        },
      },
    });
  };

  const handleAddToList = (m: DirectoryMember, listId: string) => {
    addCreatorToList(listId, {
      id: m.creator_handle ?? m.id,
      name: m.creator_name ?? "",
      username: m.creator_handle ?? "",
      avatar: m.avatar_url ?? "",
      followers: m.follower_count ?? 0,
      engagementRate: m.engagement_rate ?? 0,
      platforms: m.platforms ?? ["instagram"],
      bio: m.bio ?? "",
    });
    const targetList = lists.find((l) => l.id === listId);
    toast.success(`Added to ${targetList?.name ?? "list"}`);
  };

  const copyToDirectory = async (m: DirectoryMember, targetDirId: string): Promise<"added" | "skipped" | "failed"> => {
    const row = {
      directory_id: targetDirId,
      creator_handle: m.creator_handle ?? "",
      creator_name: m.creator_name ?? "",
      avatar_url: m.avatar_url,
      follower_count: m.follower_count,
      engagement_rate: m.engagement_rate,
      platform: m.platform ?? "instagram",
      branch: m.branch,
      tags: (m as any).tags ?? null,
    };

    const { error } = await supabase
      .from("directory_members")
      .upsert(row, { onConflict: "directory_id,creator_handle", ignoreDuplicates: true });
    if (error) {
      console.error("copyToDirectory upsert error:", error);
      return "failed";
    }
    // ignoreDuplicates returns success even for duplicates, so we can't distinguish added vs skipped
    return "added";
  };

  const handleAddToOtherDirectory = async (m: DirectoryMember, dirId: string) => {
    const result = await copyToDirectory(m, dirId);
    const targetDir = directories.find((d) => d.id === dirId);
    if (result === "failed") {
      toast.error("Failed to copy creator");
    } else if (result === "skipped") {
      toast.info(`Already in ${targetDir?.name ?? "directory"}`);
    } else {
      toast.success(`Copied to ${targetDir?.name ?? "directory"}`);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
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

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((m) => m.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} creator${selectedIds.size > 1 ? "s" : ""} from this directory? This cannot be undone.`)) return;
    setBulkDeleting(true);
    let deleted = 0;
    for (const id of selectedIds) {
      const { error } = await removeMember(id);
      if (!error) deleted++;
    }
    setMembers((prev) => prev.filter((m) => !selectedIds.has(m.id)));
    setSelectedIds(new Set());
    setBulkDeleting(false);
    toast.success(`Deleted ${deleted} creator${deleted !== 1 ? "s" : ""} from directory`);
  };

  const handleBulkAddToDirectory = async (targetDirId: string) => {
    if (selectedIds.size === 0) return;
    let copied = 0;
    let failed = 0;
    for (const id of selectedIds) {
      const m = members.find((mem) => mem.id === id);
      if (!m) { failed++; continue; }
      const result = await copyToDirectory(m, targetDirId);
      if (result === "added") copied++;
      else failed++;
    }
    const targetDir = directories.find((d) => d.id === targetDirId);
    const dirName = targetDir?.name ?? "directory";
    if (copied > 0) {
      toast.success(`Copied ${copied} creator${copied !== 1 ? "s" : ""} to ${dirName}`);
    }
    if (failed > 0) toast.error(`Failed to copy ${failed} creator${failed !== 1 ? "s" : ""}`);
    setSelectedIds(new Set());
  };

  const handleBulkAddToList = (listId: string) => {
    if (selectedIds.size === 0) return;
    let added = 0;
    for (const id of selectedIds) {
      const m = members.find((mem) => mem.id === id);
      if (!m) continue;
      addCreatorToList(listId, {
        id: m.creator_handle ?? m.id,
        name: m.creator_name ?? "",
        username: m.creator_handle ?? "",
        avatar: m.avatar_url ?? "",
        followers: m.follower_count ?? 0,
        engagementRate: m.engagement_rate ?? 0,
        platforms: m.platforms ?? ["instagram"],
        bio: m.bio ?? "",
      });
      added++;
    }
    const targetList = lists.find((l) => l.id === listId);
    if (added > 0) toast.success(`Added ${added} creator${added !== 1 ? "s" : ""} to ${targetList?.name ?? "list"}`);
    setSelectedIds(new Set());
  };

  const handleManualAdd = async () => {
    if (!manualAddHandle.trim() || !selectedDir) return;
    setManualAddLoading(true);
    const { error } = await addToDirectory(selectedDir.id, {
      handle: manualAddHandle.trim(),
      display_name: manualAddName.trim() || manualAddHandle.trim(),
      platform: "instagram",
    });
    setManualAddLoading(false);
    if (error) {
      toast.error(`Failed to add: ${error}`);
    } else {
      toast.success(`Added @${manualAddHandle.trim()} to directory`);
      setManualAddOpen(false);
      setManualAddHandle("");
      setManualAddName("");
      loadMembers(selectedDir.id);
    }
  };

  // ─── RENDER: Directory list ────────────────────────────────

  if (!selectedDir) {
    return (
      <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">Directories</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setDirViewMode('card')}
                  className={`p-1.5 rounded ${dirViewMode === 'card' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Card view"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/>
                  </svg>
                </button>
                <button
                  onClick={() => setDirViewMode('list')}
                  className={`p-1.5 rounded ${dirViewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                  title="List view"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 5h18v2H3zm0 6h18v2H3zm0 6h18v2H3z"/>
                  </svg>
                </button>
              </div>
              <Button
                className="rounded-lg bg-pd-blue hover:bg-pd-darkblue text-white"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Directory
              </Button>
            </div>
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

          {/* Hidden file input for directory image upload */}
          <input ref={dirImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleDirImageSelected} />

          {/* Delete directory confirmation dialog */}
          <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Delete Directory</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">Are you sure you want to delete this directory and all its members? This action cannot be undone.</p>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDirConfirmDelete}>Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {!dirsLoading && directories.length > 0 && dirViewMode === 'card' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {directories.map((dir) => (
                <Card
                  key={dir.id}
                  className="bg-white dark:bg-[#1A1D27] border-border hover:shadow-lg transition-shadow cursor-pointer group relative"
                  onClick={() => renamingId !== dir.id && openDirectory(dir)}
                >
                  {/* "..." menu button */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === dir.id ? null : dir.id); }}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
                    >
                      ⋯
                    </button>
                  </div>
                  {/* Dropdown menu */}
                  {openMenuId === dir.id && (
                    <div
                      className="absolute top-10 right-3 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2" onClick={() => handleDirStartRename(dir.id, dir.name)}>
                        ✏️ Rename
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2" onClick={() => handleDirChangeImage(dir.id)}>
                        🖼️ Change Image
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-red-600 dark:text-red-400" onClick={() => { setOpenMenuId(null); setDeleteConfirmId(dir.id); }}>
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                  {dir.cover_image_url && (
                    <div className="h-32 rounded-t-lg overflow-hidden">
                      <img src={dir.cover_image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {renamingId === dir.id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={handleDirFinishRename}
                            onKeyDown={(e) => { if (e.key === "Enter") handleDirFinishRename(); if (e.key === "Escape") setRenamingId(null); }}
                            className="font-semibold text-foreground text-lg bg-transparent border-b-2 border-[#1e3a5f] outline-none w-full"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h3 className="font-semibold text-foreground text-lg truncate group-hover:text-pd-blue transition-colors">
                            {dir.name}
                          </h3>
                        )}
                        {dir.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{dir.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      {dir.previewMembers && dir.previewMembers.length > 0 && (
                        <div className="flex -space-x-2">
                          {dir.previewMembers.slice(0, 4).map((member, i) => (
                            member.ic_avatar_url || member.avatar_url ? (
                              <img
                                key={i}
                                src={member.ic_avatar_url || member.avatar_url!}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-900 object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div key={i} className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-900 bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                <span className="text-xs text-blue-700 dark:text-blue-400 font-semibold">{member.creator_name?.charAt(0)}</span>
                              </div>
                            )
                          ))}
                        </div>
                      )}
                      <span className="text-sm text-gray-500 dark:text-gray-400">{dir.member_count ?? 0} creator{(dir.member_count ?? 0) !== 1 ? "s" : ""}</span>
                      {dir.is_public ? (
                        <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-800 dark:text-blue-500 ml-auto">
                          <Eye className="h-3 w-3 mr-1" /> Public
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-500 ml-auto">
                          <EyeOff className="h-3 w-3 mr-1" /> Private
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!dirsLoading && directories.length > 0 && dirViewMode === 'list' && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden">
              {directories.map((dir) => (
                <div
                  key={dir.id}
                  className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer relative group"
                  onClick={() => renamingId !== dir.id && openDirectory(dir)}
                >
                  <div className="flex items-center gap-3">
                    {renamingId === dir.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleDirFinishRename}
                        onKeyDown={(e) => { if (e.key === "Enter") handleDirFinishRename(); if (e.key === "Escape") setRenamingId(null); }}
                        className="font-medium text-gray-900 dark:text-white text-sm bg-transparent border-b-2 border-[#1e3a5f] outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="font-medium text-gray-900 dark:text-white text-sm">{dir.name}</span>
                    )}
                    {dir.previewMembers && dir.previewMembers.length > 0 && (
                      <div className="flex -space-x-1.5">
                        {dir.previewMembers.slice(0, 4).map((member, i) => (
                          member.ic_avatar_url || member.avatar_url ? (
                            <img
                              key={i}
                              src={member.ic_avatar_url || member.avatar_url!}
                              referrerPolicy="no-referrer"
                              className="w-5 h-5 rounded-full border border-white dark:border-gray-900 object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <div key={i} className="w-5 h-5 rounded-full border border-white dark:border-gray-900 bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                              <span className="text-[8px] text-blue-700 dark:text-blue-400 font-semibold">{member.creator_name?.charAt(0)}</span>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                    <span className="text-xs text-gray-400">{dir.member_count ?? 0} creator{(dir.member_count ?? 0) !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dir.is_public && (
                      <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-800 dark:text-blue-500">
                        Public
                      </Badge>
                    )}
                    <span className="text-xs text-gray-400 hidden sm:inline">{dir.description}</span>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === dir.id ? null : dir.id); }}
                    >
                      ⋯
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  </div>
                  {openMenuId === dir.id && (
                    <div
                      className="absolute top-full right-4 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2" onClick={() => handleDirStartRename(dir.id, dir.name)}>
                        ✏️ Rename
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2" onClick={() => handleDirChangeImage(dir.id)}>
                        🖼️ Change Image
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-red-600 dark:text-red-400" onClick={() => { setOpenMenuId(null); setDeleteConfirmId(dir.id); }}>
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
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
          {editingTitle ? (
            <input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={async () => {
                if (titleValue.trim() && titleValue.trim() !== selectedDir.name) {
                  await supabase.from("directories").update({ name: titleValue.trim() }).eq("id", selectedDir.id);
                  setSelectedDir({ ...selectedDir, name: titleValue.trim() });
                  setDirectories((prev) => prev.map((d) => d.id === selectedDir.id ? { ...d, name: titleValue.trim() } : d));
                }
                setEditingTitle(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="text-3xl font-bold text-gray-900 dark:text-white border-b-2 border-blue-500 outline-none bg-transparent w-full mb-2"
            />
          ) : (
            <h1
              onClick={() => setEditingTitle(true)}
              className="text-3xl font-bold text-pd-navy dark:text-white mb-2 cursor-pointer hover:text-blue-700 dark:hover:text-blue-400 group flex items-center gap-2"
            >
              {titleValue || selectedDir.name}
              <span className="opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity">
                <Pencil className="h-4 w-4" />
              </span>
            </h1>
          )}
          {editingDesc ? (
            <input
              autoFocus
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              onBlur={async () => {
                if (descValue !== (selectedDir.description || "")) {
                  await supabase.from("directories").update({ description: descValue.trim() || null }).eq("id", selectedDir.id);
                  setSelectedDir({ ...selectedDir, description: descValue.trim() || null });
                  setDirectories((prev) => prev.map((d) => d.id === selectedDir.id ? { ...d, description: descValue.trim() || null } : d));
                }
                setEditingDesc(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="text-gray-500 dark:text-gray-400 border-b border-blue-400 outline-none bg-transparent w-full text-sm"
            />
          ) : (
            <p
              onClick={() => setEditingDesc(true)}
              className="text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 group flex items-center gap-2 text-sm mt-1"
            >
              {descValue || "Click to add a description..."}
              <span className="opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity">
                <Pencil className="h-3.5 w-3.5" />
              </span>
            </p>
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
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-700" />
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
          <a href="/brand/discover" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="rounded-lg border-[#1e3a5f] text-[#1e3a5f] hover:bg-blue-50 dark:hover:bg-blue-950/30">
              <Search className="h-4 w-4 mr-1.5" />
              Discover Creators
            </Button>
          </a>
          <div className="flex-grow" />
          {/* View toggle */}
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button type="button" onClick={() => handleViewChange("table")} className={cn("p-1.5 transition-colors", viewMode === "table" ? "bg-pd-blue text-white" : "bg-background text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800")} title="Table view">
              <List className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => handleViewChange("cards")} className={cn("p-1.5 transition-colors", viewMode === "cards" ? "bg-pd-blue text-white" : "bg-background text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800")} title="Card view">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
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
                const branchStyle = BRANCH_STYLES[m.branch ?? ""] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
                const isToggling = togglingIds.has(m.id);
                const platforms = getAllPlatforms(m);
                return (
                  <Card key={m.id} className={cn("p-5 bg-white dark:bg-[#1A1D27] border-border flex flex-col items-center text-center cursor-pointer hover:shadow-lg transition-shadow", !m.approved && "opacity-60")} onClick={() => openCreatorDrawer(m)}>
                    <DirAvatar m={m} size="lg" />
                    <h3 className="font-semibold text-[#000741] dark:text-white text-sm truncate max-w-full">{m.creator_name}</h3>
                    <p className="text-xs text-[#1e3a5f] mb-2 truncate max-w-full">@{m.creator_handle}</p>
                    {m.branch && <Badge variant="outline" className={cn("text-[10px] font-semibold border-0 mb-2", branchStyle)}>{m.branch}</Badge>}
                    <div className="flex items-center gap-4 text-xs mb-3">
                      <div><span className="font-bold text-[#000741] dark:text-white">{formatFollowerCount(m.follower_count)}</span><span className="text-muted-foreground ml-1">followers</span></div>
                      <div><span className="font-bold text-[#000741] dark:text-white">{typeof m.engagement_rate === "number" ? `${m.engagement_rate.toFixed(1)}%` : "—"}</span><span className="text-muted-foreground ml-1">eng.</span></div>
                    </div>
                    {platforms.length > 0 && <div className="mb-4"><PlatformIcons platforms={platforms} username={m.creator_handle} max={5} /></div>}
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleVerify(m)}>
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Verify
                          </DropdownMenuItem>
                          {lists.length > 0 && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <ListPlus className="h-4 w-4 mr-2" />
                                Add to List
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                  {lists.map((l) => (
                                    <DropdownMenuItem key={l.id} onClick={() => handleAddToList(m, l.id)}>
                                      {l.name}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                          )}
                          {directories.filter((d) => d.id !== selectedDir?.id).length > 0 && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <FolderPlus className="h-4 w-4 mr-2" />
                                Add to Directory
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                  {directories
                                    .filter((d) => d.id !== selectedDir?.id)
                                    .map((d) => (
                                      <DropdownMenuItem key={d.id} onClick={() => handleAddToOtherDirectory(m, d.id)}>
                                        {d.name}
                                      </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEditModal(m)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Stats
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleRemove(m.id, m.creator_name ?? "")}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

        {/* Bulk selection bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
              {selectedIds.size} selected
            </span>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-lg"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Delete Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() => { setDestModalTab("directory"); setDestModalOpen(true); }}
            >
              <FolderPlus className="h-4 w-4 mr-1.5" />
              Add to Directory
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() => { setDestModalTab("list"); setDestModalOpen(true); }}
            >
              <ListPlus className="h-4 w-4 mr-1.5" />
              Add to List
            </Button>
            <Button size="sm" variant="ghost" className="rounded-lg text-blue-800 dark:text-blue-400" onClick={() => setSelectedIds(new Set())}>
              Clear Selection
            </Button>
          </div>
        )}

        {/* Table View */}
        {!membersLoading && viewMode === "table" && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                  <th className="p-3 w-10" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 accent-pd-blue" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={toggleSelectAll} />
                  </th>
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
                  const branchStyle = BRANCH_STYLES[m.branch ?? ""] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
                  const isToggling = togglingIds.has(m.id);
                  return (
                    <tr key={m.id} className={cn("border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer", !m.approved && "opacity-60", selectedIds.has(m.id) && "bg-blue-50 dark:bg-blue-950/20")} onClick={() => openCreatorDrawer(m)}>
                      <td className="p-3 w-10" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 accent-pd-blue" checked={selectedIds.has(m.id)} onChange={() => toggleSelect(m.id)} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <DirAvatar m={m} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-[#000741] dark:text-white truncate">{m.creator_name}</p>
                            <p className="text-xs text-[#1e3a5f] truncate">@{m.creator_handle}</p>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleVerify(m)}>
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              Verify
                            </DropdownMenuItem>
                            {lists.length > 0 && (
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <ListPlus className="h-4 w-4 mr-2" />
                                  Add to List
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuSubContent>
                                    {lists.map((l) => (
                                      <DropdownMenuItem key={l.id} onClick={() => handleAddToList(m, l.id)}>
                                        {l.name}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                              </DropdownMenuSub>
                            )}
                            {directories.filter((d) => d.id !== selectedDir?.id).length > 0 && (
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <FolderPlus className="h-4 w-4 mr-2" />
                                  Add to Directory
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuSubContent>
                                    {directories
                                      .filter((d) => d.id !== selectedDir?.id)
                                      .map((d) => (
                                        <DropdownMenuItem key={d.id} onClick={() => handleAddToOtherDirectory(m, d.id)}>
                                          {d.name}
                                        </DropdownMenuItem>
                                      ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                              </DropdownMenuSub>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditModal(m)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Stats
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleRemove(m.id, m.creator_name ?? "")}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

        {/* Add to Directory Modal */}
        <Dialog open={manualAddOpen} onOpenChange={(open) => { if (!open) { setManualAddHandle(""); setManualAddName(""); } setManualAddOpen(open); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Creator to Directory</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="add-handle">Handle *</Label>
                <Input id="add-handle" placeholder="@username" value={manualAddHandle} onChange={(e) => setManualAddHandle(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="add-name">Display Name</Label>
                <Input id="add-name" placeholder="Creator name (optional)" value={manualAddName} onChange={(e) => setManualAddName(e.target.value)} className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setManualAddOpen(false)}>Cancel</Button>
              <Button className="bg-pd-blue hover:bg-pd-darkblue text-white" onClick={handleManualAdd} disabled={manualAddLoading || !manualAddHandle.trim()}>
                {manualAddLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Add
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

        <AddToDestinationModal
          open={destModalOpen}
          defaultTab={destModalTab}
          creators={Array.from(selectedIds).map((id) => {
            const m = members.find((mem) => mem.id === id);
            return m ? {
              handle: m.creator_handle ?? "",
              name: m.creator_name ?? "",
              avatar_url: m.avatar_url,
              follower_count: m.follower_count,
              engagement_rate: m.engagement_rate,
              platform: m.platform ?? "instagram",
              branch: m.branch,
              platforms: m.platforms ?? [],
              bio: m.bio ?? "",
            } : null;
          }).filter(Boolean) as DestinationCreator[]}
          onClose={() => { setDestModalOpen(false); setSelectedIds(new Set()); }}
        />
      </div>
    </div>
  );
};

export default BrandDirectory;
