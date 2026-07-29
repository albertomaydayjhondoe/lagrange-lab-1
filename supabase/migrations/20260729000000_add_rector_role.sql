-- ================================================================
-- SPRINT 10: LOGIN RECTOR - ELEVACIÓN Y SOBERANÍA
-- ================================================================
-- Objetivo: Implementar rol de Rector con privilegios elevados
-- y soberanía sobre su academia/universidad
-- Fecha: 2026-07-29
-- ================================================================

-- ================================================================
-- 1. AGREGAR ROL 'rector' AL CHECK EXISTENTE
-- ================================================================
-- Primero, eliminar la constraint CHECK existente y recrearla con el nuevo rol

ALTER TABLE public.academy_members
DROP CONSTRAINT IF EXISTS academy_members_role_check;

ALTER TABLE public.academy_members
ADD CONSTRAINT academy_members_role_check 
CHECK (role IN ('owner', 'admin', 'platon', 'member', 'rector'));

-- ================================================================
-- 2. CREAR TABLA academia_rectors (Soberanía Rectoral)
-- ================================================================
-- Los rectores tienen autoridad máxima sobre su academia,
-- pueden designar admins, gestionar miembros, y definir la 
-- identidad institucional de su academia.

CREATE TABLE IF NOT EXISTS public.academia_rectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE NOT NULL,
  -- Metadatos de soberanía
  title TEXT DEFAULT 'Rector' CHECK (title IN ('Rector', 'Vice-Rector', 'Decano', 'Director General', 'Presidente')),
  appointed_at TIMESTAMPTZ DEFAULT NOW(),
  appointed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Autoridad ceremonial e institucional
  decree_number TEXT,
  institution_oath TEXT,
  rector_seal_url TEXT,
  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  is_current BOOLEAN DEFAULT TRUE, -- Un rector puede haber sido reemplazado
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Constraints
  UNIQUE (user_id, academy_id, is_current) -- Solo un rector activo por academia
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_academia_rectors_user ON public.academia_rectors(user_id);
CREATE INDEX IF NOT EXISTS idx_academia_rectors_academy ON public.academia_rectors(academy_id);
CREATE INDEX IF NOT EXISTS idx_academia_rectors_current ON public.academia_rectors(academy_id) WHERE is_current = TRUE;

-- ================================================================
-- 3. CREAR FUNCIÓN HELPER: user_is_academy_rector()
-- ================================================================
CREATE OR REPLACE FUNCTION public.user_is_academy_rector(p_academy_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academia_rectors 
    WHERE academy_id = p_academy_id 
    AND user_id = auth.uid()
    AND is_current = TRUE
    AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.user_is_academy_rector(uuid) TO authenticated, service_role;

-- ================================================================
-- 4. CREAR FUNCIÓN HELPER: user_can_manage_academy()
-- ================================================================
-- Soberanía combinada: Owner + Rector tienen control total
CREATE OR REPLACE FUNCTION public.user_can_manage_academy(p_academy_id UUID)
RETURNS BOOLEAN AS $$
  SELECT 
    user_is_academy_owner(p_academy_id)
    OR user_is_academy_rector(p_academy_id)
    OR user_is_platform_admin();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.user_can_manage_academy(uuid) TO authenticated, service_role;

-- ================================================================
-- 5. CREAR FUNCIÓN HELPER: user_can_manage_members()
-- ================================================================
-- Rector + Owner + Admin pueden gestionar miembros
CREATE OR REPLACE FUNCTION public.user_can_manage_members(p_academy_id UUID)
RETURNS BOOLEAN AS $$
  SELECT 
    user_can_manage_academy(p_academy_id)
    OR EXISTS (
      SELECT 1 FROM public.academy_members 
      WHERE academy_id = p_academy_id 
      AND user_id = auth.uid()
      AND role IN ('admin')
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.user_can_manage_members(uuid) TO authenticated, service_role;

-- ================================================================
-- 6. HABILITAR RLS EN academia_rectors
-- ================================================================
ALTER TABLE public.academia_rectors ENABLE ROW LEVEL SECURITY;

-- Policy: Cualquier usuario autenticado puede ver rectores activos (transparencia institucional)
CREATE POLICY "rectors_select_public"
  ON public.academia_rectors FOR SELECT
  USING (
    is_current = TRUE 
    AND is_active = TRUE
  );

-- Policy: Solo el propio rector puede ver sus propios registros
CREATE POLICY "rector_can_view_own_record"
  ON public.academia_rectors FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Solo quien puede gestionar la academia (owner/rector/platform_admin) puede insertar
CREATE POLICY "manage_academy_can_insert_rector"
  ON public.academia_rectors FOR INSERT
  WITH CHECK (
    user_can_manage_academy(academy_id)
    AND auth.uid() IS NOT NULL
  );

-- Policy: Solo el propio rector o platform_admin puede actualizar
CREATE POLICY "rector_or_platform_admin_can_update"
  ON public.academia_rectors FOR UPDATE
  USING (
    user_can_manage_academy(academy_id)
    OR user_id = auth.uid()
  );

-- Policy: Solo platform_admin puede eliminar (los rectores se 'desactivan', no se borran)
CREATE POLICY "platform_admin_can_delete_rector"
  ON public.academia_rectors FOR DELETE
  USING (user_is_platform_admin());

-- ================================================================
-- 7. ACTUALIZAR RLS POLICIES EN academy_members
-- ================================================================
-- Agregar 'rector' a las policies existentes

-- academy_members SELECT: Members + admins + rector + owner pueden ver
DROP POLICY IF EXISTS "Members can view their academy memberships" ON public.academy_members;
CREATE POLICY "Members can view their academy memberships"
  ON public.academy_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = academy_members.academy_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin', 'rector')
    )
    OR user_is_platform_admin()
  );

