import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ArrowLeft, Loader2, Trash2, Copy, LayoutTemplate, Eye } from "lucide-react";
import { getEmailTemplates, upsertEmailTemplate, deleteEmailTemplate } from "@/lib/email-db";
import { BUILT_IN_TEMPLATES } from "@/lib/email-templates-html";
import type { EmailTemplate } from "@/lib/email-types";
import type { BuiltInTemplate } from "@/lib/email-templates-html";

const EmailTemplates = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [editName, setEditName] = useState("");
  const [editHtml, setEditHtml] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setTemplates(await getEmailTemplates());
      setLoading(false);
    })();
  }, []);

  const handleUseBuiltIn = (tpl: BuiltInTemplate) => {
    setEditing(null);
    setEditName(tpl.name);
    setEditHtml(tpl.html);
    setEditCategory(tpl.category);
  };

  const handleEditTemplate = (tpl: EmailTemplate) => {
    setEditing(tpl);
    setEditName(tpl.name);
    setEditHtml(tpl.html_content || "");
    setEditCategory(tpl.category || "custom");
  };

  const handleSave = async () => {
    if (!editName.trim()) { toast.error("Template name is required"); return; }
    setSaving(true);
    const result = await upsertEmailTemplate({
      id: editing?.id,
      name: editName.trim(),
      category: editCategory || "custom",
      html_content: editHtml,
      thumbnail_color: BUILT_IN_TEMPLATES.find(b => b.category === editCategory)?.thumbnail_color || "#6C5CE7",
    });
    if (result) {
      if (editing) {
        setTemplates(prev => prev.map(t => t.id === result.id ? result : t));
      } else {
        setTemplates(prev => [result, ...prev]);
      }
      toast.success("Template saved");
      handleBack();
    } else {
      toast.error("Failed to save template");
    }
    setSaving(false);
  };

  const handleDuplicate = async (tpl: EmailTemplate) => {
    const result = await upsertEmailTemplate({
      name: `${tpl.name} (Copy)`,
      category: tpl.category,
      html_content: tpl.html_content,
      thumbnail_color: tpl.thumbnail_color,
    });
    if (result) {
      setTemplates(prev => [result, ...prev]);
      toast.success("Template duplicated");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (await deleteEmailTemplate(deleteId)) {
      setTemplates(prev => prev.filter(t => t.id !== deleteId));
      toast.success("Template deleted");
    } else {
      toast.error("Failed to delete template");
    }
    setDeleteId(null);
  };

  const handleBack = () => {
    setEditing(null);
    setEditName("");
    setEditHtml("");
    setEditCategory("");
  };

  const isEditorOpen = editName !== "" || editHtml !== "";

  // ── Editor View ────────────────────────────────────────────────
  if (isEditorOpen) {
    return (
      <>
        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            <DialogHeader><DialogTitle>Email Preview</DialogTitle></DialogHeader>
            <iframe srcDoc={editHtml} className="w-full h-[60vh] border rounded-lg" title="Email preview" sandbox="" />
          </DialogContent>
        </Dialog>

        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Templates
          </Button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-pd-navy dark:text-white">{editing ? "Edit Template" : "New Template"}</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPreview(true)}>
                <Eye className="h-4 w-4 mr-1" /> Preview
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Template
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="My Template" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={editCategory} onChange={e => setEditCategory(e.target.value)} placeholder="e.g. newsletter, event" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4" style={{ height: "calc(100vh - 320px)" }}>
          <div className="space-y-2">
            <Label>HTML Source</Label>
            <Textarea value={editHtml} onChange={e => setEditHtml(e.target.value)} className="font-mono text-xs h-full resize-none" placeholder="Paste or write your email HTML here..." style={{ minHeight: "400px" }} />
          </div>
          <div className="space-y-2">
            <Label>Live Preview</Label>
            <iframe srcDoc={editHtml} className="w-full border rounded-lg bg-white" style={{ minHeight: "400px", height: "100%" }} title="Live preview" sandbox="" />
          </div>
        </div>
      </>
    );
  }

  // ── Grid View ──────────────────────────────────────────────────
  return (
    <>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">Email Templates</h1>
          <p className="text-gray-500 dark:text-gray-400">Start with a pre-built template or create your own.</p>
        </div>
        <Button onClick={() => { setEditName("Untitled Template"); setEditHtml(""); setEditCategory("custom"); }}>
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      {/* Pre-built Templates */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Pre-built Templates</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {BUILT_IN_TEMPLATES.map(tpl => (
          <Card key={tpl.category} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleUseBuiltIn(tpl)}>
            <div className="h-32 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${tpl.thumbnail_color}, ${tpl.thumbnail_color}dd)` }}>
              <LayoutTemplate className="h-12 w-12 text-white/80" />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-foreground">{tpl.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{tpl.description}</p>
              <Badge variant="secondary" className="mt-2">{tpl.category}</Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Saved Templates */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Your Templates</h2>
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <p>No saved templates yet. Click a pre-built template above to customize it, or create a blank one.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(tpl => (
            <Card key={tpl.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group" onClick={() => handleEditTemplate(tpl)}>
              <div className="h-24 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${tpl.thumbnail_color || "#6C5CE7"}, ${tpl.thumbnail_color || "#6C5CE7"}dd)` }}>
                <LayoutTemplate className="h-10 w-10 text-white/80" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-foreground">{tpl.name}</h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleDuplicate(tpl); }} title="Duplicate">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setDeleteId(tpl.id); }} title="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                {tpl.category && <Badge variant="secondary" className="mt-2">{tpl.category}</Badge>}
                <p className="text-xs text-muted-foreground mt-2">Created {new Date(tpl.created_at).toLocaleDateString()}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};

export default EmailTemplates;
