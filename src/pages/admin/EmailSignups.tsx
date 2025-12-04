import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Search, Mail, Calendar, Tag, 
  MoreVertical, Trash2, Edit2, X, Check, Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EmailSignup {
  id: string;
  email: string;
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const AdminEmailSignups = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [signups, setSignups] = useState<EmailSignup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSignup, setEditingSignup] = useState<EmailSignup | null>(null);
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSignups();
    }
  }, [user]);

  const fetchSignups = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('email_signups')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({
        title: "Error loading signups",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSignups(data || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('email_signups')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast({
        title: "Error deleting signup",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSignups(signups.filter(s => s.id !== id));
      toast({
        title: "Signup deleted",
        description: "Email signup has been removed.",
      });
    }
  };

  const handleUpdateNotes = async () => {
    if (!editingSignup) return;
    
    const { error } = await supabase
      .from('email_signups')
      .update({ notes: editNotes })
      .eq('id', editingSignup.id);
    
    if (error) {
      toast({
        title: "Error updating notes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSignups(signups.map(s => 
        s.id === editingSignup.id ? { ...s, notes: editNotes } : s
      ));
      setEditingSignup(null);
      toast({
        title: "Notes updated",
        description: "Signup notes have been saved.",
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Source', 'Notes', 'Signed Up'];
    const rows = filteredSignups.map(s => [
      s.email,
      s.source,
      s.notes || '',
      new Date(s.created_at).toLocaleDateString()
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-signups-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredSignups = signups.filter(signup =>
    signup.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    signup.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (signup.notes?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sourceColors: Record<string, string> = {
    'national-military-podcast-day': 'bg-primary/10 text-primary',
    'general': 'bg-secondary text-secondary-foreground',
    'newsletter': 'bg-accent/10 text-accent',
  };

  if (loading || !user) return null;

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
              <h1 className="text-2xl font-headline font-bold text-foreground">Email Signups</h1>
              <p className="text-sm text-muted-foreground">
                {signups.length} total signups
              </p>
            </div>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by email, source, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading signups...</div>
        ) : filteredSignups.length === 0 ? (
          <Card className="p-12 text-center">
            <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-headline font-bold text-lg mb-2">No signups yet</h3>
            <p className="text-muted-foreground">
              Email signups from forms will appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSignups.map((signup) => (
              <Card key={signup.id} className="bg-gradient-card border-border p-4 hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{signup.email}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge className={sourceColors[signup.source] || 'bg-secondary text-secondary-foreground'}>
                          <Tag className="w-3 h-3 mr-1" />
                          {signup.source}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(signup.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {signup.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          "{signup.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingSignup(signup);
                        setEditNotes(signup.notes || '');
                      }}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Notes
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDelete(signup.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Notes Dialog */}
      <Dialog open={!!editingSignup} onOpenChange={() => setEditingSignup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notes for {editingSignup?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Add notes about this signup..."
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingSignup(null)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleUpdateNotes}>
                <Check className="w-4 h-4 mr-2" />
                Save Notes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmailSignups;