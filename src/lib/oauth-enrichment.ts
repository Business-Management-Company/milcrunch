import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const LOG = "[OAuthEnrich]";

/** Extract LinkedIn profile URL from Supabase user identities. */
function extractLinkedInUrl(user: User): string | null {
  const identity = user.identities?.find((i) => i.provider === "linkedin_oidc");
  if (!identity) return null;
  const sub = identity.identity_data?.sub as string | undefined;
  if (sub) return `https://www.linkedin.com/in/${sub}`;
  return null;
}

/**
 * Enrich a user's profile via PDL on their first OAuth login.
 * Fire-and-forget: never throws — logs errors and returns silently.
 *
 * 1. Checks if directory_members row already exists for this email → skips if so
 * 2. POSTs to /api/enrich-profile (server-side PDL call — key never hits browser)
 * 3. Server detects military status and upserts into directory_members
 */
export async function enrichOAuthUser(user: User): Promise<void> {
  try {
    const email = user.email;
    if (!email) {
      console.warn(LOG, "No email on user, skipping");
      return;
    }

    console.log(LOG, "Checking if already enriched:", email);

    // Check if directory_members row already exists for this email
    const { data: existing } = await supabase
      .from("directory_members")
      .select("id")
      .eq("creator_handle", email)
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log(LOG, "Already enriched, skipping:", email);
      return;
    }

    const fullName = (user.user_metadata?.full_name as string)
      ?? (user.user_metadata?.name as string)
      ?? "";
    const avatarUrl = (user.user_metadata?.avatar_url as string)
      ?? (user.user_metadata?.picture as string)
      ?? null;
    const linkedinUrl = extractLinkedInUrl(user);
    const provider = user.app_metadata?.provider ?? "google";

    console.log(LOG, "Calling /api/enrich-profile for:", { email, fullName, linkedinUrl, provider });

    const res = await fetch("/api/enrich-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        full_name: fullName,
        avatar_url: avatarUrl,
        linkedin_url: linkedinUrl,
        user_id: user.id,
        provider,
      }),
    });

    const result = await res.json();
    console.log(LOG, "Result:", result);
  } catch (err) {
    console.error(LOG, "Error (non-blocking):", err);
  }
}
