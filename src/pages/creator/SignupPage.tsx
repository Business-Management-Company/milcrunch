import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "brand_sponsor", label: "Brand / Sponsor" },
  { value: "event_organizer", label: "Event Organizer" },
  { value: "creator", label: "Creator" },
  { value: "media", label: "Media" },
  { value: "government_military", label: "Government / Military" },
  { value: "other", label: "Other" },
];

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("leads").insert({
      full_name: fullName.trim(),
      email: email.trim(),
      organization: organization.trim() || null,
      role: role || null,
      message: message.trim() || null,
    } as Record<string, unknown>);
    setLoading(false);
    if (error) {
      console.warn("[RequestDemo] insert error:", error.message);
      toast.error("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1B2A4A] to-[#0d2137] flex items-center justify-center p-4 py-12">
      <div className="absolute top-6 left-6">
        <Button variant="ghost" asChild className="text-white/80 hover:text-white">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      <Card className="w-full max-w-md bg-white/95 dark:bg-card border-border shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <span className="text-3xl font-bold tracking-tight">
              <span className="text-[#000741] dark:text-white">Mil</span>
              <span className="text-[#1e3a5f] font-extrabold">Crunch</span>
            </span>
          </div>
          <CardTitle className="text-2xl font-bold">Request a Demo</CardTitle>
          <CardDescription>
            See how MilCrunch can power your events, creators, and campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-900">Thanks! We'll be in touch within 24 hours.</h3>
              <p className="text-sm text-gray-500">
                We received your request and a team member will reach out shortly.
              </p>
              <Link to="/" className="inline-block text-sm text-[#1e3a5f] font-medium hover:underline mt-2">
                Back to Home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fullName">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1"
                  autoComplete="name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <Label htmlFor="organization">Organization / Company</Label>
                <Input
                  id="organization"
                  type="text"
                  placeholder="Acme Corp"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="mt-1"
                  autoComplete="organization"
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  placeholder="Tell us what you're looking for..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Request Demo"}
              </Button>
            </form>
          )}

          {!submitted && (
            <p className="text-center text-sm text-muted-foreground pt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
