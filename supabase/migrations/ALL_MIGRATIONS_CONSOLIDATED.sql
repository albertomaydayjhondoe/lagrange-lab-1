-- ================================================================
-- LAGRANGE LAB - MIGRACIÓN COMPLETA CONSOLIDADA
-- Ejecutar TODAS las migraciones en orden desde Supabase SQL Editor
-- INCLUYE: Flowchart RAG Multi-Formato (Academia Spaces + Provenance)
-- ================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================================
-- 1. PERFILES (profiles) - tabla base de usuarios
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ================================================================
-- 2. ACADEMIES - Academias Socráticas
-- ================================================================
CREATE TABLE IF NOT EXISTS public.academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner_user_id UUID REFERENCES public.profiles(id),
  is_public BOOLEAN DEFAULT false,
  oracle_persona_prompt TEXT,
  default_ejes TEXT[] DEFAULT ARRAY['Miedo', 'Control', 'SaludMental', 'Legitimidad', 'Responsabilidad'],
  vitality_score DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academies_slug ON public.academies(slug);
CREATE INDEX IF NOT EXISTS idx_academies_owner ON public.academies(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_academies_public ON public.academies(is_public) WHERE is_public = true;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_academies_updated_at ON public.academies;
CREATE TRIGGER update_academies_updated_at
  BEFORE UPDATE ON public.academies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for academies
ALTER TABLE public.academies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view academies"
  ON public.academies FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create academies"
  ON public.academies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners can update their academies"
  ON public.academies FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can delete their academies"
  ON public.academies FOR DELETE
  USING (owner_user_id = auth.uid());

-- ================================================================
-- 3. ACADEMY MEMBERS - Miembros de academias
-- ================================================================
CREATE TABLE IF NOT EXISTS public.academy_members (
  academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'platon', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (academy_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_academy_members_user ON public.academy_members(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_members_role ON public.academy_members(role);

ALTER TABLE public.academy_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memberships"
  ON public.academy_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Academy owners can view memberships"
  ON public.academy_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = academy_members.academy_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can join academies"
  ON public.academy_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Helper function to check membership
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

-- ================================================================
-- 4. THEMATIC AXES - Ejes temáticos
-- ================================================================
CREATE TABLE IF NOT EXISTS public.thematic_axes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tension_level DECIMAL(3,2) DEFAULT 0.5,
  color TEXT DEFAULT '#8B5CF6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thematic_axes_academy ON public.thematic_axes(academy_id);

ALTER TABLE public.thematic_axes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view axes"
  ON public.thematic_axes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = thematic_axes.academy_id
      AND academy_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.academies
      WHERE academies.id = thematic_axes.academy_id
      AND academies.is_public = true
    )
  );

CREATE POLICY "Admins can manage axes"
  ON public.thematic_axes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = thematic_axes.academy_id
      AND academy_members.user_id = auth.uid()
      AND academy_members.role IN ('owner', 'admin')
    )
  );

-- ================================================================
-- 5. TOPOLOGY NODES - Nodos de topología
-- ================================================================
CREATE TABLE IF NOT EXISTS public.topology_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
  eje TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tension DECIMAL(3,2) DEFAULT 0.5,
  position_x DECIMAL(10,2),
  position_y DECIMAL(10,2),
  vitality DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topology_nodes_academy ON public.topology_nodes(academy_id);
CREATE INDEX IF NOT EXISTS idx_topology_nodes_eje ON public.topology_nodes(eje);

ALTER TABLE public.topology_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view nodes"
  ON public.topology_nodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = topology_nodes.academy_id
      AND academy_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.academies
      WHERE academies.id = topology_nodes.academy_id
      AND academies.is_public = true
    )
  );

CREATE POLICY "Platon+ can create nodes"
  ON public.topology_nodes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = topology_nodes.academy_id
      AND academy_members.user_id = auth.uid()
      AND academy_members.role IN ('owner', 'admin', 'platon')
    )
  );

CREATE POLICY "Platon+ can update nodes"
  ON public.topology_nodes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = topology_nodes.academy_id
      AND academy_members.user_id = auth.uid()
      AND academy_members.role IN ('owner', 'admin', 'platon')
    )
  );

