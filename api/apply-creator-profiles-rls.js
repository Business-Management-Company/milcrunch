const { createClient } = require("@supabase/supabase-js");

/**
 * GET /api/apply-creator-profiles-rls
 *
 * One-time migration: grants anon SELECT on creator_profiles and adds
 * a public read RLS policy so /c/:handle bio pages work without auth.
 *
 * Uses the service role key to query pg_policies and conditionally create
 * policies via supabase-js .rpc() with a pre-created helper, or raw SQL
 * through the REST API.
 *
 * Delete this file after running it once.
 */
module.exports = async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" });
  }

  // Use the Supabase SQL HTTP endpoint (available with service role key)
  const sqlStatements = [
    "ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;",
    "GRANT SELECT ON public.creator_profiles TO anon, authenticated;",
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creator_profiles' AND policyname = 'Public can view creator profiles') THEN
         CREATE POLICY "Public can view creator profiles" ON public.creator_profiles FOR SELECT TO anon USING (true);
       END IF;
     END $$;`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creator_profiles' AND policyname = 'Authenticated can view creator profiles') THEN
         CREATE POLICY "Authenticated can view creator profiles" ON public.creator_profiles FOR SELECT TO authenticated USING (true);
       END IF;
     END $$;`,
    "NOTIFY pgrst, 'reload schema';",
  ];

  const results = [];

  for (const sql of sqlStatements) {
    try {
      const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      // If rpc doesn't work, try the pg_net approach
      if (!resp.ok) {
        // Fall back: just record the SQL needed
        results.push({ sql: sql.slice(0, 60) + "...", status: "needs_manual_run", httpStatus: resp.status });
      } else {
        results.push({ sql: sql.slice(0, 60) + "...", status: "ok" });
      }
    } catch (err) {
      results.push({ sql: sql.slice(0, 60) + "...", status: "error", message: err.message });
    }
  }

  return res.status(200).json({
    message: "If any steps show 'needs_manual_run', run these SQL statements in the Supabase SQL Editor:",
    sql_to_run: sqlStatements.join("\n\n"),
    results,
  });
};
