-- Creator auth, onboarding, and dashboard support.
-- Role: creator | brand | admin (stored in creator_profiles for creators; brand/admin may use auth.users.raw_user_meta_data).
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'creator'
  CHECK (role IS NULL OR role IN ('creator', 'brand', 'admin'));
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS years_of_service TEXT;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS audience_type TEXT
  CHECK (audience_type IS NULL OR audience_type IN ('veteran', 'active_duty', 'military_spouse', 'reservist', 'content_creator', 'supporter'));
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS rank TEXT;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS category_tags TEXT[] DEFAULT '{}';
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"outreach": true, "events": true, "milestones": true}';
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public'
  CHECK (profile_visibility IS NULL OR profile_visibility IN ('public', 'private'));
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS show_follower_counts BOOLEAN DEFAULT true;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS show_military_details BOOLEAN DEFAULT true;

COMMENT ON COLUMN creator_profiles.role IS 'creator | brand | admin for routing.';
COMMENT ON COLUMN creator_profiles.onboarding_step IS 'Current step 0-4; 4 = done.';
COMMENT ON COLUMN creator_profiles.onboarding_completed IS 'True after Step 4 completed.';
COMMENT ON COLUMN creator_profiles.audience_type IS 'I am a: veteran, active_duty, military_spouse, etc.';
COMMENT ON COLUMN creator_profiles.category_tags IS 'Multi-select: Military, Fitness, Lifestyle, etc.';

-- Creator notifications (outreach, event invites, milestones)
CREATE TABLE IF NOT EXISTS creator_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('outreach', 'event_invite', 'milestone', 'system')),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_notifications_user_id ON creator_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_creator_notifications_created_at ON creator_notifications (created_at DESC);

ALTER TABLE creator_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own creator_notifications"
  ON creator_notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE creator_notifications IS 'In-app notifications for creators: brand outreach, event invites, milestones.';
