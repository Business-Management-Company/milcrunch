-- Manual Campaign feature: campaigns and campaign posts
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  platforms jsonb DEFAULT '[]'::jsonb,
  mode text DEFAULT 'manual',           -- 'manual' | 'spread_evenly'
  status text DEFAULT 'draft',          -- 'draft' | 'scheduled'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own campaigns" ON campaigns;
CREATE POLICY "Users manage own campaigns" ON campaigns
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Campaign posts table
CREATE TABLE IF NOT EXISTS campaign_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caption text,
  media_url text,
  media_type text,                      -- 'photo' | 'video'
  scheduled_at timestamptz,
  platforms jsonb,                      -- null = inherit from campaign
  sort_order integer DEFAULT 0,
  upload_post_id text,                  -- from UploadPost API response
  status text DEFAULT 'draft',          -- 'draft' | 'scheduled' | 'published' | 'failed'
  created_at timestamptz DEFAULT now()
);
ALTER TABLE campaign_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own campaign posts" ON campaign_posts;
CREATE POLICY "Users manage own campaign posts" ON campaign_posts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
