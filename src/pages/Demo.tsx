import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, MapPin, Users, Trophy, Award, 
  ArrowRight, Ticket, Building2, Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import demoHeroImage from "@/assets/demo-hero.jpg";

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  start_date: string;
  venue: string;
  city: string;
  state: string;
  cover_image_url: string;
}

interface AwardProgram {
  id: string;
  title: string;
  slug: string;
  description: string;
  year: number;
  nomination_start: string;
  nomination_end: string;
}

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  industries: string[];
}

const Demo = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [awards, setAwards] = useState<AwardProgram[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [eventsRes, awardsRes, sponsorsRes] = await Promise.all([
        supabase.from("events").select("*").eq("is_published", true).limit(3),
        supabase.from("award_programs").select("*").eq("is_published", true).limit(2),
        supabase.from("sponsors").select("*").limit(6),
      ]);

      if (eventsRes.data) setEvents(eventsRes.data);
      if (awardsRes.data) setAwards(awardsRes.data);
      if (sponsorsRes.data) setSponsors(sponsorsRes.data);
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${demoHeroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        
        <div className="container mx-auto px-6 relative z-10 text-center space-y-6">
          <Badge variant="secondary" className="text-sm px-4 py-2">
            <Star className="w-4 h-4 mr-2 inline" />
            Live Platform Demo
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight">
            Events & Awards
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Platform
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            The complete infrastructure for running world-class events, awards programs, 
            and sponsorship management—all in one platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" asChild className="shadow-glow">
              <Link to="/admin/events">
                View Admin Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/pricing">See Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold">Upcoming Events</h2>
              <p className="text-muted-foreground mt-2">Live, virtual, and hybrid experiences</p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/admin/events">View All</Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-80 animate-pulse bg-muted" />
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <Card key={event.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Calendar className="w-16 h-16 text-primary/50" />
                  </div>
                  <div className="p-6 space-y-4">
                    <h3 className="text-xl font-display font-bold group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {event.start_date ? format(new Date(event.start_date), "MMM d, yyyy") : "TBD"}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {event.city && event.state ? `${event.city}, ${event.state}` : event.venue || "Virtual"}
                      </div>
                    </div>
                    <Button size="sm" className="w-full" asChild>
                      <Link to={`/events/${event.slug}`}>
                        <Ticket className="w-4 h-4 mr-2" />
                        Get Tickets
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No published events yet</p>
            </Card>
          )}
        </div>
      </section>

      {/* Awards Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold">Awards Programs</h2>
              <p className="text-muted-foreground mt-2">Recognizing excellence in our community</p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/admin/awards">View All</Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <Card key={i} className="h-64 animate-pulse bg-muted" />
              ))}
            </div>
          ) : awards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {awards.map((award) => (
                <Card key={award.id} className="p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                      <Trophy className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-display font-bold">{award.title}</h3>
                        <Badge variant="secondary">{award.year}</Badge>
                      </div>
                      <p className="text-muted-foreground">{award.description}</p>
                      <div className="flex gap-3 pt-2">
                        <Button size="sm" asChild>
                          <Link to="/nominate">
                            <Award className="w-4 h-4 mr-2" />
                            Nominate
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/veteran-podcast-awards">Learn More</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No published awards programs yet</p>
            </Card>
          )}
        </div>
      </section>

      {/* Sponsors Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold">Our Sponsors</h2>
            <p className="text-muted-foreground mt-2">Partnering with industry leaders</p>
          </div>

          {sponsors.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {sponsors.map((sponsor) => (
                <Card key={sponsor.id} className="p-6 flex items-center justify-center hover:shadow-lg transition-all duration-300 group">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-secondary to-muted flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Building2 className="w-8 h-8 text-primary" />
                    </div>
                    <p className="font-medium text-sm">{sponsor.name}</p>
                    {sponsor.industries?.[0] && (
                      <p className="text-xs text-muted-foreground mt-1">{sponsor.industries[0]}</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No sponsors yet</p>
            </Card>
          )}

          <div className="text-center mt-10">
            <Button variant="outline" asChild>
              <Link to="/admin/sponsors">
                Become a Sponsor
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <div className="container mx-auto text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-display font-bold">
            Ready to Launch Your Event?
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Join organizations using EventCrunch to create memorable experiences 
            and build thriving communities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default Demo;
