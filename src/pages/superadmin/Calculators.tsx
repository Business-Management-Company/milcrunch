import { useState } from "react";
import { cn } from "@/lib/utils";
import { Calculator, TrendingUp, DollarSign, PiggyBank, type LucideIcon } from "lucide-react";
import RoiCalculator from "./RoiCalculator";
import GrowthCalculator from "./GrowthCalculator";
import RevenueProjections from "./RevenueProjections";
import SaasCalculator from "./SaasCalculator";

interface Tab {
  key: string;
  label: string;
  icon: LucideIcon;
  component: React.ComponentType;
}

const TABS: Tab[] = [
  { key: "roi", label: "ROI Calculator", icon: Calculator, component: RoiCalculator },
  { key: "growth", label: "Growth Model", icon: TrendingUp, component: GrowthCalculator },
  { key: "revenue", label: "Revenue Projections", icon: DollarSign, component: RevenueProjections },
  { key: "saas", label: "SaaS Savings", icon: PiggyBank, component: SaasCalculator },
];

export default function Calculators() {
  const [active, setActive] = useState("roi");
  const current = TABS.find((t) => t.key === active) ?? TABS[0];
  const ActiveComponent = current.component;

  return (
    <div className="min-h-screen bg-white">
      {/* Tab bar */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex gap-1 px-6 pt-4">
          {TABS.map((tab) => {
            const isActive = active === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px",
                  isActive
                    ? "border-[#7C3AED] text-[#7C3AED] bg-[#7C3AED]/5"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active calculator content */}
      <ActiveComponent />
    </div>
  );
}
