-- ================================================================
-- FIX: tutoring_sessions.end_at expression is not immutable
-- ERROR 42P17: generation expression is not immutable
-- 
-- Bug: (duration_minutes || ' minutes')::interval no es immutable
-- Fix: Usar (duration_minutes * interval '1 minute') que sí lo es
-- ================================================================

-- Verificar si la tabla existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'tutoring_sessions'
  ) THEN
    -- Verificar si la columna end_at tiene la expresión problemática
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'tutoring_sessions' 
        AND column_name = 'end_at'
        AND column_generation = 'GENERATED'
    ) THEN
      -- Recrear la tabla con la expresión correcta
      -- Primero, hacer backup de datos si hay alguna FK constraint
      ALTER TABLE public.session_bookings DROP CONSTRAINT IF EXISTS session_bookings_session_id_fkey;
      ALTER TABLE public.tutoring_history DROP CONSTRAINT IF EXISTS tutoring_history_session_id_fkey;
      
      -- Recrear la tabla sin la columna generada (será calculada manualmente)
      DROP TABLE IF EXISTS public.tutoring_sessions_backup;
      
      -- Crear backup temporal
      ALTER TABLE public.tutoring_sessions RENAME TO tutoring_sessions_backup;
      
      -- Recrear tabla con expresión immutable correcta
      CREATE TABLE public.tutoring_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
        tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        duration_minutes INTEGER DEFAULT 60,
        scheduled_at TIMESTAMPTZ NOT NULL,
        -- FIX: expresión immutable usando multiplicación de interval
        end_at TIMESTAMPTZ GENERATED ALWAYS AS (scheduled_at + (duration_minutes * interval '1 minute')) STORED,
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
      
      -- Copiar datos (la columna end_at se calculará automáticamente)
      INSERT INTO public.tutoring_sessions (
        id, subject_id, tutor_id, title, description, duration_minutes,
        scheduled_at, status, meeting_link, is_rag_enabled, ai_model,
        price_cents, currency, max_students, current_students, location,
        created_at, updated_at
      )
      SELECT 
        id, subject_id, tutor_id, title, description, duration_minutes,
        scheduled_at, status, meeting_link, is_rag_enabled, ai_model,
        price_cents, currency, max_students, current_students, location,
        created_at, updated_at
      FROM public.tutoring_sessions_backup;
      
      -- Recrear índices
      CREATE INDEX IF NOT EXISTS idx_sessions_subject ON public.tutoring_sessions(subject_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_tutor ON public.tutoring_sessions(tutor_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_scheduled ON public.tutoring_sessions(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.tutoring_sessions(status);
      
      -- Recrear constraints
      ALTER TABLE public.session_bookings 
        ADD CONSTRAINT session_bookings_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES public.tutoring_sessions(id) ON DELETE CASCADE;
      
      ALTER TABLE public.tutoring_history 
        ADD CONSTRAINT tutoring_history_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES public.tutoring_sessions(id) ON DELETE SET NULL;
      
      -- Limpiar backup
      DROP TABLE public.tutoring_sessions_backup;
      
      RAISE NOTICE 'tutoring_sessions recreated with immutable end_at expression';
    ELSE
      RAISE NOTICE 'tutoring_sessions.end_at is not a generated column or already fixed';
    END IF;
  ELSE
    RAISE NOTICE 'tutoring_sessions table does not exist, no action needed';
  END IF;
END $$;

-- Verificar que la expresión es immutable
DO $$
DECLARE
  expr_is_immutable boolean;
BEGIN
  SELECT pg_get_expr(d.adbin, d.adrelid) INTO expr_is_immutable
  FROM pg_attrdef d
  JOIN pg_class c ON c.oid = d.adrelid
  WHERE c.relname = 'tutoring_sessions'
    AND d.adnum = (
      SELECT attnum FROM pg_attribute 
      WHERE attrelid = c.oid AND attname = 'end_at'
    );
  
  IF expr_is_immutable IS NOT NULL THEN
    RAISE NOTICE 'tutoring_sessions.end_at expression: %', expr_is_immutable;
  END IF;
END $$;

COMMENT ON COLUMN public.tutoring_sessions.end_at IS 'Hora de fin calculada como scheduled_at + duration_minutes (inmutable)';
