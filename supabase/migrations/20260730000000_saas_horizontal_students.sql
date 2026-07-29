-- ================================================================
-- SAAS HORIZONTAL - FASE 1: FOUNDATION
-- ================================================================
-- Transformación de PaaS multi-tenant a SaaS horizontal por estudiante
-- Fecha: 2026-07-30
-- ================================================================

BEGIN;

-- ================================================================
-- 1. TABLA: students (Cada estudiante es un tenant)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Perfil del estudiante
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  locale TEXT DEFAULT 'es',
  timezone TEXT DEFAULT 'America/Bogota',
  -- Configuración personal de IA
  ai_provider TEXT DEFAULT 'openai' CHECK (ai_provider IN ('openai', 'anthropic', 'local')),
  ai_model TEXT DEFAULT 'gpt-4o-mini',
  ai_temperature NUMERIC DEFAULT 0.7 CHECK (ai_temperature >= 0 AND ai_temperature <= 2),
  ai_max_tokens INT DEFAULT 2048,
  -- Configuración de tutor
  tutor_personality TEXT DEFAULT 'socratic' CHECK (tutor_personality IN ('socratic', 'didactic', 'shein', 'custom')),
  tutor_custom_prompt TEXT,
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  is_onboarded BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  -- Settings adicionales
  settings JSONB DEFAULT '{"theme": "light", "notifications": true, "language": "es"}'::jsonb,
  -- Límites del plan
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  plan_limits JSONB DEFAULT '{
    "max_subjects": 3,
    "max_materials_per_subject": 5,
    "max_storage_mb": 100,
    "max_dialogues": 50
  }'::jsonb
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_students_user ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_plan ON public.students(plan_type);
CREATE INDEX IF NOT EXISTS idx_students_active ON public.students(is_active) WHERE is_active = TRUE;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_students_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_students_timestamp ON public.students;
CREATE TRIGGER update_students_timestamp
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_students_timestamp();

-- Trigger last_active_at
CREATE OR REPLACE FUNCTION public.update_students_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_students_last_active ON public.students;
CREATE TRIGGER update_students_last_active
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_students_last_active();

-- ================================================================
-- 2. TABLA: student_subjects (Asignaturas del estudiante)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  -- Datos de la asignatura
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📚',
  color TEXT DEFAULT '#6366f1',
  -- Configuración de IA específica para esta asignatura
  ai_system_prompt TEXT,
  ai_model_override TEXT,
  ai_temperature_override NUMERIC,
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  -- Orden
  order_index INT DEFAULT 0,
  -- Estadísticas
  materials_count INT DEFAULT 0,
  dialogues_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  -- Constraints
  UNIQUE (student_id, slug)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON public.student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_active ON public.student_subjects(student_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_student_subjects_order ON public.student_subjects(student_id, order_index);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_student_subjects_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_student_subjects_timestamp ON public.student_subjects;
CREATE TRIGGER update_student_subjects_timestamp
  BEFORE UPDATE ON public.student_subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_student_subjects_timestamp();

-- Trigger actualizar materials_count
CREATE OR REPLACE FUNCTION public.update_subjects_materials_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.student_subjects SET materials_count = materials_count + 1 WHERE id = NEW.subject_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.student_subjects SET materials_count = materials_count - 1 WHERE id = OLD.subject_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subjects_materials_count ON public.student_materials;
CREATE TRIGGER update_subjects_materials_count
  AFTER INSERT OR DELETE ON public.student_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_subjects_materials_count();

-- ================================================================
-- 3. TABLA: student_materials (Materiales por asignatura)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.student_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.student_subjects(id) ON DELETE CASCADE NOT NULL,
  -- Metadatos del material
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'pdf', 'docx', 'doc', 'txt', 'md', 'rtf',
    'url', 'webpage', 'notion', 'google_doc', 'confluence',
    'video', 'audio', 'youtube', 'vimeo',
    'image', 'csv', 'xlsx', 'pptx',
    'user_input', 'class_notes', 'homework'
  )),
  mime_type TEXT,
  -- Contenido/Referencia
  content TEXT,                    -- Para texto, URLs, etc.
  file_url TEXT,                  -- Para archivos subidos
  file_size_bytes BIGINT,         -- Tamaño del archivo
  external_id TEXT,               -- ID externo (YouTube, Notion, etc.)
  external_metadata JSONB,         -- Metadatos externos
  -- Procesamiento RAG
  processing_status TEXT DEFAULT 'pending' CHECK (
    processing_status IN ('pending', 'processing', 'chunking', 'embedding', 'completed', 'failed', 'skipped')
  ),
  processing_error TEXT,
  chunks_count INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  -- Embeddings
  has_embeddings BOOLEAN DEFAULT FALSE,
  embedding_model TEXT,
  embedding_dimension INT,
  -- Calidad del material
  quality_score NUMERIC DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 1),
  is_verified BOOLEAN DEFAULT FALSE,
  -- Timestamps
  ingested_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,          -- Para contenido con expiry
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_student_materials_subject ON public.student_materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_materials_type ON public.student_materials(source_type);
CREATE INDEX IF NOT EXISTS idx_student_materials_status ON public.student_materials(processing_status);
CREATE INDEX IF NOT EXISTS idx_student_materials_embeddings ON public.student_materials(has_embeddings) WHERE has_embeddings = TRUE;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_student_materials_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_student_materials_timestamp ON public.student_materials;
CREATE TRIGGER update_student_materials_timestamp
  BEFORE UPDATE ON public.student_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_student_materials_timestamp();

