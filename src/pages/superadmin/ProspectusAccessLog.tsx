import { useState, useEffect, useMemo, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Eye, Loader2, ChevronDown, ChevronRight, Clock, Mail, CheckCircle2,
  ArrowUp, ArrowDown, ChevronLeft, Users, BarChart3, Timer, Trophy,
  AlertCircle, List, User, Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface VideoView {
  started: boolean;
  watch_time: number;
  duration: number;
  completed: boolean;
}

interface LogRow {
  id: string;
  email: string;
  session_start: string;
  session_end: string | null;
  total_time_seconds: number | null;
  tabs_viewed: { tab: string; at: string }[];
  tabs_completed: { tab: string; at: string }[];
  video_views: Record<string, VideoView>;
  created_at: string;
}

interface EmailGroup {
  email: string;
  sessions: LogRow[];
  totalSessions: number;
  totalTimeSeconds: number;
  furthestTab: string;
  totalTabsCompleted: number;
  lastVisit: string;
}

type SortKey = "email" | "date" | "time" | "viewed" | "completed";
type SortDir = "asc" | "desc";
type EmailSortKey = "email" | "sessions" | "time" | "completed" | "lastVisit";
type ViewMode = "sessions" | "byEmail";

const PAGE_SIZE_OPTIONS = [25, 50, "all"] as const;
type PageSize = 25 | 50 | "all";

const ALL_TABS = [
  "Overview", "Events & Attendee App", "Event Venues", "Discovery",
  "Verification", "365 Insights", "Social Media", "Streaming/Media",
  "Partnership Model", "Financial Model",
];

const INTERNAL_EMAILS = new Set(["andrew@podlogix.co", "appletonab@gmail.com"]);
const isInternal = (email: string) => INTERNAL_EMAILS.has(email.toLowerCase());

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds === 0) return "< 1 min";
  if (seconds < 60) return "< 1 min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Format seconds as m:ss for video timestamps (always show even if 0:00) */
function fmtVideoTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
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

function getEmailGroupValue(g: EmailGroup, key: EmailSortKey): string | number {
  switch (key) {
    case "email": return g.email.toLowerCase();
    case "sessions": return g.totalSessions;
    case "time": return g.totalTimeSeconds;
    case "completed": return g.totalTabsCompleted;
    case "lastVisit": return new Date(g.lastVisit).getTime();
  }
}

/** Compute per-tab time from the tabs_viewed entries */
function computeTabTimes(tabsViewed: { tab: string; at: string }[], sessionEnd: string | null, totalSeconds: number | null): Map<string, number> {
  const times = new Map<string, number>();
  if (tabsViewed.length === 0) return times;
  for (let i = 0; i < tabsViewed.length; i++) {
    const start = new Date(tabsViewed[i].at).getTime();
    let end: number;
    if (i + 1 < tabsViewed.length) {
      end = new Date(tabsViewed[i + 1].at).getTime();
    } else if (sessionEnd) {
      end = new Date(sessionEnd).getTime();
    } else if (totalSeconds != null) {
      // Estimate: session_start + total_time_seconds
      end = start + (totalSeconds > 0 ? totalSeconds * 1000 : 60000);
    } else {
      end = start + 60000; // assume 1 min if no data
    }
    const secs = Math.max(0, Math.round((end - start) / 1000));
    times.set(tabsViewed[i].tab, (times.get(tabsViewed[i].tab) ?? 0) + secs);
  }
  return times;
}

