import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Calendar, Plus, Search, MoreVertical,
  MapPin, Users, ArrowLeft
} from "lucide-react";

const AdminEvents = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  // Placeholder events data
  const events = [
    {
      id: "1",
      title: "Military Times Veterans Summit 2024",
      type: "Hybrid",
      date: "March 15-17, 2024",
      location: "Washington, DC",
      registrations: 450,
      status: "Published"
    },
    {
      id: "2",
      title: "Task & Purpose Virtual Career Fair",
      type: "Virtual",
      date: "April 5, 2024",
      location: "Online",
      registrations: 1200,
      status: "Draft"
    },
    {
      id: "3",
      title: "Defense Innovation Conference",
      type: "Live",
      date: "May 20-21, 2024",
      location: "San Diego, CA",
      registrations: 320,
      status: "Published"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Events</h1>
              <p className="text-sm text-muted-foreground">Manage your events</p>
            </div>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
            <Link to="/admin/events/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
        </div>

        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id} className="bg-gradient-card border-border p-6 hover:border-primary/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-foreground mb-1">{event.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {event.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {event.registrations} registered
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    event.status === "Published" 
                      ? "bg-primary/10 text-primary" 
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {event.status}
                  </span>
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-secondary text-muted-foreground">
                    {event.type}
                  </span>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {events.length === 0 && (
          <Card className="bg-gradient-card border-border p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display font-bold text-foreground mb-2">No events yet</h3>
            <p className="text-muted-foreground mb-4">Create your first event to get started.</p>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
              <Link to="/admin/events/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Link>
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminEvents;
