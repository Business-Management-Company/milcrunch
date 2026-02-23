import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  MapPin,
  Mic2,
  Users,
  DollarSign,
  Check,
  Loader2,
  Plus,
  Trash2,
  Upload,
  ExternalLink,
  FileDown,
  Send,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { searchCreators, type CreatorCard } from "@/lib/influencers-club";
import { toast } from "sonner";

const STEPS = [
  { id: 1, label: "Event Details", icon: Calendar },
  { id: 2, label: "Schedule", icon: Calendar },
  { id: 3, label: "Speakers", icon: Mic2 },
  { id: 4, label: "Sponsors", icon: DollarSign },
  { id: 5, label: "Review & Launch", icon: Check },
];

const HOST_EVENTS = [
  "VFW Convention",
  "Military Influencer Conference",
  "Army Ten-Miler",
  "Custom Event",
] as const;

const VENUE_TYPES = ["Convention Center", "Hotel Ballroom", "Outdoor", "Virtual/Hybrid"] as const;

const SESSION_TYPES = [
  "Keynote",
  "Panel",
  "Interview",
  "What's Trending",
  "Fireside Chat",
  "Live Podcast",
  "Q&A",
] as const;

const DURATIONS = ["30min", "45min", "60min", "90min"] as const;

const SPONSOR_TIERS = ["Title Sponsor", "Gold", "Silver", "Stage Partner"] as const;

const BRAND_PLACEMENTS = ["Stage Banner", "Livestream Overlay", "Social Mentions", "Swag Bag"] as const;

const SAMPLE_SCHEDULE = [
  { time: "8:15 AM", title: "Kick-off", type: "Keynote" as const, duration: "30min" as const },
  { time: "8:30 AM", title: "Panel: Collaboration and Giving Back", type: "Panel" as const, duration: "30min" as const },
  { time: "9:00 AM", title: "Fireside Chat: Finding Success", type: "Fireside Chat" as const, duration: "30min" as const },
  { time: "9:30 AM", title: "What's Trending on MilCrunch", type: "What's Trending" as const, duration: "30min" as const },
  { time: "10:00 AM", title: "Panel: Navigating Social Media", type: "Panel" as const, duration: "30min" as const },
  { time: "10:30 AM", title: "Panel: Beyond the Battlefield", type: "Panel" as const, duration: "90min" as const },
  { time: "12:00 PM", title: "Interview: Featured Creator", type: "Interview" as const, duration: "60min" as const },
  { time: "1:00 PM", title: "Workshop: Finding Your Voice", type: "Panel" as const, duration: "90min" as const },
  { time: "2:30 PM", title: "Panel: Heart of Military Influence", type: "Panel" as const, duration: "30min" as const },
  { time: "3:00 PM", title: "Tech Talk: AI in the Classroom", type: "Keynote" as const, duration: "30min" as const },
  { time: "3:30 PM", title: "Entrepreneurship Unscripted", type: "Live Podcast" as const, duration: "30min" as const },
  { time: "4:00 PM", title: "Closing", type: "Keynote" as const, duration: "30min" as const },
];

const EXAMPLE_SPONSORS = [
  { name: "USAA", tier: "Title Sponsor" as const },
  { name: "USCCA", tier: "Gold" as const },
  { name: "SickFit", tier: "Silver" as const },
  { name: "Armed For Good", tier: "Stage Partner" as const },
];

export interface ScheduleSlot {
  id: string;
  time: string;
  title: string;
  type: (typeof SESSION_TYPES)[number];
  duration: (typeof DURATIONS)[number];
}

export interface PDXSpeaker {
  id: string;
  creator?: CreatorCard;
  name: string;
  title?: string;
  bio?: string;
  photoUrl?: string;
  assignedSessionId?: string;
}

export interface PDXSponsor {
  id: string;
  name: string;
  tier: (typeof SPONSOR_TIERS)[number];
  placements: string[];
  logoUrl?: string;
}

function getDaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(start);
  while (d <= end) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

