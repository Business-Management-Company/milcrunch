import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Calendar,
  Mic,
  Trophy,
  Handshake,
  Sparkles,
  PlusCircle,
  Search,
  Users,
  ListChecks,
  ShieldCheck,
  Star,
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
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const SIDEBAR_SECTIONS: NavSection[] = [
  {
    label: "DASHBOARD",
    items: [
      { href: "/dashboard", label: "Summary", icon: BarChart3 },
    ],
  },
  {
    label: "EVENTS",
    items: [
      { href: "/events", label: "Events", icon: Calendar },
      { href: "/speakers", label: "Speakers", icon: Mic },
      { href: "/awards", label: "Awards", icon: Trophy },
      { href: "/sponsors", label: "Sponsors", icon: Handshake },
      { href: "/pdx", label: "Experiences", icon: Sparkles },
      { href: "/pdx/create", label: "Create Experience", icon: PlusCircle },
    ],
  },
  {
    label: "CREATORS & CONTENT",
    items: [
      { href: "/brand/discover", label: "Discovery", icon: Search },
      { href: "/brand/directory", label: "Directories", icon: Users },
      { href: "/lists", label: "Influencer Lists", icon: ListChecks },
      { href: "/verification", label: "Verification", icon: ShieldCheck },
      { href: "/admin/featured-creators", label: "Featured Creators", icon: Star },
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

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const location = useLocation();
  const { isSuperAdmin } = useAuth();

  const sections = isSuperAdmin
    ? [...SIDEBAR_SECTIONS, SUPER_ADMIN_SECTION]
    : SIDEBAR_SECTIONS;

  const navItemClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
      "text-gray-600 dark:text-gray-400",
      "hover:bg-[#0064B1]/5 dark:hover:bg-gray-800",
      isActive && "bg-[#0064B1]/10 dark:bg-[#0064B1]/15 text-[#0064B1] dark:text-[#0064B1] font-medium",
      collapsed && "justify-center px-2"
    );

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 bottom-0 z-30 flex flex-col border-r border-gray-200 dark:border-gray-800 transition-[width] duration-200",
        "bg-white dark:bg-[#0F1117]",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {sections.map((section, sectionIndex) => (
          <div
            key={section.label}
            className={cn(
              collapsed && "flex flex-col items-center",
              sectionIndex > 0 && "mt-5"
            )}
          >
            {!collapsed && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold tracking-wider mb-1.5 px-3 uppercase">
                {section.label}
              </p>
            )}
            {sectionIndex === 0 && collapsed && <div className="mt-1" />}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href + item.label}>
                    <Link
                      to={item.href}
                      className={navItemClass(isActive)}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          isActive
                            ? "text-[#0064B1]"
                            : "text-gray-400 dark:text-gray-500"
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
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("p-3 border-t border-gray-200 dark:border-gray-800 space-y-2", collapsed && "flex flex-col items-center")}>
        {!collapsed && (
          <>
            <div className="flex items-center justify-center gap-1.5 px-2">
              <img src="/Parade-Deck-Flag-logo.png" alt="" className="h-5 w-auto" />
              <span className="text-sm text-gray-500">ParadeDeck</span>
            </div>
            <p className="text-[10px] text-muted-foreground/80 text-center">Demo v1.0</p>
          </>
        )}
      </div>
    </aside>
  );
}
