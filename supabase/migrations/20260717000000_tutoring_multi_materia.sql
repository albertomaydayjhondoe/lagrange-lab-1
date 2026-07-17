-- ================================================================
-- TUTORÍAS MULTI-MATERIA CON RAG Y PAGO MOCK
-- Sistema completo de tutorías para una academia
-- ================================================================

-- Habilitar pgvector si no existe
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================================
-- 1. PERFILES EXTENDIDOS CON ROLES DE TUTORÍA
-- ================================================================

-- Agregar rol de tutor a profiles si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_type WHERE typname = 'user_role_type'
  ) THEN
    -- Crear tipo para roles de usuario
    CREATE TYPE user_role_type AS ENUM ('admin', 'tutor', 'estudiante', 'platon', 'member');
  END IF;
  
  -- Agregar columna role si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN role user_role_type DEFAULT 'estudiante';
  END IF;
  
  -- Agregar tutor profile fields si no existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN bio TEXT,
    ADD COLUMN avatar_url TEXT,
    ADD COLUMN hourly_rate_cents INTEGER DEFAULT 0,
    ADD COLUMN specialties TEXT[] DEFAULT '{}',
    ADD COLUMN is_available BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ================================================================
-- 2. MATERIAS (SUBJECTS)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'BookOpen',
  color TEXT DEFAULT '#8B5CF6',
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subjects_slug ON public.subjects(slug);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON public.subjects(is_active) WHERE is_active = true;

-- ================================================================
-- 3. TEMAS (TOPICS)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, slug)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_topics_subject ON public.topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_order ON public.topics(subject_id, order_index);

-- ================================================================
-- 4. MATERIALES (con RAG/pgvector)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'pdf', 'video', 'link', 'quiz')),
  source_url TEXT,
  embedding vector(1536),
  keywords TEXT[] DEFAULT '{}',
  is_rag_enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para RAG
CREATE INDEX IF NOT EXISTS idx_materials_embedding ON public.materials 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_materials_topic ON public.materials(topic_id);
CREATE INDEX IF NOT EXISTS idx_materials_subject ON public.materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_materials_keywords ON public.materials USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_materials_rag ON public.materials(is_rag_enabled, status) 
  WHERE is_rag_enabled = true AND status = 'active';

-- ================================================================
-- 5. SESIONES DE TUTORÍA
-- ================================================================

