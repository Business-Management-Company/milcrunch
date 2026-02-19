import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp, DollarSign, Percent, Download, ArrowRight,
  Rocket, Shield, Tv, Building2, Users, Mic, Radio, ShoppingBag,
  Briefcase, Database, GraduationCap, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";

/* ================================================================== */
/* Data                                                                */
/* ================================================================== */

const KPIS = [
  { label: "Year 1 Revenue", value: "$466K", sub: "Launch year", icon: DollarSign },
  { label: "Year 3 Revenue", value: "$2.1M", sub: "Scale phase", icon: TrendingUp },
  { label: "Year 5 Revenue", value: "$8.4M", sub: "Mature operations", icon: BarChart3 },
  { label: "Year 5 EBITDA", value: "$2.9M", sub: "Operating profit", icon: DollarSign },
  { label: "Year 5 Margin", value: "34%", sub: "EBITDA margin", icon: Percent },
];

/* Revenue by stream per year ($K) */
const REVENUE_BY_STREAM = [
  { year: "Y1", Events: 220, Platform: 100, Creator: 56, Media: 50, Community: 40 },
  { year: "Y2", Events: 480, Platform: 260, Creator: 140, Media: 160, Community: 110 },
  { year: "Y3", Events: 680, Platform: 520, Creator: 320, Media: 360, Community: 220 },
  { year: "Y4", Events: 1050, Platform: 900, Creator: 580, Media: 720, Community: 450 },
  { year: "Y5", Events: 1600, Platform: 1800, Creator: 1200, Media: 2000, Community: 1800 },
];

const STREAM_COLORS: Record<string, string> = {
  Events: "#6C5CE7",
  Platform: "#8B5CF6",
  Creator: "#A78BFA",
  Media: "#7C3AED",
  Community: "#C4B5FD",
};

const EBITDA_DATA = [
  { year: "Y1", ebitda: -120, margin: -26 },
  { year: "Y2", ebitda: 80, margin: 7 },
  { year: "Y3", ebitda: 520, margin: 25 },
  { year: "Y4", ebitda: 1300, margin: 35 },
  { year: "Y5", ebitda: 2900, margin: 34 },
];

/* Revenue streams detail table ($K) */
interface StreamRow {
  name: string;
  category: "Events" | "Platform" | "Media" | "Community";
  y1: number; y2: number; y3: number; y4: number; y5: number;
  newIn?: string;
  icon: React.ElementType;
}

const STREAM_ROWS: StreamRow[] = [
  { name: "Ticket Sales", category: "Events", y1: 120, y2: 260, y3: 380, y4: 600, y5: 900, icon: Users },
  { name: "Sponsorships", category: "Events", y1: 80, y2: 180, y3: 250, y4: 380, y5: 580, icon: Shield },
  { name: "Exhibition Fees", category: "Events", y1: 20, y2: 40, y3: 50, y4: 70, y5: 120, icon: Building2 },
  { name: "SaaS Licensing", category: "Platform", y1: 60, y2: 150, y3: 300, y4: 520, y5: 1000, icon: Rocket },
  { name: "Creator Badges", category: "Platform", y1: 24, y2: 60, y3: 120, y4: 200, y5: 400, icon: Shield },
  { name: "Marketplace Commissions", category: "Platform", y1: 16, y2: 50, y3: 100, y4: 180, y5: 400, icon: ShoppingBag },
  { name: "Podcast Ads", category: "Media", y1: 30, y2: 80, y3: 160, y4: 300, y5: 500, icon: Mic },
  { name: "Streaming (Roku/Apple TV)", category: "Media", y1: 0, y2: 40, y3: 120, y4: 280, y5: 800, newIn: "Y2", icon: Tv },
  { name: "Content Licensing", category: "Media", y1: 20, y2: 40, y3: 80, y4: 140, y5: 700, newIn: "Y4", icon: Radio },
  { name: "Merch", category: "Community", y1: 16, y2: 40, y3: 60, y4: 120, y5: 300, icon: ShoppingBag },
  { name: "Job Board", category: "Community", y1: 10, y2: 30, y3: 80, y4: 160, y5: 500, icon: Briefcase },
  { name: "Data Insights", category: "Community", y1: 10, y2: 30, y3: 60, y4: 120, y5: 600, newIn: "Y2", icon: Database },
  { name: "Academy", category: "Community", y1: 4, y2: 10, y3: 20, y4: 50, y5: 400, newIn: "Y3", icon: GraduationCap },
];

