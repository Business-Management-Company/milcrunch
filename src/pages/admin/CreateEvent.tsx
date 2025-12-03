import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, ArrowRight, Calendar, MapPin, Users, Ticket, 
  FileText, Globe, Sparkles, Check, Loader2, Plus, Trash2,
  Monitor, Video, Building, Clock, DollarSign, Settings,
  Image, Mail, MessageSquare, Zap, Eye, Save
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description: string;
  benefits: string[];
}

interface FormField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "select" | "textarea" | "checkbox";
  required: boolean;
  active: boolean;
  options?: string[];
}

const WIZARD_STEPS = [
  { id: "type", label: "Event Type", icon: Calendar },
  { id: "details", label: "Basic Details", icon: FileText },
  { id: "registration", label: "Registration", icon: Users },
  { id: "tickets", label: "Tickets", icon: Ticket },
  { id: "form", label: "Form Builder", icon: MessageSquare },
  { id: "review", label: "Review", icon: Eye },
];

const EVENT_TYPES = [
  { 
    id: "live", 
    label: "Live Event", 
    icon: Building, 
    description: "In-person event at a physical venue",
    color: "bg-primary/10 border-primary/30 hover:border-primary"
  },
  { 
    id: "virtual", 
    label: "Virtual Event", 
    icon: Monitor, 
    description: "Online event accessible from anywhere",
    color: "bg-accent/10 border-accent/30 hover:border-accent"
  },
  { 
    id: "hybrid", 
    label: "Hybrid Event", 
    icon: Video, 
    description: "Combine in-person and virtual attendance",
    color: "bg-secondary border-border hover:border-primary"
  },
];

const REGISTRATION_TYPES = [
  { 
    id: "ticketed", 
    label: "Ticketed", 
    icon: Ticket, 
    description: "Sell tickets with multiple tiers and pricing options"
  },
  { 
    id: "free", 
    label: "Free Registration", 
    icon: Users, 
    description: "Collect registrations without payment"
  },
  { 
    id: "rsvp", 
    label: "RSVP Only", 
    icon: Mail, 
    description: "Simple yes/no attendance confirmation"
  },
];

