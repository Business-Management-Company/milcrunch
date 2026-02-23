import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Copy, Check,
  Type, AlignLeft, Mail, Phone, Link2, List, CircleDot, CheckSquare,
  Upload, Hash, CalendarDays, Layers, GripVertical, Eye, Save, Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getForms, getForm, upsertForm, deleteForm } from "@/lib/sponsor-db";
import { DEFAULT_FORM_FIELDS, SPONSOR_TIERS, generateId } from "@/lib/sponsor-types";
import type { FormField, SponsorForm } from "@/lib/sponsor-types";
import { useToast } from "@/hooks/use-toast";

const FIELD_TYPES = [
  { type: "text", label: "Text Input", icon: Type },
  { type: "textarea", label: "Text Area", icon: AlignLeft },
  { type: "email", label: "Email", icon: Mail },
  { type: "phone", label: "Phone", icon: Phone },
  { type: "url", label: "URL", icon: Link2 },
  { type: "select", label: "Dropdown", icon: List },
  { type: "radio", label: "Radio Buttons", icon: CircleDot },
  { type: "checkbox", label: "Checkboxes", icon: CheckSquare },
  { type: "file", label: "File Upload", icon: Upload },
  { type: "number", label: "Number", icon: Hash },
  { type: "date", label: "Date", icon: CalendarDays },
  { type: "tier_selection", label: "Tier Selection", icon: Layers },
] as const;

type ViewMode = "list" | "builder";

