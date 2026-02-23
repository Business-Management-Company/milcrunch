import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp, DollarSign, Percent, Download, ArrowRight,
  Rocket, Shield, Tv, Building2, Users, Mic, Radio, ShoppingBag,
  Briefcase, Database, GraduationCap, BarChart3, Tag, FileBarChart,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";

/* ================================================================== */
/* Data — computed from MilCrunch_Financial_Model.xlsx (Assumptions)   */
/* ================================================================== */

const KPIS = [
  { label: "Year 1 Revenue", value: "$217K", sub: "Launch year", icon: DollarSign },
  { label: "Year 3 Revenue", value: "$2.1M", sub: "Scale phase", icon: TrendingUp },
  { label: "Year 5 Revenue", value: "$14.4M", sub: "Mature operations", icon: BarChart3 },
  { label: "Year 5 EBITDA", value: "$9.1M", sub: "Operating profit", icon: DollarSign },
  { label: "Year 5 Margin", value: "64%", sub: "EBITDA margin", icon: Percent },
];

/* Revenue by stream per year ($K) — from P&L Model */
const REVENUE_BY_STREAM = [
  { year: "Y1", Events: 166, Platform: 16, Marketplace: 5, Media: 15, Community: 15 },
  { year: "Y2", Events: 443, Platform: 88, Marketplace: 24, Media: 72, Community: 58 },
  { year: "Y3", Events: 914, Platform: 330, Marketplace: 108, Media: 582, Community: 215 },
  { year: "Y4", Events: 1613, Platform: 847, Marketplace: 380, Media: 2130, Community: 675 },
  { year: "Y5", Events: 2720, Platform: 1908, Marketplace: 1425, Media: 6350, Community: 1975 },
];

const STREAM_COLORS: Record<string, string> = {
  Events: "#1e3a5f",
  Platform: "#3B82F6",
  Marketplace: "#2d5282",
  Media: "#14B8A6",
  Community: "#F59E0B",
};

const EBITDA_DATA = [
  { year: "Y1", ebitda: -208, margin: -96 },
  { year: "Y2", ebitda: -149, margin: -22 },
  { year: "Y3", ebitda: 531, margin: 25 },
  { year: "Y4", ebitda: 2707, margin: 48 },
  { year: "Y5", ebitda: 9147, margin: 64 },
];

/* Revenue streams detail table ($K) */
interface StreamRow {
  name: string;
  category: "Events" | "Platform" | "Marketplace" | "Media" | "Community";
  y1: number; y2: number; y3: number; y4: number; y5: number;
  newIn?: string;
  icon: React.ElementType;
}

const STREAM_ROWS: StreamRow[] = [
  /* Events — tickets = events × price × attendees × conversion; sponsorships = events × avg; exhibitor = events × avg */
  { name: "Ticket Sales", category: "Events", y1: 72, y2: 215, y3: 464, y4: 829, y5: 1440, icon: Users },
  { name: "Event Sponsorships", category: "Events", y1: 70, y2: 168, y3: 330, y4: 560, y5: 900, icon: Shield },
  { name: "Exhibitor Fees", category: "Events", y1: 24, y2: 60, y3: 120, y4: 224, y5: 380, icon: Building2 },

  /* Platform & SaaS — licensing = clients × fee; badges = subs × monthly × 12; reports = sold × fee */
  { name: "White-Label Licensing", category: "Platform", y1: 0, y2: 24, y3: 90, y4: 216, y5: 504, icon: Rocket },
  { name: "Creator Badge Subs", category: "Platform", y1: 11, y2: 46, y3: 180, y4: 487, y5: 1044, icon: Shield },
  { name: "Sponsor ROI Reports", category: "Platform", y1: 5, y2: 19, y3: 60, y4: 144, y5: 360, icon: FileBarChart },

  /* Creator Marketplace — rentals = qty × fee; commissions = deals × value × rate */
  { name: "Creator List Rentals", category: "Marketplace", y1: 3, y2: 15, y3: 60, y4: 188, y5: 525, icon: Tag },
  { name: "Deal Commissions", category: "Marketplace", y1: 2, y2: 9, y3: 48, y4: 192, y5: 900, icon: ShoppingBag },

  /* Media & Streaming — podcast = rev/ep × episodes; streaming ads in $K; subs = qty × fee × 12; licensing in $K */
  { name: "Podcast Advertising", category: "Media", y1: 15, y2: 72, y3: 312, y4: 1000, y5: 2600, icon: Mic },
  { name: "Streaming Channel Ads", category: "Media", y1: 0, y2: 0, y3: 150, y4: 400, y5: 900, newIn: "Y3", icon: Tv },
  { name: "Streaming Subscriptions", category: "Media", y1: 0, y2: 0, y3: 120, y4: 480, y5: 2100, newIn: "Y3", icon: Tv },
  { name: "Content Licensing", category: "Media", y1: 0, y2: 0, y3: 0, y4: 250, y5: 750, newIn: "Y4", icon: Radio },

  /* Community & Other */
  { name: "Merch / SWAG", category: "Community", y1: 15, y2: 35, y3: 80, y4: 180, y5: 350, icon: ShoppingBag },
  { name: "Job Board", category: "Community", y1: 0, y2: 13, y3: 70, y4: 300, y5: 1125, newIn: "Y2", icon: Briefcase },
  { name: "Data Insights Reports", category: "Community", y1: 0, y2: 0, y3: 25, y4: 75, y5: 200, newIn: "Y3", icon: Database },
  { name: "Academy / Courses", category: "Community", y1: 0, y2: 10, y3: 40, y4: 120, y5: 300, newIn: "Y2", icon: GraduationCap },
];

