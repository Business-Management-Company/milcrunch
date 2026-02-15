import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Calendar, MapPin, Users, Mic, Handshake, Plus, Trash2,
  Save, Loader2, ExternalLink, Settings, Clock, LayoutList, Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

/* ---------- types ---------- */
interface EventRow {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  image_url: string | null;
  status: string | null;
  is_published: boolean | null;
  capacity: number | null;
  directory_id: string | null;
}
interface AgendaRow {
  id: string;
  day_number: number;
  start_time: string | null;
  end_time: string | null;
  title: string;
  description: string | null;
  location_room: string | null;
  session_type: string | null;
  sort_order: number;
}
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
interface SponsorRow {
  id: string;
  sponsor_name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string | null;
  description: string | null;
  sort_order: number;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  published: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};
const EVENT_TYPES = [
  { value: "conference", label: "Conference" },
  { value: "meetup", label: "Meetup" },
  { value: "pdx_experience", label: "PDX Experience" },
  { value: "virtual", label: "Virtual" },
  { value: "hybrid", label: "Hybrid" },
  { value: "live", label: "In-Person" },
];
const SESSION_TYPES = ["keynote", "panel", "breakout", "workshop", "networking", "meal", "pdx_experience"];
const SPEAKER_ROLES = ["keynote", "panelist", "moderator", "presenter", "mc"];
const SPONSOR_TIERS = ["title", "platinum", "gold", "silver", "bronze", "community"];
const TIER_COLORS: Record<string, string> = {
  title: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  platinum: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  gold: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  silver: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  bronze: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  community: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

/* ======================================== */
const BrandEventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [agenda, setAgenda] = useState<AgendaRow[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerRow[]>([]);
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);

  /* editable overview fields */
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editType, setEditType] = useState("conference");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editCover, setEditCover] = useState("");
  const [editCapacity, setEditCapacity] = useState("");

  /* ---- fetch ---- */
  const fetchAll = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [evRes, agRes, spkRes, spsRes] = await Promise.all([
        supabase.from("events").select("*").eq("id", eventId).single(),
        supabase.from("event_agenda").select("*").eq("event_id", eventId).order("day_number").order("sort_order"),
        supabase.from("event_speakers").select("*").eq("event_id", eventId).order("sort_order"),
        supabase.from("event_sponsors").select("*").eq("event_id", eventId).order("sort_order"),
      ]);
      if (evRes.error) throw evRes.error;
      const ev = evRes.data as unknown as EventRow;
      setEvent(ev);
      setEditTitle(ev.title || "");
      setEditDesc(ev.description || "");
      setEditType(ev.event_type || "conference");
      setEditStart(ev.start_date ? ev.start_date.slice(0, 10) : "");
      setEditEnd(ev.end_date ? ev.end_date.slice(0, 10) : "");
      setEditVenue(ev.venue || "");
      setEditCity(ev.city || "");
      setEditState(ev.state || "");
      setEditCover(ev.image_url || "");
      setEditCapacity(ev.capacity ? String(ev.capacity) : "");
      setAgenda((agRes.data || []) as AgendaRow[]);
      setSpeakers((spkRes.data || []) as SpeakerRow[]);
      setSponsors((spsRes.data || []) as SponsorRow[]);
    } catch (err) {
      console.error("Error loading event:", err);
      toast.error("Failed to load event");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ---- save overview ---- */
  const saveOverview = async () => {
    if (!eventId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          event_type: editType,
          start_date: editStart || null,
          end_date: editEnd || null,
          venue: editVenue.trim() || null,
          city: editCity.trim() || null,
          state: editState.trim() || null,
          image_url: editCover.trim() || null,
          capacity: editCapacity ? parseInt(editCapacity) : null,
        } as Record<string, unknown>)
        .eq("id", eventId);
      if (error) throw error;
      toast.success("Event updated");
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* ---- status change ---- */
  const changeStatus = async (newStatus: string) => {
    if (!eventId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: newStatus, is_published: newStatus !== "draft" } as Record<string, unknown>)
        .eq("id", eventId);
      if (error) throw error;
      toast.success(`Status changed to ${newStatus}`);
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  /* ---- add agenda ---- */
  const addAgendaItem = async () => {
    if (!eventId) return;
    const { error } = await supabase.from("event_agenda").insert({
      event_id: eventId,
      title: "New Session",
      day_number: 1,
      session_type: "breakout",
      sort_order: agenda.length,
    });
    if (error) toast.error(error.message);
    else fetchAll();
  };

  /* ---- add speaker ---- */
  const addSpeaker = async () => {
    if (!eventId) return;
    const { error } = await supabase.from("event_speakers").insert({
      event_id: eventId,
      creator_name: "New Speaker",
      role: "presenter",
      sort_order: speakers.length,
      added_by: user?.id || null,
    });
    if (error) toast.error(error.message);
    else fetchAll();
  };

  /* ---- add sponsor ---- */
  const addSponsor = async () => {
    if (!eventId) return;
    const { error } = await supabase.from("event_sponsors").insert({
      event_id: eventId,
      sponsor_name: "New Sponsor",
      tier: "community",
      sort_order: sponsors.length,
    });
    if (error) toast.error(error.message);
    else fetchAll();
  };

  /* ---- delete helpers ---- */
  const deleteAgenda = async (id: string) => {
    await supabase.from("event_agenda").delete().eq("id", id);
    fetchAll();
  };
  const deleteSpeaker = async (id: string) => {
    await supabase.from("event_speakers").delete().eq("id", id);
    fetchAll();
  };
  const deleteSponsor = async (id: string) => {
    await supabase.from("event_sponsors").delete().eq("id", id);
    fetchAll();
  };

  /* ---- inline edit helpers ---- */
  const updateAgendaField = async (id: string, field: string, value: unknown) => {
    await supabase.from("event_agenda").update({ [field]: value } as Record<string, unknown>).eq("id", id);
  };
  const updateSpeakerField = async (id: string, field: string, value: unknown) => {
    await supabase.from("event_speakers").update({ [field]: value } as Record<string, unknown>).eq("id", id);
  };
  const updateSponsorField = async (id: string, field: string, value: unknown) => {
    await supabase.from("event_sponsors").update({ [field]: value } as Record<string, unknown>).eq("id", id);
  };

  /* ---- delete event ---- */
  const deleteEvent = async () => {
    if (!eventId || !confirm("Delete this event and all associated data? This cannot be undone.")) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
      toast.success("Event deleted");
      navigate("/brand/events");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  /* ================================================================ */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!event) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Event not found.</p>
        <Button asChild variant="link" className="mt-4"><Link to="/brand/events">Back to Events</Link></Button>
      </div>
    );
  }

  const statusKey = (event.status || "draft") as string;

  return (
    <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/brand/events")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-pd-navy dark:text-white">{event.title}</h1>
                <Badge className={STATUS_STYLES[statusKey] + " text-xs font-medium capitalize"}>{statusKey}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {event.start_date ? format(new Date(event.start_date), "MMM d, yyyy") : "No date"}
                {event.end_date ? ` – ${format(new Date(event.end_date), "MMM d, yyyy")}` : ""}
                {event.city ? ` | ${[event.venue, event.city, event.state].filter(Boolean).join(", ")}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusKey === "draft" && (
              <Button size="sm" onClick={() => changeStatus("published")} disabled={saving} className="bg-pd-blue hover:bg-pd-darkblue text-white">
                <Eye className="h-4 w-4 mr-1" /> Publish
              </Button>
            )}
            {statusKey === "published" && (
              <Button size="sm" onClick={() => changeStatus("active")} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                Mark Active
              </Button>
            )}
            {statusKey === "active" && (
              <Button size="sm" variant="outline" onClick={() => changeStatus("completed")} disabled={saving}>
                Mark Completed
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-lg mb-6">
            <TabsTrigger value="overview"><LayoutList className="h-4 w-4 mr-1.5" />Overview</TabsTrigger>
            <TabsTrigger value="agenda"><Clock className="h-4 w-4 mr-1.5" />Agenda</TabsTrigger>
            <TabsTrigger value="speakers"><Mic className="h-4 w-4 mr-1.5" />Speakers</TabsTrigger>
            <TabsTrigger value="sponsors"><Handshake className="h-4 w-4 mr-1.5" />Sponsors</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1.5" />Settings</TabsTrigger>
          </TabsList>

          {/* ===== OVERVIEW ===== */}
          <TabsContent value="overview">
            <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>Event Name</Label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} className="mt-1" />
                </div>
                <div>
                  <Label>Event Type</Label>
                  <Select value={editType} onValueChange={setEditType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Max Attendees</Label>
                  <Input type="number" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Venue</Label>
                  <Input value={editVenue} onChange={(e) => setEditVenue(e.target.value)} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>City</Label>
                    <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input value={editState} onChange={(e) => setEditState(e.target.value)} className="mt-1" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label>Cover Image URL</Label>
                  <Input value={editCover} onChange={(e) => setEditCover(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={saveOverview} disabled={saving} className="bg-pd-blue hover:bg-pd-darkblue text-white">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ===== AGENDA ===== */}
          <TabsContent value="agenda">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{agenda.length} session{agenda.length !== 1 ? "s" : ""}</p>
              <Button size="sm" variant="outline" onClick={addAgendaItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Session
              </Button>
            </div>
            <div className="space-y-3">
              {agenda.map((a) => (
                <Card key={a.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs capitalize">{a.session_type}</Badge>
                        <span className="text-xs text-muted-foreground">Day {a.day_number}</span>
                        {a.start_time && <span className="text-xs text-muted-foreground">{a.start_time}–{a.end_time}</span>}
                        {a.location_room && <span className="text-xs text-muted-foreground">| {a.location_room}</span>}
                      </div>
                      <Input
                        defaultValue={a.title}
                        className="font-medium mb-1"
                        onBlur={(e) => updateAgendaField(a.id, "title", e.target.value)}
                      />
                      <Input
                        defaultValue={a.description || ""}
                        placeholder="Description..."
                        className="text-sm text-muted-foreground"
                        onBlur={(e) => updateAgendaField(a.id, "description", e.target.value || null)}
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700" onClick={() => deleteAgenda(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              {agenda.length === 0 && (
                <Card className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-8 text-center text-muted-foreground">
                  No agenda sessions yet.
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ===== SPEAKERS ===== */}
          <TabsContent value="speakers">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{speakers.length} speaker{speakers.length !== 1 ? "s" : ""}</p>
              <Button size="sm" variant="outline" onClick={addSpeaker}>
                <Plus className="h-4 w-4 mr-1" /> Add Speaker
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {speakers.map((s) => (
                <Card key={s.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-pd-blue/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Mic className="h-5 w-5 text-pd-blue" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input
                        defaultValue={s.creator_name || ""}
                        className="font-semibold text-sm mb-1"
                        onBlur={(e) => updateSpeakerField(s.id, "creator_name", e.target.value)}
                      />
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs capitalize">{s.role}</Badge>
                        {s.creator_handle && <span className="text-xs text-muted-foreground">@{s.creator_handle}</span>}
                        {s.confirmed && <Badge className="bg-green-100 text-green-700 text-xs">Confirmed</Badge>}
                      </div>
                      <Input
                        defaultValue={s.topic || ""}
                        placeholder="Topic..."
                        className="text-xs text-muted-foreground"
                        onBlur={(e) => updateSpeakerField(s.id, "topic", e.target.value || null)}
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700" onClick={() => deleteSpeaker(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            {speakers.length === 0 && (
              <Card className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-8 text-center text-muted-foreground">
                No speakers yet.
              </Card>
            )}
          </TabsContent>

          {/* ===== SPONSORS ===== */}
          <TabsContent value="sponsors">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{sponsors.length} sponsor{sponsors.length !== 1 ? "s" : ""}</p>
              <Button size="sm" variant="outline" onClick={addSponsor}>
                <Plus className="h-4 w-4 mr-1" /> Add Sponsor
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {sponsors.map((s) => (
                <Card key={s.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <Handshake className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input
                        defaultValue={s.sponsor_name}
                        className="font-semibold text-sm mb-1"
                        onBlur={(e) => updateSponsorField(s.id, "sponsor_name", e.target.value)}
                      />
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={(TIER_COLORS[s.tier || "community"] || TIER_COLORS.community) + " text-xs capitalize"}>
                          {s.tier}
                        </Badge>
                        {s.website_url && (
                          <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-pd-blue hover:underline flex items-center gap-0.5">
                            <ExternalLink className="h-3 w-3" /> Website
                          </a>
                        )}
                      </div>
                      {s.description && <p className="text-xs text-muted-foreground truncate">{s.description}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700" onClick={() => deleteSponsor(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            {sponsors.length === 0 && (
              <Card className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-8 text-center text-muted-foreground">
                No sponsors yet.
              </Card>
            )}
          </TabsContent>

          {/* ===== SETTINGS ===== */}
          <TabsContent value="settings">
            <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-1">Event Status</h3>
                <p className="text-sm text-muted-foreground mb-3">Change the visibility and lifecycle status of this event.</p>
                <div className="flex flex-wrap gap-2">
                  {["draft", "published", "active", "completed"].map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={statusKey === s ? "default" : "outline"}
                      className={statusKey === s ? "bg-pd-blue text-white" : "capitalize"}
                      onClick={() => changeStatus(s)}
                      disabled={saving}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>

              {event.directory_id && (
                <div>
                  <h3 className="font-semibold mb-1">Linked Directory</h3>
                  <p className="text-sm text-muted-foreground mb-2">This event has an auto-created creator directory.</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/brand/directory">
                      <Users className="h-4 w-4 mr-1" /> View Directory
                    </Link>
                  </Button>
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                <h3 className="font-semibold text-red-600 mb-1">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-3">Permanently delete this event and all its data (agenda, speakers, sponsors).</p>
                <Button variant="destructive" size="sm" onClick={deleteEvent} disabled={saving}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete Event
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BrandEventDetail;
