CREATE TABLE IF NOT EXISTS ai_strategy_briefs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  event_description text NOT NULL DEFAULT '',
  content text NOT NULL,
  creator_handles text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '90 days')
);

ALTER TABLE ai_strategy_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read briefs"
  ON ai_strategy_briefs FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert briefs"
  ON ai_strategy_briefs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
