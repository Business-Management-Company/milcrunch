import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Handshake, ClipboardList, DollarSign, Users, Video, FileText,
  Check, Plus, Trash2, Loader2, Sparkles, Download, ChevronRight, ChevronLeft,
  AlertTriangle, LogOut,
} from "lucide-react";
import SpeakerSelector from "@/components/SpeakerSelector";

const sb = supabase as any;
const fmt = (n: number) => "$" + n.toLocaleString();

/* ── Types ─────────────────────────────────────────────────────────── */

interface TimeBlock { date: string; startTime: string; endTime: string; title: string; type: string; speaker: string; notes: string }
interface BudgetLine { description: string; estimated: number; actual: number }
interface Sponsor { company: string; contact: string; email: string; tier: string; value: number; deliverables: string; obligations: Record<string, boolean> }
interface Creator { name: string; handle: string; platform: string; followers: number; talkTitle: string; timeSlot: string; preCreatives: boolean; postCreatives: boolean; preDate: string; dayOfDate: string; postDate: string; notes: string }
interface StreamDest { platform: string; url: string }
interface EmergencyContact { name: string; role: string; phone: string }

interface PdxData {
  orgName: string; eventName: string; startDate: string; endDate: string; attendance: number;
  orgContacts: { plannerName: string; plannerEmail: string; socialName: string; socialEmail: string; marketingName: string; marketingEmail: string };
  pdxTeam: { planner: string; avProducer: string; mcHost: string };
  notes: string;
  ros: TimeBlock[];
  budget: BudgetLine[];
  contractedPrice: number; sponsorContributions: number;
  sponsors: Sponsor[];
  creators: Creator[];
  checklist: Record<string, boolean>;
  streamDests: StreamDest[];
  emergencyContacts: EmergencyContact[];
  greenRoomNotes: string;
  aarLiveAttendance: number; aarVirtualViewers: number; aarPeakViewers: number; aarWatchTime: string;
  aarSocialResults: string; aarKeyWins: string; aarRecommendations: string; aarAiSummary: string;
}

const INIT: PdxData = {
  orgName: "", eventName: "", startDate: "", endDate: "", attendance: 2500,
  orgContacts: { plannerName: "", plannerEmail: "", socialName: "", socialEmail: "", marketingName: "", marketingEmail: "" },
  pdxTeam: { planner: "", avProducer: "", mcHost: "" }, notes: "",
  ros: [],
  budget: [
    { description: "Staging & Lighting", estimated: 0, actual: 0 },
    { description: "Seating & Venue", estimated: 0, actual: 0 },
    { description: "Step-and-Repeat Signage", estimated: 0, actual: 0 },
    { description: "Streaming Equipment", estimated: 0, actual: 0 },
    { description: "Streaming Platform", estimated: 0, actual: 0 },
    { description: "A/V Team (day of)", estimated: 0, actual: 0 },
    { description: "MC/Host Fee", estimated: 0, actual: 0 },
    { description: "Talent/Speaker Fees", estimated: 0, actual: 0 },
    { description: "Social Media Campaigns", estimated: 0, actual: 0 },
    { description: "Social Listening Tools", estimated: 0, actual: 0 },
    { description: "Travel & Accommodation", estimated: 0, actual: 0 },
    { description: "Miscellaneous", estimated: 0, actual: 0 },
  ],
  contractedPrice: 0, sponsorContributions: 0,
  sponsors: [], creators: [],
  checklist: {},
  streamDests: [], emergencyContacts: [], greenRoomNotes: "",
  aarLiveAttendance: 0, aarVirtualViewers: 0, aarPeakViewers: 0, aarWatchTime: "",
  aarSocialResults: "", aarKeyWins: "", aarRecommendations: "", aarAiSummary: "",
};

const PHASES = [
  { label: "Partnership", icon: Handshake },
  { label: "Agenda & ROS", icon: ClipboardList },
  { label: "Budget", icon: DollarSign },
  { label: "Sponsors", icon: Handshake },
  { label: "Creators", icon: Users },
  { label: "Production", icon: Video },
  { label: "AAR Report", icon: FileText },
];

const BLOCK_TYPES = ["Keynote", "Panel", "Sponsor Segment", "Break", "Entertainment", "Other"];
const BLOCK_COLORS: Record<string, string> = { Keynote: "bg-[#1e3a5f]/10 border-[#1e3a5f]/30 text-[#1e3a5f]", Panel: "bg-blue-50 border-blue-200 text-blue-700", "Sponsor Segment": "bg-emerald-50 border-emerald-200 text-emerald-700", Break: "bg-gray-50 border-gray-200 text-gray-600", Entertainment: "bg-amber-50 border-amber-200 text-amber-700", Other: "bg-gray-50 border-gray-200 text-gray-600" };
const TIERS = ["Presenting", "Gold", "Silver", "Bronze"];
const PLATFORMS = ["Instagram", "YouTube", "TikTok", "Twitter", "Podcast", "Other"];
const CHECKLIST_ITEMS = ["A/V Team confirmed", "Producers briefed on ROS", "Stage handler assigned", "Assistant producer assigned", "Streaming platform tested", "Sponsor overlays loaded", "Creator briefings complete", "Step-and-repeat installed", "Social listening active"];

