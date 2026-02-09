import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Star, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  fetchCreators,
  setFeatured,
  formatFollowerCount,
  getInitials,
  type CreatorRow,
  type FeaturedSection,
} from "@/lib/creators-db";
import BulkActionBar from "@/components/BulkActionBar";
import { useLists } from "@/contexts/ListContext";
import CreateListModal from "@/components/CreateListModal";
import { toast } from "sonner";

const NICHE_TAG_CLASSES: Record<string, string> = {
  Veterans: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Motivation: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Military: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Fitness: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  Lifestyle: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
};

function creatorToListPayload(c: CreatorRow) {
  return {
    id: c.id,
    name: c.display_name,
    username: c.handle,
    avatar: c.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(c.display_name)}&size=128`,
    followers: c.follower_count ?? 0,
    engagementRate: c.engagement_rate ?? 0,
    platforms: [c.platform],
    bio: c.bio ?? "",
    location: c.location ?? undefined,
  };
}

export default function BrandDirectory() {
  const { lists, addCreatorToList, createList } = useLists();
  const [filter, setFilter] = useState<"all" | "featured">("all");
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createListOpen, setCreateListOpen] = useState(false);
  const [featureBulkOpen, setFeatureBulkOpen] = useState(false);
  const [featureBulkSection, setFeatureBulkSection] = useState<FeaturedSection>("grid");
  const [featureBulkSort, setFeatureBulkSort] = useState(0);
  const [featureBulkSaving, setFeatureBulkSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchCreators({ featuredOnly: filter === "featured" })
      .then(setCreators)
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === creators.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(creators.map((c) => c.id)));
  };

  const handleAddToBulkList = (listId: string) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    const toAdd = creators.filter((c) => selectedIds.has(c.id));
    toAdd.forEach((c) => addCreatorToList(listId, creatorToListPayload(c)));
    toast.success(`Added ${toAdd.length} creator${toAdd.length !== 1 ? "s" : ""} to ${list.name}`);
    setSelectedIds(new Set());
  };

  const handleFeatureBulk = async () => {
    const ids = Array.from(selectedIds);
    setFeatureBulkSaving(true);
    let ok = 0;
    for (const id of ids) {
      const success = await setFeatured(id, {
        is_featured: true,
        featured_section: featureBulkSection,
        featured_sort_order: featureBulkSort,
      });
      if (success) ok++;
    }
    setFeatureBulkSaving(false);
    setFeatureBulkOpen(false);
    setSelectedIds(new Set());
    toast.success(`Featured ${ok} creator${ok !== 1 ? "s" : ""} on homepage`);
    load();
  };

  return (
    <TooltipProvider>
      <CreateListModal
        open={createListOpen}
        onOpenChange={setCreateListOpen}
        onCreate={(name) => {
          const id = createList(name);
          handleAddToBulkList(id);
        }}
      />
      <Dialog open={featureBulkOpen} onOpenChange={setFeatureBulkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Feature on Homepage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Section</Label>
              <Select value={featureBulkSection} onValueChange={(v) => setFeatureBulkSection(v as FeaturedSection)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hero">Hero Cards (3 floating)</SelectItem>
                  <SelectItem value="grid">Featured Grid (Big Names)</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sort order (1 = first)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={featureBulkSort}
                onChange={(e) => setFeatureBulkSort(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeatureBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleFeatureBulk} disabled={featureBulkSaving}>
              {featureBulkSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Apply to {selectedIds.size} creator{selectedIds.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">
              Influencer Directory
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Imported creators. Feature them on the homepage and add them to lists.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Select value={filter} onValueChange={(v) => setFilter(v as "all" | "featured")}>
              <SelectTrigger className="w-[220px] rounded-lg">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Influencers</SelectItem>
                <SelectItem value="featured">Featured on Homepage</SelectItem>
              </SelectContent>
            </Select>
            {creators.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === creators.length}
                  onCheckedChange={selectAll}
                  aria-label="Select all on page"
                />
                <span className="text-sm text-muted-foreground">Select all</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#0064B1]" />
            </div>
          ) : creators.length === 0 ? (
            <Card className="rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
              <p className="text-muted-foreground">
                {filter === "featured"
                  ? "No featured creators yet. Feature creators from this directory or from Discovery after importing."
                  : "No imported creators yet. Import creators from Discover to add them here."}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {creators.map((c) => (
                <Card
                  key={c.id}
                  className={cn(
                    "relative rounded-xl border p-4 flex flex-col transition-all",
                    "bg-white dark:bg-[#1A1D27] border-gray-200 dark:border-gray-800"
                  )}
                >
                  <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(c.id)}
                      onCheckedChange={() => toggleSelect(c.id)}
                      aria-label={`Select ${c.display_name}`}
                    />
                  </div>
                  <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
                    <FeatureStarButton creator={c} onUpdate={load} />
                  </div>
                  <div className="flex items-center gap-3 mt-6 mb-2">
                    {c.avatar_url ? (
                      <img
                        src={c.avatar_url}
                        alt={c.display_name}
                        className="w-12 h-12 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 bg-[#0064B1]"
                      >
                        {getInitials(c.display_name, c.handle)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{c.display_name}</h3>
                      <p className="text-sm text-muted-foreground truncate">@{c.handle}</p>
                    </div>
                  </div>
                  {c.category && (
                    <span
                      className={cn(
                        "inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium mb-2",
                        NICHE_TAG_CLASSES[c.category] ?? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      )}
                    >
                      {c.category}
                    </span>
                  )}
                  <div className="flex gap-4 text-sm text-muted-foreground mt-auto pt-2">
                    <span>{formatFollowerCount(c.follower_count)} followers</span>
                    {c.engagement_rate != null && (
                      <span>{c.engagement_rate}% engagement</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <BulkActionBar
        mode="directory"
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onAddToList={handleAddToBulkList}
        listOptions={lists.map((l) => ({ id: l.id, name: l.name }))}
        onCreateList={() => setCreateListOpen(true)}
        onFeatureHomepage={() => setFeatureBulkOpen(true)}
      />
    </TooltipProvider>
  );
}

function FeatureStarButton({ creator, onUpdate }: { creator: CreatorRow; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<FeaturedSection>(creator.featured_section as FeaturedSection || "grid");
  const [sortOrder, setSortOrder] = useState(creator.featured_sort_order ?? 0);
  const [saving, setSaving] = useState(false);

  const isFeatured = creator.is_featured;

  const handleConfirm = async () => {
    setSaving(true);
    const success = await setFeatured(creator.id, {
      is_featured: true,
      featured_section: section,
      featured_sort_order: sortOrder,
    });
    setSaving(false);
    if (success) {
      setOpen(false);
      onUpdate();
      toast.success("Featured on homepage");
    } else toast.error("Failed to update");
  };

  const handleUnfeature = async () => {
    setSaving(true);
    const success = await setFeatured(creator.id, { is_featured: false });
    setSaving(false);
    if (success) {
      setOpen(false);
      onUpdate();
      toast.success("Removed from homepage");
    } else toast.error("Failed to update");
  };

  if (isFeatured) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="rounded-full p-1.5 text-[#F0A71F] hover:bg-[#F0A71F]/10"
            aria-label="Featured on Homepage (click to remove)"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleUnfeature();
            }}
          >
            <Star className="h-5 w-5 fill-current" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Featured on Homepage (click to remove)</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Feature on Homepage"
            >
              <Star className="h-5 w-5" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Feature on Homepage</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-3">
          <p className="text-sm font-medium">Feature on Homepage</p>
          <div>
            <Label className="text-xs">Section</Label>
            <Select value={section} onValueChange={(v) => setSection(v as FeaturedSection)}>
              <SelectTrigger className="mt-1 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hero">Hero Cards</SelectItem>
                <SelectItem value="grid">Featured Grid</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Sort order (1–10)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              className="mt-1 h-8"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1" onClick={handleConfirm} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
