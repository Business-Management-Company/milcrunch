import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SPEAKER_TYPES } from "./AddSpeakerModal";

interface SpeakerRow {
  id: string;
  creator_name: string | null;
  creator_handle: string | null;
  avatar_url: string | null;
  role: string | null;
  topic: string | null;
  bio: string | null;
  confirmed: boolean | null;
  sort_order: number;
}

const BRANCHES = ["Army", "Navy", "Air Force", "Marines", "Coast Guard", "Space Force", "Civilian"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  speaker: SpeakerRow | null;
  onSaved: () => void;
}

export default function EditSpeakerModal({ open, onOpenChange, speaker, onSaved }: Props) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("presenter");
  const [topic, setTopic] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (speaker) {
      setName(speaker.creator_name || "");
      setTitle(speaker.creator_handle || "");
      setRole(speaker.role || "presenter");
      setTopic(speaker.topic || "");
      setBio(speaker.bio || "");
      setPhoto(speaker.avatar_url || "");
    }
  }, [speaker]);

  const handleSave = async () => {
    if (!speaker) return;
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("event_speakers")
        .update({
          creator_name: name.trim(),
          creator_handle: title.trim() || null,
          role,
          topic: topic.trim() || null,
          bio: bio.trim() || null,
          avatar_url: photo.trim() || null,
        })
        .eq("id", speaker.id);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Speaker updated");
        onSaved();
        onOpenChange(false);
      }
    } catch {
      toast.error("Failed to update speaker");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Speaker</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Title / Role</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder='e.g. "CEO at Company"' />
          </div>
          <div>
            <Label>Speaker Type</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPEAKER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Topic</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Talk topic" />
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Photo URL</Label>
            <Input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full mt-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Changes
        </Button>
      </DialogContent>
    </Dialog>
  );
}
