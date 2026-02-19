import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (n: number) => "$" + n.toLocaleString();

interface ToolRow {
  name: string;
  category: string;
  defaultCost: number;
}

const TOOLS: ToolRow[] = [
  { name: "Event Management", category: "Event Management Platform", defaultCost: 500 },
  { name: "Creator Discovery", category: "Creator Discovery & Management", defaultCost: 800 },
  { name: "Live Streaming", category: "Live Streaming Tools", defaultCost: 50 },
  { name: "Registration / Forms", category: "Registration & Forms", defaultCost: 50 },
  { name: "Social Monitoring", category: "Social Monitoring & Analytics", defaultCost: 300 },
  { name: "Email Marketing", category: "Email & Outreach Platform", defaultCost: 100 },
  { name: "Creator Verification", category: "Manual Creator Verification", defaultCost: 2000 },
];

export default function SaasCalculator() {
  const [costs, setCosts] = useState<number[]>(TOOLS.map((t) => t.defaultCost));
  const [rxFee] = useState(2500);
  const [copied, setCopied] = useState(false);

  const total = costs.reduce((s, c) => s + c, 0);
  const savings = total - rxFee;

  const updateCost = (i: number, v: number) => {
    setCosts((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };

  const copyToClipboard = () => {
    const lines = TOOLS.map((t, i) => `${t.category}: ${fmt(costs[i])}/mo`).join("\n");
    const text = `Current SaaS Stack: ${fmt(total)}/mo\nMilCrunch: ${fmt(rxFee)}/mo\nMonthly Savings: ${fmt(savings)}\nAnnual Savings: ${fmt(savings * 12)}\n\n${lines}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-6 md:p-10">
      <h1 className="text-2xl font-bold text-[#1a1a2e] mb-1">SaaS Savings Calculator</h1>
      <p className="text-gray-500 text-sm mb-8">Adjust what you currently spend — see how much MilCrunch saves you.</p>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Tool sliders — 3 columns */}
        <div className="lg:col-span-3 space-y-4">
          {TOOLS.map((tool, i) => (
            <div key={tool.name} className="bg-[#F8F9FA] border border-gray-200 rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-sm font-medium text-gray-700">{tool.category}</span>
                </div>
                <span className="text-sm font-bold text-[#1a1a2e] tabular-nums">{fmt(costs[i])}/mo</span>
              </div>
              <Slider
                value={[costs[i]]}
                onValueChange={([v]) => updateCost(i, v)}
                min={0}
                max={tool.name === "Creator Verification" ? 5000 : 2000}
                step={25}
                className="[&_[role=slider]]:bg-[#7C3AED] [&_[role=slider]]:border-[#7C3AED] [&_.range]:bg-[#7C3AED]"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>$0</span>
                <span>{fmt(tool.name === "Creator Verification" ? 5000 : 2000)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary — 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#F8F9FA] border border-gray-200 rounded-xl p-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">Your Current Stack</p>
            <div className="space-y-2">
              {TOOLS.map((tool, i) => (
                <div key={tool.name} className="flex justify-between text-sm">
                  <span className="text-gray-500">{tool.name}</span>
                  <span className="text-[#1a1a2e] tabular-nums">{fmt(costs[i])}</span>
                </div>
              ))}
              <div className="pt-3 mt-2 border-t border-gray-200 flex justify-between">
                <span className="text-sm font-bold text-[#1a1a2e]">Total</span>
                <span className="text-lg font-extrabold text-red-500 tabular-nums">{fmt(total)}/mo</span>
              </div>
            </div>
          </div>

          <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl p-6 text-center">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#10B981] mb-2">MilCrunch Replaces All of This</p>
            <p className="text-3xl font-extrabold text-[#1a1a2e]">{fmt(rxFee)}<span className="text-base font-normal text-gray-400">/mo</span></p>
          </div>

          <div className={cn(
            "rounded-xl p-6 text-center border",
            savings > 0
              ? "bg-[#10B981]/10 border-[#10B981]/30"
              : "bg-[#F8F9FA] border-gray-200"
          )}>
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">Monthly Savings</p>
            <p className={cn("text-3xl font-extrabold", savings > 0 ? "text-[#10B981]" : "text-gray-400")}>
              {savings > 0 ? "+" : ""}{fmt(savings)}<span className="text-base font-normal text-gray-400">/mo</span>
            </p>
            <p className={cn("text-sm mt-1", savings > 0 ? "text-[#10B981]/70" : "text-gray-400")}>
              {fmt(savings * 12)} saved per year
            </p>
          </div>

          <Button
            onClick={copyToClipboard}
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-12 text-sm font-semibold"
          >
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? "Copied!" : "Add to Prospectus"}
          </Button>
        </div>
      </div>
    </div>
  );
}
