-- Create enum for event-specific team roles
CREATE TYPE public.event_team_role AS ENUM (
  'owner',
  'admin', 
  'event_manager',
  'marketing_manager',
  'registration_manager',
  'vendor_manager',
  'finance_manager',
  'staff',
  'view_only'
);

-- Create event team members table
CREATE TABLE public.event_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role event_team_role NOT NULL DEFAULT 'staff',
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create team invitations table for pending invites
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role event_team_role NOT NULL DEFAULT 'staff',
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check event team role
CREATE OR REPLACE FUNCTION public.has_event_role(_user_id UUID, _event_id UUID, _roles event_team_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_team_members
    WHERE user_id = _user_id
      AND event_id = _event_id
      AND role = ANY(_roles)
  )
$$;

-- Function to check if user is event owner or admin
CREATE OR REPLACE FUNCTION public.is_event_admin(_user_id UUID, _event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_team_members
    WHERE user_id = _user_id
      AND event_id = _event_id
      AND role IN ('owner', 'admin')
  ) OR is_admin(_user_id)
$$;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_event_permission(_user_id UUID, _event_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_team_members
    WHERE user_id = _user_id
      AND event_id = _event_id
      AND (
        role IN ('owner', 'admin')
        OR permissions ? _permission
        OR (permissions -> _permission)::boolean = true
      )
  ) OR is_admin(_user_id)
$$;

-- RLS Policies for event_team_members
CREATE POLICY "Users can view team members of their events"
ON public.event_team_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR is_event_admin(auth.uid(), event_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "Event admins can manage team members"
ON public.event_team_members
FOR ALL
USING (is_event_admin(auth.uid(), event_id) OR is_admin(auth.uid()));

-- RLS Policies for team_invitations
CREATE POLICY "Event admins can manage invitations"
ON public.team_invitations
FOR ALL
USING (is_event_admin(auth.uid(), event_id) OR is_admin(auth.uid()));

CREATE POLICY "Anyone can view invitation by token"
ON public.team_invitations
FOR SELECT
USING (true);

-- Update trigger for event_team_members
CREATE TRIGGER update_event_team_members_updated_at
BEFORE UPDATE ON public.event_team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_event_team_members_event ON public.event_team_members(event_id);
CREATE INDEX idx_event_team_members_user ON public.event_team_members(user_id);
CREATE INDEX idx_team_invitations_event ON public.team_invitations(event_id);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);