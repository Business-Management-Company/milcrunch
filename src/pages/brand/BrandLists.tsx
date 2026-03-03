import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLists } from "@/contexts/ListContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { List, Trash2, ChevronRight, Plus, User, Globe, Loader2, ArrowLeft, Camera, Pencil, FolderPlus, ListPlus, Upload, Download, Mail, MailX, UserSearch, FileSpreadsheet, UserPlus, UserCheck } from "lucide-react";
import { cn, safeImageUrl } from "@/lib/utils";
import CreatorProfileModal from "@/components/CreatorProfileModal";
import BulkActionBar from "@/components/BulkActionBar";
import { fullEnrichCreatorProfile, logCreditUsage, type CreatorCard } from "@/lib/influencers-club";
import type { ListCreator } from "@/contexts/ListContext";
import { Progress } from "@/components/ui/progress";
import { detectBranch } from "@/lib/featured-creators";
import { fetchDirectoriesWithCounts, addToDirectory, type Directory } from "@/lib/directories";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseICCSV, importRowToListCreator, importRowToSupabaseItem, type ICImportRow } from "@/lib/csv-import";
import CSVImportModal from "@/components/brand/CSVImportModal";
import { syncBulkContacts, getEmailLists, addFullContact, upsertEmailList, getAllContacts } from "@/lib/email-db";
import type { EmailList } from "@/lib/email-types";

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


