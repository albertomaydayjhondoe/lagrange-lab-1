-- ================================================================
-- CONSOLIDATED MIGRATION: SaaS Horizontal + Login Rector
-- ================================================================
-- Ejecuta este archivo completo en el SQL Editor de Supabase
-- Una sola migración que incluye todo
-- ================================================================

BEGIN;

-- ================================================================
-- PARTE 1: LOGIN RECTOR - ELEVACIÓN Y SOBERANÍA
-- ================================================================

-- 1.1 Agregar rol 'rector' al CHECK existente
ALTER TABLE public.academy_members
DROP CONSTRAINT IF EXISTS academy_members_role_check;

ALTER TABLE public.academy_members
ADD CONSTRAINT academy_members_role_check 
CHECK (role IN ('owner', 'admin', 'platon', 'member', 'rector'));

-- 1.2 Crear tabla academia_rectors
CREATE TABLE IF NOT EXISTS public.academia_rectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'Rector' CHECK (title IN ('Rector', 'Vice-Rector', 'Decano', 'Director General', 'Presidente')),
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
CREATE INDEX IF NOT EXISTS idx_academia_rectors_current ON public.academia_rectors(academy_id) WHERE is_current = TRUE;

-- 1.3 Funciones helper para Rector
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

CREATE OR REPLACE FUNCTION public.user_can_manage_academy(p_academy_id UUID)
RETURNS BOOLEAN AS $$
  SELECT 
    user_is_academy_owner(p_academy_id)
    OR user_is_academy_rector(p_academy_id)
    OR user_is_platform_admin();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 1.4 RLS para academia_rectors
ALTER TABLE public.academia_rectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rectors_select_public" ON public.academia_rectors FOR SELECT
USING (is_current = TRUE AND is_active = TRUE);

CREATE POLICY "rector_can_view_own_record" ON public.academia_rectors FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "manage_academy_can_insert_rector" ON public.academia_rectors FOR INSERT
WITH CHECK (user_can_manage_academy(academy_id) AND auth.uid() IS NOT NULL);

CREATE POLICY "rector_or_platform_admin_can_update" ON public.academia_rectors FOR UPDATE
USING (user_can_manage_academy(academy_id) OR user_id = auth.uid());

CREATE POLICY "platform_admin_can_delete_rector" ON public.academia_rectors FOR DELETE
USING (user_is_platform_admin());

-- 1.5 Función assign_rector
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
BEGIN
  IF NOT user_can_manage_academy(p_academy_id) THEN
    RAISE EXCEPTION 'No tienes autoridad para designar un rector en esta academia';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.academy_members 
    WHERE academy_id = p_academy_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'El usuario designado debe ser miembro de la academia';
  END IF;

  UPDATE public.academia_rectors 
  SET is_current = FALSE, updated_at = NOW()
  WHERE academy_id = p_academy_id AND is_current = TRUE;

  INSERT INTO public.academia_rectors (
    user_id, academy_id, title, appointed_by, decree_number, institution_oath
  ) VALUES (
    p_user_id, p_academy_id, p_title, 
    COALESCE(p_appointed_by, auth.uid()),
    p_decree_number, p_institution_oath
  )
  RETURNING id INTO v_new_rector_id;

  INSERT INTO public.academy_members (academy_id, user_id, role)
  VALUES (p_academy_id, p_user_id, 'rector')
  ON CONFLICT (academy_id, user_id) 
  DO UPDATE SET role = 'rector';

  RETURN v_new_rector_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.6 Agregar campos de soberanía a academies
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

-- ================================================================
-- PARTE 2: SAAS HORIZONTAL - MODELO POR ESTUDIANTE
-- ================================================================

-- 2.1 Tabla students
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  locale TEXT DEFAULT 'es',
  timezone TEXT DEFAULT 'America/Bogota',
  ai_provider TEXT DEFAULT 'openai' CHECK (ai_provider IN ('openai', 'anthropic', 'local')),
  ai_model TEXT DEFAULT 'gpt-4o-mini',
  ai_temperature NUMERIC DEFAULT 0.7 CHECK (ai_temperature >= 0 AND ai_temperature <= 2),
  ai_max_tokens INT DEFAULT 2048,
  tutor_personality TEXT DEFAULT 'socratic' CHECK (tutor_personality IN ('socratic', 'didactic', 'shein', 'custom')),
  tutor_custom_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  is_onboarded BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{"theme": "light", "notifications": true, "language": "es"}'::jsonb,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  plan_limits JSONB DEFAULT '{"max_subjects": 3, "max_materials_per_subject": 5, "max_storage_mb": 100, "max_dialogues": 50}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_students_user ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_plan ON public.students(plan_type);
CREATE INDEX IF NOT EXISTS idx_students_active ON public.students(is_active) WHERE is_active = TRUE;

-- 2.2 Tabla student_subjects
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
CREATE INDEX IF NOT EXISTS idx_student_subjects_active ON public.student_subjects(student_id) WHERE is_active = TRUE;

-- 2.3 Tabla student_materials
CREATE TABLE IF NOT EXISTS public.student_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.student_subjects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'pdf', 'docx', 'doc', 'txt', 'md', 'rtf',
    'url', 'webpage', 'notion', 'google_doc',
    'video', 'audio', 'youtube', 'vimeo',
    'image', 'csv', 'xlsx', 'pptx',
    'user_input', 'class_notes', 'homework'
  )),
  mime_type TEXT,
  content TEXT,
  file_url TEXT,
  file_size_bytes BIGINT,
  external_id TEXT,
  external_metadata JSONB,
  processing_status TEXT DEFAULT 'pending' CHECK (
    processing_status IN ('pending', 'processing', 'chunking', 'embedding', 'completed', 'failed', 'skipped')
  ),
  processing_error TEXT,
  chunks_count INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  has_embeddings BOOLEAN DEFAULT FALSE,
  embedding_model TEXT,
  embedding_dimension INT,
  quality_score NUMERIC DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 1),
  is_verified BOOLEAN DEFAULT FALSE,
  ingested_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_student_materials_subject ON public.student_materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_materials_type ON public.student_materials(source_type);
