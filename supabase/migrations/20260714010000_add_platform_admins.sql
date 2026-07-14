-- =============================================================================
-- ADD PLATFORM ADMINS TABLE
-- =============================================================================
-- Timestamp: 20260714010000
-- Purpose: Restore global admin functionality that was lost when we removed
-- the hardcoded email check. Platform admins have full access to ALL academies
-- regardless of membership.
--
-- This replaces the old is_admin_user() hardcoded email with a proper table.
-- =============================================================================

-- Create platform_admins table
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Anyone can view platform admins (needed for UI)
CREATE POLICY "Anyone can view platform admins"
ON public.platform_admins FOR SELECT
USING (true);

-- Only existing platform admins can manage platform admins
CREATE POLICY "Platform admins can manage platform admins"
ON public.platform_admins FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid()
  )
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_platform_admins_user ON public.platform_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON public.platform_admins(email);

-- =============================================================================
-- UPDATE is_admin_user() FUNCTION
-- =============================================================================
-- Now checks the platform_admins table instead of hardcoded email
-- Using CREATE OR REPLACE to avoid breaking dependencies
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'sampayo@gmail.com'
  )
$$;

-- =============================================================================
-- GRANT PLATFORM ADMIN TO EXISTING HARDCODED USER
-- =============================================================================
-- Insert the hardcoded email as a platform admin (will be ignored if already exists)
INSERT INTO public.platform_admins (email)
VALUES ('sampayo@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- UPDATE RLS POLICIES TO INCLUDE PLATFORM ADMINS
-- =============================================================================

-- topology_nodes: add platform admin bypass
DROP POLICY IF EXISTS "Academy member can insert nodes" ON public.topology_nodes;
CREATE POLICY "Academy member can insert nodes"
ON public.topology_nodes
FOR INSERT
WITH CHECK (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = topology_nodes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Academy member can update nodes" ON public.topology_nodes;
CREATE POLICY "Academy member can update nodes"
ON public.topology_nodes
FOR UPDATE
USING (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = topology_nodes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Academy member can delete nodes" ON public.topology_nodes;
CREATE POLICY "Academy member can delete nodes"
ON public.topology_nodes
FOR DELETE
USING (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = topology_nodes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

-- topology_edges
DROP POLICY IF EXISTS "Academy member can insert edges" ON public.topology_edges;
CREATE POLICY "Academy member can insert edges"
ON public.topology_edges
FOR INSERT
WITH CHECK (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = topology_edges.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Academy member can update edges" ON public.topology_edges;
CREATE POLICY "Academy member can update edges"
ON public.topology_edges
FOR UPDATE
USING (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = topology_edges.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Academy member can delete edges" ON public.topology_edges;
CREATE POLICY "Academy member can delete edges"
ON public.topology_edges
FOR DELETE
USING (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = topology_edges.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

-- socratic_questions
DROP POLICY IF EXISTS "Academy member can insert questions" ON public.socratic_questions;
CREATE POLICY "Academy member can insert questions"
ON public.socratic_questions
FOR INSERT
WITH CHECK (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = socratic_questions.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Academy member can update questions" ON public.socratic_questions;
CREATE POLICY "Academy member can update questions"
ON public.socratic_questions
FOR UPDATE
USING (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = socratic_questions.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Academy member can delete questions" ON public.socratic_questions;
CREATE POLICY "Academy member can delete questions"
ON public.socratic_questions
FOR DELETE
USING (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = socratic_questions.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

-- thematic_axes
DROP POLICY IF EXISTS "Academy member can insert axes" ON public.thematic_axes;
CREATE POLICY "Academy member can insert axes"
ON public.thematic_axes
FOR INSERT
WITH CHECK (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = thematic_axes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Academy member can update axes" ON public.thematic_axes;
CREATE POLICY "Academy member can update axes"
ON public.thematic_axes
FOR UPDATE
USING (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = thematic_axes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Academy member can delete axes" ON public.thematic_axes;
CREATE POLICY "Academy member can delete axes"
ON public.thematic_axes
FOR DELETE
USING (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = thematic_axes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

-- podcast_episodes
DROP POLICY IF EXISTS "Academy member can insert episodes" ON public.podcast_episodes;
CREATE POLICY "Academy member can insert episodes"
ON public.podcast_episodes
FOR INSERT
WITH CHECK (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = podcast_episodes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Academy member can update episodes" ON public.podcast_episodes;
CREATE POLICY "Academy member can update episodes"
ON public.podcast_episodes
FOR UPDATE
USING (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = podcast_episodes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Academy member can delete episodes" ON public.podcast_episodes;
CREATE POLICY "Academy member can delete episodes"
ON public.podcast_episodes
FOR DELETE
USING (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = podcast_episodes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

-- =============================================================================
-- ADD HELPER FUNCTION FOR FRONTEND
-- =============================================================================
-- Function to check if current user is platform admin (for UI purposes)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'sampayo@gmail.com'
  )
$$;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
