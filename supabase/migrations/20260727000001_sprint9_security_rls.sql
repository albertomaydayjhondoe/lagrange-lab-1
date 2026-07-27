-- ================================================================
-- SPRINT 9: SEGURIDAD RLS - AUDITORÍA Y CORRECCIÓN
-- ================================================================
-- Objetivo: Corregir policies abiertas y auditar seguridad
-- Fecha: 2026-07-27
-- ================================================================

-- 1. Función helper para verificar membresía de academia (evita recursión)
CREATE OR REPLACE FUNCTION public.user_is_academy_member(p_academy_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_members 
    WHERE academy_id = p_academy_id 
    AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Dar acceso a la función para usuarios autenticados
GRANT EXECUTE ON FUNCTION public.user_is_academy_member(uuid) TO authenticated, service_role;

-- 2. Función helper para verificar si es owner de academia
CREATE OR REPLACE FUNCTION public.user_is_academy_owner(p_academy_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academies 
    WHERE id = p_academy_id 
    AND owner_user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.user_is_academy_owner(uuid) TO authenticated, service_role;

-- 3. Función helper para verificar rol de admin
CREATE OR REPLACE FUNCTION public.user_has_admin_role()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.user_has_admin_role() TO authenticated, service_role;

-- 4. Función helper para verificar platform admin
CREATE OR REPLACE FUNCTION public.user_is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins 
    WHERE user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.user_is_platform_admin() TO authenticated, service_role;

-- ================================================================
-- RLS POLICIES - academies
-- ================================================================

-- Dropear policies existentes para recrearlas de forma segura
DROP POLICY IF EXISTS "Public academies are viewable by everyone" ON public.academies;
DROP POLICY IF EXISTS "Anyone can create academies" ON public.academies;
DROP POLICY IF EXISTS "Owners can view their own academies" ON public.academies;
DROP POLICY IF EXISTS "Owners can update their academies" ON public.academies;
DROP POLICY IF EXISTS "Owners can delete their academies" ON public.academies;
DROP POLICY IF EXISTS "Allow public select academies" ON public.academies;

-- SELECT: Academias públicas o donde el usuario es miembro
CREATE POLICY "academies_select_public_or_member"
  ON public.academies FOR SELECT
  USING (
    is_public = true 
    OR user_is_academy_owner(id)
    OR user_is_academy_member(id)
  );

-- INSERT: Cualquier usuario autenticado puede crear academias
CREATE POLICY "academies_insert_authenticated"
  ON public.academies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Solo owners pueden actualizar
CREATE POLICY "academies_update_owner"
  ON public.academies FOR UPDATE
  USING (user_is_academy_owner(id));

-- DELETE: Solo owners pueden eliminar
CREATE POLICY "academies_delete_owner"
  ON public.academies FOR DELETE
  USING (user_is_academy_owner(id));

-- ================================================================
-- RLS POLICIES - academy_members
-- ================================================================

-- Dropear policies existentes
DROP POLICY IF EXISTS "Members can view own memberships" ON public.academy_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON public.academy_members;
DROP POLICY IF EXISTS "Members can update own membership" ON public.academy_members;
DROP POLICY IF EXISTS "Members can delete own membership" ON public.academy_members;

-- SELECT: Usuarios pueden ver sus propias membresías
CREATE POLICY "academy_members_select_own"
  ON public.academy_members FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Usuarios pueden crear su propia membresía
CREATE POLICY "academy_members_insert_own"
  ON public.academy_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Usuarios pueden actualizar su propia membresía
CREATE POLICY "academy_members_update_own"
  ON public.academy_members FOR UPDATE
  USING (user_id = auth.uid());

-- DELETE: Usuarios pueden eliminar su propia membresía
CREATE POLICY "academy_members_delete_own"
  ON public.academy_members FOR DELETE
  USING (user_id = auth.uid());

-- ================================================================
-- RLS POLICIES - profiles
-- ================================================================

-- Dropear policies existentes
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;

-- SELECT: Usuarios pueden ver sus propios perfiles
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- INSERT: Usuarios pueden crear sus propios perfiles
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- UPDATE: Usuarios pueden actualizar sus propios perfiles
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- ================================================================
-- RLS POLICIES - platform_admins
-- ================================================================

-- Habilitar RLS si no está habilitado
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Dropear policies existentes
DROP POLICY IF EXISTS "platform_admins_select_admin" ON public.platform_admins;

-- SELECT: Solo admins de academia pueden ver platform_admins
CREATE POLICY "platform_admins_select_member_admin"
  ON public.platform_admins FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.user_id = auth.uid()
      AND am.role = 'admin'
    )
  );

