/**
 * Shared types for the Sponsor Management feature.
 * Tables: sponsor_forms, sponsor_form_submissions, sponsor_pages, sponsor_decks
 */

export interface FormField {
  id: string;
  type: "text" | "textarea" | "email" | "phone" | "url" | "select" | "radio" | "checkbox" | "file" | "number" | "date" | "tier_selection";
  label: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
}

export interface SponsorForm {
  id: string;
  title: string;
  description: string | null;
  fields: FormField[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SponsorFormSubmission {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface SponsorPage {
  id: string;
  name: string;
  slug: string;
  event_id: string | null;
  tier: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  website_url: string | null;
  contact_email: string | null;
  social_instagram: string | null;
  social_twitter: string | null;
  social_linkedin: string | null;
  social_youtube: string | null;
  content_blocks: string | null;
  published: boolean;
  created_at: string;
}

export interface SponsorDeck {
  id: string;
  title: string;
  event_id: string | null;
  file_url: string;
  created_at: string;
}

export const SPONSOR_TIERS = [
  { name: "Presenting", price: "$50,000", color: "bg-purple-600", textColor: "text-white" },
  { name: "Diamond", price: "$25,000", color: "bg-blue-600", textColor: "text-white" },
  { name: "Platinum", price: "$15,000", color: "bg-gray-700", textColor: "text-white" },
  { name: "Gold", price: "$10,000", color: "bg-yellow-500", textColor: "text-black" },
  { name: "Silver", price: "$5,000", color: "bg-gray-400", textColor: "text-white" },
] as const;

export const DEFAULT_FORM_FIELDS: FormField[] = [
  { id: "f1", type: "text", label: "Company Name", required: true, placeholder: "Enter your company name" },
  { id: "f2", type: "text", label: "Contact Name", required: true, placeholder: "Full name" },
  { id: "f3", type: "email", label: "Email", required: true, placeholder: "email@company.com" },
  { id: "f4", type: "phone", label: "Phone", required: false, placeholder: "(555) 123-4567" },
  { id: "f5", type: "url", label: "Company Website", required: false, placeholder: "https://yourcompany.com" },
  { id: "f6", type: "tier_selection", label: "Sponsorship Tier", required: true },
  { id: "f7", type: "textarea", label: "Company Description", required: false, placeholder: "Tell us about your company..." },
  { id: "f8", type: "file", label: "Logo Upload", required: false, helpText: "Paste a URL to your company logo" },
  { id: "f9", type: "checkbox", label: "What goals do you want to achieve?", required: false, options: ["Brand Awareness", "Lead Generation", "Recruitment", "Community Engagement", "Product Launch"] },
  { id: "f10", type: "textarea", label: "Additional Notes", required: false, placeholder: "Anything else we should know?" },
];

export function generateId(): string {
  return `f${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
