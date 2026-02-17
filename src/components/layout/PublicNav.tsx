import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Creator Directory", to: "/creators" },
  { label: "Podcast Network", to: "/podcasts" },
  { label: "Shop", to: "/shop" },
  { label: "Events", to: "/events" },
];

export default function PublicNav() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#1A1A2E] shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
      <div className="max-w-7xl mx-auto h-14 flex items-center justify-between px-4 md:px-8">
        <Link to="/" className="shrink-0">
          <span className="font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <span className="text-white">recurrent</span>
            <span className="text-[#6C5CE7] font-extrabold">X</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
          {NAV_LINKS.map((link) => (
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
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link to="/sign-in" className="text-sm font-medium text-white hover:text-gray-300 transition-colors">
            Sign In
          </Link>
          <Link to="/plans">
            <Button size="sm" className="rounded-full bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white px-5 py-2 font-semibold">
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
            {NAV_LINKS.map((link) => (
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
            ))}
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
              <Button size="sm" className="w-full rounded-full bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white font-semibold">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