const CreateEvent = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  
  // Form state
  const [eventType, setEventType] = useState<string>("");
  const [registrationType, setRegistrationType] = useState<string>("ticketed");
  const [eventDetails, setEventDetails] = useState({
    title: "",
    description: "",
    shortDescription: "",
    venue: "",
    address: "",
    city: "",
    state: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    timezone: "America/New_York",
    capacity: "",
  });
  const [tickets, setTickets] = useState<TicketType[]>([
    { id: "1", name: "General Admission", price: 0, quantity: 100, description: "", benefits: [] }
  ]);
  const [formFields, setFormFields] = useState<FormField[]>([
    { id: "1", label: "First and Last Name", type: "text", required: true, active: true },
    { id: "2", label: "Email Address", type: "email", required: true, active: true },
    { id: "3", label: "Phone Number", type: "phone", required: false, active: false },
    { id: "4", label: "Company/Organization", type: "text", required: false, active: false },
  ]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const handleAIGenerate = async () => {
    if (!eventDetails.title) return;
    
    setIsAIGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setEventDetails(prev => ({
      ...prev,
      description: `Join us for ${prev.title}, an exciting ${eventType} event bringing together industry leaders, innovators, and passionate community members. Experience engaging sessions, networking opportunities, and exclusive content designed to inspire and educate.`,
      shortDescription: `${prev.title} - Where community meets opportunity.`,
    }));
    
    setIsAIGenerating(false);
  };

  const addTicket = () => {
    const newTicket: TicketType = {
      id: Date.now().toString(),
      name: "",
      price: 0,
      quantity: 50,
      description: "",
      benefits: []
    };
    setTickets([...tickets, newTicket]);
  };

  const updateTicket = (id: string, field: keyof TicketType, value: any) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTicket = (id: string) => {
    if (tickets.length > 1) {
      setTickets(tickets.filter(t => t.id !== id));
    }
  };

  const addFormField = () => {
    const newField: FormField = {
      id: Date.now().toString(),
      label: "New Question",
      type: "text",
      required: false,
      active: true
    };
    setFormFields([...formFields, newField]);
  };

  const updateFormField = (id: string, field: keyof FormField, value: any) => {
    setFormFields(formFields.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const removeFormField = (id: string) => {
    setFormFields(formFields.filter(f => f.id !== id));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!eventType;
      case 1: return !!eventDetails.title && !!eventDetails.startDate;
      case 2: return !!registrationType;
      case 3: return tickets.length > 0 && tickets.every(t => t.name);
      case 4: return formFields.filter(f => f.active).length > 0;
      default: return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" />
                AI-Powered Creation
              </div>
              <h2 className="text-3xl font-display font-bold text-foreground mb-3">
                What type of event are you creating?
              </h2>
              <p className="text-muted-foreground">
                Choose how attendees will experience your event
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {EVENT_TYPES.map((type) => (
                <Card
                  key={type.id}
                  onClick={() => setEventType(type.id)}
                  className={cn(
                    "relative p-6 cursor-pointer transition-all duration-300 border-2",
                    type.color,
                    eventType === type.id && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  {eventType === type.id && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center mb-4">
                    <type.icon className="w-7 h-7 text-foreground" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-foreground mb-2">{type.label}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </Card>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-8 max-w-3xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl font-display font-bold text-foreground mb-3">
                Tell us about your event
              </h2>
              <p className="text-muted-foreground">
                Let AI help you craft compelling content
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground font-medium">Event Title *</Label>
                <Input
                  id="title"
                  value={eventDetails.title}
                  onChange={(e) => setEventDetails({ ...eventDetails, title: e.target.value })}
                  placeholder="e.g., Military Veterans Summit 2024"
                  className="text-lg h-12"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-foreground font-medium">Description</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAIGenerate}
                    disabled={!eventDetails.title || isAIGenerating}
                    className="gap-2"
                  >
                    {isAIGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {isAIGenerating ? "Generating..." : "AI Generate"}
                  </Button>
                </div>
                <Textarea
                  id="description"
                  value={eventDetails.description}
                  onChange={(e) => setEventDetails({ ...eventDetails, description: e.target.value })}
                  placeholder="Describe your event..."
                  rows={4}
                  className={cn(isAIGenerating && "animate-pulse")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription" className="text-foreground font-medium">Short Description</Label>
                <Input
                  id="shortDescription"
                  value={eventDetails.shortDescription}
                  onChange={(e) => setEventDetails({ ...eventDetails, shortDescription: e.target.value })}
                  placeholder="A brief tagline for your event"
                />
              </div>

              {(eventType === "live" || eventType === "hybrid") && (
                <Card className="p-6 bg-secondary/50 border-border">
                  <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Venue Details
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Venue Name</Label>
                      <Input
                        value={eventDetails.venue}
                        onChange={(e) => setEventDetails({ ...eventDetails, venue: e.target.value })}
                        placeholder="e.g., Convention Center"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Address</Label>
                      <Input
                        value={eventDetails.address}
                        onChange={(e) => setEventDetails({ ...eventDetails, address: e.target.value })}
                        placeholder="Street address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">City</Label>
                      <Input
                        value={eventDetails.city}
                        onChange={(e) => setEventDetails({ ...eventDetails, city: e.target.value })}
                        placeholder="City"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">State</Label>
                      <Input
                        value={eventDetails.state}
                        onChange={(e) => setEventDetails({ ...eventDetails, state: e.target.value })}
                        placeholder="State"
                      />
                    </div>
                  </div>
                </Card>
              )}

              <Card className="p-6 bg-secondary/50 border-border">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Date & Time
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Start Date *</Label>
                    <Input
                      type="date"
                      value={eventDetails.startDate}
                      onChange={(e) => setEventDetails({ ...eventDetails, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Start Time</Label>
                    <Input
                      type="time"
                      value={eventDetails.startTime}
                      onChange={(e) => setEventDetails({ ...eventDetails, startTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">End Date</Label>
                    <Input
                      type="date"
                      value={eventDetails.endDate}
                      onChange={(e) => setEventDetails({ ...eventDetails, endDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">End Time</Label>
                    <Input
                      type="time"
                      value={eventDetails.endTime}
                      onChange={(e) => setEventDetails({ ...eventDetails, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label className="text-foreground">Timezone</Label>
                  <Select
                    value={eventDetails.timezone}
                    onValueChange={(value) => setEventDetails({ ...eventDetails, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl font-display font-bold text-foreground mb-3">
                Registration Setup
              </h2>
              <p className="text-muted-foreground">
                Choose how attendees will register for your event
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {REGISTRATION_TYPES.map((type) => (
                <Card
                  key={type.id}
                  onClick={() => setRegistrationType(type.id)}
                  className={cn(
                    "relative p-6 cursor-pointer transition-all duration-300 border-2",
                    registrationType === type.id 
                      ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2 ring-offset-background" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {registrationType === type.id && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                    <type.icon className="w-7 h-7 text-foreground" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-foreground mb-2">{type.label}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </Card>
              ))}
            </div>

            <Card className="p-6 bg-secondary/50 border-border">
              <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Additional Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground font-medium">Event Capacity</Label>
                    <p className="text-sm text-muted-foreground">Limit the number of registrations</p>
                  </div>
                  <Input
                    type="number"
                    value={eventDetails.capacity}
                    onChange={(e) => setEventDetails({ ...eventDetails, capacity: e.target.value })}
                    placeholder="Unlimited"
                    className="w-32"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground font-medium">Waitlist</Label>
                    <p className="text-sm text-muted-foreground">Allow waitlist when capacity is reached</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground font-medium">Require Approval</Label>
                    <p className="text-sm text-muted-foreground">Manually approve each registration</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl font-display font-bold text-foreground mb-3">
                Ticket Types
              </h2>
              <p className="text-muted-foreground">
                Create different ticket tiers for your event
              </p>
            </div>

            <div className="space-y-4">
              {tickets.map((ticket, index) => (
                <Card key={ticket.id} className="p-6 border-border">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-display font-bold text-foreground">Ticket {index + 1}</span>
                    </div>
                    {tickets.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTicket(ticket.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Ticket Name *</Label>
                      <Input
                        value={ticket.name}
                        onChange={(e) => updateTicket(ticket.id, "name", e.target.value)}
                        placeholder="e.g., General Admission"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Price ($)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          value={ticket.price}
                          onChange={(e) => updateTicket(ticket.id, "price", parseFloat(e.target.value) || 0)}
                          className="pl-9"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Quantity Available</Label>
                      <Input
                        type="number"
                        value={ticket.quantity}
                        onChange={(e) => updateTicket(ticket.id, "quantity", parseInt(e.target.value) || 0)}
                        placeholder="100"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <Label className="text-foreground">Description</Label>
                    <Textarea
                      value={ticket.description}
                      onChange={(e) => updateTicket(ticket.id, "description", e.target.value)}
                      placeholder="Describe what's included with this ticket..."
                      rows={2}
                    />
                  </div>
                </Card>
              ))}
            </div>

            <Button variant="outline" onClick={addTicket} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Another Ticket Type
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl font-display font-bold text-foreground mb-3">
                Registration Form
              </h2>
              <p className="text-muted-foreground">
                Customize what information you collect from attendees
              </p>
            </div>

            <Card className="border-border overflow-hidden">
              <div className="grid grid-cols-[1fr,100px,100px] gap-4 px-6 py-3 bg-secondary/50 border-b border-border">
                <span className="text-sm font-medium text-muted-foreground">Field</span>
                <span className="text-sm font-medium text-muted-foreground text-center">Required</span>
                <span className="text-sm font-medium text-muted-foreground text-center">Active</span>
              </div>
              
              <div className="divide-y divide-border">
                {formFields.map((field) => (
                  <div key={field.id} className="grid grid-cols-[1fr,100px,100px] gap-4 px-6 py-4 items-center">
                    <div className="flex items-center gap-3">
                      <Input
                        value={field.label}
                        onChange={(e) => updateFormField(field.id, "label", e.target.value)}
                        className="flex-1"
                      />
                      <Select
                        value={field.type}
                        onValueChange={(value) => updateFormField(field.id, "type", value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="textarea">Long Text</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFormField(field.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => updateFormField(field.id, "required", checked)}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Badge 
                        variant={field.active ? "default" : "secondary"}
                        className={cn(
                          "cursor-pointer",
                          field.active ? "bg-primary text-primary-foreground" : ""
                        )}
                        onClick={() => updateFormField(field.id, "active", !field.active)}
                      >
                        {field.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Button variant="outline" onClick={addFormField} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Custom Question
            </Button>
          </div>
        );

      case 5:
        return (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl font-display font-bold text-foreground mb-3">
                Review Your Event
              </h2>
              <p className="text-muted-foreground">
                Everything looks great! Review and publish your event.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-border">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Event Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title</span>
                    <span className="font-medium text-foreground">{eventDetails.title || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="secondary">{EVENT_TYPES.find(t => t.id === eventType)?.label || "—"}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium text-foreground">{eventDetails.startDate || "—"}</span>
                  </div>
                  {eventDetails.venue && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Venue</span>
                      <span className="font-medium text-foreground">{eventDetails.venue}</span>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6 border-border">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-primary" />
                  Tickets
                </h3>
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{ticket.name || "Unnamed"}</span>
                      <span className="font-medium text-foreground">
                        {ticket.price === 0 ? "Free" : `$${ticket.price}`} ({ticket.quantity} available)
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 border-border">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Registration
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="secondary">{REGISTRATION_TYPES.find(t => t.id === registrationType)?.label}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-medium text-foreground">{eventDetails.capacity || "Unlimited"}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-border">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Form Fields
                </h3>
                <div className="space-y-2">
                  {formFields.filter(f => f.active).map((field) => (
                    <div key={field.id} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-foreground">{field.label}</span>
                      {field.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-6 border-primary/30 bg-primary/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-foreground">Ready to publish?</h3>
                  <p className="text-sm text-muted-foreground">Your event will be live and accepting registrations</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="gap-2">
                    <Save className="w-4 h-4" />
                    Save as Draft
                  </Button>
                  <Button className="gap-2 bg-primary hover:bg-primary/90">
                    <Globe className="w-4 h-4" />
                    Publish Event
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/admin/events">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-display font-bold text-foreground">Create Event</h1>
                <p className="text-sm text-muted-foreground">
                  Step {currentStep + 1} of {WIZARD_STEPS.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Progress value={progress} className="w-48 h-2" />
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center py-4 overflow-x-auto">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => index <= currentStep && setCurrentStep(index)}
                  disabled={index > currentStep}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                    index === currentStep 
                      ? "bg-primary text-primary-foreground" 
                      : index < currentStep
                      ? "text-primary hover:bg-primary/10 cursor-pointer"
                      : "text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <step.icon className="w-4 h-4" />
                  <span className="text-sm font-medium hidden md:inline">{step.label}</span>
                </button>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={cn(
                    "w-8 h-px mx-2",
                    index < currentStep ? "bg-primary" : "bg-border"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {renderStepContent()}
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-card py-4">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(Math.min(WIZARD_STEPS.length - 1, currentStep + 1))}
              disabled={!canProceed()}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <Globe className="w-4 h-4" />
              Publish Event
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default CreateEvent;
