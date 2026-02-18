import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Search,
  ShieldCheck,
  BarChart3,
  Calendar,
  Hash,
  Radio,
  Sparkles,
  Users,
  ArrowRight,
  CheckCircle,
  Quote,
  DollarSign,
  Layers,
  TrendingUp,
  Mic,
  ExternalLink,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

/* ── Sample 365 Insights chart data ─────────────────────────── */
const INSIGHTS_DEMO = [
  { month: "Jan", impressions: 120000 },
  { month: "Feb", impressions: 180000 },
  { month: "Mar", impressions: 310000 },
  { month: "Apr", impressions: 280000 },
  { month: "May", impressions: 420000 },
  { month: "Jun", impressions: 510000 },
  { month: "Jul", impressions: 480000 },
  { month: "Aug", impressions: 620000 },
  { month: "Sep", impressions: 840000 },
  { month: "Oct", impressions: 950000 },
  { month: "Nov", impressions: 780000 },
  { month: "Dec", impressions: 640000 },
];

/* ── SaaS replacement data ──────────────────────────────────── */
const SAAS_ROWS = [
  { tool: "Eventbrite / Cvent", cost: 500, replaces: "Event Management" },
  { tool: "Grin / AspireIQ", cost: 800, replaces: "Creator Discovery" },
  { tool: "StreamYard / Restream", cost: 50, replaces: "Streaming" },
  { tool: "Jotform / Typeform", cost: 50, replaces: "Sponsor Forms" },
  { tool: "Brandwatch / Mention", cost: 300, replaces: "Social Monitoring" },
  { tool: "Mailchimp", cost: 100, replaces: "Email (Coming Soon)" },
  { tool: "Google Analytics", cost: 0, replaces: "365 Insights" },
  { tool: "Manual Verification", cost: 2000, replaces: "AI Verification" },
];

/* ── Pain / solution cards ──────────────────────────────────── */
const PAIN_POINTS = [
  { icon: "📅", text: "3-day events, 362 days of silence" },
  { icon: "💸", text: 'Sponsors ask "what did I get?" — no data to answer' },
  { icon: "🔍", text: "No way to verify military creators" },
  { icon: "🧩", text: "5-8 SaaS tools duct-taped together" },
  { icon: "📉", text: "Sponsor retention under 50%" },
];

const SOLUTIONS = [
  { icon: "📊", text: "365-day sponsor ROI dashboards" },
  { icon: "✅", text: "AI-verified military audience" },
  { icon: "🎯", text: "One platform replaces 8 tools" },
  { icon: "📈", text: "85%+ sponsor retention target" },
];

/* ── Feature cards ──────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Search,
    title: "Creator Discovery & Network",
    desc: "Access tens of millions of creators. Filter by platform, niche, military branch. Build campaign lists.",
    link: "/brand/discover",
  },
  {
    icon: ShieldCheck,
    title: "Military Verification",
    desc: "4-phase AI verification pipeline. Confidence scores. Evidence-backed. Brand safety.",
    link: "/verification",
  },
  {
    icon: BarChart3,
    title: "365 Insights",
    desc: "Year-round sponsor analytics. Multi-sponsor comparison. YoY growth. Export reports.",
    link: "/brand/dashboard",
  },
  {
    icon: Calendar,
    title: "Event Management",
    desc: "End-to-end: creation, speakers, agendas, tickets, sponsors, streaming.",
    link: "/brand/events",
  },
  {
    icon: Hash,
    title: "Social Monitoring",
    desc: "Track hashtags and mentions across Instagram, TikTok, Twitter, YouTube. Sentiment analysis.",
    link: "/brand/dashboard",
  },
  {
    icon: Radio,
    title: "Live Streaming",
    desc: "Multi-streaming with AI post-production. Auto-framing, lower thirds, highlight reels.",
    link: "/brand/streaming",
  },
];

/* ── Revenue model ──────────────────────────────────────────── */
const REVENUE_CARDS = [
  {
    icon: Layers,
    title: "Platform License",
    price: "$X / event property / month",
    desc: "Full platform access. Events, discovery, verification, streaming, analytics.",
  },
  {
    icon: BarChart3,
    title: "Sponsor Dashboard Access",
    price: "$5K – $10K add-on per sponsor",
    desc: "Year-round analytics portal. ROI reporting, audience insights, renewal tools.",
  },
  {
    icon: Users,
    title: "Creator Marketplace",
    price: "Commission-based",
    desc: "Revenue share on brand-creator deals facilitated through the network.",
  },
];

