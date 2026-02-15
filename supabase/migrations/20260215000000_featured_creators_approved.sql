-- Add approved column for directory approval flow.
-- Only approved = true creators appear on homepage and public directory.
ALTER TABLE featured_creators
  ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS platform_urls JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS paradedeck_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS influencersclub_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_slug TEXT,
  ADD COLUMN IF NOT EXISTS ic_avatar_url TEXT;

-- Backfill: set all existing active creators as approved
UPDATE featured_creators SET approved = true WHERE is_active = true AND approved IS NULL;
UPDATE featured_creators SET approved = false WHERE approved IS NULL;

-- Index for public queries filtering by approved
CREATE INDEX IF NOT EXISTS idx_featured_creators_approved
  ON featured_creators (approved, sort_order)
  WHERE approved = true;

-- Unique constraint for upsert by platform + handle
CREATE UNIQUE INDEX IF NOT EXISTS idx_featured_creators_platform_handle
  ON featured_creators (platform, handle);

COMMENT ON COLUMN featured_creators.approved IS 'Only approved creators appear on homepage showcase and public /creators directory.';
