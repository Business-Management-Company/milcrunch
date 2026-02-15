import { useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Calendar,
  Mic,
  Trophy,
  Handshake,
  PlusCircle,
  Search,
  Users,
  ListChecks,
  ShieldCheck,
  BarChart,
  TrendingUp,
  Radio,
  ShoppingBag,
  PenSquare,
  Clock,
  Headphones,
  Video,
  Building2,
  UserCog,
  Plug,
  Briefcase,
  KanbanSquare,
  Rocket,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  tooltip?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// Dashboard is a standalone top-level link, not a collapsible section
const DASHBOARD_ITEM: NavItem = {
  href: "/dashboard",
  label: "Dashboard",
  icon: BarChart3,
};

const SIDEBAR_SECTIONS: NavSection[] = [
  {
    label: "EVENTS",
    items: [
      { href: "/events", label: "Events", icon: Calendar },
      { href: "/speakers", label: "Speakers", icon: Mic },
      { href: "/awards", label: "Awards", icon: Trophy },
      { href: "/sponsors", label: "Sponsors", icon: Handshake },
      { href: "/pdx/create", label: "Create Experience", icon: PlusCircle, tooltip: "A PDX (RecurrentX Experience) is a branded event package — combining live streaming, virtual events, co-broadcasting, and creator activations into one scalable experience." },
    ],
  },
  {
    label: "CREATORS & CONTENT",
    items: [
      { href: "/brand/discover", label: "Discovery", icon: Search },
      { href: "/brand/directory", label: "Directories", icon: Users },
      { href: "/lists", label: "Influencer Lists", icon: ListChecks },
      { href: "/verification", label: "Verification", icon: ShieldCheck },
      { href: "/brand/attribution", label: "Creator Attribution", icon: BarChart },
    ],
  },
  {
    label: "MARKETING & ANALYTICS",
    items: [
      { href: "/analytics", label: "Analytics", icon: TrendingUp },
      { href: "/social-monitoring", label: "Social Monitoring", icon: Radio },
      { href: "/swag", label: "SWAG Store", icon: ShoppingBag },
    ],
  },
  {
    label: "SOCIAL MEDIA",
    items: [
      { href: "/creator/post/new", label: "Create Post", icon: PenSquare },
      { href: "/creator/posts", label: "Scheduled Posts", icon: Clock },
    ],
  },
  {
    label: "MEDIA",
    items: [
      { href: "/brand/podcasts", label: "Podcasts", icon: Headphones },
      { href: "/admin/media/pdtv", label: "Streaming", icon: Video, badge: "Coming Soon" },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { href: "/brand/settings", label: "Company Profile", icon: Building2 },
      { href: "/settings", label: "Team Members", icon: UserCog },
      { href: "/settings", label: "Connectors", icon: Plug },
    ],
  },
];

const SUPER_ADMIN_SECTION: NavSection = {
  label: "SUPER ADMIN",
  items: [
    { href: "/admin/business-overview", label: "Business Overview", icon: Briefcase },
    { href: "/admin/tasks", label: "Task Board", icon: KanbanSquare },
    { href: "/admin/deployments", label: "Deployments", icon: Rocket },
    { href: "/admin/chat", label: "AI Chat", icon: MessageSquare },
  ],
};

const STORAGE_KEY = "pd_sidebar_collapsed";

function loadCollapsedSections(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupt */ }
  return {};
}

function saveCollapsedSections(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota */ }
}

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const location = useLocation();
  const { isSuperAdmin } = useAuth();

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(loadCollapsedSections);

  const toggleSection = useCallback((label: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      saveCollapsedSections(next);
      return next;
    });
  }, []);

  const sections = isSuperAdmin
    ? [...SIDEBAR_SECTIONS, SUPER_ADMIN_SECTION]
    : SIDEBAR_SECTIONS;

  const navItemClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
      "text-gray-700 dark:text-gray-300",
      "hover:bg-gray-50 dark:hover:bg-gray-800",
      isActive && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
      collapsed && "justify-center px-2"
    );

  const dashboardActive = location.pathname === DASHBOARD_ITEM.href;
  const DashIcon = DASHBOARD_ITEM.icon;

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 bottom-0 z-30 flex flex-col border-r border-gray-200 dark:border-gray-800 transition-[width] duration-200",
        "bg-white dark:bg-[#0F1117]",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {/* Dashboard — standalone top-level link */}
        <div className={cn(collapsed && "flex flex-col items-center")}>
          <Link
            to={DASHBOARD_ITEM.href}
            className={navItemClass(dashboardActive)}
            title={collapsed ? DASHBOARD_ITEM.label : undefined}
          >
            <DashIcon
              className={cn(
                "h-5 w-5 shrink-0",
                dashboardActive ? "text-blue-600" : "text-gray-500 dark:text-gray-400"
              )}
              strokeWidth={1.75}
            />
            {!collapsed && <span className="truncate">{DASHBOARD_ITEM.label}</span>}
          </Link>
        </div>

        {/* Collapsible sections */}
        {sections.map((section) => {
          const isSectionCollapsed = !!collapsedSections[section.label];
          const Chevron = isSectionCollapsed ? ChevronRight : ChevronDown;

          return (
            <div
              key={section.label}
              className={cn("mb-6 pt-4 border-t border-gray-100 dark:border-gray-800/60", collapsed && "flex flex-col items-center")}
            >
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section.label)}
                  className="flex items-center justify-between w-full px-3 mb-1.5 group"
                >
                  <span className="text-[11px] font-medium tracking-widest uppercase text-gray-400 dark:text-gray-500">
                    {section.label}
                  </span>
                  <Chevron className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                </button>
              ) : (
                <div className="mt-1" />
              )}
              {(!isSectionCollapsed || collapsed) && (
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;
                    const linkEl = (
                      <Link
                        to={item.href}
                        className={navItemClass(isActive)}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            isActive
                              ? "text-blue-600"
                              : "text-gray-500 dark:text-gray-400"
                          )}
                          strokeWidth={1.75}
                        />
                        {!collapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                        {!collapsed && item.badge && (
                          <span className="ml-auto text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5 whitespace-nowrap">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                    return (
                      <li key={item.href + item.label}>
                        {item.tooltip && !collapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[260px] text-xs">
                              {item.tooltip}
                            </TooltipContent>
                          </Tooltip>
                        ) : linkEl}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className={cn("p-3 border-t border-gray-200 dark:border-gray-800 space-y-2", collapsed && "flex flex-col items-center")}>
        {!collapsed && (
          <>
            <div className="flex items-center justify-center gap-1.5 px-2">
              <img src="/favicon-32x32.png" alt="" className="h-5 w-auto" />
              <span className="text-sm text-gray-500">RecurrentX</span>
            </div>
            <p className="text-[10px] text-muted-foreground/80 text-center">Demo v1.0</p>
          </>
        )}
      </div>
    </aside>
  );
}
