import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLists } from "@/contexts/ListContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { List, Trash2, ChevronRight, Plus, User, Globe, Loader2, ArrowLeft, Camera, Pencil } from "lucide-react";
import { cn, safeImageUrl } from "@/lib/utils";
import CreatorProfileModal from "@/components/CreatorProfileModal";
import BulkActionBar from "@/components/BulkActionBar";
import type { CreatorCard } from "@/lib/influencers-club";
import type { ListCreator } from "@/contexts/ListContext";
import { approveForDirectory, detectBranch } from "@/lib/featured-creators";
import { PlatformIcons } from "@/components/PlatformIcons";
import { toast } from "sonner";

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return String(count);
}

function listCreatorToCard(c: ListCreator): CreatorCard {
  return {
    id: c.id,
    name: c.name,
    username: c.username,
    avatar: c.avatar,
    followers: c.followers,
    engagementRate: c.engagementRate,
    platforms: c.platforms,
    bio: c.bio,
    location: c.location,
  };
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "Twitter",
  linkedin: "LinkedIn",
};

async function promoteCreatorToDirectory(
  creator: ListCreator,
  sourceListId: string | null,
  addedBy: string | null
): Promise<string | null> {
  const branch = detectBranch(creator.bio ?? "");
  const { error } = await approveForDirectory({
    handle: creator.username ?? creator.id,
    display_name: creator.name,
    platform: creator.platforms?.[0] ?? "instagram",
    avatar_url: creator.avatar || null,
    follower_count: creator.followers ?? null,
    engagement_rate: creator.engagementRate ?? null,
    bio: creator.bio || null,
    branch,
    status: "veteran",
    platforms: creator.platforms || [],
    category: null,
    ic_avatar_url: creator.avatar || null,
    source_list_id: sourceListId,
    added_by: addedBy,
  });
  return error;
}