const CAT_COLORS: Record<string, { bg: string; text: string; border: string; darkBg: string; darkBorder: string }> = {
  Events:      { bg: "bg-blue-50",  text: "text-blue-800",  border: "border-blue-300",  darkBg: "bg-blue-950/30",  darkBorder: "border-blue-800/40" },
  Platform:    { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    darkBg: "bg-blue-950/30",    darkBorder: "border-blue-800/40" },
  Marketplace: { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  darkBg: "bg-violet-950/30",  darkBorder: "border-violet-800/40" },
  Media:       { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200",    darkBg: "bg-teal-950/30",    darkBorder: "border-teal-800/40" },
  Community:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   darkBg: "bg-amber-950/30",   darkBorder: "border-amber-800/40" },
};

const CAT_HEADER: Record<string, string> = {
  Events: "#1e3a5f",
  Platform: "#3B82F6",
  Marketplace: "#2d5282",
  Media: "#14B8A6",
  Community: "#F59E0B",
};

/* Assumptions data — directly from the Assumptions tab of the financial model */
const ASSUMPTIONS = [
  {
    title: "Live Events",
    color: "#1e3a5f",
    items: [
      { label: "Events per year (Y1 \u2192 Y5)", value: "2 \u2192 10" },
      { label: "Avg ticket price", value: "$150 \u2192 $200" },
      { label: "Avg attendees per event", value: "400 \u2192 1,000" },
      { label: "Ticket conversion rate", value: "60% \u2192 72%" },
      { label: "Avg sponsorship per event", value: "$35K \u2192 $90K" },
      { label: "Avg exhibitor revenue per event", value: "$12K \u2192 $38K" },
    ],
  },
  {
    title: "Platform & SaaS",
    color: "#3B82F6",
    items: [
      { label: "White-label license clients", value: "0 \u2192 12" },
      { label: "Annual license fee", value: "$24K \u2192 $42K" },
      { label: "Creator badge subscribers", value: "50 \u2192 3,000" },
      { label: "Monthly badge fee", value: "$19 \u2192 $29" },
      { label: "Sponsor reports sold per year", value: "10 \u2192 240" },
      { label: "Report fee per report", value: "$500 \u2192 $1,500" },
    ],
  },
  {
    title: "Creator Marketplace",
    color: "#2d5282",
    items: [
      { label: "List rentals per year", value: "5 \u2192 350" },
      { label: "Avg list rental fee", value: "$500 \u2192 $1,500" },
      { label: "Brand-creator deals facilitated", value: "10 \u2192 500" },
      { label: "Avg deal value", value: "$2K \u2192 $12K" },
      { label: "Platform commission rate", value: "10% \u2192 15%" },
    ],
  },
  {
    title: "Media & Streaming",
    color: "#14B8A6",
    items: [
      { label: "Podcast ad revenue per episode", value: "$300 \u2192 $5K" },
      { label: "Episodes produced per year", value: "50 \u2192 520" },
      { label: "Streaming subscribers (Y3+)", value: "0 \u2192 25K" },
      { label: "Monthly streaming fee", value: "$5 \u2192 $7" },
      { label: "Content licensing (Y4+)", value: "$0 \u2192 $750K" },
    ],
  },
  {
    title: "Community & Other",
    color: "#F59E0B",
    items: [
      { label: "Merch / SWAG revenue", value: "$15K \u2192 $350K" },
      { label: "Job board postings per year", value: "0 \u2192 1,500" },
      { label: "Avg job board fee", value: "$250 \u2192 $750" },
      { label: "Data insights revenue (Y3+)", value: "$0 \u2192 $200K" },
      { label: "Academy / course revenue", value: "$0 \u2192 $300K" },
    ],
  },
  {
    title: "Costs & Team",
    color: "#EF4444",
    items: [
      { label: "Event production per event", value: "$45K \u2192 $100K" },
      { label: "Full-time employees (Y1 \u2192 Y5)", value: "3 \u2192 25" },
      { label: "Avg fully-loaded salary", value: "$85K \u2192 $105K" },
      { label: "Technology / hosting / APIs", value: "$24K \u2192 $150K" },
      { label: "Marketing spend", value: "$30K \u2192 $450K" },
      { label: "G&A as % of revenue", value: "12% \u2192 7%" },
    ],
  },
];

