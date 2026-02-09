import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Plus, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const STATUS_OPTIONS = [
  { value: "success", label: "✅ Success" },
  { value: "failed", label: "❌ Failed" },
  { value: "building", label: "🔄 Building" },
] as const;

interface Deployment {
  id: string;
  commit_message: string | null;
  status: string;
  vercel_url: string | null;
  notes: string | null;
  deployed_at: string;
}

export default function AdminDeployments() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [status, setStatus] = useState<string>("success");
  const [vercelUrl, setVercelUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchDeployments = useCallback(async () => {
    const { data, error } = await supabase
      .from("admin_deployments")
      .select("*")
      .order("deployed_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setDeployments((data ?? []) as Deployment[]);
  }, []);

  useEffect(() => {
    (async () => {
      await fetchDeployments();
      setLoading(false);
    })();
  }, [fetchDeployments]);

  const handleLogDeployment = async () => {
    setSaving(true);
    await supabase.from("admin_deployments").insert({
      commit_message: commitMessage || null,
      status,
      vercel_url: vercelUrl || null,
      notes: notes || null,
    });
    setSaving(false);
    setDialogOpen(false);
    setCommitMessage("");
    setStatus("success");
    setVercelUrl("");
    setNotes("");
    fetchDeployments();
  };

  const statusLabel = (s: string) => STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Deployments</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Log Deployment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deployment log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Timestamp</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Commit message</th>
                  <th className="text-left p-3 font-medium">Vercel</th>
                  <th className="text-left p-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((d) => (
                  <tr key={d.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {format(new Date(d.deployed_at), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="p-3">{statusLabel(d.status)}</td>
                    <td className="p-3 max-w-[280px] truncate" title={d.commit_message ?? ""}>
                      {d.commit_message ?? "—"}
                    </td>
                    <td className="p-3">
                      {d.vercel_url ? (
                        <a
                          href={d.vercel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Link <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 max-w-[200px] text-muted-foreground text-xs">
                      {d.notes ? (d.notes.length > 80 ? d.notes.slice(0, 80) + "…" : d.notes) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {deployments.length === 0 && (
            <p className="p-6 text-center text-muted-foreground">No deployments logged yet.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log deployment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Commit message</Label>
              <Input
                className="mt-1"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="e.g. fix: discovery API headers"
              />
            </div>
            <div>
              <Label>Vercel deployment URL</Label>
              <Input
                className="mt-1"
                value={vercelUrl}
                onChange={(e) => setVercelUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Notes</Label>
              <textarea
                className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLogDeployment} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
