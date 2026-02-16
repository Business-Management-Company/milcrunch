import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  LayoutDashboard,
  Pencil,
  Video,
  Play,
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
  if (status === "verified") return <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />;
  if (status === "flagged" || status === "denied") return <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />;
  return <Clock className="h-4 w-4 text-amber-500 shrink-0" />;
}

function NameStatusIcon({ score }: { score: number }) {
  if (score >= 70) return <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />;
  if (score >= 40) return <Clock className="h-4 w-4 text-amber-500 shrink-0" />;
  return <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />;
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
  if (category === "Military Service") return <ShieldCheck className="h-4 w-4 text-[#0064B1]" />;
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
    claimedType: "",
    claimedStatus: "veteran",
    linkedinUrl: "",
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
        claimedType: p.claimedType || p.claimedRank || "",
        claimedStatus: p.claimedStatus || "veteran",
        linkedinUrl: p.linkedinUrl,
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
          claimedType: addForm.claimedType.trim(),
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
          claimed_type: addForm.claimedType || null,
          claimed_status: addForm.claimedStatus,
          linkedin_url: addForm.linkedinUrl.trim() || null,
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
        setList((prev) => [
          {
            ...inserted,
            id: inserted.id,
            person_name: addForm.fullName.trim(),
            claimed_branch: finalBranch,
            claimed_type: addForm.claimedType || null,
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
        setAddForm({ fullName: "", claimedBranch: "", claimedType: "", claimedStatus: "veteran", linkedinUrl: "", websiteUrl: "", notes: "", city: "", state: "", zip: "", source: "manual", sourceUsername: "" });
        setTimeout(() => {
          setAddOpen(false);
          setNewRecordId(null);
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
              <Button className="bg-[#0064B1] hover:bg-[#053877]">
                <Plus className="h-4 w-4 mr-2" />
                Add Verification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Verification</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={addForm.fullName}
                    onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="e.g. Andrew Appleton"
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
                  <Label>Type</Label>
                  <Select value={addForm.claimedType} onValueChange={(v) => setAddForm((f) => ({ ...f, claimedType: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={addForm.claimedStatus} onValueChange={(v) => setAddForm((f) => ({ ...f, claimedStatus: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLAIMED_STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
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
                {pipelineRunning && (
                  <div className="space-y-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-muted/30">
                    <p className="text-sm font-medium">Verification pipeline</p>
                    {[1, 2, 3, 4].map((n) => {
                      const p = phases.find((x) => x.phase === n);
                      return (
                        <div key={n} className="flex items-center gap-2 text-sm">
                          {p?.status === "done" ? <Check className="h-4 w-4 text-purple-600" /> : p?.status === "running" ? <Loader2 className="h-4 w-4 animate-spin text-[#0064B1]" /> : <span className="w-4" />}
                          <span className={p?.status === "done" ? "text-muted-foreground" : ""}>
                            Phase {n}: {p?.name ?? ["People Data Labs", "Web Search", "Deep Extraction", "AI Analysis"][n - 1]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {newRecordId && <p className="text-sm text-purple-600">Verification saved. Redirecting...</p>}
                <Button
                  onClick={handleStartVerification}
                  disabled={pipelineRunning || !addForm.fullName.trim()}
                  className="w-full bg-[#0064B1] hover:bg-[#053877]"
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
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#0064B1]" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-800">
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Type</TableHead>
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
                      <TableCell>{row.claimed_type ?? "—"}</TableCell>
                      <TableCell><StatusIcon status={row.status ?? "pending"} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={row.verification_score ?? 0} className="h-2 w-20" />
                          <span className="text-xs text-muted-foreground">{row.verification_score ?? 0}%</span>
                        </div>
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
                        <TableCell colSpan={9} className="p-0">
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
            <Button onClick={handleSaveSpeaker} className="w-full bg-[#0064B1] hover:bg-[#053877]">
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
            <Button onClick={handleSendInvite} disabled={!selectedEventId} className="w-full bg-[#0064B1] hover:bg-[#053877]">
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
            className="bg-[#0064B1] hover:bg-[#053877]"
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
                <Loader2 className="h-5 w-5 animate-spin text-[#0064B1]" />
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
                  className="group block rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-[#0064B1] hover:shadow-md transition-all"
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
                    <p className="text-sm font-medium line-clamp-2 group-hover:text-[#0064B1]">{v.title}</p>
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
              className="text-sm text-[#0064B1] hover:underline flex items-center gap-1.5"
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
            className="bg-[#0064B1] hover:bg-[#053877]"
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
                <Loader2 className="h-5 w-5 animate-spin text-[#0064B1]" />
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
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-[#0064B1] hover:underline flex items-center gap-1 text-sm">
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
                  className="text-sm text-[#0064B1] hover:underline flex items-center gap-1.5 pt-1"
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
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Mic className="h-4 w-4" /> Speaker Readiness Assessment
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
      <CardContent className="space-y-3">
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
                className="h-4 w-4 rounded border-gray-300 text-[#0064B1] focus:ring-[#0064B1]"
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
      </CardContent>
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
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[#0064B1] hover:underline">
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
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#0064B1] hover:underline flex items-center gap-1">
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
            className="text-xs text-[#0064B1] hover:underline mt-2 flex items-center gap-1"
          >
            {expanded ? <><ChevronDown className="h-3 w-3" /> Show less</> : <><ChevronRight className="h-3 w-3" /> Show more ({lines.length - 4} more lines)</>}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function DeepAnalysisTab({ record }: { record: VerificationRecord }) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);
  const redFlags = (record.red_flags ?? []) as RedFlag[];
  const firecrawlData = (record.firecrawl_data ?? []) as { url: string; markdown?: string }[];
  const sources = (record.evidence_sources ?? []) as EvidenceSource[];

  // Load saved dossier on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
      const checks = (data?.manual_checks ?? {}) as Record<string, unknown>;
      const saved = checks.deep_analysis as { narrative?: string; analyzed_at?: string } | undefined;
      if (saved?.narrative) {
        setNarrative(saved.narrative);
        setLastAnalyzedAt(saved.analyzed_at ?? null);
      }
    })();
  }, [record.id]);

  const saveNarrative = async (text: string) => {
    const { data } = await supabase.from("verifications").select("manual_checks").eq("id", record.id).single();
    const existing = (data?.manual_checks ?? {}) as Record<string, unknown>;
    const now = new Date().toISOString();
    await supabase.from("verifications").update({
      manual_checks: { ...existing, deep_analysis: { narrative: text, analyzed_at: now } },
    }).eq("id", record.id);
    setLastAnalyzedAt(now);
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
      if (result) await saveNarrative(result);
    } catch {
      setNarrative(null);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {redFlags.length > 0 && (
        <Card className="rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400"><AlertCircle className="h-4 w-4" /> Red Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-800 dark:text-red-300">
              {redFlags.map((f, i) => (
                <li key={i}>{f.text} {f.source && <a href={f.source} target="_blank" rel="noopener noreferrer" className="underline">Source</a>}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* AI Narrative Dossier */}
      {narrative === null && !generating ? (
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
          <CardContent className="py-8 text-center">
            <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Generate an AI-powered narrative dossier from all collected web sources and analysis.
            </p>
            <Button onClick={handleGenerate} className="bg-[#0064B1] hover:bg-[#053877]">
              <Loader2 className={cn("h-4 w-4 mr-2", generating ? "animate-spin" : "hidden")} />
              Generate Dossier
            </Button>
          </CardContent>
        </Card>
      ) : generating ? (
        <Card className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="flex items-center gap-3 py-6">
            <Loader2 className="h-5 w-5 animate-spin text-[#0064B1]" />
            <p className="text-sm text-blue-700 dark:text-blue-300">Generating narrative dossier for {record.person_name}...</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#0064B1]" /> Background Dossier
              {lastAnalyzedAt && (
                <span className="text-xs font-normal text-muted-foreground ml-auto">Last analyzed: {new Date(lastAnalyzedAt).toLocaleDateString()}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {narrative}
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={handleGenerate}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-run Deep Analysis
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(narrative ?? "");
                toast.success("Dossier copied to clipboard");
              }}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collapsible Raw Sources */}
      {firecrawlData.length > 0 && (
        <div>
          <button
            onClick={() => setRawOpen(!rawOpen)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {rawOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Web Sources ({firecrawlData.length})
          </button>
          {rawOpen && (
            <div className="mt-3 space-y-3">
              {firecrawlData.map((f, i) => (
                <RawSourceCard key={i} url={f.url} markdown={f.markdown ?? ""} />
              ))}
            </div>
          )}
        </div>
      )}

      {firecrawlData.length === 0 && narrative === null && !generating && (
        <p className="text-sm text-muted-foreground">No scraped content available for deep analysis.</p>
      )}
    </div>
  );
}

function CareerTrackTab({ record }: { record: VerificationRecord }) {
  const pdlData = record.pdl_data as PDLResponse | null;
  const firecrawlData = (record.firecrawl_data ?? []) as { url: string; markdown?: string }[];
  const sources = (record.evidence_sources ?? []) as EvidenceSource[];
  const [aiCareer, setAiCareer] = useState<CareerEntry[]>([]);
  const [aiEducation, setAiEducation] = useState<EducationEntry[]>([]);
  const [aiAwards, setAiAwards] = useState<AwardEntry[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [extractError, setExtractError] = useState("");

  const hasPDL = !!(pdlData?.employment?.length);
  const hasWebSources = firecrawlData.length > 0 || sources.length > 0;

  // Debug logging
  useEffect(() => {
    console.log("[CareerTrack] pdlData:", pdlData);
    console.log("[CareerTrack] hasPDL:", hasPDL);
    console.log("[CareerTrack] firecrawlData:", firecrawlData.length, "pages");
    console.log("[CareerTrack] evidence_sources:", sources.length, "sources");
  }, []);

  // Build PDL career entries
  const pdlCareer: CareerEntry[] = hasPDL
    ? ((pdlData!.employment ?? []) as { title?: string; name?: string; organization?: string; company?: string; start_date?: string; end_date?: string; location_names?: string[] }[]).map((job) => {
        const org = (job.organization ?? job.company ?? "").toLowerCase();
        const title = (job.title ?? job.name ?? "").toLowerCase();
        const isMil = MILITARY_EMPLOYERS.some((e) => org.includes(e.toLowerCase())) || MILITARY_TITLES.some((t) => title.includes(t.toLowerCase()));
        return {
          org: job.organization ?? job.company ?? "Unknown",
          title: job.title ?? job.name ?? "",
          dates: `${job.start_date ?? ""} – ${job.end_date ?? "Present"}`,
          location: (job.location_names ?? []).join(", "),
          is_military: isMil,
        };
      })
    : [];

  const pdlEducation: EducationEntry[] = pdlData?.education?.length
    ? (pdlData.education as { school?: string; degree?: string; start_date?: string; end_date?: string }[]).map((e) => ({
        school: e.school ?? "",
        degree: e.degree ?? "",
        dates: e.start_date || e.end_date ? `${e.start_date ?? ""} – ${e.end_date ?? ""}` : "",
      }))
    : [];

  const handleExtract = async () => {
    setExtracting(true);
    setExtractError("");
    try {
      const firecrawlContent = firecrawlData.map((f) => f.markdown ?? "").join("\n\n---\n\n");
      const serpSnippets = sources.map((s) => `${s.title}: ${s.snippet}`).join("\n");
      console.log("[CareerTrack] Extracting with:", { firecrawlContentLen: firecrawlContent.length, serpSnippetsLen: serpSnippets.length });
      const result = await extractCareerTimeline({
        personName: record.person_name,
        firecrawlContent,
        serpSnippets,
      });
      console.log("[CareerTrack] Extraction result:", result);
      setAiCareer(result.career);
      setAiEducation(result.education);
      setAiAwards(result.awards);
      setExtracted(true);
    } catch (err) {
      console.error("[CareerTrack] Extraction failed:", err);
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
      setExtracted(true);
    } finally {
      setExtracting(false);
    }
  };

  // Auto-extract career data from web sources when no PDL data is available
  useEffect(() => {
    if (!hasPDL && !extracted && !extracting && hasWebSources) {
      handleExtract();
    }
  }, []);

  const careerEntries = hasPDL ? pdlCareer : aiCareer;
  const educationEntries = hasPDL ? pdlEducation : aiEducation;
  const showExtractButton = !hasPDL && !extracted && !extracting;

  return (
    <div className="space-y-6">
      {/* Career Timeline */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Career Track
            {hasPDL && <Badge variant="secondary" className="text-xs">PDL Data</Badge>}
            {!hasPDL && extracted && <Badge variant="secondary" className="text-xs">AI Extracted</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showExtractButton ? (
            <div className="text-center py-6">
              <Briefcase className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No PDL data available. Extract career info from web sources using AI.</p>
              <Button onClick={handleExtract} className="bg-[#0064B1] hover:bg-[#053877]">
                Extract Career Data
              </Button>
            </div>
          ) : extracting ? (
            <div className="flex items-center gap-3 py-6 justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#0064B1]" />
              <p className="text-sm text-muted-foreground">Extracting career data from web sources...</p>
            </div>
          ) : careerEntries.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No career data found.</p>
              <p className="text-xs text-muted-foreground mt-1">This is normal — many people are not in public databases.</p>
              {extractError && <p className="text-xs text-red-500 mt-2">Error: {extractError}</p>}
              {extracted && hasWebSources && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => { setExtracted(false); setExtractError(""); handleExtract(); }}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry Extraction
                </Button>
              )}
            </div>
          ) : (
            <ul className="space-y-4">
              {careerEntries.map((entry, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex gap-4 pl-4 py-3 border-l-4 rounded-r-lg",
                    entry.is_military
                      ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20"
                      : "border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/20"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{entry.org}</p>
                      {entry.is_military && <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {entry.dates && <span>{entry.dates}</span>}
                      {entry.location && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{entry.location}</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Education */}
      {educationEntries.length > 0 && (
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> Education
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {educationEntries.map((e, i) => (
                <li key={i} className="flex items-start gap-3 pl-4 border-l-4 border-blue-300 dark:border-blue-700 py-2">
                  <div>
                    <p className="font-medium">{e.school}</p>
                    {e.degree && <p className="text-sm text-muted-foreground">{e.degree}</p>}
                    {e.dates && <p className="text-xs text-muted-foreground">{e.dates}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Awards & Recognition */}
      {aiAwards.length > 0 && (
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" /> Awards & Recognition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiAwards.map((a, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Trophy className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{a.name}</p>
                    {a.context && <p className="text-xs text-muted-foreground">{a.context}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ExpandedRow({ record, onRefresh }: { record: VerificationRecord; onRefresh?: () => void }) {
  const [additionalSearchOpen, setAdditionalSearchOpen] = useState(false);
  const [additionalQuery, setAdditionalQuery] = useState("");
  const [additionalSearching, setAdditionalSearching] = useState(false);
  const [reverifying, setReverifying] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [editNotes, setEditNotes] = useState(record.notes ?? "");
  const sources = (record.evidence_sources ?? []) as EvidenceSource[];
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

  return (
    <div className="p-6">
      <Tabs defaultValue="overview" className="w-full">
        <TooltipProvider delayDuration={300}>
          <TabsList className="grid w-full grid-cols-6 gap-1.5 rounded-lg bg-transparent p-0 border-b border-gray-200 dark:border-gray-700 pb-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="overview" className="rounded-lg px-3 py-2 font-medium text-sm gap-1.5 border border-transparent data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:border-blue-600 data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 data-[state=inactive]:hover:bg-gray-200 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:border-gray-700 dark:data-[state=inactive]:hover:bg-gray-700">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Overview
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Summary of verification score, speaker readiness checklist, and quick actions</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="evidence" className="rounded-lg px-3 py-2 font-medium text-sm gap-1.5 border border-transparent data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:border-blue-600 data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 data-[state=inactive]:hover:bg-gray-200 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:border-gray-700 dark:data-[state=inactive]:hover:bg-gray-700">
                  <Search className="h-3.5 w-3.5" /> Evidence
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Web search results that corroborate or contradict military service claims</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="professional" className="rounded-lg px-3 py-2 font-medium text-sm gap-1.5 border border-transparent data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:border-blue-600 data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 data-[state=inactive]:hover:bg-gray-200 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:border-gray-700 dark:data-[state=inactive]:hover:bg-gray-700">
                  <Briefcase className="h-3.5 w-3.5" /> Career Track
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Employment history, education, and professional background from PDL and web sources</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="media" className="rounded-lg px-3 py-2 font-medium text-sm gap-1.5 border border-transparent data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:border-blue-600 data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 data-[state=inactive]:hover:bg-gray-200 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:border-gray-700 dark:data-[state=inactive]:hover:bg-gray-700">
                  <Video className="h-3.5 w-3.5" /> Media
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>YouTube videos and media appearances featuring this person</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="criminal" className="rounded-lg px-3 py-2 font-medium text-sm gap-1.5 border border-transparent data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:border-blue-600 data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 data-[state=inactive]:hover:bg-gray-200 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:border-gray-700 dark:data-[state=inactive]:hover:bg-gray-700">
                  <ShieldAlert className="h-3.5 w-3.5" /> Background
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Public records search for brand safety and due diligence</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="deep" className="rounded-lg px-3 py-2 font-medium text-sm gap-1.5 border border-transparent data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:border-blue-600 data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-700 data-[state=inactive]:border-gray-200 data-[state=inactive]:hover:bg-gray-200 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:border-gray-700 dark:data-[state=inactive]:hover:bg-gray-700">
                  <FileText className="h-3.5 w-3.5" /> Deep Analysis
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Detailed content extracted from web pages with military keywords highlighted</p></TooltipContent>
            </Tooltip>
          </TabsList>
        </TooltipProvider>
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Person</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{record.person_name}</p>
                <p className="text-muted-foreground">{record.claimed_branch ?? "—"} · {record.claimed_type ?? "—"} · {record.claimed_status ?? "—"}</p>
                {locationStr && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {locationStr}
                  </p>
                )}
                {record.linkedin_url && (
                  <a href={record.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#0064B1] hover:underline">
                    <Link2 className="h-3.5 w-3.5" /> LinkedIn
                  </a>
                )}
                {record.website_url && (
                  <a href={record.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#0064B1] hover:underline">
                    <Globe className="h-3.5 w-3.5" /> Website
                  </a>
                )}
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">AI Analysis</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <ConfidenceGauge score={record.verification_score ?? 0} />
                <StatusBadge status={record.status ?? "pending"} />
                <p className="text-sm text-muted-foreground line-clamp-3">{record.ai_analysis ?? "No analysis."}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button variant="outline" size="sm" className="justify-start" onClick={handleQuickReverify} disabled={reverifying}>
                  {reverifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Re-verify
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="justify-start">
                      <ChevronDown className="h-4 w-4 mr-2" /> Change Status
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
                {!notesOpen ? (
                  <Button variant="outline" size="sm" className="justify-start" onClick={() => setNotesOpen(true)}>
                    <FileText className="h-4 w-4 mr-2" /> Add Notes
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} placeholder="Add notes..." />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveNotes} className="bg-[#0064B1] hover:bg-[#053877]">
                        <Save className="h-3.5 w-3.5 mr-1.5" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setNotesOpen(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <SpeakerReadinessAssessment record={record} onRefresh={onRefresh} />
            <SocialVerificationSection record={record} />
          </div>
        </TabsContent>
        <TabsContent value="evidence" className="mt-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <span className="text-sm text-muted-foreground">{sources.length} source(s)</span>
            <Dialog open={additionalSearchOpen} onOpenChange={setAdditionalSearchOpen}>
              <Button variant="outline" size="sm" onClick={() => setAdditionalSearchOpen(true)}>
                Run Additional Search
              </Button>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Run Additional Search</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">Add more web results to this verification. Results will be categorized and merged with existing evidence.</p>
                <Input
                  placeholder="e.g. John Smith military veteran"
                  value={additionalQuery}
                  onChange={(e) => setAdditionalQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRunAdditionalSearch()}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAdditionalSearchOpen(false)}>Cancel</Button>
                  <Button onClick={handleRunAdditionalSearch} disabled={additionalSearching || !additionalQuery.trim()} className="bg-[#0064B1] hover:bg-[#053877]">
                    {additionalSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Search
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-4">
            {sources.length === 0 ? (
              <p className="text-muted-foreground text-sm">No evidence sources yet. Run a verification or use &quot;Run Additional Search&quot; to add custom queries.</p>
            ) : (
              sources
                .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
                .map((s, i) => (
                  <Card
                    key={i}
                    className={cn(
                      "rounded-xl border shadow-sm",
                      s.isRedFlag ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20" : "border-gray-200 dark:border-gray-800"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <SourceIcon category={s.category} />
                        <div className="flex-1 min-w-0">
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-[#0064B1] hover:underline flex items-center gap-1">
                            {s.title} <ExternalLink className="h-3 w-3" />
                          </a>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: highlightMilitaryText(s.snippet) }} />
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">{s.category}</Badge>
                            <span className="text-xs text-muted-foreground">{s.relevanceScore ?? 0}% relevance</span>
                            {s.isRedFlag && (
                              <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Red flag</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="professional" className="mt-4 space-y-6">
          <CareerTrackTab record={record} />
        </TabsContent>
        <TabsContent value="media" className="mt-4">
          <MediaTab record={record} />
        </TabsContent>
        <TabsContent value="criminal" className="mt-4">
          <BackgroundReviewTab
            personName={record.person_name}
            recordId={record.id}
            claimedBranch={record.claimed_branch ?? undefined}
            locationContext={locationStr || (pdlData?.location ? (pdlData.location as Array<{name: string}>).map((l) => l.name).join(", ") : undefined)}
            onRefresh={onRefresh}
          />
        </TabsContent>
        <TabsContent value="deep" className="mt-4">
          <DeepAnalysisTab record={record} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const MILITARY_EMPLOYERS = ["United States Army", "US Navy", "USMC", "Air Force", "Coast Guard", "Space Force", "DoD", "VA ", "Veterans Affairs"];
const MILITARY_TITLES = ["Sergeant", "Lieutenant", "Captain", "Major", "Colonel", "General", "Private", "Corporal", "Specialist", "Petty Officer", "Seaman", "Airman", "Commander"];
