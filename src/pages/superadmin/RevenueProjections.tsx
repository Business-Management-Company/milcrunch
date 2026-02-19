import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const fmt = (n: number) => "$" + n.toLocaleString();

interface YearData {
  label: string;
  streams: { name: string; amount: number }[];
}

const YEARS: YearData[] = [
  {
    label: "Year 1",
    streams: [
      { name: "Platform Licenses", amount: 72000 },
      { name: "Sponsor Intelligence Add-ons", amount: 36000 },
      { name: "Creator Marketplace (% of brand deals)", amount: 30000 },
      { name: "Email Marketing Module", amount: 24000 },
      { name: "Advertising Module", amount: 18000 },
    ],
  },
  {
    label: "Year 2",
    streams: [
      { name: "Platform Licenses", amount: 192000 },
      { name: "Sponsor Intelligence Add-ons", amount: 108000 },
      { name: "Creator Marketplace (% of brand deals)", amount: 96000 },
      { name: "Email Marketing Module", amount: 72000 },
      { name: "Advertising Module", amount: 52000 },
    ],
  },
  {
    label: "Year 3",
    streams: [
      { name: "Platform Licenses", amount: 480000 },
      { name: "Sponsor Intelligence Add-ons", amount: 312000 },
      { name: "Creator Marketplace (% of brand deals)", amount: 288000 },
      { name: "Email Marketing Module", amount: 180000 },
      { name: "Advertising Module", amount: 140000 },
    ],
  },
];

export default function RevenueProjections() {
  const [activeYear, setActiveYear] = useState(0);

  const year = YEARS[activeYear];
  const total = year.streams.reduce((s, r) => s + r.amount, 0);
  const maxAmount = Math.max(...year.streams.map((s) => s.amount));

  const exportPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = year.streams.map(
      (s) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB">${s.name}</td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-align:right;font-family:monospace">${fmt(s.amount)}</td></tr>`
    ).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>MilCrunch Revenue Projections — ${year.label}</title><style>body{font-family:system-ui;background:#fff;color:#1a1a2e;padding:40px}table{width:100%;border-collapse:collapse;margin-top:20px}h1{font-size:28px}h2{color:#7C3AED;margin-top:8px}.total{font-size:24px;color:#10B981;font-weight:800;margin-top:24px}</style></head><body><h1>MilCrunch Revenue Projections</h1><h2>${year.label}</h2><table>${rows}<tr style="background:rgba(124,58,237,0.08)"><td style="padding:8px 12px;font-weight:700">Total Revenue</td><td style="padding:8px 12px;text-align:right;font-weight:700;color:#7C3AED;font-family:monospace">${fmt(total)}</td></tr></table><p class="total">Total: ${fmt(total)}</p><p style="color:#6B7280;font-size:12px;margin-top:40px">&copy; ${new Date().getFullYear()} MilCrunch &middot; Confidential</p></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="bg-white p-6 md:p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e] mb-1">Revenue Projections</h1>
          <p className="text-gray-500 text-sm">3-year revenue breakdown by stream.</p>
        </div>
        <Button onClick={exportPdf} variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-[#1a1a2e]">
          <Download className="h-4 w-4 mr-2" /> Export as PDF
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-8">
        {YEARS.map((y, i) => {
          const t = y.streams.reduce((s, r) => s + r.amount, 0);
          return (
            <button
              key={y.label}
              type="button"
              onClick={() => setActiveYear(i)}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeYear === i
                  ? "bg-[#7C3AED] text-white"
                  : "bg-[#F8F9FA] text-gray-500 border border-gray-200 hover:text-[#1a1a2e] hover:bg-gray-100"
              )}
            >
              {y.label} <span className="ml-2 text-xs opacity-70">{fmt(t)}</span>
            </button>
          );
        })}
      </div>

      {/* Revenue table */}
      <div className="bg-[#F8F9FA] border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-medium uppercase tracking-wider text-gray-400 px-6 py-3">Revenue Stream</th>
              <th className="text-right text-xs font-medium uppercase tracking-wider text-gray-400 px-6 py-3 w-40">Amount</th>
              <th className="text-left text-xs font-medium uppercase tracking-wider text-gray-400 px-6 py-3 w-64">Share</th>
            </tr>
          </thead>
          <tbody>
            {year.streams.map((s) => {
              const pct = total > 0 ? (s.amount / total * 100).toFixed(1) : "0";
              const barWidth = maxAmount > 0 ? (s.amount / maxAmount * 100) : 0;
              return (
                <tr key={s.name} className="border-b border-gray-100">
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">{s.name}</td>
                  <td className="px-6 py-4 text-sm font-bold text-[#1a1a2e] text-right tabular-nums">{fmt(s.amount)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-[#7C3AED]" style={{ width: `${barWidth}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 tabular-nums w-10 text-right">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-[#7C3AED]/[0.06]">
              <td className="px-6 py-4 text-sm font-bold text-[#1a1a2e]">Total Revenue</td>
              <td className="px-6 py-4 text-lg font-extrabold text-[#7C3AED] text-right tabular-nums">{fmt(total)}</td>
              <td className="px-6 py-4">
                <span className="text-xs font-medium text-[#7C3AED]">100%</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Year-over-year comparison */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {YEARS.map((y, i) => {
          const t = y.streams.reduce((s, r) => s + r.amount, 0);
          const prev = i > 0 ? YEARS[i - 1].streams.reduce((s, r) => s + r.amount, 0) : 0;
          const growth = prev > 0 ? ((t - prev) / prev * 100).toFixed(0) : "—";
          return (
            <div
              key={y.label}
              className={cn(
                "rounded-xl p-5 text-center transition-all",
                activeYear === i
                  ? "bg-white border-2 border-[#7C3AED]"
                  : "bg-[#F8F9FA] border border-gray-200"
              )}
            >
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{y.label}</p>
              <p className="text-xl font-extrabold text-[#1a1a2e]">{fmt(t)}</p>
              {i > 0 && (
                <p className="text-xs text-[#7C3AED] font-medium mt-1">+{growth}% YoY</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
