-- ================================================================
-- MIGRATION: SaaS Horizontal + Rector (Idempotente)
-- ================================================================
-- Usa CREATE TABLE IF NOT EXISTS para evitar errores si ya existe
-- ================================================================

BEGIN;

-- ================================================================
-- PARTE 1: LOGIN RECTOR
-- ================================================================

-- Agregar rol 'rector' si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'academy_members_role_check'
  ) THEN
    ALTER TABLE public.academy_members
    ADD CONSTRAINT academy_members_role_check 
    CHECK (role IN ('owner', 'admin', 'platon', 'member', 'rector'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Si el constraint ya tiene otros valores, lo recreamos
  ALTER TABLE public.academy_members DROP CONSTRAINT IF EXISTS academy_members_role_check;
  ALTER TABLE public.academy_members
  ADD CONSTRAINT academy_members_role_check 
  CHECK (role IN ('owner', 'admin', 'platon', 'member', 'rector'));
END $$;

-- Tabla de rectores
CREATE TABLE IF NOT EXISTS public.academia_rectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'Rector',
  appointed_at TIMESTAMPTZ DEFAULT NOW(),
  appointed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decree_number TEXT,
  institution_oath TEXT,
  rector_seal_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, academy_id, is_current)
);

CREATE INDEX IF NOT EXISTS idx_academia_rectors_user ON public.academia_rectors(user_id);
CREATE INDEX IF NOT EXISTS idx_academia_rectors_academy ON public.academia_rectors(academy_id);

-- Habilitar RLS
ALTER TABLE public.academia_rectors ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "rectors_select_public" ON public.academia_rectors;
CREATE POLICY "rectors_select_public" ON public.academia_rectors FOR SELECT USING (true);

DROP POLICY IF EXISTS "rector_insert" ON public.academia_rectors;
CREATE POLICY "rector_insert" ON public.academia_rectors FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Función para verificar rector
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

-- ================================================================
-- PARTE 2: SAAS HORIZONTAL - students
-- ================================================================

CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  locale TEXT DEFAULT 'es',
  timezone TEXT DEFAULT 'America/Bogota',
  ai_provider TEXT DEFAULT 'openai',
  ai_model TEXT DEFAULT 'gpt-4o-mini',
  ai_temperature NUMERIC DEFAULT 0.7,
  ai_max_tokens INT DEFAULT 2048,
  tutor_personality TEXT DEFAULT 'socratic',
  tutor_custom_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  is_onboarded BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{"theme": "light"}'::jsonb,
  plan_type TEXT DEFAULT 'free',
  plan_limits JSONB DEFAULT '{"max_subjects": 3}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_students_user ON public.students(user_id);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_own" ON public.students;
CREATE POLICY "students_own" ON public.students FOR ALL USING (user_id = auth.uid());

-- ================================================================
-- PARTE 3: SAAS HORIZONTAL - student_subjects
-- ================================================================

CREATE TABLE IF NOT EXISTS public.student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📚',
  color TEXT DEFAULT '#6366f1',
  ai_system_prompt TEXT,
  ai_model_override TEXT,
  ai_temperature_override NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  order_index INT DEFAULT 0,
  materials_count INT DEFAULT 0,
  dialogues_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  UNIQUE (student_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON public.student_subjects(student_id);
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_subjects_own" ON public.student_subjects;
CREATE POLICY "student_subjects_own" ON public.student_subjects FOR ALL 
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- ================================================================
-- PARTE 4: SAAS HORIZONTAL - student_materials
-- ================================================================

CREATE TABLE IF NOT EXISTS public.student_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.student_subjects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL,
  mime_type TEXT,
  content TEXT,
  file_url TEXT,
  file_size_bytes BIGINT,
  external_id TEXT,
  external_metadata JSONB,
  processing_status TEXT DEFAULT 'pending',
  processing_error TEXT,
  chunks_count INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  has_embeddings BOOLEAN DEFAULT FALSE,
  embedding_model TEXT,
  embedding_dimension INT,
  quality_score NUMERIC DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  ingested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_student_materials_subject ON public.student_materials(subject_id);
ALTER TABLE public.student_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_materials_own" ON public.student_materials;
CREATE POLICY "student_materials_own" ON public.student_materials FOR ALL 
USING (subject_id IN (SELECT id FROM public.student_subjects WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())));

