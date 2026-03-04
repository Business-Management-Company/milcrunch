/**
 * POST /api/enrich-profile
 *
 * Server-side PDL enrichment for first OAuth login.
 * Calls People Data Labs, detects military status, and upserts into directory_members.
 * PDL_API_KEY never leaves the server.
 *
 * Body: { email, full_name, avatar_url, linkedin_url, user_id, provider }
 */

const MILITARY_KEYWORDS = [
  "army", "us army", "u.s. army", "united states army",
  "navy", "us navy", "u.s. navy", "united states navy",
  "air force", "us air force", "u.s. air force",
  "marine corps", "marines", "usmc", "u.s. marine corps",
  "coast guard", "us coast guard", "u.s. coast guard",
  "space force", "u.s. space force",
  "national guard",
  "u.s. military", "department of defense", "dod",
];

const BRANCH_MAP = {
  army: "Army", "us army": "Army", "u.s. army": "Army", "united states army": "Army",
  "national guard": "Army",
  navy: "Navy", "us navy": "Navy", "u.s. navy": "Navy", "united states navy": "Navy",
  "air force": "Air Force", "us air force": "Air Force", "u.s. air force": "Air Force",
  "marine corps": "Marines", marines: "Marines", usmc: "Marines", "u.s. marine corps": "Marines",
  "coast guard": "Coast Guard", "us coast guard": "Coast Guard", "u.s. coast guard": "Coast Guard",
  "space force": "Space Force", "u.s. space force": "Space Force",
};

function detectMilitary(experience) {
  if (!Array.isArray(experience)) return { status: null, branch: null };
  for (const job of experience) {
    const org = (job.company?.name || job.company || job.organization || "").toLowerCase();
    const title = (job.title?.name || job.title || "").toLowerCase();
    const text = `${org} ${title}`;
    for (const kw of MILITARY_KEYWORDS) {
      if (text.includes(kw)) {
        return { status: "Veteran", branch: BRANCH_MAP[kw] || null };
      }
    }
  }
  return { status: null, branch: null };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pdlKey = process.env.PDL_API_KEY;
  if (!pdlKey) {
    console.error("[enrich-profile] PDL_API_KEY not configured");
    return res.status(500).json({ error: "PDL_API_KEY not configured" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("[enrich-profile] Supabase env vars missing");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const { email, full_name, avatar_url, linkedin_url, user_id, provider } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: "email is required" });
  }

  console.log("[enrich-profile] Starting for:", email);

  try {
    // --- 1. Call PDL Person Enrichment ---
    const pdlBody = { email, pretty: true };
    if (linkedin_url) pdlBody.profile = linkedin_url;

    const pdlRes = await fetch("https://api.peopledatalabs.com/v5/person/enrich", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": pdlKey,
      },
      body: JSON.stringify(pdlBody),
    });

    const pdlText = await pdlRes.text();
    console.log("[enrich-profile] PDL status:", pdlRes.status, "len:", pdlText.length);

    if (!pdlRes.ok) {
      console.warn("[enrich-profile] PDL returned", pdlRes.status, pdlText.slice(0, 300));
      return res.status(200).json({
        enriched: false,
        reason: `PDL returned ${pdlRes.status}`,
      });
    }

    const pdlJson = JSON.parse(pdlText);
    const pdl = pdlJson.data || pdlJson;

    // --- 2. Extract fields ---
    const jobTitle = pdl.job_title || null;
    const company = pdl.job_company_name || null;
    const location = pdl.location_name || null;
    const experience = pdl.experience || [];
    const bio = jobTitle && company ? `${jobTitle} at ${company}`
      : jobTitle || company || null;

    // --- 3. Detect military status ---
    const { status: militaryStatus, branch } = detectMilitary(experience);

    console.log("[enrich-profile] Parsed:", {
      jobTitle, company, location,
      experienceCount: experience.length,
      militaryStatus, branch,
    });

    // --- 4. Upsert into directory_members ---
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find the first available directory
    const { data: dir } = await supabase
      .from("directories")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (!dir) {
      console.warn("[enrich-profile] No directories found");
      return res.status(200).json({ enriched: false, reason: "No directories exist" });
    }

    // Build platform_urls
    const platformUrls = {};
    if (linkedin_url) platformUrls.linkedin = linkedin_url;
    if (pdl.linkedin_url) platformUrls.linkedin = pdl.linkedin_url;
    const pdlProfiles = pdl.profiles || [];
    for (const p of pdlProfiles) {
      if (p.network && p.url) platformUrls[p.network] = p.url;
    }

    const payload = {
      directory_id: dir.id,
      creator_handle: email,
      creator_name: full_name || pdl.full_name || email.split("@")[0],
      avatar_url: avatar_url || null,
      platform: provider === "linkedin_oidc" ? "linkedin" : (provider || "google"),
      branch: branch || null,
      status: militaryStatus || null,
      bio,
      enrichment_data: {
        job_title: jobTitle,
        company,
        location,
        linkedin_url: pdl.linkedin_url || linkedin_url || null,
        military_status: militaryStatus,
        work_history: experience,
        pdl_raw: pdl,
      },
      platforms: Object.keys(platformUrls),
      platform_urls: platformUrls,
      user_id: user_id || null,
      approved: true,
      sort_order: 0,
      added_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase
      .from("directory_members")
      .upsert(payload, { onConflict: "directory_id,creator_handle" });

    if (upsertErr) {
      console.error("[enrich-profile] Upsert failed:", upsertErr.message, upsertErr.details);
      return res.status(200).json({ enriched: false, reason: upsertErr.message });
    }

    console.log("[enrich-profile] Done:", email, "| branch:", branch, "| military:", militaryStatus);

    return res.status(200).json({
      enriched: true,
      job_title: jobTitle,
      company,
      location,
      military_status: militaryStatus,
      branch,
      work_history_count: experience.length,
    });
  } catch (err) {
    console.error("[enrich-profile] Error:", err.message);
    return res.status(200).json({ enriched: false, reason: err.message });
  }
}
