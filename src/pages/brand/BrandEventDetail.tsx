import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Calendar, MapPin, Users, Mic, Handshake, Plus, Trash2,
  Save, Loader2, ExternalLink, Settings, Clock, LayoutList, Eye,
  Search, Download, CheckCircle2, XCircle, Ticket, Globe, Copy, Code, QrCode,
  MessageCircle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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
import EventCommunityTab from "@/components/EventCommunityTab";

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
  custom_subdomain: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  created_at: string | null;
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

interface RegistrationRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  military_branch: string | null;
  military_status: string | null;
  registration_code: string | null;
  status: string | null;
  checked_in: boolean | null;
  checked_in_at: string | null;
  created_at: string | null;
  ticket_id: string | null;
}
interface TicketRow {
  id: string;
  name: string;
  price: number;
  quantity: number | null;
  sold: number;
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
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [eventTickets, setEventTickets] = useState<TicketRow[]>([]);
  const [regSearch, setRegSearch] = useState("");

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

  /* public page fields */
  const [editSubdomain, setEditSubdomain] = useState("");
  const [editOgTitle, setEditOgTitle] = useState("");
  const [editOgDesc, setEditOgDesc] = useState("");
  const [editOgImage, setEditOgImage] = useState("");
  const [savingPublic, setSavingPublic] = useState(false);

