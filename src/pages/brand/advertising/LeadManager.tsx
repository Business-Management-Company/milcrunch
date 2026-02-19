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
  UserPlus,
  Plus,
  Users,
  DollarSign,
  TrendingUp,
  Target,
} from "lucide-react";

interface Lead {
  id: string;
  company: string;
  status: "new" | "qualified" | "closed";
  stage: string;
  contact: string;
  value: number;
}

const DEMO_LEADS: Lead[] = [
  { id: "1", company: "USAA", status: "qualified", stage: "Proposal", contact: "Sarah Mitchell", value: 125000 },
  { id: "2", company: "Hiring Our Heroes", status: "qualified", stage: "Negotiation", contact: "James Cooper", value: 45000 },
  { id: "3", company: "Amazon Military", status: "new", stage: "Discovery", contact: "Rachel Torres", value: 75000 },
  { id: "4", company: "GEICO Military", status: "qualified", stage: "Proposal", contact: "Mike Davidson", value: 32000 },
  { id: "5", company: "Boeing Defense", status: "new", stage: "Outreach", contact: "Lisa Park", value: 95000 },
];

const statusBadge = (s: string) =>
  s === "qualified" ? "bg-emerald-900/40 text-emerald-300 border-emerald-700" :
  s === "new" ? "bg-blue-900/40 text-blue-300 border-blue-700" :
  "bg-purple-900/40 text-purple-300 border-purple-700";

const stageBadge = (s: string) =>
  s === "Proposal" ? "bg-purple-900/30 text-purple-300" :
  s === "Negotiation" ? "bg-amber-900/30 text-amber-300" :
  s === "Discovery" ? "bg-blue-900/30 text-blue-300" :
  "bg-gray-800 text-gray-300";

type TabFilter = "all" | "new" | "qualified" | "closed";

class LeadManagerErrorBoundary extends React.Component<
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
    console.error("[LeadManager] Render crash:", error, info.componentStack);
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

function LeadManager() {
  console.log("[LeadManager] mounted");
  const { isDemo, guardAction } = useDemoMode();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabFilter>("all");

  const allLeads = isDemo ? DEMO_LEADS : [];
  const leads = tab === "all" ? allLeads : (allLeads ?? []).filter(l => l.status === tab);
  const qualified = (allLeads ?? []).filter(l => l.status === "qualified").length;
  const pipelineValue = (allLeads ?? []).reduce((s, l) => s + l.value, 0);
  const conversionRate = allLeads.length ? Math.round((qualified / allLeads.length) * 100) : 0;

  const STATS = [
    { label: "Total Leads", value: allLeads.length.toString(), icon: Users, color: "text-blue-400", bg: "bg-blue-900/30" },
    { label: "Qualified", value: qualified.toString(), icon: Target, color: "text-emerald-400", bg: "bg-emerald-900/30" },
    { label: "Pipeline Value", value: `$${(pipelineValue / 1_000_000).toFixed(1)}M`, icon: DollarSign, color: "text-purple-400", bg: "bg-purple-900/30" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-900/30" },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <UserPlus className="h-7 w-7 text-purple-400" />
            <h1 className="text-3xl font-bold text-pd-navy dark:text-white">Lead Manager</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Track advertiser leads and manage your sales pipeline.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#6B46C1] hover:bg-[#5A3AA8] text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-[#1A1D27] border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">Add Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Company</label>
                <Input placeholder="e.g. USAA" className="dark:bg-[#111827] dark:border-gray-700 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Contact Name</label>
                  <Input placeholder="e.g. John Smith" className="dark:bg-[#111827] dark:border-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Pipeline Value ($)</label>
                  <Input type="number" placeholder="50000" className="dark:bg-[#111827] dark:border-gray-700 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Stage</label>
                <Input placeholder="Outreach, Discovery, Proposal, Negotiation" className="dark:bg-[#111827] dark:border-gray-700 dark:text-white" />
              </div>
              <Button
                className="w-full bg-[#6B46C1] hover:bg-[#5A3AA8] text-white"
                onClick={() => { if (guardAction("create")) return; setOpen(false); }}
              >
                Add Lead
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

      {/* Tab Filter */}
      <div className="flex bg-[#1A1D27] rounded-lg p-1 mb-6 w-fit">
        {(["all", "new", "qualified", "closed"] as TabFilter[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? "bg-[#6B46C1] text-white" : "text-gray-400 hover:text-white"}`}
          >
            {t === "all" ? "All Leads" : t}
          </button>
        ))}
      </div>

      {/* Leads Table */}
      <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        {leads.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>{tab === "all" ? "No leads yet. Add your first lead to get started." : `No ${tab} leads.`}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#111827]">
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium text-right">Pipeline Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {(leads ?? []).map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-[#111827] transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{lead.company}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs capitalize ${statusBadge(lead.status)}`}>{lead.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-md ${stageBadge(lead.stage)}`}>{lead.stage}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{lead.contact}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-500">${lead.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

export default function LeadManagerWithBoundary() {
  return (
    <LeadManagerErrorBoundary>
      <LeadManager />
    </LeadManagerErrorBoundary>
  );
}
