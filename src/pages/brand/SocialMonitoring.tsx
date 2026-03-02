import { useState, useMemo, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  BarChart3,
  Plus,
  X,
  Loader2,
  ExternalLink,
  RefreshCw,
  Hash,
  AtSign,
  MessageCircle,
  Heart,
  Repeat2,
  Eye,
  Database,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow, subDays, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  SENTIMENT_CONFIG,
  SentimentBadge,
  formatCount,
  type Monitor,
  type Mention,
  type MonitorRun,
  type TrackedKeyword,
} from "@/lib/social-monitoring-types";
import SocialAgentChat from "@/components/brand/SocialAgentChat";
import TrendAlerts from "@/components/brand/TrendAlerts";
import CompetitorComparison from "@/components/brand/CompetitorComparison";

const ALL_BRANDS = "__all__";

/* =========== COMPONENT =========== */

export default function SocialMonitoring() {
  // ── State ──
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [activeMonitorId, setActiveMonitorId] = useState<string | null>(null);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [lastRun, setLastRun] = useState<MonitorRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [seeding, setSeeding] = useState(false);

  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [newKeywordText, setNewKeywordText] = useState("");
  const [newKeywordType, setNewKeywordType] = useState<TrackedKeyword["type"]>("hashtag");

  const [mentionSort, setMentionSort] = useState("recent");
  const [mentionPlatformFilter, setMentionPlatformFilter] = useState("all");
  const [mentionSentimentFilter, setMentionSentimentFilter] = useState("all");
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [hiddenKeywords, setHiddenKeywords] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [compareMonitorId, setCompareMonitorId] = useState<string | null>(null);

  // Date range filter
  const [rangeDays, setRangeDays] = useState(30);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const isAll = activeMonitorId === ALL_BRANDS;
  const activeMonitor = monitors.find((m) => m.id === activeMonitorId) || null;

  // ── Load monitors ──
  const loadMonitors = useCallback(async () => {
    const { data, error } = await supabase
      .from("brand_monitors")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[SocialMon] Monitor load error:", error.message);
      return;
    }

    const typed = (data || []) as unknown as Monitor[];
    setMonitors(typed);
    if (typed.length > 0 && !activeMonitorId) {
      setActiveMonitorId(ALL_BRANDS);
    }
  }, [activeMonitorId]);

  // ── Load mentions for active monitor (or all) with date range ──
  const loadMentions = useCallback(async () => {
    if (!activeMonitorId) {
      setMentions([]);
      setLoading(false);
      return;
    }

    // Compute date range
    const now = new Date();
    let rangeStart: Date;
    let rangeEnd: Date = now;
    if (rangeDays === -1) {
      rangeStart = customStart ? new Date(customStart) : subDays(now, 30);
      rangeEnd = customEnd ? new Date(customEnd + "T23:59:59") : now;
    } else if (rangeDays === 0) {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      rangeStart = subDays(now, rangeDays);
    }

    let query = supabase
      .from("social_mentions")
      .select("*")
      .gte("detected_at", rangeStart.toISOString());

    if (activeMonitorId !== ALL_BRANDS) {
      query = query.eq("monitor_id", activeMonitorId);
    }
    if (rangeDays === -1 && customEnd) {
      query = query.lte("detected_at", rangeEnd.toISOString());
    }

    const { data, error } = await query.order("detected_at", { ascending: false });

    if (error) {
      console.error("[SocialMon] Mention load error:", error.message);
    }

    setMentions((data || []) as unknown as Mention[]);

    // Load last run (only for single monitor)
    if (activeMonitorId !== ALL_BRANDS) {
      const { data: runs } = await supabase
        .from("monitor_runs")
        .select("*")
        .eq("monitor_id", activeMonitorId)
        .order("ran_at", { ascending: false })
        .limit(1);
      setLastRun(((runs || [])[0] as unknown as MonitorRun) || null);
    } else {
      setLastRun(null);
    }
    setLoading(false);
  }, [activeMonitorId, rangeDays, customStart, customEnd]);

  useEffect(() => {
    loadMonitors();
  }, [loadMonitors]);

  useEffect(() => {
    if (activeMonitorId) {
      setLoading(true);
      loadMentions();
    }
  }, [activeMonitorId, loadMentions]);

  // ── Derived keywords from active monitor (or all monitors) ──
  const keywords: TrackedKeyword[] = useMemo(() => {
    const sanitizeHash = (h: string) => `#${h.replace(/^#+/, "")}`;
    if (isAll) {
      const result: TrackedKeyword[] = [];
      const seen = new Set<string>();
      for (const m of monitors) {
        for (const k of m.keywords || []) {
          if (!seen.has(`kw-${k}`)) { seen.add(`kw-${k}`); result.push({ id: `kw-${k}`, text: k, type: "keyword" }); }
        }
        for (const h of m.hashtags || []) {
          if (!seen.has(`ht-${h}`)) { seen.add(`ht-${h}`); result.push({ id: `ht-${h}`, text: sanitizeHash(h), type: "hashtag" }); }
        }
      }
      return result;
    }
    if (!activeMonitor) return [];
    const result: TrackedKeyword[] = [];
    for (const k of activeMonitor.keywords || []) {
      result.push({ id: `kw-${k}`, text: k, type: "keyword" });
    }
    for (const h of activeMonitor.hashtags || []) {
      result.push({ id: `ht-${h}`, text: sanitizeHash(h), type: "hashtag" });
    }
    return result;
  }, [activeMonitor, isAll, monitors]);

  /* --- derived stats --- */
  const totalMentions = mentions.length;
  const daySpan = rangeDays > 0 ? rangeDays
    : rangeDays === 0 ? 1
    : Math.max(1, customStart && customEnd
      ? differenceInDays(new Date(customEnd), new Date(customStart)) || 1
      : 30);
  const avgDaily = (totalMentions / daySpan).toFixed(1);
  const rangeLabel = rangeDays === 0 ? "Today"
    : rangeDays === -1 ? "Custom range"
    : `Last ${rangeDays} days`;
  const estimatedReach = mentions.reduce((sum, m) => sum + (m.estimated_reach || 0), 0);
  const positiveCount = mentions.filter((m) => m.sentiment === "positive").length;
  const neutralCount = mentions.filter((m) => m.sentiment === "neutral").length;
  const negativeCount = mentions.filter((m) => m.sentiment === "negative").length;
  const mixedCount = mentions.filter((m) => m.sentiment === "mixed").length;
  const sentimentScore = totalMentions > 0 ? Math.round((positiveCount / totalMentions) * 100) : 0;
  const sentimentEmoji = sentimentScore > 70 ? "😊" : sentimentScore > 40 ? "😐" : "😟";

  /* --- visible keywords for filtering chart --- */
  const visibleKeywordTexts = useMemo(() => {
    if (hiddenKeywords.size === 0) return null; // null = no filtering, show all
    return new Set(
      keywords.filter((k) => !hiddenKeywords.has(k.id)).map((k) => k.text.replace(/^#/, "").toLowerCase())
    );
  }, [keywords, hiddenKeywords]);

  const chartMentions = useMemo(() => {
    if (!visibleKeywordTexts) return mentions; // no filter active
    return mentions.filter((m) =>
      m.matched_keywords?.some((mk) => visibleKeywordTexts.has(mk.toLowerCase()))
    );
  }, [mentions, visibleKeywordTexts]);

  /* --- timeline chart data --- */
  const timelineData = useMemo(() => {
    const now = new Date();
    const end = rangeDays === -1 && customEnd ? new Date(customEnd + "T23:59:59") : now;
    const dayCount = rangeDays > 0 ? rangeDays : rangeDays === 0 ? 1 : daySpan;
    const days: Record<string, number> = {};
    for (let i = dayCount - 1; i >= 0; i--) {
      const key = format(subDays(end, i), "MMM d");
      days[key] = 0;
    }
    chartMentions.forEach((m) => {
      const key = format(new Date(m.detected_at), "MMM d");
      if (days[key] !== undefined) {
        days[key]++;
      }
    });
    return Object.entries(days).map(([day, count]) => ({ day, mentions: count }));
  }, [chartMentions, rangeDays, customEnd, daySpan]);
  const chartInterval = Math.max(0, Math.floor(timelineData.length / 12) - 1);

  /* --- platform breakdown --- */
  const platformBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    mentions.forEach((m) => { counts[m.platform] = (counts[m.platform] || 0) + 1; });
    const total = mentions.length || 1;
    return Object.entries(counts)
      .map(([platform, count]) => ({
        platform,
        label: PLATFORM_LABELS[platform] || platform,
        count,
        pct: Math.round((count / total) * 100),
        color: PLATFORM_COLORS[platform] || "#999",
      }))
      .sort((a, b) => b.count - a.count);
  }, [mentions]);

  /* --- filtered & sorted mentions --- */
  const filteredMentions = useMemo(() => {
    let list = [...mentions];
    if (mentionPlatformFilter !== "all") list = list.filter((m) => m.platform === mentionPlatformFilter);
    if (mentionSentimentFilter !== "all") list = list.filter((m) => m.sentiment === mentionSentimentFilter);
    if (mentionSort === "recent") list.sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());
    else if (mentionSort === "engaged") list.sort((a, b) => (b.engagement_likes + b.engagement_comments + b.engagement_shares) - (a.engagement_likes + a.engagement_comments + a.engagement_shares));
    else if (mentionSort === "reach") list.sort((a, b) => b.creator_followers - a.creator_followers);
    return list;
  }, [mentions, mentionSort, mentionPlatformFilter, mentionSentimentFilter]);

  /* --- top voices --- */
  const topVoices = useMemo(() => {
    const map: Record<string, { handle: string; name: string; avatar: string | null; platform: string; followers: number; mentionCount: number }> = {};
    mentions.forEach((m) => {
      if (!map[m.creator_handle]) {
        map[m.creator_handle] = {
          handle: m.creator_handle,
          name: m.creator_name || m.creator_handle,
          avatar: m.creator_avatar,
          platform: m.platform,
          followers: m.creator_followers,
          mentionCount: 0,
        };
      }
      map[m.creator_handle].mentionCount++;
    });
    return Object.values(map).sort((a, b) => b.followers - a.followers).slice(0, 6);
  }, [mentions]);

  /* --- handlers --- */
  const handleScan = async () => {
    if (!activeMonitorId) {
      toast.error("Select a monitor first");
      return;
    }
    setScanning(true);
    setScanProgress("Scanning cached creators...");

    try {
      const resp = await fetch("/api/social-listening-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan", monitor_id: activeMonitorId }),
      });

      const result = await resp.json();

      if (!resp.ok) {
        toast.error(result.error || "Scan failed");
        setScanning(false);
        setScanProgress("");
        return;
      }

      // Show diagnostic info about Claude sentiment
      const sentimentInfo = result.claude_calls > 0
        ? `Claude: ${result.claude_calls} analyzed${result.claude_errors ? `, ${result.claude_errors} errors` : ""}`
        : result.claude_skip_reason
          ? `Sentiment skipped: ${result.claude_skip_reason}`
          : "Sentiment: no API key configured";

      const msg = result.capped
        ? `Found ${result.posts_found} matches — analyzed ${result.posts_analyzed} (capped). ${sentimentInfo}`
        : `${result.posts_analyzed} new mentions found. ${sentimentInfo}`;

      if (!result.anthropic_key_present) {
        toast.error("Anthropic API key not found — set ANTHROPIC_API_KEY in Vercel env vars");
      } else if (result.claude_errors > 0) {
        toast.warning(msg);
      } else {
        toast.success(msg);
      }
      await loadMentions();
    } catch (err) {
      toast.error("Scan request failed");
      console.error("[scan]", err);
    }

    setScanning(false);
    setScanProgress("");
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      // First ensure tables
      await fetch("/api/social-listening-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ensure_tables" }),
      });

      // Then seed
      const resp = await fetch("/api/social-listening-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });

      const result = await resp.json();
      if (resp.ok) {
        toast.success(`Seeded ${result.mentions_seeded} mentions across ${result.monitors_created} monitors`);
        await loadMonitors();
        await loadMentions();
      } else {
        toast.error(result.error || "Seed failed");
      }
    } catch (err) {
      toast.error("Seed request failed");
      console.error("[seed]", err);
    }
    setSeeding(false);
  };

  const addKeyword = async () => {
    if (!newKeywordText.trim() || !activeMonitorId || !activeMonitor) return;

    const text = newKeywordText.trim().toLowerCase().replace(/^#/, "");
    const isHashtag = newKeywordType === "hashtag";

    const field = isHashtag ? "hashtags" : "keywords";
    const existing = activeMonitor[field] || [];
    if (existing.includes(text)) {
      toast.info("Already tracked");
      setShowAddKeyword(false);
      return;
    }

    const updated = [...existing, text];
    const { error } = await supabase
      .from("brand_monitors")
      .update({ [field]: updated, updated_at: new Date().toISOString() })
      .eq("id", activeMonitorId);

    if (error) {
      toast.error("Failed to add keyword");
      return;
    }

    toast.success(`"${isHashtag ? "#" : ""}${text}" is now being tracked`);
    setNewKeywordText("");
    setShowAddKeyword(false);
    await loadMonitors();
  };

  const removeKeyword = async (kw: TrackedKeyword) => {
    if (!activeMonitorId || !activeMonitor) return;

    const isHashtag = kw.type === "hashtag";
    const field = isHashtag ? "hashtags" : "keywords";
    const text = kw.text.replace(/^#/, "").toLowerCase();
    const existing = activeMonitor[field] || [];
    const updated = existing.filter((k: string) => k !== text);

    const { error } = await supabase
      .from("brand_monitors")
      .update({ [field]: updated, updated_at: new Date().toISOString() })
      .eq("id", activeMonitorId);

    if (error) {
      toast.error("Failed to remove keyword");
      return;
    }

    await loadMonitors();
  };

  const KEYWORD_ACTIVE_STYLE = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  const KEYWORD_HIDDEN_STYLE = "bg-gray-100 text-gray-400 dark:bg-gray-800/50 dark:text-gray-600";

  const toggleKeywordVisibility = (id: string) => {
    setHiddenKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const CHART_COLORS = ["#1e3a5f"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Monitoring</h1>
          <p className="text-gray-500 text-sm mt-1">Track mentions, sentiment, and reach across social platforms.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Monitor selector */}
          {monitors.length > 0 && (
            <Select value={activeMonitorId || ""} onValueChange={setActiveMonitorId}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Select monitor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BRANDS}>All Brands</SelectItem>
                {monitors.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.brand_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleScan} disabled={scanning || !activeMonitorId || isAll} className="bg-[#1e3a5f] hover:bg-[#2d5282]">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {scanning ? "Scanning..." : "Scan Now"}
          </Button>
          {monitors.length > 1 && (
            <Button onClick={() => setShowComparison(true)} variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-1" /> Compare
            </Button>
          )}
          <Button onClick={handleSeedDemo} disabled={seeding} variant="outline" size="sm" title="Seed demo data">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Database className="h-4 w-4 mr-1" />}
            Seed Demo
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      {activeMonitorId && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground mr-1">Range:</span>
          {[
            { label: "Today", days: 0 },
            { label: "7D", days: 7 },
            { label: "15D", days: 15 },
            { label: "30D", days: 30 },
            { label: "60D", days: 60 },
            { label: "90D", days: 90 },
            { label: "180D", days: 180 },
          ].map(({ label, days }) => (
            <button
              key={days}
              type="button"
              onClick={() => setRangeDays(days)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                rangeDays === days
                  ? "bg-[#1e3a5f] text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRangeDays(-1)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              rangeDays === -1
                ? "bg-[#1e3a5f] text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Custom
          </button>
          {rangeDays === -1 && (
            <div className="flex items-center gap-2 ml-2">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-[140px] h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-[140px] h-8 text-xs"
              />
            </div>
          )}
        </div>
      )}

      {/* Scan Progress */}
      {scanning && scanProgress && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700 dark:text-blue-400">{scanProgress}</span>
        </div>
      )}

      {/* Summary banner */}
      {(lastRun || (isAll && totalMentions > 0)) && !alertDismissed && (
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#8B7CF7] text-white rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {isAll ? "All tracked brands" : activeMonitor?.brand_name} {totalMentions === 1 ? "has" : "have"} {totalMentions} mention{totalMentions !== 1 ? "s" : ""} ({rangeLabel.toLowerCase()})
              </p>
              {lastRun && (
                <p className="text-xs text-white/80 mt-0.5">
                  Last scan: {lastRun.posts_analyzed} mentions analyzed from cached data (0 API credits used)
                  {lastRun.duration_ms ? ` in ${(lastRun.duration_ms / 1000).toFixed(1)}s` : ""}
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setAlertDismissed(true)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* AI Agent Chat */}
      {activeMonitorId && !isAll && (
        <SocialAgentChat
          activeMonitorId={activeMonitorId}
          activeMonitor={activeMonitor}
          monitors={monitors}
          onFilterSentiment={(v) => setMentionSentimentFilter(v)}
          onFilterPlatform={(v) => setMentionPlatformFilter(v)}
          onFilterSponsored={() => {/* future: sponsored filter */}}
          onCompare={() => setShowComparison(true)}
        />
      )}

      {/* No monitors state */}
      {!loading && monitors.length === 0 && (
        <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-8 text-center">
          <Database className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-2">No monitors yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Click "Seed Demo" to create sample monitors with USAA, VetTix, and Grunt Style, or create tables in Supabase first.</p>
          <Button onClick={handleSeedDemo} disabled={seeding} className="bg-[#1e3a5f] hover:bg-[#2d5282]">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
            Seed Demo Data
          </Button>
        </Card>
      )}

      {/* Stats Row */}
      {activeMonitorId && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
                  <MessageCircle className="h-5 w-5 text-blue-700 dark:text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Mentions</p>
                  <p className="text-2xl font-bold">{totalMentions}</p>
                  <p className="text-xs text-green-600">{rangeLabel}</p>
                </div>
              </div>
            </Card>
            <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
                  <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Daily</p>
                  <p className="text-2xl font-bold">{avgDaily}</p>
                  <p className="text-xs text-muted-foreground">mentions/day</p>
                </div>
              </div>
            </Card>
            <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-2">
                  <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Est. Reach</p>
                  <p className="text-2xl font-bold">{formatCount(estimatedReach)}</p>
                  <p className="text-xs text-muted-foreground">total audience</p>
                </div>
              </div>
            </Card>
            <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-4">
              <div className="flex items-center gap-3">
                <div className="bg-teal-100 dark:bg-teal-900/30 rounded-lg p-2">
                  <span className="text-lg">{sentimentEmoji}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sentiment</p>
                  <p className="text-2xl font-bold">{sentimentScore}%</p>
                  <p className="text-xs text-green-600">positive</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Trend Alerts */}
          <TrendAlerts
            mentions={mentions}
            onFilterSentiment={(v) => setMentionSentimentFilter(v)}
          />

          {/* Tracked Keywords */}
          <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm text-gray-900 dark:text-white">Tracked Keywords & Hashtags</h2>
              {!isAll && (
                <Button size="sm" variant="outline" onClick={() => setShowAddKeyword(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Keyword
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {keywords.map((k) => {
                const isHidden = hiddenKeywords.has(k.id);
                const count = mentions.filter((m) =>
                  m.matched_keywords?.some((mk) => mk.toLowerCase() === k.text.replace(/^#/, "").toLowerCase())
                ).length;
                return (
                  <button
                    type="button"
                    key={k.id}
                    onClick={() => toggleKeywordVisibility(k.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${isHidden ? KEYWORD_HIDDEN_STYLE : KEYWORD_ACTIVE_STYLE}`}
                    title={isHidden ? "Click to show in chart" : "Click to hide from chart"}
                  >
                    {k.type === "hashtag" ? <Hash className="h-3 w-3" /> : k.type === "mention" ? <AtSign className="h-3 w-3" /> : null}
                    {k.text}
                    {count > 0 && (
                      <Badge className={`text-xs ml-0.5 px-1.5 py-0 ${isHidden ? "bg-gray-200/60 dark:bg-gray-700/40 text-gray-400 dark:text-gray-600" : "bg-white/60 dark:bg-black/20 text-current"}`}>{count}</Badge>
                    )}
                    {!isAll && (
                      <span onClick={(e) => { e.stopPropagation(); removeKeyword(k); }} className="ml-0.5 opacity-50 hover:opacity-100">
                        <X className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
              {keywords.length === 0 && (
                <p className="text-sm text-muted-foreground">No keywords tracked yet. Add some to start scanning.</p>
              )}
            </div>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Mentions Timeline */}
            <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-5 lg:col-span-2">
              <h2 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Mentions Timeline</h2>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={chartInterval} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="mentions"
                    stroke={CHART_COLORS[0]}
                    fill={CHART_COLORS[0]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    name="Mentions"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Platform Breakdown */}
            <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-5">
              <h2 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Platform Breakdown</h2>
              <div className="space-y-3">
                {platformBreakdown.map((p) => (
                  <div key={p.platform}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-sm font-medium">{p.label}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{p.pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
                    </div>
                  </div>
                ))}
                {platformBreakdown.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                )}
              </div>
            </Card>
          </div>

          {/* Sentiment Analysis */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(["positive", "neutral", "negative", "mixed"] as const).map((s) => {
              const conf = SENTIMENT_CONFIG[s];
              const count = s === "positive" ? positiveCount : s === "neutral" ? neutralCount : s === "negative" ? negativeCount : mixedCount;
              const pct = totalMentions > 0 ? Math.round((count / totalMentions) * 100) : 0;
              return (
                <Card key={s} className={`rounded-xl border ${conf.border} ${conf.bg} p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{conf.emoji}</span>
                    <span className={`font-semibold text-sm ${conf.text}`}>{conf.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className={`text-xs ${conf.text}`}>{pct}% of mentions</p>
                  <div className="h-1.5 bg-white/50 dark:bg-black/20 rounded-full mt-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: conf.color }} />
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Recent Mentions Feed */}
          <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-semibold text-sm text-gray-900 dark:text-white">Recent Mentions</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={mentionSort} onValueChange={setMentionSort}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="engaged">Most Engaged</SelectItem>
                    <SelectItem value="reach">Most Reach</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={mentionPlatformFilter} onValueChange={setMentionPlatformFilter}>
                  <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {Object.entries(PLATFORM_LABELS).map(([val, lab]) => (
                      <SelectItem key={val} value={val}>{lab}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={mentionSentimentFilter} onValueChange={setMentionSentimentFilter}>
                  <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiment</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredMentions.map((m) => (
                  <div key={m.id} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4 hover:shadow-md transition">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: PLATFORM_COLORS[m.platform] || "#666" }}>
                        {PLATFORM_LABELS[m.platform]?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-sm">{m.creator_name || m.creator_handle}</span>
                          <span className="text-xs text-muted-foreground">@{m.creator_handle}</span>
                          <Badge variant="outline" className="text-xs">{formatCount(m.creator_followers)} followers</Badge>
                          {m.is_sponsored && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Sponsored</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">{m.caption_snippet}</p>
                        {m.brand_context && (
                          <p className="text-xs text-muted-foreground italic mb-2">{m.brand_context}</p>
                        )}
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Heart className="h-3 w-3" /> {formatCount(m.engagement_likes)}</span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MessageCircle className="h-3 w-3" /> {formatCount(m.engagement_comments)}</span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Repeat2 className="h-3 w-3" /> {formatCount(m.engagement_shares)}</span>
                          {m.engagement_views > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Eye className="h-3 w-3" /> {formatCount(m.engagement_views)}</span>
                          )}
                          <SentimentBadge sentiment={m.sentiment} />
                          {m.matched_keywords && m.matched_keywords.length > 0 && (
                            <div className="flex gap-1">
                              {m.matched_keywords.map((kw) => (
                                <Badge key={kw} variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20">{kw}</Badge>
                              ))}
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDistanceToNow(new Date(m.detected_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      {m.post_url && (
                        <a href={m.post_url} target="_blank" rel="noreferrer" className="shrink-0">
                          <Button variant="ghost" size="sm" className="text-xs">
                            View <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {filteredMentions.length === 0 && !loading && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {totalMentions === 0 ? 'No mentions yet. Click "Scan Now" to scan cached creators.' : "No mentions match your filters."}
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Top Voices */}
          {topVoices.length > 0 && (
            <Card className="rounded-xl border bg-white dark:bg-[#1A1D27] p-5">
              <h2 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Top Voices</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {topVoices.map((v) => (
                  <div key={v.handle} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center hover:shadow-md transition">
                    <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold" style={{ backgroundColor: PLATFORM_COLORS[v.platform] || "#666" }}>
                      {(v.name || v.handle).charAt(0)}
                    </div>
                    <p className="font-semibold text-xs truncate">{v.name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{v.handle}</p>
                    <Badge variant="outline" className="text-xs mt-1">{formatCount(v.followers)}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{v.mentionCount} mention{v.mentionCount !== 1 ? "s" : ""}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Add Keyword Modal */}
      <Dialog open={showAddKeyword} onOpenChange={setShowAddKeyword}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Tracked Keyword</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Keyword or Hashtag</Label>
              <Input
                value={newKeywordText}
                onChange={(e) => setNewKeywordText(e.target.value)}
                placeholder="#YourHashtag"
                className="mt-1"
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={newKeywordType} onValueChange={(v) => setNewKeywordType(v as TrackedKeyword["type"])}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hashtag">Hashtag</SelectItem>
                  <SelectItem value="keyword">Keyword</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addKeyword} disabled={!newKeywordText.trim()} className="w-full bg-[#1e3a5f] hover:bg-[#2d5282]">
              Start Tracking
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Competitor Comparison */}
      <CompetitorComparison
        monitors={monitors}
        activeMonitorId={activeMonitorId}
        compareMonitorId={compareMonitorId}
        onSelectCompare={setCompareMonitorId}
        onClose={() => setShowComparison(false)}
        open={showComparison}
      />
    </div>
  );
}
