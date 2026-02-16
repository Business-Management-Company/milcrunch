-- Credit usage logging table for tracking API costs per user
CREATE TABLE IF NOT EXISTS api_credit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('discovery_search', 'raw_enrichment', 'full_enrichment', 'export')),
  credits_used DECIMAL(10,2) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE api_credit_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own logs
CREATE POLICY "Auth read own logs" ON api_credit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can insert logs
CREATE POLICY "Auth insert logs" ON api_credit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Super admin can read all logs (for billing/analytics)
CREATE POLICY "Super admin read all" ON api_credit_log
  FOR SELECT USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
  );
