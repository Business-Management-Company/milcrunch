-- Saved venue searches: stores filter parameters for reuse
CREATE TABLE IF NOT EXISTS saved_venue_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  search_params JSONB NOT NULL DEFAULT '{}',
  result_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_venue_searches_user
  ON saved_venue_searches (user_id, created_at DESC);

ALTER TABLE saved_venue_searches ENABLE ROW LEVEL SECURITY;

-- Users can manage their own saved searches
CREATE POLICY "Users manage own saved venue searches"
  ON saved_venue_searches FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