/* Investor thesis cards */
const THESIS_CARDS = [
  {
    number: "01",
    title: "Captive Audience",
    headline: "18M+ veterans. Deeply loyal. Massively underserved.",
    body: "The military and veteran community is one of the largest, most engaged, and most brand-loyal demographics in America \u2014 yet no platform owns this vertical. MilCrunch is building the community layer that Military.com never did: events, creators, streaming, and commerce in a single ecosystem. First-mover advantage in a $12B+ addressable market.",
  },
  {
    number: "02",
    title: "Year-Round Revenue Engine",
    headline: "Events become 365-day engagement, not 3-day spikes.",
    body: "Traditional military events generate revenue for one weekend and go dark. MilCrunch converts every event into a persistent community with year-round platform access, creator content, sponsor dashboards, and automated renewal workflows. Sponsors stop writing one-time checks and start signing annual contracts \u2014 increasing LTV 4x while reducing sales cycles.",
  },
  {
    number: "03",
    title: "Streaming = Asymmetric Upside",
    headline: "Streaming subs hit 25K by Y5. Content licensing adds $750K.",
    body: "Military content is a proven winner \u2014 documentaries, reality formats, and veteran stories consistently over-index on streaming platforms. MilCrunch is building the production pipeline and content library now. By Y3, streaming subscriptions and channel ads contribute $270K. By Y5, streaming revenue reaches $5.7M with content licensing to major platforms adding another $750K.",
  },
  {
    number: "04",
    title: "White-Label Moat",
    headline: "License to VFW, MOAA, AUSA \u2014 12 clients at $42K/yr by Y5.",
    body: "Every Veterans Service Organization, military association, and base MWR office needs what MilCrunch built \u2014 but can\u2019t build it themselves. White-label licensing grows from 1 client in Y2 to 12 by Y5, generating $504K in pure recurring SaaS revenue. Zero customer acquisition cost, near-zero churn, and every deployment deepens the MilCrunch ecosystem and data moat.",
  },
];

/* ================================================================== */
/* Sub-tab type                                                        */
/* ================================================================== */
const SUB_TABS = ["5-Year Forecast", "3-Year Forecast", "Revenue Streams", "Assumptions", "Investor Thesis"] as const;
type SubTabId = (typeof SUB_TABS)[number];

