import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Loader2, ChevronDown, ChevronRight, Clock, Mail, CheckCircle2, ArrowUp, ArrowDown, ChevronLeft } from "lucide-react";

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

type SortKey = "email" | "date" | "time" | "viewed" | "completed";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [25, 50, "all"] as const;
type PageSize = 25 | 50 | "all";

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

function getRowValue(row: LogRow, key: SortKey): string | number {
  switch (key) {
    case "email": return row.email.toLowerCase();
    case "date": return new Date(row.session_start).getTime();
    case "time": return row.total_time_seconds ?? 0;
    case "viewed": return new Set(row.tabs_viewed.map((t) => t.tab)).size;
    case "completed": return row.tabs_completed.length;
  }
}

export default function ProspectusAccessLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [currentPage, setCurrentPage] = useState(0);

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const aVal = getRowValue(a, sortKey);
      const bVal = getRowValue(b, sortKey);
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rows, sortKey, sortDir]);

  const totalPages = pageSize === "all" ? 1 : Math.ceil(sortedRows.length / pageSize);
  const paginatedRows = pageSize === "all"
    ? sortedRows
    : sortedRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const showPagination = rows.length > 25;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "email" ? "asc" : "desc");
    }
    setCurrentPage(0);
  }

  function handlePageSizeChange(size: PageSize) {
    setPageSize(size);
    setCurrentPage(0);
  }

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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 200px)" }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
            <tr className="border-b border-gray-100">
              <th className="w-8 px-3 py-3" />
              {([
                { key: "email" as SortKey, label: "Email", align: "text-left" },
                { key: "date" as SortKey, label: "Date", align: "text-left" },
                { key: "time" as SortKey, label: "Time Spent", align: "text-left" },
                { key: "viewed" as SortKey, label: "Tabs Viewed", align: "text-center" },
                { key: "completed" as SortKey, label: "Tabs Completed", align: "text-center" },
              ]).map(({ key, label, align }) => (
                <th key={key} className={`${align} font-medium text-gray-500 px-4 py-3`}>
                  <button
                    type="button"
                    onClick={() => handleSort(key)}
                    className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors"
                  >
                    {label}
                    {sortKey === key ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
                      )
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-gray-300" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="overflow-y-auto">
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
              paginatedRows.map((row) => {
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

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <span>Show:</span>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <button
                key={String(size)}
                type="button"
                onClick={() => handlePageSizeChange(size as PageSize)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  pageSize === size
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                {size === "all" ? "All" : size}
              </button>
            ))}
          </div>

          {pageSize !== "all" && totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">
                {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sortedRows.length)} of {sortedRows.length}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
