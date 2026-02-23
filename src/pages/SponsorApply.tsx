import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getForm, createSubmission } from "@/lib/sponsor-db";
import { SPONSOR_TIERS } from "@/lib/sponsor-types";
import type { SponsorForm, FormField } from "@/lib/sponsor-types";

export default function SponsorApply() {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<SponsorForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!formId) return;
    (async () => {
      const f = await getForm(formId);
      setForm(f);
      setLoading(false);
    })();
  }, [formId]);

  const setValue = (fieldId: string, label: string, value: any) => {
    setValues((prev) => ({ ...prev, [label]: value }));
    if (errors[fieldId]) setErrors((prev) => { const n = { ...prev }; delete n[fieldId]; return n; });
  };

  const toggleCheckbox = (label: string, option: string) => {
    setValues((prev) => {
      const current: string[] = prev[label] || [];
      const next = current.includes(option) ? current.filter((o: string) => o !== option) : [...current, option];
      return { ...prev, [label]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !formId) return;

    // Validate required fields
    const newErrors: Record<string, string> = {};
    for (const field of form.fields) {
      if (field.required) {
        const val = values[field.label];
        if (!val || (typeof val === "string" && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    const ok = await createSubmission(formId, values);
    setSubmitting(false);
    if (ok) setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Form Not Found</h2>
          <p className="text-gray-500 text-sm">This sponsor application form doesn't exist or has been removed.</p>
          <Link to="/" className="mt-4 inline-block text-[#1e3a5f] hover:underline text-sm">Go to homepage</Link>
        </Card>
      </div>
    );
  }

  if (!form.is_active) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Form Closed</h2>
          <p className="text-gray-500 text-sm">This sponsor application form is no longer accepting submissions.</p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-12 text-center max-w-lg">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600">Your sponsor application has been submitted successfully. We'll be in touch within 48 hours.</p>
          <Link to="/" className="mt-6 inline-block text-[#1e3a5f] hover:underline text-sm">Back to MilCrunch</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="font-bold text-2xl tracking-tight text-gray-900">
              MilCrunch<span className="text-[#3b82f6] font-extrabold">X</span>
            </span>
          </Link>
        </div>

        <Card className="bg-white shadow-sm border-gray-200">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#1e3a5f]/5 to-transparent rounded-t-lg">
            <h1 className="text-2xl font-bold text-gray-900">{form.title}</h1>
            {form.description && <p className="text-gray-500 text-sm mt-1">{form.description}</p>}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {form.fields.map((field) => (
              <div key={field.id}>
                <RenderField
                  field={field}
                  value={values[field.label]}
                  onChange={(val) => setValue(field.id, field.label, val)}
                  onToggleCheckbox={(opt) => toggleCheckbox(field.label, opt)}
                  error={errors[field.id]}
                />
              </div>
            ))}

            <Button type="submit" disabled={submitting} className="w-full bg-[#1e3a5f] hover:bg-[#2d5282] text-white py-3 text-base">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Application"}
            </Button>
          </form>

          <div className="p-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Powered by <span className="font-semibold">MilCrunch<span className="text-[#1e3a5f]">X</span></span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function RenderField({ field, value, onChange, onToggleCheckbox, error }: {
  field: FormField;
  value: any;
  onChange: (val: any) => void;
  onToggleCheckbox: (opt: string) => void;
  error?: string;
}) {
  const labelEl = (
    <Label className="block text-sm font-medium text-gray-700 mb-1">
      {field.label} {field.required && <span className="text-red-500">*</span>}
    </Label>
  );
  const helpEl = field.helpText ? <p className="text-xs text-gray-400 mt-1">{field.helpText}</p> : null;
  const errorEl = error ? <p className="text-xs text-red-500 mt-1">{error}</p> : null;

  switch (field.type) {
    case "textarea":
      return <div>{labelEl}<Textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={4} />{helpEl}{errorEl}</div>;
    case "select":
      return (
        <div>
          {labelEl}
          <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">{field.placeholder || "Select..."}</option>
            {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {helpEl}{errorEl}
        </div>
      );
    case "radio":
      return (
        <div>
          {labelEl}
          <div className="space-y-2 mt-1">
            {(field.options || []).map((o) => (
              <label key={o} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name={field.id} checked={value === o} onChange={() => onChange(o)} className="accent-[#1e3a5f]" />
                <span className="text-sm text-gray-700">{o}</span>
              </label>
            ))}
          </div>
          {helpEl}{errorEl}
        </div>
      );
    case "checkbox":
      return (
        <div>
          {labelEl}
          <div className="space-y-2 mt-1">
            {(field.options || []).map((o) => (
              <label key={o} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(value || []).includes(o)} onChange={() => onToggleCheckbox(o)} className="accent-[#1e3a5f] rounded" />
                <span className="text-sm text-gray-700">{o}</span>
              </label>
            ))}
          </div>
          {helpEl}{errorEl}
        </div>
      );
    case "tier_selection":
      return (
        <div>
          {labelEl}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-2">
            {SPONSOR_TIERS.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => onChange(t.name)}
                className={cn(
                  "rounded-lg p-3 text-center transition-all border-2",
                  value === t.name
                    ? `${t.color} ${t.textColor} border-transparent ring-2 ring-[#1e3a5f] ring-offset-2`
                    : "bg-white border-gray-200 hover:border-gray-300 text-gray-700"
                )}
              >
                <div className="font-bold text-sm">{t.name}</div>
                <div className={cn("text-xs mt-0.5", value === t.name ? "opacity-90" : "text-gray-500")}>{t.price}</div>
              </button>
            ))}
          </div>
          {helpEl}{errorEl}
        </div>
      );
    case "file":
      return (
        <div>
          {labelEl}
          <Input type="url" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.helpText || "Paste URL to file..."} />
          {errorEl}
        </div>
      );
    default:
      return (
        <div>
          {labelEl}
          <Input type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "url" ? "url" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
          {helpEl}{errorEl}
        </div>
      );
  }
}