-- ================================================================
-- PARTE 5: SAAS HORIZONTAL - student_material_chunks
-- ================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.student_material_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES public.student_materials(id) ON DELETE CASCADE NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT,
  page_number INT,
  section_path TEXT,
  position_start INT,
  position_end INT,
  embedding VECTOR(1536),
  word_count INT,
  token_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (material_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_student_chunks_material ON public.student_material_chunks(material_id);
ALTER TABLE public.student_material_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_chunks_select" ON public.student_material_chunks;
CREATE POLICY "student_chunks_select" ON public.student_material_chunks FOR SELECT 
USING (material_id IN (
  SELECT sm.id FROM public.student_materials sm
  JOIN public.student_subjects ss ON sm.subject_id = ss.id
  JOIN public.students s ON ss.student_id = s.id
  WHERE s.user_id = auth.uid()
));

-- ================================================================
-- PARTE 6: SAAS HORIZONTAL - student_dialogues
-- ================================================================

CREATE TABLE IF NOT EXISTS public.student_dialogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.student_subjects(id) ON DELETE SET NULL,
  title TEXT,
  auto_title TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  sources_used JSONB DEFAULT '[]'::jsonb,
  initial_question TEXT,
  total_messages INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  total_sources INT DEFAULT 0,
  model_used TEXT,
  ai_provider TEXT,
  is_bookmarked BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_dialogues_student ON public.student_dialogues(student_id);
ALTER TABLE public.student_dialogues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_dialogues_own" ON public.student_dialogues;
CREATE POLICY "student_dialogues_own" ON public.student_dialogues FOR ALL 
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- ================================================================
-- PARTE 7: FUNCIONES HELPER
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_student(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_student_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  SELECT id INTO v_student_id FROM public.students WHERE user_id = p_user_id;
  IF v_student_id IS NOT NULL THEN RETURN v_student_id; END IF;
  
  SELECT email, raw_user_meta_data->>'full_name' INTO v_user_email, v_user_name
  FROM auth.users WHERE id = p_user_id;
  
  INSERT INTO public.students (user_id, display_name)
  VALUES (p_user_id, COALESCE(v_user_name, SPLIT_PART(v_user_email, '@', 1)))
  RETURNING id INTO v_student_id;
  
  RETURN v_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.match_student_chunks(
  p_query_embedding VECTOR(1536),
  p_student_id UUID,
  p_match_count INT DEFAULT 5
)
RETURNS TABLE (
  chunk_id UUID,
  material_id UUID,
  content TEXT,
  similarity NUMERIC,
  source_type TEXT,
  title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    smc.id,
    smc.material_id,
    smc.content,
    1 - (smc.embedding <=> p_query_embedding),
    smm.source_type,
    smm.title
  FROM public.student_material_chunks smc
  JOIN public.student_materials smm ON smc.material_id = smm.id
  JOIN public.student_subjects sss ON smm.subject_id = sss.id
  JOIN public.students s ON sss.student_id = s.id
  WHERE s.id = p_student_id 
    AND s.user_id = auth.uid()
    AND smm.has_embeddings = TRUE
    AND smm.is_deleted = FALSE
  ORDER BY smc.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_or_create_student TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_student_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_academy_rector TO authenticated;

COMMIT;

-- Verificación
SELECT 'Migración completada' AS status;
SELECT tablename, 'OK' FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
  'students', 'student_subjects', 'student_materials', 
  'student_material_chunks', 'student_dialogues', 'academia_rectors'
);
