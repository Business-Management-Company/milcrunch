import React, { useState, useEffect, useCallback } from "react";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Search, Image, Video, Trash2, ChevronDown, ChevronRight,
  FolderOpen, Tag, Filter, Upload, Pencil, X,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface MediaRecord {
  id: string;
  user_id: string;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
  cadence_tag: string | null;
  campaign_id: string | null;
  created_at: string;
  tags: string[];
  campaign_name?: string;
}

interface CampaignSummary {
  id: string;
  name: string;
  media_count: number;
}

interface PendingUpload {
  file: File;
  previewUrl: string;
  name: string;
  tags: string[];
}

/* ─── Tag Input ────────────────────────────────────────────────── */
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (t && !tags.includes(t)) onChange([...tags, t]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
      setInput("");
    } else if (e.key === "Backspace" && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (text.includes(",")) {
      e.preventDefault();
      const parts = text.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      const unique = [...new Set([...tags, ...parts])];
      onChange(unique);
      setInput("");
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-border bg-background min-h-[38px] cursor-text"
      onClick={() => (document.getElementById("tag-input-field") as HTMLInputElement)?.focus()}
    >
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1B3A6B]/10 text-[#1B3A6B] text-xs font-medium dark:bg-[#1B3A6B]/20 dark:text-blue-300">
          {tag}
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(tags.filter((t) => t !== tag)); }}
            className="hover:text-red-500 transition-colors">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id="tag-input-field"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => { if (input.trim()) { addTag(input); setInput(""); } }}
        placeholder={tags.length === 0 ? "Type tags, press Enter or comma..." : ""}
        className="flex-1 min-w-[100px] text-xs bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

