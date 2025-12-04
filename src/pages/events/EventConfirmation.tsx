import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check, Calendar, MapPin, QrCode, Download, Share2,
  Mail, Clock, User, Ticket, Loader2, ExternalLink,
  Smartphone, Wallet
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Order {
  id: string;
  quantity: number;
  total: number;
  status: string;
  created_at: string;
  attendee_info: any;
}

interface Event {
  id: string;
  title: string;
  slug: string;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  timezone: string | null;
  cover_image_url: string | null;
}

interface TicketTypeInfo {
  name: string;
  description: string | null;
}

const EventConfirmation = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order");

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketType, setTicketType] = useState<TicketTypeInfo | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          id, quantity, total, status, created_at, attendee_info,
          events!inner(id, title, slug, start_date, end_date, venue, city, state, address, timezone, cover_image_url),
          ticket_types(name, description)
        `)
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      setOrder({
        id: orderData.id,
        quantity: orderData.quantity,
        total: orderData.total,
        status: orderData.status,
        created_at: orderData.created_at,
        attendee_info: orderData.attendee_info,
      });
      setEvent(orderData.events as unknown as Event);
      setTicketType(orderData.ticket_types as unknown as TicketTypeInfo);
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRValue = () => {
    return `EVENTCRUNCH-${orderId?.slice(0, 8).toUpperCase()}`;
  };

  const addToCalendar = (type: "google" | "apple" | "outlook") => {
    if (!event?.start_date) return;

    const start = new Date(event.start_date);
    const end = event.end_date ? new Date(event.end_date) : new Date(start.getTime() + 3600000);
    const location = [event.venue, event.address, event.city, event.state].filter(Boolean).join(", ");

    if (type === "google") {
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start.toISOString().replace(/[-:]/g, "").split(".")[0]}Z/${end.toISOString().replace(/[-:]/g, "").split(".")[0]}Z&location=${encodeURIComponent(location)}&details=${encodeURIComponent("Your ticket: " + generateQRValue())}`;
      window.open(url, "_blank");
    } else if (type === "outlook") {
      const url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(event.title)}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&location=${encodeURIComponent(location)}&body=${encodeURIComponent("Your ticket: " + generateQRValue())}`;
      window.open(url, "_blank");
    }
    // Apple Calendar would typically download an .ics file
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Order Not Found</h2>
          <Button asChild>
            <Link to="/">Browse Events</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Success Header */}
      <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent py-16">
        <div className="container mx-auto px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-primary mx-auto mb-6 flex items-center justify-center animate-bounce-in">
            <Check className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-headline font-extrabold text-foreground mb-3">
            You're Registered!
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Confirmation #{orderId?.slice(0, 8).toUpperCase()} • A confirmation email has been sent
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 -mt-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Event & Ticket Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Card */}
            <Card className="overflow-hidden bg-gradient-card border-border">
              <div className="relative h-48">
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ 
                    backgroundImage: event.cover_image_url 
                      ? `url(${event.cover_image_url})` 
                      : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <Badge className="mb-2 bg-primary/20 text-primary border-0">
                    <Calendar className="w-3 h-3 mr-1" />
                    {event.start_date && format(new Date(event.start_date), "EEEE, MMMM d, yyyy")}
                  </Badge>
                  <h2 className="text-2xl font-headline font-bold text-foreground">{event.title}</h2>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date & Time</p>
                      <p className="font-medium text-foreground">
                        {event.start_date && format(new Date(event.start_date), "h:mm a")}
                        {event.timezone && ` ${event.timezone}`}
                      </p>
                    </div>
                  </div>
                  
                  {event.venue && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium text-foreground">{event.venue}</p>
                        <p className="text-sm text-muted-foreground">
                          {[event.city, event.state].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-primary" />
                    Your Tickets
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{ticketType?.name || "General Admission"}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {order.quantity}</p>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary">
                      {order.status === "confirmed" ? "Confirmed" : "Pending"}
                    </Badge>
                  </div>
                </div>

                {/* Attendee List */}
                {order.attendee_info && Array.isArray(order.attendee_info) && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Registered Attendees
                    </h3>
                    <div className="space-y-2">
                      {order.attendee_info.map((att: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {att.first_name?.[0]}{att.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{att.first_name} {att.last_name}</p>
                            <p className="text-sm text-muted-foreground">{att.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Actions */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="p-4 bg-gradient-card border-border">
                <h4 className="font-medium text-foreground mb-3">Add to Calendar</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => addToCalendar("google")}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Google
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addToCalendar("outlook")}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Outlook
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addToCalendar("apple")}>
                    <Download className="w-4 h-4 mr-2" />
                    Apple
                  </Button>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-card border-border">
                <h4 className="font-medium text-foreground mb-3">Share Event</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* Right Column - QR Code Ticket */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 p-6 bg-gradient-card border-border text-center">
              <h3 className="font-headline font-bold text-lg text-foreground mb-4">
                Your Event Pass
              </h3>

              {/* QR Code Placeholder */}
              <div className="bg-white p-6 rounded-xl mb-4 mx-auto w-fit">
                <div className="w-48 h-48 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <QrCode className="w-24 h-24 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 mt-2 font-mono">
                  {generateQRValue()}
                </p>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Present this QR code at the event for check-in
              </p>

              {/* Wallet Options */}
              <div className="space-y-3">
                <Button variant="outline" className="w-full" size="lg">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Add to Apple Wallet
                </Button>
                <Button variant="outline" className="w-full" size="lg">
                  <Wallet className="w-4 h-4 mr-2" />
                  Add to Google Wallet
                </Button>
                <Button variant="outline" className="w-full" size="lg">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF Ticket
                </Button>
              </div>

              {/* Order Summary */}
              <div className="mt-6 pt-6 border-t border-border text-left">
                <h4 className="font-medium text-foreground mb-3">Order Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="text-foreground font-mono">{orderId?.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tickets</span>
                    <span className="text-foreground">{order.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Paid</span>
                    <span className="text-foreground font-semibold">${order.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="text-foreground">
                      {format(new Date(order.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Portal Link */}
            <Card className="mt-4 p-4 bg-primary/10 border-primary/20">
              <p className="text-sm text-foreground mb-3">
                Access your tickets, update details, and manage your registration anytime.
              </p>
              <Button asChild className="w-full">
                <Link to="/attendee/portal">
                  Go to My Portal
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </Card>
          </div>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default EventConfirmation;