-- ================================================================
-- 6. TOPOLOGY EDGES - Aristas de topología
-- ================================================================
CREATE TABLE IF NOT EXISTS public.topology_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
  source_node_id UUID REFERENCES public.topology_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES public.topology_nodes(id) ON DELETE CASCADE,
  tension DECIMAL(3,2) DEFAULT 0.5,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topology_edges_academy ON public.topology_edges(academy_id);

ALTER TABLE public.topology_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view edges"
  ON public.topology_edges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = topology_edges.academy_id
      AND academy_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.academies
      WHERE academies.id = topology_edges.academy_id
      AND academies.is_public = true
    )
  );

-- ================================================================
-- 7. SOCRATIC QUESTIONS - Preguntas socráticas
-- ================================================================
CREATE TABLE IF NOT EXISTS public.socratic_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  eje TEXT NOT NULL,
  nivel INTEGER DEFAULT 2,
  tension DECIMAL(3,2) DEFAULT 0.7,
  user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_socratic_questions_academy ON public.socratic_questions(academy_id);

ALTER TABLE public.socratic_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view questions"
  ON public.socratic_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = socratic_questions.academy_id
      AND academy_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.academies
      WHERE academies.id = socratic_questions.academy_id
      AND academies.is_public = true
    )
  );

CREATE POLICY "Members can create questions"
  ON public.socratic_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = socratic_questions.academy_id
      AND academy_members.user_id = auth.uid()
    )
  );

-- ================================================================
-- 8. CORPUS FRAGMENTS - Fragmentos con embeddings para RAG
-- ================================================================
CREATE TABLE IF NOT EXISTS public.corpus_fragments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file TEXT,
  source_section TEXT,
  axis TEXT[] DEFAULT '{}',
  tension DECIMAL(3,2) DEFAULT 0.5,
  content TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  weight DECIMAL(5,2) DEFAULT 1.0,
  academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL,
  embedding vector(1536),
  source_type TEXT DEFAULT 'seed',
  title TEXT,
  upload_status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corpus_fragments_embedding 
  ON public.corpus_fragments USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE public.corpus_fragments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view fragments"
  ON public.corpus_fragments FOR SELECT
  USING (
    academy_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_members.academy_id = corpus_fragments.academy_id
      AND academy_members.user_id = auth.uid()
    )
  );

-- ================================================================
-- 9. SAVED DIALOGUES - Diálogos guardados
-- ================================================================
CREATE TABLE IF NOT EXISTS public.saved_dialogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL,
  title TEXT,
  dialogue JSONB NOT NULL DEFAULT '[]',
  eje TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_dialogues_user ON public.saved_dialogues(user_id);

ALTER TABLE public.saved_dialogues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dialogues"
  ON public.saved_dialogues FOR ALL
  USING (user_id = auth.uid());

-- ================================================================
-- 10. TUTORÍAS: SUBJECTS - Materias
-- ================================================================
CREATE TYPE user_role_type AS ENUM ('admin', 'tutor', 'estudiante', 'platon', 'member');

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role user_role_type DEFAULT 'estudiante';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hourly_rate_cents INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

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

CREATE INDEX IF NOT EXISTS idx_subjects_slug ON public.subjects(slug);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON public.subjects(is_active) WHERE is_active = true;

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active subjects"
  ON public.subjects FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage subjects"
  ON public.subjects FOR ALL
  USING (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE role IN ('admin', 'tutor'))
  );

-- ================================================================
-- 11. TUTORÍAS: TOPICS - Temas
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

CREATE INDEX IF NOT EXISTS idx_topics_subject ON public.topics(subject_id);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

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
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE role IN ('admin', 'tutor'))
  );

-- ================================================================
-- 12. TUTORÍAS: MATERIALS - Materiales con RAG
-- ================================================================
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  source_url TEXT,
  embedding vector(1536),
  keywords TEXT[] DEFAULT '{}',
  is_rag_enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_embedding ON public.materials 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_materials_topic ON public.materials(topic_id);
CREATE INDEX IF NOT EXISTS idx_materials_subject ON public.materials(subject_id);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active materials"
  ON public.materials FOR SELECT
  USING (status = 'active');

CREATE POLICY "Creators can manage materials"
  ON public.materials FOR ALL
  USING (
    created_by = auth.uid()
    OR auth.uid() IN (SELECT user_id FROM public.profiles WHERE role = 'admin')
  );

