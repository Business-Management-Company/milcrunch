import { Link } from "react-router-dom";
import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Calendar, Award, Users, Zap, Bot, 
  ArrowRight, CheckCircle, Sparkles, 
  Building2, BarChart3, FileText, Play
} from "lucide-react";
import PlatformBuilder from "@/components/PlatformBuilder";

// Import images
import heroEventImage from "@/assets/hero-event.jpg";
import podcasterImage from "@/assets/podcaster.jpg";
import awardsCeremonyImage from "@/assets/awards-ceremony.jpg";
import speakerEventImage from "@/assets/speaker-event.jpg";

const Index = () => {
  const features = [
    {
      icon: Calendar,
      title: "Live & Hybrid Events",
      description: "Paid, free, or donation-based tickets. QR check-in, capacity controls, and real-time reporting.",
      image: speakerEventImage,
    },
    {
      icon: Award,
      title: "Awards & Nominations",
      description: "From Veteran Podcast Awards to Service Member of the Year—run nominations, judging, public voting, and winner announcements.",
      image: awardsCeremonyImage,
    },
    {
      icon: FileText,
      title: "Sponsorships & Proposals",
      description: "Close sponsors faster with pre-built proposal templates, e-signing, and performance dashboards.",
      image: podcasterImage,
    }
  ];

  const aiAgents = [
    {
      title: "Event Architect",
      description: "Describe your event; the agent drafts the schedule, registration flow, and pricing tiers.",
      color: "bg-primary/10 text-primary border-primary/20"
    },
    {
      title: "Awards Designer",
      description: "Paste your theme; the agent generates categories, nomination questions, and judging rubric.",
      color: "bg-accent/10 text-accent border-accent/20"
    },
    {
      title: "Sponsor Closer",
      description: "Select sponsor types; the agent drafts proposals and follow-up sequences.",
      color: "bg-emerald-50 text-emerald-600 border-emerald-200"
    },
    {
      title: "Attendee Concierge",
      description: "Attendees ask 'When is my next session?' and the agent answers with their personal agenda.",
      color: "bg-purple-50 text-purple-600 border-purple-200"
    }
  ];

  const steps = [
    { number: "01", title: "Create", description: "Create your event or awards program" },
    { number: "02", title: "Configure", description: "Configure tickets, sponsors, and workflows" },
    { number: "03", title: "Launch", description: "Launch branded pages + track everything in real time" }
  ];

  const stats = [
    { value: "10K+", label: "Nominations Processed" },
    { value: "500+", label: "Events Managed" },
    { value: "$2M+", label: "Sponsorship Revenue" },
    { value: "50%", label: "Time Saved" },
  ];

  return (
    <MarketingLayout>
      {/* Hero Section - Bright with Image */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-hero">
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Powered by EventsAwardsTravel.com</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight leading-tight text-foreground">
                Your All-In-One Events & Awards Platform for the{" "}
                <span className="text-gradient-primary">Military & Veteran</span>{" "}
                Community
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
                Design events, run awards programs, sell tickets, and sign sponsors—powered by AI agents that do the heavy lifting.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-primary transition-all hover:scale-105 h-14 px-8 text-lg">
                  Book a Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" asChild className="h-14 px-8 text-lg border-border hover:bg-secondary transition-all hover:scale-105">
                  <Link to="/veteran-podcast-awards">
                    <Play className="mr-2 h-5 w-5" />
                    See Case Study
                  </Link>
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-6 pt-4">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl font-display font-bold text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden shadow-elevated">
                <img 
                  src={heroEventImage} 
                  alt="Military veterans networking at conference event" 
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
              </div>
              {/* Floating stats card */}
              <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-xl shadow-elevated border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground">1,200+</div>
                    <div className="text-sm text-muted-foreground">Attendees registered</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Now Strip - Dark Section */}
      <section className="py-8 px-6 bg-dark-section">
        <div className="container mx-auto text-center">
          <p className="text-lg md:text-xl font-medium">
            <span className="text-accent font-bold">Eventbrite just changed hands.</span>{" "}
            <span className="text-dark-foreground">This is your moment to own the events stack for your brands instead of renting it.</span>
          </p>
        </div>
      </section>

      {/* What You Can Run - With Images */}
      <section className="py-24 px-6 bg-background">
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
              <Card key={index} className="group relative overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-500 hover:shadow-elevated">
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground group-hover:text-primary transition-colors">
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

      {/* Built for Media Brands - Dark Section */}
      <section className="py-24 px-6 bg-dark-section">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-dark-foreground">
              Built for Media Brands
            </h2>
            <p className="text-xl text-dark-muted max-w-2xl mx-auto">
              Multiple brands, one events infrastructure
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: Building2, text: "Multiple brands, one events infrastructure" },
              { icon: Users, text: "Shared audience data and reporting" },
              { icon: Sparkles, text: "White-label branding per brand/event" }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <item.icon className="w-5 h-5 text-accent flex-shrink-0" />
                <span className="text-dark-foreground text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Platform Builder */}
      <PlatformBuilder />

      {/* AI Event Agents - White Section */}
      <section className="py-24 px-6 bg-background">
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
              <Card key={index} className={`border-2 ${agent.color} transition-all duration-500 hover:shadow-elevated p-6`}>
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

      {/* How It Works - Dark Section */}
      <section className="py-24 px-6 bg-dark-section">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-dark-foreground">
              How It Works
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center">
                  <span className="text-3xl font-display font-bold text-primary-foreground">{step.number}</span>
                </div>
                <h3 className="text-xl font-display font-bold text-dark-foreground">{step.title}</h3>
                <p className="text-dark-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Veteran Podcast Awards Proof - With Image */}
      <section className="py-24 px-6 bg-background">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-elevated">
                <img 
                  src={awardsCeremonyImage} 
                  alt="Awards ceremony with golden trophy"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-accent text-accent-foreground p-4 rounded-xl shadow-elevated">
                <Award className="w-8 h-8" />
              </div>
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Veteran Podcast Awards is Our Flagship Example
              </h2>
              <p className="text-xl text-muted-foreground">
                See how we built and run the industry's leading podcast awards using this exact platform.
              </p>
              <ul className="space-y-3">
                {[
                  "2,500+ nominations processed",
                  "50 expert judges onboarded",
                  "100,000+ public votes cast",
                  "20+ sponsors secured"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link to="/veteran-podcast-awards">
                  See How This Runs on the Platform
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Gradient */}
      <section className="py-24 px-6 bg-gradient-primary">
        <div className="container mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-primary-foreground">
            Ready to Own Your Events Stack?
          </h2>
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Stop renting infrastructure. Start owning your audience and data.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold transition-all hover:scale-105 h-14 px-8 text-lg">
              Request Licensing Options
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" asChild className="h-14 px-8 text-lg border-white/30 text-primary-foreground hover:bg-white/10">
              <Link to="/auth">
                Sign In to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default Index;
