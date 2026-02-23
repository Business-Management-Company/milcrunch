import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Calendar, MapPin, ChevronRight, ShoppingBag, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NAV_LINKS = [
  { label: "Influencers", to: "/creators" },
  { label: "Podcast Network", to: "/podcasts" },
  { label: "Shop", to: "/shop" },
  { label: "Events", to: "/events" },
  { label: "Your Path", to: "/plans" },
];

type UpcomingEvent = {
  id: string;
  title: string;
  start_date: string | null;
  city: string | null;
  state: string | null;
  event_type: "live" | "virtual" | "hybrid";
};

const EVENT_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-blue-100 text-blue-800" },
  virtual: { label: "Virtual", className: "bg-blue-100 text-blue-700" },
  hybrid: { label: "Hybrid", className: "bg-amber-100 text-amber-700" },
};

function formatEventDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ShopDropdown() {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2">
      <div className="relative">
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-l border-t border-gray-100 z-10" />
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-2 min-w-[200px] relative z-20">
          <Link
            to="/shop"
            className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-gray-700 hover:text-gray-900"
          >
            <ShoppingBag className="h-4 w-4 text-[#1e3a5f]" />
            <span className="text-sm font-medium">Merch Store</span>
          </Link>
          <Link
            to="/swag"
            className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-gray-700 hover:text-gray-900"
          >
            <Package className="h-4 w-4 text-[#1e3a5f]" />
            <span className="text-sm font-medium">SWAG Packages</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function EventsDropdown({ events }: { events: UpcomingEvent[] }) {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2">
      {/* Arrow */}
      <div className="relative">
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-l border-t border-gray-100 z-10" />
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-4 w-80 relative z-20">
          {events.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">No upcoming events</p>
          ) : (
            <div className="flex flex-col gap-1">
              {events.map((event) => {
                const badge = EVENT_TYPE_BADGE[event.event_type] || EVENT_TYPE_BADGE.live;
                const location = [event.city, event.state].filter(Boolean).join(", ");
                return (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm truncate">
                          {event.title}
                        </span>
                        <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        {event.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatEventDate(event.start_date)}
                          </span>
                        )}
                        {location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {location}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          <div className="border-t border-gray-100 mt-2 pt-2">
            <Link
              to="/events"
              className="flex items-center justify-between text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50"
            >
              View All Events
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicNav() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const eventsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, start_date, city, state, event_type")
      .eq("is_published", true)
      .gte("start_date", new Date().toISOString())
      .order("start_date", { ascending: true })
      .limit(5)
      .then(({ data }) => {
        if (data) setUpcomingEvents(data as UpcomingEvent[]);
      });
  }, []);

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  const handleEventsEnter = () => {
    if (eventsTimeoutRef.current) clearTimeout(eventsTimeoutRef.current);
    setEventsOpen(true);
  };

  const handleEventsLeave = () => {
    eventsTimeoutRef.current = setTimeout(() => setEventsOpen(false), 150);
  };

  const handleShopEnter = () => {
    if (shopTimeoutRef.current) clearTimeout(shopTimeoutRef.current);
    setShopOpen(true);
  };

  const handleShopLeave = () => {
    shopTimeoutRef.current = setTimeout(() => setShopOpen(false), 150);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#1A1A2E] shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
      <div className="max-w-7xl mx-auto h-14 flex items-center justify-between px-4 md:px-8">
        <Link to="/" className="shrink-0">
          <span className="font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <span className="text-white">MilCrunch</span>
            <span className="text-[#3b82f6] font-extrabold">X</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
          {NAV_LINKS.map((link) =>
            link.label === "Events" ? (
              <div
                key={link.to}
                className="relative"
                onMouseEnter={handleEventsEnter}
                onMouseLeave={handleEventsLeave}
              >
                <Link
                  to={link.to}
                  className={`text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? "text-white font-bold"
                      : "text-[#E0E0E0] hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
                {eventsOpen && <EventsDropdown events={upcomingEvents} />}
              </div>
            ) : link.label === "Shop" ? (
              <div
                key={link.to}
                className="relative"
                onMouseEnter={handleShopEnter}
                onMouseLeave={handleShopLeave}
              >
                <Link
                  to={link.to}
                  className={`text-sm font-medium transition-colors ${
                    isActive(link.to) || isActive("/swag")
                      ? "text-white font-bold"
                      : "text-[#E0E0E0] hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
                {shopOpen && <ShopDropdown />}
              </div>
            ) : (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? "text-white font-bold"
                    : "text-[#E0E0E0] hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link to="/sign-in" className="text-sm font-medium text-white hover:text-gray-300 transition-colors">
            Sign In
          </Link>
          <Link to="/plans">
            <Button size="sm" className="rounded-full bg-[#1e3a5f] hover:bg-[#2d5282] text-white px-5 py-2 font-semibold">
              Sign Up
            </Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden text-white p-1.5"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#1A1A2E] border-t border-white/10 px-4 pb-4">
          <nav className="flex flex-col gap-1 pt-2">
            {NAV_LINKS.map((link) =>
              link.label === "Shop" ? (
                <div key={link.to} className="flex flex-col">
                  <span className="px-3 py-2 text-sm font-medium text-gray-400 uppercase tracking-wide">Shop</span>
                  <Link
                    to="/shop"
                    onClick={() => setMobileOpen(false)}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive("/shop") ? "text-white bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <ShoppingBag className="h-4 w-4" /> Merch Store
                  </Link>
                  <Link
                    to="/swag"
                    onClick={() => setMobileOpen(false)}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive("/swag") ? "text-white bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Package className="h-4 w-4" /> SWAG Packages
                  </Link>
                </div>
              ) : (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? "text-white bg-white/10"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/10">
            <Link
              to="/sign-in"
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-white hover:text-gray-300 px-3 py-2"
            >
              Sign In
            </Link>
            <Link to="/plans" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full rounded-full bg-[#1e3a5f] hover:bg-[#2d5282] text-white font-semibold">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
