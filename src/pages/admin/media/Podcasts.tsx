import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Plus,
  Upload,
  Search,
  MoreVertical,
  Pencil,
  RefreshCw,
  Trash2,
  Loader2,
  Mic2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { parsePodcastFeed, type ParsedPodcastFeed } from "@/lib/podcast-feed";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type PodcastRow = Database["public"]["Tables"]["podcasts"]["Row"];
const CATEGORIES = ["Military", "Veterans", "Fitness", "News & Politics", "Comedy", "Lifestyle", "Education", "Business", "Other"];
const PAGE_SIZE = 25;

function parseCSV(text: string): { feed_url: string; title?: string; category?: string; author?: string }[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const feedUrlIdx = header.findIndex((h) => h === "feed_url" || h === "feed url");
  if (feedUrlIdx === -1) return [];
  const titleIdx = header.findIndex((h) => h === "title");
  const categoryIdx = header.findIndex((h) => h === "category");
  const authorIdx = header.findIndex((h) => h === "author");
  const rows: { feed_url: string; title?: string; category?: string; author?: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].match(/("([^"]*)")|([^,]+)/g)?.map((v) => v?.replace(/^"|"$/g, "").trim() ?? "") ?? [];
    const feed_url = values[feedUrlIdx]?.trim();
    if (!feed_url) continue;
    rows.push({
      feed_url,
      title: titleIdx >= 0 ? values[titleIdx]?.trim() : undefined,
      category: categoryIdx >= 0 ? values[categoryIdx]?.trim() : undefined,
      author: authorIdx >= 0 ? values[authorIdx]?.trim() : undefined,
    });
  }
  return rows;
}

