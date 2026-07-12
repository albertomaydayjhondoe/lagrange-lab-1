-- RAG Support: Add embeddings and source tracking to corpus_fragments
-- Requires pgvector extension

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add columns to corpus_fragments for RAG support
ALTER TABLE public.corpus_fragments
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'seed' CHECK (source_type IN ('seed', 'user_upload')),
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS user_upload_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS upload_status TEXT DEFAULT 'completed' CHECK (upload_status IN ('pending', 'processing', 'completed', 'error')),
ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_corpus_fragments_embedding 
ON public.corpus_fragments USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for source type queries
CREATE INDEX IF NOT EXISTS idx_corpus_fragments_source_type 
ON public.corpus_fragments(source_type);

-- Create index for upload status
CREATE INDEX IF NOT EXISTS idx_corpus_fragments_upload_status 
ON public.corpus_fragments(upload_status) WHERE upload_status != 'completed';

-- Update existing fragments to mark as 'seed' type
UPDATE public.corpus_fragments 
SET source_type = 'seed' 
WHERE source_type IS NULL;

-- Add RLS for embeddings (same as corpus_fragments base)
DROP POLICY IF EXISTS "corpus_fragments_insert" ON public.corpus_fragments;
CREATE POLICY "corpus_fragments_insert" ON public.corpus_fragments FOR INSERT
WITH CHECK (
  academy_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = corpus_fragments.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin', 'platon')
  )
);

-- Allow users to update their own uploads
DROP POLICY IF EXISTS "corpus_fragments_update" ON public.corpus_fragments;
CREATE POLICY "corpus_fragments_update" ON public.corpus_fragments FOR UPDATE
USING (
  user_upload_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = corpus_fragments.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

-- Allow deletion of own uploads or by admin
DROP POLICY IF EXISTS "corpus_fragments_delete" ON public.corpus_fragments;
CREATE POLICY "corpus_fragments_delete" ON public.corpus_fragments FOR DELETE
USING (
  user_upload_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = corpus_fragments.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);
