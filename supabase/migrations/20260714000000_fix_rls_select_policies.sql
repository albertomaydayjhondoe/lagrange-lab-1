-- =============================================================================
-- FIX RLS: Corregir políticas de SELECT para aislamiento multi-tenant
-- =============================================================================
-- Timestamp: 20260714000000 (después de 20260713000000_fix_rls_multi_tenant)
-- Propósito: Las políticas de SELECT actuales permiten ver contenido de cualquier
--            academia. Esto debe restringirse para que los usuarios solo puedan
--            ver contenido de academias de las que son miembros o que son públicas.
--
-- TABLAS AFECTADAS:
--   - topology_nodes: actualmente USING (true) → debe filtrar por academy
--   - topology_edges: actualmente USING (true) → debe filtrar por academy
--   - socratic_questions: actualmente USING (true) → debe filtrar por academy
--   - thematic_axes: actualmente USING (true) → debe filtrar por academy
--   - podcast_episodes: actualmente (published = true OR is_admin_user())
--   - corpus_fragments: actualmente USING (true) → debe filtrar por academy
--
-- CASOS MANTENIDOS:
--   - academies: ya tiene políticas correctas para públicas/privadas
--   - academy_members: ya tiene políticas correctas
--   - saved_dialogues: sin academy_id, usa user_id directamente
--   - Storage buckets: permisos de plataforma, no de academia
-- =============================================================================

-- =============================================================================
-- Helper: función para verificar si usuario es miembro o admin de academia
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_academy_member_or_admin(p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_id = p_academy_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member', 'platon')
  )
$$;

-- =============================================================================
-- 1. topology_nodes — corregir policy de SELECT
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can view nodes" ON public.topology_nodes;

-- Cualquiera puede ver nodos de academias públicas o de las que es miembro
CREATE POLICY "Members can view nodes"
ON public.topology_nodes
FOR SELECT
USING (
  -- Es miembro de la academia
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = topology_nodes.academy_id
    AND academy_members.user_id = auth.uid()
  )
  OR
  -- O la academia es pública
  EXISTS (
    SELECT 1 FROM public.academies
    WHERE academies.id = topology_nodes.academy_id
    AND academies.is_public = true
  )
);

-- =============================================================================
-- 2. topology_edges — corregir policy de SELECT
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can view edges" ON public.topology_edges;

-- Cualquiera puede ver aristas de academias públicas o de las que es miembro
CREATE POLICY "Members can view edges"
ON public.topology_edges
FOR SELECT
USING (
  -- Es miembro de la academia
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = topology_edges.academy_id
    AND academy_members.user_id = auth.uid()
  )
  OR
  -- O la academia es pública
  EXISTS (
    SELECT 1 FROM public.academies
    WHERE academies.id = topology_edges.academy_id
    AND academies.is_public = true
  )
);

-- =============================================================================
-- 3. socratic_questions — corregir policy de SELECT
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can view questions" ON public.socratic_questions;

-- Cualquiera puede ver preguntas de academias públicas o de las que es miembro
CREATE POLICY "Members can view questions"
ON public.socratic_questions
FOR SELECT
USING (
  -- Es miembro de la academia
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = socratic_questions.academy_id
    AND academy_members.user_id = auth.uid()
  )
  OR
  -- O la academia es pública
  EXISTS (
    SELECT 1 FROM public.academies
    WHERE academies.id = socratic_questions.academy_id
    AND academies.is_public = true
  )
);

-- =============================================================================
-- 4. thematic_axes — corregir policy de SELECT
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can view axes" ON public.thematic_axes;

-- Cualquiera puede ver ejes de academias públicas o de las que es miembro
CREATE POLICY "Members can view axes"
ON public.thematic_axes
FOR SELECT
USING (
  -- Es miembro de la academia
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = thematic_axes.academy_id
    AND academy_members.user_id = auth.uid()
  )
  OR
  -- O la academia es pública
  EXISTS (
    SELECT 1 FROM public.academies
    WHERE academies.id = thematic_axes.academy_id
    AND academies.is_public = true
  )
);

-- =============================================================================
-- 5. podcast_episodes — corregir policy de SELECT
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can view published episodes" ON public.podcast_episodes;

-- Episodios publicados visibles para miembros de la academia o anyone en academias públicas
-- No publicados solo visibles para miembros de la academia
CREATE POLICY "Members can view episodes"
ON public.podcast_episodes
FOR SELECT
USING (
  -- Episodio publicado Y academia pública
  (published = true AND EXISTS (
    SELECT 1 FROM public.academies
    WHERE academies.id = podcast_episodes.academy_id
    AND academies.is_public = true
  ))
  OR
  -- O es miembro de la academia (ve todos los episodios de su academia)
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = podcast_episodes.academy_id
    AND academy_members.user_id = auth.uid()
  )
);

-- =============================================================================
-- 6. corpus_fragments — corregir policy de SELECT
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated users can read corpus fragments" ON corpus_fragments;

-- Fragmentos visibles para miembros de academia o academias públicas
CREATE POLICY "Members can view corpus fragments"
ON corpus_fragments
FOR SELECT
USING (
  -- Es miembro de la academia
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = corpus_fragments.academy_id
    AND academy_members.user_id = auth.uid()
  )
  OR
  -- O la academia es pública
  EXISTS (
    SELECT 1 FROM public.academies
    WHERE academies.id = corpus_fragments.academy_id
    AND academies.is_public = true
  )
);

-- =============================================================================
-- 7. user_interactions — policies correctas (ya basadas en user_id)
-- =============================================================================
-- Verificar si existe la policy y crear si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own interactions'
    AND tablename = 'user_interactions'
  ) THEN
    CREATE POLICY "Users can view own interactions"
    ON public.user_interactions
    FOR SELECT
    USING (user_id = auth.uid());
  END IF;
END $$;

-- =============================================================================
-- 8. access_requests — policies correctas (ya basadas en academy)
-- =============================================================================
-- Verificar si existe la policy y crear si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Members can view access requests'
    AND tablename = 'access_requests'
  ) THEN
    CREATE POLICY "Members can view access requests"
    ON public.access_requests
    FOR SELECT
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.academy_members
        WHERE academy_members.academy_id = access_requests.academy_id
        AND academy_members.user_id = auth.uid()
        AND academy_members.role IN ('owner', 'admin')
      )
    );
  END IF;
END $$;

-- =============================================================================
-- FIN
-- =============================================================================
