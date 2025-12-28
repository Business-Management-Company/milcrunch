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
import heroCollage from "@/assets/hero-events-fun.jpg";
import featureInPerson from "@/assets/feature-in-person.jpg";
import featureVirtual from "@/assets/feature-virtual.jpg";
import featureHybrid from "@/assets/feature-hybrid.jpg";
import awardsCeremonyImage from "@/assets/awards-ceremony.jpg";

const Index = () => {
  const features = [
    {
      icon: Calendar,
      title: "In-Person Events",
      description: "Full-scale conferences, workshops, and networking sessions with QR check-in, capacity controls, and real-time reporting.",
      image: featureInPerson,
      gradient: "from-rocket-orange/30 via-rocket-flame/20",
      accent: "bg-primary"
    },
    {
      icon: Users,
      title: "Virtual Events",
      description: "Webinars, online summits, and digital conferences with seamless streaming, attendee engagement tools, and analytics.",
      image: featureVirtual,
      gradient: "from-cosmic-purple/30 via-accent/20",
      accent: "bg-accent"
    },
    {
      icon: Zap,
      title: "Hybrid Events",
      description: "The best of both worlds—combine in-person and virtual audiences for maximum reach and engagement.",
      image: featureHybrid,
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
      {/* Hero Section - Netflix Style Collage */}
      <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
        {/* Netflix-style Background Collage */}
        <div className="absolute inset-0">
          <img 
            src={heroCollage} 
            alt="Events and conferences collage" 
            className="w-full h-full object-cover scale-110"
          />
          {/* Heavy gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background" />
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/40 to-background/80" />
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight leading-[1.05]">
              <span className="text-foreground">Events, Awards</span>
              <br />
              <span className="text-foreground">& Sponsorships</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The all-in-one platform to launch, manage, and scale your events with AI-powered automation.
            </p>
            
            {/* Netflix-style email signup */}
            <div className="max-w-xl mx-auto pt-4">
              <p className="text-muted-foreground mb-4">Ready to launch? Enter your email to get started.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="email" 
                  placeholder="Email address"
                  className="flex-1 h-14 px-6 rounded-lg bg-secondary/80 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent backdrop-blur-sm"
                />
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-14 px-8 text-lg transition-all hover:scale-105">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center gap-8 pt-8">
              {stats.map((stat, i) => (
                <AnimatedStat key={i} value={stat.value} label={stat.label} className="text-center" />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent" />
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

      {/* Interactive Platform Builder - Moved up */}
      <PlatformBuilder />

      {/* Event Formats - What You Can Run */}
      <section className="py-24 px-6 bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Event Formats</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-foreground">
              Run Any Type of Event
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose your format—we handle the rest
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

      {/* Platform Solutions - What's Included */}
      <section className="py-24 px-6 bg-dark-section">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Platform</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-dark-foreground">
              Everything You Need
            </h2>
            <p className="text-xl text-dark-muted max-w-2xl mx-auto">
              Ticketing, marketing, awards, and sponsorships—all in one place
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Calendar, title: "Event Ticketing", description: "Sell tickets with flexible pricing, promo codes, and group discounts" },
              { icon: Award, title: "Awards Programs", description: "Run nominations, judging panels, and public voting campaigns" },
              { icon: FileText, title: "Sponsorships", description: "Create proposals, track engagement, and close deals faster" },
              { icon: BarChart3, title: "Analytics", description: "Real-time dashboards for sales, attendance, and engagement" }
            ].map((item, index) => (
              <div key={index} className="p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-headline font-bold text-lg text-dark-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-dark-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories - Powered by Platform */}
      <section className="py-24 px-6 bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
              <Star className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Case Studies</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-foreground">
              Powered by Event Rocket
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See what's possible with our platform
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Tech Summit Card */}
            <Card className="group relative overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-500 hover:shadow-elevated">
              <div className="relative aspect-[16/10] overflow-hidden">
                <img 
                  src={featureInPerson} 
                  alt="Tech Innovation Summit"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-primary/10 to-transparent opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold uppercase tracking-wide shadow-lg">
                  Conference
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl md:text-3xl font-headline font-bold text-white mb-2 drop-shadow-lg">
                    Tech Innovation Summit
                  </h3>
                  <p className="text-white/80 text-sm md:text-base max-w-md">
                    Annual conference bringing together 2,500+ tech leaders
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  {[
                    { value: "2.5K", label: "Attendees" },
                    { value: "45", label: "Speakers" },
                    { value: "$150K", label: "Revenue" },
                    { value: "12", label: "Sponsors" }
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
                >
                  <Link to="/demo">
                    View Demo
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Global Awards Card */}
            <Card className="group relative overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-500 hover:shadow-elevated">
              <div className="relative aspect-[16/10] overflow-hidden">
                <img 
                  src={awardsCeremonyImage} 
                  alt="Global Marketing Awards"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-accent/20 via-accent/10 to-transparent opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-accent text-white text-xs font-bold uppercase tracking-wide shadow-lg">
                  Awards Program
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl md:text-3xl font-headline font-bold text-white mb-2 drop-shadow-lg">
                    Global Marketing Awards
                  </h3>
                  <p className="text-white/80 text-sm md:text-base max-w-md">
                    Industry-leading awards celebrating marketing excellence
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  {[
                    { value: "800+", label: "Nominations" },
                    { value: "30", label: "Categories" },
                    { value: "25K", label: "Votes" },
                    { value: "18", label: "Sponsors" }
                  ].map((stat, i) => (
                    <div key={i}>
                      <div className="text-lg font-bold text-foreground">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <Button asChild variant="outline" className="w-full border-border hover:bg-secondary group-hover:scale-[1.02] transition-transform">
                  <Link to="/demo">
                    Explore Awards
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

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
