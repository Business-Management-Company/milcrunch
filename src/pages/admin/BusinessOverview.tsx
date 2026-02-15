import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

const REVENUE_STREAMS = [
  {
    title: "Digital Advertising",
    desc: "Display, programmatic, premium sponsorships.",
    y1: 300,
    y2: 750,
    y3: 1500,
  },
  {
    title: "Embedded Creator Ads",
    desc: "Pre/mid/post-roll audio & video. 60-70% creator / 30-40% PD split.",
    y1: 500,
    y2: 1200,
    y3: 2500,
  },
  {
    title: "MVOrg Partnerships",
    desc: "VFW, American Legion, VA co-branded hubs. 50/50 revenue share.",
    y1: 200,
    y2: 600,
    y3: 1200,
  },
  {
    title: "Premium Subscriptions",
    desc: "Ad-free, early access, premium analytics.",
    y1: 100,
    y2: 250,
    y3: 600,
  },
  {
    title: "Sponsorships & Branded Content",
    desc: "Custom campaigns, branded series.",
    y1: 250,
    y2: 750,
    y3: 1500,
  },
  {
    title: "Affiliate Partnerships",
    desc: "Veteran discounts, commission on referred sales.",
    y1: 50,
    y2: 150,
    y3: 300,
  },
];

const REVENUE_CHART_DATA = [
  { year: "Y1", total: 1400, label: "$1.4M" },
  { year: "Y2", total: 3700, label: "$3.7M" },
  { year: "Y3", total: 7600, label: "$7.6M" },
];

const FUNDING_ALLOCATION = [
  { name: "Platform Dev", value: 40, color: "#0064B1" },
  { name: "Marketing & Creator Acquisition", value: 25, color: "#053877" },
  { name: "Staff", value: 15, color: "#F0A71F" },
  { name: "Legal", value: 10, color: "#6b7280" },
  { name: "Working Capital", value: 10, color: "#9ca3af" },
];

const GTM_STEPS = [
  "Finalize MVP",
  "Secure 5-10 anchor creators",
  "Formalize 2-3 MVOrg MOUs",
  "Launch beta (invite-only)",
  "Begin ad sales & sponsorship outreach",
];

const INVESTOR_SLIDES = [
  { title: "Cover", bullets: ["RecurrentX: Amplifying the Mil-Vet Voice"] },
  { title: "Mission & Vision", bullets: ["Mission and vision statements"] },
  { title: "The Problem", bullets: ["Fragmented creators", "Limited monetization", "Scattered audiences"] },
  { title: "The Solution", bullets: ["Dedicated multimedia platform", "Integrated ad tech", "Cross-platform delivery"] },
  { title: "Market Opportunity", bullets: ["TAM $200B+", "SAM $2B+", "SOM $50M in 3 years"] },
  { title: "Product Overview", bullets: ["Creator dashboards", "Ad insertion", "Analytics", "Co-branded channels"] },
  { title: "Revenue Streams", bullets: ["6 streams summary"] },
  { title: "Business Model & Economics", bullets: ["70/30 split", "CPMs: Display $6-8, Audio $18-25, Video $20-30", "Hosting costs"] },
  { title: "Financial Projections", bullets: ["3-year chart", "Break-even Y2", "EBITDA Y3 ~$1.2M"] },
  { title: "Go-to-Market Strategy", bullets: ["GTM plan"] },
  { title: "Strategic Partnerships", bullets: ["VFW", "American Legion", "VA", "WWP", "USO"] },
  { title: "Competitive Landscape", bullets: ["PD vs YouTube/Spotify/Patreon", "Mil-vet niche advantage"] },
  { title: "Social Impact", bullets: ["Impact narrative"] },
  { title: "Leadership Team", bullets: ["(Placeholder)"] },
  { title: "Funding & Use of Proceeds", bullets: ["$1.5M seed"] },
  { title: "Closing", bullets: ["Join Us in Amplifying the Mil-Vet Voice"] },
];

