-- ============================================================================
-- FASE 1: Modelo de datos multi-tenant
-- ============================================================================
-- Esta migración:
-- 1. Crea tabla `academies` para aislar academias socráticas
-- 2. Crea tabla `academy_members` para membresías por academia
-- 3. Añade `academy_id` FK a todas las tablas existentes
-- 4. Migra datos existentes a academia "genesis" (la actual)
-- 5. Reescribe RLS para acceso por membresía
-- ============================================================================

-- ============================================================================
-- PARTE 1: Crear tabla academies
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  oracle_persona_prompt TEXT,  -- System prompt personalizado del oráculo
  is_public BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para academies
CREATE INDEX IF NOT EXISTS idx_academies_slug ON public.academies(slug);
CREATE INDEX IF NOT EXISTS idx_academies_owner ON public.academies(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_academies_public ON public.academies(is_public) WHERE is_public = true;

-- Habilitar RLS
ALTER TABLE public.academies ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 2: Crear tabla academy_members
-- ============================================================================
CREATE TYPE public.academy_role AS ENUM ('owner', 'admin', 'platon', 'member');

CREATE TABLE IF NOT EXISTS public.academy_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role academy_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (academy_id, user_id)
);

-- Índices para academy_members
CREATE INDEX IF NOT EXISTS idx_academy_members_academy ON public.academy_members(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_members_user ON public.academy_members(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_members_role ON public.academy_members(role);

-- Habilitar RLS
ALTER TABLE public.academy_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 3: Añadir academy_id a todas las tablas existentes
-- ============================================================================

-- thematic_axes
ALTER TABLE public.thematic_axes 
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;

-- topology_nodes
ALTER TABLE public.topology_nodes 
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;

-- topology_edges (necesita FK a topology_nodes)
ALTER TABLE public.topology_edges 
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;

-- socratic_questions
ALTER TABLE public.socratic_questions 
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;

-- saved_dialogues
ALTER TABLE public.saved_dialogues 
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;

-- podcast_episodes
ALTER TABLE public.podcast_episodes 
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;

-- user_interactions
ALTER TABLE public.user_interactions 
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;

-- access_requests
ALTER TABLE public.access_requests 
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;

-- corpus_fragments
ALTER TABLE public.corpus_fragments 
ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE;

-- Índices para academy_id en todas las tablas
CREATE INDEX IF NOT EXISTS idx_thematic_axes_academy ON public.thematic_axes(academy_id);
CREATE INDEX IF NOT EXISTS idx_topology_nodes_academy ON public.topology_nodes(academy_id);
CREATE INDEX IF NOT EXISTS idx_topology_edges_academy ON public.topology_edges(academy_id);
CREATE INDEX IF NOT EXISTS idx_socratic_questions_academy ON public.socratic_questions(academy_id);
CREATE INDEX IF NOT EXISTS idx_saved_dialogues_academy ON public.saved_dialogues(academy_id);
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_academy ON public.podcast_episodes(academy_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_academy ON public.user_interactions(academy_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_academy ON public.access_requests(academy_id);
CREATE INDEX IF NOT EXISTS idx_corpus_fragments_academy ON public.corpus_fragments(academy_id);

-- ============================================================================
-- PARTE 4: Crear academia "genesis" y migrar datos existentes
-- ============================================================================

-- Insertar academia genesis (la actual con 5 ejes fijos)
INSERT INTO public.academies (id, slug, name, description, owner_user_id, oracle_persona_prompt, is_public)
VALUES (
  '00000000-0000-0000-0000-000000000001',  -- ID fijo para genesis
  'genesis',
  'Academia Génesis',
  'La academia socrática original con los 5 ejes de tensión fundamentales: Miedo, Control, Salud Mental, Legitimidad y Responsabilidad.',
  NULL,  -- El owner se actualizará después
  NULL,  -- Usa el prompt base del Architect
  true   -- Pública para que todos puedan ver
) ON CONFLICT (slug) DO NOTHING;

-- Función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para academies
DROP TRIGGER IF EXISTS update_academies_updated_at ON public.academies;
CREATE TRIGGER update_academies_updated_at
  BEFORE UPDATE ON public.academies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migra todos los datos existentes a genesis (academy_id = '00000000-0000-0000-0000-000000000001')
UPDATE public.thematic_axes SET academy_id = '00000000-0000-0000-0000-000000000001' WHERE academy_id IS NULL;
UPDATE public.topology_nodes SET academy_id = '00000000-0000-0000-0000-000000000001' WHERE academy_id IS NULL;
UPDATE public.topology_edges SET academy_id = '00000000-0000-0000-0000-000000000001' WHERE academy_id IS NULL;
UPDATE public.socratic_questions SET academy_id = '00000000-0000-0000-0000-000000000001' WHERE academy_id IS NULL;
UPDATE public.saved_dialogues SET academy_id = '00000000-0000-0000-0000-000000000001' WHERE academy_id IS NULL;
UPDATE public.podcast_episodes SET academy_id = '00000000-0000-0000-0000-000000000001' WHERE academy_id IS NULL;
UPDATE public.user_interactions SET academy_id = '00000000-0000-0000-0000-000000000001' WHERE academy_id IS NULL;
UPDATE public.access_requests SET academy_id = '00000000-0000-0000-0000-000000000001' WHERE academy_id IS NULL;
UPDATE public.corpus_fragments SET academy_id = '00000000-0000-0000-0000-000000000001' WHERE academy_id IS NULL;

-- Hacer academy_id NOT NULL después de la migración
ALTER TABLE public.thematic_axes ALTER COLUMN academy_id SET NOT NULL;
ALTER TABLE public.topology_nodes ALTER COLUMN academy_id SET NOT NULL;
ALTER TABLE public.topology_edges ALTER COLUMN academy_id SET NOT NULL;
ALTER TABLE public.socratic_questions ALTER COLUMN academy_id SET NOT NULL;
ALTER TABLE public.saved_dialogues ALTER COLUMN academy_id SET NOT NULL;
ALTER TABLE public.podcast_episodes ALTER COLUMN academy_id SET NOT NULL;
ALTER TABLE public.user_interactions ALTER COLUMN academy_id SET NOT NULL;
ALTER TABLE public.access_requests ALTER COLUMN academy_id SET NOT NULL;
ALTER TABLE public.corpus_fragments ALTER COLUMN academy_id SET NOT NULL;

-- ============================================================================
-- PARTE 5: Migrar user_roles a academy_members
-- ============================================================================

-- Función helper para verificar si es admin global (mantener backward compatibility)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'sampayo@gmail.com'
  )
$$;

-- Insertar miembros de genesis basados en user_roles existentes
INSERT INTO public.academy_members (academy_id, user_id, role)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  ur.user_id,
  CASE 
    WHEN ur.role = 'admin' THEN 'admin'::academy_role
    WHEN ur.role = 'platon' THEN 'platon'::academy_role
    ELSE 'member'::academy_role
  END
FROM public.user_roles ur
WHERE NOT EXISTS (
  SELECT 1 FROM public.academy_members am 
  WHERE am.academy_id = '00000000-0000-0000-0000-000000000001' 
  AND am.user_id = ur.user_id
);

-- Actualizar owner de genesis al primer admin que encontremos
UPDATE public.academies 
SET owner_user_id = (
  SELECT ur.user_id FROM public.user_roles ur 
  WHERE ur.role = 'admin' 
  LIMIT 1
)
WHERE slug = 'genesis' AND owner_user_id IS NULL;

-- ============================================================================
-- PARTE 6: Reescribir RLS para todas las tablas
-- ============================================================================

-- Helper function para verificar membresía
CREATE OR REPLACE FUNCTION public.is_academy_member(p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_members am
    WHERE am.academy_id = p_academy_id
    AND am.user_id = auth.uid()
  )
$$;

-- Helper function para verificar rol en academia
CREATE OR REPLACE FUNCTION public.has_academy_role(p_academy_id UUID, p_role academy_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_members am
    WHERE am.academy_id = p_academy_id
    AND am.user_id = auth.uid()
    AND am.role = p_role
  )
$$;

-- Helper function para verificar si es owner o admin
CREATE OR REPLACE FUNCTION public.is_academy_admin(p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_members am
    WHERE am.academy_id = p_academy_id
    AND am.user_id = auth.uid()
    AND am.role IN ('owner', 'admin')
  )
$$;

-- ---- POLICIES PARA academies ----

-- Cualquiera puede ver academias públicas
DROP POLICY IF EXISTS "Anyone can view public academies" ON public.academies;
CREATE POLICY "Anyone can view public academies"
ON public.academies FOR SELECT
USING (is_public = true OR is_academy_member(id) OR is_admin_user());

-- Miembros pueden ver academias privadas donde son miembros
DROP POLICY IF EXISTS "Members can view their academies" ON public.academies;
CREATE POLICY "Members can view their academies"
ON public.academies FOR SELECT
USING (is_academy_member(id));

-- Solo admins globales o owners pueden actualizar academias
DROP POLICY IF EXISTS "Admins can update academies" ON public.academies;
CREATE POLICY "Admins can update academies"
ON public.academies FOR UPDATE
USING (is_admin_user() OR owner_user_id = auth.uid());

-- Solo admins globales pueden insertar
DROP POLICY IF EXISTS "Admins can insert academies" ON public.academies;
CREATE POLICY "Admins can insert academies"
ON public.academies FOR INSERT
WITH CHECK (true);  -- Verificado en edge function

-- Solo admins globales pueden eliminar
DROP POLICY IF EXISTS "Admins can delete academies" ON public.academies;
CREATE POLICY "Admins can delete academies"
ON public.academies FOR DELETE
USING (is_admin_user());

-- ---- POLICIES PARA academy_members ----

-- Cualquiera puede ver si es miembro
DROP POLICY IF EXISTS "Members can view their memberships" ON public.academy_members;
CREATE POLICY "Members can view their memberships"
ON public.academy_members FOR SELECT
USING (user_id = auth.uid() OR is_academy_admin(academy_id) OR is_admin_user());

-- Solo admins de la academia pueden ver todos los miembros
DROP POLICY IF EXISTS "Admins can view all members" ON public.academy_members;
CREATE POLICY "Admins can view all members"
ON public.academy_members FOR SELECT
USING (is_academy_admin(academy_id));

-- Solo admins de academia pueden insertar miembros
DROP POLICY IF EXISTS "Admins can manage members" ON public.academy_members;
CREATE POLICY "Admins can manage members"
ON public.academy_members FOR ALL
USING (is_academy_admin(academy_id));

-- ---- POLICIES PARA thematic_axes ----

-- Cualquiera puede ver si: es pública la academia O es miembro
DROP POLICY IF EXISTS "Anyone can view axes in public academies" ON public.thematic_axes;
CREATE POLICY "Anyone can view axes in public academies"
ON public.thematic_axes FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.academies WHERE id = academy_id AND is_public = true)
  OR is_academy_member(academy_id)
  OR is_admin_user()
);

DROP POLICY IF EXISTS "Members can view axes" ON public.thematic_axes;
CREATE POLICY "Members can view axes"
ON public.thematic_axes FOR SELECT
USING (is_academy_member(academy_id));

-- Solo admins de academia pueden modificar
DROP POLICY IF EXISTS "Admins can manage axes" ON public.thematic_axes;
CREATE POLICY "Admins can manage axes"
ON public.thematic_axes FOR ALL
USING (is_academy_admin(academy_id) OR is_admin_user());

-- ---- POLICIES PARA topology_nodes ----

DROP POLICY IF EXISTS "Anyone can view nodes in public academies" ON public.topology_nodes;
CREATE POLICY "Anyone can view nodes in public academies"
ON public.topology_nodes FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.academies WHERE id = academy_id AND is_public = true)
  OR is_academy_member(academy_id)
  OR is_admin_user()
);

