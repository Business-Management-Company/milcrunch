import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ShieldCheck,
  Monitor,
  Database,
  Cloud,
  Bot,
  Lock,
  KeyRound,
  UserCheck,
  Server,
  CheckCircle2,
} from "lucide-react";

/* ── Tech Stack Cards ── */
const TECH_STACK = [
  {
    title: "Frontend Framework",
    icon: Monitor,
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    items: [
      { name: "React 18", desc: "Component-based UI with concurrent rendering" },
      { name: "TypeScript", desc: "Type-safe development across the codebase" },
      { name: "Vite", desc: "Lightning-fast HMR and optimized production builds" },
      { name: "Tailwind CSS", desc: "Utility-first styling with design tokens" },
    ],
  },
  {
    title: "Backend & Database",
    icon: Database,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    items: [
      { name: "Supabase", desc: "Managed PostgreSQL with real-time subscriptions" },
      { name: "Edge Functions", desc: "Serverless compute at the edge" },
      { name: "Row Level Security", desc: "Per-row access policies enforced at DB level" },
      { name: "PostgREST", desc: "Auto-generated REST API from database schema" },
    ],
  },
  {
    title: "Cloud & Hosting",
    icon: Cloud,
    color: "text-violet-600",
    bg: "bg-violet-500/10",
    items: [
      { name: "Vercel", desc: "Edge-optimized frontend hosting with instant rollbacks" },
      { name: "Supabase Storage", desc: "S3-compatible object storage for media assets" },
      { name: "Cloudflare CDN", desc: "Global content delivery with DDoS protection" },
      { name: "Serverless Functions", desc: "API proxies that protect secrets server-side" },
    ],
  },
  {
    title: "AI & Integrations",
    icon: Bot,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    items: [
      { name: "Anthropic Claude", desc: "AI assistant for content, strategy, and outreach" },
      { name: "Influencers.club", desc: "310M+ creator database for discovery & enrichment" },
      { name: "Resend", desc: "Transactional email with deliverability tracking" },
      { name: "Upload-Post SDK", desc: "Cross-platform social media publishing" },
    ],
  },
];

/* ── Security Pillars ── */
const SECURITY_PILLARS = [
  {
    title: "Authentication",
    icon: KeyRound,
    items: [
      "Supabase Auth with secure session management",
      "Google OAuth 2.0 social sign-in",
      "JWT tokens with automatic refresh rotation",
      "Email verification on all new accounts",
    ],
  },
  {
    title: "Data Protection",
    icon: Lock,
    items: [
      "Row Level Security on every database table",
      "AES-256 encryption at rest for all data",
      "TLS 1.3 encryption in transit",
      "Automated daily database backups",
    ],
  },
  {
    title: "Access Control",
    icon: UserCheck,
    items: [
      "Role-based permissions (Creator, Brand, Admin)",
      "Scoped API keys per integration",
      "Principle of least privilege enforced",
      "Audit logging on sensitive operations",
    ],
  },
  {
    title: "Infrastructure",
    icon: Server,
    items: [
      "Vercel edge network across 30+ regions",
      "Supabase SOC 2 Type II certified",
      "HTTPS enforced on all endpoints",
      "Rate limiting and bot protection",
    ],
  },
];

export default function CreatorTechSecurity() {
  return (
    <CreatorLayout>
      <div className="w-full max-w-5xl space-y-10">

        {/* Page header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-[#1B3A6B]/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-[#1B3A6B]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#1B3A6B] dark:text-white">Tech & Security</h1>
              <p className="text-sm text-muted-foreground">Platform architecture and security posture</p>
            </div>
          </div>
        </div>

        {/* ══════════════ SECTION 1 — TECH STACK ══════════════ */}
        <section>
          <h2 className="text-lg font-semibold text-[#1B3A6B] dark:text-white mb-4">Tech Stack</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TECH_STACK.map((card) => (
              <Card key={card.title} className="rounded-xl border border-gray-100 dark:border-border bg-white dark:bg-card overflow-hidden">
                <div className={`h-1 w-full bg-gradient-to-r ${card.color === "text-blue-600" ? "from-blue-500 to-indigo-500" : card.color === "text-emerald-600" ? "from-emerald-500 to-teal-500" : card.color === "text-violet-600" ? "from-violet-500 to-purple-500" : "from-amber-500 to-orange-500"}`} />
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-base font-semibold">
                    <div className={`h-9 w-9 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
                      <card.icon className={`h-4.5 w-4.5 ${card.color}`} />
                    </div>
                    <span className="text-[#1B3A6B] dark:text-white">{card.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {card.items.map((item) => (
                      <div key={item.name} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-foreground">{item.name}</span>
                          <span className="text-sm text-muted-foreground"> — {item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ══════════════ SECTION 2 — SECURITY OVERVIEW ══════════════ */}
        <section>
          {/* Hero card */}
          <div className="relative rounded-2xl overflow-hidden mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-[#000741] via-[#0B1A4D] to-[#122B6E]" />
            {/* Shield watermark */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.04]">
              <ShieldCheck className="h-40 w-40 text-white" />
            </div>
            <div className="relative px-8 py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Enterprise-Grade Security</h2>
                  <p className="text-sm text-white/60 mt-0.5">Multi-layered protection for creator and brand data</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 text-sm px-4 py-1.5 w-fit">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                Protected
              </Badge>
            </div>
          </div>

          {/* Security pillars 2x2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SECURITY_PILLARS.map((pillar) => (
              <Card key={pillar.title} className="rounded-xl border border-gray-100 dark:border-border bg-white dark:bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-base font-semibold">
                    <div className="h-9 w-9 rounded-lg bg-[#1B3A6B]/10 dark:bg-white/5 flex items-center justify-center shrink-0">
                      <pillar.icon className="h-4.5 w-4.5 text-[#1B3A6B] dark:text-white/70" />
                    </div>
                    <span className="text-[#1B3A6B] dark:text-white">{pillar.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2.5">
                    {pillar.items.map((item) => (
                      <div key={item} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer note */}
          <p className="text-xs text-muted-foreground text-center mt-6">
            Last security review: March 2026 &middot; Next scheduled review: September 2026
          </p>
        </section>
      </div>
    </CreatorLayout>
  );
}
