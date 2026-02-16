import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  GripVertical,
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
import {
  type FeaturedCreator,
  formatFollowerCount,
  getInitials,
} from "@/lib/featured-creators";
import { toast } from "sonner";

const PLATFORMS = ["instagram", "youtube", "tiktok", "twitter"];
const CATEGORIES = ["Veterans", "Military", "Motivation", "Fitness", "Lifestyle", "Business", "Podcasts", "Other"];

const emptyForm = {
  display_name: "",
  handle: "",
  platform: "instagram",
  avatar_url: "",
  follower_count: "" as string | number,
  engagement_rate: "" as string | number,
  category: "",
  sort_order: 0,
  is_active: true,
  is_verified: false,
};

export default function FeaturedCreators() {
  const [list, setList] = useState<FeaturedCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<FeaturedCreator | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeaturedCreator | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);

  const fetchList = useCallback(async () => {
    const { data, error } = await supabase
      .from("featured_creators")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    setList((data ?? []) as FeaturedCreator[]);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchList().finally(() => setLoading(false));
  }, [fetchList]);

  const openAdd = () => {
    setForm({ ...emptyForm, sort_order: list.length });
    setAddOpen(true);
  };

  const openEdit = (row: FeaturedCreator) => {
    setEditing(row);
    setForm({
      display_name: row.display_name,
      handle: row.handle,
      platform: row.platform,
      avatar_url: row.avatar_url ?? "",
      follower_count: row.follower_count ?? "",
      engagement_rate: row.engagement_rate ?? "",
      category: row.category ?? "",
      sort_order: row.sort_order,
      is_active: row.is_active,
      is_verified: row.is_verified,
    });
    setEditOpen(true);
  };

  const saveAdd = async () => {
    if (!form.display_name.trim() || !form.handle.trim()) {
      toast.error("Display name and handle are required.");
      return;
    }
    setSaving(true);
    const payload = {
      display_name: form.display_name.trim(),
      handle: form.handle.trim().replace(/^@/, ""),
      platform: form.platform,
      avatar_url: form.avatar_url.trim() || null,
      follower_count: form.follower_count === "" ? null : Number(form.follower_count),
      engagement_rate: form.engagement_rate === "" ? null : Number(form.engagement_rate),
      category: form.category.trim() || null,
      sort_order: form.sort_order,
      is_active: form.is_active,
      is_verified: form.is_verified,
    };
    const { error } = await supabase.from("featured_creators").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Creator added.");
    setAddOpen(false);
    fetchList();
  };

  const saveEdit = async () => {
    if (!editing || !form.display_name.trim() || !form.handle.trim()) return;
    setSaving(true);
    const payload = {
      display_name: form.display_name.trim(),
      handle: form.handle.trim().replace(/^@/, ""),
      platform: form.platform,
      avatar_url: form.avatar_url.trim() || null,
      follower_count: form.follower_count === "" ? null : Number(form.follower_count),
      engagement_rate: form.engagement_rate === "" ? null : Number(form.engagement_rate),
      category: form.category.trim() || null,
      sort_order: form.sort_order,
      is_active: form.is_active,
      is_verified: form.is_verified,
    };
    const { error } = await supabase
      .from("featured_creators")
      .update(payload)
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Creator updated.");
    setEditOpen(false);
    setEditing(null);
    fetchList();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("featured_creators")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Creator removed.");
    fetchList();
  };

  const toggleActive = async (row: FeaturedCreator) => {
    const { error } = await supabase
      .from("featured_creators")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    fetchList();
    toast.success(row.is_active ? "Hidden from homepage." : "Shown on homepage.");
  };

  const toggleApproved = async (row: FeaturedCreator) => {
    const { error } = await supabase
      .from("featured_creators")
      .update({ approved: !row.approved })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    fetchList();
    toast.success(row.approved ? "Removed from public directory." : "Approved for public directory.");
  };

  const moveRow = async (index: number, direction: "up" | "down") => {
    const next = direction === "up" ? index - 1 : index + 1;
    if (next < 0 || next >= list.length) return;
    const a = list[index];
    const b = list[next];
    setReordering(true);
    const { error: e1 } = await supabase
      .from("featured_creators")
      .update({ sort_order: b.sort_order })
      .eq("id", a.id);
    const { error: e2 } = await supabase
      .from("featured_creators")
      .update({ sort_order: a.sort_order })
      .eq("id", b.id);
    setReordering(false);
    if (e1 || e2) {
      toast.error(e1?.message ?? e2?.message ?? "Failed to reorder");
      return;
    }
    fetchList();
  };

  const formFields = (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="display_name">Display name *</Label>
          <Input
            id="display_name"
            value={form.display_name}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            placeholder="Jason Smith"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="handle">Handle *</Label>
          <Input
            id="handle"
            value={form.handle}
            onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))}
            placeholder="jasonsmith"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="platform">Platform</Label>
          <Select
            value={form.platform}
            onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}
          >
            <SelectTrigger id="platform">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={form.category || "none"}
            onValueChange={(v) => setForm((f) => ({ ...f, category: v === "none" ? "" : v }))}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="avatar_url">Avatar URL</Label>
        <Input
          id="avatar_url"
          value={form.avatar_url}
          onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
          placeholder="https://..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="follower_count">Follower count</Label>
          <Input
            id="follower_count"
            type="number"
            min={0}
            value={form.follower_count}
            onChange={(e) => setForm((f) => ({ ...f, follower_count: e.target.value === "" ? "" : Number(e.target.value) }))}
            placeholder="359100"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="engagement_rate">Engagement rate %</Label>
          <Input
            id="engagement_rate"
            type="number"
            min={0}
            step={0.1}
            value={form.engagement_rate}
            onChange={(e) => setForm((f) => ({ ...f, engagement_rate: e.target.value === "" ? "" : Number(e.target.value) }))}
            placeholder="3.2"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sort_order">Sort order</Label>
          <Input
            id="sort_order"
            type="number"
            min={0}
            value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))}
          />
        </div>
        <div className="flex items-center gap-4 pt-8">
          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={form.is_active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            />
            <Label htmlFor="is_active">Active (show on homepage)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="is_verified"
              checked={form.is_verified}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_verified: v }))}
            />
            <Label htmlFor="is_verified">Verified badge</Label>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#000741]">Featured Creators</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage who appears on the homepage hero and Big Names grid. Order and active state control visibility.
          </p>
        </div>
        <Button onClick={openAdd} className="rounded-lg">
          <Plus className="h-4 w-4 mr-2" />
          Add creator
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Order</TableHead>
                <TableHead className="w-14">Avatar</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Handle</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Eng. %</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((row, i) => (
                <TableRow key={row.id}>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={reordering || i === 0}
                        onClick={() => moveRow(i, "up")}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={reordering || i === list.length - 1}
                        onClick={() => moveRow(i, "down")}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.avatar_url ? (
                      <img
                        src={row.avatar_url}
                        alt={row.display_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold bg-[#6C5CE7]"
                      >
                        {getInitials(row.display_name, row.handle)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{row.display_name}</TableCell>
                  <TableCell className="text-gray-600">@{row.handle}</TableCell>
                  <TableCell>{row.platform}</TableCell>
                  <TableCell>{row.category ?? "—"}</TableCell>
                  <TableCell>{formatFollowerCount(row.follower_count)}</TableCell>
                  <TableCell>{row.engagement_rate != null ? `${row.engagement_rate}%` : "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={row.is_active}
                      onCheckedChange={() => toggleActive(row)}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={row.approved}
                      onCheckedChange={() => toggleApproved(row)}
                    />
                  </TableCell>
                  <TableCell>{row.is_verified ? "✓" : "—"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <GripVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleApproved(row)}>
                          {row.approved ? (
                            <><Trash2 className="h-4 w-4 mr-2" />Remove from Directory</>
                          ) : (
                            <><Plus className="h-4 w-4 mr-2" />Approve for Directory</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {list.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No featured creators yet. Add one to show them on the homepage.
            </div>
          )}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add featured creator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">{formFields}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAdd} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit featured creator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">{formFields}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove featured creator?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>This will remove {deleteTarget.display_name} (@{deleteTarget.handle}) from the featured list. They will no longer appear on the homepage.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
