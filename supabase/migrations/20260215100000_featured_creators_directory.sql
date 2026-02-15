-- ============================================================
-- MIGRATION: featured_creators directory enhancements
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add new columns for directory management
ALTER TABLE featured_creators
  ADD COLUMN IF NOT EXISTS source_list_id UUID,
  ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS enrichment_data JSONB;

-- 2. Backfill added_at for existing rows
UPDATE featured_creators
  SET added_at = created_at
  WHERE added_at IS NULL AND created_at IS NOT NULL;

-- 3. Comments
COMMENT ON COLUMN featured_creators.source_list_id IS 'Which list this creator was promoted from, if any';
COMMENT ON COLUMN featured_creators.added_by IS 'Admin user who added this creator to the directory';
COMMENT ON COLUMN featured_creators.added_at IS 'When this creator was added to the directory';
COMMENT ON COLUMN featured_creators.enrichment_data IS 'Full enrichment API response snapshot at time of add';

-- 4. RLS: ensure super_admin can manage featured_creators
-- Allow anyone to SELECT (for homepage/public pages)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'featured_creators'
    AND policyname = 'Anyone can read featured_creators'
  ) THEN
    CREATE POLICY "Anyone can read featured_creators"
      ON featured_creators FOR SELECT
      USING (true);
  END IF;
END $$;

-- Allow super_admin to INSERT/UPDATE/DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'featured_creators'
    AND policyname = 'Super admin can manage featured_creators'
  ) THEN
    CREATE POLICY "Super admin can manage featured_creators"
      ON featured_creators FOR ALL
      USING (
        auth.jwt() ->> 'role' = 'super_admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
      )
      WITH CHECK (
        auth.jwt() ->> 'role' = 'super_admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
      );
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE featured_creators ENABLE ROW LEVEL SECURITY;
