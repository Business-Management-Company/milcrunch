/**
 * Supabase helpers for MilCrunch Mail.
 * Uses raw .from() queries since these tables may not be in the generated types.
 *
 * SQL to create tables (run in Supabase Dashboard → SQL Editor):
 *
 * CREATE TABLE email_lists (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name text NOT NULL,
 *   description text,
 *   created_at timestamptz DEFAULT now()
 * );
 * ALTER TABLE email_lists ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow authenticated full access" ON email_lists FOR ALL USING (auth.uid() IS NOT NULL);
 *
 * CREATE TABLE email_contacts (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   list_id uuid REFERENCES email_lists(id) ON DELETE CASCADE,
 *   email text NOT NULL,
 *   first_name text,
 *   last_name text,
 *   status text DEFAULT 'subscribed',
 *   metadata jsonb DEFAULT '{}',
 *   created_at timestamptz DEFAULT now(),
 *   UNIQUE(list_id, email)
 * );
 * ALTER TABLE email_contacts ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow authenticated full access" ON email_contacts FOR ALL USING (auth.uid() IS NOT NULL);
 *
 * CREATE TABLE email_campaigns (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name text NOT NULL,
 *   subject text,
 *   preview_text text,
 *   from_name text DEFAULT 'MilCrunch',
 *   from_email text DEFAULT 'noreply@milcrunch.com',
 *   html_content text,
 *   list_ids jsonb DEFAULT '[]',
 *   status text DEFAULT 'draft',
 *   scheduled_at timestamptz,
 *   sent_at timestamptz,
 *   stats jsonb DEFAULT '{"sent":0,"delivered":0,"opened":0,"clicked":0,"unsubscribed":0}',
 *   created_at timestamptz DEFAULT now()
 * );
 * ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow authenticated full access" ON email_campaigns FOR ALL USING (auth.uid() IS NOT NULL);
 *
 * CREATE TABLE email_templates (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name text NOT NULL,
 *   category text,
 *   html_content text,
 *   thumbnail_color text DEFAULT '#1e3a5f',
 *   is_default boolean DEFAULT false,
 *   created_at timestamptz DEFAULT now()
 * );
 * ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow authenticated full access" ON email_templates FOR ALL USING (auth.uid() IS NOT NULL);
 *
 * CREATE TABLE email_forms (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name text NOT NULL,
 *   list_id uuid REFERENCES email_lists(id),
 *   fields jsonb DEFAULT '[]',
 *   success_message text DEFAULT 'Thanks for subscribing!',
 *   styles jsonb DEFAULT '{}',
 *   submission_count integer DEFAULT 0,
 *   created_at timestamptz DEFAULT now()
 * );
 * ALTER TABLE email_forms ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow authenticated full access" ON email_forms FOR ALL USING (auth.uid() IS NOT NULL);
 *
 * CREATE TABLE email_settings (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id uuid NOT NULL UNIQUE,
 *   from_name text DEFAULT 'MilCrunch',
 *   from_email text DEFAULT 'noreply@milcrunch.com',
 *   custom_domain text,
 *   domain_verified boolean DEFAULT false,
 *   dns_records jsonb DEFAULT '[]',
 *   footer_text text DEFAULT 'You received this email because you subscribed at milcrunch.com',
 *   created_at timestamptz DEFAULT now()
 * );
 * ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow authenticated full access" ON email_settings FOR ALL USING (auth.uid() IS NOT NULL);
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  EmailList, EmailContact, EmailCampaign, EmailTemplate,
  EmailForm, EmailSettings, CampaignStats, ContactSource, ContactActivity,
} from "./email-types";

const sb = supabase as any;

// ── Lists ──────────────────────────────────────────────────────────

export async function getEmailLists(): Promise<EmailList[]> {
  const { data, error } = await sb.from("email_lists").select("*").order("created_at", { ascending: false });
  if (error) { console.error("getEmailLists", error); return []; }
  return data ?? [];
}

export async function getEmailList(id: string): Promise<EmailList | null> {
  const { data, error } = await sb.from("email_lists").select("*").eq("id", id).single();
  if (error) { console.error("getEmailList", error); return null; }
  return data ?? null;
}

export async function upsertEmailList(list: { id?: string; name: string; description?: string | null }): Promise<EmailList | null> {
  // Verify authentication before insert
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("upsertEmailList: not authenticated");
    return null;
  }

  const payload: any = { name: list.name, description: list.description ?? null };
  if (list.id) payload.id = list.id;

  const { data, error } = await sb.from("email_lists").upsert(payload).select("*").single();
  if (error) {
    console.error("upsertEmailList error:", error.code, error.message, error.details, error.hint);
    return null;
  }
  return data ?? null;
}

export async function deleteEmailList(id: string): Promise<boolean> {
  const { error } = await sb.from("email_lists").delete().eq("id", id);
  if (error) { console.error("deleteEmailList", error); return false; }
  return true;
}

// ── Contacts ───────────────────────────────────────────────────────

export async function getContacts(listId: string): Promise<EmailContact[]> {
  const { data, error } = await sb.from("email_contacts").select("*").eq("list_id", listId).order("created_at", { ascending: false });
  if (error) { console.error("getContacts", error); return []; }
  return data ?? [];
}

export async function getContactCount(listId: string): Promise<number> {
  const { count, error } = await sb.from("email_contacts").select("id", { count: "exact", head: true }).eq("list_id", listId).eq("status", "subscribed");
  if (error) { console.error("getContactCount", error); return 0; }
  return count ?? 0;
}

export async function getSubscribedContacts(listId: string): Promise<EmailContact[]> {
  const { data, error } = await sb.from("email_contacts").select("*").eq("list_id", listId).eq("status", "subscribed");
  if (error) { console.error("getSubscribedContacts", error); return []; }
  return data ?? [];
}

export async function addContact(contact: { list_id: string; email: string; first_name?: string; last_name?: string; metadata?: Record<string, unknown> }): Promise<EmailContact | null> {
  const { data, error } = await sb.from("email_contacts").insert({
    list_id: contact.list_id,
    email: contact.email.toLowerCase().trim(),
    first_name: contact.first_name ?? null,
    last_name: contact.last_name ?? null,
    metadata: contact.metadata ?? {},
  }).select("*").single();
  if (error) { console.error("addContact", error); return null; }
  return data ?? null;
}

export async function addContactsBulk(listId: string, contacts: Array<{ email: string; first_name?: string; last_name?: string }>): Promise<{ inserted: number; duplicates: number }> {
  const rows = contacts.map(c => ({
    list_id: listId,
    email: c.email.toLowerCase().trim(),
    first_name: c.first_name ?? null,
    last_name: c.last_name ?? null,
    metadata: {},
  }));
  const { data, error } = await sb.from("email_contacts").upsert(rows, { onConflict: "list_id,email", ignoreDuplicates: true }).select("id");
  if (error) { console.error("addContactsBulk", error); return { inserted: 0, duplicates: contacts.length }; }
  const inserted = data?.length ?? 0;
  return { inserted, duplicates: contacts.length - inserted };
}

export async function updateContact(id: string, updates: Partial<EmailContact>): Promise<boolean> {
  const { error } = await sb.from("email_contacts").update(updates).eq("id", id);
  if (error) { console.error("updateContact", error); return false; }
  return true;
}

export async function deleteContact(id: string): Promise<boolean> {
  const { error } = await sb.from("email_contacts").delete().eq("id", id);
  if (error) { console.error("deleteContact", error); return false; }
  return true;
}

export async function unsubscribeContact(id: string): Promise<boolean> {
  return updateContact(id, { status: "unsubscribed" } as any);
}

export async function unsubscribeByEmail(email: string, listId: string): Promise<boolean> {
  const { error } = await sb.from("email_contacts").update({ status: "unsubscribed" }).eq("email", email.toLowerCase().trim()).eq("list_id", listId);
  if (error) { console.error("unsubscribeByEmail", error); return false; }
  return true;
}

// ── Global Contacts (cross-list) ──────────────────────────────────

function mapContact(row: any): EmailContact {
  return {
    ...row,
    tags: row.tags ?? [],
    source: row.source ?? "manual",
    activity: row.activity ?? [],
    phone: row.phone ?? null,
    company: row.company ?? null,
    title: row.title ?? null,
  };
}

export async function getAllContacts(): Promise<EmailContact[]> {
  const { data, error } = await sb.from("email_contacts").select("*").order("created_at", { ascending: false });
  if (error) { console.error("getAllContacts", error); return []; }
  return (data ?? []).map(mapContact);
}

export async function getContactById(id: string): Promise<EmailContact | null> {
  const { data, error } = await sb.from("email_contacts").select("*").eq("id", id).single();
  if (error) { console.error("getContactById", error); return null; }
  return data ? mapContact(data) : null;
}

export async function getContactStats(): Promise<{ total: number; subscribed: number; unsubscribed: number; bounced: number }> {
  const { count: total } = await sb.from("email_contacts").select("id", { count: "exact", head: true });
  const { count: subscribed } = await sb.from("email_contacts").select("id", { count: "exact", head: true }).eq("status", "subscribed");
  const { count: unsubscribed } = await sb.from("email_contacts").select("id", { count: "exact", head: true }).eq("status", "unsubscribed");
  const { count: bounced } = await sb.from("email_contacts").select("id", { count: "exact", head: true }).eq("status", "bounced");
  return { total: total ?? 0, subscribed: subscribed ?? 0, unsubscribed: unsubscribed ?? 0, bounced: bounced ?? 0 };
}

export async function addFullContact(contact: {
  list_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
  title?: string;
  tags?: string[];
  source?: ContactSource;
  metadata?: Record<string, unknown>;
}): Promise<EmailContact | null> {
  const payload: any = {
    list_id: contact.list_id,
    email: contact.email.toLowerCase().trim(),
    first_name: contact.first_name ?? null,
    last_name: contact.last_name ?? null,
    phone: contact.phone ?? null,
    company: contact.company ?? null,
    title: contact.title ?? null,
    tags: contact.tags ?? [],
    source: contact.source ?? "manual",
    metadata: contact.metadata ?? {},
  };
  const { data, error } = await sb.from("email_contacts").insert(payload).select("*").single();
  if (error) { console.error("addFullContact", error.code, error.message, error.details); return null; }
  return data ? mapContact(data) : null;
}

export async function updateFullContact(id: string, updates: Partial<{
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  title: string | null;
  tags: string[];
  status: string;
}>): Promise<boolean> {
  const payload: any = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) payload[k] = k === "email" && typeof v === "string" ? v.toLowerCase().trim() : v;
  }
  const { error } = await sb.from("email_contacts").update(payload).eq("id", id);
  if (error) { console.error("updateFullContact", error); return false; }
  return true;
}

export async function getContactListMemberships(email: string): Promise<Array<{ list_id: string; list_name: string; status: string }>> {
  const { data, error } = await sb.from("email_contacts").select("list_id, status").eq("email", email.toLowerCase().trim());
  if (error) { console.error("getContactListMemberships", error); return []; }
  const lists = await getEmailLists();
  return (data ?? []).map((row: any) => ({
    list_id: row.list_id,
    list_name: lists.find(l => l.id === row.list_id)?.name ?? "Unknown",
    status: row.status,
  }));
}

export async function syncBulkContacts(
  listId: string,
  contacts: Array<{ email: string; first_name?: string; last_name?: string; phone?: string; company?: string; title?: string; source?: ContactSource; metadata?: Record<string, unknown> }>,
): Promise<{ inserted: number; duplicates: number }> {
  const rows = contacts.map(c => ({
    list_id: listId,
    email: c.email.toLowerCase().trim(),
    first_name: c.first_name ?? null,
    last_name: c.last_name ?? null,
    phone: c.phone ?? null,
    company: c.company ?? null,
    title: c.title ?? null,
    source: c.source ?? "import",
    tags: [],
    metadata: c.metadata ?? {},
  }));
  const { data, error } = await sb.from("email_contacts").upsert(rows, { onConflict: "list_id,email", ignoreDuplicates: true }).select("id");
  if (error) { console.error("syncBulkContacts", error); return { inserted: 0, duplicates: contacts.length }; }
  const inserted = data?.length ?? 0;
  return { inserted, duplicates: contacts.length - inserted };
}

// ── Campaigns ──────────────────────────────────────────────────────

const DEFAULT_STATS: CampaignStats = { sent: 0, delivered: 0, opened: 0, clicked: 0, unsubscribed: 0 };

export async function getEmailCampaigns(): Promise<EmailCampaign[]> {
  const { data, error } = await sb.from("email_campaigns").select("*").order("created_at", { ascending: false });
  if (error) { console.error("getEmailCampaigns", error); return []; }
  return (data ?? []).map((r: any) => ({ ...r, list_ids: r.list_ids ?? [], stats: { ...DEFAULT_STATS, ...(r.stats || {}) } }));
}

export async function getEmailCampaign(id: string): Promise<EmailCampaign | null> {
  const { data, error } = await sb.from("email_campaigns").select("*").eq("id", id).single();
  if (error) { console.error("getEmailCampaign", error); return null; }
  if (!data) return null;
  return { ...data, list_ids: data.list_ids ?? [], stats: { ...DEFAULT_STATS, ...(data.stats || {}) } };
}

export async function upsertEmailCampaign(campaign: { id?: string; name: string; subject?: string | null; preview_text?: string | null; from_name?: string; from_email?: string; html_content?: string | null; list_ids?: string[]; status?: string; scheduled_at?: string | null; sent_at?: string | null; stats?: CampaignStats }): Promise<EmailCampaign | null> {
  const payload: any = { name: campaign.name };
  if (campaign.subject !== undefined) payload.subject = campaign.subject;
  if (campaign.preview_text !== undefined) payload.preview_text = campaign.preview_text;
  if (campaign.from_name !== undefined) payload.from_name = campaign.from_name;
  if (campaign.from_email !== undefined) payload.from_email = campaign.from_email;
  if (campaign.html_content !== undefined) payload.html_content = campaign.html_content;
  if (campaign.list_ids !== undefined) payload.list_ids = campaign.list_ids;
  if (campaign.status !== undefined) payload.status = campaign.status;
  if (campaign.scheduled_at !== undefined) payload.scheduled_at = campaign.scheduled_at;
  if (campaign.sent_at !== undefined) payload.sent_at = campaign.sent_at;
  if (campaign.stats !== undefined) payload.stats = campaign.stats;
  if (campaign.id) payload.id = campaign.id;
  const { data, error } = await sb.from("email_campaigns").upsert(payload).select("*").single();
  if (error) { console.error("upsertEmailCampaign", error); return null; }
  return data ? { ...data, list_ids: data.list_ids ?? [], stats: { ...DEFAULT_STATS, ...(data.stats || {}) } } : null;
}

export async function deleteEmailCampaign(id: string): Promise<boolean> {
  const { error } = await sb.from("email_campaigns").delete().eq("id", id);
  if (error) { console.error("deleteEmailCampaign", error); return false; }
  return true;
}

// ── Templates ──────────────────────────────────────────────────────

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await sb.from("email_templates").select("*").order("created_at", { ascending: false });
  if (error) { console.error("getEmailTemplates", error); return []; }
  return data ?? [];
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate | null> {
  const { data, error } = await sb.from("email_templates").select("*").eq("id", id).single();
  if (error) { console.error("getEmailTemplate", error); return null; }
  return data ?? null;
}

export async function upsertEmailTemplate(template: { id?: string; name: string; category?: string | null; html_content?: string | null; thumbnail_color?: string; is_default?: boolean }): Promise<EmailTemplate | null> {
  const payload: any = { name: template.name };
  if (template.category !== undefined) payload.category = template.category;
  if (template.html_content !== undefined) payload.html_content = template.html_content;
  if (template.thumbnail_color !== undefined) payload.thumbnail_color = template.thumbnail_color;
  if (template.is_default !== undefined) payload.is_default = template.is_default;
  if (template.id) payload.id = template.id;
  const { data, error } = await sb.from("email_templates").upsert(payload).select("*").single();
  if (error) { console.error("upsertEmailTemplate", error); return null; }
  return data ?? null;
}

export async function deleteEmailTemplate(id: string): Promise<boolean> {
  const { error } = await sb.from("email_templates").delete().eq("id", id);
  if (error) { console.error("deleteEmailTemplate", error); return false; }
  return true;
}

// ── Forms ──────────────────────────────────────────────────────────

export async function getEmailForms(): Promise<EmailForm[]> {
  const { data, error } = await sb.from("email_forms").select("*").order("created_at", { ascending: false });
  if (error) { console.error("getEmailForms", error); return []; }
  return (data ?? []).map((r: any) => ({ ...r, fields: r.fields ?? [], styles: r.styles ?? {} }));
}

export async function getEmailForm(idOrSlug: string): Promise<EmailForm | null> {
  let { data, error } = await sb.from("email_forms").select("*").eq("id", idOrSlug).single();
  if (error || !data) {
    ({ data, error } = await sb.from("email_forms").select("*").eq("name", idOrSlug).single());
  }
  if (error) { console.error("getEmailForm", error); return null; }
  return data ? { ...data, fields: data.fields ?? [], styles: data.styles ?? {} } : null;
}

export async function upsertEmailForm(form: { id?: string; name: string; list_id: string; fields?: any[]; success_message?: string; styles?: any; submission_count?: number }): Promise<EmailForm | null> {
  const payload: any = { name: form.name, list_id: form.list_id };
  if (form.fields !== undefined) payload.fields = form.fields;
  if (form.success_message !== undefined) payload.success_message = form.success_message;
  if (form.styles !== undefined) payload.styles = form.styles;
  if (form.submission_count !== undefined) payload.submission_count = form.submission_count;
  if (form.id) payload.id = form.id;
  const { data, error } = await sb.from("email_forms").upsert(payload).select("*").single();
  if (error) { console.error("upsertEmailForm", error); return null; }
  return data ? { ...data, fields: data.fields ?? [], styles: data.styles ?? {} } : null;
}

export async function deleteEmailForm(id: string): Promise<boolean> {
  const { error } = await sb.from("email_forms").delete().eq("id", id);
  if (error) { console.error("deleteEmailForm", error); return false; }
  return true;
}

export async function incrementFormSubmissions(id: string): Promise<boolean> {
  const { error } = await sb.rpc("increment_form_submissions", { form_id: id }).single();
  // Fallback: if the RPC doesn't exist, do a manual update
  if (error) {
    const form = await getEmailForm(id);
    if (!form) return false;
    const { error: e2 } = await sb.from("email_forms").update({ submission_count: (form.submission_count ?? 0) + 1 }).eq("id", id);
    if (e2) { console.error("incrementFormSubmissions", e2); return false; }
  }
  return true;
}

// ── Settings ───────────────────────────────────────────────────────

export async function getEmailSettings(userId: string): Promise<EmailSettings | null> {
  const { data, error } = await sb.from("email_settings").select("*").eq("user_id", userId).single();
  if (error) { console.error("getEmailSettings", error); return null; }
  return data ? { ...data, dns_records: data.dns_records ?? [] } : null;
}

export async function upsertEmailSettings(settings: { id?: string; user_id: string; from_name?: string; from_email?: string; custom_domain?: string | null; domain_verified?: boolean; dns_records?: any[]; footer_text?: string }): Promise<EmailSettings | null> {
  const payload: any = { user_id: settings.user_id };
  if (settings.from_name !== undefined) payload.from_name = settings.from_name;
  if (settings.from_email !== undefined) payload.from_email = settings.from_email;
  if (settings.custom_domain !== undefined) payload.custom_domain = settings.custom_domain;
  if (settings.domain_verified !== undefined) payload.domain_verified = settings.domain_verified;
  if (settings.dns_records !== undefined) payload.dns_records = settings.dns_records;
  if (settings.footer_text !== undefined) payload.footer_text = settings.footer_text;
  if (settings.id) payload.id = settings.id;
  const { data, error } = await sb.from("email_settings").upsert(payload, { onConflict: "user_id" }).select("*").single();
  if (error) { console.error("upsertEmailSettings", error); return null; }
  return data ? { ...data, dns_records: data.dns_records ?? [] } : null;
}

// ── Send email via Resend proxy ────────────────────────────────────

export async function sendEmail(params: { to: string | string[]; from: string; subject: string; html: string; reply_to?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = import.meta.env.VITE_RESEND_API_KEY;
    const resp = await fetch("/api/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: Array.isArray(params.to) ? params.to : [params.to],
        from: params.from,
        subject: params.subject,
        html: params.html,
        reply_to: params.reply_to,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      return { success: false, error: body };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
