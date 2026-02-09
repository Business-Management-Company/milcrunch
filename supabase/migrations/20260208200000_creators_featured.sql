-- Creators table: imported creators from Influencers.club Discovery.
-- Featured homepage state lives here (no separate featured_creators needed).
CREATE TABLE IF NOT EXISTS creators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  handle TEXT NOT NULL,
  platform TEXT DEFAULT 'instagram',
  avatar_url TEXT,
  follower_count INTEGER,
  engagement_rate NUMERIC(5,2),
  category TEXT,
  bio TEXT,
  location TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  featured_section TEXT DEFAULT 'grid' CHECK (featured_section IN ('hero', 'grid', 'both')),
  featured_sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(platform, handle)
);

CREATE INDEX IF NOT EXISTS idx_creators_featured
  ON creators (is_featured, featured_section, featured_sort_order)
  WHERE is_featured = true;

COMMENT ON TABLE creators IS 'Imported creators from Discovery; featured_section controls hero vs Big Names grid on homepage.';

-- Optional: creator_lists and creator_list_members for Supabase-backed lists (bulk add).
CREATE TABLE IF NOT EXISTS creator_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creator_list_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES creator_lists(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(list_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_list_members_list
  ON creator_list_members (list_id);
CREATE INDEX IF NOT EXISTS idx_creator_list_members_creator
  ON creator_list_members (creator_id);
