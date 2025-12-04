import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">EA</span>
              </div>
              <span className="font-headline font-bold text-lg text-foreground">Events & Awards OS</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Launch, manage, and monetize military & veteran events and awards—powered by AI.
            </p>
          </div>

          <div>
            <h4 className="font-headline font-semibold text-foreground mb-4">Platform</h4>
            <ul className="space-y-2">
              <li><Link to="/platform/events" className="text-sm text-muted-foreground hover:text-primary transition-colors">Events</Link></li>
              <li><Link to="/platform/awards" className="text-sm text-muted-foreground hover:text-primary transition-colors">Awards & Nominations</Link></li>
              <li><Link to="/platform/sponsorships" className="text-sm text-muted-foreground hover:text-primary transition-colors">Sponsorships</Link></li>
              <li><Link to="/platform/ai-agents" className="text-sm text-muted-foreground hover:text-primary transition-colors">AI Agents</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-headline font-semibold text-foreground mb-4">Solutions</h4>
            <ul className="space-y-2">
              <li><Link to="/solutions/media-brands" className="text-sm text-muted-foreground hover:text-primary transition-colors">Media Brands</Link></li>
              <li><Link to="/solutions/event-teams" className="text-sm text-muted-foreground hover:text-primary transition-colors">Event Teams</Link></li>
              <li><Link to="/solutions/sponsors" className="text-sm text-muted-foreground hover:text-primary transition-colors">Sponsors</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-headline font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/veteran-podcast-awards" className="text-sm text-muted-foreground hover:text-primary transition-colors">Case Study</Link></li>
              <li><Link to="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link to="/resources" className="text-sm text-muted-foreground hover:text-primary transition-colors">Resources</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} EventCruch.co. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
