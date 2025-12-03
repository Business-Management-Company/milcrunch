import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Pricing = () => {
  const plans = [
    {
      name: "Per-Event Pilot",
      description: "Perfect for testing with a single event",
      features: [
        "Single event license",
        "Up to 1,000 registrations",
        "Basic ticketing & check-in",
        "Standard support",
        "30-day analytics access"
      ],
      cta: "Start Pilot",
      popular: false
    },
    {
      name: "Brand License",
      description: "Ideal for single media brand operations",
      features: [
        "Unlimited events per brand",
        "Unlimited registrations",
        "Full awards & nominations",
        "Sponsorship management",
        "AI Event Agents",
        "White-label branding",
        "Priority support",
        "Dedicated success manager"
      ],
      cta: "Contact Sales",
      popular: true
    },
    {
      name: "Network License",
      description: "For multi-brand media companies",
      features: [
        "All brands included",
        "Cross-brand analytics",
        "Shared audience data",
        "Custom integrations",
        "API access",
        "SLA guarantee",
        "24/7 support",
        "On-site training"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <MarketingLayout>
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-6">
            <h1 className="text-4xl md:text-6xl font-headline font-bold text-foreground">
              Pricing & Licensing
            </h1>
            <p className="text-xl text-muted-foreground">
              Flexible options for pilots, single brands, or entire media networks
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative bg-gradient-card border-border p-8 flex flex-col ${
                  plan.popular ? "border-primary ring-2 ring-primary/20" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-xl font-headline font-bold text-foreground mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
                
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-muted-foreground mb-4">
              Need a custom solution? We're happy to discuss.
            </p>
            <Button variant="outline" asChild>
              <a href="mailto:sales@eventsawardstravel.com">
                Talk to Sales
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default Pricing;
