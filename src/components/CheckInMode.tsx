import { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, CheckCircle2, AlertTriangle, Camera, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RegistrationRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  ticket_id: string | null;
  checked_in: boolean | null;
  checked_in_at: string | null;
  registration_code: string | null;
  qr_code_data: string | null;
}

interface TicketRow {
  id: string;
  name: string;
}

interface CheckInModeProps {
  eventId: string;
  eventTitle: string;
  registrations: RegistrationRow[];
  tickets: TicketRow[];
  onClose: () => void;
  onRefresh: () => void;
}

const CheckInMode = ({ eventId, eventTitle, registrations, tickets, onClose, onRefresh }: CheckInModeProps) => {
  const [search, setSearch] = useState("");
  const [lastScanned, setLastScanned] = useState<{
    name: string;
    ticket: string;
    status: "success" | "already" | "error";
  } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const ticketMap = Object.fromEntries(tickets.map((t) => [t.id, t]));
  const checkedInCount = registrations.filter((r) => r.checked_in).length;

  const checkInRegistration = useCallback(async (regId: string) => {
    const reg = registrations.find((r) => r.id === regId);
    if (!reg) {
      setLastScanned({ name: "Unknown", ticket: "", status: "error" });
      return;
    }
    if (reg.checked_in) {
      setLastScanned({
        name: `${reg.first_name} ${reg.last_name}`,
        ticket: ticketMap[reg.ticket_id || ""]?.name || "",
        status: "already",
      });
      return;
    }
    const { error } = await supabase
      .from("event_registrations")
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("id", regId);
    if (error) {
      toast.error("Check-in failed");
      setLastScanned({ name: `${reg.first_name} ${reg.last_name}`, ticket: "", status: "error" });
    } else {
      setLastScanned({
        name: `${reg.first_name} ${reg.last_name}`,
        ticket: ticketMap[reg.ticket_id || ""]?.name || "",
        status: "success",
      });
      onRefresh();
    }
  }, [registrations, ticketMap, onRefresh]);

  const handleQRData = useCallback((data: string) => {
    // QR data could be a URL like https://milcrunch.com/checkin/REG-CODE or JSON
    let regId: string | null = null;

    // Try to find by registration code
    const codeMatch = data.match(/checkin\/([A-Za-z0-9-]+)/);
    if (codeMatch) {
      const code = codeMatch[1];
      const reg = registrations.find((r) => r.registration_code === code);
      if (reg) regId = reg.id;
    }

    // Try to parse as JSON
    if (!regId) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.registrationId) {
          regId = parsed.registrationId;
        }
      } catch {
        // Not JSON
      }
    }

    // Try direct ID match
    if (!regId) {
      const reg = registrations.find((r) => r.id === data || r.qr_code_data === data);
      if (reg) regId = reg.id;
    }

    if (regId) {
      checkInRegistration(regId);
    } else {
      setLastScanned({ name: "Not Found", ticket: data, status: "error" });
    }
  }, [registrations, checkInRegistration]);

  // Camera scanning with jsQR
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);

      // Dynamic import of jsQR
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
          // Pause scanning briefly after a scan
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
          setTimeout(() => {
            if (cameraActive) {
              startScanning(jsQR);
            }
          }, 2000);
        }
      }, 200);
    } catch {
      toast.error("Camera access denied or not available");
    }
  };

  const startScanning = (jsQR: typeof import("jsqr").default) => {
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
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
        setTimeout(() => {
          startScanning(jsQR);
        }, 2000);
      }
    }, 200);
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual search results
  const searchResults = search.trim()
    ? registrations.filter((r) => {
        const q = search.toLowerCase();
        return (
          r.first_name.toLowerCase().includes(q) ||
          r.last_name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)
        );
      })
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div>
          <h2 className="text-lg font-bold">{eventTitle}</h2>
          <p className="text-sm text-gray-400">Check-In Mode</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-800 rounded-full px-4 py-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-lg font-bold text-blue-500">{checkedInCount}</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-300">{registrations.length}</span>
            <span className="text-xs text-gray-500 ml-1">Checked In</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="border-gray-700 text-gray-300 hover:bg-gray-800">
            <X className="h-4 w-4 mr-1" /> Exit
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">
        {/* Camera / Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {lastScanned && (
            <div
              className={`w-full max-w-md mb-6 rounded-xl p-6 text-center ${
                lastScanned.status === "success"
                  ? "bg-green-900/50 border border-green-500"
                  : lastScanned.status === "already"
                  ? "bg-yellow-900/50 border border-yellow-500"
                  : "bg-red-900/50 border border-red-500"
              }`}
            >
              {lastScanned.status === "success" && <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-2" />}
              {lastScanned.status === "already" && <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-2" />}
              {lastScanned.status === "error" && <X className="h-12 w-12 text-red-400 mx-auto mb-2" />}
              <p className="text-xl font-bold">{lastScanned.name}</p>
              {lastScanned.ticket && <p className="text-sm text-gray-300">{lastScanned.ticket}</p>}
              <p className="text-sm mt-1">
                {lastScanned.status === "success" && "Checked in successfully!"}
                {lastScanned.status === "already" && "Already checked in"}
                {lastScanned.status === "error" && "Registration not found"}
              </p>
            </div>
          )}

          <div className="relative w-full max-w-md aspect-square bg-gray-900 rounded-2xl overflow-hidden border-2 border-gray-700">
            {cameraActive ? (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-blue-600 rounded-lg" />
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <Camera className="h-16 w-16 text-gray-600" />
                <p className="text-gray-400 text-sm">Camera not active</p>
              </div>
            )}
          </div>

          <div className="mt-4">
            {cameraActive ? (
              <Button onClick={stopCamera} variant="outline" className="border-gray-700 text-gray-300">
                Stop Camera
              </Button>
            ) : (
              <Button onClick={startCamera} className="bg-blue-700 hover:bg-blue-800 text-white">
                <Camera className="h-4 w-4 mr-2" /> Start Camera Scan
              </Button>
            )}
          </div>
        </div>

        {/* Manual Search */}
        <div className="w-full lg:w-80 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Manual Search</h3>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {searchResults.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700"
              >
                <div>
                  <p className="font-medium text-sm">{r.first_name} {r.last_name}</p>
                  <p className="text-xs text-gray-500">{r.email}</p>
                  <p className="text-xs text-gray-600">{ticketMap[r.ticket_id || ""]?.name || "\u2014"}</p>
                </div>
                {r.checked_in ? (
                  <span className="text-xs text-yellow-400 font-medium">Already In</span>
                ) : (
                  <Button
                    size="sm"
                    className="bg-green-700 hover:bg-green-600 text-white text-xs"
                    onClick={() => checkInRegistration(r.id)}
                  >
                    Check In
                  </Button>
                )}
              </div>
            ))}
            {search.trim() && searchResults.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No results found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInMode;
