import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getCreatorAvatar } from "@/lib/avatar";
import {
  ArrowLeft, Calendar, MapPin, Users, Mic, Handshake, Plus, Trash2,
  Save, Loader2, ExternalLink, Settings, Clock, LayoutList, Eye, ChevronDown, Info,
  Search, Download, CheckCircle2, XCircle, Ticket, Globe, Copy, Code, QrCode,
  MessageCircle, ScanLine, Printer, DollarSign, BarChart3, Video, Radio, Play,
  Film, Sparkles, Target, Type, Clapperboard, Palette, Captions, Scissors,
  Monitor, Youtube, Facebook, Twitter, Twitch, Linkedin, Wifi, CheckCircle,
  Pencil, ShieldCheck, Megaphone, Send, Smartphone, Upload, Car,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import ImageUpload from "@/components/cms/ImageUpload";
import EventCommunityTab from "@/components/EventCommunityTab";
import EventInsightsTab from "@/components/EventInsightsTab";
import CheckInMode from "@/components/CheckInMode";
import EventBadgePrint from "@/components/EventBadgePrint";
import AddSpeakerModal, { SPEAKER_TYPES, SPEAKER_TYPE_COLORS } from "@/components/brand/AddSpeakerModal";
import EditSpeakerModal from "@/components/brand/EditSpeakerModal";
import AttendeeAppTab from "@/components/brand/AttendeeAppTab";
import AIBannerModal from "@/components/brand/AIBannerModal";
import EventGTMPlannerTab from "@/components/brand/EventGTMPlannerTab";
import AgendaBuilder from "@/components/brand/AgendaBuilder";
import EventAIAssistant from "@/components/brand/EventAIAssistant";
import { useDemoMode } from "@/hooks/useDemoMode";

/* ---------- types ---------- */
interface EventRow {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  event_type: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  cover_image_url: string | null;
  is_published: boolean | null;
  status: string | null;
  capacity: number | null;
  created_at: string | null;
  directory_id: string | null;
  rideshare_enabled?: boolean | null;
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
  qr_code_data: string | null;
  status: string | null;
  checked_in: boolean | null;
  checked_in_at: string | null;
  created_at: string | null;
  ticket_id: string | null;
}
interface TicketRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number | null;
  sold: number;
  event_format: string | null;
  qr_enabled: boolean | null;
  is_active: boolean | null;
  sort_order: number;
}

interface StreamRow {
  id: string;
  title: string | null;
  status: string | null;
  stream_key: string | null;
  recording_url: string | null;
  viewer_count: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  published: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500",
};
const EVENT_TYPES = [
  { value: "live", label: "In-Person" },
  { value: "virtual", label: "Virtual" },
  { value: "hybrid", label: "Hybrid" },
];
const SESSION_TYPES = ["keynote", "panel", "breakout", "workshop", "networking", "meal", "pdx_experience"];
const SPEAKER_ROLES = SPEAKER_TYPES.map((t) => t.value);
const SPONSOR_TIERS = ["title", "platinum", "gold", "silver", "bronze", "community"];
const TIER_COLORS: Record<string, string> = {
  title: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  platinum: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  gold: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  silver: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  bronze: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  community: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};
const EVENT_FORMATS = [
  { value: "in_person", label: "In-Person" },
  { value: "virtual", label: "Virtual" },
  { value: "hybrid", label: "Hybrid" },
];

