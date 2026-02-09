import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Calendar, Award, DollarSign, 
  Bot, TrendingUp, Ticket, FileText,
  Gavel, Building2, UserCircle
} from "lucide-react";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const permissions = useRolePermissions();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Redirect non-dashboard roles to their appropriate portals
  useEffect(() => {
    if (!loading && user && !permissions.canViewDashboard) {
      if (permissions.canViewAttendeePortal) {
        navigate("/portal");
      } else if (permissions.canViewSponsorPortal) {
        navigate("/sponsor/portal");
      } else if (permissions.canJudgeNominations) {
        navigate("/portal"); // Judge portal not implemented yet, redirect to main portal
      }
    }
  }, [permissions, loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  const widgets = [
    { icon: Calendar, label: "Upcoming Events", value: "3", trend: "+2 this month", visible: permissions.canManageEvents },
    { icon: Ticket, label: "Registrations Today", value: "47", trend: "+12% vs yesterday", visible: permissions.canManageEvents },
    { icon: DollarSign, label: "Ticket Revenue", value: "$12,450", trend: "+8% this week", visible: permissions.canViewAnalytics },
    { icon: FileText, label: "Sponsor Pipeline", value: "8 deals", trend: "$45K potential", visible: permissions.canManageSponsors }
  ].filter(w => w.visible);

  return (
    <div className="min-h-full">
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
          {permissions.canCreateEvents && (
            <Card className="bg-gradient-card border-border p-6 hover:border-primary/50 transition-colors cursor-pointer">
              <Calendar className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-headline font-bold text-foreground mb-2">Create Event</h3>
              <p className="text-sm text-muted-foreground mb-4">Launch a new live, virtual, or hybrid event.</p>
              <Button variant="outline" asChild size="sm">
                <Link to="/admin/events">Get Started</Link>
              </Button>
            </Card>
          )}

          {permissions.canCreateAwards && (
            <Card className="bg-gradient-card border-border p-6 hover:border-accent/50 transition-colors cursor-pointer">
              <Award className="w-8 h-8 text-accent mb-4" />
              <h3 className="font-headline font-bold text-foreground mb-2">Create Awards Program</h3>
              <p className="text-sm text-muted-foreground mb-4">Set up categories, nominations, and judging.</p>
              <Button variant="outline" asChild size="sm">
                <Link to="/admin/awards">Get Started</Link>
              </Button>
            </Card>
          )}

          {permissions.canManageAIAgents && (
            <Card className="bg-gradient-card border-border p-6 hover:border-primary/50 transition-colors cursor-pointer">
              <Bot className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-headline font-bold text-foreground mb-2">Use AI Agent</h3>
              <p className="text-sm text-muted-foreground mb-4">Let AI help plan your next event or awards.</p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </Card>
          )}
        </div>

        {/* Role-specific content for non-admin roles */}
        {permissions.canJudgeNominations && (
          <Card className="bg-gradient-card border-border p-6 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <Gavel className="w-8 h-8 text-purple-500" />
              <h3 className="font-headline font-bold text-foreground">Judge Portal</h3>
            </div>
            <p className="text-muted-foreground mb-4">Review and score nominations assigned to you.</p>
            <Button variant="outline" size="sm">View Assignments</Button>
          </Card>
        )}

        {permissions.canViewSponsorPortal && (
          <Card className="bg-gradient-card border-border p-6 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-8 h-8 text-blue-500" />
              <h3 className="font-headline font-bold text-foreground">Sponsor Portal</h3>
            </div>
            <p className="text-muted-foreground mb-4">Manage your sponsorship assets and view analytics.</p>
            <Button variant="outline" size="sm">View Dashboard</Button>
          </Card>
        )}

        {permissions.canViewAttendeePortal && (
          <Card className="bg-gradient-card border-border p-6 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <UserCircle className="w-8 h-8 text-green-500" />
              <h3 className="font-headline font-bold text-foreground">My Events</h3>
            </div>
            <p className="text-muted-foreground mb-4">View your tickets, schedule, and event details.</p>
            <Button variant="outline" asChild size="sm">
              <Link to="/attendee/portal">View My Events</Link>
            </Button>
          </Card>
        )}
    </div>
  );
};

export default Dashboard;