-- ================================================================
-- 4. TABLA: student_material_chunks (Chunks para RAG)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.student_material_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES public.student_materials(id) ON DELETE CASCADE NOT NULL,
  -- Chunk data
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT,               -- Para deduplicación
  -- Posición en documento original
  page_number INT,
  section_path TEXT,               -- Ruta jerárquica de secciones
  position_start INT,              -- Posición en texto original
  position_end INT,
  -- Embedding vectorial (usando pgvector)
  embedding VECTOR(1536),          -- Dimensión de OpenAI embeddings
  -- Metadatos
  word_count INT,
  token_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Constraints
  UNIQUE (material_id, chunk_index)
);

-- Índices para búsqueda vectorial
CREATE INDEX IF NOT EXISTS idx_student_chunks_material ON public.student_material_chunks(material_id);
CREATE INDEX IF NOT EXISTS idx_student_chunks_embedding ON public.student_material_chunks USING ivfflat (embedding vector_cosine_ops);

-- Habilitar pgvector si no está
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================================
-- 5. TABLA: student_dialogues (Historial de diálogos)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.student_dialogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.student_subjects(id) ON DELETE SET NULL,
  -- Título del diálogo (auto-generado o user-defined)
  title TEXT,
  auto_title TEXT,
  -- Mensajes (JSON array)
  messages JSONB DEFAULT '[]'::jsonb,
  -- Fuentes usadas
  sources_used JSONB DEFAULT '[]'::jsonb,
  -- Mensaje inicial (pregunta del usuario)
  initial_question TEXT,
  -- Métricas
  total_messages INT DEFAULT 0,
  total_user_messages INT DEFAULT 0,
  total_ai_messages INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  total_sources INT DEFAULT 0,
  avg_response_time_ms INT DEFAULT 0,
  model_used TEXT,
  ai_provider TEXT,
  -- Interacciones
  thumbs_up INT DEFAULT 0,
  thumbs_down INT DEFAULT 0,
  -- Estado
  is_bookmarked BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  share_token TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_student_dialogues_student ON public.student_dialogues(student_id);
