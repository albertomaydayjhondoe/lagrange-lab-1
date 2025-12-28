-- Create storage bucket for podcast episodes
INSERT INTO storage.buckets (id, name, public)
VALUES ('podcast-episodes', 'podcast-episodes', true);

-- Storage policies for podcast episodes
CREATE POLICY "Anyone can view podcast episodes"
ON storage.objects FOR SELECT
USING (bucket_id = 'podcast-episodes');

CREATE POLICY "Admin can upload podcast episodes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'podcast-episodes' AND is_admin_user());

CREATE POLICY "Admin can update podcast episodes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'podcast-episodes' AND is_admin_user());

CREATE POLICY "Admin can delete podcast episodes"
ON storage.objects FOR DELETE
USING (bucket_id = 'podcast-episodes' AND is_admin_user());

-- Create podcast episodes table
CREATE TABLE public.podcast_episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  question_ids TEXT[] DEFAULT '{}',
  eje TEXT,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view published episodes"
ON public.podcast_episodes FOR SELECT
USING (published = true OR is_admin_user());

CREATE POLICY "Admin can insert episodes"
ON public.podcast_episodes FOR INSERT
WITH CHECK (is_admin_user());

CREATE POLICY "Admin can update episodes"
ON public.podcast_episodes FOR UPDATE
USING (is_admin_user());

CREATE POLICY "Admin can delete episodes"
ON public.podcast_episodes FOR DELETE
USING (is_admin_user());

-- Trigger for updated_at
CREATE TRIGGER update_podcast_episodes_updated_at
BEFORE UPDATE ON public.podcast_episodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();