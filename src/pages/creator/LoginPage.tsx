import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { DEMO_EMAIL } from "@/hooks/useDemoMode";

const DEMO_PASSWORD = "MIC2026demo";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const isForgot = searchParams.get("mode") === "forgot";
  const isDemoTrigger = searchParams.get("demo") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const demoTriggered = useRef(false);

  const { signIn, signInWithOAuth, resetPassword, user, loading: authLoading, getRedirectPath } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || !user) return;
    const path = getRedirectPath();
    if (path) navigate(path, { replace: true });
  }, [user, authLoading, getRedirectPath, navigate]);

  /* Auto-trigger demo login when ?demo=true */
  useEffect(() => {
    if (!isDemoTrigger || authLoading || user || demoTriggered.current) return;
    demoTriggered.current = true;
    (async () => {
      setLoading(true);
      localStorage.setItem('parade-deck-theme', 'light');
      document.documentElement.classList.remove('dark');
      const { error } = await signIn(DEMO_EMAIL, DEMO_PASSWORD);
      setLoading(false);
      if (error) toast.error("Demo login failed. Please try again.");
    })();
  }, [isDemoTrigger, authLoading, user, signIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your email.");
      return;
    }
    if (isForgot) {
      setLoading(true);
      const { error } = await resetPassword(email.trim());
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Check your email for the reset link.");
      navigate("/login", { replace: true });
      return;
    }
    if (!password) {
      toast.error("Enter your password.");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.email === DEMO_EMAIL) {
      navigate("/brand/dashboard", { replace: true });
      return;
    }

    // Check profile table for role (user_metadata may be unset for admin accounts)
    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("role, onboarding_completed")
      .eq("user_id", user?.id)
      .maybeSingle();

    const role = user?.user_metadata?.role || profile?.role || "creator";

    if (role === "super_admin") {
      navigate("/admin", { replace: true });
      return;
    }
    if (role === "admin" || role === "brand") {
      navigate("/brand/dashboard", { replace: true });
      return;
    }
    // Only creators hit onboarding check
    if (!profile || !profile.onboarding_completed) {
      navigate("/creator/onboard", { replace: true });
    } else {
      navigate("/creator/dashboard", { replace: true });
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    const { error } = await signInWithOAuth(provider);
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1B2A4A] to-[#0d2137] flex items-center justify-center p-4">
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
            <span className="text-3xl font-bold tracking-tight"><span className="text-[#000741] dark:text-white">recurrent</span><span className="text-[#6C5CE7] font-extrabold">X</span></span>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isForgot ? "Reset Password" : "Welcome Back"}
          </CardTitle>
          <CardDescription>
            {isForgot ? "Enter your email to receive a reset link" : "Sign in to your MilCrunch creator account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
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
            {!isForgot && (
              <>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      autoComplete="current-password"
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
                <div className="flex justify-end">
                  <Link to="/login?mode=forgot" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (isForgot ? "Sending..." : "Signing in...") : isForgot ? "Send reset link" : "Sign in"}
            </Button>
          </form>
          {isForgot && (
            <p className="text-center text-sm text-muted-foreground">
              <button type="button" onClick={() => navigate("/login")} className="text-primary hover:underline">
                Back to sign in
              </button>
            </p>
          )}

          {!isForgot && (
            <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative flex justify-center text-xs uppercase text-muted-foreground bg-card px-2">
              Or continue with
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

          {/* Demo access */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative flex justify-center text-xs text-muted-foreground bg-card px-2">
              — or —
            </span>
          </div>

          <Button
            type="button"
            className="w-full text-white font-medium"
            style={{ backgroundColor: "#1B2A4A" }}
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              localStorage.setItem('parade-deck-theme', 'light');
              document.documentElement.classList.remove('dark');
              const { error } = await signIn(DEMO_EMAIL, DEMO_PASSWORD);
              setLoading(false);
              if (error) {
                toast.error("Demo login failed. Please try again.");
              } else {
                navigate("/brand/dashboard", { replace: true });
              }
            }}
          >
            🎯 Explore Demo
          </Button>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground pt-2">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
