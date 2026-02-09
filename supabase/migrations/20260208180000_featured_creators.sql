-- Featured creators for homepage hero and "Big Names" grid.
-- Managed from Admin > Featured Creators.
CREATE TABLE IF NOT EXISTS featured_creators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  handle TEXT NOT NULL,
  platform TEXT DEFAULT 'instagram',
  avatar_url TEXT,
  follower_count INTEGER,
  engagement_rate NUMERIC(5,2),
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_featured_creators_active_sort
  ON featured_creators (is_active, sort_order)
  WHERE is_active = true;

COMMENT ON TABLE featured_creators IS 'Homepage hero and Big Names grid; order and visibility controlled via sort_order and is_active.';
