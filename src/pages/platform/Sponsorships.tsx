import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  DollarSign, Package, FileText, PenTool, 
  Eye, Bell, ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

const PlatformSponsorships = () => {
  const features = [
    { icon: Package, title: "Sponsor Packages", description: "Gold, Silver, Bronze tiers or fully custom packages" },
    { icon: FileText, title: "Inventory Management", description: "Logos, stage mentions, booths, ad reads, newsletter placements" },
    { icon: PenTool, title: "Proposal Builder", description: "PandaDoc-style templates with dynamic event data" },
    { icon: FileText, title: "E-Signing", description: "Built-in electronic signatures for fast closes" },
    { icon: Eye, title: "View Tracking", description: "Track opens, time on page, and engagement metrics" },
    { icon: Bell, title: "Renewal Reminders", description: "Automated renewal reminders and next opportunity suggestions" },
  ];

  return (
    <MarketingLayout>
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Platform</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground">
              Sponsorships & Proposals
            </h1>
            <p className="text-xl text-muted-foreground">
              Turn every event or awards program into a sponsorship product line.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {features.map((feature, index) => (
              <Card key={index} className="bg-gradient-card border-border p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-display font-bold text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link to="/auth?mode=signup">
                Start Closing Sponsors
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default PlatformSponsorships;
