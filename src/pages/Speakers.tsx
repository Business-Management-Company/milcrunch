import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCreatorAvatar, getAvatarFallback } from "@/lib/avatar";
import { supabase } from "@/integrations/supabase/client";
import { MarkdownResponse } from "@/components/MarkdownResponse";
import { getPlatformsFromEnrichmentData } from "@/lib/enrichment-platforms";
// Cache-first: all enrichment reads from Supabase, zero IC API credits
// import { enrichCreatorProfile } from "@/lib/influencers-club";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mic,
  Search,
  ShieldCheck,
  Loader2,
  MoreHorizontal,
  Calendar,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Clock,
  XCircle,
  Trash2,
  Pencil,
  Eye,
  Plus,
  FileText,
  Globe,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  ExternalLink,
  ClipboardList,
  Save,
  UserPlus,
  ListPlus,
  Sparkles,
} from "lucide-react";
import { getEmailLists, addFullContact } from "@/lib/email-db";
import type { EmailList } from "@/lib/email-types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TYPE_OPTIONS } from "@/types/verification";
import { SPEAKER_TYPES } from "@/components/brand/AddSpeakerModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Speaker {
  id: string;
  name: string;
  branch: string | null;
  rank: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  verification_id: string | null;
  verification_status: string | null;
  created_at: string | null;
  review_status: string | null;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  website: string | null;
  contact_notes: string | null;
}

interface ContactForm {
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  contact_notes: string;
}

const EMPTY_CONTACT_FORM: ContactForm = {
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  website: "",
  contact_notes: "",
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
] as const;

interface EventInfo {
  id: string;
  title: string;
  start_date: string | null;
}

interface FullVerification {
  id: string;
  person_name: string;
  verification_score: number | null;
  status: string | null;
  claimed_branch: string | null;
  claimed_type: string | null;
  claimed_status: string | null;
  ai_analysis: string | null;
  manual_checks: Record<string, unknown> | null;
  evidence_sources: unknown[] | null;
  notes: string | null;
  verified_by: string | null;
  last_verified_at: string | null;
  source_username: string | null;
  profile_photo_url: string | null;
  city: string | null;
  state: string | null;
  pdl_data: Record<string, unknown> | null;
  linkedin_url: string | null;
  website_url: string | null;
  created_at: string | null;
}

interface EnrichmentData {
  enrichment_data: Record<string, unknown> | null;
  creator_handle: string | null;
  avatar_url: string | null;
  ic_avatar_url: string | null;
}

// Review status options for the speaker review dropdown
const REVIEW_STATUSES = [
  { value: "pending_review", label: "Pending Review", color: "#eab308" },
  { value: "approved", label: "Approved", color: "#22c55e" },
  { value: "flagged", label: "Flagged", color: "#f97316" },
  { value: "declined", label: "Declined", color: "#ef4444" },
];

const REVIEW_COLOR_MAP: Record<string, string> = {
  pending_review: "#eab308",
  approved: "#22c55e",
  flagged: "#f97316",
  declined: "#ef4444",
};

function ReviewDot({ status, size = 8 }: { status: string | null; size?: number }) {
  if (!status) return null;
  const color = REVIEW_COLOR_MAP[status] ?? "#9ca3af";
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, backgroundColor: color }}
      title={REVIEW_STATUSES.find((r) => r.value === status)?.label ?? status}
    />
  );
}