/* ─── Edit Modal ───────────────────────────────────────────────── */
function EditMediaModal({ item, onClose, onSave }: {
  item: MediaRecord;
  onClose: () => void;
  onSave: (id: string, filename: string, tags: string[]) => void;
}) {
  const [filename, setFilename] = useState(item.filename);
  const [tags, setTags] = useState<string[]>(item.tags ?? []);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("creator_media")
      .update({ filename, tags } as any)
      .eq("id", item.id);
    if (error) {
      toast.error("Failed to save changes");
      console.error("[EditMedia]", error);
    } else {
      onSave(item.id, filename, tags);
      toast.success("Changes saved");
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        {/* Preview */}
        <div className="h-48 bg-gray-100 dark:bg-gray-800 relative">
          {item.file_type === "video" ? (
            <video src={item.file_url} className="w-full h-full object-contain" muted />
          ) : (
            <img src={item.file_url} className="w-full h-full object-contain" alt={item.filename} />
          )}
          <button onClick={onClose} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Edit Media</h3>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Filename</Label>
            <Input value={filename} onChange={(e) => setFilename(e.target.value)} className="text-xs h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tags</Label>
            <TagInput tags={tags} onChange={setTags} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#1B3A6B] hover:bg-[#152d54] text-white text-xs">
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Upload Modal ─────────────────────────────────────────────── */
function UploadMediaModal({ pending, onClose, onUpload }: {
  pending: PendingUpload[];
  onClose: () => void;
  onUpload: (items: PendingUpload[]) => void;
}) {
  const [items, setItems] = useState<PendingUpload[]>(pending);
  const [uploading, setUploading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const updateItem = (idx: number, patch: Partial<PendingUpload>) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const current = items[activeIdx];

  const handleUpload = async () => {
    setUploading(true);
    await onUpload(items);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        {/* Preview */}
        <div className="h-56 bg-gray-100 dark:bg-gray-800 relative">
          {current?.file.type.startsWith("video/") ? (
            <video src={current.previewUrl} className="w-full h-full object-contain" muted controls />
          ) : (
            <img src={current?.previewUrl} className="w-full h-full object-contain" alt={current?.name} />
          )}
          <button onClick={onClose} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
            <X className="h-4 w-4" />
          </button>
          {items.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {items.map((_, i) => (
                <button key={i} onClick={() => setActiveIdx(i)}
                  className={`h-2 w-2 rounded-full transition-colors ${i === activeIdx ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Upload {items.length > 1 ? `(${activeIdx + 1} of ${items.length})` : "Media"}
            </h3>
            {items.length > 1 && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]"
                  disabled={activeIdx === 0} onClick={() => setActiveIdx(activeIdx - 1)}>Prev</Button>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]"
                  disabled={activeIdx === items.length - 1} onClick={() => setActiveIdx(activeIdx + 1)}>Next</Button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Filename</Label>
            <Input
              value={current?.name ?? ""}
              onChange={(e) => updateItem(activeIdx, { name: e.target.value })}
              className="text-xs h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tags</Label>
            <TagInput tags={current?.tags ?? []} onChange={(t) => updateItem(activeIdx, { tags: t })} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={handleUpload} disabled={uploading}
              className="bg-[#1B3A6B] hover:bg-[#152d54] text-white text-xs">
              {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
              {uploading ? "Uploading..." : `Upload${items.length > 1 ? ` ${items.length} Files` : ""}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────── */
export default function CreatorMediaLibrary({ noLayout }: { noLayout?: boolean } = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "image" | "video">("all");
  const [filterCadence, setFilterCadence] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [showUntagged, setShowUntagged] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [campaignsExpanded, setCampaignsExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<MediaRecord | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[] | null>(null);
  const uploadInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch media and campaigns
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    const fetchData = async () => {
      const { data: mediaData } = await supabase
        .from("creator_media")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const { data: campData } = await supabase
        .from("cadence_campaigns")
        .select("id, name")
        .or(`user_id.eq.${user.id},created_by.eq.${user.id}`)
        .order("created_at", { ascending: false });

      const records = (mediaData ?? []).map((r: any) => ({
        ...r,
        tags: Array.isArray(r.tags) ? r.tags : [],
      })) as MediaRecord[];

      const campMap = new Map((campData ?? []).map((c: any) => [c.id, c.name]));
      records.forEach((r) => {
        if (r.campaign_id && campMap.has(r.campaign_id)) {
          r.campaign_name = campMap.get(r.campaign_id);
        }
      });

      const countMap = new Map<string, number>();
      records.forEach((r) => {
        if (r.campaign_id) {
          countMap.set(r.campaign_id, (countMap.get(r.campaign_id) ?? 0) + 1);
        }
      });
      const summaries: CampaignSummary[] = (campData ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        media_count: countMap.get(c.id) ?? 0,
      }));

      setMedia(records);
      setCampaigns(summaries);
      setLoading(false);
    };

    fetchData();
  }, [user?.id]);

  const handleDelete = async (item: MediaRecord) => {
    if (!confirm(`Delete "${item.filename}"?`)) return;
    setDeleting(item.id);
    await supabase.from("creator_media").delete().eq("id", item.id);
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
    setDeleting(null);
    toast.success("File deleted");
  };

  const handleEditSave = useCallback((id: string, filename: string, tags: string[]) => {
    setMedia((prev) => prev.map((m) => m.id === id ? { ...m, filename, tags } : m));
  }, []);

  // File input now opens the pre-upload modal
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    const pending: PendingUpload[] = files.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      name: f.name,
      tags: [],
    }));
    setPendingUploads(pending);
  };

  // Actual upload after user confirms in modal
  const handleConfirmedUpload = async (items: PendingUpload[]) => {
    if (!user?.id) return;
    let count = 0;
    for (const item of items) {
      const ext = item.file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/media/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("post-media")
        .upload(path, item.file, { contentType: item.file.type });
      if (upErr) { console.error("[MediaLibrary] upload error:", upErr); continue; }
      const { data: urlData } = supabase.storage.from("post-media").getPublicUrl(path);
      const fileUrl = urlData.publicUrl;
      const { data: row, error: dbErr } = await supabase.from("creator_media").insert({
        user_id: user.id,
        filename: item.name,
        file_url: fileUrl,
        file_type: item.file.type.startsWith("video/") ? "video" : "image",
        file_size: item.file.size,
        tags: item.tags,
      } as any).select().single();
      if (dbErr) { console.error("[MediaLibrary] insert error:", dbErr); continue; }
      if (row) {
        const rec = { ...(row as any), tags: Array.isArray((row as any).tags) ? (row as any).tags : [] } as MediaRecord;
        setMedia((prev) => [rec, ...prev]);
      }
      count++;
    }
    // Revoke preview URLs
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setPendingUploads(null);
    if (count > 0) toast.success(`Uploaded ${count} file${count !== 1 ? "s" : ""}`);
  };

  // Get unique cadence tags for filter dropdown
  const allCadenceTags = [...new Set(media.filter((m) => m.cadence_tag).map((m) => m.cadence_tag!))];

  // Get unique user tags across all media
  const allUserTags = [...new Set(media.flatMap((m) => m.tags ?? []))].sort();

  // Apply filters
  const filtered = media.filter((m) => {
    if (searchQuery && !m.filename.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterType === "image" && m.file_type !== "image") return false;
    if (filterType === "video" && m.file_type !== "video") return false;
    if (filterCadence && m.cadence_tag !== filterCadence) return false;
    if (selectedCampaign && m.campaign_id !== selectedCampaign) return false;
    if (showUntagged && (m.tags?.length > 0 || m.cadence_tag)) return false;
    if (selectedTag && !(m.tags ?? []).includes(selectedTag)) return false;
    return true;
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const clearFilters = () => {
    setSelectedCampaign(null);
    setShowUntagged(false);
    setSelectedTag(null);
  };

  const Wrapper = noLayout ? ({ children }: { children: React.ReactNode }) => <>{children}</> : CreatorLayout;

  return (
    <Wrapper>
      <div className="flex h-[calc(100vh-64px)]">
        {/* LEFT SIDEBAR */}
        <div className="w-[240px] shrink-0 border-r border-border bg-card overflow-y-auto hidden lg:block">
          <div className="p-3 space-y-1">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="h-8 text-xs pl-8"
              />
            </div>

            {/* All Media */}
            <button
              onClick={clearFilters}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                !selectedCampaign && !showUntagged && !selectedTag
                  ? "bg-[#1B3A6B]/10 text-[#1B3A6B] dark:bg-[#1B3A6B]/20 dark:text-blue-300"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              All Media
              <span className="ml-auto text-xs text-muted-foreground">{media.length}</span>
            </button>

            {/* Campaign Media */}
            <div>
              <button
                onClick={() => setCampaignsExpanded(!campaignsExpanded)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {campaignsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Campaign Media
              </button>
              {campaignsExpanded && campaigns.map((camp) => (
                <button
                  key={camp.id}
                  onClick={() => { setSelectedCampaign(camp.id); setShowUntagged(false); setSelectedTag(null); }}
                  className={`w-full flex items-center gap-2.5 pl-9 pr-3 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedCampaign === camp.id
                      ? "bg-[#1B3A6B]/10 text-[#1B3A6B] font-medium dark:bg-[#1B3A6B]/20 dark:text-blue-300"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="truncate flex-1 text-left">{camp.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{camp.media_count}</span>
                </button>
              ))}
            </div>

            {/* Tags */}
            {allUserTags.length > 0 && (
              <div>
                <button
                  onClick={() => setTagsExpanded(!tagsExpanded)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {tagsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Tags
                </button>
                {tagsExpanded && allUserTags.map((tag) => {
                  const count = media.filter((m) => (m.tags ?? []).includes(tag)).length;
                  return (
                    <button
                      key={tag}
                      onClick={() => { setSelectedTag(tag); setShowUntagged(false); setSelectedCampaign(null); }}
                      className={`w-full flex items-center gap-2.5 pl-9 pr-3 py-1.5 rounded-lg text-xs transition-colors ${
                        selectedTag === tag
                          ? "bg-[#1B3A6B]/10 text-[#1B3A6B] font-medium dark:bg-[#1B3A6B]/20 dark:text-blue-300"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Tag className="h-3 w-3 shrink-0" />
                      <span className="truncate flex-1 text-left">{tag}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Untagged */}
            <button
              onClick={() => { setShowUntagged(true); setSelectedCampaign(null); setSelectedTag(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showUntagged
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Tag className="h-4 w-4" />
              Untagged
              <span className="ml-auto text-xs text-muted-foreground">
                {media.filter((m) => (!m.tags || m.tags.length === 0) && !m.cadence_tag).length}
              </span>
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-xl font-bold text-foreground">Media Library</h1>
                <p className="text-sm text-muted-foreground">
                  {filtered.length} file{filtered.length !== 1 ? "s" : ""}
                  {selectedCampaign && campaigns.find((c) => c.id === selectedCampaign) && (
                    <span> in {campaigns.find((c) => c.id === selectedCampaign)!.name}</span>
                  )}
                  {showUntagged && " without tags"}
                  {selectedTag && <span> tagged "{selectedTag}"</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  className="bg-[#1B3A6B] hover:bg-[#152d54] text-white text-xs"
                  onClick={() => uploadInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Upload Media
                </Button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Mobile search */}
              <div className="relative lg:hidden flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="h-8 text-xs pl-8"
                />
              </div>

              {/* Type filter */}
              <div className="flex items-center gap-0 rounded-lg border border-border overflow-hidden">
                {(["all", "image", "video"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      filterType === t
                        ? "bg-[#1B3A6B] text-white"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t === "all" ? "All" : t === "image" ? "Images" : "Videos"}
                  </button>
                ))}
              </div>

              {/* Cadence tag filter */}
              {allCadenceTags.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={filterCadence}
                    onChange={(e) => setFilterCadence(e.target.value)}
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">All cadences</option>
                    {allCadenceTags.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Active tag filter pill */}
              {selectedTag && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1B3A6B]/10 text-[#1B3A6B] text-xs font-medium dark:bg-[#1B3A6B]/20 dark:text-blue-300">
                  <Tag className="h-3 w-3" />
                  {selectedTag}
                  <button onClick={() => setSelectedTag(null)} className="hover:text-red-500 ml-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Image className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <h3 className="text-lg font-semibold text-muted-foreground">No media yet</h3>
                <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
                  Upload images and videos to build your media library
                </p>
                <Button
                  className="mt-4 text-xs bg-[#1B3A6B] hover:bg-[#152d54] text-white"
                  onClick={() => uploadInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Upload Media
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-xl border border-border overflow-hidden bg-card hover:shadow-md transition-shadow"
                  >
                    {/* Thumbnail */}
                    <div className="relative h-36 bg-gray-100 dark:bg-gray-800">
                      {item.file_type === "video" ? (
                        <>
                          {item.file_url ? (
                            <video src={item.file_url} className="w-full h-full object-cover" muted />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center">
                              <div className="ml-0.5 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[12px] border-l-white" />
                            </div>
                          </div>
                        </>
                      ) : (
                        item.file_url ? (
                          <img src={item.file_url} className="w-full h-full object-cover" alt={item.filename} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )
                      )}

                      {/* Type badge */}
                      <span className={`absolute bottom-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.file_type === "video"
                          ? "bg-purple-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}>
                        {item.file_type === "video" ? "REEL" : "IMAGE"}
                      </span>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <Button
                          size="sm"
                          className="bg-[#1B3A6B] hover:bg-[#152d54] text-white text-[11px] h-7 px-2.5"
                          onClick={() => navigate("/creator/post?tab=cadence")}
                        >
                          Use in Campaign
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white/90 hover:bg-white text-foreground text-[11px] h-7 px-2"
                          onClick={() => setEditItem(item)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="text-[11px] h-7 px-2"
                          onClick={() => handleDelete(item)}
                          disabled={deleting === item.id}
                        >
                          {deleting === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-3 py-2.5 space-y-1.5">
                      <p className="text-xs font-medium truncate" title={item.filename}>{item.filename}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{formatSize(item.file_size)}</span>
                        <span>&middot;</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.cadence_tag && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#1B3A6B]/10 text-[#1B3A6B] dark:bg-[#1B3A6B]/20 dark:text-blue-300">
                            {item.cadence_tag}
                          </span>
                        )}
                        {(item.tags ?? []).map((tag) => (
                          <span key={tag}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 cursor-pointer hover:bg-emerald-100"
                            onClick={() => { setSelectedTag(tag); setShowUntagged(false); setSelectedCampaign(null); }}
                          >
                            {tag}
                          </span>
                        ))}
                        {!item.cadence_tag && (!item.tags || item.tags.length === 0) && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                            Untagged
                          </span>
                        )}
                        {item.campaign_name && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                            {item.campaign_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editItem && (
        <EditMediaModal item={editItem} onClose={() => setEditItem(null)} onSave={handleEditSave} />
      )}

      {/* Upload Modal */}
      {pendingUploads && (
        <UploadMediaModal
          pending={pendingUploads}
          onClose={() => { pendingUploads.forEach((p) => URL.revokeObjectURL(p.previewUrl)); setPendingUploads(null); }}
          onUpload={handleConfirmedUpload}
        />
      )}
    </Wrapper>
  );
}
