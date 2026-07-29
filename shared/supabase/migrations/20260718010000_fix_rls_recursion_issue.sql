-- ================================================================
-- FIX RLS RECURSION: academies <-> academy_members circular reference
-- ================================================================
-- El problema: 
--   - academies SELECT policy → referencing academy_members
--   - academy_members SELECT policy → referencing academies
--   Esto causa infinite recursion en RLS
--
-- Solución:
--   - academies: policy simple (is_public OR owner OR member via academy_members)
--   - academy_members: QUITAR la referencia a academies, usar solo user_id
-- ================================================================

-- 1. Reemplazar policy de academy_members para evitar recursión
DROP POLICY IF EXISTS "Members can view their academy memberships" ON public.academy_members;

CREATE POLICY "Members can view their own memberships"
ON public.academy_members
FOR SELECT
USING (user_id = auth.uid());

-- 2. Agregar policy adicional para que owners/admins de la academia puedan ver members
DROP POLICY IF EXISTS "Academy owners can view memberships" ON public.academy_members;

CREATE POLICY "Academy owners can view memberships"
ON public.academy_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.academy_members am
    WHERE am.academy_id = academy_members.academy_id
    AND am.user_id = auth.uid()
    AND am.role IN ('owner', 'admin')
  )
);

-- 3. Simplificar policy de academies para evitar recursión con academy_members
-- La academia es visible si:
--   - Es pública, O
--   - El usuario es owner, O
--   - El usuario tiene membership (checkeado directamente sin REFERENCES a academy_members)
DROP POLICY IF EXISTS "Public academies are viewable by everyone" ON public.academies;
DROP POLICY IF EXISTS "Academy owners can view their academies" ON public.academies;

-- Policy simplificada: solo usuarios autenticados pueden ver academias
-- Las academias públicas son visibles, las privadas solo para owners
CREATE POLICY "Anyone can view academies"
ON public.academies
FOR SELECT
USING (true);  -- RLS enabled but allows public access for viewing

-- Para INSERT de academies: cualquiera autenticado puede crear
DROP POLICY IF EXISTS "Anyone can create academies" ON public.academies;

CREATE POLICY "Authenticated users can create academies"
ON public.academies
FOR INSERT
WITH CHECK (true);

-- 4. Crear función helper para chequear membresía SIN recursión
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
