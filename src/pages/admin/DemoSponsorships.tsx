import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Mail, 
  Phone, 
  DollarSign, 
  Users, 
  Eye, 
  Target,
  ChevronDown,
  ChevronUp,
  Sparkles
} from "lucide-react";

interface DemoSponsor {
  id: string;
  title: string;
  tier: string;
  industry: string;
  value: number;
  status: string;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  overview: string;
  includes: string[];
  reach: {
    impressions: string;
    engagements: string;
    leads: string;
  };
}

const demoSponsors: DemoSponsor[] = [
  {
    id: "1",
    title: "Platinum Sponsorship Package",
    tier: "platinum",
    industry: "Financial Services",
    value: 95000,
    status: "Active Demo",
    contact: {
      name: "Emily Carter",
      email: "emily.carter@demo-sponsor.com",
      phone: "(202) 555-9812"
    },
    overview: "The Platinum package is the top-tier, multi-channel sponsorship designed for brands wanting maximum visibility, content ownership, and high-intent conversions.",
    includes: [
      "Primary branding on all event pages",
      "Sponsored segment + scripted read",
      "Branded networking room",
      "Sponsored registration page + custom questions",
      "Sponsored email pre/post-event",
      "EventCrunch AI-powered 'Audience Insights' report",
      "3 dedicated SMS announcements",
      "Sponsored content placement on Creator Pages",
      "Post-event highlight reel (edited by AI Studio)",
      "Access to attendee interest graph + lead scoring",
      "12 months retargeting pixel access"
    ],
    reach: {
      impressions: "35,000–60,000",
      engagements: "5,000–8,000",
      leads: "600+"
    }
  },
  {
    id: "2",
    title: "Gold Sponsorship Package",
    tier: "gold",
    industry: "Technology / SaaS",
    value: 55000,
    status: "Active Demo",
    contact: {
      name: "David Larson",
      email: "david.larson@demo-gold.com",
      phone: "(415) 555-4421"
    },
    overview: "A balanced package giving significant brand presence plus co-branded content and a measurable lead-gen component.",
    includes: [
      "Secondary branding on event landing pages",
      "One sponsored breakout session",
      "Co-branded newsletter send",
      "Sponsored session recording hosted via EventCrunch",
      "Lead-gen form with CRM passthrough",
      "AI-transcribed analytics summary",
      "1 SMS push",
      "Logo placement on event replay pages"
    ],
    reach: {
      impressions: "20,000–35,000",
      engagements: "3,000–5,000",
      leads: "300–500"
    }
  },
  {
    id: "3",
    title: "Silver Sponsorship Package",
    tier: "silver",
    industry: "Defense / GovTech",
    value: 25000,
    status: "Active Demo",
    contact: {
      name: "Olivia Brooks",
      email: "olivia.brooks@demo-silver.com",
      phone: "(703) 555-6778"
    },
    overview: "Cost-efficient package ideal for mid-tier sponsors looking for brand visibility + moderate leads.",
    includes: [
      "Logo placement on event page",
      "15-second pre-roll or slide",
      "Lead-gen form",
      "Sponsored giveaway",
      "Post-event email tag",
      "AI Performance Recap"
    ],
    reach: {
      impressions: "10,000–15,000",
      engagements: "1,000–2,000",
      leads: "100–200"
    }
  },
  {
    id: "4",
    title: "Bronze Sponsorship Package",
    tier: "bronze",
    industry: "Consulting / Professional Services",
    value: 12000,
    status: "Demo – Proposal Sent",
    contact: {
      name: "Mark Jensen",
      email: "mark.jensen@demo-bronze.com",
      phone: "(212) 555-3209"
    },
    overview: "Entry-tier sponsorship for early-stage partners or niche service providers.",
    includes: [
      "Logo on registration page",
      "Mention in event intro",
      "Inclusion in 'Meet Our Sponsors' banner",
      "Lead-gen form (basic)",
      "Automated AI Lead Summary"
    ],
    reach: {
      impressions: "5,000–7,500",
      engagements: "500–900",
      leads: "40–80"
    }
  },
  {
    id: "5",
    title: "Startup Showcase Package",
    tier: "startup",
    industry: "Any",
    value: 5000,
    status: "Demo – Available",
    contact: {
      name: "Tara Nguyen",
      email: "tara.nguyen@demo-startup.com",
      phone: "(650) 555-8822"
    },
    overview: "A lower-cost option for startups looking to get exposure without a heavy budget.",
    includes: [
      "Logo in showcase section",
      "Startup pitch spotlight",
      "EventCrunch AI profile boost",
      "Post-event attendee interest summary"
    ],
    reach: {
      impressions: "2,500–4,000",
      engagements: "300–500",
      leads: "20–40"
    }
  },
  {
    id: "6",
    title: "Category / Industry Takeover Package",
    tier: "takeover",
    industry: "Open",
    value: 75000,
    status: "Demo – High Impact",
    contact: {
      name: "Samuel Ortiz",
      email: "sam.ortiz@demo-takeover.com",
      phone: "(917) 555-2241"
    },
    overview: "This package gives the sponsor full ownership of a category such as 'Creator Tools,' 'Podcasting,' 'Health & Wellness,' etc.",
    includes: [
      "Category takeover badge across platform",
      "Sponsored playlist + curated content",
      "Full-page spotlight area",
      "Sponsored analytics dashboard",
      "Sponsored interview clip (AI studio auto-edit)",
      "Dedicated category email send",
      "Exclusive coupon code distribution",
      "Audience behavior and funnel dataset"
    ],
    reach: {
      impressions: "40,000–80,000",
      engagements: "10,000+",
      leads: "800–1,200"
    }
  }
];

