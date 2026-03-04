import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

const STEPS = ["Create Account", "Attendee Details", "Confirmation"];

const BRANCHES = [
  "Army",
  "Navy",
  "Air Force",
  "Marines",
  "Coast Guard",
  "Space Force",
  "Civilian",
];

/* ======================================== */
const AttendeeRegister = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [existingRegistration, setExistingRegistration] = useState(false);

  // Step 1: Account
  const [accountForm, setAccountForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });

  // Step 2: Details
  const [detailsForm, setDetailsForm] = useState({
    phone: "",
    branch: "",
    job_title: "",
    company: "",
  });

  // Step 3: Confirmation
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  useEffect(() => {
    fetchEvent();
  }, [eventSlug]);

  // If user is already logged in, pre-fill and check registration
  useEffect(() => {
    if (user && event) {
      setAccountForm((prev) => ({
        ...prev,
        email: prev.email || user.email || "",
        first_name:
          prev.first_name ||
          user.user_metadata?.full_name?.split(" ")[0] ||
          "",
        last_name:
          prev.last_name ||
          user.user_metadata?.full_name?.split(" ").slice(1).join(" ") ||
          "",
      }));
      checkExistingRegistration();
    }
  }, [user, event]);

  const fetchEvent = async () => {
    try {
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          eventSlug!
        );
      let query = supabase
        .from("events")
        .select(
          "id, title, slug, start_date, end_date, venue, city, state, timezone, cover_image_url"
        );
      if (isUUID) {
        query = query.eq("id", eventSlug!);
      } else {
        query = query.eq("slug", eventSlug!);
      }
      const { data, error } = await query.single();
      if (error) throw error;
      setEvent(data as unknown as EventRow);
    } catch (err) {
      console.error("Error loading event:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingRegistration = async () => {
    if (!user || !event) return;
    try {
      const { data } = await supabase
        .from("event_registrations")
        .select("id")
        .eq("event_id", event.id)
        .eq("email", user.email!)
        .eq("status", "confirmed")
        .maybeSingle();
      if (data) {
        setExistingRegistration(true);
        // Skip straight to app
        navigate(`/attend/${eventSlug}`, { replace: true });
      }
    } catch {
      // Silent
    }
  };

  const handleAccountNext = async () => {
    const { first_name, last_name, email, password } = accountForm;
    if (!first_name.trim() || !last_name.trim() || !email.trim()) {
      toast.error("First name, last name, and email are required");
      return;
    }

    // If user is already logged in, skip account creation
    if (user) {
      setStep(1);
      return;
    }

    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: `${first_name.trim()} ${last_name.trim()}`,
          },
        },
      });

      if (error) {
        // If user already exists, try to sign in
        if (error.message.includes("already registered")) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (signInError) {
            toast.error("Account exists. Please check your password.");
            return;
          }
        } else {
          toast.error(error.message);
          return;
        }
      }

      setStep(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Account creation failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDetailsSubmit = async () => {
    if (!event || !user) {
      toast.error("Please create an account first");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("event_registrations")
        .insert({
          event_id: event.id,
          user_id: user.id,
          first_name: accountForm.first_name.trim(),
          last_name: accountForm.last_name.trim(),
          email: accountForm.email.trim(),
          phone: detailsForm.phone.trim() || null,
          military_branch: detailsForm.branch || null,
          title: detailsForm.job_title.trim() || null,
          company: detailsForm.company.trim() || null,
          status: "confirmed",
          registered_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .select("id")
        .single();

      if (error) throw error;

      setRegistrationId(data.id);
      setStep(2);
      toast.success("Registration confirmed!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
          <Button asChild className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white">
            <Link to="/events">Browse Events</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-gray-50 flex flex-col shadow-2xl">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#0A0F1E] h-14 flex items-center px-4 gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:text-white hover:bg-white/10 shrink-0"
            onClick={() => navigate(`/attend/${eventSlug}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white text-sm truncate">{event.title}</h1>
            <p className="text-xs text-gray-400">Registration</p>
          </div>
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="14" height="14"><polygon points="16,1 29,8.5 29,23.5 16,31 3,23.5 3,8.5" fill="#f59e0b"/></svg>
            <span className="text-xs font-bold text-white" style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800 }}>MilCrunch</span>
          </span>
        </header>

        {/* Step indicator */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
                      i < step
                        ? "bg-[#1e3a5f] text-white"
                        : i === step
                        ? "bg-blue-100 text-[#1e3a5f] border-2 border-[#1e3a5f]"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium hidden sm:inline",
                      i <= step ? "text-gray-900" : "text-gray-400"
                    )}
                  >
                    {label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "w-6 sm:w-12 h-px ml-1",
                        i < step ? "bg-[#1e3a5f]" : "bg-gray-200"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-6">
          {/* STEP 1: Create Account */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create Account</h2>
                <p className="text-sm text-gray-500">
                  Sign up to register for {event.title}
                </p>
              </div>

              <Card className="p-4 border-gray-200 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600">First Name *</Label>
                    <Input
                      value={accountForm.first_name}
                      onChange={(e) =>
                        setAccountForm((p) => ({ ...p, first_name: e.target.value }))
                      }
                      placeholder="John"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Last Name *</Label>
                    <Input
                      value={accountForm.last_name}
                      onChange={(e) =>
                        setAccountForm((p) => ({ ...p, last_name: e.target.value }))
                      }
                      placeholder="Doe"
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-600">Email *</Label>
                  <Input
                    type="email"
                    value={accountForm.email}
                    onChange={(e) =>
                      setAccountForm((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="john@example.com"
                    className="mt-1 text-sm"
                    disabled={!!user}
                  />
                </div>

                {!user && (
                  <div>
                    <Label className="text-xs text-gray-600">Password *</Label>
                    <Input
                      type="password"
                      value={accountForm.password}
                      onChange={(e) =>
                        setAccountForm((p) => ({ ...p, password: e.target.value }))
                      }
                      placeholder="Min 6 characters"
                      className="mt-1 text-sm"
                    />
                  </div>
                )}

                {user && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Signed in as {user.email}
                  </p>
                )}
              </Card>
            </div>
          )}

          {/* STEP 2: Attendee Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Attendee Details</h2>
                <p className="text-sm text-gray-500">
                  Tell us a bit about yourself
                </p>
              </div>

              <Card className="p-4 border-gray-200 space-y-4">
                <div>
                  <Label className="text-xs text-gray-600">Phone (optional)</Label>
                  <Input
                    type="tel"
                    value={detailsForm.phone}
                    onChange={(e) =>
                      setDetailsForm((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="(555) 555-5555"
                    className="mt-1 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600">Branch of Service</Label>
                  <Select
                    value={detailsForm.branch}
                    onValueChange={(v) =>
                      setDetailsForm((p) => ({ ...p, branch: v }))
                    }
                  >
                    <SelectTrigger className="mt-1 text-sm">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-gray-600">Job Title</Label>
                  <Input
                    value={detailsForm.job_title}
                    onChange={(e) =>
                      setDetailsForm((p) => ({ ...p, job_title: e.target.value }))
                    }
                    placeholder="Marketing Director"
                    className="mt-1 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600">Company / Unit</Label>
                  <Input
                    value={detailsForm.company}
                    onChange={(e) =>
                      setDetailsForm((p) => ({ ...p, company: e.target.value }))
                    }
                    placeholder="Acme Inc."
                    className="mt-1 text-sm"
                  />
                </div>
              </Card>
            </div>
          )}

          {/* STEP 3: Confirmation */}
          {step === 2 && registrationId && (
            <div className="space-y-5">
              <div className="text-center pt-2">
                <div className="w-16 h-16 rounded-full bg-[#1e3a5f] mx-auto mb-3 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  You're registered!
                </h2>
                <p className="text-sm text-gray-500">{event.title}</p>
              </div>

              <Card className="p-6 border-gray-200 text-center">
                <div className="bg-white p-4 rounded-xl inline-block mb-3 border border-gray-100">
                  <QRCodeSVG
                    value={registrationId}
                    size={160}
                    level="M"
                    fgColor="#1e3a5f"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Show this QR code at check-in
                </p>
              </Card>

              <Button
                asChild
                className="w-full bg-[#1e3a5f] hover:bg-[#2d5282] text-white h-12 text-base"
              >
                <Link to={`/attend/${eventSlug}`}>Enter Event</Link>
              </Button>
            </div>
          )}

          {/* Navigation buttons */}
          {step < 2 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  step === 0
                    ? navigate(`/attend/${eventSlug}`)
                    : setStep(0)
                }
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                size="sm"
                onClick={step === 0 ? handleAccountNext : handleDetailsSubmit}
                disabled={submitting}
                className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />{" "}
                    {step === 0 ? "Creating..." : "Registering..."}
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
    </div>
  );
};

export default AttendeeRegister;
