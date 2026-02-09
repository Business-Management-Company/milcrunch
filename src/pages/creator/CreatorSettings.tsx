import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell, Shield, Download } from "lucide-react";

export default function CreatorSettings() {
  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Account, notifications, privacy, and data.</p>
      </div>
      <div className="space-y-6 max-w-xl">
        <Card className="rounded-xl border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Account</CardTitle>
            <CardDescription>Email, password, delete account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Account settings and password change will go here.</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle>
            <CardDescription>Email alerts for outreach, events, milestones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Brand outreach</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Event invites</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Milestones</Label>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Privacy</CardTitle>
            <CardDescription>Bio page visibility, follower counts, military details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Privacy toggles will be saved to creator_profiles.</p>
          </CardContent>
        </Card>
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
