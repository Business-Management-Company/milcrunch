import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Calendar, Ticket, Award, Vote, 
  Clock, MessageSquare, LogOut, QrCode
} from "lucide-react";

const AttendeePortal = () => {
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

  const navItems = [
    { icon: Calendar, label: "My Events", active: true },
    { icon: Ticket, label: "My Tickets" },
    { icon: Award, label: "My Nominations" },
    { icon: Vote, label: "My Votes" },
    { icon: Clock, label: "My Schedule" },
    { icon: MessageSquare, label: "Messages" }
  ];

  // Placeholder data
  const upcomingEvents = [
    {
      id: "1",
      title: "Military Times Veterans Summit 2024",
      date: "March 15-17, 2024",
      location: "Washington, DC",
      ticketType: "VIP Pass"
    },
    {
      id: "2",
      title: "Task & Purpose Virtual Career Fair",
      date: "April 5, 2024",
      location: "Online",
      ticketType: "General Admission"
    }
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
            <span className="font-display font-bold text-foreground">My Portal</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item, index) => (
            <button
              key={index}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                item.active 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
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
              <p className="text-xs text-muted-foreground">Attendee</p>
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
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">My Events</h1>
          <p className="text-muted-foreground">Your registered events and tickets</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {upcomingEvents.map((event) => (
            <Card key={event.id} className="bg-gradient-card border-border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-foreground mb-1">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">{event.date}</p>
                  <p className="text-sm text-muted-foreground">{event.location}</p>
                </div>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                  {event.ticketType}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <QrCode className="w-4 h-4 mr-2" />
                  View Ticket
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Clock className="w-4 h-4 mr-2" />
                  My Schedule
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {upcomingEvents.length === 0 && (
          <Card className="bg-gradient-card border-border p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display font-bold text-foreground mb-2">No upcoming events</h3>
            <p className="text-muted-foreground mb-4">Browse events and register for something exciting!</p>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link to="/">Browse Events</Link>
            </Button>
          </Card>
        )}

        {/* Quick Links */}
        <h2 className="text-xl font-display font-bold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-card border-border p-4 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-accent" />
              <div>
                <p className="font-medium text-foreground">Submit Nomination</p>
                <p className="text-xs text-muted-foreground">Nominate for awards</p>
              </div>
            </div>
          </Card>
          <Card className="bg-gradient-card border-border p-4 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <Vote className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium text-foreground">Cast Your Vote</p>
                <p className="text-xs text-muted-foreground">Vote for nominees</p>
              </div>
            </div>
          </Card>
          <Card className="bg-gradient-card border-border p-4 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium text-foreground">Get Help</p>
                <p className="text-xs text-muted-foreground">Contact support</p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AttendeePortal;
