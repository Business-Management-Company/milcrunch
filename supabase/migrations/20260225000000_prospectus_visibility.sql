-- Add visibility JSONB column to prospectus_tab_content for section/field show/hide toggles
ALTER TABLE prospectus_tab_content
  ADD COLUMN IF NOT EXISTS visibility jsonb DEFAULT '{}'::jsonb;