  /* ---- fetch ---- */
  const fetchAll = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [evRes, agRes, spkRes, spsRes, regRes, tkRes] = await Promise.all([
        supabase.from("events").select("*").eq("id", eventId).single(),
        supabase.from("event_agenda").select("*").eq("event_id", eventId).order("day_number").order("sort_order"),
        supabase.from("event_speakers").select("*").eq("event_id", eventId).order("sort_order"),
        supabase.from("event_sponsors").select("*").eq("event_id", eventId).order("sort_order"),
        supabase.from("event_registrations").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
        supabase.from("event_tickets").select("id, name, price, quantity, sold").eq("event_id", eventId).order("sort_order"),
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
      setEditSubdomain(ev.custom_subdomain || "");
      setEditOgTitle(ev.og_title || "");
      setEditOgDesc(ev.og_description || "");
      setEditOgImage(ev.og_image_url || "");
      setAgenda((agRes.data || []) as AgendaRow[]);
      setSpeakers((spkRes.data || []) as SpeakerRow[]);
      setSponsors((spsRes.data || []) as SponsorRow[]);
      setRegistrations((regRes.data || []) as RegistrationRow[]);
      setEventTickets((tkRes.data || []) as TicketRow[]);
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

  /* ---- save public page ---- */
  const savePublicPage = async () => {
    if (!eventId) return;
    setSavingPublic(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          custom_subdomain: editSubdomain.trim() || null,
          og_title: editOgTitle.trim() || null,
          og_description: editOgDesc.trim() || null,
          og_image_url: editOgImage.trim() || null,
        } as Record<string, unknown>)
        .eq("id", eventId);
      if (error) throw error;
      toast.success("Public page settings saved");
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingPublic(false);
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
            <TabsTrigger value="registrations"><Ticket className="h-4 w-4 mr-1.5" />Registrations{registrations.length > 0 && <Badge className="ml-1.5 bg-emerald-100 text-emerald-700 text-xs">{registrations.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="community"><MessageCircle className="h-4 w-4 mr-1.5" />Community</TabsTrigger>
            <TabsTrigger value="public-page"><Globe className="h-4 w-4 mr-1.5" />Public Page</TabsTrigger>
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

          {/* ===== REGISTRATIONS ===== */}
          <TabsContent value="registrations">
            {(() => {
              const ticketMap = Object.fromEntries(eventTickets.map((t) => [t.id, t]));
              const filteredRegs = registrations.filter((r) => {
                const q = regSearch.toLowerCase();
                if (!q) return true;
                return (
                  r.first_name.toLowerCase().includes(q) ||
                  r.last_name.toLowerCase().includes(q) ||
                  r.email.toLowerCase().includes(q) ||
                  (r.military_branch || "").toLowerCase().includes(q)
                );
              });
              const checkedInCount = registrations.filter((r) => r.checked_in).length;

              const toggleCheckIn = async (reg: RegistrationRow) => {
                const newVal = !reg.checked_in;
                await supabase
                  .from("event_registrations")
                  .update({
                    checked_in: newVal,
                    checked_in_at: newVal ? new Date().toISOString() : null,
                  } as Record<string, unknown>)
                  .eq("id", reg.id);
                fetchAll();
              };

              const exportCSV = () => {
                const headers = ["First Name", "Last Name", "Email", "Phone", "Ticket", "Branch", "Status", "Registered", "Checked In"];
                const rows = registrations.map((r) => [
                  r.first_name, r.last_name, r.email, r.phone || "",
                  ticketMap[r.ticket_id || ""]?.name || "—",
                  r.military_branch || "", r.status || "",
                  r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
                  r.checked_in ? "Yes" : "No",
                ]);
                const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `registrations-${eventId}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              };

              return (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4 text-center">
                      <p className="text-2xl font-bold text-pd-blue">{registrations.length}</p>
                      <p className="text-xs text-muted-foreground">Total Registered</p>
                    </Card>
                    <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{checkedInCount}</p>
                      <p className="text-xs text-muted-foreground">Checked In</p>
                    </Card>
                    {eventTickets.slice(0, 2).map((t) => (
                      <Card key={t.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4 text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {registrations.filter((r) => r.ticket_id === t.id).length}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{t.name}</p>
                      </Card>
                    ))}
                  </div>

                  {/* Search + Export */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, branch..."
                        value={regSearch}
                        onChange={(e) => setRegSearch(e.target.value)}
                        className="pl-10 bg-white dark:bg-[#1A1D27]"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={exportCSV}>
                      <Download className="h-4 w-4 mr-1" /> Export CSV
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/events/${eventId}`} target="_blank">
                        <ExternalLink className="h-4 w-4 mr-1" /> Public Page
                      </Link>
                    </Button>
                  </div>

                  {/* Table */}
                  {filteredRegs.length === 0 ? (
                    <Card className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-8 text-center text-muted-foreground">
                      {registrations.length === 0 ? "No registrations yet." : "No results match your search."}
                    </Card>
                  ) : (
                    <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-[#151821] text-left">
                            <tr>
                              <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                              <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                              <th className="px-4 py-3 font-medium text-muted-foreground">Ticket</th>
                              <th className="px-4 py-3 font-medium text-muted-foreground">Branch</th>
                              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                              <th className="px-4 py-3 font-medium text-muted-foreground">Registered</th>
                              <th className="px-4 py-3 font-medium text-muted-foreground text-center">Check-in</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredRegs.map((r) => (
                              <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1E2130]">
                                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                                  {r.first_name} {r.last_name}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className="text-xs">
                                    {ticketMap[r.ticket_id || ""]?.name || "—"}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{r.military_branch || "—"}</td>
                                <td className="px-4 py-3">
                                  <Badge className={r.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                                    {r.status}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => toggleCheckIn(r)}
                                    className={r.checked_in ? "text-emerald-600" : "text-gray-300 hover:text-gray-500"}
                                  >
                                    {r.checked_in ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </div>
              );
            })()}
          </TabsContent>

          {/* ===== COMMUNITY ===== */}
          <TabsContent value="community">
            <EventCommunityTab
              eventId={eventId!}
              eventCreatedAt={event.created_at ?? null}
              eventStartDate={event.start_date}
              registrationCount={registrations.length}
            />
          </TabsContent>

          {/* ===== PUBLIC PAGE ===== */}
          <TabsContent value="public-page">
            {(() => {
              const publicUrl = `https://milcrunch.com/events/${eventId}`;
              const registerUrl = `${publicUrl}/register`;
              const subdomainStatus = event.custom_subdomain ? "active" : "not_configured";
              const ogTitle = editOgTitle || event.title;
              const ogDesc = editOgDesc || (event.description || "").slice(0, 160);
              const ogImage = editOgImage || event.image_url || "";

              const copyToClipboard = (text: string, label: string) => {
                navigator.clipboard.writeText(text);
                toast.success(`${label} copied to clipboard`);
              };

              const downloadQR = () => {
                const svg = document.getElementById("event-qr-code");
                if (!svg) return;
                const svgData = new XMLSerializer().serializeToString(svg);
                const canvas = document.createElement("canvas");
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext("2d");
                const img = new Image();
                img.onload = () => {
                  ctx?.drawImage(img, 0, 0, 512, 512);
                  const a = document.createElement("a");
                  a.download = `event-qr-${eventId}.png`;
                  a.href = canvas.toDataURL("image/png");
                  a.click();
                };
                img.src = "data:image/svg+xml;base64," + btoa(svgData);
              };

              const embedCode = `<iframe src="${registerUrl}" width="100%" height="700" frameborder="0" style="border:none;border-radius:8px;"></iframe>`;

              return (
                <div className="space-y-6">
                  {/* Live Preview Link */}
                  <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-pd-blue" /> Live Preview
                    </h3>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <code className="text-sm bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg flex-1 truncate block w-full">
                        {publicUrl}
                      </code>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(publicUrl, "URL")}>
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </Button>
                        <Button size="sm" className="bg-pd-blue hover:bg-pd-darkblue text-white" asChild>
                          <a href={`/events/${eventId}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" /> View Public Page
                          </a>
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Custom Domain / Subdomain */}
                  <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-pd-blue" /> Custom Event URL
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">Set a custom subdomain for your event page.</p>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Current URL</Label>
                        <p className="text-sm font-mono mt-0.5">{publicUrl}</p>
                      </div>
                      <div>
                        <Label>Custom Subdomain</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={editSubdomain}
                            onChange={(e) => setEditSubdomain(e.target.value)}
                            placeholder="mic2026"
                            className="max-w-xs"
                          />
                          <span className="text-sm text-muted-foreground">.recurrentx.com</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          e.g., mic2026.recurrentx.com, milspousefest-sandiego.recurrentx.com
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          {subdomainStatus === "active" ? (
                            <span className="flex items-center gap-1.5 text-sm">
                              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                              <span className="text-yellow-600 dark:text-yellow-400 font-medium">Pending Setup</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-sm">
                              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                              <span className="text-muted-foreground">Not configured</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                        Custom domains are configured by the RecurrentX team. Contact support for setup.
                      </p>
                    </div>
                  </Card>

                  {/* SEO & Social Sharing */}
                  <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <Search className="h-4 w-4 text-pd-blue" /> SEO & Social Sharing
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">Control how your event appears when shared on social media.</p>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-4">
                        <div>
                          <Label>OG Title</Label>
                          <Input
                            value={editOgTitle}
                            onChange={(e) => setEditOgTitle(e.target.value)}
                            placeholder={event.title}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-0.5">Defaults to event title if blank</p>
                        </div>
                        <div>
                          <Label>OG Description</Label>
                          <Textarea
                            value={editOgDesc}
                            onChange={(e) => setEditOgDesc(e.target.value)}
                            placeholder={(event.description || "").slice(0, 160)}
                            rows={3}
                            className="mt-1"
                            maxLength={160}
                          />
                          <p className="text-xs text-muted-foreground mt-0.5">{editOgDesc.length}/160 characters</p>
                        </div>
                        <div>
                          <Label>OG Image URL</Label>
                          <Input
                            value={editOgImage}
                            onChange={(e) => setEditOgImage(e.target.value)}
                            placeholder={event.image_url || "https://..."}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-0.5">Defaults to event cover image if blank</p>
                        </div>
                      </div>

                      {/* Social Preview Card */}
                      <div>
                        <Label className="mb-2 block">Social Preview</Label>
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#1A1D27]">
                          {ogImage ? (
                            <div className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
                              <img src={ogImage} alt="OG Preview" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <Calendar className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="p-3">
                            <p className="text-xs text-muted-foreground uppercase">milcrunch.com</p>
                            <p className="font-semibold text-sm mt-0.5 line-clamp-1">{ogTitle}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ogDesc || "No description"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Embed Code */}
                  <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <Code className="h-4 w-4 text-pd-blue" /> Embed Registration on Your Site
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">Copy the code below to embed the registration form on any website.</p>

                    <div className="relative">
                      <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                        {embedCode}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(embedCode, "Embed code")}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                      </Button>
                    </div>

                    <div className="mt-4">
                      <Label className="mb-2 block text-xs text-muted-foreground">Embed Preview</Label>
                      <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                        <div className="bg-white dark:bg-[#1A1D27] rounded border border-gray-200 dark:border-gray-700 p-6 text-center max-w-md mx-auto">
                          <Calendar className="h-8 w-8 text-pd-blue mx-auto mb-2" />
                          <p className="font-semibold text-sm">{event.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">Registration Form</p>
                          <div className="mt-3 space-y-2">
                            <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                            <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                            <div className="h-8 bg-pd-blue/20 rounded w-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* QR Code */}
                  <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-pd-blue" /> QR Code
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">Scan to open the public event page. Great for printed materials, signage, and badges.</p>

                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="bg-white p-4 rounded-xl border border-gray-200 dark:border-gray-300 inline-block">
                        <QRCodeSVG
                          id="event-qr-code"
                          value={publicUrl}
                          size={180}
                          level="H"
                          includeMargin={false}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-mono text-muted-foreground">{publicUrl}</p>
                        <Button variant="outline" size="sm" onClick={downloadQR}>
                          <Download className="h-4 w-4 mr-1" /> Download QR Code (PNG)
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Save All Button */}
                  <div className="flex justify-end">
                    <Button onClick={savePublicPage} disabled={savingPublic} className="bg-pd-blue hover:bg-pd-darkblue text-white">
                      {savingPublic ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Public Page Settings
                    </Button>
                  </div>
                </div>
              );
            })()}
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
