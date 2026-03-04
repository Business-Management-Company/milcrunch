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

  const handleOAuth = async () => {
    const { error } = await signInWithOAuth("google");
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

          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleOAuth}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </Button>

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