CREATE TABLE IF NOT EXISTS public.tutoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 60,
  scheduled_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ GENERATED ALWAYS AS (scheduled_at + (duration_minutes || ' minutes')::interval) STORED,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  meeting_link TEXT,
  is_rag_enabled BOOLEAN DEFAULT true,
  ai_model TEXT DEFAULT 'gpt-4o-mini',
  price_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  max_students INTEGER DEFAULT 1,
  current_students INTEGER DEFAULT 0,
  location TEXT DEFAULT 'online',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sessions_subject ON public.tutoring_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tutor ON public.tutoring_sessions(tutor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled ON public.tutoring_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.tutoring_sessions(status);

-- ================================================================
-- 6. RESERVAS DE SESIONES
-- ================================================================

CREATE TABLE IF NOT EXISTS public.session_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.tutoring_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'attended', 'completed', 'no_show', 'cancelled')),
  notes TEXT,
  booking_type TEXT DEFAULT 'individual' CHECK (booking_type IN ('individual', 'group')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bookings_session ON public.session_bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON public.session_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.session_bookings(status);

-- ================================================================
-- 7. PAGOS MOCK (STRIPE)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.session_bookings(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.tutoring_sessions(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tutor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled')),
  payment_method TEXT DEFAULT 'card',
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_tutor ON public.payments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe ON public.payments(stripe_payment_intent_id);

-- ================================================================
-- 8. HISTORIAL DE TUTORÍAS (para contexto RAG)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.tutoring_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.tutoring_sessions(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.profiles(id),
  tutor_id UUID REFERENCES public.profiles(id),
  topic_id UUID REFERENCES public.topics(id),
  question TEXT NOT NULL,
  ai_response TEXT,
  materials_used JSONB DEFAULT '[]',
  rag_context_used BOOLEAN DEFAULT false,
  token_usage INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_history_session ON public.tutoring_history(session_id);
CREATE INDEX IF NOT EXISTS idx_history_student ON public.tutoring_history(student_id);
CREATE INDEX IF NOT EXISTS idx_history_subject ON public.tutoring_history(subject_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON public.tutoring_history(created_at DESC);

-- ================================================================
-- 9. DISPONIBILIDAD DE TUTORES
-- ================================================================

CREATE TABLE IF NOT EXISTS public.tutor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  is_recurring BOOLEAN DEFAULT true,
  specific_date DATE,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, day_of_week, start_time, specific_date)
);

CREATE INDEX IF NOT EXISTS idx_availability_tutor ON public.tutor_availability(tutor_id);

-- ================================================================
-- 10. SUSCRIPCIONES MOCK
-- ================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'basic', 'pro', 'unlimited')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  sessions_remaining INTEGER DEFAULT 0,
  sessions_total INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- ================================================================
-- FUNCIONES HELPER
-- ================================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para subjects
DROP TRIGGER IF EXISTS update_subjects_updated_at ON public.subjects;
CREATE TRIGGER update_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para topics
DROP TRIGGER IF EXISTS update_topics_updated_at ON public.topics;
CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para materials
DROP TRIGGER IF EXISTS update_materials_updated_at ON public.materials;
CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para tutoring_sessions
DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.tutoring_sessions;
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.tutoring_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para session_bookings
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.session_bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.session_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para payments
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================================
-- RPC: Búsqueda RAG de materiales
-- ================================================================

CREATE OR REPLACE FUNCTION public.match_materials(
  query_embedding vector(1536),
  match_subject_id uuid DEFAULT NULL,
  match_topic_id uuid DEFAULT NULL,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  topic_id uuid,
  subject_id uuid,
  keywords text[],
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.title,
    m.content,
    m.topic_id,
    m.subject_id,
    m.keywords,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM public.materials m
  WHERE m.is_rag_enabled = true
    AND m.status = 'active'
    AND m.embedding IS NOT NULL
    AND (match_subject_id IS NULL OR m.subject_id = match_subject_id)
    AND (match_topic_id IS NULL OR m.topic_id = match_topic_id)
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION public.match_materials(vector, uuid, uuid, int) FROM public;
GRANT EXECUTE ON FUNCTION public.match_materials(vector, uuid, uuid, int) TO authenticated, service_role;

-- ================================================================
-- RPC: Obtener sesiones disponibles
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_available_sessions(
  p_subject_id uuid DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  session_id uuid,
  title text,
  description text,
  subject_name text,
  tutor_name text,
  tutor_avatar text,
  scheduled_at timestamptz,
  duration_minutes integer,
  price_cents integer,
  currency text,
  spots_remaining integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ts.id as session_id,
    ts.title,
    ts.description,
    s.name as subject_name,
    p.full_name as tutor_name,
    p.avatar_url as tutor_avatar,
    ts.scheduled_at,
    ts.duration_minutes,
    ts.price_cents,
    ts.currency,
    (ts.max_students - ts.current_students) as spots_remaining
  FROM public.tutoring_sessions ts
  INNER JOIN public.subjects s ON ts.subject_id = s.id
  INNER JOIN public.profiles p ON ts.tutor_id = p.id
  WHERE ts.status = 'scheduled'
    AND ts.scheduled_at > NOW()
    AND ts.current_students < ts.max_students
    AND (p_subject_id IS NULL OR ts.subject_id = p_subject_id)
  ORDER BY ts.scheduled_at ASC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.get_available_sessions(uuid, int) FROM public;
GRANT EXECUTE ON FUNCTION public.get_available_sessions(uuid, int) TO authenticated, anon, service_role;

-- ================================================================
-- RPC: Estadísticas del tutor
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_tutor_stats(p_tutor_id uuid)
RETURNS TABLE (
  total_sessions integer,
  completed_sessions integer,
  total_students integer,
  total_earnings_cents bigint,
  avg_rating numeric,
  upcoming_sessions integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((SELECT COUNT(*) FROM public.tutoring_sessions WHERE tutor_id = p_tutor_id), 0)::integer as total_sessions,
    COALESCE((SELECT COUNT(*) FROM public.tutoring_sessions WHERE tutor_id = p_tutor_id AND status = 'completed'), 0)::integer as completed_sessions,
    COALESCE((SELECT COUNT(DISTINCT student_id) FROM public.session_bookings sb
      JOIN public.tutoring_sessions ts ON sb.session_id = ts.id
      WHERE ts.tutor_id = p_tutor_id), 0)::integer as total_students,
    COALESCE((SELECT SUM(amount_cents) FROM public.payments WHERE tutor_id = p_tutor_id AND status = 'paid'), 0)::bigint as total_earnings_cents,
    COALESCE((SELECT AVG(rating)::numeric(3,2) FROM public.tutoring_history WHERE tutor_id = p_tutor_id AND rating IS NOT NULL), 0)::numeric as avg_rating,
    COALESCE((SELECT COUNT(*) FROM public.tutoring_sessions WHERE tutor_id = p_tutor_id AND status = 'scheduled' AND scheduled_at > NOW()), 0)::integer as upcoming_sessions;
END;
$$;

REVOKE ALL ON FUNCTION public.get_tutor_stats(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_tutor_stats(uuid) TO authenticated, service_role;

-- ================================================================
-- RLS POLICIES
-- ================================================================

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutoring_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- SUBJECTS: Todos pueden ver materias activas
CREATE POLICY "Anyone can view active subjects"
  ON public.subjects FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage subjects"
  ON public.subjects FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles 
      WHERE role IN ('admin', 'tutor')
    )
  );

-- TOPICS: Visible según materia
CREATE POLICY "Anyone can view topics"
  ON public.topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.subjects 
      WHERE subjects.id = topics.subject_id AND subjects.is_active = true
    )
  );

CREATE POLICY "Tutors can manage topics"
  ON public.topics FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles 
      WHERE role IN ('admin', 'tutor')
    )
  );

