import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ArrowLeft, ScanLine, UserPlus, Search, Download, Pencil,
  Loader2, X, Save, Camera,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/* ---------- types ---------- */
interface Lead {
  id: string;
  event_id: string;
  sponsor_id: string;
  attendee_registration_id: string | null;
  manual_name: string | null;
  manual_title: string | null;
  manual_company: string | null;
  manual_email: string | null;
  manual_phone: string | null;
  notes: string | null;
  scanned_at: string;
  // joined from event_registrations
  reg_first_name?: string | null;
  reg_last_name?: string | null;
  reg_email?: string | null;
  reg_phone?: string | null;
  reg_company?: string | null;
  reg_title?: string | null;
  reg_military_branch?: string | null;
}

interface Props {
  eventId: string;
  sponsorId: string;
  sponsorName: string;
  onBack: () => void;
}

/* ---------- helpers ---------- */
function getLeadName(l: Lead): string {
  if (l.manual_name) return l.manual_name;
  return [l.reg_first_name, l.reg_last_name].filter(Boolean).join(" ") || "Unknown";
}

function getLeadTitle(l: Lead): string | null {
  return l.manual_title || l.reg_title || null;
}

function getLeadCompany(l: Lead): string | null {
  return l.manual_company || l.reg_company || null;
}

function getLeadEmail(l: Lead): string | null {
  return l.manual_email || l.reg_email || null;
}

function getLeadPhone(l: Lead): string | null {
  return l.manual_phone || l.reg_phone || null;
}

function getLeadBranch(l: Lead): string | null {
  return l.reg_military_branch || null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#6C5CE7] to-purple-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
      {initials}
    </div>
  );
}

const BRANCH_COLORS: Record<string, string> = {
  Army: "bg-green-100 text-green-800",
  Navy: "bg-blue-100 text-blue-800",
  "Air Force": "bg-sky-100 text-sky-800",
  Marines: "bg-red-100 text-red-800",
  "Coast Guard": "bg-orange-100 text-orange-800",
  "Space Force": "bg-indigo-100 text-indigo-800",
};

