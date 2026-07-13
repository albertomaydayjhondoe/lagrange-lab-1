-- =============================================================================
-- FIX RLS: Replace is_admin_user() hardcodeado con academy_members
-- =============================================================================
-- Timestamp: 20260713000000 (después de 20260712230000_add_academies_multi_tenant)
-- Propósito: Eliminar dependencia de email hardcodeado sampayo@gmail.com
--            para permisos de academia. Ahora usa academy_members.role
--            para decidir quién puede INSERT/UPDATE/DELETE contenido.
--
-- TABLAS AFECTADAS:
--   - topology_nodes    (academy_id: 20251228140555)
--   - topology_edges    (academy_id: 20251228140555)
--   - socratic_questions (academy_id: 20251228140555)
--   - thematic_axes     (academy_id: 20251228154856)
--   - podcast_episodes  (academy_id: 20251228143325)
--
-- CASOS MANTENIDOS CON is_admin_user():
--   - saved_dialogues: no tiene academy_id, usa user_id directamente
--   - Storage buckets: permisos de plataforma, no de academia
-- =============================================================================

-- =============================================================================
-- 1. topology_nodes — drop policies old + recreate with academy_members
-- =============================================================================
DROP POLICY IF EXISTS "Admin can insert nodes" ON public.topology_nodes;
DROP POLICY IF EXISTS "Admin can update nodes" ON public.topology_nodes;
DROP POLICY IF EXISTS "Admin can delete nodes" ON public.topology_nodes;

CREATE POLICY "Academy member can insert nodes"
ON public.topology_nodes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = topology_nodes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Academy member can update nodes"
ON public.topology_nodes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = topology_nodes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Academy member can delete nodes"
ON public.topology_nodes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = topology_nodes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

-- =============================================================================
-- 2. topology_edges — drop + recreate
-- =============================================================================
DROP POLICY IF EXISTS "Admin can insert edges" ON public.topology_edges;
DROP POLICY IF EXISTS "Admin can update edges" ON public.topology_edges;
DROP POLICY IF EXISTS "Admin can delete edges" ON public.topology_edges;

CREATE POLICY "Academy member can insert edges"
ON public.topology_edges
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = topology_edges.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Academy member can update edges"
ON public.topology_edges
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = topology_edges.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Academy member can delete edges"
ON public.topology_edges
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = topology_edges.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

-- =============================================================================
-- 3. socratic_questions — drop + recreate
-- =============================================================================
DROP POLICY IF EXISTS "Admin can insert questions" ON public.socratic_questions;
DROP POLICY IF EXISTS "Admin can update questions" ON public.socratic_questions;
DROP POLICY IF EXISTS "Admin can delete questions" ON public.socratic_questions;

CREATE POLICY "Academy member can insert questions"
ON public.socratic_questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = socratic_questions.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Academy member can update questions"
ON public.socratic_questions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = socratic_questions.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Academy member can delete questions"
ON public.socratic_questions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = socratic_questions.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

-- =============================================================================
-- 4. thematic_axes — drop + recreate
-- =============================================================================
DROP POLICY IF EXISTS "Admin can insert axes" ON public.thematic_axes;
DROP POLICY IF EXISTS "Admin can update axes" ON public.thematic_axes;
DROP POLICY IF EXISTS "Admin can delete axes" ON public.thematic_axes;

CREATE POLICY "Academy member can insert axes"
ON public.thematic_axes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = thematic_axes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Academy member can update axes"
ON public.thematic_axes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = thematic_axes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Academy member can delete axes"
ON public.thematic_axes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = thematic_axes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

-- =============================================================================
-- 5. podcast_episodes — drop + recreate
-- =============================================================================
DROP POLICY IF EXISTS "Admin can insert episodes" ON public.podcast_episodes;
DROP POLICY IF EXISTS "Admin can update episodes" ON public.podcast_episodes;
DROP POLICY IF EXISTS "Admin can delete episodes" ON public.podcast_episodes;

CREATE POLICY "Academy member can insert episodes"
ON public.podcast_episodes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = podcast_episodes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Academy member can update episodes"
ON public.podcast_episodes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = podcast_episodes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Academy member can delete episodes"
ON public.podcast_episodes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = podcast_episodes.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

-- =============================================================================
-- 6. is_admin_user() — DEPRECATED para permisos de academia
-- =============================================================================
-- is_admin_user() sigue existiendo para casos excepcionales de plataforma:
--   - Gestión de buckets de storage (supabase/storage)
--   - saved_dialogues (tabla sin academy_id, basada en user_id)
-- No se elimina para no romper políticas existentes en esos contextos.
-- Para permisos de academia, usar siempre academy_members.role IN ('owner','admin').
