import { useState, useEffect, useCallback } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { Menu, X, Link as LinkIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import TopNav from "@/components/layout/TopNav";
import Sidebar from "@/components/layout/Sidebar";
import CommandPalette from "@/components/CommandPalette";
import FloatingAdminChat from "@/components/superadmin/FloatingAdminChat";
import DemoBanner, { DEMO_BANNER_HEIGHT } from "@/components/demo/DemoBanner";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const EMBED_BANNER_HEIGHT = 28;

export default function AppLayout() {
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [embedBannerDismissed, setEmbedBannerDismissed] = useState(false);
  const { isDemo } = useDemoMode();
  const { isSuperAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const isEmbed = searchParams.get("embed") === "true";
  const isProspectusRef = searchParams.get("ref") === "prospectus";
  const demoOffset = isDemo && !isEmbed ? DEMO_BANNER_HEIGHT : 0;

  const checkMobile = useCallback(() => {
    const m = window.innerWidth < 768;
    setIsMobile(m);
    if (!m) setMobileOpen(false);
  }, []);

  useEffect(() => {
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [checkMobile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const sidebarWidth = isMobile ? (mobileOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH) : SIDEBAR_WIDTH;
  const sidebarCollapsed = isMobile ? !mobileOpen : false;

  // Embed mode: no sidebar, no topnav, minimal chrome for iframe embedding
  if (isEmbed) {
    const embedOffset = embedBannerDismissed ? 0 : EMBED_BANNER_HEIGHT;
    return (
      <div className="min-h-screen bg-background dark:bg-[#0F1117]" data-embed-mode>
        {!embedBannerDismissed && (
          <div
            className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-3 text-white text-xs font-medium"
            style={{ height: EMBED_BANNER_HEIGHT, backgroundColor: "#1a1f2e" }}
          >
            <span>You're viewing a live demo of MilCrunch</span>
            <button
              onClick={() => setEmbedBannerDismissed(true)}
              className="ml-1 hover:text-gray-300 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <main
          className="min-h-screen bg-background dark:bg-[#0F1117]"
          style={{ paddingTop: embedOffset }}
        >
          <div className="p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  // Prospectus demo mode: no sidebar, no topnav, just content + back button
  if (isProspectusRef) {
    return (
      <div className="min-h-screen bg-background dark:bg-[#0F1117]">
        {/* Slim top bar with back button only */}
        <header className="fixed top-0 left-0 right-0 z-40 h-12 flex items-center px-4 bg-[#0a1628] border-b border-white/10">
          <a
            href="/prospectus"
            className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Prospectus
          </a>
          <span className="ml-auto text-xs text-white/40">MilCrunch Demo</span>
        </header>
        <main className="min-h-screen bg-background dark:bg-[#0F1117]" style={{ paddingTop: "3rem" }}>
          <div className="p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#0F1117]">
      <DemoBanner />
      <TopNav onOpenCommandPalette={() => setCommandOpen(true)} demoOffset={demoOffset} navLocked={false} />
      {isMobile && (
        <div
          className="fixed left-0 z-40 flex h-14 items-center pl-2"
          style={{ top: `calc(3.5rem + ${demoOffset}px)` }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      )}
      <Sidebar collapsed={sidebarCollapsed} demoOffset={demoOffset} navLocked={false} />
      <main
        className={cn("transition-[margin-left] duration-200 min-h-screen bg-background dark:bg-[#0F1117]")}
        style={{ marginLeft: sidebarWidth, paddingTop: `calc(3.5rem + ${demoOffset}px)` }}
      >
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <FloatingAdminChat />
      {isSuperAdmin && (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied!");
          }}
          title="Copy Deep Link"
          className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#1e3a5f] text-white text-xs font-medium shadow-lg hover:bg-[#2d5282] transition-colors"
        >
          <LinkIcon className="h-3.5 w-3.5" />
          Copy Link
        </button>
      )}
    </div>
  );
}
