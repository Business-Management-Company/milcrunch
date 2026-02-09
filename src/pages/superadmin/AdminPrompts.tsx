import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Plus, Copy, Loader2, ExternalLink } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

const PROMPT_STATUS = [
  { value: "not_sent", label: "Not Sent" },
  { value: "sent", label: "Sent to Cursor" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
] as const;

interface AdminPrompt {
  id: string;
  title: string;
  prompt_text: string;
  task_id: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface AdminTask {
  id: string;
  title: string;
}

export default function AdminPrompts() {
  const [prompts, setPrompts] = useState<AdminPrompt[]>([]);
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [promptText, setPromptText] = useState("");
  const [taskId, setTaskId] = useState<string>("none");
  const [status, setStatus] = useState<string>("not_sent");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPrompts = useCallback(async () => {
    const { data, error } = await supabase
      .from("admin_prompts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setPrompts((data ?? []) as AdminPrompt[]);
  }, []);

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase.from("admin_tasks").select("id, title").order("title");
    setTasks((data ?? []) as AdminTask[]);
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchPrompts(), fetchTasks()]);
      setLoading(false);
    })();
  }, [fetchPrompts, fetchTasks]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await supabase.from("admin_prompts").insert({
      title: title.trim(),
      prompt_text: promptText.trim() || "",
      task_id: taskId && taskId !== "none" ? taskId : null,
      status,
    });
    setSaving(false);
    setDialogOpen(false);
    setTitle("");
    setPromptText("");
    setTaskId("none");
    setStatus("not_sent");
    fetchPrompts();
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusLabel = (s: string) => PROMPT_STATUS.find((o) => o.value === s)?.label ?? s;

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
        <h1 className="text-2xl font-bold">Prompt Library</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Prompt
        </Button>
      </div>

      <div className="grid gap-4">
        {prompts.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{p.title}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(p.prompt_text, p.id)}
                >
                  {copiedId === p.id ? (
                    "Copied"
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{statusLabel(p.status)}</span>
                {p.sent_at && (
                  <span>Sent {format(new Date(p.sent_at), "MMM d, yyyy")}</span>
                )}
                {p.task_id && (
                  <Link
                    to="/admin/tasks"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Task <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap font-mono">
                {p.prompt_text || "(empty)"}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>

      {prompts.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No prompts yet. Add one to store Cursor prompts for reference.
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add prompt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                className="mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fix discovery API headers"
              />
            </div>
            <div>
              <Label>Associated task</Label>
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROMPT_STATUS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Full prompt text</Label>
              <textarea
                className="mt-1 w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Paste the full Cursor prompt..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !title.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