const RECURRENT_SLIDES: { title: string; bullets: string[]; highlight?: boolean }[] = [
  { title: "Cover", bullets: ["Unlocking the Mil-Vet Media Opportunity"] },
  { title: "Executive Summary", bullets: ["Strategic acquisition or partnership opportunity"] },
  { title: "Problem in the Market", bullets: ["Market challenges"] },
  { title: "Our Solution", bullets: ["Unified platform", "Monetization", "MVOrg partnerships"] },
  { title: "Platform Overview", bullets: ["150+ creators", "Proprietary ad engine", "Multi-device"] },
  { title: "Audience & Market", bullets: ["500K+ MAU", "18M veterans", "$2B+ market"] },
  { title: "Revenue Streams", bullets: ["$1.4M Y1 → $7.6M Y3"] },
  { title: "Strategic Fit with Recurrent", bullets: ["Audience synergy", "Revenue upside", "Tech & IP", "Brand strength"], highlight: true },
  { title: "Competitive Advantage", bullets: ["Combined = largest mil-vet media platform"] },
  { title: "Financial Snapshot", bullets: ["Break-even Y2", "EBITDA $3M combined Y3"] },
  { title: "Synergy Opportunities", bullets: ["Audience growth", "Ad efficiency", "Tech integration", "Partnership expansion"] },
  { title: "Proposed Transaction", bullets: ["Option 1: Acquisition", "Option 2: Strategic Merger", "Option 3: Revenue Share Partnership"], highlight: true },
  { title: "Team & Advisors", bullets: ["(Placeholder)"] },
  { title: "Next Steps", bullets: ["Due diligence", "Terms evaluation", "Integration planning"] },
];

function Money({ value }: { value: number }) {
  const s = value >= 1000 ? `$${(value / 1000).toFixed(1)}M` : `$${value}K`;
  return <span className="font-mono font-bold tabular-nums text-[#000741]">{s}</span>;
}

