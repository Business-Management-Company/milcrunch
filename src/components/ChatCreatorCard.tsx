import { useState, useMemo } from "react";
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

// ─── Branch detection for match reasons ──────────────────────

const BRANCH_PATTERNS: { branch: string; patterns: string[] }[] = [
  { branch: "Army", patterns: ["army", "us army", "u.s. army"] },
  { branch: "Navy", patterns: ["navy", "us navy", "u.s. navy"] },
  { branch: "Marines", patterns: ["marine", "marines", "usmc", "marine corps"] },
  { branch: "Air Force", patterns: ["air force", "airforce", "usaf", "u.s. air force"] },
  { branch: "Coast Guard", patterns: ["coast guard", "coastguard", "uscg"] },
  { branch: "Space Force", patterns: ["space force", "spaceforce", "ussf"] },
  { branch: "National Guard", patterns: ["national guard"] },
];

function generateMatchReason(creator: CreatorCard): string {
  const bio = (creator.bio ?? "").toLowerCase();
  const hashtags = (creator.hashtags ?? []).map((h) => h.toLowerCase().replace(/^#/, ""));
  const name = (creator.name ?? "").toLowerCase();
  const username = (creator.username ?? "").toLowerCase();

  // Check bio for branch keywords
  for (const { branch, patterns } of BRANCH_PATTERNS) {
    for (const p of patterns) {
      if (bio.includes(p)) {
        const idx = bio.indexOf(p);
        const start = Math.max(0, idx - 15);
        const end = Math.min(bio.length, idx + p.length + 25);
        const snippet = (start > 0 ? "..." : "") + creator.bio!.slice(start, end).trim() + (end < bio.length ? "..." : "");
        return `Bio: "${snippet}" — Branch confirmed: ${branch} \u2713`;
      }
    }
  }

  // Check hashtags for branch keywords
  for (const { branch, patterns } of BRANCH_PATTERNS) {
    const matched = hashtags.filter((h) => patterns.some((p) => h.includes(p.replace(/\s/g, ""))));
    if (matched.length > 0) {
      return `Hashtags: #${matched.slice(0, 3).join(" #")} — Branch confirmed: ${branch} \u2713`;
    }
  }

  // Check name/username
  for (const { branch, patterns } of BRANCH_PATTERNS) {
    for (const p of patterns) {
      if (name.includes(p) || username.includes(p.replace(/\s/g, ""))) {
        return `Name/handle contains "${p}" — Branch confirmed: ${branch} \u2713`;
      }
    }
  }

  // Generic military keywords without specific branch
  const milKeywords = ["veteran", "military", "service member", "active duty", "combat vet", "mil spouse", "armed forces"];
  for (const kw of milKeywords) {
    if (bio.includes(kw)) {
      return `Bio mentions "${kw}" — Branch: Not confirmed \u26A0\uFE0F`;
    }
  }
  for (const kw of milKeywords) {
    if (hashtags.some((h) => h.includes(kw.replace(/\s/g, "")))) {
      return `Hashtags reference military/veteran — Branch: Not confirmed \u26A0\uFE0F`;
    }
  }

  return "No explicit military affiliation found in profile \u26A0\uFE0F";
}

// ─── Component ───────────────────────────────────────────────

interface ChatCreatorCardProps {
  creator: CreatorCard;
  onViewProfile: (creator: CreatorCard) => void;
}

export default function ChatCreatorCard({ creator, onViewProfile }: ChatCreatorCardProps) {
  const { lists, addCreatorToList, createList, isCreatorInList } = useLists();
  const [open, setOpen] = useState(false);
  const [createListModalOpen, setCreateListModalOpen] = useState(false);

  const matchReason = useMemo(() => generateMatchReason(creator), [creator]);

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
  const isConfirmed = matchReason.includes("\u2713");

  return (
    <>
      <CreateListModal
        open={createListModalOpen}
        onOpenChange={setCreateListModalOpen}
        onCreate={handleCreateListAndAdd}
      />
      <div className="rounded-lg bg-white/50 dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center gap-3 p-2">
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
        <div className={`px-2.5 pb-2 -mt-0.5`}>
          <p className={`text-[11px] leading-tight ${isConfirmed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            {matchReason}
          </p>
        </div>
      </div>
    </>
  );
}
