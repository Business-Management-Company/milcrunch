import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Check, Ticket, User,
  Loader2, Calendar, MapPin, AlertCircle, Copy, CalendarPlus, Car,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RidesharePanel from "@/components/rideshare/RidesharePanel";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

/* ---------- types ---------- */
interface EventRow {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  timezone: string | null;
  cover_image_url: string | null;
}
interface TicketRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number | null;
  sold: number;
}

const STEPS = ["Select Ticket", "Your Information", "Confirmation"];

const BRANCHES = ["Army", "Navy", "Marines", "Air Force", "Coast Guard", "Space Force", "N/A"];
const STATUSES = [
  { value: "active_duty", label: "Active Duty" },
  { value: "veteran", label: "Veteran" },
  { value: "military_spouse", label: "Military Spouse" },
  { value: "civilian", label: "Civilian" },
];

/* ======================================== */
const EventRegister = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);

  /* Step 1 state */
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);

  /* Step 2 state */
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    title: "",
    military_branch: "",
    military_status: "",
    dietary_restrictions: "",
    special_requests: "",
  });

  /* Step 3 state */
  const [regCode, setRegCode] = useState<string | null>(null);
  const [regId, setRegId] = useState<string | null>(null);
  const [showRideshare, setShowRideshare] = useState(false);

  useEffect(() => {
    if (eventId) fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const [evRes, tkRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, start_date, end_date, venue, city, state, timezone, cover_image_url, rideshare_enabled")
          .eq("id", eventId!)
          .single(),
        supabase
          .from("event_tickets")
          .select("id, name, description, price, quantity, sold")
          .eq("event_id", eventId!)
          .eq("is_active", true)
          .order("sort_order"),
      ]);

      if (evRes.error) throw evRes.error;
      setEvent(evRes.data as unknown as EventRow);
      setTickets((tkRes.data || []) as TicketRow[]);
    } catch (err) {
      console.error("Error loading event:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "MIC2026-";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleSubmit = async () => {
    if (!eventId || !selectedTicket) return;

    setSubmitting(true);
    try {
      const code = generateCode();
      const { data, error } = await supabase
        .from("event_registrations")
        .insert({
          event_id: eventId,
          ticket_id: selectedTicket,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          company: form.company.trim() || null,
          title: form.title.trim() || null,
          military_branch: form.military_branch || null,
          military_status: form.military_status || null,
          dietary_restrictions: form.dietary_restrictions.trim() || null,
          special_requests: form.special_requests.trim() || null,
          registration_code: code,
          status: "confirmed",
        } as Record<string, unknown>)
        .select("id")
        .single();

      if (error) throw error;

      // Increment sold count
      const ticket = tickets.find((t) => t.id === selectedTicket);
      if (ticket) {
        await supabase
          .from("event_tickets")
          .update({ sold: ticket.sold + 1 } as Record<string, unknown>)
          .eq("id", selectedTicket);
      }

      setRegCode(code);
      setRegId(data.id);
      setStep(2);
      toast.success("Registration confirmed!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 0) {
      if (!selectedTicket) {
        toast.error("Please select a ticket");
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
        toast.error("First name, last name, and email are required");
        return;
      }
      handleSubmit();
    }
  };

  const addToGoogleCalendar = () => {
    if (!event?.start_date) return;
    const start = new Date(event.start_date);
    const end = event.end_date ? new Date(event.end_date) : new Date(start.getTime() + 3600000);
    const loc = [event.venue, event.city, event.state].filter(Boolean).join(", ");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start.toISOString().replace(/[-:]/g, "").split(".")[0]}Z/${end.toISOString().replace(/[-:]/g, "").split(".")[0]}Z&location=${encodeURIComponent(loc)}&details=${encodeURIComponent("Registration code: " + regCode)}`;
    window.open(url, "_blank");
  };

  const selectedTicketData = tickets.find((t) => t.id === selectedTicket);

  /* ---- loading / error ---- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
          <Button asChild><Link to="/">Back to Home</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/events/${eventId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{event.title}</h1>
            <p className="text-sm text-gray-500">
              {event.start_date && format(new Date(event.start_date), "MMM d, yyyy")}
              {event.venue && ` · ${event.venue}`}
            </p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    i < step ? "bg-purple-500 text-white" :
                    i === step ? "bg-purple-100 text-purple-700 border-2 border-purple-500" :
                    "bg-gray-100 text-gray-400"
                  )}
                >
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={cn(
                  "text-sm font-medium hidden sm:inline",
                  i <= step ? "text-gray-900" : "text-gray-400"
                )}>
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={cn("w-8 sm:w-16 h-px ml-2", i < step ? "bg-purple-500" : "bg-gray-200")} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* ===== STEP 1: Select Ticket ===== */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Select Your Ticket</h2>
              <p className="text-gray-500">Choose the ticket type that's right for you.</p>
            </div>

            <div className="space-y-3">
              {tickets.map((t) => {
                const remaining = t.quantity ? t.quantity - t.sold : null;
                const soldOut = remaining !== null && remaining <= 0;
                const isSelected = selectedTicket === t.id;

                return (
                  <Card
                    key={t.id}
                    onClick={() => !soldOut && setSelectedTicket(t.id)}
                    className={cn(
                      "p-5 cursor-pointer transition-all border-2",
                      isSelected ? "border-purple-500 bg-purple-50/50 shadow-md" :
                      "border-gray-200 hover:border-gray-300",
                      soldOut && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 text-lg">{t.name}</h3>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        {t.description && (
                          <p className="text-sm text-gray-500 mb-2">{t.description}</p>
                        )}
                        {remaining !== null && !soldOut && (
                          <p className={cn(
                            "text-xs",
                            remaining < 20 ? "text-orange-500 font-medium" : "text-gray-400"
                          )}>
                            {remaining} spot{remaining !== 1 ? "s" : ""} remaining
                          </p>
                        )}
                        {soldOut && <p className="text-xs text-red-500 font-medium">Sold out</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-gray-900">
                          {t.price === 0 ? "Free" : `$${t.price}`}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {tickets.length === 0 && (
                <Card className="p-8 text-center border-dashed border-gray-300">
                  <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No tickets available yet.</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ===== STEP 2: Your Information ===== */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Information</h2>
              <p className="text-gray-500">
                Registering for: <span className="font-medium text-gray-700">{selectedTicketData?.name}</span>
                {selectedTicketData && (
                  <span className="text-purple-600 ml-1">
                    ({selectedTicketData.price === 0 ? "Free" : `$${selectedTicketData.price}`})
                  </span>
                )}
              </p>
            </div>

            <Card className="p-6 border-gray-200 space-y-5">
              {/* Required fields */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">First Name *</Label>
                  <Input
                    value={form.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    placeholder="John"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Last Name *</Label>
                  <Input
                    value={form.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    placeholder="Doe"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="john@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Phone</Label>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="(555) 555-5555"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Optional fields */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">Company / Organization</Label>
                  <Input
                    value={form.company}
                    onChange={(e) => updateField("company", e.target.value)}
                    placeholder="Acme Inc."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Job Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="Marketing Director"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Military info */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3">Military Affiliation</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700">Branch</Label>
                    <Select
                      value={form.military_branch}
                      onValueChange={(v) => updateField("military_branch", v)}
                    >
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>
                        {BRANCHES.map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-700">Status</Label>
                    <Select
                      value={form.military_status}
                      onValueChange={(v) => updateField("military_status", v)}
                    >
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Extra */}
              <div className="pt-4 border-t border-gray-100">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700">Dietary Restrictions</Label>
                    <Input
                      value={form.dietary_restrictions}
                      onChange={(e) => updateField("dietary_restrictions", e.target.value)}
                      placeholder="Vegetarian, allergies, etc."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">Special Requests</Label>
                    <Input
                      value={form.special_requests}
                      onChange={(e) => updateField("special_requests", e.target.value)}
                      placeholder="Accessibility needs, etc."
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Summary */}
            <Card className="p-4 border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ticket</p>
                  <p className="font-medium text-gray-900">{selectedTicketData?.name}</p>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {selectedTicketData?.price === 0 ? "Free" : `$${selectedTicketData?.price}`}
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* ===== STEP 3: Confirmation ===== */}
        {step === 2 && regCode && (
          <div className="space-y-6">
            {/* Success banner */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-500 mx-auto mb-4 flex items-center justify-center">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">You're Registered!</h2>
              <p className="text-gray-500">
                A confirmation has been sent to <span className="font-medium text-gray-700">{form.email}</span>
              </p>
            </div>

            {/* QR Code + Registration Code */}
            <Card className="p-6 border-gray-200 text-center">
              <div className="bg-white p-6 rounded-xl inline-block mb-4 border border-gray-100">
                <QRCodeSVG
                  value={`https://milcrunch.com/checkin/${regCode}`}
                  size={180}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="mb-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Registration Code</p>
                <p className="text-2xl font-mono font-bold text-gray-900 tracking-widest">{regCode}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(regCode);
                  toast.success("Code copied!");
                }}
              >
                <Copy className="w-4 h-4 mr-2" /> Copy Code
              </Button>
            </Card>

            {/* Event summary */}
            <Card className="p-5 border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Event Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-gray-900">
                      {event.start_date && format(new Date(event.start_date), "EEEE, MMMM d, yyyy")}
                    </p>
                    {event.start_date && (
                      <p className="text-gray-500">
                        {format(new Date(event.start_date), "h:mm a")} {event.timezone || "ET"}
                      </p>
                    )}
                  </div>
                </div>
                {event.venue && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-gray-900">{event.venue}</p>
                      <p className="text-gray-500">{[event.city, event.state].filter(Boolean).join(", ")}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Ticket className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-gray-900">{selectedTicketData?.name}</p>
                    <p className="text-gray-500">{form.first_name} {form.last_name}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Ride Share CTA */}
            {(event as Record<string, unknown>).rideshare_enabled && (
            <>
            <Card className="p-5 border-purple-200 bg-purple-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <Car className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">Need a ride? Offering one?</p>
                  <p className="text-sm text-gray-500">Coordinate rides with fellow attendees</p>
                </div>
                <Button
                  variant="outline"
                  className="border-purple-300 text-purple-700 hover:bg-purple-100 shrink-0"
                  onClick={() => setShowRideshare(true)}
                >
                  Set Up
                </Button>
              </div>
            </Card>

            <Dialog open={showRideshare} onOpenChange={setShowRideshare}>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Ride Share</DialogTitle>
                </DialogHeader>
                <RidesharePanel eventId={eventId!} />
              </DialogContent>
            </Dialog>
            </>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={addToGoogleCalendar}
              >
                <CalendarPlus className="w-4 h-4 mr-2" /> Add to Google Calendar
              </Button>
              <Button
                asChild
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
              >
                <Link to={`/events/${eventId}`}>Back to Event Page</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        {step < 2 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => step === 0 ? navigate(`/events/${eventId}`) : setStep(0)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {step === 0 ? "Back to Event" : "Back"}
            </Button>
            <Button
              onClick={handleNext}
              disabled={submitting}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
              ) : step === 0 ? (
                <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
              ) : (
                <>Complete Registration <Check className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventRegister;
