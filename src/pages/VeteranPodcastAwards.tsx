import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Award, Mic, ArrowRight, CheckCircle, Volume2, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useRef } from "react";
import vpaLogo from "@/assets/veteran-podcast-awards-logo.png";

const VIDEO_URL = "https://swposmlpipmdwocpkfwc.supabase.co/storage/v1/object/public/videos/Logo%20version_1029.mp4";

const VeteranPodcastAwards = () => {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

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
      {/* Cinematic Video Hero */}
      <section className="relative h-[80vh] min-h-[600px] overflow-hidden bg-black">
        {/* Video Background */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
          <img 
            src={vpaLogo} 
            alt="Veteran Podcast Awards" 
            className="w-32 h-32 md:w-40 md:h-40 mb-6 animate-fade-in drop-shadow-2xl"
          />
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6 animate-fade-in">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-white">Case Study</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white text-center mb-4 animate-fade-in drop-shadow-lg">
            Veteran Podcast Awards
          </h1>
          <p className="text-lg md:text-xl text-white/80 text-center max-w-2xl animate-fade-in">
            How we transformed the industry's leading podcast awards program using our own platform.
          </p>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={toggleMute}
          className="absolute bottom-6 right-6 z-20 p-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/40 flex items-start justify-center p-2">
            <div className="w-1.5 h-2.5 bg-white/60 rounded-full" />
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="container mx-auto">

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
