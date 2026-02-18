import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useUploadPostConnect } from "@/hooks/useUploadPostConnect";
import {
  Settings,
  Bell,
  Shield,
  Download,
  Link2,
  Loader2,
  RefreshCw,
  ExternalLink,
  Instagram,
  Youtube,
  Facebook,
  Linkedin,
  X,
} from "lucide-react";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.16 8.16 0 004.76 1.52V7.12a4.84 4.84 0 01-1-.43z" />
  </svg>
);

interface PlatformDef {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const PLATFORMS: PlatformDef[] = [
  { id: "instagram", name: "Instagram", icon: <Instagram className="w-5 h-5" />, color: "text-pink-500", bgColor: "bg-pink-50" },
  { id: "tiktok", name: "TikTok", icon: <TikTokIcon className="w-5 h-5" />, color: "text-gray-900", bgColor: "bg-gray-100" },
  { id: "youtube", name: "YouTube", icon: <Youtube className="w-5 h-5" />, color: "text-red-600", bgColor: "bg-red-50" },
  { id: "x", name: "Twitter / X", icon: <X className="w-5 h-5" />, color: "text-gray-900", bgColor: "bg-gray-100" },
  { id: "facebook", name: "Facebook", icon: <Facebook className="w-5 h-5" />, color: "text-blue-600", bgColor: "bg-blue-50" },
  { id: "linkedin", name: "LinkedIn", icon: <Linkedin className="w-5 h-5" />, color: "text-blue-700", bgColor: "bg-blue-50" },
];

function formatFollowers(n: number | null | undefined): string {
  if (n == null) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function CreatorSettings() {
  const { accounts, loading, connectLoading, syncing, openConnectPopup, syncAccounts } = useUploadPostConnect();

  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Account, notifications, privacy, and data.</p>
      </div>
      <div className="space-y-6 max-w-xl">
        {/* Connected Accounts */}
        <Card className="rounded-xl border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Connected Accounts</CardTitle>
            <CardDescription>Manage your linked social media accounts via Upload-Post.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={openConnectPopup} disabled={connectLoading}>
                {connectLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ExternalLink className="h-3 w-3 mr-1" />}
                Connect / Add Platform
              </Button>
              <Button size="sm" variant="outline" onClick={() => syncAccounts()} disabled={syncing}>
                {syncing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Sync
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading connections...
              </div>
            ) : (
              <div className="space-y-2">
                {PLATFORMS.map((p) => {
                  const conn = accounts.find((a) => a.platform === p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${p.bgColor} ${p.color}`}>
                        {p.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{p.name}</p>
                        {conn ? (
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                            <span className="text-xs text-green-600 font-medium truncate">
                              {conn.platform_username ? `@${conn.platform_username}` : "Connected"}
                            </span>
                            {conn.followers_count != null && conn.followers_count > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {formatFollowers(conn.followers_count)} followers
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not connected</span>
                        )}
                      </div>
                      {conn ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs">Connected</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={openConnectPopup} disabled={connectLoading}>
                          Connect
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="rounded-xl border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Account</CardTitle>
            <CardDescription>Email, password, delete account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Account settings and password change will go here.</p>
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
