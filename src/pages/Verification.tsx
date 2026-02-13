import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Gavel,
  CheckCircle2,
} from "lucide-react";
import { BRANCHES, CLAIMED_STATUS_OPTIONS } from "@/types/verification";
import type { VerificationRecord, EvidenceSource, RedFlag } from "@/types/verification";
import {
  runVerificationPipeline,
  searchSerp,
  categorizeAndScoreSnippet,
  type PipelinePhase,
  type PDLResponse,
} from "@/lib/verification";
import { cn } from "@/lib/utils";

const MILITARY_KEYWORDS = /military|veteran|army|navy|marine|air force|coast guard|served|deployment|dd-214|rank|sergeant|lieutenant|captain|medal|decorated|combat|reserve|guard|usmc|dod|veterans affairs/gi;

function highlightMilitaryText(text: string) {
  return text.replace(MILITARY_KEYWORDS, (match) => `<mark class="bg-yellow-200 dark:bg-yellow-900/50 rounded px-0.5">${match}</mark>`);
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
    verified: { label: "Verified", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
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

function SourceIcon({ category }: { category: string }) {
  if (category === "Military Service") return <ShieldCheck className="h-4 w-4 text-[#0064B1]" />;
  if (category === "Criminal Record") return <AlertCircle className="h-4 w-4 text-red-500" />;
  if (category === "Social Media") return <Globe className="h-4 w-4 text-gray-500" />;
  if (category === "News") return <FileText className="h-4 w-4 text-gray-500" />;
  if (category === "Professional") return <Briefcase className="h-4 w-4 text-gray-500" />;
  return <FileText className="h-4 w-4 text-gray-400" />;
}

export default function Verification() {
  const [list, setList] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: "",
    claimedBranch: "",
    claimedRank: "",
    claimedStatus: "veteran",
    linkedinUrl: "",
    websiteUrl: "",
    notes: "",
  });
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [phases, setPhases] = useState<PipelinePhase[]>([]);
  const [newRecordId, setNewRecordId] = useState<string | null>(null);

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
          claimedRank: addForm.claimedRank.trim(),
          claimedStatus: addForm.claimedStatus,
          linkedinUrl: addForm.linkedinUrl.trim() || undefined,
          websiteUrl: addForm.websiteUrl.trim() || undefined,
          notes: addForm.notes.trim() || undefined,
        },
        onPhase
      );
      const { data: inserted, error } = await supabase
        .from("verifications")
        .insert({
          person_name: addForm.fullName.trim(),
          claimed_branch: addForm.claimedBranch || null,
          claimed_rank: addForm.claimedRank.trim() || null,
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
            claimed_branch: addForm.claimedBranch || null,
            claimed_rank: addForm.claimedRank || null,
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_verified_at: new Date().toISOString(),
          } as VerificationRecord,
          ...prev,
        ]);
        setAddForm({ fullName: "", claimedBranch: "", claimedRank: "", claimedStatus: "veteran", linkedinUrl: "", websiteUrl: "", notes: "" });
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
            <p className="text-2xl font-bold text-emerald-600">{stats.verified}</p>
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
                  <Label>Claimed Branch</Label>
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
                  <Label>Claimed Rank</Label>
                  <Input
                    value={addForm.claimedRank}
                    onChange={(e) => setAddForm((f) => ({ ...f, claimedRank: e.target.value }))}
                    placeholder="e.g. Sergeant, Captain"
                  />
                </div>
                <div>
                  <Label>Claimed Status</Label>
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
                          {p?.status === "done" ? <Check className="h-4 w-4 text-emerald-600" /> : p?.status === "running" ? <Loader2 className="h-4 w-4 animate-spin text-[#0064B1]" /> : <span className="w-4" />}
                          <span className={p?.status === "done" ? "text-muted-foreground" : ""}>
                            Phase {n}: {p?.name ?? ["People Data Labs", "Web Search", "Deep Extraction", "AI Analysis"][n - 1]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {newRecordId && <p className="text-sm text-emerald-600">Verification saved. Redirecting...</p>}
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
                  <TableHead>Claimed Branch</TableHead>
                  <TableHead>Claimed Rank</TableHead>
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
                      <TableCell className="font-medium">{row.person_name}</TableCell>
                      <TableCell>{row.claimed_branch ?? "—"}</TableCell>
                      <TableCell>{row.claimed_rank ?? "—"}</TableCell>
                      <TableCell><StatusBadge status={row.status ?? "pending"} /></TableCell>
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
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); }}>Re-verify</Button>
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
    </div>
  );
}

