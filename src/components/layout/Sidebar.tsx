import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  Calendar,
  Mic,
  Trophy,
  Handshake,
  Headphones,
  Monitor,
  FileText,
  BarChart3,
  Radio,
  ShoppingBag,
  Building2,
  Users,
  Plug,
  Link2,
  Package,
  Briefcase,
  KanbanSquare,
  FolderOpen,
  ClipboardList,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  ExternalLink,
  Presentation,
  Ear,
  Send,
  Megaphone,
  Tags,
  Mail,
  ContactRound,
  LayoutTemplate,
  FormInput,
  Settings2,
  Calculator,
  TrendingUp,
  DollarSign,
  PiggyBank,
  Target,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  tooltip?: string;
  external?: boolean;
}

interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
  defaultCollapsed?: boolean;
}

const SIDEBAR_SECTIONS: NavSection[] = [
  {
    key: "main",
    label: "MAIN",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    key: "events",
    label: "EVENTS",
    items: [
      { href: "/brand/events", label: "Events", icon: Calendar },
      { href: "/brand/pdx/new", label: "PDX Stage", icon: Radio },
      { href: "/speakers", label: "Speakers", icon: Mic },
      { href: "/awards", label: "Awards", icon: Trophy },
    ],
  },
  {
    key: "sponsors",
    label: "SPONSORS",
    defaultCollapsed: true,
    items: [
      { href: "/brand/sponsors", label: "Sponsor Dashboard", icon: Handshake },
      { href: "/brand/sponsors/forms", label: "Sponsor Forms", icon: FileSpreadsheet },
      { href: "/brand/sponsors/pages", label: "Sponsor Pages", icon: ExternalLink },
      { href: "/brand/sponsors/decks", label: "Sponsor Decks", icon: Presentation },
    ],
  },
  {
    key: "creators",
    label: "INFLUENCERS",
    defaultCollapsed: true,
    items: [
      { href: "/brand/discover", label: "Discovery", icon: Search },
      { href: "/brand/directories", label: "Directories", icon: FolderOpen, tooltip: "Manage your verified creator database. Add, edit, and organize creators by branch, platform, and specialty." },
      { href: "/brand/lists", label: "Lists", icon: ClipboardList, tooltip: "Build curated lists for campaigns and outreach. Group creators by event, sponsor, or project." },
      { href: "/brand/verification", label: "Verification", icon: ShieldCheck },
    ],
  },
  {
    key: "content",
    label: "MEDIA",
    items: [
      { href: "/brand/podcasts", label: "Podcasts", icon: Headphones },
      { href: "/brand/streaming", label: "Streaming", icon: Monitor },
      { href: "/brand/pages", label: "Pages", icon: FileText },
    ],
  },
  {
    key: "social",
    label: "SOCIAL",
    items: [
      { href: "/brand/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/brand/tags", label: "Tags", icon: Tags },
      { href: "/brand/social-monitoring", label: "Social Listening", icon: Ear },
      { href: "/brand/posting", label: "Posting", icon: Send },
    ],
  },
  {
    key: "email",
    label: "EMAIL",
    items: [
      { href: "/brand/email/contacts", label: "Contacts", icon: Users },
      { href: "/brand/email/campaigns", label: "Campaigns", icon: Mail },
      { href: "/brand/email/lists", label: "Lists", icon: ContactRound },
      { href: "/brand/email/templates", label: "Templates", icon: LayoutTemplate },
      { href: "/brand/email/forms", label: "Forms", icon: FormInput },
      { href: "/brand/email/settings", label: "Settings", icon: Settings2 },
    ],
  },
  {
    key: "shop",
    label: "SHOP",
    items: [
      { href: "/brand/shop/merch", label: "Merch Store", icon: ShoppingBag },
      { href: "/brand/shop/swag", label: "SWAG Packages", icon: Package },
    ],
  },
  {
    key: "analytics",
    label: "ANALYTICS",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    key: "advertising",
    label: "ADVERTISING",
    items: [
      { href: "/brand/advertising", label: "Ad Management", icon: Megaphone },
      { href: "/brand/advertising/rate-desk", label: "Rate Desk", icon: Calculator },
      { href: "/brand/advertising/campaigns", label: "Ad Campaigns", icon: Target },
      { href: "/brand/advertising/inventory", label: "Ad Inventory", icon: Package },
      { href: "/brand/advertising/analytics", label: "Ad Analytics", icon: TrendingUp },
      { href: "/brand/advertising/leads", label: "Lead Manager", icon: UserPlus },
    ],
  },
  {
    key: "settings",
    label: "SETTINGS",
    defaultCollapsed: true,
    items: [
      { href: "/brand/settings", label: "Company Profile", icon: Building2 },
      { href: "/brand/integrations", label: "Integrations", icon: Link2 },
      { href: "/settings", label: "Team Members", icon: Users },
    ],
  },
];

const SUPER_ADMIN_SECTION: NavSection = {
  key: "superadmin",
  label: "SUPER ADMIN",
  defaultCollapsed: true,
  items: [
    { href: "/admin/dashboard", label: "Super Admin", icon: LayoutDashboard },
    { href: "/admin/business-overview", label: "Business Overview", icon: Briefcase },
    { href: "/admin/tasks", label: "Task Board", icon: KanbanSquare },
    { href: "/admin/prospectus-access", label: "Prospectus Access", icon: ShieldCheck },
    { href: "/prospectus", label: "View Prospectus", icon: FileText, external: true },
  ],
};

