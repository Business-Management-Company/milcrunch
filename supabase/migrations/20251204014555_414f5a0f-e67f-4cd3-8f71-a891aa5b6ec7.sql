-- Create email_signups table for storing reminder signups and notes
CREATE TABLE public.email_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'general',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_signups ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public signup forms)
CREATE POLICY "Anyone can submit email signups"
ON public.email_signups
FOR INSERT
WITH CHECK (true);

-- Only admins can view signups
CREATE POLICY "Admins can view email signups"
ON public.email_signups
FOR SELECT
USING (is_admin(auth.uid()));

-- Only admins can update signups
CREATE POLICY "Admins can update email signups"
ON public.email_signups
FOR UPDATE
USING (is_admin(auth.uid()));

-- Only admins can delete signups
CREATE POLICY "Admins can delete email signups"
ON public.email_signups
FOR DELETE
USING (is_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_signups_updated_at
BEFORE UPDATE ON public.email_signups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();