import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center group">
            <span className="font-bold text-xl text-foreground tracking-tight">MilCrunch<span className="text-[#3b82f6] font-extrabold">X</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-1">
                  Platform <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/platform/events">Events</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/platform/awards">Awards & Nominations</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/platform/sponsorships">Sponsorships & Proposals</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/platform/ai-agents">AI Event Agents</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-1">
                  Solutions <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/solutions/media-brands">For Media Brands</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/solutions/event-teams">For Event Teams</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/solutions/sponsors">For Sponsors</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/events">Events Calendar</Link>
            </Button>
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/veteran-podcast-awards">Case Study</Link>
            </Button>
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/pricing">Pricing</Link>
            </Button>
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/resources">Resources</Link>
            </Button>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
                  <Link to="/admin">Dashboard</Link>
                </Button>
                <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary">
                  <Link to="/signup">Request Demo</Link>
                </Button>
              </>
            )}
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-2">
              <Link to="/platform/events" className="px-4 py-2 text-muted-foreground hover:text-foreground">Events</Link>
              <Link to="/platform/awards" className="px-4 py-2 text-muted-foreground hover:text-foreground">Awards</Link>
              <Link to="/platform/sponsorships" className="px-4 py-2 text-muted-foreground hover:text-foreground">Sponsorships</Link>
              <Link to="/platform/ai-agents" className="px-4 py-2 text-muted-foreground hover:text-foreground">AI Agents</Link>
              <Link to="/events" className="px-4 py-2 text-muted-foreground hover:text-foreground">Events Calendar</Link>
              <Link to="/veteran-podcast-awards" className="px-4 py-2 text-muted-foreground hover:text-foreground">Case Study</Link>
              <Link to="/pricing" className="px-4 py-2 text-muted-foreground hover:text-foreground">Pricing</Link>
              <Link to="/resources" className="px-4 py-2 text-muted-foreground hover:text-foreground">Resources</Link>
              <div className="pt-4 px-4 flex flex-col gap-2">
                {user ? (
                  <>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/admin">Dashboard</Link>
                    </Button>
                    <Button variant="ghost" onClick={handleSignOut} className="w-full">Sign Out</Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/auth">Sign In</Link>
                    </Button>
                    <Button asChild className="w-full bg-primary">
                      <Link to="/signup">Request Demo</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
