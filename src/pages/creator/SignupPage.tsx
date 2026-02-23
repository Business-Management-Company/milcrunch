import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

const AUDIENCE_OPTIONS = [
  { value: "veteran", label: "Veteran" },
  { value: "active_duty", label: "Active Duty" },
  { value: "military_spouse", label: "Military Spouse" },
  { value: "reservist", label: "Reservist" },
  { value: "content_creator", label: "Content Creator" },
  { value: "supporter", label: "Supporter" },
];

const BRANCH_OPTIONS = [
  { value: "army", label: "Army" },
  { value: "navy", label: "Navy" },
  { value: "air_force", label: "Air Force" },
  { value: "marines", label: "Marines" },
  { value: "coast_guard", label: "Coast Guard" },
  { value: "space_force", label: "Space Force" },
];

const MILITARY_AUDIENCE = new Set(["veteran", "active_duty", "reservist"]);

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [audienceType, setAudienceType] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signUpCreator, signInWithOAuth } = useAuth();
  const navigate = useNavigate();

  const showBranch = audienceType && MILITARY_AUDIENCE.has(audienceType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Enter your display name.");
      return;
    }
    if (!email.trim()) {
      toast.error("Enter your email.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (!tosAccepted) {
      toast.error("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    setLoading(true);
    const { error } = await signUpCreator({
      email: email.trim(),
      password,
      displayName: displayName.trim(),
      audienceType: audienceType || undefined,
      branch: branch || undefined,
      tosAccepted,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created! Redirecting to onboarding.");
    navigate("/creator/onboard", { replace: true });
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    const { error } = await signInWithOAuth(provider);
    if (error) toast.error(error.message);
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
            <span className="text-3xl font-bold tracking-tight"><span className="text-[#000741] dark:text-white">Mil</span><span className="text-[#1e3a5f] font-extrabold">Crunch</span></span>
          </div>
          <CardTitle className="text-2xl font-bold">Join MilCrunch</CardTitle>
          <CardDescription>Create your creator account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1"
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">Password (min 8 characters)</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  autoComplete="new-password"
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label>I am a...</Label>
              <Select value={audienceType} onValueChange={setAudienceType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select one" />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showBranch && (
              <div>
                <Label>Branch (optional)</Label>
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCH_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Checkbox
                id="tos"
                checked={tosAccepted}
                onCheckedChange={(c) => setTosAccepted(Boolean(c))}
              />
              <Label htmlFor="tos" className="text-sm font-normal cursor-pointer leading-tight">
                I agree to the{" "}
                <a href="/resources" className="text-primary hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative flex justify-center text-xs uppercase text-muted-foreground bg-card px-2">
              Or sign up with
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={() => handleOAuth("google")}>
              Google
            </Button>
            <Button type="button" variant="outline" onClick={() => handleOAuth("apple")}>
              Apple
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground pt-2">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
