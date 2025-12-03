import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Calendar, Award, Users, DollarSign, 
  BarChart3, Bot, Settings, LogOut,
  TrendingUp, Ticket, FileText
} from "lucide-react";

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  const widgets = [
    { icon: Calendar, label: "Upcoming Events", value: "3", trend: "+2 this month" },
    { icon: Ticket, label: "Registrations Today", value: "47", trend: "+12% vs yesterday" },
    { icon: DollarSign, label: "Ticket Revenue", value: "$12,450", trend: "+8% this week" },
    { icon: FileText, label: "Sponsor Pipeline", value: "8 deals", trend: "$45K potential" }
  ];

  const navItems = [
    { icon: BarChart3, label: "Overview", href: "/admin", active: true },
    { icon: Calendar, label: "Events", href: "/admin/events" },
    { icon: Award, label: "Awards", href: "/admin/awards" },
    { icon: Users, label: "Sponsors & Proposals", href: "/admin/sponsors" },
    { icon: BarChart3, label: "Reports", href: "/admin/reports" },
    { icon: Bot, label: "AI Agents", href: "/admin/ai-agents" },
    { icon: Settings, label: "Settings", href: "/admin/settings" }
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">EA</span>
            </div>
            <span className="font-headline font-bold text-foreground">Admin</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item, index) => (
            <Link
              key={index}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                item.active 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-sm font-medium text-foreground">
                {user.email?.[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-headline font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening.</p>
        </div>

        {/* Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {widgets.map((widget, index) => (
            <Card key={index} className="bg-gradient-card border-border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <widget.icon className="w-5 h-5 text-primary" />
                </div>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">{widget.label}</p>
              <p className="text-2xl font-headline font-bold text-foreground mb-1">{widget.value}</p>
              <p className="text-xs text-primary">{widget.trend}</p>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-card border-border p-6 hover:border-primary/50 transition-colors cursor-pointer">
            <Calendar className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-headline font-bold text-foreground mb-2">Create Event</h3>
            <p className="text-sm text-muted-foreground mb-4">Launch a new live, virtual, or hybrid event.</p>
            <Button variant="outline" asChild size="sm">
              <Link to="/admin/events">Get Started</Link>
            </Button>
          </Card>

          <Card className="bg-gradient-card border-border p-6 hover:border-accent/50 transition-colors cursor-pointer">
            <Award className="w-8 h-8 text-accent mb-4" />
            <h3 className="font-headline font-bold text-foreground mb-2">Create Awards Program</h3>
            <p className="text-sm text-muted-foreground mb-4">Set up categories, nominations, and judging.</p>
            <Button variant="outline" asChild size="sm">
              <Link to="/admin/awards">Get Started</Link>
            </Button>
          </Card>

          <Card className="bg-gradient-card border-border p-6 hover:border-primary/50 transition-colors cursor-pointer">
            <Bot className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-headline font-bold text-foreground mb-2">Use AI Agent</h3>
            <p className="text-sm text-muted-foreground mb-4">Let AI help plan your next event or awards.</p>
            <Button variant="outline" size="sm">Coming Soon</Button>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
