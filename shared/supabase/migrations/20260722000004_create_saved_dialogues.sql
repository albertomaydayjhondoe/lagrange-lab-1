-- ================================================================
-- CREATE: saved_dialogues - Guardar sesiones de investigación
-- con procedencia completa según flowchart
-- ================================================================
-- Timestamp: 20260722000004
-- Flowchart steps: SAVE → saved_dialogues
-- 
-- Propósito:
--   Guardar diálogos de sesiones de investigación con toda la
--   procedencia de fuentes usadas en cada respuesta.
-- ================================================================

-- 1. Tabla principal de diálogos guardados
CREATE TABLE IF NOT EXISTS public.saved_dialogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL,
  space_id UUID REFERENCES public.academy_spaces(id) ON DELETE SET NULL,
  
  -- Sesión
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Tema de investigación
  research_topic TEXT,
  
  -- Configuración del tutor
  tutor_system_prompt TEXT,
  tutor_model TEXT,
  
  -- Metadatos de la sesión
  total_messages INTEGER DEFAULT 0,
  total_sources_used INTEGER DEFAULT 0,
  
  -- Notas del usuario
  user_notes TEXT,
  
  -- Estado
  is_bookmarked BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- 2. Tabla de mensajes individuales
CREATE TABLE IF NOT EXISTS public.saved_dialogue_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dialogue_id UUID NOT NULL REFERENCES public.saved_dialogues(id) ON DELETE CASCADE,
  
  -- Orden y tipo
  message_index INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  
  -- Contenido
  content TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- IA que generó (para provenance)
  ai_model TEXT,
  response_time_ms INTEGER
);

-- 3. Tabla de procedencia por mensaje (CRÍTICO para el flowchart)
CREATE TABLE IF NOT EXISTS public.saved_dialogue_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.saved_dialogue_messages(id) ON DELETE CASCADE,
  
  -- Referencia al fragmento original
  fragment_id UUID REFERENCES public.corpus_fragments(id) ON DELETE SET NULL,
  
  -- Datos del fragmento por si se modifica después (trazabilidad completa)
  source_file TEXT,
  source_type TEXT,
  source_content TEXT,  -- Snippet usado
  original_url TEXT,
  page_reference TEXT,
  
  -- Similitud semántica (score 0-1)
  similarity_score FLOAT,
  
  -- Posición en la respuesta
  citation_order INTEGER,
  
  -- Marca de inferencia sin respaldo (⚠️ del flowchart)
  is_inference_only BOOLEAN DEFAULT FALSE,
  
  -- Timestamp de ingestión del fragmento original
  fragment_ingested_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índices para consultas eficientes
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

-- 5. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_saved_dialogues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_saved_dialogues_updated_at ON public.saved_dialogues;
CREATE TRIGGER update_saved_dialogues_updated_at
  BEFORE UPDATE ON public.saved_dialogues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_saved_dialogues_updated_at();

-- 6. RLS Policies

-- Enable RLS
ALTER TABLE public.saved_dialogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_dialogue_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_dialogue_provenance ENABLE ROW LEVEL SECURITY;

-- saved_dialogues: solo el dueño puede ver/editar
DROP POLICY IF EXISTS "Users can view own dialogues" ON public.saved_dialogues;
CREATE POLICY "Users can view own dialogues"
ON public.saved_dialogues
FOR SELECT
USING (user_id = auth.uid() AND NOT is_deleted);

DROP POLICY IF EXISTS "Users can insert own dialogues" ON public.saved_dialogues;
CREATE POLICY "Users can insert own dialogues"
ON public.saved_dialogues
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own dialogues" ON public.saved_dialogues;
CREATE POLICY "Users can update own dialogues"
ON public.saved_dialogues
FOR UPDATE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can soft delete own dialogues" ON public.saved_dialogues;
CREATE POLICY "Users can soft delete own dialogues"
ON public.saved_dialogues
FOR DELETE
USING (user_id = auth.uid());

-- saved_dialogue_messages: heredado del diálogo padre
DROP POLICY IF EXISTS "Users can view messages of own dialogues" ON public.saved_dialogue_messages;
CREATE POLICY "Users can view messages of own dialogues"
ON public.saved_dialogue_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.saved_dialogues 
    WHERE id = saved_dialogue_messages.dialogue_id 
    AND user_id = auth.uid() 
    AND NOT is_deleted
  )
);