const CAT_COLORS: Record<string, { bg: string; text: string; border: string; darkBg: string; darkBorder: string }> = {
  Events:    { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200",  darkBg: "bg-purple-950/30",  darkBorder: "border-purple-800/40" },
  Platform:  { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    darkBg: "bg-blue-950/30",    darkBorder: "border-blue-800/40" },
  Media:     { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200",    darkBg: "bg-teal-950/30",    darkBorder: "border-teal-800/40" },
  Community: { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   darkBg: "bg-amber-950/30",   darkBorder: "border-amber-800/40" },
};

const CAT_HEADER: Record<string, string> = {
  Events: "#6C5CE7",
  Platform: "#3B82F6",
  Media: "#14B8A6",
  Community: "#F59E0B",
};

/* Assumptions data */
const ASSUMPTIONS = [
  {
    title: "Events",
    color: "#6C5CE7",
    items: [
      { label: "Events per year (Y1 → Y5)", value: "4 → 24" },
      { label: "Avg attendees per event", value: "250 → 1,200" },
      { label: "Avg ticket price", value: "$75 → $120" },
      { label: "Avg sponsorship per event", value: "$20K → $50K" },
      { label: "Exhibition booths per event", value: "10 → 40" },
    ],
  },
  {
    title: "Platform",
    color: "#3B82F6",
    items: [
      { label: "White-label license clients", value: "2 → 40" },
      { label: "SaaS license fee (annual)", value: "$25K → $25K" },
      { label: "Creator badge subscribers", value: "200 → 8,000" },
      { label: "Badge monthly fee", value: "$10/mo" },
      { label: "Marketplace take rate", value: "15%" },
    ],
  },
  {
    title: "Media",
    color: "#14B8A6",
    items: [
      { label: "Podcast episodes per year", value: "100 → 500" },
      { label: "CPM (podcast ads)", value: "$25" },
      { label: "Streaming subscribers (Y3+)", value: "0 → 80K" },
      { label: "Streaming monthly fee", value: "$4.99/mo" },
      { label: "Content licensing deals (Y4+)", value: "0 → 8" },
    ],
  },
  {
    title: "Costs & Team",
    color: "#F59E0B",
    items: [
      { label: "Full-time employees (Y1 → Y5)", value: "5 → 35" },
      { label: "Avg fully-loaded salary", value: "$85K" },
      { label: "Marketing spend (% of rev)", value: "20% → 12%" },
      { label: "Hosting & infrastructure", value: "$2K → $15K/mo" },
      { label: "Content production (annual)", value: "$50K → $400K" },
    ],
  },
];

/* Investor thesis cards */
const THESIS_CARDS = [
  {
    number: "01",
    title: "Captive Audience",
    headline: "18M+ veterans. Deeply loyal. Massively underserved.",
    body: "The military and veteran community is one of the largest, most engaged, and most brand-loyal demographics in America — yet no platform owns this vertical. MilCrunch is building the community layer that Military.com never did: events, creators, streaming, and commerce in a single ecosystem. First-mover advantage in a $12B+ addressable market.",
  },
  {
    number: "02",
    title: "Year-Round Revenue Engine",
    headline: "Events become 365-day engagement, not 3-day spikes.",
    body: "Traditional military events generate revenue for one weekend and go dark. MilCrunch converts every event into a persistent community with year-round platform access, creator content, sponsor dashboards, and automated renewal workflows. Sponsors stop writing one-time checks and start signing annual contracts — increasing LTV 4x while reducing sales cycles.",
  },
  {
    number: "03",
    title: "Streaming = Asymmetric Upside",
    headline: "Roku/Apple TV in Y3. Netflix partnership potential in Y5.",
    body: "Military content is a proven winner — documentaries, reality formats, and veteran stories consistently over-index on streaming platforms. MilCrunch is building the production pipeline and content library now. By Y3, a dedicated Roku/Apple TV channel creates a direct-to-consumer subscription revenue stream. By Y5, the content catalog and audience data make MilCrunch an acquisition target or licensing partner for major streamers.",
  },
  {
    number: "04",
    title: "White-Label Moat",
    headline: "License to VFW, MOAA, AUSA — recurring SaaS with zero CAC.",
    body: "Every Veterans Service Organization, military association, and base MWR office needs what MilCrunch built — but can't build it themselves. White-label licensing creates $25K+/year recurring SaaS contracts with organizations that have built-in member bases. Zero customer acquisition cost, near-zero churn, and every deployment deepens the MilCrunch ecosystem and data moat.",
  },
];

/* ================================================================== */
/* Sub-tab type                                                        */
/* ================================================================== */
const SUB_TABS = ["Overview", "Revenue Streams", "Assumptions", "Investor Thesis"] as const;
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
  const [subTab, setSubTab] = useState<SubTabId>("Overview");

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

      {subTab === "Overview" && <OverviewSub dark={dark} />}
      {subTab === "Revenue Streams" && <RevenueStreamsSub dark={dark} />}
      {subTab === "Assumptions" && <AssumptionsSub dark={dark} />}
      {subTab === "Investor Thesis" && <InvestorThesisSub dark={dark} />}
    </div>
  );
}

