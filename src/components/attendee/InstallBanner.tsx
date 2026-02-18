import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "recurrentx-install-dismissed";

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // Don't show if already in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Detect iOS
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    if (ios) {
      // iOS doesn't fire beforeinstallprompt — show manual instructions
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
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  if (!showBanner) return null;

  return (
    <div className="mx-4 mb-2 bg-[#0A0F1E] rounded-xl p-3 flex items-center gap-3 shadow-lg animate-in slide-in-from-bottom-2 duration-300">
      <div className="w-9 h-9 rounded-lg bg-[#6C5CE7] flex items-center justify-center shrink-0">
        <Download className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium">Add to Home Screen</p>
        <p className="text-gray-400 text-[11px]">
          {isIOS
            ? "Tap the share button, then \"Add to Home Screen\""
            : "Install for the best experience"}
        </p>
      </div>
      {!isIOS && (
        <Button
          size="sm"
          onClick={handleInstall}
          className="bg-[#6C5CE7] hover:bg-[#5B4BD5] text-white text-xs px-3 h-8 shrink-0"
        >
          Install
        </Button>
      )}
      <button onClick={handleDismiss} className="p-1 text-gray-500 hover:text-gray-300 shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* Type declaration for the beforeinstallprompt event */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
