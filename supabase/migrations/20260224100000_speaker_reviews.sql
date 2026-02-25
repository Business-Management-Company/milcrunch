-- Add speaker review columns to speakers table
ALTER TABLE speakers ADD COLUMN IF NOT EXISTS review_status text;
ALTER TABLE speakers ADD COLUMN IF NOT EXISTS review_notes text;
ALTER TABLE speakers ADD COLUMN IF NOT EXISTS reviewed_by text;
ALTER TABLE speakers ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