-- ================================================================
-- RLS POLICIES - topology_nodes
-- ================================================================

-- Dropear policies existentes
DROP POLICY IF EXISTS "topology_nodes_select_public" ON public.topology_nodes;
DROP POLICY IF EXISTS "topology_nodes_insert_authenticated" ON public.topology_nodes;
DROP POLICY IF EXISTS "topology_nodes_update_creator" ON public.topology_nodes;
DROP POLICY IF EXISTS "topology_nodes_delete_creator" ON public.topology_nodes;

-- SELECT: Todos pueden ver nodos
CREATE POLICY "topology_nodes_select_all"
  ON public.topology_nodes FOR SELECT
  USING (true);

-- INSERT: Usuarios autenticados pueden crear
CREATE POLICY "topology_nodes_insert_auth"
  ON public.topology_nodes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Solo el creador puede actualizar
CREATE POLICY "topology_nodes_update_creator"
  ON public.topology_nodes FOR UPDATE
  USING (created_by = auth.uid() OR user_has_admin_role());

-- DELETE: Solo el creador puede eliminar
CREATE POLICY "topology_nodes_delete_creator"
  ON public.topology_nodes FOR DELETE
  USING (created_by = auth.uid() OR user_has_admin_role());

-- ================================================================
-- RLS POLICIES - topology_edges
-- ================================================================

ALTER TABLE public.topology_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "topology_edges_select_all" ON public.topology_edges;
DROP POLICY IF EXISTS "topology_edges_insert_auth" ON public.topology_edges;
DROP POLICY IF EXISTS "topology_edges_update_creator" ON public.topology_edges;
DROP POLICY IF EXISTS "topology_edges_delete_creator" ON public.topology_edges;

CREATE POLICY "topology_edges_select_all"
  ON public.topology_edges FOR SELECT
  USING (true);

CREATE POLICY "topology_edges_insert_auth"
  ON public.topology_edges FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "topology_edges_update_creator"
  ON public.topology_edges FOR UPDATE
  USING (user_has_admin_role());

CREATE POLICY "topology_edges_delete_creator"
  ON public.topology_edges FOR DELETE
  USING (user_has_admin_role());

-- ================================================================
-- RLS POLICIES - corpus_fragments
-- ================================================================

ALTER TABLE public.corpus_fragments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "corpus_fragments_select_all" ON public.corpus_fragments;
DROP POLICY IF EXISTS "corpus_fragments_insert_auth" ON public.corpus_fragments;
DROP POLICY IF EXISTS "corpus_fragments_update_creator" ON public.corpus_fragments;

CREATE POLICY "corpus_fragments_select_all"
  ON public.corpus_fragments FOR SELECT
  USING (true);

CREATE POLICY "corpus_fragments_insert_auth"
  ON public.corpus_fragments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "corpus_fragments_update_creator"
  ON public.corpus_fragments FOR UPDATE
  USING (created_by = auth.uid() OR user_has_admin_role());

-- ================================================================
-- RLS POLICIES - socratic_questions
-- ================================================================

ALTER TABLE public.socratic_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "socratic_questions_select_all" ON public.socratic_questions;

CREATE POLICY "socratic_questions_select_all"
  ON public.socratic_questions FOR SELECT
  USING (true);

-- ================================================================
-- RLS POLICIES - saved_dialogues
-- ================================================================

ALTER TABLE public.saved_dialogues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_dialogues_select_own" ON public.saved_dialogues;
DROP POLICY IF EXISTS "saved_dialogues_insert_own" ON public.saved_dialogues;
DROP POLICY IF EXISTS "saved_dialogues_update_own" ON public.saved_dialogues;
DROP POLICY IF EXISTS "saved_dialogues_delete_own" ON public.saved_dialogues;

CREATE POLICY "saved_dialogues_select_own"
  ON public.saved_dialogues FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "saved_dialogues_insert_own"
  ON public.saved_dialogues FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_dialogues_update_own"
  ON public.saved_dialogues FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "saved_dialogues_delete_own"
  ON public.saved_dialogues FOR DELETE
  USING (user_id = auth.uid());

-- ================================================================
-- VERIFICACIÓN
-- ================================================================

-- Listar todas las policies
SELECT 
  schemaname,
  tablename, 
  policyname, 
  permissive,
  cmd,
  CASE WHEN with_check IS NOT NULL THEN 'YES' ELSE 'NO' END as with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar trigger handle_new_user
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  TRUE as is_active
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('profiles', 'users');
