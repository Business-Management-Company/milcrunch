import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, GripVertical, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

const STEPS = ["Basics", "Agenda", "Speakers", "Sponsors", "Review"];

let keyCounter = 0;
const nextKey = () => `k-${++keyCounter}`;

/* ======================================== */
const BrandEventCreate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  /* Step 1 — basics */
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

  /* Step 2 — agenda */
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);

  /* Step 3 — speakers */
  const [speakers, setSpeakers] = useState<SpeakerItem[]>([]);

  /* Step 4 — sponsors */
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);

  /* ---- helpers ---- */
  const addAgendaItem = () =>
    setAgenda((prev) => [
      ...prev,
      { key: nextKey(), day_number: 1, start_time: "09:00", end_time: "10:00", title: "", description: "", location_room: "", session_type: "breakout" },
    ]);
  const removeAgendaItem = (key: string) => setAgenda((prev) => prev.filter((a) => a.key !== key));
  const updateAgenda = (key: string, field: string, value: string | number) =>
    setAgenda((prev) => prev.map((a) => (a.key === key ? { ...a, [field]: value } : a)));

  const addSpeaker = () =>
    setSpeakers((prev) => [...prev, { key: nextKey(), creator_name: "", creator_handle: "", avatar_url: "", role: "presenter", topic: "", bio: "" }]);
  const removeSpeaker = (key: string) => setSpeakers((prev) => prev.filter((s) => s.key !== key));
  const updateSpeaker = (key: string, field: string, value: string) =>
    setSpeakers((prev) => prev.map((s) => (s.key === key ? { ...s, [field]: value } : s)));

  const addSponsor = () =>
    setSponsors((prev) => [...prev, { key: nextKey(), sponsor_name: "", logo_url: "", website_url: "", tier: "community", description: "" }]);
  const removeSponsor = (key: string) => setSponsors((prev) => prev.filter((s) => s.key !== key));
  const updateSponsor = (key: string, field: string, value: string) =>
    setSponsors((prev) => prev.map((s) => (s.key === key ? { ...s, [field]: value } : s)));

  /* ---- save step 1 ---- */
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
            image_url: coverUrl.trim() || null,
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
            image_url: coverUrl.trim() || null,
            capacity: capacity ? parseInt(capacity) : null,
            status: "draft",
            is_published: false,
            user_id: user?.id || null,
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

  /* ---- save agenda items ---- */
  const saveAgenda = async () => {
    if (!createdEventId) return true;
    const items = agenda.filter((a) => a.title.trim());
    if (items.length === 0) return true;
    setSaving(true);
    try {
      // Delete existing then reinsert
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

  /* ---- save speakers ---- */
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

  /* ---- save sponsors ---- */
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

  /* ---- step navigation ---- */
  const handleNext = async () => {
    if (step === 0) {
      const ok = await saveBasics();
      if (!ok) return;
    } else if (step === 1) {
      const ok = await saveAgenda();
      if (!ok) return;
    } else if (step === 2) {
      const ok = await saveSpeakers();
      if (!ok) return;
    } else if (step === 3) {
      const ok = await saveSponsors();
      if (!ok) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

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
            <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1">
              <div
                className={cn(
                  "h-2 rounded-full flex-1 transition-colors",
                  i <= step ? "bg-pd-blue" : "bg-gray-200 dark:bg-gray-700"
                )}
              />
            </div>
          ))}
        </div>

        {/* ===== STEP 1: Basics ===== */}
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
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Venue / Location Name</Label>
                <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Washington Convention Center" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Washington" className="mt-1" />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="DC" className="mt-1" />
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Cover Image URL</Label>
                <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." className="mt-1" />
              </div>
            </div>
          </Card>
        )}

        {/* ===== STEP 2: Agenda ===== */}
        {step === 1 && (
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
        {step === 2 && (
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
        {step === 3 && (
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

        {/* ===== STEP 5: Review ===== */}
        {step === 4 && (
          <div className="space-y-6">
            <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
              <h2 className="text-lg font-semibold mb-4">Event Summary</h2>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{title || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium capitalize">{eventType}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dates</span><span className="font-medium">{startDate || "—"} to {endDate || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium">{[venue, city, state].filter(Boolean).join(", ") || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Capacity</span><span className="font-medium">{capacity || "—"}</span></div>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
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
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" onClick={handleBack} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-3">
            {step === 4 ? (
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
