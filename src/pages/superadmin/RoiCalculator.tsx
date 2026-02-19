import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (n: number) => "$" + n.toLocaleString();

export default function RoiCalculator() {
  const [events, setEvents] = useState(3);
  const [attendees, setAttendees] = useState(2500);
  const [sponsors, setSponsors] = useState(12);
  const [packageVal, setPackageVal] = useState(7500);
  const [creators, setCreators] = useState(1000);
  const [licenseFee, setLicenseFee] = useState(2500);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const annualSponsor = sponsors * packageVal * events;
  const annualLicense = licenseFee * 12;
  const totalRevenue = annualSponsor + annualLicense;
  const saasBaseline = 45600;
  const netSavings = totalRevenue - saasBaseline;
  const roiPct = ((totalRevenue - saasBaseline) / saasBaseline * 100).toFixed(0);

  const analyze = async () => {
    setAiLoading(true);
    setAiInsight("");
    try {
      const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 256,
          messages: [{
            role: "user",
            content: `You are a SaaS revenue strategist. Given these MilCrunch platform inputs: ${events} events/yr, ${attendees} avg attendees, ${sponsors} sponsors/event at ${fmt(packageVal)} avg package, ${creators} creators, ${fmt(licenseFee)}/mo license. Annual sponsor revenue: ${fmt(annualSponsor)}, license revenue: ${fmt(annualLicense)}, total: ${fmt(totalRevenue)}. ROI vs $45,600/yr SaaS stack: ${roiPct}%. Give exactly 3 sentences of strategic insight on ROI optimization.`,
          }],
        }),
      });
      const data = await resp.json();
      setAiInsight(data.content?.[0]?.text ?? "Unable to generate insight.");
    } catch {
      setAiInsight("Failed to reach AI. Check your API key.");
    }
    setAiLoading(false);
  };

  const sliders: Array<{ label: string; value: number; set: (v: number) => void; min: number; max: number; step: number; prefix?: string }> = [
    { label: "Events per Year", value: events, set: setEvents, min: 1, max: 20, step: 1 },
    { label: "Avg Attendees per Event", value: attendees, set: setAttendees, min: 100, max: 10000, step: 100 },
    { label: "Avg Sponsors per Event", value: sponsors, set: setSponsors, min: 1, max: 50, step: 1 },
    { label: "Sponsor Package Value", value: packageVal, set: setPackageVal, min: 1000, max: 50000, step: 500, prefix: "$" },
    { label: "Creator Network Size", value: creators, set: setCreators, min: 100, max: 10000, step: 50 },
    { label: "Platform License Fee/mo", value: licenseFee, set: setLicenseFee, min: 500, max: 10000, step: 100, prefix: "$" },
  ];

  return (
    <div className="min-h-screen bg-white p-6 md:p-10">
      <h1 className="text-2xl font-bold text-[#1a1a2e] mb-1">ROI Calculator</h1>
      <p className="text-gray-500 text-sm mb-8">Model sponsor revenue, platform licensing, and ROI vs legacy SaaS stack.</p>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Sliders */}
        <div className="space-y-6">
          {sliders.map((s) => (
            <div key={s.label} className="bg-[#F8F9FA] border border-gray-200 rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">{s.label}</span>
                <span className="text-sm font-bold text-[#1a1a2e] tabular-nums">
                  {s.prefix ?? ""}{s.value.toLocaleString()}
                </span>
              </div>
              <Slider
                value={[s.value]}
                onValueChange={([v]) => s.set(v)}
                min={s.min}
                max={s.max}
                step={s.step}
                className="[&_[role=slider]]:bg-[#7C3AED] [&_[role=slider]]:border-[#7C3AED] [&_.range]:bg-[#7C3AED]"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>{s.prefix ?? ""}{s.min.toLocaleString()}</span>
                <span>{s.prefix ?? ""}{s.max.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="bg-[#F8F9FA] border border-gray-200 rounded-xl p-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">Revenue Summary</p>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Annual Sponsor Revenue</p>
                <p className="text-3xl font-extrabold text-[#10B981]">{fmt(annualSponsor)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Annual License Revenue</p>
                <p className="text-xl font-bold text-[#1a1a2e]">{fmt(annualLicense)}</p>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-500">Total Platform Revenue</p>
                <p className="text-2xl font-extrabold text-[#1a1a2e]">{fmt(totalRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#F8F9FA] border border-gray-200 rounded-xl p-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">ROI vs SaaS Stack</p>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Legacy SaaS Cost/yr</span>
                <span className="text-sm font-medium text-red-500">{fmt(saasBaseline)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Net Savings</span>
                <span className={cn("text-sm font-bold", netSavings >= 0 ? "text-[#10B981]" : "text-red-500")}>
                  {netSavings >= 0 ? "+" : ""}{fmt(netSavings)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-sm text-gray-500">ROI</span>
                <span className={cn("text-2xl font-extrabold", Number(roiPct) >= 0 ? "text-[#10B981]" : "text-red-500")}>
                  {roiPct}%
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={analyze}
            disabled={aiLoading}
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-12 text-sm font-semibold"
          >
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Analyze with AI
          </Button>

          {aiInsight && (
            <div className="bg-[#7C3AED]/10 border border-[#7C3AED]/30 rounded-xl p-5">
              <p className="text-sm text-gray-700 leading-relaxed">{aiInsight}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
