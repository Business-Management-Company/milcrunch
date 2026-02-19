import { Link } from "react-router-dom";
import { Instagram, Youtube, Twitter } from "lucide-react";

const TikTokIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.39a8.16 8.16 0 003.76.92V6.86a4.85 4.85 0 01-.01-.17z" />
  </svg>
);

export default function PublicFooter() {
  return (
    <footer className="bg-[#1A1A2E] text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/">
              <span className="font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <span className="text-white">MilCrunch</span>
                <span className="text-[#6C5CE7] font-extrabold">X</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 max-w-xs">
              Where the military and veteran community comes to be seen, heard, and understood.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-4 pt-1">
              <a href="#" className="text-gray-400 hover:text-[#6C5CE7] transition-colors" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#6C5CE7] transition-colors" aria-label="YouTube">
                <Youtube className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#6C5CE7] transition-colors" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#6C5CE7] transition-colors" aria-label="TikTok">
                <TikTokIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-semibold text-white mb-4">Platform</h4>
            <ul className="space-y-2">
              <li><Link to="/events" className="text-sm text-gray-400 hover:text-[#6C5CE7] transition-colors">Events</Link></li>
              <li><Link to="/creators" className="text-sm text-gray-400 hover:text-[#6C5CE7] transition-colors">Creators</Link></li>
              <li><Link to="/podcasts" className="text-sm text-gray-400 hover:text-[#6C5CE7] transition-colors">Podcasts</Link></li>
              <li><Link to="/brand/discover" className="text-sm text-gray-400 hover:text-[#6C5CE7] transition-colors">Discovery</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-gray-400 hover:text-[#6C5CE7] transition-colors">About</a></li>
              <li><a href="#" className="text-sm text-gray-400 hover:text-[#6C5CE7] transition-colors">Contact</a></li>
              <li><Link to="/pricing" className="text-sm text-gray-400 hover:text-[#6C5CE7] transition-colors">Pricing</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-gray-400 hover:text-[#6C5CE7] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-gray-400 hover:text-[#6C5CE7] transition-colors">Terms of Service</a></li>
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