/* ------------------------------------------------------------------ */
/* Stat Card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
        color ?? "bg-blue-50 text-blue-600"
      )}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function ProspectusAccessLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [emailSortKey, setEmailSortKey] = useState<EmailSortKey>("lastVisit");
  const [emailSortDir, setEmailSortDir] = useState<SortDir>("desc");
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("sessions");
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  /* ---- Fetch ---- */
  useEffect(() => {
    (async () => {
      // Fetch sessions and video views in parallel
      const [logRes, videoRes] = await Promise.all([
        supabase.from("prospectus_access_log").select("*").order("session_start", { ascending: false }),
        supabase.from("prospectus_video_views").select("*"),
      ]);
      if (logRes.error) console.warn("[ProspectusAccessLog] fetch error:", logRes.error.message);

      // Build video views lookup: session_id → { tab_name → VideoView }
      const videoMap = new Map<string, Record<string, VideoView>>();
      if (videoRes.data) {
        for (const v of videoRes.data as { session_id: string; tab_name: string; video_started: boolean; watch_time_seconds: number; total_duration_seconds: number; completed: boolean }[]) {
          if (!videoMap.has(v.session_id)) videoMap.set(v.session_id, {});
          videoMap.get(v.session_id)![v.tab_name] = {
            started: v.video_started ?? false,
            watch_time: v.watch_time_seconds ?? 0,
            duration: v.total_duration_seconds ?? 0,
            completed: v.completed ?? false,
          };
        }
      }

      setRows(
        (logRes.data ?? []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          email: r.email as string,
          session_start: r.session_start as string,
          session_end: (r.session_end as string) ?? null,
          total_time_seconds: (r.total_time_seconds as number) ?? null,
          tabs_viewed: Array.isArray(r.tabs_viewed) ? r.tabs_viewed as { tab: string; at: string }[] : [],
          tabs_completed: Array.isArray(r.tabs_completed) ? r.tabs_completed as { tab: string; at: string }[] : [],
          video_views: videoMap.get(r.id as string) ?? {},
          created_at: r.created_at as string,
        }))
      );
      setLoading(false);
    })();
  }, []);

  /* ---- Aggregate stats (excludes internal accounts) ---- */
  const stats = useMemo(() => {
    if (rows.length === 0) return null;
    const extRows = rows.filter((r) => !isInternal(r.email));
    const uniqueEmails = new Set(extRows.map((r) => r.email.toLowerCase()));
    const totalSessions = extRows.length;
    const sessionsWithTime = extRows.filter((r) => r.total_time_seconds != null && r.total_time_seconds > 0);
    const avgTime = sessionsWithTime.length > 0
      ? Math.round(sessionsWithTime.reduce((s, r) => s + (r.total_time_seconds ?? 0), 0) / sessionsWithTime.length)
      : 0;

    // Tab view counts
    const tabCounts = new Map<string, number>();
    extRows.forEach((r) => {
      const seen = new Set<string>();
      r.tabs_viewed.forEach((tv) => {
        if (!seen.has(tv.tab)) {
          seen.add(tv.tab);
          tabCounts.set(tv.tab, (tabCounts.get(tv.tab) ?? 0) + 1);
        }
      });
    });
    const sorted = [...tabCounts.entries()].sort((a, b) => b[1] - a[1]);
    const mostViewed = sorted[0] ?? null;
    const leastViewed = sorted[sorted.length - 1] ?? null;

    // Completion rate: visitors who completed ALL tabs vs total unique visitors
    const completedAll = new Set<string>();
    const emailCompletions = new Map<string, Set<string>>();
    extRows.forEach((r) => {
      const em = r.email.toLowerCase();
      if (!emailCompletions.has(em)) emailCompletions.set(em, new Set());
      r.tabs_completed.forEach((tc) => emailCompletions.get(em)!.add(tc.tab));
    });
    emailCompletions.forEach((tabs, em) => {
      if (tabs.size >= ALL_TABS.length) completedAll.add(em);
    });
    const completionRate = uniqueEmails.size > 0
      ? Math.round((completedAll.size / uniqueEmails.size) * 100)
      : 0;

    return {
      uniqueVisitors: uniqueEmails.size,
      totalSessions,
      avgTime,
      mostViewed,
      leastViewed,
      completionRate,
      completedAll: completedAll.size,
    };
  }, [rows]);

  /* ---- Session sort + paginate ---- */
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = getRowValue(a, sortKey);
      const bVal = getRowValue(b, sortKey);
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  const totalPages = pageSize === "all" ? 1 : Math.ceil(sortedRows.length / pageSize);
  const paginatedRows = pageSize === "all"
    ? sortedRows
    : sortedRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  /* ---- Email groups ---- */
  const emailGroups = useMemo((): EmailGroup[] => {
    const map = new Map<string, LogRow[]>();
    rows.forEach((r) => {
      const em = r.email.toLowerCase();
      if (!map.has(em)) map.set(em, []);
      map.get(em)!.push(r);
    });
    return [...map.entries()].map(([email, sessions]) => {
      const totalTime = sessions.reduce((s, r) => s + (r.total_time_seconds ?? 0), 0);
      const allCompleted = new Set<string>();
      sessions.forEach((r) => r.tabs_completed.forEach((tc) => allCompleted.add(tc.tab)));

      // Furthest tab: the last tab in ALL_TABS order that was completed
      let furthestTab = "—";
      for (let i = ALL_TABS.length - 1; i >= 0; i--) {
        if (allCompleted.has(ALL_TABS[i])) { furthestTab = ALL_TABS[i]; break; }
      }
      if (furthestTab === "—") {
        // Fall back to last viewed tab
        const allViewed: string[] = [];
        sessions.forEach((r) => r.tabs_viewed.forEach((tv) => {
          if (!allViewed.includes(tv.tab)) allViewed.push(tv.tab);
        }));
        for (let i = ALL_TABS.length - 1; i >= 0; i--) {
          if (allViewed.includes(ALL_TABS[i])) { furthestTab = ALL_TABS[i] + " (viewed)"; break; }
        }
      }

      const lastVisit = sessions.reduce((latest, r) =>
        new Date(r.session_start).getTime() > new Date(latest).getTime() ? r.session_start : latest
      , sessions[0].session_start);

      return {
        email: sessions[0].email, // preserve original casing
        sessions,
        totalSessions: sessions.length,
        totalTimeSeconds: totalTime,
        furthestTab,
        totalTabsCompleted: allCompleted.size,
        lastVisit,
      };
    });
  }, [rows]);

  const sortedEmailGroups = useMemo(() => {
    return [...emailGroups].sort((a, b) => {
      const aVal = getEmailGroupValue(a, emailSortKey);
      const bVal = getEmailGroupValue(b, emailSortKey);
      if (aVal < bVal) return emailSortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return emailSortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [emailGroups, emailSortKey, emailSortDir]);

  /* ---- Handlers ---- */
  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "email" ? "asc" : "desc"); }
    setCurrentPage(0);
  }

  function handleEmailSort(key: EmailSortKey) {
    if (emailSortKey === key) setEmailSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setEmailSortKey(key); setEmailSortDir(key === "email" ? "asc" : "desc"); }
  }

  function handlePageSizeChange(size: PageSize) {
    setPageSize(size);
    setCurrentPage(0);
  }

  const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) =>
    active
      ? dir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-blue-600" /> : <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
      : <ArrowDown className="h-3.5 w-3.5 text-gray-300" />;

  /* ================================================================ */
  /* RENDER                                                            */
  /* ================================================================ */
  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
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

        {/* View toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("sessions")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              viewMode === "sessions" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <List className="h-3.5 w-3.5" /> Sessions
          </button>
          <button
            type="button"
            onClick={() => setViewMode("byEmail")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              viewMode === "byEmail" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <User className="h-3.5 w-3.5" /> By Person
          </button>
        </div>
      </div>

      {/* ---- Aggregate Summary ---- */}
      {!loading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Unique Visitors"
            value={stats.uniqueVisitors}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            icon={<BarChart3 className="h-4 w-4" />}
            label="Total Sessions"
            value={stats.totalSessions}
            color="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            icon={<Timer className="h-4 w-4" />}
            label="Avg Time / Session"
            value={formatDuration(stats.avgTime)}
            color="bg-violet-50 text-violet-600"
          />
          <StatCard
            icon={<Trophy className="h-4 w-4" />}
            label="Most Viewed Tab"
            value={stats.mostViewed ? `${stats.mostViewed[1]}` : "—"}
            sub={stats.mostViewed?.[0] ?? undefined}
            color="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={<AlertCircle className="h-4 w-4" />}
            label="Least Viewed Tab"
            value={stats.leastViewed ? `${stats.leastViewed[1]}` : "—"}
            sub={stats.leastViewed?.[0] ?? undefined}
            color="bg-amber-50 text-amber-600"
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Completion Rate"
            value={`${stats.completionRate}%`}
            sub={`${stats.completedAll} of ${stats.uniqueVisitors} finished all`}
            color="bg-green-50 text-green-600"
          />
        </div>
      )}

      {/* ================================================================ */}
      {/* SESSION VIEW                                                      */}
      {/* ================================================================ */}
      {viewMode === "sessions" && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 340px)" }}>
            {/* Scrollable wrapper */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "20%" }} />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
                  <tr className="border-b border-gray-100">
                    <th className="px-2 py-3" />
                    {([
                      { key: "email" as SortKey, label: "Email" },
                      { key: "date" as SortKey, label: "Date" },
                      { key: "time" as SortKey, label: "Time Spent" },
                      { key: "viewed" as SortKey, label: "Tabs Viewed" },
                      { key: "completed" as SortKey, label: "Tabs Completed" },
                    ]).map(({ key, label }) => (
                      <th key={key} className="text-left font-medium text-gray-500 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleSort(key)}
                          className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors"
                        >
                          {label}
                          <SortIcon active={sortKey === key} dir={sortDir} />
                        </button>
                      </th>
                    ))}
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
                    paginatedRows.map((row) => {
                      const isExpanded = expandedId === row.id;
                      const uniqueViewed = new Set(row.tabs_viewed.map((t) => t.tab)).size;
                      const completedCount = row.tabs_completed.length;
                      const completedSet = new Set(row.tabs_completed.map((tc) => tc.tab));
                      const tabTimes = isExpanded ? computeTabTimes(row.tabs_viewed, row.session_end, row.total_time_seconds) : null;

                      // Deduplicate tabs_viewed to get ordered unique tabs
                      const orderedTabs: { tab: string; at: string }[] = [];
                      const seenTabs = new Set<string>();
                      row.tabs_viewed.forEach((tv) => {
                        if (!seenTabs.has(tv.tab)) {
                          seenTabs.add(tv.tab);
                          orderedTabs.push(tv);
                        }
                      });

                      const rowIsInternal = isInternal(row.email);

                      return (
                        <Fragment key={row.id}>
                          <tr
                            onClick={() => setExpandedId(isExpanded ? null : row.id)}
                            className={cn(
                              "border-b border-gray-50 cursor-pointer hover:bg-gray-50/50 transition-colors",
                              rowIsInternal && "opacity-50"
                            )}
                          >
                            <td className="px-2 py-3 text-center">
                              {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 mx-auto" /> : <ChevronRight className="h-4 w-4 text-gray-400 mx-auto" />}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900 truncate">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate">{row.email}</span>
                                {rowIsInternal && <span className="shrink-0 text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Internal</span>}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 truncate">
                              {formatDate(row.session_start)}
                            </td>
                            <td className="px-4 py-3 text-gray-600 tabular-nums">
                              {formatDuration(row.total_time_seconds)}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              <span className="inline-flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" /> {uniqueViewed}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              <span className="inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {completedCount}
                              </span>
                            </td>
                          </tr>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <tr className="border-b border-gray-50">
                              <td colSpan={6} className="px-12 pb-5 pt-2 bg-gray-50/30">
                                {/* Tab journey */}
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                  Tab Journey (in order viewed)
                                </h4>
                                {orderedTabs.length === 0 ? (
                                  <p className="text-xs text-gray-400 mb-4">No tab views recorded</p>
                                ) : (
                                  <div className="space-y-1.5 mb-4">
                                    {orderedTabs.map((tv, i) => {
                                      const isCompleted = completedSet.has(tv.tab);
                                      const time = tabTimes?.get(tv.tab) ?? null;
                                      const vv = row.video_views[tv.tab];
                                      return (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-gray-200 text-gray-500 shrink-0">
                                            {i + 1}
                                          </span>
                                          {isCompleted ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                          ) : (
                                            <Eye className="h-4 w-4 text-gray-300 shrink-0" />
                                          )}
                                          <span className={cn(
                                            "font-medium",
                                            isCompleted ? "text-gray-900" : "text-gray-500"
                                          )}>
                                            {tv.tab}
                                          </span>
                                          {/* Video watch indicator */}
                                          {vv && (
                                            <span className={cn(
                                              "inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded tabular-nums",
                                              vv.completed ? "bg-emerald-50 text-emerald-700" : vv.started ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"
                                            )}>
                                              <Play className="h-3 w-3" />
                                              {vv.started
                                                ? `${fmtVideoTime(vv.watch_time)} / ${fmtVideoTime(vv.duration)}`
                                                : "Not watched"}
                                              {vv.completed && <CheckCircle2 className="h-3 w-3" />}
                                            </span>
                                          )}
                                          {time != null && (
                                            <span className="text-xs text-gray-400 tabular-nums">
                                              {formatDuration(time)}
                                            </span>
                                          )}
                                          <span className="text-xs text-gray-300">
                                            {new Date(tv.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                                          </span>
                                          {isCompleted && (
                                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                              COMPLETED
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Tabs NOT viewed */}
                                {(() => {
                                  const notViewed = ALL_TABS.filter((t) => !seenTabs.has(t));
                                  if (notViewed.length === 0) return null;
                                  return (
                                    <div className="mb-4">
                                      <p className="text-xs text-gray-400 mb-1">Not viewed:</p>
                                      <p className="text-xs text-gray-400">
                                        {notViewed.join(", ")}
                                      </p>
                                    </div>
                                  );
                                })()}

                                {/* Session metadata */}
                                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-4 text-xs text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(row.session_start)}
                                    {row.session_end ? ` → ${new Date(row.session_end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : " (ongoing)"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> {row.email}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {rows.length > 25 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <span>Show:</span>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <button
                    key={String(size)}
                    type="button"
                    onClick={() => handlePageSizeChange(size as PageSize)}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-colors",
                      pageSize === size ? "bg-blue-100 text-blue-700 font-medium" : "hover:bg-gray-100 text-gray-600"
                    )}
                  >
                    {size === "all" ? "All" : size}
                  </button>
                ))}
              </div>

              {pageSize !== "all" && totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">
                    {currentPage * (pageSize as number) + 1}–{Math.min((currentPage + 1) * (pageSize as number), sortedRows.length)} of {sortedRows.length}
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
        </>
      )}

      {/* ================================================================ */}
      {/* BY EMAIL VIEW                                                     */}
      {/* ================================================================ */}
      {viewMode === "byEmail" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 340px)" }}>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "5%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "18%" }} />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
                <tr className="border-b border-gray-100">
                  <th className="px-2 py-3" />
                  {([
                    { key: "email" as EmailSortKey, label: "Email" },
                    { key: "sessions" as EmailSortKey, label: "Sessions" },
                    { key: "time" as EmailSortKey, label: "Total Time" },
                    { key: "completed" as EmailSortKey, label: "Tabs Completed" },
                    { key: "lastVisit" as EmailSortKey, label: "Last Visit" },
                  ]).map(({ key, label }) => (
                    <th key={key} className="text-left font-medium text-gray-500 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleEmailSort(key)}
                        className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors"
                      >
                        {label}
                        <SortIcon active={emailSortKey === key} dir={emailSortDir} />
                      </button>
                    </th>
                  ))}
                  <th className="text-left font-medium text-gray-500 px-4 py-3">Furthest Tab</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : emailGroups.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      No sessions recorded yet
                    </td>
                  </tr>
                ) : (
                  sortedEmailGroups.map((group) => {
                    const isExpanded = expandedEmail === group.email;
                    const groupIsInternal = isInternal(group.email);
                    return (
                      <Fragment key={group.email}>
                        <tr
                          onClick={() => setExpandedEmail(isExpanded ? null : group.email)}
                          className={cn(
                            "border-b border-gray-50 cursor-pointer hover:bg-gray-50/50 transition-colors",
                            groupIsInternal && "opacity-50"
                          )}
                        >
                          <td className="px-2 py-3 text-center">
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 mx-auto" /> : <ChevronRight className="h-4 w-4 text-gray-400 mx-auto" />}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 truncate">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate">{group.email}</span>
                              {groupIsInternal && <span className="shrink-0 text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Internal</span>}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {group.totalSessions}
                          </td>
                          <td className="px-4 py-3 text-gray-600 tabular-nums">
                            {formatDuration(group.totalTimeSeconds)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {group.totalTabsCompleted}/{ALL_TABS.length}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {formatDateShort(group.lastVisit)}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs truncate">
                            {group.furthestTab}
                          </td>
                        </tr>

                        {/* Expanded: individual sessions for this person */}
                        {isExpanded && (
                          <tr className="border-b border-gray-50">
                            <td colSpan={7} className="px-12 pb-5 pt-2 bg-gray-50/30">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                Session History
                              </h4>
                              <div className="space-y-3">
                                {group.sessions
                                  .sort((a, b) => new Date(b.session_start).getTime() - new Date(a.session_start).getTime())
                                  .map((session) => {
                                    const uniqueTabNames = [...new Set(session.tabs_viewed.map((t) => t.tab))];
                                    const completedSet = new Set(session.tabs_completed.map((tc) => tc.tab));
                                    return (
                                      <div key={session.id} className="bg-white rounded-lg border border-gray-100 p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-xs font-medium text-gray-700">
                                            {formatDate(session.session_start)}
                                          </span>
                                          <span className="text-xs text-gray-400 tabular-nums">
                                            {formatDuration(session.total_time_seconds)}
                                          </span>
                                        </div>
                                        {uniqueTabNames.length === 0 ? (
                                          <p className="text-xs text-gray-400">No tabs viewed</p>
                                        ) : (
                                          <div className="flex flex-wrap gap-1.5">
                                            {uniqueTabNames.map((tab) => (
                                              <span
                                                key={tab}
                                                className={cn(
                                                  "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium",
                                                  completedSet.has(tab)
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-gray-100 text-gray-500"
                                                )}
                                              >
                                                {completedSet.has(tab) && <CheckCircle2 className="h-3 w-3" />}
                                                {tab}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
