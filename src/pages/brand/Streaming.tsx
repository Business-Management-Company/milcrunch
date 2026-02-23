import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Monitor,
  Play,
  Square,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  Settings,
  Eye,
  Clock,
  Copy,
  Check,
  ChevronRight,
  Radio,
  Youtube,
  Facebook,
  Twitter,
  Twitch,
  Linkedin,
  Wifi,
  Plus,
  AlertTriangle,
  X,
  Calendar,
  Film,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// -- Types --

interface StreamDestination {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  connected: boolean;
}

interface LiveStream {
  id: string;
  title: string;
  event: string;
  eventId: string;
  description: string;
  destinations: string[];
  sourceType: "external" | "browser";
  startedAt: Date;
  viewerCount: number;
  health: "good" | "fair" | "poor";
}

interface EventStreamItem {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  city: string | null;
  status: string;
}

// -- Constants --

const MOCK_DESTINATIONS: StreamDestination[] = [
  { id: "youtube", name: "YouTube Live", icon: <Youtube className="w-4 h-4" />, color: "text-red-600", connected: true },
  { id: "facebook", name: "Facebook Live", icon: <Facebook className="w-4 h-4" />, color: "text-blue-600", connected: true },
  { id: "twitter", name: "Twitter/X", icon: <Twitter className="w-4 h-4" />, color: "text-gray-900", connected: true },
  { id: "twitch", name: "Twitch", icon: <Twitch className="w-4 h-4" />, color: "text-blue-700", connected: false },
  { id: "tiktok", name: "TikTok Live", icon: <Wifi className="w-4 h-4" />, color: "text-gray-900", connected: false },
];

const INGEST_URL = "rtmp://stream.recurrentx.com/live";

// -- Helpers --