const REV_CALCULATORS_SECTION: NavSection = {
  key: "rev-calculators",
  label: "REV CALCULATORS",
  defaultCollapsed: true,
  items: [
    { href: "/admin/roi-calculator", label: "ROI Calculator", icon: Calculator },
    { href: "/admin/growth-calculator", label: "Growth Model", icon: TrendingUp },
    { href: "/admin/revenue-projections", label: "Revenue Projections", icon: DollarSign },
    { href: "/admin/saas-calculator", label: "SaaS Savings", icon: PiggyBank },
  ],
};

const STORAGE_KEY = "pd_sidebar_collapsed";

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

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  demoOffset?: number;
}

export default function Sidebar({ collapsed = false, demoOffset = 0 }: SidebarProps) {
  const location = useLocation();
  const { isSuperAdmin } = useAuth();
  const navRef = useRef<HTMLElement>(null);
  const scrollPos = useRef(0);

  // Track sidebar scroll position continuously
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onScroll = () => { scrollPos.current = nav.scrollTop; };
    nav.addEventListener("scroll", onScroll, { passive: true });
    return () => nav.removeEventListener("scroll", onScroll);
  }, []);

  // Restore scroll position after route change (before paint)
  useLayoutEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = scrollPos.current;
    }
  }, [location.pathname]);

  const defaults: Record<string, boolean> = {};
  for (const s of SIDEBAR_SECTIONS) {
    if (s.defaultCollapsed) defaults[s.key] = true;
  }

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(
    () => loadCollapsedSections(defaults)
  );

  const toggleSection = useCallback((key: string) => {
    // Capture scroll position before the re-render so layout shifts don't move it
    const scrollTop = navRef.current?.scrollTop ?? 0;
    setCollapsedSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsedSections(next);
      return next;
    });
    // Restore scroll position after React flushes the DOM update
    requestAnimationFrame(() => {
      if (navRef.current) {
        navRef.current.scrollTop = scrollTop;
      }
    });
  }, []);

  const sections = isSuperAdmin
    ? [
        // All sections except settings, then super admin + rev calculators, then settings last
        ...SIDEBAR_SECTIONS.filter((s) => s.key !== "settings"),
        SUPER_ADMIN_SECTION,
        REV_CALCULATORS_SECTION,
        ...SIDEBAR_SECTIONS.filter((s) => s.key === "settings"),
      ]
    : SIDEBAR_SECTIONS;

  const isActive = (href: string) => location.pathname === href || (href !== "/dashboard" && location.pathname.startsWith(href + "/"));

  return (
    <aside
      className={cn(
        "fixed left-0 bottom-0 z-30 flex flex-col border-r border-gray-800 bg-[#111827] transition-[width] duration-200",
        collapsed ? "w-16" : "w-64"
      )}
      style={{ top: `calc(3.5rem + ${demoOffset}px)` }}
    >
      {/* Navigation */}
      <nav ref={navRef} className="flex-1 overflow-y-auto py-4" style={{ scrollBehavior: "auto" }}>
        {sections.map((section, idx) => {
          const isSectionCollapsed = !!collapsedSections[section.key];
          const Chevron = isSectionCollapsed ? ChevronRight : ChevronDown;

          return (
            <div key={section.key} className={cn(idx > 0 && "mt-5")}>
              {/* Section header */}
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className="flex items-center justify-between w-full px-5 mb-2 group"
                >
                  <span className="text-[11px] font-[600] tracking-[0.08em] uppercase text-[#6B7280]">
                    {section.label}
                  </span>
                  <Chevron className="h-3 w-3 text-[#6B7280] group-hover:text-gray-400 transition-colors" />
                </button>
              ) : (
                <div className="h-px bg-gray-700 mx-3 mb-2" />
              )}

              {/* Section items */}
              {(!isSectionCollapsed || collapsed) && (
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    const linkClasses = cn(
                      "flex items-center gap-3 mx-3 px-3 py-2 rounded-lg text-[14px] transition-colors",
                      active
                        ? "bg-[#1F2937] text-white font-medium border-l-[3px] border-[#6C5CE7] pl-[9px]"
                        : "text-[#D1D5DB] font-normal hover:bg-[#1F2937] hover:text-white",
                      collapsed && "justify-center px-2 mx-1"
                    );
                    const linkContent = (
                      <>
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-white" : "text-[#D1D5DB]"
                          )}
                          strokeWidth={1.75}
                        />
                        {!collapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                        {!collapsed && item.external && (
                          <ExternalLink className="ml-auto h-3.5 w-3.5 text-[#6B7280]" />
                        )}
                        {!collapsed && item.badge && (
                          <span className="ml-auto text-[10px] font-semibold text-[#9CA3AF] bg-[#1F2937] rounded-full px-2 py-0.5 whitespace-nowrap">
                            {item.badge}
                          </span>
                        )}
                      </>
                    );
                    return (
                      <li key={item.href + item.label} className="relative group/nav">
                        {item.external ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={collapsed ? item.label : undefined}
                            className={linkClasses}
                          >
                            {linkContent}
                          </a>
                        ) : (
                          <Link
                            to={item.href}
                            title={collapsed ? item.label : undefined}
                            className={linkClasses}
                          >
                            {linkContent}
                          </Link>
                        )}
                        {/* Custom tooltip */}
                        {!collapsed && item.tooltip && (
                          <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover/nav:opacity-100 transition-opacity delay-200 z-50">
                            <div className="relative bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-[200px]">
                              {/* Arrow pointing left */}
                              <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-gray-900" />
                              {item.tooltip}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-5 py-4 border-t border-gray-700">
          <p className="text-[10px] text-[#4B5563] text-center">
            recurrent<span className="text-[#6C5CE7] font-bold">X</span> &middot; v1.0
          </p>
        </div>
      )}
    </aside>
  );
}
