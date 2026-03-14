import { ReactNode, useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
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
  ShieldCheck,
  LogOut,
  Menu,
  ExternalLink,
  FileText,
  ImageIcon,
  CreditCard,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface CreatorLayoutProps {
  children: ReactNode;
}

type NavItem = { icon: typeof LayoutDashboard; label: string; href: string };

interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
  defaultCollapsed?: boolean;
}

const SECTIONS: NavSection[] = [
  {
    key: "main",
    label: "MAIN",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/creator/dashboard" },
    ],
  },
  {
    key: "content",
    label: "CONTENT",
    items: [
      { icon: Link2, label: "My Bio Page", href: "/creator/bio" },
      { icon: CreditCard, label: "My Card", href: "/creator/my-card" },
      { icon: Share2, label: "My Socials", href: "/creator/socials" },
      { icon: PenSquare, label: "Post", href: "/creator/post" },
      { icon: ImageIcon, label: "Media Library", href: "/creator/media-library" },
      { icon: BarChart3, label: "Content Analytics", href: "/creator/analytics" },
    ],
  },
  {
    key: "opportunities",
    label: "OPPORTUNITIES",
    items: [
      { icon: CalendarDays, label: "Events", href: "/creator/events" },
      { icon: Briefcase, label: "Brand Deals", href: "/creator/deals" },
      { icon: List, label: "My Lists", href: "/creator/lists" },
    ],
  },
  {
    key: "settings",
    label: "SETTINGS",
    defaultCollapsed: true,
    items: [
      { icon: Settings, label: "Settings", href: "/creator/settings" },
      { icon: Plug, label: "Integrations", href: "/creator/integrations" },
      { icon: ShieldCheck, label: "Tech & Security", href: "/creator/tech-security" },
      { icon: HelpCircle, label: "Help", href: "/creator/help" },
    ],
  },
];

const STORAGE_KEY = "creator_sidebar_collapsed";

function loadCollapsedSections(defaults: Record<string, boolean>): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch { /* corrupt */ }
  return defaults;
}

function saveCollapsedSections(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota */ }
}

const CreatorLayout = ({ children }: CreatorLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, creatorProfile, signOut, role: authRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const scrollPos = useRef(0);

  const role = authRole || (creatorProfile?.role as string) || "creator";
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

  // Scroll position preservation (matches admin sidebar)
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onScroll = () => { scrollPos.current = nav.scrollTop; };
    nav.addEventListener("scroll", onScroll, { passive: true });
    return () => nav.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    if (navRef.current) navRef.current.scrollTop = scrollPos.current;
  }, [location.pathname]);

  // Collapsible sections (matches admin sidebar)
  const defaults: Record<string, boolean> = {};
  for (const s of SECTIONS) {
    if (s.defaultCollapsed) defaults[s.key] = true;
  }
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(
    () => loadCollapsedSections(defaults)
  );
  const toggleSection = useCallback((key: string) => {
    const scrollTop = navRef.current?.scrollTop ?? 0;
    setCollapsedSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsedSections(next);
      return next;
    });
    requestAnimationFrame(() => {
      if (navRef.current) navRef.current.scrollTop = scrollTop;
    });
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const pres = usePresentationMode();
  const handle = creatorProfile?.handle ?? "";
  const email = user?.email ?? "";
  const isDemoUser = email === "andrew@podlogix.co" || handle === "johnny-rocket";
  const displayName = pres.active ? pres.displayName : isDemoUser ? "Johnny Rocket" : (creatorProfile?.display_name ?? user?.user_metadata?.full_name ?? "Creator");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const bioUrl = handle ? `${origin}/${handle}` : "";

  const branch = (user?.user_metadata?.branch as string) || (creatorProfile as any)?.branch || "";

  const isActive = (href: string) => location.pathname === href;

  const sidebar = (
    <div className="flex flex-col h-full bg-[#0f1f3d]">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <Link to="/creator/dashboard" className="flex items-center min-w-0">
          <HexLogo variant="dark" iconSize={20} textClass="text-lg" />
        </Link>
      </div>

      {/* User avatar area */}
      <div className="p-3 flex items-center gap-3 min-w-0 border-b border-white/10">
        <div className="w-10 h-10 rounded-full bg-white/10 ring-1 ring-white/20 flex items-center justify-center shrink-0 text-lg font-semibold text-white">
          {(displayName || "C").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white truncate">{displayName}</p>
            {branch && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/10 px-1.5 py-0.5 rounded shrink-0">
                {branch}
              </span>
            )}
          </div>
          {handle && <p className="text-xs text-slate-500 truncate">@{handle}</p>}
        </div>
      </div>

      {/* Navigation */}
      <nav ref={navRef} className="flex-1 overflow-y-auto py-4" style={{ scrollBehavior: "auto" }}>
        {SECTIONS.map((section, idx) => {
          const isSectionCollapsed = !!collapsedSections[section.key];
          const Chevron = isSectionCollapsed ? ChevronRight : ChevronDown;

          return (
            <div key={section.key}>
              {/* Section header — collapsible, matches admin nav */}
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className={cn(
                  "flex items-center justify-between w-full px-4 pb-2 group",
                  idx === 0 ? "pt-2" : "pt-5 border-t border-white/10"
                )}
              >
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                  {section.label}
                </span>
                <Chevron className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-200 transition-colors" />
              </button>

              {/* Section items */}
              {!isSectionCollapsed && (
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.href} className="group/nav">
                        <Link
                          to={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm transition-colors",
                            active
                              ? "bg-white/10 text-white font-semibold border-l-2 border-white"
                              : "text-slate-300 font-normal hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              active ? "text-white" : "text-slate-400 group-hover/nav:text-white"
                            )}
                            strokeWidth={1.75}
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom area */}
      <div className="px-5 py-4 border-t border-white/10 space-y-1">
        <ThemeToggle variant="sidebar" />
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:text-white hover:bg-white/5"
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
    { icon: PenSquare, label: "Content", href: "/creator/post" },
    { icon: CalendarDays, label: "Events", href: "/creator/events" },
    { icon: User, label: "Profile", href: "/creator/bio" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-[#0f1f3d] bg-[#0f1f3d] fixed left-0 top-0 bottom-0 z-30">
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
            <SheetContent side="left" className="w-72 p-0 bg-[#0f1f3d] border-[#0f1f3d]">
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
