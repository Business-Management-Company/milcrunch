import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Plus,
  GripVertical,
  Search,
  LayoutGrid,
  List,
  Trash2,
  Check,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { id: "backlog", label: "📋 Backlog", status: "backlog" },
  { id: "in_progress", label: "🔨 In Progress", status: "in_progress" },
  { id: "testing", label: "🧪 Testing", status: "testing" },
  { id: "done", label: "✅ Done", status: "done" },
  { id: "bugs", label: "🐛 Bugs", status: "bugs" },
] as const;

const PRIORITIES = [
  { value: "critical", label: "🔴 Critical" },
  { value: "high", label: "🟡 High" },
  { value: "medium", label: "🔵 Medium" },
  { value: "low", label: "⚪ Low" },
] as const;

const CATEGORIES = [
  "Feature",
  "Bug",
  "Fix",
  "UI",
  "API",
  "Integration",
] as const;

type TaskStatus = (typeof COLUMNS)[number]["status"];
type Priority = (typeof PRIORITIES)[number]["value"];
type Category = (typeof CATEGORIES)[number];

interface AdminTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  category: string;
  assignee: string | null;
  due_date: string | null;
  sort_order: number;
  related_prompt_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ChecklistItem {
  id: string;
  task_id: string;
  label: string;
  is_checked: boolean;
  sort_order: number;
}

interface TaskNote {
  id: string;
  task_id: string;
  content: string;
  created_at: string;
}

const priorityClass: Record<Priority, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

