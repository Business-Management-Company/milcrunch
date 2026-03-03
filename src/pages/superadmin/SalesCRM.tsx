import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  Download,
  Users,
  UserPlus,
  Calendar,
  Trophy,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types & constants                                                    */
/* ------------------------------------------------------------------ */

interface Lead {
  id: string;
  full_name: string;
  email: string;
  organization: string | null;
  role: string | null;
  message: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "contacted", label: "Contacted", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "demo_scheduled", label: "Demo Scheduled", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "demo_complete", label: "Demo Complete", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  { value: "negotiating", label: "Negotiating", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "won", label: "Won", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

const ROLE_LABELS: Record<string, string> = {
  brand_sponsor: "Brand / Sponsor",
  event_organizer: "Event Organizer",
  creator: "Creator",
  media: "Media",
  government_military: "Gov / Military",
  other: "Other",
};

const STATUS_MAP = new Map(STATUS_OPTIONS.map((s) => [s.value, s]));

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export default function SalesCRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<"all" | "7" | "30" | "90">("all");

  // Inline notes editing
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");

  // Sort
  const [sortField, setSortField] = useState<"created_at" | "full_name" | "status" | "updated_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("[SalesCRM] fetch error:", error.message);
    }
    setLeads(
      (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        full_name: r.full_name as string,
        email: r.email as string,
        organization: (r.organization as string) ?? null,
        role: (r.role as string) ?? null,
        message: (r.message as string) ?? null,
        status: (r.status as string) ?? "new",
        notes: (r.notes as string) ?? null,
        created_at: r.created_at as string,
        updated_at: r.updated_at as string,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Status update
  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus, updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", lead.id);
    if (error) {
      toast.error("Failed to update status.");
      return;
    }
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, status: newStatus, updated_at: new Date().toISOString() } : l)),
    );
  };

  // Notes save
  const handleSaveNotes = async (leadId: string) => {
    const { error } = await supabase
      .from("leads")
      .update({ notes: notesValue.trim() || null, updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", leadId);
    if (error) {
      toast.error("Failed to save notes.");
      return;
    }
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, notes: notesValue.trim() || null, updated_at: new Date().toISOString() } : l,
      ),
    );
    setEditingNotesId(null);
    toast.success("Notes saved.");
  };

  // Filtered & sorted leads
  const filteredLeads = useMemo(() => {
    let result = leads;

    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (roleFilter !== "all") {
      result = result.filter((l) => l.role === roleFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.full_name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          (l.organization && l.organization.toLowerCase().includes(q)),
      );
    }
    if (dateRange !== "all") {
      const days = parseInt(dateRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter((l) => new Date(l.created_at) >= cutoff);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "created_at" || sortField === "updated_at") {
        cmp = new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime();
      } else if (sortField === "full_name") {
        cmp = a.full_name.localeCompare(b.full_name);
      } else if (sortField === "status") {
        const order = STATUS_OPTIONS.map((s) => s.value);
        cmp = order.indexOf(a.status) - order.indexOf(b.status);
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [leads, statusFilter, roleFilter, searchQuery, dateRange, sortField, sortDir]);

  // Quick stats
  const stats = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return {
      total: leads.length,
      newLast7: leads.filter((l) => l.status === "new" && new Date(l.created_at) >= sevenDaysAgo).length,
      demosScheduled: leads.filter((l) => l.status === "demo_scheduled").length,
      won: leads.filter((l) => l.status === "won").length,
    };
  }, [leads]);

  // CSV Export
  const exportCSV = () => {
    const headers = ["Name", "Email", "Organization", "Role", "Status", "Message", "Notes", "Submitted", "Updated"];
    const rows = filteredLeads.map((l) => [
      l.full_name,
      l.email,
      l.organization || "",
      ROLE_LABELS[l.role || ""] || l.role || "",
      STATUS_MAP.get(l.status)?.label || l.status,
      (l.message || "").replace(/"/g, '""'),
      (l.notes || "").replace(/"/g, '""'),
      formatDateTime(l.created_at),
      formatDateTime(l.updated_at),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `milcrunch-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIndicator = ({ field }: { field: typeof sortField }) => (
    <span className="ml-1 text-gray-400">
      {sortField === field ? (sortDir === "desc" ? "↓" : "↑") : ""}
    </span>
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Users className="h-5 w-5 text-[#1e3a5f]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales CRM</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {leads.length} lead{leads.length !== 1 ? "s" : ""} total
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Leads", value: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "New (7 days)", value: stats.newLast7, icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Demos Scheduled", value: stats.demosScheduled, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Won", value: stats.won, icon: Trophy, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("h-4.5 w-4.5", stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, org..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
        >
          <option value="all">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {/* Date range */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
        >
          <option value="all">All Time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="w-8 px-3 py-3" />
              <th
                className="text-left font-medium text-gray-500 px-4 py-3 cursor-pointer select-none hover:text-gray-700"
                onClick={() => toggleSort("full_name")}
              >
                Name <SortIndicator field="full_name" />
              </th>
              <th className="text-left font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Email</th>
              <th className="text-left font-medium text-gray-500 px-4 py-3 hidden lg:table-cell">Organization</th>
              <th className="text-left font-medium text-gray-500 px-4 py-3 hidden lg:table-cell">Role</th>
              <th
                className="text-left font-medium text-gray-500 px-4 py-3 cursor-pointer select-none hover:text-gray-700"
                onClick={() => toggleSort("status")}
              >
                Status <SortIndicator field="status" />
              </th>
              <th
                className="text-left font-medium text-gray-500 px-4 py-3 cursor-pointer select-none hover:text-gray-700 hidden sm:table-cell"
                onClick={() => toggleSort("created_at")}
              >
                Submitted <SortIndicator field="created_at" />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-400">
                  {leads.length === 0 ? "No leads yet" : "No leads match your filters"}
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => {
                const isExpanded = expandedId === lead.id;
                const statusInfo = STATUS_MAP.get(lead.status) || STATUS_OPTIONS[0];
                return (
                  <tr key={lead.id} className="border-b border-gray-50">
                    <td colSpan={7} className="p-0">
                      {/* Main row */}
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                        className="w-full flex items-center hover:bg-gray-50/50 transition-colors text-left"
                      >
                        <span className="w-8 px-3 py-3 flex items-center justify-center shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </span>
                        <span className="flex-1 px-4 py-3 font-medium text-gray-900 min-w-0 truncate">
                          {lead.full_name}
                        </span>
                        <span className="px-4 py-3 text-gray-500 min-w-[180px] truncate hidden md:block">
                          {lead.email}
                        </span>
                        <span className="px-4 py-3 text-gray-500 min-w-[140px] truncate hidden lg:block">
                          {lead.organization || "—"}
                        </span>
                        <span className="px-4 py-3 text-gray-500 min-w-[120px] hidden lg:block">
                          {ROLE_LABELS[lead.role || ""] || lead.role || "—"}
                        </span>
                        <span className="px-4 py-3 min-w-[130px]" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead, e.target.value)}
                            className={cn(
                              "text-[11px] font-semibold px-2.5 py-1 rounded-full border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20",
                              statusInfo.color,
                            )}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </span>
                        <span className="px-4 py-3 text-gray-500 min-w-[110px] shrink-0 hidden sm:block">
                          {formatDate(lead.created_at)}
                        </span>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-12 pb-5 pt-2 bg-gray-50/30 border-t border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left: Lead info */}
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact</p>
                                <p className="text-sm text-gray-900">{lead.full_name}</p>
                                <p className="text-sm text-gray-600">{lead.email}</p>
                                {lead.organization && (
                                  <p className="text-sm text-gray-600">{lead.organization}</p>
                                )}
                              </div>
                              {lead.role && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Role</p>
                                  <p className="text-sm text-gray-700">{ROLE_LABELS[lead.role] || lead.role}</p>
                                </div>
                              )}
                              {lead.message && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Message</p>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.message}</p>
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-400 pt-2">
                                <span>Submitted: {formatDateTime(lead.created_at)}</span>
                                <span>Updated: {formatDateTime(lead.updated_at)}</span>
                              </div>
                            </div>

                            {/* Right: Notes */}
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Internal Notes</p>
                              {editingNotesId === lead.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={notesValue}
                                    onChange={(e) => setNotesValue(e.target.value)}
                                    rows={4}
                                    placeholder="Add internal notes about this lead..."
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveNotes(lead.id)}
                                      className="px-3 py-1.5 rounded-lg bg-[#1e3a5f] text-white text-xs font-medium hover:bg-[#2d5282]"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingNotesId(null)}
                                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNotesId(lead.id);
                                    setNotesValue(lead.notes || "");
                                  }}
                                  className="w-full text-left"
                                >
                                  {lead.notes ? (
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white border border-gray-200 rounded-lg p-3 hover:border-[#1e3a5f]/30 transition-colors cursor-text">
                                      {lead.notes}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-gray-400 italic bg-white border border-dashed border-gray-200 rounded-lg p-3 hover:border-[#1e3a5f]/30 transition-colors cursor-text">
                                      Click to add notes...
                                    </p>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      {!loading && filteredLeads.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-right">
          Showing {filteredLeads.length} of {leads.length} lead{leads.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
