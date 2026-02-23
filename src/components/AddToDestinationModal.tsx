import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FolderPlus, ListPlus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useLists, type ListCreator } from "@/contexts/ListContext";
import { fetchDirectoriesWithCounts, type Directory } from "@/lib/directories";
import { toast } from "sonner";

/** Normalised creator shape accepted by this modal. */
export interface DestinationCreator {
  handle: string;
  name: string;
  avatar_url?: string | null;
  follower_count?: number | null;
  engagement_rate?: number | null;
  platform?: string;
  branch?: string | null;
  platforms?: string[];
  bio?: string;
}

interface Props {
  open: boolean;
  creators: DestinationCreator[];
  onClose: () => void;
  defaultTab?: "directory" | "list";
}

export default function AddToDestinationModal({ open, creators, onClose, defaultTab = "directory" }: Props) {
  const [tab, setTab] = useState<"directory" | "list">(defaultTab);
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [dirsLoading, setDirsLoading] = useState(false);
  const { lists, addCreatorToList } = useLists();

  const [selectedDirIds, setSelectedDirIds] = useState<Set<string>>(new Set());
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setSelectedDirIds(new Set());
      setSelectedListIds(new Set());
    }
  }, [open, defaultTab]);

  // Fetch directories when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setDirsLoading(true);
      const data = await fetchDirectoriesWithCounts();
      if (!cancelled) setDirectories(data);
      setDirsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open]);

  const toggleDir = (id: string) => {
    setSelectedDirIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleList = (id: string) => {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalSelected = selectedDirIds.size + selectedListIds.size;

  const handleConfirm = async () => {
    if (totalSelected === 0 || creators.length === 0) return;
    setSubmitting(true);

    let dirSuccess = 0;
    let listSuccess = 0;
    let destinationCount = 0;

    // --- Directories: batch upsert ---
    for (const dirId of selectedDirIds) {
      const rows = creators.map((c) => ({
        directory_id: dirId,
        creator_handle: c.handle.replace(/^@/, "").trim(),
        creator_name: c.name,
        avatar_url: c.avatar_url ?? null,
        follower_count: c.follower_count ?? null,
        engagement_rate: c.engagement_rate ?? null,
        platform: c.platform ?? "instagram",
        branch: c.branch ?? null,
      }));

      const { error } = await supabase
        .from("directory_members")
        .upsert(rows, { onConflict: "directory_id,creator_handle", ignoreDuplicates: true });

      if (error) {
        console.error("[AddToDestination] directory upsert error:", error);
      } else {
        dirSuccess += creators.length;
        destinationCount++;
      }
    }

    // --- Lists: add via context ---
    for (const listId of selectedListIds) {
      for (const c of creators) {
        const listCreator: ListCreator = {
          id: c.handle.replace(/^@/, "").trim(),
          name: c.name,
          username: c.handle.replace(/^@/, "").trim(),
          avatar: c.avatar_url ?? "",
          followers: c.follower_count ?? 0,
          engagementRate: c.engagement_rate ?? 0,
          platforms: c.platforms ?? [c.platform ?? "instagram"],
          bio: c.bio ?? "",
        };
        addCreatorToList(listId, listCreator);
        listSuccess++;
      }
      destinationCount++;
    }

    setSubmitting(false);

    const creatorWord = creators.length === 1 ? "creator" : "creators";
    const destWord = destinationCount === 1 ? "destination" : "destinations";
    if (dirSuccess > 0 || listSuccess > 0) {
      toast.success(`Added ${creators.length} ${creatorWord} to ${destinationCount} ${destWord}`);
    } else {
      toast.error("Failed to add creators");
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add {creators.length} {creators.length === 1 ? "Creator" : "Creators"}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setTab("directory")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === "directory"
                ? "border-[#1e3a5f] text-[#1e3a5f] dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <FolderPlus className="h-4 w-4" />
            Directories
            {selectedDirIds.size > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#1e3a5f] text-white text-[10px] font-bold leading-none">
                {selectedDirIds.size}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("list")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === "list"
                ? "border-[#1e3a5f] text-[#1e3a5f] dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <ListPlus className="h-4 w-4" />
            Lists
            {selectedListIds.size > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#1e3a5f] text-white text-[10px] font-bold leading-none">
                {selectedListIds.size}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[320px] overflow-y-auto -mx-1 px-1">
          {tab === "directory" && (
            dirsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : directories.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No directories yet</p>
            ) : (
              <div className="space-y-1">
                {directories.map((d) => {
                  const checked = selectedDirIds.has(d.id);
                  return (
                    <label
                      key={d.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                        checked
                          ? "bg-blue-50 dark:bg-blue-950/30"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleDir(d.id)}
                      />
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <FolderPlus className="h-4 w-4 text-blue-700 dark:text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{d.name}</p>
                        <p className="text-xs text-gray-400">{d.member_count ?? 0} members</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )
          )}

          {tab === "list" && (
            lists.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No lists yet</p>
            ) : (
              <div className="space-y-1">
                {lists.map((l) => {
                  const checked = selectedListIds.has(l.id);
                  return (
                    <label
                      key={l.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                        checked
                          ? "bg-blue-50 dark:bg-blue-950/30"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleList(l.id)}
                      />
                      <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center shrink-0">
                        <ListPlus className="h-4 w-4 text-[#1e3a5f]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{l.name}</p>
                        <p className="text-xs text-gray-400">{l.creators.length} creators</p>
                      </div>
                      {/* Show check if all creators already in this list */}
                      {creators.length > 0 &&
                        creators.every((c) =>
                          l.creators.some((lc) => lc.id === c.handle.replace(/^@/, "").trim())
                        ) && (
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                    </label>
                  );
                })}
              </div>
            )
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={totalSelected === 0 || submitting}
            className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Add to {totalSelected} selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
