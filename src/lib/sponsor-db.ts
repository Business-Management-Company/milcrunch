/**
 * Supabase helpers for sponsor management.
 * Uses raw .from() queries since these tables may not be in the generated types.
 */
import { supabase } from "@/integrations/supabase/client";
import type { SponsorForm, SponsorFormSubmission, SponsorPage, SponsorDeck, FormField } from "./sponsor-types";

// ── Forms ─────────────────────────────────────────────────────────
export async function getForms(): Promise<SponsorForm[]> {
  const { data, error } = await (supabase as any).from("sponsor_forms").select("*").order("created_at", { ascending: false });
  if (error) { console.error("getForms", error); return []; }
  return (data ?? []).map((r: any) => ({ ...r, fields: r.fields ?? [] }));
}

export async function getForm(id: string): Promise<SponsorForm | null> {
  const { data, error } = await (supabase as any).from("sponsor_forms").select("*").eq("id", id).single();
  if (error) { console.error("getForm", error); return null; }
  return data ? { ...data, fields: data.fields ?? [] } : null;
}

export async function upsertForm(form: { id?: string; title: string; description?: string; fields: FormField[]; is_active?: boolean }): Promise<SponsorForm | null> {
  const payload: any = { title: form.title, description: form.description ?? null, fields: form.fields, is_active: form.is_active ?? true, updated_at: new Date().toISOString() };
  if (form.id) payload.id = form.id;
  const { data, error } = await (supabase as any).from("sponsor_forms").upsert(payload).select("*").single();
  if (error) { console.error("upsertForm", error); return null; }
  return data ? { ...data, fields: data.fields ?? [] } : null;
}

export async function deleteForm(id: string): Promise<boolean> {
  const { error } = await (supabase as any).from("sponsor_forms").delete().eq("id", id);
  if (error) { console.error("deleteForm", error); return false; }
  return true;
}

// ── Submissions ───────────────────────────────────────────────────
export async function getSubmissions(formId?: string): Promise<SponsorFormSubmission[]> {
  let q = (supabase as any).from("sponsor_form_submissions").select("*").order("created_at", { ascending: false });
  if (formId) q = q.eq("form_id", formId);
  const { data, error } = await q;
  if (error) { console.error("getSubmissions", error); return []; }
  return data ?? [];
}

export async function createSubmission(formId: string, formData: Record<string, unknown>): Promise<boolean> {
  const { error } = await (supabase as any).from("sponsor_form_submissions").insert({ form_id: formId, data: formData, status: "pending" });
  if (error) { console.error("createSubmission", error); return false; }
  return true;
}

export async function updateSubmissionStatus(id: string, status: "pending" | "approved" | "rejected"): Promise<boolean> {
  const { error } = await (supabase as any).from("sponsor_form_submissions").update({ status }).eq("id", id);
  if (error) { console.error("updateSubmissionStatus", error); return false; }
  return true;
}

// ── Pages ─────────────────────────────────────────────────────────
export async function getSponsorPages(): Promise<SponsorPage[]> {
  const { data, error } = await (supabase as any).from("sponsor_pages").select("*").order("created_at", { ascending: false });
  if (error) { console.error("getSponsorPages", error); return []; }
  return data ?? [];
}

export async function getSponsorPage(idOrSlug: string): Promise<SponsorPage | null> {
  // try by id first, then by slug
  let { data, error } = await (supabase as any).from("sponsor_pages").select("*").eq("id", idOrSlug).single();
  if (error || !data) {
    ({ data, error } = await (supabase as any).from("sponsor_pages").select("*").eq("slug", idOrSlug).single());
  }
  if (error) { console.error("getSponsorPage", error); return null; }
  return data ?? null;
}

export async function upsertSponsorPage(page: Partial<SponsorPage> & { name: string; slug: string }): Promise<SponsorPage | null> {
  const { data, error } = await (supabase as any).from("sponsor_pages").upsert(page).select("*").single();
  if (error) { console.error("upsertSponsorPage", error); return null; }
  return data ?? null;
}

export async function deleteSponsorPage(id: string): Promise<boolean> {
  const { error } = await (supabase as any).from("sponsor_pages").delete().eq("id", id);
  if (error) { console.error("deleteSponsorPage", error); return false; }
  return true;
}

// ── Decks ─────────────────────────────────────────────────────────
export async function getSponsorDecks(): Promise<SponsorDeck[]> {
  const { data, error } = await (supabase as any).from("sponsor_decks").select("*").order("created_at", { ascending: false });
  if (error) { console.error("getSponsorDecks", error); return []; }
  return data ?? [];
}

export async function upsertSponsorDeck(deck: { id?: string; title: string; event_id?: string | null; file_url: string }): Promise<SponsorDeck | null> {
  const { data, error } = await (supabase as any).from("sponsor_decks").upsert(deck).select("*").single();
  if (error) { console.error("upsertSponsorDeck", error); return null; }
  return data ?? null;
}

export async function deleteSponsorDeck(id: string): Promise<boolean> {
  const { error } = await (supabase as any).from("sponsor_decks").delete().eq("id", id);
  if (error) { console.error("deleteSponsorDeck", error); return false; }
  return true;
}

// ── Stats ─────────────────────────────────────────────────────────
export async function getSponsorStats(): Promise<{ totalSponsors: number; activeForms: number; submissions: number; decks: number }> {
  const [pages, forms, subs, decks] = await Promise.all([
    (supabase as any).from("sponsor_pages").select("id", { count: "exact", head: true }),
    (supabase as any).from("sponsor_forms").select("id", { count: "exact", head: true }).eq("is_active", true),
    (supabase as any).from("sponsor_form_submissions").select("id", { count: "exact", head: true }),
    (supabase as any).from("sponsor_decks").select("id", { count: "exact", head: true }),
  ]);
  return {
    totalSponsors: pages.count ?? 0,
    activeForms: forms.count ?? 0,
    submissions: subs.count ?? 0,
    decks: decks.count ?? 0,
  };
}
