import { useState } from "react";
import type { CreatorCard } from "@/lib/influencers-club";
import { useLists } from "@/contexts/ListContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ListPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import CreateListModal from "@/components/CreateListModal";

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

interface ChatCreatorCardProps {
  creator: CreatorCard;
  onViewProfile: (creator: CreatorCard) => void;
}

export default function ChatCreatorCard({ creator, onViewProfile }: ChatCreatorCardProps) {
  const { lists, addCreatorToList, createList, isCreatorInList } = useLists();
  const [open, setOpen] = useState(false);
  const [createListModalOpen, setCreateListModalOpen] = useState(false);

  const listCreator = {
    id: creator.id,
    name: creator.name,
    username: creator.username,
    avatar: creator.avatar,
    followers: creator.followers,
    engagementRate: creator.engagementRate,
    platforms: creator.platforms,
    bio: creator.bio,
    location: creator.location,
  };

  const handleAddToList = (listId: string, listName: string) => {
    addCreatorToList(listId, listCreator);
    toast.success(`Added ${creator.name} to ${listName}`);
    setOpen(false);
  };

  const handleOpenCreateListModal = () => {
    setOpen(false);
    setCreateListModalOpen(true);
  };

  const handleCreateListAndAdd = (name: string) => {
    const newId = createList(name);
    addCreatorToList(newId, listCreator);
    toast.success(`Added ${creator.name} to ${name}`);
    setCreateListModalOpen(false);
  };

  const inList = isCreatorInList(creator.id);

  return (
    <>
      <CreateListModal
        open={createListModalOpen}
        onOpenChange={setCreateListModalOpen}
        onCreate={handleCreateListAndAdd}
      />
      <div className="flex items-center gap-3 p-2 rounded-lg bg-white/50 dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800">
      <img
        src={creator.avatar}
        alt={creator.name}
        className="h-10 w-10 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-800"
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-foreground truncate">{creator.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {creator.username ? `@${creator.username}` : ""} · {formatNum(creator.followers)} followers · {creator.engagementRate}% engagement
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onViewProfile(creator)}
          className="text-xs text-pd-blue hover:underline font-medium"
        >
          View Profile
        </button>
        {inList ? (
          <span className="text-xs text-green-600 dark:text-green-400">Added</span>
        ) : (
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <ListPlus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {lists.map((list) => (
                <DropdownMenuItem key={list.id} onClick={() => handleAddToList(list.id, list.name)}>
                  {list.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={handleOpenCreateListModal}>
                <Plus className="h-3.5 w-3.5 mr-2" />
                Create New List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
    </>
  );
}
