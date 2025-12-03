import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, BarChart3, Palette, Users, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const SolutionsMediaBrands = () => {
  const benefits = [
    "Multiple brands, one unified events infrastructure",
    "Shared audience data across all properties",
    "White-label branding for each brand and event",
    "Centralized reporting and analytics",
    "Revenue attribution by brand and campaign",
    "First-party data ownership"
  ];

  const useCases = [
    {
      icon: Building2,
      title: "Multi-Brand Events",
      description: "Run events under Military Times, Task & Purpose, and other brands from a single platform."
    },
    {
      icon: BarChart3,
      title: "Unified Analytics",
      description: "See cross-brand performance, audience overlap, and revenue in one dashboard."
    },
    {
      icon: Palette,
      title: "Brand Consistency",
      description: "Maintain unique brand identity while leveraging shared infrastructure."
    },
    {
      icon: Users,
      title: "Audience Growth",
      description: "Cross-promote events and grow audience across your brand portfolio."
    }
  ];

  return (
    <MarketingLayout>
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Solutions</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground">
              For Media Brands
            </h1>
            <p className="text-xl text-muted-foreground">
              One events infrastructure for all your media properties. White-label everything.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-bold text-foreground">Why Media Brands Choose Us</h2>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {useCases.map((useCase, index) => (
                <Card key={index} className="bg-gradient-card border-border p-6 space-y-3">
                  <useCase.icon className="w-8 h-8 text-primary" />
                  <h3 className="font-display font-bold text-foreground">{useCase.title}</h3>
                  <p className="text-sm text-muted-foreground">{useCase.description}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link to="/auth?mode=signup">
                Get a Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default SolutionsMediaBrands;