function CriminalHistoryTab({ personName, recordId, onRefresh }: { personName: string; recordId: string; onRefresh?: () => void }) {
  const [results, setResults] = useState<{ title: string; url: string; snippet: string; isRedFlag: boolean }[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleRunCriminalCheck = async () => {
    setSearching(true);
    try {
      const queries = [
        `"${personName}" criminal record`,
        `"${personName}" arrest`,
        `"${personName}" stolen valor`,
      ];
      const allResults: { title: string; url: string; snippet: string; isRedFlag: boolean }[] = [];
      const seen = new Set<string>();
      for (const q of queries) {
        const serpResults = await searchSerp(q);
        for (const r of serpResults) {
          const url = r.link ?? "";
          if (seen.has(url)) continue;
          seen.add(url);
          const text = `${r.title ?? ""} ${r.snippet ?? ""}`.toLowerCase();
          const isRedFlag = /criminal|fraud|stolen valor|convicted|arrested|indicted|scam|fake|charge/i.test(text);
          allResults.push({
            title: r.title ?? "No title",
            url,
            snippet: r.snippet ?? "",
            isRedFlag,
          });
        }
      }
      setResults(allResults);
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const flagged = results.filter((r) => r.isRedFlag);
  const clean = results.filter((r) => !r.isRedFlag);

  return (
    <div className="space-y-4">
      {!hasSearched ? (
        <div className="text-center py-8">
          <Gavel className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Run a criminal background check using public web records.
            <br />
            Searches for criminal records, arrests, and stolen valor reports.
          </p>
          <Button
            onClick={handleRunCriminalCheck}
            disabled={searching}
            className="bg-[#0064B1] hover:bg-[#053877]"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Run Criminal Check
          </Button>
        </div>
      ) : (
        <>
          {flagged.length === 0 && clean.length === 0 ? (
            <Card className="rounded-xl border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="flex items-center gap-3 py-6">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-800 dark:text-emerald-300">No criminal records found</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">No public criminal records, arrests, or stolen valor reports were found for {personName}.</p>
                </div>
              </CardContent>
            </Card>
          ) : flagged.length === 0 ? (
            <Card className="rounded-xl border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="flex items-center gap-3 py-6">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-800 dark:text-emerald-300">No criminal records found</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">{results.length} search result(s) returned but none contain criminal indicators.</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
          {flagged.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> {flagged.length} potential concern(s) found
              </p>
              {flagged.map((r, i) => (
                <Card key={i} className="rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-red-700 dark:text-red-400 hover:underline flex items-center gap-1">
                          {r.title} <ExternalLink className="h-3 w-3" />
                        </a>
                        <p className="text-sm text-muted-foreground mt-1">{r.snippet}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {clean.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{clean.length} other result(s)</p>
              {clean.map((r, i) => (
                <Card key={i} className="rounded-xl border border-gray-200 dark:border-gray-800">
                  <CardContent className="p-4">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-[#0064B1] hover:underline flex items-center gap-1 text-sm">
                      {r.title} <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">{r.snippet}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={handleRunCriminalCheck} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Re-run Check
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ExpandedRow({ record, onRefresh }: { record: VerificationRecord; onRefresh?: () => void }) {
  const [additionalSearchOpen, setAdditionalSearchOpen] = useState(false);
  const [additionalQuery, setAdditionalQuery] = useState("");
  const [additionalSearching, setAdditionalSearching] = useState(false);
  const sources = (record.evidence_sources ?? []) as EvidenceSource[];
  const redFlags = (record.red_flags ?? []) as RedFlag[];
  const pdlData = record.pdl_data as PDLResponse | null;
  const firecrawlData = (record.firecrawl_data ?? []) as { url: string; markdown?: string }[];

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
        <TabsList className="grid w-full grid-cols-5 gap-1 rounded-lg bg-transparent p-0 border-b border-gray-200 dark:border-gray-700 pb-1">
          <TabsTrigger value="overview" className="rounded-lg px-3 py-2 font-medium text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:hover:bg-gray-700">Overview</TabsTrigger>
          <TabsTrigger value="evidence" className="rounded-lg px-3 py-2 font-medium text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:hover:bg-gray-700">Evidence Sources</TabsTrigger>
          <TabsTrigger value="professional" className="rounded-lg px-3 py-2 font-medium text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:hover:bg-gray-700">Professional Data</TabsTrigger>
          <TabsTrigger value="criminal" className="rounded-lg px-3 py-2 font-medium text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:hover:bg-gray-700">Criminal History</TabsTrigger>
          <TabsTrigger value="deep" className="rounded-lg px-3 py-2 font-medium text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 dark:data-[state=inactive]:bg-gray-800 dark:data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:hover:bg-gray-700">Deep Analysis</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Person</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{record.person_name}</p>
                <p className="text-muted-foreground">{record.claimed_branch ?? "—"} · {record.claimed_rank ?? "—"}</p>
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
                <Button variant="outline" size="sm" className="justify-start">Re-verify</Button>
                <Button variant="outline" size="sm" className="justify-start">Change Status</Button>
                <Button variant="outline" size="sm" className="justify-start">Add Notes</Button>
              </CardContent>
            </Card>
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
        <TabsContent value="professional" className="mt-4">
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" /> Employment Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {!pdlData ? (
                <p className="text-sm text-muted-foreground">PDL lookup did not return data. This is normal — many people are not in the PDL database. Check that PDL_API_KEY is set in Vercel environment variables.</p>
              ) : !pdlData.employment?.length ? (
                <p className="text-sm text-muted-foreground">PDL found a profile but no employment history is listed.</p>
              ) : (
                <ul className="space-y-3">
                  {((pdlData.employment ?? []) as { title?: string; name?: string; organization?: string; company?: string; start_date?: string; end_date?: string }[]).map((job, i) => {
                    const org = (job.organization ?? job.company ?? "").toLowerCase();
                    const title = (job.title ?? job.name ?? "").toLowerCase();
                    const isMilitary = MILITARY_EMPLOYERS.some((e) => org.includes(e.toLowerCase())) || MILITARY_TITLES.some((t) => title.includes(t.toLowerCase()));
                    return (
                      <li
                        key={i}
                        className={cn(
                          "flex gap-3 pl-3 border-l-2",
                          isMilitary ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-gray-200 dark:border-gray-700"
                        )}
                      >
                        <div>
                          <p className="font-medium">{job.organization ?? job.company ?? "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{job.title ?? job.name ?? ""}</p>
                          <p className="text-xs text-muted-foreground">{job.start_date ?? ""} – {job.end_date ?? "Present"}</p>
                        </div>
                        {isMilitary && <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />}
                      </li>
                    );
                  })}
                </ul>
              )}
              {pdlData?.education?.length ? (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="font-medium text-sm mb-2">Education</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {(pdlData.education as { school?: string; degree?: string }[]).map((e, i) => (
                      <li key={i}>{e.school ?? ""} {e.degree ?? ""}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="criminal" className="mt-4">
          <CriminalHistoryTab personName={record.person_name} recordId={record.id} onRefresh={onRefresh} />
        </TabsContent>
        <TabsContent value="deep" className="mt-4">
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
            {firecrawlData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scraped content.</p>
            ) : (
              firecrawlData.map((f, i) => (
                <Card key={i} className="rounded-xl border border-gray-200 dark:border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[#0064B1] hover:underline">{f.url}</a>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: highlightMilitaryText((f.markdown ?? "").slice(0, 2000)) }} />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const MILITARY_EMPLOYERS = ["United States Army", "US Navy", "USMC", "Air Force", "Coast Guard", "Space Force", "DoD", "VA ", "Veterans Affairs"];
const MILITARY_TITLES = ["Sergeant", "Lieutenant", "Captain", "Major", "Colonel", "General", "Private", "Corporal", "Specialist", "Petty Officer", "Seaman", "Airman", "Commander"];
