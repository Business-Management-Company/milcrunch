import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Calendar, MapPin, Users, Monitor, Wifi, Search, 
  ArrowRight, Filter, ChevronLeft, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type EventType = "live" | "virtual" | "hybrid";

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  event_type: EventType;
  cover_image_url: string | null;
  slug: string;
}

const eventTypeConfig: Record<EventType, { label: string; icon: any; color: string }> = {
  live: { label: "In-Person", icon: MapPin, color: "bg-primary" },
  virtual: { label: "Virtual", icon: Monitor, color: "bg-accent" },
  hybrid: { label: "Hybrid", icon: Wifi, color: "bg-cosmic-purple" },
};

const EventsCalendar = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<EventType | "all">("all");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, start_date, end_date, venue, city, state, event_type, cover_image_url, slug")
        .eq("is_published", true)
        .order("start_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "all" || event.event_type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // Sample events for display when DB is empty
  const sampleEvents: Event[] = [
    {
      id: "sample-1",
      title: "Tech Innovation Summit 2025",
      description: "Join industry leaders for cutting-edge insights on AI, blockchain, and emerging technologies.",
      start_date: "2025-03-15T09:00:00",
      end_date: "2025-03-16T17:00:00",
      venue: "Convention Center",
      city: "San Francisco",
      state: "CA",
      event_type: "hybrid",
      cover_image_url: null,
      slug: "tech-innovation-summit-2025"
    },
    {
      id: "sample-2",
      title: "Global Marketing Conference",
      description: "Learn the latest strategies in digital marketing, brand building, and customer acquisition.",
      start_date: "2025-04-22T10:00:00",
      end_date: "2025-04-23T16:00:00",
      venue: "Virtual Event",
      city: "Online",
      state: null,
      event_type: "virtual",
      cover_image_url: null,
      slug: "global-marketing-conference"
    },
    {
      id: "sample-3",
      title: "Startup Pitch Night",
      description: "Watch promising startups pitch to top VCs. Network with founders and investors.",
      start_date: "2025-02-28T18:00:00",
      end_date: "2025-02-28T21:00:00",
      venue: "Startup Hub",
      city: "Austin",
      state: "TX",
      event_type: "live",
      cover_image_url: null,
      slug: "startup-pitch-night"
    },
    {
      id: "sample-4",
      title: "Product Management Workshop",
      description: "Hands-on workshop covering roadmapping, prioritization, and stakeholder management.",
      start_date: "2025-05-10T09:00:00",
      end_date: "2025-05-10T17:00:00",
      venue: "Online + NYC Office",
      city: "New York",
      state: "NY",
      event_type: "hybrid",
      cover_image_url: null,
      slug: "product-management-workshop"
    },
    {
      id: "sample-5",
      title: "DevOps Days Conference",
      description: "Deep dive into CI/CD, cloud infrastructure, and site reliability engineering.",
      start_date: "2025-06-05T08:00:00",
      end_date: "2025-06-06T18:00:00",
      venue: "Tech Center",
      city: "Seattle",
      state: "WA",
      event_type: "live",
      cover_image_url: null,
      slug: "devops-days-conference"
    },
    {
      id: "sample-6",
      title: "UX Design Masterclass",
      description: "Learn user research, prototyping, and design thinking from industry experts.",
      start_date: "2025-04-08T14:00:00",
      end_date: "2025-04-08T18:00:00",
      venue: "Virtual",
      city: "Online",
      state: null,
      event_type: "virtual",
      cover_image_url: null,
      slug: "ux-design-masterclass"
    }
  ];

  const displayEvents = filteredEvents.length > 0 ? filteredEvents : 
    sampleEvents.filter((event) => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === "all" || event.event_type === activeFilter;
      return matchesSearch && matchesFilter;
    });

  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="py-20 px-6 bg-gradient-hero">
        <div className="container mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Discover Events</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground">
            Events <span className="text-gradient-primary">Calendar</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find your next conference, workshop, or networking event. Filter by format and location.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 px-6 border-b border-border bg-card/50 sticky top-16 z-40 backdrop-blur-xl">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search events, locations..." 
                className="pl-10 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Event Type Filters */}
            <div className="flex gap-2 flex-wrap justify-center">
              <Button
                variant={activeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("all")}
                className={activeFilter === "all" ? "bg-gradient-primary" : ""}
              >
                All Events
              </Button>
              {(Object.keys(eventTypeConfig) as EventType[]).map((type) => {
                const config = eventTypeConfig[type];
                const Icon = config.icon;
                return (
                  <Button
                    key={type}
                    variant={activeFilter === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter(type)}
                    className={activeFilter === type ? config.color : ""}
                  >
                    <Icon className="w-4 h-4 mr-1" />
                    {config.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-16 px-6 bg-background">
        <div className="container mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="h-80 bg-card animate-pulse" />
              ))}
            </div>
          ) : displayEvents.length === 0 ? (
            <div className="text-center py-20">
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No events found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayEvents.map((event) => {
                const typeConfig = eventTypeConfig[event.event_type];
                const TypeIcon = typeConfig.icon;
                
                return (
                  <Card 
                    key={event.id} 
                    className="group overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1"
                  >
                    {/* Event Image or Gradient */}
                    <div className="aspect-[16/9] relative overflow-hidden">
                      {event.cover_image_url ? (
                        <img 
                          src={event.cover_image_url} 
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className={`w-full h-full ${typeConfig.color} opacity-80`} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                      
                      {/* Event Type Badge */}
                      <Badge className={`absolute top-4 right-4 ${typeConfig.color} text-white`}>
                        <TypeIcon className="w-3 h-3 mr-1" />
                        {typeConfig.label}
                      </Badge>

                      {/* Date */}
                      {event.start_date && (
                        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-2 text-center">
                          <div className="text-xs text-muted-foreground uppercase">
                            {format(new Date(event.start_date), "MMM")}
                          </div>
                          <div className="text-xl font-bold text-foreground">
                            {format(new Date(event.start_date), "dd")}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-5 space-y-3">
                      <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                      
                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {event.event_type === "virtual" ? (
                          <>
                            <Monitor className="w-4 h-4" />
                            <span>Online Event</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="w-4 h-4" />
                            <span>{event.city}{event.state && `, ${event.state}`}</span>
                          </>
                        )}
                      </div>

                      <Button 
                        asChild 
                        variant="ghost" 
                        className="w-full justify-between group-hover:bg-primary/10 group-hover:text-primary"
                      >
                        <Link to={`/events/${event.slug}`}>
                          View Details
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-dark-section">
        <div className="container mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-dark-foreground">
            Ready to Launch Your Event?
          </h2>
          <p className="text-lg text-dark-muted max-w-xl mx-auto">
            Create and manage in-person, virtual, or hybrid events with our all-in-one platform.
          </p>
          <Button size="lg" asChild className="bg-gradient-primary hover:opacity-90 shadow-rocket">
            <Link to="/auth?mode=signup">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default EventsCalendar;
