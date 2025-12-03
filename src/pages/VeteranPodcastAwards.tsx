import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Award, Users, Mic, TrendingUp, ArrowRight, CheckCircle, Play } from "lucide-react";
import { Link } from "react-router-dom";
import vpaLogo from "@/assets/veteran-podcast-awards-logo.png";

const VeteranPodcastAwards = () => {
  const results = [
    { number: "500+", label: "Nominations Received" },
    { number: "10K+", label: "Public Votes Cast" },
    { number: "$50K+", label: "Sponsor Revenue" },
    { number: "80%", label: "Operational Hours Saved" }
  ];

  const challenges = [
    "Manually tracking nominations via email and spreadsheets",
    "Coordinating 20+ judges across time zones",
    "Managing public voting without fraud",
    "Creating consistent ceremony materials"
  ];

  const solutions = [
    "Centralized nomination portal with custom forms",
    "Automated judge assignments and scoring interface",
    "IP-based vote limiting with real-time dashboards",
    "AI-generated winner citations and ceremony scripts"
  ];

  return (
    <MarketingLayout>
      <section className="py-24 px-6">
        <div className="container mx-auto">
          {/* Hero */}
          <div className="max-w-4xl mx-auto text-center mb-16 space-y-6">
            <img 
              src={vpaLogo} 
              alt="Veteran Podcast Awards" 
              className="w-40 h-40 mx-auto mb-4"
            />
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
              <Award className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Case Study</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground">
              Veteran Podcast Awards
            </h1>
            <p className="text-xl text-muted-foreground">
              How we transformed the industry's leading podcast awards program using our own platform.
            </p>
          </div>

          {/* Promo Video Section */}
          <div className="max-w-3xl mx-auto mb-16">
            <Card className="bg-dark-section border-border overflow-hidden">
              <div className="aspect-video flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-primary/20 mx-auto mb-4 flex items-center justify-center">
                    <Play className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-dark-foreground font-medium">Promo Video Coming Soon</p>
                  <p className="text-sm text-dark-muted mt-1">Share YouTube/Vimeo link to embed</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {results.map((result, index) => (
              <Card key={index} className="bg-gradient-card border-border p-6 text-center">
                <p className="text-4xl font-display font-bold text-primary mb-2">{result.number}</p>
                <p className="text-sm text-muted-foreground">{result.label}</p>
              </Card>
            ))}
          </div>

          {/* Overview */}
          <Card className="bg-gradient-card border-border p-8 mb-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Mic className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-4">Overview</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Veteran Podcast Awards recognizes excellence in podcast content created by and for the 
                  military and veteran community. With 15+ categories, hundreds of nominations, and thousands 
                  of public votes, it's the most comprehensive awards program in the veteran podcast space.
                </p>
              </div>
            </div>
          </Card>

          {/* Challenge & Solution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            <Card className="bg-gradient-card border-border p-8">
              <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <span className="text-destructive font-bold">!</span>
                </span>
                The Challenge
              </h2>
              <ul className="space-y-4">
                {challenges.map((challenge, index) => (
                  <li key={index} className="flex items-start gap-3 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    {challenge}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="bg-gradient-card border-border p-8">
              <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-primary" />
                </span>
                The Solution
              </h2>
              <ul className="space-y-4">
                {solutions.map((solution, index) => (
                  <li key={index} className="flex items-start gap-3 text-foreground">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    {solution}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Screenshots Placeholder */}
          <div className="mb-16">
            <h2 className="text-2xl font-display font-bold text-foreground mb-8 text-center">Platform in Action</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {["Nomination Portal", "Judge Scoring Interface", "Ceremony Page"].map((title, index) => (
                <Card key={index} className="bg-secondary border-border aspect-video flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-4 flex items-center justify-center">
                      <Award className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Screenshot coming soon</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">
              Ready to Run Your Own Awards Program?
            </h2>
            <p className="text-muted-foreground mb-6">
              Use the same platform that powers the Veteran Podcast Awards.
            </p>
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link to="/auth?mode=signup">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default VeteranPodcastAwards;