/* ── Component ──────────────────────────────────────────────── */
export default function BusinessOverview() {
  const [stats, setStats] = useState({
    creators: 0,
    podcasts: 0,
    events: 0,
    sponsors: 0,
    verifications: 0,
  });

  useEffect(() => {
    (async () => {
      const [cr, pod, ev, sp, ver] = await Promise.all([
        supabase.from("directory_members").select("id", { count: "exact", head: true }),
        supabase.from("podcasts").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("event_sponsors").select("id", { count: "exact", head: true }),
        supabase.from("verifications").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        creators: cr.count ?? 0,
        podcasts: pod.count ?? 0,
        events: ev.count ?? 0,
        sponsors: sp.count ?? 0,
        verifications: ver.count ?? 0,
      });
    })();
  }, []);

  const saasTotal = SAAS_ROWS.reduce((s, r) => s + r.cost, 0);

  return (
    <>
      {/* Print-friendly styles */}
      <style>{`
        @media print {
          nav, aside, header, [data-sidebar], [data-topbar], button.print-hide { display: none !important; }
          body { background: white !important; }
          .print-page { max-width: 100% !important; padding: 0 !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      <div className="print-page max-w-6xl mx-auto space-y-16 pb-20">
        {/* Print button */}
        <div className="flex justify-end print-hide">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 print-hide"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" /> Print / PDF
          </Button>
        </div>

        {/* ═══════════════ HERO ═══════════════ */}
        <section className="text-center space-y-4">
          <div className="flex items-center justify-center gap-1.5 text-3xl font-extrabold tracking-tight">
            <span className="text-[#000741] dark:text-white">recurrent</span>
            <span className="text-[#9B51E0] font-black">X</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#000741] dark:text-white leading-tight">
            The Operating System for Military<br className="hidden sm:block" /> Events & Communities
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Turn one-time events into year-round revenue engines.
          </p>
        </section>

        {/* ═══════════════ SECTION 1: THE PROBLEM ═══════════════ */}
        <section className="print-break">
          <h2 className="text-2xl font-bold text-[#000741] dark:text-white text-center mb-8">The Problem</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left — pain */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-red-500 mb-4">
                What Events Look Like Today
              </h3>
              {PAIN_POINTS.map((p) => (
                <div key={p.text} className="flex items-start gap-3 rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 p-4">
                  <span className="text-xl shrink-0">{p.icon}</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.text}</p>
                </div>
              ))}
            </div>

            {/* Right — solution */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-green-600 mb-4">
                What Events Look Like with MilCrunch
              </h3>
              {SOLUTIONS.map((s) => (
                <div key={s.text} className="flex items-start gap-3 rounded-xl border border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-950/10 p-4">
                  <span className="text-xl shrink-0">{s.icon}</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ SECTION 2: PLATFORM CAPABILITIES ═══════════════ */}
        <section className="print-break">
          <h2 className="text-2xl font-bold text-[#000741] dark:text-white text-center mb-2">Platform Capabilities</h2>
          <p className="text-center text-muted-foreground mb-8">Live data from the MilCrunch platform</p>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
            {[
              { label: "Creators", value: stats.creators.toLocaleString(), extra: "+ millions via discovery", color: "text-[#6C5CE7]" },
              { label: "Podcasts", value: stats.podcasts.toLocaleString(), color: "text-blue-600" },
              { label: "Events", value: stats.events.toLocaleString(), color: "text-green-600" },
              { label: "Sponsors", value: stats.sponsors.toLocaleString(), color: "text-amber-600" },
              { label: "Verifications", value: stats.verifications.toLocaleString(), color: "text-purple-600" },
            ].map((s) => (
              <Card key={s.label} className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm text-center">
                <CardContent className="py-5 px-3">
                  <p className={`text-2xl font-bold font-mono tabular-nums ${s.color}`}>{s.value}</p>
                  <p className="text-xs font-medium text-muted-foreground mt-1">{s.label}</p>
                  {s.extra && <p className="text-[10px] text-muted-foreground mt-0.5">{s.extra}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Feature grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <Card key={f.title} className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="pt-6 pb-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#6C5CE7]/10 flex items-center justify-center shrink-0">
                      <f.icon className="h-5 w-5 text-[#6C5CE7]" />
                    </div>
                    <h3 className="font-semibold text-[#000741] dark:text-white">{f.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  <Link to={f.link} className="inline-flex items-center gap-1 text-sm font-medium text-[#6C5CE7] hover:underline group-hover:gap-2 transition-all">
                    See Demo <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ═══════════════ SECTION 3: SAAS REPLACEMENT CALCULATOR ═══════════════ */}
        <section className="print-break">
          <h2 className="text-2xl font-bold text-[#000741] dark:text-white text-center mb-2">SaaS Replacement Calculator</h2>
          <p className="text-center text-muted-foreground mb-8">One platform. One bill. One login.</p>

          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-3 px-5 font-semibold text-gray-600 dark:text-gray-300">Current Tool</th>
                    <th className="text-right py-3 px-5 font-semibold text-gray-600 dark:text-gray-300">Monthly Cost</th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-600 dark:text-gray-300">MilCrunch Replaces</th>
                  </tr>
                </thead>
                <tbody>
                  {SAAS_ROWS.map((row) => (
                    <tr key={row.tool} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-5 font-medium text-gray-800 dark:text-gray-200">{row.tool}</td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums text-gray-600 dark:text-gray-300">
                        {row.cost === 0 ? "$0" : `$${row.cost.toLocaleString()}/mo`}
                      </td>
                      <td className="py-3 px-5">
                        <span className="inline-flex items-center gap-1.5 text-green-700 dark:text-green-400 font-medium">
                          <CheckCircle className="h-4 w-4" /> {row.replaces}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#6C5CE7]/5 dark:bg-[#6C5CE7]/10">
                    <td className="py-4 px-5 font-bold text-[#000741] dark:text-white">Total</td>
                    <td className="py-4 px-5 text-right font-bold font-mono tabular-nums text-[#6C5CE7] text-lg">
                      ${saasTotal.toLocaleString()}/mo
                    </td>
                    <td className="py-4 px-5 font-medium text-[#6C5CE7]">All replaced</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-4">
            MilCrunch consolidates <strong className="text-[#000741] dark:text-white">${saasTotal.toLocaleString()}+/mo</strong> in SaaS costs into one military-focused platform.
          </p>
        </section>

        {/* ═══════════════ SECTION 4: SPONSOR ROI STORY ═══════════════ */}
        <section className="print-break">
          <h2 className="text-2xl font-bold text-[#000741] dark:text-white text-center mb-2">Sponsor ROI Story</h2>
          <p className="text-center text-muted-foreground mb-8">365 Insights turns sponsor spend into a measurable asset</p>

          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <CardContent className="pt-6">
              {/* Chart */}
              <div className="h-64 mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={INSIGHTS_DEMO} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillPurple" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6C5CE7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6C5CE7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(v: number) => [`${(v / 1000).toFixed(0)}K impressions`, "Impressions"]}
                      labelFormatter={(l) => l}
                    />
                    <Area type="monotone" dataKey="impressions" stroke="#6C5CE7" strokeWidth={2} fill="url(#fillPurple)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Before/After */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-red-500">Before MilCrunch</h4>
                  <div className="rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/10 p-4 space-y-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">"We sponsored for $25K. What did we get?"</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">"50% sponsor renewal — they can't justify the spend."</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-green-600">After MilCrunch</h4>
                  <div className="rounded-lg border border-green-100 dark:border-green-900/30 bg-green-50/30 dark:bg-green-950/10 p-4 space-y-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">"Our $25K generated 3.4M impressions over 12 months at $0.007 CPM."</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">"85% renewal with data-driven upsell."</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ═══════════════ SECTION 5: REVENUE MODEL ═══════════════ */}
        <section className="print-break">
          <h2 className="text-2xl font-bold text-[#000741] dark:text-white text-center mb-8">Revenue Model</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {REVENUE_CARDS.map((r) => (
              <Card key={r.title} className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <CardContent className="pt-6 pb-5 space-y-3 text-center">
                  <div className="h-12 w-12 rounded-xl bg-[#6C5CE7]/10 flex items-center justify-center mx-auto">
                    <r.icon className="h-6 w-6 text-[#6C5CE7]" />
                  </div>
                  <h3 className="font-bold text-[#000741] dark:text-white">{r.title}</h3>
                  <p className="text-sm font-semibold text-[#6C5CE7]">{r.price}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ═══════════════ SECTION 6: THE PITCH ═══════════════ */}
        <section className="print-break text-center space-y-8">
          <div className="max-w-3xl mx-auto rounded-2xl bg-gradient-to-br from-[#000741] to-[#5B4BD1] p-10 sm:p-14 text-white">
            <Quote className="h-8 w-8 text-white/30 mx-auto mb-4" />
            <blockquote className="text-xl sm:text-2xl font-bold leading-snug">
              "You didn't sponsor a 3-day event.<br />You sponsored a 365-day community."
            </blockquote>
          </div>

          <div className="space-y-3">
            <p className="text-lg font-medium text-[#000741] dark:text-white">Ready to see the full platform?</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Button
                size="lg"
                className="bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white gap-2 rounded-full px-8"
                asChild
              >
                <a href="https://calendly.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> Schedule Demo
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 rounded-full px-8"
                asChild
              >
                <Link to="/brand/dashboard">
                  <Sparkles className="h-4 w-4" /> Explore Platform
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