CREATE INDEX IF NOT EXISTS idx_student_dialogues_subject ON public.student_dialogues(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_dialogues_bookmarked ON public.student_dialogues(student_id) WHERE is_bookmarked = TRUE;
CREATE INDEX IF NOT EXISTS idx_student_dialogues_recent ON public.student_dialogues(student_id, last_message_at DESC);

-- Trigger updated_at y last_message_at
CREATE OR REPLACE FUNCTION public.update_student_dialogues_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.messages IS DISTINCT FROM OLD.messages THEN
    NEW.last_message_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_student_dialogues_timestamp ON public.student_dialogues;
CREATE TRIGGER update_student_dialogues_timestamp
  BEFORE UPDATE ON public.student_dialogues
  FOR EACH ROW EXECUTE FUNCTION public.update_student_dialogues_timestamp();

-- ================================================================
-- 6. TABLA: study_sessions (Sesiones de estudio)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.student_subjects(id) ON DELETE SET NULL,
  dialogue_id UUID REFERENCES public.student_dialogues(id) ON DELETE SET NULL,
  -- Tiempo
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INT,
  -- Interacciones
  questions_asked INT DEFAULT 0,
  materials_accessed JSONB DEFAULT '[]'::jsonb,
  -- Estado
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  ended_by TEXT CHECK (ended_by IN ('user', 'system', 'timeout')),
  -- Feedback
  student_rating INT CHECK (student_rating >= 1 AND student_rating <= 5),
  student_feedback TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_study_sessions_student ON public.study_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject ON public.study_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_active ON public.study_sessions(student_id) WHERE status = 'active';

-- ================================================================
-- 7. TABLA: student_usage_metrics (Métricas de uso)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.student_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  -- Período
  date DATE NOT NULL,
  week_number INT,
  month INT,
  year INT,
  -- Métricas
  dialogues_count INT DEFAULT 0,
  messages_count INT DEFAULT 0,
  tokens_used INT DEFAULT 0,
  materials_processed INT DEFAULT 0,
  study_minutes INT DEFAULT 0,
  -- Detalles
  models_used JSONB DEFAULT '[]'::jsonb,
  subjects_accessed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Constraints
  UNIQUE (student_id, date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_student_usage_student ON public.student_usage_metrics(student_id);
CREATE INDEX IF NOT EXISTS idx_student_usage_date ON public.student_usage_metrics(date);
CREATE INDEX IF NOT EXISTS idx_student_usage_period ON public.student_usage_metrics(student_id, year, month);

-- ================================================================
-- 8. FUNCIONES HELPER PARA SaaS
-- ================================================================

-- 8.1 get_or_create_student(user_id)
-- Obtiene o crea un estudiante para un usuario
CREATE OR REPLACE FUNCTION public.get_or_create_student(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_student_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Intentar obtener estudiante existente
  SELECT id INTO v_student_id
  FROM public.students
  WHERE user_id = p_user_id;
  
  IF v_student_id IS NOT NULL THEN
    RETURN v_student_id;
  END IF;
  
  -- Obtener datos del usuario
  SELECT email, raw_user_meta_data->>'full_name' 
  INTO v_user_email, v_user_name
  FROM auth.users
  WHERE id = p_user_id;
  
  -- Crear nuevo estudiante
  INSERT INTO public.students (user_id, display_name)
  VALUES (p_user_id, COALESCE(v_user_name, SPLIT_PART(v_user_email, '@', 1)))
  RETURNING id INTO v_student_id;
  
  RETURN v_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_or_create_student(uuid) TO authenticated;

-- 8.2 user_is_student(student_id)
-- Verifica si el usuario actual es el dueño del estudiante
CREATE OR REPLACE FUNCTION public.user_is_student(p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = p_student_id
    AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.user_is_student(uuid) TO authenticated;

-- 8.3 user_can_access_subject(subject_id)
-- Verifica si el usuario puede acceder a una asignatura
CREATE OR REPLACE FUNCTION public.user_can_access_subject(p_subject_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_subjects ss
    JOIN public.students s ON ss.student_id = s.id
    WHERE ss.id = p_subject_id
    AND s.user_id = auth.uid()
    AND ss.is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.user_can_access_subject(uuid) TO authenticated;

-- 8.4 get_student_id(user_id)
-- Obtiene el student_id para un user_id
CREATE OR REPLACE FUNCTION public.get_student_id(p_user_id UUID DEFAULT NULL)
RETURNS UUID AS $$
  SELECT id FROM public.students
  WHERE user_id = COALESCE(p_user_id, auth.uid())
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_student_id(uuid) TO authenticated;

-- 8.5 match_student_chunks RPC
-- Búsqueda vectorial en chunks del estudiante
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
  WHERE s.id = p_student_id
    AND s.user_id = auth.uid()
    AND smm.has_embeddings = TRUE
    AND smm.processing_status = 'completed'
    AND smm.is_deleted = FALSE
    AND (p_subject_id IS NULL OR sss.id = p_subject_id)
  ORDER BY smc.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.match_student_chunks(vector, uuid, uuid, int, numeric) 
TO authenticated;

-- ================================================================
-- 9. RLS POLICIES (Estanco Hermético)
-- ================================================================

-- Habilitar RLS en todas las tablas SaaS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_material_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_dialogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_usage_metrics ENABLE ROW LEVEL SECURITY;

-- STUDENTS: Solo el propio estudiante
CREATE POLICY "students_own_data"
  ON public.students FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- STUDENT_SUBJECTS: Solo el dueño
CREATE POLICY "student_subjects_own"
  ON public.student_subjects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = student_subjects.student_id 
      AND students.user_id = auth.uid()
    )
  );

-- STUDENT_MATERIALS: Solo el dueño
CREATE POLICY "student_materials_own"
  ON public.student_materials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.student_subjects ss
      JOIN public.students s ON ss.student_id = s.id
      WHERE ss.id = student_materials.subject_id
      AND s.user_id = auth.uid()
    )
  );

-- STUDENT_MATERIAL_CHUNKS: Solo acceso vía JOIN
CREATE POLICY "student_chunks_select_own"
  ON public.student_material_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_materials sm
      JOIN public.student_subjects ss ON sm.subject_id = ss.id
      JOIN public.students s ON ss.student_id = s.id
      WHERE sm.id = student_material_chunks.material_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "student_chunks_insert_own"
  ON public.student_material_chunks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.student_materials sm
      JOIN public.student_subjects ss ON sm.subject_id = ss.id
      JOIN public.students s ON ss.student_id = s.id
      WHERE sm.id = student_material_chunks.material_id
      AND s.user_id = auth.uid()
    )
  );

