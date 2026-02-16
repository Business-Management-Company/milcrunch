import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye, Users, Mic, DollarSign, FileText, Download, Loader2,
  TrendingUp, ChevronDown, ChevronUp, BarChart3, PieChart as PieChartIcon,
  LineChart as LineChartIcon, Trophy, Star, Award, ArrowUpRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";

/* ---------- types ---------- */
interface EngagementMetric {
  id: string;
  event_id: string;
  metric_type: string;
  period_start: string;
  period_end: string;
  value: number;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

interface SponsorOption {
  id: string;
  sponsor_name: string;
}

interface ChartDataPoint {
  label: string;
  sponsor_impressions?: number;
  community_growth?: number;
  creator_engagement?: number;
  content_performance?: number;
  revenue_attribution?: number;
}

interface DirectoryCreator {
  id: string;
  creator_name: string | null;
  creator_handle: string;
  avatar_url: string | null;
  platform: string;
  follower_count: number | null;
  engagement_rate: number | null;
  profile_slug: string | null;
}

interface Props {
  eventId: string;
  eventStartDate?: string | null;
  directoryId?: string | null;
}

/* ---------- constants ---------- */
const METRIC_CONFIG: Record<string, { label: string; color: string; icon: typeof Eye }> = {
  sponsor_impressions: { label: "Sponsor Impressions", color: "#6C5CE7", icon: Eye },
  community_growth: { label: "Community Growth", color: "#0984E3", icon: Users },
  creator_engagement: { label: "Creator Engagement", color: "#00B894", icon: Mic },
  content_performance: { label: "Content Performance", color: "#FDCB6E", icon: FileText },
  revenue_attribution: { label: "Revenue Attribution", color: "#D63031", icon: DollarSign },
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PIE_COLORS = ["#6C5CE7", "#0984E3", "#00B894", "#FDCB6E", "#D63031", "#A29BFE"];

const RANK_BADGES: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: "Gold", color: "text-amber-700", bg: "bg-amber-100 border-amber-300" },
  1: { label: "Silver", color: "text-gray-600", bg: "bg-gray-100 border-gray-300" },
  2: { label: "Bronze", color: "text-orange-700", bg: "bg-orange-100 border-orange-300" },
};

