import { useDemoMode } from "@/hooks/useDemoMode";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  PieChart,
  BarChart3,
  Calculator,
  Target,
  Package,
  LineChart,
  UserPlus,
  Megaphone,
  ArrowRight,
} from "lucide-react";

const DEMO_STATS = [
  { label: "Total Inventory Value", value: "$193,600", icon: DollarSign, color: "text-blue-400", bg: "bg-blue-900/30" },
  { label: "Booked Revenue", value: "$78,200", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-900/30" },
  { label: "Pipeline Value", value: "$52,800", icon: PieChart, color: "text-purple-400", bg: "bg-purple-900/30" },
  { label: "Avg Profit Margin", value: "64.9%", icon: BarChart3, color: "text-amber-400", bg: "bg-amber-900/30" },
];

const QUICK_LINKS = [
  { label: "Rate Desk", description: "Price inventory, run scenarios, and build proposals", icon: Calculator, href: "/brand/advertising/rate-desk" },
  { label: "Ad Campaigns", description: "Create and manage advertising campaigns", icon: Target, href: "/brand/advertising/campaigns" },
  { label: "Ad Inventory", description: "Manage all ad placements and line items", icon: Package, href: "/brand/advertising/inventory" },
  { label: "Ad Analytics", description: "Track spend, impressions, and performance", icon: LineChart, href: "/brand/advertising/analytics" },
  { label: "Lead Manager", description: "Track advertiser leads and pipeline", icon: UserPlus, href: "/brand/advertising/leads" },
];

export default function AdvertisingDashboard() {
  const { isDemo } = useDemoMode();

  const stats = isDemo ? DEMO_STATS : DEMO_STATS.map(s => ({ ...s, value: "$0" }));

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Megaphone className="h-8 w-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-pd-navy dark:text-white">Ad Management</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          Manage advertising inventory, campaigns, and revenue across RecurrentX properties.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-5 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
              <p className={`text-2xl font-bold ${stat.label === "Booked Revenue" ? "text-emerald-500" : stat.label === "Pipeline Value" ? "text-purple-500" : "text-[#000741] dark:text-white"}`}>
                {stat.value}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Quick Links */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} to={link.href}>
              <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 p-5 rounded-xl hover:border-[#6C5CE7] transition-colors group cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{link.label}</h3>
                  <ArrowRight className="h-4 w-4 text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{link.description}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
