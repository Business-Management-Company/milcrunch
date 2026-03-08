-- Add upload_post_slug column to creator_profiles
-- This stores the per-user UploadPost profile slug so each user
-- maps to their own UploadPost profile (not a shared one).
--
-- BUG FIX: Previously resolveUploadPostUsername() picked the first
-- non-UUID UploadPost profile globally, so ALL users resolved to
-- "johnny-rocket" and saw andrew@podlogix.co's connected socials.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'creator_profiles'
      AND column_name = 'upload_post_slug'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN upload_post_slug text;
  END IF;
END $$;

-- STEP 1: Set the known mapping: johnny-rocket belongs to andrew@podlogix.co
-- Find the UUID: SELECT id, email FROM auth.users WHERE email = 'andrew@podlogix.co';
-- Then run:
-- UPDATE creator_profiles SET upload_post_slug = 'johnny-rocket'
-- WHERE user_id = '<UUID>';

-- STEP 2: Delete leaked social connections for users who are NOT andrew@podlogix.co
-- These rows were incorrectly synced from johnny-rocket's UploadPost profile.
-- DELETE FROM creator_social_connections
-- WHERE user_id != '<UUID of andrew@podlogix.co>';

-- STEP 3: Delete leaked legacy connected_accounts for the same reason.
-- DELETE FROM connected_accounts
-- WHERE user_id != '<UUID of andrew@podlogix.co>';
