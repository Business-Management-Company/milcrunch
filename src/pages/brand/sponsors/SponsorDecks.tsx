import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ExternalLink, Copy, FileText, X, Loader2 } from "lucide-react";
import { getSponsorDecks, upsertSponsorDeck, deleteSponsorDeck } from "@/lib/sponsor-db";
import type { SponsorDeck } from "@/lib/sponsor-types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface EventOption { id: string; title: string }

export default function SponsorDecks() {
  const [decks, setDecks] = useState<SponsorDeck[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // New deck form
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [eventId, setEventId] = useState("");

  useEffect(() => {
    (async () => {
      const [d, { data: ev }] = await Promise.all([
        getSponsorDecks(),
        supabase.from("events").select("id, title").order("start_date", { ascending: false }),
      ]);
      setDecks(d);
      setEvents((ev as EventOption[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const handleAdd = async () => {
    if (!title.trim() || !fileUrl.trim()) { toast({ title: "Title and URL required", variant: "destructive" }); return; }
    setSaving(true);
    const result = await upsertSponsorDeck({ title, file_url: fileUrl, event_id: eventId || null });
    setSaving(false);
    if (result) {
      setDecks((prev) => [result, ...prev]);
      setTitle("");
      setFileUrl("");
      setEventId("");
      setShowAdd(false);
      toast({ title: "Deck added!" });
    } else {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this deck?")) return;
    const ok = await deleteSponsorDeck(id);
    if (ok) {
      setDecks((prev) => prev.filter((d) => d.id !== id));
      toast({ title: "Deck deleted" });
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!" });
  };

  const eventName = (eId: string | null) => {
    if (!eId) return null;
    return events.find((e) => e.id === eId)?.title || null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sponsor Decks</h1>
          <p className="text-gray-500 text-sm mt-1">Upload and manage sponsorship deck PDFs.</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-[#6C5CE7] hover:bg-[#5A4BD5]">
          {showAdd ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Plus className="h-4 w-4 mr-2" /> Add Deck</>}
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <Card className="p-5 border-[#6C5CE7]/20 bg-[#6C5CE7]/5 space-y-4">
          <h3 className="font-semibold text-sm text-gray-700">Add Sponsorship Deck</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-gray-500">Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="MIC 2026 Sponsor Deck" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">File URL *</Label>
              <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="mt-1" placeholder="https://drive.google.com/..." />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Event (optional)</Label>
              <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">None</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={handleAdd} disabled={saving} className="bg-[#6C5CE7] hover:bg-[#5A4BD5]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {saving ? "Saving..." : "Save Deck"}
          </Button>
        </Card>
      )}

      {/* Decks list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : decks.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">No decks uploaded yet</h3>
          <p className="text-gray-500 text-sm mb-4">Add sponsorship deck PDFs so you can quickly share them with prospects.</p>
          <Button onClick={() => setShowAdd(true)} className="bg-[#6C5CE7] hover:bg-[#5A4BD5]">
            <Plus className="h-4 w-4 mr-2" /> Add First Deck
          </Button>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Date Added</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {decks.map((deck) => (
                <tr key={deck.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-500" />
                      <span className="font-medium text-gray-900">{deck.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {eventName(deck.event_id) ? (
                      <Badge variant="secondary" className="text-xs">{eventName(deck.event_id)}</Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(new Date(deck.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={deck.file_url} target="_blank" rel="noreferrer" title="Preview">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => copyLink(deck.file_url)} title="Copy link">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(deck.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