-- ================================================================
-- 13. TUTORÍAS: TUTORING SESSIONS - Sesiones
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
  status TEXT DEFAULT 'scheduled',
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

CREATE INDEX IF NOT EXISTS idx_sessions_subject ON public.tutoring_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tutor ON public.tutoring_sessions(tutor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled ON public.tutoring_sessions(scheduled_at);

ALTER TABLE public.tutoring_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scheduled sessions"
  ON public.tutoring_sessions FOR SELECT
  USING (status IN ('scheduled', 'in_progress', 'completed'));

CREATE POLICY "Tutors can create sessions"
  ON public.tutoring_sessions FOR INSERT
  WITH CHECK (
    tutor_id = auth.uid()
    OR auth.uid() IN (SELECT user_id FROM public.profiles WHERE role = 'admin')
  );

CREATE POLICY "Tutors can manage their sessions"
  ON public.tutoring_sessions FOR UPDATE
  USING (
    tutor_id = auth.uid()
    OR auth.uid() IN (SELECT user_id FROM public.profiles WHERE role = 'admin')
  );

-- ================================================================
-- 14. TUTORÍAS: SESSION BOOKINGS - Reservas
-- ================================================================
CREATE TABLE IF NOT EXISTS public.session_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.tutoring_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'confirmed',
  notes TEXT,
  booking_type TEXT DEFAULT 'individual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_session ON public.session_bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON public.session_bookings(student_id);

ALTER TABLE public.session_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their bookings"
  ON public.session_bookings FOR SELECT
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tutoring_sessions ts
      WHERE ts.id = session_bookings.session_id AND ts.tutor_id = auth.uid()
    )
    OR auth.uid() IN (SELECT user_id FROM public.profiles WHERE role = 'admin')
  );

CREATE POLICY "Students can create bookings"
  ON public.session_bookings FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Users can update bookings"
  ON public.session_bookings FOR UPDATE
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tutoring_sessions ts
      WHERE ts.id = session_bookings.session_id AND ts.tutor_id = auth.uid()
    )
  );

