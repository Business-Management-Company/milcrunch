import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCreatorAvatar, getAvatarFallback } from "@/lib/avatar";
import { MarkdownResponse } from "@/components/MarkdownResponse";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// Tabs removed — ExpandedRow now uses single scrolling layout
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Loader2,
  Check,
  Link2,
  Briefcase,
  FileText,
  Globe,
  AlertCircle,
  ExternalLink,
  User,
  CheckCircle2,
  MoreHorizontal,
  UserPlus,
  List,
  Mail,
  Download,
  RefreshCw,
  Trash2,
  Mic,
  MapPin,
  Trophy,
  Save,
  GraduationCap,
  Award,
  Pencil,
  Video,
  Play,
  Target,
  Star,
  Medal,
  Info,
  Share2,
  Copy,
} from "lucide-react";
import { BRANCHES, CLAIMED_STATUS_OPTIONS, TYPE_OPTIONS } from "@/types/verification";
import type { VerificationRecord, EvidenceSource, RedFlag } from "@/types/verification";
import {
  runVerificationPipeline,
  searchSerp,
  categorizeAndScoreSnippet,
  filterCriminalResults,
  detectBranch,
  detectType,
  generateDossierNarrative,
  runVerificationAnalysis,
  extractCareerTimeline,
  extractCareerFromAIAnalysis,
  searchYouTube,
  type PipelinePhase,
  type PDLResponse,
  type AIFilteredCriminalResult,
  type CareerEntry,
  type EducationEntry,
  type AwardEntry,
  type PostServiceEntry,
  type MilitaryServiceSummary,
  type EnhancedCareerResult,
  recomputeScoreFromRecord,
  computeVerificationScore,
  recommendStatus,
} from "@/lib/verification";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getPlatformsFromEnrichmentData } from "@/lib/enrichment-platforms";
import { getEmailLists, upsertEmailList, addFullContact } from "@/lib/email-db";

const MILITARY_KEYWORDS = /military|veteran|army|navy|marine|air force|coast guard|served|deployment|dd-214|rank|sergeant|lieutenant|captain|medal|decorated|combat|reserve|guard|usmc|dod|veterans affairs/gi;

const BRANCH_BADGE_STYLES: Record<string, string> = {
  Army: "bg-green-800/10 text-green-800 dark:bg-green-800/20 dark:text-green-400",
  Navy: "bg-blue-900/10 text-blue-900 dark:bg-blue-900/20 dark:text-blue-400",
  "Air Force": "bg-sky-600/10 text-sky-700 dark:bg-sky-600/20 dark:text-sky-400",
  Marines: "bg-red-700/10 text-red-700 dark:bg-red-700/20 dark:text-red-400",
  "Coast Guard": "bg-orange-600/10 text-orange-700 dark:bg-orange-600/20 dark:text-orange-400",
  "Space Force": "bg-indigo-600/10 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-400",
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
] as const;

function highlightMilitaryText(text: string) {
  return text.replace(MILITARY_KEYWORDS, (match) => `<mark class="bg-yellow-200 dark:bg-yellow-900/50 rounded px-0.5">${match}</mark>`);
}

