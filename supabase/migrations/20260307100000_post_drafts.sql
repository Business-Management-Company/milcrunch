-- Create post_drafts table for saved draft posts
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

ALTER TABLE post_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own drafts" ON post_drafts;
CREATE POLICY "Users can manage own drafts"
  ON post_drafts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
