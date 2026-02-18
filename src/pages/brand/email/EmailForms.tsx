import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ArrowLeft, Loader2, Trash2, Copy, Code, ExternalLink, FormInput as FormInputIcon, GripVertical } from "lucide-react";
import { getEmailForms, upsertEmailForm, deleteEmailForm, getEmailLists } from "@/lib/email-db";
import { DEFAULT_FORM_FIELDS, DEFAULT_FORM_STYLES, generateSlug } from "@/lib/email-types";
import type { EmailForm, EmailList, FormFieldConfig, FormStyles } from "@/lib/email-types";

const EmailForms = () => {
  const [forms, setForms] = useState<EmailForm[]>([]);
  const [lists, setLists] = useState<EmailList[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Builder state
  const [isBuilding, setIsBuilding] = useState(false);
  const [editingForm, setEditingForm] = useState<EmailForm | null>(null);
  const [formName, setFormName] = useState("");
  const [formListId, setFormListId] = useState("");
  const [formFields, setFormFields] = useState<FormFieldConfig[]>(DEFAULT_FORM_FIELDS);
  const [formSuccessMsg, setFormSuccessMsg] = useState("Thanks for subscribing!");
  const [formStyles, setFormStyles] = useState<FormStyles>(DEFAULT_FORM_STYLES);
  const [saving, setSaving] = useState(false);

  // Embed dialog
  const [embedForm, setEmbedForm] = useState<EmailForm | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [f, l] = await Promise.all([getEmailForms(), getEmailLists()]);
      setForms(f);
      setLists(l);
      setLoading(false);
    })();
  }, []);

  const openBuilder = (form?: EmailForm) => {
    if (form) {
      setEditingForm(form);
      setFormName(form.name);
      setFormListId(form.list_id);
      setFormFields(form.fields?.length ? form.fields : DEFAULT_FORM_FIELDS);
      setFormSuccessMsg(form.success_message || "Thanks for subscribing!");
      setFormStyles(form.styles || DEFAULT_FORM_STYLES);
    } else {
      setEditingForm(null);
      setFormName("");
      setFormListId(lists[0]?.id || "");
      setFormFields(DEFAULT_FORM_FIELDS);
      setFormSuccessMsg("Thanks for subscribing!");
      setFormStyles(DEFAULT_FORM_STYLES);
    }
    setIsBuilding(true);
  };

  const closeBuilder = () => {
    setIsBuilding(false);
    setEditingForm(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Form name is required"); return; }
    if (!formListId) { toast.error("Select a list"); return; }
    setSaving(true);
    const result = await upsertEmailForm({
      id: editingForm?.id,
      name: formName.trim(),
      list_id: formListId,
      fields: formFields,
      success_message: formSuccessMsg,
      styles: formStyles,
    });
    if (result) {
      if (editingForm) {
        setForms(prev => prev.map(f => f.id === result.id ? result : f));
      } else {
        setForms(prev => [result, ...prev]);
      }
      toast.success("Form saved");
      closeBuilder();
    } else {
      toast.error("Failed to save form");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (await deleteEmailForm(deleteId)) {
      setForms(prev => prev.filter(f => f.id !== deleteId));
      toast.success("Form deleted");
    } else {
      toast.error("Failed to delete form");
    }
    setDeleteId(null);
  };

  const addField = () => {
    setFormFields(prev => [...prev, {
      key: `field_${Date.now()}`,
      label: "New Field",
      type: "text",
      required: false,
      placeholder: "",
    }]);
  };

  const updateField = (idx: number, updates: Partial<FormFieldConfig>) => {
    setFormFields(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f));
  };

  const removeField = (idx: number) => {
    if (formFields[idx].key === "email") return; // Can't remove email
    setFormFields(prev => prev.filter((_, i) => i !== idx));
  };

  const getEmbedCode = (form: EmailForm) => {
    const url = `${window.location.origin}/subscribe/${form.id}`;
    return `<iframe src="${url}" width="100%" height="450" frameborder="0" style="border:none;border-radius:${form.styles?.border_radius || 8}px;max-width:480px;"></iframe>`;
  };

  const getDirectUrl = (form: EmailForm) => `${window.location.origin}/subscribe/${form.id}`;

  // ── Builder View ────────────────────────────────────────────────
  if (isBuilding) {
    return (
      <>
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={closeBuilder} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Forms
          </Button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-pd-navy dark:text-white">{editingForm ? "Edit Form" : "New Form"}</h1>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Form
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Config Panel */}
          <div className="space-y-6">
            <Card className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Form Name *</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Newsletter Signup" />
              </div>
              <div className="space-y-2">
                <Label>Target List *</Label>
                <Select value={formListId} onValueChange={setFormListId}>
                  <SelectTrigger><SelectValue placeholder="Select a list..." /></SelectTrigger>
                  <SelectContent>
                    {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Success Message</Label>
                <Input value={formSuccessMsg} onChange={e => setFormSuccessMsg(e.target.value)} />
              </div>
            </Card>

            {/* Fields */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Form Fields</Label>
                <Button variant="outline" size="sm" onClick={addField}><Plus className="h-3 w-3 mr-1" /> Add Field</Button>
              </div>
              {formFields.map((f, i) => (
                <div key={f.key} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input value={f.label} onChange={e => updateField(i, { label: e.target.value })} className="flex-1" />
                  <Select value={f.type} onValueChange={v => updateField(i, { type: v as any })}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                      <SelectItem value="checkbox">Check</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Switch checked={f.required} onCheckedChange={v => updateField(i, { required: v })} disabled={f.key === "email"} />
                    <span className="text-xs text-muted-foreground w-6">Req</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeField(i)} disabled={f.key === "email"}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </Card>

            {/* Styles */}
            <Card className="p-5 space-y-4">
              <Label className="text-base font-semibold">Style</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Background</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={formStyles.bg_color} onChange={e => setFormStyles(prev => ({ ...prev, bg_color: e.target.value }))} className="h-8 w-8 rounded cursor-pointer" />
                    <Input value={formStyles.bg_color} onChange={e => setFormStyles(prev => ({ ...prev, bg_color: e.target.value }))} className="font-mono text-xs" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Button Color</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={formStyles.button_color} onChange={e => setFormStyles(prev => ({ ...prev, button_color: e.target.value }))} className="h-8 w-8 rounded cursor-pointer" />
                    <Input value={formStyles.button_color} onChange={e => setFormStyles(prev => ({ ...prev, button_color: e.target.value }))} className="font-mono text-xs" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Border Radius</Label>
                  <Input type="number" value={formStyles.border_radius} onChange={e => setFormStyles(prev => ({ ...prev, border_radius: parseInt(e.target.value) || 0 }))} min={0} max={24} />
                </div>
              </div>
            </Card>
          </div>

          {/* Live Preview */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Preview</Label>
            <div className="border rounded-lg p-6" style={{ backgroundColor: formStyles.bg_color, borderRadius: `${formStyles.border_radius}px` }}>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{formName || "Subscribe"}</h3>
              <div className="space-y-3">
                {formFields.map(f => (
                  <div key={f.key}>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </label>
                    {f.type === "checkbox" ? (
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" disabled />
                        <span className="text-sm text-gray-600">{f.placeholder || f.label}</span>
                      </div>
                    ) : (
                      <input type={f.type} placeholder={f.placeholder || f.label} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" disabled style={{ borderRadius: `${Math.min(formStyles.border_radius, 12)}px` }} />
                    )}
                  </div>
                ))}
                <button className="w-full py-2.5 px-4 text-white font-semibold rounded-md text-sm" style={{ backgroundColor: formStyles.button_color, borderRadius: `${Math.min(formStyles.border_radius, 12)}px` }} disabled>
                  Subscribe
                </button>
              </div>
            </div>
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
            <AlertDialogTitle>Delete this form?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Embed Code Dialog */}
      <Dialog open={!!embedForm} onOpenChange={() => setEmbedForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Embed & Share</DialogTitle></DialogHeader>
          {embedForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Direct URL</Label>
                <div className="flex gap-2">
                  <Input value={getDirectUrl(embedForm)} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(getDirectUrl(embedForm)); toast.success("URL copied"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Embed Code</Label>
                <div className="flex gap-2">
                  <Input value={getEmbedCode(embedForm)} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(getEmbedCode(embedForm)); toast.success("Embed code copied"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmbedForm(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">Email Forms</h1>
          <p className="text-gray-500 dark:text-gray-400">Create embeddable signup forms to grow your subscriber lists.</p>
        </div>
        <Button onClick={() => openBuilder()}>
          <Plus className="h-4 w-4 mr-2" /> New Form
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : forms.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
          <FormInputIcon className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No forms yet</p>
          <p className="text-sm mt-1">Create a signup form to embed on your website or share as a link.</p>
          <Button className="mt-4" onClick={() => openBuilder()}>
            <Plus className="h-4 w-4 mr-2" /> Create Form
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map(form => {
            const listName = lists.find(l => l.id === form.list_id)?.name || "Unknown list";
            return (
              <Card key={form.id} className="p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">{form.name}</h3>
                    <p className="text-sm text-muted-foreground">{listName}</p>
                  </div>
                  <Badge variant="secondary">{form.submission_count} submissions</Badge>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => openBuilder(form)}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => setEmbedForm(form)}>
                    <Code className="h-3.5 w-3.5 mr-1" /> Embed
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open(getDirectUrl(form), "_blank")}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                  </Button>
                  <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => setDeleteId(form.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
};

export default EmailForms;
