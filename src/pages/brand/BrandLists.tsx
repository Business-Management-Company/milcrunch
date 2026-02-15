import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLists } from "@/contexts/ListContext";
import { useAuth } from "@/contexts/AuthContext";
import { List, Trash2, ChevronRight, Plus, User, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import CreateListModal from "@/components/CreateListModal";
import CreatorProfileModal from "@/components/CreatorProfileModal";
import BulkActionBar from "@/components/BulkActionBar";
import type { CreatorCard } from "@/lib/influencers-club";
import type { ListCreator } from "@/contexts/ListContext";
import { approveForDirectory, detectBranch } from "@/lib/featured-creators";
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
  const { lists, removeCreatorFromList, createList } = useLists();
  const { user, isSuperAdmin } = useAuth();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileCreator, setProfileCreator] = useState<CreatorCard | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [promotingIds, setPromotingIds] = useState<Set<string>>(new Set());
  const [promotingAll, setPromotingAll] = useState(false);

  const selectedList = selectedListId
    ? lists.find((l) => l.id === selectedListId)
    : null;

  useEffect(() => {
    setSelectedIds(new Set());
  }, [selectedListId]);

  const handleCreateList = (name: string) => {
    const id = createList(name);
    setSelectedListId(id);
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
    const err = await promoteCreatorToDirectory(creator, selectedListId, user?.id ?? null);
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
      const err = await promoteCreatorToDirectory(creator, selectedListId, user?.id ?? null);
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

  return (
    <>
      <CreateListModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreate={handleCreateList}
      />
      <CreatorProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        creator={profileCreator}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">
          Saved Lists
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage saved creator lists for events and campaigns. Create lists from
          Discover, then invite or target them for specific opportunities.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <Card
            key={list.id}
            className={cn(
              "bg-gradient-card border-border p-5 cursor-pointer transition-colors hover:border-primary/50",
              selectedListId === list.id && "ring-2 ring-primary"
            )}
            onClick={() =>
              setSelectedListId(selectedListId === list.id ? null : list.id)
            }
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <List className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {list.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {list.creators.length} creator
                    {list.creators.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform",
                  selectedListId === list.id && "rotate-90"
                )}
              />
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

      {selectedList && (
        <div className="mt-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedList.name}
            </h2>
            <div className="flex items-center gap-3">
              {isSuperAdmin && selectedList.creators.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/30"
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
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Creators
          </p>
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
                      src={creator.avatar}
                      alt={creator.name}
                      className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
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
                    {creator.platforms?.[0] && (
                      <span
                        className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        title={PLATFORM_LABELS[creator.platforms[0]] ?? creator.platforms[0]}
                      >
                        {PLATFORM_LABELS[creator.platforms[0]] ?? creator.platforms[0]}
                      </span>
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
                      className="flex-1 rounded-lg text-[#0064B1] hover:text-[#0064B1] hover:bg-[#0064B1]/10"
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
                        className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/30"
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
        </div>
      )}

      {selectedList && (
        <BulkActionBar
          mode="list"
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          onRemoveFromList={handleBulkRemove}
        />
      )}
    </>
  );
};

export default BrandLists;