const tierColors: Record<string, string> = {
  platinum: "bg-gradient-to-r from-slate-300 to-slate-500 text-slate-900",
  gold: "bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900",
  silver: "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800",
  bronze: "bg-gradient-to-r from-orange-400 to-orange-600 text-orange-900",
  startup: "bg-gradient-to-r from-blue-500 to-blue-600 text-blue-900",
  takeover: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
};

const DemoSponsorships = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalValue = demoSponsors.reduce((sum, s) => sum + s.value, 0);
  const activeDeals = demoSponsors.filter(s => s.status.includes("Active")).length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Demo Sponsorships</h1>
            <p className="text-muted-foreground mt-1">Sample sponsorship packages for demonstration</p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <Sparkles className="w-4 h-4 mr-1" />
            Demo Data
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Packages</p>
                  <p className="text-2xl font-bold text-foreground">{demoSponsors.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Target className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Deals</p>
                  <p className="text-2xl font-bold text-foreground">{activeDeals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold text-foreground">${totalValue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contacts</p>
                  <p className="text-2xl font-bold text-foreground">{demoSponsors.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sponsor Cards */}
        <div className="space-y-4">
          {demoSponsors.map((sponsor) => (
            <Card key={sponsor.id} className="bg-card border-border overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={`${tierColors[sponsor.tier]} border-0`}>
                      {sponsor.tier.charAt(0).toUpperCase() + sponsor.tier.slice(1)}
                    </Badge>
                    <CardTitle className="text-xl">{sponsor.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-muted-foreground">
                      {sponsor.status}
                    </Badge>
                    <span className="text-2xl font-bold text-primary">
                      ${sponsor.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span>{sponsor.industry}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{sponsor.contact.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{sponsor.contact.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{sponsor.contact.phone}</span>
                  </div>
                </div>

                <p className="text-muted-foreground">{sponsor.overview}</p>

                {/* Reach Stats */}
                <div className="grid grid-cols-3 gap-4 py-3 px-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <Eye className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Impressions</p>
                    <p className="font-semibold text-foreground">{sponsor.reach.impressions}</p>
                  </div>
                  <div className="text-center">
                    <Target className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Engagements</p>
                    <p className="font-semibold text-foreground">{sponsor.reach.engagements}</p>
                  </div>
                  <div className="text-center">
                    <Users className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Leads</p>
                    <p className="font-semibold text-foreground">{sponsor.reach.leads}</p>
                  </div>
                </div>

                {/* Expandable Benefits */}
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(expandedId === sponsor.id ? null : sponsor.id)}
                    className="w-full justify-between"
                  >
                    <span>Package Includes ({sponsor.includes.length} benefits)</span>
                    {expandedId === sponsor.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                  {expandedId === sponsor.id && (
                    <ul className="mt-3 space-y-2 pl-4">
                      {sponsor.includes.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DemoSponsorships;
