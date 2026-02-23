import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const fmt = (n: number) => "$" + n.toLocaleString();

export default function GrowthCalculator() {
  const [newCreators, setNewCreators] = useState(50);
  const [churnPct, setChurnPct] = useState(5);
  const [newClients, setNewClients] = useState(2);
  const [contractVal, setContractVal] = useState(2500);
  const [upsellPct, setUpsellPct] = useState(35);
  const [months, setMonths] = useState(12);

  // Simulate month-by-month
  let totalCreators = 0;
  let mrr = 0;
  const cac = 45;
  for (let m = 1; m <= months; m++) {
    totalCreators = totalCreators + newCreators - Math.round(totalCreators * (churnPct / 100));
    mrr += newClients * contractVal;
    mrr += mrr * (upsellPct / 100 / 12); // monthly upsell contribution
  }
  mrr = Math.round(mrr);
  const ltv = contractVal * 12 * (1 / (churnPct / 100 || 1));
  const ltvCac = (ltv / cac).toFixed(1);
  const paybackMonths = Math.ceil(cac / (contractVal > 0 ? contractVal : 1));
  const totalInvested = cac * newClients * months;
  const totalEarned = mrr * months / 2; // rough approximation of cumulative
  const netRoi = totalInvested > 0 ? ((totalEarned - totalInvested) / totalInvested * 100).toFixed(0) : "0";

  const sliders: Array<{ label: string; value: number; set: (v: number) => void; min: number; max: number; step: number; suffix?: string; prefix?: string }> = [
    { label: "Monthly New Creators", value: newCreators, set: setNewCreators, min: 1, max: 500, step: 5 },
    { label: "Creator Monthly Churn", value: churnPct, set: setChurnPct, min: 1, max: 20, step: 1, suffix: "%" },
    { label: "Monthly New Event Clients", value: newClients, set: setNewClients, min: 1, max: 10, step: 1 },
    { label: "Avg Contract Value/mo", value: contractVal, set: setContractVal, min: 500, max: 10000, step: 100, prefix: "$" },
    { label: "Sponsor Upsell Rate", value: upsellPct, set: setUpsellPct, min: 10, max: 80, step: 5, suffix: "%" },
    { label: "Time Horizon", value: months, set: setMonths, min: 6, max: 36, step: 1, suffix: " months" },
  ];

  return (
    <div className="bg-white p-6 md:p-10">
      <h1 className="text-2xl font-bold text-[#1a1a2e] mb-1">Growth Calculator</h1>
      <p className="text-gray-500 text-sm mb-8">Model creator network growth, MRR trajectory, and unit economics.</p>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Sliders */}
        <div className="space-y-6">
          {sliders.map((s) => (
            <div key={s.label} className="bg-[#F8F9FA] border border-gray-200 rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">{s.label}</span>
                <span className="text-sm font-bold text-[#1a1a2e] tabular-nums">
                  {s.prefix ?? ""}{s.value.toLocaleString()}{s.suffix ?? ""}
                </span>
              </div>
              <Slider
                value={[s.value]}
                onValueChange={([v]) => s.set(v)}
                min={s.min}
                max={s.max}
                step={s.step}
                className="[&_[role=slider]]:bg-[#1e3a5f] [&_[role=slider]]:border-[#1e3a5f] [&_.range]:bg-[#1e3a5f]"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>{s.prefix ?? ""}{s.min.toLocaleString()}{s.suffix ?? ""}</span>
                <span>{s.prefix ?? ""}{s.max.toLocaleString()}{s.suffix ?? ""}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="bg-[#F8F9FA] border border-gray-200 rounded-xl p-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">Growth Projections</p>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Total Creators at End of Period</p>
                <p className="text-2xl font-extrabold text-[#1a1a2e]">{totalCreators.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">MRR at End of Period</p>
                <p className="text-2xl font-extrabold text-[#10B981]">{fmt(mrr)}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#F8F9FA] border border-gray-200 rounded-xl p-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">Unit Economics</p>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Customer Acquisition Cost</span>
                <span className="text-sm font-medium text-[#1a1a2e]">{fmt(cac)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Customer LTV</span>
                <span className="text-sm font-medium text-[#1a1a2e]">{fmt(Math.round(ltv))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">LTV / CAC Ratio</span>
                <span className={cn("text-sm font-bold", Number(ltvCac) >= 3 ? "text-[#10B981]" : "text-amber-500")}>
                  {ltvCac}x
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Payback Period</span>
                <span className="text-sm font-medium text-[#1a1a2e]">{paybackMonths} month{paybackMonths !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-sm text-gray-500">Net ROI</span>
                <span className={cn("text-2xl font-extrabold", Number(netRoi) >= 0 ? "text-[#10B981]" : "text-red-500")}>
                  {netRoi}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#F8F9FA] border border-gray-200 rounded-xl p-5">
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">Industry Benchmarks</p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex justify-between"><span>Healthy LTV/CAC</span><span className="text-[#1a1a2e]">3x+</span></li>
              <li className="flex justify-between"><span>SaaS Median Churn</span><span className="text-[#1a1a2e]">5–7%/mo</span></li>
              <li className="flex justify-between"><span>Best-in-class Payback</span><span className="text-[#1a1a2e]">&lt;12 months</span></li>
              <li className="flex justify-between"><span>Creator Platform Net Revenue Retention</span><span className="text-[#1a1a2e]">110–130%</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