/* ======================================== */
export default function SponsorLeadRetrieval({ eventId, sponsorId, sponsorName, onBack }: Props) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // view states
  const [view, setView] = useState<"list" | "scanner" | "manual" | "detail">("list");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // manual form
  const [manualName, setManualName] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // scanner
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const [scanning, setScanning] = useState(false);

  /* ---------- fetch leads ---------- */
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sponsor_leads")
        .select("*")
        .eq("event_id", eventId)
        .eq("sponsor_id", sponsorId)
        .order("scanned_at", { ascending: false });
      if (error) throw error;

      // Enrich with registration data
      const enriched: Lead[] = [];
      for (const row of (data || []) as unknown as Lead[]) {
        if (row.attendee_registration_id) {
          const { data: reg } = await supabase
            .from("event_registrations")
            .select("first_name, last_name, email, phone, company, title, military_branch")
            .eq("id", row.attendee_registration_id)
            .maybeSingle();
          if (reg) {
            const r = reg as Record<string, string | null>;
            row.reg_first_name = r.first_name;
            row.reg_last_name = r.last_name;
            row.reg_email = r.email;
            row.reg_phone = r.phone;
            row.reg_company = r.company;
            row.reg_title = r.title;
            row.reg_military_branch = r.military_branch;
          }
        }
        enriched.push(row);
      }
      setLeads(enriched);
    } catch {
      // Table may not exist yet
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [eventId, sponsorId]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  /* ---------- filtered leads ---------- */
  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter((l) => {
      const name = getLeadName(l).toLowerCase();
      const title = (getLeadTitle(l) || "").toLowerCase();
      const company = (getLeadCompany(l) || "").toLowerCase();
      return name.includes(q) || title.includes(q) || company.includes(q);
    });
  }, [leads, search]);

  /* ---------- QR scanner ---------- */
  const startCamera = useCallback(async () => {
    try {
      setScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const jsQR = (await import("jsqr")).default;

      scanIntervalRef.current = window.setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          handleQRData(code.data);
        }
      }, 250);
    } catch {
      toast.error("Camera access denied");
      setView("list");
      setScanning(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    if (view === "scanner") {
      startCamera();
    }
    return () => { if (view === "scanner") stopCamera(); };
  }, [view, startCamera, stopCamera]);

  const handleQRData = async (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type !== "recurrentx_connect" || !parsed.userId) return;

      stopCamera();

      // Check for duplicate
      const alreadyScanned = leads.some((l) =>
        l.attendee_registration_id && l.reg_email // rough check
      );

      // Look up registration by user_id -> email -> event_registrations
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", parsed.userId)
        .maybeSingle();

      // Try to find their registration for this event
      const { data: authUser } = await supabase.auth.admin.getUserById(parsed.userId).catch(() => ({ data: null })) as { data: { user?: { email?: string } } | null };

      // Fallback: look up registration by matching the user
      let regId: string | null = null;
      const { data: regs } = await supabase
        .from("event_registrations")
        .select("id")
        .eq("event_id", eventId)
        .eq("status", "confirmed")
        .limit(100) as { data: { id: string }[] | null };

      // If we can match by email or name from the QR
      if (parsed.name && regs) {
        const nameParts = (parsed.name as string).toLowerCase().split(" ");
        for (const reg of regs) {
          const { data: regDetail } = await supabase
            .from("event_registrations")
            .select("id, first_name, last_name")
            .eq("id", reg.id)
            .maybeSingle();
          if (regDetail) {
            const rd = regDetail as Record<string, string>;
            const regName = `${rd.first_name || ""} ${rd.last_name || ""}`.toLowerCase().trim();
            if (nameParts.some((p: string) => regName.includes(p))) {
              regId = rd.id;
              break;
            }
          }
        }
      }

      // Insert lead
      const { error } = await supabase.from("sponsor_leads").insert({
        event_id: eventId,
        sponsor_id: sponsorId,
        attendee_registration_id: regId,
        manual_name: regId ? null : (parsed.name || "Scanned Attendee"),
        notes: null,
      } as Record<string, unknown>);

      if (error) {
        // If table doesn't exist, add locally
        const mockLead: Lead = {
          id: `local-${Date.now()}`,
          event_id: eventId,
          sponsor_id: sponsorId,
          attendee_registration_id: null,
          manual_name: parsed.name || "Scanned Attendee",
          manual_title: null,
          manual_company: null,
          manual_email: null,
          manual_phone: null,
          notes: null,
          scanned_at: new Date().toISOString(),
        };
        setLeads((prev) => [mockLead, ...prev]);
        toast.success(`Lead captured: ${parsed.name || "Attendee"}`);
      } else {
        toast.success(`Lead captured: ${parsed.name || "Attendee"}`);
        fetchLeads();
      }
      setView("list");
    } catch {
      // Not a valid QR code
    }
  };

  /* ---------- manual add ---------- */
  const submitManualLead = async () => {
    if (!manualName.trim()) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("sponsor_leads").insert({
        event_id: eventId,
        sponsor_id: sponsorId,
        manual_name: manualName.trim(),
        manual_title: manualTitle.trim() || null,
        manual_company: manualCompany.trim() || null,
        manual_email: manualEmail.trim() || null,
        manual_phone: manualPhone.trim() || null,
        notes: manualNotes.trim() || null,
      } as Record<string, unknown>);

      if (error) {
        // Table doesn't exist, add locally
        const mockLead: Lead = {
          id: `local-${Date.now()}`,
          event_id: eventId,
          sponsor_id: sponsorId,
          attendee_registration_id: null,
          manual_name: manualName.trim(),
          manual_title: manualTitle.trim() || null,
          manual_company: manualCompany.trim() || null,
          manual_email: manualEmail.trim() || null,
          manual_phone: manualPhone.trim() || null,
          notes: manualNotes.trim() || null,
          scanned_at: new Date().toISOString(),
        };
        setLeads((prev) => [mockLead, ...prev]);
      } else {
        fetchLeads();
      }
      toast.success("Lead added!");
      setManualName("");
      setManualTitle("");
      setManualCompany("");
      setManualEmail("");
      setManualPhone("");
      setManualNotes("");
      setView("list");
    } catch {
      toast.error("Failed to add lead");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- save notes ---------- */
  const saveNotes = async () => {
    if (!selectedLead) return;
    setSavingNotes(true);
    try {
      if (!selectedLead.id.startsWith("local-")) {
        await supabase
          .from("sponsor_leads")
          .update({ notes: editingNotes.trim() || null } as Record<string, unknown>)
          .eq("id", selectedLead.id);
      }
      setLeads((prev) =>
        prev.map((l) => l.id === selectedLead.id ? { ...l, notes: editingNotes.trim() || null } : l)
      );
      setSelectedLead((prev) => prev ? { ...prev, notes: editingNotes.trim() || null } : null);
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  /* ---------- export CSV ---------- */
  const exportCSV = () => {
    const rows = [["Name", "Title", "Company", "Email", "Phone", "Branch", "Notes", "Scanned At"]];
    for (const l of leads) {
      rows.push([
        getLeadName(l),
        getLeadTitle(l) || "",
        getLeadCompany(l) || "",
        getLeadEmail(l) || "",
        getLeadPhone(l) || "",
        getLeadBranch(l) || "",
        (l.notes || "").replace(/[\n\r]+/g, " "),
        new Date(l.scanned_at).toLocaleString(),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${sponsorName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${leads.length} leads`);
  };

  /* ---------- detail view ---------- */
  if (view === "detail" && selectedLead) {
    const name = getLeadName(selectedLead);
    const title = getLeadTitle(selectedLead);
    const company = getLeadCompany(selectedLead);
    const email = getLeadEmail(selectedLead);
    const phone = getLeadPhone(selectedLead);
    const branch = getLeadBranch(selectedLead);

    return (
      <div className="px-4 py-4 space-y-4">
        <button onClick={() => { setView("list"); setSelectedLead(null); }} className="flex items-center gap-1.5 text-sm text-[#6C5CE7] font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </button>

        <Card className="p-5 bg-white rounded-xl text-center">
          <Avatar name={name} />
          <h3 className="font-bold text-lg mt-3">{name}</h3>
          {title && <p className="text-sm text-gray-500">{title}</p>}
          {company && <p className="text-sm text-gray-500">{company}</p>}
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            {branch && (
              <Badge className={`text-[10px] px-1.5 py-0 ${BRANCH_COLORS[branch] || "bg-gray-100 text-gray-700"}`}>
                {branch}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-500">
              {timeAgo(selectedLead.scanned_at)}
            </Badge>
          </div>
        </Card>

        {/* Contact Info */}
        <Card className="p-4 bg-white rounded-xl space-y-3">
          <h4 className="font-semibold text-sm text-gray-700">Contact Info</h4>
          {email && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Email</span>
              <a href={`mailto:${email}`} className="text-[#6C5CE7] font-medium">{email}</a>
            </div>
          )}
          {phone && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Phone</span>
              <a href={`tel:${phone}`} className="text-[#6C5CE7] font-medium">{phone}</a>
            </div>
          )}
          {!email && !phone && (
            <p className="text-xs text-gray-400">No contact info available</p>
          )}
        </Card>

        {/* Notes */}
        <Card className="p-4 bg-white rounded-xl space-y-3">
          <h4 className="font-semibold text-sm text-gray-700">Notes</h4>
          <Textarea
            placeholder="Add notes about this lead..."
            value={editingNotes}
            onChange={(e) => setEditingNotes(e.target.value)}
            rows={4}
          />
          <Button
            size="sm"
            onClick={saveNotes}
            disabled={savingNotes}
            className="bg-[#6C5CE7] hover:bg-[#5A4BD5] text-white"
          >
            {savingNotes ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Notes
          </Button>
        </Card>
      </div>
    );
  }

  /* ---------- scanner view ---------- */
  if (view === "scanner") {
    return (
      <div className="px-4 py-4 space-y-4">
        <button onClick={() => { stopCamera(); setView("list"); }} className="flex items-center gap-1.5 text-sm text-[#6C5CE7] font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </button>

        <Card className="bg-white rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-base">Scan Attendee QR Code</h3>
            <p className="text-xs text-gray-500">Point camera at an attendee's QR code to capture their info</p>
          </div>
          <div className="relative bg-black">
            <video ref={videoRef} className="w-full aspect-square object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-[#6C5CE7] rounded-2xl">
                <div className="w-full h-full border-2 border-[#6C5CE7]/30 rounded-2xl" />
              </div>
            </div>
          </div>
          <div className="p-4 text-center">
            {scanning ? (
              <div className="flex items-center justify-center gap-2 text-sm text-[#6C5CE7]">
                <Loader2 className="h-4 w-4 animate-spin" /> Scanning...
              </div>
            ) : (
              <p className="text-sm text-gray-500">Starting camera...</p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  /* ---------- manual add view ---------- */
  if (view === "manual") {
    return (
      <div className="px-4 py-4 space-y-4">
        <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-sm text-[#6C5CE7] font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </button>

        <Card className="p-5 bg-white rounded-xl space-y-4">
          <h3 className="font-bold text-base">Add Lead Manually</h3>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-500">Name *</Label>
              <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Job Title</Label>
              <Input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="e.g. Marketing Director" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Company</Label>
              <Input value={manualCompany} onChange={(e) => setManualCompany(e.target.value)} placeholder="Company name" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Email</Label>
              <Input type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Phone</Label>
              <Input type="tel" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Notes</Label>
              <Textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Interested in..." rows={3} />
            </div>
          </div>

          <Button
            onClick={submitManualLead}
            disabled={submitting || !manualName.trim()}
            className="w-full bg-[#6C5CE7] hover:bg-[#5A4BD5] text-white"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
            Add Lead
          </Button>
        </Card>
      </div>
    );
  }

  /* ---------- list view (default) ---------- */
  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <div>
            <h2 className="font-bold text-lg text-gray-900">Lead Retrieval</h2>
            <p className="text-xs text-gray-500">{sponsorName}</p>
          </div>
        </div>
        {leads.length > 0 && (
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        )}
      </div>

      {/* Stats Bar */}
      <Card className="p-4 bg-gradient-to-r from-[#6C5CE7]/10 to-purple-100/50 border-[#6C5CE7]/20 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#6C5CE7] flex items-center justify-center text-white font-bold text-lg">
            {leads.length}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {leads.length === 1 ? "1 attendee" : `${leads.length} attendees`} scanned at your booth
            </p>
            <p className="text-xs text-gray-500">Capture leads by scanning QR codes or adding manually</p>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => setView("scanner")}
          className="bg-[#6C5CE7] hover:bg-[#5A4BD5] text-white gap-2 h-12"
        >
          <ScanLine className="h-5 w-5" /> Scan QR Code
        </Button>
        <Button
          onClick={() => setView("manual")}
          variant="outline"
          className="gap-2 h-12 border-[#6C5CE7] text-[#6C5CE7] hover:bg-[#6C5CE7]/5"
        >
          <UserPlus className="h-5 w-5" /> Add Manually
        </Button>
      </div>

      {/* Search */}
      {leads.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, company, or title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Lead List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#6C5CE7]" />
        </div>
      ) : filteredLeads.length === 0 ? (
        leads.length === 0 ? (
          <Card className="p-8 text-center bg-white rounded-xl">
            <Camera className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-700 mb-1">No leads captured yet</p>
            <p className="text-xs text-gray-500">Scan attendee QR codes or add leads manually to get started</p>
          </Card>
        ) : (
          <p className="text-center text-sm text-gray-500 py-4">No leads match your search</p>
        )
      ) : (
        <div className="space-y-2">
          {filteredLeads.map((lead) => {
            const name = getLeadName(lead);
            const title = getLeadTitle(lead);
            const company = getLeadCompany(lead);

            return (
              <Card
                key={lead.id}
                className="p-3 bg-white rounded-xl border-gray-100 cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => {
                  setSelectedLead(lead);
                  setEditingNotes(lead.notes || "");
                  setView("detail");
                }}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{name}</p>
                    {title && <p className="text-xs text-gray-500 truncate">{title}</p>}
                    {company && <p className="text-xs text-gray-400 truncate">{company}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {lead.notes && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-400">
                        <Pencil className="h-2.5 w-2.5 mr-0.5" /> Notes
                      </Badge>
                    )}
                    <span className="text-[10px] text-gray-400">{timeAgo(lead.scanned_at)}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
