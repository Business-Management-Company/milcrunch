import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
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
  Users,
  Trophy,
  Settings,
  Palette,
  HelpCircle,
  LogOut,
  Menu,
  ExternalLink,
  FileText,
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
      { icon: User, label: "My Profile", href: "/creator/profile" },
      { icon: Link2, label: "My Bio Page", href: "/creator/bio" },
      { icon: Share2, label: "My Socials", href: "/creator/socials" },
    ],
  },
  {
    label: "CONTENT",
    items: [
      { icon: PenSquare, label: "Create Post", href: "/creator/post/new" },
      { icon: Calendar, label: "Scheduled Posts", href: "/creator/posts" },
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
    label: "COMMUNITY",
    items: [
      { icon: Users, label: "Similar Creators", href: "/creator/similar" },
      { icon: Trophy, label: "Leaderboard", href: "/creator/leaderboard" },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { icon: Settings, label: "Settings", href: "/creator/settings" },
      { icon: Palette, label: "Customize", href: "/creator/customize" },
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

  const role = (user?.user_metadata?.role as string) || (creatorProfile?.role as string) || "creator";
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

  const handle = creatorProfile?.handle ?? "";
  const displayName = creatorProfile?.display_name ?? user?.user_metadata?.full_name ?? "Creator";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const bioUrl = handle ? `${origin}/c/${handle}` : "";

  const navLink = (item: NavItem) => {
    const active = location.pathname === item.href;
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
          active
            ? "bg-[#1B2A4A]/10 dark:bg-[#1B2A4A]/20 text-[#1B2A4A] dark:text-[#7dd3fc] font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Link to="/creator/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#1B2A4A] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">PD</span>
          </div>
          <span className="font-headline font-bold text-foreground truncate">MilCrunch</span>
        </Link>
      </div>
      <div className="p-3 border-b border-border flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-lg font-semibold text-muted-foreground">
          {(displayName || "C").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">{displayName}</p>
          {handle && <p className="text-xs text-muted-foreground truncate">@{handle}</p>}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.label}
            </p>
            <div className="space-y-0.5">{section.items.map(navLink)}</div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-border space-y-2">
        <ThemeToggle />
        {bioUrl && (
          <a
            href={bioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            View My Bio Page
          </a>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
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
    { icon: User, label: "Profile", href: "/creator/profile" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-card fixed left-0 top-0 bottom-0 z-30">
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
            <SheetContent side="left" className="w-72 p-0">
              {sidebar}
            </SheetContent>
          </Sheet>
          <span className="font-headline font-bold text-foreground ml-2">MilCrunch</span>
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