DROP POLICY IF EXISTS "Users can insert messages of own dialogues" ON public.saved_dialogue_messages;
CREATE POLICY "Users can insert messages of own dialogues"
FOR INSERT
ON public.saved_dialogue_messages
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.saved_dialogues 
    WHERE id = saved_dialogue_messages.dialogue_id 
    AND user_id = auth.uid()
  )
);

-- saved_dialogue_provenance: heredado del mensaje padre
DROP POLICY IF EXISTS "Users can view provenance of own dialogues" ON public.saved_dialogue_provenance;
CREATE POLICY "Users can view provenance of own dialogues"
ON public.saved_dialogue_provenance
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.saved_dialogue_messages m
    JOIN public.saved_dialogues d ON m.dialogue_id = d.id
    WHERE m.id = saved_dialogue_provenance.message_id 
    AND d.user_id = auth.uid() 
    AND NOT d.is_deleted
  )
);

DROP POLICY IF EXISTS "Users can insert provenance of own dialogues" ON public.saved_dialogue_provenance;
CREATE POLICY "Users can insert provenance of own dialogues"
FOR INSERT
ON public.saved_dialogue_provenance
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.saved_dialogue_messages m
    JOIN public.saved_dialogues d ON m.dialogue_id = d.id
    WHERE m.id = saved_dialogue_provenance.message_id 
    AND d.user_id = auth.uid()
  )
);

-- Service role: acceso total
DROP POLICY IF EXISTS "Service role can manage dialogues" ON public.saved_dialogues;
CREATE POLICY "Service role can manage dialogues"
ON public.saved_dialogues
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage messages" ON public.saved_dialogue_messages;
CREATE POLICY "Service role can manage messages"
ON public.saved_dialogue_messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage provenance" ON public.saved_dialogue_provenance;
CREATE POLICY "Service role can manage provenance"
ON public.saved_dialogue_provenance
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 7. Comentarios para documentación
COMMENT ON TABLE public.saved_dialogues IS 'Diálogos de investigación guardados con procedencia de fuentes';
COMMENT ON TABLE public.saved_dialogue_messages IS 'Mensajes individuales de diálogos guardados';
COMMENT ON TABLE public.saved_dialogue_provenance IS 'Procedencia de fuentes usadas en cada respuesta (⚠️ inference_only flag)';

COMMENT ON COLUMN public.saved_dialogue_provenance.is_inference_only IS 'Marca si la IA completó algo SIN fuente propia (⚠️ inferencia sin respaldo directo)';
COMMENT ON COLUMN public.saved_dialogue_provenance.similarity_score IS 'Similitud semántica (score 0-1) de cada fuente citada';
COMMENT ON COLUMN public.saved_dialogue_provenance.citation_order IS 'Orden de la cita en la respuesta para trazabilidad';

-- 8. Verificaciones
RAISE NOTICE '';
RAISE NOTICE '============================================================';
RAISE NOTICE 'VERIFICACIONES: saved_dialogues creado';
RAISE NOTICE '============================================================';

DO $$
DECLARE
  v_dialogues_count INTEGER;
  v_messages_count INTEGER;
  v_provenance_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_dialogues_count FROM public.saved_dialogues;
  SELECT COUNT(*) INTO v_messages_count FROM public.saved_dialogue_messages;
  SELECT COUNT(*) INTO v_provenance_count FROM public.saved_dialogue_provenance;
  
  RAISE NOTICE 'Tabla saved_dialogues: % filas', v_dialogues_count;
  RAISE NOTICE 'Tabla saved_dialogue_messages: % filas', v_messages_count;
  RAISE NOTICE 'Tabla saved_dialogue_provenance: % filas', v_provenance_count;
END $$;

RAISE NOTICE '';
RAISE NOTICE 'Políticas RLS aplicadas:';
SELECT 'saved_dialogues' as table_name, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'saved_dialogues'
UNION ALL
SELECT 'saved_dialogue_messages', policyname, cmd 
FROM pg_policies 
WHERE tablename = 'saved_dialogue_messages'
UNION ALL
SELECT 'saved_dialogue_provenance', policyname, cmd 
FROM pg_policies 
WHERE tablename = 'saved_dialogue_provenance';

RAISE NOTICE '';
RAISE NOTICE '============================================================';
RAISE NOTICE 'CREATED: saved_dialogues con procedencia completa';
RAISE NOTICE '============================================================';