/* ================================================================== */
/* Formatters                                                          */
/* ================================================================== */
function fmtK(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}M`;
  return `$${v}K`;
}

/* ================================================================== */
/* Component                                                           */
/* ================================================================== */

export default function FinancialModelTab({ dark }: { dark: boolean }) {
  const [subTab, setSubTab] = useState<SubTabId>("5-Year Forecast");

  return (
    <div className="space-y-8">
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSubTab(tab)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200",
              subTab === tab
                ? dark
                  ? "bg-white/[0.1] text-white border border-white/[0.12]"
                  : "bg-white text-[#111827] border border-[#E5E7EB] shadow-sm"
                : dark
                  ? "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                  : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {subTab === "5-Year Forecast" && <ForecastSub dark={dark} years={5} />}
      {subTab === "3-Year Forecast" && <ForecastSub dark={dark} years={3} />}
      {subTab === "Revenue Streams" && <RevenueStreamsSub dark={dark} />}
      {subTab === "Assumptions" && <AssumptionsSub dark={dark} />}
      {subTab === "Investor Thesis" && <InvestorThesisSub dark={dark} />}
    </div>
  );
}

/* ================================================================== */
/* Forecast Sub-tab (3-Year or 5-Year)                                 */
/* ================================================================== */

function ForecastSub({ dark, years }: { dark: boolean; years: 3 | 5 }) {
  const yearLabels = years === 3 ? ["Y1", "Y2", "Y3"] : ["Y1", "Y2", "Y3", "Y4", "Y5"];
  const revenueData = REVENUE_BY_STREAM.slice(0, years);
  const ebitdaData = EBITDA_DATA.slice(0, years);
  const kpis = years === 3
    ? KPIS.filter((k) => !k.label.includes("Year 5"))
    : KPIS;

  const COST_ROWS = [
    { name: "Event Production", vals: [90, 220, 390, 640, 1000] },
    { name: "Personnel", vals: [255, 450, 855, 1500, 2625] },
    { name: "Technology / Hosting", vals: [24, 36, 60, 96, 150] },
    { name: "Marketing & Growth", vals: [30, 60, 120, 250, 450] },
    { name: "G&A", vals: [26, 68, 193, 452, 1006] },
  ];
  const COST_TOTALS = [425, 834, 1618, 2938, 5231];

  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <div className={cn("grid gap-3", years === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-5")}>
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={cn(
                "rounded-xl p-4 border transition-colors duration-300",
                dark
                  ? "bg-white/[0.04] border-white/[0.08]"
                  : "bg-white border-[#E5E7EB] shadow-sm"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-[#1e3a5f]" />
                </div>
                <span className={cn(
                  "text-[11px] font-medium uppercase tracking-wide",
                  dark ? "text-gray-500" : "text-[#9CA3AF]"
                )}>
                  {kpi.label}
                </span>
              </div>
              <div className={cn(
                "text-2xl font-extrabold tracking-tight",
                dark ? "text-white" : "text-[#111827]"
              )}>
                {kpi.value}
              </div>
              <div className={cn(
                "text-xs mt-0.5",
                dark ? "text-gray-500" : "text-[#9CA3AF]"
              )}>
                {kpi.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Stacked bar chart — Revenue by Stream */}
        <div
          className={cn(
            "rounded-xl p-5 border transition-colors duration-300",
            dark
              ? "bg-white/[0.04] border-white/[0.08]"
              : "bg-white border-[#E5E7EB] shadow-sm"
          )}
        >
          <h4 className={cn(
            "text-sm font-semibold mb-4",
            dark ? "text-white" : "text-[#111827]"
          )}>
            Revenue by Stream ($K) — {years}-Year
          </h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData} barCategoryGap="20%">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={dark ? "rgba(255,255,255,0.06)" : "#F3F4F6"}
              />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12, fill: dark ? "#9CA3AF" : "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: dark ? "#9CA3AF" : "#6B7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}M` : `${v}K`}`}
              />
              <RechartsTooltip
                contentStyle={{
                  background: dark ? "#1a1a2e" : "#fff",
                  border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#E5E7EB"}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: dark ? "#fff" : "#111", fontWeight: 600 }}
                itemStyle={{ color: dark ? "#ccc" : "#374151" }}
                formatter={(value: number) => [`$${value}K`, undefined]}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              {Object.keys(STREAM_COLORS).map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="revenue"
                  fill={STREAM_COLORS[key]}
                  radius={key === "Community" ? [3, 3, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* EBITDA line chart */}
        <div
          className={cn(
            "rounded-xl p-5 border transition-colors duration-300",
            dark
              ? "bg-white/[0.04] border-white/[0.08]"
              : "bg-white border-[#E5E7EB] shadow-sm"
          )}
        >
          <h4 className={cn(
            "text-sm font-semibold mb-4",
            dark ? "text-white" : "text-[#111827]"
          )}>
            EBITDA Trend ($K) — {years}-Year
          </h4>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={ebitdaData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={dark ? "rgba(255,255,255,0.06)" : "#F3F4F6"}
              />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12, fill: dark ? "#9CA3AF" : "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: dark ? "#9CA3AF" : "#6B7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  if (v === 0) return "$0";
                  if (v > 0) return v >= 1000 ? `$${(v / 1000).toFixed(0)}M` : `$${v}K`;
                  return `-$${Math.abs(v)}K`;
                }}
              />
              <RechartsTooltip
                contentStyle={{
                  background: dark ? "#1a1a2e" : "#fff",
                  border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#E5E7EB"}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: dark ? "#fff" : "#111", fontWeight: 600 }}
                formatter={(value: number, name: string) => {
                  if (name === "ebitda") return [value >= 0 ? fmtK(value) : `-${fmtK(Math.abs(value))}`, "EBITDA"];
                  return [`${value}%`, "Margin"];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Line
                type="monotone"
                dataKey="ebitda"
                stroke="#1e3a5f"
                strokeWidth={2.5}
                dot={{ fill: "#1e3a5f", r: 4, strokeWidth: 2, stroke: dark ? "#0A0A0F" : "#fff" }}
                name="EBITDA ($K)"
              />
              <Line
                type="monotone"
                dataKey="margin"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{ fill: "#3b82f6", r: 3, strokeWidth: 2, stroke: dark ? "#0A0A0F" : "#fff" }}
                name="Margin (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost breakdown table */}
      <div
        className={cn(
          "rounded-xl border overflow-hidden transition-colors duration-300",
          dark ? "border-white/[0.08]" : "border-[#E5E7EB]"
        )}
      >
        <div className="px-4 py-3 bg-[#EF4444] flex items-center gap-2">
          <span className="text-white text-sm font-semibold">Operating Costs ($K) — {years}-Year</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={cn(dark ? "bg-white/[0.03]" : "bg-[#F9FAFB]")}>
                <th className={cn("text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wide", dark ? "text-gray-500" : "text-[#9CA3AF]")}>
                  Cost Line
                </th>
                {yearLabels.map((y) => (
                  <th key={y} className={cn("text-right px-4 py-2.5 font-medium text-xs uppercase tracking-wide", dark ? "text-gray-500" : "text-[#9CA3AF]")}>
                    {y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COST_ROWS.map((row, i) => (
                <tr key={row.name} className={cn(i % 2 === 0 ? (dark ? "bg-transparent" : "bg-white") : (dark ? "bg-white/[0.02]" : "bg-[#FAFAFA]"))}>
                  <td className={cn("px-4 py-3 font-medium", dark ? "text-gray-200" : "text-[#111827]")}>{row.name}</td>
                  {row.vals.slice(0, years).map((v, j) => (
                    <td key={j} className={cn("text-right px-4 py-3 tabular-nums", dark ? "text-gray-300" : "text-[#374151]")}>
                      {fmtK(v)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className={cn("font-semibold border-t", dark ? "border-white/[0.08] bg-white/[0.03]" : "border-[#E5E7EB] bg-[#F9FAFB]")}>
                <td className={cn("px-4 py-3", dark ? "text-white" : "text-[#111827]")}>Total Costs</td>
                {COST_TOTALS.slice(0, years).map((v, j) => (
                  <td key={j} className={cn("text-right px-4 py-3 tabular-nums", dark ? "text-white" : "text-[#111827]")}>{fmtK(v)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Download button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => window.open("mailto:andrew@recurrentx.com?subject=MilCrunch%20Financial%20Model%20Request&body=I'd%20like%20to%20request%20the%20full%20financial%20model%20Excel%20file.", "_blank")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1e3a5f] hover:bg-[#2d5282] text-white font-semibold text-sm transition-colors"
        >
          <Download className="h-4 w-4" /> Request Full Model (.xlsx)
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Sub-tab 2: Revenue Streams                                          */
/* ================================================================== */

function RevenueStreamsSub({ dark }: { dark: boolean }) {
  const categories = ["Events", "Platform", "Marketplace", "Media", "Community"] as const;

  return (
    <div className="space-y-8">
      {categories.map((cat) => {
        const rows = STREAM_ROWS.filter((r) => r.category === cat);
        const colors = CAT_COLORS[cat];
        return (
          <div key={cat}>
            {/* Category header */}
            <div
              className="rounded-t-xl px-4 py-2.5 flex items-center gap-2"
              style={{ background: CAT_HEADER[cat] }}
            >
              <span className="text-white text-sm font-semibold">{cat}</span>
              <span className="text-white/60 text-xs ml-auto">
                Y5 Total: {fmtK(rows.reduce((s, r) => s + r.y5, 0))}
              </span>
            </div>

            {/* Table */}
            <div
              className={cn(
                "rounded-b-xl border border-t-0 overflow-hidden transition-colors duration-300",
                dark ? colors.darkBorder : colors.border
              )}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn(
                      "transition-colors duration-300",
                      dark ? "bg-white/[0.03]" : "bg-[#F9FAFB]"
                    )}>
                      <th className={cn(
                        "text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wide",
                        dark ? "text-gray-500" : "text-[#9CA3AF]"
                      )}>
                        Revenue Stream
                      </th>
                      {["Y1", "Y2", "Y3", "Y4", "Y5"].map((y) => (
                        <th
                          key={y}
                          className={cn(
                            "text-right px-4 py-2.5 font-medium text-xs uppercase tracking-wide",
                            dark ? "text-gray-500" : "text-[#9CA3AF]"
                          )}
                        >
                          {y}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const Icon = row.icon;
                      return (
                        <tr
                          key={row.name}
                          className={cn(
                            "transition-colors duration-300",
                            i % 2 === 0
                              ? dark ? "bg-transparent" : "bg-white"
                              : dark ? "bg-white/[0.02]" : "bg-[#FAFAFA]"
                          )}
                        >
                          <td className="px-4 py-3 flex items-center gap-2.5">
                            <div
                              className={cn(
                                "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                                dark ? colors.darkBg : colors.bg
                              )}
                            >
                              <Icon className={cn("h-3.5 w-3.5", colors.text)} />
                            </div>
                            <span className={cn(
                              "font-medium",
                              dark ? "text-gray-200" : "text-[#111827]"
                            )}>
                              {row.name}
                            </span>
                            {row.newIn && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1e3a5f]/10 text-[#1e3a5f] whitespace-nowrap">
                                New in {row.newIn}
                              </span>
                            )}
                          </td>
                          {[row.y1, row.y2, row.y3, row.y4, row.y5].map((v, j) => (
                            <td
                              key={j}
                              className={cn(
                                "text-right px-4 py-3 tabular-nums",
                                v === 0
                                  ? dark ? "text-gray-600" : "text-[#D1D5DB]"
                                  : dark ? "text-gray-300" : "text-[#374151]"
                              )}
                            >
                              {v === 0 ? "\u2014" : fmtK(v)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {/* Subtotal row */}
                    <tr className={cn(
                      "font-semibold transition-colors duration-300 border-t",
                      dark ? "border-white/[0.08] bg-white/[0.03]" : "border-[#E5E7EB] bg-[#F9FAFB]"
                    )}>
                      <td className={cn(
                        "px-4 py-3",
                        dark ? "text-white" : "text-[#111827]"
                      )}>
                        Subtotal
                      </td>
                      {[
                        rows.reduce((s, r) => s + r.y1, 0),
                        rows.reduce((s, r) => s + r.y2, 0),
                        rows.reduce((s, r) => s + r.y3, 0),
                        rows.reduce((s, r) => s + r.y4, 0),
                        rows.reduce((s, r) => s + r.y5, 0),
                      ].map((v, j) => (
                        <td
                          key={j}
                          className={cn(
                            "text-right px-4 py-3 tabular-nums",
                            dark ? "text-white" : "text-[#111827]"
                          )}
                        >
                          {fmtK(v)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}

      {/* Grand total */}
      <div
        className={cn(
          "rounded-xl p-5 border-2 transition-colors duration-300",
          dark ? "border-[#1e3a5f]/40 bg-[#1e3a5f]/10" : "border-[#1e3a5f]/20 bg-[#1e3a5f]/[0.04]"
        )}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <span className={cn(
            "text-base font-bold",
            dark ? "text-white" : "text-[#111827]"
          )}>
            Total Revenue
          </span>
          <div className="flex items-center gap-6 text-sm font-semibold tabular-nums">
            {["Y1", "Y2", "Y3", "Y4", "Y5"].map((y, i) => {
              const total = STREAM_ROWS.reduce((s, r) => s + [r.y1, r.y2, r.y3, r.y4, r.y5][i], 0);
              return (
                <div key={y} className="text-right">
                  <div className={cn(
                    "text-[10px] uppercase tracking-wide mb-0.5",
                    dark ? "text-gray-500" : "text-[#9CA3AF]"
                  )}>
                    {y}
                  </div>
                  <div className={cn(
                    dark ? "text-white" : "text-[#111827]"
                  )}>
                    {fmtK(total)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Sub-tab 3: Assumptions                                              */
/* ================================================================== */

function AssumptionsSub({ dark }: { dark: boolean }) {
  return (
    <div className="space-y-6">
      <p className={cn(
        "text-sm max-w-2xl",
        dark ? "text-gray-400" : "text-[#6B7280]"
      )}>
        Key assumptions from the 5-year financial model. All figures in USD. Blue cells in the source model are editable inputs.
      </p>

      <div className="grid md:grid-cols-2 gap-5">
        {ASSUMPTIONS.map((group) => (
          <div
            key={group.title}
            className={cn(
              "rounded-xl border overflow-hidden transition-colors duration-300",
              dark ? "border-white/[0.08]" : "border-[#E5E7EB]"
            )}
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center gap-2"
              style={{ background: group.color }}
            >
              <span className="text-white text-sm font-semibold">{group.title}</span>
            </div>

            {/* Items */}
            <div className={cn(
              "transition-colors duration-300",
              dark ? "bg-white/[0.02]" : "bg-white"
            )}>
              {group.items.map((item, i) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 text-sm",
                    i < group.items.length - 1 && (dark ? "border-b border-white/[0.06]" : "border-b border-[#F3F4F6]")
                  )}
                >
                  <span className={cn(
                    dark ? "text-gray-400" : "text-[#6B7280]"
                  )}>
                    {item.label}
                  </span>
                  <span className={cn(
                    "font-semibold tabular-nums",
                    dark ? "text-white" : "text-[#111827]"
                  )}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Sub-tab 4: Investor Thesis                                          */
/* ================================================================== */

function InvestorThesisSub({ dark }: { dark: boolean }) {
  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="text-center max-w-2xl mx-auto">
        <h2 className={cn(
          "text-3xl md:text-4xl font-extrabold leading-tight mb-3 transition-colors duration-300",
          dark ? "text-white" : "text-[#111827]"
        )}>
          Why MilCrunch <span className="text-[#1e3a5f]">Wins</span>
        </h2>
        <p className={cn(
          "text-base leading-relaxed",
          dark ? "text-gray-400" : "text-[#6B7280]"
        )}>
          Four structural advantages that make MilCrunch a category-defining platform &mdash; not just another event tool.
        </p>
      </section>

      {/* Thesis cards */}
      <div className="grid md:grid-cols-2 gap-5">
        {THESIS_CARDS.map((card) => (
          <div
            key={card.number}
            className={cn(
              "rounded-xl border p-6 transition-all duration-300 group hover:border-[#1e3a5f]/40",
              dark
                ? "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]"
                : "bg-white border-[#E5E7EB] shadow-sm hover:shadow-md"
            )}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl font-black text-[#1e3a5f]/20 leading-none select-none">
                {card.number}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "text-base font-bold mb-1 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}>
                  {card.title}
                </h4>
                <p className="text-[#1e3a5f] text-sm font-semibold mb-3">
                  {card.headline}
                </p>
                <p className={cn(
                  "text-sm leading-relaxed transition-colors duration-300",
                  dark ? "text-gray-400" : "text-[#6B7280]"
                )}>
                  {card.body}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Banner */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #1a1040 0%, #2d1b69 50%, #1e3a5f 100%)" }}>
        <div className="px-8 py-10 md:py-12 text-center">
          <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
            Ready to see the full picture?
          </h3>
          <p className="text-gray-300 text-base mb-6 max-w-lg mx-auto">
            Get the complete investor package &mdash; financial model, market analysis, product roadmap, and founder deck.
          </p>
          <button
            type="button"
            onClick={() => window.open("mailto:andrew@recurrentx.com?subject=MilCrunch%20Investor%20Package%20Request&body=I'd%20like%20to%20request%20the%20full%20investor%20package%20for%20MilCrunch.", "_blank")}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-[#1e3a5f] font-bold text-sm hover:bg-gray-100 transition-colors shadow-lg shadow-black/20"
          >
            Request Full Investor Package <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
