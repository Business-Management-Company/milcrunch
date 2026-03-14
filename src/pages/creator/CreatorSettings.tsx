import { useState } from "react";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Settings,
  Bell,
  Shield,
  Download,
  Loader2,
  Mail,
  User,
} from "lucide-react";
import { toast } from "sonner";

export default function CreatorSettings() {
  const { user, creatorProfile, refetchCreatorProfile } = useAuth();
  const [handle, setHandle] = useState(creatorProfile?.handle ?? "");
  const [savingHandle, setSavingHandle] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const saveHandle = async () => {
    if (!user?.id) return;
    const trimmed = handle.replace(/^@/, "").trim().toLowerCase();
    if (!trimmed) { toast.error("Handle cannot be empty"); return; }
    setSavingHandle(true);
    const { error } = await supabase
      .from("creator_profiles")
      .update({ handle: trimmed })
      .eq("user_id", user.id);
    if (error) {
      toast.error(error.message);
    } else {
      // Also update user_metadata so AuthContext stays in sync
      await supabase.auth.updateUser({ data: { handle: trimmed } });
      await refetchCreatorProfile();
      toast.success("Handle updated!");
    }
    setSavingHandle(false);
  };

  const sendPasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: "https://www.milcrunch.com/auth/callback",
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Password reset email sent to ${user.email}`);
    }
    setSendingReset(false);
  };

  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Account, notifications, privacy, and data.</p>
      </div>
      <div className="space-y-6 max-w-xl">
        {/* Account */}
        <Card className="rounded-xl border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Account</CardTitle>
            <CardDescription>Username, email, and password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Username / Handle */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-muted-foreground" />
                Username
              </Label>
              <p className="text-xs text-muted-foreground">Your bio page URL: milcrunch.com/{handle || "yourhandle"}</p>
              <div className="flex gap-2">
                <Input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/^@/, "").toLowerCase())}
                  placeholder="yourhandle"
                  className="flex-1"
                />
                <Button size="sm" onClick={saveHandle} disabled={savingHandle}>
                  {savingHandle ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Save
                </Button>
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
              </Label>
              <Input value={user?.email ?? ""} readOnly className="bg-muted/50 cursor-not-allowed" />
            </div>

            {/* Reset Password */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Password</Label>
              <div>
                <Button variant="outline" size="sm" onClick={sendPasswordReset} disabled={sendingReset}>
                  {sendingReset ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Mail className="h-3 w-3 mr-1" />}
                  Send reset email
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  We'll send a password reset link to {user?.email ?? "your email"}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="rounded-xl border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle>
            <CardDescription>Email alerts for outreach, events, milestones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Brand outreach</Label>
              <Switch defaultChecked className="data-[state=checked]:bg-[#1B3A6B]" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Event invites</Label>
              <Switch defaultChecked className="data-[state=checked]:bg-[#1B3A6B]" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Milestones</Label>
              <Switch defaultChecked className="data-[state=checked]:bg-[#1B3A6B]" />
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card className="rounded-xl border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Privacy</CardTitle>
            <CardDescription>Bio page visibility, follower counts, military details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Privacy toggles will be saved to your profile.</p>
          </CardContent>
        </Card>

        {/* Data export */}
        <Card className="rounded-xl border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Data export</CardTitle>
            <CardDescription>Download all your data (GDPR)</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">Request data export</Button>
          </CardContent>
        </Card>
      </div>
    </CreatorLayout>
  );
}
