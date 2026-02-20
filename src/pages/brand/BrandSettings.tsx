import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings, User, Key, Link2, Zap, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePresentationMode } from "@/hooks/usePresentationMode";
import { cn } from "@/lib/utils";

const BrandSettings = () => {
  const { user, role, isSuperAdmin } = useAuth();
  const pres = usePresentationMode();
  const email = pres.displayEmail;
  const name = pres.displayName;

  const hasInfluencersClub = !!import.meta.env.VITE_INFLUENCERS_CLUB_API_KEY;
  const hasAnthropic = !!import.meta.env.VITE_ANTHROPIC_API_KEY;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">
          Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage your account and brand preferences.
        </p>
      </div>

      {isSuperAdmin && (
        <Card className="bg-white dark:bg-[#1A1D27] border border-amber-500/30 dark:border-amber-500/30 rounded-xl mb-6">
          <CardContent className="pt-6">
            <Link
              to="/admin"
              className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium hover:underline"
            >
              <Zap className="h-5 w-5" /> Super Admin Panel →
            </Link>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p className="font-medium mt-1">{email || "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Name</Label>
            <p className="font-medium mt-1">{name || "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Role</Label>
            <p className="font-medium mt-1 capitalize">{role ?? "—"}</p>
          </div>

          {/* Demo Mode toggle — super_admin only */}
          {isSuperAdmin && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {pres.active ? (
                    <div className="w-9 h-9 rounded-lg bg-[#6C5CE7]/10 flex items-center justify-center">
                      <EyeOff className="h-4.5 w-4.5 text-[#6C5CE7]" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Eye className="h-4.5 w-4.5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Demo Mode
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Hide personal info during presentations
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={pres.toggle}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6C5CE7] focus-visible:ring-offset-2",
                    pres.active
                      ? "bg-[#6C5CE7]"
                      : "bg-gray-200 dark:bg-gray-700"
                  )}
                  role="switch"
                  aria-checked={pres.active}
                  aria-label="Toggle demo mode"
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      pres.active ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
              {pres.active && (
                <p className="mt-2 text-xs text-[#6C5CE7] font-medium bg-[#6C5CE7]/5 rounded-lg px-3 py-2">
                  Demo Mode is ON — displaying as "Demo User" / "demo@milcrunch.com" everywhere.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Connected integrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span>Supabase</span>
              <span className="text-purple-600 dark:text-purple-400 font-medium">Connected</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Influencers.club</span>
              <span className={hasInfluencersClub ? "text-purple-600 dark:text-purple-400 font-medium" : "text-muted-foreground"}>
                {hasInfluencersClub ? "Configured" : "Not configured"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Anthropic (AI)</span>
              <span className={hasAnthropic ? "text-purple-600 dark:text-purple-400 font-medium" : "text-muted-foreground"}>
                {hasAnthropic ? "Configured" : "Not configured"}
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-[#1A1D27] border border-gray-200 dark:border-gray-800 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4">
            Send a password reset link to your email.
          </p>
          <Button variant="outline" asChild>
            <Link to="/login?mode=forgot">Change password</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
};

export default BrandSettings;
