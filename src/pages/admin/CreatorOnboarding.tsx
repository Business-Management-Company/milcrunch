import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Calendar, 
  MapPin, 
  Users, 
  Building2, 
  Briefcase, 
  Heart,
  Store,
  Sparkles,
  Image,
  FileText,
  Ticket,
  Mail,
  Shield,
  DollarSign,
  Settings,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type CreatorType = "host" | "venue" | "agency" | "community" | "business";
type EventType = "live" | "virtual" | "hybrid";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  category: string;
}

const CreatorOnboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [creatorType, setCreatorType] = useState<CreatorType | null>(null);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: "name", label: "Event name & description", description: "Add a compelling title and description", completed: true, category: "basics" },
    { id: "date", label: "Date & time", description: "Set your event schedule", completed: true, category: "basics" },
    { id: "location", label: "Venue or virtual link", description: "Where will attendees join?", completed: true, category: "basics" },
    { id: "cover", label: "Cover image", description: "Upload an eye-catching banner", completed: false, category: "branding" },
    { id: "logo", label: "Event logo", description: "Add your brand identity", completed: false, category: "branding" },
    { id: "colors", label: "Brand colors", description: "Customize your event theme", completed: false, category: "branding" },
    { id: "tickets", label: "Create ticket types", description: "Set up pricing tiers", completed: false, category: "registration" },
    { id: "form", label: "Registration form", description: "Collect attendee information", completed: false, category: "registration" },
    { id: "capacity", label: "Set capacity limits", description: "Control event size", completed: false, category: "registration" },
    { id: "social", label: "Social share preview", description: "Optimize for sharing", completed: false, category: "marketing" },
    { id: "email", label: "Confirmation email", description: "Customize attendee communications", completed: false, category: "marketing" },
    { id: "promo", label: "Promo codes", description: "Create discount codes", completed: false, category: "marketing" },
    { id: "team", label: "Invite team members", description: "Add collaborators", completed: false, category: "team" },
    { id: "roles", label: "Assign roles", description: "Set permissions", completed: false, category: "team" },
    { id: "sponsors", label: "Sponsor packages", description: "Create sponsorship tiers", completed: false, category: "monetization" },
    { id: "swag", label: "Event merchandise", description: "Add swag store items", completed: false, category: "monetization" },
    { id: "publish", label: "Review & publish", description: "Go live!", completed: false, category: "launch" },
  ]);

  const creatorTypes = [
    { id: "host" as CreatorType, label: "Event Host", description: "Individual organizing events", icon: Users },
    { id: "venue" as CreatorType, label: "Venue", description: "Physical or virtual venue operator", icon: Building2 },
    { id: "agency" as CreatorType, label: "Agency", description: "Event planning company", icon: Briefcase },
    { id: "community" as CreatorType, label: "Community Organizer", description: "Building community through events", icon: Heart },
    { id: "business" as CreatorType, label: "Business / Brand", description: "Corporate events & activations", icon: Store },
  ];

  const eventTypes = [
    { id: "live" as EventType, label: "In-Person", description: "Physical venue event", icon: MapPin },
    { id: "virtual" as EventType, label: "Virtual", description: "Online streaming event", icon: Calendar },
    { id: "hybrid" as EventType, label: "Hybrid", description: "Both in-person & virtual", icon: Users },
  ];

  const categories = [
    { id: "basics", label: "Event Basics", icon: FileText },
    { id: "branding", label: "Branding", icon: Image },
    { id: "registration", label: "Registration", icon: Ticket },
    { id: "marketing", label: "Marketing", icon: Mail },
    { id: "team", label: "Team & Permissions", icon: Shield },
    { id: "monetization", label: "Monetization", icon: DollarSign },
    { id: "launch", label: "Launch", icon: Calendar },
  ];

  const completedCount = checklist.filter(item => item.completed).length;
  const progressPercent = (completedCount / checklist.length) * 100;

  const handleCreateEvent = async () => {
    if (!eventName || !eventType) return;
    
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please sign in to create an event", variant: "destructive" });
        navigate("/auth");
        return;
      }

      // Get or create a default organization and brand
      const { data: orgs } = await supabase.from("organizations").select("id").limit(1);
      let orgId = orgs?.[0]?.id;
      
      if (!orgId) {
        const { data: newOrg } = await supabase.from("organizations").insert({
          name: "My Organization",
          slug: `org-${Date.now()}`
        }).select("id").single();
        orgId = newOrg?.id;
      }

      const { data: brands } = await supabase.from("brands").select("id").limit(1);
      let brandId = brands?.[0]?.id;
      
      if (!brandId) {
        const { data: newBrand } = await supabase.from("brands").insert({
          name: "My Brand",
          slug: `brand-${Date.now()}`,
          organization_id: orgId
        }).select("id").single();
        brandId = newBrand?.id;
      }

      const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const { data: event, error } = await supabase.from("events").insert({
        title: eventName,
        slug: `${slug}-${Date.now()}`,
        event_type: eventType,
        start_date: eventDate || null,
        venue: eventLocation || null,
        organization_id: orgId,
        brand_id: brandId,
        created_by: user.id,
        is_published: false
      }).select("id").single();

      if (error) throw error;

      // Add creator as owner
      await supabase.from("event_team_members").insert({
        event_id: event.id,
        user_id: user.id,
        role: "owner",
        accepted_at: new Date().toISOString()
      });

      setCreatedEventId(event.id);
      setStep(4);
      toast({ title: "Event created!", description: "Now let's set it up." });
    } catch (error: any) {
      toast({ title: "Failed to create event", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const renderStep1 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <Badge className="mb-4">Step 1 of 4</Badge>
        <h1 className="text-3xl font-bold mb-2">Welcome to EventCrunch!</h1>
        <p className="text-muted-foreground">Tell us about yourself so we can personalize your experience</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {creatorTypes.map((type) => (
          <Card 
            key={type.id}
            className={`cursor-pointer transition-all hover:border-primary ${
              creatorType === type.id ? "border-primary bg-primary/5 ring-2 ring-primary" : ""
            }`}
            onClick={() => setCreatorType(type.id)}
          >
            <CardContent className="p-6 text-center">
              <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${
                creatorType === type.id ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                <type.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">{type.label}</h3>
              <p className="text-sm text-muted-foreground">{type.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setStep(2)} disabled={!creatorType} size="lg">
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <Badge className="mb-4">Step 2 of 4</Badge>
        <h1 className="text-3xl font-bold mb-2">What type of event?</h1>
        <p className="text-muted-foreground">Choose how attendees will participate</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {eventTypes.map((type) => (
          <Card 
            key={type.id}
            className={`cursor-pointer transition-all hover:border-primary ${
              eventType === type.id ? "border-primary bg-primary/5 ring-2 ring-primary" : ""
            }`}
            onClick={() => setEventType(type.id)}
          >
            <CardContent className="p-6 text-center">
              <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${
                eventType === type.id ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                <type.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">{type.label}</h3>
              <p className="text-sm text-muted-foreground">{type.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={() => setStep(3)} disabled={!eventType} size="lg">
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <Badge className="mb-4">Step 3 of 4</Badge>
        <h1 className="text-3xl font-bold mb-2">Quick event setup</h1>
        <p className="text-muted-foreground">Just 3 clicks to create your event workspace</p>
      </div>

      <Card className="max-w-xl mx-auto">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="eventName">Event Name *</Label>
            <Input 
              id="eventName"
              placeholder="e.g., Annual Tech Conference 2025"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventDate">Event Date</Label>
            <Input 
              id="eventDate"
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventLocation">
              {eventType === "virtual" ? "Virtual Platform / Link" : "Venue / Location"}
            </Label>
            <Input 
              id="eventLocation"
              placeholder={eventType === "virtual" ? "e.g., Zoom, YouTube Live" : "e.g., Convention Center, San Diego"}
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(2)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleCreateEvent} disabled={!eventName || isCreating} size="lg">
          {isCreating ? (
            <>Creating...</>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Create Event
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mx-auto mb-4 flex items-center justify-center">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <Badge className="mb-4">Step 4 of 4</Badge>
        <h1 className="text-3xl font-bold mb-2">Your event is ready!</h1>
        <p className="text-muted-foreground">Complete these tasks to launch your event</p>
      </div>

      {/* Progress Bar */}
      <Card className="max-w-3xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Setup Progress</span>
            <span className="text-sm text-muted-foreground">{completedCount} of {checklist.length} completed</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
        <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => navigate(`/admin/events/${createdEventId}/page-builder`)}>
          <Eye className="h-5 w-5 mb-2" />
          <span>Preview Page</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => navigate(`/admin/events`)}>
          <Settings className="h-5 w-5 mb-2" />
          <span>Event Settings</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => navigate(`/admin/events/${createdEventId}/team`)}>
          <Users className="h-5 w-5 mb-2" />
          <span>Invite Team</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => navigate(`/admin/events/${createdEventId}/sponsorships`)}>
          <DollarSign className="h-5 w-5 mb-2" />
          <span>Add Sponsors</span>
        </Button>
      </div>

      {/* Guided Checklist */}
      <div className="max-w-3xl mx-auto space-y-4">
        {categories.map((category) => {
          const categoryItems = checklist.filter(item => item.category === category.id);
          const categoryCompleted = categoryItems.filter(item => item.completed).length;
          
          return (
            <Card key={category.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <category.icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{category.label}</CardTitle>
                  </div>
                  <Badge variant={categoryCompleted === categoryItems.length ? "default" : "secondary"}>
                    {categoryCompleted}/{categoryItems.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {categoryItems.map((item) => (
                    <div 
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        item.completed ? "bg-green-50 dark:bg-green-900/20" : "bg-muted/50 hover:bg-muted"
                      }`}
                      onClick={() => toggleChecklistItem(item.id)}
                    >
                      <Checkbox checked={item.completed} />
                      <div className="flex-1">
                        <p className={`font-medium ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                          {item.label}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      {item.completed && <Check className="h-5 w-5 text-green-600" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={() => navigate("/admin")}>
          Go to Dashboard
        </Button>
        <Button onClick={() => navigate(`/admin/events`)}>
          <Calendar className="mr-2 h-4 w-4" /> Manage Events
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl py-12">
        {/* Progress indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                  s < step ? "bg-primary text-primary-foreground" :
                  s === step ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {s < step ? <Check className="h-5 w-5" /> : s}
                </div>
                {s < 4 && (
                  <div className={`w-12 h-1 ${s < step ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>
    </div>
  );
};

export default CreatorOnboarding;
