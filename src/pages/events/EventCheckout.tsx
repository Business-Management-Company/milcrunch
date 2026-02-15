import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Check, Ticket, User, CreditCard,
  Tag, Loader2, AlertCircle, ShoppingBag, Shirt, Shield,
  Mail, Phone, Building, MapPin, Gift
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  start_date: string | null;
  venue: string | null;
  city: string | null;
}

interface TicketType {
  id: string;
  name: string;
  price: number | null;
  description: string | null;
  benefits: any;
  early_bird_price: number | null;
  early_bird_deadline: string | null;
}

interface AddOn {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  add_on_type: string | null;
  image_url: string | null;
  variants: any;
  inventory: number | null;
  inventory_sold: number | null;
}

interface FormField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  options: any;
  placeholder: string | null;
}

interface AttendeeData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  dietary: string;
  accessibility: string;
  tshirt_size: string;
  emergency_contact: string;
  emergency_phone: string;
  custom_fields: Record<string, string>;
}

const CHECKOUT_STEPS = [
  { id: "tickets", label: "Select Tickets", icon: Ticket },
  { id: "details", label: "Your Details", icon: User },
  { id: "payment", label: "Payment", icon: CreditCard },
];

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

const EventCheckout = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);

  // Cart state
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, { qty: number; variant?: string }>>({});
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; type: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // Attendee data
  const [attendees, setAttendees] = useState<AttendeeData[]>([{
    first_name: "",
    last_name: "",
    email: user?.email || "",
    phone: "",
    company: "",
    dietary: "",
    accessibility: "",
    tshirt_size: "",
    emergency_contact: "",
    emergency_phone: "",
    custom_fields: {},
  }]);

  // Consent
  const [consents, setConsents] = useState({
    terms: false,
    email_optin: false,
    sms_optin: false,
    newsletter: false,
  });

  useEffect(() => {
    fetchData();
  }, [slug]);

  useEffect(() => {
    // Initialize from URL params
    const ticketId = searchParams.get("ticket");
    const qty = parseInt(searchParams.get("qty") || "1");
    if (ticketId) {
      setSelectedTicket(ticketId);
      setQuantity(qty);
      initializeAttendees(qty);
    }
  }, [searchParams]);

  const initializeAttendees = (qty: number) => {
    const newAttendees = Array(qty).fill(null).map((_, i) => ({
      first_name: i === 0 ? "" : "",
      last_name: "",
      email: i === 0 && user?.email ? user.email : "",
      phone: "",
      company: "",
      dietary: "",
      accessibility: "",
      tshirt_size: "",
      emergency_contact: "",
      emergency_phone: "",
      custom_fields: {},
    }));
    setAttendees(newAttendees);
  };

  const fetchData = async () => {
    if (!slug) return;

    try {
      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, title, start_date, venue, city")
        .eq("slug", slug)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch tickets
      const { data: ticketData } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventData.id)
        .eq("is_active", true)
        .order("sort_order");

      setTickets(ticketData || []);

      // Fetch add-ons
      const { data: addOnData } = await supabase
        .from("event_add_ons")
        .select("*")
        .eq("event_id", eventData.id)
        .eq("is_active", true)
        .order("sort_order");

      setAddOns(addOnData || []);

      // Fetch form fields
      const { data: fieldData } = await supabase
        .from("registration_form_fields")
        .select("*")
        .eq("event_id", eventData.id)
        .order("sort_order");

      setFormFields(fieldData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load checkout");
      navigate(`/events/${slug}`);
    } finally {
      setLoading(false);
    }
  };

  const getTicketPrice = (ticket: TicketType) => {
    const now = new Date();
    if (ticket.early_bird_deadline && ticket.early_bird_price && new Date(ticket.early_bird_deadline) > now) {
      return ticket.early_bird_price;
    }
    return ticket.price || 0;
  };

  const calculateSubtotal = () => {
    let subtotal = 0;
    
    // Ticket cost
    if (selectedTicket) {
      const ticket = tickets.find(t => t.id === selectedTicket);
      if (ticket) {
        subtotal += getTicketPrice(ticket) * quantity;
      }
    }

    // Add-ons
    Object.entries(selectedAddOns).forEach(([id, { qty }]) => {
      const addon = addOns.find(a => a.id === id);
      if (addon && addon.price) {
        subtotal += addon.price * qty;
      }
    });

    return subtotal;
  };

  const calculateDiscount = () => {
    if (!appliedPromo) return 0;
    const subtotal = calculateSubtotal();
    if (appliedPromo.type === "percentage") {
      return subtotal * (appliedPromo.discount / 100);
    }
    return Math.min(appliedPromo.discount, subtotal);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim() || !event) return;
    
    setPromoLoading(true);
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("event_id", event.id)
        .eq("code", promoCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast.error("Invalid promo code");
        return;
      }

      // Check usage limits
      if (data.max_uses && data.times_used >= data.max_uses) {
        toast.error("Promo code has reached its usage limit");
        return;
      }

      // Check minimum order
      if (data.min_order_amount && calculateSubtotal() < data.min_order_amount) {
        toast.error(`Minimum order of $${data.min_order_amount} required`);
        return;
      }

      setAppliedPromo({
        code: data.code,
        discount: data.discount_value,
        type: data.discount_type,
      });
      toast.success("Promo code applied!");
    } catch (error) {
      toast.error("Failed to apply promo code");
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoCode("");
  };

  const updateAttendee = (index: number, field: keyof AttendeeData, value: string) => {
    setAttendees(prev => prev.map((att, i) => 
      i === index ? { ...att, [field]: value } : att
    ));
  };

  const updateAttendeeCustomField = (index: number, fieldName: string, value: string) => {
    setAttendees(prev => prev.map((att, i) => 
      i === index ? { ...att, custom_fields: { ...att.custom_fields, [fieldName]: value } } : att
    ));
  };

  const toggleAddOn = (id: string) => {
    setSelectedAddOns(prev => {
      if (prev[id]) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { qty: 1 } };
    });
  };

  const updateAddOnQty = (id: string, qty: number) => {
    if (qty <= 0) {
      toggleAddOn(id);
      return;
    }
    setSelectedAddOns(prev => ({
      ...prev,
      [id]: { ...prev[id], qty }
    }));
  };

  const updateAddOnVariant = (id: string, variant: string) => {
    setSelectedAddOns(prev => ({
      ...prev,
      [id]: { ...prev[id], variant }
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!selectedTicket;
      case 1:
        return attendees.every(att => att.first_name && att.last_name && att.email);
      case 2:
        return consents.terms;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!event || !selectedTicket || !user) {
      toast.error("Please log in to complete your registration");
      navigate("/auth");
      return;
    }

    setSubmitting(true);
    try {
      const ticket = tickets.find(t => t.id === selectedTicket);
      if (!ticket) throw new Error("Ticket not found");

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([{
          user_id: user.id,
          event_id: event.id,
          ticket_type_id: selectedTicket,
          quantity,
          subtotal: calculateSubtotal(),
          discount_amount: calculateDiscount(),
          total: calculateTotal(),
          status: calculateTotal() === 0 ? "completed" : "pending",
          attendee_info: attendees as any,
          metadata: {
            consents,
            promo_code: appliedPromo?.code,
          } as any
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create attendees
      for (const attendee of attendees) {
        await supabase.from("attendees").insert({
          order_id: order.id,
          ticket_type_id: selectedTicket,
          first_name: attendee.first_name,
          last_name: attendee.last_name,
          email: attendee.email,
          phone: attendee.phone,
          custom_fields: {
            company: attendee.company,
            dietary: attendee.dietary,
            accessibility: attendee.accessibility,
            tshirt_size: attendee.tshirt_size,
            emergency_contact: attendee.emergency_contact,
            emergency_phone: attendee.emergency_phone,
            ...attendee.custom_fields,
          },
        });
      }

      // Create order add-ons
      for (const [id, { qty, variant }] of Object.entries(selectedAddOns)) {
        const addon = addOns.find(a => a.id === id);
        if (addon) {
          await supabase.from("order_add_ons").insert({
            order_id: order.id,
            add_on_id: id,
            quantity: qty,
            unit_price: addon.price || 0,
            variant_selection: variant ? { size: variant } : null,
          });
        }
      }

      // Update promo code usage
      if (appliedPromo) {
        await supabase
          .from("promo_codes")
          .update({ times_used: (await supabase.from("promo_codes").select("times_used").eq("code", appliedPromo.code).single()).data?.times_used || 0 + 1 })
          .eq("code", appliedPromo.code);
      }

      toast.success("Registration successful!");
      navigate(`/events/${slug}/confirmation?order=${order.id}`);
    } catch (error) {
      console.error("Error submitting order:", error);
      toast.error("Failed to complete registration");
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / CHECKOUT_STEPS.length) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Event Not Found</h2>
          <Button asChild>
            <Link to="/">Browse Events</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/events/${slug}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Event
              </Link>
            </Button>
            <div className="text-center flex-1">
              <h1 className="font-headline font-bold text-foreground">{event.title}</h1>
              <p className="text-sm text-muted-foreground">
                {event.start_date && format(new Date(event.start_date), "MMM d, yyyy")}
                {event.venue && ` • ${event.venue}`}
              </p>
            </div>
            <div className="w-24" />
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="border-b border-border bg-secondary/30">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between max-w-2xl mx-auto mb-4">
            {CHECKOUT_STEPS.map((step, index) => (
              <div 
                key={step.id}
                className={cn(
                  "flex items-center gap-2",
                  index <= currentStep ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  index < currentStep ? "bg-primary text-primary-foreground" :
                  index === currentStep ? "bg-primary/20 text-primary border-2 border-primary" :
                  "bg-muted text-muted-foreground"
                )}>
                  {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span className="hidden sm:inline font-medium">{step.label}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Form Steps */}
          <div className="lg:col-span-2">
            {/* Step 1: Select Tickets */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-headline font-bold text-foreground mb-2">
                    Select Your Tickets
                  </h2>
                  <p className="text-muted-foreground">
                    Choose the ticket type that best fits your needs
                  </p>
                </div>

                {/* Tickets */}
                <div className="space-y-3">
                  {tickets.map((ticket) => {
                    const price = getTicketPrice(ticket);
                    const isSelected = selectedTicket === ticket.id;

                    return (
                      <Card
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket.id)}
                        className={cn(
                          "p-4 cursor-pointer transition-all border-2",
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-foreground">{ticket.name}</h4>
                              {ticket.early_bird_deadline && new Date(ticket.early_bird_deadline) > new Date() && (
                                <Badge className="bg-accent/20 text-accent">Early Bird</Badge>
                              )}
                            </div>
                            {ticket.description && (
                              <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
                            )}
                            {ticket.benefits && Array.isArray(ticket.benefits) && (
                              <ul className="mt-2 space-y-1">
                                {ticket.benefits.slice(0, 3).map((b: string, i: number) => (
                                  <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Check className="w-3 h-3 text-primary" />
                                    {b}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-foreground">
                              {price === 0 ? "Free" : `$${price}`}
                            </div>
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center mt-2 ml-auto">
                                <Check className="w-4 h-4 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Quantity */}
                {selectedTicket && (
                  <Card className="p-4 bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-foreground">Number of Tickets</Label>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newQty = Math.max(1, quantity - 1);
                            setQuantity(newQty);
                            initializeAttendees(newQty);
                          }}
                          disabled={quantity <= 1}
                        >
                          -
                        </Button>
                        <span className="font-semibold text-foreground w-8 text-center">{quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newQty = Math.min(10, quantity + 1);
                            setQuantity(newQty);
                            initializeAttendees(newQty);
                          }}
                          disabled={quantity >= 10}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Add-ons */}
                {addOns.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" />
                      Add-ons & Merchandise
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {addOns.map((addon) => {
                        const isSelected = !!selectedAddOns[addon.id];
                        const available = addon.inventory ? addon.inventory - (addon.inventory_sold || 0) : null;

                        return (
                          <Card
                            key={addon.id}
                            className={cn(
                              "p-4 transition-all border-2",
                              isSelected ? "border-primary bg-primary/5" : "border-border"
                            )}
                          >
                            <div className="flex gap-3">
                              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                {addon.image_url ? (
                                  <img src={addon.image_url} alt={addon.name} className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                  <Gift className="w-6 h-6 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground">{addon.name}</h4>
                                {addon.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">{addon.description}</p>
                                )}
                                <div className="flex items-center justify-between mt-2">
                                  <span className="font-semibold text-foreground">
                                    ${addon.price || 0}
                                  </span>
                                  {available !== null && available < 20 && (
                                    <span className="text-xs text-orange-500">{available} left</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {isSelected && addon.variants && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <Label className="text-xs text-muted-foreground">Select Size</Label>
                                <Select
                                  value={selectedAddOns[addon.id]?.variant || ""}
                                  onValueChange={(v) => updateAddOnVariant(addon.id, v)}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Choose size" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TSHIRT_SIZES.map((size) => (
                                      <SelectItem key={size} value={size}>{size}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div className="mt-3 flex items-center justify-between">
                              {isSelected ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateAddOnQty(addon.id, selectedAddOns[addon.id].qty - 1)}
                                  >
                                    -
                                  </Button>
                                  <span className="w-6 text-center">{selectedAddOns[addon.id].qty}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateAddOnQty(addon.id, selectedAddOns[addon.id].qty + 1)}
                                  >
                                    +
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleAddOn(addon.id)}
                                >
                                  Add to Order
                                </Button>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Promo Code */}
                <Card className="p-4 bg-secondary/30">
                  <Label className="text-foreground flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4" />
                    Promo Code
                  </Label>
                  {appliedPromo ? (
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                      <div>
                        <span className="font-medium text-primary">{appliedPromo.code}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          -{appliedPromo.type === "percentage" ? `${appliedPromo.discount}%` : `$${appliedPromo.discount}`}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={removePromoCode}>
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Enter code"
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        onClick={applyPromoCode}
                        disabled={promoLoading || !promoCode}
                      >
                        {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Step 2: Attendee Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-headline font-bold text-foreground mb-2">
                    Attendee Information
                  </h2>
                  <p className="text-muted-foreground">
                    Please provide details for {quantity > 1 ? "each attendee" : "yourself"}
                  </p>
                </div>

                {attendees.map((attendee, index) => (
                  <Card key={index} className="p-6 bg-gradient-card border-border">
                    {quantity > 1 && (
                      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Attendee {index + 1}
                      </h3>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">First Name *</Label>
                        <Input
                          value={attendee.first_name}
                          onChange={(e) => updateAttendee(index, "first_name", e.target.value)}
                          placeholder="John"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Last Name *</Label>
                        <Input
                          value={attendee.last_name}
                          onChange={(e) => updateAttendee(index, "last_name", e.target.value)}
                          placeholder="Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Email *
                        </Label>
                        <Input
                          type="email"
                          value={attendee.email}
                          onChange={(e) => updateAttendee(index, "email", e.target.value)}
                          placeholder="john@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Phone
                        </Label>
                        <Input
                          type="tel"
                          value={attendee.phone}
                          onChange={(e) => updateAttendee(index, "phone", e.target.value)}
                          placeholder="(555) 555-5555"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Company / Organization
                        </Label>
                        <Input
                          value={attendee.company}
                          onChange={(e) => updateAttendee(index, "company", e.target.value)}
                          placeholder="Acme Inc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground flex items-center gap-2">
                          <Shirt className="w-4 h-4" />
                          T-Shirt Size
                        </Label>
                        <Select
                          value={attendee.tshirt_size}
                          onValueChange={(v) => updateAttendee(index, "tshirt_size", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            {TSHIRT_SIZES.map((size) => (
                              <SelectItem key={size} value={size}>{size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-foreground">Dietary Restrictions</Label>
                        <Input
                          value={attendee.dietary}
                          onChange={(e) => updateAttendee(index, "dietary", e.target.value)}
                          placeholder="e.g., Vegetarian, Gluten-free, Allergies"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Accessibility Needs</Label>
                        <Textarea
                          value={attendee.accessibility}
                          onChange={(e) => updateAttendee(index, "accessibility", e.target.value)}
                          placeholder="Let us know if you need any accommodations"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="mt-6 pt-4 border-t border-border">
                      <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        Emergency Contact
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-foreground">Contact Name</Label>
                          <Input
                            value={attendee.emergency_contact}
                            onChange={(e) => updateAttendee(index, "emergency_contact", e.target.value)}
                            placeholder="Jane Doe"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">Contact Phone</Label>
                          <Input
                            type="tel"
                            value={attendee.emergency_phone}
                            onChange={(e) => updateAttendee(index, "emergency_phone", e.target.value)}
                            placeholder="(555) 555-5555"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Custom Fields */}
                    {formFields.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-border space-y-4">
                        <h4 className="font-medium text-foreground">Additional Information</h4>
                        {formFields.map((field) => (
                          <div key={field.id} className="space-y-2">
                            <Label className="text-foreground">
                              {field.field_label} {field.is_required && "*"}
                            </Label>
                            {field.field_type === "select" && field.options ? (
                              <Select
                                value={attendee.custom_fields[field.field_name] || ""}
                                onValueChange={(v) => updateAttendeeCustomField(index, field.field_name, v)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={field.placeholder || "Select..."} />
                                </SelectTrigger>
                                <SelectContent>
                                  {(field.options as string[]).map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : field.field_type === "textarea" ? (
                              <Textarea
                                value={attendee.custom_fields[field.field_name] || ""}
                                onChange={(e) => updateAttendeeCustomField(index, field.field_name, e.target.value)}
                                placeholder={field.placeholder || ""}
                                rows={3}
                              />
                            ) : (
                              <Input
                                type={field.field_type}
                                value={attendee.custom_fields[field.field_name] || ""}
                                onChange={(e) => updateAttendeeCustomField(index, field.field_name, e.target.value)}
                                placeholder={field.placeholder || ""}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {/* Step 3: Payment & Consent */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-headline font-bold text-foreground mb-2">
                    Complete Your Registration
                  </h2>
                  <p className="text-muted-foreground">
                    Review your order and complete payment
                  </p>
                </div>

                {/* Payment Section */}
                {calculateTotal() > 0 && (
                  <Card className="p-6 bg-gradient-card border-border">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Payment Method
                    </h3>
                    <div className="p-8 border-2 border-dashed border-border rounded-lg text-center">
                      <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Stripe Payment Integration</p>
                      <p className="text-sm text-muted-foreground mt-1">Coming Soon</p>
                    </div>
                  </Card>
                )}

                {/* Consents */}
                <Card className="p-6 bg-gradient-card border-border">
                  <h3 className="font-semibold text-foreground mb-4">Terms & Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={consents.terms}
                        onCheckedChange={(checked) => setConsents({ ...consents, terms: !!checked })}
                      />
                      <label htmlFor="terms" className="text-sm text-foreground cursor-pointer">
                        I agree to the <a href="#" className="text-primary hover:underline">Terms & Conditions</a> and{" "}
                        <a href="#" className="text-primary hover:underline">Privacy Policy</a> *
                      </label>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="email"
                        checked={consents.email_optin}
                        onCheckedChange={(checked) => setConsents({ ...consents, email_optin: !!checked })}
                      />
                      <label htmlFor="email" className="text-sm text-muted-foreground cursor-pointer">
                        Send me event updates and reminders via email
                      </label>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="sms"
                        checked={consents.sms_optin}
                        onCheckedChange={(checked) => setConsents({ ...consents, sms_optin: !!checked })}
                      />
                      <label htmlFor="sms" className="text-sm text-muted-foreground cursor-pointer">
                        Send me event updates via SMS
                      </label>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="newsletter"
                        checked={consents.newsletter}
                        onCheckedChange={(checked) => setConsents({ ...consents, newsletter: !!checked })}
                      />
                      <label htmlFor="newsletter" className="text-sm text-muted-foreground cursor-pointer">
                        Subscribe to newsletter for future events
                      </label>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              {currentStep < CHECKOUT_STEPS.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceed()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || submitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : calculateTotal() === 0 ? (
                    "Complete Registration"
                  ) : (
                    `Pay $${calculateTotal().toFixed(2)}`
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 p-6 bg-gradient-card border-border">
              <h3 className="font-headline font-bold text-lg text-foreground mb-4">
                Order Summary
              </h3>

              {/* Event Info */}
              <div className="pb-4 border-b border-border">
                <h4 className="font-semibold text-foreground">{event.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {event.start_date && format(new Date(event.start_date), "EEEE, MMMM d, yyyy")}
                </p>
                {event.venue && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {event.venue}
                  </p>
                )}
              </div>

              {/* Line Items */}
              <div className="py-4 border-b border-border space-y-3">
                {selectedTicket && (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-foreground">
                        {tickets.find(t => t.id === selectedTicket)?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">× {quantity}</p>
                    </div>
                    <span className="font-medium text-foreground">
                      ${(getTicketPrice(tickets.find(t => t.id === selectedTicket)!) * quantity).toFixed(2)}
                    </span>
                  </div>
                )}

                {Object.entries(selectedAddOns).map(([id, { qty }]) => {
                  const addon = addOns.find(a => a.id === id);
                  if (!addon) return null;
                  return (
                    <div key={id} className="flex items-start justify-between text-sm">
                      <div>
                        <p className="text-muted-foreground">{addon.name}</p>
                        <p className="text-xs text-muted-foreground">× {qty}</p>
                      </div>
                      <span className="text-muted-foreground">
                        ${((addon.price || 0) * qty).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="py-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">${calculateSubtotal().toFixed(2)}</span>
                </div>

                {appliedPromo && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {appliedPromo.code}
                    </span>
                    <span className="text-primary">-${calculateDiscount().toFixed(2)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Security Badge */}
              <div className="pt-4 border-t border-border text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  Secure Checkout
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCheckout;
