import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ListPlus, Star, Download, Trash2, X, ChevronDown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  /** Add to List: dropdown of lists + Create New */
  onAddToList?: (listId: string) => void;
  listOptions?: { id: string; name: string }[];
  onCreateList?: () => void;
  /** Feature on Homepage: open modal to set section + apply to all */
  onFeatureHomepage?: () => void;
  /** Import All: batch import selected (Discovery) */
  onImportAll?: () => void;
  /** Import & Add to List: import then add to chosen list (Discovery) */
  onImportAndAddToList?: (listId: string) => void;
  /** When in Discovery, open "Create New List" for Import & Add flow */
  onCreateListForImport?: () => void;
  /** Remove from List: bulk remove (List view) */
  onRemoveFromList?: () => void;
  /** Add to Directory: dropdown of directories */
  onAddToDirectory?: (directoryId: string) => void;
  directoryOptions?: { id: string; name: string }[];
  /** Which actions to show */
  mode: "directory" | "discovery" | "list";
  className?: string;
}

export default function BulkActionBar({
  selectedCount,
  onClearSelection,
  onAddToList,
  listOptions = [],
  onCreateList,
  onFeatureHomepage,
  onImportAll,
  onImportAndAddToList,
  onCreateListForImport,
  onRemoveFromList,
  onAddToDirectory,
  directoryOptions = [],
  mode,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  const showAddToList = (mode === "directory" || mode === "discovery") && (onAddToList || onCreateList);
  const showAddToDir = (mode === "directory" || mode === "discovery") && onAddToDirectory && directoryOptions.length > 0;
  const showFeature = (mode === "directory" || mode === "discovery") && onFeatureHomepage;
  const showImport = mode === "discovery" && onImportAll;
  const showImportAndAdd = mode === "discovery" && (onImportAndAddToList || onCreateListForImport);
  const showRemove = mode === "list" && onRemoveFromList;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-background",
        className
      )}
    >
      <span className="text-sm font-medium whitespace-nowrap">
        {selectedCount} creator{selectedCount !== 1 ? "s" : ""} selected
      </span>
      <div className="h-4 w-px bg-border" />
      {showAddToList && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-lg">
              <ListPlus className="h-4 w-4 mr-1.5" />
              Add to List
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="max-h-[280px] overflow-y-auto">
            {listOptions.map((list) => (
              <DropdownMenuItem key={list.id} onClick={() => onAddToList?.(list.id)}>
                {list.name}
              </DropdownMenuItem>
            ))}
            {onCreateList && (
              <DropdownMenuItem onClick={onCreateList}>
                <span className="font-medium">+ Create New List</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {showAddToDir && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-lg text-purple-700 border-purple-300 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-950/30">
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              Add to Directory
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="max-h-[280px] overflow-y-auto">
            {directoryOptions.map((dir) => (
              <DropdownMenuItem key={dir.id} onClick={() => onAddToDirectory?.(dir.id)}>
                {dir.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {showFeature && (
        <Button variant="outline" size="sm" className="rounded-lg" onClick={onFeatureHomepage}>
          <Star className="h-4 w-4 mr-1.5" />
          Feature on Homepage
        </Button>
      )}
      {showImport && (
        <Button variant="outline" size="sm" className="rounded-lg" onClick={onImportAll}>
          <Download className="h-4 w-4 mr-1.5" />
          Import All
        </Button>
      )}
      {showImportAndAdd && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-lg">
              <Download className="h-4 w-4 mr-1.5" />
              Import & Add to List
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="max-h-[280px] overflow-y-auto">
            {listOptions.map((list) => (
              <DropdownMenuItem key={list.id} onClick={() => onImportAndAddToList?.(list.id)}>
                {list.name}
              </DropdownMenuItem>
            ))}
            {onCreateListForImport && (
              <DropdownMenuItem onClick={onCreateListForImport}>
                <span className="font-medium">+ Create New List</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {showRemove && (
        <Button variant="outline" size="sm" className="rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onRemoveFromList}>
          <Trash2 className="h-4 w-4 mr-1.5" />
          Remove from List
        </Button>
      )}
      <Button variant="ghost" size="sm" className="rounded-lg" onClick={onClearSelection}>
        <X className="h-4 w-4 mr-1.5" />
        Clear Selection
      </Button>
    </div>
  );
}
