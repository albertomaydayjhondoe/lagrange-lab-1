-- ================================================================
-- FIX RLS: Políticas correctas para academies y academy_members
-- Timestamp: 20260721040000
-- ================================================================

-- =================================================================
-- 1. CREAR FUNCIÓN is_member_of_academy
-- =================================================================
CREATE OR REPLACE FUNCTION public.is_member_of_academy(p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.academy_members
    WHERE academy_id = p_academy_id AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_member_of_academy(UUID) TO authenticated, anon, service_role;

-- =================================================================
-- 2. ACADEMIES SELECT: Lógica correcta
-- =================================================================
DROP POLICY IF EXISTS "Academies are viewable by members and owners" ON public.academies;
DROP POLICY IF EXISTS "Anyone can view academies" ON public.academies;

CREATE POLICY "Academies are viewable by members and owners"
ON public.academies
FOR SELECT
USING (
  is_public = true 
  OR owner_user_id = auth.uid() 
  OR is_member_of_academy(id)
);

-- =================================================================
-- 3. ACADEMIES INSERT: Solo owner puede crear
-- =================================================================
DROP POLICY IF EXISTS "Authenticated users can create academies" ON public.academies;

CREATE POLICY "Authenticated users can create academies"
ON public.academies
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

-- =================================================================
-- 4. ACADEMY MEMBERS INSERT: Auto-unión solo a públicas como member
-- =================================================================
DROP POLICY IF EXISTS "Users can join public academies as members" ON public.academy_members;
DROP POLICY IF EXISTS "Users can join academies" ON public.academy_members;

CREATE POLICY "Users can join public academies as members"
ON public.academy_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'member'
  AND EXISTS (
    SELECT 1 FROM public.academies 
    WHERE academies.id = academy_members.academy_id 
    AND academies.is_public = true
  )
);

-- =================================================================
-- 5. CREAR TABLA academy_spaces (si no existe)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.academy_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  parent_space_id UUID REFERENCES public.academy_spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Folder',
  color TEXT DEFAULT '#8B5CF6',
  is_active BOOLEAN DEFAULT true,
  order_index INT DEFAULT 0,
  source_table TEXT,
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (academy_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_academy_spaces_academy ON public.academy_spaces(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_spaces_parent ON public.academy_spaces(parent_space_id);
CREATE INDEX IF NOT EXISTS idx_academy_spaces_slug ON public.academy_spaces(academy_id, slug);

-- =================================================================
-- 6. ACADEMY_SPACES POLICIES
-- =================================================================
DROP POLICY IF EXISTS "Academy members can view spaces" ON public.academy_spaces;
DROP POLICY IF EXISTS "Platform admins can view all spaces" ON public.academy_spaces;

CREATE POLICY "Academy members can view spaces"
ON public.academy_spaces
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.academies a
    WHERE a.id = academy_spaces.academy_id
    AND (
      a.is_public = true
      OR a.owner_user_id = auth.uid()
      OR is_member_of_academy(a.id)
    )
  )
);

-- =================================================================
-- 7. VERIFICACIÓN
-- =================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('academies', 'academy_members', 'academy_spaces')
ORDER BY tablename, policyname;
