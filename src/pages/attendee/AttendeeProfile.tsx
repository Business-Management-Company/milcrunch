import { useState, useEffect, useRef, useCallback } from "react";
import {
  QrCode, Mail, Phone, LogOut, Shield, ScanLine, UserCheck, UserX,
  Calendar, MapPin, Ticket, Loader2, X, Wifi, ChevronDown, ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ---------- types ---------- */
interface Props {
  eventId: string;
  event: {
    title: string;
    description?: string | null;
    start_date: string | null;
    end_date: string | null;
    venue: string | null;
    city: string | null;
    state: string | null;
    timezone?: string | null;
  } | null;
}

interface Connection {
  id: string;
  requester_id: string;
  recipient_id: string;
  requester_name?: string;
  recipient_name?: string;
  status: string;
  created_at: string;
}

/* ---------- FAQ data ---------- */
const FAQS = [
  { q: "What should I bring?", a: "A valid photo ID, your QR code (digital or printed), business cards for networking, and a phone charger. Dress code is business casual." },
  { q: "Is parking available?", a: "Yes — check the venue website for parking details, rates, and any validation options. Rideshare drop-off is available at the main entrance." },
  { q: "Can I get a refund?", a: "Refund requests must be submitted at least 7 days before the event. Contact the event organizer directly through the app." },
  { q: "Is there food at the event?", a: "Meals and snacks are provided during the event. Dietary restrictions noted during registration will be accommodated." },
  { q: "How do I connect with other attendees?", a: "Use the Community tab to browse attendees, or scan QR codes in person. Your profile controls what information is shared." },
];

const EMERGENCY_CONTACTS = [
  { label: "Event Support", number: "(555) 123-4567" },
  { label: "Venue Security", number: "(555) 987-6543" },
  { label: "Emergency", number: "911" },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" onClick={() => setOpen(!open)} className="w-full text-left">
      <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-900">{q}</span>
        <ChevronDown className={cn("h-4 w-4 text-gray-400 shrink-0 transition-transform", open && "rotate-180")} />
      </div>
      {open && <p className="text-sm text-gray-500 py-3 leading-relaxed">{a}</p>}
    </button>
  );
}

