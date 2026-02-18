import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Plus, Trash2, GripVertical, Loader2,
  ClipboardList, Calendar, Mic, Handshake, CheckCircle, Ticket,
  MessageCircle, MapPin, LogOut, Radio, Film, Sparkles, Copy,
  Target, Type, Clapperboard, Palette, Captions, Scissors, Clock,
  Youtube, Facebook, Twitter, Twitch, Linkedin, Wifi, Monitor, Video,
  ImageIcon, Upload,
} from "lucide-react";
import ImageUpload from "@/components/cms/ImageUpload";
import AIBannerModal from "@/components/brand/AIBannerModal";
import CityAutocomplete from "@/components/CityAutocomplete";
import SpeakerSelector from "@/components/SpeakerSelector";
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
import { useDemoMode } from "@/hooks/useDemoMode";

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
  { value: "live", label: "In-Person / Live" },
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
  { label: "Media", icon: Film },
  { label: "Review", icon: CheckCircle },
];

const AI_FEATURES = [
  { id: "auto_frame", icon: Target, title: "Auto-Frame Speakers", desc: "AI automatically crops and follows active speakers" },
  { id: "lower_thirds", icon: Type, title: "Lower Thirds", desc: "Auto-generate name titles when speakers are detected" },
  { id: "broll", icon: Clapperboard, title: "B-Roll Insertion", desc: "AI inserts relevant b-roll during transitions" },
  { id: "brand_overlay", icon: Palette, title: "Brand Overlay", desc: "Add sponsor logos and event branding as overlays" },
  { id: "captions", icon: Captions, title: "Live Captions", desc: "Real-time AI-generated closed captions" },
  { id: "highlights", icon: Scissors, title: "Auto-Highlights", desc: "AI clips key moments for social media post-event" },
];

const STREAM_PLATFORMS = [
  { id: "youtube", name: "YouTube Live", icon: Youtube, color: "text-red-600" },
  { id: "facebook", name: "Facebook Live", icon: Facebook, color: "text-blue-600" },
  { id: "twitter", name: "Twitter/X", icon: Twitter, color: "text-gray-900 dark:text-gray-100" },
  { id: "twitch", name: "Twitch", icon: Twitch, color: "text-purple-600" },
  { id: "linkedin", name: "LinkedIn Live", icon: Linkedin, color: "text-blue-700" },
  { id: "tiktok", name: "TikTok Live", icon: Wifi, color: "text-gray-900 dark:text-gray-100" },
];

interface StageItem {
  key: string;
  name: string;
}
interface ScheduleItem {
  key: string;
  time: string;
  segment: string;
  speaker: string;
  notes: string;
}
interface CustomRtmpItem {
  key: string;
  name: string;
  url: string;
  streamKey: string;
}

let keyCounter = 0;
const nextKey = () => `k-${++keyCounter}`;