/* ---------- component ---------- */
export default function EventInsightsTab({ eventId, directoryId }: Props) {
  const [metrics, setMetrics] = useState<EngagementMetric[]>([]);
  const [sponsors, setSponsors] = useState<SponsorOption[]>([]);
  const [creators, setCreators] = useState<DirectoryCreator[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSponsor, setSelectedSponsor] = useState("all");
  const [granularity, setGranularity] = useState<"monthly" | "quarterly">("monthly");
  const [chartType, setChartType] = useState<"line" | "donut">("line");
  const [pieMetric, setPieMetric] = useState<string>("sponsor_impressions");
  const [creatorSort, setCreatorSort] = useState<"impact" | "followers" | "engagement">("impact");
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    sponsor_impressions: true,
    community_growth: true,
    creator_engagement: true,
    content_performance: true,
    revenue_attribution: true,
  });

  // Collapsible sections
  const [showCreators, setShowCreators] = useState(false);
  const [showSponsors, setShowSponsors] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showImpact, setShowImpact] = useState(false);

  const chartRef = useRef<HTMLDivElement>(null);

  /* ---------- data fetching ---------- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queries: Promise<unknown>[] = [
        supabase
          .from("event_engagement_metrics")
          .select("*")
          .eq("event_id", eventId)
          .order("period_start", { ascending: true }),
        supabase
          .from("event_sponsors")
          .select("id, sponsor_name")
          .eq("event_id", eventId)
          .order("sort_order"),
      ];

      // Fetch directory creators if linked
      if (directoryId) {
        queries.push(
          supabase
            .from("directory_members")
            .select("id, creator_name, creator_handle, avatar_url, platform, follower_count, engagement_rate, profile_slug")
            .eq("directory_id", directoryId)
            .eq("approved", true)
            .order("follower_count", { ascending: false })
            .limit(20)
        );
      }

      const results = await Promise.all(queries);
      const [metricsRes, sponsorsRes] = results as [
        { data: unknown[] | null; error: unknown },
        { data: unknown[] | null; error: unknown },
      ];

      if ((metricsRes as { error: unknown }).error) throw (metricsRes as { error: unknown }).error;
      if ((sponsorsRes as { error: unknown }).error) console.error("Failed to load sponsors:", (sponsorsRes as { error: unknown }).error);

      setMetrics((metricsRes.data || []) as unknown as EngagementMetric[]);
      setSponsors((sponsorsRes.data || []) as unknown as SponsorOption[]);

      if (directoryId && results[2]) {
        const creatorsRes = results[2] as { data: unknown[] | null; error: unknown };
        if (creatorsRes.error) console.error("Failed to load creators:", creatorsRes.error);
        setCreators((creatorsRes.data || []) as unknown as DirectoryCreator[]);
      }
    } catch (err) {
      console.error("Error loading engagement metrics:", err);
      toast.error("Failed to load insights data");
    } finally {
      setLoading(false);
    }
  }, [eventId, directoryId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ---------- computed: top-level metric totals ---------- */
  const totals = useMemo(() => {
    const sum = (type: string) =>
      metrics
        .filter((m) => m.metric_type === type)
        .reduce((acc, m) => acc + Number(m.value), 0);

    const communityVals = metrics
      .filter((m) => m.metric_type === "community_growth")
      .map((m) => Number(m.value));
    const latestCommunity = communityVals.length > 0 ? communityVals[communityVals.length - 1] : 0;

    const creatorVals = metrics
      .filter((m) => m.metric_type === "creator_engagement")
      .map((m) => Number(m.value));
    const avgCreators = creatorVals.length > 0
      ? Math.round(creatorVals.reduce((a, b) => a + b, 0) / creatorVals.length)
      : 0;

    const totalRevenue = sum("revenue_attribution");
    const totalImpressions = sum("sponsor_impressions");
    const roiScore = totalImpressions > 0
      ? Math.round((totalRevenue / totalImpressions) * 100) / 100
      : 0;

    return {
      impressions: Math.round(totalImpressions),
      community: Math.round(latestCommunity),
      creators: avgCreators,
      roi: roiScore,
      content: Math.round(sum("content_performance")),
    };
  }, [metrics]);

  /* ---------- computed: chart data (line) ---------- */
  const chartData = useMemo(() => {
    const monthMap = new Map<string, ChartDataPoint>();

    for (const m of metrics) {
      const d = new Date(m.period_start + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const label = MONTH_LABELS[d.getMonth()];

      if (!monthMap.has(key)) {
        monthMap.set(key, { label });
      }
      const point = monthMap.get(key)!;

      if (m.metric_type === "sponsor_impressions") {
        if (selectedSponsor !== "all") {
          const sid = (m.metadata as Record<string, unknown>)?.sponsor_id;
          if (sid !== selectedSponsor) continue;
        }
        point.sponsor_impressions = (point.sponsor_impressions || 0) + Number(m.value);
      } else {
        const val = Number(m.value);
        point[m.metric_type as keyof Omit<ChartDataPoint, "label">] = val;
      }
    }

    let data = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    if (granularity === "quarterly" && data.length > 0) {
      const quarters: ChartDataPoint[] = [];
      for (let i = 0; i < data.length; i += 3) {
        const chunk = data.slice(i, i + 3);
        const qLabel = `Q${Math.floor(i / 3) + 1}`;
        const aggregated: ChartDataPoint = { label: qLabel };
        for (const key of Object.keys(METRIC_CONFIG) as (keyof typeof METRIC_CONFIG)[]) {
          const vals = chunk.map((c) => (c[key as keyof ChartDataPoint] as number) || 0);
          if (key === "community_growth") {
            aggregated[key as keyof Omit<ChartDataPoint, "label">] = vals[vals.length - 1];
          } else {
            aggregated[key as keyof Omit<ChartDataPoint, "label">] = vals.reduce((a, b) => a + b, 0);
          }
        }
        quarters.push(aggregated);
      }
      data = quarters;
    }

    return data;
  }, [metrics, selectedSponsor, granularity]);

  /* ---------- computed: pie chart data ---------- */
  const pieData = useMemo(() => {
    // For the selected metric, show top 4 months + "Other"
    const relevantData = chartData
      .filter((d) => (d[pieMetric as keyof ChartDataPoint] as number) > 0)
      .map((d) => ({
        name: d.label,
        value: Math.round((d[pieMetric as keyof ChartDataPoint] as number) || 0),
      }))
      .sort((a, b) => b.value - a.value);

    if (relevantData.length <= 5) return relevantData;

    const top4 = relevantData.slice(0, 4);
    const otherSum = relevantData.slice(4).reduce((acc, d) => acc + d.value, 0);
    return [...top4, { name: "Other", value: otherSum }];
  }, [chartData, pieMetric]);

  /* ---------- computed: sponsor breakdown ---------- */
  const sponsorBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; total: number; months: number }>();
    for (const m of metrics.filter((m) => m.metric_type === "sponsor_impressions")) {
      const name = ((m.metadata as Record<string, unknown>)?.sponsor_name as string) || "Unknown";
      const existing = map.get(name) || { name, total: 0, months: 0 };
      existing.total += Number(m.value);
      existing.months += 1;
      map.set(name, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [metrics]);

  /* ---------- computed: content by month ---------- */
  const contentByMonth = useMemo(() => {
    return metrics
      .filter((m) => m.metric_type === "content_performance")
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((m) => {
        const d = new Date(m.period_start + "T00:00:00");
        return {
          month: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`,
          views: Math.round(Number(m.value)),
        };
      });
  }, [metrics]);

  /* ---------- computed: creator engagement top months ---------- */
  const creatorTopMonths = useMemo(() => {
    return metrics
      .filter((m) => m.metric_type === "creator_engagement")
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((m) => {
        const d = new Date(m.period_start + "T00:00:00");
        return {
          month: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`,
          posts: Math.round(Number(m.value)),
        };
      });
  }, [metrics]);

  /* ---------- computed: ranked creators ---------- */
  const rankedCreators = useMemo(() => {
    const withImpact = creators.map((c) => {
      const followers = c.follower_count || 0;
      const engagement = c.engagement_rate || 0;
      const impactScore = Math.round((followers * engagement) / 100);
      return { ...c, impactScore };
    });

    return withImpact.sort((a, b) => {
      if (creatorSort === "followers") return (b.follower_count || 0) - (a.follower_count || 0);
      if (creatorSort === "engagement") return (b.engagement_rate || 0) - (a.engagement_rate || 0);
      return b.impactScore - a.impactScore;
    });
  }, [creators, creatorSort]);

  const topCreator = rankedCreators[0] || null;

  /* ---------- export ---------- */
  const exportChartPNG = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `365-insights-${eventId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Chart exported as PNG");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export chart");
    }
  };

  /* ---------- toggle ---------- */
  const toggleLine = (key: string) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-12 text-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-bold text-foreground mb-2">No engagement data yet</h3>
        <p className="text-muted-foreground text-sm">
          365-day engagement data will appear here as it's collected throughout the event lifecycle.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== METRIC CARDS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Impressions", value: totals.impressions.toLocaleString(), icon: Eye, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
          { label: "Community Members", value: totals.community.toLocaleString(), icon: Users, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
          { label: "Active Creators", value: totals.creators.toLocaleString(), icon: Mic, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
          { label: "Sponsor ROI", value: `${totals.roi}x`, icon: DollarSign, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
          { label: "Content Views", value: totals.content.toLocaleString(), icon: FileText, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30" },
        ].map((card) => (
          <Card key={card.label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ===== CONTROLS ===== */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sponsor dropdown */}
        <Select value={selectedSponsor} onValueChange={setSelectedSponsor}>
          <SelectTrigger className="w-[200px] bg-white dark:bg-[#1A1D27]">
            <SelectValue placeholder="All Sponsors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sponsors</SelectItem>
            {sponsors.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.sponsor_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Granularity toggle */}
        <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <Button
            size="sm"
            variant={granularity === "monthly" ? "default" : "ghost"}
            onClick={() => setGranularity("monthly")}
            className="text-xs h-7"
          >
            Monthly
          </Button>
          <Button
            size="sm"
            variant={granularity === "quarterly" ? "default" : "ghost"}
            onClick={() => setGranularity("quarterly")}
            className="text-xs h-7"
          >
            Quarterly
          </Button>
        </div>

        {/* Chart type toggle */}
        <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <Button
            size="sm"
            variant={chartType === "line" ? "default" : "ghost"}
            onClick={() => setChartType("line")}
            className="text-xs h-7"
          >
            <LineChartIcon className="h-3.5 w-3.5 mr-1" />
            Line
          </Button>
          <Button
            size="sm"
            variant={chartType === "donut" ? "default" : "ghost"}
            onClick={() => setChartType("donut")}
            className="text-xs h-7"
          >
            <PieChartIcon className="h-3.5 w-3.5 mr-1" />
            Donut
          </Button>
        </div>

        {/* Pie metric selector (only visible in donut mode) */}
        {chartType === "donut" && (
          <Select value={pieMetric} onValueChange={setPieMetric}>
            <SelectTrigger className="w-[200px] bg-white dark:bg-[#1A1D27]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METRIC_CONFIG).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Export */}
        <Button variant="outline" size="sm" onClick={exportChartPNG} className="ml-auto">
          <Download className="h-4 w-4 mr-1.5" />
          Export as PDF
        </Button>
      </div>

      {/* ===== METRIC TOGGLES (line chart only) ===== */}
      {chartType === "line" && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(METRIC_CONFIG).map(([key, { label, color }]) => (
            <button
              key={key}
              onClick={() => toggleLine(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                visibleLines[key]
                  ? "border-transparent text-white"
                  : "border-gray-300 dark:border-gray-600 text-muted-foreground bg-transparent"
              }`}
              style={visibleLines[key] ? { backgroundColor: color } : undefined}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ===== CHART ===== */}
      <div ref={chartRef} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-4">
        {chartType === "line" ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                {Object.entries(METRIC_CONFIG).map(([key, { color }]) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  value.toLocaleString(),
                  METRIC_CONFIG[name]?.label || name,
                ]}
              />
              <Legend content={() => null} />
              {Object.entries(METRIC_CONFIG).map(([key, { color }]) =>
                visibleLines[key] ? (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#grad-${key})`}
                    dot={{ r: 3, fill: color }}
                    activeDot={{ r: 5, fill: color }}
                  />
                ) : null
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          /* ===== DONUT CHART ===== */
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={140}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [value.toLocaleString(), METRIC_CONFIG[pieMetric]?.label]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 min-w-[180px]">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{entry.name}</span>
                  <span className="ml-auto font-semibold">{entry.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== CREATOR SPOTLIGHT + IMPACT ===== */}
      {directoryId && creators.length > 0 && (
        <>
          {/* Spotlight Card */}
          {topCreator && (
            <div className="rounded-xl overflow-hidden bg-gradient-to-r from-[#6C5CE7] to-[#a29bfe] p-6 text-white">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-white/30">
                  <AvatarImage src={topCreator.avatar_url || undefined} />
                  <AvatarFallback className="bg-white/20 text-white text-lg">
                    {(topCreator.creator_name || topCreator.creator_handle || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Trophy className="h-4 w-4 text-amber-300" />
                    <span className="text-xs font-medium text-white/70 uppercase tracking-wide">Top Creator</span>
                  </div>
                  <h3 className="text-xl font-bold truncate">{topCreator.creator_name || topCreator.creator_handle}</h3>
                  <p className="text-white/70 text-sm">@{topCreator.creator_handle}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-3xl font-bold">{formatNumber(topCreator.impactScore)}</p>
                  <p className="text-xs text-white/70">Impact Score</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-white/60">Followers</span>
                  <span className="ml-1.5 font-semibold">{formatNumber(topCreator.follower_count || 0)}</span>
                </div>
                <div>
                  <span className="text-white/60">Engagement</span>
                  <span className="ml-1.5 font-semibold">{(topCreator.engagement_rate || 0).toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-white/60">Est. Impressions</span>
                  <span className="ml-1.5 font-semibold">{formatNumber(Math.round((topCreator.follower_count || 0) * (topCreator.engagement_rate || 0) / 100 * 12))}</span>
                </div>
              </div>
            </div>
          )}

          {/* Creator Impact Rankings */}
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden">
            <button
              onClick={() => setShowImpact(!showImpact)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="font-semibold text-sm">Creator Impact Rankings</span>
                <Badge className="ml-1 bg-purple-100 text-purple-700 text-xs">{creators.length}</Badge>
              </div>
              {showImpact ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {showImpact && (
              <div className="border-t border-gray-200 dark:border-gray-800">
                {/* Sort dropdown */}
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800/50">
                  <Select value={creatorSort} onValueChange={(v) => setCreatorSort(v as typeof creatorSort)}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="impact">Impact Score</SelectItem>
                      <SelectItem value="followers">Followers</SelectItem>
                      <SelectItem value="engagement">Engagement Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                      <th className="text-left p-3 text-muted-foreground font-medium w-12">#</th>
                      <th className="text-left p-3 text-muted-foreground font-medium">Creator</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">Followers</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">Eng. Rate</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">Platform</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedCreators.map((c, i) => {
                      const badge = RANK_BADGES[i];
                      return (
                        <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="p-3">
                            {badge ? (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border ${badge.bg} ${badge.color}`}>
                                {i + 1}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{i + 1}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Link
                              to={`/creators/${c.profile_slug || c.creator_handle}`}
                              className="flex items-center gap-2 hover:text-purple-600 transition-colors"
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={c.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-purple-100 text-purple-700">
                                  {(c.creator_name || c.creator_handle || "?")[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{c.creator_name || c.creator_handle}</p>
                                <p className="text-xs text-muted-foreground truncate">@{c.creator_handle}</p>
                              </div>
                              <ArrowUpRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            </Link>
                          </td>
                          <td className="p-3 text-right font-medium">{formatNumber(c.follower_count || 0)}</td>
                          <td className="p-3 text-right">{(c.engagement_rate || 0).toFixed(2)}%</td>
                          <td className="p-3 text-right">
                            <Badge variant="outline" className="text-xs capitalize">{c.platform}</Badge>
                          </td>
                          <td className="p-3 text-right font-bold text-purple-600">{formatNumber(c.impactScore)}</td>
                        </tr>
                      );
                    })}
                    {rankedCreators.length === 0 && (
                      <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No creators in linked directory</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ===== DATA TABLES ===== */}

      {/* Top Creators (by engagement) */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden">
        <button
          onClick={() => setShowCreators(!showCreators)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-sm">Top Creator Engagement Months</span>
          </div>
          {showCreators ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showCreators && (
          <div className="border-t border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                  <th className="text-left p-3 text-muted-foreground font-medium">Month</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Posts</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {creatorTopMonths.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800/50">
                    <td className="p-3 font-medium">{row.month}</td>
                    <td className="p-3 text-right">{row.posts.toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <TrendingUp className="h-4 w-4 text-green-500 inline" />
                    </td>
                  </tr>
                ))}
                {creatorTopMonths.length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Sponsor Breakdown */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden">
        <button
          onClick={() => setShowSponsors(!showSponsors)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-purple-600" />
            <span className="font-semibold text-sm">Sponsor Breakdown</span>
          </div>
          {showSponsors ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showSponsors && (
          <div className="border-t border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                  <th className="text-left p-3 text-muted-foreground font-medium">Sponsor</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Total Impressions</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Avg Monthly</th>
                </tr>
              </thead>
              <tbody>
                {sponsorBreakdown.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800/50">
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3 text-right">{Math.round(row.total).toLocaleString()}</td>
                    <td className="p-3 text-right">{row.months > 0 ? Math.round(row.total / row.months).toLocaleString() : "—"}</td>
                  </tr>
                ))}
                {sponsorBreakdown.length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No sponsor data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Content Highlights */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden">
        <button
          onClick={() => setShowContent(!showContent)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-orange-600" />
            <span className="font-semibold text-sm">Content Highlights</span>
          </div>
          {showContent ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showContent && (
          <div className="border-t border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                  <th className="text-left p-3 text-muted-foreground font-medium">Month</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Total Views</th>
                </tr>
              </thead>
              <tbody>
                {contentByMonth.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800/50">
                    <td className="p-3 font-medium">{row.month}</td>
                    <td className="p-3 text-right">{row.views.toLocaleString()}</td>
                  </tr>
                ))}
                {contentByMonth.length === 0 && (
                  <tr><td colSpan={2} className="p-4 text-center text-muted-foreground">No content data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
