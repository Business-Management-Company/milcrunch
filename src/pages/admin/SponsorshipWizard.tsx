import { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Plus, Trash2, Sparkles, Loader2,
  DollarSign, Star, Award, Trophy, Crown, Check, Eye,
  Building, Mail, Phone, Globe, Download, FileText, Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import MarkdownRenderer from "@/components/ui/markdown-renderer";

interface SponsorPackage {
  id: string;
  name: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "custom";
  price: number;
  maxSponsors: number | null;
  benefits: string[];
  inventory: Record<string, number>;
  description: string;
  isActive: boolean;
}

interface Benefit {
  id: string;
  label: string;
  category: string;
}

const TIER_CONFIG = {
  bronze: { icon: Award, color: "text-amber-700", bg: "bg-amber-100", border: "border-amber-300" },
  silver: { icon: Star, color: "text-slate-500", bg: "bg-slate-100", border: "border-slate-300" },
  gold: { icon: Trophy, color: "text-yellow-600", bg: "bg-yellow-100", border: "border-yellow-400" },
  platinum: { icon: Crown, color: "text-purple-600", bg: "bg-purple-100", border: "border-purple-400" },
  custom: { icon: Star, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
};

const DEFAULT_BENEFITS: Benefit[] = [
  // Logo Placement
  { id: "logo_website", label: "Logo on event website", category: "Logo Placement" },
  { id: "logo_email", label: "Logo in email communications", category: "Logo Placement" },
  { id: "logo_signage", label: "Logo on event signage", category: "Logo Placement" },
  { id: "logo_stage", label: "Logo on main stage backdrop", category: "Logo Placement" },
  { id: "logo_swag", label: "Logo on event swag", category: "Logo Placement" },
  // Tickets & Access
  { id: "tickets_vip", label: "VIP event tickets", category: "Tickets & Access" },
  { id: "tickets_general", label: "General admission tickets", category: "Tickets & Access" },
  { id: "access_backstage", label: "Backstage access", category: "Tickets & Access" },
  { id: "access_vip_lounge", label: "VIP lounge access", category: "Tickets & Access" },
  // Booth & Space
  { id: "booth_standard", label: "Standard booth space", category: "Booth & Space" },
  { id: "booth_premium", label: "Premium booth location", category: "Booth & Space" },
  { id: "booth_branded", label: "Branded booth setup", category: "Booth & Space" },
  // Speaking & Content
  { id: "speaking_slot", label: "Speaking slot", category: "Speaking & Content" },
  { id: "panel_participation", label: "Panel participation", category: "Speaking & Content" },
  { id: "sponsored_session", label: "Sponsored session", category: "Speaking & Content" },
  { id: "video_promo", label: "Promo video played during event", category: "Speaking & Content" },
  // Marketing
  { id: "social_mentions", label: "Social media mentions", category: "Marketing" },
  { id: "email_feature", label: "Featured in email blast", category: "Marketing" },
  { id: "press_release", label: "Included in press release", category: "Marketing" },
  { id: "swag_bag_insert", label: "Swag bag insert", category: "Marketing" },
  // Data & Leads
  { id: "lead_list", label: "Attendee lead list", category: "Data & Leads" },
  { id: "lead_scanner", label: "Lead scanner app access", category: "Data & Leads" },
  { id: "survey_questions", label: "Custom survey questions", category: "Data & Leads" },
  // Hospitality
  { id: "dinner_vip", label: "VIP dinner invitation", category: "Hospitality" },
  { id: "reception_access", label: "Reception access", category: "Hospitality" },
  { id: "hotel_discount", label: "Hotel discount code", category: "Hospitality" },
];

const WIZARD_STEPS = [
  { id: "packages", label: "Create Packages" },
  { id: "benefits", label: "Configure Benefits" },
  { id: "ai", label: "AI Generator" },
  { id: "review", label: "Review & Publish" },
];

const SponsorshipWizard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { eventId } = useParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [packages, setPackages] = useState<SponsorPackage[]>([
    {
      id: "1",
      name: "Bronze Sponsor",
      tier: "bronze",
      price: 2500,
      maxSponsors: 10,
      benefits: ["logo_website", "logo_email", "tickets_general"],
      inventory: { tickets_general: 2 },
      description: "Entry-level sponsorship with brand visibility",
      isActive: true,
    },
    {
      id: "2",
      name: "Silver Sponsor",
      tier: "silver",
      price: 5000,
      maxSponsors: 5,
      benefits: ["logo_website", "logo_email", "logo_signage", "tickets_general", "tickets_vip", "social_mentions"],
      inventory: { tickets_general: 4, tickets_vip: 2, social_mentions: 3 },
      description: "Enhanced visibility with booth space",
      isActive: true,
    },
    {
      id: "3",
      name: "Gold Sponsor",
      tier: "gold",
      price: 10000,
      maxSponsors: 3,
      benefits: ["logo_website", "logo_email", "logo_signage", "logo_stage", "tickets_vip", "booth_standard", "speaking_slot", "lead_list"],
      inventory: { tickets_vip: 6, social_mentions: 5 },
      description: "Premium sponsorship with speaking opportunity",
      isActive: true,
    },
    {
      id: "4",
      name: "Platinum Sponsor",
      tier: "platinum",
      price: 25000,
      maxSponsors: 1,
      benefits: ["logo_website", "logo_email", "logo_signage", "logo_stage", "logo_swag", "tickets_vip", "access_backstage", "booth_premium", "speaking_slot", "sponsored_session", "lead_list", "dinner_vip"],
      inventory: { tickets_vip: 10 },
      description: "Title sponsor with maximum exposure",
      isActive: true,
    },
  ]);

  const [aiPrompt, setAiPrompt] = useState("");
  const [generatedProspectus, setGeneratedProspectus] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const addPackage = () => {
    const newPackage: SponsorPackage = {
      id: Date.now().toString(),
      name: "New Package",
      tier: "custom",
      price: 0,
      maxSponsors: null,
      benefits: [],
      inventory: {},
      description: "",
      isActive: true,
    };
    setPackages([...packages, newPackage]);
    toast.success("Package added");
  };

  const updatePackage = (id: string, updates: Partial<SponsorPackage>) => {
    setPackages(packages.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removePackage = (id: string) => {
    setPackages(packages.filter(p => p.id !== id));
    toast.success("Package removed");
  };

  const toggleBenefit = (packageId: string, benefitId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return;

    const newBenefits = pkg.benefits.includes(benefitId)
      ? pkg.benefits.filter(b => b !== benefitId)
      : [...pkg.benefits, benefitId];

    updatePackage(packageId, { benefits: newBenefits });
  };

  const handleAIGenerate = async (type: "prospectus" | "email" | "pricing") => {
    setIsGenerating(true);
    
    try {
      // Simulate AI generation - in production, this would call the Lovable AI edge function
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (type === "prospectus") {
        setGeneratedProspectus(`
# Sponsorship Prospectus

## Event Overview
Join us as a sponsor for this premier event bringing together industry leaders and innovators.

## Why Sponsor?
- **500+ Attendees** - Connect with decision-makers
- **Industry Leaders** - Network with top executives
- **Media Coverage** - National and local press coverage
- **Brand Visibility** - Multi-channel exposure

## Sponsorship Tiers

${packages.map(pkg => `
### ${pkg.name} - $${pkg.price.toLocaleString()}
${pkg.description}

**Benefits Include:**
${pkg.benefits.map(b => `- ${DEFAULT_BENEFITS.find(db => db.id === b)?.label || b}`).join('\n')}
`).join('\n')}

## Contact Us
Ready to become a sponsor? Contact our sponsorship team today.
        `);
        toast.success("Prospectus generated!");
      } else if (type === "email") {
        setGeneratedEmail(`
Subject: Exclusive Sponsorship Opportunity - [Event Name]

Dear [Sponsor Name],

I hope this message finds you well. I'm reaching out because [Company] would be a perfect fit as a sponsor for our upcoming event.

**Why Partner With Us:**
• Direct access to 500+ qualified attendees
• Premium brand visibility across all channels
• Speaking opportunities and thought leadership
• Comprehensive lead generation package

We have sponsorship packages starting at $${Math.min(...packages.map(p => p.price)).toLocaleString()}, with our premium ${packages.find(p => p.tier === 'platinum')?.name} tier at $${packages.find(p => p.tier === 'platinum')?.price.toLocaleString()}.

Would you be available for a brief call this week to discuss how we can create a customized package for [Company]?

Best regards,
[Your Name]
        `);
        toast.success("Email template generated!");
      } else if (type === "pricing") {
        // AI suggests pricing adjustments
        const avgPrice = packages.reduce((sum, p) => sum + p.price, 0) / packages.length;
        setPackages(packages.map((pkg, i) => ({
          ...pkg,
          price: Math.round((avgPrice * (0.5 + i * 0.5)) / 100) * 100
        })));
        toast.success("Pricing optimized!");
      }
    } catch (error) {
      toast.error("Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!eventId) {
      toast.error("No event selected");
      return;
    }

    setIsSaving(true);
    try {
      // Save packages to database
      for (const pkg of packages) {
        const { error } = await supabase.from("sponsor_packages").upsert({
          id: pkg.id.length > 20 ? undefined : pkg.id, // Only use ID if it's a UUID
          event_id: eventId,
          name: pkg.name,
          tier: pkg.tier,
          price: pkg.price,
          max_sponsors: pkg.maxSponsors,
          benefits: pkg.benefits,
          inventory: pkg.inventory,
          description: pkg.description,
          is_active: pkg.isActive,
        });

        if (error) throw error;
      }

      toast.success("Sponsorship packages saved!");
      navigate("/admin/sponsors");
    } catch (error) {
      console.error("Error saving packages:", error);
      toast.error("Failed to save packages");
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-headline font-bold text-foreground">Sponsorship Packages</h2>
                <p className="text-muted-foreground">Create and customize your sponsorship tiers</p>
              </div>
              <Button onClick={addPackage}>
                <Plus className="w-4 h-4 mr-2" />
                Add Package
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {packages.map((pkg) => {
                const TierIcon = TIER_CONFIG[pkg.tier].icon;
                const tierConfig = TIER_CONFIG[pkg.tier];

                return (
                  <Card
                    key={pkg.id}
                    className={cn(
                      "p-6 border-2 transition-all",
                      tierConfig.border,
                      !pkg.isActive && "opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", tierConfig.bg)}>
                          <TierIcon className={cn("w-5 h-5", tierConfig.color)} />
                        </div>
                        <div>
                          <Input
                            value={pkg.name}
                            onChange={(e) => updatePackage(pkg.id, { name: e.target.value })}
                            className="font-semibold text-foreground border-0 p-0 h-auto text-lg focus-visible:ring-0"
                          />
                          <Select
                            value={pkg.tier}
                            onValueChange={(v) => updatePackage(pkg.id, { tier: v as any })}
                          >
                            <SelectTrigger className="h-auto p-0 border-0 text-xs text-muted-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bronze">Bronze Tier</SelectItem>
                              <SelectItem value="silver">Silver Tier</SelectItem>
                              <SelectItem value="gold">Gold Tier</SelectItem>
                              <SelectItem value="platinum">Platinum Tier</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={pkg.isActive}
                          onCheckedChange={(checked) => updatePackage(pkg.id, { isActive: checked })}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePackage(pkg.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Price</Label>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <Input
                              type="number"
                              value={pkg.price}
                              onChange={(e) => updatePackage(pkg.id, { price: parseInt(e.target.value) || 0 })}
                              className="border-0 p-0 h-auto text-2xl font-bold focus-visible:ring-0"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Max Sponsors</Label>
                          <Input
                            type="number"
                            value={pkg.maxSponsors || ""}
                            onChange={(e) => updatePackage(pkg.id, { maxSponsors: parseInt(e.target.value) || null })}
                            placeholder="Unlimited"
                            className="w-24"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Textarea
                          value={pkg.description}
                          onChange={(e) => updatePackage(pkg.id, { description: e.target.value })}
                          placeholder="Package description..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Benefits ({pkg.benefits.length})</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pkg.benefits.slice(0, 5).map(benefitId => {
                            const benefit = DEFAULT_BENEFITS.find(b => b.id === benefitId);
                            return (
                              <Badge key={benefitId} variant="secondary" className="text-xs">
                                {benefit?.label.split(" ").slice(0, 2).join(" ")}
                              </Badge>
                            );
                          })}
                          {pkg.benefits.length > 5 && (
                            <Badge variant="outline" className="text-xs">+{pkg.benefits.length - 5} more</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-headline font-bold text-foreground">Configure Benefits</h2>
              <p className="text-muted-foreground">Select benefits for each sponsorship package</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-foreground">Benefit</th>
                    {packages.map(pkg => (
                      <th key={pkg.id} className="text-center py-3 px-4 font-medium text-foreground min-w-[100px]">
                        {pkg.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(
                    DEFAULT_BENEFITS.reduce((acc, benefit) => {
                      if (!acc[benefit.category]) acc[benefit.category] = [];
                      acc[benefit.category].push(benefit);
                      return acc;
                    }, {} as Record<string, Benefit[]>)
                  ).map(([category, benefits]) => (
                    <>
                      <tr key={category} className="bg-secondary/30">
                        <td colSpan={packages.length + 1} className="py-2 px-4 font-semibold text-foreground text-sm">
                          {category}
                        </td>
                      </tr>
                      {benefits.map(benefit => (
                        <tr key={benefit.id} className="border-b border-border hover:bg-secondary/10">
                          <td className="py-2 px-4 text-sm text-foreground">{benefit.label}</td>
                          {packages.map(pkg => (
                            <td key={pkg.id} className="text-center py-2 px-4">
                              <Checkbox
                                checked={pkg.benefits.includes(benefit.id)}
                                onCheckedChange={() => toggleBenefit(pkg.id, benefit.id)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-headline font-bold text-foreground">AI Sponsor Tools</h2>
              <p className="text-muted-foreground">Generate prospectus, outreach emails, and optimize pricing</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 bg-gradient-card border-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Prospectus Generator</h3>
                    <p className="text-xs text-muted-foreground">Create a PDF-ready document</p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleAIGenerate("prospectus")}
                  disabled={isGenerating}
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate Prospectus
                </Button>
              </Card>

              <Card className="p-6 bg-gradient-card border-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Pitch Email</h3>
                    <p className="text-xs text-muted-foreground">Outreach email template</p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => handleAIGenerate("email")}
                  disabled={isGenerating}
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate Email
                </Button>
              </Card>

              <Card className="p-6 bg-gradient-card border-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Price Optimizer</h3>
                    <p className="text-xs text-muted-foreground">AI-suggested pricing</p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleAIGenerate("pricing")}
                  disabled={isGenerating}
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Optimize Pricing
                </Button>
              </Card>
            </div>

            {generatedProspectus && (
              <Card className="p-6 bg-gradient-card border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Generated Prospectus</h3>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
                <div className="bg-secondary/30 p-4 rounded-lg overflow-auto max-h-96">
                  <MarkdownRenderer content={generatedProspectus} />
                </div>
              </Card>
            )}

            {generatedEmail && (
              <Card className="p-6 bg-gradient-card border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Generated Email Template</h3>
                  <Button variant="outline" size="sm">
                    <Send className="w-4 h-4 mr-2" />
                    Copy Template
                  </Button>
                </div>
                <div className="bg-secondary/30 p-4 rounded-lg overflow-auto max-h-96">
                  <MarkdownRenderer content={generatedEmail} />
                </div>
              </Card>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-headline font-bold text-foreground">Review & Publish</h2>
              <p className="text-muted-foreground">Review your sponsorship packages before publishing</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.filter(p => p.isActive).map((pkg) => {
                const TierIcon = TIER_CONFIG[pkg.tier].icon;
                const tierConfig = TIER_CONFIG[pkg.tier];

                return (
                  <Card
                    key={pkg.id}
                    className={cn("p-6 border-2", tierConfig.border)}
                  >
                    <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4", tierConfig.bg)}>
                      <TierIcon className={cn("w-6 h-6", tierConfig.color)} />
                    </div>
                    <h3 className="font-headline font-bold text-foreground mb-1">{pkg.name}</h3>
                    <p className="text-3xl font-bold text-foreground mb-2">${pkg.price.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>
                    
                    <div className="space-y-2">
                      {pkg.benefits.slice(0, 6).map(benefitId => {
                        const benefit = DEFAULT_BENEFITS.find(b => b.id === benefitId);
                        return (
                          <div key={benefitId} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="text-foreground">{benefit?.label}</span>
                          </div>
                        );
                      })}
                      {pkg.benefits.length > 6 && (
                        <p className="text-sm text-muted-foreground">+ {pkg.benefits.length - 6} more benefits</p>
                      )}
                    </div>

                    {pkg.maxSponsors && (
                      <p className="text-xs text-muted-foreground mt-4">
                        Limited to {pkg.maxSponsors} sponsors
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>

            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Ready to publish?</h3>
                  <p className="text-sm text-muted-foreground">
                    {packages.filter(p => p.isActive).length} active packages • 
                    Total potential revenue: ${packages.filter(p => p.isActive).reduce((sum, p) => sum + (p.price * (p.maxSponsors || 10)), 0).toLocaleString()}
                  </p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} size="lg">
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Publish Packages
                </Button>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/sponsors">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="font-headline font-bold text-foreground">Sponsorship Package Wizard</h1>
                <p className="text-sm text-muted-foreground">Create and manage sponsorship tiers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="border-b border-border bg-secondary/30">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between max-w-2xl mx-auto mb-4">
            {WIZARD_STEPS.map((step, index) => (
              <div
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  index <= currentStep ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  index < currentStep ? "bg-primary text-primary-foreground" :
                  index === currentStep ? "bg-primary/20 text-primary border-2 border-primary" :
                  "bg-muted text-muted-foreground"
                )}>
                  {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span className="hidden sm:inline font-medium">{step.label}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {renderStep()}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < WIZARD_STEPS.length - 1 && (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SponsorshipWizard;