DROP POLICY IF EXISTS "Members can view nodes" ON public.topology_nodes;
CREATE POLICY "Members can view nodes"
ON public.topology_nodes FOR SELECT
USING (is_academy_member(academy_id));

DROP POLICY IF EXISTS "Admins can manage nodes" ON public.topology_nodes;
CREATE POLICY "Admins can manage nodes"
ON public.topology_nodes FOR ALL
USING (is_academy_admin(academy_id) OR is_admin_user());

-- ---- POLICIES PARA topology_edges ----

DROP POLICY IF EXISTS "Anyone can view edges in public academies" ON public.topology_edges;
CREATE POLICY "Anyone can view edges in public academies"
ON public.topology_edges FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.academies WHERE id = academy_id AND is_public = true)
  OR is_academy_member(academy_id)
  OR is_admin_user()
);

DROP POLICY IF EXISTS "Members can view edges" ON public.topology_edges;
CREATE POLICY "Members can view edges"
ON public.topology_edges FOR SELECT
USING (is_academy_member(academy_id));

DROP POLICY IF EXISTS "Admins can manage edges" ON public.topology_edges;
CREATE POLICY "Admins can manage edges"
ON public.topology_edges FOR ALL
USING (is_academy_admin(academy_id) OR is_admin_user());

-- ---- POLICIES PARA socratic_questions ----