const BrandLists = () => {
  const { lists, createList, deleteList, renameList, updateListAvatar } = useLists();
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [imageTargetId, setImageTargetId] = useState<string | null>(null);
  const [imageUrlValue, setImageUrlValue] = useState("");
  const [newListName, setNewListName] = useState("");
  // Inline title/description editing for list detail
  const [editingListTitle, setEditingListTitle] = useState<string | false>(false);
  const [listTitleValue, setListTitleValue] = useState("");
  const [editingListDesc, setEditingListDesc] = useState(false);
  const [listDescValue, setListDescValue] = useState("");
  const [createAvatarUrl, setCreateAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createFileInputRef = useRef<HTMLInputElement>(null);

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
      setCreateAvatarUrl("");
    }
  }, [createModalOpen]);

  const handleCreateList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;

    const id = createList(trimmed);

    const avatarUrl = createAvatarUrl.trim();
    if (avatarUrl) {
      updateListAvatar(id, avatarUrl);
      await supabase.from("influencer_lists").update({ image_url: avatarUrl }).eq("id", id);
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
    const list = lists.find((l) => l.id === listId);
    setImageUrlValue(list?.avatar_url ?? "");
    setImageTargetId(listId);
  };

  const handleSaveImageUrl = async () => {
    if (!imageTargetId) return;
    const url = imageUrlValue.trim();
    if (!url) { toast.error("Please enter an image URL"); return; }
    updateListAvatar(imageTargetId, url);
    await supabase.from("influencer_lists").update({ image_url: url }).eq("id", imageTargetId);
    toast.success("List image updated");
    setImageTargetId(null);
    setImageUrlValue("");
  };

  const handleFileUpload = async (file: File, listId: string, setUrl: (url: string) => void) => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${listId}-${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("list-images")
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("list-images")
        .getPublicUrl(filePath);

      await supabase.from("influencer_lists").update({ image_url: publicUrl }).eq("id", listId);

      setUrl(publicUrl);
      toast.success("Image uploaded");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error("Upload failed: " + msg);
      console.error("[handleFileUpload]", err);
    } finally {
      setUploading(false);
    }
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
            {/* Avatar upload + URL */}
            <div className="space-y-3">
              <Label>Image (optional)</Label>
              <input
                ref={createFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const tempId = crypto.randomUUID();
                    handleFileUpload(file, tempId, setCreateAvatarUrl);
                  }
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => createFileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 flex items-center gap-3 hover:border-[#1e3a5f] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
                  {createAvatarUrl.trim() ? (
                    <img src={createAvatarUrl.trim()} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  ) : uploading ? (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <span className="text-sm text-gray-500">{uploading ? "Uploading..." : "Click to upload image"}</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                <span className="text-xs text-gray-400">or paste a URL</span>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
              </div>

              <Input
                id="create-avatar-url"
                placeholder="https://example.com/image.jpg"
                value={createAvatarUrl}
                onChange={(e) => setCreateAvatarUrl(e.target.value)}
                className="rounded-lg"
              />
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

      {/* Image URL dialog */}
      <Dialog open={!!imageTargetId} onOpenChange={(open) => { if (!open) { setImageTargetId(null); setImageUrlValue(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Change List Image</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {/* File upload area */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && imageTargetId) handleFileUpload(file, imageTargetId, setImageUrlValue);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center gap-2 hover:border-[#1e3a5f] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
              ) : (
                <Upload className="h-6 w-6 text-gray-400" />
              )}
              <span className="text-sm text-gray-500">{uploading ? "Uploading..." : "Click to upload image"}</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
              <span className="text-xs text-gray-400">or paste a URL</span>
              <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
            </div>

            <Input
              id="image-url-input"
              placeholder="https://example.com/image.jpg"
              value={imageUrlValue}
              onChange={(e) => setImageUrlValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveImageUrl(); } }}
              className="rounded-lg"
            />
            {imageUrlValue.trim() && (
              <div className="mt-1 flex justify-center">
                <img src={imageUrlValue.trim()} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-gray-200" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setImageTargetId(null); setImageUrlValue(""); }} className="rounded-lg">Cancel</Button>
            <Button onClick={handleSaveImageUrl} disabled={!imageUrlValue.trim() || uploading} className="rounded-lg bg-[#1e3a5f] hover:bg-[#2d5282]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          {(lists ?? []).map((list) => (
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
                      {(list.creators ?? []).length > 0 && (
                        <div className="flex -space-x-2">
                          {(list.creators ?? []).slice(0, 4).map((member, i) => (
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
                        {(list.creators ?? []).length} creator{(list.creators ?? []).length !== 1 ? "s" : ""}
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
          {(lists ?? []).map((list) => (
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
                {(list.creators ?? []).length > 0 && (
                  <div className="flex -space-x-1.5">
                    {(list.creators ?? []).slice(0, 4).map((member, i) => (
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
                <span className="text-xs text-gray-400">{(list.creators ?? []).length} creator{(list.creators ?? []).length !== 1 ? "s" : ""}</span>
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
  const { lists, addCreatorToList, addCreatorsToList, removeCreatorFromList, renameList, updateCreatorInList } = useLists();
  const { effectiveUserId } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileCreator, setProfileCreator] = useState<CreatorCard | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [editingListTitle, setEditingListTitle] = useState<string | false>(false);
  const [listTitleValue, setListTitleValue] = useState("");
  const [editingListDesc, setEditingListDesc] = useState(false);
  const [listDescValue, setListDescValue] = useState("");
  // Export & enrichment state
  const [enrichConfirmOpen, setEnrichConfirmOpen] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState(0);
  const [enrichTotal, setEnrichTotal] = useState(0);
  // CSV Import state
  const [csvImportRows, setCsvImportRows] = useState<ICImportRow[]>([]);
  const [csvSkippedRows, setCsvSkippedRows] = useState(0);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvImportProgress, setCsvImportProgress] = useState(0);
  const csvInputRef = useRef<HTMLInputElement>(null);
  // Add to Email List state
  const [addToEmailOpen, setAddToEmailOpen] = useState(false);
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [selectedEmailListId, setSelectedEmailListId] = useState("");
  const [addingToEmailList, setAddingToEmailList] = useState(false);
  // Add to Contacts state
  const [contactEmailSet, setContactEmailSet] = useState<Set<string>>(new Set());
  const [addToContactsOpen, setAddToContactsOpen] = useState(false);
  const [addToContactsMode, setAddToContactsMode] = useState<"single" | "bulk">("bulk");
  const [singleContactCreator, setSingleContactCreator] = useState<ListCreator | null>(null);
  const [contactEmailLists, setContactEmailLists] = useState<EmailList[]>([]);
  const [selectedContactListId, setSelectedContactListId] = useState("");
  const [newContactListName, setNewContactListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [addingContacts, setAddingContacts] = useState(false);

  const selectedList = Array.isArray(lists) ? (lists.find((l) => l.id === listId) ?? null) : null;
  const creators = Array.isArray(selectedList?.creators) ? selectedList.creators : [];

  useEffect(() => {
    setSelectedIds(new Set());
  }, [listId]);

  useEffect(() => {
    if (selectedList) {
      setListTitleValue(selectedList.name);
      setListDescValue("");
    }
  }, [selectedList?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDirectoriesWithCounts().then(setDirectories);
  }, []);

  // Load contact status to show badges
  useEffect(() => {
    getAllContacts().then((contacts) => {
      setContactEmailSet(new Set(contacts.map((c) => c.email.toLowerCase())));
    }).catch(() => {});
  }, []);

  const handleBulkAddToDirectory = async (dirId: string) => {
    if (creators.length === 0) return;
    const rows = creators.map((c) => ({
      directory_id: dirId,
      creator_handle: (c.username ?? c.id).replace(/^@/, "").trim(),
      creator_name: c.name,
      avatar_url: c.avatar || null,
      follower_count: c.followers ?? null,
      engagement_rate: c.engagementRate ?? null,
      platform: c.platforms?.[0] ?? "instagram",
      branch: detectBranch(c.bio ?? "") || null,
    }));
    const { error } = await supabase
      .from("directory_members")
      .upsert(rows, { onConflict: "directory_id,creator_handle", ignoreDuplicates: true });
    const dirName = directories.find((d) => d.id === dirId)?.name ?? "directory";
    if (error) {
      toast.error(`Failed to add creators to ${dirName}`);
    } else {
      toast.success(`Added ${creators.length} creator${creators.length !== 1 ? "s" : ""} to ${dirName}`);
    }
  };

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
    if (selectedIds.size === creators.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(creators.map((c) => c.id)));
  };

  const handleBulkRemove = () => {
    if (!selectedList) return;
    selectedIds.forEach((id) => removeCreatorFromList(selectedList.id, id));
    toast.success(`Removed ${selectedIds.size} creator${selectedIds.size !== 1 ? "s" : ""} from list`);
    setSelectedIds(new Set());
  };

  const downloadCsv = (rows: string[][], filename: string) => {
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const escCsv = (val: string) => `"${(val ?? "").replace(/"/g, '""')}"`;

  const handleExportCsv = () => {
    if (!selectedList || creators.length === 0) return;
    const rows: string[][] = [
      ["Name", "Username", "Email", "Platform", "Followers", "Engagement Rate", "Bio", "Location"],
    ];
    for (const c of creators) {
      rows.push([
        escCsv(c.name),
        c.username ?? "",
        c.email ?? "",
        c.platforms?.[0] ?? "instagram",
        String(c.followers ?? 0),
        String(c.engagementRate ?? 0),
        escCsv(c.bio ?? ""),
        escCsv(c.location ?? ""),
      ]);
    }
    downloadCsv(rows, `${selectedList.name.replace(/\s+/g, "_")}_creators.csv`);
    toast.success("CSV exported");
  };

  const handleExportWithEmails = async () => {
    if (!selectedList || !listId) return;
    setEnrichConfirmOpen(false);
    setEnriching(true);
    const toEnrich = creators.filter((c) => !c.email && c.username);
    setEnrichTotal(toEnrich.length);
    setEnrichProgress(0);
    let found = 0;
    for (let i = 0; i < toEnrich.length; i++) {
      const c = toEnrich[i];
      setEnrichProgress(i + 1);
      try {
        updateCreatorInList(listId, c.id, { enrichmentStatus: "pending" });
        const data = await fullEnrichCreatorProfile(c.username!, undefined, c.platforms?.[0] ?? "instagram");
        const email = data?.result?.email as string | undefined;
        if (email) {
          updateCreatorInList(listId, c.id, { email, enrichmentStatus: "enriched" });
          found++;
        } else {
          updateCreatorInList(listId, c.id, { enrichmentStatus: "no_email" });
        }
        if (effectiveUserId) {
          logCreditUsage(effectiveUserId, "full_enrichment", 1.03, { handle: c.username });
        }
      } catch (err) {
        console.error("[ExportWithEmails] Error enriching", c.username, err);
        updateCreatorInList(listId, c.id, { enrichmentStatus: "no_email" });
      }
    }
    setEnriching(false);
    const alreadyHad = creators.filter((c) => !!c.email).length;
    toast.success(`Found emails for ${found} of ${toEnrich.length} creators (${alreadyHad + found} total with email)`);
    // Auto-download CSV after enrichment
    setTimeout(() => handleExportCsv(), 300);
  };

  /* ── CSV Import handlers ─────────────────────────────────── */

  const handleCSVFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const result = parseICCSV(text);
      if (result.rows.length === 0) {
        toast.error("No valid creator rows found in CSV. Check that the file has 'username' or 'full_name' columns.");
        return;
      }
      setCsvImportRows(result.rows);
      setCsvSkippedRows(result.skippedRows);
      setCsvImportOpen(true);
    };
    reader.onerror = () => toast.error("Failed to read CSV file.");
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleCSVImportConfirm = async () => {
    if (!selectedList || !listId || csvImportRows.length === 0) return;
    setCsvImporting(true);
    setCsvImportProgress(0);

    // Deduplicate against existing list members by username
    const existingUsernames = new Set(
      creators.map((c) => c.username?.toLowerCase()).filter(Boolean)
    );
    const newRows = csvImportRows.filter((row) => {
      if (!row.handle) return true;
      return !existingUsernames.has(row.handle.toLowerCase());
    });
    const duplicateCount = csvImportRows.length - newRows.length;

    // Add to ListContext in batch
    const listCreators = newRows.map(importRowToListCreator);
    addCreatorsToList(listId, listCreators);
    setCsvImportProgress(40);

    // Upsert into Supabase influencer_list_items
    const supabaseRows = newRows.map((row) => importRowToSupabaseItem(row, listId));
    if (supabaseRows.length > 0) {
      const sb = supabase as any;
      const { error } = await sb
        .from("influencer_list_items")
        .upsert(supabaseRows, { onConflict: "list_id,handle", ignoreDuplicates: true });
      if (error) {
        console.error("[CSVImport] Supabase upsert error:", error);
      }
    }
    setCsvImportProgress(100);

    // Summary toast
    const withEmails = newRows.filter((r) => r.contact_email).length;
    const parts = [`Imported ${newRows.length} creator${newRows.length !== 1 ? "s" : ""}`];
    if (withEmails > 0) parts.push(`${withEmails} with emails`);
    if (duplicateCount > 0) parts.push(`${duplicateCount} duplicate${duplicateCount !== 1 ? "s" : ""} skipped`);
    toast.success(parts.join(" \u00b7 "));

    setCsvImporting(false);
    setCsvImportOpen(false);
    setCsvImportRows([]);
    setCsvSkippedRows(0);
  };

  /* ── Add All to Email List handlers ──────────────────────── */

  const handleOpenAddToEmailList = async () => {
    const lists = await getEmailLists();
    setEmailLists(lists);
    setSelectedEmailListId("");
    setAddToEmailOpen(true);
  };

  const handleAddAllToEmailList = async () => {
    if (!selectedEmailListId) return;
    setAddingToEmailList(true);
    const withEmails = creators.filter((c) => c.email);
    const contacts = withEmails.map((c) => {
      const nameParts = c.name.split(" ");
      return {
        email: c.email!,
        first_name: nameParts[0] || undefined,
        last_name: nameParts.slice(1).join(" ") || undefined,
        source: "import" as const,
      };
    });
    const result = await syncBulkContacts(selectedEmailListId, contacts);
    const elName = emailLists.find((l) => l.id === selectedEmailListId)?.name ?? "list";
    toast.success(`Added ${result.inserted} contact${result.inserted !== 1 ? "s" : ""} to ${elName}${result.duplicates > 0 ? ` (${result.duplicates} already existed)` : ""}`);
    // Update contact status badges
    setContactEmailSet((prev) => {
      const next = new Set(prev);
      withEmails.forEach((c) => next.add(c.email!.toLowerCase()));
      return next;
    });
    setAddingToEmailList(false);
    setAddToEmailOpen(false);
  };

  /* ── Add to Contacts handlers ────────────────────────────── */

  const creatorToContactPayload = (c: ListCreator) => {
    const nameParts = (c.name || "").split(" ");
    return {
      email: c.email!,
      first_name: nameParts[0] || undefined,
      last_name: nameParts.slice(1).join(" ") || undefined,
      source: "creator" as const,
      metadata: {
        username: c.username,
        platform: c.platforms?.[0] ?? "instagram",
        followers: c.followers,
        engagement_rate: c.engagementRate,
        avatar: c.avatar,
        location: c.location,
        bio: c.bio,
        imported_from_list: selectedList?.name,
      },
    };
  };

  const handleOpenSingleAddToContacts = async (creator: ListCreator) => {
    if (!creator.email) {
      toast.error("No email available — enrich this creator first");
      return;
    }
    if (contactEmailSet.has(creator.email.toLowerCase())) {
      toast("Already a contact", { description: `${creator.email} is already in your contacts` });
      return;
    }
    setSingleContactCreator(creator);
    setAddToContactsMode("single");
    const lists = await getEmailLists();
    setContactEmailLists(lists);
    setSelectedContactListId("");
    setNewContactListName("");
    setAddToContactsOpen(true);
  };

  const handleOpenBulkAddToContacts = async () => {
    const withEmails = creators.filter((c) => c.email);
    if (withEmails.length === 0) {
      toast.error("No creators have emails — enrich first");
      return;
    }
    setSingleContactCreator(null);
    setAddToContactsMode("bulk");
    const lists = await getEmailLists();
    setContactEmailLists(lists);
    setSelectedContactListId("");
    setNewContactListName("");
    setAddToContactsOpen(true);
  };

  const handleCreateContactList = async () => {
    const name = newContactListName.trim();
    if (!name) return;
    setCreatingList(true);
    const result = await upsertEmailList({ name });
    if (result) {
      setContactEmailLists((prev) => [result, ...prev]);
      setSelectedContactListId(result.id);
      setNewContactListName("");
      toast.success(`Created list "${name}"`);
    } else {
      toast.error("Failed to create list");
    }
    setCreatingList(false);
  };

  const handleConfirmAddToContacts = async () => {
    if (!selectedContactListId) {
      toast.error("Select an email list first");
      return;
    }
    setAddingContacts(true);

    if (addToContactsMode === "single" && singleContactCreator) {
      const payload = creatorToContactPayload(singleContactCreator);
      const result = await addFullContact({ list_id: selectedContactListId, ...payload });
      if (result) {
        setContactEmailSet((prev) => new Set([...prev, singleContactCreator.email!.toLowerCase()]));
        const listName = contactEmailLists.find((l) => l.id === selectedContactListId)?.name ?? "list";
        toast.success(`${singleContactCreator.name} added to ${listName}`);
      } else {
        toast.error("Failed to add contact — may already exist in this list");
      }
    } else {
      const withEmails = creators.filter((c) => c.email);
      const noEmail = creators.length - withEmails.length;
      const contacts = withEmails.map(creatorToContactPayload);
      const result = await syncBulkContacts(selectedContactListId, contacts);
      const listName = contactEmailLists.find((l) => l.id === selectedContactListId)?.name ?? "list";
      toast.success(
        `Added ${result.inserted} of ${creators.length} creators as contacts to ${listName}` +
        (noEmail > 0 ? ` (${noEmail} skipped — no email)` : "") +
        (result.duplicates > 0 ? ` (${result.duplicates} already existed)` : "")
      );
      setContactEmailSet((prev) => {
        const next = new Set(prev);
        withEmails.forEach((c) => next.add(c.email!.toLowerCase()));
        return next;
      });
    }

    setAddingContacts(false);
    setAddToContactsOpen(false);
  };

  if (!selectedList) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">List not found.</p>
        <Button variant="outline" onClick={() => navigate('/lists')} data-back-nav>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Lists
        </Button>
      </div>
    );
  }

  console.log("selectedList:", selectedList);

  return (
    <>
      <CreatorProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        creator={profileCreator}
      />
      {/* CSV Import modal */}
      <CSVImportModal
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        listName={selectedList?.name ?? ""}
        rows={csvImportRows}
        skippedRows={csvSkippedRows}
        importing={csvImporting}
        importProgress={csvImportProgress}
        onConfirm={handleCSVImportConfirm}
      />
      {/* Add All to Email List dialog */}
      <Dialog open={addToEmailOpen} onOpenChange={setAddToEmailOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Add Creators to Email List
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {creators.filter((c) => c.email).length} of {creators.length} creators have emails.
              Select a list to add them to:
            </p>
            <Select value={selectedEmailListId} onValueChange={setSelectedEmailListId}>
              <SelectTrigger><SelectValue placeholder="Select an email list" /></SelectTrigger>
              <SelectContent>
                {emailLists.length === 0 ? (
                  <SelectItem value="__none" disabled>No email lists found</SelectItem>
                ) : (
                  emailLists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddAllToEmailList}
              disabled={!selectedEmailListId || addingToEmailList}
              className="w-full bg-[#1e3a5f] hover:bg-[#2d5282]"
            >
              {addingToEmailList && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add {creators.filter((c) => c.email).length} Contacts
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Add to Contacts dialog */}
      <Dialog open={addToContactsOpen} onOpenChange={setAddToContactsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {addToContactsMode === "single"
                ? `Add ${singleContactCreator?.name ?? "Creator"} to Contacts`
                : "Add All to Contacts"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {addToContactsMode === "bulk" && (
              <p className="text-sm text-muted-foreground">
                {creators.filter((c) => c.email).length} of {creators.length} creators have emails
                and will be added as contacts.
              </p>
            )}
            <div className="space-y-2">
              <Label>Email List</Label>
              <Select value={selectedContactListId} onValueChange={setSelectedContactListId}>
                <SelectTrigger><SelectValue placeholder="Select an email list" /></SelectTrigger>
                <SelectContent>
                  {contactEmailLists.length === 0 ? (
                    <SelectItem value="__none" disabled>No email lists yet — create one below</SelectItem>
                  ) : (
                    contactEmailLists.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="New list name..."
                value={newContactListName}
                onChange={(e) => setNewContactListName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateContactList(); } }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!newContactListName.trim() || creatingList}
                onClick={handleCreateContactList}
              >
                {creatingList ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              onClick={handleConfirmAddToContacts}
              disabled={!selectedContactListId || addingContacts}
              className="w-full bg-[#1e3a5f] hover:bg-[#2d5282]"
            >
              {addingContacts && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {addToContactsMode === "single"
                ? "Add Contact"
                : `Add ${creators.filter((c) => c.email).length} Contacts`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Export with Emails confirmation dialog */}
      <Dialog open={enrichConfirmOpen} onOpenChange={setEnrichConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserSearch className="h-5 w-5 text-blue-700" />
              Export with Emails
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            {(() => {
              const needEnrich = creators.filter((c) => !c.email && c.username).length;
              const alreadyHave = creators.filter((c) => !!c.email).length;
              return (
                <>
                  <p className="text-sm text-muted-foreground">
                    This will use the full enrichment API to retrieve emails for creators in this list.
                  </p>
                  {alreadyHave > 0 && (
                    <p className="text-sm text-green-700 dark:text-green-400">
                      {alreadyHave} creator{alreadyHave !== 1 ? "s" : ""} already have email — they will be skipped.
                    </p>
                  )}
                  <p className="text-sm font-medium">
                    <span className="font-bold">{needEnrich}</span> creator{needEnrich !== 1 ? "s" : ""} to enrich
                    {" "}&middot;{" "}
                    <span className="font-bold text-blue-700">{(needEnrich * 1.03).toFixed(2)} credits</span> (1.03/creator)
                  </p>
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEnrichConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleExportWithEmails} className="bg-blue-700 hover:bg-blue-800 text-white">
              <Mail className="h-4 w-4 mr-1" />
              Enrich & Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Enrichment progress bar */}
      {enriching && (
        <div className="mb-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Enriching creators...
            </span>
            <span className="text-sm text-blue-600 dark:text-blue-400">{enrichProgress} of {enrichTotal}</span>
          </div>
          <Progress value={enrichTotal > 0 ? (enrichProgress / enrichTotal) * 100 : 0} className="h-2" />
        </div>
      )}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/lists')}
          data-back-nav
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
                  {listDescValue || `${creators.length} creator${creators.length !== 1 ? "s" : ""} · Click to add a description`}
                  <span className="opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity">
                    <Pencil className="h-3.5 w-3.5" />
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Hidden CSV file input */}
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCSVFilePick}
            />
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => csvInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Import CSV
            </Button>
            {creators.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={handleExportCsv}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export CSV
              </Button>
            )}
            {creators.length > 0 && (
              <Button
                size="sm"
                className="rounded-lg bg-blue-700 hover:bg-blue-800 text-white"
                onClick={() => setEnrichConfirmOpen(true)}
                disabled={enriching}
              >
                {enriching ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Mail className="h-3.5 w-3.5 mr-1.5" />}
                Export with Emails
              </Button>
            )}
            {creators.length > 0 && directories.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-blue-800 border-blue-400 hover:bg-blue-50 dark:text-blue-500 dark:border-blue-800 dark:hover:bg-blue-950/30"
                  >
                    <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
                    Add All to Directory
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {directories.map((d) => (
                    <DropdownMenuItem key={d.id} onClick={() => handleBulkAddToDirectory(d.id)}>
                      {d.name}
                      {d.member_count != null && <span className="ml-auto text-xs text-gray-400 pl-4">{d.member_count}</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {creators.some((c) => c.email) && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg text-green-700 border-green-400 hover:bg-green-50 dark:text-green-500 dark:border-green-800 dark:hover:bg-green-950/30"
                onClick={handleOpenAddToEmailList}
              >
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Add All to Email List
              </Button>
            )}
            {creators.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg text-emerald-700 border-emerald-400 hover:bg-emerald-50 dark:text-emerald-500 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
                onClick={handleOpenBulkAddToContacts}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Add All to Contacts
              </Button>
            )}
            {creators.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === creators.length}
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
        {creators.map((creator) => {
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
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-medium text-foreground truncate">
                      {creator.name}
                    </h3>
                    {creator.enrichmentStatus === "enriched" && creator.email && (
                      <Mail className="h-3.5 w-3.5 text-green-600 shrink-0" title={`Email: ${creator.email}`} />
                    )}
                    {creator.enrichmentStatus === "no_email" && (
                      <MailX className="h-3.5 w-3.5 text-gray-400 shrink-0" title="No email found" />
                    )}
                    {creator.enrichmentStatus === "pending" && (
                      <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0" />
                    )}
                    {creator.importSource === "influencers_club" && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 shrink-0"
                      >
                        IC Import
                      </Badge>
                    )}
                    {creator.email && contactEmailSet.has(creator.email.toLowerCase()) && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0"
                      >
                        <UserCheck className="h-2.5 w-2.5 mr-0.5" />
                        Contact
                      </Badge>
                    )}
                  </div>
                  {creator.username && (
                    <p className="text-xs text-muted-foreground truncate">
                      @{creator.username}
                    </p>
                  )}
                  {creator.email && (
                    <a href={`mailto:${creator.email}`} className="text-[11px] text-blue-600 hover:underline truncate block">
                      {creator.email}
                    </a>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {creator.bio || "\u2014"}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <span>{formatFollowers(creator.followers ?? 0)} followers</span>
                <span>&middot;</span>
                <span>{(creator as Record<string, unknown>).avgLikes != null ? formatFollowers(Number((creator as Record<string, unknown>).avgLikes)) : "—"} avg likes</span>
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
                {/* Add to List dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="rounded-lg text-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10">
                      <ListPlus className="h-3.5 w-3.5 mr-1" />
                      Add to List
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    {(lists ?? []).filter((l) => l.id !== listId).map((l) => (
                      <DropdownMenuItem key={l.id} onClick={() => {
                        addCreatorToList(l.id, creator);
                        toast.success(`Added ${creator.name} to ${l.name}`);
                      }}>
                        {l.name}
                      </DropdownMenuItem>
                    ))}
                    {(lists ?? []).filter((l) => l.id !== listId).length === 0 && (
                      <DropdownMenuItem disabled>No other lists</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Add to Directory dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="rounded-lg text-blue-800 border-blue-400 hover:bg-blue-50 dark:text-blue-500 dark:border-blue-800 dark:hover:bg-blue-950/30">
                      <FolderPlus className="h-3.5 w-3.5 mr-1" />
                      Add to Directory
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    {directories.map((d) => (
                      <DropdownMenuItem key={d.id} onClick={async () => {
                        const handle = (creator.username ?? creator.id).replace(/^@/, "").trim();
                        const { error } = await addToDirectory(d.id, {
                          handle,
                          display_name: creator.name,
                          platform: creator.platforms?.[0] ?? "instagram",
                          avatar_url: creator.avatar || null,
                          follower_count: creator.followers ?? null,
                          bio: creator.bio || null,
                          branch: detectBranch(creator.bio ?? "") || null,
                          platforms: creator.platforms || [],
                          added_by: effectiveUserId ?? null,
                        });
                        if (error) {
                          toast.error(`Failed to add to ${d.name}: ${error}`);
                        } else {
                          toast.success(`${creator.name} added to ${d.name}`);
                        }
                      }}>
                        {d.name}
                        {d.member_count != null && <span className="ml-auto text-xs text-gray-400 pl-4">{d.member_count}</span>}
                      </DropdownMenuItem>
                    ))}
                    {directories.length === 0 && (
                      <DropdownMenuItem disabled>No directories</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Add to Contacts */}
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "rounded-lg",
                    creator.email && contactEmailSet.has(creator.email.toLowerCase())
                      ? "text-emerald-600 border-emerald-300 cursor-default opacity-70"
                      : "text-emerald-700 border-emerald-400 hover:bg-emerald-50 dark:text-emerald-500 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
                  )}
                  disabled={!!(creator.email && contactEmailSet.has(creator.email.toLowerCase()))}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenSingleAddToContacts(creator);
                  }}
                  title={
                    !creator.email
                      ? "No email — enrich first"
                      : contactEmailSet.has(creator.email.toLowerCase())
                        ? "Already a contact"
                        : "Add to email contacts"
                  }
                >
                  {creator.email && contactEmailSet.has(creator.email.toLowerCase()) ? (
                    <><UserCheck className="h-3.5 w-3.5 mr-1" /> Contact</>
                  ) : (
                    <><UserPlus className="h-3.5 w-3.5 mr-1" /> Add to Contacts</>
                  )}
                </Button>
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
      {creators.length === 0 && (
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
