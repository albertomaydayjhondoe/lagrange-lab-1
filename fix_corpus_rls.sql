-- Fix corpus_fragments RLS policies
-- Run in Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can read corpus fragments" ON corpus_fragments;
DROP POLICY IF EXISTS "Service role can manage corpus fragments" ON corpus_fragments;

-- Create permissive read policy (anyone can read)
CREATE POLICY "Public read corpus fragments"
ON corpus_fragments FOR SELECT
TO authenticated, anon, service_role
USING (true);

-- Create insert policy for service role only
CREATE POLICY "Service role can insert corpus"
ON corpus_fragments FOR INSERT
TO service_role
WITH CHECK (true);

-- Create update policy for service role
CREATE POLICY "Service role can update corpus"
ON corpus_fragments FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Create delete policy for service role
CREATE POLICY "Service role can delete corpus"
ON corpus_fragments FOR DELETE
TO service_role
USING (true);

-- Verify policies
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'corpus_fragments';
