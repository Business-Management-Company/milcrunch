-- Podcasts table for RSS feed directory
CREATE TABLE public.podcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_url TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  author TEXT,
  artwork_url TEXT,
  website_url TEXT,
  category TEXT,
  language TEXT DEFAULT 'en',
  episode_count INTEGER,
  last_episode_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Podcast episodes (latest per feed)
CREATE TABLE public.podcast_episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  audio_url TEXT,
  duration TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  episode_artwork_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_podcast_episodes_podcast_id ON public.podcast_episodes(podcast_id);
CREATE INDEX idx_podcasts_status ON public.podcasts(status);
CREATE INDEX idx_podcasts_category ON public.podcasts(category);

-- Enable RLS
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;

-- Public read for podcasts
CREATE POLICY "Public can view podcasts" ON public.podcasts
  FOR SELECT USING (true);

-- Authenticated users can insert/update/delete podcasts
CREATE POLICY "Authenticated can insert podcasts" ON public.podcasts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update podcasts" ON public.podcasts
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete podcasts" ON public.podcasts
  FOR DELETE USING (auth.role() = 'authenticated');

-- Public read for episodes
CREATE POLICY "Public can view podcast_episodes" ON public.podcast_episodes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert podcast_episodes" ON public.podcast_episodes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update podcast_episodes" ON public.podcast_episodes
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete podcast_episodes" ON public.podcast_episodes
  FOR DELETE USING (auth.role() = 'authenticated');

-- Updated_at trigger for podcasts
CREATE TRIGGER update_podcasts_updated_at
  BEFORE UPDATE ON public.podcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