CREATE INDEX IF NOT EXISTS idx_student_materials_status ON public.student_materials(processing_status);

-- 2.4 Tabla student_material_chunks
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
CREATE INDEX IF NOT EXISTS idx_student_chunks_embedding ON public.student_material_chunks USING ivfflat (embedding vector_cosine_ops);

-- 2.5 Tabla student_dialogues
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
  total_user_messages INT DEFAULT 0,
  total_ai_messages INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  total_sources INT DEFAULT 0,
  avg_response_time_ms INT DEFAULT 0,
  model_used TEXT,
  ai_provider TEXT,
  thumbs_up INT DEFAULT 0,
  thumbs_down INT DEFAULT 0,
  is_bookmarked BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  share_token TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_dialogues_student ON public.student_dialogues(student_id);
CREATE INDEX IF NOT EXISTS idx_student_dialogues_subject ON public.student_dialogues(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_dialogues_bookmarked ON public.student_dialogues(student_id) WHERE is_bookmarked = TRUE;
CREATE INDEX IF NOT EXISTS idx_student_dialogues_recent ON public.student_dialogues(student_id, last_message_at DESC);

-- 2.6 Tabla study_sessions
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.student_subjects(id) ON DELETE SET NULL,
  dialogue_id UUID REFERENCES public.student_dialogues(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INT,
  questions_asked INT DEFAULT 0,
  materials_accessed JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  ended_by TEXT CHECK (ended_by IN ('user', 'system', 'timeout')),
  student_rating INT CHECK (student_rating >= 1 AND student_rating <= 5),
  student_feedback TEXT
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_student ON public.study_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_active ON public.study_sessions(student_id) WHERE status = 'active';

-- 2.7 Funciones helper SaaS
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

CREATE OR REPLACE FUNCTION public.user_is_student(p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.students WHERE id = p_student_id AND user_id = auth.uid());
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_can_access_subject(p_subject_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_subjects ss
    JOIN public.students s ON ss.student_id = s.id
    WHERE ss.id = p_subject_id AND s.user_id = auth.uid() AND ss.is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_student_id(p_user_id UUID DEFAULT NULL)
RETURNS UUID AS $$
  SELECT id FROM public.students WHERE user_id = COALESCE(p_user_id, auth.uid()) LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.match_student_chunks(
  p_query_embedding VECTOR(1536),
  p_student_id UUID,
  p_subject_id UUID DEFAULT NULL,
  p_match_count INT DEFAULT 5,
  p_min_similarity NUMERIC DEFAULT 0.7
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
    smc.id AS chunk_id,
    smc.material_id,
    smc.content,
    1 - (smc.embedding <=> p_query_embedding) AS similarity,
    smm.source_type,
    smm.title
  FROM public.student_material_chunks smc
  JOIN public.student_materials smm ON smc.material_id = smm.id
  JOIN public.student_subjects sss ON smm.subject_id = sss.id
  JOIN public.students s ON sss.student_id = s.id
  WHERE s.id = p_student_id AND s.user_id = auth.uid()
    AND smm.has_embeddings = TRUE AND smm.processing_status = 'completed' AND smm.is_deleted = FALSE
    AND (p_subject_id IS NULL OR sss.id = p_subject_id)
  ORDER BY smc.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.8 RLS para SaaS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_own_data" ON public.students FOR ALL
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_subjects_own" ON public.student_subjects FOR ALL
USING (EXISTS (SELECT 1 FROM public.students WHERE students.id = student_subjects.student_id AND students.user_id = auth.uid()));

ALTER TABLE public.student_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_materials_own" ON public.student_materials FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.student_subjects ss
  JOIN public.students s ON ss.student_id = s.id
  WHERE ss.id = student_materials.subject_id AND s.user_id = auth.uid()
));

ALTER TABLE public.student_material_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_chunks_select_own" ON public.student_material_chunks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.student_materials sm
  JOIN public.student_subjects ss ON sm.subject_id = ss.id
  JOIN public.students s ON ss.student_id = s.id
  WHERE sm.id = student_material_chunks.material_id AND s.user_id = auth.uid()
));

ALTER TABLE public.student_dialogues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_dialogues_own" ON public.student_dialogues FOR ALL
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_sessions_own" ON public.study_sessions FOR ALL
USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- 2.9 Grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 2.10 Crear estudiante para el admin actual
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NOT NULL THEN PERFORM public.get_or_create_student(v_user_id); END IF;
END $$;

COMMIT;

-- ================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ================================================================
SELECT 
  'Migración completada' AS status,
  NOW() AS executed_at,
  COUNT(*) AS tables_created
FROM (
  SELECT tablename FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN (
    'students', 'student_subjects', 'student_materials',
    'student_material_chunks', 'student_dialogues', 'study_sessions',
    'academia_rectors'
  )
) t;

SELECT 'Edge Functions a desplegar:' AS info;
SELECT name FROM (
  VALUES 
    ('student-oracle'),
    ('ingest-material'),
    ('manage-subject'),
    ('manage-rector')
) AS functions(name);
