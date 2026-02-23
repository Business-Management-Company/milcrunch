import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, CheckCircle, Mic, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SPEAKER_TYPES = [
  { value: "keynote", label: "Keynote Speaker" },
  { value: "presenter", label: "Presenter" },
  { value: "panelist", label: "Panelist" },
  { value: "mc", label: "MC / Host" },
  { value: "moderator", label: "Moderator" },
  { value: "workshop_leader", label: "Workshop Leader" },
  { value: "fireside_chat", label: "Fireside Chat" },
  { value: "award_presenter", label: "Award Presenter" },
  { value: "special_guest", label: "Special Guest" },
];

export const SPEAKER_TYPE_COLORS: Record<string, string> = {
  keynote: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500",
  presenter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  panelist: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  mc: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  moderator: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  workshop_leader: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  fireside_chat: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  award_presenter: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  special_guest: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

const BRANCHES = ["Army", "Navy", "Air Force", "Marines", "Coast Guard", "Space Force", "Civilian"];

interface DirectoryPerson {
  id: string;
  name: string;
  branch: string | null;
  bio: string | null;
  photo_url: string | null;
  verified: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  userId: string | undefined;
  currentCount: number;
  onAdded: () => void;
}

export default function AddSpeakerModal({ open, onOpenChange, eventId, userId, currentCount, onAdded }: Props) {
  const [directorySearch, setDirectorySearch] = useState("");
  const [directoryResults, setDirectoryResults] = useState<DirectoryPerson[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // Manual form state
  const [manualName, setManualName] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualBio, setManualBio] = useState("");
  const [manualPhoto, setManualPhoto] = useState("");
  const [manualBranch, setManualBranch] = useState("");
  const [manualType, setManualType] = useState("presenter");
  const [manualTopic, setManualTopic] = useState("");
  const [manualInstagram, setManualInstagram] = useState("");
  const [manualTwitter, setManualTwitter] = useState("");
  const [manualLinkedin, setManualLinkedin] = useState("");

  // Search directory when query changes
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      searchDirectory(directorySearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [directorySearch, open]);

  const searchDirectory = async (query: string) => {
    setSearchLoading(true);
    try {
      // Search speakers table
      let speakersQuery = supabase
        .from("speakers")
        .select("id, name, branch, bio, photo_url, verification_id")
        .order("name");
      if (query.trim()) {
        speakersQuery = speakersQuery.ilike("name", `%${query.trim()}%`);
      }
      speakersQuery = speakersQuery.limit(20);
      const { data: speakersData } = await speakersQuery;

      // Get verification statuses for speakers with verification_id
      const verificationIds = (speakersData || [])
        .map((s) => s.verification_id)
        .filter(Boolean) as string[];

      let verifiedSet = new Set<string>();
      if (verificationIds.length > 0) {
        const { data: verifications } = await supabase
          .from("verifications")
          .select("id, status")
          .in("id", verificationIds)
          .eq("status", "verified");
        verifiedSet = new Set((verifications || []).map((v) => v.id));
      }

      const results: DirectoryPerson[] = (speakersData || []).map((s) => ({
        id: s.id,
        name: s.name,
        branch: s.branch,
        bio: s.bio,
        photo_url: s.photo_url,
        verified: s.verification_id ? verifiedSet.has(s.verification_id) : false,
      }));

      setDirectoryResults(results);
    } catch (err) {
      console.error("Error searching directory:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const addFromDirectory = async (person: DirectoryPerson) => {
    setAdding(true);
    try {
      const { error } = await supabase.from("event_speakers").insert({
        event_id: eventId,
        creator_name: person.name,
        avatar_url: person.photo_url,
        bio: person.bio,
        role: "presenter",
        sort_order: currentCount,
        added_by: userId || null,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`${person.name} added as speaker`);
        onAdded();
        onOpenChange(false);
      }
    } catch {
      toast.error("Failed to add speaker");
    } finally {
      setAdding(false);
    }
  };

  const addManually = async () => {
    if (!manualName.trim()) {
      toast.error("Name is required");
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("event_speakers").insert({
        event_id: eventId,
        creator_name: manualName.trim(),
        avatar_url: manualPhoto.trim() || null,
        bio: manualBio.trim() || null,
        role: manualType,
        topic: manualTopic.trim() || null,
        sort_order: currentCount,
        added_by: userId || null,
        creator_handle: manualTitle.trim() || null,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`${manualName.trim()} added as speaker`);
        onAdded();
        onOpenChange(false);
        resetManualForm();
      }
    } catch {
      toast.error("Failed to add speaker");
    } finally {
      setAdding(false);
    }
  };

  const resetManualForm = () => {
    setManualName("");
    setManualTitle("");
    setManualBio("");
    setManualPhoto("");
    setManualBranch("");
    setManualType("presenter");
    setManualTopic("");
    setManualInstagram("");
    setManualTwitter("");
    setManualLinkedin("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Speaker to Event</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="directory">
          <TabsList className="w-full">
            <TabsTrigger value="directory" className="flex-1">From Directory</TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">Add Manually</TabsTrigger>
          </TabsList>

          {/* ===== FROM DIRECTORY ===== */}
          <TabsContent value="directory" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search approved speakers..."
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {searchLoading && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!searchLoading && directoryResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                {directorySearch ? "No speakers found" : "No speakers in directory yet"}
              </p>
            )}

            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {directoryResults.map((person) => (
                <Card
                  key={person.id}
                  className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => !adding && addFromDirectory(person)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pd-blue/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {person.photo_url ? (
                        <img src={person.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Mic className="h-4 w-4 text-pd-blue" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{person.name}</span>
                        {person.verified && (
                          <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                        )}
                      </div>
                      {person.branch && (
                        <Badge variant="outline" className="text-xs mt-0.5">{person.branch}</Badge>
                      )}
                      {person.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{person.bio}</p>
                      )}
                    </div>
                    {adding ? (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ===== ADD MANUALLY ===== */}
          <TabsContent value="manual" className="space-y-3 mt-3">
            <div className="grid gap-3">
              <div>
                <Label>Name *</Label>
                <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Speaker name" />
              </div>
              <div>
                <Label>Title / Role</Label>
                <Input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder='e.g. "Keynote Speaker", "CEO at Company"' />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Speaker Type</Label>
                  <Select value={manualType} onValueChange={setManualType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SPEAKER_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Branch</Label>
                  <Select value={manualBranch} onValueChange={setManualBranch}>
                    <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Topic</Label>
                <Input value={manualTopic} onChange={(e) => setManualTopic(e.target.value)} placeholder="Talk topic or panel name" />
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea value={manualBio} onChange={(e) => setManualBio(e.target.value)} placeholder="Short bio..." rows={3} />
              </div>
              <div>
                <Label>Photo URL</Label>
                <Input value={manualPhoto} onChange={(e) => setManualPhoto(e.target.value)} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Instagram</Label>
                  <Input value={manualInstagram} onChange={(e) => setManualInstagram(e.target.value)} placeholder="@handle" className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Twitter / X</Label>
                  <Input value={manualTwitter} onChange={(e) => setManualTwitter(e.target.value)} placeholder="@handle" className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">LinkedIn</Label>
                  <Input value={manualLinkedin} onChange={(e) => setManualLinkedin(e.target.value)} placeholder="URL" className="text-sm" />
                </div>
              </div>
            </div>
            <Button onClick={addManually} disabled={adding || !manualName.trim()} className="w-full">
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Speaker
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
