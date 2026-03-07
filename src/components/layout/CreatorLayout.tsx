import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { usePresentationMode } from "@/hooks/usePresentationMode";
import HexLogo from "@/components/brand/HexLogo";
import {
  LayoutDashboard,
  User,
  Link2,
  Share2,
  PenSquare,
  Calendar,
  BarChart3,
  Briefcase,
  CalendarDays,
  List,
  Settings,
  Plug,
  HelpCircle,
  LogOut,
  Menu,
  ExternalLink,
  FileText,
  ImageIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface CreatorLayoutProps {
  children: ReactNode;
}

type NavItem = { icon: typeof LayoutDashboard; label: string; href: string };

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "MAIN",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/creator/dashboard" },
    ],
  },
  {
    label: "CONTENT",
    items: [
      { icon: Link2, label: "My Bio Page", href: "/creator/bio" },
      { icon: Share2, label: "My Socials", href: "/creator/socials" },
      { icon: PenSquare, label: "Create Post", href: "/creator/post/new" },
      { icon: Calendar, label: "Scheduled Posts", href: "/creator/posts" },
      { icon: ImageIcon, label: "Media Library", href: "/creator/media-library" },
      { icon: BarChart3, label: "Content Analytics", href: "/creator/analytics" },
    ],
  },
  {
    label: "OPPORTUNITIES",
    items: [
      { icon: CalendarDays, label: "Events", href: "/creator/events" },
      { icon: Briefcase, label: "Brand Deals", href: "/creator/deals" },
      { icon: List, label: "My Lists", href: "/creator/lists" },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { icon: Settings, label: "Settings", href: "/creator/settings" },
      { icon: Plug, label: "Integrations", href: "/creator/integrations" },
      { icon: HelpCircle, label: "Help", href: "/creator/help" },
    ],
  },
];

const CreatorLayout = ({ children }: CreatorLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, creatorProfile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const role = (creatorProfile?.role as string) || "creator";
  if (["super_admin", "admin", "brand"].includes(role)) {
    // Do not redirect non-creator roles to onboarding
  } else if (!creatorProfile?.onboarding_completed && !location.pathname.startsWith("/creator/onboard")) {
    navigate("/creator/onboard", { replace: true });
    return null;
  }

  useEffect(() => {
    const m = typeof window !== "undefined" && window.innerWidth < 768;
    setIsMobile(m);
    if (!m) setMobileOpen(false);
  }, []);

  useEffect(() => {
    const onResize = () => {
      const m = window.innerWidth < 768;
      setIsMobile(m);
      if (!m) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const pres = usePresentationMode();
  const handle = creatorProfile?.handle ?? "";
  const displayName = pres.active ? pres.displayName : (creatorProfile?.display_name ?? user?.user_metadata?.full_name ?? "Creator");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const bioUrl = handle ? `${origin}/c/${handle}` : "";

  const branch = (user?.user_metadata?.branch as string) || (creatorProfile as any)?.branch || "";

  const navLink = (item: NavItem) => {
    const active = location.pathname === item.href;
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 text-sm transition-colors rounded-r-lg",
          active
            ? "bg-[#C8A84B]/15 text-white font-medium border-l-[3px] border-[#C8A84B]"
            : "text-[#CBD5E1] hover:text-white hover:bg-white/8 border-l-[3px] border-transparent"
        )}
      >
        <item.icon className={cn("h-5 w-5 shrink-0", active ? "text-white" : "text-[#CBD5E1]")} />
        <span>{item.label}</span>
      </Link>
    );
  };

  const sidebar = (
    <div className="flex flex-col h-full bg-[#1B3A6B]">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <Link to="/creator/dashboard" className="flex items-center min-w-0">
          <HexLogo variant="dark" iconSize={20} textClass="text-lg" />
        </Link>
      </div>

      {/* User avatar area */}
      <div className={cn(
        "p-3 flex items-center gap-3 min-w-0",
        branch ? "border-b border-white/10" : "border-b-2 border-[#C8A84B]/30"
      )}>
        <div className="w-10 h-10 rounded-full bg-white/10 ring-1 ring-[#C8A84B]/30 flex items-center justify-center shrink-0 text-lg font-semibold text-white">
          {(displayName || "C").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white truncate">{displayName}</p>
            {branch && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8A84B]/80 bg-[#C8A84B]/10 px-1.5 py-0.5 rounded shrink-0">
                {branch}
              </span>
            )}
          </div>
          {handle && <p className="text-xs text-[#94A3B8] truncate">@{handle}</p>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-3 flex items-center text-[12px] font-bold uppercase text-[#C8A84B]" style={{ letterSpacing: "0.15em" }}>
              <span className="mr-1.5 text-[#D4AF37]">—</span>{section.label}
            </p>
            <div className="space-y-0.5">{section.items.map(navLink)}</div>
          </div>
        ))}
      </nav>

      {/* Bottom area */}
      <div className="p-3 border-t border-white/15 bg-white/5 space-y-1">
        <ThemeToggle variant="sidebar" />
        <Button
          variant="ghost"
          className="w-full justify-start text-[#CBD5E1] hover:text-white hover:bg-white/8"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );

  const mobileBottomTabs = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/creator/dashboard" },
    { icon: PenSquare, label: "Content", href: "/creator/post/new" },
    { icon: CalendarDays, label: "Events", href: "/creator/events" },
    { icon: User, label: "Profile", href: "/creator/bio" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-[#152d54] bg-[#1B3A6B] fixed left-0 top-0 bottom-0 z-30">
        {sidebar}
      </aside>

      {/* Mobile: hamburger + sheet sidebar */}
      {isMobile && (
        <div className="fixed left-0 top-0 z-40 flex h-14 items-center pl-2 bg-background border-b border-border w-full md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-[#1B3A6B] border-[#152d54]">
              {sidebar}
            </SheetContent>
          </Sheet>
          <span className="ml-2"><HexLogo variant="dark" iconSize={20} textClass="text-lg" /></span>
        </div>
      )}

      <main className={cn("flex-1 min-h-screen flex flex-col", "md:ml-60", isMobile && "pt-14 pb-20")}>
        <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around h-16 bg-card border-t border-border md:hidden">
          {mobileBottomTabs.map((tab) => {
            const active = location.pathname === tab.href;
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-2 text-xs transition-colors",
                  active ? "text-[#1B2A4A] dark:text-[#7dd3fc] font-medium" : "text-muted-foreground"
                )}
              >
                <tab.icon className="h-6 w-6 mb-1" />
                {tab.label}
              </Link>
            );
          })}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-2 text-xs transition-colors text-muted-foreground"
                )}
              >
                <FileText className="h-6 w-6 mb-1" />
                More
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
              <div className="py-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-3">
                  More
                </p>
                <div className="space-y-0.5">
                  {SECTIONS.flatMap((s) => s.items).map((item) => {
                    const active = location.pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-4 py-3 text-sm",
                          active ? "bg-muted font-medium" : "text-muted-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-6 pt-4 border-t border-border flex flex-col gap-2">
                  <ThemeToggle />
                  {bioUrl && (
                    <a
                      href={bioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground"
                    >
                      <ExternalLink className="h-5 w-5" />
                      View My Bio Page
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      handleSignOut();
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground"
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
};

export default CreatorLayout;