/* ---------- collapsible event info ---------- */
function EventInfoSection({
  event,
  startDate,
  endDate,
  googleMapsUrl,
}: {
  event: Props["event"];
  startDate: Date | null;
  endDate: Date | null;
  googleMapsUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  if (!event) return null;

  return (
    <Card className="bg-white dark:bg-[#1A1D27] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-5 flex items-center justify-between"
      >
        <h3 className="font-bold text-gray-900 dark:text-white text-base">Event Info</h3>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-gray-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          {/* Dates */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-[#6C5CE7] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Dates & Times</p>
              <p className="text-sm text-gray-500">
                {startDate && endDate
                  ? `${format(startDate, "EEEE, MMM d")} — ${format(endDate, "EEEE, MMM d, yyyy")}`
                  : startDate
                    ? format(startDate, "EEEE, MMM d, yyyy")
                    : "TBD"}
              </p>
              {event.timezone && (
                <p className="text-xs text-gray-400 mt-0.5">{event.timezone}</p>
              )}
            </div>
          </div>

          {/* Venue */}
          {event.venue && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-[#6C5CE7] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{event.venue}</p>
                <p className="text-sm text-gray-500">
                  {[event.city, event.state].filter(Boolean).join(", ")}
                </p>
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#6C5CE7] font-medium mt-1 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in Google Maps
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* WiFi */}
          <div className="flex items-center gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
            <div className="w-10 h-10 rounded-full bg-[#6C5CE7]/10 flex items-center justify-center shrink-0">
              <Wifi className="h-5 w-5 text-[#6C5CE7]" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">WiFi Access</p>
              <p className="text-xs text-gray-500">Network and password will be announced at the event.</p>
            </div>
          </div>

          {/* FAQ */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-2">FAQ</h4>
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>

          {/* Emergency Contacts */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-3">Emergency Contacts</h4>
            <div className="space-y-3">
              {EMERGENCY_CONTACTS.map((c) => (
                <a key={c.label} href={`tel:${c.number.replace(/\D/g, "")}`} className="flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{c.label}</span>
                  </div>
                  <span className="text-sm text-[#6C5CE7] font-medium group-hover:underline">{c.number}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ======================================== */
export default function AttendeeProfile({ eventId, event }: Props) {
  const { user, signOut } = useAuth();
  const [shareEmail, setShareEmail] = useState(true);
  const [sharePhone, setSharePhone] = useState(false);

  /* networking state */
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedUser, setScannedUser] = useState<{ userId: string; name: string } | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<Connection[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Attendee";
  const email = user?.email || "";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const qrData = JSON.stringify({
    type: "recurrentx_connect",
    userId: user?.id || "demo",
    eventId,
    name: displayName,
  });

  const startDate = event?.start_date ? parseISO(event.start_date) : null;
  const endDate = event?.end_date ? parseISO(event.end_date) : null;
  const googleMapsUrl = event?.venue
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [event.venue, event.city, event.state].filter(Boolean).join(", ")
      )}`
    : null;

  /* ---------- fetch connections ---------- */
  useEffect(() => {
    if (!user) return;
    fetchConnections();
  }, [user?.id, eventId]);

  const fetchConnections = async () => {
    if (!user) return;
    try {
      // Accepted connections where I'm either requester or recipient
      const { data: accepted } = await supabase
        .from("attendee_connections")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`) as { data: Connection[] | null };
      setConnections(accepted || []);

      // Pending incoming requests
      const { data: pending } = await supabase
        .from("attendee_connections")
        .select("*")
        .eq("event_id", eventId)
        .eq("recipient_id", user.id)
        .eq("status", "pending") as { data: Connection[] | null };
      setPendingIncoming(pending || []);
    } catch {
      // Tables may not exist yet
    }
  };

  /* ---------- QR Scanner ---------- */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const jsQR = (await import("jsqr")).default;

      scanIntervalRef.current = window.setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          handleQRData(code.data);
        }
      }, 250);
    } catch {
      toast.error("Camera access denied. Please allow camera permissions.");
      setScannerOpen(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleQRData = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === "recurrentx_connect" && parsed.userId && parsed.name) {
        if (parsed.userId === user?.id) {
          toast.info("That's your own QR code!");
          return;
        }
        setScannedUser({ userId: parsed.userId, name: parsed.name });
        stopCamera();
      }
    } catch {
      // Not a valid QR code for connection
    }
  };

  useEffect(() => {
    if (scannerOpen && !scannedUser) {
      startCamera();
    }
    return () => stopCamera();
  }, [scannerOpen, scannedUser, startCamera, stopCamera]);

  const sendConnectionRequest = async () => {
    if (!scannedUser || !user) return;
    setSendingRequest(true);
    try {
      const { error } = await supabase.from("attendee_connections").insert({
        requester_id: user.id,
        recipient_id: scannedUser.userId,
        event_id: eventId,
        requester_name: displayName,
        recipient_name: scannedUser.name,
        status: "pending",
      } as Record<string, unknown>);
      if (error) throw error;
      toast.success(`Connection request sent to ${scannedUser.name}!`);
      setScannedUser(null);
      setScannerOpen(false);
      fetchConnections();
    } catch {
      toast.error("Failed to send connection request");
    } finally {
      setSendingRequest(false);
    }
  };

  const respondToRequest = async (connectionId: string, accept: boolean) => {
    try {
      if (accept) {
        await supabase.from("attendee_connections")
          .update({ status: "accepted" } as Record<string, unknown>)
          .eq("id", connectionId);
        toast.success("Connection accepted!");
      } else {
        await supabase.from("attendee_connections")
          .update({ status: "declined" } as Record<string, unknown>)
          .eq("id", connectionId);
        toast.info("Connection declined");
      }
      fetchConnections();
    } catch {
      toast.error("Failed to update connection");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <div className="space-y-4 px-4 py-4">
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

      {/* Network Section */}
      <Card className="p-5 bg-white dark:bg-[#1A1D27] rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="h-5 w-5 text-[#6C5CE7]" />
          <h3 className="font-semibold text-sm">Network</h3>
        </div>

        {/* Scan to Connect */}
        <Button
          onClick={() => { setScannerOpen(true); setScannedUser(null); }}
          className="w-full bg-[#6C5CE7] hover:bg-[#5A4BD5] text-white gap-2 mb-4"
        >
          <ScanLine className="h-4 w-4" /> Scan QR to Connect
        </Button>

        {/* Pending Incoming Requests */}
        {pendingIncoming.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Pending Requests</p>
            <div className="space-y-2">
              {pendingIncoming.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900/30">
                  <div>
                    <p className="text-sm font-medium">{req.requester_name || "Someone"}</p>
                    <p className="text-xs text-muted-foreground">wants to connect</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="bg-[#6C5CE7] hover:bg-[#5A4BD5] text-white h-8 px-3 text-xs" onClick={() => respondToRequest(req.id, true)}>
                      <UserCheck className="h-3.5 w-3.5 mr-1" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => respondToRequest(req.id, false)}>
                      <UserX className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Connections */}
        {connections.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">My Connections ({connections.length})</p>
            <div className="space-y-2">
              {connections.map((conn) => {
                const otherName = conn.requester_id === user?.id ? conn.recipient_name : conn.requester_name;
                return (
                  <div key={conn.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#6C5CE7] to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                      {(otherName || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{otherName || "Attendee"}</p>
                      <p className="text-xs text-green-600">Connected</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">
            No connections yet. Scan someone's QR code to connect!
          </p>
        )}
      </Card>

      {/* Collapsible Event Info Section */}
      <EventInfoSection event={event} startDate={startDate} endDate={endDate} googleMapsUrl={googleMapsUrl} />

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

      {/* QR Scanner Modal */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1D27] rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-base">Scan QR Code</h3>
              <button
                onClick={() => { setScannerOpen(false); setScannedUser(null); stopCamera(); }}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {scannedUser ? (
              /* Scanned user card */
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6C5CE7] to-purple-400 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                  {scannedUser.name[0].toUpperCase()}
                </div>
                <h4 className="font-bold text-lg mb-1">{scannedUser.name}</h4>
                <p className="text-sm text-muted-foreground mb-4">Found attendee profile</p>
                <Button
                  onClick={sendConnectionRequest}
                  disabled={sendingRequest}
                  className="w-full bg-[#6C5CE7] hover:bg-[#5A4BD5] text-white gap-2"
                >
                  {sendingRequest ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                  Send Connection Request
                </Button>
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => { setScannedUser(null); }}
                >
                  Scan Another
                </Button>
              </div>
            ) : (
              /* Camera view */
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full aspect-square object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                {/* Scan overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-[#6C5CE7] rounded-2xl">
                    <div className="w-full h-full border-2 border-[#6C5CE7]/30 rounded-2xl" />
                  </div>
                </div>
                <p className="text-center text-sm text-gray-500 py-3">
                  Point camera at another attendee's QR code
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
