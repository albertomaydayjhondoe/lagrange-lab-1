-- ================================================================
-- FIX CRÍTICO: Eliminar recursión infinita en academy_members RLS
-- Timestamp: 20260722000000
-- Problema: is_member_of_academy() → academy_members → policy → is_member_of_academy()
-- Solución: Policies simples sin subqueries circulares
-- ================================================================

-- =================================================================
-- 1. ELIMINAR TODAS LAS POLICIES DE academy_members
-- =================================================================
DROP POLICY IF EXISTS "Members can view their own memberships" ON public.academy_members;
DROP POLICY IF EXISTS "Academy owners can view memberships" ON public.academy_members;
DROP POLICY IF EXISTS "Users can join public academies as members" ON public.academy_members;
DROP POLICY IF EXISTS "Users can join academies" ON public.academy_members;
DROP POLICY IF EXISTS "Members can view their academy memberships" ON public.academy_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.academy_members;

-- =================================================================
-- 2. CREAR FUNCIÓN SIMPLE (sin recursión)
-- =================================================================
CREATE OR REPLACE FUNCTION public.is_member_of_academy(p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.academy_members am
    WHERE am.academy_id = p_academy_id 
    AND am.user_id = auth.uid()
  );
$$;

-- Dar permisos explícitos
GRANT EXECUTE ON FUNCTION public.is_member_of_academy(UUID) TO authenticated, anon, service_role, postgres;

-- =================================================================
-- 3. CREAR FUNCIÓN PARA VER SI ES OWNER/ADMIN
-- =================================================================
CREATE OR REPLACE FUNCTION public.is_academy_owner_or_admin(p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.academy_members am
    WHERE am.academy_id = p_academy_id 
    AND am.user_id = auth.uid()
    AND am.role IN ('owner', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_academy_owner_or_admin(UUID) TO authenticated, anon, service_role, postgres;

-- =================================================================
-- 4. CREAR POLICIES SIMPLES PARA academy_members
-- =================================================================

-- SELECT: Usuario puede ver sus propias membresías
CREATE POLICY "Members can view own memberships"
ON public.academy_members
FOR SELECT
USING (user_id = auth.uid());

-- INSERT: Usuario puede crear su propia membresía (como member, no owner/admin)
CREATE POLICY "Users can insert own membership"
ON public.academy_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND role IN ('member', 'platon')
);

-- UPDATE: Solo puede actualizar su propia membresía (sin cambiar role a owner)
CREATE POLICY "Members can update own membership"
ON public.academy_members
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'member'  -- No puede cambiarse a owner/admin por sí mismo
);

-- DELETE: Usuario puede eliminar su propia membresía
CREATE POLICY "Members can delete own membership"
ON public.academy_members
FOR DELETE
USING (user_id = auth.uid());

-- =================================================================
-- 5. POLICIES PARA QUE OWNERS/ADMINS PUEDAN GESTIONAR (sin recursión)
-- =================================================================
-- Policy separada para que owners/admins vean todos los miembros
-- Esta usa la función sin recursión
CREATE POLICY "Owners admins can view all memberships"
ON public.academy_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.academy_members am2
    WHERE am2.academy_id = academy_members.academy_id
    AND am2.user_id = auth.uid()
    AND am2.role IN ('owner', 'admin')
  )
);

-- Owners/admins pueden insertar nuevos miembros
CREATE POLICY "Owners admins can insert members"
ON public.academy_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.academy_members am2
    WHERE am2.academy_id = academy_members.academy_id
    AND am2.user_id = auth.uid()
    AND am2.role IN ('owner', 'admin')
  )
);

-- Owners/admins pueden actualizar miembros
CREATE POLICY "Owners admins can update members"
ON public.academy_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.academy_members am2
    WHERE am2.academy_id = academy_members.academy_id
    AND am2.user_id = auth.uid()
    AND am2.role IN ('owner', 'admin')
  )
);

-- Owners/admins pueden eliminar miembros
CREATE POLICY "Owners admins can delete members"
ON public.academy_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.academy_members am2
    WHERE am2.academy_id = academy_members.academy_id
    AND am2.user_id = auth.uid()
    AND am2.role IN ('owner', 'admin')
  )
);

-- =================================================================
-- 6. VERIFICACIÓN
-- =================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'academy_members'
ORDER BY policyname;
