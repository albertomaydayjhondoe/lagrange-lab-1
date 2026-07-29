-- ================================================================
-- SPRINT 8: UNIFICACIÓN DE MATERIAS (subjects + thematic_axes)
-- ================================================================
-- Objetivo: Consolidar thematic_axes y subjects en subjects con academy_id
-- Fecha: 2026-07-27
-- ================================================================

-- 1. Añadir academy_id a subjects si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'academy_id'
  ) THEN
    ALTER TABLE public.subjects 
    ADD COLUMN academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL;
    
    -- Crear índice para queries por academia
    CREATE INDEX IF NOT EXISTS idx_subjects_academy ON public.subjects(academy_id);
  END IF;
END $$;

-- 2. Migrar thematic_axes activos a subjects
-- Para cada thematic_axis, crear un subject equivalente si no existe
INSERT INTO public.subjects (slug, name, description, icon, color, academy_id, is_active)
SELECT 
  'axis-' || ta.id AS slug,
  ta.label AS name,
  ta.description,
  'Target' AS icon,
  COALESCE(ta.color, '#8B5CF6') AS color,
  ta.academy_id,
  ta.is_active
FROM public.thematic_axes ta
WHERE ta.is_active = true
ON CONFLICT (slug) DO NOTHING;

-- 3. Crear función helper para verificar membresía (si no existe)
CREATE OR REPLACE FUNCTION public.user_is_academy_member(p_academy_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_members 
    WHERE academy_id = p_academy_id 
    AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- 4. Actualizar RLS de subjects con scope de academia
-- Primero, dropear policies existentes si hay duplicados
DROP POLICY IF EXISTS "Anyone can view active subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "Anyone can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated users can view subjects" ON public.subjects;

-- Nueva policy: Cualquiera puede ver subjects activos de academias públicas
CREATE POLICY "Public subjects are viewable by everyone"
  ON public.subjects FOR SELECT
  USING (
    is_active = true 
    AND (
      academy_id IS NULL 
      OR EXISTS (
        SELECT 1 FROM public.academies a 
        WHERE a.id = subjects.academy_id AND a.is_public = true
      )
    )
  );

-- Nueva policy: Miembros de academia pueden ver subjects de su academia
CREATE POLICY "Academy members can view their subjects"
  ON public.subjects FOR SELECT
  USING (
    is_active = true 
    AND user_is_academy_member(academy_id)
  );

-- Nueva policy: Administradores de academia pueden gestionar subjects
CREATE POLICY "Academy admins can manage subjects"
  ON public.subjects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = subjects.academy_id
      AND am.user_id = auth.uid()
      AND am.role = 'admin'
    )
  );

-- 5. Migrar thematic_axes a subjects (datos legacy)
-- Marcar los thematic_axes migrados
DO $$
BEGIN
  -- Los thematic_axes ya migrados arriba ahora deberían tener un subject equivalente
  -- Este paso es solo para registro/documentación
  RAISE NOTICE 'Migración de thematic_axes a subjects completada';
END $$;

-- 6. Agregar constraint para evitar duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_subject_per_academy'
  ) THEN
    -- Unique constraint: solo un subject con el mismo slug por academia
    -- Por ahora skip, ya que el slug ya es unique globalmente
    RAISE NOTICE 'Slug ya es unique, no se necesita constraint adicional';
  END IF;
END $$;

-- 7. Verificación
SELECT 
  'subjects' AS table_name,
  COUNT(*) AS total,
  COUNT(CASE WHEN academy_id IS NOT NULL THEN 1 END) AS with_academy,
  COUNT(CASE WHEN academy_id IS NULL THEN 1 END) AS without_academy
FROM public.subjects;

SELECT 
  'thematic_axes' AS table_name,
  COUNT(*) AS total,
  COUNT(CASE WHEN is_active = true THEN 1 END) AS active
FROM public.thematic_axes;

COMMENT ON COLUMN public.subjects.academy_id IS 'Foreign key a academies para scope multi-tenant. NULL = materia global.';
