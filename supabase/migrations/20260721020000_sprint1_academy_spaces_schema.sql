-- ================================================================
-- SPRINT 1: Academy Spaces - Fusión de Ejes + Materias
-- ================================================================
-- Timestamp: 20260721020000
-- 
-- PROPÓSITO:
--   Unificar thematic_axes (ejes socráticos) y subjects/topics (tutorías)
--   en un único concepto: academy_spaces (espacios RAG por academia).
--
-- CONFIRMACIÓN DE SUPUESTOS (verificado en código):
--   - thematic_axes tiene columnas: id, name, color, order_index, is_active, created_at, academy_id
--     NO tiene columna 'slug' ni 'label' - se genera desde 'name'
--   - subjects tiene: id, slug, name, description, icon, color, cover_image_url, is_active
--   - topics tiene: id, subject_id, slug, name, description, order_index, is_active
--   - corpus_fragments usa 'axis TEXT[]' (array), no FK a thematic_axes
--   - socratic_questions tiene 'eje UUID REFERENCES thematic_axes(id)'
-- ================================================================

-- =================================================================
-- 1. CREAR TABLA academy_spaces
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
  source_table TEXT,  -- 'thematic_axes' | 'subjects' | 'topics' | NULL
  source_id UUID,     -- ID original en la tabla fuente
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (academy_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_academy_spaces_academy ON public.academy_spaces(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_spaces_parent ON public.academy_spaces(parent_space_id);
CREATE INDEX IF NOT EXISTS idx_academy_spaces_slug ON public.academy_spaces(academy_id, slug);

COMMENT ON TABLE public.academy_spaces IS 'Espacios unificados RAG: fusión de thematic_axes (ejes) + subjects/topics (tutorías)';
COMMENT ON COLUMN public.academy_spaces.parent_space_id IS 'Para topics que referencian subjects (jerarquía materia→subtema)';
COMMENT ON COLUMN public.academy_spaces.source_table IS 'Tabla fuente original para trazabilidad (thematic_axes, subjects, topics)';
COMMENT ON COLUMN public.academy_spaces.source_id IS 'ID original en la tabla fuente para trazabilidad';

-- =================================================================
-- 2. TRIGGER updated_at
-- =================================================================

CREATE OR REPLACE FUNCTION public.update_academy_spaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_academy_spaces_updated_at ON public.academy_spaces;
CREATE TRIGGER update_academy_spaces_updated_at
  BEFORE UPDATE ON public.academy_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_academy_spaces_updated_at();

-- =================================================================
-- 3. RLS PARA academy_spaces
-- =================================================================

ALTER TABLE public.academy_spaces ENABLE ROW LEVEL SECURITY;

-- SELECT: visible para cualquier miembro de la academia (o si es pública)
DROP POLICY IF EXISTS "Academy members can view spaces" ON public.academy_spaces;
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

-- SELECT para platform admins
DROP POLICY IF EXISTS "Platform admins can view all spaces" ON public.academy_spaces;
CREATE POLICY "Platform admins can view all spaces"
ON public.academy_spaces
FOR SELECT
USING (public.is_admin_user());

-- INSERT: solo owner/admin de la academia
DROP POLICY IF EXISTS "Academy admins can insert spaces" ON public.academy_spaces;
CREATE POLICY "Academy admins can insert spaces"
ON public.academy_spaces
FOR INSERT
WITH CHECK (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = academy_spaces.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

-- UPDATE: solo owner/admin de la academia
DROP POLICY IF EXISTS "Academy admins can update spaces" ON public.academy_spaces;
CREATE POLICY "Academy admins can update spaces"
ON public.academy_spaces
FOR UPDATE
USING (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = academy_spaces.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

-- DELETE: solo owner/admin de la academia
DROP POLICY IF EXISTS "Academy admins can delete spaces" ON public.academy_spaces;
CREATE POLICY "Academy admins can delete spaces"
ON public.academy_spaces
FOR DELETE
USING (
  public.is_admin_user()
  OR
  EXISTS (
    SELECT 1 FROM public.academy_members
    WHERE academy_members.academy_id = academy_spaces.academy_id
    AND academy_members.user_id = auth.uid()
    AND academy_members.role IN ('owner', 'admin')
  )
);

-- =================================================================
-- 4. MIGRAR thematic_axes → academy_spaces
-- =================================================================

-- Verificar que hay datos antes de migrar
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.thematic_axes;
  RAISE NOTICE 'INFO: thematic_axes tiene % filas para migrar', v_count;
END $$;

-- Migrar thematic_axes a academy_spaces
-- Generamos slug desde 'name' (no existe columna slug en thematic_axes)
INSERT INTO public.academy_spaces (
  academy_id,
  name,
  slug,
  description,
  icon,
  color,
  is_active,
  order_index,
  source_table,
  source_id
)
SELECT 
  COALESCE(academy_id, '00000000-0000-0000-0000-000000000001'::uuid) as academy_id,
  name,
  LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || LEFT(id::text, 8) as slug,
  description,
  'Target' as icon,
  COALESCE(color, '#8B5CF6') as color,
  COALESCE(is_active, true) as is_active,
  COALESCE(order_index, 0) as order_index,
  'thematic_axes' as source_table,
  id as source_id
FROM public.thematic_axes
ON CONFLICT (academy_id, slug) DO NOTHING;

-- =================================================================
-- 5. MIGRAR subjects → academy_spaces (nivel raíz)
-- =================================================================

-- Verificar que hay datos antes de migrar
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.subjects;
  RAISE NOTICE 'INFO: subjects tiene % filas para migrar', v_count;
END $$;

-- Migrar subjects a academy_spaces de nivel raíz
INSERT INTO public.academy_spaces (
  academy_id,
  name,
  slug,
  description,
  icon,
  color,
  is_active,
  order_index,
  source_table,
  source_id
)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid as academy_id,  -- Academia global (Génesis)
  name,
  slug,  -- subjects ya tiene slug único
  description,
  COALESCE(icon, 'BookOpen') as icon,
  COALESCE(color, '#8B5CF6') as color,
  COALESCE(is_active, true) as is_active,
  100 + COALESCE(order_index, 0) as order_index,  -- Offset para no chocar con thematic_axes
  'subjects' as source_table,
  id as source_id
FROM public.subjects
ON CONFLICT (academy_id, slug) DO NOTHING;

-- =================================================================
-- 6. MIGRAR topics → academy_spaces (con parent_space_id)
-- =================================================================

-- Verificar que hay datos antes de migrar
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.topics;
  RAISE NOTICE 'INFO: topics tiene % filas para migrar', v_count;
END $$;

-- Migrar topics con parent_space_id apuntando al subject migrado
INSERT INTO public.academy_spaces (
  academy_id,
  parent_space_id,
  name,
  slug,
  description,
  is_active,
  order_index,
  source_table,
  source_id
)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid as academy_id,  -- Academia global
  s.id as parent_space_id,  -- FK al academy_space del subject
  t.name,
  s.slug || '/' || t.slug as slug,  -- compound slug: subject/topic
  t.description,
  COALESCE(t.is_active, true) as is_active,
  COALESCE(t.order_index, 0) as order_index,
  'topics' as source_table,
  t.id as source_id
FROM public.topics t
JOIN public.subjects s ON t.subject_id = s.id
JOIN public.academy_spaces sp ON sp.source_id = s.id AND sp.source_table = 'subjects'
ON CONFLICT (academy_id, slug) DO NOTHING;

-- =================================================================
-- 7. AÑADIR space_id A TABLAS DE CONTENIDO
-- =================================================================

-- corpus_fragments: ADD COLUMN space_id
ALTER TABLE public.corpus_fragments 
ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.academy_spaces(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.corpus_fragments.space_id IS 'DEPRECATED: Usar axis TEXT[] para filtrar por espacio. Se elimina en sprint posterior.';
COMMENT ON COLUMN public.corpus_fragments.axis IS 'Ejes temáticos (array) - método principal de filtrado';

-- socratic_questions: ADD COLUMN space_id
ALTER TABLE public.socratic_questions 
ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.academy_spaces(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.socratic_questions.space_id IS 'DEPRECATED: Usar eje UUID para filtrar por espacio. Se elimina en sprint posterior.';

-- materials: ADD COLUMN space_id
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.academy_spaces(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.materials.space_id IS 'DEPRECATED: Usar subject_id para filtrar por espacio. Se elimina en sprint posterior.';

-- tutoring_sessions: ADD COLUMN space_id
ALTER TABLE public.tutoring_sessions 
ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.academy_spaces(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tutoring_sessions.space_id IS 'DEPRECATED: Usar subject_id para filtrar por espacio. Se elimina en sprint posterior.';

-- =================================================================
-- 8. ACTUALIZAR match_corpus_fragments PARA ACEPTAR match_space_id
-- =================================================================

CREATE OR REPLACE FUNCTION public.match_corpus_fragments(
  query_embedding vector(1536),
  match_academy_id uuid DEFAULT NULL,
  match_space_id uuid DEFAULT NULL,  -- NUEVO PARÁMETRO
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  id uuid,
  source_file text,
  source_section text,
  axis text[],
  tension float,
  content text,
  keywords text[],
  weight float,
  academy_id uuid,
  source_type text,
  title text,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cf.id,
    cf.source_file,
    cf.source_section,
    cf.axis,
    cf.tension,
    cf.content,
    cf.keywords,
    cf.weight,
    cf.academy_id,
    cf.source_type,
    cf.title,
    1 - (cf.embedding <=> query_embedding) as similarity
  FROM public.corpus_fragments cf
  WHERE
    -- Filter by academy or global corpus (NULL academy_id)
    (match_academy_id IS NULL OR cf.academy_id = match_academy_id OR cf.academy_id IS NULL)
    -- Filter by space if specified (uses axis array as fallback)
    AND (match_space_id IS NULL 
         OR cf.space_id = match_space_id
         OR EXISTS (
           SELECT 1 FROM public.academy_spaces sp
           WHERE sp.id = match_space_id
           AND sp.slug = ANY(cf.axis)  -- Match by slug in axis array
         ))
    -- Only fragments with embeddings
    AND cf.embedding IS NOT NULL
    -- Only active fragments
    AND (cf.upload_status = 'completed' OR cf.upload_status IS NULL OR cf.source_type = 'seed')
    -- Similarity threshold
    AND (1 - (cf.embedding <=> query_embedding)) >= match_threshold
  ORDER BY cf.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

REVOKE ALL ON FUNCTION public.match_corpus_fragments(vector, uuid, uuid, int, float) FROM public;
GRANT EXECUTE ON FUNCTION public.match_corpus_fragments(vector, uuid, uuid, int, float) TO authenticated, service_role;

-- =================================================================
-- 9. ACTUALIZAR match_materials PARA ACEPTAR match_space_id
-- =================================================================

CREATE OR REPLACE FUNCTION public.match_materials(
  query_embedding vector(1536),
  match_academy_id uuid DEFAULT NULL,
  match_space_id uuid DEFAULT NULL,  -- NUEVO PARÁMETRO
  match_subject_id uuid DEFAULT NULL,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  content_type text,
  keywords text[],
  subject_id uuid,
  topic_id uuid,
  space_id uuid,
  source_url text,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.title,
    m.content,
    m.content_type,
    m.keywords,
    m.subject_id,
    m.topic_id,
    m.space_id,
    m.source_url,
    1 - (m.embedding <=> query_embedding) as similarity
  FROM public.materials m
  WHERE
    -- Filter by academy if specified
    (match_academy_id IS NULL 
     OR m.academy_id = match_academy_id 
     OR m.academy_id IS NULL)
    -- Filter by space if specified
    AND (match_space_id IS NULL OR m.space_id = match_space_id)
    -- Filter by subject if specified (legacy)
    AND (match_subject_id IS NULL OR m.subject_id = match_subject_id)
    -- Only active materials
    AND m.status = 'active'
    -- Only with embeddings
    AND m.embedding IS NOT NULL
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

REVOKE ALL ON FUNCTION public.match_materials(vector, uuid, uuid, uuid, int) FROM public;
GRANT EXECUTE ON FUNCTION public.match_materials(vector, uuid, uuid, uuid, int) TO authenticated, service_role;

-- =================================================================
-- 10. VERIFICACIONES POST-MIGRACIÓN
-- =================================================================

RAISE NOTICE '';
RAISE NOTICE '============================================================';
RAISE NOTICE 'VERIFICACIONES POST-MIGRACIÓN';
RAISE NOTICE '============================================================';

-- Verificar conteos
DO $$
DECLARE
  v_axes_count INTEGER;
  v_subjects_count INTEGER;
  v_topics_count INTEGER;
  v_spaces_count INTEGER;
  v_corpus_count INTEGER;
  v_questions_count INTEGER;
  v_materials_count INTEGER;
  v_sessions_count INTEGER;
BEGIN
  -- thematic_axes original
  SELECT COUNT(*) INTO v_axes_count FROM public.thematic_axes;
  RAISE NOTICE 'thematic_axes original: % filas', v_axes_count;
  
  -- subjects original
  SELECT COUNT(*) INTO v_subjects_count FROM public.subjects;
  RAISE NOTICE 'subjects original: % filas', v_subjects_count;
  
  -- topics original
  SELECT COUNT(*) INTO v_topics_count FROM public.topics;
  RAISE NOTICE 'topics original: % filas', v_topics_count;
  
  -- academy_spaces creado
  SELECT COUNT(*) INTO v_spaces_count FROM public.academy_spaces;
  RAISE NOTICE 'academy_spaces creado: % filas', v_spaces_count;
  
  -- Verificar que todas las filas migraron
  IF v_spaces_count >= (v_axes_count + v_subjects_count + v_topics_count) THEN
    RAISE NOTICE 'OK: Todas las filas migraron a academy_spaces';
  ELSE
    RAISE WARNING 'WARNING: Posible pérdida de datos en migración (% < %)', 
      v_spaces_count, (v_axes_count + v_subjects_count + v_topics_count);
  END IF;
  
  -- corpus_fragments
  SELECT COUNT(*) INTO v_corpus_count FROM public.corpus_fragments;
  RAISE NOTICE 'corpus_fragments total: % filas', v_corpus_count;
  
  -- socratic_questions
  SELECT COUNT(*) INTO v_questions_count FROM public.socratic_questions;
  RAISE NOTICE 'socratic_questions total: % filas', v_questions_count;
  
  -- materials
  SELECT COUNT(*) INTO v_materials_count FROM public.materials;
  RAISE NOTICE 'materials total: % filas', v_materials_count;
  
  -- tutoring_sessions
  SELECT COUNT(*) INTO v_sessions_count FROM public.tutoring_sessions;
  RAISE NOTICE 'tutoring_sessions total: % filas', v_sessions_count;
END $$;

-- Listar academy_spaces migrados
RAISE NOTICE '';
RAISE NOTICE 'Academy spaces migrados:';
SELECT 
  source_table,
  COUNT(*) as count,
  string_agg(name, ', ' ORDER BY name) as names
FROM public.academy_spaces
GROUP BY source_table;

-- Listar academy_spaces con jerarquía
RAISE NOTICE '';
RAISE NOTICE 'Academy spaces con jerarquía (topics con parent):';
SELECT 
  sp.name as topic_name,
  sp.slug as topic_slug,
  parent.name as parent_name,
  sp.source_table
FROM public.academy_spaces sp
LEFT JOIN public.academy_spaces parent ON sp.parent_space_id = parent.id
WHERE sp.parent_space_id IS NOT NULL
ORDER BY parent.name, sp.name;

-- =================================================================
-- 11. MOSTRAR POLÍTICAS RLS APLICADAS
-- =================================================================

RAISE NOTICE '';
RAISE NOTICE 'Políticas RLS de academy_spaces:';
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'academy_spaces'
ORDER BY policyname;

RAISE NOTICE '';
RAISE NOTICE '============================================================';
RAISE NOTICE 'SPRINT 1 COMPLETADO: academy_spaces creado y populado';
RAISE NOTICE '============================================================';
