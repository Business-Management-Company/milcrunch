import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ShieldCheck, Loader2 } from "lucide-react";

const SUPER_ADMIN_EMAILS = ["andrew@recurrentx.com"];

type AccessRow = { id: string; email: string; created_at: string };

export default function ProspectusAccess() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);

  // Route guard: only super admin emails
  useEffect(() => {
    if (authLoading) return;
    if (!user || !SUPER_ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
      navigate("/brand/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const fetchRows = async () => {
    const { data, error } = await supabase
      .from("prospectus_access")
      .select("id, email, created_at")
      .order("created_at", { ascending: true }) as { data: AccessRow[] | null; error: unknown };
    if (error) {
      toast({ title: "Error loading access list", variant: "destructive" });
    }
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    setAdding(true);
    const { error } = await supabase
      .from("prospectus_access")
      .insert({ email } as Record<string, unknown>);
    setAdding(false);
    if (error) {
      const msg = (error as { message?: string }).message ?? "";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast({ title: "Email already on the list", variant: "destructive" });
      } else {
        toast({ title: "Failed to add email", variant: "destructive" });
      }
      return;
    }
    toast({ title: "Email added" });
    setNewEmail("");
    setModalOpen(false);
    fetchRows();
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase
      .from("prospectus_access")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Failed to remove email", variant: "destructive" });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Email removed" });
  };

  if (authLoading || (!user && !authLoading)) return null;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-[#6C5CE7]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Prospectus Access Control</h1>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white gap-2"
        >
          <Plus className="h-4 w-4" /> Add Email
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left font-medium text-gray-500 px-5 py-3">Email</th>
              <th className="text-left font-medium text-gray-500 px-5 py-3">Added Date</th>
              <th className="text-right font-medium text-gray-500 px-5 py-3 w-24">Remove</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-gray-400">
                  No approved emails yet
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-900">{row.email}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(row.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(row.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Email Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Approved Email</h2>
            <Input
              type="email"
              placeholder="email@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setModalOpen(false);
                  setNewEmail("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={adding}
                className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white"
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
