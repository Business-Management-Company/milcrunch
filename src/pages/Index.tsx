import { Link } from "react-router-dom";
import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Calendar, Award, Users, Zap, Bot, 
  ArrowRight, CheckCircle, Sparkles, 
  Building2, BarChart3, FileText
} from "lucide-react";

const Index = () => {
  const features = [
    {
      icon: Calendar,
      title: "Live & Hybrid Events",
      description: "Paid, free, or donation-based tickets. QR check-in, capacity controls, and real-time reporting."
    },
    {
      icon: Award,
      title: "Awards & Nominations",
      description: "From Veteran Podcast Awards to Service Member of the Year—run nominations, judging, public voting, and winner announcements."
    },
    {
      icon: FileText,
      title: "Sponsorships & Proposals",
      description: "Close sponsors faster with pre-built proposal templates, e-signing, and performance dashboards."
    }
  ];

  const aiAgents = [
    {
      title: "Event Architect",
      description: "Describe your event; the agent drafts the schedule, registration flow, and pricing tiers."
    },
    {
      title: "Awards Designer",
      description: "Paste your theme; the agent generates categories, nomination questions, and judging rubric."
    },
    {
      title: "Sponsor Closer",
      description: "Select sponsor types; the agent drafts proposals and follow-up sequences."
    },
    {
      title: "Attendee Concierge",
      description: "Attendees ask 'When is my next session?' and the agent answers with their personal agenda."
    }
  ];

  const steps = [
    { number: "01", title: "Create", description: "Create your event or awards program" },
    { number: "02", title: "Configure", description: "Configure tickets, sponsors, and workflows" },
    { number: "03", title: "Launch", description: "Launch branded pages + track everything in real time" }
  ];

  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 backdrop-blur-sm border border-border">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Powered by EventsAwardsTravel.com</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-tight">
              Your All-In-One Events & Awards Platform for the{" "}
              <span className="text-gradient-primary">Military & Veteran</span>{" "}
              Community
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Design events, run awards programs, sell tickets, and sign sponsors—powered by AI agents that do the heavy lifting.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-primary transition-all hover:scale-105 h-14 px-8 text-lg">
                Book a Recurrent Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" asChild className="h-14 px-8 text-lg border-border hover:bg-secondary transition-all hover:scale-105">
                <Link to="/veteran-podcast-awards">
                  Explore Veteran Podcast Awards
                </Link>
              </Button>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Why Now Strip */}
      <section className="py-8 px-6 bg-accent/10 border-y border-accent/20">
        <div className="container mx-auto text-center">
          <p className="text-lg md:text-xl text-foreground font-medium">
            <span className="text-accent font-bold">Eventbrite just changed hands.</span>{" "}
            This is your moment to own the events stack for your brands instead of renting it.
          </p>
        </div>
      </section>

      {/* What You Can Run */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              What You Can Run
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              One platform for every type of military & veteran engagement
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group relative overflow-hidden bg-gradient-card border-border hover:border-primary/50 transition-all duration-500 hover:shadow-glow p-8">
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-foreground group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Built for Recurrent's Brands */}
      <section className="py-24 px-6 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Built for Recurrent's Brands
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Multiple brands, one events infrastructure
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            {["Military Times", "Task & Purpose", "Defense News", "Federal Times"].map((brand, index) => (
              <div key={index} className="px-8 py-4 bg-card rounded-xl border border-border">
                <span className="font-display font-semibold text-lg text-muted-foreground">{brand}</span>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: Building2, text: "Multiple brands, one events infrastructure" },
              { icon: Users, text: "Shared audience data and reporting" },
              { icon: Sparkles, text: "White-label branding per brand/event" }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
                <item.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-foreground text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Event Agents */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              AI Event Agents
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Automate the heavy lifting with intelligent agents
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {aiAgents.map((agent, index) => (
              <Card key={index} className="bg-gradient-card border-border hover:border-primary/50 transition-all duration-500 p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-sm">{index + 1}</span>
                    </div>
                    <h3 className="font-display font-bold text-foreground">{agent.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {agent.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              How It Works
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center">
                  <span className="text-3xl font-display font-bold text-primary-foreground">{step.number}</span>
                </div>
                <h3 className="text-xl font-display font-bold text-foreground">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Veteran Podcast Awards Proof */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <Card className="bg-gradient-card border-border p-12 text-center space-y-6">
            <Award className="w-16 h-16 text-accent mx-auto" />
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Veteran Podcast Awards is Our Flagship Example
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See how we built and run the industry's leading podcast awards using this exact platform.
            </p>
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link to="/veteran-podcast-awards">
                See How This Runs on the Platform
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-gradient-hero">
        <div className="container mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground">
            Ready to Own Your Events Stack?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stop renting infrastructure. Start owning your audience and data.
          </p>
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-primary transition-all hover:scale-105 h-14 px-8 text-lg">
            Request Licensing Options
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default Index;