-- STUDENT_DIALOGUES: Solo el dueño
CREATE POLICY "student_dialogues_own"
  ON public.student_dialogues FOR ALL
  USING (student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  ));

-- STUDY_SESSIONS: Solo el dueño
CREATE POLICY "study_sessions_own"
  ON public.study_sessions FOR ALL
  USING (student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  ));

-- STUDENT_USAGE_METRICS: Solo el dueño
CREATE POLICY "student_usage_own"
  ON public.student_usage_metrics FOR ALL
  USING (student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  ));

-- ================================================================
-- 10. GRANTS
-- ================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ================================================================
-- 11. VERIFICACIÓN
-- ================================================================

SELECT 
  'SaaS Horizontal Schema' AS description,
  COUNT(*) AS tables_created
FROM (
  SELECT tablename FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN (
    'students', 'student_subjects', 'student_materials',
    'student_material_chunks', 'student_dialogues',
    'study_sessions', 'student_usage_metrics'
  )
) t;

COMMIT;

-- ================================================================
-- POST-MIGRATION: Crear estudiante para el admin actual
-- ================================================================
-- Esto se ejecuta después de la migración para asegurar que 
-- el usuario actual tenga un perfil de estudiante
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Obtener el primer usuario (admin actual)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    PERFORM public.get_or_create_student(v_user_id);
  END IF;
END $$;
