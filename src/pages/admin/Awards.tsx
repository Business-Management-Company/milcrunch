import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Award, Plus, Search, MoreVertical,
  Calendar, Users, ArrowLeft
} from "lucide-react";

const AdminAwards = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  // Placeholder awards data
  const awards = [
    {
      id: "1",
      title: "Veteran Podcast Awards 2024",
      categories: 15,
      nominations: 487,
      deadline: "January 31, 2024",
      status: "Accepting Nominations"
    },
    {
      id: "2",
      title: "Military Spouse of the Year",
      categories: 5,
      nominations: 234,
      deadline: "February 15, 2024",
      status: "Judging"
    },
    {
      id: "3",
      title: "Defense Innovation Awards",
      categories: 8,
      nominations: 156,
      deadline: "March 1, 2024",
      status: "Draft"
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
              <h1 className="text-2xl font-display font-bold text-foreground">Awards Programs</h1>
              <p className="text-sm text-muted-foreground">Manage nominations, judging, and winners</p>
            </div>
          </div>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Create Awards Program
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search awards programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
        </div>

        <div className="space-y-4">
          {awards.map((award) => (
            <Card key={award.id} className="bg-gradient-card border-border p-6 hover:border-accent/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Award className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-foreground mb-1">{award.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{award.categories} categories</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {award.nominations} nominations
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Deadline: {award.deadline}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    award.status === "Accepting Nominations" 
                      ? "bg-primary/10 text-primary" 
                      : award.status === "Judging"
                      ? "bg-accent/10 text-accent"
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {award.status}
                  </span>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminAwards;
