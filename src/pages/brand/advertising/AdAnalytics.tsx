import { useState } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  BarChart3,
  DollarSign,
  Eye,
  Users,
  TrendingUp,
} from "lucide-react";

const DEMO_MONTHLY_SPEND = [
  { month: "Sep", spend: 12400 },
  { month: "Oct", spend: 18200 },
  { month: "Nov", spend: 22800 },
  { month: "Dec", spend: 15600 },
  { month: "Jan", spend: 28400 },
  { month: "Feb", spend: 19500 },
];

const DEMO_MONTHLY_IMPRESSIONS = [
  { month: "Sep", impressions: 420000 },
  { month: "Oct", impressions: 580000 },
  { month: "Nov", impressions: 890000 },
  { month: "Dec", impressions: 510000 },
  { month: "Jan", impressions: 1200000 },
  { month: "Feb", impressions: 730000 },
];

const DEMO_CPM_TREND = [
  { month: "Sep", cpm: 29 },
  { month: "Oct", cpm: 31 },
  { month: "Nov", cpm: 26 },
  { month: "Dec", cpm: 31 },
  { month: "Jan", cpm: 24 },
  { month: "Feb", cpm: 27 },
];

const DEMO_TOP_ADVERTISERS = [
  { name: "USAA", spend: 45000, impressions: "2.1M", campaigns: 3 },
  { name: "Hiring Our Heroes", spend: 12500, impressions: "340K", campaigns: 1 },
  { name: "Amazon", spend: 8200, impressions: "890K", campaigns: 1 },
  { name: "GEICO Military", spend: 6800, impressions: "210K", campaigns: 2 },
  { name: "Boeing Defense", spend: 5400, impressions: "180K", campaigns: 1 },
];

export default function AdAnalytics() {
  const { isDemo } = useDemoMode();
  const [timeFilter, setTimeFilter] = useState("6m");

  const spendData = isDemo ? DEMO_MONTHLY_SPEND : [];
  const impressionsData = isDemo ? DEMO_MONTHLY_IMPRESSIONS : [];
  const cpmData = isDemo ? DEMO_CPM_TREND : [];
  const topAdvertisers = isDemo ? DEMO_TOP_ADVERTISERS : [];

  const totalSpend = spendData.reduce((s, d) => s + d.spend, 0);
  const totalImpressions = impressionsData.reduce((s, d) => s + d.impressions, 0);
  const avgCpm = cpmData.length ? Math.round(cpmData.reduce((s, d) => s + d.cpm, 0) / cpmData.length) : 0;
  const creatorPayouts = Math.round(totalSpend * 0.7);

  const STATS = [
    { label: "Total Ad Spend", value: `$${totalSpend.toLocaleString()}`, icon: DollarSign, color: "text-blue-400", bg: "bg-blue-900/30" },
    { label: "Avg CPM", value: `$${avgCpm}`, icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-900/30" },
    { label: "Total Impressions", value: `${(totalImpressions / 1_000_000).toFixed(1)}M`, icon: Eye, color: "text-amber-400", bg: "bg-amber-900/30" },
    { label: "Creator Payouts (70%)", value: `$${creatorPayouts.toLocaleString()}`, icon: Users, color: "text-emerald-400", bg: "bg-emerald-900/30" },
  ];

  const tooltipStyle = { borderRadius: 8, border: "1px solid #374151", backgroundColor: "#1A1D27", fontSize: 13 };

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="h-7 w-7 text-purple-400" />
          <h1 className="text-3xl font-bold text-pd-navy dark:text-white">Ad Analytics</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400">Track advertising performance, spend, and revenue share.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex bg-[#1A1D27] rounded-lg p-1">
          {[["3m", "3 Months"], ["6m", "6 Months"], ["12m", "12 Months"], ["all", "All Time"]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTimeFilter(val)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${timeFilter === val ? "bg-[#6C5CE7] text-white" : "text-gray-400 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {STATS.map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-5 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-[#000741] dark:text-white">{stat.value}</p>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Spend */}
        <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Monthly Ad Spend</h3>
          <div className="h-[250px]">
            {spendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [`$${val.toLocaleString()}`, "Spend"]} />
                  <Bar dataKey="spend" fill="#6C5CE7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
            )}
          </div>
        </Card>

        {/* Monthly Impressions */}
        <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Monthly Impressions</h3>
          <div className="h-[250px]">
            {impressionsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={impressionsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [`${(val / 1000).toFixed(0)}K`, "Impressions"]} />
                  <Line type="monotone" dataKey="impressions" stroke="#6C5CE7" strokeWidth={2.5} dot={{ fill: "#6C5CE7", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPM Trend */}
        <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">CPM Trend</h3>
          <div className="h-[250px]">
            {cpmData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cpmData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [`$${val}`, "CPM"]} />
                  <Line type="monotone" dataKey="cpm" stroke="#10B981" strokeWidth={2.5} dot={{ fill: "#10B981", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
            )}
          </div>
        </Card>

        {/* Top Advertisers */}
        <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Top Advertisers by Spend</h3>
          </div>
          {topAdvertisers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No data available</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#111827]">
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 font-medium">Advertiser</th>
                  <th className="px-4 py-3 font-medium text-right">Spend</th>
                  <th className="px-4 py-3 font-medium text-right">Impressions</th>
                  <th className="px-4 py-3 font-medium text-right">Campaigns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {topAdvertisers.map(a => (
                  <tr key={a.name} className="hover:bg-gray-50 dark:hover:bg-[#111827] transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.name}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-500">${a.spend.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{a.impressions}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{a.campaigns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
