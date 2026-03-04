import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
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
    // After successful signIn, the AuthContext useEffect will fire getRedirectPath()
    // which handles routing via the user_roles table (with RPC fallback).
    // No need to duplicate routing logic here.
  };

  const handleOAuth = async (provider: "google" | "linkedin_oidc") => {
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
            <span className="text-3xl font-bold tracking-tight"><span className="text-[#000741] dark:text-white">Mil</span><span className="text-[#1e3a5f] font-extrabold">Crunch</span></span>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isForgot ? "Reset Password" : "Welcome Back"}
          </CardTitle>
          <CardDescription>
            {isForgot ? "Enter your email to receive a reset link" : "Sign in to your MilCrunch creator account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isForgot && (
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 h-11 bg-white text-gray-700 font-medium border-gray-300 hover:bg-gray-50"
                onClick={() => handleOAuth("google")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.2 0 5.9 1.1 8.1 2.9l6-6C34.5 3.2 29.6 1 24 1 14.8 1 7 6.7 3.7 14.6l7 5.4C12.4 13.5 17.7 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7c4.3-4 6.8-9.9 6.8-16.9z" />
                  <path fill="#FBBC05" d="M10.7 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7-5.4A23.9 23.9 0 0 0 .5 24c0 3.9.9 7.5 2.8 10.7l7.4-6.1z" />
                  <path fill="#34A853" d="M24 47c5.4 0 10-1.8 13.3-4.8l-7.4-5.7c-1.8 1.2-4.1 1.9-5.9 1.9-6.3 0-11.6-4.2-13.5-9.9l-7.4 6.1C7.1 41.5 14.9 47 24 47z" />
                </svg>
                Continue with Google
              </Button>
              <Button
                type="button"
                className="w-full flex items-center justify-center gap-2 h-11 text-white font-medium hover:opacity-90"
                style={{ backgroundColor: "#0077B5" }}
                onClick={() => handleOAuth("linkedin_oidc")}
              >
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#ffffff" />
                </svg>
                Continue with LinkedIn
              </Button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <span className="relative flex justify-center text-xs uppercase text-muted-foreground bg-card px-2">
                  Or sign in with email
                </span>
              </div>
            </div>
          )}

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
            onClick={() => {
              navigate("/prospectus");
            }}
          >
            🎯 Explore Demo
          </Button>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground pt-2">
            Interested in MilCrunch?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Request a Demo
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
