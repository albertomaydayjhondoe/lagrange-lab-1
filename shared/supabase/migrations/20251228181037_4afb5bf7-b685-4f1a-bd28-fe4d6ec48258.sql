-- Add column to mark dialogues selected for podcast production
ALTER TABLE public.saved_dialogues 
ADD COLUMN IF NOT EXISTS selected_for_podcast boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS curated_text text,
ADD COLUMN IF NOT EXISTS word_count integer DEFAULT 0;