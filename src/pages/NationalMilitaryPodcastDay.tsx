import { useState } from "react";
import { Calendar, MapPin, Clock, Users, Mic, Heart, Star, Bell, CheckCircle } from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MarketingLayout from "@/components/layout/MarketingLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import nmpodLogo from "@/assets/national-military-podcast-day.png";
import podcast1 from "@/assets/podcast-1.jpg";
import podcast2 from "@/assets/podcast-2.jpg";
import podcast3 from "@/assets/podcast-3.jpg";
import podcast4 from "@/assets/podcast-4.jpg";
import podcast5 from "@/assets/podcast-5.jpg";
import podcast6 from "@/assets/podcast-6.jpg";
import speakerEvent from "@/assets/speaker-event.jpg";
import awardsCeremony from "@/assets/awards-ceremony.jpg";

const NationalMilitaryPodcastDay = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsLoading(true);
      try {
        const { error } = await supabase
          .from('email_signups')
          .insert({ email, source: 'national-military-podcast-day' });

        if (error) throw error;

        setIsSubmitted(true);
        toast({
          title: "You're on the list!",
          description: "We'll send you a reminder as we get closer to National Military Podcast Day.",
        });
        setEmail("");
      } catch (error) {
        toast({
          title: "Something went wrong",
          description: "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const highlights = [
    {
      icon: Mic,
      title: "Amplify Veteran Voices",
      description: "Celebrate the podcasters who share military stories, insights, and experiences with the world."
    },
    {
      icon: Heart,
      title: "Honor Service & Sacrifice",
      description: "Recognize the incredible journeys of service members and veterans through powerful storytelling."
    },
    {
      icon: Users,
      title: "Build Community",
      description: "Connect with fellow listeners, podcasters, and supporters of the military community."
    },
    {
      icon: Star,
      title: "Discover New Shows",
      description: "Find your next favorite podcast from our curated list of military and veteran content creators."
    }
  ];

  const featuredPodcasters = [
    { image: podcast1, name: "Warriors & Veterans", category: "Combat Stories" },
    { image: podcast2, name: "Military Families United", category: "Family Life" },
    { image: podcast3, name: "Transition Tales", category: "Career & Transition" },
    { image: podcast4, name: "Veteran Entrepreneurs", category: "Business" },
    { image: podcast5, name: "Service & Sacrifice", category: "History" },
    { image: podcast6, name: "Healing Heroes", category: "Mental Health" },
  ];

  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.1),transparent_50%)]"></div>
        
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="secondary" className="text-sm px-4 py-2">
              <Calendar className="w-4 h-4 mr-2 inline" />
              Coming Soon • 2025
            </Badge>
            
            <img 
              src={nmpodLogo} 
              alt="National Military Podcast Day" 
              className="w-64 md:w-80 mx-auto drop-shadow-lg"
            />
            
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight">
              Celebrating the Voices That Share Our
              <span className="text-primary"> Service Members</span> &
              <span className="text-accent"> Veterans' Stories</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join us in honoring the podcasters who dedicate their platforms to amplifying 
              military voices, sharing untold stories, and building bridges between the 
              military community and civilians.
            </p>

            {/* Countdown Timer */}
            <CountdownTimer 
              targetDate={new Date("2025-11-11T00:00:00")} 
              label="Countdown to National Military Podcast Day"
            />

            {/* Registration Form */}
            <Card className="max-w-md mx-auto p-6 bg-card/80 backdrop-blur-sm border-primary/20 mt-8">
              <h3 className="font-headline text-xl font-bold mb-4">Get Reminded</h3>
              {isSubmitted ? (
                <div className="flex items-center justify-center gap-2 text-primary py-4">
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-medium">You're on the list!</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Be the first to know about events, featured podcasts, and how you can participate.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading}>
                      <Bell className="w-4 h-4 mr-2" />
                      {isLoading ? "Saving..." : "Remind Me"}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* Why It Matters */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-foreground mb-4">
              Why National Military Podcast Day Matters
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Military podcasters provide a unique platform for veterans and service members 
              to share their experiences, connect with audiences, and make an impact.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((item, index) => (
              <Card key={index} className="p-6 bg-card hover:shadow-lg transition-all duration-300 hover:border-primary/50 group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-headline text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Images */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-foreground mb-4">
              Voices of Our Military Community
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Meet some of the incredible podcasters sharing stories of service, sacrifice, and strength.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {featuredPodcasters.map((podcaster, index) => (
              <Card key={index} className="group overflow-hidden bg-card hover:shadow-xl transition-all duration-500">
                <div className="aspect-square overflow-hidden relative">
                  <img 
                    src={podcaster.image} 
                    alt={podcaster.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <Badge variant="secondary" className="text-xs">{podcaster.category}</Badge>
                    <h4 className="font-headline font-bold text-foreground mt-1">{podcaster.name}</h4>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Event Images */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-foreground">
                More Than Just a Day—It's a Movement
              </h2>
              <p className="text-lg text-muted-foreground">
                National Military Podcast Day is part of a larger effort to recognize, 
                celebrate, and support the military podcasting community. From the 
                annual Veteran Podcast Awards to community events and listener 
                appreciation campaigns, we're building something special.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-headline font-bold">Annual Celebration</h4>
                    <p className="text-muted-foreground text-sm">A dedicated day to spotlight military podcasters nationwide</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Star className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-headline font-bold">Award Recognition</h4>
                    <p className="text-muted-foreground text-sm">Connected to the Veteran Podcast Awards celebrating excellence</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-headline font-bold">Community Events</h4>
                    <p className="text-muted-foreground text-sm">Live events, virtual meetups, and listener appreciation</p>
                  </div>
                </div>
              </div>
              <Button size="lg" asChild>
                <a href="/veteran-podcast-awards">
                  Learn About the Veteran Podcast Awards
                </a>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img 
                src={speakerEvent} 
                alt="Speaker at military podcast event" 
                className="rounded-xl shadow-lg w-full h-48 object-cover"
              />
              <img 
                src={awardsCeremony} 
                alt="Awards ceremony" 
                className="rounded-xl shadow-lg w-full h-48 object-cover mt-8"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold mb-4">
            Ready to Celebrate Military Podcasters?
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
            Sign up for updates and be part of something meaningful. Together, 
            we can amplify the voices that matter most.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <a href="/nominate">Nominate a Podcast</a>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
              <a href="/veteran-podcast-awards">View Past Winners</a>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default NationalMilitaryPodcastDay;