export default function BusinessOverview() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[#000741] dark:text-white">
                RecurrentX Business Overview
              </h1>
              <Badge variant="secondary" className="text-xs font-medium text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200">
                Confidential — Internal Use Only
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Company strategy, business model, and partnership materials
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Last updated: October 27, 2025
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="business-plan" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="business-plan" className="rounded-md data-[state=active]:bg-[#0064B1] data-[state=active]:text-white">
            Business Plan
          </TabsTrigger>
          <TabsTrigger value="investor-deck" className="rounded-md data-[state=active]:bg-[#0064B1] data-[state=active]:text-white">
            Investor Deck
          </TabsTrigger>
          <TabsTrigger value="recurrent" className="rounded-md data-[state=active]:bg-[#0064B1] data-[state=active]:text-white">
            Recurrent Partnership
          </TabsTrigger>
        </TabsList>

        {/* TAB 1 — Business Plan */}
        <TabsContent value="business-plan" className="mt-6 space-y-8">
          {/* Hero */}
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#000741] to-[#053877] text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-white">RecurrentX Business Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-[#F0A71F] uppercase tracking-wider">Mission</p>
                <p className="text-white/95">
                  To empower and elevate the voices of military and veteran creators while fostering community, connection, and opportunity through digital media.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#F0A71F] uppercase tracking-wider">Vision</p>
                <p className="text-white/95">
                  To become the leading hub for military and veteran storytelling, entertainment, education, and inspiration.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Market Opportunity */}
          <div>
            <h2 className="text-2xl font-bold text-[#000741] dark:text-white mb-4">Market Opportunity</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Veterans in the U.S.", value: "18M+", sub: "Addressable audience" },
                { label: "Active-duty & families", value: "3.5M+", sub: "Extended community" },
                { label: "Annual market size", value: "$2B+", sub: "Mil-vet media & affinity" },
              ].map((stat) => (
                <Card key={stat.label} className="rounded-xl border border-gray-200 shadow-sm">
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-[#0064B1] font-mono tabular-nums">{stat.value}</p>
                    <p className="font-medium text-[#000741] dark:text-white mt-1">{stat.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Value Proposition */}
          <div>
            <h2 className="text-2xl font-bold text-[#000741] dark:text-white mb-4">Value Proposition</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { who: "For Creators", text: "A one-stop platform to host, distribute, and monetize content." },
                { who: "For Audiences", text: "A curated, trustworthy source of military-related media." },
                { who: "For Brands", text: "Access to a targeted and values-driven demographic." },
              ].map((v) => (
                <Card key={v.who} className="rounded-xl border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-[#000741] dark:text-white">{v.who}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{v.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Revenue Streams */}
          <div>
            <h2 className="text-2xl font-bold text-[#000741] dark:text-white mb-4">Revenue Streams</h2>
            <Accordion type="single" collapsible className="w-full">
              {REVENUE_STREAMS.map((stream, i) => (
                <AccordionItem key={stream.title} value={`stream-${i}`} className="border rounded-lg px-4 mb-2 bg-white dark:bg-card">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold text-[#000741] dark:text-white">{stream.title}</span>
                    <span className="text-muted-foreground font-normal text-sm ml-2">
                      Y1 <Money value={stream.y1} /> → Y3 <Money value={stream.y3} />
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground mb-3">{stream.desc}</p>
                    <div className="flex gap-4 text-sm font-mono tabular-nums">
                      <span>Y1: <Money value={stream.y1} /></span>
                      <span>Y2: <Money value={stream.y2} /></span>
                      <span>Y3: <Money value={stream.y3} /></span>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Financial Summary */}
          <div>
            <h2 className="text-2xl font-bold text-[#000741] dark:text-white mb-4">Financial Summary</h2>
            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Revenue</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-[#0064B1]">Y1 $1.4M → Y3 $7.6M</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Gross Margin Y3</p>
                    <p className="text-lg font-bold tabular-nums">~55%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Break-even</p>
                    <p className="text-lg font-bold tabular-nums">End of Year 2</p>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={REVENUE_CHART_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? `$${(v/1000).toFixed(1)}M` : `$${v}K`)} />
                      <Tooltip formatter={(v: number) => [(v >= 1000 ? `$${(Number(v)/1000).toFixed(1)}M` : `$${v}K`), "Revenue"]} labelFormatter={(l) => l} />
                      <Bar dataKey="total" fill="#0064B1" radius={[4, 4, 0, 0]} name="Revenue ($K)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Funding */}
          <div>
            <h2 className="text-2xl font-bold text-[#000741] dark:text-white mb-4">Funding</h2>
            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Seed Round: $1.5M</CardTitle>
                <CardDescription>Use of proceeds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-wrap items-center">
                  <div className="w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={FUNDING_ALLOCATION}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={72}
                          paddingAngle={2}
                          label={({ value }) => `${value}%`}
                        >
                          {FUNDING_ALLOCATION.map((entry, i) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`${v}%`, "Allocation"]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="text-sm space-y-1">
                    {FUNDING_ALLOCATION.map((a) => (
                      <li key={a.name} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                        <span><strong>{a.value}%</strong> {a.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Go-to-Market */}
          <div>
            <h2 className="text-2xl font-bold text-[#000741] dark:text-white mb-4">Go-to-Market</h2>
            <Card className="rounded-xl border border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <ol className="space-y-3 list-decimal list-inside">
                  {GTM_STEPS.map((step, i) => (
                    <li key={i} className="font-medium text-[#000741] dark:text-white">
                      {step}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2 — Investor Deck */}
        <TabsContent value="investor-deck" className="mt-6">
          <div className="space-y-4 max-w-3xl">
            {INVESTOR_SLIDES.map((slide, i) => (
              <Card key={i} className="rounded-xl border border-gray-200 shadow-md overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0064B1] text-white text-sm font-bold shrink-0">
                      {i + 1}
                    </span>
                    <CardTitle className="text-lg text-[#000741] dark:text-white">{slide.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pl-11">
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {slide.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 3 — Recurrent Partnership */}
        <TabsContent value="recurrent" className="mt-6">
          <div className="space-y-4 max-w-3xl">
            {RECURRENT_SLIDES.map((slide, i) => (
              <Card
                key={i}
                className={cn(
                  "rounded-xl border border-gray-200 shadow-md overflow-hidden",
                  slide.highlight && "border-l-4 border-l-[#0064B1]"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0064B1] text-white text-sm font-bold shrink-0">
                      {i + 1}
                    </span>
                    <CardTitle className="text-lg text-[#000741] dark:text-white">{slide.title}</CardTitle>
                    {slide.highlight && (
                      <Badge className="bg-[#0064B1]/10 text-[#0064B1] text-xs ml-auto">Key slide</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pl-11">
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {slide.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
