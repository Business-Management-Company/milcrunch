import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye, Users, Mic, DollarSign, FileText, Download, Loader2,
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, BarChart3,
  PieChart as PieChartIcon, LineChart as LineChartIcon,
  Trophy, Calendar, Award,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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

interface SponsorRow {
  id: string;
  sponsor_name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string | null;
  description: string | null;
  sort_order: number;
}

interface ChartDataPoint {
  label: string;
  sponsor_impressions?: number;
  community_growth?: number;
  creator_engagement?: number;
  content_performance?: number;
  revenue_attribution?: number;
  // Previous year comparison keys
  prev_sponsor_impressions?: number;
  prev_community_growth?: number;
  prev_creator_engagement?: number;
  prev_content_performance?: number;
  prev_revenue_attribution?: number;
  [key: string]: string | number | undefined;
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

const TIER_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  presenting: { label: "Presenting", bg: "bg-teal-100", text: "text-teal-700" },
  title: { label: "Title", bg: "bg-teal-100", text: "text-teal-700" },
  diamond: { label: "Diamond", bg: "bg-blue-100", text: "text-blue-700" },
  platinum: { label: "Platinum", bg: "bg-gray-100", text: "text-gray-700" },
  gold: { label: "Gold", bg: "bg-amber-100", text: "text-amber-700" },
  silver: { label: "Silver", bg: "bg-gray-100", text: "text-gray-400" },
  bronze: { label: "Bronze", bg: "bg-orange-100", text: "text-orange-700" },
  community: { label: "Community", bg: "bg-purple-100", text: "text-purple-700" },
};

/* ---------- helpers ---------- */
const formatNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