function stripMarkdown(md: string): string {
  return md
    .replace(/!\[.*?\]\(.*?\)/g, "")           // images ![alt](url)
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")      // links [text](url) → text
    .replace(/^#{1,6}\s+/gm, "")                // headings
    .replace(/(\*\*|__)(.*?)\1/g, "$2")         // bold
    .replace(/(\*|_)(.*?)\1/g, "$2")            // italic
    .replace(/~~(.*?)~~/g, "$1")                // strikethrough
    .replace(/`{1,3}[^`]*`{1,3}/g, "")         // inline code & code blocks
    .replace(/^[-*+]\s+/gm, "")                // unordered list bullets
    .replace(/^\d+\.\s+/gm, "")                // ordered list numbers
    .replace(/^>\s+/gm, "")                     // blockquotes
    .replace(/---+|===+|\*\*\*+/g, "")         // horizontal rules
    .replace(/https?:\/\/\S+/g, "")            // bare URLs
    .replace(/\n{3,}/g, "\n\n")                // collapse multiple newlines
    .trim();
}

function ConfidenceGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-[#000741] dark:text-white">{score}%</span>
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
      {s.icon}
      {s.label}
    </Badge>
  );
}

function StatusIcon({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; tip: string }> = {
    verified: { icon: <ShieldCheck className="h-4 w-4 text-blue-700 shrink-0" />, tip: "Verified — Military service confirmed" },
    flagged: { icon: <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />, tip: "Needs Review — Conflicting information found" },
    denied: { icon: <XCircle className="h-4 w-4 text-red-500 shrink-0" />, tip: "Unverified — Could not confirm military service" },
    pending: { icon: <Clock className="h-4 w-4 text-amber-500 shrink-0" />, tip: "Pending — Verification in progress, awaiting additional sources" },
  };
  const s = map[status] ?? map.pending;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild><span className="inline-flex">{s.icon}</span></TooltipTrigger>
        <TooltipContent className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
          {s.tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function NameStatusIcon({ score }: { score: number }) {
  const icon = score >= 80
    ? <ShieldCheck className="h-4 w-4 text-blue-700 shrink-0" />
    : score >= 40
      ? <Clock className="h-4 w-4 text-amber-500 shrink-0" />
      : <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />;
  const tip = score >= 80
    ? "Verified — Identity confirmed"
    : score >= 40
      ? "Pending — Verification in progress"
      : "Needs Review — Low confidence score";
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild><span className="inline-flex">{icon}</span></TooltipTrigger>
        <TooltipContent className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function InlineNameEdit({ id, name, onSave }: { id: string; name: string; onSave: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) { setEditing(false); setValue(name); return; }
    setSaving(true);
    const { error } = await supabase.from("verifications").update({ person_name: trimmed }).eq("id", id);
    setSaving(false);
    if (!error) { toast.success("Name updated"); setEditing(false); onSave(); }
    else toast.error("Failed to update name");
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setEditing(false); setValue(name); } }}
          className="h-7 text-sm w-44 px-2"
          autoFocus
          disabled={saving}
        />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-blue-700" />}
        </Button>
      </div>
    );
  }

  return (
    <span className="group flex items-center gap-1">
      <span>{name}</span>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        title="Edit name"
      >
        <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
      </button>
    </span>
  );
}

function SourceIcon({ category }: { category: string }) {
  if (category === "Military Service") return <ShieldCheck className="h-4 w-4 text-[#1e3a5f]" />;
  if (category === "Criminal Record") return <AlertCircle className="h-4 w-4 text-red-500" />;
  if (category === "Social Media") return <Globe className="h-4 w-4 text-gray-500" />;
  if (category === "News") return <FileText className="h-4 w-4 text-gray-500" />;
  if (category === "Professional") return <Briefcase className="h-4 w-4 text-gray-500" />;
  return <FileText className="h-4 w-4 text-gray-400" />;
}

function detectStatus(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('spouse') || lower.includes('milspouse') || lower.includes('mil spouse') || lower.includes('military spouse')) return 'military_spouse';
  if (lower.includes('active duty') || lower.includes('activeduty')) return 'active_duty';
  if (lower.includes('gold star')) return 'gold_star';
  if (lower.includes('reservist') || lower.includes('guard')) return 'reservist';
  return 'veteran';
}

interface PrefillData {
  fullName: string;
  claimedBranch: string;
  claimedType: string;
  claimedStatus: string;
  linkedinUrl: string;
  websiteUrl: string;
  notes: string;
  city?: string;
  state?: string;
  zip?: string;
  source?: string;
  sourceUsername?: string;
  profilePhotoUrl?: string;
  /** @deprecated kept for backwards compat with old navigation state */
  claimedRank?: string;
}

export default function Verification() {
  const location = useLocation();
  const navigate = useNavigate();
  const [list, setList] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: "",
    claimedBranch: "",
    claimedStatus: "veteran",
    linkedinUrl: "",
    instagramHandle: "",
    websiteUrl: "",
    notes: "",
    city: "",
    state: "",
    zip: "",
    source: "manual" as string,
    sourceUsername: "" as string,
    profilePhotoUrl: "",
  });
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [modalPhotoUrl, setModalPhotoUrl] = useState<string | null>(null);
  const [phases, setPhases] = useState<(PipelinePhase | { phase: number; name: string; status: string })[]>([]);
  const [newRecordId, setNewRecordId] = useState<string | null>(null);
  const [dirMembers, setDirMembers] = useState<{ id: string; creator_name: string; creator_handle: string; ic_avatar_url: string | null; avatar_url: string | null; platform: string | null }[]>([]);
  const [creatorSearch, setCreatorSearch] = useState("");
  const [showCreatorDropdown, setShowCreatorDropdown] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editCreatorOpen, setEditCreatorOpen] = useState(false);
  const [editCreatorSaving, setEditCreatorSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    branch: "",
    category: "",
    confidenceScore: null as number | null,
    confidenceOverride: false,
    verificationStatus: "pending" as string,
    bio: "",
    photoUrl: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    linkedin: "",
    email: "",
    phone: "",
    website: "",
    notes: "",
    sourceUsername: "",
  });
  const [addSpeakerOpen, setAddSpeakerOpen] = useState(false);
  const [speakerForm, setSpeakerForm] = useState({ name: "", branch: "", rank: "", bio: "", verification_id: "", verification_status: "", photo_url: "" });
  const [inviteEventOpen, setInviteEventOpen] = useState(false);
  const [inviteRecord, setInviteRecord] = useState<VerificationRecord | null>(null);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState({ done: 0, total: 0 });
  // Batch-fetched IC enrichment data from directory_members, keyed by creator_handle
  const [dirEnrichmentMap, setDirEnrichmentMap] = useState<Record<string, unknown>>({});

  const fetchVerifications = async () => {
    // Only show creators explicitly submitted for verification
    const { data: vData } = await supabase
      .from("verifications")
      .select("*")
      .order("created_at", { ascending: false });
    const verifications = (vData ?? []) as VerificationRecord[];

    // Backfill profile_photo_url from directory_members for records missing a photo
    const handles = verifications.map((v) => v.source_username).filter(Boolean) as string[];
    const names = verifications.filter((v) => !v.profile_photo_url).map((v) => v.person_name).filter(Boolean) as string[];
    if (handles.length > 0 || names.length > 0) {
      const { data: dmData } = await supabase
        .from("directory_members")
        .select("creator_handle, creator_name, ic_avatar_url, avatar_url");
      if (dmData) {
        const dmAvatarMap = new Map<string, string>();
        for (const dm of dmData as { creator_handle: string; creator_name: string; ic_avatar_url: string | null; avatar_url: string | null }[]) {
          const avatar = dm.ic_avatar_url || dm.avatar_url;
          if (!avatar) continue;
          if (dm.creator_handle) dmAvatarMap.set(dm.creator_handle.toLowerCase(), avatar);
          if (dm.creator_name) dmAvatarMap.set(dm.creator_name.toLowerCase(), avatar);
        }
        for (const v of verifications) {
          if (v.profile_photo_url) continue;
          const byHandle = v.source_username ? dmAvatarMap.get(v.source_username.toLowerCase()) : null;
          const byName = v.person_name ? dmAvatarMap.get(v.person_name.toLowerCase()) : null;
          if (byHandle || byName) v.profile_photo_url = (byHandle || byName)!;
        }
      }
    }

    setList(verifications);
  };

  useEffect(() => {
    (async () => {
      await fetchVerifications();
      setLoading(false);
    })();
  }, []);

  // Batch-fetch IC enrichment data for all verification records' source usernames
  useEffect(() => {
    const handles = list.map((r) => r.source_username).filter(Boolean) as string[];
    if (handles.length === 0) return;
    supabase
      .from("directory_members")
      .select("creator_handle, enrichment_data")
      .in("creator_handle", handles)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, unknown> = {};
        for (const d of data) {
          if (d.enrichment_data) map[d.creator_handle] = d.enrichment_data;
        }
        setDirEnrichmentMap(map);
      });
  }, [list]);

  // Fetch directory members when add modal opens
  useEffect(() => {
    if (!addOpen) return;
    (async () => {
      const { data } = await supabase
        .from('directory_members')
        .select('id, creator_name, creator_handle, ic_avatar_url, avatar_url, platform')
        .order('creator_name', { ascending: true });
      // Deduplicate by creator_handle, preferring entries that have an avatar
      const seen = new Map<string, typeof data extends (infer T)[] | null ? T : never>();
      for (const m of data ?? []) {
        const key = (m.creator_handle ?? '').toLowerCase();
        const existing = seen.get(key);
        if (!existing || (!existing.ic_avatar_url && !existing.avatar_url && (m.ic_avatar_url || m.avatar_url))) {
          seen.set(key, m);
        }
      }
      setDirMembers(Array.from(seen.values()));
      setCreatorSearch("");
    })();
  }, [addOpen]);

  // Pre-fill from discovery navigation state
  useEffect(() => {
    const state = location.state as { prefill?: PrefillData; expandId?: string } | null;
    if (state?.prefill) {
      const p = state.prefill;
      setAddForm({
        fullName: p.fullName,
        claimedBranch: p.claimedBranch,
        claimedStatus: p.claimedStatus || "veteran",
        linkedinUrl: p.linkedinUrl,
        instagramHandle: p.sourceUsername || "",
        websiteUrl: p.websiteUrl,
        notes: p.notes,
        city: p.city || "",
        state: p.state || "",
        zip: p.zip || "",
        source: p.source || "manual",
        sourceUsername: p.sourceUsername || "",
        profilePhotoUrl: p.profilePhotoUrl || "",
      });
      setAddOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (state?.expandId) {
      setExpandedId(state.expandId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const filtered = list.filter(
    (r) => {
      const q = search.toLowerCase();
      return r.person_name.toLowerCase().includes(q) ||
        (r.claimed_branch ?? "").toLowerCase().includes(q) ||
        (r.source_username ?? "").toLowerCase().includes(q);
    }
  );

  const stats = {
    total: list.length,
    verified: list.filter((r) => r.status === "verified").length,
    pending: list.filter((r) => r.status === "pending").length,
    flagged: list.filter((r) => r.status === "flagged" || r.status === "rejected").length,
  };

  // Backfill career data for all verifications that have ai_analysis but no career_track
  const handleBackfillCareerData = async () => {
    setBackfillRunning(true);
    setBackfillProgress({ done: 0, total: 0 });
    try {
      // Fetch all verifications that have ai_analysis
      const { data: rows, error } = await supabase
        .from("verifications")
        .select("id, person_name, claimed_branch, notes, pdl_data, serp_results, evidence_sources, firecrawl_data, ai_analysis, manual_checks")
        .not("ai_analysis", "is", null);
      if (error || !rows) {
        toast.error("Failed to fetch verifications: " + (error?.message ?? "Unknown error"));
        return;
      }

      // Filter to those missing career_track data
      const needsBackfill = rows.filter((r) => {
        const mc = (r.manual_checks ?? {}) as Record<string, unknown>;
        const ct = mc.career_track as { result?: unknown } | undefined;
        const result = ct?.result as Record<string, unknown> | null | undefined;
        // No career_track at all, or empty result
        if (!result) return true;
        // Has result but it's an empty skeleton
        const career = (result.career ?? []) as unknown[];
        const education = (result.education ?? []) as unknown[];
        const awards = (result.awards ?? []) as unknown[];
        const ms = result.military_summary as Record<string, unknown> | undefined;
        return career.length === 0 && education.length === 0 && awards.length === 0 && !ms?.branch;
      });

      if (needsBackfill.length === 0) {
        toast.success("All verifications already have career data!");
        return;
      }

      setBackfillProgress({ done: 0, total: needsBackfill.length });
      console.log(`[Backfill] Processing ${needsBackfill.length} verifications`);

      for (let i = 0; i < needsBackfill.length; i++) {
        const r = needsBackfill[i];
        try {
          const pdlData = r.pdl_data as PDLResponse | null;
          const sources = (r.evidence_sources ?? []) as EvidenceSource[];
          const firecrawlRaw = (r.firecrawl_data ?? []) as { url: string; markdown?: string }[];

          const serpSnippets = sources.map((s) => `${s.title}: ${s.snippet}`).join("\n");
          const firecrawlContent = firecrawlRaw.map((f) => f.markdown ?? "").filter(Boolean).join("\n\n---\n\n");
          const pdlSummary = pdlData ? JSON.stringify({
            employment: pdlData.employment,
            education: pdlData.education,
            job_title: pdlData.job_title,
            skills: (pdlData as any)?.skills,
          }) : undefined;

          let result: EnhancedCareerResult;
          const aiAnalysis = (r as any).ai_analysis as string | null;

          // Try primary extraction first (from firecrawl + serp + pdl)
          const hasSources = firecrawlContent.length > 50 || serpSnippets.length > 50 || (pdlSummary && pdlSummary.length > 10);
          if (hasSources) {
            result = await extractCareerTimeline({
              personName: r.person_name,
              firecrawlContent,
              serpSnippets,
              claimedBranch: r.claimed_branch ?? undefined,
              notesField: r.notes ?? undefined,
              pdlSummary: pdlSummary || undefined,
            });
            const hasData = result.career.length > 0 || result.education.length > 0 || result.awards.length > 0 || !!result.military_summary?.branch;
            // If primary returned empty, fallback to ai_analysis
            if (!hasData && aiAnalysis && aiAnalysis.length > 100) {
              console.log(`[Backfill] Primary empty for ${r.person_name}, trying ai_analysis fallback...`);
              result = await extractCareerFromAIAnalysis({
                personName: r.person_name,
                aiAnalysis,
                claimedBranch: r.claimed_branch ?? undefined,
              });
            }
          } else if (aiAnalysis && aiAnalysis.length > 100) {
            // No source data at all — go straight to ai_analysis
            result = await extractCareerFromAIAnalysis({
              personName: r.person_name,
              aiAnalysis,
              claimedBranch: r.claimed_branch ?? undefined,
            });
          } else {
            console.log(`[Backfill] Skipping ${r.person_name}: no sources and no ai_analysis`);
            setBackfillProgress({ done: i + 1, total: needsBackfill.length });
            continue;
          }

          // Save to manual_checks.career_track
          const existingMc = (r.manual_checks ?? {}) as Record<string, unknown>;
          await supabase.from("verifications").update({
            manual_checks: { ...existingMc, career_track: { result, generated_at: new Date().toISOString() } },
          }).eq("id", r.id);

          console.log(`[Backfill] ${i + 1}/${needsBackfill.length} — ${r.person_name}: branch=${result.military_summary?.branch || "none"}, career=${result.career?.length ?? 0}, postService=${result.post_service?.length ?? 0}`);
        } catch (err) {
          console.warn(`[Backfill] Failed for ${r.person_name}:`, err);
        }
        setBackfillProgress({ done: i + 1, total: needsBackfill.length });
      }

      toast.success(`Career data backfilled for ${needsBackfill.length} verifications`);
      window.location.reload();
    } catch (err) {
      console.error("[Backfill] Error:", err);
      toast.error("Backfill failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setBackfillRunning(false);
    }
  };

  const [rescoring, setRescoring] = useState(false);
  const [rescoreProgress, setRescoreProgress] = useState({ done: 0, total: 0 });
  const handleReScoreAll = async () => {
    setRescoring(true);
    try {
      const { data: rows, error } = await supabase
        .from("verifications")
        .select("id, pdl_data, evidence_sources, claimed_branch, claimed_type, claimed_status, linkedin_url, firecrawl_data, verification_score, status, ai_analysis");
      if (error || !rows) { toast.error("Failed to load records"); return; }
      setRescoreProgress({ done: 0, total: rows.length });
      let updated = 0;
      let reclassified = 0;
      for (const row of rows) {
        const sources = (row.evidence_sources ?? []) as EvidenceSource[];
        // Auto-detect type from AI analysis + evidence
        const detected = detectType(row.ai_analysis as string | null, sources);
        const updates: Record<string, unknown> = {};
        let effectiveType = row.claimed_type ?? row.claimed_status ?? "";
        if (detected) {
          // Only reclassify if currently "veteran" or empty — don't override manual corrections
          const currentStatus = (row.claimed_status ?? "").toLowerCase();
          if (!currentStatus || currentStatus === "veteran") {
            updates.claimed_status = detected.claimedStatus;
            updates.claimed_type = detected.claimedType;
            effectiveType = detected.claimedStatus;
            reclassified++;
          }
        }
        // Also auto-detect branch if missing
        if (!row.claimed_branch) {
          const branch = detectBranch(row.ai_analysis as string | null, sources);
          if (branch) updates.claimed_branch = branch;
        }
        const { score, status } = recomputeScoreFromRecord({ ...row, claimed_type: effectiveType });
        if (score !== row.verification_score || status !== row.status) {
          updates.verification_score = score;
          updates.status = status;
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from("verifications").update(updates).eq("id", row.id);
          updated++;
        }
        setRescoreProgress((p) => ({ ...p, done: p.done + 1 }));
      }
      toast.success(`Re-scored ${rows.length} records (${updated} changed, ${reclassified} reclassified)`);
      fetchVerifications();
    } catch (e) {
      console.error("[ReScore]", e);
      toast.error("Re-score failed");
    } finally {
      setRescoring(false);
    }
  };

  const handleStartVerification = async () => {
    if (!addForm.fullName.trim()) return;

    // Resolve photo URL before opening the modal
    const handle = addForm.instagramHandle.trim().replace('@', '');
    const localMatch = handle ? dirMembers.find((m) => m.creator_handle === handle) : null;
    let resolvedPhoto = localMatch?.ic_avatar_url || localMatch?.avatar_url || addForm.profilePhotoUrl || null;
    if (!resolvedPhoto && handle) {
      const { data: memberData } = await supabase
        .from('directory_members')
        .select('ic_avatar_url, avatar_url')
        .eq('creator_handle', handle)
        .maybeSingle();
      resolvedPhoto = memberData?.ic_avatar_url || memberData?.avatar_url || null;
    }
    setModalPhotoUrl(resolvedPhoto);

    setPipelineRunning(true);
    setPhases([]);
    const onPhase = (p: PipelinePhase | { phase: number; name: string; status: string }) => setPhases((prev) => [...prev.filter((x) => x.phase !== p.phase), p]);
    try {
      const result = await runVerificationPipeline(
        {
          fullName: addForm.fullName.trim(),
          claimedBranch: addForm.claimedBranch || "Unknown",
          claimedType: "",
          claimedStatus: addForm.claimedStatus,
          linkedinUrl: addForm.linkedinUrl.trim() || undefined,
          websiteUrl: addForm.websiteUrl.trim() || undefined,
          notes: addForm.notes.trim() || undefined,
          socialHandle: addForm.instagramHandle.trim().replace(/^@/, "") || undefined,
        },
        onPhase
      );
      // Auto-detect branch from AI analysis if not manually set
      const detectedBranch = detectBranch(result.aiAnalysis, result.evidenceSources);
      const finalBranch = addForm.claimedBranch || detectedBranch || null;

      // Auto-detect type (spouse/family/veteran) from AI analysis + evidence
      const detectedType = detectType(result.aiAnalysis, result.evidenceSources);
      const finalStatus = detectedType?.claimedStatus ?? addForm.claimedStatus;
      const finalType = detectedType?.claimedType ?? null;

      // If type changed, recompute score with correct type for proper scoring
      let finalScore = result.verificationScore;
      let finalVerificationStatus = result.status;
      if (detectedType) {
        finalScore = computeVerificationScore(0, result.evidenceSources, { hasUnitOrMOS: false, hasDates: false, hasAwards: false }, { claimedBranch: finalBranch ?? undefined, claimedType: finalStatus, linkedinUrl: result.linkedinUrl ?? undefined, pdlData: result.pdlData });
        finalVerificationStatus = recommendStatus(finalScore, result.redFlags.length > 0);
      }

      const { data: inserted, error } = await supabase
        .from("verifications")
        .insert({
          person_name: addForm.fullName.trim(),
          claimed_branch: finalBranch,
          claimed_status: finalStatus,
          claimed_type: finalType,
          linkedin_url: addForm.linkedinUrl.trim() || result.linkedinUrl || null,
          source_username: addForm.instagramHandle.trim() || null,
          profile_photo_url: resolvedPhoto || addForm.profilePhotoUrl || null,
          website_url: addForm.websiteUrl.trim() || null,
          notes: addForm.notes.trim() || null,
          verification_score: finalScore,
          status: finalVerificationStatus,
          pdl_data: result.pdlData,
          serp_results: result.serpResults,
          firecrawl_data: result.firecrawlData,
          ai_analysis: result.aiAnalysis,
          evidence_sources: result.evidenceSources,
          red_flags: result.redFlags,
          city: addForm.city.trim() || null,
          state: addForm.state || null,
          zip: addForm.zip.trim() || null,
          source: addForm.source || "manual",
          source_username: addForm.sourceUsername || null,
          manual_checks: {
            youtube_results: result.youtubeResults ?? [],
            youtube_media: { videos: result.mediaAppearances ?? [], searched_at: new Date().toISOString() },
            career_track: { result: result.careerData ?? null, generated_at: new Date().toISOString() },
            social_profiles: result.socialVerification?.profiles ?? [],
          },
          last_verified_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) {
        console.error('INITIAL INSERT FAILED:', error);
        toast.error("Failed to save verification: " + error.message);
      }
      if (!error && inserted) {
        console.log('INSERT OK — id:', inserted.id, '| career_track saved:', !!result.careerData, '| media saved:', (result.mediaAppearances ?? []).length, 'items');
        setNewRecordId(inserted.id);

        // Auto-run background review silently — fire and forget
        void (async () => { try {
          const locCtx = [addForm.city, addForm.state].filter(Boolean).join(", ");
          const bgQueries = [
            `"${addForm.fullName.trim()}" controversy`,
            `"${addForm.fullName.trim()}" fraud OR scandal`,
            `"${addForm.fullName.trim()}" stolen valor`,
          ];
          const bgResults: { title: string; url: string; snippet: string }[] = [];
          const bgSeen = new Set<string>();
          for (const q of bgQueries) {
            const serpRes = await searchSerp(q);
            for (const r of serpRes) {
              const url = r.link ?? "";
              if (bgSeen.has(url)) continue;
              bgSeen.add(url);
              bgResults.push({ title: r.title ?? "", url, snippet: r.snippet ?? "" });
            }
          }
          const { filtered: bgFiltered, summary: bgSummary } = await filterCriminalResults({
            personName: addForm.fullName.trim(),
            claimedBranch: addForm.claimedBranch || "Unknown",
            locationContext: locCtx,
            results: bgResults,
          });
          const now = new Date().toISOString();
          // Merge background_review into existing manual_checks to avoid overwriting career/media
          const { data: existingRow } = await supabase.from("verifications").select("manual_checks").eq("id", inserted.id).single();
          const existingChecks = (existingRow?.manual_checks ?? {}) as Record<string, unknown>;
          const { error: bgSaveError } = await supabase.from("verifications").update({
            manual_checks: { ...existingChecks, background_review: { results: bgFiltered, summary: bgSummary, reviewed_at: now } },
          }).eq("id", inserted.id);
          if (bgSaveError) console.error('BACKGROUND REVIEW SAVE FAILED:', bgSaveError);
          else console.log('BACKGROUND REVIEW SAVED OK for', inserted.id);
        } catch (e) {
          console.error("Background auto-run failed:", e);
        }
        })();

        // Upsert directory_members with avatar so Verification list row shows the photo
        const dmHandle = (addForm.instagramHandle.trim().replace(/^@/, "") || addForm.sourceUsername || "").toLowerCase();
        const finalPhoto = resolvedPhoto || addForm.profilePhotoUrl || null;
        if (dmHandle && finalPhoto) {
          await supabase
            .from("directory_members")
            .upsert({
              creator_handle: dmHandle,
              creator_name: addForm.fullName.trim(),
              ic_avatar_url: finalPhoto,
              avatar_url: finalPhoto,
            } as Record<string, unknown>, { onConflict: "creator_handle" });
        }

        setList((prev) => [
          {
            ...inserted,
            id: inserted.id,
            person_name: addForm.fullName.trim(),
            claimed_branch: finalBranch,
            claimed_type: null,
            claimed_status: addForm.claimedStatus,
            linkedin_url: addForm.linkedinUrl.trim() || result.linkedinUrl || null,
            website_url: addForm.websiteUrl.trim() || null,
            verification_score: result.verificationScore,
            status: result.status,
            pdl_data: result.pdlData,
            serp_results: result.serpResults,
            firecrawl_data: result.firecrawlData,
            ai_analysis: result.aiAnalysis,
            evidence_sources: result.evidenceSources,
            red_flags: result.redFlags,
            notes: addForm.notes.trim() || null,
            verified_by: null,
            city: addForm.city.trim() || null,
            state: addForm.state || null,
            zip: addForm.zip.trim() || null,
            source: addForm.source || "manual",
            source_username: addForm.sourceUsername || null,
            profile_photo_url: finalPhoto,
            manual_checks: {
              youtube_results: result.youtubeResults ?? [],
              youtube_media: { videos: result.mediaAppearances ?? [], searched_at: new Date().toISOString() },
              career_track: { result: result.careerData ?? null, generated_at: new Date().toISOString() },
              social_profiles: result.socialVerification?.profiles ?? [],
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_verified_at: new Date().toISOString(),
          } as VerificationRecord,
          ...prev,
        ]);
        setAddForm({ fullName: "", claimedBranch: "", claimedStatus: "veteran", linkedinUrl: "", instagramHandle: "", websiteUrl: "", notes: "", city: "", state: "", zip: "", source: "manual", sourceUsername: "", profilePhotoUrl: "" });
        setAddOpen(false);
        setNewRecordId(null);
        setExpandedId(inserted.id);
      }
    } finally {
      setPipelineRunning(false);
    }
  };

  const expanded = expandedId ? list.find((r) => r.id === expandedId) : null;

  const handleAddAsSpeaker = (row: VerificationRecord) => {
    // Resolve best photo: enrichment avatar > verification profile_photo_url
    const handle = row.source_username;
    let bestPhoto = row.profile_photo_url || "";
    // Try to extract avatar from IC enrichment data cached in dirEnrichmentMap
    if (handle && dirEnrichmentMap[handle]) {
      const ed = dirEnrichmentMap[handle] as Record<string, unknown>;
      const result = (ed.result ?? ed) as Record<string, unknown>;
      const ig = (result.instagram ?? result) as Record<string, unknown>;
      const enrichAvatar = (ig.picture ?? ig.profile_picture_hd ?? ig.profile_picture ?? ig.profile_pic_url) as string | undefined;
      if (enrichAvatar && enrichAvatar.startsWith("http")) bestPhoto = enrichAvatar;
    }
    // Also check dirMembers list if available
    const dmMatch = handle ? dirMembers.find((m) => m.creator_handle === handle) : null;
    if (dmMatch) {
      const dmAvatar = dmMatch.ic_avatar_url || dmMatch.avatar_url;
      if (dmAvatar) bestPhoto = dmAvatar;
    }

    setSpeakerForm({
      name: row.person_name,
      branch: row.claimed_branch ?? "",
      rank: row.claimed_type ?? "",
      bio: (() => {
        // Priority 1: notes field (bio from Discovery enrichment) — skip error messages
        if (row.notes && !/failed|error|skipped/i.test(row.notes)) return row.notes;
        // Priority 2: extract from evidence source snippets
        const evSources = (row.evidence_sources ?? []) as EvidenceSource[];
        const best = evSources.find((s) => s.category === "Military Service" && s.snippet?.length > 50)
          || evSources.find((s) => s.category === "Professional" && s.snippet?.length > 50);
        if (best) return best.snippet.slice(0, 300);
        // Priority 3: blank for manual entry
        return "";
      })(),
      verification_id: row.id,
      verification_status: row.status ?? "pending",
      photo_url: bestPhoto,
    });
    setAddSpeakerOpen(true);
  };

  const handleEditCreator = (row: VerificationRecord) => {
    const handle = row.source_username;
    let bestPhoto = row.profile_photo_url || "";
    if (handle && dirEnrichmentMap[handle]) {
      const ed = dirEnrichmentMap[handle] as Record<string, unknown>;
      const result = (ed.result ?? ed) as Record<string, unknown>;
      const ig = (result.instagram ?? result) as Record<string, unknown>;
      const enrichAvatar = (ig.picture ?? ig.profile_picture_hd ?? ig.profile_picture ?? ig.profile_pic_url) as string | undefined;
      if (enrichAvatar && enrichAvatar.startsWith("http")) bestPhoto = enrichAvatar;
    }
    const dmMatch = handle ? dirMembers.find((m) => m.creator_handle === handle) : null;
    if (dmMatch) {
      const dmAvatar = dmMatch.ic_avatar_url || dmMatch.avatar_url;
      if (dmAvatar) bestPhoto = dmAvatar;
    }
    setEditForm({
      id: row.id,
      name: row.person_name,
      branch: row.claimed_branch ?? "",
      category: row.claimed_status ?? "",
      confidenceScore: row.verification_score,
      confidenceOverride: !!(row.manual_checks as Record<string, unknown> | null)?.confidence_override,
      verificationStatus: row.status ?? "pending",
      bio: row.notes ?? "",
      photoUrl: bestPhoto,
      instagram: row.source_username ?? "",
      tiktok: "",
      youtube: "",
      linkedin: row.linkedin_url ?? "",
      email: "",
      phone: "",
      website: row.website_url ?? "",
      notes: row.notes ?? "",
      sourceUsername: row.source_username ?? "",
    });
    setEditCreatorOpen(true);
  };

  const handleSaveEdit = async () => {
    setEditCreatorSaving(true);
    try {
      // Update verification record
      const vPayload: Record<string, unknown> = {
        person_name: editForm.name,
        claimed_branch: editForm.branch || null,
        claimed_status: editForm.category || null,
        status: editForm.verificationStatus,
        linkedin_url: editForm.linkedin || null,
        website_url: editForm.website || null,
        profile_photo_url: editForm.photoUrl || null,
        notes: editForm.notes || null,
        updated_at: new Date().toISOString(),
      };
      if (editForm.confidenceOverride && editForm.confidenceScore != null) {
        vPayload.verification_score = editForm.confidenceScore;
        vPayload.manual_checks = {
          ...((list.find((r) => r.id === editForm.id)?.manual_checks as Record<string, unknown>) || {}),
          confidence_override: true,
          manual_score: editForm.confidenceScore,
        };
      }
      const { error: vErr } = await supabase.from("verifications").update(vPayload).eq("id", editForm.id);
      if (vErr) throw vErr;

      // Update speakers table if linked
      const { data: speakerRows } = await supabase.from("speakers")
        .select("id")
        .eq("verification_id", editForm.id)
        .limit(1);
      if (speakerRows && speakerRows.length > 0) {
        await supabase.from("speakers").update({
          name: editForm.name,
          branch: editForm.branch || null,
          bio: editForm.notes || null,
          photo_url: editForm.photoUrl || null,
          verification_status: editForm.verificationStatus,
        } as Record<string, unknown>).eq("verification_id", editForm.id);
      }

      // Update directory_members if linked by handle
      if (editForm.sourceUsername) {
        await supabase.from("directory_members").update({
          creator_name: editForm.name,
          branch: editForm.branch || null,
          bio: editForm.notes || null,
          ic_avatar_url: editForm.photoUrl || null,
          category: editForm.category || null,
          verification_status: editForm.verificationStatus,
        } as Record<string, unknown>).eq("creator_handle", editForm.sourceUsername);
      }

      toast.success("Creator updated successfully");
      setEditCreatorOpen(false);
      fetchVerifications();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update creator");
    } finally {
      setEditCreatorSaving(false);
    }
  };

  const handleSaveSpeaker = async () => {
    const { error } = await supabase.from("speakers").insert({
      name: speakerForm.name,
      branch: speakerForm.branch || null,
      rank: speakerForm.rank || null,
      bio: speakerForm.bio || null,
      photo_url: speakerForm.photo_url || null,
      verification_id: speakerForm.verification_id || null,
      verification_status: speakerForm.verification_status || null,
      review_status: "pending_review",
    } as Record<string, unknown>);
    if (error) {
      toast.error("Failed to save speaker: " + error.message);
    } else {
      toast.success(`${speakerForm.name} added as speaker`);
      setAddSpeakerOpen(false);
    }
  };

  const handleInviteToEvent = async (row: VerificationRecord) => {
    setInviteRecord(row);
    const { data } = await supabase.from("events").select("id, title").order("start_date", { ascending: false }).limit(50);
    setEvents((data ?? []) as { id: string; title: string }[]);
    setSelectedEventId("");
    setInviteEventOpen(true);
  };

  const handleSendInvite = async () => {
    if (!selectedEventId || !inviteRecord) return;
    const { error } = await supabase.from("event_invitations").insert({
      event_id: selectedEventId,
      person_name: inviteRecord.person_name,
      verification_id: inviteRecord.id,
      status: "invited",
    });
    if (error) {
      toast.error("Failed to send invite: " + error.message);
    } else {
      toast.success(`Invited ${inviteRecord.person_name} to event`);
      setInviteEventOpen(false);
    }
  };

  const handleExportProfile = (row: VerificationRecord) => {
    const lines = [
      `MILITARY VERIFICATION REPORT`,
      `Generated: ${new Date().toLocaleDateString()}`,
      ``,
      `Name: ${row.person_name}`,
      `Branch: ${row.claimed_branch ?? "—"}`,
      `Type: ${row.claimed_type ?? "—"}`,
      `Status: ${row.claimed_status ?? "—"}`,
      `Location: ${[row.city, row.state, row.zip].filter(Boolean).join(", ") || "—"}`,
      ``,
      `VERIFICATION RESULT`,
      `Score: ${row.verification_score ?? 0}%`,
      `Status: ${(row.status ?? "pending").toUpperCase()}`,
      ``,
      `Evidence Sources: ${(row.evidence_sources as EvidenceSource[] | null)?.length ?? 0}`,
      `Red Flags: ${(row.red_flags as RedFlag[] | null)?.length ?? 0}`,
      ``,
      `AI ANALYSIS`,
      row.ai_analysis ?? "No analysis available.",
      ``,
      `Notes: ${row.notes ?? "—"}`,
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Profile copied to clipboard");
  };

  const handleReverify = async (row: VerificationRecord) => {
    const realId = row.id;
    toast.info(`Re-verifying ${row.person_name}...`);

    try {
      // Incremental save: write career/media to DB as each phase completes
      const onReverifyPhase = async (p: PipelinePhase | { phase: number; name: string; status: string; data?: unknown }) => {
        const phaseData = (p as PipelinePhase).data as Record<string, unknown> | undefined;
        if (p.phase === 5 && (p.status === "done" || p.status === "empty")) {
          const mediaItems = phaseData?.mediaAppearances ?? [];
          const { data: existing5 } = await supabase.from("verifications").select("manual_checks").eq("id", realId).single();
          const mc5 = (existing5?.manual_checks ?? {}) as Record<string, unknown>;
          await supabase.from("verifications").update({
            manual_checks: { ...mc5, youtube_media: { videos: mediaItems, searched_at: new Date().toISOString() } },
          }).eq("id", realId);
        }
        if (p.phase === 6 && (p.status === "done" || p.status === "empty")) {
          const careerResult = phaseData?.careerData ?? null;
          const { data: existing6 } = await supabase.from("verifications").select("manual_checks").eq("id", realId).single();
          const mc6 = (existing6?.manual_checks ?? {}) as Record<string, unknown>;
          await supabase.from("verifications").update({
            manual_checks: { ...mc6, career_track: { result: careerResult, generated_at: new Date().toISOString() } },
          }).eq("id", realId);
        }
      };
      const result = await runVerificationPipeline(
        {
          fullName: row.person_name,
          claimedBranch: row.claimed_branch ?? "Unknown",
          claimedType: row.claimed_type ?? "",
          claimedStatus: row.claimed_status ?? "veteran",
          linkedinUrl: row.linkedin_url ?? undefined,
          websiteUrl: row.website_url ?? undefined,
          socialHandle: row.source_username?.replace(/^@/, "") || undefined,
        },
        onReverifyPhase
      );
      // Final save merges everything including phases that may not have triggered incremental saves
      const { data: existingReverify } = await supabase.from("verifications").select("manual_checks").eq("id", realId).single();
      const existingChecksReverify = (existingReverify?.manual_checks ?? {}) as Record<string, unknown>;
      const mergedChecks = {
        ...existingChecksReverify,
        youtube_results: result.youtubeResults ?? [],
        youtube_media: { videos: result.mediaAppearances ?? [], searched_at: new Date().toISOString() },
        career_track: { result: result.careerData ?? null, generated_at: new Date().toISOString() },
        social_profiles: result.socialVerification?.profiles ?? [],
      };
      const { error: reverifyError } = await supabase.from("verifications").update({
        verification_score: result.verificationScore,
        status: result.status,
        pdl_data: result.pdlData,
        serp_results: result.serpResults,
        firecrawl_data: result.firecrawlData,
        ai_analysis: result.aiAnalysis,
        evidence_sources: result.evidenceSources,
        red_flags: result.redFlags,
        linkedin_url: result.linkedinUrl || row.linkedin_url || null,
        last_verified_at: new Date().toISOString(),
        manual_checks: mergedChecks,
      }).eq("id", realId);
      if (reverifyError) {
        console.error('RE-VERIFY SAVE FAILED:', reverifyError);
        toast.error("Re-verification save failed: " + reverifyError.message);
      } else {
        console.log('RE-VERIFY SAVED OK —', row.person_name, '| career:', !!result.careerData, '| media:', (result.mediaAppearances ?? []).length, 'items');
        toast.success(`Re-verification complete for ${row.person_name}`);
      }
      await fetchVerifications();
    } catch {
      toast.error("Re-verification failed");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    const { error } = await supabase.from("verifications").delete().eq("id", deleteConfirmId);
    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      setList((prev) => prev.filter((r) => r.id !== deleteConfirmId));
      setExpandedId(null);
      toast.success("Verification deleted");
    }
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      {pipelineRunning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-10 w-full max-w-md mx-4 flex flex-col items-center gap-6">
            <div className="relative w-20 h-20 mx-auto">
              <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 80 80" style={{ animationDuration: '2.5s' }}>
                <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                <circle cx="40" cy="40" r="36" fill="none" stroke="#1e3a5f" strokeWidth="4"
                  strokeDasharray="60 165" strokeLinecap="round" />
              </svg>
              {modalPhotoUrl ? (
                <img
                  src={modalPhotoUrl}
                  alt={addForm.fullName}
                  referrerPolicy="no-referrer"
                  className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] rounded-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-700">
                    {addForm.fullName?.charAt(0) || '?'}
                  </span>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#000741] dark:text-white mb-1">Verifying {addForm.fullName}</p>
              <p className="text-sm text-muted-foreground">Running AI-powered multi-source verification... This may take 1–2 minutes.</p>
              <p className="text-xs text-gray-400 mt-1">Please keep this window open while we search across multiple data sources.</p>
            </div>
            <div className="w-full space-y-3">
              {[1, 2, 5, 6, 7, 3, 4].map((n) => {
                const p = phases.find((x) => x.phase === n);
                const labelMap: Record<number, string> = { 1: "People Data Labs", 2: "Web Search", 5: "Media & Appearances", 6: "Military / Civilian Career", 7: "Social Verification", 3: "Deep Extraction", 4: "AI Analysis" };
                const isComplete = p?.status === "done" || p?.status === "empty";
                const isError = p?.status === "error";
                const isRunning = p?.status === "running";
                const phasePrefix = (n <= 4) ? `Phase ${n}: ` : "";
                return (
                  <div key={n} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${isRunning ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800" : isComplete ? "opacity-50" : isError ? "opacity-60" : "opacity-30"}`}>
                    {isComplete ? (
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                    ) : isError ? (
                      <span className="h-4 w-4 rounded-full bg-amber-400 shrink-0" />
                    ) : isRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#1e3a5f] shrink-0" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border-2 border-gray-300 shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${isRunning ? "text-[#1e3a5f]" : ""}`}>
                      {phasePrefix}{p?.name ?? labelMap[n]}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg opacity-30">
                <span className="h-4 w-4 rounded-full border-2 border-gray-300 shrink-0" />
                <span className="text-sm font-medium">Background Review</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-[#000741] dark:text-white">Military Verification Center</h1>
        <p className="text-muted-foreground mt-0.5">AI-powered multi-source verification for speakers and creators</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Total Profiles</p>
            <p className="text-2xl font-bold text-[#000741] dark:text-white">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Verified</p>
            <p className="text-2xl font-bold text-blue-700">{stats.verified}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Flagged</p>
            <p className="text-2xl font-bold text-red-600">{stats.flagged}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackfillCareerData}
            disabled={backfillRunning}
            className="text-xs"
          >
            {backfillRunning ? (
              <>
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                {backfillProgress.done}/{backfillProgress.total}
              </>
            ) : (
              <>
                <Briefcase className="h-3 w-3 mr-1.5" />
                Backfill Career Data
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReScoreAll}
            disabled={rescoring}
            className="text-xs"
          >
            {rescoring ? (
              <>
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                {rescoreProgress.done}/{rescoreProgress.total}
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Re-Score All
              </>
            )}
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1e3a5f] hover:bg-[#2d5282]">
                <Plus className="h-4 w-4 mr-2" />
                Add Verification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  New Verification
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs text-xs">
                        Creators must be in a Directory or List before they can be verified. You can also verify directly from Discovery, Directory, or List pages.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </DialogTitle>
              </DialogHeader>
              {addForm.profilePhotoUrl && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <img src={addForm.profilePhotoUrl} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{addForm.fullName}</p>
                    {addForm.instagramHandle && <p className="text-sm text-muted-foreground truncate">@{addForm.instagramHandle}</p>}
                  </div>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <Label>Full Name *</Label>
                  <div className="relative">
                    <Input
                      value={creatorSearch || addForm.fullName}
                      onChange={(e) => {
                        setCreatorSearch(e.target.value);
                        setAddForm((f) => ({ ...f, fullName: e.target.value }));
                      }}
                      onFocus={() => setShowCreatorDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCreatorDropdown(false), 200)}
                      placeholder="Search creators or type a name..."
                    />
                    {showCreatorDropdown && dirMembers.length > 0 && (
                      <div className="absolute z-50 w-full bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto mt-1">
                        <p className="px-3 py-2 text-xs text-muted-foreground border-b border-gray-100 dark:border-gray-700">Select a creator or type to search...</p>
                        {dirMembers
                          .filter((m) => {
                            if (!creatorSearch) return true;
                            const q = creatorSearch.toLowerCase();
                            return (m.creator_name ?? '').toLowerCase().includes(q) || (m.creator_handle ?? '').toLowerCase().includes(q);
                          })
                          .slice(0, 20)
                          .map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-left text-sm"
                              onClick={() => {
                                setAddForm((f) => ({
                                  ...f,
                                  fullName: m.creator_name ?? m.creator_handle,
                                  instagramHandle: (m.creator_handle ?? '').replace('@', ''),
                                  profilePhotoUrl: getCreatorAvatar(m) || '',
                                  claimedStatus: detectStatus(m.creator_name ?? ''),
                                }));
                                setCreatorSearch("");
                                setShowCreatorDropdown(false);
                              }}
                            >
                              {getCreatorAvatar(m) ? (
                                <img src={getCreatorAvatar(m)!} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {getAvatarFallback(m.creator_name ?? '')}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">{m.creator_name}</p>
                                <p className="text-xs text-muted-foreground truncate">@{m.creator_handle}</p>
                              </div>
                            </button>
                          ))}
                        {dirMembers.filter((m) => {
                          if (!creatorSearch) return true;
                          const q = creatorSearch.toLowerCase();
                          return (m.creator_name ?? '').toLowerCase().includes(q) || (m.creator_handle ?? '').toLowerCase().includes(q);
                        }).length === 0 && (
                          <p className="px-3 py-2 text-xs text-muted-foreground">No matching creators in directories</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Branch</Label>
                  <Select value={addForm.claimedBranch} onValueChange={(v) => setAddForm((f) => ({ ...f, claimedBranch: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={addForm.claimedStatus} onValueChange={(v) => setAddForm((f) => ({ ...f, claimedStatus: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active_duty">Active Duty</SelectItem>
                      <SelectItem value="veteran">Veteran</SelectItem>
                      <SelectItem value="military_spouse">Military Spouse</SelectItem>
                      <SelectItem value="gold_star">Gold Star Family</SelectItem>
                      <SelectItem value="reservist">Reservist / Guard</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>LinkedIn URL</Label>
                  <Input
                    value={addForm.linkedinUrl}
                    onChange={(e) => setAddForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Instagram Handle</label>
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <span className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-muted-foreground text-sm border-r">@</span>
                    <input
                      type="text"
                      placeholder="username"
                      value={addForm.instagramHandle}
                      onChange={(e) => setAddForm({ ...addForm, instagramHandle: e.target.value.replace('@', '') })}
                      className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    value={addForm.websiteUrl}
                    onChange={(e) => setAddForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={addForm.city}
                      onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))}
                      placeholder="e.g. San Diego"
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Select value={addForm.state} onValueChange={(v) => setAddForm((f) => ({ ...f, state: v }))}>
                      <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Zip</Label>
                    <Input
                      value={addForm.zip}
                      onChange={(e) => setAddForm((f) => ({ ...f, zip: e.target.value }))}
                      placeholder="92101"
                    />
                  </div>
                </div>
                <div>
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={addForm.notes}
                    onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional"
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleStartVerification}
                  disabled={pipelineRunning || !addForm.fullName.trim()}
                  className="w-full bg-[#1e3a5f] hover:bg-[#2d5282]"
                >
                  {pipelineRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Start Verification
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-800">
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Sources</TableHead>
                  <TableHead>Last Verified</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableRow
                      key={row.id}
                      className={cn("cursor-pointer border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-0 focus-visible:outline-none", expandedId === row.id && "bg-muted/50")}
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    >
                      <TableCell>
                        {expandedId === row.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        <div className="flex items-center gap-2">
                          {row.profile_photo_url ? (
                            <img
                              src={row.profile_photo_url}
                              alt={row.person_name}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.removeAttribute('style');
                              }}
                            />
                          ) : null}
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0" style={row.profile_photo_url ? { display: 'none' } : undefined}>
                            <span className="text-xs font-semibold text-blue-700">
                              {getAvatarFallback(row.person_name || '')}
                            </span>
                          </div>
                          <NameStatusIcon score={row.verification_score ?? 0} />
                          <InlineNameEdit id={row.id} name={row.person_name} onSave={fetchVerifications} />
                        </div>
                      </TableCell>
                      <TableCell>{row.claimed_branch ?? "—"}</TableCell>
                      <TableCell>
                        {(() => {
                          const displayType = (row as any).claimed_type || row.claimed_status;
                          if (!displayType) return <span className="text-gray-400">—</span>;
                          const lower = displayType.toLowerCase();
                          const isSpouse = lower.includes('spouse');
                          const isGoldStar = lower.includes('gold') && lower.includes('star');
                          const isFamily = lower.includes('family') && !isGoldStar;
                          if (isGoldStar) return (
                            <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">Gold Star</span>
                          );
                          if (isSpouse) return (
                            <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800">Military Spouse</span>
                          );
                          if (isFamily) return (
                            <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800">Military Family</span>
                          );
                          return (
                            <span className="inline-block rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
                              {displayType.replace(/_/g, " ")}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-default">
                                <Progress value={row.verification_score ?? 0} className="h-2 w-20" />
                                <span className="text-xs text-muted-foreground">{row.verification_score ?? 0}%</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
                              Confidence Score: Based on {(row.evidence_sources as EvidenceSource[] | null)?.length ?? 0} verified sources. Higher scores indicate stronger verification evidence.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{(row.evidence_sources as EvidenceSource[] | null)?.length ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {row.last_verified_at ? new Date(row.last_verified_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAddAsSpeaker(row); }}>
                                    <UserPlus className="h-4 w-4 mr-2" /> Add as Speaker
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditCreator(row); }}>
                                    <Pencil className="h-4 w-4 mr-2" /> Edit Creator
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate("/lists"); }}>
                                    <List className="h-4 w-4 mr-2" /> Add to List
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleInviteToEvent(row); }}>
                                    <Mail className="h-4 w-4 mr-2" /> Invite to Event
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExportProfile(row); }}>
                                    <Download className="h-4 w-4 mr-2" /> Export Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                                      <ChevronDown className="h-4 w-4 mr-2" /> Change Status
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                      <DropdownMenuItem onClick={async (e) => { e.stopPropagation(); await supabase.from("verifications").update({ status: "verified" }).eq("id", row.id); toast.success("Status changed to verified"); fetchVerifications(); }}>
                                        <ShieldCheck className="h-4 w-4 mr-2 text-blue-700" /> Verified
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={async (e) => { e.stopPropagation(); await supabase.from("verifications").update({ status: "pending" }).eq("id", row.id); toast.success("Status changed to pending"); fetchVerifications(); }}>
                                        <Clock className="h-4 w-4 mr-2 text-amber-600" /> Pending
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={async (e) => { e.stopPropagation(); await supabase.from("verifications").update({ status: "flagged" }).eq("id", row.id); toast.success("Status changed to flagged"); fetchVerifications(); }}>
                                        <AlertTriangle className="h-4 w-4 mr-2 text-red-600" /> Flagged
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={async (e) => { e.stopPropagation(); await supabase.from("verifications").update({ status: "rejected" }).eq("id", row.id); toast.success("Status changed to rejected"); fetchVerifications(); }}>
                                        <XCircle className="h-4 w-4 mr-2 text-red-600" /> Rejected
                                      </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReverify(row); }}>
                                    <RefreshCw className="h-4 w-4 mr-2" /> Re-verify
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(row.id); }}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {expandedId === row.id && expanded && (
                      <TableRow key={`${row.id}-exp`} className="border-none hover:bg-transparent">
                        <TableCell colSpan={8} className="p-0 border-none">
                          <ExpandedRow record={expanded} onRefresh={fetchVerifications} dirEnrichmentMap={dirEnrichmentMap} />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">No verification profiles yet. Add one to get started.</div>
          )}
        </CardContent>
      </Card>

      {/* Add as Speaker Modal */}
      <Dialog open={addSpeakerOpen} onOpenChange={setAddSpeakerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mic className="h-5 w-5" /> Add as Speaker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={speakerForm.name} onChange={(e) => setSpeakerForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Branch</Label>
              <Input value={speakerForm.branch} onChange={(e) => setSpeakerForm((f) => ({ ...f, branch: e.target.value }))} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={speakerForm.rank} onValueChange={(v) => setSpeakerForm((f) => ({ ...f, rank: v }))}>
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
              <Textarea value={speakerForm.bio} onChange={(e) => setSpeakerForm((f) => ({ ...f, bio: e.target.value }))} rows={3} />
            </div>
            <Button onClick={handleSaveSpeaker} className="w-full bg-[#1e3a5f] hover:bg-[#2d5282]">
              <UserPlus className="h-4 w-4 mr-2" /> Save Speaker
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Creator Modal */}
      <Dialog open={editCreatorOpen} onOpenChange={setEditCreatorOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" /> Edit Creator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Name</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Branch</Label>
                <Select value={editForm.branch} onValueChange={(v) => setEditForm((f) => ({ ...f, branch: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status / Category</Label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {["Veteran", "Active Duty", "Military Spouse", "Military Family", "Gold Star Family", "Reserve", "National Guard"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-2">
                  Confidence Score
                  {editForm.confidenceOverride && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">Manual Override</Badge>}
                </Label>
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={100} value={editForm.confidenceScore ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, confidenceScore: e.target.value === "" ? null : Number(e.target.value), confidenceOverride: true }))} placeholder="0-100" />
                </div>
              </div>
              <div>
                <Label>Verification Status</Label>
                <Select value={editForm.verificationStatus} onValueChange={(v) => {
                  setEditForm((f) => {
                    let score = f.confidenceScore;
                    let override = f.confidenceOverride;
                    // Auto-adjust confidence score to match status threshold
                    if (v === "verified" && (score == null || score < 80)) {
                      score = 80;
                      override = true;
                    } else if (v === "flagged" && (score == null || score >= 40)) {
                      score = 39;
                      override = true;
                    }
                    return { ...f, verificationStatus: v, confidenceScore: score, confidenceOverride: override };
                  });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Bio</Label>
              <Textarea value={editForm.bio} onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))} rows={3} placeholder="Creator bio..." />
            </div>

            <div>
              <Label>Photo URL</Label>
              <Input value={editForm.photoUrl} onChange={(e) => setEditForm((f) => ({ ...f, photoUrl: e.target.value }))} placeholder="https://..." />
              {editForm.photoUrl && (
                <div className="mt-1.5 flex items-center gap-2">
                  <img src={editForm.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <span className="text-xs text-muted-foreground truncate">{editForm.photoUrl}</span>
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Social Profiles</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Instagram</Label>
                  <Input value={editForm.instagram} onChange={(e) => setEditForm((f) => ({ ...f, instagram: e.target.value }))} placeholder="@handle" className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">TikTok</Label>
                  <Input value={editForm.tiktok} onChange={(e) => setEditForm((f) => ({ ...f, tiktok: e.target.value }))} placeholder="@handle" className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">YouTube</Label>
                  <Input value={editForm.youtube} onChange={(e) => setEditForm((f) => ({ ...f, youtube: e.target.value }))} placeholder="Channel URL" className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">LinkedIn</Label>
                  <Input value={editForm.linkedin} onChange={(e) => setEditForm((f) => ({ ...f, linkedin: e.target.value }))} placeholder="Profile URL" className="text-sm" />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Contact</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@..." className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Website</Label>
                  <Input value={editForm.website} onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://..." className="text-sm" />
                </div>
              </div>
            </div>

            <div>
              <Label>Internal Notes</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Internal notes..." />
            </div>

            <Button onClick={handleSaveEdit} disabled={editCreatorSaving || !editForm.name.trim()} className="w-full bg-[#1e3a5f] hover:bg-[#2d5282]">
              {editCreatorSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite to Event Modal */}
      <Dialog open={inviteEventOpen} onOpenChange={setInviteEventOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Invite to Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Invite <strong>{inviteRecord?.person_name}</strong> to an event.</p>
            <div>
              <Label>Select Event</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger><SelectValue placeholder="Choose an event..." /></SelectTrigger>
                <SelectContent>
                  {events.length === 0 ? (
                    <SelectItem value="_none" disabled>No events found</SelectItem>
                  ) : (
                    events.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSendInvite} disabled={!selectedEventId} className="w-full bg-[#1e3a5f] hover:bg-[#2d5282]">
              <Mail className="h-4 w-4 mr-2" /> Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete verification?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this verification record. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- YouTube Video Result Type ---
interface YouTubeVideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  relevanceScore?: number;
  url?: string;
  thumbnail_url?: string;
}

/** Extract a reliable YouTube thumbnail URL from various video object shapes */
function getThumbnail(video: YouTubeVideoResult): string | null {
  if (video.thumbnail_url) return video.thumbnail_url;
  if (video.videoId) return `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
  if (video.thumbnail) return video.thumbnail;
  // Extract videoId from URL
  const url = video.url || '';
  const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
  const id = match?.[1];
  if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  return null;
}

/** Get a clickable URL for a video */
function getVideoUrl(video: YouTubeVideoResult): string {
  if (video.url) return video.url;
  if (video.videoId) return `https://www.youtube.com/watch?v=${video.videoId}`;
  return '#';
}

function MediaTab({ record }: { record: VerificationRecord }) {
  const [videos, setVideos] = useState<YouTubeVideoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [lastSearchedAt, setLastSearchedAt] = useState<string | null>(null);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [autoSearchTriggered, setAutoSearchTriggered] = useState(false);
  const VISIBLE_COUNT = 6;

  // Load saved results on mount — check youtube_media first, then youtube_results (auto-run fallback)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
      const checks = (data?.manual_checks ?? {}) as Record<string, unknown>;

      // Primary: results from MediaTab's own YouTube API search
      const saved = checks.youtube_media as { videos?: (YouTubeVideoResult & { url?: string; type?: string })[] ; searched_at?: string } | undefined;
      if (saved?.videos?.length) {
        // Normalize: pipeline stores mediaAppearances { type, title, url, snippet }
        // which lack videoId/thumbnail — extract videoId from url for those
        const normalized = saved.videos.map((v) => {
          if (v.videoId && v.thumbnail) return v; // already proper shape
          const url = v.url || '';
          const m = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
          const vid = m?.[1];
          if (!vid) return v; // keep as-is, getThumbnail will handle
          return { ...v, videoId: vid, thumbnail: `https://img.youtube.com/vi/${vid}/hqdefault.jpg` };
        });
        setVideos(normalized);
        setLastSearchedAt(saved.searched_at ?? null);
        setHasSearched(true);
        setDbLoaded(true);
        return;
      }

      // Fallback: auto-run results stored at verification time (SerpAPI shape)
      const autoResults = checks.youtube_results as Array<{ title?: string; url?: string; thumbnail?: string; snippet?: string; videoId?: string; channelTitle?: string; description?: string }> | undefined;
      if (autoResults?.length) {
        const converted: YouTubeVideoResult[] = autoResults
          .map((r) => {
            let videoId = r.videoId ?? "";
            if (!videoId && r.url) {
              const urlMatch = r.url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
              if (urlMatch) videoId = urlMatch[1];
            }
            if (!videoId) return null;
            return {
              videoId,
              title: r.title ?? "Untitled",
              channelTitle: r.channelTitle ?? "",
              description: r.description ?? r.snippet ?? "",
              thumbnail: r.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              publishedAt: "",
            };
          })
          .filter((v): v is YouTubeVideoResult => v !== null);
        if (converted.length > 0) {
          setVideos(converted);
          setHasSearched(true);
        }
      }
      setDbLoaded(true);
    })();
  }, [record.id]);

  const saveResults = async (results: YouTubeVideoResult[]) => {
    const { data } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
    const existing = (data?.manual_checks ?? {}) as Record<string, unknown>;
    const now = new Date().toISOString();
    const { error: mediaSaveError } = await supabase.from("verifications").update({
      manual_checks: { ...existing, youtube_media: { videos: results, searched_at: now } },
    }).eq("id", record.id);
    if (mediaSaveError) console.error('MEDIA SAVE FAILED:', mediaSaveError);
    else console.log('MEDIA SAVED OK —', record.person_name, '|', results.length, 'videos');
    setLastSearchedAt(now);
  };

  const filterWithAI = async (candidates: YouTubeVideoResult[]): Promise<YouTubeVideoResult[]> => {
    if (candidates.length === 0) return candidates;

    const prompt = `You are filtering YouTube search results for a specific person.

The subject is: ${record.person_name}
Claimed military branch: ${record.claimed_branch ?? "Unknown"}
Claimed type: ${record.claimed_type ?? "Unknown"}

For each video below, rate 0-100 how likely it is to actually feature or be about THIS specific person (not someone with a similar name, and not generic military content that just happened to appear in search results).

Consider:
- Does the video title or description mention this person's name?
- Is the channel related to this person or interviewing them?
- Could this be a name collision with a different person?

Videos to evaluate:
${JSON.stringify(candidates.map((v) => ({ videoId: v.videoId, title: v.title, channelTitle: v.channelTitle, description: v.description })), null, 2)}

Return ONLY a JSON array like: [{"videoId": "...", "relevance_score": 85}, ...]
No markdown formatting, just the JSON array.`;

    try {
      const res = await fetch("/api/anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) return candidates;
      const data = await res.json();
      const text = (data.content?.[0]?.text ?? "").trim();
      const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      const scores: { videoId: string; relevance_score: number }[] = JSON.parse(jsonStr);
      const scoreMap = new Map(scores.map((s) => [s.videoId, s.relevance_score]));

      return candidates
        .map((v) => ({ ...v, relevanceScore: scoreMap.get(v.videoId) ?? 0 }))
        .filter((v) => (v.relevanceScore ?? 0) > 30)
        .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    } catch (e) {
      console.error("[MediaTab] AI filtering error:", e);
      return candidates;
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    setShowAll(false);
    try {
      const name = record.person_name;
      const branch = record.claimed_branch ?? "";
      const queries = [
        `"${name}"`,
        `"${name}" ${branch}`.trim(),
        `"${name}" military veteran`,
      ];
      const allVideos: YouTubeVideoResult[] = [];
      const seenIds = new Set<string>();

      for (const q of queries) {
        try {
          const params = new URLSearchParams({
            part: "snippet",
            type: "video",
            q,
            maxResults: "5",
          });
          const resp = await fetch(`/api/youtube?${params.toString()}`);
          if (!resp.ok) continue;
          const data = await resp.json();
          for (const item of data.items ?? []) {
            const id = item.id?.videoId;
            if (!id || seenIds.has(id)) continue;
            seenIds.add(id);
            allVideos.push({
              videoId: id,
              title: item.snippet?.title ?? "Untitled",
              channelTitle: item.snippet?.channelTitle ?? "",
              description: item.snippet?.description ?? "",
              thumbnail: id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : (item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? ""),
              publishedAt: item.snippet?.publishedAt ?? "",
            });
          }
        } catch {
          // continue with next query
        }
      }

      setSearching(false);
      setHasSearched(true);

      if (allVideos.length === 0) {
        setVideos([]);
        await saveResults([]);
        return;
      }

      // AI relevance filtering
      setFiltering(true);
      try {
        const filtered = await filterWithAI(allVideos);
        setVideos(filtered);
        await saveResults(filtered);
      } finally {
        setFiltering(false);
      }
    } catch {
      setHasSearched(true);
      setSearching(false);
    }
  };

  // Auto-trigger YouTube search if no saved data exists
  useEffect(() => {
    if (!dbLoaded || hasSearched || autoSearchTriggered || searching) return;
    setAutoSearchTriggered(true);
    handleSearch();
  }, [dbLoaded, hasSearched, autoSearchTriggered, searching]);

  const visibleVideos = showAll ? videos : videos.slice(0, VISIBLE_COUNT);
  const hiddenCount = videos.length - VISIBLE_COUNT;

  return (
    <div className="space-y-4">
      {!hasSearched && !searching && !filtering ? (
        <div className="text-center py-8">
          <Video className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <Loader2 className="h-5 w-5 animate-spin text-[#1e3a5f] mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading media data...</p>
        </div>
      ) : (
        <>
          {(searching || filtering) && (
            <Card className="pl-6 pr-10 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="flex items-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-[#1e3a5f]" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {searching ? `Searching YouTube for "${record.person_name}"...` : "AI is filtering results for relevance..."}
                </p>
              </CardContent>
            </Card>
          )}

          {!searching && !filtering && videos.length === 0 && hasSearched && (
            <div className="text-center py-6">
              <Video className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No videos found featuring {record.person_name}.</p>
              <p className="text-xs text-muted-foreground mt-1">This person may not have a significant YouTube presence.</p>
            </div>
          )}

          {!searching && !filtering && visibleVideos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleVideos.map((v, i) => {
                const thumb = getThumbnail(v);
                const href = getVideoUrl(v);
                return (
                  <a
                    key={v.videoId || `media-${i}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-[#1e3a5f] hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-video bg-gray-100 dark:bg-gray-900">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={v.title}
                          className="w-full h-full object-cover rounded-t-lg"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                          <Video className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                        <Play className="h-10 w-10 text-white drop-shadow-lg" />
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium line-clamp-2 group-hover:text-[#1e3a5f]">{v.title}</p>
                      {v.channelTitle && <p className="text-xs text-muted-foreground mt-1">{v.channelTitle}</p>}
                      {v.publishedAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(v.publishedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {!searching && !filtering && !showAll && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="text-sm text-[#1e3a5f] hover:underline flex items-center gap-1.5"
            >
              <ChevronDown className="h-4 w-4" />
              See {hiddenCount} more video{hiddenCount !== 1 ? "s" : ""}
            </button>
          )}
          {!searching && !filtering && showAll && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(false)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            >
              <ChevronRight className="h-4 w-4" />
              Show fewer
            </button>
          )}

          <div className="pt-2 flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleSearch} disabled={searching || filtering}>
              {(searching || filtering) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Re-search
            </Button>
            {lastSearchedAt && (
              <span className="text-xs text-muted-foreground">Last searched: {new Date(lastSearchedAt).toLocaleDateString()}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function BackgroundReviewTab({ personName, recordId, claimedBranch, locationContext, onRefresh }: {
  personName: string;
  recordId: string;
  claimedBranch?: string;
  locationContext?: string;
  onRefresh?: () => void;
}) {
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [aiFiltering, setAiFiltering] = useState(false);
  const [aiResults, setAiResults] = useState<AIFilteredCriminalResult[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [aiFailed, setAiFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [lastReviewedAt, setLastReviewedAt] = useState<string | null>(null);
  const VISIBLE_COUNT = 5;

  const [autoRunTriggered, setAutoRunTriggered] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);

  // Load saved results on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("verifications").select("manual_checks").eq("id", recordId).single();
      const checks = (data?.manual_checks ?? {}) as Record<string, unknown>;
      const saved = checks.background_review as { results?: AIFilteredCriminalResult[]; summary?: string; reviewed_at?: string; ai_failed?: boolean } | undefined;
      if (saved?.results?.length || saved?.summary) {
        setAiResults((saved.results ?? []) as AIFilteredCriminalResult[]);
        setAiSummary((saved.summary ?? "") as string);
        setLastReviewedAt((saved.reviewed_at ?? null) as string | null);
        setAiFailed(!!saved.ai_failed);
        setHasSearched(true);
      }
      setDbLoaded(true);
    })();
  }, [recordId]);

  const saveResults = async (results: AIFilteredCriminalResult[], summary: string, failed = false) => {
    const { data } = await supabase.from("verifications").select("manual_checks").eq("id", recordId).single();
    const existing = (data?.manual_checks ?? {}) as Record<string, unknown>;
    const now = new Date().toISOString();
    const { error: bgSaveError } = await supabase.from("verifications").update({
      manual_checks: { ...existing, background_review: { results, summary, reviewed_at: now, ai_failed: failed } },
    }).eq("id", recordId);
    if (bgSaveError) console.error('BACKGROUND REVIEW SAVE FAILED:', bgSaveError);
    else console.log('BACKGROUND REVIEW SAVED OK —', recordId, '|', results.length, 'results');
    setLastReviewedAt(now);
  };

  const handleRunBackgroundReview = async () => {
    setSearching(true);
    setAiResults([]);
    setAiSummary("");
    setAiFailed(false);
    setShowAll(false);
    try {
      const locSuffix = locationContext ? ` ${locationContext}` : "";
      const queries = [
        `"${personName}" controversy${locSuffix}`,
        `"${personName}" fraud OR scandal${locSuffix}`,
        `"${personName}" stolen valor`,
      ];
      const allResults: { title: string; url: string; snippet: string }[] = [];
      const seen = new Set<string>();
      for (const q of queries) {
        const serpResults = await searchSerp(q);
        for (const r of serpResults) {
          const url = r.link ?? "";
          if (seen.has(url)) continue;
          seen.add(url);
          allResults.push({
            title: r.title ?? "No title",
            url,
            snippet: r.snippet ?? "",
          });
        }
      }
      setSearching(false);
      setHasSearched(true);

      if (allResults.length === 0) {
        setAiResults([]);
        setAiSummary(`No public concerns found for ${personName}.`);
        await saveResults([], `No public concerns found for ${personName}.`);
        return;
      }

      // AI filtering
      setAiFiltering(true);
      try {
        const { filtered, summary, ai_failed } = await filterCriminalResults({
          personName,
          claimedBranch: claimedBranch ?? "Unknown",
          locationContext: locationContext ?? "",
          results: allResults,
        });
        setAiResults(filtered);
        setAiSummary(summary);
        setAiFailed(!!ai_failed);
        await saveResults(filtered, summary, !!ai_failed);
      } finally {
        setAiFiltering(false);
      }
    } catch {
      setSearching(false);
      setHasSearched(true);
    }
  };

  // Auto-run background review if no saved data exists
  useEffect(() => {
    if (!dbLoaded || hasSearched || autoRunTriggered || searching) return;
    setAutoRunTriggered(true);
    handleRunBackgroundReview();
  }, [dbLoaded, hasSearched, autoRunTriggered, searching]);

  // Determine concern dot color for each result
  const getConcernDot = (r: AIFilteredCriminalResult) => {
    const isStolenValor = /stolen valor|fraud/i.test(r.title + " " + r.snippet + " " + r.reasoning);
    if (r.concern_level === "high" || isStolenValor) return "bg-red-500";
    if (r.concern_level === "medium") return "bg-amber-400";
    return "bg-blue-500";
  };

  // Determine overall summary status — only flag "red" if AI confirms a high-relevance, high-concern result about this person
  const getSummaryStatus = () => {
    // Filter to only results the AI considers actually relevant to this person
    const relevant = aiResults.filter((r) => r.relevance_score > 50);
    if (relevant.length === 0) return "clear";
    const hasHighConcern = relevant.some((r) => r.concern_level === "high");
    if (hasHighConcern) return "red";
    const hasMediumConcern = relevant.some((r) => r.concern_level === "medium");
    if (hasMediumConcern) return "yellow";
    return "clear";
  };

  // Sort results by relevance (most relevant first)
  const sortedResults = [...aiResults].sort((a, b) => b.relevance_score - a.relevance_score);
  const visibleResults = showAll ? sortedResults : sortedResults.slice(0, VISIBLE_COUNT);
  const hiddenCount = sortedResults.length - VISIBLE_COUNT;

  return (
    <div className="space-y-4">
      {!hasSearched ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f] mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Running background review...</p>
        </div>
      ) : (
        <>
          {(searching || aiFiltering) && (
            <Card className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 pl-6 pr-10">
              <CardContent className="flex items-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-[#1e3a5f]" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {searching ? "Searching public records..." : `AI is analyzing results for relevance to ${personName}...`}
                </p>
              </CardContent>
            </Card>
          )}

          {!aiFiltering && !searching && hasSearched && (() => {
            if (aiFailed) return (
              <div className="flex items-center gap-2.5 py-3 px-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Background review incomplete — AI analysis unavailable. Click Re-run Background Review to retry.</p>
              </div>
            );
            const status = getSummaryStatus();
            if (status === "clear") return (
              <div className="flex items-center gap-2.5 py-3 px-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-800">
                <CheckCircle2 className="h-5 w-5 text-blue-700 shrink-0" />
                <p className="text-sm font-medium text-blue-800 dark:text-blue-400">No public concerns found for {personName}. Background review complete.</p>
              </div>
            );
            if (status === "yellow") return (
              <div className="flex items-center gap-2.5 py-3 px-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Some results may warrant review — see below</p>
              </div>
            );
            return (
              <div className="flex items-center gap-2.5 py-3 px-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Potential stolen valor or fraud results found — review carefully</p>
              </div>
            );
          })()}

          {!aiFiltering && !searching && !aiFailed && visibleResults.length > 0 && (
            <div className="space-y-2.5">
              {visibleResults.map((r, i) => (
                <Card key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 pl-6 pr-10">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${getConcernDot(r)}`} />
                      <div className="flex-1 min-w-0">
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-[#1e3a5f] hover:underline flex items-center gap-1 text-sm">
                          {r.title} <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.snippet}</p>
                        <p className="text-xs text-muted-foreground mt-1.5 italic">{r.reasoning}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!showAll && hiddenCount > 0 && (
                <button
                  onClick={() => setShowAll(true)}
                  className="text-sm text-[#1e3a5f] hover:underline flex items-center gap-1.5 pt-1"
                >
                  <ChevronDown className="h-4 w-4" />
                  Show {hiddenCount} more result{hiddenCount !== 1 ? "s" : ""}
                </button>
              )}
              {showAll && hiddenCount > 0 && (
                <button
                  onClick={() => setShowAll(false)}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 pt-1"
                >
                  <ChevronRight className="h-4 w-4" />
                  Show fewer results
                </button>
              )}
            </div>
          )}

          <div className="pt-2 flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleRunBackgroundReview} disabled={searching || aiFiltering}>
              {(searching || aiFiltering) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Re-run Background Review
            </Button>
            {lastReviewedAt && (
              <span className="text-xs text-muted-foreground">Last reviewed: {new Date(lastReviewedAt).toLocaleDateString()}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const READINESS_ITEMS: { key: string; label: string; auto: boolean }[] = [
  { key: "military_verified", label: "Military service verified", auto: true },
  { key: "no_criminal", label: "No background concerns", auto: true },
  { key: "id_verified", label: "ID / documents verified (DD-214, military ID)", auto: false },
  { key: "references_confirmed", label: "References confirmed", auto: false },
  { key: "availability_confirmed", label: "Availability confirmed", auto: false },
  { key: "media_kit", label: "Media kit received", auto: false },
  { key: "contract_signed", label: "Contract signed", auto: false },
];

/** Compact Speaker Readiness for the hero right column — no card wrapper, no booking notes. */
function CompactSpeakerReadiness({ record, onRefresh }: { record: VerificationRecord; onRefresh?: () => void }) {
  const rawChecks = (record.manual_checks ?? {}) as Record<string, unknown>;
  const [localChecks, setLocalChecks] = useState<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {};
    for (const item of READINESS_ITEMS) {
      if (!item.auto) out[item.key] = !!rawChecks[item.key];
    }
    return out;
  });
  const [saving, setSaving] = useState(false);
  const bookingNotes = (rawChecks.booking_notes as string) ?? "";

  const autoChecks: Record<string, boolean> = {
    military_verified: (record.verification_score ?? 0) >= 80,
    no_criminal: !((record.red_flags as RedFlag[] | null)?.length),
  };

  const checkedCount = READINESS_ITEMS.filter((item) =>
    item.auto ? autoChecks[item.key] : localChecks[item.key]
  ).length;
  const total = READINESS_ITEMS.length;
  const progressPct = Math.round((checkedCount / total) * 100);

  const handleToggle = async (key: string) => {
    const updated = { ...localChecks, [key]: !localChecks[key] };
    setLocalChecks(updated);
    setSaving(true);
    // Merge into existing manual_checks to preserve career/media/background data
    const { data: freshRow } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
    const existing = (freshRow?.manual_checks ?? {}) as Record<string, unknown>;
    const { error: toggleErr } = await supabase.from("verifications").update({
      manual_checks: { ...existing, ...updated, booking_notes: bookingNotes },
    }).eq("id", record.id);
    if (toggleErr) console.error('SPEAKER READINESS TOGGLE SAVE FAILED:', toggleErr);
    setSaving(false);
    onRefresh?.();
  };

  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
        <Mic className="h-3 w-3" /> Speaker Readiness
        {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </p>
      <div className="mb-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{checkedCount}/{total}</span>
          <span className="text-xs text-muted-foreground">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-1" />
      </div>
      <div className="flex flex-col gap-0.5">
        {READINESS_ITEMS.map((item) => {
          const isAuto = item.auto;
          const checked = isAuto ? autoChecks[item.key] : localChecks[item.key];
          return (
            <label key={item.key} className={cn("flex items-center gap-1.5 py-0", isAuto ? "opacity-70 cursor-default" : "cursor-pointer group")}>
              <input
                type="checkbox"
                checked={!!checked}
                onChange={isAuto ? undefined : () => handleToggle(item.key)}
                disabled={isAuto}
                className="h-2.5 w-2.5 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
              />
              <span className={cn("text-xs flex-1 leading-none", !isAuto && "group-hover:text-[#000741] dark:group-hover:text-white transition-colors")}>
                {item.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SpeakerReadinessAssessment({ record, onRefresh }: { record: VerificationRecord; onRefresh?: () => void }) {
  const [open, setOpen] = useState(false);
  const rawChecks = (record.manual_checks ?? {}) as Record<string, unknown>;
  const [localChecks, setLocalChecks] = useState<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {};
    for (const item of READINESS_ITEMS) {
      if (!item.auto) out[item.key] = !!rawChecks[item.key];
    }
    return out;
  });
  const [bookingNotes, setBookingNotes] = useState((rawChecks.booking_notes as string) ?? "");
  const [saving, setSaving] = useState(false);

  const autoChecks: Record<string, boolean> = {
    military_verified: (record.verification_score ?? 0) >= 80,
    no_criminal: !((record.red_flags as RedFlag[] | null)?.length),
  };

  const checkedCount = READINESS_ITEMS.filter((item) =>
    item.auto ? autoChecks[item.key] : localChecks[item.key]
  ).length;
  const total = READINESS_ITEMS.length;
  const progressPct = Math.round((checkedCount / total) * 100);

  const handleToggle = async (key: string) => {
    const updated = { ...localChecks, [key]: !localChecks[key] };
    setLocalChecks(updated);
    setSaving(true);
    await supabase.from("verifications").update({
      manual_checks: { ...updated, booking_notes: bookingNotes },
    }).eq("id", record.id);
    setSaving(false);
    onRefresh?.();
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    await supabase.from("verifications").update({
      manual_checks: { ...localChecks, booking_notes: bookingNotes },
    }).eq("id", record.id);
    setSaving(false);
    toast.success("Booking notes saved");
  };

  return (
    <Card className="pl-6 pr-10 rounded-xl border border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between py-4">
        <CardTitle className="text-lg font-bold text-[#000741] dark:text-white flex items-center gap-2 cursor-pointer m-0" onClick={() => setOpen(!open)}>
          {open ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <Mic className="h-5 w-5" /> Speaker Readiness Assessment
          {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <StatusDot status={checkedCount >= 5 ? 'green' : checkedCount >= 3 ? 'yellow' : 'red'} tooltip={checkedCount >= 5 ? "Complete \u2713" : checkedCount >= 3 ? "Moderate readiness — review remaining items" : "Low readiness score — review requirements"} />
        </CardTitle>
      </CardHeader>
      {open && <CardContent className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Clearance: {checkedCount}/{total}</span>
            <span className="text-xs text-muted-foreground">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
        {READINESS_ITEMS.map((item) => {
          const isAuto = item.auto;
          const checked = isAuto ? autoChecks[item.key] : localChecks[item.key];
          return (
            <label key={item.key} className={cn("flex items-center gap-3", isAuto ? "opacity-70 cursor-default" : "cursor-pointer group")}>
              <input
                type="checkbox"
                checked={!!checked}
                onChange={isAuto ? undefined : () => handleToggle(item.key)}
                disabled={isAuto}
                className="h-4 w-4 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
              />
              <span className={cn("text-sm flex-1", !isAuto && "group-hover:text-[#000741] dark:group-hover:text-white transition-colors")}>
                {item.label}
              </span>
              {isAuto && <span className="text-xs text-muted-foreground">Auto</span>}
            </label>
          );
        })}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <Label className="text-sm font-medium">Booking Notes</Label>
          <Textarea
            value={bookingNotes}
            onChange={(e) => setBookingNotes(e.target.value)}
            placeholder="Notes about speaker availability, requirements, accommodations..."
            rows={3}
            className="mt-1"
          />
          <Button variant="outline" size="sm" onClick={handleSaveNotes} className="mt-2">
            <Save className="h-3.5 w-3.5 mr-1.5" /> Save Notes
          </Button>
        </div>
      </CardContent>}
    </Card>
  );
}

/** Inline Speaker Readiness for the collapsible sections list — no card wrapper, outer row controls open/close. */
function SpeakerReadinessInline({ record, onRefresh, isOpen, onToggle }: { record: VerificationRecord; onRefresh?: () => void; isOpen: boolean; onToggle: () => void }) {
  const rawChecks = (record.manual_checks ?? {}) as Record<string, unknown>;
  const [localChecks, setLocalChecks] = useState<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {};
    for (const item of READINESS_ITEMS) {
      if (!item.auto) out[item.key] = !!rawChecks[item.key];
    }
    return out;
  });
  const [bookingNotes, setBookingNotes] = useState((rawChecks.booking_notes as string) ?? "");
  const [saving, setSaving] = useState(false);

  const autoChecks: Record<string, boolean> = {
    military_verified: (record.verification_score ?? 0) >= 80,
    no_criminal: !((record.red_flags as RedFlag[] | null)?.length),
  };

  const checkedCount = READINESS_ITEMS.filter((item) =>
    item.auto ? autoChecks[item.key] : localChecks[item.key]
  ).length;
  const total = READINESS_ITEMS.length;
  const progressPct = Math.round((checkedCount / total) * 100);

  const handleToggle = async (key: string) => {
    const updated = { ...localChecks, [key]: !localChecks[key] };
    setLocalChecks(updated);
    setSaving(true);
    // Merge into existing manual_checks to preserve career/media/background data
    const { data: freshRow2 } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
    const existing2 = (freshRow2?.manual_checks ?? {}) as Record<string, unknown>;
    const { error: toggleErr2 } = await supabase.from("verifications").update({
      manual_checks: { ...existing2, ...updated, booking_notes: bookingNotes },
    }).eq("id", record.id);
    if (toggleErr2) console.error('SPEAKER READINESS INLINE TOGGLE SAVE FAILED:', toggleErr2);
    setSaving(false);
    onRefresh?.();
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    const { data: freshRow2 } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
    const existing2 = (freshRow2?.manual_checks ?? {}) as Record<string, unknown>;
    const { error: notesErr2 } = await supabase.from("verifications").update({
      manual_checks: { ...existing2, ...localChecks, booking_notes: bookingNotes },
    }).eq("id", record.id);
    if (notesErr2) console.error('BOOKING NOTES SAVE FAILED:', notesErr2);
    setSaving(false);
    toast.success("Booking notes saved");
  };

  return (
    <section className="pl-4 ml-6 pr-8 max-w-full overflow-hidden py-3">
      <button onClick={onToggle} className="flex items-center gap-2 w-full text-left group focus:outline-none focus:ring-0">
        {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
        <Mic className="h-5 w-5 text-[#1e3a5f]" />
        <h3 className="text-base font-semibold text-[#000741] dark:text-white">Speaker Readiness Assessment</h3>
        {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        <StatusDot status={checkedCount >= 5 ? 'green' : checkedCount >= 3 ? 'yellow' : 'red'} tooltip={checkedCount >= 5 ? "Complete \u2713" : checkedCount >= 3 ? "Moderate readiness — review remaining items" : "Low readiness score — review requirements"} />
      </button>
      {isOpen && (
        <div className="ml-6 mt-4 mb-2">
          <div className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm pl-6 pr-10 py-4 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Clearance: {checkedCount}/{total}</span>
                <span className="text-xs text-muted-foreground">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>
            {READINESS_ITEMS.map((item) => {
              const isAuto = item.auto;
              const checked = isAuto ? autoChecks[item.key] : localChecks[item.key];
              return (
                <label key={item.key} className={cn("flex items-center gap-3 py-0.5", isAuto ? "opacity-70 cursor-default" : "cursor-pointer group")}>
                  <input
                    type="checkbox"
                    checked={!!checked}
                    onChange={isAuto ? undefined : () => handleToggle(item.key)}
                    disabled={isAuto}
                    className="h-4 w-4 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                  />
                  <span className={cn("text-sm flex-1", !isAuto && "group-hover:text-[#000741] dark:group-hover:text-white transition-colors")}>
                    {item.label}
                  </span>
                  {isAuto && <span className="text-xs text-muted-foreground">Auto</span>}
                </label>
              );
            })}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <Label className="text-sm font-medium">Booking Notes</Label>
              <Textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="Notes about speaker availability, requirements, accommodations..."
                rows={3}
                className="mt-1"
              />
              <Button variant="outline" size="sm" onClick={handleSaveNotes} className="mt-2">
                <Save className="h-3.5 w-3.5 mr-1.5" /> Save Notes
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const SOCIAL_PLATFORM_MAP: Record<string, { icon: string; label: string; base: string; pillColor: string }> = {
  instagram: { icon: "📸", label: "Instagram", base: "https://instagram.com/", pillColor: "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800" },
  youtube: { icon: "▶️", label: "YouTube", base: "https://youtube.com/@", pillColor: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
  twitter: { icon: "𝕏", label: "X", base: "https://twitter.com/", pillColor: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600" },
  tiktok: { icon: "🎵", label: "TikTok", base: "https://tiktok.com/@", pillColor: "bg-slate-900 text-white border-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:text-white dark:border-slate-600" },
  facebook: { icon: "f", label: "Facebook", base: "https://facebook.com/", pillColor: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  linkedin: { icon: "in", label: "LinkedIn", base: "https://linkedin.com/in/", pillColor: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
};

const SOCIAL_URL_PATTERNS: { network: string; pattern: RegExp; extractHandle: (url: string) => string }[] = [
  { network: "instagram", pattern: /instagram\.com\/([a-zA-Z0-9_.]+)/i, extractHandle: (u) => u.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i)?.[1] ?? "" },
  { network: "tiktok", pattern: /tiktok\.com\/@?([a-zA-Z0-9_.]+)/i, extractHandle: (u) => u.match(/tiktok\.com\/@?([a-zA-Z0-9_.]+)/i)?.[1] ?? "" },
  { network: "youtube", pattern: /youtube\.com\/(?:@|channel\/|c\/)([a-zA-Z0-9_-]+)/i, extractHandle: (u) => u.match(/youtube\.com\/(?:@|channel\/|c\/)([a-zA-Z0-9_-]+)/i)?.[1] ?? "" },
  { network: "twitter", pattern: /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i, extractHandle: (u) => u.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i)?.[1] ?? "" },
  { network: "facebook", pattern: /facebook\.com\/([a-zA-Z0-9_.]+)/i, extractHandle: (u) => u.match(/facebook\.com\/([a-zA-Z0-9_.]+)/i)?.[1] ?? "" },
  { network: "linkedin", pattern: /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i, extractHandle: (u) => u.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i)?.[1] ?? "" },
];

function SocialVerificationSection({ record }: { record: VerificationRecord }) {
  const igHandle = (record as any).instagram_handle || record.source_username || null;
  const linkedinUrl = record.linkedin_url || null;
  const websiteUrl = record.website_url || null;
  const manualChecks = record.manual_checks as Record<string, unknown> | null;

  // Fetch linked directory member data for platform_urls, platforms, enrichment_data
  const [dirMember, setDirMember] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (!igHandle) return;
    (async () => {
      const { data } = await supabase
        .from("directory_members")
        .select("platforms, platform_urls, enrichment_data")
        .eq("creator_handle", igHandle)
        .limit(1)
        .maybeSingle();
      if (data) setDirMember(data as Record<string, unknown>);
    })();
  }, [igHandle]);

  // IC enrichment data is the source of truth for platforms
  const icPlatforms = dirMember?.enrichment_data
    ? getPlatformsFromEnrichmentData(dirMember.enrichment_data)
    : [];

  // Fallback: build from other sources only for platforms IC doesn't cover
  const seen = new Set<string>(icPlatforms.map((p) => p.platform));
  const fallbackPills: { platform: string; handle: string; url: string }[] = [];

  const addPill = (platform: string, handle: string, url: string) => {
    const key = platform.toLowerCase();
    if (seen.has(key) || !handle) return;
    seen.add(key);
    fallbackPills.push({ platform: key, handle, url });
  };

  // Explicit fields
  if (igHandle && !seen.has("instagram")) addPill("instagram", igHandle, `https://instagram.com/${igHandle}`);

  // Saved social_profiles from verification pipeline
  const savedProfiles = manualChecks?.social_profiles as { network: string; url: string }[] | undefined;
  if (Array.isArray(savedProfiles)) {
    for (const sp of savedProfiles) {
      const network = sp.network?.toLowerCase();
      if (network === "linkedin") continue; // skip LinkedIn unless from IC
      const info = SOCIAL_PLATFORM_MAP[network];
      if (!info || seen.has(network)) continue;
      const matcher = SOCIAL_URL_PATTERNS.find((p) => p.network === network);
      const handle = matcher ? matcher.extractHandle(sp.url) : "";
      addPill(network, handle || record.person_name.toLowerCase().replace(/\s+/g, ""), sp.url || info.base + handle);
    }
  }

  const hasAnySocial = icPlatforms.length > 0 || fallbackPills.length > 0 || !!websiteUrl;

  return (
    <Card className="rounded-xl border border-gray-200 dark:border-gray-800 pl-6 pr-10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4" /> Social Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasAnySocial ? (
          <p className="text-sm text-muted-foreground">No social media profiles found.</p>
        ) : (
          <>
            {/* Platform pills row — IC enrichment data first, then fallbacks */}
            {(icPlatforms.length > 0 || fallbackPills.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {icPlatforms.map((p) => (
                  <a
                    key={p.platform}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-sm transition-colors ${p.pillClass}`}
                  >
                    <span className="font-medium">{p.label}</span>
                    <span className="opacity-60">@{p.username}</span>
                  </a>
                ))}
                {fallbackPills.map(({ platform, handle, url }) => {
                  const info = SOCIAL_PLATFORM_MAP[platform];
                  if (!info) return null;
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-sm transition-colors ${info.pillColor}`}
                    >
                      <span className="font-medium">{info.label}</span>
                      <span className="text-gray-400">@{handle}</span>
                    </a>
                  );
                })}
              </div>
            )}
            {/* Website */}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-full text-sm hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <span>🌐</span>
                <span className="font-medium">Website</span>
                <span className="text-gray-400 truncate max-w-[200px]">{websiteUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
              </a>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RawSourceCard({ url, markdown }: { url: string; markdown: string }) {
  const [expanded, setExpanded] = useState(false);
  const cleaned = stripMarkdown(markdown);
  const lines = cleaned.split("\n").filter((l) => l.trim());
  const preview = lines.slice(0, 4).join("\n");
  const hasMore = lines.length > 4;

  return (
    <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#1e3a5f] hover:underline flex items-center gap-1">
            {new URL(url).hostname}{new URL(url).pathname.slice(0, 60)} <ExternalLink className="h-3 w-3" />
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="text-sm text-muted-foreground whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: highlightMilitaryText(expanded ? cleaned : preview) }}
        />
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[#1e3a5f] hover:underline mt-2 flex items-center gap-1"
          >
            {expanded ? <><ChevronDown className="h-3 w-3" /> Show less</> : <><ChevronRight className="h-3 w-3" /> Show more ({lines.length - 4} more lines)</>}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

/* DeepAnalysisTab removed — replaced by IntelligenceSummary in ExpandedRow */

function CareerTrackTab({ record }: { record: VerificationRecord }) {
  const pdlData = record.pdl_data as PDLResponse | null;
  const firecrawlData = (record.firecrawl_data ?? []) as { url: string; markdown?: string }[];
  const sources = (record.evidence_sources ?? []) as EvidenceSource[];

  const [careerResult, setCareerResult] = useState<EnhancedCareerResult | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const hasWebSources = firecrawlData.length > 0 || sources.length > 0;

  // Load cached results on mount — if empty but ai_analysis exists, auto-extract from it
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("verifications").select("manual_checks, ai_analysis").eq("id", record.id).single();
      const checks = (data?.manual_checks ?? {}) as Record<string, unknown>;
      const saved = checks.career_track as { result?: EnhancedCareerResult; generated_at?: string } | undefined;
      const result = saved?.result;
      const hasData = result && (
        (result.career?.length ?? 0) > 0 ||
        (result.education?.length ?? 0) > 0 ||
        (result.awards?.length ?? 0) > 0 ||
        !!result.military_summary?.branch
      );
      if (hasData) {
        setCareerResult(result!);
        setLastGenerated(saved?.generated_at ?? null);
        setExtracted(true);
        return;
      }

      // Fallback: extract career from ai_analysis if available
      const aiAnalysis = data?.ai_analysis as string | null;
      if (aiAnalysis && aiAnalysis.length > 100) {
        console.log("[CareerTrack] No career data found, auto-extracting from ai_analysis...");
        setExtracting(true);
        try {
          const extracted = await extractCareerFromAIAnalysis({
            personName: record.person_name,
            aiAnalysis,
            claimedBranch: record.claimed_branch ?? undefined,
          });
          setCareerResult(extracted);
          setExtracted(true);
          await saveResults(extracted);
          console.log("[CareerTrack] Auto-extracted from ai_analysis:", {
            branch: extracted.military_summary?.branch,
            career: extracted.career?.length,
            postService: extracted.post_service?.length,
          });
        } catch (err) {
          console.warn("[CareerTrack] AI analysis fallback failed:", err);
          setExtracted(true);
        } finally {
          setExtracting(false);
        }
      }
    })();
  }, [record.id]);

  const saveResults = async (result: EnhancedCareerResult) => {
    const { data } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
    const existing = (data?.manual_checks ?? {}) as Record<string, unknown>;
    const now = new Date().toISOString();
    const { error: careerSaveError } = await supabase.from("verifications").update({
      manual_checks: { ...existing, career_track: { result, generated_at: now } },
    }).eq("id", record.id);
    if (careerSaveError) console.error('CAREER SAVE FAILED:', careerSaveError);
    else console.log('CAREER SAVED OK —', record.person_name, '| entries:', result.career?.length ?? 0);
    setLastGenerated(now);
  };

  // Build PDL summary string to feed into AI extraction for richer context
  const buildPdlSummary = (): string => {
    if (!pdlData) return "";
    const parts: string[] = [];
    if (pdlData.employment?.length) {
      const jobs = (pdlData.employment as any[]).map((j) => `${j.title ?? ""} at ${j.organization ?? j.company ?? ""} (${j.start_date ?? "?"} - ${j.end_date ?? "Present"})`);
      parts.push("Employment: " + jobs.join("; "));
    }
    if (pdlData.education?.length) {
      const eds = (pdlData.education as any[]).map((e) => `${e.degree ?? ""} from ${e.school ?? ""}`);
      parts.push("Education: " + eds.join("; "));
    }
    if ((pdlData as any).summary) parts.push("Summary: " + String((pdlData as any).summary));
    if ((pdlData as any).headline) parts.push("Headline: " + String((pdlData as any).headline));
    return parts.join("\n");
  };

  const handleExtract = async () => {
    setExtracting(true);
    setExtractError("");
    try {
      const firecrawlContent = firecrawlData.map((f) => f.markdown ?? "").join("\n\n---\n\n");
      const serpSnippets = sources.map((s) => `${s.title}: ${s.snippet}`).join("\n");
      const result = await extractCareerTimeline({
        personName: record.person_name,
        firecrawlContent,
        serpSnippets,
        claimedBranch: record.claimed_branch ?? undefined,
        notesField: record.notes ?? undefined,
        pdlSummary: buildPdlSummary() || undefined,
      });
      // Check if extraction returned useful data
      const hasData = result.career.length > 0 || result.education.length > 0 || result.awards.length > 0 || !!result.military_summary?.branch;
      if (hasData) {
        setCareerResult(result);
        setExtracted(true);
        await saveResults(result);
        return;
      }
      // Primary extraction returned empty — fallback to ai_analysis
      const aiAnalysis = record.ai_analysis;
      if (aiAnalysis && aiAnalysis.length > 100) {
        console.log("[CareerTrack] Primary extraction empty, falling back to ai_analysis...");
        const fallback = await extractCareerFromAIAnalysis({
          personName: record.person_name,
          aiAnalysis,
          claimedBranch: record.claimed_branch ?? undefined,
        });
        setCareerResult(fallback);
        setExtracted(true);
        await saveResults(fallback);
        return;
      }
      setCareerResult(result);
      setExtracted(true);
      await saveResults(result);
    } catch (err) {
      console.error("[CareerTrack] Extraction failed:", err);
      // Try ai_analysis fallback on error
      try {
        const aiAnalysis = record.ai_analysis;
        if (aiAnalysis && aiAnalysis.length > 100) {
          console.log("[CareerTrack] Primary failed, trying ai_analysis fallback...");
          const fallback = await extractCareerFromAIAnalysis({
            personName: record.person_name,
            aiAnalysis,
            claimedBranch: record.claimed_branch ?? undefined,
          });
          setCareerResult(fallback);
          setExtracted(true);
          await saveResults(fallback);
          return;
        }
      } catch (fallbackErr) {
        console.warn("[CareerTrack] AI analysis fallback also failed:", fallbackErr);
      }
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
      setExtracted(true);
    } finally {
      setExtracting(false);
    }
  };

  const handleRegenerate = () => {
    setCareerResult(null);
    setExtracted(false);
    handleExtract();
  };

  const ms = careerResult?.military_summary;
  const careerEntries = careerResult?.career ?? [];
  const educationEntries = careerResult?.education ?? [];
  const awards = careerResult?.awards ?? [];
  const postService = careerResult?.post_service ?? [];
  const milEducation = educationEntries.filter((e) => e.is_military);
  const civEducation = educationEntries.filter((e) => !e.is_military);

  const notIdentified = <span className="text-gray-400 italic text-xs">Not identified</span>;

  // Branch color mapping
  const branchColor = (branch: string) => {
    const b = branch.toLowerCase();
    if (b.includes("army")) return "border-green-600";
    if (b.includes("navy")) return "border-blue-700";
    if (b.includes("marine")) return "border-red-700";
    if (b.includes("air force")) return "border-blue-500";
    if (b.includes("coast guard")) return "border-orange-500";
    if (b.includes("space")) return "border-gray-700";
    return "border-blue-600";
  };

  if (extracting) {
    return (
      <div className="flex items-center gap-3 py-12 justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#1e3a5f]" />
        <p className="text-sm text-muted-foreground">Extracting comprehensive career data from all sources...</p>
      </div>
    );
  }

  if (!extracted && !careerResult) {
    return (
      <div className="text-center py-12">
        <Briefcase className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-3">No career data extracted yet.</p>
        <Button variant="outline" size="sm" onClick={handleExtract}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Extract Career Data
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Regenerate + timestamp header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">AI Extracted</Badge>
          {lastGenerated && (
            <span className="text-xs text-muted-foreground">Last generated: {new Date(lastGenerated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          )}
        </div>
        <button onClick={handleRegenerate} disabled={extracting} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50">
          {extracting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Regenerate
        </button>
      </div>

      {/* Combined Career Card */}
      <Card className="rounded-xl bg-white dark:bg-gray-950 shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-0">

        {/* ── Military Service ── */}
        {ms && ms.branch && (
          <>
            <div className="border-l-4 border-blue-600 pl-4 pt-2 pb-4">
              <h4 className="text-base font-semibold flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-blue-700" /> Military Service
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-6">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</p>
                    <p className="font-semibold text-sm mt-0.5">{ms.rank || notIdentified}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">MOS / Rate / AFSC</p>
                    <p className="font-semibold text-sm mt-0.5">{ms.mos || notIdentified}</p>
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</p>
                    <p className="text-sm mt-0.5">{ms.branch || notIdentified}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Service Dates</p>
                    <p className="text-sm mt-0.5">{ms.service_dates || notIdentified}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Transition Year</p>
                    <p className="text-sm mt-0.5">{ms.transition_year || notIdentified}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unit(s)</p>
                  {ms.units.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {ms.units.map((u, i) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">{u}</Badge>
                      ))}
                    </div>
                  ) : notIdentified}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Deployments</p>
                  {ms.deployments.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {ms.deployments.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Target className="h-3 w-3 text-red-500 shrink-0" />
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  ) : notIdentified}
                </div>
                {milEducation.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Military Education</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {milEducation.map((e, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-normal">
                          {e.school}{e.degree ? ` — ${e.degree}` : ""}{e.dates ? ` (${e.dates})` : ""}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Post-Service Career</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
            </div>
          </>
        )}

        {/* ── Post-Service Career ── */}
        <div className="border-l-4 border-blue-500 pl-4 pt-2 pb-4">
          <h4 className="text-base font-semibold flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-blue-500" /> Post-Service Career
          </h4>
          {postService.length > 0 ? (
            <ul className="space-y-2">
              {postService.map((ps, i) => (
                <li key={i} className="flex items-start gap-3 py-1">
                  <ChevronRight className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{ps.role}{ps.org ? ` — ${ps.org}` : ""}</p>
                    {ps.dates && <p className="text-xs text-muted-foreground">{ps.dates}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 italic text-sm">No post-service career identified</p>
          )}
        </div>

        {/* ── Career Timeline ── */}
        {careerEntries.length > 0 && (
          <>
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Career Timeline</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
            </div>
            <div className="border-l-4 border-green-500 pl-4 pt-2 pb-4">
              <h4 className="text-base font-semibold flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-green-600" /> Career Timeline
              </h4>
              <ul className="space-y-3">
                {careerEntries.map((entry, i) => (
                  <li
                    key={i}
                    className={cn(
                      "pl-4 py-3 border-l-4 rounded-r-lg",
                      entry.is_military
                        ? cn("bg-blue-50/50 dark:bg-blue-950/20", branchColor(entry.org))
                        : "border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{entry.org}</p>
                      {entry.is_military && <ShieldCheck className="h-3.5 w-3.5 text-blue-700 shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entry.rank && <span className="font-medium">{entry.rank} — </span>}
                      {entry.title}
                      {entry.mos && <span className="text-xs ml-1 text-gray-500">({entry.mos})</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {entry.dates && <span>{entry.dates}</span>}
                      {entry.location && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{entry.location}</span>
                      )}
                    </div>
                    {entry.units && entry.units.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {entry.units.map((u, j) => (
                          <Badge key={j} variant="outline" className="text-[10px] py-0 px-1.5 font-normal">{u}</Badge>
                        ))}
                      </div>
                    )}
                    {entry.deployments && entry.deployments.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {entry.deployments.map((d, j) => (
                          <span key={j} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Target className="h-2.5 w-2.5 text-red-400" /> {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </Card>

      {/* Civilian Education */}
      {civEducation.length > 0 && (
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 pl-6 pr-10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> Education
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {civEducation.map((e, i) => (
                <li key={i} className="flex items-start gap-3 pl-4 border-l-4 border-blue-300 dark:border-blue-700 py-2">
                  <div>
                    <p className="font-medium text-sm">{e.school}</p>
                    {e.degree && <p className="text-sm text-muted-foreground">{e.degree}</p>}
                    {e.dates && <p className="text-xs text-muted-foreground">{e.dates}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {extractError && (
        <p className="text-xs text-red-500 text-center">Error: {extractError}</p>
      )}
    </div>
  );
}

function StatusDot({ status, tooltip }: { status: 'red' | 'yellow' | 'green'; tooltip?: string }) {
  const dot = <span className={`inline-block w-2.5 h-2.5 rounded-full ml-2 flex-shrink-0 ${status === 'green' ? 'bg-green-500' : status === 'yellow' ? 'bg-amber-400' : 'bg-red-400'}`} />;
  if (!tooltip) return dot;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{dot}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[220px]">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ExpandedRow({ record, onRefresh, dirEnrichmentMap }: { record: VerificationRecord; onRefresh?: () => void; dirEnrichmentMap: Record<string, unknown> }) {
  const [reverifying, setReverifying] = useState(false);
  const [reverifyPhase, setReverifyPhase] = useState("");
  const [reverifyProgress, setReverifyProgress] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const [editNotes, setEditNotes] = useState(record.notes ?? "");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [careerOpen, setCareerOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [speakerReadinessOpen, setSpeakerReadinessOpen] = useState(false);
  const [additionalSearchOpen, setAdditionalSearchOpen] = useState(false);
  const [additionalQuery, setAdditionalQuery] = useState("");
  const [additionalSearching, setAdditionalSearching] = useState(false);
  // Per-section regenerating states
  const [regenEvidence, setRegenEvidence] = useState(false);
  const [regenSocial, setRegenSocial] = useState(false);
  const [regenMedia, setRegenMedia] = useState(false);
  const [regenBackground, setRegenBackground] = useState(false);
  const [regenAI, setRegenAI] = useState(false);

  const sources = (record.evidence_sources ?? []) as EvidenceSource[];
  const redFlags = (record.red_flags ?? []) as RedFlag[];
  const pdlData = record.pdl_data as PDLResponse | null;

  // Phase labels for progress display
  const PHASE_LABELS: Record<number, { label: string; pct: number }> = {
    1: { label: "Enriching profile (PDL)...", pct: 10 },
    2: { label: "Searching the web...", pct: 25 },
    5: { label: "Finding media appearances...", pct: 40 },
    7: { label: "Validating social profiles...", pct: 55 },
    3: { label: "Deep-extracting web pages...", pct: 65 },
    6: { label: "Extracting career timeline...", pct: 80 },
    4: { label: "Generating intelligence summary...", pct: 92 },
  };

  const handleQuickReverify = async () => {
    setReverifying(true);
    setReverifyPhase("Starting verification...");
    setReverifyProgress(2);
    try {
      const result = await runVerificationPipeline(
        {
          fullName: record.person_name,
          claimedBranch: record.claimed_branch ?? "Unknown",
          claimedType: record.claimed_type ?? "",
          claimedStatus: record.claimed_status ?? "veteran",
          linkedinUrl: record.linkedin_url ?? undefined,
          websiteUrl: record.website_url ?? undefined,
          notes: record.notes ?? undefined,
          socialHandle: record.source_username?.replace(/^@/, "") || undefined,
        },
        (phase) => {
          const info = PHASE_LABELS[phase.phase];
          if (info && phase.status === "running") {
            setReverifyPhase(info.label);
            setReverifyProgress(info.pct);
          } else if (phase.status === "done" || phase.status === "empty" || phase.status === "error") {
            const nextPct = (info?.pct ?? 0) + 5;
            setReverifyProgress(Math.min(nextPct, 95));
          }
        }
      );
      setReverifyPhase("Saving results...");
      setReverifyProgress(96);

      // Merge manual_checks to preserve existing data
      const { data: existingRow } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
      const existingMc = ((existingRow?.manual_checks ?? {}) as Record<string, unknown>);
      const mergedChecks = {
        ...existingMc,
        youtube_results: result.youtubeResults ?? [],
        youtube_media: { videos: result.mediaAppearances ?? [], searched_at: new Date().toISOString() },
        career_track: { result: result.careerData ?? null, generated_at: new Date().toISOString() },
        social_profiles: result.socialVerification?.profiles ?? [],
      };

      await supabase.from("verifications").update({
        verification_score: result.verificationScore,
        status: result.status,
        pdl_data: result.pdlData,
        serp_results: result.serpResults,
        firecrawl_data: result.firecrawlData,
        ai_analysis: result.aiAnalysis,
        evidence_sources: result.evidenceSources,
        red_flags: result.redFlags,
        linkedin_url: result.linkedinUrl || record.linkedin_url || null,
        last_verified_at: new Date().toISOString(),
        manual_checks: mergedChecks,
      }).eq("id", record.id);
      setReverifyProgress(100);
      toast.success("Re-verification complete");
      await onRefresh?.();
    } catch {
      toast.error("Re-verification failed");
    } finally {
      setReverifying(false);
      setReverifyPhase("");
      setReverifyProgress(0);
    }
  };

  // Per-section regenerate: Evidence (SERP + Firecrawl)
  const handleRegenEvidence = async () => {
    setRegenEvidence(true);
    try {
      const queries = [
        `${record.person_name} military veteran`,
        `${record.person_name} ${record.claimed_branch ?? ""}`,
        `${record.person_name} site:linkedin.com military`,
      ].filter(Boolean);
      const allResults: EvidenceSource[] = [];
      const seen = new Set<string>();
      for (const q of queries) {
        const results = await searchSerp(q);
        for (const r of results) {
          const url = r.link ?? "";
          if (seen.has(url)) continue;
          seen.add(url);
          const { category, relevance, isRedFlag } = categorizeAndScoreSnippet(r.snippet ?? "", r.title ?? "");
          allResults.push({ title: r.title ?? "No title", url, snippet: r.snippet ?? "", relevanceScore: relevance, category, isRedFlag });
        }
      }
      allResults.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
      await supabase.from("verifications").update({
        evidence_sources: allResults,
        serp_results: allResults,
      }).eq("id", record.id);
      toast.success(`Found ${allResults.length} evidence sources`);
      onRefresh?.();
    } catch (err) {
      toast.error("Evidence search failed");
      console.error("[RegenEvidence]", err);
    } finally {
      setRegenEvidence(false);
    }
  };

  // Per-section regenerate: Social profiles
  const handleRegenSocial = async () => {
    setRegenSocial(true);
    try {
      // Re-run social verification with a fresh pipeline call for just social
      // Since social extraction uses PDL + evidence, reparse from existing data
      const existingPdl = record.pdl_data as PDLResponse | null;
      const existingSources = (record.evidence_sources ?? []) as EvidenceSource[];
      const profiles: { network: string; url: string; verified: boolean }[] = [];
      if (existingPdl?.profiles?.length) {
        for (const p of existingPdl.profiles) {
          profiles.push({ network: p.network ?? "unknown", url: p.url ?? "", verified: true });
        }
      }
      const SOCIAL_PATTERNS: { network: string; pattern: RegExp }[] = [
        { network: "instagram", pattern: /instagram\.com\/([a-zA-Z0-9_.]+)/i },
        { network: "linkedin", pattern: /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i },
        { network: "twitter", pattern: /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i },
        { network: "youtube", pattern: /youtube\.com\/(?:@|channel\/|c\/)([a-zA-Z0-9_-]+)/i },
        { network: "tiktok", pattern: /tiktok\.com\/@([a-zA-Z0-9_.]+)/i },
      ];
      const seenNetworks = new Set(profiles.map((p) => p.network));
      for (const es of existingSources) {
        for (const { network, pattern } of SOCIAL_PATTERNS) {
          if (!seenNetworks.has(network) && pattern.test(es.url ?? "")) {
            profiles.push({ network, url: es.url ?? "", verified: false });
            seenNetworks.add(network);
          }
        }
      }
      const { data: row } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
      const mc = ((row?.manual_checks ?? {}) as Record<string, unknown>);
      await supabase.from("verifications").update({
        manual_checks: { ...mc, social_profiles: profiles },
      }).eq("id", record.id);
      toast.success(`Found ${profiles.length} social profiles`);
      onRefresh?.();
    } catch (err) {
      toast.error("Social verification failed");
      console.error("[RegenSocial]", err);
    } finally {
      setRegenSocial(false);
    }
  };

  // Per-section regenerate: Media & Appearances
  const handleRegenMedia = async () => {
    setRegenMedia(true);
    try {
      const results = await searchYouTube(record.person_name, record.claimed_branch ?? undefined, record.source_username?.replace(/^@/, "") || undefined);
      const { data: row } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
      const mc = ((row?.manual_checks ?? {}) as Record<string, unknown>);
      await supabase.from("verifications").update({
        manual_checks: { ...mc, youtube_media: { videos: results, searched_at: new Date().toISOString() } },
      }).eq("id", record.id);
      toast.success(`Found ${results.length} media appearances`);
      onRefresh?.();
    } catch (err) {
      toast.error("Media search failed");
      console.error("[RegenMedia]", err);
    } finally {
      setRegenMedia(false);
    }
  };

  // Per-section regenerate: Background Review
  const handleRegenBackground = async () => {
    setRegenBackground(true);
    try {
      const results = await filterCriminalResults(
        record.person_name,
        record.claimed_branch ?? undefined,
        ((record.pdl_data as any)?.location ?? []).map((l: { name: string }) => l.name).join(", ") || undefined
      );
      const { data: row } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
      const mc = ((row?.manual_checks ?? {}) as Record<string, unknown>);
      await supabase.from("verifications").update({
        manual_checks: { ...mc, background_review: { results, summary: results.length > 0 ? `${results.length} potential concerns found` : "No concerns identified", reviewed_at: new Date().toISOString() } },
      }).eq("id", record.id);
      toast.success("Background review complete");
      onRefresh?.();
    } catch (err) {
      toast.error("Background review failed");
      console.error("[RegenBackground]", err);
    } finally {
      setRegenBackground(false);
    }
  };

  // Retry AI Analysis — re-runs the main Claude analysis with retry logic
  const handleRetryAIAnalysis = async () => {
    setRegenAI(true);
    try {
      const sources = (record.evidence_sources ?? []) as EvidenceSource[];
      const firecrawlData = (record.firecrawl_data ?? []) as { url: string; markdown?: string }[];
      const mc = ((record as any).manual_checks ?? {}) as Record<string, unknown>;
      const result = await runVerificationAnalysis({
        personName: record.person_name,
        claimedStatus: record.claimed_status ?? "Veteran",
        claimedBranch: record.claimed_branch ?? "Unknown",
        claimedType: record.claimed_type ?? "",
        pdlData: record.pdl_data,
        serpResults: sources,
        firecrawlExtractions: firecrawlData,
        mediaAppearances: mc.youtube_media ?? undefined,
        careerData: mc.career_track ?? undefined,
        socialProfiles: mc.social_profiles ?? undefined,
      });
      if (result && result !== "pending_retry") {
        // Auto-detect type from new AI analysis + evidence
        const detected = detectType(result, sources);
        const updates: Record<string, unknown> = { ai_analysis: result };
        if (detected) {
          updates.claimed_status = detected.claimedStatus;
          updates.claimed_type = detected.claimedType;
          // Also auto-detect branch from new analysis
          const newBranch = detectBranch(result, sources);
          if (newBranch && !record.claimed_branch) updates.claimed_branch = newBranch;
          // Recompute score with corrected type
          const newScore = computeVerificationScore(0, sources, { hasUnitOrMOS: false, hasDates: false, hasAwards: false }, { claimedBranch: (updates.claimed_branch as string) ?? record.claimed_branch ?? undefined, claimedType: detected.claimedStatus, linkedinUrl: record.linkedin_url ?? undefined, pdlData: record.pdl_data });
          updates.verification_score = newScore;
          updates.status = recommendStatus(newScore, sources.some((s) => s.isRedFlag));
        }
        await supabase.from("verifications").update(updates).eq("id", record.id);
        toast.success(`AI analysis completed${detected ? ` — reclassified as ${detected.claimedType}` : ""}`);
        onRefresh?.();
      } else {
        toast.error("AI analysis still failing — Anthropic may be overloaded. Try again in a few minutes.");
      }
    } catch (err) {
      toast.error("AI analysis retry failed");
      console.error("[RetryAIAnalysis]", err);
    } finally {
      setRegenAI(false);
    }
  };

  const handleStatusChange = async (newStatus: string, manual = false) => {
    // 1. Update the verifications table (mark manual_override if user-driven)
    const updates: Record<string, unknown> = { status: newStatus };
    if (manual) updates.manual_status_override = true;
    await supabase.from("verifications").update(updates).eq("id", record.id);

    // 2. Propagate to speakers table if linked
    if (record.id) {
      await supabase
        .from("speakers")
        .update({ verification_status: newStatus } as Record<string, unknown>)
        .eq("verification_id", record.id);
    }

    // 3. Propagate to directory_members by matching creator_handle
    if (record.source_username) {
      await supabase
        .from("directory_members")
        .update({ status: newStatus } as Record<string, unknown>)
        .eq("creator_handle", record.source_username);
    }

    // 4. Auto-add to Email Contacts when verified
    if (newStatus === "verified") {
      autoAddVerifiedToContacts(record);
    }

    toast.success(`Status ${manual ? "manually " : ""}changed to ${newStatus}`);
    onRefresh?.();
  };

  const autoAddVerifiedToContacts = async (rec: VerificationRecord) => {
    // Find an email from PDL data or evidence
    const pdl = rec.pdl_data as Record<string, unknown> | null;
    const email = (pdl?.work_email as string) || (pdl?.personal_emails as string[])?.[0] || null;
    if (!email) return; // No email available, skip silently

    // Check if already exists in any email list
    const { data: existing } = await supabase
      .from("email_contacts")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .limit(1);
    if (existing && existing.length > 0) return; // Already in contacts

    // Find or create a "Verified Creators" list
    const lists = await getEmailLists();
    let targetList = lists.find((l) => l.name === "Verified Creators");
    if (!targetList) {
      targetList = await upsertEmailList({ name: "Verified Creators", description: "Auto-populated from verification pipeline" });
    }
    if (!targetList) return;

    const nameParts = rec.person_name.trim().split(/\s+/);
    const tags: string[] = [];
    if (rec.claimed_branch) tags.push(rec.claimed_branch);
    if (rec.claimed_status) tags.push(rec.claimed_status);

    await addFullContact({
      list_id: targetList.id,
      email: email.toLowerCase().trim(),
      first_name: nameParts[0] || undefined,
      last_name: nameParts.slice(1).join(" ") || undefined,
      source: "verification" as any,
      tags,
      metadata: {
        verification_id: rec.id,
        photo_url: rec.profile_photo_url,
        branch: rec.claimed_branch,
        claimed_status: rec.claimed_status,
        verification_score: rec.verification_score,
        city: rec.city,
        state: rec.state,
        source_username: rec.source_username,
      },
    });
  };

  const handleSaveNotes = async () => {
    await supabase.from("verifications").update({ notes: editNotes }).eq("id", record.id);
    toast.success("Notes saved");
    setNotesOpen(false);
    onRefresh?.();
  };

  const handleShareReport = async () => {
    setShareLoading(true);
    try {
      // Check if a token already exists
      const { data: existing } = await supabase
        .from("verifications")
        .select("public_token")
        .eq("id", record.id)
        .single();
      let token = (existing as any)?.public_token;
      if (!token) {
        token = crypto.randomUUID();
        const { error } = await supabase
          .from("verifications")
          .update({ public_token: token } as any)
          .eq("id", record.id);
        if (error) { toast.error("Failed to generate share link"); setShareLoading(false); return; }
      }
      setShareLink(`https://milcrunch.com/report/${token}`);
      setShareModalOpen(true);
    } catch {
      toast.error("Failed to generate share link");
    }
    setShareLoading(false);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const locationStr = [record.city, record.state, record.zip].filter(Boolean).join(", ");

  const handleRunAdditionalSearch = async () => {
    if (!additionalQuery.trim()) return;
    setAdditionalSearching(true);
    try {
      const results = await searchSerp(additionalQuery.trim());
      const seen = new Set(sources.map((s) => s.url));
      const newSources: EvidenceSource[] = [];
      for (const r of results) {
        const url = r.link ?? "";
        if (seen.has(url)) continue;
        seen.add(url);
        const { category, relevance, isRedFlag } = categorizeAndScoreSnippet(r.snippet ?? "", r.title ?? "");
        newSources.push({
          title: r.title ?? "No title",
          url,
          snippet: r.snippet ?? "",
          relevanceScore: relevance,
          category,
          isRedFlag,
        });
      }
      const merged = [...sources, ...newSources].sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
      await supabase.from("verifications").update({ evidence_sources: merged }).eq("id", record.id);
      setAdditionalSearchOpen(false);
      setAdditionalQuery("");
      onRefresh?.();
    } finally {
      setAdditionalSearching(false);
    }
  };

  const initials = (record.person_name || '??').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const pdlPhoto = (record.pdl_data as any)?.profile_pic_url || (record.pdl_data as any)?.photo_url || null;
  const heroPhoto = record.profile_photo_url || pdlPhoto || null;

  useEffect(() => {
    // Skip if already using a reliable Supabase Storage URL
    const currentPhoto = record.profile_photo_url || '';
    const isReliable = currentPhoto.includes('supabase.co/storage/');
    if (isReliable) return;
    (async () => {
      // Try to find photo from directory_members by handle or name
      const handle = record.source_username;
      let data: { ic_avatar_url?: string | null; avatar_url?: string | null } | null = null;
      if (handle) {
        const result = await supabase.from('directory_members').select('ic_avatar_url, avatar_url').eq('creator_handle', handle).maybeSingle();
        data = result.data;
      }
      if (!data) {
        const result = await supabase.from('directory_members').select('ic_avatar_url, avatar_url').ilike('creator_name', record.person_name).maybeSingle();
        data = result.data;
      }
      const photo = data?.ic_avatar_url || data?.avatar_url || null;
      if (photo && photo !== currentPhoto) {
        await supabase.from('verifications').update({ profile_photo_url: photo }).eq('id', record.id);
        onRefresh?.();
      }
    })();
  }, [record.id]);

  // Group sources by category for accordion display
  const sourcesByCategory = useMemo(() => {
    const map = new Map<string, EvidenceSource[]>();
    for (const s of [...sources].sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))) {
      const cat = s.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    return map;
  }, [sources]);

  const expandedBranchColor = ({
    'Army': 'border-l-green-600',
    'Marines': 'border-l-red-600',
    'Navy': 'border-l-blue-600',
    'Air Force': 'border-l-sky-500',
    'Coast Guard': 'border-l-orange-500',
    'Space Force': 'border-l-indigo-600',
  } as Record<string, string>)[record.claimed_branch ?? ''] || 'border-l-blue-600';

  return (
    <div className={`border-l-4 ${expandedBranchColor} bg-white dark:bg-gray-950 rounded-r-xl shadow-sm mx-2 mb-4`}>
    <div className="w-full py-6 pl-3 pr-8 max-w-full overflow-hidden">
      {/* Re-verify progress bar */}
      {reverifying && (
        <div className="mb-4 rounded-lg bg-[#1e3a5f]/5 border border-[#1e3a5f]/20 p-3">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#1e3a5f]" />
            <span className="text-sm font-medium text-[#1e3a5f]">{reverifyPhase || "Re-verifying..."}</span>
            <span className="text-xs text-muted-foreground ml-auto">{reverifyProgress}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1e3a5f] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${reverifyProgress}%` }}
            />
          </div>
        </div>
      )}
      {/* ── 1. HERO ── */}
      <div className="flex items-start gap-4 w-full max-w-full overflow-hidden mb-6">
        {/* LEFT column */}
        <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-start gap-4">
        <div className="shrink-0 relative group mr-4">
          {heroPhoto ? (
            <img
              src={heroPhoto}
              alt={initials}
              className="w-14 h-14 rounded-full object-cover flex-shrink-0"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.removeAttribute('style');
              }}
            />
          ) : null}
          <div
            className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white text-base font-bold flex-shrink-0"
            style={heroPhoto ? { display: 'none' } : {}}
          >
            {initials}
          </div>
          <label className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const ext = file.name.split('.').pop();
              const path = `verification-photos/${record.id}.${ext}`;
              const { error: uploadError } = await supabase.storage
                .from('creator-avatars')
                .upload(path, file, { upsert: true });
              if (uploadError) { toast.error('Upload failed'); return; }
              const { data: urlData } = supabase.storage
                .from('creator-avatars')
                .getPublicUrl(path);
              const publicUrl = urlData.publicUrl;
              await supabase.from('verifications').update({ profile_photo_url: publicUrl }).eq('id', record.id);
              toast.success('Photo updated');
              onRefresh?.();
            }} />
            <span className="text-white text-xs font-medium flex flex-col items-center gap-1">
              <User className="h-4 w-4" />
              Upload
            </span>
          </label>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{record.person_name}</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
                  <StatusBadge status={record.status ?? "pending"} />
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[160px]">
                {(["verified", "pending", "flagged", "rejected"] as const).map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleStatusChange(s, true)}
                    className={cn("gap-2 capitalize", record.status === s && "font-semibold")}
                  >
                    {s === "verified" && <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />}
                    {s === "pending" && <Clock className="h-3.5 w-3.5 text-amber-600" />}
                    {s === "flagged" && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                    {s === "rejected" && <XCircle className="h-3.5 w-3.5 text-red-700" />}
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                    {record.status === s && <Check className="h-3.5 w-3.5 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {(record as any).manual_status_override && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30">
                Manual
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {record.claimed_branch && (
              <Badge className={cn("text-xs font-semibold", BRANCH_BADGE_STYLES[record.claimed_branch] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400")}>
                {record.claimed_branch}
              </Badge>
            )}
            {(() => {
              const displayType = (record as any).claimed_type || record.claimed_status;
              if (!displayType) return null;
              const lower = displayType.toLowerCase();
              const isSpouse = lower.includes('spouse');
              const isGoldStar = lower.includes('gold') && lower.includes('star');
              const isFamily = lower.includes('family') && !isGoldStar;
              if (isGoldStar) return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">Gold Star</span>
              );
              if (isSpouse) return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800">Military Spouse</span>
              );
              if (isFamily) return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800">Military Family</span>
              );
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800 capitalize">
                  {displayType.replace(/_/g, " ")}
                </span>
              );
            })()}
            {locationStr && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{locationStr}</span>
            )}
          </div>
          {/* Social icons row */}
          {(() => {
            const sources = (record.evidence_sources ?? []) as EvidenceSource[];
            const pdlData = record.pdl_data as PDLResponse | null;
            const manualChecks = record.manual_checks as Record<string, unknown> | null;
            const seen = new Set<string>();
            const pills: { name: string; url: string; color: string; icon: React.ReactNode }[] = [];

            const HEADER_PLATFORM_ICONS: Record<string, { color: string; icon: React.ReactNode }> = {
              instagram: { color: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-800', icon: <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
              youtube: { color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800', icon: <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
              twitter: { color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600', icon: <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
              tiktok: { color: 'bg-gray-900 text-white border-gray-900 dark:bg-gray-800 dark:text-white dark:border-gray-600', icon: <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg> },
              facebook: { color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800', icon: <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
              linkedin: { color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800', icon: <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
            };

            // LinkedIn confidence check: only show if URL matches creator identity
            const isLinkedInConfident = (url: string): boolean => {
              if (record.linkedin_url && url.toLowerCase().includes(record.linkedin_url.toLowerCase().replace(/\/$/, ""))) return true;
              const slug = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i)?.[1]?.toLowerCase() ?? "";
              if (!slug) return false;
              const handle = record.source_username?.toLowerCase();
              if (handle && slug.includes(handle)) return true;
              const nameParts = record.person_name.trim().toLowerCase().split(/\s+/);
              const lastName = nameParts[nameParts.length - 1];
              if (lastName && lastName.length >= 3 && slug.includes(lastName)) return true;
              if (nameParts.length >= 2) {
                const firstName = nameParts[0];
                if (firstName.length >= 3 && slug.includes(firstName) && slug.includes(lastName)) return true;
              }
              return false;
            };

            const addPlatformPill = (network: string, label: string, url: string) => {
              if (seen.has(network)) return;
              const info = HEADER_PLATFORM_ICONS[network];
              if (!info) return;
              // Filter LinkedIn through confidence check (except explicit linkedin_url which is trusted)
              if (network === 'linkedin' && url !== record.linkedin_url && !isLinkedInConfident(url)) return;
              seen.add(network);
              pills.push({ name: label, url, color: info.color, icon: info.icon });
            };

            // 1. Explicit fields (linkedin_url is user-provided, always trusted)
            if (record.linkedin_url) addPlatformPill('linkedin', 'LinkedIn', record.linkedin_url);
            if (record.source_username) addPlatformPill('instagram', `@${record.source_username}`, `https://instagram.com/${record.source_username}`);

            // 2. IC enrichment data from directory_members (source of truth for social links)
            const icHandle = record.source_username;
            const icEnrichment = icHandle ? dirEnrichmentMap[icHandle] : null;
            if (icEnrichment) {
              const icPlats = getPlatformsFromEnrichmentData(icEnrichment);
              for (const p of icPlats) {
                addPlatformPill(p.platform, p.label, p.url);
              }
            }

            // 3. ic_data from record (fallback IC source)
            const icData = record.ic_data as any;
            if (icData?.tiktok_url) addPlatformPill('tiktok', 'TikTok', icData.tiktok_url);
            if (icData?.profiles) {
              for (const p of (icData.profiles as any[])) {
                const net = (p.network ?? '').toLowerCase();
                if (p.url && HEADER_PLATFORM_ICONS[net]) {
                  addPlatformPill(net, net === 'twitter' ? 'Twitter/X' : net.charAt(0).toUpperCase() + net.slice(1), p.url);
                }
              }
            }

            // 4. creator_has flags from manual_checks (skip linkedin — low confidence)
            const creatorHas = manualChecks?.creator_has as Record<string, boolean> | undefined;
            if (creatorHas) {
              for (const [k, v] of Object.entries(creatorHas)) {
                if (k === 'linkedin') continue; // creator_has flags have no URL to validate
                if (v && HEADER_PLATFORM_ICONS[k]) {
                  const handle = record.source_username || record.person_name.toLowerCase().replace(/\s+/g, "");
                  const base = k === 'youtube' ? 'https://youtube.com/@' : k === 'tiktok' ? 'https://tiktok.com/@' : k === 'twitter' ? 'https://twitter.com/' : k === 'facebook' ? 'https://facebook.com/' : 'https://instagram.com/';
                  addPlatformPill(k, k === 'twitter' ? 'Twitter/X' : k.charAt(0).toUpperCase() + k.slice(1), base + handle);
                }
              }
            }

            if (record.website_url) {
              pills.push({ name: 'Website', url: record.website_url, color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700', icon: <Globe className="h-3.5 w-3.5" /> });
            }
            if (pills.length === 0) return null;
            return (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {pills.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity border ${p.color}`}>
                    {p.icon}
                    {p.name}
                  </a>
                ))}
              </div>
            );
          })()}
          {/* Quick action buttons */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setNotesOpen(!notesOpen)}>
              <FileText className="h-3.5 w-3.5 mr-1.5" /> {notesOpen ? "Close Notes" : "Add Notes"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareReport} disabled={shareLoading}>
              {shareLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5 mr-1.5" />}
              Share Report
            </Button>
            <Button variant="outline" size="sm" onClick={handleQuickReverify} disabled={reverifying}>
              {reverifying ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Re-Verify
            </Button>
          </div>
          {notesOpen && (
            <div className="mt-3 space-y-2 max-w-md">
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} placeholder="Add notes..." />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveNotes} className="bg-[#1e3a5f] hover:bg-[#2d5282]">
                  <Save className="h-3.5 w-3.5 mr-1.5" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setNotesOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Share Report Modal */}
          <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-[#1e3a5f]" />
                  Share Verification Report
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Anyone with this link can view this creator's verification report.
                </p>
                <div className="flex items-center gap-2">
                  <Input value={shareLink} readOnly className="text-sm font-mono" />
                  <Button size="sm" onClick={handleCopyShareLink} className={shareCopied ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#1e3a5f] hover:bg-[#2d5282]"}>
                    {shareCopied ? <><Check className="h-3.5 w-3.5 mr-1.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Link</>}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        </div>
        </div>
        {/* RIGHT column — Confidence Ring */}
        <div className="w-32 flex-shrink-0 flex flex-col items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <ConfidenceGauge score={record.verification_score ?? 0} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs text-xs leading-relaxed">
                <p className="font-semibold mb-1">Confidence score is calculated from:</p>
                <ul className="space-y-0.5">
                  <li>People Data Labs match (up to 40pts)</li>
                  <li>SERP/web evidence sources (up to 30pts)</li>
                  <li>AI analysis depth (up to 20pts)</li>
                  <li>Social verification (up to 10pts)</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1 text-center">Confidence</p>
        </div>
      </div>

      {/* Red flags alert */}
      {redFlags.length > 0 && (
        <Card className="rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 max-w-full overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2 text-red-700 dark:text-red-400 font-semibold text-sm">
              <AlertCircle className="h-4 w-4" /> Red Flags ({redFlags.length})
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-800 dark:text-red-300">
              {redFlags.map((f, i) => (
                <li key={i}>{f.text} {f.source && <a href={f.source} target="_blank" rel="noopener noreferrer" className="underline text-red-600">Source</a>}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── 2. SPEAKER READINESS — collapsible ── */}
      <SpeakerReadinessInline record={record} onRefresh={onRefresh} isOpen={speakerReadinessOpen} onToggle={() => setSpeakerReadinessOpen(!speakerReadinessOpen)} />

      {/* ── 3. AI SUMMARY ── */}
      <section className="pl-4 ml-6 pr-8 max-w-full overflow-hidden py-3">
        <button onClick={() => setSummaryOpen(!summaryOpen)} className="flex items-center gap-2 w-full text-left group focus:outline-none focus:ring-0">
          {summaryOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <FileText className="h-5 w-5 text-[#1e3a5f]" />
          <h3 className="text-base font-semibold text-[#000741] dark:text-white">Intelligence Summary</h3>
          {(() => {
            const a = record.ai_analysis;
            const s = (!a || a === "pending_retry" || /failed|error/i.test(a)) ? 'red' : 'green';
            const tip = s === 'red' ? "Analysis incomplete — click 'Retry AI Analysis' to generate" : "Complete \u2713";
            return <StatusDot status={s} tooltip={tip} />;
          })()}
          {(!record.ai_analysis || record.ai_analysis === "pending_retry" || /failed|error/i.test(record.ai_analysis)) && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRetryAIAnalysis(); }}
              disabled={regenAI}
              className="ml-auto flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 disabled:opacity-50"
            >
              {regenAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Retry AI Analysis
            </button>
          )}
        </button>
        {summaryOpen && <div className="ml-6 mt-4 mb-2"><IntelligenceSummary record={record} onRetryAI={handleRetryAIAnalysis} retryingAI={regenAI} /></div>}
      </section>

      {/* ── 3. EVIDENCE SOURCES — accordion ── */}
      <section className="pl-4 ml-6 pr-8 max-w-full overflow-hidden py-3">
        <button
          onClick={() => setEvidenceOpen(!evidenceOpen)}
          className="flex items-center gap-2 w-full text-left group focus:outline-none focus:ring-0"
        >
          {evidenceOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <Search className="h-5 w-5 text-[#1e3a5f]" />
          <h3 className="text-base font-semibold text-[#000741] dark:text-white">Evidence Sources</h3>
          <Badge variant="secondary" className="text-xs ml-1">{sources.length}</Badge>
          <StatusDot status={sources.length >= 10 ? 'green' : sources.length > 0 ? 'yellow' : 'red'} tooltip={sources.length >= 10 ? "Complete \u2713" : sources.length > 0 ? "Limited evidence — re-verify for more sources" : "No evidence found — re-verify to search"} />
        </button>
        {evidenceOpen && (
          <div className="ml-6 mt-4 mb-2 space-y-4">
            <div className="flex items-center justify-end gap-2">
              <button onClick={handleRegenEvidence} disabled={regenEvidence} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50">
                {regenEvidence ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Regenerate
              </button>
              <Dialog open={additionalSearchOpen} onOpenChange={setAdditionalSearchOpen}>
                <Button variant="outline" size="sm" onClick={() => setAdditionalSearchOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Run Additional Search
                </Button>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Run Additional Search</DialogTitle></DialogHeader>
                  <p className="text-sm text-muted-foreground">Add more web results. Results will be categorized and merged with existing evidence.</p>
                  <Input placeholder="e.g. John Smith military veteran" value={additionalQuery} onChange={(e) => setAdditionalQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRunAdditionalSearch()} />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAdditionalSearchOpen(false)}>Cancel</Button>
                    <Button onClick={handleRunAdditionalSearch} disabled={additionalSearching || !additionalQuery.trim()} className="bg-[#1e3a5f] hover:bg-[#2d5282]">
                      {additionalSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Search
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No evidence sources yet.</p>
            ) : (
              Array.from(sourcesByCategory.entries()).map(([cat, catSources]) => (
                <EvidenceAccordionGroup key={cat} category={cat} sources={catSources} />
              ))
            )}
          </div>
        )}
      </section>

      {/* ── 4. CAREER TRACK — inline ── */}
      <section className="pl-4 ml-6 pr-8 max-w-full overflow-hidden py-3">
        <button onClick={() => setCareerOpen(!careerOpen)} className="flex items-center gap-2 w-full text-left group focus:outline-none focus:ring-0">
          {careerOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <Briefcase className="h-5 w-5 text-[#1e3a5f]" />
          <h3 className="text-base font-semibold text-[#000741] dark:text-white">Military / Civilian Career</h3>
          {(() => {
            const mc = record.manual_checks as Record<string, unknown> | null;
            const career = (mc as any)?.career_track?.result;
            const pdl = record.pdl_data as any;
            let s: 'red' | 'yellow' | 'green' = 'red';
            if (!career && !pdl) { s = 'red'; }
            else {
              s = 'yellow';
              if (career) {
                const hasBranch = !!career.military_summary?.branch;
                const hasRank = !!career.military_summary?.rank;
                const hasEntries = (career.career?.length > 0 || career.post_service?.length > 0 || career.education?.length > 0 || career.awards?.length > 0);
                if (hasBranch || hasRank || hasEntries) s = 'green';
              }
              if (s !== 'green' && pdl && (pdl.employment?.length > 0 || pdl.experience?.length > 0 || pdl.jobs?.length > 0)) s = 'green';
            }
            const tip = s === 'green' ? "Complete \u2713" : s === 'yellow' ? "Some career data missing — click 'Regenerate' to improve" : "No career data — click 'Regenerate' to extract";
            return <StatusDot status={s} tooltip={tip} />;
          })()}
        </button>
        {careerOpen && <div className="ml-6 mt-4 mb-2"><CareerTrackTab record={record} /></div>}
      </section>

      {/* ── 5. SOCIAL ── */}
      <section className="pl-4 ml-6 pr-8 max-w-full overflow-hidden py-3">
        <button onClick={() => setSocialOpen(!socialOpen)} className="flex items-center gap-2 w-full text-left group focus:outline-none focus:ring-0">
          {socialOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <Globe className="h-5 w-5 text-[#1e3a5f]" />
          <h3 className="text-base font-semibold text-[#000741] dark:text-white">Social Verification</h3>
          {(() => {
            const mc = record.manual_checks as Record<string, unknown> | null;
            const savedProfiles = (mc?.social_profiles ?? []) as unknown[];
            let count = Array.isArray(savedProfiles) ? savedProfiles.length : 0;
            if (record.source_username) count++;
            if (record.linkedin_url) count++;
            const s = count >= 2 ? 'green' : count === 1 ? 'yellow' : 'red';
            const tip = s === 'green' ? "Complete \u2713" : s === 'yellow' ? "Only 1 profile confirmed" : "No social profiles verified";
            return <StatusDot status={s} tooltip={tip} />;
          })()}
        </button>
        {socialOpen && (
          <div className="ml-6 mt-4 mb-2">
            <div className="flex justify-end mb-2">
              <button onClick={handleRegenSocial} disabled={regenSocial} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50">
                {regenSocial ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Regenerate
              </button>
            </div>
            <SocialVerificationSection record={record} />
          </div>
        )}
      </section>

      {/* ── 6. MEDIA — collapsible ── */}
      <section className="pl-4 ml-6 pr-8 max-w-full overflow-hidden py-3">
        <button onClick={() => setMediaOpen(!mediaOpen)} className="flex items-center gap-2 w-full text-left group focus:outline-none focus:ring-0">
          {mediaOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <Video className="h-5 w-5 text-[#1e3a5f]" />
          <h3 className="text-base font-semibold text-[#000741] dark:text-white">Media & Appearances</h3>
          {(() => {
            const mc = record.manual_checks as Record<string, unknown> | null;
            let s: 'red' | 'yellow' | 'green' = 'red';
            if (mc) {
              const ytMedia = (mc as any)?.youtube_media;
              if (ytMedia) {
                const videos = ytMedia.videos as unknown[] | undefined;
                s = (Array.isArray(videos) && videos.length > 0) ? 'green' : 'yellow';
              }
            }
            const tip = s === 'green' ? "Complete \u2713" : s === 'yellow' ? "Search completed but no results found" : "No media found — re-verify to search";
            return <StatusDot status={s} tooltip={tip} />;
          })()}
        </button>
        {mediaOpen && (
          <div className="ml-6 mt-4 mb-2">
            <div className="flex justify-end mb-2">
              <button onClick={handleRegenMedia} disabled={regenMedia} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50">
                {regenMedia ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Regenerate
              </button>
            </div>
            <MediaTab record={record} />
          </div>
        )}
      </section>

      {/* ── 7. BACKGROUND — expandable ── */}
      <section className="pl-4 ml-6 pr-8 max-w-full overflow-hidden py-3">
        <button
          onClick={() => setBackgroundOpen(!backgroundOpen)}
          className="flex items-center gap-2 w-full text-left group focus:outline-none focus:ring-0"
        >
          {backgroundOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <ShieldAlert className="h-5 w-5 text-[#1e3a5f]" />
          <h3 className="text-base font-semibold text-[#000741] dark:text-white">Background Review</h3>
          {(() => {
            const bgOverride = (record.manual_checks as any)?.background_dot_override;
            const bgRan = !!(record.ai_analysis || record.pdl_data);
            const bgStatus = bgOverride || (!bgRan ? 'red' : redFlags.length > 0 ? 'red' : ((record.manual_checks as any)?.background_warnings) ? 'yellow' : 'green');
            const handleBgDotClick = async (e: React.MouseEvent) => {
              e.stopPropagation();
              const next = bgStatus === 'red' ? 'yellow' : bgStatus === 'yellow' ? 'green' : 'red';
              await supabase.from('verifications').update({
                manual_checks: { ...((record.manual_checks as any) || {}), background_dot_override: next },
              }).eq('id', record.id);
              onRefresh?.();
            };
            const bgTip = bgStatus === 'green' ? "Complete \u2713" : bgStatus === 'yellow' ? "Review completed with warnings" : "Not yet reviewed — re-verify to run";
            return (
              <span onClick={handleBgDotClick} className="cursor-pointer" title="Click to cycle status">
                <StatusDot status={bgStatus as 'red' | 'yellow' | 'green'} tooltip={bgTip} />
              </span>
            );
          })()}
        </button>
        {backgroundOpen && (
          <div className="ml-6 mt-4 mb-2">
            <div className="flex justify-end mb-2">
              <button onClick={handleRegenBackground} disabled={regenBackground} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50">
                {regenBackground ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Regenerate
              </button>
            </div>
            <BackgroundReviewTab
              personName={record.person_name}
              recordId={record.id}
              claimedBranch={record.claimed_branch ?? undefined}
              locationContext={locationStr || (pdlData?.location ? (pdlData.location as Array<{name: string}>).map((l) => l.name).join(", ") : undefined)}
              onRefresh={onRefresh}
            />
          </div>
        )}
      </section>

    </div>
    </div>
  );
}

/** Collapsible evidence accordion group by category */
function EvidenceAccordionGroup({ category, sources }: { category: string; sources: EvidenceSource[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden pl-6 pr-10">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors focus:outline-none focus:ring-0"
      >
        <SourceIcon category={category} />
        <span className="font-medium text-sm flex-1">{category}</span>
        <Badge variant="secondary" className="text-xs">{sources.length}</Badge>
        {sources.some(s => s.isRedFlag) && <AlertCircle className="h-4 w-4 text-red-500" />}
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {sources.map((s, i) => (
            <div key={i} className={cn("px-4 py-3", s.isRedFlag && "bg-red-50/50 dark:bg-red-950/10")}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-[#1e3a5f] hover:underline flex items-center gap-1">
                {s.title} <ExternalLink className="h-3 w-3" />
              </a>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: highlightMilitaryText(s.snippet) }} />
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">{s.relevanceScore ?? 0}% relevance</span>
                {s.isRedFlag && <Badge variant="destructive" className="gap-1 text-xs"><AlertCircle className="h-3 w-3" /> Red flag</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** AI Intelligence Summary — auto-generates a unified narrative dossier from all evidence */
function IntelligenceSummary({ record, onRetryAI, retryingAI }: { record: VerificationRecord; onRetryAI?: () => void; retryingAI?: boolean }) {
  const { user } = useAuth();
  const [narrative, setNarrative] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const sources = (record.evidence_sources ?? []) as EvidenceSource[];
  const firecrawlData = (record.firecrawl_data ?? []) as { url: string; markdown?: string }[];
  const autoTriggered = useRef(false);

  // Load saved dossier on mount
  useEffect(() => {
    (async () => {
      if (user) {
        const { data: dossierRow } = await supabase
          .from("verification_dossiers")
          .select("dossier_content, generated_at")
          .eq("user_id", user.id)
          .eq("creator_name", record.person_name)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (dossierRow?.dossier_content) {
          setNarrative(dossierRow.dossier_content);
          setLastGeneratedAt(dossierRow.generated_at ?? null);
          return;
        }
      }
      // Fallback: legacy manual_checks
      const { data } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
      const checks = (data?.manual_checks ?? {}) as Record<string, unknown>;
      const saved = checks.deep_analysis as { narrative?: string; analyzed_at?: string } | undefined;
      if (saved?.narrative) {
        setNarrative(saved.narrative);
        setLastGeneratedAt(saved.analyzed_at ?? null);
        return;
      }
      // Auto-generate if we have evidence data and haven't triggered yet
      if (!autoTriggered.current && (firecrawlData.length > 0 || sources.length > 0 || record.ai_analysis)) {
        autoTriggered.current = true;
        handleGenerate();
      }
    })();
  }, [record.id, record.person_name, user]);

  const saveDossier = async (text: string) => {
    const now = new Date().toISOString();
    if (user) {
      await supabase.from("verification_dossiers").upsert(
        {
          user_id: user.id,
          creator_name: record.person_name,
          creator_handle: record.source_username ?? null,
          dossier_content: text,
          confidence_score: record.verification_score ?? null,
          sources_count: sources.length,
          generated_at: now,
        },
        { onConflict: "user_id,creator_name" },
      );
    }
    // Legacy save
    const { data } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
    const existing = (data?.manual_checks ?? {}) as Record<string, unknown>;
    await supabase.from("verifications").update({
      manual_checks: { ...existing, deep_analysis: { narrative: text, analyzed_at: now } },
    }).eq("id", record.id);
    setLastGeneratedAt(now);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateDossierNarrative({
        personName: record.person_name,
        claimedBranch: record.claimed_branch ?? "Unknown",
        claimedType: record.claimed_type ?? "",
        firecrawlContent: firecrawlData.map((f) => f.markdown ?? "").join("\n\n---\n\n"),
        serpSnippets: sources.map((s) => `${s.title}: ${s.snippet}`).join("\n"),
        aiAnalysis: record.ai_analysis ?? "",
      });
      setNarrative(result || null);
      if (result) await saveDossier(result);
    } catch {
      setNarrative(null);
    } finally {
      setGenerating(false);
    }
  };

  if (generating) {
    return (
      <Card className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 pl-6 pr-10">
        <CardContent className="flex items-center gap-3 py-6">
          <Loader2 className="h-5 w-5 animate-spin text-[#1e3a5f]" />
          <p className="text-sm text-blue-700 dark:text-blue-300">Generating intelligence summary for {record.person_name}...</p>
        </CardContent>
      </Card>
    );
  }

  const aiFailed = !record.ai_analysis || record.ai_analysis === "pending_retry" || record.ai_analysis.startsWith("Analysis failed");

  if (!narrative) {
    // AI analysis failed or pending — show retry prompt
    if (aiFailed) {
      return (
        <Card className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 pl-6 pr-10">
          <CardContent className="py-6 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">AI analysis failed — Anthropic API was overloaded</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
              {record.verification_score ? `Score: ${record.verification_score}% with ${((record.evidence_sources ?? []) as unknown[]).length} sources collected` : "Evidence was collected but AI couldn't process it"}.
              Click retry to re-run the analysis.
            </p>
            <Button onClick={onRetryAI} disabled={retryingAI} className="bg-amber-600 hover:bg-amber-700 text-white">
              {retryingAI ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Retrying...</> : <><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry AI Analysis</>}
            </Button>
          </CardContent>
        </Card>
      );
    }
    // Has ai_analysis text — show it as fallback
    if (record.ai_analysis) {
      return (
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 pl-6 pr-10">
          <CardContent className="p-4">
            <MarkdownResponse content={record.ai_analysis} />
            <Button variant="outline" size="sm" onClick={handleGenerate} className="mt-3">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Generate Full Dossier
            </Button>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
        <CardContent className="py-6 text-center">
          <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Generate an AI intelligence brief from all collected sources.</p>
          <Button onClick={handleGenerate} className="bg-[#1e3a5f] hover:bg-[#2d5282]">Generate Summary</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-2 border-blue-200 dark:border-blue-800 pl-6 pr-10">
      <CardContent className="p-5">
        <MarkdownResponse content={narrative} />
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" size="sm" onClick={handleGenerate}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(narrative); toast.success("Copied to clipboard"); }}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Copy
          </Button>
          {lastGeneratedAt && (
            <span className="text-xs text-muted-foreground ml-auto">Generated {new Date(lastGeneratedAt).toLocaleDateString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const MILITARY_EMPLOYERS = ["United States Army", "US Navy", "USMC", "Air Force", "Coast Guard", "Space Force", "DoD", "VA ", "Veterans Affairs"];
const MILITARY_TITLES = ["Sergeant", "Lieutenant", "Captain", "Major", "Colonel", "General", "Private", "Corporal", "Specialist", "Petty Officer", "Seaman", "Airman", "Commander"];