function formatDuration(startedAt: Date) {
  const diff = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  const h = Math.floor(diff / 3600).toString().padStart(2, "0");
  const m = Math.floor((diff % 3600) / 60).toString().padStart(2, "0");
  const s = (diff % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function HealthDot({ health }: { health: "good" | "fair" | "poor" }) {
  const colors = { good: "bg-[#00B894]", fair: "bg-[#FDCB6E]", poor: "bg-[#E17055]" };
  const labels = { good: "Excellent", fair: "Fair", poor: "Poor" };
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-600">
      <span className={`w-2 h-2 rounded-full ${colors[health]}`} />
      {labels[health]}
    </span>
  );
}

// -- Component --

export default function Streaming() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Events from Supabase
  const [events, setEvents] = useState<EventStreamItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Stream state
  const [liveStream, setLiveStream] = useState<LiveStream | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");

  // Setup modal state
  const [showSetup, setShowSetup] = useState(false);
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [event, setEvent] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDests, setSelectedDests] = useState<string[]>([]);
  const [sourceType, setSourceType] = useState<"external" | "browser">("external");
  const [resolution, setResolution] = useState("720p");
  const [copied, setCopied] = useState<string | null>(null);
  const [generatedStreamKey] = useState(() => "rxs_" + Math.random().toString(36).slice(2, 14));

  // Browser source
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [screenShare, setScreenShare] = useState(false);
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Live controls
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Stream summary
  const [summary, setSummary] = useState<{ duration: string; peakViewers: number } | null>(null);

  // Load events from Supabase
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const { data } = await supabase
          .from("events")
          .select("id, title, start_date, end_date, venue, city, status")
          .order("start_date", { ascending: false });
        setEvents((data || []) as EventStreamItem[]);
      } catch {
        // Silently fail — events list is supplementary
      } finally {
        setLoadingEvents(false);
      }
    };
    loadEvents();
  }, []);

  // Categorize events
  const now = new Date();
  const upcomingEvents = events.filter((e) => {
    if (!e.start_date) return false;
    return new Date(e.start_date) > now;
  });
  const pastEvents = events.filter((e) => {
    if (!e.end_date && !e.start_date) return false;
    const endDate = e.end_date ? new Date(e.end_date) : new Date(e.start_date!);
    return endDate < now;
  });

  // Duration timer
  useEffect(() => {
    if (!liveStream) return;
    const interval = setInterval(() => {
      setElapsed(formatDuration(liveStream.startedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [liveStream]);

  // Enumerate devices when browser source selected
  useEffect(() => {
    if (sourceType !== "browser" || !showSetup) return;
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
      setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
    }).catch(() => {});
  }, [sourceType, showSetup]);

  // Start preview when camera selected
  const startPreview = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (!selectedCamera && !selectedMic) return;
    try {
      const constraints: MediaStreamConstraints = {};
      if (selectedCamera) {
        constraints.video = {
          deviceId: { exact: selectedCamera },
          width: resolution === "1080p" ? 1920 : 1280,
          height: resolution === "1080p" ? 1080 : 720,
        };
      }
      if (selectedMic) {
        constraints.audio = { deviceId: { exact: selectedMic } };
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
      }
    } catch {
      toast({ title: "Camera error", description: "Could not access selected devices.", variant: "destructive" });
    }
  }, [selectedCamera, selectedMic, resolution, toast]);

  useEffect(() => {
    if (sourceType === "browser" && showSetup && step === 3) {
      startPreview();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [sourceType, showSetup, step, startPreview]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  const resetSetup = () => {
    setStep(1);
    setTitle("");
    setEvent("");
    setDescription("");
    setSelectedDests([]);
    setSourceType("external");
    setResolution("720p");
    setSelectedCamera("");
    setSelectedMic("");
    setScreenShare(false);
  };

  const handleStartStream = () => {
    if (!title.trim()) return;
    if (selectedDests.length === 0) return;

    const selectedEvent = events.find((e) => e.id === event);
    const stream: LiveStream = {
      id: Date.now().toString(),
      title,
      event: selectedEvent?.title || "",
      eventId: event,
      description,
      destinations: selectedDests,
      sourceType,
      startedAt: new Date(),
      viewerCount: Math.floor(Math.random() * 200) + 10,
      health: "good",
    };
    setLiveStream(stream);
    setShowSetup(false);
    toast({ title: "Stream started!", description: `Now live on ${selectedDests.length} platform(s).` });
  };

  const handleEndStream = () => {
    if (!liveStream) return;
    setSummary({
      duration: elapsed,
      peakViewers: liveStream.viewerCount + Math.floor(Math.random() * 100),
    });
    setLiveStream(null);
    setShowEndConfirm(false);
    toast({ title: "Stream ended", description: "Your stream has been saved." });
  };

  const toggleDest = (id: string) => {
    setSelectedDests((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const connectedDests = MOCK_DESTINATIONS.filter((d) => d.connected);

  // =====================
  // LIVE STREAM VIEW
  // =====================
  if (liveStream) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{liveStream.title}</h1>
            {liveStream.event && (
              <p className="text-sm text-gray-500">{liveStream.event}</p>
            )}
          </div>
          <Badge className="bg-red-600 text-white text-xs px-2 py-1 rounded-full animate-pulse">
            LIVE
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Video Player */}
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
              {liveStream.sourceType === "browser" ? (
                <video
                  ref={previewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <Monitor className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">Waiting for stream input...</p>
                  <p className="text-sm mt-1">Start streaming from your external encoder</p>
                </div>
              )}
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-6 px-1">
              <Badge className="bg-red-600 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                LIVE
              </Badge>
              <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                {elapsed}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <Eye className="w-4 h-4" />
                {liveStream.viewerCount.toLocaleString()} viewers
              </span>
              <HealthDot health={liveStream.health} />
            </div>

            {/* Controls */}
            <div className="bg-gray-900/95 backdrop-blur rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-white hover:bg-white/10 ${muted ? "text-red-400" : ""}`}
                  onClick={() => setMuted(!muted)}
                >
                  {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-white hover:bg-white/10 ${!cameraOn ? "text-red-400" : ""}`}
                  onClick={() => setCameraOn(!cameraOn)}
                >
                  {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </Button>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ScreenShare className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-full text-lg"
                onClick={() => setShowEndConfirm(true)}
              >
                <Square className="w-4 h-4 mr-1.5" />
                End Stream
              </Button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-3">
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Active Destinations</h3>
              <div className="space-y-2">
                {liveStream.destinations.map((destId) => {
                  const dest = MOCK_DESTINATIONS.find((d) => d.id === destId);
                  if (!dest) return null;
                  return (
                    <div key={destId} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <span className={dest.color}>{dest.icon}</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{dest.name}</span>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* AI Production Status */}
            <Card className="p-4 border-blue-300 dark:border-blue-800 bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/20 dark:to-[#1A1D27]">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                AI Production
              </h3>
              <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                <p className="flex items-center justify-between">Auto-Frame <span className="text-green-600 font-medium">Active</span></p>
                <p className="flex items-center justify-between">Lower Thirds <span className="text-green-600 font-medium">Active</span></p>
                <p className="flex items-center justify-between">Captions <span className="text-green-600 font-medium">Active</span></p>
                <p className="flex items-center justify-between">Highlights <span className="text-yellow-600 font-medium">Recording</span></p>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Stream Info</h3>
              <div className="space-y-1.5 text-xs text-gray-500">
                <p>Source: {liveStream.sourceType === "browser" ? "Browser" : "External Encoder"}</p>
                <p>Started: {liveStream.startedAt.toLocaleTimeString()}</p>
                {liveStream.eventId && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-xs text-blue-700"
                    onClick={() => navigate(`/brand/events/${liveStream.eventId}`)}
                  >
                    View Event <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* End Stream Confirm */}
        <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                End Live Stream?
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will stop broadcasting to all {liveStream.destinations.length} destination(s). This action cannot be undone.
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowEndConfirm(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleEndStream}>
                End Stream
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // =====================
  // DASHBOARD VIEW
  // =====================
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Monitor className="w-7 h-7 text-blue-700" />
            Streaming
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Go live to multiple platforms simultaneously. AI handles production in real-time.
          </p>
        </div>
        <Button
          className="bg-blue-700 hover:bg-blue-800"
          onClick={() => {
            resetSetup();
            setShowSetup(true);
          }}
        >
          <Play className="w-4 h-4 mr-2" />
          New Live Stream
        </Button>
      </div>

      {/* Summary Card (after stream ends) */}
      {summary && (
        <Card className="p-6 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Last Stream Summary</h3>
              <div className="flex gap-6 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Duration: {summary.duration}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" /> Peak viewers: {summary.peakViewers}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Download Recording
                <span className="ml-2 text-xs text-gray-400">Processing...</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSummary(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Active Streams / Empty State */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Active Streams</h2>
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Radio className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No active streams</p>
          <p className="text-sm text-gray-400 mt-1">
            Start streaming to go live on connected platforms.
          </p>
          <Button
            className="mt-4 bg-blue-700 hover:bg-blue-800"
            onClick={() => {
              resetSetup();
              setShowSetup(true);
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            New Live Stream
          </Button>
        </Card>
      </div>

      {/* Upcoming Streams (from events) */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-700" />
          Upcoming Events with Streaming
        </h2>
        {loadingEvents ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">Loading events...</Card>
        ) : upcomingEvents.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No upcoming events.</p>
            <p className="text-xs mt-1">Create an event and enable streaming in the Media step.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingEvents.slice(0, 6).map((ev) => (
              <Card
                key={ev.id}
                className="p-4 cursor-pointer hover:border-blue-400 dark:hover:border-blue-700 transition-colors"
                onClick={() => navigate(`/brand/events/${ev.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ev.start_date ? format(new Date(ev.start_date), "MMM d, yyyy") : "No date"}
                    </p>
                    {(ev.venue || ev.city) && (
                      <p className="text-xs text-muted-foreground">{[ev.venue, ev.city].filter(Boolean).join(", ")}</p>
                    )}
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs shrink-0 ml-2">
                    Upcoming
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full text-xs"
                  onClick={(e) => { e.stopPropagation(); navigate(`/brand/events/${ev.id}`); }}
                >
                  <Film className="w-3.5 h-3.5 mr-1" /> Open Media Tab
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past Streams */}
      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Video className="w-5 h-5 text-gray-500" />
            Past Streams
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pastEvents.slice(0, 6).map((ev) => (
              <Card
                key={ev.id}
                className="p-4 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                onClick={() => navigate(`/brand/events/${ev.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ev.start_date ? format(new Date(ev.start_date), "MMM d, yyyy") : "No date"}
                    </p>
                  </div>
                  <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs shrink-0 ml-2">
                    Ended
                  </Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={(e) => { e.stopPropagation(); navigate(`/brand/events/${ev.id}`); }}
                  >
                    <Film className="w-3.5 h-3.5 mr-1" /> View Recordings
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Connected Platforms Quick View */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Connected Platforms</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {MOCK_DESTINATIONS.map((dest) => (
            <Card
              key={dest.id}
              className={`p-3 flex items-center gap-2 ${!dest.connected ? "opacity-50" : ""}`}
            >
              <span className={dest.color}>{dest.icon}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{dest.name}</span>
              {dest.connected && <div className="w-2 h-2 rounded-full bg-green-500 ml-auto" />}
            </Card>
          ))}
        </div>
      </div>

      {/* AI Pitch Banner */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-[#1A1D27] border-blue-300 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">AI-Powered Production</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          StreamYard charges $50/mo and you still need to edit your recordings. MilCrunch streams to every platform AND our AI handles production in real-time. Your A/V team just clicks Go Live.
        </p>
      </Card>

      {/* ===================== */}
      {/* SETUP MODAL           */}
      {/* ===================== */}
      <Dialog
        open={showSetup}
        onOpenChange={(open) => {
          if (!open && streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
          setShowSetup(open);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Live Stream</DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    s === step
                      ? "bg-blue-700 text-white"
                      : s < step
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {s < step ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-12 h-0.5 ${s < step ? "bg-green-500" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
            <span className="ml-2 text-sm text-gray-500">
              {step === 1 ? "Details" : step === 2 ? "Destinations" : "Source"}
            </span>
          </div>

          {/* STEP 1: Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. MIC 2026 - Main Stage"
                />
              </div>
              <div className="space-y-2">
                <Label>Event</Label>
                <Select value={event} onValueChange={setEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this stream about?"
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  className="bg-blue-700 hover:bg-blue-800"
                  disabled={!title.trim()}
                  onClick={() => setStep(2)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Destinations */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Select at least one connected platform to stream to.
              </p>
              <div className="space-y-2">
                {connectedDests.map((dest) => {
                  const selected = selectedDests.includes(dest.id);
                  return (
                    <div
                      key={dest.id}
                      onClick={() => toggleDest(dest.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selected
                          ? "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Checkbox checked={selected} />
                      <span className={dest.color}>{dest.icon}</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{dest.name}</span>
                      {selected && (
                        <Check className="w-4 h-4 text-blue-700 ml-auto" />
                      )}
                    </div>
                  );
                })}
              </div>
              {connectedDests.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No platforms connected. Go to Connectors to add one.
                </p>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="bg-blue-700 hover:bg-blue-800"
                  disabled={selectedDests.length === 0}
                  onClick={() => setStep(3)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Source */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Source toggle */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => setSourceType("external")}
                  className={`p-3 rounded-lg border cursor-pointer text-center transition-colors ${
                    sourceType === "external"
                      ? "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <Monitor className="w-6 h-6 mx-auto mb-1 text-gray-700 dark:text-gray-300" />
                  <p className="text-sm font-medium">External Encoder</p>
                  <p className="text-xs text-gray-400">OBS, vMix, hardware</p>
                </div>
                <div
                  onClick={() => setSourceType("browser")}
                  className={`p-3 rounded-lg border cursor-pointer text-center transition-colors ${
                    sourceType === "browser"
                      ? "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <Video className="w-6 h-6 mx-auto mb-1 text-gray-700 dark:text-gray-300" />
                  <p className="text-sm font-medium">Stream from Browser</p>
                  <p className="text-xs text-gray-400">Camera & microphone</p>
                </div>
              </div>

              {/* External Encoder */}
              {sourceType === "external" && (
                <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">RTMP URL</Label>
                    <div className="flex gap-2">
                      <Input value={INGEST_URL} readOnly className="font-mono text-sm bg-white dark:bg-gray-900" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyText(INGEST_URL, "RTMP URL")}
                      >
                        {copied === "RTMP URL" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Stream Key</Label>
                    <div className="flex gap-2">
                      <Input value={generatedStreamKey} readOnly className="font-mono text-sm bg-white dark:bg-gray-900" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyText(generatedStreamKey, "Stream Key")}
                      >
                        {copied === "Stream Key" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">Setup Instructions:</p>
                    <p>1. Open your streaming software (OBS, vMix, etc.)</p>
                    <p>2. Set Server to: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">{INGEST_URL}</code></p>
                    <p>3. Set Stream Key to the key above</p>
                    <p>4. Click Start Streaming in your software</p>
                  </div>
                </div>
              )}

              {/* Browser Source */}
              {sourceType === "browser" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Camera</Label>
                    <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select camera" />
                      </SelectTrigger>
                      <SelectContent>
                        {videoDevices.map((d) => (
                          <SelectItem key={d.deviceId} value={d.deviceId}>
                            {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Microphone</Label>
                    <Select value={selectedMic} onValueChange={setSelectedMic}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select microphone" />
                      </SelectTrigger>
                      <SelectContent>
                        {audioDevices.map((d) => (
                          <SelectItem key={d.deviceId} value={d.deviceId}>
                            {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={screenShare}
                      onCheckedChange={(v) => setScreenShare(!!v)}
                    />
                    <Label className="cursor-pointer">Enable screen share</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Resolution</Label>
                    <Select value={resolution} onValueChange={setResolution}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="720p">720p (HD)</SelectItem>
                        <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Preview */}
                  <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video">
                    <video
                      ref={previewRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-full text-lg"
                  onClick={handleStartStream}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Go Live
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
