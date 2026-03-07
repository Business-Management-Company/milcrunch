-- Add created_by / creator_id columns to cadence_campaigns
-- Run this if the table already exists from the previous migration

ALTER TABLE cadence_campaigns ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE cadence_campaigns ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES auth.users(id);
ALTER TABLE cadence_campaigns ADD COLUMN IF NOT EXISTS created_for_name text;

-- Backfill: set created_by = user_id for existing campaigns
UPDATE cadence_campaigns SET created_by = user_id WHERE created_by IS NULL;

-- Update RLS to allow both the creator AND the admin/brand who created it
DROP POLICY IF EXISTS "Users manage own campaigns" ON cadence_campaigns;
CREATE POLICY "Users manage own campaigns" ON cadence_campaigns
  FOR ALL USING (
    auth.uid() = user_id OR
    auth.uid() = created_by OR
    auth.uid() = creator_id
  );
