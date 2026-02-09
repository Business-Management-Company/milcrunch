-- Military verification engine: speakers/creators
CREATE TABLE public.verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_name TEXT NOT NULL,
  claimed_branch TEXT,
  claimed_rank TEXT,
  claimed_status TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  verification_score INTEGER CHECK (verification_score >= 0 AND verification_score <= 100),
  status TEXT DEFAULT 'pending' CHECK (status IN ('verified', 'pending', 'flagged', 'denied')),
  pdl_data JSONB,
  serp_results JSONB,
  firecrawl_data JSONB,
  ai_analysis TEXT,
  evidence_sources JSONB,
  red_flags JSONB,
  notes TEXT,
  verified_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_verified_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_verifications_status ON public.verifications(status);
CREATE INDEX idx_verifications_person_name ON public.verifications(person_name);
CREATE INDEX idx_verifications_created_at ON public.verifications(created_at DESC);

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read verifications" ON public.verifications
  FOR SELECT USING (true);

CREATE POLICY "Allow insert verifications" ON public.verifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update verifications" ON public.verifications
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete verifications" ON public.verifications
  FOR DELETE USING (true);

-- Updated_at trigger (reuse if exists, otherwise create)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

CREATE TRIGGER update_verifications_updated_at
  BEFORE UPDATE ON public.verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
