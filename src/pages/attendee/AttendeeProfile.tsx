import { useState } from "react";
import {
  QrCode, Mail, Phone, Globe, LogOut, Settings, Shield,
  Calendar, MapPin, Ticket,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";

interface Props {
  eventId: string;
  event: {
    title: string;
    start_date: string | null;
    end_date: string | null;
    venue: string | null;
    city: string | null;
    state: string | null;
  } | null;
}

export default function AttendeeProfile({ eventId, event }: Props) {
  const { user, signOut } = useAuth();
  const [shareEmail, setShareEmail] = useState(true);
  const [sharePhone, setSharePhone] = useState(false);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Attendee";
  const email = user?.email || "";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  // QR code data: user ID + event ID for scanning
  const qrData = JSON.stringify({
    type: "recurrentx_connect",
    userId: user?.id || "demo",
    eventId,
    name: displayName,
  });

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <Card className="p-5 bg-white dark:bg-[#1A1D27] rounded-xl text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6C5CE7] to-purple-400 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
          {initials}
        </div>
        <h2 className="font-bold text-lg">{displayName}</h2>
        <p className="text-sm text-muted-foreground">{email}</p>
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mt-2 text-xs">
          <Ticket className="h-3 w-3 mr-1" /> Registered
        </Badge>
      </Card>

      {/* QR Code Card */}
      <Card className="p-5 bg-white dark:bg-[#1A1D27] rounded-xl text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <QrCode className="h-5 w-5 text-[#6C5CE7]" />
          <h3 className="font-semibold text-sm">Your Connection QR Code</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Let others scan this to instantly connect with you
        </p>
        <div className="bg-white p-4 rounded-xl inline-block mx-auto shadow-sm border">
          <QRCodeSVG
            value={qrData}
            size={180}
            level="M"
            fgColor="#6C5CE7"
            bgColor="#FFFFFF"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {displayName} — {event?.title || "Event"}
        </p>
      </Card>

      {/* Event Info */}
      {event && (
        <Card className="p-4 bg-white dark:bg-[#1A1D27] rounded-xl space-y-2">
          <h3 className="font-semibold text-sm">Event Details</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            {event.start_date && event.end_date
              ? `${format(new Date(event.start_date), "MMM d")} — ${format(new Date(event.end_date), "MMM d, yyyy")}`
              : event.start_date
                ? format(new Date(event.start_date), "MMM d, yyyy")
                : "TBD"
            }
          </div>
          {event.venue && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              {event.venue}, {event.city}, {event.state}
            </div>
          )}
        </Card>
      )}

      {/* Privacy Settings */}
      <Card className="p-4 bg-white dark:bg-[#1A1D27] rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#6C5CE7]" />
          <h3 className="font-semibold text-sm">Contact Sharing</h3>
        </div>
        <p className="text-xs text-muted-foreground">Choose what connections can see</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm">Share email with connections</Label>
          </div>
          <Switch checked={shareEmail} onCheckedChange={setShareEmail} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm">Share phone with connections</Label>
          </div>
          <Switch checked={sharePhone} onCheckedChange={setSharePhone} />
        </div>
      </Card>

      {/* Sign Out */}
      <Button variant="outline" className="w-full text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20" onClick={handleSignOut}>
        <LogOut className="h-4 w-4 mr-2" /> Sign Out
      </Button>
    </div>
  );
}