DROP POLICY IF EXISTS "Anyone can view questions in public academies" ON public.socratic_questions;
CREATE POLICY "Anyone can view questions in public academies"
ON public.socratic_questions FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.academies WHERE id = academy_id AND is_public = true)
  OR is_academy_member(academy_id)
  OR is_admin_user()
);

DROP POLICY IF EXISTS "Members can view questions" ON public.socratic_questions;
CREATE POLICY "Members can view questions"
ON public.socratic_questions FOR SELECT
USING (is_academy_member(academy_id));

DROP POLICY IF EXISTS "Admins can manage questions" ON public.socratic_questions;
CREATE POLICY "Admins can manage questions"
ON public.socratic_questions FOR ALL
USING (is_academy_admin(academy_id) OR is_admin_user());

-- ---- POLICIES PARA saved_dialogues ----

-- Solo miembros pueden ver/editar sus propios diálogos
DROP POLICY IF EXISTS "Users can manage own dialogues" ON public.saved_dialogues;
CREATE POLICY "Users can manage own dialogues"
ON public.saved_dialogues FOR ALL
USING (user_id = auth.uid() OR is_academy_admin(academy_id) OR is_admin_user());

-- ---- POLICIES PARA podcast_episodes ----

DROP POLICY IF EXISTS "Anyone can view published episodes" ON public.podcast_episodes;
CREATE POLICY "Anyone can view published episodes"
ON public.podcast_episodes FOR SELECT
USING (
  published = true 
  OR is_academy_member(academy_id) 
  OR is_academy_admin(academy_id)
  OR is_admin_user()
);

