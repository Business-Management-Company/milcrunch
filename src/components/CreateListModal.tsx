import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CreateListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with trimmed non-empty name when user clicks Create. */
  onCreate: (name: string) => void;
}

export default function CreateListModal({
  open,
  onOpenChange,
  onCreate,
}: CreateListModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  const trimmed = name.trim();
  const valid = trimmed.length > 0;

  const handleCreate = () => {
    if (!valid) return;
    onCreate(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="list-name">List Name</Label>
          <Input
            id="list-name"
            placeholder="e.g. Summer Campaign"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
            className="rounded-lg"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!valid} className="rounded-lg bg-[#0064B1] hover:bg-[#053877]">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