/* ======================================== */
const BrandEventCreate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { guardAction } = useDemoMode();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  /* Step 0 — basics */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("live");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [capacity, setCapacity] = useState("");
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [showAIBanner, setShowAIBanner] = useState(false);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

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

  /* Step 7 — media */
  const [stages, setStages] = useState<StageItem[]>([{ key: nextKey(), name: "Main Stage" }]);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [customRtmp, setCustomRtmp] = useState<CustomRtmpItem[]>([]);
  const [streamSource, setStreamSource] = useState<"platform" | "external">("platform");
  const [streamResolution, setStreamResolution] = useState("1080p");
  const [aiFeatures, setAiFeatures] = useState<Record<string, boolean>>({
    auto_frame: true, lower_thirds: true, broll: true, brand_overlay: true, captions: true, highlights: true,
  });
  const [recordStream, setRecordStream] = useState(true);
  const [autoPublishRecording, setAutoPublishRecording] = useState(true);
  const [generateHighlightReel, setGenerateHighlightReel] = useState(true);
  const [generateSocialClips, setGenerateSocialClips] = useState(true);
  const [productionSchedule, setProductionSchedule] = useState<ScheduleItem[]>([]);

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

  /* ---- media helpers ---- */
  const addStage = () => setStages((prev) => [...prev, { key: nextKey(), name: "" }]);
  const removeStage = (key: string) => setStages((prev) => prev.filter((s) => s.key !== key));
  const updateStage = (key: string, name: string) => setStages((prev) => prev.map((s) => (s.key === key ? { ...s, name } : s)));
  const toggleDestination = (id: string) =>
    setSelectedDestinations((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  const addCustomRtmp = () => setCustomRtmp((prev) => [...prev, { key: nextKey(), name: "", url: "", streamKey: "" }]);
  const removeCustomRtmp = (key: string) => setCustomRtmp((prev) => prev.filter((r) => r.key !== key));
  const updateCustomRtmp = (key: string, field: string, value: string) =>
    setCustomRtmp((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  const toggleAiFeature = (id: string) => setAiFeatures((prev) => ({ ...prev, [id]: !prev[id] }));
  const addScheduleItem = () =>
    setProductionSchedule((prev) => [...prev, { key: nextKey(), time: "09:00", segment: "", speaker: "", notes: "" }]);
  const removeScheduleItem = (key: string) => setProductionSchedule((prev) => prev.filter((s) => s.key !== key));
  const updateScheduleItem = (key: string, field: string, value: string) =>
    setProductionSchedule((prev) => prev.map((s) => (s.key === key ? { ...s, [field]: value } : s)));

  /* ---- banner upload handler ---- */
  const handleBannerUpload = useCallback(
    async (file: File) => {
      const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
      if (!ACCEPTED.includes(file.type)) {
        toast.error("Only PNG, JPG, and WEBP files are accepted.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File must be under 5 MB.");
        return;
      }
      setUploadingBanner(true);
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const resp = await fetch("/api/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: base64,
            contentType: file.type,
            bucket: "event-images",
            folder: "events",
            userId: user?.id,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Upload failed");
        setCoverUrl(data.url);
        toast.success("Banner uploaded!");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        toast.error(msg);
      } finally {
        setUploadingBanner(false);
      }
    },
    [user?.id]
  );

  /* ---- resolve org + brand (required FK columns on events) ---- */
  const resolveOrgAndBrand = async (): Promise<{ orgId: string; brandId: string } | null> => {
    // Try to find an existing organization
    const { data: orgs } = await supabase.from("organizations").select("id").limit(1);
    let orgId = orgs?.[0]?.id;

    if (!orgId) {
      const { data: newOrg } = await supabase
        .from("organizations")
        .insert({ name: "My Organization", slug: `org-${Date.now()}` } as Record<string, unknown>)
        .select("id")
        .single();
      orgId = newOrg?.id;
    }

    if (!orgId) return null;

    // Try to find an existing brand
    const { data: brands } = await supabase.from("brands").select("id").limit(1);
    let brandId = brands?.[0]?.id;

    if (!brandId) {
      const { data: newBrand } = await supabase
        .from("brands")
        .insert({ name: "My Brand", slug: `brand-${Date.now()}`, organization_id: orgId } as Record<string, unknown>)
        .select("id")
        .single();
      brandId = newBrand?.id;
    }

    if (!brandId) return null;

    return { orgId, brandId };
  };

  /* ---- save step 0: basics ---- */
  const saveBasics = async () => {
    if (guardAction("create")) return false;
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
        const resolved = await resolveOrgAndBrand();
        if (!resolved) {
          toast.error("Could not resolve organization/brand. Check your account permissions.");
          return false;
        }

        const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

        const { data, error } = await supabase
          .from("events")
          .insert({
            title: title.trim(),
            slug: `${slug}-${Date.now()}`,
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
            organization_id: resolved.orgId,
            brand_id: resolved.brandId,
          } as Record<string, unknown>)
          .select("id")
          .single();
        if (error) throw error;
        setCreatedEventId(data.id);
      }
      return true;
    } catch (err: unknown) {
      console.error("Full error:", JSON.stringify(err, null, 2));
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

  /* ---- save step 5: community (no-op — community_enabled is not a DB column yet) ---- */
  const saveCommunity = async () => {
    // Community settings are stored locally for now; the events table
    // does not have a community_enabled column.
    return true;
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
        .update({ is_published: true } as Record<string, unknown>)
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
    } else if (step === 7) {
      // Media config is saved as part of event update at review/publish
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
    } else if (step === 7) {
      // Media config — no DB save needed, carries forward to review
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
              {/* Event Banner */}
              <div className="md:col-span-2">
                <Label className="mb-2 block">Event Banner</Label>
                {coverUrl && (
                  <div className="relative mb-3 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img
                      src={coverUrl}
                      alt="Event banner preview"
                      className="w-full h-48 object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 bg-black/50 hover:bg-black/70 text-white rounded-full"
                      onClick={() => setCoverUrl("")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => setShowAIBanner(true)}
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate with AI
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => bannerFileRef.current?.click()}
                    disabled={uploadingBanner}
                  >
                    {uploadingBanner ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Image
                  </Button>
                  <input
                    ref={bannerFileRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBannerUpload(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              {/* AI Banner Modal */}
              <AIBannerModal
                open={showAIBanner}
                onOpenChange={setShowAIBanner}
                eventName={title}
                eventLocation={[venue, city, state].filter(Boolean).join(", ")}
                eventDate={startDate}
                onSelectImage={(url) => setCoverUrl(url)}
              />

              {/* Live Streaming Toggle */}
              <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                      <Radio className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">Live Streaming</Label>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Enable RTMP streaming for this event
                      </p>
                    </div>
                  </div>
                  <Switch checked={streamingEnabled} onCheckedChange={setStreamingEnabled} />
                </div>
                {streamingEnabled && (
                  <div className="mt-3 ml-[52px] bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      RTMP credentials will be auto-generated after saving. You can configure streaming
                      settings and connect destinations from the Streaming tab in the event detail page.
                    </p>
                  </div>
                )}
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
                        <SpeakerSelector
                          value={s.creator_name}
                          onChange={(name) => updateSpeaker(s.key, "creator_name", name)}
                          onSelect={(spk) => {
                            updateSpeaker(s.key, "creator_name", spk.name);
                            if (spk.avatar_url) updateSpeaker(s.key, "avatar_url", spk.avatar_url);
                            if (spk.topic) updateSpeaker(s.key, "topic", spk.topic);
                            if (spk.bio) updateSpeaker(s.key, "bio", spk.bio || "");
                          }}
                          placeholder="Search or type name..."
                          className="mt-1"
                        />
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
                        <ImageUpload
                          label="Avatar"
                          value={s.avatar_url}
                          onChange={(url) => updateSpeaker(s.key, "avatar_url", url)}
                          folder="speakers"
                        />
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
                        <ImageUpload
                          label="Logo"
                          value={s.logo_url}
                          onChange={(url) => updateSponsor(s.key, "logo_url", url)}
                          folder="sponsors"
                        />
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

        {/* ===== STEP 7: Media ===== */}
        {step === 7 && (
          <div className="space-y-6">
            {/* Section 1: Live Streaming */}
            <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <Radio className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Live Streaming</h3>
                    <p className="text-sm text-muted-foreground">Enable live streaming for this event</p>
                  </div>
                </div>
                <Switch checked={streamingEnabled} onCheckedChange={setStreamingEnabled} />
              </div>

              {streamingEnabled && (
                <div className="space-y-6 pt-2">
                  {/* Stage Setup */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold">Stream Stages</Label>
                      <Button size="sm" variant="outline" onClick={addStage}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Stage
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {stages.map((s, i) => (
                        <div key={s.key} className="flex items-center gap-2">
                          <Input
                            value={s.name}
                            onChange={(e) => updateStage(s.key, e.target.value)}
                            placeholder={`Stage ${i + 1}`}
                            className="flex-1"
                          />
                          {stages.length > 1 && (
                            <Button variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700 h-8 w-8" onClick={() => removeStage(s.key)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Destination Selection */}
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Where do you want to stream?</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {STREAM_PLATFORMS.map((p) => {
                        const PlatIcon = p.icon;
                        const selected = selectedDestinations.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => toggleDestination(p.id)}
                            className={cn(
                              "flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors",
                              selected
                                ? "border-purple-300 bg-purple-50 dark:border-purple-600 dark:bg-purple-900/20"
                                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                            )}
                          >
                            <div className={cn("w-5 h-5", p.color)}>
                              <PlatIcon className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium flex-1">{p.name}</span>
                            {selected && <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                          </div>
                        );
                      })}
                    </div>
                    {/* Custom RTMP */}
                    <div className="mt-3 space-y-2">
                      {customRtmp.map((r) => (
                        <div key={r.key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">Custom RTMP Destination</Label>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeCustomRtmp(r.key)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <Input value={r.name} onChange={(e) => updateCustomRtmp(r.key, "name", e.target.value)} placeholder="Destination name" className="h-8 text-sm" />
                          <Input value={r.url} onChange={(e) => updateCustomRtmp(r.key, "url", e.target.value)} placeholder="rtmp://..." className="h-8 text-sm font-mono" />
                          <Input value={r.streamKey} onChange={(e) => updateCustomRtmp(r.key, "streamKey", e.target.value)} placeholder="Stream key" className="h-8 text-sm font-mono" />
                        </div>
                      ))}
                      <Button size="sm" variant="ghost" onClick={addCustomRtmp} className="text-muted-foreground">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Custom RTMP
                      </Button>
                    </div>
                  </div>

                  {/* Stream Source */}
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Stream Source</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div
                        onClick={() => setStreamSource("platform")}
                        className={cn(
                          "p-4 rounded-xl border-2 cursor-pointer transition-all",
                          streamSource === "platform"
                            ? "border-purple-400 bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/20 dark:to-[#1A1D27]"
                            : "border-gray-200 dark:border-gray-700"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Video className="h-5 w-5 text-purple-600" />
                          <span className="font-semibold text-sm">Our Platform</span>
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-xs">Recommended</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Just point your cameras and click Go Live. Our AI handles framing, lower thirds, and multi-platform delivery.
                        </p>
                        {streamSource === "platform" && (
                          <div className="mt-3 pt-3 border-t border-purple-100 dark:border-purple-800">
                            <Label className="text-xs mb-1.5 block">Resolution</Label>
                            <Select value={streamResolution} onValueChange={setStreamResolution}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="720p">720p (HD)</SelectItem>
                                <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                                <SelectItem value="4k">4K (Ultra HD)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <div
                        onClick={() => setStreamSource("external")}
                        className={cn(
                          "p-4 rounded-xl border-2 cursor-pointer transition-all",
                          streamSource === "external"
                            ? "border-gray-400 bg-gray-50 dark:bg-gray-800"
                            : "border-gray-200 dark:border-gray-700"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Monitor className="h-5 w-5 text-gray-600" />
                          <span className="font-semibold text-sm">External Encoder</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          For teams using OBS, vMix, or hardware encoders. RTMP credentials will be auto-generated.
                        </p>
                        {streamSource === "external" && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">RTMP Ingest URL</Label>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <code className="text-xs bg-white dark:bg-gray-900 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 flex-1 truncate font-mono">
                                  rtmp://stream.recurrentx.com/live
                                </code>
                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { navigator.clipboard.writeText("rtmp://stream.recurrentx.com/live"); toast.success("Copied!"); }}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                              Stream key will be generated after saving the event.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI Post-Production Features */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <Label className="text-sm font-semibold">AI Production Features</Label>
                    </div>
                    {streamSource === "external" && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                        AI features require streaming through our platform. Switch to "Our Platform" to enable these.
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {AI_FEATURES.map((f) => {
                        const FIcon = f.icon;
                        const enabled = aiFeatures[f.id] && streamSource === "platform";
                        const disabled = streamSource === "external";
                        return (
                          <div
                            key={f.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl border transition-all",
                              enabled
                                ? "bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/20 dark:to-[#1A1D27] border-purple-100 dark:border-purple-800 border-l-4 border-l-purple-500"
                                : "border-gray-200 dark:border-gray-700",
                              disabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <FIcon className={cn("h-5 w-5 shrink-0", enabled ? "text-purple-600" : "text-gray-400")} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{f.title}</p>
                              <p className="text-xs text-muted-foreground">{f.desc}</p>
                            </div>
                            <Switch
                              checked={enabled}
                              onCheckedChange={() => !disabled && toggleAiFeature(f.id)}
                              disabled={disabled}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Section 2: Recording */}
            {streamingEnabled && (
              <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <Video className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Recording</h3>
                      <p className="text-sm text-muted-foreground">Record stream for playback</p>
                    </div>
                  </div>
                  <Switch checked={recordStream} onCheckedChange={setRecordStream} />
                </div>
                {recordStream && (
                  <div className="space-y-3 ml-[52px]">
                    <div className="flex items-center gap-3">
                      <Switch checked={autoPublishRecording} onCheckedChange={setAutoPublishRecording} />
                      <span className="text-sm">Auto-publish recording to event page</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={generateHighlightReel} onCheckedChange={setGenerateHighlightReel} />
                      <div>
                        <span className="text-sm">Generate highlight reel</span>
                        <p className="text-xs text-muted-foreground">AI cuts a 2-5 min highlight video</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={generateSocialClips} onCheckedChange={setGenerateSocialClips} />
                      <div>
                        <span className="text-sm">Generate social clips</span>
                        <p className="text-xs text-muted-foreground">AI cuts vertical clips for TikTok/Reels</p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Section 3: Production Schedule */}
            {streamingEnabled && (
              <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Production Schedule</h3>
                      <p className="text-sm text-muted-foreground">Timeline for the AI production assistant</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={addScheduleItem}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
                  </Button>
                </div>
                {productionSchedule.length === 0 ? (
                  <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center text-muted-foreground">
                    <p className="text-sm">No schedule entries yet. Add rows to plan your production timeline.</p>
                    <p className="text-xs mt-1">Example: "9:00 AM | Opening Keynote | Col. Smith | Use wide shot"</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-[#151821] text-left">
                          <th className="px-3 py-2 font-medium text-muted-foreground text-xs w-24">Time</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground text-xs">Segment</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground text-xs">Speaker</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground text-xs">Notes</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {productionSchedule.map((s) => (
                          <tr key={s.key} className="border-t border-gray-100 dark:border-gray-800">
                            <td className="px-3 py-1.5">
                              <Input type="time" value={s.time} onChange={(e) => updateScheduleItem(s.key, "time", e.target.value)} className="h-7 text-xs w-full" />
                            </td>
                            <td className="px-3 py-1.5">
                              <Input value={s.segment} onChange={(e) => updateScheduleItem(s.key, "segment", e.target.value)} placeholder="Opening Keynote" className="h-7 text-xs" />
                            </td>
                            <td className="px-3 py-1.5">
                              <SpeakerSelector
                                value={s.speaker}
                                onChange={(name) => updateScheduleItem(s.key, "speaker", name)}
                                placeholder="Col. Smith"
                                compact
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <Input value={s.notes} onChange={(e) => updateScheduleItem(s.key, "notes", e.target.value)} placeholder="Use wide shot" className="h-7 text-xs" />
                            </td>
                            <td className="px-3 py-1.5">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeScheduleItem(s.key)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {!streamingEnabled && (
              <Card className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-8 text-center text-muted-foreground">
                <Radio className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                <p className="text-sm font-medium">Streaming is disabled for this event</p>
                <p className="text-xs mt-1">Toggle "Live Streaming" above to configure media production settings.</p>
              </Card>
            )}
          </div>
        )}

        {/* ===== STEP 8: Review ===== */}
        {step === 8 && (
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
                <div className="flex justify-between"><span className="text-muted-foreground">Live Streaming</span><span className="font-medium">{streamingEnabled ? "Enabled" : "Disabled"}</span></div>
                {streamingEnabled && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Stream Source</span><span className="font-medium">{streamSource === "platform" ? "MilCrunch Platform" : "External Encoder"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Stages</span><span className="font-medium">{stages.filter((s) => s.name.trim()).length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Destinations</span><span className="font-medium">{selectedDestinations.length + customRtmp.length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">AI Features</span><span className="font-medium">{streamSource === "platform" ? Object.values(aiFeatures).filter(Boolean).length + " active" : "N/A"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Recording</span><span className="font-medium">{recordStream ? "Enabled" : "Disabled"}</span></div>
                  </>
                )}
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
