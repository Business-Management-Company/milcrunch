const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Ensure table exists (idempotent)
  await supabase.rpc("exec_sql", {
    query: `
      CREATE TABLE IF NOT EXISTS shared_reports (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        event_id text NOT NULL,
        report_type text NOT NULL CHECK (report_type IN ('gtm', 'summary')),
        event_title text NOT NULL DEFAULT '',
        event_date_range text NOT NULL DEFAULT '',
        content text NOT NULL,
        created_at timestamptz DEFAULT now(),
        expires_at timestamptz DEFAULT (now() + interval '30 days')
      );
    `,
  }).catch(() => {
    // exec_sql might not exist — table should already exist in production
  });

  if (req.method === "POST") {
    const { event_id, report_type, event_title, event_date_range, content } =
      req.body || {};

    if (!event_id || !report_type || !content) {
      return res
        .status(400)
        .json({ error: "event_id, report_type, and content are required" });
    }

    const { data, error } = await supabase
      .from("shared_reports")
      .insert({
        event_id,
        report_type,
        event_title: event_title || "",
        event_date_range: event_date_range || "",
        content,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[shared-reports] Insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ id: data.id });
  }

  if (req.method === "GET") {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "id query parameter required" });
    }

    const { data, error } = await supabase
      .from("shared_reports")
      .select("*")
      .eq("id", id)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) {
      return res
        .status(404)
        .json({ error: "Report not found or expired" });
    }

    return res.status(200).json(data);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
