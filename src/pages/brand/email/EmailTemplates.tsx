import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ArrowLeft, Loader2, Trash2, Copy, LayoutTemplate, Eye, ChevronDown, ChevronRight, Code, GripVertical, X, Image, Type, MousePointer, Minus, Heading, Footprints, Columns2, AlignLeft } from "lucide-react";
import { getEmailTemplates, upsertEmailTemplate, deleteEmailTemplate } from "@/lib/email-db";
import { BUILT_IN_TEMPLATES } from "@/lib/email-templates-html";
import type { EmailTemplate } from "@/lib/email-types";
import type { BuiltInTemplate } from "@/lib/email-templates-html";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Block Types ────────────────────────────────────────────────
type BlockType = "image" | "text" | "button" | "divider" | "header" | "footer" | "two-column";

interface EmailBlock {
  id: string;
  type: BlockType;
  content: string;
  props: Record<string, string>;
}

const BLOCK_PALETTE: { type: BlockType; label: string; icon: typeof Image; emoji: string }[] = [
  { type: "image", label: "Image", icon: Image, emoji: "📷" },
  { type: "text", label: "Text Block", icon: Type, emoji: "📝" },
  { type: "button", label: "Button", icon: MousePointer, emoji: "🔘" },
  { type: "divider", label: "Divider", icon: Minus, emoji: "➖" },
  { type: "header", label: "Header", icon: Heading, emoji: "📋" },
  { type: "footer", label: "Footer", icon: Footprints, emoji: "👣" },
  { type: "two-column", label: "2-Column Layout", icon: Columns2, emoji: "📊" },
];

function defaultBlock(type: BlockType): EmailBlock {
  const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  switch (type) {
    case "image":
      return { id, type, content: "", props: { src: "https://placehold.co/600x200/6C5CE7/white?text=Your+Image", alt: "Image", width: "100%" } };
    case "text":
      return { id, type, content: "Enter your text content here. You can use <b>bold</b> and <em>italic</em> formatting.", props: { color: "#333333", fontSize: "16px" } };
    case "button":
      return { id, type, content: "Click Here", props: { href: "https://milcrunch.com", bgColor: "#6C5CE7", color: "#ffffff", borderRadius: "6px" } };
    case "divider":
      return { id, type, content: "", props: { color: "#e5e7eb", height: "1px" } };
    case "header":
      return { id, type, content: "Your Email Header", props: { bgColor: "#6C5CE7", color: "#ffffff", fontSize: "24px" } };
    case "footer":
      return { id, type, content: "© 2026 RecurrentX. All rights reserved.\n{{unsubscribe_url}}", props: { color: "#999999", fontSize: "12px" } };
    case "two-column":
      return { id, type, content: "Left column content", props: { rightContent: "Right column content", gap: "20px" } };
  }
}

function blockToHtml(block: EmailBlock): string {
  switch (block.type) {
    case "image":
      return `<div style="text-align:center;padding:10px 0;"><img src="${block.props.src}" alt="${block.props.alt}" style="max-width:${block.props.width};height:auto;display:block;margin:0 auto;" /></div>`;
    case "text":
      return `<div style="padding:10px 20px;color:${block.props.color};font-size:${block.props.fontSize};font-family:sans-serif;line-height:1.6;">${block.content}</div>`;
    case "button":
      return `<div style="text-align:center;padding:15px 0;"><a href="${block.props.href}" style="display:inline-block;padding:12px 30px;background:${block.props.bgColor};color:${block.props.color};text-decoration:none;border-radius:${block.props.borderRadius};font-family:sans-serif;font-weight:600;font-size:16px;">${block.content}</a></div>`;
    case "divider":
      return `<hr style="border:none;border-top:${block.props.height} solid ${block.props.color};margin:15px 20px;" />`;
    case "header":
      return `<div style="background:${block.props.bgColor};color:${block.props.color};padding:30px 20px;text-align:center;font-family:sans-serif;font-size:${block.props.fontSize};font-weight:bold;">${block.content}</div>`;
    case "footer":
      return `<div style="padding:20px;text-align:center;color:${block.props.color};font-size:${block.props.fontSize};font-family:sans-serif;line-height:1.5;">${block.content.replace(/\n/g, "<br/>")}</div>`;
    case "two-column":
      return `<table width="100%" cellpadding="0" cellspacing="0" style="padding:10px 20px;"><tr><td width="50%" valign="top" style="padding-right:${block.props.gap};font-family:sans-serif;font-size:14px;color:#333;">${block.content}</td><td width="50%" valign="top" style="font-family:sans-serif;font-size:14px;color:#333;">${block.props.rightContent}</td></tr></table>`;
  }
}

