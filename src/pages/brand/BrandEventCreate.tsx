import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Plus, Trash2, GripVertical, Loader2,
  ClipboardList, Calendar, Mic, Handshake, CheckCircle, Ticket,
  MessageCircle, MapPin, LogOut,
} from "lucide-react";
import CityAutocomplete from "@/components/CityAutocomplete";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { cn } from "@/lib/utils";

/* ---------- types ---------- */
interface AgendaItem {
  key: string;
  day_number: number;
  start_time: string;
  end_time: string;
  title: string;
  description: string;
  location_room: string;
  session_type: string;
}
interface SpeakerItem {
  key: string;
  creator_name: string;
  creator_handle: string;
  avatar_url: string;
  role: string;
  topic: string;
  bio: string;
}
interface SponsorItem {
  key: string;
  sponsor_name: string;
  logo_url: string;
  website_url: string;
  tier: string;
  description: string;
}
interface TicketItem {
  key: string;
  name: string;
  price: number;
  quantity: number;
  description: string;
  event_format: string;
  qr_enabled: boolean;
}
interface LocalResourceItem {
  key: string;
  category: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  notes: string;
}

const EVENT_TYPES = [
  { value: "conference", label: "Conference" },
  { value: "meetup", label: "Meetup" },
  { value: "pdx_experience", label: "PDX Experience" },
  { value: "virtual", label: "Virtual" },
  { value: "hybrid", label: "Hybrid" },
];
const SESSION_TYPES = ["keynote", "panel", "breakout", "workshop", "networking", "meal", "pdx_experience"];
const SPEAKER_ROLES = ["keynote", "panelist", "moderator", "presenter", "mc"];
const SPONSOR_TIERS = ["title", "platinum", "gold", "silver", "bronze", "community"];
const EVENT_FORMATS = [
  { value: "in_person", label: "In-Person" },
  { value: "virtual", label: "Virtual" },
  { value: "hybrid", label: "Hybrid" },
];
const RESOURCE_CATEGORIES = [
  { value: "hotels", label: "Hotels & Lodging", emoji: "\u{1F3E8}" },
  { value: "restaurants", label: "Restaurants & Dining", emoji: "\u{1F37D}" },
  { value: "transportation", label: "Transportation", emoji: "\u{1F697}" },
  { value: "printing", label: "Printing Services", emoji: "\u{1F5A8}" },
  { value: "av_equipment", label: "AV Equipment Rental", emoji: "\u{1F3A5}" },
  { value: "medical", label: "Medical / Urgent Care", emoji: "\u{1F3E5}" },
];
const COMMUNITY_CHANNELS = [
  { key: "general", label: "General Discussion" },
  { key: "announcements", label: "Announcements" },
  { key: "qa", label: "Q&A" },
  { key: "networking", label: "Networking" },
  { key: "travel", label: "Travel & Logistics" },
];

const STEPS = [
  { label: "Basics", icon: ClipboardList },
  { label: "Tickets", icon: Ticket },
  { label: "Agenda", icon: Calendar },
  { label: "Speakers", icon: Mic },
  { label: "Sponsors", icon: Handshake },
  { label: "Community", icon: MessageCircle },
  { label: "Resources", icon: MapPin },
  { label: "Review", icon: CheckCircle },
];

let keyCounter = 0;
const nextKey = () => `k-${++keyCounter}`;

