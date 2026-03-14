const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-RB2B-Secret");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify webhook secret
  const secret = process.env.RB2B_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers["x-rb2b-secret"];
    if (provided !== secret) {
      console.warn("[rb2b-webhook] Invalid secret header");
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid payload" });
  }

  // Initialize Supabase with service role key for RLS bypass
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("[rb2b-webhook] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { error } = await supabase.from("website_visitors").insert({
      page_url: body.pageUrl || null,
      linkedin_url: body.linkedInProfile || null,
      full_name: body.name || null,
      email: body.email || null,
      company: body.company || null,
      job_title: body.title || null,
      location: body.location || null,
      ip_address: body.ip || null,
      rb2b_timestamp: body.timestamp || null,
      raw_payload: body,
    });

    if (error) {
      console.error("[rb2b-webhook] Supabase insert error:", error.message);
      return res.status(500).json({ error: "Failed to store visitor" });
    }

    console.log("[rb2b-webhook] Stored visitor:", body.email || body.name || "unknown");
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[rb2b-webhook] Exception:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
