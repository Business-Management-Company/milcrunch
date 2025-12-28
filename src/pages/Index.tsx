import { Link } from "react-router-dom";
import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Calendar, Award, Users, Zap, Bot, 
  ArrowRight, CheckCircle, Sparkles, 
  Building2, BarChart3, FileText, Play, Star, TrendingUp, Rocket
} from "lucide-react";
import PlatformBuilder from "@/components/PlatformBuilder";
import FeaturedEventCard from "@/components/FeaturedEventCard";
import AnimatedStat from "@/components/AnimatedStat";

// Import images
import rocketHeroImage from "@/assets/rocket-hero.jpg";
import podcasterImage from "@/assets/podcaster.jpg";
import awardsCeremonyImage from "@/assets/awards-ceremony.jpg";
import veteranNetworkingEvent from "@/assets/veteran-networking-event.jpg";
import vpaLogo from "@/assets/veteran-podcast-awards-logo.png";
import nmpdImage from "@/assets/national-military-podcast-day.png";

const Index = () => {
  const features = [
    {
      icon: Calendar,
      title: "Live & Hybrid Events",
      description: "Paid, free, or donation-based tickets. QR check-in, capacity controls, and real-time reporting.",
      image: podcasterImage,
      gradient: "from-rocket-orange/30 via-rocket-flame/20",
      accent: "bg-primary"
    },
    {
      icon: Award,
      title: "Awards & Nominations",
      description: "Run nominations, judging panels, public voting, and winner announcements—all in one place.",
      image: awardsCeremonyImage,
      gradient: "from-cosmic-purple/30 via-accent/20",
      accent: "bg-accent"
    },
    {
      icon: FileText,
      title: "Sponsorships & Proposals",
      description: "Close sponsors faster with pre-built proposal templates, e-signing, and performance dashboards.",
      image: veteranNetworkingEvent,
      gradient: "from-primary/30 via-rocket-flame/20",
      accent: "bg-primary"
    }
  ];

  const aiAgents = [
    {
      title: "Event Architect",
      description: "Describe your event; the agent drafts the schedule, registration flow, and pricing tiers.",
      icon: Calendar,
      gradient: "from-primary to-rocket-flame"
    },
    {
      title: "Awards Designer",
      description: "Paste your theme; the agent generates categories, nomination questions, and judging rubric.",
      icon: Award,
      gradient: "from-accent to-cosmic-purple"
    },
    {
      title: "Sponsor Closer",
      description: "Select sponsor types; the agent drafts proposals and follow-up sequences.",
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      title: "Attendee Concierge",
      description: "Attendees ask 'When is my next session?' and the agent answers with their personal agenda.",
      icon: Users,
      gradient: "from-cosmic-purple to-accent"
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
      {/* Hero Section - Rocket Launch Theme */}
      <section className="relative min-h-[95vh] flex items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={rocketHeroImage} 
            alt="Rocket launching into space" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-sm animate-pulse-glow">
              <Rocket className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Launch Your Events to New Heights</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.1]">
              <span className="text-foreground">Your Events</span>
              <br />
              <span className="text-gradient-primary">Deserve Liftoff</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
              The all-in-one platform for events and awards. Create, manage, and scale with AI-powered automation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-bold shadow-rocket transition-all hover:scale-105 h-14 px-8 text-lg animate-rocket-glow">
                <Rocket className="mr-2 h-5 w-5" />
                Launch Now
              </Button>
              <Button size="lg" variant="outline" asChild className="h-14 px-8 text-lg border-border bg-background/50 backdrop-blur-sm hover:bg-secondary transition-all hover:scale-105">
                <Link to="/demo">
                  <Play className="mr-2 h-5 w-5" />
                  See It In Action
                </Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-6 pt-4">
              {stats.map((stat, i) => (
                <AnimatedStat key={i} value={stat.value} label={stat.label} className="text-center" />
              ))}
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Why Now Strip - Dark Section */}
      <section className="py-12 px-6 bg-dark-section">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-center md:text-left">
            <div className="flex-1 max-w-3xl">
              <p className="text-lg md:text-xl font-medium">
                <span className="text-accent font-bold">Eventbrite was just acquired for $500M.</span>{" "}
                <span className="text-dark-foreground">
                  This is your moment to own your events infrastructure—stop paying per-ticket fees and platform subscriptions.
                </span>
              </p>
            </div>
            <a 
              href="https://techcrunch.com/2025/12/02/bending-spoons-agrees-to-buy-eventbrite-for-500m-to-revive-stalled-brand/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-dark-foreground text-sm font-medium transition-all hover:scale-105 whitespace-nowrap"
            >
              Read the news
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Featured Events Showcase - Moved up */}
      <section className="py-24 px-6 bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
              <Star className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Success Stories</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-foreground">
              Powered by Our Platform
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Real events and awards programs running on our infrastructure
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* VPA Card */}
            <Card className="group relative overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-500 hover:shadow-elevated">
              <div className="relative aspect-[16/10] overflow-hidden">
                <img 
                  src={nmpdImage} 
                  alt="Veteran Podcast Awards"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 via-orange-500/10 to-transparent opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                
                {/* Logo */}
                <div className="absolute top-4 left-4">
                  <img src={vpaLogo} alt="" className="w-16 h-16 rounded-xl shadow-lg bg-white/10 backdrop-blur-sm p-2" />
                </div>

                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-bold uppercase tracking-wide shadow-lg">
                  Flagship Awards
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl md:text-3xl font-headline font-bold text-white mb-2 drop-shadow-lg">
                    Veteran Podcast Awards
                  </h3>
                  <p className="text-white/80 text-sm md:text-base max-w-md">
                    The industry's leading awards for military & veteran podcast content
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  {[
                    { value: "500+", label: "Nominations" },
                    { value: "50", label: "Judges" },
                    { value: "10K+", label: "Votes" },
                    { value: "20+", label: "Sponsors" }
                  ].map((stat, i) => (
                    <div key={i}>
                      <div className="text-lg font-bold text-foreground">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <Button 
                  asChild 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground group-hover:scale-[1.02] transition-transform"
                  onClick={() => window.scrollTo(0, 0)}
                >
                  <Link to="/veteran-podcast-awards" onClick={() => window.scrollTo(0, 0)}>
                    View Case Study
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </Card>

            {/* NMPD Card */}
            <Card className="group relative overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-500 hover:shadow-elevated">
              <div className="relative aspect-[16/10] overflow-hidden">
                <img 
                  src={awardsCeremonyImage} 
                  alt="National Military Podcast Day"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 via-cyan-500/10 to-transparent opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-blue-500 text-white text-xs font-bold uppercase tracking-wide shadow-lg">
                  Annual Event
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl md:text-3xl font-headline font-bold text-white mb-2 drop-shadow-lg">
                    National Military Podcast Day
                  </h3>
                  <p className="text-white/80 text-sm md:text-base max-w-md">
                    The premier celebration bringing together military podcasters nationwide
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm">Annual Event</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm">5,000+ Expected</span>
                  </div>
                </div>

                <Button asChild variant="outline" className="w-full border-border hover:bg-secondary group-hover:scale-[1.02] transition-transform">
                  <Link to="/veteran-podcast-awards">
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* What You Can Run - Premium Cards */}
      <section className="py-24 px-6 bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-foreground">
              What You Can Run
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              One platform for every type of event and engagement
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group relative overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-500 hover:shadow-elevated hover:-translate-y-2">
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${feature.gradient} to-transparent opacity-60`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Floating icon */}
                  <div className={`absolute top-4 right-4 w-12 h-12 ${feature.accent} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Title on image */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-2xl font-headline font-bold text-white drop-shadow-lg">
                      {feature.title}
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="mt-4 flex items-center text-primary font-medium group-hover:gap-2 transition-all">
                    <span>Learn more</span>
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Built for Scale - Dark Section */}
      <section className="py-24 px-6 bg-dark-section">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-dark-foreground">
              Built for Scale
            </h2>
            <p className="text-xl text-dark-muted max-w-2xl mx-auto">
              From startup events to enterprise conferences
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: Building2, text: "Multiple brands, one unified platform" },
              { icon: Users, text: "Shared audience data and reporting" },
              { icon: Sparkles, text: "White-label branding per event" }
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

      {/* AI Event Agents - Premium Section */}
      <section className="py-24 px-6 bg-background overflow-hidden">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-foreground">
              AI Event Agents
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Automate the heavy lifting with intelligent agents
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {aiAgents.map((agent, index) => (
              <Card key={index} className="group relative overflow-hidden border-border hover:border-primary/50 transition-all duration-500 hover:shadow-elevated hover:-translate-y-2 bg-card">
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${agent.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                
                <div className="relative p-6 space-y-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <agent.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-headline font-bold text-xl text-foreground">{agent.title}</h3>
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
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-dark-foreground">
              How It Works
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center">
                  <span className="text-3xl font-headline font-bold text-primary-foreground">{step.number}</span>
                </div>
                <h3 className="text-xl font-headline font-bold text-dark-foreground">{step.title}</h3>
                <p className="text-dark-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - Gradient */}
      <section className="py-24 px-6 bg-gradient-primary">
        <div className="container mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-primary-foreground">
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
            <Button size="lg" variant="outline" asChild className="h-14 px-8 text-lg border-white text-white hover:bg-white/20">
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
