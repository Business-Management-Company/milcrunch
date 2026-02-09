-- Upload-Post: store connected social accounts per creator (connect once, use everywhere).
-- user_id = Supabase auth user id = Upload-Post profile username.
CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_user_id TEXT,
  platform_username TEXT,
  profile_image_url TEXT,
  followers_count INTEGER,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform, platform_username)
);

CREATE INDEX IF NOT EXISTS idx_connected_accounts_user
  ON connected_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_platform
  ON connected_accounts (platform);

COMMENT ON TABLE connected_accounts IS 'Social accounts connected via Upload-Post; synced from Upload-Post user profile.';

-- Optional: creator_profiles extended for custom links (bio page).
CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT,
  bio TEXT,
  custom_links JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE creator_profiles IS 'Creator bio page: display name, bio, custom links. Connected account stats from Upload-Post.';

-- RLS: creators can manage their own connected_accounts and creator_profiles.
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own connected_accounts"
  ON connected_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own creator_profiles"
  ON creator_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