/* ---------- Send Notification Card ---------- */
function SendNotificationCard({ eventId }: { eventId: string }) {
  const { guardAction } = useDemoMode();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("announcement");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (guardAction("notification")) return;
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSending(true);
    const { error } = await supabase.from("event_notifications").insert({
      event_id: eventId,
      title: title.trim(),
      body: body.trim(),
      type,
    } as Record<string, unknown>);
    setSending(false);
    if (error) {
      toast.error("Failed to send notification");
      return;
    }
    toast.success("Notification sent to all attendees!");
    setTitle("");
    setBody("");
    setType("announcement");
    setOpen(false);
  };

  return (
    <Card className="p-4 mb-4">
      {!open ? (
        <Button onClick={() => setOpen(true)} className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white gap-2">
          <Megaphone className="h-4 w-4" /> Send Notification to Attendees
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#1e3a5f]" /> Send Notification
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
          <div className="flex gap-2">
            {(["announcement", "schedule", "reminder"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`text-xs px-3 py-1 rounded-full font-medium capitalize transition-colors ${
                  type === t ? "bg-[#1e3a5f] text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Input placeholder="Notification title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Message body (optional)" value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
          <Button onClick={handleSend} disabled={sending} className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to All Attendees
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ======================================== */
const BrandEventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { guardAction } = useDemoMode();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [agenda, setAgenda] = useState<AgendaRow[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerRow[]>([]);
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [eventTickets, setEventTickets] = useState<TicketRow[]>([]);
  const [ticketEdits, setTicketEdits] = useState<Record<string, Partial<TicketRow>>>({});
  const [ticketSaving, setTicketSaving] = useState<Record<string, boolean>>({});
  const [regSearch, setRegSearch] = useState("");
  const [regSortCol, setRegSortCol] = useState<"name"|"email"|"ticket"|"branch"|"status"|"registered"|"checkin"|null>("registered");
  const [regSortDir, setRegSortDir] = useState<"asc"|"desc">("desc");
  const [checkInMode, setCheckInMode] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [eventStreams, setEventStreams] = useState<StreamRow[]>([]);
  const [searchParams] = useSearchParams();
  const VALID_TABS = new Set(["overview","agenda","speakers","sponsors","tickets","public-page","media","settings","registrations","attendee-app","community","insights","gtm-planner"]);
  const TAB_ALIASES: Record<string, string> = { "365-insights": "insights" };
  const initialTab = searchParams.get("tab");
  const resolvedTab = initialTab ? (TAB_ALIASES[initialTab] ?? initialTab) : null;
  const [activeTab, setActiveTab] = useState(resolvedTab && VALID_TABS.has(resolvedTab) ? resolvedTab : "overview");
  const isEmbed = searchParams.get("embed") === "true";
  const isExpandAll = searchParams.get("expand") === "all";
  const isDemoView = searchParams.get("demo") === "true";
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<SpeakerRow | null>(null);

  /* registration edit / delete */
  const [editingReg, setEditingReg] = useState<RegistrationRow | null>(null);
  const [editRegFirst, setEditRegFirst] = useState("");
  const [editRegLast, setEditRegLast] = useState("");
  const [editRegEmail, setEditRegEmail] = useState("");
  const [editRegTicket, setEditRegTicket] = useState("");
  const [editRegBranch, setEditRegBranch] = useState("");
  const [editRegStatus, setEditRegStatus] = useState("confirmed");
  const [savingReg, setSavingReg] = useState(false);
  const [deletingReg, setDeletingReg] = useState<RegistrationRow | null>(null);

  /* bulk selection for registrations */
  const [selectedRegIds, setSelectedRegIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  /* editable overview fields */
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editType, setEditType] = useState("live");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editCover, setEditCover] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editRideshare, setEditRideshare] = useState(false);
  const [showAIBanner, setShowAIBanner] = useState(false);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

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
        supabase.from("event_tickets").select("*").eq("event_id", eventId).order("sort_order"),
      ]);
      if (evRes.error) throw evRes.error;
      const ev = evRes.data as unknown as EventRow;
      setEvent(ev);
      setEditTitle(ev.title || "");
      setEditDesc(ev.description || "");
      setEditType(ev.event_type || "live");
      setEditStart(ev.start_date ? ev.start_date.slice(0, 10) : "");
      setEditEnd(ev.end_date ? ev.end_date.slice(0, 10) : "");
      setEditVenue(ev.venue || "");
      setEditCity(ev.city || "");
      setEditState(ev.state || "");
      setEditCover(ev.cover_image_url || "");
      setEditCapacity(ev.capacity ? String(ev.capacity) : "");
      setEditRideshare(!!(ev as Record<string, unknown>).rideshare_enabled);
      setAgenda((agRes.data || []) as AgendaRow[]);
      setSpeakers((spkRes.data || []) as SpeakerRow[]); // initial set; enrichSpeakerAvatars patches missing photos
      setSponsors((spsRes.data || []) as SponsorRow[]);
      setRegistrations((regRes.data || []) as RegistrationRow[]);
      setEventTickets((tkRes.data || []) as TicketRow[]);
      // Fetch streams separately — table may not exist yet
      try {
        const stRes = await supabase
          .from("event_streams")
          .select("*")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false });
        setEventStreams((stRes.data || []) as StreamRow[]);
      } catch { setEventStreams([]); }
    } catch (err) {
      console.error("Error loading event:", err);
      toast.error("Failed to load event");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchAll().then(() => refreshSpeakers()); }, [fetchAll]);

  /* ---- registration edit / delete ---- */
  const openEditReg = (r: RegistrationRow) => {
    setEditingReg(r);
    setEditRegFirst(r.first_name);
    setEditRegLast(r.last_name);
    setEditRegEmail(r.email);
    setEditRegTicket(r.ticket_id || "");
    setEditRegBranch(r.military_branch || "");
    setEditRegStatus(r.status || "confirmed");
  };

  const saveEditReg = async () => {
    if (!editingReg) return;
    if (guardAction("update")) return;
    setSavingReg(true);
    const { error } = await supabase
      .from("event_registrations")
      .update({
        first_name: editRegFirst.trim(),
        last_name: editRegLast.trim(),
        email: editRegEmail.trim(),
        ticket_id: editRegTicket || null,
        military_branch: editRegBranch || null,
        status: editRegStatus,
      } as Record<string, unknown>)
      .eq("id", editingReg.id);
    setSavingReg(false);
    if (error) {
      toast.error("Failed to update registration");
      console.error(error);
    } else {
      toast.success("Registration updated");
      setEditingReg(null);
      fetchAll();
    }
  };

  const confirmDeleteReg = async () => {
    if (!deletingReg) return;
    if (guardAction("delete", "Deletions are disabled in demo mode")) { setDeletingReg(null); return; }
    const { error } = await supabase
      .from("event_registrations")
      .delete()
      .eq("id", deletingReg.id);
    if (error) {
      toast.error("Failed to delete registration");
      console.error(error);
    } else {
      toast.success("Registration removed");
      fetchAll();
    }
    setDeletingReg(null);
  };

  const toggleRegSelect = (id: string) => {
    setSelectedRegIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const confirmBulkDeleteRegs = async () => {
    if (selectedRegIds.size === 0) return;
    if (guardAction("delete", "Deletions are disabled in demo mode")) { setBulkDeleteOpen(false); return; }
    setBulkDeleting(true);
    const ids = Array.from(selectedRegIds);
    const { error } = await supabase
      .from("event_registrations")
      .delete()
      .in("id", ids);
    setBulkDeleting(false);
    if (error) {
      toast.error("Failed to delete registrations");
      console.error(error);
    } else {
      toast.success(`Removed ${ids.length} registration${ids.length !== 1 ? "s" : ""}`);
      setSelectedRegIds(new Set());
      fetchAll();
    }
    setBulkDeleteOpen(false);
  };

  /* ---- banner upload ---- */
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
        setEditCover(data.url);
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

  /* ---- save overview ---- */
  const saveOverview = async () => {
    if (guardAction("update")) return;
    if (!eventId) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        event_type: editType,
        start_date: editStart || null,
        end_date: editEnd || null,
        venue: editVenue.trim() || null,
        city: editCity.trim() || null,
        state: editState.trim() || null,
        cover_image_url: editCover.trim() || null,
        capacity: editCapacity ? parseInt(editCapacity) : null,
      };

      console.log("[EventDetail] Update payload:", payload);
      console.log("[EventDetail] cover_image_url being saved:", payload.cover_image_url);
      const { data, error } = await supabase
        .from("events")
        .update(payload)
        .eq("id", eventId)
        .select();
      if (error) {
        console.error("[EventDetail] Supabase update error:", JSON.stringify(error, null, 2));
        throw new Error(error.message);
      }
      if (!data || data.length === 0) {
        console.error("[EventDetail] Update returned no rows — RLS may be blocking. Check that current user owns this event or has super_admin role.");
        throw new Error("Update failed — no rows affected (permission issue)");
      }
      console.log("[EventDetail] Saved row cover_image_url:", (data[0] as Record<string, unknown>).cover_image_url);
      toast.success("Event updated");
      fetchAll();
    } catch (err: unknown) {
      console.error("[EventDetail] Save failed:", err);
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
        .update({ slug: editSubdomain.trim() || null } as Record<string, unknown>)
        .eq("id", eventId);
      if (error) {
        console.error("[EventDetail] Supabase slug update error:", JSON.stringify(error, null, 2));
        throw new Error(error.message);
      }
      toast.success("Public page settings saved");
      fetchAll();
    } catch (err: unknown) {
      console.error("[EventDetail] Save public page failed:", err);
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
      // Try updating both status and is_published; if the status column doesn't
      // exist yet, fall back to just is_published so the button never errors.
      const payload: Record<string, unknown> = {
        status: newStatus,
        is_published: newStatus !== "draft",
      };
      const { error } = await supabase
        .from("events")
        .update(payload as Record<string, unknown>)
        .eq("id", eventId);
      if (error) {
        // If the error is about the status column not existing, retry with just is_published
        if (error.message?.includes("status") || error.code === "PGRST204" || error.code === "42703") {
          const { error: fallbackErr } = await supabase
            .from("events")
            .update({ is_published: newStatus !== "draft" } as Record<string, unknown>)
            .eq("id", eventId);
          if (fallbackErr) throw fallbackErr;
        } else {
          throw error;
        }
      }
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

  /* ---- add speaker (opens modal) ---- */
  const addSpeaker = () => setShowAddSpeaker(true);

  /* ---- refresh speakers only (preserves tab) ---- */
  const refreshSpeakers = async () => {
    if (!eventId) return;
    const { data } = await supabase
      .from("event_speakers")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order");
    const rows = (data || []) as SpeakerRow[];
    // Enrich missing avatars from directory_members + speakers table
    const missing = rows.filter((s) => !getCreatorAvatar(s) && s.creator_name);
    if (missing.length > 0) {
      const names = missing.map((s) => s.creator_name!);
      const [dmRes, spkRes] = await Promise.all([
        supabase.from("directory_members")
          .select("creator_name, ic_avatar_url, avatar_url")
          .in("creator_name", names),
        supabase.from("speakers")
          .select("name, photo_url, verification_id")
          .in("name", names),
      ]);
      // Build name → avatar map from directory_members
      const avatarMap = new Map<string, string>();
      for (const dm of (dmRes.data || []) as { creator_name: string; ic_avatar_url: string | null; avatar_url: string | null }[]) {
        const url = dm.ic_avatar_url || dm.avatar_url;
        if (url && typeof url === "string" && url.startsWith("https://")) {
          avatarMap.set(dm.creator_name, url);
        }
      }
      // Fallback: speakers table photo_url or verification photo
      const spkRows = (spkRes.data || []) as { name: string; photo_url: string | null; verification_id: string | null }[];
      const needVerification: string[] = [];
      for (const sp of spkRows) {
        if (!avatarMap.has(sp.name)) {
          if (sp.photo_url && sp.photo_url.startsWith("https://")) {
            avatarMap.set(sp.name, sp.photo_url);
          } else if (sp.verification_id) {
            needVerification.push(sp.verification_id);
          }
        }
      }
      // Fetch verification photos
      if (needVerification.length > 0) {
        const { data: vRows } = await supabase
          .from("verifications")
          .select("id, profile_photo_url")
          .in("id", needVerification);
        const vMap = new Map((vRows || []).map((v: { id: string; profile_photo_url: string | null }) => [v.id, v.profile_photo_url]));
        for (const sp of spkRows) {
          if (!avatarMap.has(sp.name) && sp.verification_id && vMap.has(sp.verification_id)) {
            const url = vMap.get(sp.verification_id);
            if (url && url.startsWith("https://")) avatarMap.set(sp.name, url);
          }
        }
      }
      // Patch rows and persist avatar_url for future loads
      for (const row of rows) {
        if (!getCreatorAvatar(row) && row.creator_name && avatarMap.has(row.creator_name)) {
          row.avatar_url = avatarMap.get(row.creator_name)!;
          // Persist so we don't re-fetch every time
          supabase.from("event_speakers")
            .update({ avatar_url: row.avatar_url } as Record<string, unknown>)
            .eq("id", row.id)
            .then(({ error }) => { if (error) console.warn("Failed to persist speaker avatar:", error.message); });
        }
      }
    }
    setSpeakers(rows);
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

  /* ---- add ticket ---- */
  const addTicket = async () => {
    if (!eventId) return;
    const { error } = await supabase.from("event_tickets").insert({
      event_id: eventId,
      name: "New Ticket",
      price: 0,
      quantity: 100,
      event_format: "in_person",
      qr_enabled: true,
      is_active: true,
      sort_order: eventTickets.length,
    } as Record<string, unknown>);
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
    refreshSpeakers();
  };
  const deleteSponsor = async (id: string) => {
    await supabase.from("event_sponsors").delete().eq("id", id);
    fetchAll();
  };
  const deleteTicket = async (id: string) => {
    await supabase.from("event_tickets").delete().eq("id", id);
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
  const updateTicketField = async (id: string, field: string, value: unknown) => {
    await supabase.from("event_tickets").update({ [field]: value } as Record<string, unknown>).eq("id", id);
  };
  const editTicketLocal = (id: string, field: keyof TicketRow, value: unknown) => {
    setTicketEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };
  const saveTicket = async (ticket: TicketRow) => {
    setTicketSaving((prev) => ({ ...prev, [ticket.id]: true }));
    try {
      const edits = ticketEdits[ticket.id] || {};
      const payload: Record<string, unknown> = {
        name: edits.name ?? ticket.name,
        description: edits.description ?? ticket.description ?? "",
        price: edits.price ?? ticket.price,
        quantity: edits.quantity ?? ticket.quantity,
        event_format: edits.event_format ?? ticket.event_format ?? "in_person",
        qr_enabled: edits.qr_enabled ?? ticket.qr_enabled ?? false,
        is_active: edits.is_active ?? ticket.is_active ?? true,
        sort_order: edits.sort_order ?? ticket.sort_order,
      };
      const { error } = await supabase
        .from("event_tickets")
        .update(payload)
        .eq("id", ticket.id);
      if (error) throw error;
      setTicketEdits((prev) => { const next = { ...prev }; delete next[ticket.id]; return next; });
      toast.success(`"${payload.name}" saved`);
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save ticket");
    } finally {
      setTicketSaving((prev) => ({ ...prev, [ticket.id]: false }));
    }
  };

  /* ---- delete event ---- */
  const deleteEvent = async () => {
    if (guardAction("delete")) return;
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

  // Derive status: prefer explicit status column, fall back to is_published boolean
  const statusKey = (event.status || (event.is_published ? "published" : "draft")) as string;

  /* ---- Check-In Mode overlay ---- */
  if (checkInMode) {
    return (
      <CheckInMode
        eventId={eventId!}
        eventTitle={event.title}
        registrations={registrations}
        tickets={eventTickets.map((t) => ({ id: t.id, name: t.name }))}
        onClose={() => { setCheckInMode(false); fetchAll(); }}
        onRefresh={fetchAll}
      />
    );
  }

  /* ---- Badge Print overlay ---- */
  if (showBadges) {
    const ticketMap = Object.fromEntries(eventTickets.map((t) => [t.id, t]));
    const badgeData = registrations.map((r) => ({
      id: r.id,
      first_name: r.first_name,
      last_name: r.last_name,
      registration_code: r.registration_code,
      ticket_name: ticketMap[r.ticket_id || ""]?.name || "General",
      ticket_color: "default",
    }));
    const dateStr = event.start_date ? format(new Date(event.start_date), "MMM d, yyyy") : "";
    const venueStr = [event.venue, event.city, event.state].filter(Boolean).join(", ");
    return (
      <EventBadgePrint
        eventTitle={event.title}
        eventDate={dateStr}
        eventVenue={venueStr}
        badges={badgeData}
        onClose={() => setShowBadges(false)}
      />
    );
  }

  return (
    <div className={cn("min-h-full text-foreground transition-colors", isEmbed ? "bg-transparent" : "bg-pd-page-light dark:bg-[#0F1117]")}>
      <div className="max-w-5xl mx-auto">
        {/* Header — hidden in embed mode */}
        {!isEmbed && (
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/brand/events")} data-back-nav>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-pd-navy dark:text-white">{event.title}</h1>
                <Badge className={STATUS_STYLES[statusKey] + " text-xs font-medium capitalize"}>{statusKey}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {event.start_date ? format(new Date(event.start_date), "MMM d, yyyy") : "No date"}
                {event.end_date ? ` \u2013 ${format(new Date(event.end_date), "MMM d, yyyy")}` : ""}
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
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {!isEmbed && (
          <TabsList className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-lg mb-6 h-auto p-1 flex flex-col items-stretch gap-0">
            {/* Row 1 — Build */}
            <div className="flex flex-wrap justify-center gap-1">
              <TabsTrigger value="overview"><LayoutList className="h-4 w-4 mr-1.5" />Overview</TabsTrigger>
              <TabsTrigger value="agenda"><Clock className="h-4 w-4 mr-1.5" />Agenda</TabsTrigger>
              <TabsTrigger value="speakers"><Mic className="h-4 w-4 mr-1.5" />Speakers</TabsTrigger>
              <TabsTrigger value="sponsors"><Handshake className="h-4 w-4 mr-1.5" />Sponsors</TabsTrigger>
              <TabsTrigger value="tickets"><Ticket className="h-4 w-4 mr-1.5" />Tickets{eventTickets.length > 0 && <Badge className="ml-1.5 bg-blue-100 text-blue-800 text-xs">{eventTickets.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="public-page"><Globe className="h-4 w-4 mr-1.5" />Public Page</TabsTrigger>
              <TabsTrigger value="media"><Film className="h-4 w-4 mr-1.5" />Media</TabsTrigger>
              <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1.5" />Settings</TabsTrigger>
            </div>
            {/* Divider */}
            <div className="flex items-center gap-2 px-2 my-1">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Manage &amp; Measure</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>
            {/* Row 2 — Manage */}
            <div className="flex flex-wrap justify-center gap-1">
              <TabsTrigger value="registrations"><Users className="h-4 w-4 mr-1.5" />Registrations{registrations.length > 0 && <Badge className="ml-1.5 bg-blue-100 text-blue-800 text-xs">{registrations.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="attendee-app"><Smartphone className="h-4 w-4 mr-1.5" />Attendee App</TabsTrigger>
              <TabsTrigger value="community"><MessageCircle className="h-4 w-4 mr-1.5" />Community</TabsTrigger>
              <TabsTrigger value="insights"><BarChart3 className="h-4 w-4 mr-1.5" />365 Insights</TabsTrigger>
              <TabsTrigger value="gtm-planner"><Target className="h-4 w-4 mr-1.5" />GTM Planner</TabsTrigger>
            </div>
          </TabsList>
          )}

          {/* ===== OVERVIEW ===== */}
          <TabsContent value="overview" className="space-y-5">

            {/* ── Hero Header Card ── */}
            <Card className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-[#000741]/[0.03] via-white to-blue-50/40 dark:from-[#000741]/20 dark:via-[#1A1D27] dark:to-[#1A1D27]">
              {/* Decorative accent stripe */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pd-blue via-[#6C5CE7] to-pd-blue" />

              <div className="p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{editTitle || event?.title || "Untitled Event"}</h2>
                      <Badge className={STATUS_STYLES[statusKey] + " text-xs font-medium capitalize shrink-0"}>{statusKey}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                      {(editStart || editEnd) && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          {editStart ? format(new Date(editStart + "T00:00"), "MMM d, yyyy") : "TBD"}
                          {editEnd ? ` \u2013 ${format(new Date(editEnd + "T00:00"), "MMM d, yyyy")}` : ""}
                        </span>
                      )}
                      {editVenue && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {[editVenue, editCity, editState].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {editCapacity && (
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-gray-400" />
                          {Number(editCapacity).toLocaleString()} max
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
              </div>
            </Card>

            {/* ── AI Event Assistant (collapsible) ── */}
            {event && (
              <Collapsible>
                <Card className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden">
                  <CollapsibleTrigger className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">AI Event Assistant</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">Ask about your event, get suggestions, draft outreach</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800">
                      <EventAIAssistant
                        eventTitle={event.title}
                        eventDescription={event.description}
                        eventType={event.event_type}
                        startDate={event.start_date}
                        endDate={event.end_date}
                        venue={event.venue}
                        city={event.city}
                        state={event.state}
                        capacity={event.capacity}
                        status={event.is_published ? "published" : "draft"}
                        sponsors={sponsors.map(s => ({ sponsor_name: s.sponsor_name, tier: s.tier }))}
                        speakers={speakers.map(s => ({ creator_name: s.creator_name, role: s.role, confirmed: s.confirmed }))}
                        tickets={(() => {
                          // Count registrations with no ticket_id (from bulk-add without ticket selection)
                          const unmatchedCount = registrations.filter(r => !r.ticket_id).length;
                          return eventTickets.map((t, idx) => {
                            const actualSold = registrations.filter(r => r.ticket_id === t.id).length;
                            // Attribute unmatched registrations to the first ticket type
                            const extra = idx === 0 ? unmatchedCount : 0;
                            const sold = Math.max(t.sold || 0, actualSold + extra);
                            return { name: t.name, price: t.price, quantity: t.quantity || 0, sold };
                          });
                        })()}
                        registrationCount={registrations.length}
                        agendaSessionCount={agenda.length}
                      />
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* ── Event Details Card ── */}
            <Card className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-5 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                Event Details
              </h3>
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
              </div>
            </Card>

            {/* ── Schedule Card ── */}
            <Card className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-5 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <Calendar className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                Schedule
              </h3>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="mt-1" />
                </div>
              </div>
            </Card>

            {/* ── Location Card ── */}
            <Card className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-5 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                Location
              </h3>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>Venue</Label>
                  <Input value={editVenue} onChange={(e) => setEditVenue(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={editState} onChange={(e) => setEditState(e.target.value)} className="mt-1" />
                </div>
              </div>
            </Card>

            {/* ── Cover Image Card ── */}
            <Card className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-5 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center">
                  <Film className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400" />
                </div>
                Cover Image
              </h3>
              {editCover && (
                <div className="relative mb-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img
                    src={editCover}
                    alt="Event cover preview"
                    className="w-full h-48 object-cover"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 bg-black/50 hover:bg-black/70 text-white rounded-full"
                    onClick={() => setEditCover("")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => setShowAIBanner(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
              <AIBannerModal
                open={showAIBanner}
                onOpenChange={setShowAIBanner}
                eventName={editTitle}
                eventLocation={[editVenue, editCity, editState].filter(Boolean).join(", ")}
                eventDate={editStart}
                onSelectImage={(url) => setEditCover(url)}
              />
            </Card>

            {/* ── Event Settings Card ── */}
            <Card className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-5 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Settings className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                </div>
                Event Settings
              </h3>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Car className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Enable Ride Share</p>
                    <p className="text-xs text-muted-foreground">Allow attendees to offer and request rides to this event.</p>
                  </div>
                </div>
                <Switch
                  checked={editRideshare}
                  onCheckedChange={setEditRideshare}
                  aria-label="Toggle ride share"
                />
              </div>
            </Card>

            {/* ── Save Button ── */}
            <div className="flex justify-end">
              <Button onClick={saveOverview} disabled={saving} className="bg-pd-blue hover:bg-pd-darkblue text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </div>

          </TabsContent>

          {/* ===== AGENDA ===== */}
          <TabsContent value="agenda">
            {eventId && event && (
              <AgendaBuilder
                eventId={eventId}
                startDate={event.start_date}
                endDate={event.end_date}
                speakers={speakers}
                onRefresh={fetchAll}
              />
            )}
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
              {speakers.map((s) => {
                const typeLabel = SPEAKER_TYPES.find((t) => t.value === s.role)?.label || s.role || "Speaker";
                const typeColor = SPEAKER_TYPE_COLORS[s.role || ""] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
                const initials = (s.creator_name || "?")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <Card key={s.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-pd-blue/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {getCreatorAvatar(s) ? (
                          <img src={getCreatorAvatar(s)!} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold text-pd-blue">{initials}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm truncate">{s.creator_name || "Unnamed"}</span>
                          {s.confirmed && <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <Badge className={`text-xs ${typeColor}`}>{typeLabel}</Badge>
                          {s.creator_handle && (
                            <span className="text-xs text-muted-foreground truncate">{s.creator_handle}</span>
                          )}
                        </div>
                        {s.topic && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{s.topic}</p>
                        )}
                        {s.bio && (
                          <p className="text-xs text-muted-foreground/70 line-clamp-2">{s.bio}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditingSpeaker(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => deleteSpeaker(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            {speakers.length === 0 && (
              <Card className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-8 text-center text-muted-foreground">
                No speakers yet. Click "Add Speaker" to get started.
              </Card>
            )}

            {/* Add Speaker Modal */}
            {eventId && (
              <AddSpeakerModal
                open={showAddSpeaker}
                onOpenChange={setShowAddSpeaker}
                eventId={eventId}
                userId={user?.id}
                currentCount={speakers.length}
                onAdded={refreshSpeakers}
              />
            )}

            {/* Edit Speaker Modal */}
            <EditSpeakerModal
              open={!!editingSpeaker}
              onOpenChange={(open) => !open && setEditingSpeaker(null)}
              speaker={editingSpeaker}
              onSaved={refreshSpeakers}
            />
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

          {/* ===== TICKETS ===== */}
          <TabsContent value="tickets">
            {(() => {
              const totalCapacity = eventTickets.reduce((sum, t) => sum + (t.quantity || 0), 0);
              const totalSold = eventTickets.reduce((sum, t) => sum + (t.sold || 0), 0);
              const totalRevenue = eventTickets.reduce((sum, t) => sum + (t.sold || 0) * t.price, 0);

              return (
                <div className="space-y-4">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4 text-center">
                      <p className="text-2xl font-bold text-blue-700">{eventTickets.length}</p>
                      <p className="text-xs text-muted-foreground">Ticket Types</p>
                    </Card>
                    <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4 text-center">
                      <p className="text-2xl font-bold text-pd-blue">{totalCapacity}</p>
                      <p className="text-xs text-muted-foreground">Total Capacity</p>
                    </Card>
                    <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{totalSold}</p>
                      <p className="text-xs text-muted-foreground">Total Sold</p>
                    </Card>
                    <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4 text-center">
                      <p className="text-2xl font-bold text-foreground">${totalRevenue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </Card>
                  </div>

                  {/* Add ticket */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{eventTickets.length} ticket type{eventTickets.length !== 1 ? "s" : ""}</p>
                    <Button size="sm" variant="outline" onClick={addTicket}>
                      <Plus className="h-4 w-4 mr-1" /> Add Ticket
                    </Button>
                  </div>

                  {/* Ticket list */}
                  {eventTickets.map((t) => {
                    const edits = ticketEdits[t.id] || {};
                    const isDirty = Object.keys(edits).length > 0;
                    const isSaving = ticketSaving[t.id] || false;
                    return (
                    <Card key={t.id} className={`rounded-xl border bg-white dark:bg-[#1A1D27] p-4 ${isDirty ? "border-blue-400 dark:border-blue-600" : "border-gray-200 dark:border-gray-800"}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                          {/* Row 1: Name + badges */}
                          <div className="flex items-center gap-2">
                            <Input
                              defaultValue={t.name}
                              className="font-semibold text-sm max-w-xs"
                              onChange={(e) => editTicketLocal(t.id, "name", e.target.value)}
                            />
                            <Badge variant="outline" className="text-xs capitalize shrink-0">{((edits.event_format as string) || t.event_format || "in_person").replace("_", " ")}</Badge>
                            {(edits.qr_enabled ?? t.qr_enabled) && <Badge className="bg-green-100 text-green-700 text-xs shrink-0">QR</Badge>}
                            {!(edits.is_active ?? t.is_active ?? true) && <Badge className="bg-red-100 text-red-700 text-xs shrink-0">Inactive</Badge>}
                          </div>

                          {/* Row 2: Price, Quantity, Sold, Format */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <Label className="text-xs text-muted-foreground">Price</Label>
                              <Input
                                type="number"
                                defaultValue={t.price}
                                className="h-8 text-sm"
                                onChange={(e) => editTicketLocal(t.id, "price", parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Quantity</Label>
                              <Input
                                type="number"
                                defaultValue={t.quantity || 0}
                                className="h-8 text-sm"
                                onChange={(e) => editTicketLocal(t.id, "quantity", parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Sold</Label>
                              <p className="text-sm font-medium mt-1">{t.sold || 0}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Format</Label>
                              <Select
                                defaultValue={t.event_format || "in_person"}
                                onValueChange={(v) => editTicketLocal(t.id, "event_format", v)}
                              >
                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {EVENT_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Row 3: Description */}
                          <div>
                            <Label className="text-xs text-muted-foreground">Description</Label>
                            <Textarea
                              defaultValue={t.description || ""}
                              placeholder="Optional ticket description..."
                              className="text-sm min-h-[60px]"
                              onChange={(e) => editTicketLocal(t.id, "description", e.target.value)}
                            />
                          </div>

                          {/* Row 4: Toggles + Sort Order + Save */}
                          <div className="flex flex-wrap items-center gap-4 pt-1">
                            <label className="flex items-center gap-2 text-sm">
                              <Switch
                                checked={edits.is_active !== undefined ? !!edits.is_active : (t.is_active ?? true)}
                                onCheckedChange={(v) => editTicketLocal(t.id, "is_active", v)}
                              />
                              Active
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <Switch
                                checked={edits.qr_enabled !== undefined ? !!edits.qr_enabled : (t.qr_enabled ?? false)}
                                onCheckedChange={(v) => editTicketLocal(t.id, "qr_enabled", v)}
                              />
                              QR Check-in
                            </label>
                            <div className="flex items-center gap-1.5">
                              <Label className="text-xs text-muted-foreground whitespace-nowrap">Sort Order</Label>
                              <Input
                                type="number"
                                defaultValue={t.sort_order}
                                className="h-8 text-sm w-16"
                                onChange={(e) => editTicketLocal(t.id, "sort_order", parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div className="ml-auto">
                              <Button
                                size="sm"
                                onClick={() => saveTicket(t)}
                                disabled={isSaving}
                                className="bg-pd-blue hover:bg-pd-darkblue text-white"
                              >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                                Save
                              </Button>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700" onClick={() => deleteTicket(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                    );
                  })}

                  {eventTickets.length === 0 && (
                    <Card className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-8 text-center text-muted-foreground">
                      No tickets configured yet.
                    </Card>
                  )}
                </div>
              );
            })()}
          </TabsContent>

          {/* ===== REGISTRATIONS ===== */}
          <TabsContent value="registrations">
            {(() => {
              const ticketMap = Object.fromEntries(eventTickets.map((t) => [t.id, t]));
              const defaultTicketName = eventTickets.length > 0 ? eventTickets[0].name : "General Admission";
              const resolveTicketName = (r: RegistrationRow) => {
                if (r.ticket_id && ticketMap[r.ticket_id]) return ticketMap[r.ticket_id].name;
                return defaultTicketName;
              };
              const abbreviateTicket = (name: string) => {
                const lower = name.toLowerCase();
                if (lower.includes("general") && lower.includes("admission")) return "GA";
                if (lower.includes("vip")) return "VIP";
                if (lower.includes("creator")) return "Creator";
                if (lower.includes("press")) return "Press";
                if (lower.includes("sponsor")) return "Sponsor";
                // Fall back: first word, max 8 chars
                const first = name.split(/\s+/)[0];
                return first.length > 8 ? first.slice(0, 7) + "\u2026" : first;
              };
              const toggleRegSort = (col: typeof regSortCol) => {
                if (regSortCol !== col) { setRegSortCol(col); setRegSortDir("asc"); }
                else if (regSortDir === "asc") setRegSortDir("desc");
                else { setRegSortCol(null); setRegSortDir("asc"); }
              };
              const regSortArrow = (col: typeof regSortCol) =>
                regSortCol === col ? (regSortDir === "asc" ? " ▲" : " ▼") : "";

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
              if (regSortCol) {
                const dir = regSortDir === "asc" ? 1 : -1;
                filteredRegs.sort((a, b) => {
                  let av = "", bv = "";
                  switch (regSortCol) {
                    case "name": av = `${a.first_name} ${a.last_name}`.toLowerCase(); bv = `${b.first_name} ${b.last_name}`.toLowerCase(); break;
                    case "email": av = a.email.toLowerCase(); bv = b.email.toLowerCase(); break;
                    case "ticket": av = resolveTicketName(a).toLowerCase(); bv = resolveTicketName(b).toLowerCase(); break;
                    case "branch": av = (a.military_branch || "").toLowerCase(); bv = (b.military_branch || "").toLowerCase(); break;
                    case "status": av = (a.status || "").toLowerCase(); bv = (b.status || "").toLowerCase(); break;
                    case "registered": return dir * (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
                    case "checkin": return dir * ((a.checked_in ? 1 : 0) - (b.checked_in ? 1 : 0));
                  }
                  return dir * av.localeCompare(bv);
                });
              }
              const checkedInCount = registrations.filter((r) => r.checked_in).length;
              const allFilteredSelected = filteredRegs.length > 0 && filteredRegs.every((r) => selectedRegIds.has(r.id));
              const someFilteredSelected = filteredRegs.some((r) => selectedRegIds.has(r.id));

              const toggleSelectAllFiltered = () => {
                if (allFilteredSelected) {
                  setSelectedRegIds((prev) => {
                    const next = new Set(prev);
                    filteredRegs.forEach((r) => next.delete(r.id));
                    return next;
                  });
                } else {
                  setSelectedRegIds((prev) => {
                    const next = new Set(prev);
                    filteredRegs.forEach((r) => next.add(r.id));
                    return next;
                  });
                }
              };

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
                  resolveTicketName(r),
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
                  <div className={`grid grid-cols-2 gap-2 ${eventTickets.length > 0 ? `md:grid-cols-${Math.min(2 + eventTickets.length, 6)}` : "md:grid-cols-2"}`} style={{ gridTemplateColumns: `repeat(${Math.min(2 + eventTickets.length, 6)}, minmax(0, 1fr))` }}>
                    <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] px-3 py-2.5 text-center">
                      <p className="text-lg font-bold text-pd-blue">{registrations.length}</p>
                      <p className="text-[11px] text-muted-foreground">Total</p>
                    </Card>
                    <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] px-3 py-2.5 text-center">
                      <p className="text-lg font-bold text-blue-700">{checkedInCount}</p>
                      <p className="text-[11px] text-muted-foreground">Checked In</p>
                    </Card>
                    {eventTickets.map((t) => {
                      const count = registrations.filter((r) => r.ticket_id === t.id).length
                        + (eventTickets.indexOf(t) === 0 ? registrations.filter((r) => !r.ticket_id).length : 0);
                      return (
                        <Card key={t.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] px-3 py-2.5 text-center" title={t.name}>
                          <p className="text-lg font-bold text-foreground">{count}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{abbreviateTicket(t.name)}</p>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Search + Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, branch..."
                        value={regSearch}
                        onChange={(e) => setRegSearch(e.target.value)}
                        className="pl-10 bg-white dark:bg-[#1A1D27]"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCheckInMode(true)}>
                      <ScanLine className="h-4 w-4 mr-1" /> Check-In Mode
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowBadges(true)} disabled={registrations.length === 0}>
                      <Printer className="h-4 w-4 mr-1" /> Print All Badges
                    </Button>
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
                      <table className="w-full text-sm table-fixed">
                        <colgroup>
                          <col className="w-10" />
                          <col style={{ width: "160px" }} />
                          <col style={{ width: "200px" }} />
                          <col className="w-16" />
                          <col className="w-24" />
                          <col className="w-20" />
                          <col className="w-20" />
                          <col className="w-10" />
                          <col className="w-20" />
                        </colgroup>
                        <thead className="bg-gray-50 dark:bg-[#151821] text-left">
                          <tr>
                            <th className="pl-3 pr-1 py-2.5">
                              <Checkbox
                                checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                                onCheckedChange={toggleSelectAllFiltered}
                              />
                            </th>
                            {([["name","Name"],["email","Email"],["ticket","Ticket"],["branch","Branch"],["status","Status"],["registered","Registered"]] as const).map(([col, label]) => (
                              <th key={col} className="px-2 py-2.5 font-medium text-muted-foreground text-xs cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleRegSort(col)}>
                                {label}{regSortArrow(col)}
                              </th>
                            ))}
                            <th className="px-1 py-2.5 text-center cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleRegSort("checkin")}>
                              <span className="inline-flex items-center gap-0.5 text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" />{regSortArrow("checkin") && <span className="text-[10px]">{regSortArrow("checkin")}</span>}</span>
                            </th>
                            <th className="px-1 py-2.5" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {filteredRegs.map((r) => (
                            <tr key={r.id} className={`hover:bg-gray-50/50 dark:hover:bg-[#1E2130] ${selectedRegIds.has(r.id) ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}>
                              <td className="pl-3 pr-1 py-2">
                                <Checkbox
                                  checked={selectedRegIds.has(r.id)}
                                  onCheckedChange={() => toggleRegSelect(r.id)}
                                />
                              </td>
                              <td className="px-2 py-2 font-medium text-foreground text-xs overflow-hidden text-ellipsis whitespace-nowrap" title={`${r.first_name} ${r.last_name}`}>
                                {r.first_name} {r.last_name}
                              </td>
                              <td className="px-2 py-2 text-muted-foreground text-xs overflow-hidden text-ellipsis whitespace-nowrap" title={r.email}>{r.email}</td>
                              <td className="px-2 py-2">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-default" title={resolveTicketName(r)}>
                                  {abbreviateTicket(resolveTicketName(r))}
                                </Badge>
                              </td>
                              <td className="px-2 py-2 text-muted-foreground text-xs overflow-hidden text-ellipsis whitespace-nowrap">{r.military_branch || "\u2014"}</td>
                              <td className="px-2 py-2">
                                <Badge className={`text-[10px] px-1.5 py-0 ${r.status === "confirmed" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}>
                                  {r.status}
                                </Badge>
                              </td>
                              <td className="px-2 py-2 text-muted-foreground text-xs whitespace-nowrap">
                                {r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "\u2014"}
                              </td>
                              <td className="px-1 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleCheckIn(r)}
                                  className={r.checked_in ? "text-blue-700" : "text-gray-300 hover:text-gray-500"}
                                >
                                  {r.checked_in ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                </button>
                              </td>
                              <td className="px-1 py-2">
                                <div className="flex items-center justify-end gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditReg(r)}
                                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    title="Edit"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingReg(r)}
                                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                  )}

                  {/* Floating bulk action bar */}
                  {selectedRegIds.size > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-background">
                      <span className="text-sm font-medium whitespace-nowrap">
                        {selectedRegIds.size} registration{selectedRegIds.size !== 1 ? "s" : ""} selected
                      </span>
                      <div className="h-4 w-px bg-border" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setBulkDeleteOpen(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Delete Selected
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setSelectedRegIds(new Set())}>
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}
          </TabsContent>

          {/* ===== COMMUNITY ===== */}
          <TabsContent value="community">
            {/* Send Notification */}
            <SendNotificationCard eventId={eventId!} />
            <EventCommunityTab
              eventId={eventId!}
              eventCreatedAt={event.created_at ?? null}
              eventStartDate={event.start_date}
              registrationCount={registrations.length}
            />
          </TabsContent>

          {/* ===== 365 INSIGHTS ===== */}
          <TabsContent value="insights">
            <EventInsightsTab
              eventId={eventId!}
              eventStartDate={event.start_date}
              directoryId={event.directory_id}
            />
          </TabsContent>

          {/* ===== GTM PLANNER ===== */}
          <TabsContent value="gtm-planner">
            {event && (
              <EventGTMPlannerTab
                eventId={event.id}
                eventTitle={event.title}
                eventDescription={event.description}
                eventType={event.event_type}
                startDate={event.start_date}
                endDate={event.end_date}
                venue={event.venue}
                city={event.city}
                state={event.state}
                capacity={event.capacity}
                speakerCount={speakers.length}
                sponsorCount={sponsors.length}
                registrationCount={registrations.length}
                scrollToSection={searchParams.get("section")}
                expandAll={isExpandAll}
                demoMode={isDemoView}
              />
            )}
          </TabsContent>

          {/* ===== PUBLIC PAGE ===== */}
          <TabsContent value="public-page">
            {(() => {
              const publicUrl = `https://milcrunch.com/events/${eventId}`;
              const registerUrl = `${publicUrl}/register`;
              const subdomainStatus = event.custom_subdomain ? "active" : "not_configured";
              const ogTitle = editOgTitle || event.title;
              const ogDesc = editOgDesc || (event.description || "").slice(0, 160);
              const ogImage = editOgImage || event.cover_image_url || "";

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
                          <Input value={editSubdomain} onChange={(e) => setEditSubdomain(e.target.value)} placeholder="mic2026" className="max-w-xs" />
                          <span className="text-sm text-muted-foreground">.recurrentx.com</span>
                        </div>
                      </div>
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
                      <p className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                        Custom domains are configured by the MilCrunch team. Contact support for setup.
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
                          <Input value={editOgTitle} onChange={(e) => setEditOgTitle(e.target.value)} placeholder={event.title} className="mt-1" />
                        </div>
                        <div>
                          <Label>OG Description</Label>
                          <Textarea value={editOgDesc} onChange={(e) => setEditOgDesc(e.target.value)} placeholder={(event.description || "").slice(0, 160)} rows={3} className="mt-1" maxLength={160} />
                          <p className="text-xs text-muted-foreground mt-0.5">{editOgDesc.length}/160 characters</p>
                        </div>
                        <div>
                          <ImageUpload
                            label="OG Image"
                            value={editOgImage}
                            onChange={(url) => setEditOgImage(url)}
                            folder="events"
                          />
                        </div>
                      </div>
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
                      <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(embedCode, "Embed code")}>
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
                    <p className="text-sm text-muted-foreground mb-4">Scan to open the public event page.</p>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="bg-white p-4 rounded-xl border border-gray-200 dark:border-gray-300 inline-block">
                        <QRCodeSVG id="event-qr-code" value={publicUrl} size={180} level="H" includeMargin={false} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-mono text-muted-foreground">{publicUrl}</p>
                        <Button variant="outline" size="sm" onClick={downloadQR}>
                          <Download className="h-4 w-4 mr-1" /> Download QR Code (PNG)
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Save */}
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

          {/* ===== MEDIA ===== */}
          <TabsContent value="media">
            {(() => {
              const rtmpUrl = "rtmp://stream.recurrentx.com/live";
              const streamKey = eventId || "";
              const liveStream = eventStreams.find((s) => s.status === "live");
              const endedStreams = eventStreams.filter((s) => s.status === "ended");

              const copyToClipboard = (text: string, label: string) => {
                navigator.clipboard.writeText(text);
                toast.success(`${label} copied to clipboard`);
              };

              const formatDuration = (start: string | null, end: string | null) => {
                if (!start) return "\u2014";
                const s = new Date(start).getTime();
                const e = end ? new Date(end).getTime() : Date.now();
                const secs = Math.floor((e - s) / 1000);
                const h = Math.floor(secs / 3600);
                const m = Math.floor((secs % 3600) / 60);
                const sec = secs % 60;
                return h > 0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
              };

              const AI_FEATURES_DETAIL = [
                { id: "auto_frame", icon: Target, title: "Auto-Frame Speakers", desc: "AI automatically crops and follows active speakers" },
                { id: "lower_thirds", icon: Type, title: "Lower Thirds", desc: "Auto-generate name titles when speakers are detected" },
                { id: "broll", icon: Clapperboard, title: "B-Roll Insertion", desc: "AI inserts relevant b-roll during transitions" },
                { id: "brand_overlay", icon: Palette, title: "Brand Overlay", desc: "Add sponsor logos and event branding as overlays" },
                { id: "captions", icon: Captions, title: "Live Captions", desc: "Real-time AI-generated closed captions" },
                { id: "highlights", icon: Scissors, title: "Auto-Highlights", desc: "AI clips key moments for social media post-event" },
              ];

              // Determine event status for conditional rendering
              const isUpcoming = !liveStream && endedStreams.length === 0;
              const isLive = !!liveStream;
              const isEnded = !liveStream && endedStreams.length > 0;

              return (
                <div className="space-y-6">
                  {/* Stream Preview / Live Player */}
                  <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Video className="h-4 w-4 text-pd-blue" /> Stream Preview
                      </h3>
                      {isUpcoming && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => toast.success("Test stream starting... (preview only)")}>
                            <Play className="h-3.5 w-3.5 mr-1" /> Test Stream
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 rounded-full"
                            onClick={() => navigate(`/brand/streaming?event=${eventId}`)}
                          >
                            <Radio className="h-3.5 w-3.5 mr-1" /> Go Live
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-900 rounded-xl aspect-video flex items-center justify-center relative overflow-hidden">
                      {isLive ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3 animate-pulse">
                              <Radio className="h-8 w-8 text-red-500" />
                            </div>
                            <p className="text-white font-semibold">Live Now</p>
                            <p className="text-gray-400 text-sm mt-1">{liveStream!.title || "Untitled Stream"}</p>
                          </div>
                        </div>
                      ) : isEnded && endedStreams[0].recording_url ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-3">
                              <Play className="h-8 w-8 text-blue-500" />
                            </div>
                            <p className="text-white font-semibold">Recording Available</p>
                            <p className="text-gray-400 text-sm mt-1">{endedStreams[0].title || "Untitled Stream"}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3">
                            <Play className="h-8 w-8 text-gray-600" />
                          </div>
                          <p className="text-gray-500 text-sm">Stream will appear here when live</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <Badge className={
                        isLive
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }>
                        {isLive ? "LIVE" : isEnded ? "Ended" : "Upcoming"}
                      </Badge>
                      {isLive && liveStream && (
                        <>
                          <span className="text-sm text-muted-foreground">
                            Duration: {formatDuration(liveStream.started_at, null)}
                          </span>
                          {liveStream.viewer_count != null && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5" /> {liveStream.viewer_count} viewers
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Live AI Production Panel */}
                    {isLive && (
                      <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="h-4 w-4 text-blue-600" />
                          <h4 className="text-sm font-semibold">AI Production Panel</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          <div className="bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-[#1A1D27] border border-blue-100 dark:border-blue-800 rounded-lg p-3 border-l-4 border-l-blue-600">
                            <p className="text-xs text-muted-foreground">Active Speaker</p>
                            <p className="text-sm font-medium">Detecting...</p>
                          </div>
                          <div className="bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-[#1A1D27] border border-blue-100 dark:border-blue-800 rounded-lg p-3 border-l-4 border-l-blue-600">
                            <p className="text-xs text-muted-foreground">Auto-Frame</p>
                            <p className="text-sm font-medium text-green-600">ON</p>
                          </div>
                          <div className="bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-[#1A1D27] border border-blue-100 dark:border-blue-800 rounded-lg p-3 border-l-4 border-l-blue-600">
                            <p className="text-xs text-muted-foreground">Captions</p>
                            <p className="text-sm font-medium text-green-600">Active</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" variant="outline" onClick={() => toast.success("B-Roll inserted")}>
                            <Clapperboard className="h-3.5 w-3.5 mr-1" /> Insert B-Roll
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toast.success("Caption added")}>
                            <Captions className="h-3.5 w-3.5 mr-1" /> Add Caption
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Stream controls bar (sticky) during live */}
                    {isLive && (
                      <div className="mt-4 bg-gray-900/95 backdrop-blur rounded-xl px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white text-sm">
                          <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" /> {liveStream!.viewer_count ?? 0} viewers</span>
                          <Badge className="bg-green-600 text-white text-xs">Healthy</Badge>
                        </div>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 rounded-full"
                          onClick={() => toast.success("End stream confirmation would appear")}
                        >
                          End Stream
                        </Button>
                      </div>
                    )}
                  </Card>

                  {/* AI Production Features */}
                  <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <h3 className="font-semibold">AI Production Features</h3>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400 text-xs ml-auto">
                        The Differentiator
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      StreamYard charges $50/mo and you still need to edit your recordings. MilCrunch streams to every platform AND our AI handles production in real-time.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {AI_FEATURES_DETAIL.map((f) => {
                        const FIcon = f.icon;
                        return (
                          <div
                            key={f.id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-[#1A1D27] border border-blue-100 dark:border-blue-800 border-l-4 border-l-blue-600"
                          >
                            <FIcon className="h-5 w-5 text-blue-700 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{f.title}</p>
                              <p className="text-xs text-muted-foreground">{f.desc}</p>
                            </div>
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Pre-Stream Checklist (before event) */}
                  {isUpcoming && (
                    <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-pd-blue" /> Pre-Stream Checklist
                      </h3>
                      <div className="space-y-3">
                        {[
                          { label: "Social accounts connected", done: false },
                          { label: "Stream destinations selected", done: false },
                          { label: "Camera/mic tested", done: false },
                          { label: "Lower thirds configured", done: false },
                          { label: "Brand overlays uploaded", done: false },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-3 text-sm">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${item.done ? "bg-green-500 border-green-500" : "border-gray-300 dark:border-gray-600"}`}>
                              {item.done && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Post-Event: Recordings & Clips */}
                  {isEnded && (
                    <>
                      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <Video className="h-4 w-4 text-pd-blue" /> Recordings & Clips
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                            <Video className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-sm font-medium">Full Recording</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {endedStreams[0]?.recording_url ? "Available" : "Processing..."}
                            </p>
                            <Button size="sm" variant="outline" className="mt-3 w-full" disabled={!endedStreams[0]?.recording_url}>
                              <Download className="h-3.5 w-3.5 mr-1" /> Download
                            </Button>
                          </Card>
                          <Card className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                            <Scissors className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-sm font-medium">Highlight Reel</p>
                            <p className="text-xs text-muted-foreground mt-1">AI-generated 2-5 min highlight</p>
                            <Button size="sm" variant="outline" className="mt-3 w-full" disabled>
                              <Download className="h-3.5 w-3.5 mr-1" /> Processing...
                            </Button>
                          </Card>
                          <Card className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                            <Film className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-sm font-medium">Social Clips</p>
                            <p className="text-xs text-muted-foreground mt-1">Vertical clips for TikTok/Reels</p>
                            <Button size="sm" variant="outline" className="mt-3 w-full" disabled>
                              <Download className="h-3.5 w-3.5 mr-1" /> Processing...
                            </Button>
                          </Card>
                        </div>
                      </Card>

                      {/* Analytics */}
                      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-pd-blue" /> Stream Analytics
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-700">{endedStreams.reduce((sum, s) => sum + (s.viewer_count || 0), 0)}</p>
                            <p className="text-xs text-muted-foreground">Total Viewers</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-pd-blue">{Math.max(...endedStreams.map((s) => s.viewer_count || 0), 0)}</p>
                            <p className="text-xs text-muted-foreground">Peak Concurrent</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-pd-blue">{formatDuration(endedStreams[0]?.started_at || null, endedStreams[0]?.ended_at || null)}</p>
                            <p className="text-xs text-muted-foreground">Duration</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-pd-blue">{endedStreams.length}</p>
                            <p className="text-xs text-muted-foreground">Total Streams</p>
                          </div>
                        </div>
                      </Card>
                    </>
                  )}

                  {/* RTMP Settings */}
                  <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Radio className="h-4 w-4 text-pd-blue" /> RTMP Settings
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">RTMP Ingest URL</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg flex-1 truncate block font-mono">
                            {rtmpUrl}
                          </code>
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard(rtmpUrl, "RTMP URL")}>
                            <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Stream Key</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg flex-1 truncate block font-mono">
                            {streamKey}
                          </code>
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard(streamKey, "Stream Key")}>
                            <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                          </Button>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">How to connect your A/V:</p>
                        <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
                          <li>Open your streaming software (OBS, vMix, Wirecast, or hardware encoder)</li>
                          <li>Go to Stream Settings</li>
                          <li>Server: <code className="bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">{rtmpUrl}</code></li>
                          <li>Stream Key: <span className="text-gray-500">[shown above]</span></li>
                          <li>Click Start Streaming in your encoder</li>
                        </ol>
                      </div>
                    </div>
                  </Card>

                  {/* Linked Streams */}
                  <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <LayoutList className="h-4 w-4 text-pd-blue" /> Stream History
                      </h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/brand/streaming?event=${eventId}`)}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Live Stream
                      </Button>
                    </div>

                    {eventStreams.length === 0 ? (
                      <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center text-muted-foreground">
                        <Video className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No streams linked to this event yet.</p>
                        <p className="text-xs text-muted-foreground mt-1">Use your streaming software with the RTMP settings above to go live.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-[#151821] text-left">
                            <tr>
                              <th className="px-4 py-3 font-medium text-muted-foreground">Title</th>
                              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                              <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                              <th className="px-4 py-3 font-medium text-muted-foreground">Viewers</th>
                              <th className="px-4 py-3 font-medium text-muted-foreground">Duration</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {eventStreams.map((s) => (
                              <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1E2130]">
                                <td className="px-4 py-3 font-medium">{s.title || "Untitled Stream"}</td>
                                <td className="px-4 py-3">
                                  <Badge className={
                                    s.status === "live"
                                      ? "bg-red-100 text-red-700"
                                      : s.status === "ended"
                                      ? "bg-gray-100 text-gray-600"
                                      : "bg-yellow-100 text-yellow-700"
                                  }>
                                    {s.status || "idle"}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                  {s.created_at ? format(new Date(s.created_at), "MMM d, yyyy") : "\u2014"}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{s.viewer_count ?? "\u2014"}</td>
                                <td className="px-4 py-3 text-muted-foreground">{formatDuration(s.started_at, s.ended_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </div>
              );
            })()}
          </TabsContent>

          {/* ===== ATTENDEE APP ===== */}
          <TabsContent value="attendee-app">
            {event && (
              <AttendeeAppTab
                eventId={event.id}
                eventSlug={event.slug}
                eventTitle={event.title}
              />
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
                    <Link to="/brand/directories">
                      <Users className="h-4 w-4 mr-1" /> View Directory
                    </Link>
                  </Button>
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                <h3 className="font-semibold text-red-600 mb-1">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-3">Permanently delete this event and all its data.</p>
                <Button variant="destructive" size="sm" onClick={deleteEvent} disabled={saving}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete Event
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ---- Edit Registration Modal ---- */}
      <Dialog open={!!editingReg} onOpenChange={(open) => !open && setEditingReg(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Registration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name</Label>
                <Input value={editRegFirst} onChange={(e) => setEditRegFirst(e.target.value)} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={editRegLast} onChange={(e) => setEditRegLast(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editRegEmail} onChange={(e) => setEditRegEmail(e.target.value)} />
            </div>
            <div>
              <Label>Ticket Type</Label>
              <Select value={editRegTicket} onValueChange={setEditRegTicket}>
                <SelectTrigger><SelectValue placeholder="Select ticket" /></SelectTrigger>
                <SelectContent>
                  {eventTickets.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Input value={editRegBranch} onChange={(e) => setEditRegBranch(e.target.value)} placeholder="e.g. Army, Navy, Air Force" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editRegStatus} onValueChange={setEditRegStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReg(null)}>Cancel</Button>
            <Button onClick={saveEditReg} disabled={savingReg}>
              {savingReg ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving...</> : <><Save className="h-4 w-4 mr-1" /> Save</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Registration Confirm ---- */}
      <AlertDialog open={!!deletingReg} onOpenChange={(open) => !open && setDeletingReg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Attendee</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {deletingReg ? `${deletingReg.first_name} ${deletingReg.last_name}` : ""} from this event? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteReg} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---- Bulk Delete Registrations Confirm ---- */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={(open) => !open && setBulkDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedRegIds.size} Registration{selectedRegIds.size !== 1 ? "s" : ""}</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {selectedRegIds.size} registration{selectedRegIds.size !== 1 ? "s" : ""} from this event? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDeleteRegs} disabled={bulkDeleting} className="bg-red-600 hover:bg-red-700 text-white">
              {bulkDeleting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Deleting...</> : `Delete ${selectedRegIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BrandEventDetail;
