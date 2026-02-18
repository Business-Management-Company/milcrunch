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
  Package,
  Plus,
  Edit2,
  Trash2,
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  channel: string;
  owner: string;
  status: "Active" | "Paused" | "Sold" | "Available";
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  campaign: string;
}

const channelColor = (c: string) =>
  c === "Display" ? "bg-blue-900/40 text-blue-300 border-blue-700" :
  c === "Podcast" ? "bg-purple-900/40 text-purple-300 border-purple-700" :
  c === "Social" ? "bg-pink-900/40 text-pink-300 border-pink-700" :
  c === "Event" ? "bg-amber-900/40 text-amber-300 border-amber-700" :
  c === "Newsletter" ? "bg-teal-900/40 text-teal-300 border-teal-700" :
  c === "Streaming" ? "bg-red-900/40 text-red-300 border-red-700" :
  "bg-gray-800 text-gray-400 border-gray-600";

const statusColor = (s: string) =>
  s === "Active" ? "text-emerald-400" :
  s === "Sold" ? "text-blue-400" :
  s === "Paused" ? "text-amber-400" :
  "text-gray-400";

const DEMO_ITEMS: InventoryItem[] = [
  { id: "1", name: "Creator Page Display Banner", channel: "Display", owner: "RecurrentX", status: "Active", date: "2026-01-15", revenue: 4320, cost: 1200, profit: 3120, campaign: "USAA MIC 2026" },
  { id: "2", name: "Event Sponsorship Package", channel: "Event", owner: "MIC Events", status: "Sold", date: "2026-02-01", revenue: 6300, cost: 2100, profit: 4200, campaign: "USAA MIC 2026" },
  { id: "3", name: "Livestream Mid-break Overlay", channel: "Streaming", owner: "RecurrentX", status: "Active", date: "2026-01-20", revenue: 6840, cost: 2500, profit: 4340, campaign: "Hiring Our Heroes" },
  { id: "4", name: "Podcast Pre-roll (30 sec)", channel: "Podcast", owner: "MIC Podcasts", status: "Active", date: "2026-02-10", revenue: 5600, cost: 1800, profit: 3800, campaign: "Amazon Veterans Day" },
  { id: "5", name: "MIC Stage Naming Rights", channel: "Event", owner: "MIC Events", status: "Sold", date: "2025-12-01", revenue: 10000, cost: 3000, profit: 7000, campaign: "USAA MIC 2026" },
  { id: "6", name: "Newsletter Sponsored Section", channel: "Newsletter", owner: "RecurrentX", status: "Active", date: "2026-02-05", revenue: 1870, cost: 500, profit: 1370, campaign: "Hiring Our Heroes" },
  { id: "7", name: "Social Media Takeover (1 Day)", channel: "Social", owner: "RecurrentX", status: "Available", date: "2026-03-01", revenue: 3200, cost: 800, profit: 2400, campaign: "—" },
  { id: "8", name: "Homepage Hero Banner", channel: "Display", owner: "RecurrentX", status: "Active", date: "2026-01-10", revenue: 7500, cost: 2000, profit: 5500, campaign: "USAA MIC 2026" },
  { id: "9", name: "Podcast Mid-roll (60 sec)", channel: "Podcast", owner: "MIC Podcasts", status: "Paused", date: "2026-01-25", revenue: 4200, cost: 1400, profit: 2800, campaign: "—" },
  { id: "10", name: "Event Photo Booth Branding", channel: "Event", owner: "MIC Events", status: "Available", date: "2026-04-01", revenue: 2800, cost: 900, profit: 1900, campaign: "—" },
];

class AdInventoryErrorBoundary extends React.Component<
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
    console.error("[AdInventory] Render crash:", error, info.componentStack);
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

function AdInventory() {
  console.log("[AdInventory] mounted");
  const { isDemo, guardAction } = useDemoMode();
  const [open, setOpen] = useState(false);

  const items = isDemo ? DEMO_ITEMS : [];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-7 w-7 text-purple-400" />
            <h1 className="text-3xl font-bold text-pd-navy dark:text-white">Ad Inventory</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Manage all advertising placements and line items.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#6C5CE7] hover:bg-[#5A4BD5] text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Inventory Item
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-[#1A1D27] border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">Add Inventory Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Name</label>
                <Input placeholder="e.g. Homepage Banner Ad" className="dark:bg-[#111827] dark:border-gray-700 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Channel</label>
                  <Input placeholder="Display, Podcast, Event..." className="dark:bg-[#111827] dark:border-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Owner</label>
                  <Input placeholder="RecurrentX" className="dark:bg-[#111827] dark:border-gray-700 dark:text-white" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Revenue ($)</label>
                  <Input type="number" placeholder="5000" className="dark:bg-[#111827] dark:border-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Cost ($)</label>
                  <Input type="number" placeholder="1500" className="dark:bg-[#111827] dark:border-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Date</label>
                  <Input type="date" className="dark:bg-[#111827] dark:border-gray-700 dark:text-white" />
                </div>
              </div>
              <Button
                className="w-full bg-[#6C5CE7] hover:bg-[#5A4BD5] text-white"
                onClick={() => { if (guardAction("create")) return; setOpen(false); }}
              >
                Add Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No inventory items yet. Add your first item to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#111827]">
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Revenue</th>
                  <th className="px-4 py-3 font-medium text-right">Cost</th>
                  <th className="px-4 py-3 font-medium text-right">Profit</th>
                  <th className="px-4 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {(items ?? []).map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#111827] transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${channelColor(item.channel)}`}>{item.channel}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.owner}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${statusColor(item.status)}`}>{item.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.date}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-500">${item.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">${item.cost.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-400">${item.profit.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{item.campaign}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white h-8 w-8 p-0" onClick={() => guardAction("update")}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-400 h-8 w-8 p-0" onClick={() => guardAction("delete")}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
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

export default function AdInventoryWithBoundary() {
  return (
    <AdInventoryErrorBoundary>
      <AdInventory />
    </AdInventoryErrorBoundary>
  );
}
