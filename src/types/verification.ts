export type VerificationStatus = "verified" | "pending" | "flagged" | "denied";
export type ClaimedStatus = "veteran" | "active_duty" | "reserve" | "guard" | "spouse";

export interface EvidenceSource {
  title: string;
  url: string;
  snippet: string;
  relevanceScore: number;
  category: "Military Service" | "Criminal Record" | "Social Media" | "News" | "Professional" | "Other";
  isRedFlag?: boolean;
}

export interface RedFlag {
  text: string;
  source?: string;
  severity?: "high" | "medium" | "low";
}

export interface VerificationRecord {
  id: string;
  person_name: string;
  claimed_branch: string | null;
  claimed_type: string | null;
  claimed_status: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  verification_score: number | null;
  status: VerificationStatus;
  pdl_data: Record<string, unknown> | null;
  serp_results: unknown[] | null;
  firecrawl_data: unknown[] | null;
  ai_analysis: string | null;
  evidence_sources: EvidenceSource[] | null;
  red_flags: RedFlag[] | null;
  notes: string | null;
  verified_by: string | null;
  source: string | null;
  source_username: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  manual_checks: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  last_verified_at: string | null;
}

export const BRANCHES = ["Army", "Navy", "Air Force", "Marines", "Coast Guard", "Space Force"] as const;
export const TYPE_OPTIONS = ["Veteran", "Active Duty", "Reserve", "National Guard", "Spouse", "Other"] as const;
export const CLAIMED_STATUS_OPTIONS: { value: ClaimedStatus; label: string }[] = [
  { value: "veteran", label: "Veteran" },
  { value: "active_duty", label: "Active Duty" },
  { value: "reserve", label: "Reserve" },
  { value: "guard", label: "Guard" },
  { value: "spouse", label: "Military Spouse" },
];
