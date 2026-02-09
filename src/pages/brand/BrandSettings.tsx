import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings, User, Key, Link2, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const BrandSettings = () => {
  const { user, role, isSuperAdmin } = useAuth();
  const email = user?.email ?? "";
  const name = (user?.user_metadata?.full_name as string) ?? "";

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
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Connected</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Influencers.club</span>
              <span className={hasInfluencersClub ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                {hasInfluencersClub ? "Configured" : "Not configured"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Anthropic (AI)</span>
              <span className={hasAnthropic ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
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
