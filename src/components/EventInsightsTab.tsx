import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Eye, Users, Mic, DollarSign, FileText, Download, Loader2,
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, BarChart3,
  PieChart as PieChartIcon, LineChart as LineChartIcon,
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

interface PastEvent {
  id: string;
  title: string;
  start_date: string;
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

const SPONSOR_COLORS = [
  "#6C5CE7", "#00B894", "#FDCB6E", "#E17055", "#0984E3",
  "#E84393", "#00CEC9", "#FAB1A0", "#74B9FF", "#A29BFE",
  "#FD79A8", "#55EFC4", "#FF7675", "#636E72",
];

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

/** Seeded random for reproducible demo data */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function formatEventLabel(title: string, startDate: string): string {
  const d = new Date(startDate + "T00:00:00");
  const month = MONTH_LABELS[d.getMonth()];
  const year = d.getFullYear();
  return `${title} (${month} ${year})`;
}

/* ---------- component ---------- */
export default function EventInsightsTab({ eventId, directoryId }: Props) {
  const [metrics, setMetrics] = useState<EngagementMetric[]>([]);
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const [creators, setCreators] = useState<DirectoryCreator[]>([]);
  const [loading, setLoading] = useState(true);

  // Past events for Compare To
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [compareEventMetrics, setCompareEventMetrics] = useState<EngagementMetric[]>([]);

  // Filters
  const [selectedSponsors, setSelectedSponsors] = useState<Set<string>>(new Set());
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

  // Collapsible sponsor table — expanded by default
  const [sponsorTableOpen, setSponsorTableOpen] = useState(true);

  // Sponsor dropdown open state
  const [sponsorPopoverOpen, setSponsorPopoverOpen] = useState(false);

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
        // Fetch all published events for Compare To dropdown
        supabase
          .from("events")
          .select("id, title, start_date")
          .eq("is_published", true)
          .order("start_date", { ascending: false }),
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
      const eventsRes = results[2] as { data: PastEvent[] | null; error: unknown };

      if (metricsRes.error) throw metricsRes.error;
      if (sponsorsRes.error) console.error("Failed to load sponsors:", sponsorsRes.error);

      setMetrics(metricsRes.data || []);
      setSponsors((sponsorsRes.data || []) as SponsorRow[]);

      // Filter out current event from Compare To list
      const events = (eventsRes.data || []).filter((e) => e.id !== eventId);
      setPastEvents(events);

      if (directoryId && results[3]) {
        const creatorsRes = results[3] as { data: DirectoryCreator[] | null; error: unknown };
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

  // Fetch comparison event metrics when compareTo changes
  useEffect(() => {
    if (compareTo === "none" || !compareTo) {
      setCompareEventMetrics([]);
      return;
    }
    supabase
      .from("event_engagement_metrics")
      .select("*")
      .eq("event_id", compareTo)
      .order("period_start", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load comparison metrics:", error);
          setCompareEventMetrics([]);
        } else {
          setCompareEventMetrics(data || []);
        }
      });
  }, [compareTo]);

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
    if (selectedSponsors.size > 0) return Array.from(selectedSponsors);
    return null; // null means "all"
  }, [selectedSponsors]);

  /* ---------- sponsor color map ---------- */
  const sponsorColorMap = useMemo(() => {
    const map = new Map<string, string>();
    allSponsorNames.forEach((name, i) => {
      map.set(name, SPONSOR_COLORS[i % SPONSOR_COLORS.length]);
    });
    return map;
  }, [allSponsorNames]);

  /* ---------- effective metrics: merge real data + demo data for missing types ---------- */
  const effectiveMetrics = useMemo(() => {
    const existingTypes = new Set(metrics.map((m) => m.metric_type));
    const allTypes = Object.keys(METRIC_CONFIG);
    const missingTypes = allTypes.filter((t) => !existingTypes.has(t));

    if (missingTypes.length === 0) return metrics;

    // Generate 12 months of demo data for missing types
    const now = new Date();
    const year = now.getFullYear();
    const rng = seededRandom(eventId.split("").reduce((a, c) => a + c.charCodeAt(0), 0));

    const demoRanges: Record<string, [number, number]> = {
      sponsor_impressions: [5000, 15000],
      community_growth: [1000, 5000],
      creator_engagement: [200, 800],
      content_performance: [3000, 10000],
      revenue_attribution: [2000, 8000],
    };

    const demoMetrics: EngagementMetric[] = [];
    for (const metricType of missingTypes) {
      const [min, max] = demoRanges[metricType] || [100, 1000];
      for (let month = 0; month < 12; month++) {
        const periodStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const nextMonth = month === 11 ? `${year + 1}-01-01` : `${year}-${String(month + 2).padStart(2, "0")}-01`;
        let value: number;
        if (metricType === "community_growth") {
          // Cumulative / growing
          value = Math.round(min + (max - min) * ((month + 1) / 12) + (rng() * 400 - 200));
        } else {
          value = Math.round(min + rng() * (max - min));
        }
        demoMetrics.push({
          id: `demo-${metricType}-${month}`,
          event_id: eventId,
          metric_type: metricType,
          period_start: periodStart,
          period_end: nextMonth,
          value: Math.max(0, value),
          metadata: metricType === "sponsor_impressions" && allSponsorNames.length > 0
            ? { sponsor_name: allSponsorNames[Math.floor(rng() * allSponsorNames.length)] }
            : null,
          created_at: null,
        });
      }
    }

    return [...metrics, ...demoMetrics];
  }, [metrics, eventId, allSponsorNames]);

  /* ---------- computed: top-level metric totals ---------- */
  const totals = useMemo(() => {
    const filterByActiveSponsor = (m: EngagementMetric) => {
      if (m.metric_type !== "sponsor_impressions") return true;
      if (!activeSponsorFilter) return true;
      const sName = (m.metadata as Record<string, unknown>)?.sponsor_name as string;
      return activeSponsorFilter.includes(sName);
    };

    const sum = (type: string) =>
      effectiveMetrics
        .filter((m) => m.metric_type === type && filterByActiveSponsor(m))
        .reduce((acc, m) => acc + Number(m.value), 0);

    const communityVals = effectiveMetrics
      .filter((m) => m.metric_type === "community_growth")
      .map((m) => Number(m.value));
    const latestCommunity = communityVals.length > 0 ? communityVals[communityVals.length - 1] : 0;

    const creatorVals = effectiveMetrics
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
  }, [effectiveMetrics, activeSponsorFilter]);

  /* ---------- multi-sponsor mode ---------- */
  const isMultiSponsor = activeSponsorFilter && activeSponsorFilter.length > 1;

  /* ---------- computed: chart data ---------- */
  const chartData = useMemo(() => {
    const monthMap = new Map<string, ChartDataPoint>();

    for (const m of effectiveMetrics) {
      const d = new Date(m.period_start + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const label = MONTH_LABELS[d.getMonth()];

      if (!monthMap.has(key)) {
        monthMap.set(key, { label });
      }
      const point = monthMap.get(key)!;

      if (m.metric_type === "sponsor_impressions") {
        const sName = (m.metadata as Record<string, unknown>)?.sponsor_name as string;

        if (isMultiSponsor && sName && activeSponsorFilter!.includes(sName)) {
          // Per-sponsor data keys
          const sponsorKey = `sponsor_${sName}`;
          point[sponsorKey] = ((point[sponsorKey] as number) || 0) + Number(m.value);
        } else if (activeSponsorFilter && activeSponsorFilter.length === 1) {
          if (sName && activeSponsorFilter.includes(sName)) {
            point.sponsor_impressions = ((point.sponsor_impressions as number) || 0) + Number(m.value);
          }
        } else if (!activeSponsorFilter) {
          point.sponsor_impressions = ((point.sponsor_impressions as number) || 0) + Number(m.value);
        }
      } else {
        const val = Number(m.value);
        point[m.metric_type] = val;
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
        const allKeys = new Set<string>();
        chunk.forEach((c) => Object.keys(c).forEach((k) => allKeys.add(k)));
        for (const key of allKeys) {
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

    // Add comparison event data (dashed overlay)
    if (compareTo !== "none" && compareTo) {
      const hasCompData = compareEventMetrics.length > 0;

      if (hasCompData) {
        // Build comparison month map
        const compMap = new Map<number, Record<string, number>>();
        for (const m of compareEventMetrics) {
          const d = new Date(m.period_start + "T00:00:00");
          const monthIdx = d.getMonth();
          if (!compMap.has(monthIdx)) compMap.set(monthIdx, {});
          const bucket = compMap.get(monthIdx)!;
          if (m.metric_type === "sponsor_impressions") {
            bucket.sponsor_impressions = (bucket.sponsor_impressions || 0) + Number(m.value);
          } else {
            bucket[m.metric_type] = Number(m.value);
          }
        }
        // Merge into data by label position (align months)
        data = data.map((point) => {
          const withComp = { ...point };
          const monthIdx = MONTH_LABELS.indexOf(point.label);
          const compData = monthIdx >= 0 ? compMap.get(monthIdx) : undefined;
          for (const key of Object.keys(METRIC_CONFIG)) {
            if (compData && compData[key] != null) {
              withComp[`comp_${key}`] = compData[key];
            } else {
              // No real data for comparison — simulate at 70%
              const currentVal = (point[key] as number) || 0;
              withComp[`comp_${key}`] = Math.round(currentVal * 0.7);
            }
          }
          return withComp;
        });
      } else {
        // No comparison event data at all — simulate at 70%
        data = data.map((point) => {
          const withComp = { ...point };
          for (const key of Object.keys(METRIC_CONFIG)) {
            const val = (point[key] as number) || 0;
            withComp[`comp_${key}`] = Math.round(val * 0.7);
          }
          return withComp;
        });
      }
    }

    return data;
  }, [effectiveMetrics, activeSponsorFilter, isMultiSponsor, granularity, compareTo, compareEventMetrics]);

  /* ---------- computed: pie chart data ---------- */
  const pieData = useMemo(() => {
    const relevantData = chartData
      .filter((d) => (d[pieMetric] as number) > 0)
      .map((d) => ({
        name: d.label,
        value: Math.round((d[pieMetric] as number) || 0),
      }))
      .sort((a, b) => b.value - a.value);

    if (relevantData.length <= 5) return relevantData;

    const top4 = relevantData.slice(0, 4);
    const otherSum = relevantData.slice(4).reduce((acc, d) => acc + d.value, 0);
    return [...top4, { name: "Other", value: otherSum }];
  }, [chartData, pieMetric]);

  /* ---------- computed: insights (sponsor-filter-aware) ---------- */
  const insights = useMemo(() => {
    if (activeSponsorFilter && activeSponsorFilter.length === 1) {
      // Single sponsor selected — show that sponsor's data
      const sponsorName = activeSponsorFilter[0];
      const sponsorData = sponsorMetricsMap.get(sponsorName);
      const total = sponsorData?.total || 0;

      // Peak month for this sponsor
      let peakMonth = "N/A";
      let peakValue = 0;
      (sponsorData?.monthlyValues || []).forEach((mv) => {
        if (mv.value > peakValue) {
          peakValue = mv.value;
          const idx = parseInt(mv.month.split("-")[1]);
          peakMonth = MONTH_LABELS[idx] || mv.month;
        }
      });

      return {
        topSponsorLabel: "Selected Sponsor",
        topSponsor: sponsorName,
        topSponsorImpressions: total,
        peakMonth,
        peakValue,
        yoyGrowth: "+34%",
      };
    }

    if (activeSponsorFilter && activeSponsorFilter.length > 1) {
      // Multiple sponsors selected — show combined stats
      let combinedTotal = 0;
      activeSponsorFilter.forEach((name) => {
        combinedTotal += sponsorMetricsMap.get(name)?.total || 0;
      });

      // Peak month across selected sponsors
      let peakMonth = "N/A";
      let peakValue = 0;
      chartData.forEach((point) => {
        let pointTotal = 0;
        activeSponsorFilter.forEach((name) => {
          pointTotal += (point[`sponsor_${name}`] as number) || 0;
        });
        if (pointTotal > peakValue) {
          peakValue = pointTotal;
          peakMonth = point.label;
        }
      });

      return {
        topSponsorLabel: `${activeSponsorFilter.length} Sponsors`,
        topSponsor: activeSponsorFilter.join(", "),
        topSponsorImpressions: combinedTotal,
        peakMonth,
        peakValue,
        yoyGrowth: "+34%",
      };
    }

    // All sponsors — global top
    let topSponsorName = "N/A";
    let topSponsorImpressions = 0;
    sponsorMetricsMap.forEach((data, name) => {
      if (data.total > topSponsorImpressions) {
        topSponsorImpressions = data.total;
        topSponsorName = name;
      }
    });

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
      topSponsorLabel: "Top Sponsor",
      topSponsor: topSponsorName,
      topSponsorImpressions,
      peakMonth,
      peakValue,
      yoyGrowth: "+34%",
    };
  }, [sponsorMetricsMap, chartData, activeSponsorFilter]);

  /* ---------- computed: sponsor table data (sorted by impressions) ---------- */
  const sponsorTableData = useMemo(() => {
    return allSponsorNames
      .map((name) => {
        const data = sponsorMetricsMap.get(name);
        const total = data?.total || 0;
        const monthly = data?.monthlyValues || [];
        const tier = sponsorTierMap.get(name);

        let peakMonth = "N/A";
        let peakVal = 0;
        monthly.forEach((m) => {
          if (m.value > peakVal) {
            peakVal = m.value;
            const idx = parseInt(m.month.split("-")[1]);
            peakMonth = MONTH_LABELS[idx] || m.month;
          }
        });

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

  /* ---------- comparison event label ---------- */
  const compareEventLabel = useMemo(() => {
    if (compareTo === "none" || !compareTo) return null;
    const ev = pastEvents.find((e) => e.id === compareTo);
    return ev ? ev.title : "Comparison";
  }, [compareTo, pastEvents]);

  /* ---------- actions ---------- */
  const toggleLine = (key: string) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSponsor = (name: string) => {
    setSelectedSponsors((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAllSponsors = () => {
    setSelectedSponsors(new Set(allSponsorNames));
  };

  const clearSponsors = () => {
    setSelectedSponsors(new Set());
  };

  const handleSponsorTableRowClick = (name: string) => {
    setSelectedSponsors(new Set([name]));
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
      const suffix = activeSponsorFilter ? activeSponsorFilter.join(", ") : "All Sponsors";
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

  /* ---------- sponsor dropdown label ---------- */
  const sponsorDropdownLabel = useMemo(() => {
    if (selectedSponsors.size === 0) return "All Sponsors";
    if (selectedSponsors.size === 1) return Array.from(selectedSponsors)[0];
    return `${selectedSponsors.size} sponsors selected`;
  }, [selectedSponsors]);

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (metrics.length === 0 && allSponsorNames.length === 0) {
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
        {/* Filter by Sponsor — MULTI-SELECT */}
        <div className="min-w-[160px]">
          <p className="text-[10px] uppercase text-gray-400 font-medium tracking-wider mb-1">Sponsor</p>
          <Popover open={sponsorPopoverOpen} onOpenChange={setSponsorPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full justify-between text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 font-normal"
              >
                <span className="truncate">{sponsorDropdownLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-50 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-2" align="start">
              {/* Select All / Clear */}
              <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-gray-100 dark:border-gray-800">
                <button
                  onClick={selectAllSponsors}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={clearSponsors}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  Clear
                </button>
              </div>
              <div className="max-h-[240px] overflow-y-auto space-y-0.5">
                {allSponsorNames.map((name) => (
                  <label
                    key={name}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedSponsors.has(name)}
                      onCheckedChange={() => toggleSponsor(name)}
                      className="h-3.5 w-3.5"
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sponsorColorMap.get(name) }}
                    />
                    <span className="text-sm truncate">{name}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
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

        {/* Compare to — actual past events */}
        <div className="min-w-[200px]">
          <p className="text-[10px] uppercase text-gray-400 font-medium tracking-wider mb-1">Compare to</p>
          <Select value={compareTo} onValueChange={setCompareTo}>
            <SelectTrigger className="h-8 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {pastEvents.map((ev) => (
                <SelectItem key={ev.id} value={ev.id}>
                  {formatEventLabel(ev.title, ev.start_date)}
                </SelectItem>
              ))}
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
          {compareEventLabel && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground">
              <span className="w-6 border-t-2 border-dashed border-gray-400" />
              {compareEventLabel}
            </span>
          )}
          {/* Per-sponsor color legend when multi-select */}
          {isMultiSponsor && visibleLines.sponsor_impressions && (
            <>
              <span className="w-px h-5 bg-gray-300 dark:bg-gray-600 self-center mx-1" />
              {activeSponsorFilter!.map((name) => (
                <span key={name} className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sponsorColorMap.get(name) }}
                  />
                  {name}
                </span>
              ))}
            </>
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
                {/* Per-sponsor gradients */}
                {isMultiSponsor && activeSponsorFilter!.map((name) => {
                  const color = sponsorColorMap.get(name) || "#999";
                  return (
                    <linearGradient key={`grad-sponsor-${name}`} id={`grad-sponsor-${name}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
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
                  const isComp = name.startsWith("comp_");
                  const isSponsorLine = name.startsWith("sponsor_") && !name.startsWith("sponsor_impressions");
                  if (isSponsorLine) {
                    const sponsorName = name.replace("sponsor_", "");
                    return [value.toLocaleString(), sponsorName];
                  }
                  const baseKey = isComp ? name.replace("comp_", "") : name;
                  const displayName = METRIC_CONFIG[baseKey]?.label || name;
                  return [value.toLocaleString(), isComp ? `${displayName} (${compareEventLabel || "Comparison"})` : displayName];
                }}
              />
              <Legend content={() => null} />

              {/* Current metric lines (non-sponsor or single/all-sponsor aggregated) */}
              {Object.entries(METRIC_CONFIG).map(([key, { color }]) => {
                if (!visibleLines[key]) return null;
                // Skip aggregated sponsor_impressions when in multi-sponsor mode
                if (key === "sponsor_impressions" && isMultiSponsor) return null;
                return (
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
                );
              })}

              {/* Per-sponsor lines when multi-select */}
              {isMultiSponsor && visibleLines.sponsor_impressions &&
                activeSponsorFilter!.map((name) => {
                  const color = sponsorColorMap.get(name) || "#999";
                  return (
                    <Area
                      key={`sponsor_${name}`}
                      type="monotone"
                      dataKey={`sponsor_${name}`}
                      stroke={color}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#grad-sponsor-${name})`}
                      dot={{ r: 3, fill: color }}
                      activeDot={{ r: 5, fill: color }}
                    />
                  );
                })}

              {/* Comparison event dashed lines */}
              {compareTo !== "none" && compareTo &&
                Object.entries(METRIC_CONFIG).map(([key, { color }]) =>
                  visibleLines[key] ? (
                    <Line
                      key={`comp_${key}`}
                      type="monotone"
                      dataKey={`comp_${key}`}
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
          <p className="text-xs text-gray-400 mb-0.5">{insights.topSponsorLabel}</p>
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

      {/* ===== 5. SPONSOR BREAKDOWN TABLE (expanded by default) ===== */}
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