function MiniGauge({ score, size = 80 }: { score: number; size?: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  const r = size * 0.45;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{score}%</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    verified: { label: "Verified", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", icon: <Clock className="h-3.5 w-3.5" /> },
    flagged: { label: "Flagged", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    denied: { label: "Denied", className: "bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-200", icon: <XCircle className="h-3.5 w-3.5" /> },
  };
  const s = map[status] ?? map.pending;
  return (
    <Badge className={cn("gap-1", s.className)} variant="secondary">
      {s.icon} {s.label}
    </Badge>
  );
}

function ReviewStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending_review: { label: "Pending Review", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    approved: { label: "Approved", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
    flagged: { label: "Flagged", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
    declined: { label: "Declined", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  };
  const s = map[status] ?? map.pending_review;
  return <Badge className={s.className} variant="secondary">{s.label}</Badge>;
}

/** Collapsible section used in the verified speaker expanded row */
function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  extra,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors focus:outline-none"
      >
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        {icon}
        <span className="font-semibold text-sm text-[#000741] dark:text-white">{title}</span>
        {extra}
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-800">{children}</div>}
    </div>
  );
}

export default function Speakers() {
  const navigate = useNavigate();
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Expanded row state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedVerification, setExpandedVerification] = useState<FullVerification | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<EventInfo[]>([]);
  const [expandedEnrichment, setExpandedEnrichment] = useState<EnrichmentData | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);
  const [reverifying, setReverifying] = useState(false);

  // Contact info state
  const [contactFetching, setContactFetching] = useState(false);
  const [contactData, setContactData] = useState<{ email?: string; phone?: string; city?: string } | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>(EMPTY_CONTACT_FORM);
  const [contactEditing, setContactEditing] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [icFilledFields, setIcFilledFields] = useState<Set<string>>(new Set());

  // Email list integration
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [addToListOpen, setAddToListOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState("");
  const [addingToContacts, setAddingToContacts] = useState(false);
  const [addingToList, setAddingToList] = useState(false);

  // Review state
  const [reviewStatus, setReviewStatus] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", name: "", branch: "", rank: "", bio: "" });

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Add to Event modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSpeaker, setInviteSpeaker] = useState<Speaker | null>(null);
  const [allEvents, setAllEvents] = useState<EventInfo[]>([]);
  const [existingEventIds, setExistingEventIds] = useState<string[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedRole, setSelectedRole] = useState("presenter");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);

  const fetchSpeakers = async () => {
    const { data, error } = await supabase
      .from("speakers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return;

    const rows = data as Speaker[];
    const allNames = rows.map((s) => s.name);

    // ── 1. Batch-fetch verifications for speakers with verification_id ──
    const withVid = rows.filter((s) => s.verification_id);
    const withoutVid = rows.filter((s) => !s.verification_id);

    interface VerificationMeta {
      status: string;
      score: number | null;
      photo: string | null;
      handle: string | null;
      bio: string | null;
    }
    const verificationMap = new Map<string, VerificationMeta>();

    if (withVid.length > 0) {
      const vids = withVid.map((s) => s.verification_id!);
      const { data: vRows } = await supabase
        .from("verifications")
        .select("id, status, verification_score, profile_photo_url, source_username, notes")
        .in("id", vids);
      if (vRows) {
        for (const v of vRows) {
          verificationMap.set(v.id, {
            status: v.status ?? "pending",
            score: v.verification_score,
            photo: v.profile_photo_url ?? null,
            handle: v.source_username ?? null,
            bio: v.notes ?? null,
          });
        }
      }
    }

    // ── 2. Auto-link speakers WITHOUT verification_id by name match ──
    if (withoutVid.length > 0) {
      const names = withoutVid.map((s) => s.name);
      const { data: nameMatches } = await supabase
        .from("verifications")
        .select("id, person_name, status, verification_score, profile_photo_url, source_username, notes")
        .in("person_name", names);

      if (nameMatches && nameMatches.length > 0) {
        const nameMap = new Map<string, typeof nameMatches[0]>();
        for (const v of nameMatches) {
          const existing = nameMap.get(v.person_name);
          if (!existing || (v.verification_score ?? 0) > (existing.verification_score ?? 0)) {
            nameMap.set(v.person_name, v);
          }
        }

        for (const speaker of withoutVid) {
          const match = nameMap.get(speaker.name);
          if (match) {
            console.log(`[Speakers] Auto-linking "${speaker.name}" to verification ${match.id} (score: ${match.verification_score})`);
            speaker.verification_id = match.id;
            speaker.verification_status = match.status ?? "pending";
            verificationMap.set(match.id, {
              status: match.status ?? "pending",
              score: match.verification_score,
              photo: match.profile_photo_url ?? null,
              handle: match.source_username ?? null,
              bio: match.notes ?? null,
            });

            supabase
              .from("speakers")
              .update({ verification_id: match.id, verification_status: match.status } as Record<string, unknown>)
              .eq("id", speaker.id)
              .then(({ error: updateErr }) => {
                if (updateErr) console.warn(`[Speakers] Failed to persist link for ${speaker.name}:`, updateErr.message);
              });
          }
        }
      }
    }

    // ── 3. Batch-fetch directory_members by handle AND by name ──
    // This catches speakers whose directory entry uses creator_name rather than a handle
    const handles = [...verificationMap.values()].map((v) => v.handle).filter(Boolean) as string[];
    // keyed by handle or name → { avatar, bio }
    const dmMap = new Map<string, { avatar: string | null; bio: string | null }>();

    // Fetch by handle
    if (handles.length > 0) {
      const { data: dmRows } = await supabase
        .from("directory_members")
        .select("creator_handle, creator_name, profile_image_url, avatar_url, ic_avatar_url, enrichment_data")
        .in("creator_handle", handles);
      if (dmRows) {
        for (const dm of dmRows) {
          // Priority: profile_image_url → avatar_url → ic_avatar_url
          const url = dm.profile_image_url || dm.avatar_url || dm.ic_avatar_url;
          const clean = url && typeof url === "string" && url.startsWith("http://") ? url.replace("http://", "https://") : url;
          const avatar = clean && typeof clean === "string" && clean.startsWith("https://") ? clean : null;
          // Extract bio from enrichment_data if available
          const ed = dm.enrichment_data as Record<string, unknown> | null;
          const igData = (ed?.result as Record<string, unknown>)?.instagram as Record<string, unknown> | undefined ?? ed?.instagram as Record<string, unknown> | undefined;
          const bio = (igData?.biography ?? igData?.bio) as string | undefined;
          dmMap.set(dm.creator_handle, { avatar, bio: bio || null });
          if (dm.creator_name) dmMap.set(dm.creator_name, { avatar, bio: bio || null });
        }
      }
    }

    // Also fetch by name for speakers not found by handle
    const unmatchedNames = allNames.filter((n) => !dmMap.has(n));
    if (unmatchedNames.length > 0) {
      const { data: dmByName } = await supabase
        .from("directory_members")
        .select("creator_handle, creator_name, profile_image_url, avatar_url, ic_avatar_url, enrichment_data")
        .in("creator_name", unmatchedNames);
      if (dmByName) {
        for (const dm of dmByName) {
          // Priority: profile_image_url → avatar_url → ic_avatar_url
          const url = dm.profile_image_url || dm.avatar_url || dm.ic_avatar_url;
          const clean = url && typeof url === "string" && url.startsWith("http://") ? url.replace("http://", "https://") : url;
          const avatar = clean && typeof clean === "string" && clean.startsWith("https://") ? clean : null;
          const ed = dm.enrichment_data as Record<string, unknown> | null;
          const igData = (ed?.result as Record<string, unknown>)?.instagram as Record<string, unknown> | undefined ?? ed?.instagram as Record<string, unknown> | undefined;
          const bio = (igData?.biography ?? igData?.bio) as string | undefined;
          if (dm.creator_name) dmMap.set(dm.creator_name, { avatar, bio: bio || null });
          if (dm.creator_handle) dmMap.set(dm.creator_handle, { avatar, bio: bio || null });
        }
      }
    }

    // ── 4. Merge everything into speaker rows ──
    const enriched = rows.map((s) => {
      const updated = { ...s };

      // Merge verification status
      if (updated.verification_id && verificationMap.has(updated.verification_id)) {
        const v = verificationMap.get(updated.verification_id)!;
        updated.verification_status = v.status;

        // Best photo: directory_members (by handle) > directory_members (by name) > verification photo > existing
        if (!getCreatorAvatar(updated)) {
          const dmByHandle = v.handle ? dmMap.get(v.handle) : null;
          const dmByName = dmMap.get(updated.name);
          const bestPhoto = dmByHandle?.avatar || dmByName?.avatar || v.photo;
          if (bestPhoto) updated.photo_url = bestPhoto;
        }

        // Backfill bio from verification notes or directory_members
        if (!updated.bio || updated.bio.trim() === "") {
          const vBio = v.bio && !/failed|error|skipped/i.test(v.bio) ? v.bio : null;
          const dmByHandle = v.handle ? dmMap.get(v.handle) : null;
          const dmByName = dmMap.get(updated.name);
          updated.bio = vBio || dmByHandle?.bio || dmByName?.bio || null;
        }
      } else {
        // No verification — still try directory_members by name
        const dm = dmMap.get(updated.name);
        if (dm) {
          if (!getCreatorAvatar(updated) && dm.avatar) updated.photo_url = dm.avatar;
          if ((!updated.bio || updated.bio.trim() === "") && dm.bio) updated.bio = dm.bio;
        }
      }

      return updated;
    });

    // ── 5. For speakers STILL missing a photo, try IC enrichment in background ──
    const missingPhoto = enriched.filter((s) => !getCreatorAvatar(s));
    if (missingPhoto.length > 0) {
      // Find handles we can try from verifications
      const enrichTargets: { speakerId: string; handle: string }[] = [];
      for (const s of missingPhoto) {
        if (s.verification_id && verificationMap.has(s.verification_id)) {
          const handle = verificationMap.get(s.verification_id)!.handle;
          if (handle) enrichTargets.push({ speakerId: s.id, handle });
        }
      }

      if (enrichTargets.length > 0) {
        console.log(`[Speakers] Looking up ${enrichTargets.length} speakers in enrichment cache (zero IC credits)`);
        // Read from creator_enrichment_cache — no IC API calls
        for (const { speakerId, handle } of enrichTargets) {
          supabase
            .from("creator_enrichment_cache")
            .select("enrichment_data")
            .eq("username", handle.toLowerCase())
            .limit(1)
            .maybeSingle()
            .then(({ data: cached }) => {
              if (!cached?.enrichment_data) return;
              const ed = cached.enrichment_data as Record<string, unknown>;
              const ig = (ed.instagram ?? ed.result) as Record<string, unknown> | undefined;
              if (!ig) return;
              const avatar = (ig.picture ?? ig.profile_picture_hd ?? ig.profile_picture ?? ig.profile_pic_url) as string | undefined;
              const bio = (ig.biography ?? ig.bio) as string | undefined;
              if (!avatar) return;

              const photoUrl = avatar.replace(/^http:\/\//i, "https://");
              console.log(`[Speakers] Cache found photo for "${handle}": ${photoUrl.substring(0, 80)}`);

              setSpeakers((prev) =>
                prev.map((s) => {
                  if (s.id !== speakerId) return s;
                  const patched = { ...s };
                  if (!getCreatorAvatar(patched)) patched.photo_url = photoUrl;
                  if ((!patched.bio || patched.bio.trim() === "") && bio) patched.bio = bio;
                  return patched;
                })
              );

              supabase
                .from("speakers")
                .update({ photo_url: photoUrl, ...(bio ? { bio } : {}) } as Record<string, unknown>)
                .eq("id", speakerId)
                .then(({ error: e }) => {
                  if (e) console.warn(`[Speakers] Failed to persist cached photo for ${handle}:`, e.message);
                  else console.log(`[Speakers] Persisted cached photo for ${handle}`);
                });
            });
        }
      }
    }

    setSpeakers(enriched);
  };

  useEffect(() => {
    (async () => {
      await fetchSpeakers();
      setLoading(false);
    })();
  }, []);

  const filtered = speakers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.branch ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.rank ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleExpand = async (speakerId: string) => {
    if (expandedId === speakerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(speakerId);
    setExpandLoading(true);
    setExpandedVerification(null);
    setExpandedEvents([]);
    setExpandedEnrichment(null);
    setContactData(null);
    setContactEditing(false);
    setIcFilledFields(new Set());

    const speaker = speakers.find((s) => s.id === speakerId);
    if (!speaker) {
      setExpandLoading(false);
      return;
    }

    // Initialize contact form from speaker's saved data
    setContactForm({
      email: speaker.email ?? "",
      phone: speaker.phone ?? "",
      address: speaker.address ?? "",
      city: speaker.city ?? "",
      state: speaker.state ?? "",
      zip: speaker.zip ?? "",
      website: speaker.website ?? "",
      contact_notes: speaker.contact_notes ?? "",
    });

    // Initialize review state from speaker data
    setReviewStatus(speaker.review_status ?? "");
    setReviewNotes(speaker.review_notes ?? "");

    // Fetch full verification data — by ID first, then fallback to name match
    const VERIFICATION_COLS = "id, person_name, verification_score, status, claimed_branch, claimed_type, claimed_status, ai_analysis, manual_checks, evidence_sources, notes, verified_by, last_verified_at, source_username, profile_photo_url, city, state, pdl_data, linkedin_url, website_url, created_at";
    let verificationData: FullVerification | null = null;

    if (speaker.verification_id) {
      const { data } = await supabase
        .from("verifications")
        .select(VERIFICATION_COLS)
        .eq("id", speaker.verification_id)
        .single();
      if (data) verificationData = data as FullVerification;
    }

    // Fallback: lookup by name if no verification_id or lookup failed
    if (!verificationData) {
      const { data: nameMatch } = await supabase
        .from("verifications")
        .select(VERIFICATION_COLS)
        .eq("person_name", speaker.name)
        .order("verification_score", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (nameMatch) {
        verificationData = nameMatch as FullVerification;
        console.log(`[Speakers] Found verification by name match for "${speaker.name}" → ${nameMatch.id} (${nameMatch.verification_score}%)`);
        // Auto-link for next time
        speaker.verification_id = nameMatch.id;
        speaker.verification_status = (nameMatch as FullVerification).status;
        setSpeakers((prev) =>
          prev.map((s) => s.id === speaker.id ? { ...s, verification_id: nameMatch.id, verification_status: (nameMatch as FullVerification).status } : s)
        );
        supabase
          .from("speakers")
          .update({ verification_id: nameMatch.id, verification_status: (nameMatch as FullVerification).status } as Record<string, unknown>)
          .eq("id", speaker.id)
          .then(({ error: e }) => { if (e) console.warn("[Speakers] Failed to persist verification link:", e.message); });
      }
    }

    if (verificationData) {
      setExpandedVerification(verificationData);

      // Try to fetch IC enrichment from directory_members by source_username
      const handle = verificationData.source_username;
      if (handle) {
        const { data: dm } = await supabase
          .from("directory_members")
          .select("enrichment_data, creator_handle, avatar_url, ic_avatar_url")
          .eq("creator_handle", handle)
          .maybeSingle();
        if (dm) setExpandedEnrichment(dm as EnrichmentData);
      }
    }

    // Fetch events this speaker is assigned to via event_speakers
    const { data: speakerLinks } = await supabase
      .from("event_speakers")
      .select("event_id")
      .eq("creator_name", speaker.name);

    if (speakerLinks?.length) {
      const eventIds = speakerLinks.map((i: { event_id: string }) => i.event_id);
      const { data: events } = await supabase
        .from("events")
        .select("id, title, start_date")
        .in("id", eventIds);
      setExpandedEvents((events ?? []) as EventInfo[]);
    }

    setExpandLoading(false);
  };

  const handleReverify = (speaker: Speaker) => {
    setReverifying(true);
    navigate("/verification", {
      state: {
        prefill: {
          fullName: speaker.name,
          claimedBranch: speaker.branch ?? "",
          claimedType: speaker.rank ?? "",
          claimedStatus: "veteran",
          linkedinUrl: speaker.linkedin_url ?? "",
          websiteUrl: speaker.website_url ?? "",
          notes: speaker.bio ?? "",
        },
      },
    });
  };

  const handleFetchContact = async (speakerId: string, handle?: string) => {
    const targetHandle = handle || expandedVerification?.source_username;
    if (!targetHandle) {
      toast.error("No social handle available to look up contact info");
      return;
    }
    setContactFetching(true);
    try {
      // Cache-first: check directory_members → creator_enrichment_cache (zero credits)
      let result: Record<string, unknown> | null = null;

      // Try directory_members.enrichment_data first
      const { data: dm } = await supabase
        .from("directory_members")
        .select("enrichment_data")
        .eq("creator_handle", targetHandle.replace(/^@/, "").toLowerCase())
        .limit(1)
        .maybeSingle();
      if (dm?.enrichment_data) {
        result = dm.enrichment_data as Record<string, unknown>;
      }

      // Fall back to creator_enrichment_cache
      if (!result) {
        const { data: cached } = await supabase
          .from("creator_enrichment_cache")
          .select("enrichment_data")
          .eq("username", targetHandle.replace(/^@/, "").toLowerCase())
          .limit(1)
          .maybeSingle();
        if (cached?.enrichment_data) {
          result = cached.enrichment_data as Record<string, unknown>;
        }
      }

      if (result) {
        const r = result.result as Record<string, unknown> | undefined;
        const ig = result.instagram as Record<string, unknown> | undefined;
        const email = (r?.email ?? (r?.emails as string[])?.[0] ?? ig?.email) as string | undefined;
        const phone = (r?.phone ?? r?.phone_number ?? ig?.phone) as string | undefined;
        const city = (r?.city ?? ig?.city) as string | undefined;
        const state = (r?.state ?? ig?.state) as string | undefined;

        const filled = new Set<string>();
        const updates: Partial<ContactForm> = {};
        if (email && !contactForm.email) { updates.email = email; filled.add("email"); }
        if (phone && !contactForm.phone) { updates.phone = phone; filled.add("phone"); }
        if (city && !contactForm.city) { updates.city = city; filled.add("city"); }
        if (state && !contactForm.state) {
          const st = state.toUpperCase().trim();
          if (US_STATES.includes(st as typeof US_STATES[number])) {
            updates.state = st;
            filled.add("state");
          }
        }

        setContactForm((prev) => ({ ...prev, ...updates }));
        setIcFilledFields(filled);

        // Save to speakers table
        const dbUpdates: Record<string, unknown> = {};
        if (updates.email) dbUpdates.email = updates.email;
        if (updates.phone) dbUpdates.phone = updates.phone;
        if (updates.city) dbUpdates.city = updates.city;
        if (updates.state) dbUpdates.state = updates.state;
        if (Object.keys(dbUpdates).length > 0) {
          await supabase.from("speakers").update(dbUpdates).eq("id", speakerId);
          setSpeakers((prev) => prev.map((s) => s.id === speakerId ? { ...s, ...dbUpdates } as Speaker : s));
        }

        setContactData({ email: email || undefined, phone: phone || undefined, city: city || undefined });

        if (!email && !phone) {
          toast.info("No contact info found in cached data (0 credits used)");
        } else {
          toast.success("Contact info fetched from cache (0 credits)");
        }
      } else {
        toast.error("No cached data found for this handle — enrich from Discovery first");
      }
    } catch (err) {
      toast.error("Failed to fetch contact info: " + (err as Error).message);
    } finally {
      setContactFetching(false);
    }
  };

  const handleSaveContact = async (speakerId: string) => {
    setContactSaving(true);
    const { error } = await supabase
      .from("speakers")
      .update({
        email: contactForm.email.trim() || null,
        phone: contactForm.phone.trim() || null,
        address: contactForm.address.trim() || null,
        city: contactForm.city.trim() || null,
        state: contactForm.state || null,
        zip: contactForm.zip.trim() || null,
        website: contactForm.website.trim() || null,
        contact_notes: contactForm.contact_notes.trim() || null,
      } as Record<string, unknown>)
      .eq("id", speakerId);
    if (error) {
      toast.error("Failed to save contact info: " + error.message);
    } else {
      toast.success("Contact information saved");
      setSpeakers((prev) =>
        prev.map((s) =>
          s.id === speakerId
            ? {
                ...s,
                email: contactForm.email.trim() || null,
                phone: contactForm.phone.trim() || null,
                address: contactForm.address.trim() || null,
                city: contactForm.city.trim() || null,
                state: contactForm.state || null,
                zip: contactForm.zip.trim() || null,
                website: contactForm.website.trim() || null,
                contact_notes: contactForm.contact_notes.trim() || null,
              }
            : s
        )
      );
      setContactEditing(false);
    }
    setContactSaving(false);
  };

  const handleAddToContacts = async (speaker: Speaker) => {
    if (!contactForm.email.trim()) {
      toast.error("Email is required to add to contacts");
      return;
    }
    setAddingToContacts(true);
    // Get or use a default list
    let lists = emailLists;
    if (lists.length === 0) {
      lists = await getEmailLists();
      setEmailLists(lists);
    }
    const defaultList = lists[0];
    if (!defaultList) {
      toast.error("No email lists found. Create one first in the Email section.");
      setAddingToContacts(false);
      return;
    }
    const nameParts = speaker.name.split(" ");
    const result = await addFullContact({
      list_id: defaultList.id,
      email: contactForm.email.trim(),
      first_name: nameParts[0] || undefined,
      last_name: nameParts.slice(1).join(" ") || undefined,
      phone: contactForm.phone.trim() || undefined,
      source: "creator",
      metadata: { speaker_id: speaker.id, branch: speaker.branch },
    });
    if (result) {
      toast.success(`Added ${speaker.name} to contacts (${defaultList.name})`);
    } else {
      toast.error("Failed to add to contacts (may already exist)");
    }
    setAddingToContacts(false);
  };

  const handleAddToEmailList = async (speaker: Speaker) => {
    if (!contactForm.email.trim()) {
      toast.error("Email is required to add to a list");
      return;
    }
    if (!selectedListId) {
      toast.error("Select an email list");
      return;
    }
    setAddingToList(true);
    const nameParts = speaker.name.split(" ");
    const result = await addFullContact({
      list_id: selectedListId,
      email: contactForm.email.trim(),
      first_name: nameParts[0] || undefined,
      last_name: nameParts.slice(1).join(" ") || undefined,
      phone: contactForm.phone.trim() || undefined,
      source: "creator",
      metadata: { speaker_id: speaker.id, branch: speaker.branch },
    });
    if (result) {
      const listName = emailLists.find((l) => l.id === selectedListId)?.name ?? "list";
      toast.success(`Added ${speaker.name} to ${listName}`);
      setAddToListOpen(false);
    } else {
      toast.error("Failed to add to list (may already exist)");
    }
    setAddingToList(false);
  };

  const openAddToList = async () => {
    let lists = emailLists;
    if (lists.length === 0) {
      lists = await getEmailLists();
      setEmailLists(lists);
    }
    setSelectedListId("");
    setAddToListOpen(true);
  };

  const handleSaveReview = async (speakerId: string) => {
    setReviewSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("speakers")
      .update({
        review_status: reviewStatus || null,
        review_notes: reviewNotes.trim() || null,
        reviewed_by: "admin",
        reviewed_at: now,
      } as Record<string, unknown>)
      .eq("id", speakerId);
    if (error) {
      toast.error("Failed to save review: " + error.message);
    } else {
      toast.success("Review saved");
      // Update local state
      setSpeakers((prev) =>
        prev.map((s) =>
          s.id === speakerId
            ? { ...s, review_status: reviewStatus || null, review_notes: reviewNotes.trim() || null, reviewed_by: "admin", reviewed_at: now }
            : s
        )
      );
    }
    setReviewSaving(false);
  };

  const handleEdit = (speaker: Speaker) => {
    setEditForm({
      id: speaker.id,
      name: speaker.name,
      branch: speaker.branch ?? "",
      rank: speaker.rank ?? "",
      bio: speaker.bio ?? "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    const { error } = await supabase
      .from("speakers")
      .update({
        name: editForm.name,
        branch: editForm.branch || null,
        rank: editForm.rank || null,
        bio: editForm.bio || null,
      })
      .eq("id", editForm.id);
    if (error) {
      toast.error("Failed to update: " + error.message);
    } else {
      toast.success("Speaker updated");
      setEditOpen(false);
      await fetchSpeakers();
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    const { error } = await supabase.from("speakers").delete().eq("id", deleteConfirmId);
    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      setSpeakers((prev) => prev.filter((s) => s.id !== deleteConfirmId));
      if (expandedId === deleteConfirmId) setExpandedId(null);
      toast.success("Speaker removed");
    }
    setDeleteConfirmId(null);
  };

  const handleOpenInvite = async (speaker: Speaker) => {
    setInviteSpeaker(speaker);
    setSelectedEventId("");
    setSelectedRole("presenter");
    setSelectedTopic("");

    const { data: events } = await supabase
      .from("events")
      .select("id, title, start_date")
      .order("start_date", { ascending: false })
      .limit(100);
    setAllEvents((events ?? []) as EventInfo[]);

    const { data: existing } = await supabase
      .from("event_speakers")
      .select("event_id")
      .eq("creator_name", speaker.name);
    setExistingEventIds((existing ?? []).map((e: { event_id: string }) => e.event_id));

    setInviteOpen(true);
  };

  const handleSaveInvite = async () => {
    if (!inviteSpeaker || !selectedEventId) return;
    setInviteSaving(true);

    // Check for duplicate before inserting
    const { data: existingSpeakers } = await supabase
      .from("event_speakers")
      .select("id, creator_name")
      .eq("event_id", selectedEventId);
    const alreadyExists = (existingSpeakers ?? []).some(
      (s: { creator_name: string }) => (s.creator_name ?? "").toLowerCase() === inviteSpeaker.name.toLowerCase()
    );
    if (alreadyExists) {
      toast.warning(`${inviteSpeaker.name} is already added as a speaker for this event`);
      setExistingEventIds(prev => [...prev, selectedEventId]);
      setInviteSaving(false);
      return;
    }
    const sortOrder = existingSpeakers?.length ?? 0;

    const { error } = await supabase.from("event_speakers").insert({
      event_id: selectedEventId,
      creator_name: inviteSpeaker.name,
      avatar_url: inviteSpeaker.photo_url,
      bio: inviteSpeaker.bio,
      role: selectedRole,
      topic: selectedTopic.trim() || null,
      sort_order: sortOrder,
      confirmed: false,
    });

    if (error) {
      if (error.code === "23505") {
        toast.warning(`${inviteSpeaker.name} is already added as a speaker for this event`);
        setExistingEventIds(prev => [...prev, selectedEventId]);
      } else {
        toast.error("Failed to add to event: " + error.message);
      }
    } else {
      const eventTitle = allEvents.find((e) => e.id === selectedEventId)?.title ?? "event";
      toast.success(`Added ${inviteSpeaker.name} to ${eventTitle}`);
      setInviteOpen(false);
      if (expandedId === inviteSpeaker.id) {
        const { data: links } = await supabase
          .from("event_speakers")
          .select("event_id")
          .eq("creator_name", inviteSpeaker.name);
        if (links?.length) {
          const ids = links.map((i: { event_id: string }) => i.event_id);
          const { data: evts } = await supabase.from("events").select("id, title, start_date").in("id", ids);
          setExpandedEvents((evts ?? []) as EventInfo[]);
        }
      }
    }
    setInviteSaving(false);
  };

  const handleViewVerification = (speaker: Speaker) => {
    if (speaker.verification_id) {
      navigate("/verification", { state: { expandId: speaker.verification_id } });
    }
  };

  const handleStartVerification = (speaker: Speaker) => {
    navigate("/verification", {
      state: {
        prefill: {
          fullName: speaker.name,
          claimedBranch: speaker.branch ?? "",
          claimedType: speaker.rank ?? "",
          claimedStatus: "veteran",
          linkedinUrl: speaker.linkedin_url ?? "",
          websiteUrl: speaker.website_url ?? "",
          notes: speaker.bio ?? "",
        },
      },
    });
  };

  // Extract social platforms from enrichment data
  const getSocialPlatforms = () => {
    if (!expandedEnrichment?.enrichment_data) return [];
    return getPlatformsFromEnrichmentData(expandedEnrichment.enrichment_data);
  };

  // Get the best photo for a speaker (directory_members avatar > verification photo > speaker photo)
  const getSpeakerPhoto = (speaker: Speaker) => {
    if (expandedEnrichment?.ic_avatar_url) return expandedEnrichment.ic_avatar_url;
    if (expandedEnrichment?.avatar_url) return expandedEnrichment.avatar_url;
    if (expandedVerification?.profile_photo_url) return expandedVerification.profile_photo_url;
    return getCreatorAvatar(speaker);
  };

  /** Render the expanded row for a VERIFIED speaker */
  const renderVerifiedExpanded = (speaker: Speaker, v: FullVerification) => {
    const platforms = getSocialPlatforms();
    const photo = getSpeakerPhoto(speaker);

    return (
      <div className="space-y-4">
        {/* Row 1: Header bar */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Photo */}
          {photo ? (
            <>
              <img
                src={photo}
                alt=""
                className="h-16 w-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.removeAttribute('style'); }}
              />
              <div className="h-16 w-16 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-lg font-semibold text-[#1e3a5f]" style={{ display: 'none' }}>
                {getAvatarFallback(speaker.name)}
              </div>
            </>
          ) : (
            <div className="h-16 w-16 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-lg font-semibold text-[#1e3a5f]">
              {getAvatarFallback(speaker.name)}
            </div>
          )}

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-[#000741] dark:text-white">{speaker.name}</h3>
              <StatusBadge status={v.status ?? "pending"} />
              {v.claimed_branch && <Badge variant="secondary" className="text-xs">{v.claimed_branch}</Badge>}
              {v.claimed_type && <Badge variant="secondary" className="text-xs">{v.claimed_type}</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
              {v.last_verified_at && (
                <span>Last verified: {new Date(v.last_verified_at).toLocaleDateString()} {new Date(v.last_verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              )}
              {v.verified_by && <span>by {v.verified_by}</span>}
            </div>
          </div>

          {/* Confidence gauge */}
          <MiniGauge score={v.verification_score ?? 0} size={64} />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReverify(speaker)}
              disabled={reverifying}
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", reverifying && "animate-spin")} /> Re-verify
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewVerification(speaker)}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Full Report
            </Button>
          </div>
        </div>

        {/* Row 2: Collapsible sections */}
        <div className="space-y-2">
          {/* Contact Information */}
          <CollapsibleSection
            title="Contact Information"
            icon={<Mail className="h-4 w-4 text-[#1e3a5f]" />}
            defaultOpen
            extra={
              <button
                onClick={(e) => { e.stopPropagation(); setContactEditing(!contactEditing); }}
                className="ml-auto p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={contactEditing ? "Cancel editing" : "Edit contact info"}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            }
          >
            <div className="mt-3 space-y-3">
              {/* Social platforms from IC enrichment */}
              {platforms.length > 0 && (
                <div>
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">Social Profiles</h4>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((p) => (
                      <a
                        key={p.platform}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors", p.pillClass)}
                      >
                        {p.label}: @{p.username}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* LinkedIn / Website from verification */}
              {(v.linkedin_url || v.website_url || speaker.linkedin_url || speaker.website_url) && (
                <div className="flex flex-wrap gap-2">
                  {(v.linkedin_url || speaker.linkedin_url) && (
                    <a
                      href={v.linkedin_url || speaker.linkedin_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    >
                      LinkedIn <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {(v.website_url || speaker.website_url) && (
                    <a
                      href={v.website_url || speaker.website_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    >
                      Website <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Editable Contact Form */}
              {contactEditing ? (
                <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        Email
                        {icFilledFields.has("email") && <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-purple-100 text-purple-700"><Sparkles className="h-2.5 w-2.5 mr-0.5" />IC</Badge>}
                      </Label>
                      <Input
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="email@example.com"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        Phone
                        {icFilledFields.has("phone") && <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-purple-100 text-purple-700"><Sparkles className="h-2.5 w-2.5 mr-0.5" />IC</Badge>}
                      </Label>
                      <Input
                        value={contactForm.phone}
                        onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="(555) 123-4567"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Address</Label>
                    <Input
                      value={contactForm.address}
                      onChange={(e) => setContactForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="123 Main St"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        City
                        {icFilledFields.has("city") && <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-purple-100 text-purple-700"><Sparkles className="h-2.5 w-2.5 mr-0.5" />IC</Badge>}
                      </Label>
                      <Input
                        value={contactForm.city}
                        onChange={(e) => setContactForm((f) => ({ ...f, city: e.target.value }))}
                        placeholder="City"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        State
                        {icFilledFields.has("state") && <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-purple-100 text-purple-700"><Sparkles className="h-2.5 w-2.5 mr-0.5" />IC</Badge>}
                      </Label>
                      <Select value={contactForm.state} onValueChange={(v) => setContactForm((f) => ({ ...f, state: v }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="State" /></SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Zip</Label>
                      <Input
                        value={contactForm.zip}
                        onChange={(e) => setContactForm((f) => ({ ...f, zip: e.target.value }))}
                        placeholder="12345"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Website</Label>
                    <Input
                      value={contactForm.website}
                      onChange={(e) => setContactForm((f) => ({ ...f, website: e.target.value }))}
                      placeholder="https://example.com"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <Textarea
                      value={contactForm.contact_notes}
                      onChange={(e) => setContactForm((f) => ({ ...f, contact_notes: e.target.value }))}
                      rows={2}
                      placeholder="Contact notes..."
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveContact(speaker.id)}
                      disabled={contactSaving}
                      className="bg-[#1e3a5f] hover:bg-[#2d5282]"
                    >
                      {contactSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                      Save Contact Info
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setContactEditing(false)}
                    >
                      Cancel
                    </Button>
                    {v.source_username && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFetchContact(speaker.id)}
                        disabled={contactFetching}
                        className="ml-auto"
                      >
                        {contactFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                        Fetch from IC (0.03 credits)
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Read-only contact display */}
                  {contactForm.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${contactForm.email}`} className="text-blue-600 hover:underline">{contactForm.email}</a>
                      {icFilledFields.has("email") && <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-purple-100 text-purple-700"><Sparkles className="h-2.5 w-2.5 mr-0.5" />IC</Badge>}
                    </div>
                  )}
                  {contactForm.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{contactForm.phone}</span>
                      {icFilledFields.has("phone") && <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-purple-100 text-purple-700"><Sparkles className="h-2.5 w-2.5 mr-0.5" />IC</Badge>}
                    </div>
                  )}
                  {(contactForm.address || contactForm.city || contactForm.state || contactForm.zip) && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>
                        {[contactForm.address, contactForm.city, contactForm.state, contactForm.zip].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  {!contactForm.city && !contactForm.state && (v.city || v.state) && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{[v.city, v.state].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                  {contactForm.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={contactForm.website.startsWith("http") ? contactForm.website : `https://${contactForm.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{contactForm.website}</a>
                    </div>
                  )}
                  {contactForm.contact_notes && (
                    <p className="text-sm text-muted-foreground italic">{contactForm.contact_notes}</p>
                  )}

                  {/* No info message + fetch button */}
                  {!contactForm.email && !contactForm.phone && !contactForm.city && !contactForm.address && !v.city && platforms.length === 0 && !v.linkedin_url && !v.website_url && !speaker.linkedin_url && !speaker.website_url && (
                    <p className="text-sm text-muted-foreground">No contact information available.</p>
                  )}

                  {/* Fetch Contact Info button (when no contact data and handle available) */}
                  {!contactForm.email && !contactForm.phone && v.source_username && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFetchContact(speaker.id)}
                      disabled={contactFetching}
                    >
                      {contactFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                      Fetch Contact Info (0.03 credits)
                    </Button>
                  )}
                </div>
              )}

              {/* Add to Contacts / Add to Email List buttons */}
              {contactForm.email && (
                <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToContacts(speaker)}
                    disabled={addingToContacts}
                  >
                    {addingToContacts ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <UserPlus className="h-3.5 w-3.5 mr-1.5" />}
                    Add to Contacts
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openAddToList}
                    disabled={addingToList}
                  >
                    <ListPlus className="h-3.5 w-3.5 mr-1.5" />
                    Add to Email List
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Speaker Review (separate from verification) */}
          <CollapsibleSection
            title="Speaker Review"
            icon={<ClipboardList className="h-4 w-4 text-[#1e3a5f]" />}
            extra={<ReviewDot status={reviewStatus || speaker.review_status} size={10} />}
          >
            <div className="mt-3 space-y-3">
              {/* Existing review info */}
              {speaker.reviewed_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Reviewed by: {speaker.reviewed_by ?? "—"}</span>
                  <span>on {new Date(speaker.reviewed_at).toLocaleDateString()} {new Date(speaker.reviewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {speaker.review_status && <ReviewStatusBadge status={speaker.review_status} />}
                </div>
              )}

              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Review Status</Label>
                  <Select value={reviewStatus} onValueChange={setReviewStatus}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {REVIEW_STATUSES.map((rs) => (
                        <SelectItem key={rs.value} value={rs.value}>
                          <span className="flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rs.color }} />
                            {rs.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Review Notes</Label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                    placeholder="Add review notes about this speaker..."
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSaveReview(speaker.id)}
                  disabled={reviewSaving}
                  className="bg-[#1e3a5f] hover:bg-[#2d5282]"
                >
                  {reviewSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save Review
                </Button>
              </div>
            </div>
          </CollapsibleSection>

          {/* Intelligence Summary */}
          <CollapsibleSection
            title="Intelligence Summary"
            icon={<FileText className="h-4 w-4 text-[#1e3a5f]" />}
          >
            <div className="mt-3">
              {v.ai_analysis ? (
                <MarkdownResponse content={v.ai_analysis} />
              ) : (
                <p className="text-sm text-muted-foreground">No intelligence summary available. Run verification to generate.</p>
              )}
            </div>
          </CollapsibleSection>
        </div>

        {/* Row 3: Events */}
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Assigned Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expandedEvents.length > 0 ? (
              <ul className="space-y-2">
                {expandedEvents.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{ev.title}</span>
                    {ev.start_date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(ev.start_date).toLocaleDateString()}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No events assigned yet.</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={() => handleOpenInvite(speaker)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add to Event
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  /** Render the expanded row for an UNVERIFIED speaker */
  const renderUnverifiedExpanded = (speaker: Speaker) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Verification Card */}
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">Not yet verified</p>
              <Button
                size="sm"
                className="bg-[#1e3a5f] hover:bg-[#2d5282]"
                onClick={() => handleStartVerification(speaker)}
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Start Verification
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bio Card */}
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {speaker.bio || "No bio available."}
            </p>
          </CardContent>
        </Card>

        {/* Events Card */}
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expandedEvents.length > 0 ? (
              <ul className="space-y-2">
                {expandedEvents.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{ev.title}</span>
                    {ev.start_date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(ev.start_date).toLocaleDateString()}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No events assigned yet.</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={() => handleOpenInvite(speaker)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add to Event
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Contact Information (for unverified speakers too) */}
      <CollapsibleSection
        title="Contact Information"
        icon={<Mail className="h-4 w-4 text-[#1e3a5f]" />}
        extra={
          <button
            onClick={(e) => { e.stopPropagation(); setContactEditing(!contactEditing); }}
            className="ml-auto p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={contactEditing ? "Cancel editing" : "Edit contact info"}
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        }
      >
        <div className="mt-3 space-y-3">
          {contactEditing ? (
            <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={contactForm.phone}
                    onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Address</Label>
                <Input
                  value={contactForm.address}
                  onChange={(e) => setContactForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="123 Main St"
                  className="h-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">City</Label>
                  <Input
                    value={contactForm.city}
                    onChange={(e) => setContactForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="City"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">State</Label>
                  <Select value={contactForm.state} onValueChange={(v) => setContactForm((f) => ({ ...f, state: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="State" /></SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Zip</Label>
                  <Input
                    value={contactForm.zip}
                    onChange={(e) => setContactForm((f) => ({ ...f, zip: e.target.value }))}
                    placeholder="12345"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Website</Label>
                <Input
                  value={contactForm.website}
                  onChange={(e) => setContactForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://example.com"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={contactForm.contact_notes}
                  onChange={(e) => setContactForm((f) => ({ ...f, contact_notes: e.target.value }))}
                  rows={2}
                  placeholder="Contact notes..."
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSaveContact(speaker.id)}
                  disabled={contactSaving}
                  className="bg-[#1e3a5f] hover:bg-[#2d5282]"
                >
                  {contactSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save Contact Info
                </Button>
                <Button size="sm" variant="outline" onClick={() => setContactEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {contactForm.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${contactForm.email}`} className="text-blue-600 hover:underline">{contactForm.email}</a>
                </div>
              )}
              {contactForm.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{contactForm.phone}</span>
                </div>
              )}
              {(contactForm.address || contactForm.city || contactForm.state || contactForm.zip) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{[contactForm.address, contactForm.city, contactForm.state, contactForm.zip].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {contactForm.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={contactForm.website.startsWith("http") ? contactForm.website : `https://${contactForm.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{contactForm.website}</a>
                </div>
              )}
              {contactForm.contact_notes && (
                <p className="text-sm text-muted-foreground italic">{contactForm.contact_notes}</p>
              )}
              {!contactForm.email && !contactForm.phone && !contactForm.city && !contactForm.address && (
                <p className="text-sm text-muted-foreground">No contact information available. Click the pencil icon to add.</p>
              )}
            </div>
          )}

          {/* Add to Contacts / Add to Email List buttons */}
          {contactForm.email && (
            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddToContacts(speaker)}
                disabled={addingToContacts}
              >
                {addingToContacts ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <UserPlus className="h-3.5 w-3.5 mr-1.5" />}
                Add to Contacts
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openAddToList}
                disabled={addingToList}
              >
                <ListPlus className="h-3.5 w-3.5 mr-1.5" />
                Add to Email List
              </Button>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#000741] dark:text-white flex items-center gap-2">
          <Mic className="h-6 w-6" /> Speakers
        </h1>
        <p className="text-muted-foreground mt-0.5">Manage event speakers and invite creators to your stages.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Total Speakers</p>
            <p className="text-2xl font-bold text-[#000741] dark:text-white">{speakers.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Verified</p>
            <p className="text-2xl font-bold text-blue-700">
              {speakers.filter((s) => s.verification_status === "verified").length}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Unverified</p>
            <p className="text-2xl font-bold text-gray-500">
              {speakers.filter((s) => !s.verification_id).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search speakers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-gray-800">
                <TableHead className="w-8"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((speaker) => (
                <React.Fragment key={speaker.id}>
                  <TableRow
                    className={cn(
                      "cursor-pointer border-gray-200 dark:border-gray-800",
                      expandedId === speaker.id && "bg-muted/50"
                    )}
                    onClick={() => handleExpand(speaker.id)}
                  >
                    <TableCell>
                      {expandedId === speaker.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const src = speaker.photo_url || getCreatorAvatar(speaker);
                          return src ? (
                            <>
                              <img
                                src={src}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                                referrerPolicy="no-referrer"
                                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.removeAttribute('style'); }}
                              />
                              <div className="h-8 w-8 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-[#1e3a5f]" style={{ display: 'none' }}>
                                {getAvatarFallback(speaker.name)}
                              </div>
                            </>
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-[#1e3a5f]">
                              {getAvatarFallback(speaker.name)}
                            </div>
                          );
                        })()}
                        <span>{speaker.name}</span>
                        {speaker.verification_status === "verified" && (
                          <ShieldCheck className="h-4 w-4 text-blue-700 shrink-0" />
                        )}
                        {speaker.verification_status === "pending" && speaker.verification_id && (
                          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        {speaker.verification_status === "flagged" && (
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{speaker.branch ?? "—"}</TableCell>
                    <TableCell>{speaker.rank ?? "—"}</TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground line-clamp-2">{speaker.bio ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {speaker.verification_id ? (
                          speaker.verification_status === "verified"
                            ? <ShieldCheck className="h-4 w-4 text-blue-700" />
                            : speaker.verification_status === "flagged"
                              ? <AlertTriangle className="h-4 w-4 text-red-500" />
                              : <Clock className="h-4 w-4 text-amber-500" />
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                        <ReviewDot status={speaker.review_status} />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {speaker.created_at ? new Date(speaker.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenInvite(speaker);
                            }}
                          >
                            <Calendar className="h-4 w-4 mr-2" /> Add to Event
                          </DropdownMenuItem>
                          {speaker.verification_id ? (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewVerification(speaker);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" /> View Verification
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartVerification(speaker);
                              }}
                            >
                              <ShieldCheck className="h-4 w-4 mr-2" /> Start Verification
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(speaker);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" /> Edit Speaker
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(speaker.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Remove Speaker
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row */}
                  {expandedId === speaker.id && (
                    <TableRow className="bg-muted/30 border-gray-200 dark:border-gray-800">
                      <TableCell colSpan={8} className="p-0">
                        <div className="p-6">
                          {expandLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-[#1e3a5f]" />
                            </div>
                          ) : expandedVerification ? (
                            renderVerifiedExpanded(speaker, expandedVerification)
                          ) : (
                            renderUnverifiedExpanded(speaker)
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No speakers yet. Add speakers from the Verification page using the "Add as Speaker" action.
          </div>
        )}
      </Card>

      {/* Edit Speaker Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" /> Edit Speaker
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Branch</Label>
              <Input
                value={editForm.branch}
                onChange={(e) => setEditForm((f) => ({ ...f, branch: e.target.value }))}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={editForm.rank} onValueChange={(v) => setEditForm((f) => ({ ...f, rank: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea
                value={editForm.bio}
                onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                rows={4}
              />
            </div>
            <Button onClick={handleSaveEdit} className="w-full bg-[#1e3a5f] hover:bg-[#2d5282]">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to Event Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Add to Event
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Add <strong>{inviteSpeaker?.name}</strong> as a speaker to an event.
          </p>
          <div className="space-y-4">
            <div>
              <Label>Event</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger><SelectValue placeholder="Select an event" /></SelectTrigger>
                <SelectContent>
                  {allEvents.length === 0 ? (
                    <SelectItem value="__none" disabled>No events found</SelectItem>
                  ) : (
                    allEvents.map((ev) => {
                      const alreadyAdded = existingEventIds.includes(ev.id);
                      return (
                        <SelectItem key={ev.id} value={ev.id} disabled={alreadyAdded}>
                          <span className="flex items-center gap-2">
                            {ev.title}
                            {ev.start_date && (
                              <span className="text-xs text-muted-foreground">
                                — {new Date(ev.start_date).toLocaleDateString()}
                              </span>
                            )}
                            {alreadyAdded && (
                              <span className="text-xs text-muted-foreground ml-1">(already added)</span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
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
              <Input
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                placeholder="Talk topic or panel name"
              />
            </div>
          </div>
          <Button
            onClick={handleSaveInvite}
            disabled={!selectedEventId || inviteSaving}
            className="w-full bg-[#1e3a5f] hover:bg-[#2d5282] mt-2"
          >
            {inviteSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add to Event
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove speaker?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this speaker. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add to Email List Dialog */}
      <Dialog open={addToListOpen} onOpenChange={setAddToListOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListPlus className="h-5 w-5" /> Add to Email List
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email List</Label>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger><SelectValue placeholder="Select a list" /></SelectTrigger>
                <SelectContent>
                  {emailLists.length === 0 ? (
                    <SelectItem value="__none" disabled>No lists found</SelectItem>
                  ) : (
                    emailLists.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {expandedId && (
              <Button
                onClick={() => {
                  const sp = speakers.find((s) => s.id === expandedId);
                  if (sp) handleAddToEmailList(sp);
                }}
                disabled={!selectedListId || addingToList}
                className="w-full bg-[#1e3a5f] hover:bg-[#2d5282]"
              >
                {addingToList && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add to List
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
