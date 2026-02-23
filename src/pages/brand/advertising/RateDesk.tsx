import React, { useState } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  Eye,
  DollarSign,
  TrendingUp,
  BarChart3,
  Plus,
  X,
  FileDown,
  Package,
} from "lucide-react";

type Scenario = "base" | "growth" | "premium";
type TimeWindow = "30d" | "90d" | "12m";
type TypeFilter = "all" | "display" | "podcast" | "social" | "event" | "newsletter";

interface InventoryItem {
  id: string;
  name: string;
  impressions: number;
  cpm: number;
  range: string;
  revenue: number;
  health: "Underpriced" | "Healthy" | "Premium";
}

const DEMO_INVENTORY: InventoryItem[] = [
  { id: "1", name: "Creator Page Display Banner", impressions: 300000, cpm: 14, range: "$10\u2013$28", revenue: 4320, health: "Underpriced" },
  { id: "2", name: "Event Sponsorship Package", impressions: 90000, cpm: 70, range: "$35\u2013$80", revenue: 6300, health: "Premium" },
  { id: "3", name: "Livestream Mid-break Overlay", impressions: 150000, cpm: 46, range: "$26\u2013$60", revenue: 6840, health: "Healthy" },
  { id: "4", name: "Podcast Pre-roll (30 sec)", impressions: 200000, cpm: 28, range: "$18\u2013$40", revenue: 5600, health: "Healthy" },
  { id: "5", name: "MIC Stage Naming Rights", impressions: 50000, cpm: 200, range: "$150\u2013$250", revenue: 10000, health: "Premium" },
  { id: "6", name: "Newsletter Sponsored Section", impressions: 85000, cpm: 22, range: "$15\u2013$30", revenue: 1870, health: "Underpriced" },
];

const SCENARIO_MULTIPLIERS: Record<Scenario, number> = { base: 1, growth: 1.5, premium: 2.2 };

const healthColor = (h: string) =>
  h === "Premium" ? "bg-blue-900/40 text-blue-400 border-blue-800" :
  h === "Healthy" ? "bg-emerald-900/40 text-emerald-300 border-emerald-700" :
  "bg-amber-900/40 text-amber-300 border-amber-700";

class RateDeskErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[RateDesk] Render crash:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <p className="text-red-500 font-medium">Something went wrong loading this page.</p>
          <pre className="text-xs text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg p-3 mt-2 max-w-lg mx-auto overflow-auto">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#6B46C1] text-white rounded-lg hover:bg-[#5A3AA8] transition-colors text-sm font-medium"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function RateDesk() {
  console.log("[RateDesk] mounted");
  const { isDemo, guardAction } = useDemoMode();
  const [scenario, setScenario] = useState<Scenario>("base");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("30d");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [proposal, setProposal] = useState<InventoryItem[]>([]);

  const mult = SCENARIO_MULTIPLIERS[scenario];
  const inventory = isDemo ? DEMO_INVENTORY : [];
  const totalImpressions = (inventory ?? []).reduce((s, i) => s + i.impressions, 0);
  const totalRevenue = (inventory ?? []).reduce((s, i) => s + i.revenue, 0);
  const avgCpm = inventory.length ? Math.round((inventory ?? []).reduce((s, i) => s + i.cpm, 0) / inventory.length) : 0;

  const addToProposal = (item: InventoryItem) => {
    if (!(proposal ?? []).find(p => p.id === item.id)) {
      setProposal(prev => [...prev, item]);
    }
  };

  const removeFromProposal = (id: string) => {
    setProposal(prev => prev.filter(p => p.id !== id));
  };

  const proposalTotal = (proposal ?? []).reduce((s, i) => s + Math.round(i.revenue * mult), 0);

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Calculator className="h-7 w-7 text-blue-500" />
          <h1 className="text-3xl font-bold text-pd-navy dark:text-white">Rate Desk</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          Price your inventory, run scenarios, and build custom proposals.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex bg-[#1A1D27] rounded-lg p-1">
          {(["base", "growth", "premium"] as Scenario[]).map(s => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${scenario === s ? "bg-[#6B46C1] text-white" : "text-gray-400 hover:text-white"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex bg-[#1A1D27] rounded-lg p-1">
          {([["30d", "Next 30 Days"], ["90d", "Next 90 Days"], ["12m", "Next 12 Months"]] as [TimeWindow, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTimeWindow(val)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${timeWindow === val ? "bg-[#6B46C1] text-white" : "text-gray-400 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex bg-[#1A1D27] rounded-lg p-1">
          {(["all", "display", "podcast", "social", "event", "newsletter"] as TypeFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${typeFilter === t ? "bg-[#6B46C1] text-white" : "text-gray-400 hover:text-white"}`}
            >
              {t === "all" ? "All Types" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Sellable Impressions", value: `${(totalImpressions / 1_000_000).toFixed(1)}M`, icon: Eye, color: "text-blue-400", bg: "bg-blue-900/30" },
          { label: "Potential Gross Spend", value: `$${Math.round(totalRevenue * mult).toLocaleString()}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-900/30" },
          { label: "Platform Revenue", value: `$${Math.round(totalRevenue * mult * 0.3).toLocaleString()}`, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-900/30" },
          { label: "Avg CPM", value: `$${avgCpm}`, icon: BarChart3, color: "text-amber-400", bg: "bg-amber-900/30" },
        ].map(stat => {
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Table */}
        <div className="lg:col-span-2">
          <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ad Inventory</h2>
            </div>
            {inventory.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No inventory items yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-[#111827]">
                    <tr className="text-left text-gray-500 dark:text-gray-400">
                      <th className="px-4 py-3 font-medium">Placement</th>
                      <th className="px-4 py-3 font-medium text-right">Impressions</th>
                      <th className="px-4 py-3 font-medium text-right">CPM</th>
                      <th className="px-4 py-3 font-medium text-right">Range</th>
                      <th className="px-4 py-3 font-medium text-right">Revenue</th>
                      <th className="px-4 py-3 font-medium text-center">Health</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(inventory ?? []).map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#111827] transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.name}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{(item.impressions / 1000).toFixed(0)}K</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">${item.cpm}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{item.range}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-500">${Math.round(item.revenue * mult).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={`text-xs ${healthColor(item.health)}`}>{item.health}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addToProposal(item)}
                            disabled={!!(proposal ?? []).find(p => p.id === item.id)}
                            className="text-blue-500 hover:text-blue-400"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Proposal Builder */}
        <div>
          <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl sticky top-24">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Proposal Builder</h2>
              <p className="text-xs text-gray-400 mt-1">Add items from the table to build a proposal</p>
            </div>
            <div className="p-4">
              {proposal.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FileDown className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Add inventory items to start building a proposal</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(proposal ?? []).map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-[#111827] rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-white">{item.name}</p>
                        <p className="text-xs text-gray-400">${Math.round(item.revenue * mult).toLocaleString()}</p>
                      </div>
                      <button onClick={() => removeFromProposal(item.id)} className="text-gray-500 hover:text-red-400">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-medium text-gray-400">Subtotal</span>
                      <span className="text-xl font-bold text-emerald-400">${proposalTotal.toLocaleString()}</span>
                    </div>
                    <Button
                      className="w-full bg-[#6B46C1] hover:bg-[#5A3AA8] text-white"
                      onClick={() => { if (guardAction("create")) return; }}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export as PDF
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function RateDeskWithBoundary() {
  return (
    <RateDeskErrorBoundary>
      <RateDesk />
    </RateDeskErrorBoundary>
  );
}
