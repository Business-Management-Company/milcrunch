import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { enrichPersonPDL, type PDLResponse } from "@/lib/verification";

const LOG = "[OAuthEnrich]";

const MILITARY_EMPLOYERS = [
  "united states army", "us army", "army", "u.s. army",
  "us navy", "u.s. navy", "navy",
  "usmc", "marine corps", "u.s. marine", "marines",
  "us air force", "u.s. air force", "air force",
  "us coast guard", "coast guard",
  "space force", "department of defense", "dod",
  "veterans affairs", "veterans administration",
  "national guard",
];

const BRANCH_MAP: Record<string, string> = {
  army: "Army", "us army": "Army", "u.s. army": "Army", "united states army": "Army",
  "national guard": "Army",
  navy: "Navy", "us navy": "Navy", "u.s. navy": "Navy",
  "marine corps": "Marines", marines: "Marines", usmc: "Marines", "u.s. marine": "Marines",
  "air force": "Air Force", "us air force": "Air Force", "u.s. air force": "Air Force",
  "coast guard": "Coast Guard", "us coast guard": "Coast Guard",
  "space force": "Space Force",
};

/** Detect military branch from PDL employment data. */
function detectBranchFromEmployment(employment: { title?: string; organization?: string }[]): string | null {
  for (const job of employment) {
    const org = (job.organization ?? "").toLowerCase();
    const title = (job.title ?? "").toLowerCase();
    const text = `${org} ${title}`;
    for (const keyword of MILITARY_EMPLOYERS) {
      if (text.includes(keyword)) {
        return BRANCH_MAP[keyword] ?? null;
      }
    }
  }
  return null;
}

/** Extract LinkedIn profile URL from Supabase user identities. */
function extractLinkedInUrl(user: User): string | null {
  const identity = user.identities?.find((i) => i.provider === "linkedin_oidc");
  if (!identity) return null;

  // LinkedIn OIDC returns a `sub` which is the member ID
  const sub = identity.identity_data?.sub as string | undefined;
  if (sub) return `https://www.linkedin.com/in/${sub}`;

  return null;
}

/**
 * Enrich a user's profile via PDL on their first OAuth login.
 * Fire-and-forget: never throws — logs errors and returns silently.
 */
export async function enrichOAuthUser(user: User): Promise<void> {
  try {
    const email = user.email;
    const fullName = (user.user_metadata?.full_name as string)
      ?? (user.user_metadata?.name as string)
      ?? "";
    const avatarUrl = (user.user_metadata?.avatar_url as string)
      ?? (user.user_metadata?.picture as string)
      ?? null;

    if (!email) {
      console.warn(LOG, "No email on user, skipping enrichment");
      return;
    }

    console.log(LOG, "Starting enrichment for", email);

    // Check if already enriched (by user_id or email handle)
    const { data: existing } = await supabase
      .from("directory_members")
      .select("id")
      .or(`user_id.eq.${user.id},creator_handle.eq.${email}`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log(LOG, "Already enriched, skipping:", email);
      return;
    }

    // Get the LinkedIn URL if available
    const linkedinUrl = extractLinkedInUrl(user);
    const provider = user.app_metadata?.provider ?? "google";

    console.log(LOG, "Calling PDL for:", { fullName, email, linkedinUrl, provider });

    // Call PDL enrichment (reuses existing proxy + function)
    const pdlData = await enrichPersonPDL({
      name: fullName || undefined,
      email,
      profile: linkedinUrl ? [linkedinUrl] : undefined,
    });

    // Detect military branch from employment data
    const employment = (pdlData?.employment ?? []) as { title?: string; organization?: string }[];
    const branch = detectBranchFromEmployment(employment);

    // Build bio from job title + company
    const jobTitle = pdlData?.job_title ?? employment[0]?.title ?? null;
    const company = employment[0]?.organization ?? null;
    const bio = jobTitle && company ? `${jobTitle} at ${company}`
      : jobTitle ?? company ?? null;

    // Find the first available directory (same pattern as creators-db.ts)
    const { data: dir } = await supabase
      .from("directories")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (!dir) {
      console.warn(LOG, "No directories found — cannot insert member");
      return;
    }

    // Build platform_urls
    const platformUrls: Record<string, string> = {};
    if (linkedinUrl) platformUrls.linkedin = linkedinUrl;

    // Also extract social profiles from PDL response
    if (pdlData?.profiles) {
      for (const p of pdlData.profiles) {
        if (p.network && p.url) {
          platformUrls[p.network] = p.url;
        }
      }
    }

    const payload = {
      directory_id: dir.id,
      creator_handle: email,
      creator_name: fullName || email.split("@")[0],
      avatar_url: avatarUrl,
      platform: provider === "linkedin_oidc" ? "linkedin" : "google",
      branch,
      bio,
      enrichment_data: pdlData as unknown,
      platforms: Object.keys(platformUrls),
      platform_urls: platformUrls,
      user_id: user.id,
      approved: true,
      sort_order: 0,
      added_at: new Date().toISOString(),
    };

    console.log(LOG, "Upserting directory_members:", {
      email,
      branch,
      bio,
      hasPdlData: !!pdlData,
      platforms: payload.platforms,
    });

    const { error: insertError } = await supabase
      .from("directory_members")
      .upsert(payload, { onConflict: "directory_id,creator_handle" });

    if (insertError) {
      console.error(LOG, "Upsert failed:", insertError.message, insertError.details);
      return;
    }

    console.log(LOG, "Enrichment complete for", email, "| branch:", branch ?? "none detected");
  } catch (err) {
    console.error(LOG, "Enrichment error (non-blocking):", err);
  }
}