function getDays(start: string, end: string): string[] {
  if (!start || !end) return [];
  const days: string[] = [];
  const d = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  while (d <= e && days.length < 14) { days.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
  return days;
}

function hasConflict(blocks: TimeBlock[], block: TimeBlock, idx: number): boolean {
  return blocks.some((b, i) => i !== idx && b.date === block.date && b.startTime && b.endTime && block.startTime && block.endTime && b.startTime < block.endTime && b.endTime > block.startTime);
}

/* ── Component ──────────────────────────────────────────────────────── */

export default function PdxWizard() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);
  const [d, setD] = useState<PdxData>({ ...INIT, budget: INIT.budget.map(b => ({ ...b })) });
  const [saving, setSaving] = useState(false);
  const [savingExit, setSavingExit] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const up = (patch: Partial<PdxData>) => setD(prev => ({ ...prev, ...patch }));

  const days = useMemo(() => getDays(d.startDate, d.endDate), [d.startDate, d.endDate]);
  const [rosDay, setRosDay] = useState("");

  const estTotal = d.budget.reduce((s, b) => s + (b.estimated || 0), 0);
  const actTotal = d.budget.reduce((s, b) => s + (b.actual || 0), 0);
  const margin = d.contractedPrice - estTotal;
  const sponsorPct = estTotal > 0 ? Math.round(d.sponsorContributions / estTotal * 100) : 0;
  const sponsorRevenue = d.sponsors.reduce((s, sp) => s + (sp.value || 0), 0);
  const totalReach = d.creators.reduce((s, c) => s + (c.followers || 0), 0);

  const buildPayload = () => ({
    organization_name: d.orgName, event_name: d.eventName,
    event_dates: { start: d.startDate, end: d.endDate },
    attendance_expected: d.attendance,
    org_contacts: d.orgContacts, pdx_team: d.pdxTeam,
    ros: d.ros, budget: d.budget,
    contracted_price: d.contractedPrice,
    sponsors: d.sponsors, creators: d.creators,
    production_checklist: d.checklist,
    stream_destinations: d.streamDests,
    aar_data: { liveAttendance: d.aarLiveAttendance, virtualViewers: d.aarVirtualViewers, peakViewers: d.aarPeakViewers, watchTime: d.aarWatchTime, socialResults: d.aarSocialResults, keyWins: d.aarKeyWins, recommendations: d.aarRecommendations, aiSummary: d.aarAiSummary },
    status: "planning",
  });

  const save = async () => {
    setSaving(true);
    const { error } = await sb.from("pdx_events").insert(buildPayload());
    setSaving(false);
    if (error) { console.error(error); toast.error("Failed to save — check if pdx_events table exists"); }
    else toast.success("Experience event saved!");
  };

  const saveAndExit = async () => {
    setSavingExit(true);
    const { error } = await sb.from("pdx_events").insert(buildPayload());
    setSavingExit(false);
    if (error) { console.error(error); toast.error("Failed to save — check if pdx_events table exists"); }
    else { toast.success("Experience saved!"); navigate("/brand/events"); }
  };

  const generateAar = async () => {
    setAiLoading(true);
    try {
      const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929", max_tokens: 1024,
          messages: [{ role: "user", content: `Write a polished executive After Action Report summary for this Experience event:\n\nOrganization: ${d.orgName}\nEvent: ${d.eventName}\nDates: ${d.startDate} to ${d.endDate}\nLive Attendance: ${d.aarLiveAttendance}\nVirtual Viewers: ${d.aarVirtualViewers}\nCreators: ${d.creators.length} (total reach: ${totalReach.toLocaleString()})\nSponsors: ${d.sponsors.length} (total revenue: ${fmt(sponsorRevenue)})\nBudget: ${fmt(estTotal)} estimated, ${fmt(actTotal)} actual\nContracted Price: ${fmt(d.contractedPrice)}\nKey Wins: ${d.aarKeyWins}\nRecommendations: ${d.aarRecommendations}\n\nWrite 4-5 paragraphs covering: event overview, audience impact, sponsor ROI, creator performance, and strategic recommendations. Professional tone.` }],
        }),
      });
      const data = await resp.json();
      up({ aarAiSummary: data.content?.[0]?.text ?? "Unable to generate." });
    } catch { up({ aarAiSummary: "Failed to reach AI." }); }
    setAiLoading(false);
  };

  const exportPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Experience AAR — ${d.eventName}</title><style>body{font-family:system-ui;background:#0A0F1E;color:#fff;padding:40px;max-width:800px;margin:0 auto}h1{color:#1e3a5f}h2{color:#10B981;margin-top:24px;font-size:18px}p{line-height:1.6}.stat{display:inline-block;margin-right:32px;margin-bottom:16px}.stat-num{font-size:24px;font-weight:800}.stat-label{font-size:12px;color:#9CA3AF}</style></head><body><h1>After Action Report</h1><h2>${d.eventName} — ${d.orgName}</h2><p>${d.startDate} to ${d.endDate}</p><div class="stat"><div class="stat-num">${d.aarLiveAttendance.toLocaleString()}</div><div class="stat-label">Live Attendance</div></div><div class="stat"><div class="stat-num">${d.aarVirtualViewers.toLocaleString()}</div><div class="stat-label">Virtual Viewers</div></div><div class="stat"><div class="stat-num">${d.creators.length}</div><div class="stat-label">Creators</div></div><div class="stat"><div class="stat-num">${fmt(sponsorRevenue)}</div><div class="stat-label">Sponsor Revenue</div></div><h2>Executive Summary</h2><p>${(d.aarAiSummary || "Not yet generated.").replace(/\n/g, "</p><p>")}</p><h2>Budget</h2><p>Estimated: ${fmt(estTotal)} | Actual: ${fmt(actTotal)} | Contracted: ${fmt(d.contractedPrice)}</p><h2>Key Wins</h2><p>${d.aarKeyWins || "—"}</p><h2>Recommendations</h2><p>${d.aarRecommendations || "—"}</p><p style="color:#6B7280;font-size:12px;margin-top:40px">&copy; ${new Date().getFullYear()} MilCrunch &middot; Confidential</p></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const cardCls = "bg-white border border-[#E5E7EB] rounded-xl p-5";
  const inputCls = "bg-white border-[#D1D5DB] text-[#111827] placeholder:text-gray-400";
  const labelCls = "text-sm font-medium text-[#111827]";

  /* ── Phase 1 ─────────────────────────────────────────────────────── */
  const renderPhase1 = () => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div><Label className={labelCls}>Organization Name</Label><Input className={inputCls} value={d.orgName} onChange={e => up({ orgName: e.target.value })} placeholder="e.g. Military Influencer Conference" /></div>
        <div><Label className={labelCls}>Event Name</Label><Input className={inputCls} value={d.eventName} onChange={e => up({ eventName: e.target.value })} placeholder="e.g. Experience at MIC 2026" /></div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div><Label className={labelCls}>Start Date</Label><Input className={inputCls} type="date" value={d.startDate} onChange={e => up({ startDate: e.target.value })} /></div>
        <div><Label className={labelCls}>End Date</Label><Input className={inputCls} type="date" value={d.endDate} onChange={e => up({ endDate: e.target.value })} /></div>
        <div><Label className={labelCls}>Expected Attendance</Label><Input className={inputCls} type="number" value={d.attendance || ""} onChange={e => up({ attendance: Number(e.target.value) })} /></div>
      </div>
      <div className={cardCls}>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-4">Organization Contacts</p>
        <div className="grid md:grid-cols-2 gap-4">
          {([["Event Planner", "plannerName", "plannerEmail"], ["Social Media", "socialName", "socialEmail"], ["Marketing", "marketingName", "marketingEmail"]] as const).map(([role, nk, ek]) => (
            <div key={role} className="space-y-2">
              <p className="text-xs text-[#6B7280]">{role}</p>
              <Input className={inputCls} placeholder="Name" value={(d.orgContacts as any)[nk]} onChange={e => up({ orgContacts: { ...d.orgContacts, [nk]: e.target.value } })} />
              <Input className={inputCls} placeholder="Email" type="email" value={(d.orgContacts as any)[ek]} onChange={e => up({ orgContacts: { ...d.orgContacts, [ek]: e.target.value } })} />
            </div>
          ))}
        </div>
      </div>
      <div className={cardCls}>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-4">Experience Team Assignment</p>
        <div className="grid md:grid-cols-3 gap-4">
          <div><Label className={labelCls}>Event Planner</Label><Input className={inputCls} value={d.pdxTeam.planner} onChange={e => up({ pdxTeam: { ...d.pdxTeam, planner: e.target.value } })} /></div>
          <div><Label className={labelCls}>A/V Producer</Label><Input className={inputCls} value={d.pdxTeam.avProducer} onChange={e => up({ pdxTeam: { ...d.pdxTeam, avProducer: e.target.value } })} /></div>
          <div><Label className={labelCls}>MC / Host</Label><Input className={inputCls} value={d.pdxTeam.mcHost} onChange={e => up({ pdxTeam: { ...d.pdxTeam, mcHost: e.target.value } })} /></div>
        </div>
      </div>
      <div><Label className={labelCls}>Notes</Label><Textarea className={inputCls} rows={3} value={d.notes} onChange={e => up({ notes: e.target.value })} placeholder="Anything else..." /></div>
    </div>
  );

  /* ── Phase 2 ─────────────────────────────────────────────────────── */
  const renderPhase2 = () => {
    const activeDay = rosDay || days[0] || "";
    const addBlock = () => up({ ros: [...d.ros, { date: activeDay, startTime: "", endTime: "", title: "", type: "Panel", speaker: "", notes: "" }] });
    const updateBlock = (gi: number, patch: Partial<TimeBlock>) => { const next = [...d.ros]; next[gi] = { ...next[gi], ...patch }; up({ ros: next }); };
    const removeBlock = (gi: number) => up({ ros: d.ros.filter((_, i) => i !== gi) });
    const exportRos = () => {
      const w = window.open("", "_blank"); if (!w) return;
      const rows = [...d.ros].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)).map(b => `<tr><td style="padding:6px 10px;border-bottom:1px solid #1F2937">${b.date}</td><td style="padding:6px 10px;border-bottom:1px solid #1F2937">${b.startTime}–${b.endTime}</td><td style="padding:6px 10px;border-bottom:1px solid #1F2937;font-weight:600">${b.title}</td><td style="padding:6px 10px;border-bottom:1px solid #1F2937">${b.type}</td><td style="padding:6px 10px;border-bottom:1px solid #1F2937">${b.speaker}</td></tr>`).join("");
      w.document.write(`<!DOCTYPE html><html><head><title>ROS — ${d.eventName}</title><style>body{font-family:system-ui;background:#0A0F1E;color:#fff;padding:40px}table{width:100%;border-collapse:collapse}h1{color:#1e3a5f}</style></head><body><h1>Run of Show — ${d.eventName}</h1><table><tr style="border-bottom:2px solid #1e3a5f"><th style="text-align:left;padding:8px 10px">Date</th><th style="text-align:left;padding:8px 10px">Time</th><th style="text-align:left;padding:8px 10px">Title</th><th style="text-align:left;padding:8px 10px">Type</th><th style="text-align:left;padding:8px 10px">Speaker</th></tr>${rows}</table></body></html>`);
      w.document.close(); setTimeout(() => w.print(), 300);
    };

    return (
      <div className="space-y-6">
        {days.length === 0 && <p className="text-[#6B7280] text-sm">Set event dates in Phase 1 to enable the ROS builder.</p>}
        {days.length > 0 && (
          <>
            <div className="flex gap-2 flex-wrap">
              {days.map(day => (
                <button key={day} type="button" onClick={() => setRosDay(day)} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", (activeDay === day) ? "bg-[#1e3a5f] text-white" : "bg-white text-[#6B7280] border border-[#E5E7EB] hover:text-[#111827]")}>
                  {new Date(day + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {d.ros.map((block, globalIdx) => {
                if (block.date !== activeDay) return null;
                const conflict = hasConflict(d.ros, block, globalIdx);
                const colorCls = BLOCK_COLORS[block.type] || BLOCK_COLORS.Other;
                return (
                  <div key={globalIdx} className={cn("border rounded-xl p-4 space-y-3", colorCls)}>
                    {conflict && <Badge className="bg-amber-50 text-amber-700 border-amber-200"><AlertTriangle className="h-3 w-3 mr-1" />Potential conflict with main stage</Badge>}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <Input className={inputCls} type="time" value={block.startTime} onChange={e => updateBlock(globalIdx, { startTime: e.target.value })} />
                      <Input className={inputCls} type="time" value={block.endTime} onChange={e => updateBlock(globalIdx, { endTime: e.target.value })} />
                      <Input className={inputCls} placeholder="Title" value={block.title} onChange={e => updateBlock(globalIdx, { title: e.target.value })} />
                      <select className={cn(inputCls, "rounded-md px-3 py-2 text-sm")} value={block.type} onChange={e => updateBlock(globalIdx, { type: e.target.value })}>
                        {BLOCK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <SpeakerSelector
                          value={block.speaker}
                          onChange={(name) => updateBlock(globalIdx, { speaker: name })}
                          placeholder="Speaker"
                          compact
                          className="flex-1"
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeBlock(globalIdx)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3">
              <Button onClick={addBlock} className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white"><Plus className="h-4 w-4 mr-1" />Add Time Block</Button>
              <Button variant="outline" onClick={exportRos} className="border-[#D1D5DB] text-[#6B7280] hover:bg-gray-50 hover:text-[#111827]"><Download className="h-4 w-4 mr-1" />Export ROS as PDF</Button>
            </div>
          </>
        )}
      </div>
    );
  };

  /* ── Phase 3 ─────────────────────────────────────────────────────── */
  const renderPhase3 = () => {
    const updateBudget = (i: number, field: string, val: string) => {
      const next = d.budget.map((b, idx) => idx === i ? { ...b, [field]: field === "description" ? val : Number(val) || 0 } : b);
      up({ budget: next });
    };
    const addRow = () => up({ budget: [...d.budget, { description: "", estimated: 0, actual: 0 }] });
    const removeRow = (i: number) => up({ budget: d.budget.filter((_, idx) => idx !== i) });

    return (
      <div className="space-y-6">
        <div className={cardCls}>
          <div className="grid grid-cols-[1fr_120px_120px_40px] gap-2 mb-2 text-xs text-[#6B7280] font-medium uppercase tracking-wider px-1">
            <span>Description</span><span className="text-right">Estimated</span><span className="text-right">Actual</span><span />
          </div>
          {d.budget.map((b, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_120px_40px] gap-2 mb-2">
              <Input className={inputCls} value={b.description} onChange={e => updateBudget(i, "description", e.target.value)} />
              <Input className={cn(inputCls, "text-right")} type="number" value={b.estimated || ""} onChange={e => updateBudget(i, "estimated", e.target.value)} />
              <Input className={cn(inputCls, "text-right")} type="number" value={b.actual || ""} onChange={e => updateBudget(i, "actual", e.target.value)} />
              <Button variant="ghost" size="icon" onClick={() => removeRow(i)} className="text-red-500 hover:text-red-600"><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_120px_120px_40px] gap-2 mt-3 pt-3 border-t border-[#E5E7EB]">
            <span className="text-sm font-bold text-[#111827] px-1">Totals</span>
            <span className="text-sm font-bold text-[#111827] text-right">{fmt(estTotal)}</span>
            <span className="text-sm font-bold text-[#111827] text-right">{fmt(actTotal)}</span>
            <span />
          </div>
          <Button variant="ghost" size="sm" onClick={addRow} className="mt-3 text-[#6B7280]"><Plus className="h-3 w-3 mr-1" />Add Row</Button>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className={cardCls}>
            <Label className={labelCls}>Contracted Price</Label>
            <Input className={cn(inputCls, "text-lg font-bold mt-1")} type="number" value={d.contractedPrice || ""} onChange={e => up({ contractedPrice: Number(e.target.value) || 0 })} />
          </div>
          <div className={cardCls}>
            <p className="text-xs text-[#6B7280] mb-1">Margin</p>
            <p className={cn("text-2xl font-extrabold", margin >= 0 ? "text-[#10B981]" : "text-red-500")}>{fmt(margin)}</p>
            <p className="text-xs text-[#6B7280] mt-1">{d.contractedPrice > 0 ? Math.round(margin / d.contractedPrice * 100) : 0}% margin</p>
          </div>
          <div className={cardCls}>
            <Label className={labelCls}>Sponsor Contributions</Label>
            <Input className={cn(inputCls, "mt-1")} type="number" value={d.sponsorContributions || ""} onChange={e => up({ sponsorContributions: Number(e.target.value) || 0 })} />
            <p className="text-xs text-[#10B981] mt-2 font-medium">{sponsorPct}% of Experience cost covered</p>
          </div>
        </div>
      </div>
    );
  };

  /* ── Phase 4 ─────────────────────────────────────────────────────── */
  const renderPhase4 = () => {
    const addSponsor = () => up({ sponsors: [...d.sponsors, { company: "", contact: "", email: "", tier: "Gold", value: 0, deliverables: "", obligations: {} }] });
    const updateSponsor = (i: number, patch: Partial<Sponsor>) => { const next = [...d.sponsors]; next[i] = { ...next[i], ...patch }; up({ sponsors: next }); };
    const removeSponsor = (i: number) => up({ sponsors: d.sponsors.filter((_, idx) => idx !== i) });
    const OBLIGATIONS = ["Logo on step-and-repeat", "Social media mention", "On-stage acknowledgment", "Stream overlay", "Post-event report"];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><p className="text-sm text-[#6B7280]">Total Sponsor Revenue</p><p className="text-2xl font-extrabold text-[#10B981]">{fmt(sponsorRevenue)}</p></div>
          <Button onClick={addSponsor} className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white"><Plus className="h-4 w-4 mr-1" />Add Sponsor</Button>
        </div>
        {d.sponsors.map((sp, i) => (
          <div key={i} className={cn(cardCls, "space-y-4")}>
            <div className="flex justify-between items-start">
              <p className="text-sm font-bold text-[#111827]">{sp.company || `Sponsor ${i + 1}`}</p>
              <Button variant="ghost" size="icon" onClick={() => removeSponsor(i)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <Input className={inputCls} placeholder="Company" value={sp.company} onChange={e => updateSponsor(i, { company: e.target.value })} />
              <Input className={inputCls} placeholder="Contact Name" value={sp.contact} onChange={e => updateSponsor(i, { contact: e.target.value })} />
              <Input className={inputCls} placeholder="Email" value={sp.email} onChange={e => updateSponsor(i, { email: e.target.value })} />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label className={labelCls}>Package Tier</Label><select className={cn(inputCls, "w-full rounded-md px-3 py-2 text-sm mt-1")} value={sp.tier} onChange={e => updateSponsor(i, { tier: e.target.value })}>{TIERS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><Label className={labelCls}>Package Value</Label><Input className={cn(inputCls, "mt-1")} type="number" value={sp.value || ""} onChange={e => updateSponsor(i, { value: Number(e.target.value) || 0 })} /></div>
            </div>
            <Textarea className={inputCls} placeholder="Deliverables" rows={2} value={sp.deliverables} onChange={e => updateSponsor(i, { deliverables: e.target.value })} />
            <div className="flex flex-wrap gap-3">
              {OBLIGATIONS.map(ob => (
                <label key={ob} className="flex items-center gap-2 text-sm text-[#6B7280] cursor-pointer">
                  <input type="checkbox" checked={!!sp.obligations[ob]} onChange={e => updateSponsor(i, { obligations: { ...sp.obligations, [ob]: e.target.checked } })} className="rounded border-gray-300" />{ob}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ── Phase 5 ─────────────────────────────────────────────────────── */
  const renderPhase5 = () => {
    const addCreator = () => up({ creators: [...d.creators, { name: "", handle: "", platform: "Instagram", followers: 0, talkTitle: "", timeSlot: "", preCreatives: false, postCreatives: false, preDate: "", dayOfDate: "", postDate: "", notes: "" }] });
    const updateCreator = (i: number, patch: Partial<Creator>) => { const next = [...d.creators]; next[i] = { ...next[i], ...patch }; up({ creators: next }); };
    const removeCreator = (i: number) => up({ creators: d.creators.filter((_, idx) => idx !== i) });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-8">
            <div><p className="text-xs text-[#6B7280]">Estimated Reach</p><p className="text-xl font-extrabold text-[#111827]">{totalReach.toLocaleString()}</p></div>
            <div><p className="text-xs text-[#6B7280]">Virtual Audience (10x)</p><p className="text-xl font-extrabold text-[#10B981]">{(d.attendance * 10).toLocaleString()}</p></div>
          </div>
          <Button onClick={addCreator} className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white"><Plus className="h-4 w-4 mr-1" />Add Creator</Button>
        </div>
        {d.creators.map((c, i) => (
          <div key={i} className={cn(cardCls, "space-y-3")}>
            <div className="flex justify-between items-start">
              <p className="text-sm font-bold text-[#111827]">{c.name || `Creator ${i + 1}`}</p>
              <Button variant="ghost" size="icon" onClick={() => removeCreator(i)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SpeakerSelector
                value={c.name}
                onChange={(name) => updateCreator(i, { name })}
                onSelect={(spk) => {
                  updateCreator(i, { name: spk.name });
                  if (spk.topic) updateCreator(i, { talkTitle: spk.topic });
                }}
                placeholder="Name"
                compact
              />
              <Input className={inputCls} placeholder="@handle" value={c.handle} onChange={e => updateCreator(i, { handle: e.target.value })} />
              <select className={cn(inputCls, "rounded-md px-3 py-2 text-sm")} value={c.platform} onChange={e => updateCreator(i, { platform: e.target.value })}>{PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select>
              <Input className={inputCls} placeholder="Followers" type="number" value={c.followers || ""} onChange={e => updateCreator(i, { followers: Number(e.target.value) || 0 })} />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Input className={inputCls} placeholder="Talk Title" value={c.talkTitle} onChange={e => updateCreator(i, { talkTitle: e.target.value })} />
              <Input className={inputCls} placeholder="Scheduled Time Slot" value={c.timeSlot} onChange={e => updateCreator(i, { timeSlot: e.target.value })} />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-[#6B7280]"><input type="checkbox" checked={c.preCreatives} onChange={e => updateCreator(i, { preCreatives: e.target.checked })} className="rounded border-gray-300" />Pre-event creatives</label>
              <label className="flex items-center gap-2 text-sm text-[#6B7280]"><input type="checkbox" checked={c.postCreatives} onChange={e => updateCreator(i, { postCreatives: e.target.checked })} className="rounded border-gray-300" />Post-event creatives</label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs text-[#6B7280]">Pre-event Post</Label><Input className={inputCls} type="date" value={c.preDate} onChange={e => updateCreator(i, { preDate: e.target.value })} /></div>
              <div><Label className="text-xs text-[#6B7280]">Day-of Post</Label><Input className={inputCls} type="date" value={c.dayOfDate} onChange={e => updateCreator(i, { dayOfDate: e.target.value })} /></div>
              <div><Label className="text-xs text-[#6B7280]">Post-event Post</Label><Input className={inputCls} type="date" value={c.postDate} onChange={e => updateCreator(i, { postDate: e.target.value })} /></div>
            </div>
            <Textarea className={inputCls} placeholder="Green room / logistics notes" rows={1} value={c.notes} onChange={e => updateCreator(i, { notes: e.target.value })} />
          </div>
        ))}
      </div>
    );
  };

  /* ── Phase 6 ─────────────────────────────────────────────────────── */
  const renderPhase6 = () => {
    const toggleCheck = (key: string) => up({ checklist: { ...d.checklist, [key]: !d.checklist[key] } });
    const addDest = () => up({ streamDests: [...d.streamDests, { platform: "", url: "" }] });
    const updateDest = (i: number, patch: Partial<StreamDest>) => { const next = [...d.streamDests]; next[i] = { ...next[i], ...patch }; up({ streamDests: next }); };
    const removeDest = (i: number) => up({ streamDests: d.streamDests.filter((_, idx) => idx !== i) });
    const addEmergency = () => up({ emergencyContacts: [...d.emergencyContacts, { name: "", role: "", phone: "" }] });
    const updateEmergency = (i: number, patch: Partial<EmergencyContact>) => { const next = [...d.emergencyContacts]; next[i] = { ...next[i], ...patch }; up({ emergencyContacts: next }); };

    return (
      <div className="space-y-6">
        <div className={cardCls}>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-4">Day-Of Checklist</p>
          <div className="space-y-3">
            {CHECKLIST_ITEMS.map(item => (
              <label key={item} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!d.checklist[item]} onChange={() => toggleCheck(item)} className="rounded border-gray-300 w-5 h-5" />
                <span className={cn("text-sm", d.checklist[item] ? "text-[#10B981] line-through" : "text-[#111827]")}>{item}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-[#6B7280] mt-3">{Object.values(d.checklist).filter(Boolean).length} / {CHECKLIST_ITEMS.length} complete</p>
        </div>
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">Stream Destinations</p>
            <Button variant="ghost" size="sm" onClick={addDest} className="text-[#6B7280]"><Plus className="h-3 w-3 mr-1" />Add</Button>
          </div>
          {d.streamDests.map((dest, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_40px] gap-2 mb-2">
              <Input className={inputCls} placeholder="Platform" value={dest.platform} onChange={e => updateDest(i, { platform: e.target.value })} />
              <Input className={inputCls} placeholder="RTMP URL" value={dest.url} onChange={e => updateDest(i, { url: e.target.value })} />
              <Button variant="ghost" size="icon" onClick={() => removeDest(i)} className="text-red-500"><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280]">Emergency Contacts</p>
            <Button variant="ghost" size="sm" onClick={addEmergency} className="text-[#6B7280]"><Plus className="h-3 w-3 mr-1" />Add</Button>
          </div>
          {d.emergencyContacts.map((ec, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 mb-2">
              <Input className={inputCls} placeholder="Name" value={ec.name} onChange={e => updateEmergency(i, { name: e.target.value })} />
              <Input className={inputCls} placeholder="Role" value={ec.role} onChange={e => updateEmergency(i, { role: e.target.value })} />
              <Input className={inputCls} placeholder="Phone" value={ec.phone} onChange={e => updateEmergency(i, { phone: e.target.value })} />
            </div>
          ))}
        </div>
        <div><Label className={labelCls}>Green Room Notes</Label><Textarea className={inputCls} rows={3} value={d.greenRoomNotes} onChange={e => up({ greenRoomNotes: e.target.value })} placeholder="Special instructions, allergies, equipment needs..." /></div>
      </div>
    );
  };

  /* ── Phase 7 ─────────────────────────────────────────────────────── */
  const renderPhase7 = () => (
    <div className="space-y-6">
      <div className={cardCls}>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-4">Event Summary</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-[#6B7280]">Organization</p><p className="text-[#111827] font-medium">{d.orgName || "—"}</p></div>
          <div><p className="text-[#6B7280]">Event</p><p className="text-[#111827] font-medium">{d.eventName || "—"}</p></div>
          <div><p className="text-[#6B7280]">Dates</p><p className="text-[#111827] font-medium">{d.startDate || "—"} to {d.endDate || "—"}</p></div>
          <div><p className="text-[#6B7280]">Experience Team</p><p className="text-[#111827] font-medium">{[d.pdxTeam.planner, d.pdxTeam.avProducer, d.pdxTeam.mcHost].filter(Boolean).join(", ") || "—"}</p></div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div><Label className={labelCls}>Live Attendance</Label><Input className={inputCls} type="number" value={d.aarLiveAttendance || ""} onChange={e => up({ aarLiveAttendance: Number(e.target.value) || 0 })} /></div>
        <div><Label className={labelCls}>Virtual Viewers</Label><Input className={inputCls} type="number" value={d.aarVirtualViewers || ""} onChange={e => up({ aarVirtualViewers: Number(e.target.value) || 0 })} /></div>
      </div>
      {d.creators.length > 0 && (
        <div className={cardCls}>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-3">Creator Roster ({d.creators.length})</p>
          {d.creators.map((c, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5 border-b border-[#E5E7EB] last:border-0">
              <span className="text-[#111827]">{c.name} <span className="text-[#6B7280]">@{c.handle}</span></span>
              <span className="text-[#6B7280]">{c.followers.toLocaleString()} followers</span>
            </div>
          ))}
          <p className="text-sm text-[#10B981] font-medium mt-3">Total Reach: {totalReach.toLocaleString()}</p>
        </div>
      )}
      <div className={cardCls}>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] mb-3">Budget vs Actual</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-[#6B7280] text-xs">Estimated</p><p className="text-[#111827] font-bold">{fmt(estTotal)}</p></div>
          <div><p className="text-[#6B7280] text-xs">Actual</p><p className="text-[#111827] font-bold">{fmt(actTotal)}</p></div>
          <div><p className="text-[#6B7280] text-xs">Contracted</p><p className="text-[#1e3a5f] font-bold">{fmt(d.contractedPrice)}</p></div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div><Label className={labelCls}>Peak Viewers</Label><Input className={inputCls} type="number" value={d.aarPeakViewers || ""} onChange={e => up({ aarPeakViewers: Number(e.target.value) || 0 })} /></div>
        <div><Label className={labelCls}>Total Watch Time</Label><Input className={inputCls} value={d.aarWatchTime} onChange={e => up({ aarWatchTime: e.target.value })} placeholder="e.g. 12,500 hours" /></div>
      </div>
      <div><Label className={labelCls}>Social Campaign Results</Label><Textarea className={inputCls} rows={2} value={d.aarSocialResults} onChange={e => up({ aarSocialResults: e.target.value })} /></div>
      <div><Label className={labelCls}>Key Wins</Label><Textarea className={inputCls} rows={3} value={d.aarKeyWins} onChange={e => up({ aarKeyWins: e.target.value })} placeholder="What went well?" /></div>
      <div><Label className={labelCls}>Recommendations for Next Year</Label><Textarea className={inputCls} rows={3} value={d.aarRecommendations} onChange={e => up({ aarRecommendations: e.target.value })} placeholder="What should change?" /></div>
      <div className="flex gap-3 flex-wrap">
        <Button onClick={generateAar} disabled={aiLoading} className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white">
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate AAR with AI
        </Button>
        <Button variant="outline" onClick={exportPdf} className="border-[#D1D5DB] text-[#6B7280] hover:bg-gray-50 hover:text-[#111827]"><Download className="h-4 w-4 mr-2" />Export AAR as PDF</Button>
      </div>
      {d.aarAiSummary && (
        <div className="bg-[#1e3a5f]/10 border border-[#1e3a5f]/30 rounded-xl p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1e3a5f] mb-3">AI-Generated Executive Summary</p>
          <div className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">{d.aarAiSummary}</div>
        </div>
      )}
    </div>
  );

  const RENDERERS = [renderPhase1, renderPhase2, renderPhase3, renderPhase4, renderPhase5, renderPhase6, renderPhase7];

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6 md:p-10">
      <h1 className="text-2xl font-bold text-[#111827] mb-1">Create Experience</h1>
      <p className="text-[#6B7280] text-sm mb-8">MilCrunch Experience — end-to-end live event stage setup wizard.</p>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-10 overflow-x-auto pb-2 bg-white rounded-xl border border-[#E5E7EB] px-4 py-3">
        {PHASES.map((p, i) => {
          const completed = i < phase;
          const active = i === phase;
          return (
            <div key={i} className="flex items-center">
              <button type="button" onClick={() => setPhase(i)} className="flex items-center gap-2 group">
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all flex-shrink-0", completed ? "bg-[#1e3a5f] text-white" : active ? "border-2 border-[#1e3a5f] text-[#1e3a5f]" : "border border-[#D1D5DB] text-[#6B7280]")}>
                  {completed ? <Check className="h-4 w-4" /> : <p.icon className="h-4 w-4" />}
                </div>
                <span className={cn("text-xs font-medium whitespace-nowrap transition-colors hidden md:inline", completed ? "text-[#1e3a5f]" : active ? "text-[#111827]" : "text-[#6B7280]")}>{p.label}</span>
              </button>
              {i < PHASES.length - 1 && <div className={cn("w-6 lg:w-10 h-px mx-1 flex-shrink-0", i < phase ? "bg-[#1e3a5f]" : "bg-[#E5E7EB]")} />}
            </div>
          );
        })}
      </div>

      <div className="mb-6">
        <Badge className="bg-[#1e3a5f] text-white border-[#1e3a5f] mb-2">Phase {phase + 1} of 7</Badge>
        <h2 className="text-xl font-bold text-[#111827]">{PHASES[phase].label}</h2>
      </div>

      {RENDERERS[phase]()}

      <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setPhase(Math.max(0, phase - 1))} disabled={phase === 0} className="border-[#D1D5DB] text-[#6B7280] hover:bg-gray-50 hover:text-[#111827]">
            <ChevronLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <Button variant="outline" onClick={saveAndExit} disabled={savingExit || saving} className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/10">
            {savingExit ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <LogOut className="h-4 w-4 mr-1" />}Save &amp; Exit
          </Button>
        </div>
        <div className="flex gap-3">
          {phase === 6 ? (
            <Button onClick={save} disabled={saving} className="bg-[#10B981] hover:bg-[#059669] text-white px-8">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}Save Experience Event
            </Button>
          ) : (
            <Button onClick={() => setPhase(Math.min(6, phase + 1))} className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white px-8">
              Next<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
