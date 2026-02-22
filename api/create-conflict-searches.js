import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Try to create via rpc
  const { error } = await supabase.rpc("exec_sql", {
    query: `
      CREATE TABLE IF NOT EXISTS conflict_searches (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid NOT NULL,
        location text NOT NULL,
        start_date timestamptz NOT NULL,
        end_date timestamptz,
        radius text NOT NULL DEFAULT '15',
        audience_types text[] DEFAULT ARRAY[]::text[],
        created_at timestamptz DEFAULT now()
      );
      ALTER TABLE conflict_searches ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'conflict_searches' AND policyname = 'conflict_searches_user_all'
        ) THEN
          CREATE POLICY conflict_searches_user_all ON conflict_searches FOR ALL USING (auth.uid() = user_id);
        END IF;
      END $$;
    `,
  });

  if (error) {
    return res.status(200).json({ status: "rpc_unavailable", message: "Run this SQL in the Supabase dashboard SQL editor", sql: `CREATE TABLE IF NOT EXISTS conflict_searches (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid NOT NULL, location text NOT NULL, start_date timestamptz NOT NULL, end_date timestamptz, radius text NOT NULL DEFAULT '15', audience_types text[] DEFAULT ARRAY[]::text[], created_at timestamptz DEFAULT now()); ALTER TABLE conflict_searches ENABLE ROW LEVEL SECURITY; CREATE POLICY conflict_searches_user_all ON conflict_searches FOR ALL USING (auth.uid() = user_id);` });
  }

  return res.status(200).json({ status: "created" });
}
