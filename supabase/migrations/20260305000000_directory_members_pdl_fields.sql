-- ============================================================
-- MIGRATION: Add PDL work history, verification source, and LinkedIn URL to directory_members
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.directory_members
  ADD COLUMN IF NOT EXISTS work_history JSONB,
  ADD COLUMN IF NOT EXISTS verification_source TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

COMMENT ON COLUMN public.directory_members.work_history IS 'Raw PDL employment/experience JSON array from enrichment';
COMMENT ON COLUMN public.directory_members.verification_source IS 'How verification was determined, e.g. LinkedIn + PDL, Manual Review';
COMMENT ON COLUMN public.directory_members.linkedin_url IS 'LinkedIn profile URL from PDL or user-provided';

CREATE INDEX IF NOT EXISTS idx_directory_members_verification_source
  ON public.directory_members(verification_source) WHERE verification_source IS NOT NULL;