-- ================================================================
-- 15. TUTORÍAS: PAYMENTS - Pagos mock
-- ================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.session_bookings(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.tutoring_sessions(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tutor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
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

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their payments"
  ON public.payments FOR SELECT
  USING (
    student_id = auth.uid()
    OR tutor_id = auth.uid()
    OR auth.uid() IN (SELECT user_id FROM public.profiles WHERE role = 'admin')
  );

CREATE POLICY "Service can manage payments"
  ON public.payments FOR ALL
  TO service_role
  USING (true);

-- ================================================================
-- 16. TUTORÍAS: TUTORING HISTORY - Historial
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tutoring_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.tutoring_sessions(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  tutor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  ai_response TEXT,
  materials_used JSONB DEFAULT '[]',
  rag_context_used BOOLEAN DEFAULT false,
  token_usage INTEGER,
  response_time_ms INTEGER,
  rating INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tutoring_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their history"
  ON public.tutoring_history FOR SELECT
  USING (
    student_id = auth.uid()
    OR tutor_id = auth.uid()
    OR auth.uid() IN (SELECT user_id FROM public.profiles WHERE role = 'admin')
  );

CREATE POLICY "Authenticated can create history"
  ON public.tutoring_history FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    OR tutor_id = auth.uid()
  );

-- ================================================================
-- 17. TUTORÍAS: TUTOR AVAILABILITY - Disponibilidad
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tutor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tutor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tutor availability"
  ON public.tutor_availability FOR SELECT
  USING (is_available = true);

CREATE POLICY "Tutors can manage their availability"
  ON public.tutor_availability FOR ALL
  USING (tutor_id = auth.uid());

-- ================================================================
-- 18. TUTORÍAS: SUBSCRIPTIONS - Suscripciones
-- ================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their subscriptions"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their subscriptions"
  ON public.subscriptions FOR ALL
  USING (user_id = auth.uid());

-- ================================================================
-- RPC FUNCTIONS
-- ================================================================

-- match_corpus_fragments: Vector similarity search
CREATE OR REPLACE FUNCTION public.match_corpus_fragments(
  query_embedding vector(1536),
  match_academy_id uuid DEFAULT NULL,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  id uuid, source_file text, source_section text, axis text[],
  tension float, content text, keywords text[], weight float,
  academy_id uuid, source_type text, title text, similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cf.id, cf.source_file, cf.source_section, cf.axis, cf.tension,
    cf.content, cf.keywords, cf.weight, cf.academy_id, cf.source_type,
    cf.title, 1 - (cf.embedding <=> query_embedding) as similarity
  FROM public.corpus_fragments cf
  WHERE
    (match_academy_id IS NULL OR cf.academy_id = match_academy_id OR cf.academy_id IS NULL)
    AND cf.embedding IS NOT NULL
    AND (1 - (cf.embedding <=> query_embedding)) >= match_threshold
  ORDER BY cf.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

REVOKE ALL ON FUNCTION public.match_corpus_fragments(vector, uuid, int, float) FROM public;
GRANT EXECUTE ON FUNCTION public.match_corpus_fragments(vector, uuid, int, float) TO authenticated, service_role;

-- match_materials: Vector similarity for tutoring materials
CREATE OR REPLACE FUNCTION public.match_materials(
  query_embedding vector(1536),
  match_subject_id uuid DEFAULT NULL,
  match_topic_id uuid DEFAULT NULL,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid, title text, content text, topic_id uuid,
  subject_id uuid, keywords text[], similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id, m.title, m.content, m.topic_id, m.subject_id,
    m.keywords, 1 - (m.embedding <=> query_embedding) AS similarity
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

-- join_public_academy: Auto-join public academies
CREATE OR REPLACE FUNCTION public.join_public_academy(p_academy_id uuid)
RETURNS TABLE (success boolean, message text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_public boolean;
BEGIN
  SELECT a.is_public INTO v_is_public
  FROM public.academies a WHERE a.id = p_academy_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Academia no encontrada', NULL::text;
    RETURN;
  END IF;
  
  IF NOT v_is_public THEN
    RETURN QUERY SELECT false, 'Esta academia es privada', NULL::text;
    RETURN;
  END IF;
  
  INSERT INTO public.academy_members (academy_id, user_id, role)
  VALUES (p_academy_id, auth.uid(), 'member')
  ON CONFLICT (academy_id, user_id) DO NOTHING;
  
  RETURN QUERY SELECT true, 'Te has unido a la academia', 'member';
END;
$$;

REVOKE ALL ON FUNCTION public.join_public_academy(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.join_public_academy(uuid) TO authenticated;

-- get_available_sessions RPC
CREATE OR REPLACE FUNCTION public.get_available_sessions(
  p_subject_id uuid DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  session_id uuid, title text, description text, scheduled_at timestamptz,
  duration_minutes int, price_cents int, tutor_name text, subject_name text,
  spots_remaining int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ts.id, ts.title, ts.description, ts.scheduled_at,
    ts.duration_minutes, ts.price_cents,
    p.full_name as tutor_name,
    s.name as subject_name,
    (ts.max_students - ts.current_students) as spots_remaining
  FROM public.tutoring_sessions ts
  JOIN public.profiles p ON p.id = ts.tutor_id
  JOIN public.subjects s ON s.id = ts.subject_id
  WHERE ts.status = 'scheduled'
    AND ts.scheduled_at > NOW()
    AND (p_subject_id IS NULL OR ts.subject_id = p_subject_id)
  ORDER BY ts.scheduled_at
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.get_available_sessions(uuid, int) FROM public;
GRANT EXECUTE ON FUNCTION public.get_available_sessions(uuid, int) TO authenticated, anon;

-- get_tutor_stats RPC
CREATE OR REPLACE FUNCTION public.get_tutor_stats(p_tutor_id uuid)
RETURNS TABLE (
  total_sessions integer, completed_sessions integer, total_students integer,
  total_earnings_cents bigint, avg_rating numeric, upcoming_sessions integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((SELECT COUNT(*) FROM public.tutoring_sessions WHERE tutor_id = p_tutor_id), 0)::integer,
    COALESCE((SELECT COUNT(*) FROM public.tutoring_sessions WHERE tutor_id = p_tutor_id AND status = 'completed'), 0)::integer,
    COALESCE((SELECT COUNT(DISTINCT student_id) FROM public.session_bookings sb
      JOIN public.tutoring_sessions ts ON sb.session_id = ts.id
      WHERE ts.tutor_id = p_tutor_id), 0)::integer,
    COALESCE((SELECT SUM(amount_cents) FROM public.payments WHERE tutor_id = p_tutor_id AND status = 'paid'), 0)::bigint,
    COALESCE((SELECT AVG(rating)::numeric(3,2) FROM public.tutoring_history WHERE tutor_id = p_tutor_id AND rating IS NOT NULL), 0)::numeric,
    COALESCE((SELECT COUNT(*) FROM public.tutoring_sessions WHERE tutor_id = p_tutor_id AND status = 'scheduled' AND scheduled_at > NOW()), 0)::integer;
END;
$$;

REVOKE ALL ON FUNCTION public.get_tutor_stats(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_tutor_stats(uuid) TO authenticated, service_role;

-- ================================================================
-- SEED DATA: Subjects
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

-- ================================================================
-- FIN DE MIGRACIÓN
-- ================================================================

-- ================================================================
-- FLOWCHART RAG MULTI-FORMATO: CAMPOS DE PROVENANCE
-- Migración: 20260722000003_update_corpus_fragments_rag_provenance
-- ================================================================

-- Agregar space_id para espacios dinámicos
ALTER TABLE public.corpus_fragments 
ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.academy_spaces(id) ON DELETE SET NULL;

-- Agregar uploaded_by para trazabilidad
ALTER TABLE public.corpus_fragments 
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Agregar ingested_at para timestamp
ALTER TABLE public.corpus_fragments 
ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ DEFAULT NOW();

-- Agregar embedding_model para saber qué modelo generó el embedding
ALTER TABLE public.corpus_fragments 
ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';

-- Agregar original_url para provenance de fuentes web
ALTER TABLE public.corpus_fragments 
ADD COLUMN IF NOT EXISTS original_url TEXT;

-- Agregar page_reference para provenance (PDF página, minuto de video, etc)
ALTER TABLE public.corpus_fragments 
ADD COLUMN IF NOT EXISTS page_reference TEXT;

-- Índices para los nuevos campos
CREATE INDEX IF NOT EXISTS idx_corpus_fragments_space ON public.corpus_fragments(space_id);
CREATE INDEX IF NOT EXISTS idx_corpus_fragments_uploaded_by ON public.corpus_fragments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_corpus_fragments_ingested_at ON public.corpus_fragments(ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_corpus_fragments_source_type ON public.corpus_fragments(source_type);
CREATE INDEX IF NOT EXISTS idx_corpus_fragments_academy_space ON public.corpus_fragments(academy_id, space_id) WHERE embedding IS NOT NULL;

-- ================================================================
-- FLOWCHART RAG MULTI-FORMATO: TABLA SAVED_DIALOGUES
-- Migración: 20260722000004_create_saved_dialogues
-- ================================================================

-- Tabla principal de diálogos guardados
CREATE TABLE IF NOT EXISTS public.saved_dialogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL,
  space_id UUID REFERENCES public.academy_spaces(id) ON DELETE SET NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  research_topic TEXT,
  tutor_system_prompt TEXT,
  tutor_model TEXT,
  total_messages INTEGER DEFAULT 0,
  total_sources_used INTEGER DEFAULT 0,
  user_notes TEXT,
  is_bookmarked BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Tabla de mensajes individuales
CREATE TABLE IF NOT EXISTS public.saved_dialogue_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dialogue_id UUID NOT NULL REFERENCES public.saved_dialogues(id) ON DELETE CASCADE,
  message_index INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ai_model TEXT,
  response_time_ms INTEGER
);

-- Tabla de procedencia por mensaje (CRÍTICO para el flowchart - P5)
CREATE TABLE IF NOT EXISTS public.saved_dialogue_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.saved_dialogue_messages(id) ON DELETE CASCADE,
  fragment_id UUID REFERENCES public.corpus_fragments(id) ON DELETE SET NULL,
  source_file TEXT,
  source_type TEXT,
  source_content TEXT,
  original_url TEXT,
  page_reference TEXT,
  similarity_score FLOAT,
  citation_order INTEGER,
  is_inference_only BOOLEAN DEFAULT FALSE,
  fragment_ingested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para saved_dialogues
CREATE INDEX IF NOT EXISTS idx_saved_dialogues_user ON public.saved_dialogues(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_dialogues_academy ON public.saved_dialogues(academy_id);
CREATE INDEX IF NOT EXISTS idx_saved_dialogues_space ON public.saved_dialogues(space_id);
CREATE INDEX IF NOT EXISTS idx_saved_dialogues_created ON public.saved_dialogues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_dialogues_bookmarked ON public.saved_dialogues(is_bookmarked) WHERE NOT is_deleted;

CREATE INDEX IF NOT EXISTS idx_saved_messages_dialogue ON public.saved_dialogue_messages(dialogue_id);
CREATE INDEX IF NOT EXISTS idx_saved_messages_index ON public.saved_dialogue_messages(dialogue_id, message_index);

CREATE INDEX IF NOT EXISTS idx_saved_provenance_message ON public.saved_dialogue_provenance(message_id);
CREATE INDEX IF NOT EXISTS idx_saved_provenance_fragment ON public.saved_dialogue_provenance(fragment_id);
CREATE INDEX IF NOT EXISTS idx_saved_provenance_similarity ON public.saved_dialogue_provenance(similarity_score DESC);

-- RLS para saved_dialogues
ALTER TABLE public.saved_dialogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_dialogue_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_dialogue_provenance ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (el service_role tiene acceso total)
DROP POLICY IF EXISTS "Service role can manage dialogues" ON public.saved_dialogues;
CREATE POLICY "Service role can manage dialogues"
ON public.saved_dialogues FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage messages" ON public.saved_dialogue_messages;
CREATE POLICY "Service role can manage messages"
ON public.saved_dialogue_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage provenance" ON public.saved_dialogue_provenance;
CREATE POLICY "Service role can manage provenance"
ON public.saved_dialogue_provenance FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_saved_dialogues_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_saved_dialogues_updated_at ON public.saved_dialogues;
CREATE TRIGGER update_saved_dialogues_updated_at
  BEFORE UPDATE ON public.saved_dialogues FOR EACH ROW
  EXECUTE FUNCTION public.update_saved_dialogues_updated_at();

-- ================================================================
-- FLOWCHART RAG: match_corpus_fragments CON PROVENANCE
-- Actualizado: 20260718000000_add_match_corpus_fragments_rpc
-- ================================================================

CREATE OR REPLACE FUNCTION public.match_corpus_fragments(
  query_embedding vector(1536),
  match_academy_id uuid DEFAULT NULL,
  match_space_id uuid DEFAULT NULL,
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
  space_id uuid,
  source_type text,
  title text,
  similarity float,
  ingested_at timestamptz,
  uploaded_by uuid,
  embedding_model text,
  original_url text,
  page_reference text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cf.id, cf.source_file, cf.source_section, cf.axis, cf.tension,
    cf.content, cf.keywords, cf.weight, cf.academy_id, cf.space_id,
    cf.source_type, cf.title,
    (1 - (cf.embedding <=> query_embedding))::float as similarity,
    cf.ingested_at, cf.uploaded_by, cf.embedding_model,
    cf.original_url, cf.page_reference
  FROM public.corpus_fragments cf
  WHERE
    (match_academy_id IS NULL OR cf.academy_id = match_academy_id OR cf.academy_id IS NULL)
    AND (match_space_id IS NULL OR cf.space_id = match_space_id)
    AND cf.embedding IS NOT NULL
    AND (cf.upload_status = 'completed' OR cf.upload_status IS NULL OR cf.source_type = 'seed')
    AND (1 - (cf.embedding <=> query_embedding)) >= match_threshold
  ORDER BY cf.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

DROP FUNCTION IF EXISTS public.match_corpus_fragments(vector, uuid, int, float);
REVOKE ALL ON FUNCTION public.match_corpus_fragments(vector, uuid, uuid, int, float) FROM public;
GRANT EXECUTE ON FUNCTION public.match_corpus_fragments(vector, uuid, uuid, int, float) TO authenticated, service_role;

-- ================================================================
-- FIN: FLOWCHART RAG MULTI-FORMATO IMPLEMENTADO
-- ================================================================