const CreatePDX = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1
  const [eventName, setEventName] = useState("");
  const [hostEvent, setHostEvent] = useState<string>("");
  const [location, setLocation] = useState("");
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [venueType, setVenueType] = useState<string>("");
  const [audienceSize, setAudienceSize] = useState([500]);

  // Step 2: schedule by day index (0, 1, ...)
  const [scheduleByDay, setScheduleByDay] = useState<Record<number, ScheduleSlot[]>>({ 0: [] });

  // Step 3
  const [speakerSearch, setSpeakerSearch] = useState("");
  const [speakerSearchResults, setSpeakerSearchResults] = useState<CreatorCard[]>([]);
  const [speakerSearchLoading, setSpeakerSearchLoading] = useState(false);
  const [speakers, setSpeakers] = useState<PDXSpeaker[]>([]);
  const [manualSpeakerName, setManualSpeakerName] = useState("");
  const [manualSpeakerTitle, setManualSpeakerTitle] = useState("");
  const [manualSpeakerBio, setManualSpeakerBio] = useState("");

  // Step 4
  const [sponsors, setSponsors] = useState<PDXSponsor[]>(
    EXAMPLE_SPONSORS.map((s, i) => ({
      id: `sp-${i}`,
      name: s.name,
      tier: s.tier,
      placements: [],
    }))
  );

  const startDate = dateRange.start;
  const endDate = dateRange.end ?? dateRange.start;
  const scheduleDays = startDate && endDate ? getDaysBetween(startDate, endDate) : [new Date()];

  const allSlots: ScheduleSlot[] = Object.values(scheduleByDay).flat();
  const sessionOptions = allSlots.map((s) => ({ id: s.id, label: `${s.time} – ${s.title}` }));

  const progressPct = (step / 5) * 100;

  const handleSearchSpeakers = useCallback(() => {
    const q = speakerSearch.trim();
    if (!q) return;
    setSpeakerSearchLoading(true);
    setSpeakerSearchResults([]);
    searchCreators(q, { platform: "instagram" })
      .then((r) => setSpeakerSearchResults(r.creators))
      .catch(() => toast.error("Search failed"))
      .finally(() => setSpeakerSearchLoading(false));
  }, [speakerSearch]);

  const addSpeakerFromCreator = (creator: CreatorCard) => {
    if (speakers.some((s) => s.creator?.id === creator.id)) {
      toast.info("Already in speakers list");
      return;
    }
    setSpeakers((prev) => [
      ...prev,
      {
        id: `s-${Date.now()}-${creator.id}`,
        creator,
        name: creator.name,
        title: creator.category ?? undefined,
        bio: creator.bio || undefined,
        photoUrl: creator.avatar,
      },
    ]);
    toast.success("Added to speakers");
  };

  const addManualSpeaker = () => {
    if (!manualSpeakerName.trim()) return;
    setSpeakers((prev) => [
      ...prev,
      {
        id: `s-manual-${Date.now()}`,
        name: manualSpeakerName.trim(),
        title: manualSpeakerTitle.trim() || undefined,
        bio: manualSpeakerBio.trim() || undefined,
      },
    ]);
    setManualSpeakerName("");
    setManualSpeakerTitle("");
    setManualSpeakerBio("");
    toast.success("Speaker added");
  };

  const setSpeakerSession = (speakerId: string, sessionId: string) => {
    setSpeakers((prev) => prev.map((s) => (s.id === speakerId ? { ...s, assignedSessionId: sessionId } : s)));
  };

  const removeSpeaker = (id: string) => {
    setSpeakers((prev) => prev.filter((s) => s.id !== id));
  };

  const addSponsor = () => {
    setSponsors((prev) => [
      ...prev,
      { id: `sp-${Date.now()}`, name: "", tier: "Silver", placements: [] },
    ]);
  };

  const updateSponsor = (id: string, updates: Partial<PDXSponsor>) => {
    setSponsors((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeSponsor = (id: string) => {
    setSponsors((prev) => prev.filter((s) => s.id !== id));
  };

  const addSlot = (dayIndex: number) => {
    const slots = scheduleByDay[dayIndex] ?? [];
    const newSlot: ScheduleSlot = {
      id: `slot-${dayIndex}-${Date.now()}`,
      time: "9:00 AM",
      title: "New Session",
      type: "Panel",
      duration: "30min",
    };
    setScheduleByDay((prev) => ({ ...prev, [dayIndex]: [...slots, newSlot] }));
  };

  const updateSlot = (dayIndex: number, slotId: string, updates: Partial<ScheduleSlot>) => {
    setScheduleByDay((prev) => ({
      ...prev,
      [dayIndex]: (prev[dayIndex] ?? []).map((s) => (s.id === slotId ? { ...s, ...updates } : s)),
    }));
  };

  const removeSlot = (dayIndex: number, slotId: string) => {
    setScheduleByDay((prev) => ({
      ...prev,
      [dayIndex]: (prev[dayIndex] ?? []).filter((s) => s.id !== slotId),
    }));
  };

  const loadSampleSchedule = () => {
    const slots: ScheduleSlot[] = SAMPLE_SCHEDULE.map((s, i) => ({
      id: `slot-0-${i}`,
      time: s.time,
      title: s.title,
      type: s.type,
      duration: s.duration,
    }));
    setScheduleByDay({ 0: slots });
    toast.success("Sample schedule loaded");
  };

  const handleLaunch = () => {
    toast.success("Experience launched successfully! (Demo)");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground mb-2">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-1.5",
                s.id < step && "text-[#1e3a5f]",
                s.id === step && "text-[#1e3a5f] font-medium"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  s.id < step && "bg-[#1e3a5f] text-white",
                  s.id === step && "bg-[#1e3a5f] text-white animate-pulse",
                  s.id > step && "bg-gray-200 dark:bg-gray-700 text-gray-500"
                )}
              >
                {s.id < step ? <Check className="h-4 w-4" /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
        <Progress value={progressPct} className="h-2 bg-gray-200 dark:bg-gray-700 [&>div]:bg-[#1e3a5f]" />
      </div>

      {/* Step content with slide feel */}
      <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Step 1: Event Details */}
        {step === 1 && (
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6 md:p-8">
            <h2 className="text-xl font-bold text-[#000741] dark:text-white mb-6">Event Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="event-name">Event Name</Label>
                <Input
                  id="event-name"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Experience at VFW National Convention"
                  className="mt-1 rounded-lg"
                />
              </div>
              <div>
                <Label>Host Event</Label>
                <Select value={hostEvent} onValueChange={setHostEvent}>
                  <SelectTrigger className="mt-1 rounded-lg">
                    <SelectValue placeholder="Select host event" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOST_EVENTS.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, State or Venue"
                  className="mt-1 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="mt-1 w-full justify-start rounded-lg text-left font-normal">
                        {startDate ? format(startDate, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => setDateRange((prev) => ({ ...prev, start: d ?? undefined }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="mt-1 w-full justify-start rounded-lg text-left font-normal">
                        {endDate ? format(endDate, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => setDateRange((prev) => ({ ...prev, end: d ?? undefined }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label>Venue Type</Label>
                <Select value={venueType} onValueChange={setVenueType}>
                  <SelectTrigger className="mt-1 rounded-lg">
                    <SelectValue placeholder="Select venue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VENUE_TYPES.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expected Audience Size: {audienceSize[0]}</Label>
                <Slider
                  value={audienceSize}
                  onValueChange={setAudienceSize}
                  min={50}
                  max={5000}
                  step={50}
                  className="mt-2"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6 md:p-8">
            <h2 className="text-xl font-bold text-[#000741] dark:text-white mb-2">Build Your Schedule</h2>
            <p className="text-sm text-muted-foreground mb-4">Add time slots per day. Use the sample to pre-fill a VFW-style schedule.</p>
            <Button variant="outline" size="sm" className="mb-4 rounded-lg" onClick={loadSampleSchedule}>
              Load Sample Schedule
            </Button>
            <Tabs defaultValue="0" className="w-full">
              <TabsList className="mb-4 rounded-lg">
                {scheduleDays.map((d, i) => (
                  <TabsTrigger key={i} value={String(i)} className="rounded-md">
                    Day {i + 1} ({format(d, "MMM d")})
                  </TabsTrigger>
                ))}
              </TabsList>
              {scheduleDays.map((day, dayIndex) => (
                <TabsContent key={dayIndex} value={String(dayIndex)} className="mt-0">
                  <div className="space-y-3">
                    {(scheduleByDay[dayIndex] ?? []).map((slot, idx) => (
                      <div
                        key={slot.id}
                        className={cn(
                          "flex flex-wrap items-center gap-3 rounded-lg border p-3",
                          idx % 2 === 0 ? "border-[#1e3a5f]/30 bg-[#1e3a5f]/5" : "border-[#ED1C24]/30 bg-[#ED1C24]/5"
                        )}
                      >
                        <Input
                          value={slot.time}
                          onChange={(e) => updateSlot(dayIndex, slot.id, { time: e.target.value })}
                          placeholder="9:00 AM"
                          className="w-24 shrink-0 text-sm tabular-nums rounded-lg"
                        />
                        <Input
                          value={slot.title}
                          onChange={(e) => updateSlot(dayIndex, slot.id, { title: e.target.value })}
                          placeholder="Session title"
                          className="max-w-xs rounded-lg"
                        />
                        <Select
                          value={slot.type}
                          onValueChange={(v) => updateSlot(dayIndex, slot.id, { type: v as ScheduleSlot["type"] })}
                        >
                          <SelectTrigger className="w-[160px] rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SESSION_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={slot.duration}
                          onValueChange={(v) => updateSlot(dayIndex, slot.id, { duration: v as ScheduleSlot["duration"] })}
                        >
                          <SelectTrigger className="w-[100px] rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DURATIONS.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="shrink-0 text-red-500" onClick={() => removeSlot(dayIndex, slot.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => addSlot(dayIndex)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add time slot
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </Card>
        )}

        {/* Step 3: Speakers */}
        {step === 3 && (
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6 md:p-8">
            <h2 className="text-xl font-bold text-[#000741] dark:text-white mb-4">Invite Speakers</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <Label className="text-sm">Search creators (Influencers.club)</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    value={speakerSearch}
                    onChange={(e) => setSpeakerSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchSpeakers()}
                    placeholder="Name, handle, or keyword"
                    className="rounded-lg"
                  />
                  <Button size="sm" className="rounded-lg bg-[#1e3a5f] hover:bg-[#2d5282]" onClick={handleSearchSpeakers} disabled={speakerSearchLoading}>
                    {speakerSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                  </Button>
                </div>
                <div className="mt-3 max-h-80 overflow-y-auto space-y-2">
                  {speakerSearchResults.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-800 p-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={c.avatar} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate">@{c.username ?? ""}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0 rounded-lg" onClick={() => addSpeakerFromCreator(c)}>
                        Invite to Speak
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Add speaker manually</p>
                  <Input value={manualSpeakerName} onChange={(e) => setManualSpeakerName(e.target.value)} placeholder="Name" className="mb-2 rounded-lg" />
                  <Input value={manualSpeakerTitle} onChange={(e) => setManualSpeakerTitle(e.target.value)} placeholder="Title" className="mb-2 rounded-lg" />
                  <textarea
                    value={manualSpeakerBio}
                    onChange={(e) => setManualSpeakerBio(e.target.value)}
                    placeholder="Bio (optional)"
                    className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    rows={2}
                  />
                  <Button size="sm" className="mt-2 rounded-lg" onClick={addManualSpeaker}>Add</Button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Speakers ({speakers.length})</p>
                <div className="space-y-2 max-h-[420px] overflow-y-auto">
                  {speakers.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 p-2">
                      <img
                        src={s.photoUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}`}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{s.name}</p>
                        <Select value={s.assignedSessionId ?? ""} onValueChange={(v) => setSpeakerSession(s.id, v)}>
                          <SelectTrigger className="h-8 rounded-lg text-xs mt-0.5">
                            <SelectValue placeholder="Assign session" />
                          </SelectTrigger>
                          <SelectContent>
                            {sessionOptions.map((o) => (
                              <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 text-red-500" onClick={() => removeSpeaker(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 4: Sponsors */}
        {step === 4 && (
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6 md:p-8">
            <h2 className="text-xl font-bold text-[#000741] dark:text-white mb-4">Sponsors & Brands</h2>
            <p className="text-sm text-muted-foreground mb-4">Add sponsors and choose placement options.</p>
            <div className="space-y-4">
              {sponsors.map((s) => (
                <div key={s.id} className="flex flex-wrap items-start gap-4 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed bg-gray-50 dark:bg-gray-800">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <Input
                      value={s.name}
                      onChange={(e) => updateSponsor(s.id, { name: e.target.value })}
                      placeholder="Sponsor name"
                      className="rounded-lg"
                    />
                    <Select value={s.tier} onValueChange={(v) => updateSponsor(s.id, { tier: v as PDXSponsor["tier"] })}>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPONSOR_TIERS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Placements: Stage Banner, Livestream Overlay, Social Mentions, Swag Bag</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeSponsor(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="rounded-lg" onClick={addSponsor}>
                <Plus className="h-4 w-4 mr-2" />
                Add sponsor
              </Button>
            </div>
          </Card>
        )}

        {/* Step 5: Review & Launch */}
        {step === 5 && (
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6 md:p-8">
            <h2 className="text-xl font-bold text-[#000741] dark:text-white mb-6">Review & Launch</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-[#000741] dark:text-white mb-1">Event</h3>
                <p className="text-muted-foreground">{eventName || "—"} · {location || "—"}</p>
                <p className="text-sm text-muted-foreground">
                  {startDate && endDate ? `${format(startDate, "PPP")} – ${format(endDate, "PPP")}` : "—"}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-[#000741] dark:text-white mb-2">Schedule</h3>
                <div className="space-y-1 text-sm">
                  {allSlots.slice(0, 8).map((slot) => (
                    <div key={slot.id} className="flex gap-2">
                      <span className="w-20 tabular-nums text-muted-foreground">{slot.time}</span>
                      <span>{slot.title}</span>
                    </div>
                  ))}
                  {allSlots.length > 8 && <p className="text-muted-foreground">+{allSlots.length - 8} more</p>}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-[#000741] dark:text-white mb-2">Speakers</h3>
                <div className="flex flex-wrap gap-2">
                  {speakers.map((s) => (
                    <img
                      key={s.id}
                      src={s.photoUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}`}
                      alt={s.name}
                      className="h-12 w-12 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow"
                      title={s.name}
                    />
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-[#000741] dark:text-white mb-2">Sponsors</h3>
                <div className="flex flex-wrap gap-4">
                  {sponsors.map((s) => (
                    <span key={s.id} className="rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm font-medium">{s.name || "—"}</span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-[#000741] dark:text-white mb-1">Streaming</h3>
                <p className="text-sm text-muted-foreground">Go Live on: Instagram, YouTube, Facebook, PDTV</p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="rounded-lg bg-[#1e3a5f] hover:bg-[#2d5282]" onClick={handleLaunch}>
                Launch Experience
              </Button>
              <Button variant="outline" className="rounded-lg">
                <FileDown className="h-4 w-4 mr-2" />
                Export Schedule PDF
              </Button>
              <Button variant="outline" className="rounded-lg">
                <Send className="h-4 w-4 mr-2" />
                Send Speaker Invites
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Back / Next */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="outline"
          className="rounded-lg"
          onClick={() => (step === 1 ? navigate("/pdx") : setStep((s) => s - 1))}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 1 ? "Back to Experience" : "Back"}
        </Button>
        {step < 5 && (
          <Button className="rounded-lg bg-[#1e3a5f] hover:bg-[#2d5282]" onClick={() => setStep((s) => s + 1)}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CreatePDX;
