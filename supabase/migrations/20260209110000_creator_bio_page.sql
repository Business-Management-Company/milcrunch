-- Komi-style creator bio page: hero image, format, dominant color, theme, tabs in custom_links.
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS hero_image_format TEXT DEFAULT 'landscape'
  CHECK (hero_image_format IN ('portrait', 'square', 'landscape'));
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS hero_dominant_color TEXT;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS bio_page_theme TEXT DEFAULT 'light'
  CHECK (bio_page_theme IN ('light', 'dark', 'auto'));
-- Optional military flair for ParadeDeck
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS branch TEXT
  CHECK (branch IS NULL OR branch IN ('army', 'navy', 'marines', 'air_force', 'coast_guard', 'space_force'));
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS is_verified_veteran BOOLEAN DEFAULT false;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS service_line TEXT;

COMMENT ON COLUMN creator_profiles.hero_image_url IS 'URL for bio page hero (storage or external).';
COMMENT ON COLUMN creator_profiles.hero_image_format IS 'portrait | square | landscape (Komi-style layout).';
COMMENT ON COLUMN creator_profiles.hero_dominant_color IS 'Hex color extracted from hero for background blur.';
COMMENT ON COLUMN creator_profiles.bio_page_theme IS 'light | dark | auto.';
COMMENT ON COLUMN creator_profiles.branch IS 'Military branch for badge (army, navy, marines, etc.).';
COMMENT ON COLUMN creator_profiles.is_verified_veteran IS 'Show verified veteran badge.';
COMMENT ON COLUMN creator_profiles.service_line IS 'e.g. "Service: USMC 2004-2012".';

-- Storage bucket for creator hero images (public read, authenticated upload per user).
INSERT INTO storage.buckets (id, name, public)
VALUES ('creator-assets', 'creator-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read creator-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'creator-assets');

CREATE POLICY "Authenticated users upload own creator-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'creator-assets'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own creator-assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'creator-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own creator-assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'creator-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read of connected_accounts for users who have a creator profile (bio page).
CREATE POLICY "Public read connected_accounts for creators"
  ON connected_accounts FOR SELECT
  USING (
    user_id IN (SELECT user_id FROM creator_profiles WHERE handle IS NOT NULL AND handle != '')
  );
