import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar, MapPin, Clock, Users, Share2, Heart, 
  ChevronRight, Play, Star, MessageSquare, ArrowLeft,
  Ticket, Globe, Building, Video, Check, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  event_type: 'live' | 'virtual' | 'hybrid';
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  timezone: string | null;
  image_url: string | null;
  capacity: number | null;
  is_published: boolean;
}

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  quantity: number | null;
  quantity_sold: number | null;
  benefits: any;
  early_bird_price: number | null;
  early_bird_deadline: string | null;
  sales_start: string | null;
  sales_end: string | null;
  is_active: boolean;
}

interface Speaker {
  id: string;
  name: string;
  title: string;
  bio: string;
  image: string;
}

interface AgendaItem {
  time: string;
  title: string;
  description: string;
  speaker?: string;
}

const EventDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isFollowing, setIsFollowing] = useState(false);

  // Mock data for demo - in production, these would come from DB
  const speakers: Speaker[] = [
    { id: "1", name: "Sarah Mitchell", title: "CEO, VetConnect", bio: "Veteran entrepreneur and speaker", image: "" },
    { id: "2", name: "James Rodriguez", title: "Director, Military Affairs", bio: "20-year Army veteran", image: "" },
    { id: "3", name: "Dr. Lisa Chen", title: "Chief Medical Officer", bio: "VA Healthcare specialist", image: "" },
  ];

  const agenda: AgendaItem[] = [
    { time: "9:00 AM", title: "Registration & Networking", description: "Coffee and badge pickup" },
    { time: "10:00 AM", title: "Opening Keynote", description: "The Future of Veteran Support", speaker: "Sarah Mitchell" },
    { time: "11:30 AM", title: "Panel Discussion", description: "Transitioning from Military to Civilian Careers" },
    { time: "1:00 PM", title: "Lunch Break", description: "Networking lunch with sponsors" },
    { time: "2:30 PM", title: "Breakout Sessions", description: "Choose from 5 specialized tracks" },
    { time: "4:30 PM", title: "Closing Remarks", description: "Awards and next steps" },
  ];

  const faqs = [
    { question: "What's included in my ticket?", answer: "Your ticket includes access to all sessions, networking events, lunch, and event swag." },
    { question: "Is there parking available?", answer: "Yes, complimentary parking is available in the venue garage." },
    { question: "Can I get a refund?", answer: "Full refunds are available up to 7 days before the event. After that, tickets are non-refundable but transferable." },
    { question: "Is the venue wheelchair accessible?", answer: "Yes, the venue is fully ADA compliant with accessible entrances, restrooms, and seating." },
  ];

  useEffect(() => {
    fetchEvent();
  }, [slug]);

  const fetchEvent = async () => {
    if (!slug) return;
    
    try {
      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch tickets
      const { data: ticketData, error: ticketError } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventData.id)
        .eq("is_active", true)
        .order("sort_order");

      if (ticketError) throw ticketError;
      setTickets(ticketData || []);
      
      if (ticketData && ticketData.length > 0) {
        setSelectedTicket(ticketData[0].id);
      }
    } catch (error) {
      console.error("Error fetching event:", error);
      toast.error("Event not found");
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "live": return Building;
      case "virtual": return Globe;
      case "hybrid": return Video;
      default: return Building;
    }
  };

  const getTicketPrice = (ticket: TicketType) => {
    const now = new Date();
    if (ticket.early_bird_deadline && ticket.early_bird_price && new Date(ticket.early_bird_deadline) > now) {
      return ticket.early_bird_price;
    }
    return ticket.price || 0;
  };

  const isEarlyBird = (ticket: TicketType) => {
    if (!ticket.early_bird_deadline || !ticket.early_bird_price) return false;
    return new Date(ticket.early_bird_deadline) > new Date();
  };

  const getAvailability = (ticket: TicketType) => {
    if (!ticket.quantity) return { available: true, remaining: null };
    const remaining = ticket.quantity - (ticket.quantity_sold || 0);
    return { available: remaining > 0, remaining };
  };

  const handleRegister = () => {
    if (!selectedTicket) {
      toast.error("Please select a ticket");
      return;
    }
    navigate(`/events/${slug}/checkout?ticket=${selectedTicket}&qty=${quantity}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Event Not Found</h2>
          <p className="text-muted-foreground mb-4">This event doesn't exist or has been removed.</p>
          <Button asChild>
            <Link to="/">Browse Events</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const EventTypeIcon = getEventTypeIcon(event.event_type);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-[400px] md:h-[500px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: event.image_url
              ? `url(${event.image_url})`
              : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <div className="absolute top-4 left-4">
          <Button variant="ghost" size="sm" asChild className="bg-background/80 hover:bg-background">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="container mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                <EventTypeIcon className="w-3 h-3 mr-1" />
                {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)} Event
              </Badge>
              {event.start_date && (
                <Badge variant="outline" className="bg-background/80">
                  {format(new Date(event.start_date), "MMM d, yyyy")}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-headline font-extrabold text-foreground mb-4 max-w-3xl">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {event.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {event.venue}{event.city && `, ${event.city}`}
                </span>
              )}
              {event.start_date && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date(event.start_date), "h:mm a")} {event.timezone || "ET"}
                </span>
              )}
              {event.capacity && (
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {event.capacity} capacity
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsFollowing(!isFollowing)}
                className={cn(isFollowing && "bg-primary/10 text-primary border-primary")}
              >
                <Heart className={cn("w-4 h-4 mr-2", isFollowing && "fill-primary")} />
                {isFollowing ? "Following" : "Follow Host"}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="w-full justify-start bg-secondary/50 p-1">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
                <TabsTrigger value="speakers">Speakers</TabsTrigger>
                <TabsTrigger value="venue">Venue</TabsTrigger>
                <TabsTrigger value="faqs">FAQs</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="mt-6">
                <div className="prose prose-invert max-w-none">
                  <p className="text-lg text-foreground leading-relaxed">
                    {event.description || "Join us for an incredible event experience. More details coming soon!"}
                  </p>
                </div>

                {/* Highlights */}
                <div className="grid md:grid-cols-2 gap-4 mt-8">
                  <Card className="p-4 bg-secondary/30 border-border">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">Network</h4>
                        <p className="text-sm text-muted-foreground">Connect with industry leaders</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 bg-secondary/30 border-border">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                        <Star className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">Learn</h4>
                        <p className="text-sm text-muted-foreground">Expert-led sessions & workshops</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="agenda" className="mt-6">
                <div className="space-y-4">
                  {agenda.map((item, index) => (
                    <Card key={index} className="p-4 bg-secondary/30 border-border hover:border-primary/50 transition-colors">
                      <div className="flex gap-4">
                        <div className="text-sm font-medium text-primary w-20 flex-shrink-0">
                          {item.time}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          {item.speaker && (
                            <p className="text-sm text-primary mt-1">Speaker: {item.speaker}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="speakers" className="mt-6">
                <div className="grid md:grid-cols-3 gap-4">
                  {speakers.map((speaker) => (
                    <Card key={speaker.id} className="p-4 bg-secondary/30 border-border text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent mx-auto mb-3 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">{speaker.name[0]}</span>
                      </div>
                      <h4 className="font-semibold text-foreground">{speaker.name}</h4>
                      <p className="text-sm text-primary">{speaker.title}</p>
                      <p className="text-xs text-muted-foreground mt-2">{speaker.bio}</p>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="venue" className="mt-6">
                {event.venue ? (
                  <Card className="p-6 bg-secondary/30 border-border">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">{event.venue}</h3>
                        <p className="text-muted-foreground">
                          {[event.location, event.city, event.state].filter(Boolean).join(", ")}
                        </p>
                        <Button variant="outline" size="sm" className="mt-4">
                          Get Directions
                        </Button>
                      </div>
                    </div>
                    {/* Map placeholder */}
                    <div className="mt-6 h-48 rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground">Map Integration Coming Soon</span>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-6 bg-secondary/30 border-border text-center">
                    <Globe className="w-12 h-12 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground">Virtual Event</h3>
                    <p className="text-muted-foreground">Access details will be sent after registration</p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="faqs" className="mt-6">
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <Card key={index} className="p-4 bg-secondary/30 border-border">
                      <h4 className="font-semibold text-foreground mb-2">{faq.question}</h4>
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Tickets */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 p-6 bg-gradient-card border-border">
              <h3 className="font-headline font-bold text-xl text-foreground mb-4">
                Select Tickets
              </h3>

              {tickets.length === 0 ? (
                <div className="text-center py-8">
                  <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Tickets coming soon</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => {
                    const price = getTicketPrice(ticket);
                    const { available, remaining } = getAvailability(ticket);
                    const earlyBird = isEarlyBird(ticket);

                    return (
                      <Card
                        key={ticket.id}
                        onClick={() => available && setSelectedTicket(ticket.id)}
                        className={cn(
                          "p-4 cursor-pointer transition-all border-2",
                          selectedTicket === ticket.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50",
                          !available && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-foreground">{ticket.name}</h4>
                              {earlyBird && (
                                <Badge variant="secondary" className="bg-accent/20 text-accent text-xs">
                                  Early Bird
                                </Badge>
                              )}
                            </div>
                            {ticket.description && (
                              <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
                            )}
                            {remaining !== null && remaining < 50 && available && (
                              <p className="text-xs text-orange-500 mt-1">Only {remaining} left!</p>
                            )}
                            {!available && (
                              <p className="text-xs text-destructive mt-1">Sold Out</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-foreground text-lg">
                              {price === 0 ? "Free" : `$${price}`}
                            </div>
                            {earlyBird && ticket.price && (
                              <div className="text-xs text-muted-foreground line-through">
                                ${ticket.price}
                              </div>
                            )}
                          </div>
                        </div>
                        {selectedTicket === ticket.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Quantity Selector */}
              {selectedTicket && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Label className="text-sm text-muted-foreground">Quantity</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      -
                    </Button>
                    <span className="font-semibold text-foreground w-8 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.min(10, quantity + 1))}
                      disabled={quantity >= 10}
                    >
                      +
                    </Button>
                  </div>
                </div>
              )}

              {/* Total & Register */}
              {selectedTicket && (
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-2xl font-bold text-foreground">
                      ${(getTicketPrice(tickets.find(t => t.id === selectedTicket)!) * quantity).toFixed(2)}
                    </span>
                  </div>
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    size="lg"
                    onClick={handleRegister}
                  >
                    Register Now
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Policies */}
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  By registering, you agree to our{" "}
                  <a href="#" className="text-primary hover:underline">Terms</a> and{" "}
                  <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add missing Label import workaround
const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={cn("text-sm font-medium", className)}>{children}</label>
);

export default EventDetail;