/* ======================================== */
const BrandEventCreate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  /* Step 0 — basics */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("conference");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [capacity, setCapacity] = useState("");

  /* Step 1 — tickets */
  const [tickets, setTickets] = useState<TicketItem[]>([
    { key: nextKey(), name: "General Admission", price: 0, quantity: 500, description: "", event_format: "in_person", qr_enabled: true },
  ]);

  /* Step 2 — agenda */
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);

  /* Step 3 — speakers */
  const [speakers, setSpeakers] = useState<SpeakerItem[]>([]);

  /* Step 4 — sponsors */
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);

  /* Step 5 — community */
  const [communityEnabled, setCommunityEnabled] = useState(true);
  const [communityName, setCommunityName] = useState("");
  const [communityWelcome, setCommunityWelcome] = useState("");
  const [communityChannels, setCommunityChannels] = useState<Record<string, boolean>>({
    general: true, announcements: true, qa: true, networking: true, travel: true,
  });

  /* Step 6 — local resources */
  const [resourceToggles, setResourceToggles] = useState<Record<string, boolean>>({
    hotels: true, restaurants: true, transportation: true, printing: true, av_equipment: true, medical: true,
  });
  const [localResources, setLocalResources] = useState<LocalResourceItem[]>([]);

  /* ---- date auto-follow ---- */
  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (newStart && (!endDate || endDate < newStart)) {
      setEndDate(newStart);
    }
  };

  /* ---- ticket helpers ---- */
  const addTicket = () =>
    setTickets((prev) => [...prev, { key: nextKey(), name: "", price: 0, quantity: 100, description: "", event_format: "in_person", qr_enabled: true }]);
  const removeTicket = (key: string) => setTickets((prev) => prev.filter((t) => t.key !== key));
  const updateTicket = (key: string, field: string, value: string | number | boolean) =>
    setTickets((prev) => prev.map((t) => (t.key === key ? { ...t, [field]: value } : t)));

  /* ---- agenda helpers ---- */
  const addAgendaItem = () =>
    setAgenda((prev) => [
      ...prev,
      { key: nextKey(), day_number: 1, start_time: "09:00", end_time: "10:00", title: "", description: "", location_room: "", session_type: "breakout" },
    ]);
  const removeAgendaItem = (key: string) => setAgenda((prev) => prev.filter((a) => a.key !== key));
  const updateAgenda = (key: string, field: string, value: string | number) =>
    setAgenda((prev) => prev.map((a) => (a.key === key ? { ...a, [field]: value } : a)));

  /* ---- speaker helpers ---- */
  const addSpeaker = () =>
    setSpeakers((prev) => [...prev, { key: nextKey(), creator_name: "", creator_handle: "", avatar_url: "", role: "presenter", topic: "", bio: "" }]);
  const removeSpeaker = (key: string) => setSpeakers((prev) => prev.filter((s) => s.key !== key));
  const updateSpeaker = (key: string, field: string, value: string) =>
    setSpeakers((prev) => prev.map((s) => (s.key === key ? { ...s, [field]: value } : s)));

  /* ---- sponsor helpers ---- */
  const addSponsor = () =>
    setSponsors((prev) => [...prev, { key: nextKey(), sponsor_name: "", logo_url: "", website_url: "", tier: "community", description: "" }]);
  const removeSponsor = (key: string) => setSponsors((prev) => prev.filter((s) => s.key !== key));
  const updateSponsor = (key: string, field: string, value: string) =>
    setSponsors((prev) => prev.map((s) => (s.key === key ? { ...s, [field]: value } : s)));

  /* ---- local resource helpers ---- */
  const addLocalResource = (category: string) =>
    setLocalResources((prev) => [...prev, { key: nextKey(), category, name: "", address: "", phone: "", website: "", notes: "" }]);
  const removeLocalResource = (key: string) => setLocalResources((prev) => prev.filter((r) => r.key !== key));
  const updateLocalResource = (key: string, field: string, value: string) =>
    setLocalResources((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  /* ---- save step 0: basics ---- */
  const saveBasics = async () => {
    if (!title.trim()) {
      toast.error("Event name is required");
      return false;
    }
    setSaving(true);
    try {
      if (createdEventId) {
        const { error } = await supabase
          .from("events")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            event_type: eventType,
            start_date: startDate || null,
            end_date: endDate || null,
            venue: venue.trim() || null,
            city: city.trim() || null,
            state: state.trim() || null,
            cover_image_url: coverUrl.trim() || null,
            capacity: capacity ? parseInt(capacity) : null,
          } as Record<string, unknown>)
          .eq("id", createdEventId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("events")
          .insert({
            title: title.trim(),
            description: description.trim() || null,
            event_type: eventType,
            start_date: startDate || null,
            end_date: endDate || null,
            venue: venue.trim() || null,
            city: city.trim() || null,
            state: state.trim() || null,
            cover_image_url: coverUrl.trim() || null,
            capacity: capacity ? parseInt(capacity) : null,
            is_published: false,
            created_by: user?.id || null,
          } as Record<string, unknown>)
          .select("id")
          .single();
        if (error) throw error;
        setCreatedEventId(data.id);
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save event";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  /* ---- save step 1: tickets ---- */
  const saveTickets = async () => {
    if (!createdEventId) return true;
    const items = tickets.filter((t) => t.name.trim());
    if (items.length === 0) return true;
    setSaving(true);
    try {
      await supabase.from("event_tickets").delete().eq("event_id", createdEventId);
      const rows = items.map((t, i) => ({
        event_id: createdEventId,
        name: t.name.trim(),
        price: t.price,
        quantity: t.quantity,
        description: t.description.trim() || null,
        event_format: t.event_format,
        qr_enabled: t.qr_enabled,
        is_active: true,
        sort_order: i,
      }));
      const { error } = await supabase.from("event_tickets").insert(rows);
      if (error) throw error;
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save tickets";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  /* ---- save step 2: agenda ---- */
  const saveAgenda = async () => {
    if (!createdEventId) return true;
    const items = agenda.filter((a) => a.title.trim());
    if (items.length === 0) return true;
    setSaving(true);
    try {
      await supabase.from("event_agenda").delete().eq("event_id", createdEventId);
      const rows = items.map((a, i) => ({
        event_id: createdEventId,
        day_number: a.day_number,
        start_time: a.start_time || null,
        end_time: a.end_time || null,
        title: a.title.trim(),
        description: a.description.trim() || null,
        location_room: a.location_room.trim() || null,
        session_type: a.session_type,
        sort_order: i,
      }));
      const { error } = await supabase.from("event_agenda").insert(rows);
      if (error) throw error;
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save agenda";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  /* ---- save step 3: speakers ---- */
  const saveSpeakers = async () => {
    if (!createdEventId) return true;
    const items = speakers.filter((s) => s.creator_name.trim());
    if (items.length === 0) return true;
    setSaving(true);
    try {
      await supabase.from("event_speakers").delete().eq("event_id", createdEventId);
      const rows = items.map((s, i) => ({
        event_id: createdEventId,
        creator_name: s.creator_name.trim(),
        creator_handle: s.creator_handle.trim() || null,
        avatar_url: s.avatar_url.trim() || null,
        role: s.role,
        topic: s.topic.trim() || null,
        bio: s.bio.trim() || null,
        sort_order: i,
        confirmed: false,
        added_by: user?.id || null,
      }));
      const { error } = await supabase.from("event_speakers").insert(rows);
      if (error) throw error;
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save speakers";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  /* ---- save step 4: sponsors ---- */
  const saveSponsors = async () => {
    if (!createdEventId) return true;
    const items = sponsors.filter((s) => s.sponsor_name.trim());
    if (items.length === 0) return true;
    setSaving(true);
    try {
      await supabase.from("event_sponsors").delete().eq("event_id", createdEventId);
      const rows = items.map((s, i) => ({
        event_id: createdEventId,
        sponsor_name: s.sponsor_name.trim(),
        logo_url: s.logo_url.trim() || null,
        website_url: s.website_url.trim() || null,
        tier: s.tier,
        description: s.description.trim() || null,
        sort_order: i,
      }));
      const { error } = await supabase.from("event_sponsors").insert(rows);
      if (error) throw error;
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save sponsors";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  /* ---- save step 5: community (save enabled flag to events) ---- */
  const saveCommunity = async () => {
    if (!createdEventId) return true;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          community_enabled: communityEnabled,
        } as Record<string, unknown>)
        .eq("id", createdEventId);
      if (error) throw error;
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save community settings";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  /* ---- save step 6: local resources ---- */
  const saveLocalResources = async () => {
    if (!createdEventId) return true;
    const items = localResources.filter((r) => r.name.trim());
    if (items.length === 0) return true;
    setSaving(true);
    try {
      await supabase.from("event_local_resources").delete().eq("event_id", createdEventId);
      const rows = items.map((r, i) => ({
        event_id: createdEventId,
        category: r.category,
        name: r.name.trim(),
        address: r.address.trim() || null,
        phone: r.phone.trim() || null,
        website: r.website.trim() || null,
        notes: r.notes.trim() || null,
        is_enabled: true,
        sort_order: i,
      }));
      const { error } = await supabase.from("event_local_resources").insert(rows);
      if (error) throw error;
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save local resources";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  /* ---- publish ---- */
  const publishEvent = async () => {
    if (!createdEventId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: "published", is_published: true } as Record<string, unknown>)
        .eq("id", createdEventId);
      if (error) throw error;
      toast.success("Event published!");
      navigate(`/brand/events/${createdEventId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to publish";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    if (!createdEventId) return;
    toast.success("Event saved as draft");
    navigate(`/brand/events/${createdEventId}`);
  };

  /* ---- save & exit (saves current step then navigates away) ---- */
  const handleSaveAndExit = async () => {
    if (!createdEventId && step === 0) {
      const ok = await saveBasics();
      if (!ok) return;
    } else if (step === 1) {
      await saveTickets();
    } else if (step === 2) {
      await saveAgenda();
    } else if (step === 3) {
      await saveSpeakers();
    } else if (step === 4) {
      await saveSponsors();
    } else if (step === 5) {
      await saveCommunity();
    } else if (step === 6) {
      await saveLocalResources();
    }
    if (createdEventId) {
      toast.success("Progress saved");
      navigate(`/brand/events/${createdEventId}`);
    } else {
      navigate("/brand/events");
    }
  };

  /* ---- step navigation ---- */
  const handleNext = async () => {
    if (step === 0) {
      const ok = await saveBasics();
      if (!ok) return;
    } else if (step === 1) {
      const ok = await saveTickets();
      if (!ok) return;
    } else if (step === 2) {
      const ok = await saveAgenda();
      if (!ok) return;
    } else if (step === 3) {
      const ok = await saveSpeakers();
      if (!ok) return;
    } else if (step === 4) {
      const ok = await saveSponsors();
      if (!ok) return;
    } else if (step === 5) {
      const ok = await saveCommunity();
      if (!ok) return;
    } else if (step === 6) {
      const ok = await saveLocalResources();
      if (!ok) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSkip = () => {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const effectiveCommunityName = communityName || (title ? `${title} Community` : "Event Community");
  const effectiveWelcome = communityWelcome || `Welcome to the ${title || "event"} community! Connect with fellow attendees year-round.`;

  /* ================================================================ */
  return (
    <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/brand/events")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-pd-navy dark:text-white">Create Event</h1>
            <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}: {STEPS[step].label}</p>
          </div>
        </div>

        {/* Step indicator with icons */}
        <div className="flex items-center mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const StepIcon = s.icon;
            const isActive = i === step;
            const isCompleted = i < step;
            const isClickable = isCompleted;
            return (
              <div key={s.label} className="flex items-center flex-1 last:flex-none min-w-0">
                <button
                  type="button"
                  onClick={() => isClickable && setStep(i)}
                  disabled={!isClickable && !isActive}
                  className={cn(
                    "flex flex-col items-center gap-1.5 min-w-[56px] transition-colors",
                    isClickable && "cursor-pointer",
                    !isClickable && !isActive && "cursor-default"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                      isActive && "bg-purple-500 border-purple-500 text-white",
                      isCompleted && "bg-purple-500 border-purple-500 text-white",
                      !isActive && !isCompleted && "bg-transparent border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500"
                    )}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium whitespace-nowrap",
                      isActive && "text-purple-600 dark:text-purple-400",
                      isCompleted && "text-purple-600 dark:text-purple-400",
                      !isActive && !isCompleted && "text-gray-400 dark:text-gray-500"
                    )}
                  >
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-1 mt-[-18px] min-w-[8px]",
                      i < step ? "bg-purple-500" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ===== STEP 0: Basics ===== */}
        {step === 0 && (
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Event Name *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Military Influencer Conference 2026" className="mt-1" />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell attendees what this event is about..." rows={3} className="mt-1" />
              </div>
              <div>
                <Label>Event Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Attendees</Label>
                <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="500" className="mt-1" />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} className="mt-1" />
              </div>
              <div>
                <Label>Venue / Location Name</Label>
                <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Washington Convention Center" className="mt-1" />
              </div>
              <div>
                <Label>City / State</Label>
                <CityAutocomplete
                  value={city ? (state ? `${city}, ${state}` : city) : ""}
                  onSelect={(c, s) => { setCity(c); setState(s); }}
                  placeholder="Search city or base..."
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Cover Image URL</Label>
                <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." className="mt-1" />
              </div>
            </div>
          </Card>
        )}

        {/* ===== STEP 1: Tickets ===== */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Define ticket types for your event. You can adjust these later.</p>
              <Button size="sm" variant="outline" onClick={addTicket}>
                <Plus className="h-4 w-4 mr-1" /> Add Ticket
              </Button>
            </div>
            {tickets.length === 0 ? (
              <Card className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-8 text-center text-muted-foreground">
                No tickets added yet. Click "Add Ticket" to begin.
              </Card>
            ) : (
              tickets.map((t) => (
                <Card key={t.key} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid gap-3 md:grid-cols-3">
                      <div>
                        <Label className="text-xs">Ticket Name *</Label>
                        <Input value={t.name} onChange={(e) => updateTicket(t.key, "name", e.target.value)} placeholder="General Admission" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Price ($)</Label>
                        <Input type="number" min={0} value={t.price} onChange={(e) => updateTicket(t.key, "price", parseFloat(e.target.value) || 0)} placeholder="0" className="mt-1" />
                        {t.price === 0 && <span className="text-xs text-green-600 font-medium">Free</span>}
                      </div>
                      <div>
                        <Label className="text-xs">Quantity</Label>
                        <Input type="number" min={1} value={t.quantity} onChange={(e) => updateTicket(t.key, "quantity", parseInt(e.target.value) || 1)} className="mt-1" />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-xs">Description</Label>
                        <Textarea value={t.description} onChange={(e) => updateTicket(t.key, "description", e.target.value)} placeholder="What's included with this ticket..." rows={2} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Event Format</Label>
                        <Select value={t.event_format} onValueChange={(v) => updateTicket(t.key, "event_format", v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {EVENT_FORMATS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {(t.event_format === "in_person" || t.event_format === "hybrid") && (
                        <div className="flex items-center gap-3 md:col-span-2">
                          <Switch
                            checked={t.qr_enabled}
                            onCheckedChange={(v) => updateTicket(t.key, "qr_enabled", v)}
                          />
                          <Label className="text-xs">Enable QR Code Check-In</Label>
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700" onClick={() => removeTicket(t.key)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ===== STEP 2: Agenda ===== */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Add sessions to your event agenda. You can skip this and add them later.</p>
              <Button size="sm" variant="outline" onClick={addAgendaItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Session
              </Button>
            </div>
            {agenda.length === 0 ? (
              <Card className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-8 text-center text-muted-foreground">
                No sessions added yet. Click "Add Session" to begin.
              </Card>
            ) : (
              agenda.map((item) => (
                <Card key={item.key} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4">
                  <div className="flex items-start gap-3">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2 shrink-0" />
                    <div className="flex-1 grid gap-3 md:grid-cols-4">
                      <div className="md:col-span-2">
                        <Label className="text-xs">Session Title *</Label>
                        <Input value={item.title} onChange={(e) => updateAgenda(item.key, "title", e.target.value)} placeholder="Opening Keynote" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select value={item.session_type} onValueChange={(v) => updateAgenda(item.key, "session_type", v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SESSION_TYPES.map((t) => (
                              <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Day</Label>
                        <Input type="number" min={1} value={item.day_number} onChange={(e) => updateAgenda(item.key, "day_number", parseInt(e.target.value) || 1)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Start</Label>
                        <Input type="time" value={item.start_time} onChange={(e) => updateAgenda(item.key, "start_time", e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">End</Label>
                        <Input type="time" value={item.end_time} onChange={(e) => updateAgenda(item.key, "end_time", e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Room</Label>
                        <Input value={item.location_room} onChange={(e) => updateAgenda(item.key, "location_room", e.target.value)} placeholder="Main Ballroom" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Input value={item.description} onChange={(e) => updateAgenda(item.key, "description", e.target.value)} placeholder="Session details..." className="mt-1" />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700" onClick={() => removeAgendaItem(item.key)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ===== STEP 3: Speakers ===== */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Add speakers and assign roles. You can add them later from the event detail page.</p>
              <Button size="sm" variant="outline" onClick={addSpeaker}>
                <Plus className="h-4 w-4 mr-1" /> Add Speaker
              </Button>
            </div>
            {speakers.length === 0 ? (
              <Card className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-8 text-center text-muted-foreground">
                No speakers added yet.
              </Card>
            ) : (
              speakers.map((s) => (
                <Card key={s.key} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid gap-3 md:grid-cols-3">
                      <div>
                        <Label className="text-xs">Name *</Label>
                        <Input value={s.creator_name} onChange={(e) => updateSpeaker(s.key, "creator_name", e.target.value)} placeholder="Marcus Thompson" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Handle</Label>
                        <Input value={s.creator_handle} onChange={(e) => updateSpeaker(s.key, "creator_handle", e.target.value)} placeholder="@marcus_vet" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Role</Label>
                        <Select value={s.role} onValueChange={(v) => updateSpeaker(s.key, "role", v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SPEAKER_ROLES.map((r) => (
                              <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">Topic</Label>
                        <Input value={s.topic} onChange={(e) => updateSpeaker(s.key, "topic", e.target.value)} placeholder="The Future of Military Creator Economy" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Avatar URL</Label>
                        <Input value={s.avatar_url} onChange={(e) => updateSpeaker(s.key, "avatar_url", e.target.value)} placeholder="https://..." className="mt-1" />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-xs">Bio</Label>
                        <Input value={s.bio} onChange={(e) => updateSpeaker(s.key, "bio", e.target.value)} placeholder="Short bio..." className="mt-1" />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700" onClick={() => removeSpeaker(s.key)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ===== STEP 4: Sponsors ===== */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Add sponsors and assign tiers.</p>
              <Button size="sm" variant="outline" onClick={addSponsor}>
                <Plus className="h-4 w-4 mr-1" /> Add Sponsor
              </Button>
            </div>
            {sponsors.length === 0 ? (
              <Card className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-8 text-center text-muted-foreground">
                No sponsors added yet.
              </Card>
            ) : (
              sponsors.map((s) => (
                <Card key={s.key} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid gap-3 md:grid-cols-3">
                      <div>
                        <Label className="text-xs">Company Name *</Label>
                        <Input value={s.sponsor_name} onChange={(e) => updateSponsor(s.key, "sponsor_name", e.target.value)} placeholder="USAA" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Tier</Label>
                        <Select value={s.tier} onValueChange={(v) => updateSponsor(s.key, "tier", v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SPONSOR_TIERS.map((t) => (
                              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Website</Label>
                        <Input value={s.website_url} onChange={(e) => updateSponsor(s.key, "website_url", e.target.value)} placeholder="https://usaa.com" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Logo URL</Label>
                        <Input value={s.logo_url} onChange={(e) => updateSponsor(s.key, "logo_url", e.target.value)} placeholder="https://..." className="mt-1" />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">Description</Label>
                        <Input value={s.description} onChange={(e) => updateSponsor(s.key, "description", e.target.value)} placeholder="Brief sponsor description..." className="mt-1" />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700" onClick={() => removeSponsor(s.key)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ===== STEP 5: Community ===== */}
        {step === 5 && (
          <div className="space-y-4">
            <Card className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">365 Community — This space stays active before, during, and after your event.</p>
            </Card>

            <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Enable 365 Community</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">Create a year-round community space for your event attendees.</p>
                </div>
                <Switch checked={communityEnabled} onCheckedChange={setCommunityEnabled} />
              </div>

              {communityEnabled && (
                <>
                  <div>
                    <Label>Community Name</Label>
                    <Input
                      value={communityName}
                      onChange={(e) => setCommunityName(e.target.value)}
                      placeholder={effectiveCommunityName}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Auto-filled from event name if left blank.</p>
                  </div>
                  <div>
                    <Label>Welcome Message</Label>
                    <Textarea
                      value={communityWelcome}
                      onChange={(e) => setCommunityWelcome(e.target.value)}
                      placeholder={effectiveWelcome}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="mb-3 block">Channels to Auto-Create</Label>
                    <div className="space-y-2">
                      {COMMUNITY_CHANNELS.map((ch) => (
                        <div key={ch.key} className="flex items-center gap-3">
                          <Switch
                            checked={communityChannels[ch.key] ?? true}
                            onCheckedChange={(v) => setCommunityChannels((prev) => ({ ...prev, [ch.key]: v }))}
                          />
                          <span className="text-sm">{ch.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        )}

        {/* ===== STEP 6: Local Resources ===== */}
        {step === 6 && (
          <div className="space-y-4">
            <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
              <h3 className="font-semibold mb-1">
                Local resources near {venue || "venue"}{city ? `, ${city}` : ""}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">Help attendees find local services near the event. Resources can be added after event creation.</p>

              <div className="space-y-3">
                {RESOURCE_CATEGORIES.map((cat) => (
                  <div key={cat.value}>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={resourceToggles[cat.value] ?? true}
                          onCheckedChange={(v) => setResourceToggles((prev) => ({ ...prev, [cat.value]: v }))}
                        />
                        <span className="text-sm font-medium">{cat.emoji} {cat.label}</span>
                      </div>
                      {resourceToggles[cat.value] && (
                        <Button size="sm" variant="outline" onClick={() => addLocalResource(cat.value)}>
                          <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                      )}
                    </div>
                    {resourceToggles[cat.value] && localResources.filter((r) => r.category === cat.value).map((r) => (
                      <Card key={r.key} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#151821] p-3 ml-10 mb-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 grid gap-2 md:grid-cols-2">
                            <div>
                              <Label className="text-xs">Name *</Label>
                              <Input value={r.name} onChange={(e) => updateLocalResource(r.key, "name", e.target.value)} placeholder="Hilton Garden Inn" className="mt-0.5 h-8 text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs">Address</Label>
                              <Input value={r.address} onChange={(e) => updateLocalResource(r.key, "address", e.target.value)} placeholder="123 Main St" className="mt-0.5 h-8 text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs">Phone</Label>
                              <Input value={r.phone} onChange={(e) => updateLocalResource(r.key, "phone", e.target.value)} placeholder="(555) 123-4567" className="mt-0.5 h-8 text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs">Website</Label>
                              <Input value={r.website} onChange={(e) => updateLocalResource(r.key, "website", e.target.value)} placeholder="https://..." className="mt-0.5 h-8 text-sm" />
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-xs">Notes</Label>
                              <Input value={r.notes} onChange={(e) => updateLocalResource(r.key, "notes", e.target.value)} placeholder="Group rate available, mention event name..." className="mt-0.5 h-8 text-sm" />
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700 h-7 w-7" onClick={() => removeLocalResource(r.key)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ===== STEP 7: Review ===== */}
        {step === 7 && (
          <div className="space-y-6">
            <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
              <h2 className="text-lg font-semibold mb-4">Event Summary</h2>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{title || "\u2014"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium capitalize">{eventType}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dates</span><span className="font-medium">{startDate || "\u2014"} to {endDate || "\u2014"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium">{[venue, city, state].filter(Boolean).join(", ") || "\u2014"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Capacity</span><span className="font-medium">{capacity || "\u2014"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Community</span><span className="font-medium">{communityEnabled ? "Enabled" : "Disabled"}</span></div>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
              <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5 text-center">
                <p className="text-3xl font-bold text-purple-600">{tickets.filter((t) => t.name.trim()).length}</p>
                <p className="text-sm text-muted-foreground">Ticket Types</p>
              </Card>
              <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5 text-center">
                <p className="text-3xl font-bold text-pd-blue">{agenda.filter((a) => a.title.trim()).length}</p>
                <p className="text-sm text-muted-foreground">Agenda Sessions</p>
              </Card>
              <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5 text-center">
                <p className="text-3xl font-bold text-pd-blue">{speakers.filter((s) => s.creator_name.trim()).length}</p>
                <p className="text-sm text-muted-foreground">Speakers</p>
              </Card>
              <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5 text-center">
                <p className="text-3xl font-bold text-pd-blue">{sponsors.filter((s) => s.sponsor_name.trim()).length}</p>
                <p className="text-sm text-muted-foreground">Sponsors</p>
              </Card>
            </div>

            {description && (
              <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                <p className="text-sm whitespace-pre-wrap">{description}</p>
              </Card>
            )}

            {tickets.filter((t) => t.name.trim()).length > 0 && (
              <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Tickets</h3>
                <div className="space-y-2">
                  {tickets.filter((t) => t.name.trim()).map((t) => (
                    <div key={t.key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">{t.name}</span>
                        <Badge variant="outline" className="text-xs capitalize">{t.event_format.replace("_", " ")}</Badge>
                        {t.qr_enabled && <Badge className="bg-green-100 text-green-700 text-xs">QR</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{t.price === 0 ? "Free" : `$${t.price}`}</span>
                        <span>{t.quantity} available</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleBack} disabled={step === 0}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            {step > 0 && step < STEPS.length - 1 && (
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                Skip <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step < STEPS.length - 1 && (
              <Button variant="outline" onClick={handleSaveAndExit} disabled={saving}>
                <LogOut className="h-4 w-4 mr-2" /> Save & Exit
              </Button>
            )}
            {step === STEPS.length - 1 ? (
              <>
                <Button variant="outline" onClick={saveDraft} disabled={saving || !createdEventId}>
                  Save as Draft
                </Button>
                <Button onClick={publishEvent} disabled={saving || !createdEventId} className="bg-pd-blue hover:bg-pd-darkblue text-white">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                  Publish Event
                </Button>
              </>
            ) : (
              <Button onClick={handleNext} disabled={saving} className="bg-pd-blue hover:bg-pd-darkblue text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {step === 0 && !createdEventId ? "Create & Continue" : "Save & Continue"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandEventCreate;