DROP POLICY IF EXISTS "Admins can manage episodes" ON public.podcast_episodes;
CREATE POLICY "Admins can manage episodes"
ON public.podcast_episodes FOR ALL
USING (is_academy_admin(academy_id) OR is_admin_user());

-- ---- POLICIES PARA user_interactions ----

-- Usuarios pueden ver sus propias interacciones
DROP POLICY IF EXISTS "Users can manage own interactions" ON public.user_interactions;
CREATE POLICY "Users can manage own interactions"
ON public.user_interactions FOR ALL
USING (user_id = auth.uid() OR is_academy_admin(academy_id) OR is_admin_user());

-- ---- POLICIES PARA access_requests ----

-- Cualquiera puede solicitar acceso
DROP POLICY IF EXISTS "Anyone can submit access request" ON public.access_requests;
CREATE POLICY "Anyone can submit access request"
ON public.access_requests FOR INSERT
WITH CHECK (true);

-- Solo admins de academia pueden ver/gestionar requests
DROP POLICY IF EXISTS "Admins can manage requests" ON public.access_requests;
CREATE POLICY "Admins can manage requests"
ON public.access_requests FOR ALL
USING (is_academy_admin(academy_id) OR is_admin_user());

-- ---- POLICIES PARA corpus_fragments ----

DROP POLICY IF EXISTS "Anyone can view fragments in public academies" ON public.corpus_fragments;
CREATE POLICY "Anyone can view fragments in public academies"
ON public.corpus_fragments FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.academies WHERE id = academy_id AND is_public = true)
  OR is_academy_member(academy_id)
  OR is_admin_user()
);

DROP POLICY IF EXISTS "Members can view fragments" ON public.corpus_fragments;
CREATE POLICY "Members can view fragments"
ON public.corpus_fragments FOR SELECT
USING (is_academy_member(academy_id));

DROP POLICY IF EXISTS "Admins can manage fragments" ON public.corpus_fragments;
CREATE POLICY "Admins can manage fragments"
ON public.corpus_fragments FOR ALL
USING (is_academy_admin(academy_id) OR is_admin_user());

-- ============================================================================
-- PARTE 7: Triggers para updated_at
-- ============================================================================

-- Academy_members trigger
DROP TRIGGER IF EXISTS update_academy_members_updated_at ON public.academy_members;
CREATE TRIGGER update_academy_members_updated_at
  BEFORE UPDATE ON public.academy_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PARTE 8: Comments para documentación
-- ============================================================================

COMMENT ON TABLE public.academies IS 'Academias socráticas multi-tenant';
COMMENT ON TABLE public.academy_members IS 'Membresías por academia (reemplaza user_roles global)';
COMMENT ON COLUMN public.academies.oracle_persona_prompt IS 'System prompt personalizado del oráculo de esta academia';
COMMENT ON COLUMN public.academy_members.role IS 'Rol dentro de la academia: owner, admin, platon, member';
