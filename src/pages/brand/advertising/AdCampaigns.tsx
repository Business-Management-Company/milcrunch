import React, { useState } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Target,
  Plus,
  DollarSign,
  Eye,
  Zap,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  advertiser: string;
  budget: number;
  spent: number;
  status: "Active" | "Completed" | "Draft";
  impressions: number;
  startDate: string;
  endDate: string;
}

const DEMO_CAMPAIGNS: Campaign[] = [
  { id: "1", name: "USAA MIC 2026 Sponsorship", advertiser: "USAA", budget: 45000, spent: 31200, status: "Active", impressions: 2100000, startDate: "2026-01-15", endDate: "2026-06-30" },
  { id: "2", name: "Hiring Our Heroes Spring", advertiser: "Hiring Our Heroes", budget: 12500, spent: 8700, status: "Active", impressions: 340000, startDate: "2026-03-01", endDate: "2026-05-31" },
  { id: "3", name: "Amazon Veterans Day", advertiser: "Amazon", budget: 8200, spent: 8200, status: "Completed", impressions: 890000, startDate: "2025-10-15", endDate: "2025-11-15" },
];

const statusColor = (s: string) =>
  s === "Active" ? "bg-emerald-900/40 text-emerald-300 border-emerald-700" :
  s === "Completed" ? "bg-blue-900/40 text-blue-300 border-blue-700" :
  "bg-gray-800 text-gray-400 border-gray-600";

const statusIcon = (s: string) =>
  s === "Active" ? <Zap className="h-3 w-3" /> :
  s === "Completed" ? <CheckCircle2 className="h-3 w-3" /> :
  <Clock className="h-3 w-3" />;

class AdCampaignsErrorBoundary extends React.Component<
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
    console.error("[AdCampaigns] Render crash:", error, info.componentStack);
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
            className="mt-4 px-4 py-2 bg-[#6C5CE7] text-white rounded-lg hover:bg-[#5A4BD1] transition-colors text-sm font-medium"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdCampaigns() {
  console.log("[AdCampaigns] mounted");
  const { isDemo, guardAction } = useDemoMode();
  const [open, setOpen] = useState(false);

  const campaigns = isDemo ? DEMO_CAMPAIGNS : [];
  const activeCampaigns = (campaigns ?? []).filter(c => c.status === "Active").length;
  const totalBudget = (campaigns ?? []).reduce((s, c) => s + c.budget, 0);
  const totalSpent = (campaigns ?? []).reduce((s, c) => s + c.spent, 0);
  const totalImpressions = (campaigns ?? []).reduce((s, c) => s + c.impressions, 0);

  const STATS = [
    { label: "Active Campaigns", value: activeCampaigns.toString(), icon: Target, color: "text-purple-400", bg: "bg-purple-900/30" },
    { label: "Total Budget", value: `$${totalBudget.toLocaleString()}`, icon: DollarSign, color: "text-blue-400", bg: "bg-blue-900/30" },
    { label: "Total Spent", value: `$${totalSpent.toLocaleString()}`, icon: BarChart3, color: "text-emerald-400", bg: "bg-emerald-900/30" },
    { label: "Impressions", value: `${(totalImpressions / 1_000_000).toFixed(1)}M`, icon: Eye, color: "text-amber-400", bg: "bg-amber-900/30" },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-7 w-7 text-purple-400" />
            <h1 className="text-3xl font-bold text-pd-navy dark:text-white">Ad Campaigns</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Create and manage advertising campaigns.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#6C5CE7] hover:bg-[#5A4BD5] text-white">
              <Plus className="h-4 w-4 mr-2" /> Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-[#1A1D27] border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">Create Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Campaign Name</label>
                <Input placeholder="e.g. Summer Recruitment Drive" className="dark:bg-[#111827] dark:border-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Advertiser</label>
                <Input placeholder="e.g. USAA" className="dark:bg-[#111827] dark:border-gray-700 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Budget ($)</label>
                  <Input type="number" placeholder="25000" className="dark:bg-[#111827] dark:border-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Start Date</label>
                  <Input type="date" className="dark:bg-[#111827] dark:border-gray-700 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">End Date</label>
                <Input type="date" className="dark:bg-[#111827] dark:border-gray-700 dark:text-white" />
              </div>
              <Button
                className="w-full bg-[#6C5CE7] hover:bg-[#5A4BD5] text-white"
                onClick={() => { if (guardAction("create")) return; setOpen(false); }}
              >
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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

      {/* Campaign List */}
      <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No campaigns yet. Create your first campaign to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#111827]">
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 font-medium">Advertiser</th>
                  <th className="px-4 py-3 font-medium text-right">Budget</th>
                  <th className="px-4 py-3 font-medium text-right">Spent</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Impressions</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {(campaigns ?? []).map(c => {
                  const pct = Math.round((c.spent / c.budget) * 100);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-[#111827] transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.advertiser}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">${c.budget.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-500">${c.spent.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={`text-xs gap-1 ${statusColor(c.status)}`}>
                          {statusIcon(c.status)} {c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{(c.impressions / 1000).toFixed(0)}K</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-[#6C5CE7] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-8">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

export default function AdCampaignsPageWithBoundary() {
  return (
    <AdCampaignsErrorBoundary>
      <AdCampaigns />
    </AdCampaignsErrorBoundary>
  );
}