-- MATERIALS: Visible si está activo
CREATE POLICY "Anyone can view active materials"
  ON public.materials FOR SELECT
  USING (status = 'active');

CREATE POLICY "Creators can manage their materials"
  ON public.materials FOR ALL
  USING (
    created_by = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM public.profiles 
      WHERE role = 'admin'
    )
  );

-- TUTORING SESSIONS: Visible según participación
CREATE POLICY "Anyone can view scheduled sessions"
  ON public.tutoring_sessions FOR SELECT
  USING (status IN ('scheduled', 'in_progress', 'completed'));

CREATE POLICY "Tutors can create sessions"
  ON public.tutoring_sessions FOR INSERT
  WITH CHECK (
    tutor_id = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Tutors can manage their sessions"
  ON public.tutoring_sessions FOR UPDATE
  USING (
    tutor_id = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );

-- SESSION BOOKINGS
CREATE POLICY "Users can view their bookings"
  ON public.session_bookings FOR SELECT
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tutoring_sessions ts
      WHERE ts.id = session_bookings.session_id AND ts.tutor_id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Students can create bookings"
  ON public.session_bookings FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Users can update their bookings"
  ON public.session_bookings FOR UPDATE
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tutoring_sessions ts
      WHERE ts.id = session_bookings.session_id AND ts.tutor_id = auth.uid()
    )
  );

-- PAYMENTS
CREATE POLICY "Users can view their payments"
  ON public.payments FOR SELECT
  USING (
    student_id = auth.uid()
    OR tutor_id = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Service can manage payments"
  ON public.payments FOR ALL
  TO service_role
  USING (true);

-- TUTORING HISTORY
CREATE POLICY "Users can view their history"
  ON public.tutoring_history FOR SELECT
  USING (
    student_id = auth.uid()
    OR tutor_id = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Authenticated can create history"
  ON public.tutoring_history FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    OR tutor_id = auth.uid()
  );

-- TUTOR AVAILABILITY
CREATE POLICY "Anyone can view tutor availability"
  ON public.tutor_availability FOR SELECT
  USING (is_available = true);

CREATE POLICY "Tutors can manage their availability"
  ON public.tutor_availability FOR ALL
  USING (tutor_id = auth.uid());

-- SUBSCRIPTIONS
CREATE POLICY "Users can view their subscriptions"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their subscriptions"
  ON public.subscriptions FOR ALL
  USING (user_id = auth.uid());

-- ================================================================
-- DATA SEED: Materias de ejemplo
-- ================================================================

INSERT INTO public.subjects (slug, name, description, icon, color) VALUES
  ('matematicas', 'Matemáticas', 'Álgebra, cálculo, geometría y estadística', 'Calculator', '#3B82F6'),
  ('fisica', 'Física', 'Mecánica, termodinámica, electromagnetismo', 'Atom', '#10B981'),
  ('quimica', 'Química', 'Química orgánica, inorgánica y analítica', 'FlaskConical', '#F59E0B'),
  ('biologia', 'Biología', 'Biología celular, genética y ecología', 'Leaf', '#22C55E'),
  ('programacion', 'Programación', 'Python, JavaScript, algoritmos y estructuras de datos', 'Code', '#8B5CF6'),
  ('historia', 'Historia', 'Historia universal, de México y pensamiento crítico', 'BookOpen', '#EF4444'),
  ('filosofia', 'Filosofía', 'Ética, lógica, metafísica y epistemología', 'Sparkles', '#EC4899'),
  ('literatura', 'Literatura', 'Análisis literario, escritura creativa y narrativa', 'Feather', '#6366F1')
ON CONFLICT (slug) DO NOTHING;

-- Hacer admin a un usuario de ejemplo (reemplazar con ID real)
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';

COMMENT ON TABLE public.subjects IS 'Materias académicas disponibles para tutorías';
COMMENT ON TABLE public.topics IS 'Temas específicos dentro de cada materia';
COMMENT ON TABLE public.materials IS 'Materiales educativos con embeddings para RAG';
COMMENT ON TABLE public.tutoring_sessions IS 'Sesiones de tutoría programadas';
COMMENT ON TABLE public.session_bookings IS 'Reservas de estudiantes a sesiones';
COMMENT ON TABLE public.payments IS 'Pagos mock simulando Stripe';
COMMENT ON TABLE public.tutoring_history IS 'Historial de interacciones de tutoría con IA';
