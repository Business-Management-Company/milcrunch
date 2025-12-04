-- Create hotel_room_blocks table for managing hotel partnerships
CREATE TABLE public.hotel_room_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  hotel_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  phone TEXT,
  website TEXT,
  booking_link TEXT,
  booking_code TEXT,
  rate_per_night NUMERIC,
  block_size INTEGER,
  rooms_booked INTEGER DEFAULT 0,
  check_in_date DATE,
  check_out_date DATE,
  cutoff_date DATE,
  amenities JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create airport_info table for event travel details
CREATE TABLE public.airport_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  airport_code TEXT NOT NULL,
  airport_name TEXT NOT NULL,
  distance_miles NUMERIC,
  drive_time_minutes INTEGER,
  transportation_options JSONB DEFAULT '[]'::jsonb,
  rideshare_estimate TEXT,
  shuttle_info TEXT,
  rental_car_info TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hotel_room_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airport_info ENABLE ROW LEVEL SECURITY;

-- RLS policies for hotel_room_blocks
CREATE POLICY "Anyone can view active hotel blocks" ON public.hotel_room_blocks
  FOR SELECT USING (is_active = true OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage hotel blocks" ON public.hotel_room_blocks
  FOR ALL USING (is_admin(auth.uid()));

-- RLS policies for airport_info
CREATE POLICY "Anyone can view airport info" ON public.airport_info
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage airport info" ON public.airport_info
  FOR ALL USING (is_admin(auth.uid()));

-- Add updated_at trigger for hotel_room_blocks
CREATE TRIGGER update_hotel_room_blocks_updated_at
  BEFORE UPDATE ON public.hotel_room_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();