import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Tags,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface HashtagGroup {
  id: string;
  name: string;
  hashtags: string[];
  use_count: number;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Default seed data                                                   */
/* ------------------------------------------------------------------ */

const DEFAULT_GROUPS: Omit<HashtagGroup, "id" | "created_at">[] = [
  {
    name: "MIC 2026",
    hashtags: ["#MIC2026", "#MilitaryInfluencer", "#VeteranCreator", "#MilCommunity"],
    use_count: 0,
  },
  {
    name: "MilSpouseFest",
    hashtags: ["#MilSpouseFest", "#MilitarySpouse", "#MilSpouse", "#MilFam"],
    use_count: 0,
  },
  {
    name: "Brand Safety",
    hashtags: ["#MilitaryLife", "#VeteranOwned", "#ServeAndProtect"],
    use_count: 0,
  },
];

/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function BrandTags() {
  const [groups, setGroups] = useState<HashtagGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<HashtagGroup | null>(null);
  const [formName, setFormName] = useState("");
  const [formHashtags, setFormHashtags] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load groups
  const loadGroups = useCallback(async () => {
    const { data, error } = await supabase
      .from("hashtag_groups")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load hashtag groups:", error);
      setLoading(false);
      return;
    }

    let rows = (data ?? []) as HashtagGroup[];

    // Seed defaults if table is empty
    if (rows.length === 0) {
      for (const seed of DEFAULT_GROUPS) {
        await supabase.from("hashtag_groups").insert({
          name: seed.name,
          hashtags: seed.hashtags as any,
          use_count: 0,
        });
      }
      const { data: seeded } = await supabase
        .from("hashtag_groups")
        .select("*")
        .order("created_at", { ascending: true });
      rows = (seeded ?? []) as HashtagGroup[];
    }

    // Normalize hashtags from jsonb
    setGroups(
      rows.map((g) => ({
        ...g,
        hashtags: Array.isArray(g.hashtags)
          ? g.hashtags
          : typeof g.hashtags === "string"
            ? JSON.parse(g.hashtags)
            : [],
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Open modal for new / edit
  const openNew = () => {
    setEditingGroup(null);
    setFormName("");
    setFormHashtags("");
    setModalOpen(true);
  };

  const openEdit = (group: HashtagGroup) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormHashtags(group.hashtags.join(", "));
    setModalOpen(true);
  };

  // Parse hashtags from textarea
  const parseHashtags = (raw: string): string[] => {
    return raw
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));
  };

  // Save
  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    const tags = parseHashtags(formHashtags);

    if (editingGroup) {
      await supabase
        .from("hashtag_groups")
        .update({ name: formName.trim(), hashtags: tags as any })
        .eq("id", editingGroup.id);
    } else {
      await supabase.from("hashtag_groups").insert({
        name: formName.trim(),
        hashtags: tags as any,
        use_count: 0,
      });
    }

    setSaving(false);
    setModalOpen(false);
    loadGroups();
  };

  // Delete
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await supabase.from("hashtag_groups").delete().eq("id", id);
    setDeletingId(null);
    loadGroups();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#6C5CE7]/10 flex items-center justify-center">
            <Tags className="h-5 w-5 text-[#6C5CE7]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hashtag Tag Groups</h1>
            <p className="text-sm text-gray-500">
              Save groups of hashtags to quickly add to campaigns and posts
            </p>
          </div>
        </div>
        <Button
          onClick={openNew}
          className="bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Tag Group
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
        </div>
      )}

      {/* Empty state */}
      {!loading && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center">
          <Tags className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No tag groups yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first hashtag group to get started.</p>
        </div>
      )}

      {/* Grid */}
      {!loading && groups.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="font-bold text-gray-900 text-base mb-3">{group.name}</h3>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {group.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <p className="text-xs text-gray-400 mb-4">
                Used in {group.use_count} campaign{group.use_count !== 1 ? "s" : ""}
              </p>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(group)}
                  className="text-xs"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(group.id)}
                  disabled={deletingId === group.id}
                  className="text-xs text-red-500 hover:text-red-600 hover:border-red-200"
                >
                  {deletingId === group.id ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-3 w-3 mr-1" />
                  )}
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Edit Tag Group" : "New Tag Group"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Group Name
              </Label>
              <Input
                placeholder="e.g. MIC 2026"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Hashtags
              </Label>
              <Textarea
                placeholder="#MIC2026, #MilitaryInfluencer, #VeteranCreator"
                value={formHashtags}
                onChange={(e) => setFormHashtags(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-gray-400 mt-1">
                Separate with commas or spaces. # prefix is added automatically.
              </p>
            </div>

            {/* Preview */}
            {formHashtags.trim() && (
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Preview</Label>
                <div className="flex flex-wrap gap-1.5">
                  {parseHashtags(formHashtags).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formName.trim() || saving}
              className="bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingGroup ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
