import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { getEmailForm, addContact, incrementFormSubmissions } from "@/lib/email-db";
import type { EmailForm, FormFieldConfig } from "@/lib/email-types";

const EmailSubscribe = () => {
  const { slug } = useParams();
  const [form, setForm] = useState<EmailForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const f = await getEmailForm(slug);
      setForm(f);
      setLoading(false);
    })();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Validate required fields
    for (const field of form.fields) {
      if (field.required && !values[field.key]?.trim()) {
        setError(`${field.label} is required`);
        return;
      }
    }
    const email = values["email"];
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setSubmitting(true);
    setError("");

    const result = await addContact({
      list_id: form.list_id,
      email,
      first_name: values["first_name"] || undefined,
      last_name: values["last_name"] || undefined,
      metadata: values,
    });

    if (result) {
      await incrementFormSubmissions(form.id);
      setSuccess(true);
    } else {
      setError("Could not subscribe. You may already be on this list.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-semibold text-gray-900">Form not found</h1>
          <p className="text-gray-500 mt-1">This signup form doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const styles = form.styles || { bg_color: "#ffffff", button_color: "#6C5CE7", border_radius: 8 };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4 p-8 rounded-xl text-center" style={{ backgroundColor: styles.bg_color, borderRadius: `${styles.border_radius}px` }}>
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: styles.button_color }} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{form.success_message || "Thanks for subscribing!"}</h2>
          <p className="text-gray-500">You've been added to our list.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="max-w-md w-full p-8 shadow-lg" style={{ backgroundColor: styles.bg_color, borderRadius: `${styles.border_radius}px` }}>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{form.name}</h2>

        <div className="space-y-4">
          {form.fields.map((field: FormFieldConfig) => (
            <div key={field.key}>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === "checkbox" ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!values[field.key]} onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.checked ? "yes" : "" }))} className="rounded" />
                  <span className="text-sm text-gray-600">{field.placeholder || field.label}</span>
                </label>
              ) : (
                <Input
                  type={field.type === "email" ? "email" : "text"}
                  value={values[field.key] || ""}
                  onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder || ""}
                  required={field.required}
                  style={{ borderRadius: `${Math.min(styles.border_radius, 12)}px` }}
                />
              )}
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full mt-6 text-white" style={{ backgroundColor: styles.button_color, borderRadius: `${Math.min(styles.border_radius, 12)}px` }}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Subscribe
        </Button>

        <p className="text-xs text-gray-400 text-center mt-4">Powered by RecurrentX</p>
      </form>
    </div>
  );
};

export default EmailSubscribe;