-- academy_members INSERT: Rector + Owner + Platform Admin pueden agregar miembros
DROP POLICY IF EXISTS "Admins can manage members" ON public.academy_members;
CREATE POLICY "Admins can manage members"
  ON public.academy_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = academy_members.academy_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin', 'rector')
    )
    OR user_is_platform_admin()
  );

-- academy_members UPDATE: Rector + Owner + Platform Admin pueden actualizar
DROP POLICY IF EXISTS "Academy admin/rector can update members" ON public.academy_members;
CREATE POLICY "Academy admin/rector can update members"
  ON public.academy_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = academy_members.academy_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin', 'rector')
    )
    OR user_is_platform_admin()
  );

-- academy_members DELETE: Rector + Owner pueden remover miembros
DROP POLICY IF EXISTS "Academy rector/owner can delete members" ON public.academy_members;
CREATE POLICY "Academy rector/owner can delete members"
  ON public.academy_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = academy_members.academy_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'rector')
    )
    OR user_is_platform_admin()
  );

-- ================================================================
-- 8. ACTUALIZAR RLS POLICIES EN academies
-- ================================================================
-- Rector puede ver y gestionar su academia

-- academies SELECT: Agregar rector
DROP POLICY IF EXISTS "Owners can view their academies" ON public.academies;
CREATE POLICY "Owners and rectores can view their academies"
  ON public.academies FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR user_is_academy_rector(id)
    OR EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = academies.id
      AND academy_members.user_id = auth.uid()
    )
    OR user_is_platform_admin()
  );

-- academies UPDATE: Owner + Rector pueden actualizar
DROP POLICY IF EXISTS "Owners can update their academies" ON public.academies;
CREATE POLICY "Owners and rectores can update academies"
  ON public.academies FOR UPDATE
  USING (
    owner_user_id = auth.uid()
    OR user_is_academy_rector(id)
    OR user_is_platform_admin()
  );

-- academies DELETE: Solo Owner + Platform Admin (nadie más puede eliminar academias)
DROP POLICY IF EXISTS "Owners can delete their academies" ON public.academies;
CREATE POLICY "Owners can delete academies"
  ON public.academies FOR DELETE
  USING (
    owner_user_id = auth.uid()
    OR user_is_platform_admin()
  );

