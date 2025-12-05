import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Award, Plus, Search, MoreVertical,
  Calendar, Users, ArrowLeft, Eye, Gavel, Trophy
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface AwardProgram {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  is_published: boolean;
  nomination_start: string | null;
  nomination_end: string | null;
  judging_start: string | null;
  judging_end: string | null;
  year: number | null;
}

const AdminAwards = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [programs, setPrograms] = useState<AwardProgram[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [stats, setStats] = useState<Record<string, { categories: number; nominations: number }>>({});

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPrograms();
    }
  }, [user]);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from("award_programs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrograms(data || []);

      // Fetch stats for each program
      for (const program of data || []) {
        const [catRes, nomRes] = await Promise.all([
          supabase.from("award_categories").select("id", { count: "exact" }).eq("program_id", program.id),
          supabase.from("nominations").select("id", { count: "exact" }).eq("program_id", program.id)
        ]);
        setStats(prev => ({
          ...prev,
          [program.id]: {
            categories: catRes.count || 0,
            nominations: nomRes.count || 0
          }
        }));
      }
    } catch (error) {
      console.error("Error fetching programs:", error);
    } finally {
      setLoadingPrograms(false);
    }
  };

  const getStatus = (program: AwardProgram) => {
    const now = new Date();
    if (program.judging_start && new Date(program.judging_start) <= now) {
      return { label: "Judging", color: "bg-accent/10 text-accent" };
    }
    if (program.nomination_end && new Date(program.nomination_end) >= now) {
      return { label: "Accepting Nominations", color: "bg-primary/10 text-primary" };
    }
    if (!program.is_published) {
      return { label: "Draft", color: "bg-secondary text-muted-foreground" };
    }
    return { label: "Active", color: "bg-primary/10 text-primary" };
  };

  if (loading || !user) return null;

  const filteredPrograms = programs.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <h1 className="text-2xl font-headline font-bold text-foreground">Awards Programs</h1>
              <p className="text-sm text-muted-foreground">Manage nominations, judging, and winners</p>
            </div>
          </div>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
            <Link to="/admin/awards/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Awards Program
            </Link>
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

        {loadingPrograms ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPrograms.map((program) => {
              const status = getStatus(program);
              const programStats = stats[program.id] || { categories: 0, nominations: 0 };
              
              return (
                <Card key={program.id} className="bg-gradient-card border-border p-6 hover:border-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Award className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-headline font-bold text-foreground mb-1">{program.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{programStats.categories} categories</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {programStats.nominations} nominations
                          </span>
                          {program.nomination_end && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Deadline: {format(new Date(program.nomination_end), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="flex items-center">
                            <Eye className="w-4 h-4 mr-2" />
                            View Nominations
                          </DropdownMenuItem>
                          <DropdownMenuItem className="flex items-center">
                            <Gavel className="w-4 h-4 mr-2" />
                            Manage Judges
                          </DropdownMenuItem>
                          <DropdownMenuItem className="flex items-center">
                            <Trophy className="w-4 h-4 mr-2" />
                            Announce Winners
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {!loadingPrograms && filteredPrograms.length === 0 && (
          <Card className="bg-gradient-card border-border p-12 text-center">
            <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-headline font-bold text-foreground mb-2">No awards programs yet</h3>
            <p className="text-muted-foreground mb-4">Create your first awards program to get started.</p>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
              <Link to="/admin/awards/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Awards Program
              </Link>
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminAwards;