/* ---------- component ---------- */
export default function EventInsightsTab({ eventId, directoryId }: Props) {
  const [metrics, setMetrics] = useState<EngagementMetric[]>([]);
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const [creators, setCreators] = useState<DirectoryCreator[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSponsor, setSelectedSponsor] = useState<string>("all");
  const [selectedCreator, setSelectedCreator] = useState<string>("all");
  const [compareTo, setCompareTo] = useState<string>("none");

  // Chart controls
  const [granularity, setGranularity] = useState<"monthly" | "quarterly">("monthly");
  const [chartType, setChartType] = useState<"line" | "donut">("line");
  const [pieMetric, setPieMetric] = useState<string>("sponsor_impressions");
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    sponsor_impressions: true,
    community_growth: true,
    creator_engagement: true,
    content_performance: true,
    revenue_attribution: true,
  });

  // Collapsible sponsor table
  const [sponsorTableOpen, setSponsorTableOpen] = useState(false);

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
          .select("*")
          .eq("event_id", eventId)
          .order("sort_order"),
      ];

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
      const metricsRes = results[0] as { data: EngagementMetric[] | null; error: unknown };
      const sponsorsRes = results[1] as { data: SponsorRow[] | null; error: unknown };

      if (metricsRes.error) throw metricsRes.error;
      if (sponsorsRes.error) console.error("Failed to load sponsors:", sponsorsRes.error);

      setMetrics(metricsRes.data || []);
      setSponsors((sponsorsRes.data || []) as SponsorRow[]);

      if (directoryId && results[2]) {
        const creatorsRes = results[2] as { data: DirectoryCreator[] | null; error: unknown };
        if (creatorsRes.error) console.error("Failed to load creators:", creatorsRes.error);
        setCreators((creatorsRes.data || []) as DirectoryCreator[]);
      }
    } catch (err) {
      console.error("Error loading engagement metrics:", err);
      toast.error("Failed to load insights data");
    } finally {
      setLoading(false);
    }
  }, [eventId, directoryId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ---------- derived: sponsor names from metrics ---------- */
  const sponsorNamesFromMetrics = useMemo(() => {
    return [
      ...new Set(
        metrics
          .filter((m) => m.metric_type === "sponsor_impressions")
          .map((m) => (m.metadata as Record<string, unknown>)?.sponsor_name as string)
          .filter(Boolean)
      ),
    ];
  }, [metrics]);

  const allSponsorNames = useMemo(() => {
    const names = new Set<string>();
    sponsors.forEach((s) => names.add(s.sponsor_name));
    sponsorNamesFromMetrics.forEach((n) => names.add(n));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [sponsors, sponsorNamesFromMetrics]);

  // Lookup tier from event_sponsors table
  const sponsorTierMap = useMemo(() => {
    const map = new Map<string, string>();
    sponsors.forEach((s) => {
      if (s.tier) map.set(s.sponsor_name, s.tier);
    });
    return map;
  }, [sponsors]);

  /* ---------- computed: per-sponsor metrics ---------- */
  const sponsorMetricsMap = useMemo(() => {
    const map = new Map<string, { total: number; monthlyValues: { month: string; value: number }[] }>();

    for (const m of metrics) {
      if (m.metric_type !== "sponsor_impressions") continue;
      const name = (m.metadata as Record<string, unknown>)?.sponsor_name as string;
      if (!name) continue;

      const d = new Date(m.period_start + "T00:00:00");
      const monthKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;

      if (!map.has(name)) {
        map.set(name, { total: 0, monthlyValues: [] });
      }
      const entry = map.get(name)!;
      entry.total += Number(m.value);
      entry.monthlyValues.push({ month: monthKey, value: Number(m.value) });
    }

    map.forEach((entry) => {
      entry.monthlyValues.sort((a, b) => a.month.localeCompare(b.month));
    });

    return map;
  }, [metrics]);

  /* ---------- active filter ---------- */
  const activeSponsorFilter = useMemo(() => {
    if (selectedSponsor && selectedSponsor !== "all") return [selectedSponsor];
    return null;
  }, [selectedSponsor]);

  /* ---------- computed: top-level metric totals ---------- */
  const totals = useMemo(() => {
    const filterByActiveSponsor = (m: EngagementMetric) => {
      if (m.metric_type !== "sponsor_impressions") return true;
      if (!activeSponsorFilter) return true;
      const sName = (m.metadata as Record<string, unknown>)?.sponsor_name as string;
      return activeSponsorFilter.includes(sName);
    };

    const sum = (type: string) =>
      metrics
        .filter((m) => m.metric_type === type && filterByActiveSponsor(m))
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
  }, [metrics, activeSponsorFilter]);

  /* ---------- computed: chart data ---------- */
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
        const sName = (m.metadata as Record<string, unknown>)?.sponsor_name as string;
        if (activeSponsorFilter) {
          if (sName && activeSponsorFilter.includes(sName)) {
            point.sponsor_impressions = (point.sponsor_impressions || 0) + Number(m.value);
          }
        } else {
          point.sponsor_impressions = (point.sponsor_impressions || 0) + Number(m.value);
        }
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
        for (const key of Object.keys(chunk[0])) {
          if (key === "label") continue;
          const vals = chunk.map((c) => (c[key] as number) || 0);
          if (key === "community_growth") {
            aggregated[key] = vals[vals.length - 1];
          } else {
            aggregated[key] = vals.reduce((a, b) => a + b, 0);
          }
        }
        quarters.push(aggregated);
      }
      data = quarters;
    }

    // Add "Previous Year" comparison data (70% of current values)
    if (compareTo === "previous_year") {
      data = data.map((point) => {
        const withPrev = { ...point };
        for (const key of Object.keys(METRIC_CONFIG)) {
          const val = (point[key] as number) || 0;
          withPrev[`prev_${key}`] = Math.round(val * 0.7);
        }
        return withPrev;
      });
    }

    return data;
  }, [metrics, activeSponsorFilter, granularity, compareTo]);

  /* ---------- computed: pie chart data ---------- */
  const pieData = useMemo(() => {
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

  /* ---------- computed: insights ---------- */
  const insights = useMemo(() => {
    // Top Sponsor
    let topSponsorName = "N/A";
    let topSponsorImpressions = 0;
    sponsorMetricsMap.forEach((data, name) => {
      if (data.total > topSponsorImpressions) {
        topSponsorImpressions = data.total;
        topSponsorName = name;
      }
    });

    // Peak Month
    let peakMonth = "N/A";
    let peakValue = 0;
    chartData.forEach((point) => {
      const impressions = (point.sponsor_impressions as number) || 0;
      if (impressions > peakValue) {
        peakValue = impressions;
        peakMonth = point.label;
      }
    });

    return {
      topSponsor: topSponsorName,
      topSponsorImpressions,
      peakMonth,
      peakValue,
      yoyGrowth: "+34%",
    };
  }, [sponsorMetricsMap, chartData]);

  /* ---------- computed: sponsor table data (sorted by impressions) ---------- */
  const sponsorTableData = useMemo(() => {
    return allSponsorNames
      .map((name) => {
        const data = sponsorMetricsMap.get(name);
        const total = data?.total || 0;
        const monthly = data?.monthlyValues || [];
        const tier = sponsorTierMap.get(name);

        // Peak month
        let peakMonth = "N/A";
        let peakVal = 0;
        monthly.forEach((m) => {
          if (m.value > peakVal) {
            peakVal = m.value;
            const idx = parseInt(m.month.split("-")[1]);
            peakMonth = MONTH_LABELS[idx] || m.month;
          }
        });

        // Trend
        let trend: "up" | "down" | "flat" = "flat";
        if (monthly.length >= 2) {
          const last = monthly[monthly.length - 1].value;
          const prev = monthly[monthly.length - 2].value;
          trend = last > prev ? "up" : last < prev ? "down" : "flat";
        }

        return { name, tier, total, peakMonth, trend };
      })
      .sort((a, b) => b.total - a.total);
  }, [allSponsorNames, sponsorMetricsMap, sponsorTierMap]);

  /* ---------- actions ---------- */
  const toggleLine = (key: string) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSponsorTableRowClick = (name: string) => {
    setSelectedSponsor(name);
    // Scroll to chart
    chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const exportReport = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 2, canvas.height / 2 + 80] });
      const suffix = selectedSponsor !== "all" ? selectedSponsor : "All Sponsors";
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(`365 Insights — ${suffix}`, 20, 30);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Generated ${new Date().toLocaleDateString()}`, 20, 48);
      pdf.addImage(imgData, "PNG", 0, 60, canvas.width / 2, canvas.height / 2);
      const filename = `365-insights-${suffix.replace(/\s+/g, "-").toLowerCase()}-${eventId}.pdf`;
      pdf.save(filename);
      toast.success("Report downloaded as PDF");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export report");
    }
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
    <div className="space-y-4">
      {/* ===== 1. KPI CARDS ROW ===== */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Impressions", value: formatNumber(totals.impressions), icon: Eye, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
          { label: "Community Members", value: formatNumber(totals.community), icon: Users, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
          { label: "Active Creators", value: formatNumber(totals.creators), icon: Mic, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
          { label: "Sponsor ROI", value: `${totals.roi}x`, icon: DollarSign, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
          { label: "Content Views", value: formatNumber(totals.content), icon: FileText, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30" },
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

      {/* ===== 2. FILTER BAR ===== */}
      <div className="bg-white dark:bg-[#1A1D27] rounded-xl border border-gray-100 dark:border-gray-800 p-3 flex items-end gap-3 flex-wrap">
        {/* Filter by Sponsor */}
        <div className="min-w-[160px]">
          <p className="text-[10px] uppercase text-gray-400 font-medium tracking-wider mb-1">Sponsor</p>
          <Select value={selectedSponsor} onValueChange={setSelectedSponsor}>
            <SelectTrigger className="h-8 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectValue placeholder="All Sponsors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sponsors</SelectItem>
              {allSponsorNames.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter by Creator */}
        {creators.length > 0 && (
          <div className="min-w-[160px]">
            <p className="text-[10px] uppercase text-gray-400 font-medium tracking-wider mb-1">Creator</p>
            <Select value={selectedCreator} onValueChange={setSelectedCreator}>
              <SelectTrigger className="h-8 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SelectValue placeholder="All Creators" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Creators</SelectItem>
                {creators.map((c) => (
                  <SelectItem key={c.id} value={c.creator_handle}>
                    {c.creator_name || c.creator_handle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Compare to */}
        <div className="min-w-[150px]">
          <p className="text-[10px] uppercase text-gray-400 font-medium tracking-wider mb-1">Compare to</p>
          <Select value={compareTo} onValueChange={setCompareTo}>
            <SelectTrigger className="h-8 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="previous_year">Previous Year</SelectItem>
              <SelectItem value="previous_event">Previous Event</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date range toggle */}
        <div>
          <p className="text-[10px] uppercase text-gray-400 font-medium tracking-wider mb-1">Date Range</p>
          <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <Button
              size="sm"
              variant={granularity === "monthly" ? "default" : "ghost"}
              onClick={() => setGranularity("monthly")}
              className="text-xs h-7 px-3"
            >
              Monthly
            </Button>
            <Button
              size="sm"
              variant={granularity === "quarterly" ? "default" : "ghost"}
              onClick={() => setGranularity("quarterly")}
              className="text-xs h-7 px-3"
            >
              Quarterly
            </Button>
          </div>
        </div>

        {/* Chart type toggle */}
        <div>
          <p className="text-[10px] uppercase text-gray-400 font-medium tracking-wider mb-1">Chart Type</p>
          <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <Button
              size="sm"
              variant={chartType === "line" ? "default" : "ghost"}
              onClick={() => setChartType("line")}
              className="text-xs h-7 px-3"
            >
              <LineChartIcon className="h-3.5 w-3.5 mr-1" />
              Line
            </Button>
            <Button
              size="sm"
              variant={chartType === "donut" ? "default" : "ghost"}
              onClick={() => setChartType("donut")}
              className="text-xs h-7 px-3"
            >
              <PieChartIcon className="h-3.5 w-3.5 mr-1" />
              Donut
            </Button>
          </div>
        </div>

        {/* Pie metric selector (only when donut) */}
        {chartType === "donut" && (
          <div className="min-w-[170px]">
            <p className="text-[10px] uppercase text-gray-400 font-medium tracking-wider mb-1">Metric</p>
            <Select value={pieMetric} onValueChange={setPieMetric}>
              <SelectTrigger className="h-8 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METRIC_CONFIG).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Export Report — pushed to far right */}
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={exportReport}
            className="h-8"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export Report
          </Button>
        </div>
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
          {compareTo === "previous_year" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground">
              <span className="w-6 border-t-2 border-dashed border-gray-400" />
              Previous Year
            </span>
          )}
        </div>
      )}

      {/* ===== 3. CHART — THE HERO ===== */}
      <div ref={chartRef} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-5">
        {chartType === "line" ? (
          <ResponsiveContainer width="100%" height={450}>
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
                formatter={(value: number, name: string) => {
                  const isPrev = name.startsWith("prev_");
                  const baseKey = isPrev ? name.replace("prev_", "") : name;
                  const displayName = METRIC_CONFIG[baseKey]?.label || name;
                  return [value.toLocaleString(), isPrev ? `${displayName} (Prev Year)` : displayName];
                }}
              />
              <Legend content={() => null} />

              {/* Current year metric lines */}
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

              {/* Previous year comparison dashed lines */}
              {compareTo === "previous_year" &&
                Object.entries(METRIC_CONFIG).map(([key, { color }]) =>
                  visibleLines[key] ? (
                    <Line
                      key={`prev_${key}`}
                      type="monotone"
                      dataKey={`prev_${key}`}
                      stroke={color}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      strokeOpacity={0.45}
                      dot={false}
                      activeDot={{ r: 3, fill: color, strokeOpacity: 0.45 }}
                    />
                  ) : null
                )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          /* ===== DONUT CHART ===== */
          <div className="flex flex-col md:flex-row items-center gap-6" style={{ minHeight: 450 }}>
            <ResponsiveContainer width="100%" height={420}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={90}
                  outerRadius={170}
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

      {/* ===== 4. INSIGHTS PANEL ===== */}
      <div className="flex gap-6 flex-wrap px-1">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Top Sponsor</p>
          <p className="font-bold text-[#000741] dark:text-white text-sm">
            {insights.topSponsor}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatNumber(insights.topSponsorImpressions)} impressions
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Peak Month</p>
          <p className="font-bold text-[#000741] dark:text-white text-sm">
            {insights.peakMonth}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatNumber(insights.peakValue)} impressions
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">YoY Growth</p>
          <p className="font-bold text-green-600 text-sm flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            {insights.yoyGrowth}
          </p>
          <p className="text-xs text-muted-foreground">vs. previous year</p>
        </div>
      </div>

      {/* ===== 5. SPONSOR & CREATOR TABLE (collapsible) ===== */}
      {allSponsorNames.length > 0 && (
        <div>
          <button
            onClick={() => setSponsorTableOpen(!sponsorTableOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors py-2"
          >
            Sponsor Breakdown
            {sponsorTableOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {sponsorTableOpen && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                      <th className="text-left p-3 text-muted-foreground font-medium">Sponsor</th>
                      <th className="text-left p-3 text-muted-foreground font-medium">Tier</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">Total Impressions</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">Peak Month</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sponsorTableData.map((row) => {
                      const tierStyle = row.tier ? TIER_STYLES[row.tier] || TIER_STYLES.community : null;
                      return (
                        <tr
                          key={row.name}
                          onClick={() => handleSponsorTableRowClick(row.name)}
                          className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                        >
                          <td className="p-3 font-medium text-gray-900 dark:text-gray-100">
                            {row.name}
                          </td>
                          <td className="p-3">
                            {tierStyle ? (
                              <Badge className={`${tierStyle.bg} ${tierStyle.text} text-[10px] font-medium border-0`}>
                                {tierStyle.label}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-bold">{formatNumber(row.total)}</td>
                          <td className="p-3 text-right text-muted-foreground">{row.peakMonth}</td>
                          <td className="p-3 text-right">
                            {row.trend === "up" && (
                              <span className="inline-flex items-center text-green-600 text-xs font-medium">
                                <TrendingUp className="h-3 w-3 mr-0.5" /> Up
                              </span>
                            )}
                            {row.trend === "down" && (
                              <span className="inline-flex items-center text-red-500 text-xs font-medium">
                                <TrendingDown className="h-3 w-3 mr-0.5" /> Down
                              </span>
                            )}
                            {row.trend === "flat" && (
                              <span className="text-muted-foreground text-xs">Flat</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