export default function SponsorFormBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<ViewMode>(id ? "builder" : "list");
  const [forms, setForms] = useState<SponsorForm[]>([]);
  const [loading, setLoading] = useState(true);

  // Builder state
  const [formTitle, setFormTitle] = useState("Sponsor Application");
  const [formDesc, setFormDesc] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormId, setEditFormId] = useState<string | undefined>(id);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load forms list
  useEffect(() => {
    (async () => {
      const f = await getForms();
      setForms(f);
      setLoading(false);
    })();
  }, []);

  // Load specific form for editing
  useEffect(() => {
    if (!id) return;
    (async () => {
      const f = await getForm(id);
      if (f) {
        setFormTitle(f.title);
        setFormDesc(f.description || "");
        setFields(f.fields);
        setIsActive(f.is_active);
        setEditFormId(f.id);
        setMode("builder");
      }
    })();
  }, [id]);

  const startNewForm = () => {
    setFormTitle("Sponsor Application");
    setFormDesc("Submit your sponsorship application for our upcoming event.");
    setFields([...DEFAULT_FORM_FIELDS]);
    setEditFormId(undefined);
    setIsActive(true);
    setEditingId(null);
    setMode("builder");
  };

  const openForm = (form: SponsorForm) => {
    setFormTitle(form.title);
    setFormDesc(form.description || "");
    setFields(form.fields);
    setEditFormId(form.id);
    setIsActive(form.is_active);
    setEditingId(null);
    setMode("builder");
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm("Delete this form? Submissions will remain.")) return;
    await deleteForm(formId);
    setForms((prev) => prev.filter((f) => f.id !== formId));
    toast({ title: "Form deleted" });
  };

  // Field operations
  const addField = (type: FormField["type"]) => {
    const newField: FormField = {
      id: generateId(),
      type,
      label: FIELD_TYPES.find((f) => f.type === type)?.label || "New Field",
      required: false,
      placeholder: "",
      options: ["select", "radio", "checkbox"].includes(type) ? ["Option 1", "Option 2"] : undefined,
    };
    setFields((prev) => [...prev, newField]);
    setEditingId(newField.id);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= fields.length) return;
    const copy = [...fields];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    setFields(copy);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    setSaving(true);
    const result = await upsertForm({ id: editFormId, title: formTitle, description: formDesc, fields, is_active: isActive });
    setSaving(false);
    if (result) {
      setEditFormId(result.id);
      setForms((prev) => {
        const exists = prev.find((f) => f.id === result.id);
        if (exists) return prev.map((f) => (f.id === result.id ? result : f));
        return [result, ...prev];
      });
      toast({ title: "Form saved!" });
    } else {
      toast({ title: "Failed to save form", variant: "destructive" });
    }
  };

  const copyShareLink = () => {
    if (!editFormId) return;
    navigator.clipboard.writeText(`${window.location.origin}/sponsor-apply/${editFormId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copied to clipboard!" });
  };

  // ─── LIST VIEW ──────────────────────────────────────────────────
  if (mode === "list") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sponsor Forms</h1>
            <p className="text-gray-500 text-sm mt-1">Create and manage sponsor intake forms.</p>
          </div>
          <Button onClick={startNewForm} className="bg-[#1e3a5f] hover:bg-[#2d5282]">
            <Plus className="h-4 w-4 mr-2" /> New Form
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : forms.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2">
            <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-700 mb-2">No forms yet</h3>
            <p className="text-gray-500 text-sm mb-4">Create your first sponsor intake form with our drag-and-drop builder.</p>
            <Button onClick={startNewForm} className="bg-[#1e3a5f] hover:bg-[#2d5282]">
              <Plus className="h-4 w-4 mr-2" /> Create First Form
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {forms.map((form) => (
              <Card key={form.id} className="p-5 hover:shadow-md transition-shadow border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => openForm(form)}>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{form.title}</h3>
                      <Badge variant={form.is_active ? "default" : "secondary"} className={form.is_active ? "bg-green-100 text-green-700" : ""}>
                        {form.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{form.fields.length} fields &middot; Created {new Date(form.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/sponsor-apply/${form.id}`); toast({ title: "Link copied!" }); }}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Share
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openForm(form)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteForm(form.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── BUILDER VIEW ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setMode("list")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{editFormId ? "Edit Form" : "New Sponsor Form"}</h1>
            <p className="text-gray-500 text-xs">Build your form, save, and share the link.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editFormId && (
            <Button variant="outline" size="sm" onClick={copyShareLink}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Share2 className="h-3.5 w-3.5 mr-1" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          )}
          {editFormId && (
            <Button variant="outline" size="sm" onClick={() => window.open(`/sponsor-apply/${editFormId}`, "_blank")}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Preview
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#2d5282]">
            <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Form"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Live Preview */}
        <div className="lg:col-span-2 space-y-4">
          {/* Form title/desc */}
          <Card className="p-5 border-gray-200">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Form Title</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="text-lg font-semibold mt-1" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Description</Label>
                <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} className="mt-1" placeholder="Describe this form..." />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label className="text-sm text-gray-600">Form is active (accepting submissions)</Label>
              </div>
            </div>
          </Card>

          {/* Fields */}
          {fields.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-2">
              <p className="text-gray-500">No fields yet. Add fields from the palette on the right.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <Card
                  key={field.id}
                  className={cn(
                    "border transition-all",
                    editingId === field.id ? "border-[#1e3a5f] shadow-sm ring-1 ring-[#1e3a5f]/20" : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="p-4">
                    {/* Field header */}
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical className="h-4 w-4 text-gray-300" />
                      <span className="text-xs font-medium text-gray-400 uppercase">{field.type.replace("_", " ")}</span>
                      {field.required && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Required</Badge>}
                      <div className="ml-auto flex items-center gap-1">
                        <button onClick={() => moveField(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                          <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                        <button onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                          <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                        <button onClick={() => setEditingId(editingId === field.id ? null : field.id)} className="p-1 rounded hover:bg-gray-100">
                          <Type className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                        <button onClick={() => removeField(field.id)} className="p-1 rounded hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>

                    {/* Field preview */}
                    <div className="ml-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {field.helpText && <p className="text-xs text-gray-400 mb-1">{field.helpText}</p>}
                      <FieldPreview field={field} />
                    </div>

                    {/* Inline edit panel */}
                    {editingId === field.id && (
                      <div className="mt-4 ml-6 p-4 rounded-lg bg-gray-50 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Label</Label>
                            <Input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">Placeholder</Label>
                            <Input value={field.placeholder || ""} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} className="mt-1" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Help Text</Label>
                          <Input value={field.helpText || ""} onChange={(e) => updateField(field.id, { helpText: e.target.value })} className="mt-1" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={field.required} onCheckedChange={(v) => updateField(field.id, { required: v })} />
                          <Label className="text-sm">Required</Label>
                        </div>
                        {/* Options editor for select/radio/checkbox */}
                        {field.options && (
                          <div>
                            <Label className="text-xs">Options (one per line)</Label>
                            <Textarea
                              value={field.options.join("\n")}
                              onChange={(e) => updateField(field.id, { options: e.target.value.split("\n").filter(Boolean) })}
                              rows={4}
                              className="mt-1 font-mono text-xs"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Field Palette */}
        <div className="space-y-4">
          <Card className="p-4 border-gray-200 sticky top-20">
            <h3 className="font-semibold text-sm text-gray-700 mb-3">Add Field</h3>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => addField(type as FormField["type"])}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 text-left text-xs font-medium text-gray-700 hover:border-[#1e3a5f] hover:bg-[#1e3a5f]/5 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 text-gray-400" />
                  {label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Read-only preview of a form field */
function FieldPreview({ field }: { field: FormField }) {
  switch (field.type) {
    case "textarea":
      return <div className="h-16 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-400">{field.placeholder || "Long text..."}</div>;
    case "select":
      return (
        <select className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400" disabled>
          <option>{field.placeholder || "Select..."}</option>
          {field.options?.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    case "radio":
      return (
        <div className="space-y-1">
          {(field.options || []).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-gray-600">
              <div className="h-4 w-4 rounded-full border-2 border-gray-300" /> {o}
            </label>
          ))}
        </div>
      );
    case "checkbox":
      return (
        <div className="space-y-1">
          {(field.options || []).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-gray-600">
              <div className="h-4 w-4 rounded border-2 border-gray-300" /> {o}
            </label>
          ))}
        </div>
      );
    case "tier_selection":
      return (
        <div className="grid grid-cols-5 gap-2">
          {SPONSOR_TIERS.map((t) => (
            <div key={t.name} className={cn("rounded-lg p-2 text-center text-xs font-semibold", t.color, t.textColor)}>
              <div>{t.name}</div>
              <div className="opacity-80 text-[10px] mt-0.5">{t.price}</div>
            </div>
          ))}
        </div>
      );
    case "file":
      return (
        <div className="rounded-md border-2 border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-400">
          {field.helpText || "Paste URL to file"}
        </div>
      );
    default:
      return <Input disabled placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`} className="bg-gray-50" />;
  }
}
