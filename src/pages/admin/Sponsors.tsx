import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  DollarSign, Plus, Search, MoreVertical,
  Building2, FileText, ArrowLeft
} from "lucide-react";

const AdminSponsors = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  // Placeholder sponsors data
  const sponsors = [
    {
      id: "1",
      name: "USAA",
      industry: "Financial Services",
      deals: 3,
      revenue: "$75,000",
      status: "Active"
    },
    {
      id: "2",
      name: "Lockheed Martin",
      industry: "Defense",
      deals: 2,
      revenue: "$120,000",
      status: "Active"
    },
    {
      id: "3",
      name: "Booz Allen Hamilton",
      industry: "Consulting",
      deals: 1,
      revenue: "$45,000",
      status: "Proposal Sent"
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
              <h1 className="text-2xl font-display font-bold text-foreground">Sponsors & Proposals</h1>
              <p className="text-sm text-muted-foreground">Manage sponsor relationships and deals</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              New Proposal
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

        <div className="space-y-4">
          {sponsors.map((sponsor) => (
            <Card key={sponsor.id} className="bg-gradient-card border-border p-6 hover:border-primary/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-foreground mb-1">{sponsor.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{sponsor.industry}</span>
                      <span>{sponsor.deals} active deals</span>
                      <span className="flex items-center gap-1 text-primary">
                        <DollarSign className="w-3 h-3" />
                        {sponsor.revenue} total
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    sponsor.status === "Active" 
                      ? "bg-primary/10 text-primary" 
                      : "bg-accent/10 text-accent"
                  }`}>
                    {sponsor.status}
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

export default AdminSponsors;
