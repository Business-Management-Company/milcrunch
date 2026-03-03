import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Award, Mic, ArrowRight, CheckCircle, Volume2, VolumeX, Calendar, MapPin, Users, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useRef } from "react";
import vpaLogo from "@/assets/veteran-podcast-awards-logo.png";
import nmpd from "@/assets/national-military-podcast-day.png";
import AnimatedStatCard from "@/components/AnimatedStatCard";

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
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-headline font-bold text-white text-center mb-4 animate-fade-in drop-shadow-lg">
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
              <AnimatedStatCard key={index} value={result.number} label={result.label} />
            ))}
          </div>

          {/* Overview */}
          <Card className="bg-gradient-card border-border p-8 mb-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Mic className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-headline font-bold text-foreground mb-4">Overview</h2>
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
              <h2 className="text-2xl font-headline font-bold text-foreground mb-6 flex items-center gap-3">
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
              <h2 className="text-2xl font-headline font-bold text-foreground mb-6 flex items-center gap-3">
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

          {/* Screenshots Placeholder - Enhanced */}
          <div className="mb-16">
            <h2 className="text-2xl font-headline font-bold text-foreground mb-8 text-center">Platform in Action</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Nomination Portal", icon: Mic, gradient: "from-blue-500 to-cyan-500", description: "Submit & track nominations" },
                { title: "Judge Scoring Interface", icon: Award, gradient: "from-amber-500 to-orange-500", description: "Score & evaluate entries" },
                { title: "Ceremony Page", icon: Sparkles, gradient: "from-blue-600 to-pink-500", description: "Celebrate the winners" }
              ].map((item, index) => (
                <Card key={index} className="relative overflow-hidden bg-gradient-to-br from-secondary via-secondary to-muted border-border aspect-video flex items-center justify-center group hover:border-primary/50 transition-all duration-500 hover:shadow-elevated hover:-translate-y-2">
                  {/* Animated gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                  
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-accent/5 to-transparent rounded-tr-full" />
                  
                  {/* Animated border glow */}
                  <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-sm -z-10" />
                  
                  <div className="relative text-center p-6 z-10">
                    {/* Icon with gradient background */}
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} mx-auto mb-4 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    
                    {/* Title */}
                    <p className="text-foreground font-semibold text-lg group-hover:text-primary transition-colors">{item.title}</p>
                    
                    {/* Description */}
                    <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                    
                    {/* Coming soon badge */}
                    <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs text-primary font-medium">Coming Soon</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* National Military Podcast Day Section */}
      <section className="py-24 px-6 bg-dark-section">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image Side */}
            <div className="relative group">
              <div className="relative rounded-2xl overflow-hidden shadow-elevated">
                <img 
                  src={nmpd} 
                  alt="National Military Podcast Day"
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-accent text-accent-foreground p-3 rounded-xl shadow-elevated">
                <Calendar className="w-6 h-6" />
              </div>
              {/* Stats card */}
              <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-xl shadow-elevated border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-sm">5,000+</div>
                    <div className="text-xs text-muted-foreground">Expected Attendees</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Side */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/30">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-accent">Featured Event</span>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-headline font-bold text-dark-foreground">
                National Military Podcast Day
              </h2>
              
              <p className="text-xl text-dark-muted leading-relaxed">
                The premier celebration of military podcasting, bringing together content creators, 
                veterans, and enthusiasts for a day of networking, learning, and recognition.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2 text-dark-muted">
                  <Calendar className="w-5 h-5 text-accent" />
                  <span>Annual Event</span>
                </div>
                <div className="flex items-center gap-2 text-dark-muted">
                  <MapPin className="w-5 h-5 text-accent" />
                  <span>Nationwide</span>
                </div>
              </div>

              <ul className="space-y-3 pt-2">
                {[
                  "Live streaming panels & workshops",
                  "Podcast meetups across the country",
                  "Special awards ceremony",
                  "Sponsor showcase opportunities"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-dark-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground mt-4">
                Learn More About NMPD
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-primary">
        <div className="container mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary-foreground">
            Ready to Run Your Own Awards Program?
          </h2>
          <p className="text-xl text-primary-foreground/80 max-w-xl mx-auto">
            Use the same platform that powers the Veteran Podcast Awards.
          </p>
          <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90 font-semibold transition-all hover:scale-105 h-14 px-8 text-lg">
            <Link to="/signup">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default VeteranPodcastAwards;