-- ================================================================
-- 9. CREAR FUNCIÓN: assign_rector()
-- ================================================================
-- Designar un usuario como rector de una academia
CREATE OR REPLACE FUNCTION public.assign_rector(
  p_academy_id UUID,
  p_user_id UUID,
  p_title TEXT DEFAULT 'Rector',
  p_decree_number TEXT DEFAULT NULL,
  p_institution_oath TEXT DEFAULT NULL,
  p_appointed_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_rector_id UUID;
  v_old_rector_id UUID;
BEGIN
  -- Verificar que quien designa tiene autoridad (owner, otro rector, o platform_admin)
  IF NOT user_can_manage_academy(p_academy_id) THEN
    RAISE EXCEPTION 'No tienes autoridad para designar un rector en esta academia';
  END IF;

  -- Verificar que el usuario назначаем es miembro de la academia
  IF NOT EXISTS (
    SELECT 1 FROM public.academy_members 
    WHERE academy_id = p_academy_id 
    AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'El usuario designado debe ser miembro de la academia';
  END IF;

  -- Desactivar rector anterior si existe
  UPDATE public.academia_rectors 
  SET is_current = FALSE, updated_at = NOW()
  WHERE academy_id = p_academy_id AND is_current = TRUE;

  -- Insertar nuevo rector
  INSERT INTO public.academia_rectors (
    user_id, academy_id, title, appointed_by, 
    decree_number, institution_oath
  ) VALUES (
    p_user_id, p_academy_id, p_title, 
    COALESCE(p_appointed_by, auth.uid()),
    p_decree_number, p_institution_oath
  )
  RETURNING id INTO v_new_rector_id;

  -- Asegurar que tiene rol de member en academy_members (elevarlo a rector)
  INSERT INTO public.academy_members (academy_id, user_id, role)
  VALUES (p_academy_id, p_user_id, 'rector')
  ON CONFLICT (academy_id, user_id) 
  DO UPDATE SET role = 'rector';

  RETURN v_new_rector_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.assign_rector(uuid, uuid, text, text, text, uuid) 
TO authenticated, service_role;

-- ================================================================
-- 10. CREAR FUNCIÓN: get_academy_rector()
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_academy_rector(p_academy_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  appointed_at TIMESTAMPTZ,
  decree_number TEXT,
  institution_oath TEXT,
  user_email TEXT,
  user_full_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.id,
    ar.user_id,
    ar.title,
    ar.appointed_at,
    ar.decree_number,
    ar.institution_oath,
    u.email::TEXT,
    p.full_name::TEXT
  FROM public.academia_rectors ar
  JOIN public.profiles p ON ar.user_id = p.id
  JOIN auth.users u ON ar.user_id = u.id
  WHERE ar.academy_id = p_academy_id 
    AND ar.is_current = TRUE
    AND ar.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_academy_rector(uuid) TO authenticated;

-- ================================================================
-- 11. CREAR FUNCIÓN: get_rector_academies()
-- ================================================================
-- Obtener todas las academias donde el usuario es rector
CREATE OR REPLACE FUNCTION public.get_rector_academies(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  academy_id UUID,
  academy_name TEXT,
  academy_slug TEXT,
  rector_title TEXT,
  appointed_at TIMESTAMPTZ,
  decree_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.academy_id,
    a.name::TEXT,
    a.slug::TEXT,
    ar.title,
    ar.appointed_at,
    ar.decree_number
  FROM public.academia_rectors ar
  JOIN public.academies a ON ar.academy_id = a.id
  WHERE ar.user_id = COALESCE(p_user_id, auth.uid())
    AND ar.is_current = TRUE
    AND ar.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_rector_academies(uuid) TO authenticated;

-- ================================================================
-- 12. ACTUALIZAR academies CON SOBERANÍA RECTORAL
-- ================================================================
-- Agregar campos de soberanía institucional a academies
ALTER TABLE public.academies 
ADD COLUMN IF NOT EXISTS rector_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.academies 
ADD COLUMN IF NOT EXISTS institution_type TEXT DEFAULT 'universidad' 
CHECK (institution_type IN ('universidad', 'instituto', 'escuela', 'academia', 'fundación', 'corporación'));

ALTER TABLE public.academies 
ADD COLUMN IF NOT EXISTS rector_title TEXT DEFAULT 'Rector';

ALTER TABLE public.academies 
ADD COLUMN IF NOT EXISTS founding_decree TEXT;

ALTER TABLE public.academies 
ADD COLUMN IF NOT EXISTS accreditation_status TEXT DEFAULT 'pending'
CHECK (accreditation_status IN ('pending', 'accredited', 'in_review', 'probation'));

-- Actualizar automaticamente quando se designa un rector
CREATE OR REPLACE FUNCTION public.update_academy_on_rector_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    UPDATE public.academies 
    SET rector_user_id = NEW.user_id,
        rector_title = NEW.title,
        updated_at = NOW()
    WHERE id = NEW.academy_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_rector_to_academy ON public.academia_rectors;
CREATE TRIGGER sync_rector_to_academy
  AFTER INSERT OR UPDATE ON public.academia_rectors
  FOR EACH ROW
  WHEN (NEW.is_current = TRUE)
  EXECUTE FUNCTION public.update_academy_on_rector_change();

-- ================================================================
-- 13. VERIFICACIÓN
-- ================================================================
SELECT 
  'academia_rectors table created' AS status,
  (SELECT COUNT(*) FROM public.academia_rectors) AS total_rectors;

SELECT 
  'academy_members role check updated' AS status,
  (SELECT COUNT(*) FROM pg_constraint 
   WHERE conname = 'academy_members_role_check') AS constraint_exists;

SELECT 
  'RLS policies for rector role' AS status,
  policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('academia_rectors', 'academy_members', 'academies')
ORDER BY tablename, policyname;
