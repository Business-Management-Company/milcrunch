-- Cadence Campaign feature: voice profiles, campaigns, and posts
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Creator voice profiles (saved per user, reused across campaigns)
CREATE TABLE IF NOT EXISTS creator_voice_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  style_description text,
  sample_post text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE creator_voice_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own voice profiles" ON creator_voice_profiles
  FOR ALL USING (auth.uid() = user_id);

-- 2. Cadence campaigns (one per scheduled campaign)
CREATE TABLE IF NOT EXISTS cadence_campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_days integer DEFAULT 30,
  start_date date,
  daily_post_time time,
  platform_account_ids jsonb DEFAULT '[]',
  cadences jsonb DEFAULT '[]',
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cadence_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own campaigns" ON cadence_campaigns
  FOR ALL USING (auth.uid() = user_id);

-- 3. Individual posts within a campaign
CREATE TABLE IF NOT EXISTS cadence_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES cadence_campaigns(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at timestamptz,
  cadence_name text,
  caption text,
  hashtags text,
  media_url text,
  upload_post_id text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cadence_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cadence posts" ON cadence_posts
  FOR ALL USING (auth.uid() = user_id);

-- 4. Create storage bucket for cadence media
-- Run this separately or create in Dashboard → Storage → New Bucket
-- Name: cadence-media, Public: true
INSERT INTO storage.buckets (id, name, public)
VALUES ('cadence-media', 'cadence-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow authenticated users to manage their own files
CREATE POLICY "Users upload own cadence media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cadence-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own cadence media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'cadence-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read cadence media" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'cadence-media');

CREATE POLICY "Users delete own cadence media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'cadence-media' AND (storage.foldername(name))[1] = auth.uid()::text);
