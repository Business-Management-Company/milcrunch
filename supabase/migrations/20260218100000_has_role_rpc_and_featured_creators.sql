-- 1. Create has_role() RPC function (single-param version using auth.uid())
--    Called from AuthContext as: supabase.rpc("has_role", { check_role: "super_admin" })
CREATE OR REPLACE FUNCTION public.has_role(check_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = check_role
  );
$$;

-- 2. Ensure featured_creators table exists
--    (Idempotent — safe to re-run if table already exists)
CREATE TABLE IF NOT EXISTS public.featured_creators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  handle TEXT NOT NULL,
  platform TEXT DEFAULT 'instagram',
  avatar_url TEXT,
  follower_count INTEGER,
  engagement_rate NUMERIC(5,2),
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_featured_creators_active_sort
  ON public.featured_creators (is_active, sort_order)
  WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.featured_creators ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent with DO blocks)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'featured_creators' AND policyname = 'Anyone can view active featured creators'
  ) THEN
    CREATE POLICY "Anyone can view active featured creators"
      ON public.featured_creators FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'featured_creators' AND policyname = 'Admins can manage featured creators'
  ) THEN
    CREATE POLICY "Admins can manage featured creators"
      ON public.featured_creators FOR ALL
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;
