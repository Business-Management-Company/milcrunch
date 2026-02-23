/**
 * TypeScript types for the MilCrunch Mail module.
 */

export interface EmailList {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export type ContactSource = "manual" | "event" | "creator" | "import" | "sponsor" | "form";

export interface ContactActivity {
  type: "email_sent" | "email_opened" | "email_clicked" | "unsubscribed" | "subscribed" | "imported";
  campaign_id?: string;
  campaign_name?: string;
  timestamp: string;
  detail?: string;
}

export interface EmailContact {
  id: string;
  list_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  tags: string[];
  source: ContactSource;
  activity: ContactActivity[];
  status: "subscribed" | "unsubscribed" | "bounced";
  metadata: Record<string, unknown>;
  created_at: string;
}

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";

export interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string | null;
  preview_text: string | null;
  from_name: string;
  from_email: string;
  html_content: string | null;
  list_ids: string[];
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  stats: CampaignStats;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: string | null;
  html_content: string | null;
  thumbnail_color: string;
  is_default: boolean;
  created_at: string;
}

export interface FormFieldConfig {
  key: string;
  label: string;
  type: "text" | "email" | "select" | "checkbox";
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormStyles {
  bg_color: string;
  button_color: string;
  border_radius: number;
}

export interface EmailForm {
  id: string;
  name: string;
  list_id: string;
  fields: FormFieldConfig[];
  success_message: string;
  styles: FormStyles;
  submission_count: number;
  created_at: string;
}

export interface EmailSettings {
  id: string;
  user_id: string;
  from_name: string;
  from_email: string;
  custom_domain: string | null;
  domain_verified: boolean;
  dns_records: DnsRecord[];
  footer_text: string;
  created_at: string;
}

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  verified: boolean;
}

// ── Constants ──────────────────────────────────────────────────────

export const CAMPAIGN_STEPS = ["Setup", "Recipients", "Design", "Review & Send"] as const;

export const STATUS_COLORS: Record<CampaignStatus, { bg: string; text: string }> = {
  draft: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300" },
  scheduled: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300" },
  sending: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300" },
  sent: { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-700 dark:text-green-300" },
  failed: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300" },
};

export const CONTACT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  subscribed: { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-700 dark:text-green-300" },
  unsubscribed: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300" },
  bounced: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300" },
};

export const DEFAULT_FORM_STYLES: FormStyles = {
  bg_color: "#ffffff",
  button_color: "#1e3a5f",
  border_radius: 8,
};

export const DEFAULT_FORM_FIELDS: FormFieldConfig[] = [
  { key: "email", label: "Email", type: "email", required: true, placeholder: "you@example.com" },
  { key: "first_name", label: "First Name", type: "text", required: false, placeholder: "Jane" },
  { key: "last_name", label: "Last Name", type: "text", required: false, placeholder: "Smith" },
];

export function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
