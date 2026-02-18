import { useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import TopNav from "@/components/layout/TopNav";
import Sidebar from "@/components/layout/Sidebar";
import CommandPalette from "@/components/CommandPalette";
import FloatingAdminChat from "@/components/superadmin/FloatingAdminChat";
import DemoBanner, { DEMO_BANNER_HEIGHT } from "@/components/demo/DemoBanner";
import { useDemoMode } from "@/hooks/useDemoMode";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;

export default function AppLayout() {
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isDemo } = useDemoMode();
  const demoOffset = isDemo ? DEMO_BANNER_HEIGHT : 0;

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

  return (
    <div className="min-h-screen bg-background dark:bg-[#0F1117]">
      <DemoBanner />
      <TopNav onOpenCommandPalette={() => setCommandOpen(true)} demoOffset={demoOffset} />
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
      <Sidebar collapsed={sidebarCollapsed} demoOffset={demoOffset} />
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
    </div>
  );
}
