import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, BarChart3,
  PieChart as PieChartIcon, LineChart as LineChartIcon,
  Trophy, Star, Award, ArrowUpRight, Search, GitCompare, X,
  Check,
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

const COMPARE_COLORS = ["#6C5CE7", "#0984E3", "#00B894", "#D63031", "#FDCB6E"];

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

  // Selection
  const [selectedSponsor, setSelectedSponsor] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [sponsorSearch, setSponsorSearch] = useState("");

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

  // Merge sponsor table data with metric names — some sponsors may exist only in one source
  const allSponsorNames = useMemo(() => {
    const names = new Set<string>();
    sponsors.forEach((s) => names.add(s.sponsor_name));
    sponsorNamesFromMetrics.forEach((n) => names.add(n));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [sponsors, sponsorNamesFromMetrics]);

  // Filtered sponsor list for display
  const filteredSponsorNames = useMemo(() => {
    if (!sponsorSearch.trim()) return allSponsorNames;
    const q = sponsorSearch.toLowerCase();
    return allSponsorNames.filter((n) => n.toLowerCase().includes(q));
  }, [allSponsorNames, sponsorSearch]);

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

    // Sort monthly values for each sponsor
    map.forEach((entry) => {
      entry.monthlyValues.sort((a, b) => a.month.localeCompare(b.month));
    });

    return map;
  }, [metrics]);

  /* ---------- active filter: which sponsor(s) to show ---------- */
  const activeSponsorFilter = useMemo(() => {
    if (compareMode && compareSelection.length > 0) return compareSelection;
    if (selectedSponsor) return [selectedSponsor];
    return null; // null = all
  }, [selectedSponsor, compareMode, compareSelection]);

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

        // In compare mode, create separate keys per sponsor
        if (compareMode && compareSelection.length > 0) {
          if (sName && compareSelection.includes(sName)) {
            const sponsorKey = `sponsor_${sName}`;
            point[sponsorKey] = ((point[sponsorKey] as number) || 0) + Number(m.value);
          }
        } else if (activeSponsorFilter) {
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

    return data;
  }, [metrics, activeSponsorFilter, compareMode, compareSelection, granularity]);

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

  /* ---------- computed: comparison table data ---------- */
  const comparisonTableData = useMemo(() => {
    if (!compareMode || compareSelection.length < 2) return null;
    return compareSelection.map((name) => {
      const data = sponsorMetricsMap.get(name);
      const total = data?.total || 0;
      const monthly = data?.monthlyValues || [];
      const avgMonthly = monthly.length > 0 ? Math.round(total / monthly.length) : 0;

      // Trend: compare last two months
      let trend: "up" | "down" | "flat" = "flat";
      if (monthly.length >= 2) {
        const last = monthly[monthly.length - 1].value;
        const prev = monthly[monthly.length - 2].value;
        trend = last > prev ? "up" : last < prev ? "down" : "flat";
      }

      return { name, total, avgMonthly, trend, monthCount: monthly.length };
    });
  }, [compareMode, compareSelection, sponsorMetricsMap]);

  /* ---------- computed: creator attribution for selected sponsor ---------- */
  const creatorAttribution = useMemo(() => {
    if (!selectedSponsor || compareMode) return [];
    return creators
      .slice(0, 5)
      .map((c) => {
        const followers = c.follower_count || 0;
        const engagement = c.engagement_rate || 0;
        const estimatedImpressions = Math.round((followers * engagement / 100) * 3);
        return { ...c, estimatedImpressions };
      })
      .sort((a, b) => b.estimatedImpressions - a.estimatedImpressions);
  }, [selectedSponsor, compareMode, creators]);

  /* ---------- actions ---------- */
  const handleSponsorClick = (name: string) => {
    if (compareMode) {
      setCompareSelection((prev) => {
        if (prev.includes(name)) return prev.filter((n) => n !== name);
        if (prev.length >= 3) {
          toast.info("You can compare up to 3 sponsors");
          return prev;
        }
        return [...prev, name];
      });
    } else {
      setSelectedSponsor((prev) => (prev === name ? null : name));
    }
  };

  const resetToAll = () => {
    setSelectedSponsor(null);
    setCompareMode(false);
    setCompareSelection([]);
  };

  const toggleCompare = () => {
    if (compareMode) {
      setCompareMode(false);
      setCompareSelection([]);
    } else {
      setCompareMode(true);
      setSelectedSponsor(null);
      // Pre-select the currently selected sponsor if any
    }
  };

  const toggleLine = (key: string) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
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
      const suffix = selectedSponsor || "All Sponsors";
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Sponsor Intelligence — ${suffix}`, 20, 30);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Generated ${new Date().toLocaleDateString()}`, 20, 48);
      pdf.addImage(imgData, "PNG", 0, 60, canvas.width / 2, canvas.height / 2);
      const filename = `sponsor-report-${suffix.replace(/\s+/g, "-").toLowerCase()}-${eventId}.pdf`;
      pdf.save(filename);
      toast.success("Sponsor report downloaded as PDF");
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
    <div className="space-y-6">
      {/* ===== KPI CARDS ===== */}
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

      {/* ===== SPONSOR SCORECARD GRID ===== */}
      {allSponsorNames.length > 0 && (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Sponsor Performance</h3>
              {(selectedSponsor || compareMode) && (
                <Button variant="outline" size="sm" onClick={resetToAll} className="text-xs h-7">
                  <X className="h-3 w-3 mr-1" />
                  All Sponsors
                </Button>
              )}
              <Button
                variant={compareMode ? "default" : "outline"}
                size="sm"
                onClick={toggleCompare}
                className={`text-xs h-7 ${compareMode ? "bg-[#6C5CE7] hover:bg-[#5B4BD5]" : ""}`}
              >
                <GitCompare className="h-3 w-3 mr-1" />
                {compareMode ? "Exit Compare" : "Compare Sponsors"}
              </Button>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search sponsors..."
                value={sponsorSearch}
                onChange={(e) => setSponsorSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-white dark:bg-[#1A1D27]"
              />
            </div>
          </div>

          {/* Compare mode hint */}
          {compareMode && (
            <p className="text-xs text-muted-foreground">
              Select 2-3 sponsors to compare. {compareSelection.length}/3 selected.
            </p>
          )}

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSponsorNames.map((name) => {
              const data = sponsorMetricsMap.get(name);
              const total = data?.total || 0;
              const monthly = data?.monthlyValues || [];
              const tier = sponsorTierMap.get(name);
              const tierStyle = tier ? TIER_STYLES[tier] || TIER_STYLES.community : null;

              // Trend: compare last 2 months
              let trend: "up" | "down" | "flat" = "flat";
              if (monthly.length >= 2) {
                const last = monthly[monthly.length - 1].value;
                const prev = monthly[monthly.length - 2].value;
                trend = last > prev ? "up" : last < prev ? "down" : "flat";
              }

              // Sparkline data (last 6 months)
              const sparkData = monthly.slice(-6).map((m) => ({ v: m.value }));

              const isSelected = selectedSponsor === name;
              const isCompareSelected = compareSelection.includes(name);

              return (
                <div
                  key={name}
                  onClick={() => handleSponsorClick(name)}
                  className={`
                    relative rounded-xl p-4 cursor-pointer transition-all duration-200
                    bg-white dark:bg-[#1A1D27]
                    ${isSelected
                      ? "border-2 border-[#6C5CE7] shadow-md ring-1 ring-[#6C5CE7]/20"
                      : isCompareSelected
                        ? "border-2 border-[#6C5CE7] shadow-sm"
                        : "border border-gray-100 dark:border-gray-800 hover:border-[#6C5CE7] hover:shadow-md"
                    }
                  `}
                >
                  {/* Selected left stripe */}
                  {(isSelected || isCompareSelected) && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-[#6C5CE7]" />
                  )}

                  {/* Compare checkbox */}
                  {compareMode && (
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isCompareSelected
                        ? "bg-[#6C5CE7] border-[#6C5CE7]"
                        : "border-gray-300 dark:border-gray-600"
                    }`}>
                      {isCompareSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</span>
                      </div>
                      {tierStyle && (
                        <Badge className={`${tierStyle.bg} ${tierStyle.text} text-[10px] font-medium border-0 mb-2`}>
                          {tierStyle.label}
                        </Badge>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatNumber(total)}
                        </span>
                        <span className="text-xs text-muted-foreground">impressions</span>
                        {trend === "up" && (
                          <span className="flex items-center text-green-600 text-xs font-medium">
                            <TrendingUp className="h-3 w-3 mr-0.5" /> Up
                          </span>
                        )}
                        {trend === "down" && (
                          <span className="flex items-center text-red-500 text-xs font-medium">
                            <TrendingDown className="h-3 w-3 mr-0.5" /> Down
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sparkline */}
                    {sparkData.length >= 2 && (
                      <div className="w-20 h-8 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sparkData}>
                            <defs>
                              <linearGradient id={`spark-${name.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6C5CE7" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#6C5CE7" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <Line
                              type="monotone"
                              dataKey="v"
                              stroke="#6C5CE7"
                              strokeWidth={1.5}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== CHART CONTROLS ===== */}
      <div className="flex flex-wrap items-center gap-3">
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

        {/* Pie metric selector */}
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

        {/* Export / Generate Report */}
        <Button
          variant={selectedSponsor ? "default" : "outline"}
          size="sm"
          onClick={exportReport}
          className={`ml-auto ${selectedSponsor ? "bg-[#6C5CE7] hover:bg-[#5B4BD5] text-white" : ""}`}
        >
          <Download className="h-4 w-4 mr-1.5" />
          {selectedSponsor ? "Generate Sponsor Report" : "Export Report"}
        </Button>
      </div>

      {/* ===== METRIC TOGGLES (line chart, non-compare mode) ===== */}
      {chartType === "line" && !compareMode && (
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

      {/* ===== COMPARE LEGEND ===== */}
      {compareMode && compareSelection.length > 0 && chartType === "line" && (
        <div className="flex flex-wrap gap-3">
          {compareSelection.map((name, i) => (
            <div key={name} className="flex items-center gap-1.5 text-xs font-medium">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
              />
              {name}
            </div>
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
                {compareMode && compareSelection.map((name, i) => (
                  <linearGradient key={`compare-${name}`} id={`grad-compare-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COMPARE_COLORS[i % COMPARE_COLORS.length]} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={COMPARE_COLORS[i % COMPARE_COLORS.length]} stopOpacity={0} />
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
                  // In compare mode, sponsor keys are prefixed
                  const displayName = name.startsWith("sponsor_")
                    ? name.replace("sponsor_", "").replace(/_/g, " ")
                    : METRIC_CONFIG[name]?.label || name;
                  return [value.toLocaleString(), displayName];
                }}
              />
              <Legend content={() => null} />

              {/* Compare mode: one line per selected sponsor */}
              {compareMode && compareSelection.length > 0 ? (
                <>
                  {compareSelection.map((name, i) => {
                    const color = COMPARE_COLORS[i % COMPARE_COLORS.length];
                    const key = `sponsor_${name}`;
                    return (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={key}
                        stroke={color}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#grad-compare-${i})`}
                        dot={{ r: 3, fill: color }}
                        activeDot={{ r: 5, fill: color }}
                      />
                    );
                  })}
                </>
              ) : (
                /* Normal mode: all metric lines */
                <>
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
                </>
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

      {/* ===== COMPARISON TABLE (compare mode) ===== */}
      {compareMode && comparisonTableData && comparisonTableData.length >= 2 && (
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-[#6C5CE7]" />
              <h3 className="font-semibold text-sm">Sponsor Comparison</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                  <th className="text-left p-3 text-muted-foreground font-medium">Metric</th>
                  {comparisonTableData.map((s, i) => (
                    <th key={s.name} className="text-right p-3 font-medium" style={{ color: COMPARE_COLORS[i % COMPARE_COLORS.length] }}>
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 dark:border-gray-800/50">
                  <td className="p-3 font-medium text-muted-foreground">Total Impressions</td>
                  {comparisonTableData.map((s) => (
                    <td key={s.name} className="p-3 text-right font-bold">{formatNumber(s.total)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800/50">
                  <td className="p-3 font-medium text-muted-foreground">Avg Monthly</td>
                  {comparisonTableData.map((s) => (
                    <td key={s.name} className="p-3 text-right">{formatNumber(s.avgMonthly)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800/50">
                  <td className="p-3 font-medium text-muted-foreground">Months Active</td>
                  {comparisonTableData.map((s) => (
                    <td key={s.name} className="p-3 text-right">{s.monthCount}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800/50">
                  <td className="p-3 font-medium text-muted-foreground">Trend</td>
                  {comparisonTableData.map((s) => (
                    <td key={s.name} className="p-3 text-right">
                      {s.trend === "up" && <span className="inline-flex items-center text-green-600 font-medium"><TrendingUp className="h-3.5 w-3.5 mr-1" />Up</span>}
                      {s.trend === "down" && <span className="inline-flex items-center text-red-500 font-medium"><TrendingDown className="h-3.5 w-3.5 mr-1" />Down</span>}
                      {s.trend === "flat" && <span className="text-muted-foreground">Flat</span>}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-medium text-muted-foreground">Tier</td>
                  {comparisonTableData.map((s) => {
                    const tier = sponsorTierMap.get(s.name);
                    const style = tier ? TIER_STYLES[tier] : null;
                    return (
                      <td key={s.name} className="p-3 text-right">
                        {style ? (
                          <Badge className={`${style.bg} ${style.text} text-[10px] border-0`}>{style.label}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ===== CREATOR ATTRIBUTION (single sponsor selected) ===== */}
      {selectedSponsor && !compareMode && creatorAttribution.length > 0 && (
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-[#6C5CE7]" />
              <h3 className="font-semibold text-sm">{selectedSponsor} — Creator Impact</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                  <th className="text-left p-3 text-muted-foreground font-medium">Creator</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Followers</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Eng. Rate</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Est. Impressions Driven</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Platform</th>
                </tr>
              </thead>
              <tbody>
                {creatorAttribution.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
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
                    <td className="p-3 text-right font-bold text-[#6C5CE7]">{formatNumber(c.estimatedImpressions)}</td>
                    <td className="p-3 text-right">
                      <Badge variant="outline" className="text-xs capitalize">{c.platform}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
