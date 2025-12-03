-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'org_admin', 'brand_admin', 'event_planner', 'sponsor', 'judge', 'attendee');

-- Create event_type enum
CREATE TYPE public.event_type AS ENUM ('live', 'virtual', 'hybrid');

-- Create ticket_type enum
CREATE TYPE public.ticket_type AS ENUM ('free', 'paid', 'donation', 'vip', 'member', 'sponsor', 'comp');

-- Create order_status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');

-- Create checkin_method enum
CREATE TYPE public.checkin_method AS ENUM ('qr', 'email', 'manual');

-- Create nomination_status enum
CREATE TYPE public.nomination_status AS ENUM ('draft', 'submitted', 'under_review', 'finalist', 'winner', 'rejected');

-- Create proposal_status enum
CREATE TYPE public.proposal_status AS ENUM ('draft', 'sent', 'viewed', 'signed', 'rejected', 'expired');

-- Create ai_workflow_type enum
CREATE TYPE public.ai_workflow_type AS ENUM ('event_architect', 'awards_designer', 'sponsor_closer', 'attendee_concierge');

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'attendee',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  military_branch TEXT,
  location TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Brands table
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  event_type public.event_type NOT NULL DEFAULT 'live',
  venue TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  capacity INTEGER,
  is_published BOOLEAN DEFAULT false,
  cover_image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brand_id, slug)
);

-- Ticket types table
CREATE TABLE public.ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  quantity INTEGER,
  quantity_sold INTEGER DEFAULT 0,
  ticket_type public.ticket_type NOT NULL DEFAULT 'paid',
  benefits JSONB,
  restrictions TEXT,
  sales_start TIMESTAMP WITH TIME ZONE,
  sales_end TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  ticket_type_id UUID REFERENCES public.ticket_types(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  total DECIMAL(10,2) NOT NULL,
  status public.order_status DEFAULT 'pending',
  payment_provider TEXT,
  payment_intent_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Check-ins table
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  checked_in_by UUID REFERENCES auth.users(id),
  method public.checkin_method DEFAULT 'qr',
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Award programs table
CREATE TABLE public.award_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  year INTEGER DEFAULT EXTRACT(YEAR FROM now()),
  nomination_start TIMESTAMP WITH TIME ZONE,
  nomination_end TIMESTAMP WITH TIME ZONE,
  judging_start TIMESTAMP WITH TIME ZONE,
  judging_end TIMESTAMP WITH TIME ZONE,
  public_voting_start TIMESTAMP WITH TIME ZONE,
  public_voting_end TIMESTAMP WITH TIME ZONE,
  ceremony_date TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT false,
  cover_image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brand_id, slug)
);

-- Award categories table
CREATE TABLE public.award_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.award_programs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT,
  weight DECIMAL(5,2) DEFAULT 1.0,
  max_nominations INTEGER,
  allow_public_voting BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Nominations table
