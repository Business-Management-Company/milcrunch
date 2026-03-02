import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Loader2, ChevronDown, ChevronRight, Clock, Mail, CheckCircle2 } from "lucide-react";

interface LogRow {
  id: string;
  email: string;
  session_start: string;
  session_end: string | null;
  total_time_seconds: number | null;
  tabs_viewed: { tab: string; at: string }[];
  tabs_completed: { tab: string; at: string }[];
  created_at: string;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ProspectusAccessLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("prospectus_access_log")
        .select("*")
        .order("session_start", { ascending: false });
      if (error) {
        console.warn("[ProspectusAccessLog] fetch error:", error.message);
      }
      setRows(
        (data ?? []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          email: r.email as string,
          session_start: r.session_start as string,
          session_end: (r.session_end as string) ?? null,
          total_time_seconds: (r.total_time_seconds as number) ?? null,
          tabs_viewed: Array.isArray(r.tabs_viewed) ? r.tabs_viewed as { tab: string; at: string }[] : [],
          tabs_completed: Array.isArray(r.tabs_completed) ? r.tabs_completed as { tab: string; at: string }[] : [],
          created_at: r.created_at as string,
        }))
      );
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Eye className="h-5 w-5 text-[#1e3a5f]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prospectus Access Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {rows.length} session{rows.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="w-8 px-3 py-3" />
              <th className="text-left font-medium text-gray-500 px-4 py-3">Email</th>
              <th className="text-left font-medium text-gray-500 px-4 py-3">Date</th>
              <th className="text-left font-medium text-gray-500 px-4 py-3">Time Spent</th>
              <th className="text-center font-medium text-gray-500 px-4 py-3">Tabs Viewed</th>
              <th className="text-center font-medium text-gray-500 px-4 py-3">Tabs Completed</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  No sessions recorded yet
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isExpanded = expandedId === row.id;
                // Unique tabs viewed
                const uniqueViewed = new Set(row.tabs_viewed.map((t) => t.tab)).size;
                const completedCount = row.tabs_completed.length;

                return (
                  <tr key={row.id} className="border-b border-gray-50 group">
                    <td colSpan={6} className="p-0">
                      {/* Main row */}
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : row.id)}
                        className="w-full flex items-center hover:bg-gray-50/50 transition-colors"
                      >
                        <span className="w-8 px-3 py-3 flex items-center justify-center">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </span>
                        <span className="flex-1 text-left px-4 py-3 font-medium text-gray-900">
                          {row.email}
                        </span>
                        <span className="px-4 py-3 text-gray-500 text-left min-w-[180px]">
                          {formatDate(row.session_start)}
                        </span>
                        <span className="px-4 py-3 text-gray-600 text-left min-w-[100px]">
                          {formatDuration(row.total_time_seconds)}
                        </span>
                        <span className="px-4 py-3 text-center min-w-[100px]">
                          <span className="inline-flex items-center gap-1 text-gray-600">
                            <Eye className="h-3.5 w-3.5" /> {uniqueViewed}
                          </span>
                        </span>
                        <span className="px-4 py-3 text-center min-w-[120px]">
                          <span className="inline-flex items-center gap-1 text-gray-600">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {completedCount}
                          </span>
                        </span>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-12 pb-4 pt-1 bg-gray-50/30 border-t border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Tabs Viewed */}
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Eye className="h-3.5 w-3.5" /> Tabs Viewed
                              </h4>
                              {row.tabs_viewed.length === 0 ? (
                                <p className="text-xs text-gray-400">No tab views recorded</p>
                              ) : (
                                <ul className="space-y-1">
                                  {row.tabs_viewed.map((tv, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-700 font-medium">{tv.tab}</span>
                                      <span className="text-gray-400">
                                        {new Date(tv.at).toLocaleTimeString("en-US", {
                                          hour: "numeric",
                                          minute: "2-digit",
                                          second: "2-digit",
                                        })}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            {/* Tabs Completed */}
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Tabs Completed
                              </h4>
                              {row.tabs_completed.length === 0 ? (
                                <p className="text-xs text-gray-400">No tabs completed</p>
                              ) : (
                                <ul className="space-y-1">
                                  {row.tabs_completed.map((tc, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                      <span className="text-gray-700 font-medium">{tc.tab}</span>
                                      <span className="text-gray-400">
                                        {new Date(tc.at).toLocaleTimeString("en-US", {
                                          hour: "numeric",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>

                          {/* Session metadata */}
                          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-6 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Session: {formatDate(row.session_start)}
                              {row.session_end ? ` → ${new Date(row.session_end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : " (ongoing)"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {row.email}
                            </span>
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
    </div>
  );
}
