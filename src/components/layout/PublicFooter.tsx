import { Link } from "react-router-dom";
import HexLogo from "@/components/brand/HexLogo";
import { PlatformIcon } from "@/lib/platform-icons";

export default function PublicFooter() {
  return (
    <footer className="bg-[#1A1A2E] text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/">
              <HexLogo variant="dark" iconSize={22} textClass="text-xl" />
            </Link>
            <p className="text-sm text-gray-400 max-w-xs">
              Where the military and veteran community comes to be seen, heard, and understood.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3 pt-1">
              <a href="#" aria-label="Instagram"><PlatformIcon platform="instagram" size={28} /></a>
              <a href="#" aria-label="YouTube"><PlatformIcon platform="youtube" size={28} /></a>
              <a href="#" aria-label="X"><PlatformIcon platform="twitter" size={28} /></a>
              <a href="#" aria-label="TikTok"><PlatformIcon platform="tiktok" size={28} /></a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-semibold text-white mb-4">Platform</h4>
            <ul className="space-y-2">
              <li><Link to="/events" className="text-sm text-gray-400 hover:text-[#1e3a5f] transition-colors">Events</Link></li>
              <li><Link to="/creators" className="text-sm text-gray-400 hover:text-[#1e3a5f] transition-colors">Creators</Link></li>
              <li><Link to="/podcasts" className="text-sm text-gray-400 hover:text-[#1e3a5f] transition-colors">Podcasts</Link></li>
              <li><Link to="/brand/discover" className="text-sm text-gray-400 hover:text-[#1e3a5f] transition-colors">Discovery</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-gray-400 hover:text-[#1e3a5f] transition-colors">About</a></li>
              <li><a href="#" className="text-sm text-gray-400 hover:text-[#1e3a5f] transition-colors">Contact</a></li>
              <li><Link to="/pricing" className="text-sm text-gray-400 hover:text-[#1e3a5f] transition-colors">Pricing</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-gray-400 hover:text-[#1e3a5f] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-gray-400 hover:text-[#1e3a5f] transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            &copy; 2026 MilCrunch. All rights reserved.
          </p>
          <Link to="/login" className="text-xs text-gray-400 hover:text-gray-300 transition-colors">Demo</Link>
        </div>
      </div>
    </footer>
  );
}