function blocksToFullHtml(blocks: EmailBlock[]): string {
  const body = blocks.map(blockToHtml).join("\n");
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 0;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td>
${body}
</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

function formatHtml(html: string): string {
  let indent = 0;
  return html
    .replace(/>\s*</g, ">\n<")
    .split("\n")
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("</")) indent = Math.max(0, indent - 1);
      const result = "  ".repeat(indent) + trimmed;
      if (trimmed.startsWith("<") && !trimmed.startsWith("</") && !trimmed.startsWith("<!") && !trimmed.endsWith("/>") && !trimmed.includes("</")) {
        indent++;
      }
      return result;
    })
    .filter(Boolean)
    .join("\n");
}

// ── Sortable Block Component ──────────────────────────────────
function SortableBlock({ block, onUpdate, onDelete }: { block: EmailBlock; onUpdate: (b: EmailBlock) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const updateContent = (content: string) => onUpdate({ ...block, content });
  const updateProp = (key: string, value: string) => onUpdate({ ...block, props: { ...block.props, [key]: value } });

  return (
    <div ref={setNodeRef} style={style} className="group relative border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#1A1D27] mb-2">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111827] rounded-t-lg">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium text-muted-foreground uppercase">{block.type.replace("-", " ")}</span>
        <button onClick={onDelete} className="ml-auto text-gray-400 hover:text-red-500 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        {block.type === "image" && (
          <>
            <Input value={block.props.src} onChange={e => updateProp("src", e.target.value)} placeholder="Image URL" className="text-xs" />
            <Input value={block.props.alt} onChange={e => updateProp("alt", e.target.value)} placeholder="Alt text" className="text-xs" />
          </>
        )}
        {block.type === "text" && (
          <Textarea value={block.content} onChange={e => updateContent(e.target.value)} className="text-sm min-h-[60px] resize-none" placeholder="Enter text..." />
        )}
        {block.type === "button" && (
          <div className="grid grid-cols-2 gap-2">
            <Input value={block.content} onChange={e => updateContent(e.target.value)} placeholder="Button text" className="text-xs" />
            <Input value={block.props.href} onChange={e => updateProp("href", e.target.value)} placeholder="URL" className="text-xs" />
            <Input value={block.props.bgColor} onChange={e => updateProp("bgColor", e.target.value)} placeholder="Background color" className="text-xs" />
            <Input value={block.props.color} onChange={e => updateProp("color", e.target.value)} placeholder="Text color" className="text-xs" />
          </div>
        )}
        {block.type === "divider" && (
          <div className="flex gap-2">
            <Input value={block.props.color} onChange={e => updateProp("color", e.target.value)} placeholder="Color" className="text-xs w-32" />
            <Input value={block.props.height} onChange={e => updateProp("height", e.target.value)} placeholder="Height" className="text-xs w-24" />
          </div>
        )}
        {block.type === "header" && (
          <div className="space-y-2">
            <Input value={block.content} onChange={e => updateContent(e.target.value)} placeholder="Header text" className="text-sm font-semibold" />
            <div className="flex gap-2">
              <Input value={block.props.bgColor} onChange={e => updateProp("bgColor", e.target.value)} placeholder="BG color" className="text-xs w-32" />
              <Input value={block.props.color} onChange={e => updateProp("color", e.target.value)} placeholder="Text color" className="text-xs w-32" />
            </div>
          </div>
        )}
        {block.type === "footer" && (
          <Textarea value={block.content} onChange={e => updateContent(e.target.value)} className="text-xs min-h-[50px] resize-none" placeholder="Footer text..." />
        )}
        {block.type === "two-column" && (
          <div className="grid grid-cols-2 gap-2">
            <Textarea value={block.content} onChange={e => updateContent(e.target.value)} className="text-xs min-h-[50px] resize-none" placeholder="Left column..." />
            <Textarea value={block.props.rightContent} onChange={e => updateProp("rightContent", e.target.value)} className="text-xs min-h-[50px] resize-none" placeholder="Right column..." />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
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
  const [htmlCollapsed, setHtmlCollapsed] = useState(true);
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      setTemplates(await getEmailTemplates());
      setLoading(false);
    })();
  }, []);

  // Regenerate HTML from blocks
  const regenerateHtml = useCallback((newBlocks: EmailBlock[]) => {
    setBlocks(newBlocks);
    if (newBlocks.length > 0) {
      setEditHtml(blocksToFullHtml(newBlocks));
    }
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      regenerateHtml(arrayMove(blocks, oldIndex, newIndex));
    }
  };

  const addBlock = (type: BlockType) => {
    regenerateHtml([...blocks, defaultBlock(type)]);
  };

  const updateBlock = (id: string, updated: EmailBlock) => {
    regenerateHtml(blocks.map(b => b.id === id ? updated : b));
  };

  const deleteBlock = (id: string) => {
    regenerateHtml(blocks.filter(b => b.id !== id));
  };

  const handleUseBuiltIn = (tpl: BuiltInTemplate) => {
    setEditing(null);
    setEditName(tpl.name);
    setEditHtml(tpl.html);
    setEditCategory(tpl.category);
    setBlocks([]); // Built-in templates use raw HTML, not blocks
    setHtmlCollapsed(false);
  };

  const handleEditTemplate = (tpl: EmailTemplate) => {
    setEditing(tpl);
    setEditName(tpl.name);
    setEditHtml(tpl.html_content || "");
    setEditCategory(tpl.category || "custom");
    setBlocks([]);
    setHtmlCollapsed(true);
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
    setBlocks([]);
    setHtmlCollapsed(true);
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

        {/* Block Editor + Preview */}
        <div className="grid grid-cols-[200px_1fr_1fr] gap-4" style={{ minHeight: "400px" }}>
          {/* Block Palette */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Blocks</Label>
            <div className="space-y-1.5">
              {BLOCK_PALETTE.map(bp => (
                <button
                  key={bp.type}
                  onClick={() => addBlock(bp.type)}
                  className="w-full flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-left hover:border-[#6C5CE7] hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                  <span className="text-base">{bp.emoji}</span>
                  <span className="font-medium text-foreground">{bp.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Canvas</Label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-[#0F1117] min-h-[400px]">
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                  <AlignLeft className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">Click blocks from the left panel to add them</p>
                  <p className="text-xs mt-1">Then drag to reorder</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    {blocks.map(block => (
                      <SortableBlock
                        key={block.id}
                        block={block}
                        onUpdate={(b) => updateBlock(block.id, b)}
                        onDelete={() => deleteBlock(block.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>

          {/* Live Preview */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Preview</Label>
            <iframe
              srcDoc={editHtml || "<p style='color:#999;padding:20px;font-family:sans-serif;'>Preview will appear here...</p>"}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white"
              style={{ minHeight: "400px", height: "100%" }}
              title="Live preview"
              sandbox=""
            />
          </div>
        </div>

        {/* Collapsible HTML Source */}
        <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setHtmlCollapsed(!htmlCollapsed)}
            className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-[#111827] hover:bg-gray-100 dark:hover:bg-[#1A1D27] transition-colors text-left"
          >
            <Code className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{"< /> Edit HTML Source"}</span>
            {htmlCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />}
          </button>
          {!htmlCollapsed && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" onClick={() => setEditHtml(formatHtml(editHtml))}>
                  <AlignLeft className="h-3.5 w-3.5 mr-1" /> Format HTML
                </Button>
              </div>
              <Textarea
                value={editHtml}
                onChange={e => { setEditHtml(e.target.value); setBlocks([]); }}
                className="font-mono text-xs resize-none"
                style={{ minHeight: "300px" }}
                placeholder="Paste or write your email HTML here..."
              />
            </div>
          )}
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
        <Button onClick={() => { setEditName("Untitled Template"); setEditHtml(""); setEditCategory("custom"); setBlocks([]); setHtmlCollapsed(true); }}>
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
