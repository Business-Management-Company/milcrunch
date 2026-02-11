import { Link, useLocation } from "react-router-dom";
import { useAIAssistant } from "@/contexts/AIAssistantContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type NavItem =
  | { type: "link"; href: string; label: string; emoji: string }
  | { type: "action"; action: "toggleAI"; label: string; emoji: string };

const SIDEBAR_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "DASHBOARD",
    items: [
      { type: "link", href: "/dashboard", label: "Summary", emoji: "📊" },
    ],
  },
  {
    label: "EVENTS & SPEAKERS",
    items: [
      { type: "link", href: "/events", label: "Events", emoji: "📅" },
      { type: "link", href: "/speakers", label: "Speakers", emoji: "🎤" },
      { type: "link", href: "/awards", label: "Awards", emoji: "🏆" },
      { type: "link", href: "/sponsors", label: "Sponsors", emoji: "💼" },
    ],
  },
  {
    label: "CREATORS & CONTENT",
    items: [
      { type: "link", href: "/brand/discover", label: "Discovery", emoji: "🔍" },
      { type: "link", href: "/brand/directory", label: "Directories", emoji: "👥" },
      { type: "link", href: "/lists", label: "Influencer Lists", emoji: "📋" },
      { type: "link", href: "/verification", label: "Verification", emoji: "✅" },
      { type: "link", href: "/admin/featured-creators", label: "Featured Creators", emoji: "⭐" },
      { type: "link", href: "/brand/attribution", label: "Creator Attribution", emoji: "📊" },
    ],
  },
  {
    label: "PDX",
    items: [
      { type: "link", href: "/pdx", label: "Experiences", emoji: "🎪" },
      { type: "link", href: "/pdx/create", label: "Create PDX", emoji: "✨" },
    ],
  },
  {
    label: "MARKETING & ANALYTICS",
    items: [
      { type: "link", href: "/analytics", label: "Analytics", emoji: "📊" },
      { type: "link", href: "/social-monitoring", label: "Social Monitoring", emoji: "📡" },
      { type: "link", href: "/swag", label: "SWAG Store", emoji: "🛍️" },
    ],
  },
  {
    label: "MEDIA",
    items: [
      { type: "link", href: "/brand/podcasts", label: "Podcasts", emoji: "🎙️" },
      { type: "link", href: "/admin/media/pdtv", label: "PDTV", emoji: "📺" },
    ],
  },
  {
    label: "COMPANY",
    items: [
      { type: "link", href: "/admin/business-overview", label: "Business Overview", emoji: "🏢" },
      { type: "link", href: "/settings", label: "Settings", emoji: "⚙️" },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const location = useLocation();
  const { togglePanel: toggleAIPanel } = useAIAssistant();
  const { isSuperAdmin } = useAuth();

  const navItemClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
      "hover:bg-[#0064B1]/5 dark:hover:bg-gray-800",
      isActive && "bg-[#0064B1]/10 dark:bg-[#0064B1]/15 text-[#0064B1] font-medium border-l-2 border-[#0064B1] -ml-[2px] pl-[14px]",
      collapsed && "justify-center px-0"
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
        {SIDEBAR_SECTIONS.map((section, sectionIndex) => (
          <div
            key={section.label}
            className={cn(
              collapsed && "flex flex-col items-center",
              sectionIndex > 0 && "mt-6"
            )}
          >
            {!collapsed && (
              <p className="text-xs text-gray-400 font-semibold tracking-wider mb-2 px-3">
                {section.label}
              </p>
            )}
            {sectionIndex === 0 && collapsed && <div className="mt-2" />}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.type === "link" && location.pathname === item.href;
                if (item.type === "action" && item.action === "toggleAI") {
                  return (
                    <li key="ai-agents">
                      <button
                        type="button"
                        onClick={toggleAIPanel}
                        className={cn(navItemClass(false), "w-full text-left")}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="text-base leading-none" aria-hidden>
                          {item.emoji}
                        </span>
                        {!collapsed && <span>{item.label}</span>}
                      </button>
                    </li>
                  );
                }
                const href = item.type === "link" ? item.href : "#";
                return (
                  <li key={item.type === "link" ? item.href : "ai"}>
                    <Link
                      to={href}
                      className={navItemClass(isActive)}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="text-base leading-none shrink-0" aria-hidden>
                        {item.emoji}
                      </span>
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {isSuperAdmin && (
        <div className={cn("px-3 pb-2", collapsed && "flex flex-col items-center")}>
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              "hover:bg-amber-500/10 text-amber-600 dark:text-amber-400",
              location.pathname.startsWith("/admin") && "bg-amber-500/10 font-medium"
            )}
          >
            <span className="text-base leading-none" aria-hidden>⚡</span>
            {!collapsed && <span>Super Admin</span>}
          </Link>
        </div>
      )}

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
