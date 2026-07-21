-- Fix RLS policies for corpus_fragments to allow public read
DROP POLICY IF EXISTS "Authenticated users can read corpus fragments" ON corpus_fragments;
DROP POLICY IF EXISTS "Service role can manage corpus fragments" ON corpus_fragments;

-- Allow anyone to read corpus fragments
CREATE POLICY "Anyone can read corpus fragments"
ON corpus_fragments FOR SELECT
USING (true);

-- Service role can insert/update/delete
CREATE POLICY "Service role can manage corpus fragments"
ON corpus_fragments FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'corpus_fragments';
