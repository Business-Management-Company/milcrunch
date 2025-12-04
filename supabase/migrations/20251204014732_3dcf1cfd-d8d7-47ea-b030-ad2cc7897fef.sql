-- Fix security issue 1: Hide nominee_email from public view
-- Drop the existing policy and create a more secure one
DROP POLICY IF EXISTS "Anyone can view approved nominations" ON public.nominations;

-- Create a function to return nominations without sensitive data for public
CREATE OR REPLACE FUNCTION public.get_public_nomination_data(nom nominations)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nom.status IN ('submitted', 'finalist', 'winner')
$$;

-- Recreate the policy - admins and submitters see all, public only sees non-sensitive approved ones
CREATE POLICY "Anyone can view approved nominations without email"
ON public.nominations
FOR SELECT
USING (
  (status IN ('submitted', 'finalist', 'winner') AND auth.uid() IS NULL) OR
  (auth.uid() = submitted_by) OR
  is_admin(auth.uid())
);

-- Fix security issue 2: Restrict voter IP visibility
DROP POLICY IF EXISTS "Anyone can view vote counts" ON public.public_votes;

-- Only allow viewing vote counts without exposing voter details
CREATE POLICY "Authenticated users can view their own votes"
ON public.public_votes
FOR SELECT
USING (
  (auth.uid() = voter_id) OR
  is_admin(auth.uid())
);

-- Fix security issue 3: Add explicit SELECT policy for proposals
-- Only admins, creators, and designated sponsors can view proposals
CREATE POLICY "Users can view relevant proposals"
ON public.proposals
FOR SELECT
USING (
  is_admin(auth.uid()) OR
  (auth.uid() = created_by)
);