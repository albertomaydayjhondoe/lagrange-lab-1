-- Create saved_dialogues table for storing Socratic dialogues
CREATE TABLE public.saved_dialogues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  eje TEXT,
  dialogue_content JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_dialogues ENABLE ROW LEVEL SECURITY;

-- Users can view their own dialogues
CREATE POLICY "Users can view their own dialogues" 
ON public.saved_dialogues 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own dialogues
CREATE POLICY "Users can insert their own dialogues" 
ON public.saved_dialogues 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own dialogues
CREATE POLICY "Users can update their own dialogues" 
ON public.saved_dialogues 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own dialogues
CREATE POLICY "Users can delete their own dialogues" 
ON public.saved_dialogues 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admin can view all dialogues
CREATE POLICY "Admin can view all dialogues"
ON public.saved_dialogues
FOR SELECT
USING (public.is_admin_user());

-- Admin can update all dialogues
CREATE POLICY "Admin can update all dialogues"
ON public.saved_dialogues
FOR UPDATE
USING (public.is_admin_user());

-- Admin can delete all dialogues
CREATE POLICY "Admin can delete all dialogues"
ON public.saved_dialogues
FOR DELETE
USING (public.is_admin_user());

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_saved_dialogues_updated_at
BEFORE UPDATE ON public.saved_dialogues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();