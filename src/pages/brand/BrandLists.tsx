import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLists } from "@/contexts/ListContext";
import { List, Trash2, ChevronRight, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import CreateListModal from "@/components/CreateListModal";
import CreatorProfileModal from "@/components/CreatorProfileModal";
import type { CreatorCard } from "@/lib/influencers-club";
import type { ListCreator } from "@/contexts/ListContext";

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
  const { lists, removeCreatorFromList, createList } = useLists();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileCreator, setProfileCreator] = useState<CreatorCard | null>(null);

  const selectedList = selectedListId
    ? lists.find((l) => l.id === selectedListId)
    : null;

  const handleCreateList = (name: string) => {
    const id = createList(name);
    setSelectedListId(id);
  };

  const openProfile = (creator: ListCreator) => {
    setProfileCreator(listCreatorToCard(creator));
    setProfileModalOpen(true);
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
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {selectedList.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Creators
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedList.creators.map((creator) => (
              <Card
                key={creator.id}
                className="bg-gradient-card border-border p-4 flex flex-col"
              >
                <div className="flex items-start gap-3 mb-3">
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
                  {creator.bio || "—"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <span>{formatFollowers(creator.followers)} followers</span>
                  <span>·</span>
                  <span>{creator.engagementRate}% engagement</span>
                </div>
                <div className="mt-auto flex gap-2">
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCreatorFromList(selectedList.id, creator.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          {selectedList.creators.length === 0 && (
            <p className="text-muted-foreground text-sm py-6">
              No creators in this list yet. Add creators from Discover.
            </p>
          )}
        </div>
      )}
    </>
  );
};

export default BrandLists;
