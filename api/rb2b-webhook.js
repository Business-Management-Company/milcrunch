const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body || {};
  console.log("[rb2b-webhook] Incoming payload:", JSON.stringify(body));

  // Initialize Supabase with service role key for RLS bypass
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("[rb2b-webhook] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    // Still return 200 so RB2B doesn't retry
    return res.status(200).json({ ok: true, warning: "Server misconfigured" });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { error } = await supabase.from("website_visitors").insert({
      page_url: body.pageUrl || body.page_url || body.url || null,
      linkedin_url: body.linkedInProfile || body.linkedin_url || body.linkedin || null,
      full_name: body.name || body.full_name || body.firstName ? `${body.firstName || ""} ${body.lastName || ""}`.trim() || null : null,
      email: body.email || body.e_mail || null,
      company: body.company || body.companyName || body.organization || null,
      job_title: body.title || body.jobTitle || body.job_title || null,
      location: body.location || body.city || null,
      ip_address: body.ip || body.ipAddress || body.ip_address || null,
      rb2b_timestamp: body.timestamp || body.created_at || null,
      raw_payload: body,
    });

    if (error) {
      console.error("[rb2b-webhook] Supabase insert error:", error.message);
    } else {
      console.log("[rb2b-webhook] Stored visitor:", body.email || body.name || "unknown");
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[rb2b-webhook] Exception:", err.message);
    return res.status(200).json({ ok: true });
  }
};
