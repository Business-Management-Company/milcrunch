import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  ListTodo,
  Rocket,
  FileCode,
  MessageSquare,
  Bug,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STAT_LABELS: Record<string, string> = {
  total: "Total Tasks",
  open: "Open",
  in_progress: "In Progress",
  done: "Done",
  bugs: "Bugs",
};

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Record<string, number>>({
    total: 0,
    open: 0,
    in_progress: 0,
    done: 0,
    bugs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: tasks, error } = await supabase.from("admin_tasks").select("status");
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      const list = tasks ?? [];
      const bugs = list.filter((t) => t.status === "bugs").length;
      const done = list.filter((t) => t.status === "done").length;
      const inProgress = list.filter((t) => t.status === "in_progress").length;
      const open = list.filter((t) => !["done", "bugs"].includes(t.status ?? "")).length - inProgress;
      setStats({
        total: list.length,
        open: Math.max(0, open),
        in_progress: inProgress,
        done,
        bugs,
      });
      setLoading(false);
    })();
  }, []);

  const links = [
    { to: "/admin/tasks", label: "Task Board", icon: ListTodo },
    { to: "/admin/deployments", label: "Deployments", icon: Rocket },
    { to: "/admin/prompts", label: "Prompt Library", icon: FileCode },
    { to: "/admin/chat", label: "AI Chat", icon: MessageSquare },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Super Admin</h1>
        <p className="text-muted-foreground mt-1">Project management and development tracking.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading stats…</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(["total", "open", "in_progress", "done", "bugs"] as const).map((key) => (
            <Card key={key} className="bg-card">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {STAT_LABELS[key]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-foreground">{stats[key]}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {links.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-3 pt-6">
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="font-medium">{label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
