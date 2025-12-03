import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DollarSign, Eye, BarChart3, Target, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const SolutionsSponsors = () => {
  const benefits = [
    "Clear ROI tracking and reporting",
    "Real-time lead capture and delivery",
    "Branded presence across digital and live events",
    "Direct access to military & veteran audiences",
    "Transparent engagement metrics",
    "Multi-event package opportunities"
  ];

  const useCases = [
    {
      icon: Target,
      title: "Targeted Reach",
      description: "Connect with verified military, veteran, and defense industry audiences."
    },
    {
      icon: BarChart3,
      title: "Measurable ROI",
      description: "Track impressions, leads, and conversions from your sponsorship."
    },
    {
      icon: Eye,
      title: "Premium Visibility",
      description: "Logo placement, speaking slots, and booth presence at major events."
    },
    {
      icon: DollarSign,
      title: "Flexible Packages",
      description: "From single-event to year-long partnerships across all brands."
    }
  ];

  return (
    <MarketingLayout>
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
              <DollarSign className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Solutions</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground">
              For Sponsors
            </h1>
            <p className="text-xl text-muted-foreground">
              Connect with the military & veteran community through premium event sponsorships.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-bold text-foreground">Why Sponsor With Us</h2>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {useCases.map((useCase, index) => (
                <Card key={index} className="bg-gradient-card border-border p-6 space-y-3">
                  <useCase.icon className="w-8 h-8 text-accent" />
                  <h3 className="font-display font-bold text-foreground">{useCase.title}</h3>
                  <p className="text-sm text-muted-foreground">{useCase.description}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link to="/auth?mode=signup">
                Become a Sponsor
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default SolutionsSponsors;