/* ================================================================== */
/* Sub-tab 1: Overview                                                 */
/* ================================================================== */

function OverviewSub({ dark }: { dark: boolean }) {
  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {KPIS.map((kpi) => {
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
                <div className="w-7 h-7 rounded-lg bg-[#6C5CE7]/10 flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-[#6C5CE7]" />
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
            Revenue by Stream ($K)
          </h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={REVENUE_BY_STREAM} barCategoryGap="20%">
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
            EBITDA Trend ($K)
          </h4>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={EBITDA_DATA}>
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
                  return v > 0 ? `$${v >= 1000 ? `${v / 1000}M` : `${v}K`}` : `-$${Math.abs(v)}K`;
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
                  if (name === "ebitda") return [value >= 0 ? `$${value}K` : `-$${Math.abs(value)}K`, "EBITDA"];
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
                stroke="#6C5CE7"
                strokeWidth={2.5}
                dot={{ fill: "#6C5CE7", r: 4, strokeWidth: 2, stroke: dark ? "#0A0A0F" : "#fff" }}
                name="EBITDA ($K)"
              />
              <Line
                type="monotone"
                dataKey="margin"
                stroke="#A78BFA"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{ fill: "#A78BFA", r: 3, strokeWidth: 2, stroke: dark ? "#0A0A0F" : "#fff" }}
                name="Margin (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Download button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => window.open("mailto:andrew@recurrentx.com?subject=MilCrunch%20Financial%20Model%20Request&body=I'd%20like%20to%20request%20the%20full%20financial%20model%20Excel%20file.", "_blank")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white font-semibold text-sm transition-colors"
        >
          <Download className="h-4 w-4" /> Download Full Model
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Sub-tab 2: Revenue Streams                                          */
/* ================================================================== */

function RevenueStreamsSub({ dark }: { dark: boolean }) {
  const categories = ["Events", "Platform", "Media", "Community"] as const;

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
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#6C5CE7]/10 text-[#6C5CE7] whitespace-nowrap">
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
                              {v === 0 ? "—" : `$${v}K`}
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
          dark ? "border-[#6C5CE7]/40 bg-[#6C5CE7]/10" : "border-[#6C5CE7]/20 bg-[#6C5CE7]/[0.04]"
        )}
      >
        <div className="flex items-center justify-between">
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
        Key assumptions underlying the five-year financial model. All projections use conservative growth estimates with staged market entry.
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
          Why MilCrunch <span className="text-[#6C5CE7]">Wins</span>
        </h2>
        <p className={cn(
          "text-base leading-relaxed",
          dark ? "text-gray-400" : "text-[#6B7280]"
        )}>
          Four structural advantages that make MilCrunch a category-defining platform — not just another event tool.
        </p>
      </section>

      {/* Thesis cards */}
      <div className="grid md:grid-cols-2 gap-5">
        {THESIS_CARDS.map((card) => (
          <div
            key={card.number}
            className={cn(
              "rounded-xl border p-6 transition-all duration-300 group hover:border-[#6C5CE7]/40",
              dark
                ? "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]"
                : "bg-white border-[#E5E7EB] shadow-sm hover:shadow-md"
            )}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl font-black text-[#6C5CE7]/20 leading-none select-none">
                {card.number}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "text-base font-bold mb-1 transition-colors duration-300",
                  dark ? "text-white" : "text-[#111827]"
                )}>
                  {card.title}
                </h4>
                <p className="text-[#6C5CE7] text-sm font-semibold mb-3">
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
      <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #1a1040 0%, #2d1b69 50%, #6C5CE7 100%)" }}>
        <div className="px-8 py-10 md:py-12 text-center">
          <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
            Ready to see the full picture?
          </h3>
          <p className="text-gray-300 text-base mb-6 max-w-lg mx-auto">
            Get the complete investor package — financial model, market analysis, product roadmap, and founder deck.
          </p>
          <button
            type="button"
            onClick={() => window.open("mailto:andrew@recurrentx.com?subject=MilCrunch%20Investor%20Package%20Request&body=I'd%20like%20to%20request%20the%20full%20investor%20package%20for%20MilCrunch.", "_blank")}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-[#6C5CE7] font-bold text-sm hover:bg-gray-100 transition-colors shadow-lg shadow-black/20"
          >
            Request Full Investor Package <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
