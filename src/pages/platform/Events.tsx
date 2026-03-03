import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Calendar, QrCode, Ticket, Users, 
  BarChart3, Mail, Globe, Smartphone,
  ArrowRight, CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";

const PlatformEvents = () => {
  const features = [
    { icon: Calendar, title: "Event Types", description: "Live, virtual, and hybrid events with customizable formats" },
    { icon: Ticket, title: "Ticket Types", description: "Free, paid, donation, VIP, member, sponsor, and comp tickets" },
    { icon: QrCode, title: "Check-in", description: "QR codes, email codes, or manual check-in options" },
    { icon: Users, title: "Registration Forms", description: "Conditional logic and custom fields for any event type" },
    { icon: Mail, title: "Calendar Integration", description: "Automatic iCal invites and calendar syncing" },
    { icon: Smartphone, title: "Mobile-First", description: "Web-first, mobile-optimized event experience" },
  ];

  const workflow = [
    "Define event",
    "Add tickets",
    "Enable AI Event Architect",
    "Publish landing page",
    "Track registrations"
  ];

  return (
    <MarketingLayout>
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Platform</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground">
              Events
            </h1>
            <p className="text-xl text-muted-foreground">
              Eventbrite-class ticketing, but with first-party data, AI workflows, and full control.
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

          <Card className="bg-secondary/30 border-border p-8 mb-16">
            <h3 className="text-2xl font-display font-bold text-foreground mb-6 text-center">Event Workflow</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {workflow.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-foreground">{index + 1}</span>
                  </div>
                  <span className="text-foreground font-medium">{step}</span>
                  {index < workflow.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground ml-2" />
                  )}
                </div>
              ))}
            </div>
          </Card>

          <div className="text-center">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link to="/signup">
                Start Creating Events
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default PlatformEvents;
