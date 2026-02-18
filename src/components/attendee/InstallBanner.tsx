import { useState, useEffect } from "react";
import { Download, X, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DISMISSED_KEY = "recurrentx-install-dismissed";

interface Props {
  eventTitle?: string;
  themeColor?: string;
}

export default function InstallBanner({ eventTitle, themeColor = "#6C5CE7" }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    if (ios) {
      setShowBanner(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      toast.success("App installed! Find it on your home screen", { icon: "🎖️" });
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  if (!showBanner) return null;

  const displayTitle = eventTitle
    ? `Install the ${eventTitle} App`
    : "Install the Event App";

  /* ---- Android: full bottom sheet ---- */
  if (!isIOS && deferredPrompt) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-[60] bg-black/40 animate-in fade-in duration-200"
          onClick={handleDismiss}
        />

        {/* Bottom sheet */}
        <div className="fixed bottom-0 left-0 right-0 z-[61] animate-in slide-in-from-bottom duration-300">
          <div className="max-w-[430px] mx-auto bg-white rounded-t-2xl shadow-2xl overflow-hidden">
            {/* Purple header */}
            <div className="px-6 pt-6 pb-4" style={{ backgroundColor: themeColor }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-bold text-lg leading-tight pr-4">
                  {displayTitle}
                </h2>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors shrink-0"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-4 mb-5">
                {/* App icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                  style={{ backgroundColor: themeColor }}
                >
                  <span className="text-white text-lg font-bold">
                    r<span className="font-extrabold">X</span>
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">MilCrunch Events</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Get the full event experience on your home screen.
                    <br />
                    No App Store needed.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleInstall}
                className="w-full h-12 text-base font-semibold text-white"
                style={{ backgroundColor: themeColor }}
              >
                <Download className="h-5 w-5 mr-2" />
                Install Now
              </Button>

              <button
                onClick={handleDismiss}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3 py-2 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ---- iOS: compact instructions banner ---- */
  return (
    <div className="mx-4 mb-2 bg-[#0A0F1E] rounded-xl p-3 flex items-center gap-3 shadow-lg animate-in slide-in-from-bottom-2 duration-300">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: themeColor }}
      >
        <Smartphone className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium">Add to Home Screen</p>
        <p className="text-gray-400 text-[11px] leading-tight">
          Tap <Share className="inline h-3 w-3 text-blue-400 -mt-0.5" /> then "Add to Home Screen"
        </p>
      </div>
      <button onClick={handleDismiss} className="p-1 text-gray-500 hover:text-gray-300 shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