const BrandLists = () => {
  const { lists, createList, deleteList, renameList, updateListAvatar } = useLists();
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageTargetId, setImageTargetId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  // Inline title/description editing for list detail
  const [editingListTitle, setEditingListTitle] = useState<string | false>(false);
  const [listTitleValue, setListTitleValue] = useState("");
  const [editingListDesc, setEditingListDesc] = useState(false);
  const [listDescValue, setListDescValue] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const createAvatarRef = useRef<HTMLInputElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpenId) return;
    const handler = () => setMenuOpenId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpenId]);

  // Reset create modal state when opened
  useEffect(() => {
    if (createModalOpen) {
      setNewListName("");
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }, [createModalOpen]);

  const handleCreateAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAvatarFile(file);
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      setAvatarPreview(null);
    }
  };

  const handleCreateList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;

    const id = createList(trimmed);

    if (avatarFile) {
      const path = `${id}/${Date.now()}-${avatarFile.name}`;
      const { error } = await supabase.storage
        .from("list-avatars")
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
      if (!error) {
        const { data: urlData } = supabase.storage
          .from("list-avatars")
          .getPublicUrl(path);
        if (urlData?.publicUrl) {
          updateListAvatar(id, urlData.publicUrl);
        }
      }
    }

    setCreateModalOpen(false);
    navigate(`/lists/${id}`);
  };

  const handleStartRename = (listId: string, currentName: string) => {
    setMenuOpenId(null);
    setRenamingId(listId);
    setRenameValue(currentName);
  };

  const handleFinishRename = () => {
    if (renamingId && renameValue.trim()) {
      renameList(renamingId, renameValue.trim());
      toast.success("List renamed");
    }
    setRenamingId(null);
  };

  const handleChangeImage = (listId: string) => {
    setMenuOpenId(null);
    setImageTargetId(listId);
    imageInputRef.current?.click();
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !imageTargetId) return;
    const path = `${imageTargetId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("list-avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast.error("Failed to upload image");
      return;
    }
    const { data: urlData } = supabase.storage.from("list-avatars").getPublicUrl(path);
    if (urlData?.publicUrl) {
      updateListAvatar(imageTargetId, urlData.publicUrl);
      toast.success("List image updated");
    }
    setImageTargetId(null);
    e.target.value = "";
  };

  const handleDeleteList = () => {
    if (!deleteConfirmId) return;
    deleteList(deleteConfirmId);
    toast.success("List deleted");
    setDeleteConfirmId(null);
  };

  return (
    <>
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => createAvatarRef.current?.click()}
                className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-gray-400" />
                )}
              </button>
              <input
                ref={createAvatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCreateAvatarSelect}
              />
              <span className="text-xs text-gray-400">Upload avatar</span>
            </div>

            {/* List name */}
            <div className="space-y-2">
              <Label htmlFor="create-list-name">List Name</Label>
              <Input
                id="create-list-name"
                placeholder="e.g. Summer Campaign"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateList();
                  }
                }}
                className="rounded-lg"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleCreateList} disabled={!newListName.trim()} className="rounded-lg bg-[#1e3a5f] hover:bg-[#2d5282]">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">
              Lists
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage creator lists for events and campaigns. Create lists from
              Discover, then invite or target them for specific opportunities.
            </p>
          </div>
          <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
              title="Card view"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/>
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
              title="List view"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 5h18v2H3zm0 6h18v2H3zm0 6h18v2H3z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input for image upload */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete List</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this list? This action cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteList}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewMode === 'card' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <Card
              key={list.id}
              className="bg-gradient-card border-border p-5 cursor-pointer transition-colors hover:border-primary/50 relative group"
              onClick={() => renamingId !== list.id && navigate(`/lists/${list.id}`)}
            >
              {/* "..." menu button */}
              <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none z-10"
                onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === list.id ? null : list.id); }}
              >
                ⋯
              </button>
              {/* Dropdown menu */}
              {menuOpenId === list.id && (
                <div
                  className="absolute top-9 right-2 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    onClick={() => handleStartRename(list.id, list.name)}
                  >
                    ✏️ Rename
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    onClick={() => handleChangeImage(list.id)}
                  >
                    🖼️ Change Image
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-red-600 dark:text-red-400"
                    onClick={() => { setMenuOpenId(null); setDeleteConfirmId(list.id); }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {list.avatar_url ? (
                    <img
                      src={list.avatar_url}
                      alt={list.name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <List className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    {renamingId === list.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleFinishRename}
                        onKeyDown={(e) => { if (e.key === "Enter") handleFinishRename(); if (e.key === "Escape") setRenamingId(null); }}
                        className="text-lg font-semibold text-foreground bg-transparent border-b-2 border-[#1e3a5f] outline-none w-full"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <h3 className="text-lg font-semibold text-foreground">
                        {list.name}
                      </h3>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {list.creators.length > 0 && (
                        <div className="flex -space-x-2">
                          {list.creators.slice(0, 4).map((member, i) => (
                            member.avatar ? (
                              <img
                                key={member.id || i}
                                src={member.avatar}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-900 object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div key={member.id || i} className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-900 bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                <span className="text-xs text-blue-700 dark:text-blue-400 font-semibold">{member.name?.charAt(0)}</span>
                              </div>
                            )
                          ))}
                        </div>
                      )}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {list.creators.length} creator{list.creators.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
          ))}
          <Card
            className="bg-gradient-card border-border border-dashed p-5 cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30 flex items-center justify-center min-h-[88px]"
            onClick={(e) => {
              e.stopPropagation();
              setCreateModalOpen(true);
            }}
          >
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-lg font-semibold text-foreground">Create New List</span>
            </div>
          </Card>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden">
          {lists.map((list) => (
            <div
              key={list.id}
              className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer relative group"
              onClick={() => renamingId !== list.id && navigate(`/lists/${list.id}`)}
            >
              <div className="flex items-center gap-3">
                {list.avatar_url ? (
                  <img src={list.avatar_url} alt={list.name} className="w-7 h-7 rounded-md object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
                    <List className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
                {renamingId === list.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={(e) => { if (e.key === "Enter") handleFinishRename(); if (e.key === "Escape") setRenamingId(null); }}
                    className="font-medium text-gray-900 dark:text-white text-sm bg-transparent border-b-2 border-[#1e3a5f] outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{list.name}</span>
                )}
                {list.creators.length > 0 && (
                  <div className="flex -space-x-1.5">
                    {list.creators.slice(0, 4).map((member, i) => (
                      member.avatar ? (
                        <img
                          key={member.id || i}
                          src={member.avatar}
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 rounded-full border border-white dark:border-gray-900 object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div key={member.id || i} className="w-5 h-5 rounded-full border border-white dark:border-gray-900 bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                          <span className="text-[8px] text-blue-700 dark:text-blue-400 font-semibold">{member.name?.charAt(0)}</span>
                        </div>
                      )
                    ))}
                  </div>
                )}
                <span className="text-xs text-gray-400">{list.creators.length} creator{list.creators.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
                  onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === list.id ? null : list.id); }}
                >
                  ⋯
                </button>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </div>
              {/* Dropdown menu for list view */}
              {menuOpenId === list.id && (
                <div
                  className="absolute top-full right-4 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    onClick={() => handleStartRename(list.id, list.name)}
                  >
                    ✏️ Rename
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    onClick={() => handleChangeImage(list.id)}
                  >
                    🖼️ Change Image
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-red-600 dark:text-red-400"
                    onClick={() => { setMenuOpenId(null); setDeleteConfirmId(list.id); }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          <div
            className="flex items-center justify-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer text-muted-foreground"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="font-medium text-sm text-foreground">Create New List</span>
          </div>
        </div>
      )}
    </>
  );
};

export const BrandListDetail = () => {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { lists, removeCreatorFromList } = useLists();
  const { isSuperAdmin, effectiveUserId } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileCreator, setProfileCreator] = useState<CreatorCard | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [promotingIds, setPromotingIds] = useState<Set<string>>(new Set());
  const [promotingAll, setPromotingAll] = useState(false);

  const selectedList = lists.find((l) => l.id === listId) ?? null;

  useEffect(() => {
    setSelectedIds(new Set());
  }, [listId]);

  useEffect(() => {
    if (selectedList) {
      setListTitleValue(selectedList.name);
      setListDescValue("");
    }
  }, [selectedList?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openProfile = (creator: ListCreator) => {
    setProfileCreator(listCreatorToCard(creator));
    setProfileModalOpen(true);
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
    if (!selectedList) return;
    if (selectedIds.size === selectedList.creators.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectedList.creators.map((c) => c.id)));
  };

  const handleBulkRemove = () => {
    if (!selectedList) return;
    selectedIds.forEach((id) => removeCreatorFromList(selectedList.id, id));
    toast.success(`Removed ${selectedIds.size} creator${selectedIds.size !== 1 ? "s" : ""} from list`);
    setSelectedIds(new Set());
  };

  const handlePromoteOne = async (creator: ListCreator) => {
    setPromotingIds((prev) => new Set(prev).add(creator.id));
    const err = await promoteCreatorToDirectory(creator, listId ?? null, effectiveUserId ?? null);
    setPromotingIds((prev) => {
      const next = new Set(prev);
      next.delete(creator.id);
      return next;
    });
    if (err) {
      toast.error(`Failed to add ${creator.name} to directory: ${err}`);
    } else {
      toast.success(`${creator.name} added to public directory`);
    }
  };

  const handlePromoteAll = async () => {
    if (!selectedList || selectedList.creators.length === 0) return;
    setPromotingAll(true);
    let success = 0;
    let failed = 0;
    for (const creator of selectedList.creators) {
      const err = await promoteCreatorToDirectory(creator, listId ?? null, effectiveUserId ?? null);
      if (err) failed++;
      else success++;
    }
    setPromotingAll(false);
    if (failed > 0) {
      toast.error(`Promoted ${success} creator${success !== 1 ? "s" : ""}, ${failed} failed`);
    } else {
      toast.success(`All ${success} creator${success !== 1 ? "s" : ""} added to public directory`);
    }
  };

  if (!selectedList) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">List not found.</p>
        <Button variant="outline" onClick={() => navigate('/lists')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Lists
        </Button>
      </div>
    );
  }

  return (
    <>
      <CreatorProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        creator={profileCreator}
      />
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/lists')}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Lists
        </Button>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {selectedList.avatar_url ? (
              <img
                src={selectedList.avatar_url}
                alt={selectedList.name}
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <List className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {editingListTitle ? (
                <input
                  autoFocus
                  value={listTitleValue}
                  onChange={(e) => setListTitleValue(e.target.value)}
                  onBlur={() => {
                    if (listTitleValue.trim() && listTitleValue.trim() !== selectedList.name) {
                      renameList(selectedList.id, listTitleValue.trim());
                    }
                    setEditingListTitle(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  className="text-2xl font-bold text-gray-900 dark:text-white border-b-2 border-blue-500 outline-none bg-transparent w-full"
                />
              ) : (
                <h1
                  onClick={() => setEditingListTitle(true)}
                  className="text-2xl font-bold text-pd-navy dark:text-white cursor-pointer hover:text-blue-700 dark:hover:text-blue-400 group flex items-center gap-2"
                >
                  {listTitleValue || selectedList.name}
                  <span className="opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity">
                    <Pencil className="h-4 w-4" />
                  </span>
                </h1>
              )}
              {editingListDesc ? (
                <input
                  autoFocus
                  value={listDescValue}
                  onChange={(e) => setListDescValue(e.target.value)}
                  onBlur={async () => {
                    await supabase.from("influencer_lists").update({ description: listDescValue.trim() || null }).eq("id", selectedList.id);
                    setEditingListDesc(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  className="text-gray-500 dark:text-gray-400 border-b border-blue-400 outline-none bg-transparent w-full text-sm mt-1"
                />
              ) : (
                <p
                  onClick={() => setEditingListDesc(true)}
                  className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 group flex items-center gap-2 mt-1"
                >
                  {listDescValue || `${selectedList.creators.length} creator${selectedList.creators.length !== 1 ? "s" : ""} · Click to add a description`}
                  <span className="opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity">
                    <Pencil className="h-3.5 w-3.5" />
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isSuperAdmin && selectedList.creators.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg text-blue-800 border-blue-400 hover:bg-blue-50 dark:text-blue-500 dark:border-blue-800 dark:hover:bg-blue-950/30"
                onClick={handlePromoteAll}
                disabled={promotingAll}
              >
                {promotingAll ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Globe className="h-3.5 w-3.5 mr-1.5" />}
                Promote All to Directory
              </Button>
            )}
            {selectedList.creators.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === selectedList.creators.length}
                  onCheckedChange={selectAll}
                  aria-label="Select all"
                />
                <span className="text-sm text-muted-foreground">Select all</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedList.creators.map((creator) => {
          const isPromoting = promotingIds.has(creator.id);
          return (
            <Card
              key={creator.id}
              className="bg-gradient-card border-border p-4 flex flex-col relative"
            >
              <div className="absolute top-3 left-3 z-10">
                <Checkbox
                  checked={selectedIds.has(creator.id)}
                  onCheckedChange={() => toggleSelect(creator.id)}
                  aria-label={`Select ${creator.name}`}
                />
              </div>
              <div className="flex items-start gap-3 mb-3 pt-6">
                <img
                  src={safeImageUrl(creator.avatar) ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name)}&background=6C5CE7&color=fff&size=128`}
                  alt={creator.name}
                  className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.onerror = null;
                    el.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name)}&background=6C5CE7&color=fff&size=128`;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground truncate">
                    {creator.name}
                  </h3>
                  {creator.username && (
                    <p className="text-xs text-muted-foreground truncate">
                      @{creator.username}
                    </p>
                  )}
                </div>
                {creator.platforms && creator.platforms.length > 0 && (
                  <PlatformIcons
                    platforms={creator.platforms}
                    username={creator.username}
                    max={5}
                    className="shrink-0"
                  />
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {creator.bio || "\u2014"}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <span>{formatFollowers(creator.followers)} followers</span>
                <span>&middot;</span>
                <span>{creator.engagementRate}% engagement</span>
              </div>
              <div className="mt-auto flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-lg text-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    openProfile(creator);
                  }}
                >
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  View Profile
                </Button>
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-blue-800 border-blue-400 hover:bg-blue-50 dark:text-blue-500 dark:border-blue-800 dark:hover:bg-blue-950/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePromoteOne(creator);
                    }}
                    disabled={isPromoting}
                  >
                    {isPromoting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5 mr-1" />}
                    {!isPromoting && "Directory"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCreatorFromList(selectedList.id, creator.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      {selectedList.creators.length === 0 && (
        <p className="text-muted-foreground text-sm py-6">
          No creators in this list yet. Add creators from Discover.
        </p>
      )}

      <BulkActionBar
        mode="list"
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onRemoveFromList={handleBulkRemove}
      />
    </>
  );
};

export default BrandLists;
