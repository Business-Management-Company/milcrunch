import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/ensure-post-drafts
 * Creates the post_drafts table (if missing) and ensures RLS policies exist.
 * Requires SUPABASE_SERVICE_ROLE_KEY in Vercel env to bypass RLS for DDL.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return res.status(500).json({ error: "VITE_SUPABASE_URL not set" });
  }

  if (!serviceKey) {
    // Without service role key, we can't create tables or policies.
    // Return the SQL for the user to run manually in Supabase dashboard.
    return res.status(200).json({
      ok: false,
      message: "SUPABASE_SERVICE_ROLE_KEY not set — run this SQL in the Supabase SQL Editor:",
      sql: BOOTSTRAP_SQL,
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Run each statement separately (supabase-js rpc/raw SQL varies by setup)
  const statements = [
    // Create table
    `CREATE TABLE IF NOT EXISTS post_drafts (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      caption text,
      media_url text,
      media_type text,
      platforms jsonb DEFAULT '[]'::jsonb,
      account_ids jsonb DEFAULT '[]'::jsonb,
      post_name text,
      label text,
      scheduled_at timestamptz,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );`,
    // Enable RLS
    `ALTER TABLE post_drafts ENABLE ROW LEVEL SECURITY;`,
    // Add columns if table already existed without them
    `ALTER TABLE post_drafts ADD COLUMN IF NOT EXISTS media_type text;`,
    `ALTER TABLE post_drafts ADD COLUMN IF NOT EXISTS account_ids jsonb DEFAULT '[]'::jsonb;`,
    `ALTER TABLE post_drafts ADD COLUMN IF NOT EXISTS post_name text;`,
    `ALTER TABLE post_drafts ADD COLUMN IF NOT EXISTS label text;`,
    // Drop policy if exists then recreate (idempotent)
    `DROP POLICY IF EXISTS "Users can manage own drafts" ON post_drafts;`,
    `CREATE POLICY "Users can manage own drafts" ON post_drafts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`,
  ];

  const errors = [];
  for (const sql of statements) {
    const { error } = await supabase.rpc("exec_sql", { query: sql });
    if (error) {
      // Try via pg_net or just log — exec_sql may not exist
      errors.push({ sql: sql.slice(0, 60), error: error.message });
    }
  }

  // Verify table is accessible
  const { error: verifyError } = await supabase
    .from("post_drafts")
    .select("id")
    .limit(0);

  if (verifyError) {
    return res.status(500).json({
      ok: false,
      message: "Table creation failed. Run this SQL in the Supabase SQL Editor:",
      sql: BOOTSTRAP_SQL,
      errors,
      verifyError: verifyError.message,
    });
  }

  return res.status(200).json({ ok: true });
}

const BOOTSTRAP_SQL = `
-- Create post_drafts table
CREATE TABLE IF NOT EXISTS post_drafts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caption text,
  media_url text,
  media_type text,
  platforms jsonb DEFAULT '[]'::jsonb,
  account_ids jsonb DEFAULT '[]'::jsonb,
  post_name text,
  label text,
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE post_drafts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own drafts
DROP POLICY IF EXISTS "Users can manage own drafts" ON post_drafts;
CREATE POLICY "Users can manage own drafts"
  ON post_drafts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
`.trim();