export default function AdminPodcasts() {
  const [podcasts, setPodcasts] = useState<PodcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<keyof PodcastRow>("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const [stats, setStats] = useState({ total: 0, active: 0, episodes: 0 });
  const [addOpen, setAddOpen] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");
  const [fetchingFeed, setFetchingFeed] = useState(false);
  const [preview, setPreview] = useState<ParsedPodcastFeed | null>(null);
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingPodcast, setEditingPodcast] = useState<PodcastRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<PodcastRow>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editRefreshing, setEditRefreshing] = useState(false);

  const [csvOpen, setCsvOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<{ feed_url: string; title?: string; category?: string; author?: string }[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvProgress, setCsvProgress] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<PodcastRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPodcasts = useCallback(async () => {
    const { data, error } = await supabase
      .from("podcasts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setPodcasts(data ?? []);
  }, []);

  const fetchStats = useCallback(async () => {
    const [pRes, eRes] = await Promise.all([
      supabase.from("podcasts").select("id, status", { count: "exact", head: true }),
      supabase.from("podcast_episodes").select("id", { count: "exact", head: true }),
    ]);
    const total = pRes.count ?? 0;
    const { count: active } = await supabase
      .from("podcasts")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    setStats({
      total,
      active: active ?? 0,
      episodes: eRes.count ?? 0,
    });
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchPodcasts();
      await fetchStats();
      setLoading(false);
    })();
  }, [fetchPodcasts, fetchStats]);

  const filtered = podcasts.filter((p) => {
    if (search && !(p.title ?? "").toLowerCase().includes(search.toLowerCase()) &&
        !(p.author ?? "").toLowerCase().includes(search.toLowerCase()) &&
        !(p.feed_url ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && (p.category ?? "") !== categoryFilter) return false;
    if (statusFilter !== "all" && (p.status ?? "active") !== statusFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    if (va == null && vb == null) return 0;
    if (va == null) return sortDir === "asc" ? 1 : -1;
    if (vb == null) return sortDir === "asc" ? -1 : 1;
    const cmp = typeof va === "string" ? (va as string).localeCompare(vb as string) : (va as number) - (vb as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleAddFetch = async () => {
    const url = feedUrl.trim();
    if (!url) {
      toast.error("Enter a feed URL");
      return;
    }
    setFetchingFeed(true);
    setPreview(null);
    try {
      const parsed = await parsePodcastFeed(url);
      if (!parsed) {
        toast.error("Could not fetch or parse the feed. Check the URL and try again.");
        return;
      }
      setPreview(parsed);
      toast.success("Feed parsed. Review and save.");
    } catch (e) {
      toast.error("Failed to parse feed");
    } finally {
      setFetchingFeed(false);
    }
  };

  const saveEpisodes = async (podcastId: string, episodes: ParsedPodcastFeed["episodes"]) => {
    if (episodes.length === 0) return;
    await supabase.from("podcast_episodes").delete().eq("podcast_id", podcastId);
    const toInsert = episodes.map((ep) => ({
      podcast_id: podcastId,
      title: ep.title || null,
      description: ep.description || null,
      audio_url: ep.audioUrl || null,
      duration: ep.duration || null,
      published_at: ep.publishedAt ? new Date(ep.publishedAt).toISOString() : null,
      episode_artwork_url: ep.artworkUrl || null,
    }));
    await supabase.from("podcast_episodes").insert(toInsert);
  };

  const handleAddSave = async () => {
    if (!preview) return;
    const url = feedUrl.trim();
    setSaving(true);
    try {
      const { data: inserted, error } = await supabase
        .from("podcasts")
        .insert({
          feed_url: url,
          title: preview.title || null,
          description: preview.description || null,
          author: preview.author || null,
          artwork_url: preview.artworkUrl || null,
          website_url: preview.websiteUrl || null,
          category: null,
          language: preview.language || "en",
          episode_count: preview.episodeCount,
          last_episode_date: preview.lastEpisodeDate ? new Date(preview.lastEpisodeDate).toISOString() : null,
          status: "active",
        })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") {
          toast.error("A podcast with this feed URL already exists.");
        } else {
          toast.error(error.message);
        }
        return;
      }
      if (inserted && preview.episodes.length > 0) {
        await saveEpisodes(inserted.id, preview.episodes);
      }
      toast.success("Podcast added.");
      setAddOpen(false);
      setFeedUrl("");
      setPreview(null);
      await fetchPodcasts();
      await fetchStats();
    } finally {
      setSaving(false);
    }
  };

  const handleCSVPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const rows = parseCSV(text);
      setCsvRows(rows);
      setCsvOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCSVImport = async () => {
    if (csvRows.length === 0) return;
    setCsvImporting(true);
    let done = 0;
    for (const row of csvRows) {
      const { error } = await supabase.from("podcasts").upsert(
        {
          feed_url: row.feed_url,
          title: row.title ?? null,
          category: row.category ?? null,
          author: row.author ?? null,
          status: "active",
        },
        { onConflict: "feed_url" }
      );
      if (!error) done++;
      setCsvProgress(Math.round((done / csvRows.length) * 100));
    }
    setCsvImporting(false);
    setCsvProgress(100);
    toast.success(`Imported ${done} of ${csvRows.length} feeds.`);
    setCsvOpen(false);
    setCsvRows([]);
    await fetchPodcasts();
    await fetchStats();
  };

  const handleRefreshFeed = async (row: PodcastRow) => {
    const parsed = await parsePodcastFeed(row.feed_url);
    if (!parsed) {
      toast.error("Could not refresh feed.");
      return;
    }
    const { error } = await supabase
      .from("podcasts")
      .update({
        title: parsed.title || row.title,
        description: parsed.description ?? row.description,
        author: parsed.author ?? row.author,
        artwork_url: parsed.artworkUrl ?? row.artwork_url,
        website_url: parsed.websiteUrl ?? row.website_url,
        language: parsed.language || row.language,
        episode_count: parsed.episodeCount,
        last_episode_date: parsed.lastEpisodeDate ? new Date(parsed.lastEpisodeDate).toISOString() : null,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (parsed.episodes.length > 0) await saveEpisodes(row.id, parsed.episodes);
    toast.success("Feed refreshed.");
    await fetchPodcasts();
    await fetchStats();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("podcasts").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Podcast removed.");
    await fetchPodcasts();
    await fetchStats();
  };

  const openEdit = (row: PodcastRow) => {
    setEditingPodcast(row);
    setEditForm({
      title: row.title ?? "",
      author: row.author ?? "",
      description: row.description ?? "",
      category: row.category ?? "",
      artwork_url: row.artwork_url ?? "",
      website_url: row.website_url ?? "",
      status: row.status ?? "active",
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingPodcast) return;
    setEditSaving(true);
    const { error } = await supabase
      .from("podcasts")
      .update({
        title: editForm.title || null,
        author: editForm.author || null,
        description: editForm.description || null,
        category: editForm.category || null,
        artwork_url: editForm.artwork_url || null,
        website_url: editForm.website_url || null,
        status: editForm.status || "active",
      })
      .eq("id", editingPodcast.id);
    setEditSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Podcast updated.");
    setEditOpen(false);
    setEditingPodcast(null);
    await fetchPodcasts();
  };

  const handleEditRefresh = async () => {
    if (!editingPodcast) return;
    setEditRefreshing(true);
    const parsed = await parsePodcastFeed(editingPodcast.feed_url);
    if (parsed) {
      setEditForm((f) => ({
        ...f,
        title: parsed.title || f.title,
        author: parsed.author ?? f.author,
        description: parsed.description ?? f.description,
        artwork_url: parsed.artworkUrl ?? f.artwork_url,
        website_url: parsed.websiteUrl ?? f.website_url,
      }));
      toast.success("Metadata refreshed from feed.");
    } else {
      toast.error("Could not fetch feed.");
    }
    setEditRefreshing(false);
  };

  const toggleSort = (key: keyof PodcastRow) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Podcast Directory Management</h1>
            <p className="text-sm text-muted-foreground">Manage RSS feeds for the military & veteran podcast network</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Feed
          </Button>
          <label className="cursor-pointer">
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVPick} />
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </span>
            </Button>
          </label>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Podcasts</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-foreground">{stats.active}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Episodes</p>
          <p className="text-2xl font-bold text-foreground">{stats.episodes}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Mic2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No podcasts yet.</p>
            <p className="text-sm mt-1">Add a feed or import a CSV to get started.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Artwork</TableHead>
                  <TableHead><button type="button" className="font-medium hover:underline" onClick={() => toggleSort("title")}>Title</button></TableHead>
                  <TableHead><button type="button" className="font-medium hover:underline" onClick={() => toggleSort("author")}>Author</button></TableHead>
                  <TableHead><button type="button" className="font-medium hover:underline" onClick={() => toggleSort("category")}>Category</button></TableHead>
                  <TableHead><button type="button" className="font-medium hover:underline" onClick={() => toggleSort("episode_count")}>Episodes</button></TableHead>
                  <TableHead><button type="button" className="font-medium hover:underline" onClick={() => toggleSort("status")}>Status</button></TableHead>
                  <TableHead><button type="button" className="font-medium hover:underline" onClick={() => toggleSort("updated_at")}>Last Updated</button></TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {row.artwork_url ? (
                        <img src={row.artwork_url} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Mic2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate" title={row.title ?? undefined}>{row.title ?? "—"}</TableCell>
                    <TableCell className="max-w-[120px] truncate" title={row.author ?? undefined}>{row.author ?? "—"}</TableCell>
                    <TableCell>{row.category ?? "—"}</TableCell>
                    <TableCell>{row.episode_count ?? "—"}</TableCell>
                    <TableCell><span className={row.status === "active" ? "text-green-600" : row.status === "error" ? "text-destructive" : ""}>{row.status ?? "active"}</span></TableCell>
                    <TableCell className="text-muted-foreground">{row.updated_at ? format(new Date(row.updated_at), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(row)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRefreshFeed(row)}><RefreshCw className="h-4 w-4 mr-2" /> Refresh Feed</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages} ({sorted.length} total)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Feed Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add podcast feed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">RSS Feed URL</label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="https://example.com/feed.xml"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                />
                <Button onClick={handleAddFetch} disabled={fetchingFeed}>
                  {fetchingFeed ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
                </Button>
              </div>
            </div>
            {preview && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <p><strong>Title:</strong> {preview.title || "—"}</p>
                <p><strong>Author:</strong> {preview.author || "—"}</p>
                <p><strong>Episodes:</strong> {preview.episodeCount}</p>
                {preview.artworkUrl && <img src={preview.artworkUrl} alt="" className="h-16 w-16 rounded object-cover mt-2" />}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSave} disabled={!preview || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingPodcast(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit podcast</DialogTitle>
          </DialogHeader>
          {editingPodcast && (
            <div className="space-y-4">
              <Button variant="outline" size="sm" onClick={handleEditRefresh} disabled={editRefreshing}>
                {editRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Refresh from Feed
              </Button>
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input value={editForm.title ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Author</label>
                <Input value={editForm.author ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, author: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input value={editForm.description ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={editForm.category ?? ""} onValueChange={(v) => setEditForm((f) => ({ ...f, category: v || null }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">—</SelectItem>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Artwork URL</label>
                <Input value={editForm.artwork_url ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, artwork_url: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Website URL</label>
                <Input value={editForm.website_url ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, website_url: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={editForm.status ?? "active"} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Modal */}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Import CSV</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Expected columns: feed_url (required), title, category, author (optional). First 10 rows:</p>
          <div className="overflow-auto max-h-48 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>feed_url</TableHead>
                  <TableHead>title</TableHead>
                  <TableHead>category</TableHead>
                  <TableHead>author</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvRows.slice(0, 10).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="max-w-[200px] truncate">{r.feed_url}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{r.title ?? "—"}</TableCell>
                    <TableCell>{r.category ?? "—"}</TableCell>
                    <TableCell>{r.author ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground">Total rows: {csvRows.length}</p>
          {csvImporting && <Progress value={csvProgress} className="mt-2" />}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCsvOpen(false); setCsvRows([]); }}>Cancel</Button>
            <Button onClick={handleCSVImport} disabled={csvImporting || csvRows.length === 0}>
              {csvImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Import All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete podcast?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the feed and all its episodes. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
