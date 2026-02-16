import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Creators", to: "/creators" },
  { label: "Events", to: "/events" },
  { label: "Podcasts", to: "/podcasts" },
];

export default function PublicNav() {
  const { user, getRedirectPath } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
          {user ? (
            <Button
              size="sm"
              className="rounded-lg bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white px-5 py-2 font-semibold"
              onClick={() => {
                const path = getRedirectPath();
                navigate(path || "/creator/dashboard");
              }}
            >
              Dashboard
            </Button>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-[#E0E0E0] hover:text-white transition-colors">
                Sign In
              </Link>
              <Link to="/signup">
                <Button size="sm" className="rounded-lg bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white px-5 py-2 font-semibold">
                  Get Started
                </Button>
              </Link>
            </>
          )}
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
            {user ? (
              <Button
                size="sm"
                className="w-full rounded-lg bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white font-semibold"
                onClick={() => {
                  setMobileOpen(false);
                  const path = getRedirectPath();
                  navigate(path || "/creator/dashboard");
                }}
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium text-gray-300 hover:text-white px-3 py-2"
                >
                  Sign In
                </Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full rounded-lg bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white font-semibold">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