export default function AdminTasks() {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [checklists, setChecklists] = useState<Record<string, ChecklistItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"priority" | "created" | "due">("created");
  const [detailTask, setDetailTask] = useState<AdminTask | null>(null);
  const [detailChecklist, setDetailChecklist] = useState<ChecklistItem[]>([]);
  const [detailNotes, setDetailNotes] = useState<TaskNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newChecklistLabel, setNewChecklistLabel] = useState("");
  const [relatedPrompt, setRelatedPrompt] = useState("");
  const [draggedTask, setDraggedTask] = useState<AdminTask | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("admin_tasks")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    setTasks((data ?? []) as AdminTask[]);
  }, []);

  const fetchChecklists = useCallback(async () => {
    const { data, error } = await supabase
      .from("admin_task_checklist")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    const byTask: Record<string, ChecklistItem[]> = {};
    (data ?? []).forEach((row: ChecklistItem) => {
      if (!byTask[row.task_id]) byTask[row.task_id] = [];
      byTask[row.task_id].push(row);
    });
    setChecklists(byTask);
  }, []);

  useEffect(() => {
    (async () => {
      await fetchTasks();
      await fetchChecklists();
      setLoading(false);
    })();
  }, [fetchTasks, fetchChecklists]);

  const openDetail = useCallback(
    async (task: AdminTask) => {
      setDetailTask(task);
      setDetailChecklist(checklists[task.id] ?? []);
      setRelatedPrompt("");
      const { data: notes } = await supabase
        .from("admin_task_notes")
        .select("*")
        .eq("task_id", task.id)
        .order("created_at", { ascending: false });
      setDetailNotes((notes ?? []) as TaskNote[]);
    },
    [checklists]
  );

  const updateTaskStatus = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      await supabase.from("admin_tasks").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", taskId);
      fetchTasks();
    },
    [fetchTasks]
  );

  const filteredAndSorted = tasks
    .filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterCategory !== "all" && t.category.toLowerCase() !== filterCategory.toLowerCase()) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        const order: Priority[] = ["critical", "high", "medium", "low"];
        return order.indexOf(a.priority as Priority) - order.indexOf(b.priority as Priority);
      }
      if (sortBy === "due") {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
    });

  const tasksByStatus = COLUMNS.reduce(
    (acc, col) => {
      acc[col.status] = filteredAndSorted.filter((t) => t.status === col.status);
      return acc;
    },
    {} as Record<TaskStatus, AdminTask[]>
  );

  const getChecklistProgress = (taskId: string) => {
    const items = checklists[taskId] ?? [];
    if (items.length === 0) return null;
    const done = items.filter((i) => i.is_checked).length;
    return { done, total: items.length };
  };

  const handleDragStart = (e: React.DragEvent, task: AdminTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => setDragOverColumn(null);

  const handleDrop = (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id || !draggedTask) return;
    if (draggedTask.status === newStatus) return;
    updateTaskStatus(id, newStatus);
    setDraggedTask(null);
  };

  const saveTaskDetail = async () => {
    if (!detailTask) return;
    await supabase
      .from("admin_tasks")
      .update({
        title: detailTask.title,
        description: detailTask.description,
        priority: detailTask.priority,
        category: detailTask.category,
        status: detailTask.status,
        due_date: detailTask.due_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", detailTask.id);
    if (relatedPrompt.trim()) {
      await supabase.from("admin_task_notes").insert({
        task_id: detailTask.id,
        content: `[Related prompt]\n${relatedPrompt.trim()}`,
      });
    }
    fetchTasks();
    setDetailTask(null);
  };

  const addNote = async () => {
    if (!detailTask || !newNote.trim()) return;
    await supabase.from("admin_task_notes").insert({
      task_id: detailTask.id,
      content: newNote.trim(),
    });
    const { data } = await supabase
      .from("admin_task_notes")
      .select("*")
      .eq("task_id", detailTask.id)
      .order("created_at", { ascending: false });
    setDetailNotes((data ?? []) as TaskNote[]);
    setNewNote("");
  };

  const toggleChecklistItem = async (item: ChecklistItem) => {
    await supabase
      .from("admin_task_checklist")
      .update({ is_checked: !item.is_checked })
      .eq("id", item.id);
    setDetailChecklist((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_checked: !i.is_checked } : i))
    );
    fetchChecklists();
  };

  const addChecklistItem = async (label: string) => {
    if (!detailTask || !label.trim()) return;
    const maxOrder = Math.max(0, ...detailChecklist.map((i) => i.sort_order));
    const { data } = await supabase
      .from("admin_task_checklist")
      .insert({ task_id: detailTask.id, label: label.trim(), sort_order: maxOrder + 1 })
      .select()
      .single();
    if (data) {
      setDetailChecklist((prev) => [...prev, data as ChecklistItem].sort((a, b) => a.sort_order - b.sort_order));
      setNewChecklistLabel("");
    }
    fetchChecklists();
  };

  const deleteTask = async () => {
    if (!detailTask) return;
    if (!confirm("Delete this task?")) return;
    await supabase.from("admin_tasks").delete().eq("id", detailTask.id);
    fetchTasks();
    setDetailTask(null);
  };

  const addQuickTask = async (status: TaskStatus, title: string, priority: Priority, category: string) => {
    const { error } = await supabase.from("admin_tasks").insert({
      title: title || "New task",
      status,
      priority,
      category: category.toLowerCase(),
      assignee: "Andrew",
      sort_order: maxOrder,
    });
    if (error) { console.error("Insert failed:", error); alert("Failed to create task: " + error.message); return; }
    fetchTasks();
  };
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
        <h1 className="text-2xl font-bold">Task Board</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {COLUMNS.map((c) => (
                <SelectItem key={c.id} value={c.status}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "priority" | "created" | "due")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="created">Date created</SelectItem>
              <SelectItem value="due">Due date</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-input bg-background p-1">
            <Button variant={view === "board" ? "secondary" : "ghost"} size="sm" onClick={() => setView("board")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setView("list")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {view === "list" ? (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Title</th>
                  <th className="text-left p-3 font-medium">Priority</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b hover:bg-muted/30 cursor-pointer"
                    onClick={() => openDetail(t)}
                  >
                    <td className="p-3 font-medium">{t.title}</td>
                    <td className="p-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", priorityClass[t.priority as Priority])}>
                        {PRIORITIES.find((p) => p.value === t.priority)?.label ?? t.priority}
                      </span>
                    </td>
                    <td className="p-3">{t.category}</td>
                    <td className="p-3">{COLUMNS.find((c) => c.status === t.status)?.label ?? t.status}</td>
                    <td className="p-3 text-muted-foreground">{t.created_at ? format(new Date(t.created_at), "MMM d, yyyy") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[70vh]">
          {COLUMNS.map((col) => {
            const colTasks = tasksByStatus[col.status];
            return (
              <div
                key={col.id}
                className={cn(
                  "flex-shrink-0 w-[min(300px,85vw)] md:w-[300px] rounded-xl border-2 border-dashed transition-colors",
                  dragOverColumn === col.id ? "border-amber-500 bg-amber-500/5" : "border-muted"
                )}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.status)}
              >
                <div className="p-3 border-b flex items-center justify-between sticky top-0 bg-card rounded-t-xl">
                  <span className="font-semibold text-sm">{col.label}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const title = window.prompt("Task title");
                      if (title != null) addQuickTask(col.status, title, "medium", "Feature");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-2 space-y-2 max-h-[calc(70vh-52px)] overflow-y-auto">
                  {colTasks.map((task) => {
                    const progress = getChecklistProgress(task.id);
                    return (
                      <Card
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-3" onClick={() => openDetail(task)}>
                          <div className="flex items-start gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm leading-tight">{task.title}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", priorityClass[task.priority as Priority])}>
                                  {PRIORITIES.find((p) => p.value === task.priority)?.label ?? task.priority}
                                </span>
                                <span className="rounded bg-muted px-2 py-0.5 text-xs">{task.category}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{task.assignee ?? "Andrew"}</p>
                              {task.due_date && (
                                <p className="text-xs text-muted-foreground">Due {format(new Date(task.due_date), "MMM d")}</p>
                              )}
                              {progress && (
                                <div className="mt-2">
                                  <Progress value={(progress.done / progress.total) * 100} className="h-1.5" />
                                  <p className="text-xs text-muted-foreground mt-0.5">{progress.done}/{progress.total} items</p>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Created {task.created_at ? format(new Date(task.created_at), "MMM d, yyyy") : "—"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <Dialog open={!!detailTask} onOpenChange={(open) => !open && setDetailTask(null)}>
        <DialogContent className="h-[100dvh] max-h-[100dvh] w-full max-w-full rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-lg overflow-y-auto">
          {detailTask && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Input
                    value={detailTask.title}
                    onChange={(e) => setDetailTask({ ...detailTask, title: e.target.value })}
                    className="text-lg font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0"
                  />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <textarea
                    className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={detailTask.description ?? ""}
                    onChange={(e) => setDetailTask({ ...detailTask, description: e.target.value })}
                    placeholder="Markdown supported"
                  />
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Priority</label>
                    <Select
                      value={detailTask.priority}
                      onValueChange={(v) => setDetailTask({ ...detailTask, priority: v as Priority })}
                    >
                      <SelectTrigger className="w-[140px] mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <Select
                      value={detailTask.category}
                      onValueChange={(v) => setDetailTask({ ...detailTask, category: v })}
                    >
                      <SelectTrigger className="w-[140px] mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Select
                      value={detailTask.status}
                      onValueChange={(v) => setDetailTask({ ...detailTask, status: v as TaskStatus })}
                    >
                      <SelectTrigger className="w-[140px] mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLUMNS.map((c) => (
                          <SelectItem key={c.id} value={c.status}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Due date</label>
                    <Input
                      type="date"
                      className="w-[140px] mt-1"
                      value={detailTask.due_date ?? ""}
                      onChange={(e) => setDetailTask({ ...detailTask, due_date: e.target.value || null })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Checklist</label>
                  <div className="mt-2 space-y-2">
                    {detailChecklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={item.is_checked}
                          onCheckedChange={() => toggleChecklistItem(item)}
                        />
                        <span className={item.is_checked ? "line-through text-muted-foreground" : ""}>{item.label}</span>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Add item..."
                        className="flex-1"
                        value={newChecklistLabel}
                        onChange={(e) => setNewChecklistLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            addChecklistItem(newChecklistLabel);
                          }
                        }}
                      />
                      <Button size="sm" variant="outline" onClick={() => addChecklistItem(newChecklistLabel)}>
                        Add
                      </Button>
                    </div>
                    {detailChecklist.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {detailChecklist.filter((i) => i.is_checked).length}/{detailChecklist.length} done
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Related prompt (Cursor)</label>
                  <textarea
                    className="mt-1 w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-sm"
                    value={relatedPrompt}
                    onChange={(e) => setRelatedPrompt(e.target.value)}
                    placeholder="Paste the Cursor prompt for this task"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <div className="mt-2 space-y-2">
                    {detailNotes.map((n) => (
                      <div key={n.id} className="rounded-md border bg-muted/30 p-2 text-sm">
                        <p className="whitespace-pre-wrap">{n.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.created_at), "MMM d, HH:mm")}</p>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add note…"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addNote()}
                      />
                      <Button size="sm" onClick={addNote}>Add</Button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Created {detailTask.created_at ? format(new Date(detailTask.created_at), "PPp") : "—"}
                  {detailTask.updated_at && ` · Updated ${format(new Date(detailTask.updated_at), "PPp")}`}
                </p>
              </div>
              <DialogFooter>
                <Button variant="destructive" onClick={deleteTask}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
                <Button onClick={saveTaskDetail}>
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
