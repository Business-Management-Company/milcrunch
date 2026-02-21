import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { BRANCHES, CLAIMED_STATUS_OPTIONS, TYPE_OPTIONS } from "@/types/verification";
import type { VerificationRecord, EvidenceSource, RedFlag } from "@/types/verification";
import {
  runVerificationPipeline,
  searchSerp,
  categorizeAndScoreSnippet,
  filterCriminalResults,
  detectBranch,
  generateDossierNarrative,
  extractCareerTimeline,
  type PipelinePhase,
  type PDLResponse,
  type AIFilteredCriminalResult,
  type CareerEntry,
  type EducationEntry,
  type AwardEntry,
  type PostServiceEntry,
  type MilitaryServiceSummary,
  type EnhancedCareerResult,
} from "@/lib/verification";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-32 h-32">
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
    verified: { label: "Verified", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
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
    verified: { icon: <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />, tip: "Verified — Military service confirmed" },
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
  const icon = score >= 70
    ? <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
    : score >= 40
      ? <Clock className="h-4 w-4 text-amber-500 shrink-0" />
      : <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />;
  const tip = score >= 70
    ? "Verified — Military service confirmed"
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
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-purple-600" />}
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
  if (category === "Military Service") return <ShieldCheck className="h-4 w-4 text-[#6C5CE7]" />;
  if (category === "Criminal Record") return <AlertCircle className="h-4 w-4 text-red-500" />;
  if (category === "Social Media") return <Globe className="h-4 w-4 text-gray-500" />;
  if (category === "News") return <FileText className="h-4 w-4 text-gray-500" />;
  if (category === "Professional") return <Briefcase className="h-4 w-4 text-gray-500" />;
  return <FileText className="h-4 w-4 text-gray-400" />;
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
  });
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [phases, setPhases] = useState<PipelinePhase[]>([]);
  const [newRecordId, setNewRecordId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [addSpeakerOpen, setAddSpeakerOpen] = useState(false);
  const [speakerForm, setSpeakerForm] = useState({ name: "", branch: "", rank: "", bio: "", verification_id: "" });
  const [inviteEventOpen, setInviteEventOpen] = useState(false);
  const [inviteRecord, setInviteRecord] = useState<VerificationRecord | null>(null);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");

  const fetchVerifications = async () => {
    const { data, error } = await supabase
      .from("verifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setList((data ?? []) as VerificationRecord[]);
  };

  useEffect(() => {
    (async () => {
      await fetchVerifications();
      setLoading(false);
    })();
  }, []);

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
      });
      setAddOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (state?.expandId) {
      setExpandedId(state.expandId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const filtered = list.filter(
    (r) =>
      r.person_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.claimed_branch ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: list.length,
    verified: list.filter((r) => r.status === "verified").length,
    pending: list.filter((r) => r.status === "pending").length,
    flagged: list.filter((r) => r.status === "flagged" || r.status === "denied").length,
  };

  const handleStartVerification = async () => {
    if (!addForm.fullName.trim()) return;
    setPipelineRunning(true);
    setPhases([]);
    const onPhase = (p: PipelinePhase) => setPhases((prev) => [...prev.filter((x) => x.phase !== p.phase), p]);
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
        },
        onPhase
      );
      // Auto-detect branch from AI analysis if not manually set
      const detectedBranch = detectBranch(result.aiAnalysis, result.evidenceSources);
      const finalBranch = addForm.claimedBranch || detectedBranch || null;

      const { data: inserted, error } = await supabase
        .from("verifications")
        .insert({
          person_name: addForm.fullName.trim(),
          claimed_branch: finalBranch,
          claimed_status: addForm.claimedStatus,
          linkedin_url: addForm.linkedinUrl.trim() || null,
          source_username: addForm.instagramHandle.trim() || null,
          profile_photo_url: addForm.instagramHandle.trim()
            ? `https://unavatar.io/instagram/${addForm.instagramHandle.trim()}`
            : null,
          website_url: addForm.websiteUrl.trim() || null,
          notes: addForm.notes.trim() || null,
          verification_score: result.verificationScore,
          status: result.status,
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
          manual_checks: {},
          last_verified_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (!error && inserted) {
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
          await supabase.from("verifications").update({
            manual_checks: { background_review: { results: bgFiltered, summary: bgSummary, reviewed_at: now } },
          }).eq("id", inserted.id);
        } catch (e) {
          console.error("Background auto-run failed:", e);
        }
        })();

        // Auto-run YouTube media search silently
        void (async () => { try {
          const mediaSearchName = addForm.fullName.trim();
          const ytQuery = `"${mediaSearchName}" veteran interview OR podcast OR speaker`;
          const ytResults = await searchSerp(ytQuery);
          const videos = ytResults
            .filter((r: any) => r.link?.includes('youtube.com') || r.link?.includes('youtu.be'))
            .slice(0, 6)
            .map((r: any) => ({
              title: r.title ?? "",
              url: r.link ?? "",
              thumbnail: r.thumbnail ?? "",
              snippet: r.snippet ?? "",
            }));
          if (videos.length > 0) {
            await supabase.from('verifications')
              .update({ manual_checks: { youtube_results: videos } })
              .eq('id', inserted.id);
          }
        } catch (e) { console.error("Media auto-run failed:", e); } })();

        setList((prev) => [
          {
            ...inserted,
            id: inserted.id,
            person_name: addForm.fullName.trim(),
            claimed_branch: finalBranch,
            claimed_type: null,
            claimed_status: addForm.claimedStatus,
            linkedin_url: addForm.linkedinUrl.trim() || null,
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
            manual_checks: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_verified_at: new Date().toISOString(),
          } as VerificationRecord,
          ...prev,
        ]);
        setAddForm({ fullName: "", claimedBranch: "", claimedStatus: "veteran", linkedinUrl: "", instagramHandle: "", websiteUrl: "", notes: "", city: "", state: "", zip: "", source: "manual", sourceUsername: "" });
        setTimeout(() => {
          setAddOpen(false);
          setNewRecordId(null);
          if (inserted?.id) {
            setExpandedId(inserted.id);
          }
        }, 1500);
      }
    } finally {
      setPipelineRunning(false);
    }
  };

  const expanded = expandedId ? list.find((r) => r.id === expandedId) : null;

  const handleAddAsSpeaker = (row: VerificationRecord) => {
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
    });
    setAddSpeakerOpen(true);
  };

  const handleSaveSpeaker = async () => {
    const { error } = await supabase.from("speakers").insert({
      name: speakerForm.name,
      branch: speakerForm.branch || null,
      rank: speakerForm.rank || null,
      bio: speakerForm.bio || null,
      verification_id: speakerForm.verification_id || null,
    });
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
    toast.info(`Re-verifying ${row.person_name}...`);
    try {
      const result = await runVerificationPipeline(
        {
          fullName: row.person_name,
          claimedBranch: row.claimed_branch ?? "Unknown",
          claimedType: row.claimed_type ?? "",
          claimedStatus: row.claimed_status ?? "veteran",
          linkedinUrl: row.linkedin_url ?? undefined,
          websiteUrl: row.website_url ?? undefined,
        },
        () => {}
      );
      await supabase.from("verifications").update({
        verification_score: result.verificationScore,
        status: result.status,
        pdl_data: result.pdlData,
        serp_results: result.serpResults,
        firecrawl_data: result.firecrawlData,
        ai_analysis: result.aiAnalysis,
        evidence_sources: result.evidenceSources,
        red_flags: result.redFlags,
        last_verified_at: new Date().toISOString(),
      }).eq("id", row.id);
      toast.success(`Re-verification complete for ${row.person_name}`);
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
            <div className="relative w-20 h-20">
              <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#6C5CE7" strokeWidth="8"
                  strokeDasharray="100 183" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-[#6C5CE7]" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#000741] dark:text-white mb-1">Verifying {addForm.fullName}</p>
              <p className="text-sm text-muted-foreground">Running AI-powered multi-source verification...</p>
            </div>
            <div className="w-full space-y-3">
              {[1, 2, 3, 4].map((n) => {
                const p = phases.find((x) => x.phase === n);
                const labels = ["People Data Labs", "Web Search", "Deep Extraction", "AI Analysis"];
                const isDone = p?.status === "done";
                const isRunning = p?.status === "running";
                return (
                  <div key={n} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${isRunning ? "bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800" : isDone ? "opacity-50" : "opacity-30"}`}>
                    {isDone ? (
                      <Check className="h-4 w-4 text-purple-600 shrink-0" />
                    ) : isRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#6C5CE7] shrink-0" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border-2 border-gray-300 shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${isRunning ? "text-[#6C5CE7]" : ""}`}>
                      Phase {n}: {p?.name ?? labels[n - 1]}
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
            <p className="text-2xl font-bold text-purple-600">{stats.verified}</p>
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
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#6C5CE7] hover:bg-[#5B4BD1]">
                <Plus className="h-4 w-4 mr-2" />
                Add Verification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Verification</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={addForm.fullName}
                    onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="e.g. Johnny Rocket"
                  />
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
                {newRecordId && <p className="text-sm text-purple-600">Verification saved. Redirecting...</p>}
                <Button
                  onClick={handleStartVerification}
                  disabled={pipelineRunning || !addForm.fullName.trim()}
                  className="w-full bg-[#6C5CE7] hover:bg-[#5B4BD1]"
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
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" /></div>
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
                      className={cn("cursor-pointer border-gray-200 dark:border-gray-800", expandedId === row.id && "bg-muted/50")}
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    >
                      <TableCell>
                        {expandedId === row.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <NameStatusIcon score={row.verification_score ?? 0} />
                          <InlineNameEdit id={row.id} name={row.person_name} onSave={fetchVerifications} />
                        </div>
                      </TableCell>
                      <TableCell>{row.claimed_branch ?? "—"}</TableCell>
                      <TableCell>
                        {row.claimed_status ? (
                          <span className="inline-block rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {row.claimed_status.replace(/_/g, " ")}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
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
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate("/lists"); }}>
                              <List className="h-4 w-4 mr-2" /> Add to List
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleInviteToEvent(row); }}>
                              <Mail className="h-4 w-4 mr-2" /> Invite to Event
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExportProfile(row); }}>
                              <Download className="h-4 w-4 mr-2" /> Export Profile
                            </DropdownMenuItem>
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
                      <TableRow key={`${row.id}-exp`} className="bg-muted/30 border-gray-200 dark:border-gray-800">
                        <TableCell colSpan={8} className="p-0">
                          <ExpandedRow record={expanded} onRefresh={fetchVerifications} />
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
            <Button onClick={handleSaveSpeaker} className="w-full bg-[#6C5CE7] hover:bg-[#5B4BD1]">
              <UserPlus className="h-4 w-4 mr-2" /> Save Speaker
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
            <Button onClick={handleSendInvite} disabled={!selectedEventId} className="w-full bg-[#6C5CE7] hover:bg-[#5B4BD1]">
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
}

function MediaTab({ record }: { record: VerificationRecord }) {
  const [videos, setVideos] = useState<YouTubeVideoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [lastSearchedAt, setLastSearchedAt] = useState<string | null>(null);
  const VISIBLE_COUNT = 6;

  // Load saved results on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
      const checks = (data?.manual_checks ?? {}) as Record<string, unknown>;
      const saved = checks.youtube_media as { videos?: YouTubeVideoResult[]; searched_at?: string } | undefined;
      if (saved?.videos?.length) {
        setVideos(saved.videos);
        setLastSearchedAt(saved.searched_at ?? null);
        setHasSearched(true);
      }
    })();
  }, [record.id]);

  const saveResults = async (results: YouTubeVideoResult[]) => {
    const { data } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
    const existing = (data?.manual_checks ?? {}) as Record<string, unknown>;
    const now = new Date().toISOString();
    await supabase.from("verifications").update({
      manual_checks: { ...existing, youtube_media: { videos: results, searched_at: now } },
    }).eq("id", record.id);
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
              thumbnail: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? "",
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

  const visibleVideos = showAll ? videos : videos.slice(0, VISIBLE_COUNT);
  const hiddenCount = videos.length - VISIBLE_COUNT;

  return (
    <div className="space-y-4">
      {!hasSearched ? (
        <div className="text-center py-8">
          <Video className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-base font-medium text-foreground mb-1">Search YouTube</p>
          <p className="text-sm text-muted-foreground mb-5">
            Find video appearances, interviews, and media coverage for {record.person_name}
          </p>
          <Button
            onClick={handleSearch}
            disabled={searching}
            className="bg-[#6C5CE7] hover:bg-[#5B4BD1]"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Search Videos
          </Button>
        </div>
      ) : (
        <>
          {(searching || filtering) && (
            <Card className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="flex items-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-[#6C5CE7]" />
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
              {visibleVideos.map((v) => (
                <a
                  key={v.videoId}
                  href={`https://www.youtube.com/watch?v=${v.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-[#6C5CE7] hover:shadow-md transition-all"
                >
                  <div className="relative aspect-video bg-gray-100 dark:bg-gray-900">
                    {v.thumbnail ? (
                      <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Video className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <Play className="h-10 w-10 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium line-clamp-2 group-hover:text-[#6C5CE7]">{v.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{v.channelTitle}</p>
                    {v.publishedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(v.publishedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}

          {!searching && !filtering && !showAll && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="text-sm text-[#6C5CE7] hover:underline flex items-center gap-1.5"
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
  const [showAll, setShowAll] = useState(false);
  const [lastReviewedAt, setLastReviewedAt] = useState<string | null>(null);
  const VISIBLE_COUNT = 5;

  // Load saved results on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("verifications").select("manual_checks").eq("id", recordId).single();
      const checks = (data?.manual_checks ?? {}) as Record<string, unknown>;
      const saved = checks.background_review as { results?: AIFilteredCriminalResult[]; summary?: string; reviewed_at?: string } | undefined;
      if (saved?.results?.length || saved?.summary) {
        setAiResults((saved.results ?? []) as AIFilteredCriminalResult[]);
        setAiSummary((saved.summary ?? "") as string);
        setLastReviewedAt((saved.reviewed_at ?? null) as string | null);
        setHasSearched(true);
      }
    })();
  }, [recordId]);

  const saveResults = async (results: AIFilteredCriminalResult[], summary: string) => {
    const { data } = await supabase.from("verifications").select("manual_checks").eq("id", recordId).single();
    const existing = (data?.manual_checks ?? {}) as Record<string, unknown>;
    const now = new Date().toISOString();
    await supabase.from("verifications").update({
      manual_checks: { ...existing, background_review: { results, summary, reviewed_at: now } },
    }).eq("id", recordId);
    setLastReviewedAt(now);
  };

  const handleRunBackgroundReview = async () => {
    setSearching(true);
    setAiResults([]);
    setAiSummary("");
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
        const { filtered, summary } = await filterCriminalResults({
          personName,
          claimedBranch: claimedBranch ?? "Unknown",
          locationContext: locationContext ?? "",
          results: allResults,
        });
        setAiResults(filtered);
        setAiSummary(summary);
        await saveResults(filtered, summary);
      } finally {
        setAiFiltering(false);
      }
    } catch {
      setSearching(false);
      setHasSearched(true);
    }
  };

  // Determine concern dot color for each result
  const getConcernDot = (r: AIFilteredCriminalResult) => {
    const isStolenValor = /stolen valor|fraud/i.test(r.title + " " + r.snippet + " " + r.reasoning);
    if (r.concern_level === "high" || isStolenValor) return "bg-red-500";
    if (r.concern_level === "medium") return "bg-amber-400";
    return "bg-purple-400";
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
          <ShieldCheck className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-base font-medium text-foreground mb-1">Run Background Review</p>
          <p className="text-sm text-muted-foreground mb-5">
            Search public records for brand safety and due diligence
          </p>
          <Button
            onClick={handleRunBackgroundReview}
            disabled={searching}
            className="bg-[#6C5CE7] hover:bg-[#5B4BD1]"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Run Background Review
          </Button>
        </div>
      ) : (
        <>
          {(searching || aiFiltering) && (
            <Card className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="flex items-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-[#6C5CE7]" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {searching ? "Searching public records..." : `AI is analyzing results for relevance to ${personName}...`}
                </p>
              </CardContent>
            </Card>
          )}

          {!aiFiltering && !searching && hasSearched && (() => {
            const status = getSummaryStatus();
            if (status === "clear") return (
              <div className="flex items-center gap-2.5 py-3 px-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0" />
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">No public concerns found for {personName}. Background review complete.</p>
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

          {!aiFiltering && !searching && visibleResults.length > 0 && (
            <div className="space-y-2.5">
              {visibleResults.map((r, i) => (
                <Card key={i} className="rounded-xl border border-gray-200 dark:border-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${getConcernDot(r)}`} />
                      <div className="flex-1 min-w-0">
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-[#6C5CE7] hover:underline flex items-center gap-1 text-sm">
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
                  className="text-sm text-[#6C5CE7] hover:underline flex items-center gap-1.5 pt-1"
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
    military_verified: (record.verification_score ?? 0) >= 70,
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
    <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between py-4">
        <CardTitle className="text-lg font-bold text-[#000741] dark:text-white flex items-center gap-2 cursor-pointer m-0" onClick={() => setOpen(!open)}>
          {open ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <Mic className="h-5 w-5" /> Speaker Readiness Assessment
          {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          {checkedCount >= 5 ? (
            <Badge className="ml-auto bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 text-xs">CLEARED FOR BOOKING</Badge>
          ) : checkedCount < 3 ? (
            <Badge className="ml-auto bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-xs">NOT READY</Badge>
          ) : (
            <Badge className="ml-auto bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs">REVIEW IN PROGRESS</Badge>
          )}
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
                className="h-4 w-4 rounded border-gray-300 text-[#6C5CE7] focus:ring-[#6C5CE7]"
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

function SocialVerificationSection({ record }: { record: VerificationRecord }) {
  const sources = (record.evidence_sources ?? []) as EvidenceSource[];
  const pdlData = record.pdl_data as PDLResponse | null;
  const isFromDiscovery = record.source === "discovery" || !!record.source_username;

  interface PlatformInfo {
    name: string;
    url?: string;
    snippet?: string;
    hasMilitary: boolean;
  }

  const platforms: PlatformInfo[] = [];
  const seenPlatforms = new Set<string>();

  // Extract from evidence sources
  for (const s of sources.filter((s) => s.category === "Social Media")) {
    const url = s.url.toLowerCase();
    let name = "Social Media";
    if (url.includes("instagram")) name = "Instagram";
    else if (url.includes("twitter") || url.includes("x.com")) name = "Twitter/X";
    else if (url.includes("facebook")) name = "Facebook";
    else if (url.includes("tiktok")) name = "TikTok";
    else if (url.includes("youtube")) name = "YouTube";
    else if (url.includes("linkedin")) name = "LinkedIn";

    if (!seenPlatforms.has(name)) {
      seenPlatforms.add(name);
      const hasMilitary = MILITARY_KEYWORDS.test(s.snippet);
      platforms.push({ name, url: s.url, snippet: s.snippet, hasMilitary });
    }
  }

  // Extract from PDL profiles
  if (pdlData?.profiles) {
    for (const p of pdlData.profiles) {
      const name = (p.network ?? "").charAt(0).toUpperCase() + (p.network ?? "").slice(1);
      if (!seenPlatforms.has(name) && name) {
        seenPlatforms.add(name);
        platforms.push({ name, url: p.url, hasMilitary: false });
      }
    }
  }

  if (!isFromDiscovery && platforms.length === 0) return null;

  const militaryPlatformCount = platforms.filter((p) => p.hasMilitary).length;

  return (
    <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4" /> Social Verification
          {militaryPlatformCount > 0 && (
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 text-xs">
              +{militaryPlatformCount * 5} pts
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {platforms.length === 0 ? (
          <p className="text-sm text-muted-foreground">No social media profiles found in evidence or enrichment data.</p>
        ) : (
          platforms.map((p, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{p.name}</span>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[#6C5CE7] hover:underline">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {p.hasMilitary ? (
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-xs gap-1">
                      <Check className="h-3 w-3" /> Military keywords found
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">No military keywords</Badge>
                  )}
                </div>
                {p.snippet && (
                  <p className="text-sm text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: highlightMilitaryText(p.snippet) }} />
                )}
              </div>
            </div>
          ))
        )}
        {record.source_username && (
          <p className="text-xs text-muted-foreground pt-1">Source: Discovery (@{record.source_username})</p>
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
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#6C5CE7] hover:underline flex items-center gap-1">
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
            className="text-xs text-[#6C5CE7] hover:underline mt-2 flex items-center gap-1"
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

  // Load cached results on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
      const checks = (data?.manual_checks ?? {}) as Record<string, unknown>;
      const saved = checks.career_track as { result?: EnhancedCareerResult; generated_at?: string } | undefined;
      if (saved?.result) {
        setCareerResult(saved.result);
        setLastGenerated(saved.generated_at ?? null);
        setExtracted(true);
      } else if (hasWebSources) {
        handleExtract();
      }
    })();
  }, [record.id]);

  const saveResults = async (result: EnhancedCareerResult) => {
    const { data } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
    const existing = (data?.manual_checks ?? {}) as Record<string, unknown>;
    const now = new Date().toISOString();
    await supabase.from("verifications").update({
      manual_checks: { ...existing, career_track: { result, generated_at: now } },
    }).eq("id", record.id);
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
      setCareerResult(result);
      setExtracted(true);
      await saveResults(result);
    } catch (err) {
      console.error("[CareerTrack] Extraction failed:", err);
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
    return "border-purple-500";
  };

  if (extracting) {
    return (
      <div className="flex items-center gap-3 py-12 justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C5CE7]" />
        <p className="text-sm text-muted-foreground">Extracting comprehensive career data from all sources...</p>
      </div>
    );
  }

  if (!extracted && !careerResult) {
    return (
      <div className="text-center py-12">
        <Briefcase className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-4">Extract career data from web sources using AI.</p>
        <Button onClick={handleExtract} className="bg-[#6C5CE7] hover:bg-[#5B4BD1]">
          Extract Career Data
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
        <button onClick={handleRegenerate} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <RefreshCw className="h-3 w-3" /> Regenerate
        </button>
      </div>

      {/* Military Service Summary Card */}
      {ms && ms.branch && (
        <Card className={cn("rounded-xl border-l-4", branchColor(ms.branch))}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-600" /> Military Service
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Rank + MOS line */}
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
            {/* Branch + Dates */}
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
            {/* Units */}
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
            {/* Deployments */}
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
            {/* Military Education */}
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
          </CardContent>
        </Card>
      )}

      {/* Post-Service Career */}
      <Card className="rounded-xl border-l-4 border-[#6C5CE7] border border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-[#6C5CE7]" /> Post-Service Career
          </CardTitle>
        </CardHeader>
        <CardContent>
          {postService.length > 0 ? (
            <ul className="space-y-2">
              {postService.map((ps, i) => (
                <li key={i} className="flex items-start gap-3 py-1">
                  <ChevronRight className="h-4 w-4 text-[#6C5CE7] shrink-0 mt-0.5" />
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
        </CardContent>
      </Card>

      {/* Career Timeline */}
      {careerEntries.length > 0 && (
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Career Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {careerEntries.map((entry, i) => (
                <li
                  key={i}
                  className={cn(
                    "pl-4 py-3 border-l-4 rounded-r-lg",
                    entry.is_military
                      ? cn("bg-purple-50/50 dark:bg-purple-950/20", branchColor(entry.org))
                      : "border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/20"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{entry.org}</p>
                    {entry.is_military && <ShieldCheck className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
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
          </CardContent>
        </Card>
      )}

      {/* Awards & Decorations */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Medal className="h-4 w-4 text-amber-500" /> Awards & Decorations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {awards.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {awards.map((a, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <Badge className="bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-default dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
                      <Trophy className="h-3 w-3 mr-1 text-amber-500" />
                      {a.name}
                    </Badge>
                  </TooltipTrigger>
                  {a.context && <TooltipContent side="bottom"><p className="max-w-xs">{a.context}</p></TooltipContent>}
                </Tooltip>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 italic text-sm">No awards or decorations identified</p>
          )}
        </CardContent>
      </Card>

      {/* Civilian Education */}
      {civEducation.length > 0 && (
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
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

function ExpandedRow({ record, onRefresh }: { record: VerificationRecord; onRefresh?: () => void }) {
  const [reverifying, setReverifying] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [editNotes, setEditNotes] = useState(record.notes ?? "");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [careerOpen, setCareerOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [additionalSearchOpen, setAdditionalSearchOpen] = useState(false);
  const [additionalQuery, setAdditionalQuery] = useState("");
  const [additionalSearching, setAdditionalSearching] = useState(false);
  const sources = (record.evidence_sources ?? []) as EvidenceSource[];
  const redFlags = (record.red_flags ?? []) as RedFlag[];
  const pdlData = record.pdl_data as PDLResponse | null;

  const handleQuickReverify = async () => {
    setReverifying(true);
    toast.info(`Re-verifying ${record.person_name}...`);
    try {
      const result = await runVerificationPipeline(
        {
          fullName: record.person_name,
          claimedBranch: record.claimed_branch ?? "Unknown",
          claimedType: record.claimed_type ?? "",
          claimedStatus: record.claimed_status ?? "veteran",
          linkedinUrl: record.linkedin_url ?? undefined,
          websiteUrl: record.website_url ?? undefined,
        },
        () => {}
      );
      await supabase.from("verifications").update({
        verification_score: result.verificationScore,
        status: result.status,
        pdl_data: result.pdlData,
        serp_results: result.serpResults,
        firecrawl_data: result.firecrawlData,
        ai_analysis: result.aiAnalysis,
        evidence_sources: result.evidenceSources,
        red_flags: result.redFlags,
        last_verified_at: new Date().toISOString(),
      }).eq("id", record.id);
      toast.success("Re-verification complete");
      onRefresh?.();
    } catch {
      toast.error("Re-verification failed");
    } finally {
      setReverifying(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    await supabase.from("verifications").update({ status: newStatus }).eq("id", record.id);
    toast.success(`Status changed to ${newStatus}`);
    onRefresh?.();
  };

  const handleSaveNotes = async () => {
    await supabase.from("verifications").update({ notes: editNotes }).eq("id", record.id);
    toast.success("Notes saved");
    setNotesOpen(false);
    onRefresh?.();
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

  // Avatar from PDL data
  const avatarUrl = (record.profile_photo_url as string | undefined)
    || ((pdlData as Record<string, unknown> | null)?.profile_pic_url as string | undefined);
  const initials = record.person_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    if (record.profile_photo_url) return; // already has a photo
    (async () => {
      // Try to find photo from directory_members by name or source_username
      const handle = record.source_username;
      const query = handle
        ? supabase.from('directory_members').select('ic_avatar_url').eq('creator_handle', handle).maybeSingle()
        : supabase.from('directory_members').select('ic_avatar_url').ilike('name', record.person_name).maybeSingle();
      const { data } = await query;
      if (data?.ic_avatar_url) {
        await supabase.from('verifications').update({ profile_photo_url: data.ic_avatar_url }).eq('id', record.id);
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

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* ── 1. HERO ── */}
      <div className="flex items-start gap-6">
        <div className="rink-0 relative group">
          {avatarUrl ? (
            <img src={avatarUrl} alt={record.person_name} className="h-24 w-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700" />
          ) : (
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#6C5CE7] to-[#5B4BD1] flex items-center justify-center text-white font-bold text-2xl border-2 border-gray-200 dark:border-gray-700">
              {initials}
            </div>
          )}
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
            <h2 className="text-2xl font-bold text-[#000741] dark:text-white">{record.person_name}</h2>
            <StatusBadge status={record.status ?? "pending"} />
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {record.claimed_branch && (
              <Badge className={cn("text-xs font-semibold", BRANCH_BADGE_STYLES[record.claimed_branch] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400")}>
                {record.claimed_branch}
              </Badge>
            )}
            {locationStr && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{locationStr}</span>
            )}
          </div>
          {/* Social icons row */}
          {(() => {
            const sources = (record.evidence_sources ?? []) as EvidenceSource[];
            const pdlData = record.pdl_data as PDLResponse | null;
            const seen = new Set<string>();
            const pills: { name: string; url: string; color: string; icon: React.ReactNode }[] = [];

            if (record.linkedin_url) {
              seen.add('linkedin');
              pills.push({ name: 'LinkedIn', url: record.linkedin_url, color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800', icon: <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> });
            }
            if (record.source_username) {
              seen.add('instagram');
              pills.push({ name: `@${record.source_username}`, url: `https://instagram.com/${record.source_username}`, color: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-800', icon: <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> });
            }
            for (const s of sources.filter(s => s.category === 'Social Media')) {
              const url = s.url.toLowerCase();
              if (url.includes('facebook') && !seen.has('facebook')) {
                seen.add('facebook');
                pills.push({ name: 'Facebook', url: s.url, color: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-700', icon: <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> });
              }
              if ((url.includes('twitter') || url.includes('x.com')) && !seen.has('twitter')) {
                seen.add('twitter');
                pills.push({ name: 'Twitter/X', url: s.url, color: 'bg-gray-50 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600', icon: <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> });
              }
              if (url.includes('youtube') && !seen.has('youtube')) {
                seen.add('youtube');
                pills.push({ name: 'YouTube', url: s.url, color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800', icon: <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> });
              }
              if (url.includes('tiktok') && !seen.has('tiktok')) {
                seen.add('tiktok');
                pills.push({ name: 'TikTok', url: s.url, color: 'bg-gray-50 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600', icon: <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg> });
              }
            }
            if (pdlData?.profiles) {
              for (const p of (pdlData.profiles as any[])) {
                const network = (p.network ?? '').toLowerCase();
                if (network === 'linkedin' && !seen.has('linkedin') && p.url) {
                  seen.add('linkedin');
                  pills.push({ name: 'LinkedIn', url: p.url, color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800', icon: <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> });
                }
              }
            }
              // Check ic_data for TikTok
              const icData = record.ic_data as any;
              if (icData?.tiktok_url && !seen.has('tiktok')) {
                seen.add('tiktok');
                pills.push({ name: 'TikTok', url: icData.tiktok_url, color: 'bg-gray-50 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600', icon: <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg> });
              }
              // Also check source platform from ic_data
              if (icData?.profiles) {
                for (const p of (icData.profiles as any[])) {
                  const net = (p.network ?? '').toLowerCase();
                  if (net === 'tiktok' && p.url && !seen.has('tiktok')) {
                    seen.add('tiktok');
                    pills.push({ name: 'TikTok', url: p.url, color: 'bg-gray-50 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600', icon: <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg> });
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
            <Button variant="outline" size="sm" onClick={handleQuickReverify} disabled={reverifying}>
              {reverifying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Re-verify
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ChevronDown className="h-3.5 w-3.5 mr-1.5" /> Change Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleStatusChange("verified")}>
                  <ShieldCheck className="h-4 w-4 mr-2 text-purple-600" /> Verified
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("pending")}>
                  <Clock className="h-4 w-4 mr-2 text-amber-600" /> Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("flagged")}>
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-600" /> Flagged
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("denied")}>
                  <XCircle className="h-4 w-4 mr-2 text-red-600" /> Denied
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => setNotesOpen(!notesOpen)}>
              <FileText className="h-3.5 w-3.5 mr-1.5" /> {notesOpen ? "Close Notes" : "Add Notes"}
            </Button>
          </div>
          {notesOpen && (
            <div className="mt-3 space-y-2 max-w-md">
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} placeholder="Add notes..." />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveNotes} className="bg-[#6C5CE7] hover:bg-[#5B4BD1]">
                  <Save className="h-3.5 w-3.5 mr-1.5" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setNotesOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* Confidence Ring */}
        <div className="shrink-0 hidden md:block">
          <ConfidenceGauge score={record.verification_score ?? 0} />
        </div>
      </div>

      {/* Red flags alert */}
      {redFlags.length > 0 && (
        <Card className="rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
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

      {/* ── 2. SPEAKER READINESS ── */}
      <SpeakerReadinessAssessment record={record} onRefresh={onRefresh} />

      {/* ── 3. AI SUMMARY ── */}
      <section>
        <button onClick={() => setSummaryOpen(!summaryOpen)} className="flex items-center gap-2 w-full text-left group mb-3">
          {summaryOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <FileText className="h-5 w-5 text-[#6C5CE7]" />
          <h3 className="text-lg font-bold text-[#000741] dark:text-white">Intelligence Summary</h3>
        </button>
        {summaryOpen && <IntelligenceSummary record={record} />}
      </section>

      {/* ── 3. EVIDENCE SOURCES — accordion ── */}
      <section>
        <button
          onClick={() => setEvidenceOpen(!evidenceOpen)}
          className="flex items-center gap-2 w-full text-left group"
        >
          {evidenceOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <Search className="h-5 w-5 text-[#6C5CE7]" />
          <h3 className="text-lg font-bold text-[#000741] dark:text-white">Evidence Sources</h3>
          <Badge variant="secondary" className="text-xs ml-1">{sources.length}</Badge>
        </button>
        {evidenceOpen && (
          <div className="mt-4 space-y-4 pl-7">
            <div className="flex items-center justify-end">
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
                    <Button onClick={handleRunAdditionalSearch} disabled={additionalSearching || !additionalQuery.trim()} className="bg-[#6C5CE7] hover:bg-[#5B4BD1]">
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
      <section>
        <button onClick={() => setCareerOpen(!careerOpen)} className="flex items-center gap-2 w-full text-left group mb-3">
          {careerOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <Briefcase className="h-5 w-5 text-[#6C5CE7]" />
          <h3 className="text-lg font-bold text-[#000741] dark:text-white">Military / Civilian Career</h3>
        </button>
        {careerOpen && <CareerTrackTab record={record} />}
      </section>

      {/* ── 5. SOCIAL — only shown if source is discovery ── */}
      {(record.source === 'discovery' || record.source_username) && (
        <section>
          <button onClick={() => setSocialOpen(!socialOpen)} className="flex items-center gap-2 w-full text-left group">
            {socialOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            <Globe className="h-5 w-5 text-[#6C5CE7]" />
            <h3 className="text-lg font-bold text-[#000741] dark:text-white">Social Verification</h3>
          </button>
          {socialOpen && <div className="mt-3"><SocialVerificationSection record={record} /></div>}
        </section>
      )}

      {/* ── 6. MEDIA — collapsible ── */}
      <section>
        <button onClick={() => setMediaOpen(!mediaOpen)} className="flex items-center gap-2 w-full text-left group">
          {mediaOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <Video className="h-5 w-5 text-[#6C5CE7]" />
          <h3 className="text-lg font-bold text-[#000741] dark:text-white">Media & Appearances</h3>
        </button>
        {mediaOpen && (
          <div className="mt-4 pl-7">
            <MediaTab record={record} />
          </div>
        )}
      </section>

      {/* ── 7. BACKGROUND — expandable ── */}
      <section>
        <button
          onClick={() => setBackgroundOpen(!backgroundOpen)}
          className="flex items-center gap-2 w-full text-left group"
        >
          {backgroundOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <ShieldAlert className="h-5 w-5 text-[#6C5CE7]" />
          <h3 className="text-lg font-bold text-[#000741] dark:text-white">Background Review</h3>
        </button>
        {backgroundOpen && (
          <div className="mt-4 pl-7">
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
  );
}

/** Collapsible evidence accordion group by category */
function EvidenceAccordionGroup({ category, sources }: { category: string; sources: EvidenceSource[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
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
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-[#6C5CE7] hover:underline flex items-center gap-1">
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
function IntelligenceSummary({ record }: { record: VerificationRecord }) {
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
      <Card className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="flex items-center gap-3 py-6">
          <Loader2 className="h-5 w-5 animate-spin text-[#6C5CE7]" />
          <p className="text-sm text-blue-700 dark:text-blue-300">Generating intelligence summary for {record.person_name}...</p>
        </CardContent>
      </Card>
    );
  }

  if (!narrative) {
    // Show AI analysis fallback or prompt to generate
    if (record.ai_analysis) {
      return (
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
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
          <Button onClick={handleGenerate} className="bg-[#6C5CE7] hover:bg-[#5B4BD1]">Generate Summary</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-2 border-blue-200 dark:border-blue-800">
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
