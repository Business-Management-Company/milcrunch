import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Check, Ticket, Loader2, Calendar,
  MapPin, AlertCircle, Copy, CalendarPlus, Users, PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

/* ---------- types ---------- */
interface EventRow {
  id: string;
  title: string;
  slug: string | null;
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
const DIETARY = ["None", "Vegetarian", "Vegan", "Gluten-Free", "Halal", "Kosher", "Other"];

/* ======================================== */
const AttendeeRegister = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);

  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);

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

  const [regCode, setRegCode] = useState<string | null>(null);
  const [regId, setRegId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [eventSlug]);

  // Pre-fill from auth
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        email: prev.email || user.email || "",
        first_name: prev.first_name || user.user_metadata?.full_name?.split(" ")[0] || "",
        last_name: prev.last_name || user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
      }));
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventSlug!);
      let query = supabase
        .from("events")
        .select("id, title, slug, start_date, end_date, venue, city, state, timezone, cover_image_url");
      if (isUUID) {
        query = query.eq("id", eventSlug!);
      } else {
        query = query.eq("slug", eventSlug!);
      }
      const evRes = await query.single();
      if (evRes.error) throw evRes.error;
      const ev = evRes.data as unknown as EventRow;
      setEvent(ev);

      const tkRes = await supabase
        .from("event_tickets")
        .select("id, name, description, price, quantity, sold")
        .eq("event_id", ev.id)
        .eq("is_active", true)
        .order("sort_order");
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
    const prefix = (event?.title || "EVT").replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase();
    let code = `${prefix}-`;
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleSubmit = async () => {
    if (!event || !selectedTicket) return;
    setSubmitting(true);
    try {
      const code = generateCode();
      const { data, error } = await supabase
        .from("event_registrations")
        .insert({
          event_id: event.id,
          ticket_id: selectedTicket,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          company: form.company.trim() || null,
          title: form.title.trim() || null,
          military_branch: form.military_branch || null,
          military_status: form.military_status || null,
          dietary_restrictions: form.dietary_restrictions || null,
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
  const eventSlugOrId = event?.slug || event?.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
          <Button asChild className="bg-[#6C5CE7] hover:bg-[#5B4BD5] text-white">
            <Link to="/events">Browse Events</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to={`/attend/${eventSlug}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="font-bold text-gray-900 text-sm truncate">{event.title}</h1>
            <p className="text-xs text-gray-500">Registration</p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
                    i < step
                      ? "bg-[#6C5CE7] text-white"
                      : i === step
                      ? "bg-purple-100 text-[#6C5CE7] border-2 border-[#6C5CE7]"
                      : "bg-gray-100 text-gray-400"
                  )}
                >
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium hidden sm:inline",
                    i <= step ? "text-gray-900" : "text-gray-400"
                  )}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-6 sm:w-12 h-px ml-1",
                      i < step ? "bg-[#6C5CE7]" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* STEP 1: Select Ticket */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Select Your Ticket</h2>
              <p className="text-sm text-gray-500">Choose the ticket type that's right for you.</p>
            </div>

            <div className="space-y-2">
              {tickets.map((t) => {
                const remaining = t.quantity ? t.quantity - t.sold : null;
                const soldOut = remaining !== null && remaining <= 0;
                const isSelected = selectedTicket === t.id;

                return (
                  <Card
                    key={t.id}
                    onClick={() => !soldOut && setSelectedTicket(t.id)}
                    className={cn(
                      "p-4 cursor-pointer transition-all border-2",
                      isSelected
                        ? "border-[#6C5CE7] bg-purple-50/50 shadow-md"
                        : "border-gray-200 hover:border-gray-300",
                      soldOut && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{t.name}</h3>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[#6C5CE7] flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        {t.description && (
                          <p className="text-xs text-gray-500 mb-1">{t.description}</p>
                        )}
                        {remaining !== null && !soldOut && (
                          <p
                            className={cn(
                              "text-[10px]",
                              remaining < 20 ? "text-orange-500 font-medium" : "text-gray-400"
                            )}
                          >
                            {remaining} spot{remaining !== 1 ? "s" : ""} remaining
                          </p>
                        )}
                        {soldOut && <p className="text-[10px] text-red-500 font-medium">Sold out</p>}
                      </div>
                      <p className="text-xl font-bold text-gray-900 shrink-0">
                        {t.price === 0 ? "Free" : `$${t.price}`}
                      </p>
                    </div>
                  </Card>
                );
              })}

              {tickets.length === 0 && (
                <Card className="p-8 text-center border-dashed border-gray-300">
                  <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No tickets available yet.</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Your Information */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Your Information</h2>
              <p className="text-sm text-gray-500">
                Registering for:{" "}
                <span className="font-medium text-gray-700">{selectedTicketData?.name}</span>
                {selectedTicketData && (
                  <span className="text-[#6C5CE7] ml-1">
                    ({selectedTicketData.price === 0 ? "Free" : `$${selectedTicketData.price}`})
                  </span>
                )}
              </p>
            </div>

            <Card className="p-4 border-gray-200 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">First Name *</Label>
                  <Input
                    value={form.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    placeholder="John"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Last Name *</Label>
                  <Input
                    value={form.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    placeholder="Doe"
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="john@example.com"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Phone</Label>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="(555) 555-5555"
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">Company</Label>
                  <Input
                    value={form.company}
                    onChange={(e) => updateField("company", e.target.value)}
                    placeholder="Acme Inc."
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Job Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="Marketing Director"
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-600 mb-2">Military Affiliation</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600">Branch</Label>
                    <Select value={form.military_branch} onValueChange={(v) => updateField("military_branch", v)}>
                      <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {BRANCHES.map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Status</Label>
                    <Select value={form.military_status} onValueChange={(v) => updateField("military_status", v)}>
                      <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600">Dietary Restrictions</Label>
                    <Select value={form.dietary_restrictions} onValueChange={(v) => updateField("dietary_restrictions", v)}>
                      <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        {DIETARY.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Special Requests</Label>
                    <Input
                      value={form.special_requests}
                      onChange={(e) => updateField("special_requests", e.target.value)}
                      placeholder="Accessibility, etc."
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* STEP 3: Confirmation */}
        {step === 2 && regCode && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#6C5CE7] mx-auto mb-3 flex items-center justify-center">
                <PartyPopper className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">You're Registered!</h2>
              <p className="text-sm text-gray-500">
                Confirmation sent to <span className="font-medium text-gray-700">{form.email}</span>
              </p>
            </div>

            <Card className="p-6 border-gray-200 text-center">
              <div className="bg-white p-4 rounded-xl inline-block mb-3 border border-gray-100">
                <QRCodeSVG
                  value={`https://milcrunch.com/checkin/${regCode}`}
                  size={160}
                  level="M"
                  fgColor="#6C5CE7"
                />
              </div>
              <div className="mb-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Registration Code</p>
                <p className="text-xl font-mono font-bold text-gray-900 tracking-widest">{regCode}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(regCode);
                  toast.success("Code copied!");
                }}
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Code
              </Button>
            </Card>

            <Card className="p-4 border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm mb-2">Event Details</h3>
              <div className="space-y-2 text-sm">
                {event.start_date && (
                  <div className="flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-[#6C5CE7] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-gray-900">{format(parseISO(event.start_date), "EEEE, MMMM d, yyyy")}</p>
                    </div>
                  </div>
                )}
                {event.venue && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#6C5CE7] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-gray-900">{event.venue}</p>
                      <p className="text-gray-500 text-xs">{[event.city, event.state].filter(Boolean).join(", ")}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2.5">
                  <Ticket className="w-4 h-4 text-[#6C5CE7] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-gray-900">{selectedTicketData?.name}</p>
                    <p className="text-gray-500 text-xs">{form.first_name} {form.last_name}</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={addToGoogleCalendar}>
                <CalendarPlus className="w-3.5 h-3.5 mr-1.5" /> Add to Calendar
              </Button>
              <Button
                asChild
                size="sm"
                className="flex-1 bg-[#6C5CE7] hover:bg-[#5B4BD5] text-white"
              >
                <Link to={`/attend/${eventSlug}`}>View Schedule</Link>
              </Button>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-full"
            >
              <Link to={`/attend/${eventSlug}/community`}>
                <Users className="w-4 h-4 mr-2" /> Join the Community
              </Link>
            </Button>
          </div>
        )}

        {/* Navigation */}
        {step < 2 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (step === 0 ? navigate(`/attend/${eventSlug}`) : setStep(0))}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {step === 0 ? "Back" : "Back"}
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              disabled={submitting}
              className="bg-[#6C5CE7] hover:bg-[#5B4BD5] text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" /> Processing...
                </>
              ) : step === 0 ? (
                <>
                  Continue <ArrowRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Complete Registration <Check className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendeeRegister;