CREATE TABLE public.nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.award_programs(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.award_categories(id) ON DELETE CASCADE NOT NULL,
  submitted_by UUID REFERENCES auth.users(id),
  nominee_name TEXT NOT NULL,
  nominee_email TEXT,
  nominee_description TEXT,
  submission_data JSONB,
  status public.nomination_status DEFAULT 'submitted',
  total_score DECIMAL(10,2),
  public_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Judge assignments table
CREATE TABLE public.judge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES public.award_programs(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.award_categories(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(judge_id, category_id)
);

-- Scores table
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nomination_id UUID REFERENCES public.nominations(id) ON DELETE CASCADE NOT NULL,
  rubric_scores JSONB,
  total_score DECIMAL(10,2),
  comments TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(judge_id, nomination_id)
);

-- Public votes table
CREATE TABLE public.public_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomination_id UUID REFERENCES public.nominations(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES auth.users(id),
  voter_ip TEXT,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sponsors table
CREATE TABLE public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  industries TEXT[],
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sponsor packages table
CREATE TABLE public.sponsor_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.award_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier TEXT,
  price DECIMAL(10,2),
  description TEXT,
  benefits JSONB,
  inventory JSONB,
  max_sponsors INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sponsorship deals table
CREATE TABLE public.sponsorship_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES public.sponsors(id) ON DELETE CASCADE NOT NULL,
  package_id UUID REFERENCES public.sponsor_packages(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.award_programs(id) ON DELETE CASCADE,
  custom_terms TEXT,
  amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Proposals table
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES public.sponsors(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.award_programs(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.sponsor_packages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  status public.proposal_status DEFAULT 'draft',
  esign_link TEXT,
  view_count INTEGER DEFAULT 0,
  time_on_page INTEGER DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- AI Workflows table
CREATE TABLE public.ai_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workflow_type public.ai_workflow_type NOT NULL,
  input_json JSONB,
  output_json JSONB,
  status TEXT DEFAULT 'pending',
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  program_id UUID REFERENCES public.award_programs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_workflows ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin (super_admin, org_admin, or brand_admin)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'org_admin', 'brand_admin', 'event_planner')
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.is_admin(auth.uid()));

-- Organizations policies
CREATE POLICY "Anyone can view organizations" ON public.organizations
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage organizations" ON public.organizations
  FOR ALL USING (public.is_admin(auth.uid()));

-- Brands policies
CREATE POLICY "Anyone can view brands" ON public.brands
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage brands" ON public.brands
  FOR ALL USING (public.is_admin(auth.uid()));

-- Events policies
CREATE POLICY "Anyone can view published events" ON public.events
  FOR SELECT USING (is_published = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage events" ON public.events
  FOR ALL USING (public.is_admin(auth.uid()));

-- Ticket types policies
CREATE POLICY "Anyone can view active ticket types" ON public.ticket_types
  FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage ticket types" ON public.ticket_types
  FOR ALL USING (public.is_admin(auth.uid()));

-- Orders policies
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage orders" ON public.orders
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- Checkins policies
CREATE POLICY "Admins can manage checkins" ON public.checkins
  FOR ALL USING (public.is_admin(auth.uid()));

-- Award programs policies
CREATE POLICY "Anyone can view published award programs" ON public.award_programs
  FOR SELECT USING (is_published = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage award programs" ON public.award_programs
  FOR ALL USING (public.is_admin(auth.uid()));

-- Award categories policies
CREATE POLICY "Anyone can view categories" ON public.award_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.award_categories
  FOR ALL USING (public.is_admin(auth.uid()));

-- Nominations policies
CREATE POLICY "Anyone can view approved nominations" ON public.nominations
  FOR SELECT USING (status IN ('submitted', 'finalist', 'winner') OR auth.uid() = submitted_by OR public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can create nominations" ON public.nominations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own nominations" ON public.nominations
  FOR UPDATE USING (auth.uid() = submitted_by OR public.is_admin(auth.uid()));

-- Judge assignments policies
CREATE POLICY "Judges can view their assignments" ON public.judge_assignments
  FOR SELECT USING (auth.uid() = judge_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage judge assignments" ON public.judge_assignments
  FOR ALL USING (public.is_admin(auth.uid()));

-- Scores policies
CREATE POLICY "Judges can view and manage their scores" ON public.scores
  FOR ALL USING (auth.uid() = judge_id OR public.is_admin(auth.uid()));

-- Public votes policies
CREATE POLICY "Anyone can view vote counts" ON public.public_votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON public.public_votes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Sponsors policies
CREATE POLICY "Anyone can view sponsors" ON public.sponsors
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage sponsors" ON public.sponsors
  FOR ALL USING (public.is_admin(auth.uid()));

-- Sponsor packages policies
CREATE POLICY "Anyone can view active packages" ON public.sponsor_packages
  FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage packages" ON public.sponsor_packages
  FOR ALL USING (public.is_admin(auth.uid()));

-- Sponsorship deals policies
CREATE POLICY "Admins can manage deals" ON public.sponsorship_deals
  FOR ALL USING (public.is_admin(auth.uid()));

-- Proposals policies
CREATE POLICY "Admins can manage proposals" ON public.proposals
  FOR ALL USING (public.is_admin(auth.uid()));

-- AI workflows policies
CREATE POLICY "Users can view their own workflows" ON public.ai_workflows
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create workflows" ON public.ai_workflows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage workflows" ON public.ai_workflows
  FOR ALL USING (public.is_admin(auth.uid()));

-- Trigger to create profile and assign default role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'attendee');
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_award_programs_updated_at BEFORE UPDATE ON public.award_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nominations_updated_at BEFORE UPDATE ON public.nominations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sponsors_updated_at BEFORE UPDATE ON public.sponsors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sponsorship_deals_updated_at BEFORE UPDATE ON public.sponsorship_deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();