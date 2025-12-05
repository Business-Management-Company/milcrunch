import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  DollarSign, Plus, Search, MoreVertical,
  Building2, FileText, ArrowLeft, Mail, Phone, User, ExternalLink
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

interface Sponsor {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  industries: string[] | null;
}

const AdminSponsors = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loadingSponsors, setLoadingSponsors] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSponsors();
    }
  }, [user]);

  const fetchSponsors = async () => {
    try {
      const { data, error } = await supabase
        .from("sponsors")
        .select("*")
        .order("name");

      if (error) throw error;
      setSponsors(data || []);
    } catch (error) {
      console.error("Error fetching sponsors:", error);
    } finally {
      setLoadingSponsors(false);
    }
  };

  if (loading || !user) return null;

  const filteredSponsors = sponsors.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
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
              <h1 className="text-2xl font-headline font-bold text-foreground">Sponsors & Proposals</h1>
              <p className="text-sm text-muted-foreground">Manage sponsor relationships and deals</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/sponsorship-wizard">
                <FileText className="w-4 h-4 mr-2" />
                New Proposal
              </Link>
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Add Sponsor
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search sponsors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
        </div>

        {loadingSponsors ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSponsors.map((sponsor) => (
              <Card key={sponsor.id} className="bg-gradient-card border-border p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-headline font-bold text-foreground">{sponsor.name}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {sponsor.industries?.[0] && <span>{sponsor.industries[0]}</span>}
                        {sponsor.website && (
                          <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                            <ExternalLink className="w-3 h-3" />
                            Website
                          </a>
                        )}
                      </div>
                      {(sponsor.contact_name || sponsor.contact_email || sponsor.contact_phone) && (
                        <div className="flex flex-wrap gap-4 pt-2 border-t border-border mt-2">
                          {sponsor.contact_name && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <User className="w-3.5 h-3.5 text-primary" />
                              <span>{sponsor.contact_name}</span>
                            </div>
                          )}
                          {sponsor.contact_email && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Mail className="w-3.5 h-3.5 text-primary" />
                              <a href={`mailto:${sponsor.contact_email}`} className="hover:text-primary transition-colors">
                                {sponsor.contact_email}
                              </a>
                            </div>
                          )}
                          {sponsor.contact_phone && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Phone className="w-3.5 h-3.5 text-primary" />
                              <a href={`tel:${sponsor.contact_phone}`} className="hover:text-primary transition-colors">
                                {sponsor.contact_phone}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                      Active
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Create Proposal</DropdownMenuItem>
                        <DropdownMenuItem>View Deals</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!loadingSponsors && filteredSponsors.length === 0 && (
          <Card className="bg-gradient-card border-border p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-headline font-bold text-foreground mb-2">No sponsors yet</h3>
            <p className="text-muted-foreground mb-4">Add your first sponsor to get started.</p>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Add Sponsor
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminSponsors;
